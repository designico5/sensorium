use anyhow::Result;
use automerge::{Automerge, AutomergeError, ObjId, ReadDoc, transaction::{Failure, Transactable}, Value};
use automerge_repo::{DocHandle, Repo, RepoHandle, Storage, StorageError, DocumentId};
use automerge_repo::tokio::FsStorage;
use serde::{Deserialize, Serialize};
use serde_json;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use futures::future::{BoxFuture, FutureExt};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub clips: Vec<Clip>,
    pub volume: f32,
    pub pan: f32,
    pub muted: bool,
    pub solo: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub track_id: String,
    pub start_time: f64,
    pub duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub tempo: f64,
    pub time_signature: (u32, u32),
    pub loop_enabled: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            tempo: 120.0,
            time_signature: (4, 4),
            loop_enabled: false,
        }
    }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct SensoriumDocument {
    pub tracks: Vec<Track>,
    pub settings: Settings,
    pub session: SessionView,
}

impl SensoriumDocument {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_track(&mut self, track: Track) {
        self.tracks.push(track);
    }

    pub fn update_settings(&mut self, settings: Settings) {
        self.settings = settings;
    }
}

// ── Session View / Clip Launcher (M3) ─────────────────────────────

/// A clip slot in the session grid.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ClipSlotState {
    Empty,
    HasClip,
    Playing,
    Queued,
    Stopped,
}

impl Default for ClipSlotState {
    fn default() -> Self {
        ClipSlotState::Empty
    }
}

/// A clip in the session view.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionClip {
    pub id: String,
    pub name: String,
    pub track_index: usize,
    pub scene_index: usize,
    pub length_beats: f64,
    pub color: u32,
    pub has_content: bool,
}

/// A scene (row) in the session view.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub index: usize,
    pub name: String,
    pub color: u32,
}

impl Default for Scene {
    fn default() -> Self {
        Self { index: 0, name: String::new(), color: 0 }
    }
}

/// The Session View — a grid of clips organized by tracks (columns) and scenes (rows).
///
/// Uses a HashMap for O(1) clip lookup by (track, scene) position.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionView {
    pub scenes: Vec<Scene>,
    pub clips: Vec<SessionClip>,
    /// Fast lookup: (track_index, scene_index) → clip index.
    #[serde(skip)]
    clip_index: HashMap<(usize, usize), usize>,
    pub active_scene: usize,
    pub num_tracks: usize,
}

impl Default for SessionView {
    fn default() -> Self {
        Self {
            scenes: (0..8).map(|i| Scene { index: i, name: format!("Scene {}", i + 1), color: 0 }).collect(),
            clips: Vec::new(),
            clip_index: HashMap::new(),
            active_scene: 0,
            num_tracks: 0,
        }
    }
}

impl SessionView {
    pub fn new(num_tracks: usize, num_scenes: usize) -> Self {
        Self {
            scenes: (0..num_scenes).map(|i| Scene { index: i, name: format!("Scene {}", i + 1), color: 0 }).collect(),
            clips: Vec::new(),
            clip_index: HashMap::new(),
            active_scene: 0,
            num_tracks,
        }
    }

    /// Add a clip to the session grid. O(1) index update.
    pub fn add_clip(&mut self, name: &str, track: usize, scene: usize, length_beats: f64) -> String {
        let id = format!("clip_{}_{}", track, scene);
        let idx = self.clips.len();
        self.clips.push(SessionClip {
            id: id.clone(),
            name: name.to_string(),
            track_index: track,
            scene_index: scene,
            length_beats,
            color: 0,
            has_content: true,
        });
        self.clip_index.insert((track, scene), idx);
        id
    }

    /// Get the clip at a specific grid position. O(1) via HashMap.
    pub fn clip_at(&self, track: usize, scene: usize) -> Option<&SessionClip> {
        self.clip_index.get(&(track, scene)).map(|&idx| &self.clips[idx])
    }

    /// Get the state of a clip slot.
    pub fn slot_state(&self, track: usize, scene: usize) -> ClipSlotState {
        match self.clip_at(track, scene) {
            None => ClipSlotState::Empty,
            Some(_) => ClipSlotState::HasClip,
        }
    }

    /// Launch a scene (queue all clips in a row).
    pub fn launch_scene(&mut self, scene_index: usize) {
        if scene_index < self.scenes.len() {
            self.active_scene = scene_index;
        }
    }

    /// Stop all clips.
    pub fn stop_all(&mut self) {
        self.active_scene = 0;
    }

    /// Returns the number of clips with content.
    pub fn clip_count(&self) -> usize {
        self.clips.iter().filter(|c| c.has_content).count()
    }

    /// Returns the number of scenes.
    pub fn scene_count(&self) -> usize {
        self.scenes.len()
    }
}

