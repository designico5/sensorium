/**
 * SENSORIUM V2 — Transport Bar
 * Haptic transport controls: scroll-wheel BPM, long-press record arm,
 * ripple clicks, glow-pulse active states, spring-animated meters.
 */
import { useState, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { useAudioStore } from '../store';
import { useLongPress, RippleButton, GlowPulse, Tooltip } from '../lib/interactions';

/* ── Transport Button (with ripple + glow) ────────────────────── */
function TransportButton({
  active,
  color,
  onClick,
  children,
  label,
}: {
  active: boolean;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Tooltip text={label}>
      <RippleButton
        onClick={onClick}
        color={`${color}40`}
        aria-label={label}
        aria-pressed={active}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? color : 'rgba(255,255,255,0.06)',
          border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
          color: active ? '#fff' : 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
        <GlowPulse color={color} isActive={active} size="md" />
      </RippleButton>
    </Tooltip>
  );
}

/* ── Level Meter (with segments) ──────────────────────────────── */
function LevelMeter({ level, vertical = true }: { level: number; vertical?: boolean }) {
  const yellow = level >= 0.6 && level < 0.85;
  const red = level >= 0.85;
  const color = red ? 'var(--meter-red)' : yellow ? 'var(--meter-yellow)' : 'var(--meter-green)';

  return (
    <div
      style={{
        width: vertical ? 4 : 100,
        height: vertical ? 100 : 4,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <motion.div
        animate={vertical
          ? { height: `${level * 100}%`, width: '100%' }
          : { width: `${level * 100}%`, height: '100%' }
        }
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={{
          position: vertical ? 'absolute' : 'relative',
          bottom: 0,
          left: 0,
          background: color,
          borderRadius: 2,
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
      {/* Clip flash */}
      {red && (
        <motion.div
          initial={{ opacity: 0.8 }}
          animate={{ opacity: [0.8, 0.3, 0.8] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          style={{
            position: 'absolute',
            [vertical ? 'top' : 'right']: 0,
            [vertical ? 'left' : 'top']: 0,
            [vertical ? 'right' : 'bottom']: 0,
            [vertical ? 'height' : 'width']: 3,
            background: 'var(--meter-red)',
            boxShadow: '0 0 8px var(--meter-red)',
          }}
        />
      )}
    </div>
  );
}

/* ── BPM Display (scroll-wheel + drag + long-press reset) ────── */
function BpmDisplay() {
  const bpm = useAudioStore((s) => s.bpm);
  const setBpm = useAudioStore((s) => s.setBpm);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const startY = useRef(0);
  const startBpm = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isEditing) return;
    startY.current = e.clientY;
    startBpm.current = bpm;
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [bpm, isEditing]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dy = startY.current - e.clientY;
    const sens = e.shiftKey ? 0.1 : 0.5;
    const newBpm = Math.round(Math.min(300, Math.max(20, startBpm.current + dy * sens)));
    setBpm(newBpm);
  }, [setBpm]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 0.1 : 1;
    const delta = e.deltaY < 0 ? step : -step;
    setBpm(Math.round(Math.min(300, Math.max(20, bpm + delta))));
  }, [bpm, setBpm]);

  const longPressHandlers = useLongPress({
    onLongPress: () => setBpm(120), // Reset to default
    onShortPress: () => {
      setIsEditing(true);
      setEditValue(String(bpm));
    },
    threshold: 600,
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        const val = parseInt(editValue);
        if (val >= 20 && val <= 300) setBpm(val);
        setIsEditing(false);
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
    } else {
      if (e.key === 'ArrowUp') setBpm(Math.min(300, bpm + 1));
      else if (e.key === 'ArrowDown') setBpm(Math.max(20, bpm - 1));
    }
  }, [isEditing, editValue, bpm, setBpm]);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      {...longPressHandlers}
      onPointerDown={(e) => {
        longPressHandlers.onPointerDown?.();
        handlePointerDown(e);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={() => {
        longPressHandlers.onPointerUp?.();
        handlePointerUp();
      }}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-label="BPM"
      aria-valuemin={20}
      aria-valuemax={300}
      aria-valuenow={bpm}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <span style={{ color: 'var(--text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>BPM</span>
      {isEditing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            const val = parseInt(editValue);
            if (val >= 20 && val <= 300) setBpm(val);
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = parseInt(editValue);
              if (val >= 20 && val <= 300) setBpm(val);
              setIsEditing(false);
            }
          }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 600,
            width: 40,
            background: 'rgba(90,200,250,0.1)',
            border: '1px solid var(--neon-treble)',
            borderRadius: 4,
            color: 'var(--neon-treble)',
            textAlign: 'center',
            outline: 'none',
            padding: '2px 4px',
          }}
        />
      ) : (
        <motion.span
          key={bpm}
          initial={{ scale: 1.2, color: 'var(--neon-treble)' }}
          animate={{ scale: 1, color: 'var(--text-primary)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, minWidth: 32, textAlign: 'center' }}
        >
          {bpm}
        </motion.span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => { e.stopPropagation(); setBpm(Math.min(300, bpm + 1)); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 8, lineHeight: 1, padding: 0 }}
          aria-label="Increase BPM"
        >
          ▲
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => { e.stopPropagation(); setBpm(Math.max(20, bpm - 1)); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 8, lineHeight: 1, padding: 0 }}
          aria-label="Decrease BPM"
        >
          ▼
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Beat Indicator ────────────────────────────────────────────── */
function BeatIndicator() {
  const beat = useAudioStore((s) => s.beat);
  const transport = useAudioStore((s) => s.transport);
  const isActive = transport === 'playing' || transport === 'recording';

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{
            scale: isActive && beat === i ? 1.3 : 1,
            background: isActive && beat === i
              ? (i === 0 ? 'var(--neon-bass)' : 'var(--neon-treble)')
              : 'rgba(255,255,255,0.1)',
          }}
          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            boxShadow: isActive && beat === i
              ? `0 0 8px ${i === 0 ? 'var(--neon-bass)' : 'var(--neon-treble)'}`
              : 'none',
          }}
        />
      ))}
    </div>
  );
}

