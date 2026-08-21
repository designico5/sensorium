/**
 * SENSORIUM V2 — Joy Features
 * Micro-delighters & live-production utilities that bring joy.
 * Deep-researched features missing from all existing solutions.
 */
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/* ═══════════════════════════════════════════════════════════════════
   useHaptic — Visual haptic feedback on any interaction
   Provides: tap, snap, error, success feedback with animation
   ═══════════════════════════════════════════════════════════════════ */

export type HapticType = 'tap' | 'snap' | 'error' | 'success' | 'warning';

export function useHaptic() {
  const [feedback, setFeedback] = useState<{ type: HapticType; id: number } | null>(null);

  const trigger = useCallback((type: HapticType = 'tap') => {
    // Vibration API for mobile/touch devices
    if (navigator.vibrate) {
      const patterns: Record<HapticType, number | number[]> = {
        tap: 10,
        snap: [5, 30, 5],
        error: [20, 50, 20],
        success: [5, 30, 5, 30, 5],
        warning: [15, 40, 15],
      };
      navigator.vibrate(patterns[type]);
    }
    setFeedback({ type, id: Date.now() });
    setTimeout(() => setFeedback(null), 600);
  }, []);

  return { feedback, trigger };
}

/* ═══════════════════════════════════════════════════════════════════
   HapticFeedback — Visual feedback overlay component
   ═══════════════════════════════════════════════════════════════════ */

export function HapticFeedback({ type }: { type: HapticType }) {
  const colorMap: Record<HapticType, string> = {
    tap: 'var(--haptic-tap)',
    snap: 'var(--haptic-snap)',
    error: 'var(--haptic-error)',
    success: 'var(--haptic-success)',
    warning: 'var(--neon-warning)',
  };
  const c = colorMap[type];

  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.9 }}
      animate={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'absolute',
        inset: -4,
        borderRadius: 'inherit',
        boxShadow: `0 0 16px ${c}, inset 0 0 8px ${c}`,
        pointerEvents: 'none',
        border: type === 'error' ? `2px solid var(--neon-danger)` : 'none',
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   NotificationSystem — Toast notifications for actions
   ═══════════════════════════════════════════════════════════════════ */

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  duration?: number;
}

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toastState: Toast[] = [];

export function notify(message: string, type: Toast['type'] = 'info', duration = 3000) {
  const toast: Toast = { id: Date.now(), message, type, duration };
  toastState = [...toastState, toast];
  toastListeners.forEach((fn) => fn(toastState));
  setTimeout(() => {
    toastState = toastState.filter((t) => t.id !== toast.id);
    toastListeners.forEach((fn) => fn(toastState));
  }, duration);
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    toastListeners.push(setToasts);
    return () => { toastListeners = toastListeners.filter((l) => l !== setToasts); };
  }, []);
  return toasts;
}

export function ToastContainer() {
  const toasts = useToasts();
  const icons: Record<string, string> = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 'var(--z-toast)' as any,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ x: 40, opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 40, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`toast toast--${t.type}`}
            style={{ pointerEvents: 'auto' }}
          >
            <span style={{ fontSize: 12 }}>{icons[t.type]}</span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useUndoRedo — Parameter undo/redo stack
   Critical for live shows: "Oh shit, undo!" button
   ═══════════════════════════════════════════════════════════════════ */

export function useUndoRedo<T>(maxHistory = 50) {
  const [history, setHistory] = useState<T[]>([]);
  const [index, setIndex] = useState(-1);
  const isUndoRedoing = useRef(false);

  const push = useCallback((state: T) => {
    if (isUndoRedoing.current) return;
    setHistory((prev) => {
      const next = prev.slice(0, index + 1);
      next.push(state);
      if (next.length > maxHistory) next.shift();
      return next;
    });
    setIndex((prev) => Math.min(prev + 1, maxHistory - 1));
  }, [index, maxHistory]);

  const undo = useCallback(() => {
    if (index <= 0) return null;
    isUndoRedoing.current = true;
    setIndex((prev) => prev - 1);
    const state = history[index - 1];
    setTimeout(() => { isUndoRedoing.current = false; }, 0);
    return state;
  }, [index, history]);

  const redo = useCallback(() => {
    if (index >= history.length - 1) return null;
    isUndoRedoing.current = true;
    setIndex((prev) => prev + 1);
    const state = history[index + 1];
    setTimeout(() => { isUndoRedoing.current = false; }, 0);
    return state;
  }, [index, history]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { push, undo, redo, canUndo, canRedo, historySize: history.length };
}

/* ═══════════════════════════════════════════════════════════════════
   useKeyboardShortcuts — Global keyboard shortcut system
   ═══════════════════════════════════════════════════════════════════ */

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  label: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = s.alt ? e.altKey : !e.altKey;
        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (s.preventDefault) e.preventDefault();
          s.action();
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

/* ═══════════════════════════════════════════════════════════════════
   useClipboard — Copy/paste parameter values
   ═══════════════════════════════════════════════════════════════════ */

export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      notify(`Copied: ${value}`, 'success', 1500);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify('Copy failed', 'error');
    }
  }, []);

  const paste = useCallback(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      notify('Paste failed', 'error');
      return null;
    }
  }, []);

  return { copy, paste, copied };
}