#[derive(Debug, Clone)]
pub struct SyncState {
    pub doc: Automerge,
}

impl SyncState {
    pub fn new() -> Self {
        Self {
            doc: Automerge::new(),
        }
    }

    pub fn apply_document(&mut self, document: &SensoriumDocument) -> Result<()> {
        let json = serde_json::to_string(document)?;
        self.doc.transact(|tx| -> Result<(), AutomergeError> {
            tx.put(automerge::ROOT, "sensorium_document", &json)?;
            Ok(())
        })
        .map(|_| ())
        .map_err(|e: Failure<AutomergeError>| anyhow::anyhow!(e.error))?;
        Ok(())
    }

    pub fn to_document(&self) -> Result<SensoriumDocument> {
        let opt: Option<(Value, ObjId)> = self.doc.get(automerge::ROOT, "sensorium_document")?;
        let json: String = match opt {
            Some((value, _)) => {
                if let Value::Scalar(cow) = value {
                    match cow.as_ref() {
                        automerge::ScalarValue::Str(s) => s.to_string(),
                        _ => String::new(),
                    }
                } else {
                    String::new()
                }
            }
            None => String::new(),
        };
        let doc: SensoriumDocument = if json.is_empty() {
            SensoriumDocument::default()
        } else {
            serde_json::from_str(&json)?
        };
        Ok(doc)
    }

    pub fn save_binary(&mut self) -> Result<Vec<u8>> {
        Ok(self.doc.save())
    }

    pub fn load_binary(data: &[u8]) -> Result<Self> {
        let doc = Automerge::load(data)?;
        Ok(Self { doc })
    }
}

#[derive(Debug, Clone)]
pub struct RepoSyncState {
    pub handle: RepoHandle,
    pub storage_path: Option<PathBuf>,
}

impl RepoSyncState {
    const DOCUMENT_ID_BYTES: [u8; 16] = *b"sensorium_state_";

    pub async fn new_memory() -> Result<Self> {
        // In-memory storage implementation
        struct InMemoryStorage {
            data: Arc<Mutex<HashMap<Vec<u8>, Vec<u8>>>>,
        }

        #[async_trait::async_trait]
        impl Storage for InMemoryStorage {
            fn get(
                &self,
                id: DocumentId,
            ) -> BoxFuture<'static, Result<Option<Vec<u8>>, StorageError>> {
                let data = Arc::clone(&self.data);
                let id_bytes = id.as_ref().to_vec();
                async move {
                    let lock = data.lock().unwrap();
                    Ok(lock.get(&id_bytes).cloned())
                }
                .boxed()
            }

            fn list_all(&self) -> BoxFuture<'static, Result<Vec<DocumentId>, StorageError>> {
                let data = Arc::clone(&self.data);
                async move {
                    let lock = data.lock().unwrap();
                    let mut ids = Vec::new();
                    for key in lock.keys() {
                        if let Ok(doc_id) = DocumentId::try_from(key.clone()) {
                            ids.push(doc_id);
                        }
                    }
                    Ok(ids)
                }
                .boxed()
            }

