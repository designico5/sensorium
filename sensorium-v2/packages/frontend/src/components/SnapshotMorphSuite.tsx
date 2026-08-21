/**
 * SENSORIUM V2 — Snapshot Morph Suite
 * Blueprint §5.1: State-Speicherung in IndexedDB, Morph Crossfade Animation
 * Speichert komplette App-Snapshots und ermöglicht weiche Übergänge
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useAudioStore,
  useVisualStore,
  useMixerStore,
  useUiStore,
} from '../store';
import type { ViewMode, VisualPreset } from '../store';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface SnapshotData {
  id: string;
  name: string;
  timestamp: number;
  color: string;
  audio: {
    bpm: number;
    transport: string;
  };
  visual: {
    preset: string;
    reactive: boolean;
    intensity: number;
    bloom: number;
  };
  ui: {
    viewMode: ViewMode;
    showVisualizer: boolean;
    showAiPanel: boolean;
  };
  mixer: {
    channels: Array<{
      name: string;
      volume: number;
      pan: number;
      mute: boolean;
      solo: boolean;
    }>;
  };
}

/* ═══════════════════════════════════════════════════════════════════
   IndexedDB Helpers
   ═══════════════════════════════════════════════════════════════════ */

const DB_NAME = 'sensorium-snapshots-v2';
const STORE_NAME = 'morph-snapshots';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllSnapshots(): Promise<SnapshotData[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => resolve([]);
    tx.oncomplete = () => db.close();
  });
}