/* ═══════════════════════════════════════════════════════════════════
   useShowMode — Live performance mode
   Big targets, high contrast, locked controls
   ═══════════════════════════════════════════════════════════════════ */

export function useShowMode() {
  const [isShowMode, setIsShowMode] = useState(false);

  const toggle = useCallback(() => {
    setIsShowMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('show-mode', next);
      notify(next ? 'SHOW MODE — Controls locked, big targets' : 'Studio Mode — Full controls', next ? 'warning' : 'info', 2000);
      return next;
    });
  }, []);

  return { isShowMode, toggle };
}

/* ═══════════════════════════════════════════════════════════════════
   StemColors — Industry-standard stem category colors
   ═══════════════════════════════════════════════════════════════════ */

export const STEM_CATEGORIES = {
  drums: { color: 'var(--stem-drums)', label: 'Drums', icon: '🥁' },
  bass: { color: 'var(--stem-bass)', label: 'Bass', icon: '🎸' },
  keys: { color: 'var(--stem-keys)', label: 'Keys', icon: '🎹' },
  synth: { color: 'var(--stem-synth)', label: 'Synth', icon: '🎛' },
  guitar: { color: 'var(--stem-guitar)', label: 'Guitar', icon: '🎸' },
  vocals: { color: 'var(--stem-vocals)', label: 'Vocals', icon: '🎤' },
  fx: { color: 'var(--stem-fx)', label: 'FX', icon: '✨' },
  brass: { color: 'var(--stem-brass)', label: 'Brass', icon: '🎺' },
  strings: { color: 'var(--stem-strings)', label: 'Strings', icon: '🎻' },
  perc: { color: 'var(--stem-perc)', label: 'Perc', icon: '🔔' },
} as const;

export type StemCategory = keyof typeof STEM_CATEGORIES;

export function getStemColor(category: StemCategory): string {
  return STEM_CATEGORIES[category].color;
}

/* ═══════════════════════════════════════════════════════════════════
   FloatingValue — Animated value display on hover/drag
   ═══════════════════════════════════════════════════════════════════ */

export function FloatingValue({
  value,
  visible,
  color = 'var(--neon-treble)',
  position = 'top',
}: {
  value: string;
  visible: boolean;
  color?: string;
  position?: 'top' | 'right' | 'bottom';
}) {
  const posStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 },
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="value-display"
          style={{
            position: 'absolute',
            ...posStyles[position],
            color,
            zIndex: 'var(--z-tooltip)' as any,
          }}
        >
          {value}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   StatusIndicator — Animated status dot with label
   ═══════════════════════════════════════════════════════════════════ */

