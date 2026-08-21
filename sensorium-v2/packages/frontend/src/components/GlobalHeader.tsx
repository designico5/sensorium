/**
 * SENSORIUM V2 — Global Master Header & Transport Bar
 * Blueprint §2.1: Safe Mode, Panic (CC123), Tap-Tempo, Snapshot Slots, Workspace Tabs
 */
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAudioStore, useUiStore } from '../store';
import type { ViewMode } from '../store';
import { useLongPress, RippleButton, GlowPulse, Tooltip, ContextMenu, useContextMenu } from '../lib/interactions';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

export type WorkspaceTab = 'studio' | 'hardware' | 'daw' | 'industrial';

interface WorkspaceDef {
  id: WorkspaceTab;
  label: string;
  icon: JSX.Element;
}

const WORKSPACES: WorkspaceDef[] = [
  {
    id: 'studio',
    label: 'Studio',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5" /><circle cx="7" cy="7" r="2" /><line x1="7" y1="2" x2="7" y2="4" /></svg>,
  },
  {
    id: 'hardware',
    label: 'Hardware',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="10" height="8" rx="1" /><line x1="5" y1="6" x2="5" y2="8" /><line x1="7" y1="5" x2="7" y2="9" /><line x1="9" y1="6" x2="9" y2="8" /></svg>,
  },
  {
    id: 'daw',
    label: 'DAW',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="5" height="3" rx="0.5" /><rect x="8" y="2" width="5" height="3" rx="0.5" /><rect x="1" y="7" width="5" height="3" rx="0.5" /><rect x="8" y="7" width="5" height="3" rx="0.5" /></svg>,
  },
  {
    id: 'industrial',
    label: 'Industrial',
    icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12V6L5 4V12" /><path d="M5 12V4L9 2V12" /><path d="M9 12V5L12 3V12" /><line x1="1" y1="12" x2="13" y2="12" /></svg>,
  },
];

const SNAPSHOT_COLORS = [
  '#ff2d55', '#af52de', '#5ac8fa', '#ff9f0a',
  '#30d158', '#ffd60a', '#ff453a', '#64d2ff',
];

/* ═══════════════════════════════════════════════════════════════════
   Snapshot Store (IndexedDB-backed)
   ═══════════════════════════════════════════════════════════════════ */