async function putSnapshot(snap: SnapshotData): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(snap);
  return new Promise((resolve) => {
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve) => {
    tx.oncomplete = () => { db.close(); resolve(); };
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Snapshot Colors
   ═══════════════════════════════════════════════════════════════════ */

const SNAPSHOT_COLORS = [
  '#ff2d55', '#af52de', '#5ac8fa', '#ff9f0a',
  '#30d158', '#ffd60a', '#ff453a', '#64d2ff',
  '#bf5af2', '#ff6482', '#30db5b', '#ffa940',
];

/* ═══════════════════════════════════════════════════════════════════
   Capture Current State
   ═══════════════════════════════════════════════════════════════════ */

function captureState(): Omit<SnapshotData, 'id' | 'name' | 'timestamp' | 'color'> {
  const audio = useAudioStore.getState();
  const visual = useVisualStore.getState();
  const ui = useUiStore.getState();
  const mixer = useMixerStore.getState();

  return {
    audio: {
      bpm: audio.bpm,
      transport: audio.transport,
    },
    visual: {
      preset: visual.preset,
      reactive: visual.reactive,
      intensity: visual.intensity,
      bloom: visual.bloom,
    },
    ui: {
      viewMode: ui.viewMode,
      showVisualizer: ui.showVisualizer,
      showAiPanel: ui.showAiPanel,
    },
    mixer: {
      channels: mixer.channels.map((ch) => ({
        name: ch.name,
        volume: ch.volume,
        pan: ch.pan,
        mute: ch.mute,
        solo: ch.solo,
      })),
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════
   Apply Snapshot with Morph
   ═══════════════════════════════════════════════════════════════════ */

function applySnapshot(
  snap: SnapshotData,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve) => {
    const duration = 800; // ms
    const start = performance.now();

    // Capture current state as "from"
    const from = captureState();

    const animate = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      // Interpolate BPM
      const bpmFrom = from.audio.bpm;
      const bpmTo = snap.audio.bpm;
      const currentBpm = Math.round(bpmFrom + (bpmTo - bpmFrom) * ease);
      useAudioStore.getState().setBpm(currentBpm);

      // Interpolate visual intensity
      const intFrom = from.visual.intensity;
      const intTo = snap.visual.intensity;
      const currentIntensity = intFrom + (intTo - intFrom) * ease;
      useVisualStore.getState().setIntensity(currentIntensity);

      // Progress callback
      onProgress?.(t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        // Apply discrete values at end
        useVisualStore.getState().setPreset(snap.visual.preset as VisualPreset);
        // Toggle reactive if needed to match snapshot
        if (useVisualStore.getState().reactive !== snap.visual.reactive) {
          useVisualStore.getState().toggleReactive();
        }
        useVisualStore.getState().setBloom(snap.visual.bloom);
        useUiStore.getState().setViewMode(snap.ui.viewMode);

        // Apply mixer channels
        const mixerState = useMixerStore.getState();
        snap.mixer.channels.forEach((ch, i) => {
          if (i < mixerState.channels.length) {
            mixerState.setVolume(i, ch.volume);
            mixerState.setPan(i, ch.pan);
            if (ch.mute !== mixerState.channels[i].mute) mixerState.toggleMute(i);
            if (ch.solo !== mixerState.channels[i].solo) mixerState.toggleSolo(i);
          }
        });

        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Snapshot Card ─────────────────────────────────────────────── */
function SnapshotCard({
  snapshot,
  isActive,
  isMorphing,
  morphProgress,
  onLoad,
  onDelete,
}: {
  snapshot: SnapshotData;
  isActive: boolean;
  isMorphing: boolean;
  morphProgress: number;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const timeAgo = formatTimeAgo(snapshot.timestamp);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onLoad}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: isActive
          ? `linear-gradient(135deg, ${snapshot.color}15, ${snapshot.color}08)`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isActive ? `${snapshot.color}40` : 'var(--border-subtle)'}`,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Morph progress bar */}
      {isMorphing && (
        <motion.div
          animate={{ width: `${morphProgress * 100}%` }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 2,
            background: snapshot.color,
            boxShadow: `0 0 8px ${snapshot.color}`,
          }}
        />
      )}

      {/* Color indicator */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: snapshot.color,
        boxShadow: isActive ? `0 0 8px ${snapshot.color}` : 'none',
      }} />

      {/* Name */}
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 4,
        paddingRight: 16,
      }}>
        {snapshot.name}
      </div>

      {/* Metadata */}
      <div style={{
        display: 'flex',
        gap: 8,
        fontSize: 9,
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-mono)',
      }}>
        <span>{snapshot.audio.bpm} BPM</span>
        <span>{snapshot.visual.preset}</span>
        <span>{timeAgo}</span>
      </div>

      {/* Delete button */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.8 }}
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'rgba(255,69,58,0.1)',
          border: '1px solid rgba(255,69,58,0.2)',
          color: 'var(--neon-danger)',
          fontSize: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.5,
        }}
        aria-label={`Delete ${snapshot.name}`}
      >
        ×
      </motion.button>
    </motion.div>
  );
}

/* ── Time Ago Formatter ────────────────────────────────────────── */
function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════════════════════════════
   Main SnapshotMorphSuite Component
   ═══════════════════════════════════════════════════════════════════ */

export default function SnapshotMorphSuite() {
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [isMorphing, setIsMorphing] = useState(false);
  const [morphingId, setMorphingId] = useState<string | null>(null);
  const [morphProgress, setMorphProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const morphAbortRef = useRef(false);

  // Load snapshots on mount
  useEffect(() => {
    getAllSnapshots().then((snaps) => {
      setSnapshots(snaps.sort((a, b) => b.timestamp - a.timestamp));
    });
  }, []);

  // Save new snapshot
  const handleSave = useCallback(async () => {
    const name = nameInput.trim() || `Snapshot ${snapshots.length + 1}`;
    const colorIdx = snapshots.length % SNAPSHOT_COLORS.length;
    const state = captureState();

    const snap: SnapshotData = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      timestamp: Date.now(),
      color: SNAPSHOT_COLORS[colorIdx],
      ...state,
    };

    await putSnapshot(snap);
    const updated = await getAllSnapshots();
    setSnapshots(updated.sort((a, b) => b.timestamp - a.timestamp));
    setNameInput('');
    setShowSaveForm(false);
  }, [nameInput, snapshots.length]);

  // Load snapshot with morph
  const handleLoad = useCallback(async (snap: SnapshotData) => {
    if (isMorphing) return;
    setIsMorphing(true);
    setMorphingId(snap.id);
    morphAbortRef.current = false;

    await applySnapshot(snap, (progress) => {
      setMorphProgress(progress);
    });

    setActiveId(snap.id);
    setIsMorphing(false);
    setMorphingId(null);
    setMorphProgress(0);

    // Clear active highlight after 2s
    setTimeout(() => setActiveId(null), 2000);
  }, [isMorphing]);

  // Delete snapshot
  const handleDelete = useCallback(async (id: string) => {
    await deleteSnapshot(id);
    const updated = await getAllSnapshots();
    setSnapshots(updated.sort((a, b) => b.timestamp - a.timestamp));
    if (activeId === id) setActiveId(null);
  }, [activeId]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 12,
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>
            Snapshots
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginTop: 2,
          }}>
            {snapshots.length} saved · Click to morph
          </div>
        </div>

        {/* Save button */}
        <motion.button
          onClick={() => setShowSaveForm(!showSaveForm)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            background: showSaveForm ? 'rgba(90,200,250,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${showSaveForm ? 'var(--neon-treble)' : 'var(--border-subtle)'}`,
            color: showSaveForm ? 'var(--neon-treble)' : 'var(--text-tertiary)',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Save
        </motion.button>
      </div>

      {/* Save form */}
      <AnimatePresence>
        {showSaveForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex',
              gap: 6,
              padding: '8px 0',
            }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Snapshot name..."
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: 11,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <motion.button
                onClick={handleSave}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--neon-treble)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Morphing indicator */}
      <AnimatePresence>
        {isMorphing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(90,200,250,0.08)',
              border: '1px solid rgba(90,200,250,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid var(--neon-treble)',
                borderTopColor: 'transparent',
              }}
            />
            <span style={{
              fontSize: 10,
              color: 'var(--neon-treble)',
              fontWeight: 600,
            }}>
              Morphing...
            </span>
            <div style={{
              flex: 1,
              height: 2,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 1,
              overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${morphProgress * 100}%` }}
                style={{
                  height: '100%',
                  background: 'var(--neon-treble)',
                  borderRadius: 1,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapshot list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflowY: 'auto',
        flex: 1,
        paddingRight: 4,
      }}>
        <AnimatePresence mode="popLayout">
          {snapshots.map((snap) => (
            <SnapshotCard
              key={snap.id}
              snapshot={snap}
              isActive={activeId === snap.id}
              isMorphing={morphingId === snap.id}
              morphProgress={morphProgress}
              onLoad={() => handleLoad(snap)}
              onDelete={() => handleDelete(snap.id)}
            />
          ))}
        </AnimatePresence>

        {snapshots.length === 0 && !showSaveForm && (
          <div style={{
            padding: 20,
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            fontSize: 11,
          }}>
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>◇</div>
            No snapshots yet.
            <br />
            <span style={{ fontSize: 9 }}>Save your current state to morph between configurations.</span>
          </div>
        )}
      </div>
    </div>
  );
}