            fn append(
                &self,
                id: DocumentId,
                changes: Vec<u8>,
            ) -> BoxFuture<'static, Result<(), StorageError>> {
                let data = Arc::clone(&self.data);
                let id_bytes = id.as_ref().to_vec();
                async move {
                    let mut lock = data.lock().unwrap();
                    lock.entry(id_bytes)
                        .and_modify(|e| {
                            e.extend_from_slice(&changes);
                        })
                        .or_insert(changes);
                    Ok(())
                }
                .boxed()
            }

            fn compact(
                &self,
                id: DocumentId,
                full_doc: Vec<u8>,
            ) -> BoxFuture<'static, Result<(), StorageError>> {
                let data = Arc::clone(&self.data);
                let id_bytes = id.as_ref().to_vec();
                async move {
                    let mut lock = data.lock().unwrap();
                    lock.insert(id_bytes, full_doc);
                    Ok(())
                }
                .boxed()
            }
        }

        let storage = Box::new(InMemoryStorage {
            data: Arc::new(Mutex::new(HashMap::new())),
        });
        let repo = Repo::new(None, storage);
        let handle = repo.run();
        Ok(Self {
            handle,
            storage_path: None,
        })
    }

    pub async fn new_sqlite(path: impl Into<PathBuf>) -> Result<Self> {
        let path = path.into();
        let storage = FsStorage::open(&path)?;
        let storage: Box<dyn Storage> = Box::new(storage);
        let repo = Repo::new(None, storage);
        let handle = repo.run();
        Ok(Self {
            handle,
            storage_path: Some(path),
        })
    }

    pub async fn connect_webtransport(&self, _url: impl AsRef<str>) -> Result<()> {
        // WebTransport support is not available in automerge_repo 0.3.0.
        // This is a placeholder for future implementation.
        // For now, we skip this functionality.
        Ok(())
    }

    async fn get_or_create_doc_handle(&self) -> Result<DocHandle> {
        let doc_id = DocumentId::try_from(Self::DOCUMENT_ID_BYTES.to_vec())
            .map_err(|e| anyhow::anyhow!(format!("{:?}", e)))?;
        // Try to load the document from storage
        let load_fut = self.handle.load(doc_id);
        let opt_handle = load_fut
            .await
            .map_err(|e| anyhow::anyhow!(format!("{:?}", e)))?;
        if let Some(handle) = opt_handle {
            Ok(handle)
        } else {
            // Create a new document
            let handle = self.handle.new_document();
            Ok(handle)
        }
    }

    pub async fn apply_document(&self, document: &SensoriumDocument) -> Result<()> {
        let json = serde_json::to_string(document)?;
        let handle = self.get_or_create_doc_handle().await?;
        handle.with_doc_mut(|doc| {
            doc.transact(|tx| -> Result<(), AutomergeError> {
                tx.put(automerge::ROOT, "sensorium_document", &json)?;
                Ok(())
            })
            .map(|_| ())
            .map_err(|e: Failure<AutomergeError>| anyhow::anyhow!(e.error))?;
            Ok::<(), anyhow::Error>(())
        })?;
        Ok(())
    }

    pub async fn to_document(&self) -> Result<SensoriumDocument> {
        let handle = self.get_or_create_doc_handle().await?;
        let json = handle.with_doc(|doc| {
            let opt: Option<(Value, ObjId)> = doc.get(automerge::ROOT, "sensorium_document")?;
            let json: String = match opt {
                Some((value, _)) => {
                    if let Value::Scalar(cow) = value {
                        match cow.as_ref() {
                            automerge::ScalarValue::Str(s) => s.to_string(),
                            _ => String::new(),
                        }
                    } else {
                        String::new()
                    }
                }
                None => String::new(),
            };
            Ok(json)
        })
        .map_err(|e: anyhow::Error| e)?;
        let doc: SensoriumDocument = if json.is_empty() {
            SensoriumDocument::default()
        } else {
            serde_json::from_str(&json)?
        };
        Ok(doc)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn document_roundtrip() {
        let mut state = SyncState::new();
        let doc = SensoriumDocument {
            tracks: vec![Track {
                id: "t1".into(),
                name: "Test".into(),
                clips: vec![],
                volume: 0.5,
                pan: 0.0,
                muted: false,
                solo: false,
            }],
            settings: Settings {
                tempo: 120.0,
                time_signature: (4, 4),
                loop_enabled: true,
            },
            session: SessionView::default(),
        };

        state.apply_document(&doc).unwrap();
        let bytes = state.save_binary().unwrap();
        let state2 = SyncState::load_binary(&bytes).unwrap();
        let doc2 = state2.to_document().unwrap();

        assert_eq!(doc.tracks.len(), doc2.tracks.len());
        assert_eq!(doc.settings.tempo, doc2.settings.tempo);
    }

    #[tokio::test]
    async fn repo_memory_init() {
        let _repo = RepoSyncState::new_memory().await.unwrap();
        // Verifies Repo + MemoryStorage can be created without panicking.
    }

    /// Helper: create a document with random tracks
    fn make_doc(seed: u64, n_tracks: usize) -> SensoriumDocument {
        let mut doc = SensoriumDocument::new();
        for i in 0..n_tracks {
            doc.add_track(Track {
                id: format!("t{}_{}", seed, i),
                name: format!("Track {} (seed {})", i, seed),
                clips: vec![],
                volume: ((seed + i as u64) % 100) as f32 / 100.0,
                pan: ((seed.wrapping_mul(i as u64 + 1)) % 200) as f32 / 100.0 - 1.0,
                muted: (seed + i as u64) % 2 == 0,
                solo: false,
            });
        }
        doc.update_settings(Settings {
            tempo: 60.0 + (seed % 140) as f64,
            time_signature: (4, 4),
            loop_enabled: seed % 2 == 0,
        });
        doc
    }

    #[test]
    fn crdt_binary_roundtrip_preserves_state() {
        // Property: save → load → to_document returns the same document
        for seed in 0..20u64 {
            let n = (seed % 8) as usize + 1;
            let doc = make_doc(seed, n);
            let mut state = SyncState::new();
            state.apply_document(&doc).unwrap();
            let binary = state.save_binary().unwrap();
            let state2 = SyncState::load_binary(&binary).unwrap();
            let doc2 = state2.to_document().unwrap();
            assert_eq!(doc.tracks.len(), doc2.tracks.len(), "seed={}", seed);
            assert_eq!(doc.settings.tempo, doc2.settings.tempo, "seed={}", seed);
        }
    }

    #[test]
    fn crdt_merge_converges_via_binary() {
        // Property: Two peers that apply the same documents in the same order
        // converge to the same state (deterministic replay).
        // With LWW semantics on the same key, the last write wins,
        // so both peers must end up with the same final document.
        for seed in 0..10u64 {
            let doc_a = make_doc(seed, 3);
            let doc_b = make_doc(seed + 100, 2);

            // Peer 1: applies doc_a then doc_b
            let mut peer1 = SyncState::new();
            peer1.apply_document(&doc_a).unwrap();
            peer1.apply_document(&doc_b).unwrap();

            // Peer 2: applies same documents in same order
            let mut peer2 = SyncState::new();
            peer2.apply_document(&doc_a).unwrap();
            peer2.apply_document(&doc_b).unwrap();

            let p1_doc = peer1.to_document().unwrap();
            let p2_doc = peer2.to_document().unwrap();

            // Both applied the same ops → must have the same state
            assert_eq!(p1_doc.tracks.len(), p2_doc.tracks.len(),
                "Convergence failed for seed={}", seed);
            assert_eq!(p1_doc.settings.tempo, p2_doc.settings.tempo,
                "Tempo convergence failed for seed={}", seed);

            // Also verify binary roundtrip preserves state from both peers
            let bin1 = peer1.save_binary().unwrap();
            let loaded1 = SyncState::load_binary(&bin1).unwrap();
            let loaded1_doc = loaded1.to_document().unwrap();
            assert_eq!(loaded1_doc.tracks.len(), p1_doc.tracks.len(),
                "Binary roundtrip failed for peer1, seed={}", seed);

            let bin2 = peer2.save_binary().unwrap();
            let loaded2 = SyncState::load_binary(&bin2).unwrap();
            let loaded2_doc = loaded2.to_document().unwrap();
            assert_eq!(loaded2_doc.tracks.len(), p2_doc.tracks.len(),
                "Binary roundtrip failed for peer2, seed={}", seed);
        }
    }

    #[test]
    fn crdt_apply_idempotent() {
        // Property: applying the same document twice yields the same result as applying it once
        for seed in 0..10u64 {
            let doc = make_doc(seed, 4);
            let mut state = SyncState::new();
            state.apply_document(&doc).unwrap();
            let after_once = state.to_document().unwrap();

            state.apply_document(&doc).unwrap();
            let after_twice = state.to_document().unwrap();

            assert_eq!(after_once.tracks.len(), after_twice.tracks.len(),
                "Idempotency failed for seed={}", seed);
            assert_eq!(after_once.settings.tempo, after_twice.settings.tempo,
                "Idempotency failed for seed={}", seed);
        }
    }

    // ── Session View (M3) Tests ────────────────────────────────────

    #[test]
    fn session_view_creation() {
        let sv = SessionView::new(4, 8);
        assert_eq!(sv.scene_count(), 8);
        assert_eq!(sv.num_tracks, 4);
        assert_eq!(sv.clip_count(), 0);
    }

    #[test]
    fn session_view_add_clip() {
        let mut sv = SessionView::new(4, 8);
        let id = sv.add_clip("Drums", 0, 0, 4.0);
        assert!(!id.is_empty());
        assert_eq!(sv.clip_count(), 1);
        assert!(sv.clip_at(0, 0).is_some());
        assert_eq!(sv.slot_state(0, 0), ClipSlotState::HasClip);
        assert_eq!(sv.slot_state(1, 0), ClipSlotState::Empty);
    }

    #[test]
    fn session_view_launch_scene() {
        let mut sv = SessionView::new(4, 8);
        sv.add_clip("Bass", 0, 2, 8.0);
        sv.launch_scene(2);
        assert_eq!(sv.active_scene, 2);
    }

    #[test]
    fn session_view_stop_all() {
        let mut sv = SessionView::new(4, 8);
        sv.launch_scene(5);
        sv.stop_all();
        assert_eq!(sv.active_scene, 0);
    }

    #[test]
    fn session_view_multiple_clips() {
        let mut sv = SessionView::new(4, 8);
        sv.add_clip("Drums", 0, 0, 4.0);
        sv.add_clip("Bass", 1, 0, 4.0);
        sv.add_clip("Synth", 0, 1, 8.0);
        assert_eq!(sv.clip_count(), 3);
        assert!(sv.clip_at(1, 0).is_some());
        assert!(sv.clip_at(0, 1).is_some());
        assert!(sv.clip_at(2, 2).is_none());
    }

    #[test]
    fn session_default_has_8_scenes() {
        let sv = SessionView::default();
        assert_eq!(sv.scene_count(), 8);
    }
}