interface SnapshotState {
  name: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const DB_NAME = 'sensorium-snapshots';
const STORE_NAME = 'snapshots';

async function openSnapshotDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSnapshot(slot: number, state: SnapshotState): Promise<void> {
  const db = await openSnapshotDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(state, slot);
  db.close();
}

async function loadSnapshot(slot: number): Promise<SnapshotState | null> {
  const db = await openSnapshotDB();
  return new Promise((resolve) => {
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(slot);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Transport Button (with ripple + glow) ─────────────────────── */
function HeaderTransportBtn({
  active,
  color,
  onClick,
  label,
  children,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip text={label} position="bottom">
      <RippleButton
        onClick={onClick}
        color={`${color}40`}
        aria-label={label}
        aria-pressed={active}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? color : 'rgba(255,255,255,0.05)',
          border: `1px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
          color: active ? '#fff' : 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
        <GlowPulse color={color} isActive={active} size="sm" />
      </RippleButton>
    </Tooltip>
  );
}

/* ── Tap Tempo (with long-press reset + scroll wheel) ────────── */
function TapTempo() {
  const setBpm = useAudioStore((s) => s.setBpm);
  const bpm = useAudioStore((s) => s.bpm);
  const tapsRef = useRef<number[]>([]);
  const [flash, setFlash] = useState(false);

  const handleTap = useCallback(() => {
    const now = performance.now();
    tapsRef.current.push(now);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    // Keep last 8 taps
    if (tapsRef.current.length > 8) tapsRef.current.shift();
    // Need at least 2 taps
    if (tapsRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapsRef.current.length; i++) {
        intervals.push(tapsRef.current[i] - tapsRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const detectedBpm = Math.round(60000 / avgInterval);
      if (detectedBpm >= 20 && detectedBpm <= 300) {
        setBpm(detectedBpm);
      }
    }
    // Reset if gap > 3 seconds
    if (tapsRef.current.length >= 2) {
      const last = tapsRef.current[tapsRef.current.length - 1];
      const prev = tapsRef.current[tapsRef.current.length - 2];
      if (last - prev > 3000) {
        tapsRef.current = [now];
      }
    }
  }, [setBpm]);

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      setBpm(120);
      tapsRef.current = [];
    },
    threshold: 600,
  });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 0.1 : 1;
    const delta = e.deltaY < 0 ? step : -step;
    setBpm(Math.round(Math.min(300, Math.max(20, bpm + delta))));
  }, [bpm, setBpm]);

  return (
    <motion.button
      onClick={handleTap}
      onWheel={handleWheel}
      {...longPressHandlers}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      style={{
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        background: flash ? 'rgba(90,200,250,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${flash ? 'var(--neon-treble)' : 'var(--border-subtle)'}`,
        color: 'var(--text-secondary)',
        fontSize: 10,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono)',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      aria-label="Tap tempo (scroll to adjust, long-press to reset)"
    >
      <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-tertiary)' }}>TAP</span>
      <motion.span
        key={bpm}
        initial={{ scale: 1.15, color: 'var(--neon-treble)' }}
        animate={{ scale: 1, color: 'var(--text-primary)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        style={{ fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: 'center' }}
      >
        {bpm}
      </motion.span>
    </motion.button>
  );
}

/* ── Safe Mode Shield ──────────────────────────────────────────── */
function SafeModeButton() {
  const [safeMode, setSafeMode] = useState(false);

  return (
    <motion.button
      onClick={() => setSafeMode(!safeMode)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label="Toggle safe mode"
      aria-pressed={safeMode}
      style={{
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        background: safeMode ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${safeMode ? 'var(--neon-warning)' : 'var(--border-subtle)'}`,
        color: safeMode ? 'var(--neon-warning)' : 'var(--text-tertiary)',
        fontSize: 10,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 1L10 3V6C10 8.5 6 11 6 11C6 11 2 8.5 2 6V3L6 1Z" />
        {safeMode && <path d="M4.5 6L5.5 7L7.5 5" />}
      </svg>
      <span>SAFE</span>
      {safeMode && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--neon-warning)',
            boxShadow: '0 0 6px var(--neon-warning)',
          }}
        />
      )}
    </motion.button>
  );
}

/* ── Panic Button (CC 123) ─────────────────────────────────────── */
function PanicButton() {
  const [triggered, setTriggered] = useState(false);

  const handlePanic = useCallback(() => {
    setTriggered(true);
    // In production: sends CC 123 + CC 120 via Tauri IPC to Rust MIDI backend
    // window.__TAURI__.invoke('panic_all_notes_off');
    setTimeout(() => setTriggered(false), 1500);
  }, []);

  return (
    <motion.button
      onClick={handlePanic}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.85 }}
      aria-label="Panic: All Notes Off"
      style={{
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        background: triggered ? 'var(--neon-danger)' : 'rgba(255,69,58,0.08)',
        border: `1px solid ${triggered ? 'var(--neon-danger)' : 'rgba(255,69,58,0.3)'}`,
        color: triggered ? '#fff' : 'var(--neon-danger)',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="6" cy="6" r="4" />
        <line x1="6" y1="3" x2="6" y2="6.5" />
        <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
      </svg>
      PANIC
      <AnimatePresence>
        {triggered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--neon-danger)',
              boxShadow: '0 0 20px var(--neon-danger)',
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── Snapshot Memory Slots (with context menu) ────────────────── */
function SnapshotSlots() {
  const [savedSlots, setSavedSlots] = useState<Set<number>>(new Set());
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const { anchor, onContextMenu, close } = useContextMenu();
  const [contextSlot, setContextSlot] = useState<number | null>(null);

  const handleSave = useCallback(async (slot: number) => {
    const state = {
      name: `Snapshot ${slot + 1}`,
      data: {
        bpm: useAudioStore.getState().bpm,
        transport: useAudioStore.getState().transport,
        viewMode: useUiStore.getState().viewMode,
      },
      timestamp: Date.now(),
    };
    await saveSnapshot(slot, state);
    setSavedSlots((prev) => new Set([...prev, slot]));
  }, []);

  const handleLoad = useCallback(async (slot: number) => {
    const snap = await loadSnapshot(slot);
    if (snap) {
      const data = snap.data as { bpm?: number; viewMode?: ViewMode };
      if (data.bpm) useAudioStore.getState().setBpm(data.bpm);
      if (data.viewMode) useUiStore.getState().setViewMode(data.viewMode);
      setActiveSlot(slot);
      setTimeout(() => setActiveSlot(null), 800);
    }
  }, []);

  const handleDelete = useCallback((slot: number) => {
    setSavedSlots((prev) => {
      const next = new Set(prev);
      next.delete(slot);
      return next;
    });
  }, []);

  const getContextMenuItems = () => {
    if (contextSlot === null) return [];
    const slot = contextSlot;
    const isSaved = savedSlots.has(slot);
    return [
      { label: isSaved ? 'Overwrite' : 'Save Here', onClick: () => handleSave(slot) },
      ...(isSaved ? [{ label: 'Load Snapshot', onClick: () => handleLoad(slot) }] : []),
      ...(isSaved ? [{ label: 'Delete', onClick: () => handleDelete(slot), danger: true, separator: true } as const] : []),
    ];
  };

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }} onContextMenu={onContextMenu}>
      <span style={{ fontSize: 8, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginRight: 2 }}>
        MEM
      </span>
      {SNAPSHOT_COLORS.map((color, i) => (
        <Tooltip key={i} text={`Slot ${i + 1}: Click=Save, DblClick=Load`} position="bottom">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => handleSave(i)}
            onDoubleClick={() => handleLoad(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextSlot(i);
              onContextMenu(e);
            }}
            onMouseEnter={() => setHoveredSlot(i)}
            onMouseLeave={() => setHoveredSlot(null)}
            style={{
              width: 18,
              height: 18,
              borderRadius: 3,
              background: savedSlots.has(i) ? color : 'rgba(255,255,255,0.06)',
              border: `1px solid ${savedSlots.has(i) ? color : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              position: 'relative',
              opacity: activeSlot === i ? 1 : hoveredSlot === i ? 0.9 : 0.7,
              boxShadow: activeSlot === i ? `0 0 10px ${color}` : hoveredSlot === i ? `0 0 6px ${color}40` : 'none',
              transition: 'opacity 0.15s, box-shadow 0.15s',
            }}
            aria-label={`Snapshot slot ${i + 1}`}
          >
            {savedSlots.has(i) && (
              <div style={{
                position: 'absolute',
                inset: 3,
                borderRadius: 1,
                background: 'rgba(0,0,0,0.3)',
              }} />
            )}
          </motion.button>
        </Tooltip>
      ))}
      <ContextMenu items={getContextMenuItems()} anchor={anchor} onClose={close} />
    </div>
  );
}

/* ── Workspace Tab Selector ────────────────────────────────────── */
function WorkspaceTabs() {
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);

  // Map ViewMode to WorkspaceTab
  const activeWorkspace: WorkspaceTab =
    viewMode === 'mixer' || viewMode === 'visual' ? 'studio' :
    viewMode === 'arrangement' ? 'daw' : 'studio';

  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {WORKSPACES.map((ws) => {
        const isActive = activeWorkspace === ws.id;
        return (
          <motion.button
            key={ws.id}
            onClick={() => {
              const modeMap: Record<WorkspaceTab, ViewMode> = {
                studio: 'session',
                hardware: 'session',
                daw: 'arrangement',
                industrial: 'mixer',
              };
              setViewMode(modeMap[ws.id]);
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              background: isActive ? 'rgba(90,200,250,0.1)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(90,200,250,0.25)' : 'transparent'}`,
              color: isActive ? 'var(--neon-treble)' : 'var(--text-tertiary)',
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s',
            }}
            aria-label={`${ws.label} workspace`}
            aria-current={isActive ? 'page' : undefined}
          >
            {ws.icon}
            {ws.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ── Beat Indicator (compact) ──────────────────────────────────── */
function CompactBeatIndicator() {
  const beat = useAudioStore((s) => s.beat);
  const transport = useAudioStore((s) => s.transport);
  const isActive = transport === 'playing' || transport === 'recording';

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: isActive && beat === i ? 1.4 : 1,
            background: isActive && beat === i
              ? (i === 0 ? 'var(--neon-bass)' : 'var(--neon-treble)')
              : 'rgba(255,255,255,0.08)',
          }}
          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            boxShadow: isActive && beat === i
              ? `0 0 6px ${i === 0 ? 'var(--neon-bass)' : 'var(--neon-treble)'}`
              : 'none',
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main GlobalHeader Component
   ═══════════════════════════════════════════════════════════════════ */
export default function GlobalHeader() {
  const transport = useAudioStore((s) => s.transport);
  const play = useAudioStore((s) => s.play);
  const stop = useAudioStore((s) => s.stop);
  const record = useAudioStore((s) => s.record);
  const masterPeakL = useAudioStore((s) => s.masterPeakL);

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="glass-elevated"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        borderRadius: 'var(--radius-lg)',
        height: 48,
      }}
    >
      {/* Logo */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, var(--neon-bass), var(--neon-mid), var(--neon-treble), var(--neon-bass))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--surface-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 900,
          color: 'var(--text-primary)',
        }}>
          S
        </div>
      </motion.div>

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />

      {/* Transport */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <HeaderTransportBtn active={transport === 'stopped'} color="rgba(255,255,255,0.15)" onClick={stop} label="Stop">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1.5" y="1.5" width="7" height="7" rx="1" /></svg>
        </HeaderTransportBtn>
        <HeaderTransportBtn active={transport === 'playing'} color="var(--neon-success)" onClick={play} label="Play">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="2,0.5 9,5 2,9.5" /></svg>
        </HeaderTransportBtn>
        <HeaderTransportBtn active={transport === 'recording'} color="var(--neon-danger)" onClick={record} label="Record">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><circle cx="5" cy="5" r="3.5" /></svg>
        </HeaderTransportBtn>
      </div>

      {/* Beat Indicator */}
      <CompactBeatIndicator />

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />

      {/* Tap Tempo */}
      <TapTempo />

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />

      {/* Workspace Tabs */}
      <WorkspaceTabs />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Snapshot Slots */}
      <SnapshotSlots />

      {/* Separator */}
      <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />

      {/* Safe Mode */}
      <SafeModeButton />

      {/* Panic */}
      <PanicButton />

      {/* Master Meter (compact) */}
      <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 20 }}>
        {[masterPeakL, masterPeakL * 0.95].map((peak, i) => {
          const c = peak > 0.85 ? 'var(--meter-red)' : peak > 0.6 ? 'var(--meter-yellow)' : 'var(--meter-green)';
          return (
            <motion.div
              key={i}
              animate={{ height: `${peak * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{
                width: 3,
                height: '100%',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${peak * 100}%`,
                background: c,
                borderRadius: 1,
                boxShadow: `0 0 4px ${c}60`,
              }} />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
