/**
 * SENSORIUM V2 — Mixer Console
 * Channel strips with rotary knobs (drag/scroll/double-click),
 * haptic faders, ripple M/S buttons, audio-reactive metering.
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMixerStore } from '../store';
import type { ChannelStrip } from '../store';
import { RotaryKnob, RippleButton, GlowPulse, Tooltip } from '../lib/interactions';

/* ── Vertical Fader (drag + scroll) ───────────────────────────── */
function VFader({
  value,
  onChange,
  color,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  color: string;
  label: string;
}) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);
  const [hovered, setHovered] = useState(false);
  const dbValue = value === 0 ? '-∞' : `${(20 * Math.log10(value)).toFixed(1)}`;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startVal.current = value;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [value]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dy = startY.current - e.clientY;
    const sens = e.shiftKey ? 0.001 : 0.005;
    const delta = dy * sens;
    const next = Math.min(1, Math.max(0, startVal.current + delta));
    onChange(Math.round(next * 100) / 100);
  }, [onChange]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 0.005 : 0.02;
    const delta = e.deltaY < 0 ? step : -step;
    onChange(Math.round(Math.min(1, Math.max(0, value + delta)) * 100) / 100);
  }, [value, onChange]);

  const handleDoubleClick = useCallback(() => {
    onChange(0.75); // Unity gain default
  }, [onChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 32,
          height: 140,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 'var(--radius-sm)',
          position: 'relative',
          border: `1px solid ${hovered ? color + '40' : 'var(--border-subtle)'}`,
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          transition: 'border-color 0.2s',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.005 : 0.02;
          if (e.key === 'ArrowUp') onChange(Math.min(1, value + step));
          else if (e.key === 'ArrowDown') onChange(Math.max(0, value - step));
          else if (e.key === 'Home') onChange(0);
          else if (e.key === 'End') onChange(1);
        }}
      >
        {/* Fader track */}
        <motion.div
          animate={{ height: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 2,
            right: 2,
            background: `linear-gradient(to top, ${color}40, ${color}15)`,
            borderRadius: 3,
          }}
        />
        {/* Fader cap */}
        <motion.div
          animate={{ bottom: `${value * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 8,
            transform: 'translateY(50%)',
            background: hovered ? color : `${color}cc`,
            borderRadius: 3,
            boxShadow: hovered ? `0 0 12px ${color}80` : `0 0 6px ${color}40`,
            transition: 'box-shadow 0.2s, background 0.2s',
          }}
        />
        {/* Hover value tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{
                position: 'absolute',
                left: '100%',
                top: `${(1 - value) * 100}%`,
                marginLeft: 8,
                padding: '2px 6px',
                borderRadius: 3,
                background: 'rgba(0,0,0,0.8)',
                color: color,
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                transform: 'translateY(-50%)',
              }}
            >
              {dbValue} dB
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span style={{
        fontSize: 8,
        fontFamily: 'var(--font-mono)',
        color: hovered ? color : 'var(--text-tertiary)',
        transition: 'color 0.2s',
      }}>
        {dbValue}
      </span>
    </div>
  );
}

/* ── Channel Meter (with peak hold) ───────────────────────────── */
function ChannelMeter({ peakL, peakR }: { peakL: number; peakR: number }) {
  return (
    <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 100 }}>
      {[peakL, peakR].map((peak, i) => {
        const color = peak > 0.85 ? 'var(--meter-red)' : peak > 0.6 ? 'var(--meter-yellow)' : 'var(--meter-green)';
        return (
          <div
            key={i}
            style={{
              width: 3,
              height: '100%',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <motion.div
              animate={{ height: `${peak * 100}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: color,
                borderRadius: 1,
                boxShadow: `0 0 4px ${color}60`,
              }}
            />
            {/* Clip indicator */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: peak > 0.95 ? 'var(--meter-red)' : 'transparent',
              transition: 'background 0.1s',
            }} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Channel Strip ─────────────────────────────────────────────── */
