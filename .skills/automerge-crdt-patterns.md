# Automerge CRDT Patterns Skill

## When to Use
Implementing conflict-free replicated data types (CRDTs) for collaborative state synchronization in Sensorium using Automerge 2.0 with Yjs web provider.

## Core Architecture

### Automerge 2.0 Document Schema
```rust
// sensorium-sync/src/lib.rs
use automerge::{Automerge, transaction::Transactable, ROOT};
use automerge_repo::{Repo, storage::Storage, network::NetworkAdapter};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SensoriumDocument {
    pub tracks: Vec<Track>,
    pub clips: Vec<Clip>,
    pub settings: Settings,
    pub metadata: DocumentMetadata,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub color: String,
    pub volume: f32,
    pub pan: f32,
    pub muted: bool,
    pub solo: bool,
    pub armed: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Clip {
    pub id: String,
    pub track_id: String,
    pub start_time: f64,
    pub duration: f64,
    pub source: ClipSource,
    pub gain: f32,
    pub pitch: f32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Settings {
    pub sample_rate: u32,
    pub buffer_size: u32,
    pub tempo: f64,
    pub time_signature: (u32, u32),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DocumentMetadata {
    pub created_at: u64,
    pub modified_at: u64,
    pub version: u32,
    pub author: String,
}
```

### Repo Setup with Multiple Storages
```rust
pub struct SensoriumRepo {
    repo: Repo,
    memory_storage: MemoryStorage,
    sqlite_storage: SqliteStorage,
    webtransport_backend: Option<WebTransportBackend>,
}

impl SensoriumRepo {
    pub async fn new() -> Result<Self> {
        let memory_storage = MemoryStorage::new();
        let sqlite_storage = SqliteStorage::new("sensorium.db").await?;
        
        let repo = Repo::new()
            .with_storage(Box::new(memory_storage.clone()))
            .with_storage(Box::new(sqlite_storage.clone()))
            .build()
            .await?;
        
        Ok(Self {
            repo,
            memory_storage,
            sqlite_storage,
            webtransport_backend: None,
        })
    }
    
    pub async fn enable_webtransport(&mut self, backend: WebTransportBackend) {
        self.webtransport_backend = Some(backend);
        // Register network adapter for WebTransport sync
    }
}
```

### Binary Save/Load Roundtrip
```rust
impl SensoriumDocument {
    pub fn save_binary(&self) -> Result<Vec<u8>> {
        let doc = Automerge::new();
        let mut tx = doc.transaction();
        self.put_into_automerge(&mut tx)?;
        tx.commit();
        Ok(doc.save())
    }
    
    pub fn load_binary(data: &[u8]) -> Result<Self> {
        let doc = Automerge::load(data)?;
        Self::from_automerge(&doc)
    }
    
    pub fn put_into_automerge(&self, tx: &mut automerge::transaction::Transaction) -> Result {
        // Put tracks
        let tracks_obj = tx.put_object(ROOT, "tracks", automerge::ObjType::List)?;
        for track in &self.tracks {
            let track_obj = tx.insert_object(&tracks_obj, track.id.clone(), automerge::ObjType::Map)?;
            tx.put(&track_obj, "name", track.name.clone())?;
            // ... other fields
        }
        // ... clips, settings, metadata
        Ok(())
    }
}
```

### Yjs Web Provider (Frontend)
```typescript
// packages/frontend/src/sync/yjs-doc.ts
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { WebtransportProvider } from 'y-webtransport'

export const yjsDoc = new Y.Doc()

// WebRTC for local P2P
export const webrtcProvider = new WebrtcProvider('sensorium-room', yjsDoc, {
  signaling: ['wss://signaling.sensorium.ai'],
})

// WebTransport for server-backed sync (when available)
export const webtransportProvider = new WebtransportProvider(
  'https://sync.sensorium.ai',
  'sensorium-room',
  yjsDoc
)

// Awareness for cursor/selection sharing
yjsDoc.on('update', (update) => {
  // Persist to IndexedDB or send to backend
  localStorage.setItem('sensorium-yjs', JSON.stringify(Y.encodeStateAsUpdate(yjsDoc)))
})
```

## Verification Gates

### Gate M1: Sync Latency
```bash
# Benchmark sync roundtrip
cargo bench --package sensorium-sync -- sync_roundtrip

# Target: < 5ms for < 1000 events
```

### Gate M2: Conflict Resolution
```bash
# Property-based test for merge conflicts
cargo test --package sensorium-sync -- merge_conflict_resolution
```

### Gate M3: Binary Roundtrip
```bash
# Verify save/load preserves all data
cargo test --package sensorium-sync -- binary_roundtrip
```

## Integration Points

### Contract-First Sync (Protobuf)
```protobuf
// specs/state-sync.proto
message AutomergeOp {
  string operation_type = 1;
  string object_id = 2;
  bytes encoding = 3;
}

message SyncMessage {
  string peer_id = 1;
  int64 timestamp = 2;
  repeated AutomergeOp operations = 3;
}

message DocumentPatch {
  repeated AutomergeOp changes = 1;
  ConflictResolution conflict_resolution = 2;
}

enum ConflictResolution {
  AUTOMERGE = 0;
  LAST_WRITE_WINS = 1;
  CUSTOM = 2;
}
```

### Code Generation
```bash
# Rust types
cargo build --package sensorium-sync  # build.rs generates from .proto

# TypeScript types
npm run generate:types  # generates from openapi.yaml
```

## Common Issues & Fixes

### Automerge 2.0 Migration (from 0.7.0)
```rust
// OLD (0.7.0)
use automerge::Automerge;
let doc = Automerge::new();

// NEW (2.0)
use automerge::{Automerge, transaction::Transactable};
let doc = Automerge::new();
// Transactions are now explicit
let mut tx = doc.transaction();
tx.put(ROOT, "key", "value")?;
tx.commit();
```

### Storage Backend Selection
| Backend | Use Case | Latency |
|---------|----------|---------|
| MemoryStorage | Testing, ephemeral | < 1ms |
| SqliteStorage | Persistent local | < 5ms |
| IndexedDB (Web) | Browser persistence | < 10ms |
| WebTransport | Real-time sync | < 50ms |

## Verification Report Template
```
AUTOMERGE VERIFICATION REPORT
=============================
Binary Roundtrip:    [PASS/FAIL] (X ms)
Sync Latency:        [PASS/FAIL] (p99: X ms, target: < 10ms)
Conflict Resolution: [PASS/FAIL] (X/Y scenarios)
Storage Backends:    [PASS/FAIL] (Memory, SQLite, Web)
Yjs Integration:     [PASS/FAIL] (WebRTC, WebTransport)
Contract Drift:      [PASS/FAIL] (proto vs Rust)
Overall:             [READY/NOT READY]
```