/* ── Time Display ──────────────────────────────────────────────── */
function TimeDisplay() {
  const bar = useAudioStore((s) => s.bar);
  const beat = useAudioStore((s) => s.beat);
  const transport = useAudioStore((s) => s.transport);

  const display = transport === 'stopped' ? '000:0' : `${String(bar + 1).padStart(3, '0')}:${beat + 1}`;

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: 2,
        minWidth: 80,
        textAlign: 'center',
      }}
    >
      {display}
    </span>
  );
}

/* ── Main Transport Bar ────────────────────────────────────────── */
export default function TransportBar() {
  const transport = useAudioStore((s) => s.transport);
  const play = useAudioStore((s) => s.play);
  const stop = useAudioStore((s) => s.stop);
  const record = useAudioStore((s) => s.record);
  const masterPeakL = useAudioStore((s) => s.masterPeakL);
  const masterPeakR = useAudioStore((s) => s.masterPeakR);
  const masterLevel = useAudioStore((s) => s.masterLevel);
  const setMasterLevel = useAudioStore((s) => s.setMasterLevel);

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
      className="glass-elevated"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px 16px',
        borderRadius: 'var(--radius-lg)',
        height: 56,
      }}
    >
      {/* Transport Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <TransportButton active={transport === 'stopped'} color="rgba(255,255,255,0.2)" onClick={stop} label="Stop">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="10" height="10" rx="1" /></svg>
        </TransportButton>
        <TransportButton active={transport === 'playing'} color="var(--neon-success)" onClick={play} label="Play">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><polygon points="3,1 13,7 3,13" /></svg>
        </TransportButton>
        <Tooltip text="Record (long-press = arm all)">
          <TransportButton active={transport === 'recording'} color="var(--neon-danger)" onClick={record} label="Record">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="7" cy="7" r="5" /></svg>
          </TransportButton>
        </Tooltip>
      </div>

      {/* Beat Indicator */}
      <BeatIndicator />

      {/* Time Display */}
      <TimeDisplay />

      {/* BPM */}
      <BpmDisplay />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Master Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Master</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterLevel}
          onChange={(e) => setMasterLevel(parseFloat(e.target.value))}
          style={{ width: 80, accentColor: 'var(--neon-treble)' }}
          aria-label="Master volume"
        />
      </div>

      {/* Master Meter */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 32 }}>
        <LevelMeter level={masterPeakL} />
        <LevelMeter level={masterPeakR} />
      </div>
    </motion.div>
  );
}