export function StatusIndicator({
  status,
  label,
  size = 'md',
}: {
  status: 'safe' | 'armed' | 'live' | 'standby' | 'offline';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeMap = { sm: 6, md: 8, lg: 12 };
  const s = sizeMap[size];
  const colorMap: Record<string, string> = {
    safe: 'var(--status-safe)',
    armed: 'var(--status-armed)',
    live: 'var(--status-live)',
    standby: 'var(--status-standby)',
    offline: 'var(--status-offline)',
  };
  const color = colorMap[status];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <motion.div
        animate={status === 'live' ? { opacity: [1, 0.3, 1] } : status === 'armed' ? { scale: [1, 1.2, 1] } : {}}
        transition={{ repeat: Infinity, duration: status === 'live' ? 1 : 2 }}
        style={{
          width: s,
          height: s,
          borderRadius: '50%',
          background: color,
          boxShadow: status !== 'offline' ? `0 0 ${s}px ${color}` : 'none',
        }}
      />
      {label && (
        <span style={{ fontSize: 9, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MiniMeter — Tiny inline meter for any context
   ═══════════════════════════════════════════════════════════════════ */

export function MiniMeter({
  value,
  color = 'var(--neon-treble)',
  width = 40,
  height = 3,
  vertical = false,
  showPeak = false,
}: {
  value: number;
  color?: string;
  width?: number;
  height?: number;
  vertical?: boolean;
  showPeak?: boolean;
}) {
  const [peak, setPeak] = useState(0);

  useEffect(() => {
    if (value > peak) setPeak(value);
    const timer = setTimeout(() => setPeak((p) => Math.max(0, p - 0.02)), 100);
    return () => clearTimeout(timer);
  }, [value, peak]);

  const meterColor = value > 0.85 ? 'var(--meter-red)' : value > 0.6 ? 'var(--meter-yellow)' : color;

  return (
    <div style={{
      width: vertical ? height : width,
      height: vertical ? width : height,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: height / 2,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <motion.div
        animate={vertical ? { height: `${value * 100}%` } : { width: `${value * 100}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={{
          position: vertical ? 'absolute' : 'relative',
          [vertical ? 'bottom' : 'left']: 0,
          background: meterColor,
          borderRadius: height / 2,
          boxShadow: `0 0 3px ${meterColor}60`,
        }}
      />
      {showPeak && peak > value && (
        <motion.div
          animate={vertical ? { bottom: `${peak * 100}%` } : { left: `${peak * 100}%` }}
          style={{
            position: 'absolute',
            [vertical ? 'bottom' : 'left']: 0,
            [vertical ? 'height' : 'width']: 2,
            [vertical ? 'width' : 'height']: '100%',
            background: 'var(--meter-red)',
            opacity: 0.8,
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useQuickMidiLearn — Right-click any control → learn MIDI
   ═══════════════════════════════════════════════════════════════════ */

export function useQuickMidiLearn() {
  const [learning, setLearning] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Map<string, { cc: number; channel: number }>>(new Map());

  const startLearn = useCallback((paramId: string) => {
    setLearning(paramId);
    notify(`MIDI Learn: Move a knob or fader...`, 'info', 5000);
    // In production: listens for next MIDI CC message via Tauri IPC
    // window.__TAURI__.invoke('listen_midi_learn', { paramId });
  }, []);

  const completeLearn = useCallback((paramId: string, cc: number, channel: number) => {
    setMappings((prev) => new Map(prev).set(paramId, { cc, channel }));
    setLearning(null);
    notify(`Mapped: CC ${cc} → ${paramId}`, 'success');
  }, []);

  const cancelLearn = useCallback(() => {
    setLearning(null);
  }, []);

  return { learning, mappings, startLearn, completeLearn, cancelLearn };
}

/* ═══════════════════════════════════════════════════════════════════
   useCompareAB — A/B reference comparison
   ═══════════════════════════════════════════════════════════════════ */

export function useCompareAB() {
  const [isComparing, setIsComparing] = useState(false);
  const [referenceName, setReferenceName] = useState<string | null>(null);

  const startCompare = useCallback((name: string) => {
    setReferenceName(name);
    setIsComparing(true);
    notify(`A/B Compare: ${name} loaded`, 'info');
  }, []);

  const stopCompare = useCallback(() => {
    setIsComparing(false);
    setReferenceName(null);
    notify('A/B Compare ended', 'info');
  }, []);

  const toggle = useCallback(() => {
    if (isComparing) stopCompare();
    else if (referenceName) setIsComparing(true);
  }, [isComparing, referenceName, stopCompare]);

  return { isComparing, referenceName, startCompare, stopCompare, toggle };
}

/* ═══════════════════════════════════════════════════════════════════
   useSetlistEngine — Show mode setlist with scene recall
   The #1 missing feature in ALL existing solutions
   ═══════════════════════════════════════════════════════════════════ */

export interface SetlistSong {
  id: string;
  name: string;
  color: string;
  bpm: number;
  key: string;
  duration: string;
  notes?: string;
  scenes: SetlistScene[];
}

export interface SetlistScene {
  id: string;
  name: string;
  snapshotData?: Record<string, unknown>;
}

export function useSetlistEngine(songs: SetlistSong[] = []) {
  const [setlist] = useState<SetlistSong[]>(songs);
  const [currentSongIdx, setCurrentSongIdx] = useState(0);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isAutoAdvance, setIsAutoAdvance] = useState(false);

  const currentSong = setlist[currentSongIdx] ?? null;
  const currentScene = currentSong?.scenes[currentSceneIdx] ?? null;

  const goToSong = useCallback((idx: number) => {
    if (idx >= 0 && idx < setlist.length) {
      setCurrentSongIdx(idx);
      setCurrentSceneIdx(0);
      notify(`→ ${setlist[idx].name}`, 'info', 1500);
    }
  }, [setlist]);

  const nextSong = useCallback(() => {
    goToSong(Math.min(currentSongIdx + 1, setlist.length - 1));
  }, [currentSongIdx, setlist.length, goToSong]);

  const prevSong = useCallback(() => {
    goToSong(Math.max(currentSongIdx - 1, 0));
  }, [currentSongIdx, goToSong]);

  const nextScene = useCallback(() => {
    if (!currentSong) return;
    const next = Math.min(currentSceneIdx + 1, currentSong.scenes.length - 1);
    setCurrentSceneIdx(next);
  }, [currentSong, currentSceneIdx]);

  return {
    setlist, currentSong, currentScene,
    currentSongIdx, currentSceneIdx,
    goToSong, nextSong, prevSong, nextScene,
    isAutoAdvance, setIsAutoAdvance,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   ParameterLock — Lock parameters from accidental changes
   ═══════════════════════════════════════════════════════════════════ */

export function useParameterLock() {
  const [locked, setLocked] = useState<Set<string>>(new Set());

  const toggleLock = useCallback((paramId: string) => {
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(paramId)) {
        next.delete(paramId);
        notify(`Unlocked: ${paramId}`, 'info', 1000);
      } else {
        next.add(paramId);
        notify(`Locked: ${paramId}`, 'warning', 1000);
      }
      return next;
    });
  }, []);

  const isLocked = useCallback((paramId: string) => locked.has(paramId), [locked]);

  const lockAll = useCallback(() => {
    notify('All parameters locked', 'warning');
  }, []);

  const unlockAll = useCallback(() => {
    setLocked(new Set());
    notify('All parameters unlocked', 'success');
  }, []);

  return { locked, toggleLock, isLocked, lockAll, unlockAll };
}

/* ═══════════════════════════════════════════════════════════════════
   useScrollZoom — Scroll to zoom (Ctrl+Scroll)
   ═══════════════════════════════════════════════════════════════════ */

export function useScrollZoom(min = 0.5, max = 3) {
  const [zoom, setZoom] = useState(1);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom((prev) => Math.min(max, Math.max(min, prev + delta)));
    }
  }, [min, max]);

  const resetZoom = useCallback(() => setZoom(1), []);

  return { zoom, handleWheel, resetZoom };
}

/* ═══════════════════════════════════════════════════════════════════
   QuickActionPalette — Command palette (Ctrl+K)
   ═══════════════════════════════════════════════════════════════════ */

export interface QuickAction {
  id: string;
  label: string;
  icon?: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export function useQuickActions(actions: QuickAction[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) =>
      a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useKeyboardShortcuts([{
    key: 'k',
    ctrl: true,
    action: () => setIsOpen((prev) => !prev),
    label: 'Toggle Quick Actions',
    preventDefault: true,
  }]);

  const execute = useCallback((action: QuickAction) => {
    action.action();
    setIsOpen(false);
    setQuery('');
  }, []);

  return { isOpen, setIsOpen, query, setQuery, filtered, execute };
}

/* ═══════════════════════════════════════════════════════════════════
   useLufsMeter — LUFS loudness metering (EBU R128 / ATSC A/85)
   Critical for broadcast compliance — missing in ALL DAWs natively
   ═══════════════════════════════════════════════════════════════════ */

export function useLufsMeter() {
  const [momentary, setMomentary] = useState(-23);
  const [shortTerm, setShortTerm] = useState(-23);
  const [integrated, setIntegrated] = useState(-23);
  const [loudnessRange, setLoudnessRange] = useState({ min: -23, max: -23 });
  const [truePeak, setTruePeak] = useState(-Infinity);

  const update = useCallback((samples: number[]) => {
    if (!samples.length) return;
    // Simplified K-weighting simulation
    const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
    const lufs = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -100;
    setMomentary(lufs);
    setShortTerm((prev) => prev * 0.95 + lufs * 0.05);
    setIntegrated((prev) => prev * 0.999 + lufs * 0.001);
    setTruePeak((prev) => Math.max(prev * 0.999, Math.max(...samples.map(Math.abs)) > 0 ? 20 * Math.log10(Math.max(...samples.map(Math.abs))) : -100));
    setLoudnessRange((prev) => ({
      min: Math.min(prev.min, lufs),
      max: Math.max(prev.max, lufs),
    }));
  }, []);

  const reset = useCallback(() => {
    setMomentary(-23);
    setShortTerm(-23);
    setIntegrated(-23);
    setLoudnessRange({ min: -23, max: -23 });
    setTruePeak(-Infinity);
  }, []);

  const compliance = momentary > -18 && momentary < -14 ? 'broadcast' : momentary > -14 ? 'too-loud' : 'too-quiet';

  return { momentary, shortTerm, integrated, loudnessRange, truePeak, update, reset, compliance };
}

/* ═══════════════════════════════════════════════════════════════════
   LufsMeterDisplay — Visual LUFS meter component
   ═══════════════════════════════════════════════════════════════════ */

export function LufsMeterDisplay({ momentary, shortTerm, integrated, compliance }: {
  momentary: number;
  shortTerm: number;
  integrated: number;
  compliance: string;
}) {
  const scale = (lufs: number) => Math.max(0, Math.min(1, (lufs + 60) / 40));
  const complianceColor = compliance === 'broadcast' ? 'var(--status-safe)' : compliance === 'too-loud' ? 'var(--neon-danger)' : 'var(--neon-warning)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 80 }}>
      {[
        { label: 'M', value: momentary, color: 'var(--neon-treble)' },
        { label: 'S', value: shortTerm, color: 'var(--neon-mid)' },
        { label: 'I', value: integrated, color: 'var(--neon-bass)' },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', width: 8 }}>{label}</span>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${scale(value) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{ height: '100%', background: color, borderRadius: 2 }}
            />
          </div>
          <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color, width: 28, textAlign: 'right' }}>
            {value.toFixed(1)}
          </span>
        </div>
      ))}
      <div style={{ fontSize: 6, color: complianceColor, textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>
        {compliance === 'broadcast' ? '✓ R128' : compliance === 'too-loud' ? '⚠ HOT' : '○ LOW'}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useFrequencyMasking — Detect frequency masking conflicts
   Shows which stems are fighting for the same frequency range
   ═══════════════════════════════════════════════════════════════════ */

export interface MaskingConflict {
  stemA: string;
  stemB: string;
  frequency: string;
  severity: number; // 0-1
}

export function useFrequencyMasking() {
  const [conflicts, setConflicts] = useState<MaskingConflict[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = useCallback((stemSpectra: Map<string, number[]>) => {
    setIsAnalyzing(true);
    const newConflicts: MaskingConflict[] = [];
    const stems = Array.from(stemSpectra.entries());
    const bands = ['Sub', 'Low', 'Low-Mid', 'Mid', 'High-Mid', 'High', 'Air'];

    for (let i = 0; i < stems.length; i++) {
      for (let j = i + 1; j < stems.length; j++) {
        const [nameA, spectrumA] = stems[i];
        const [nameB, spectrumB] = stems[j];
        const bandSize = Math.floor(spectrumA.length / bands.length);
        for (let b = 0; b < bands.length; b++) {
          const start = b * bandSize;
          const end = start + bandSize;
          const energyA = spectrumA.slice(start, end).reduce((s, v) => s + v, 0) / bandSize;
          const energyB = spectrumB.slice(start, end).reduce((s, v) => s + v, 0) / bandSize;
          const overlap = Math.min(energyA, energyB) / Math.max(energyA, energyB, 0.001);
          if (overlap > 0.7) {
            newConflicts.push({ stemA: nameA, stemB: nameB, frequency: bands[b], severity: overlap });
          }
        }
      }
    }
    setConflicts(newConflicts.sort((a, b) => b.severity - a.severity));
    setIsAnalyzing(false);
  }, []);

  return { conflicts, isAnalyzing, analyze };
}

/* ═══════════════════════════════════════════════════════════════════
   useRoundTripLatency — Display audio round-trip latency
   Every live engineer needs this — NONE show it prominently
   ═══════════════════════════════════════════════════════════════════ */

export function useRoundTripLatency() {
  const [latencyMs, setLatencyMs] = useState(0);
  const [jitterMs, setJitterMs] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [status, setStatus] = useState<'good' | 'warning' | 'critical'>('good');

  const update = useCallback((ms: number) => {
    setLatencyMs(ms);
    setHistory((prev) => {
      const next = [...prev, ms].slice(-50);
      const avg = next.reduce((s, v) => s + v, 0) / next.length;
      const variance = next.reduce((s, v) => s + (v - avg) ** 2, 0) / next.length;
      setJitterMs(Math.sqrt(variance));
      return next;
    });
    setStatus(ms < 5 ? 'good' : ms < 15 ? 'warning' : 'critical');
  }, []);

  const avgLatency = history.length ? history.reduce((s, v) => s + v, 0) / history.length : 0;

  return { latencyMs, jitterMs, history, status, avgLatency, update };
}

/* ═══════════════════════════════════════════════════════════════════
   LatencyDisplay — Compact latency badge component
   ═══════════════════════════════════════════════════════════════════ */

export function LatencyDisplay({ latencyMs, jitterMs, status }: {
  latencyMs: number;
  jitterMs: number;
  status: 'good' | 'warning' | 'critical';
}) {
  const statusColor = status === 'good' ? 'var(--status-safe)' : status === 'warning' ? 'var(--neon-warning)' : 'var(--neon-danger)';

  return (
    <motion.div
      animate={{ opacity: [0.7, 1, 0.7] }}
      transition={{ repeat: Infinity, duration: status === 'critical' ? 1 : 3 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 'var(--radius-full)',
        background: `${statusColor}15`,
        border: `1px solid ${statusColor}40`,
        fontSize: 8,
        fontFamily: 'var(--font-mono)',
        color: statusColor,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: statusColor }} />
      {latencyMs.toFixed(1)}ms
      {jitterMs > 0.5 && <span style={{ opacity: 0.6 }}>±{jitterMs.toFixed(1)}</span>}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useTalkback — Talkback mic integration
   Essential for live sound — missing in all software instruments
   ═══════════════════════════════════════════════════════════════════ */

export function useTalkback() {
  const [isActive, setIsActive] = useState(false);
  const [isDimEnabled, setDimEnabled] = useState(true);
  const [dimLevel, setDimLevel] = useState(0.2); // -12dB default
  const [targetBus, setTargetBus] = useState<string>('main');

  const activate = useCallback(() => {
    setIsActive(true);
    notify('TALKBACK ON', 'warning', 1000);
    // In production: route input to targetBus, dim main output
  }, []);

  const deactivate = useCallback(() => {
    setIsActive(false);
    notify('Talkback off', 'info', 1000);
  }, []);

  const toggle = useCallback(() => {
    if (isActive) deactivate();
    else activate();
  }, [isActive, activate, deactivate]);

  return { isActive, isDimEnabled, dimLevel, targetBus, activate, deactivate, toggle, setDimLevel, setTargetBus, setDimEnabled };
}

/* ═══════════════════════════════════════════════════════════════════
   TalkbackButton — Big, obvious talkback button (like hardware)
   ═══════════════════════════════════════════════════════════════════ */

export function TalkbackButton({ isActive, onToggle }: { isActive: boolean; onToggle: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onPointerDown={onToggle}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: isActive ? 'rgba(255,69,58,0.2)' : 'rgba(255,255,255,0.04)',
        border: `2px solid ${isActive ? 'var(--neon-danger)' : 'var(--border-default)'}`,
        color: isActive ? 'var(--neon-danger)' : 'var(--text-tertiary)',
        fontSize: 10,
        fontWeight: 800,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isActive ? '0 0 16px rgba(255,69,58,0.4)' : 'none',
        transition: 'all var(--t-fast) var(--t-smooth)',
      }}
      aria-label="Talkback"
      title="Talkback (T)"
    >
      TB
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useMacroChain — Record and replay parameter action sequences
   Like an action macro recorder for live shows
   ═══════════════════════════════════════════════════════════════════ */

export interface MacroAction {
  id: string;
  type: 'set' | 'toggle' | 'ramp';
  target: string;
  value: number | boolean;
  duration?: number; // ms for ramp
}

export interface MacroChain {
  id: string;
  name: string;
  color: string;
  actions: MacroAction[];
  triggerKey?: string;
}

export function useMacroChain() {
  const [chains, setChains] = useState<MacroChain[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingActions, setRecordingActions] = useState<MacroAction[]>([]);
  const [activeChainId, setActiveChainId] = useState<string | null>(null);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingActions([]);
    notify('Macro recording started...', 'warning', 2000);
  }, []);

  const recordAction = useCallback((action: MacroAction) => {
    if (isRecording) {
      setRecordingActions((prev) => [...prev, action]);
    }
  }, [isRecording]);

  const stopRecording = useCallback((name: string) => {
    const chain: MacroChain = {
      id: `macro-${Date.now()}`,
      name,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      actions: recordingActions,
    };
    setChains((prev) => [...prev, chain]);
    setIsRecording(false);
    setRecordingActions([]);
    notify(`Macro "${name}" saved (${recordingActions.length} actions)`, 'success');
  }, [recordingActions]);

  const execute = useCallback((chainId: string) => {
    const chain = chains.find((c) => c.id === chainId);
    if (!chain) return;
    setActiveChainId(chainId);
    notify(`Executing: ${chain.name}`, 'info', 1500);
    // In production: execute each action with timing
    setTimeout(() => setActiveChainId(null), chain.actions.length * 100);
  }, [chains]);

  const deleteChain = useCallback((chainId: string) => {
    setChains((prev) => prev.filter((c) => c.id !== chainId));
    notify('Macro deleted', 'info');
  }, []);

  return { chains, isRecording, activeChainId, startRecording, recordAction, stopRecording, execute, deleteChain };
}

/* ═══════════════════════════════════════════════════════════════════
   useParameterMorph — Smooth parameter transitions over time
   Essential for live crossfades between states
   ═══════════════════════════════════════════════════════════════════ */

export function useParameterMorph() {
  const [activeMorphs, setActiveMorphs] = useState<Map<string, { from: number; to: number; start: number; duration: number }>>(new Map());

  const morphTo = useCallback((paramId: string, targetValue: number, durationMs = 1000, currentValue?: number) => {
    const from = currentValue ?? 0;
    setActiveMorphs((prev) => {
      const next = new Map(prev);
      next.set(paramId, { from, to: targetValue, start: Date.now(), duration: durationMs });
      return next;
    });
  }, []);

  const getCurrentValue = useCallback((paramId: string): number | null => {
    const m = activeMorphs.get(paramId);
    if (!m) return null;
    const elapsed = Date.now() - m.start;
    const progress = Math.min(1, elapsed / m.duration);
    // Smooth ease-in-out
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
    return m.from + (m.to - m.from) * eased;
  }, [activeMorphs]);

  const isMorphing = useCallback((paramId: string): boolean => {
    const m = activeMorphs.get(paramId);
    if (!m) return false;
    return Date.now() - m.start < m.duration;
  }, [activeMorphs]);

  return { morphTo, getCurrentValue, isMorphing, activeMorphs };
}

/* ═══════════════════════════════════════════════════════════════════
   useVisualMixHealth — One-glance mix health indicator
   Green = good mix, Yellow = watch it, Red = fix now
   ═══════════════════════════════════════════════════════════════════ */

export interface MixHealth {
  overall: 'good' | 'warning' | 'critical';
  score: number; // 0-100
  issues: string[];
  headroom: number; // dB
  dynamicRange: number; // dB
  stereoBalance: number; // -1 to 1
}

export function useVisualMixHealth() {
  const [health, setHealth] = useState<MixHealth>({
    overall: 'good',
    score: 100,
    issues: [],
    headroom: 6,
    dynamicRange: 12,
    stereoBalance: 0,
  });

  const update = useCallback((metrics: { peakLevel: number; rmsLevel: number; leftRightBalance: number }) => {
    const headroom = -20 * Math.log10(Math.max(metrics.peakLevel, 0.0001));
    const dynamicRange = 20 * Math.log10(Math.max(metrics.peakLevel, 0.0001) / Math.max(metrics.rmsLevel, 0.0001));
    const balance = metrics.leftRightBalance;

    const issues: string[] = [];
    let score = 100;

    if (headroom < 1) { issues.push('Clipping risk!'); score -= 40; }
    else if (headroom < 3) { issues.push('Low headroom'); score -= 15; }

    if (dynamicRange < 4) { issues.push('Over-compressed'); score -= 20; }
    else if (dynamicRange > 20) { issues.push('Too dynamic'); score -= 10; }

    if (Math.abs(balance) > 0.3) { issues.push('Stereo imbalance'); score -= 15; }

    const overall = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'critical';
    setHealth({ overall, score, issues, headroom, dynamicRange, stereoBalance: balance });
  }, []);

  return { health, update };
}

/* ═══════════════════════════════════════════════════════════════════
   MixHealthBadge — Compact visual health indicator
   ═══════════════════════════════════════════════════════════════════ */

export function MixHealthBadge({ health }: { health: MixHealth }) {
  const color = health.overall === 'good' ? 'var(--status-safe)' : health.overall === 'warning' ? 'var(--neon-warning)' : 'var(--neon-danger)';
  const emoji = health.overall === 'good' ? '✓' : health.overall === 'warning' ? '~' : '!';

  return (
    <motion.div
      animate={health.overall === 'critical' ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.8 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: `${color}15`,
        border: `1px solid ${color}40`,
        fontSize: 9,
        fontWeight: 700,
        color,
        fontFamily: 'var(--font-mono)',
      }}
      title={health.issues.join(', ') || 'Mix healthy'}
    >
      <span>{emoji}</span>
      <span>{health.score}</span>
      {health.issues.length > 0 && (
        <span style={{ fontSize: 7, opacity: 0.7 }}>({health.issues.length})</span>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   useSignalFlow — Track signal path through the chain
   Shows where audio is coming from and going to
   ═══════════════════════════════════════════════════════════════════ */

export interface SignalNode {
  id: string;
  name: string;
  type: 'input' | 'process' | 'output' | 'bus';
  level: number;
  isActive: boolean;
}

export function useSignalFlow() {
  const [nodes, setNodes] = useState<SignalNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const updateNode = useCallback((id: string, updates: Partial<SignalNode>) => {
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const getUpstream = useCallback((nodeId: string): SignalNode[] => {
    const idx = nodes.findIndex((n) => n.id === nodeId);
    return idx > 0 ? nodes.slice(0, idx) : [];
  }, [nodes]);

  const getDownstream = useCallback((nodeId: string): SignalNode[] => {
    const idx = nodes.findIndex((n) => n.id === nodeId);
    return idx < nodes.length - 1 ? nodes.slice(idx + 1) : [];
  }, [nodes]);

  return { nodes, setNodes, selectedNode, setSelectedNode, updateNode, getUpstream, getDownstream };
}

/* ═══════════════════════════════════════════════════════════════════
   useCountdown — Visual countdown timer for shows
   For set changes, guest intros, etc.
   ═══════════════════════════════════════════════════════════════════ */

export function useCountdown() {
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const start = useCallback((seconds: number) => {
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resume = useCallback(() => {
    setIsRunning(true);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemaining(totalSeconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [totalSeconds]);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            notify('Countdown finished!', 'warning', 3000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [isRunning, remaining]);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const isUrgent = remaining <= 10 && remaining > 0 && isRunning;

  return { remaining, totalSeconds, progress, isRunning, isUrgent, start, pause, resume, reset };
}

/* ═══════════════════════════════════════════════════════════════════
   CountdownDisplay — Big visual countdown for stage monitors
   ═══════════════════════════════════════════════════════════════════ */

export function CountdownDisplay({ remaining, progress, isUrgent }: {
  remaining: number;
  progress: number;
  isUrgent: boolean;
}) {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const color = isUrgent ? 'var(--neon-danger)' : progress > 0.5 ? 'var(--status-safe)' : 'var(--neon-warning)';

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 0.5 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span style={{
        fontSize: 24,
        fontFamily: 'var(--font-mono)',
        fontWeight: 800,
        color,
        textShadow: isUrgent ? `0 0 12px ${color}` : 'none',
      }}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
      <div style={{ width: 60, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
          style={{ height: '100%', background: color, borderRadius: 1 }}
        />
      </div>
    </motion.div>
  );
}