function ChannelStripView({ channel, index }: { channel: ChannelStrip; index: number }) {
  const setVolume = useMixerStore((s) => s.setVolume);
  const setPan = useMixerStore((s) => s.setPan);
  const toggleMute = useMixerStore((s) => s.toggleMute);
  const toggleSolo = useMixerStore((s) => s.toggleSolo);
  const setEq = useMixerStore((s) => s.setEq);
  const selectChannel = useMixerStore((s) => s.selectChannel);
  const selectedChannel = useMixerStore((s) => s.selectedChannel);
  const isSelected = selectedChannel === index;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: index * 0.04 }}
      onClick={() => selectChannel(index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '8px 6px',
        background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isSelected ? channel.color + '40' : hovered ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        cursor: 'pointer',
        minWidth: 72,
        transition: 'background 0.2s, border-color 0.2s',
        position: 'relative',
      }}
    >
      {/* Selection glow */}
      <GlowPulse color={channel.color} isActive={isSelected} size="sm" />

      {/* Channel name */}
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        color: channel.color,
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
      }}>
        {channel.name}
      </div>

      {/* EQ Section — RotaryKnob with drag/scroll/double-click */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
        <Tooltip text={`Hi: ${channel.eqHigh > 0 ? '+' : ''}${channel.eqHigh.toFixed(1)} dB`}>
          <RotaryKnob
            value={channel.eqHigh}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={0}
            color="var(--neon-treble)"
            size={22}
            formatValue={(v) => v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
            onChange={(v) => setEq(index, 'high', v)}
          />
        </Tooltip>
        <Tooltip text={`Mid: ${channel.eqMid > 0 ? '+' : ''}${channel.eqMid.toFixed(1)} dB`}>
          <RotaryKnob
            value={channel.eqMid}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={0}
            color="var(--neon-mid)"
            size={22}
            formatValue={(v) => v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
            onChange={(v) => setEq(index, 'mid', v)}
          />
        </Tooltip>
        <Tooltip text={`Lo: ${channel.eqLow > 0 ? '+' : ''}${channel.eqLow.toFixed(1)} dB`}>
          <RotaryKnob
            value={channel.eqLow}
            min={-12}
            max={12}
            step={0.5}
            defaultValue={0}
            color="var(--neon-bass)"
            size={22}
            formatValue={(v) => v > 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
            onChange={(v) => setEq(index, 'low', v)}
          />
        </Tooltip>
      </div>

      {/* Pan — RotaryKnob */}
      <Tooltip text={`Pan: ${channel.pan === 0 ? 'C' : channel.pan > 0 ? `${Math.round(channel.pan * 100)}R` : `${Math.round(-channel.pan * 100)}L`}`}>
        <RotaryKnob
          value={channel.pan}
          min={-1}
          max={1}
          step={0.01}
          defaultValue={0}
          color="var(--neon-treble)"
          size={26}
          formatValue={(v) => v === 0 ? 'C' : v > 0 ? `${Math.round(v * 100)}R` : `${Math.round(-v * 100)}L`}
          onChange={(v) => setPan(index, v)}
        />
      </Tooltip>

      {/* Mute / Solo — RippleButton */}
      <div style={{ display: 'flex', gap: 3 }}>
        <RippleButton
          onClick={(e) => { e.stopPropagation(); toggleMute(index); }}
          color={channel.mute ? 'rgba(255,69,58,0.4)' : 'rgba(255,255,255,0.2)'}
          style={{
            width: 24, height: 20, borderRadius: 4, fontSize: 8, fontWeight: 700,
            background: channel.mute ? 'var(--neon-danger)' : 'rgba(255,255,255,0.08)',
            color: channel.mute ? '#fff' : 'var(--text-tertiary)',
            border: 'none', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          aria-label={`Mute ${channel.name}`}
        >
          M
        </RippleButton>
        <RippleButton
          onClick={(e) => { e.stopPropagation(); toggleSolo(index); }}
          color={channel.solo ? 'rgba(255,214,10,0.4)' : 'rgba(255,255,255,0.2)'}
          style={{
            width: 24, height: 20, borderRadius: 4, fontSize: 8, fontWeight: 700,
            background: channel.solo ? 'var(--neon-warning)' : 'rgba(255,255,255,0.08)',
            color: channel.solo ? '#000' : 'var(--text-tertiary)',
            border: 'none', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          aria-label={`Solo ${channel.name}`}
        >
          S
        </RippleButton>
      </div>

      {/* Fader + Meter */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
        <ChannelMeter peakL={channel.peakL} peakR={channel.peakR} />
        <VFader value={channel.volume} onChange={(v) => setVolume(index, v)} color={channel.color} label={`${channel.name} Volume`} />
      </div>

      {/* Color bar */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0.7 }}
        style={{
          width: '100%',
          height: 3,
          borderRadius: 2,
          background: channel.color,
          boxShadow: hovered ? `0 0 10px ${channel.color}60` : `0 0 4px ${channel.color}30`,
          transition: 'box-shadow 0.2s',
        }}
      />
    </motion.div>
  );
}

/* ── Main Mixer Console ────────────────────────────────────────── */
export default function MixerConsole() {
  const channels = useMixerStore((s) => s.channels);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 12,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2 }}>
          Mixer
        </h2>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {channels.length} ch · drag/scroll/dbl-click
        </span>
      </div>

      {/* Channel Strips */}
      <div style={{
        display: 'flex',
        gap: 6,
        flex: 1,
        overflowX: 'auto',
        alignItems: 'flex-start',
        paddingBottom: 8,
      }}>
        {channels.map((ch, i) => (
          <ChannelStripView key={ch.id} channel={ch} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
