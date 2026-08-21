/**
 * SENSORIUM V2 — Session Grid (Clip Launcher)
 * Ableton-style clip grid with right-click context menus,
 * drag-drop clips, multi-select (Shift/Ctrl), haptic launch.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSessionStore, useAudioStore } from '../store';
import type { Clip } from '../store';
import { ContextMenu, useContextMenu, RippleButton, GlowPulse, useMultiSelect } from '../lib/interactions';

/* ── Single Clip Cell ──────────────────────────────────────────── */
function ClipCell({
  clip,
  trackIdx,
  sceneIdx,
  isSelected,
  isOver,
  onSelect,
  onContext,
}: {
  clip: Clip | null;
  trackIdx: number;
  sceneIdx: number;
  isSelected: boolean;
  isOver: boolean;
  onSelect: (e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void;
  onContext: (e: React.MouseEvent) => void;
}) {
  const launchClip = useSessionStore((s) => s.launchClip);
  const transport = useAudioStore((s) => s.transport);
  const isPlaying = clip?.playing && (transport === 'playing' || transport === 'recording');
  const [launchFlash, setLaunchFlash] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (clip) {
      launchClip(trackIdx, sceneIdx);
      setLaunchFlash(true);
      setTimeout(() => setLaunchFlash(false), 300);
    }
    onSelect({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey });
  };

  return (
    <motion.button
      onClick={handleClick}
      onContextMenu={onContext}
      whileHover={{ scale: clip ? 1.04 : 1.01, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      aria-label={clip ? `Launch ${clip.name}` : `Track ${trackIdx + 1} Scene ${sceneIdx + 1} empty`}
      style={{
        width: '100%',
        aspectRatio: '1',
        minHeight: 44,
        borderRadius: 'var(--radius-sm)',
        border: clip
          ? `1px solid ${isSelected ? clip.color : clip.color + '40'}`
          : isOver
            ? '1px dashed var(--neon-treble)'
            : '1px solid var(--border-subtle)',
        background: clip
          ? isPlaying
            ? `linear-gradient(135deg, ${clip.color}30, ${clip.color}15)`
            : isSelected
              ? `linear-gradient(135deg, ${clip.color}25, ${clip.color}10)`
              : `linear-gradient(135deg, ${clip.color}18, ${clip.color}08)`
          : isOver
            ? 'rgba(90,200,250,0.05)'
            : 'rgba(255,255,255,0.02)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: clip ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        padding: 4,
        gap: 2,
        outline: isSelected ? `2px solid ${clip?.color ?? 'var(--neon-treble)'}40` : 'none',
        outlineOffset: -1,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Launch flash overlay */}
      <AnimatePresence>
        {launchFlash && clip && (
          <motion.div
            initial={{ opacity: 0.6, scale: 0.5 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'var(--radius-sm)',
              background: clip.color,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      {/* Playing indicator pulse */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'var(--radius-sm)',
              border: `2px solid ${clip!.color}`,
              boxShadow: `0 0 12px ${clip!.color}50, inset 0 0 8px ${clip!.color}20`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Selection indicator */}
      <GlowPulse color={clip?.color ?? 'var(--neon-treble)'} isActive={isSelected && !isPlaying} size="sm" />

      {clip && (
        <>
          {/* Clip name */}
          <span
            style={{
              fontSize: 9,
              color: isPlaying ? clip.color : 'var(--text-secondary)',
              fontWeight: isPlaying ? 600 : 400,
              textAlign: 'center',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {clip.name}
          </span>

          {/* Length indicator */}
          <span
            style={{
              fontSize: 8,
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {clip.length}b
          </span>

          {/* Color dot */}
          <motion.div
            animate={isPlaying ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] } : {}}
            transition={{ repeat: Infinity, duration: 0.8 }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: clip.color,
              position: 'relative',
              zIndex: 1,
              boxShadow: isPlaying ? `0 0 8px ${clip.color}` : 'none',
            }}
          />
        </>
      )}

      {/* Empty cell indicator */}
      {!clip && (
        <span style={{ fontSize: 16, color: 'var(--text-tertiary)', opacity: isOver ? 0.8 : 0.3, transition: 'opacity 0.15s' }}>
          {isOver ? '↓' : '+'}
        </span>
      )}
    </motion.button>
  );
}

/* ── Track Header ──────────────────────────────────────────────── */
function TrackHeader({ trackIdx }: { trackIdx: number }) {
  const tracks = useSessionStore((s) => s.tracks);
  const toggleMute = useSessionStore((s) => s.toggleMute);
  const toggleSolo = useSessionStore((s) => s.toggleSolo);
  const stopTrack = useSessionStore((s) => s.stopTrack);
  const track = tracks[trackIdx];

  if (!track) return null;

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: trackIdx * 0.05 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 'var(--radius-sm)',
        borderLeft: `3px solid ${track.color}`,
        minWidth: 120,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.name}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <RippleButton
          onClick={() => toggleMute(trackIdx)}
          color={track.mute ? 'rgba(255,69,58,0.4)' : 'rgba(255,255,255,0.15)'}
          style={{
            width: 22, height: 18, borderRadius: 3, fontSize: 8, fontWeight: 700,
            background: track.mute ? 'var(--neon-danger)' : 'rgba(255,255,255,0.08)',
            color: track.mute ? '#fff' : 'var(--text-tertiary)',
            border: 'none', cursor: 'pointer',
          }}
          aria-label={`Mute ${track.name}`}
        >
          M
        </RippleButton>
        <RippleButton
          onClick={() => toggleSolo(trackIdx)}
          color={track.solo ? 'rgba(255,214,10,0.4)' : 'rgba(255,255,255,0.15)'}
          style={{
            width: 22, height: 18, borderRadius: 3, fontSize: 8, fontWeight: 700,
            background: track.solo ? 'var(--neon-warning)' : 'rgba(255,255,255,0.08)',
            color: track.solo ? '#000' : 'var(--text-tertiary)',
            border: 'none', cursor: 'pointer',
          }}
          aria-label={`Solo ${track.name}`}
        >
          S
        </RippleButton>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => stopTrack(trackIdx)}
          style={{
            width: 22, height: 18, borderRadius: 3, fontSize: 8,
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--text-tertiary)',
            border: 'none', cursor: 'pointer',
          }}
          aria-label={`Stop ${track.name}`}
        >
          ■
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Scene Launch Button ───────────────────────────────────────── */
function SceneLauncher({ sceneIdx }: { sceneIdx: number }) {
  const setActiveScene = useSessionStore((s) => s.setActiveScene);
  const activeScene = useSessionStore((s) => s.activeScene);
  const isActive = activeScene === sceneIdx;

  return (
    <RippleButton
      onClick={() => setActiveScene(sceneIdx)}
      color={isActive ? 'rgba(48,209,88,0.4)' : 'rgba(255,255,255,0.15)'}
      style={{
        padding: '4px 12px',
        borderRadius: 'var(--radius-sm)',
        background: isActive ? 'var(--neon-success)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isActive ? 'var(--neon-success)' : 'var(--border-subtle)'}`,
        color: isActive ? '#000' : 'var(--text-tertiary)',
        fontSize: 9,
        fontWeight: 700,
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: 1,
        transition: 'background 0.15s',
      }}
      aria-label={`Launch scene ${sceneIdx + 1}`}
    >
      {isActive ? '▶' : ''} S{sceneIdx + 1}
    </RippleButton>
  );
}

/* ── Main Session Grid ─────────────────────────────────────────── */
export default function SessionGrid() {
  const tracks = useSessionStore((s) => s.tracks);
  const numScenes = useSessionStore((s) => s.numScenes);
  const { anchor, onContextMenu, close } = useContextMenu();

  // Build allIds for multi-select
  const allIds = tracks.flatMap((_, tIdx) =>
    Array.from({ length: numScenes }, (__, sIdx) => `${tIdx}-${sIdx}`)
  );
  const { selected, handleSelect, clearSelection } = useMultiSelect(allIds);

  // Context menu actions
  const getContextMenuItems = () => {
    const items = [];
    if (selected.size === 1) {
      const id = Array.from(selected)[0];
      const [tIdx, sIdx] = id.split('-').map(Number);
      const clip = tracks[tIdx]?.clips[sIdx];
      if (clip) {
        items.push({
          label: 'Launch Clip',
          onClick: () => useSessionStore.getState().launchClip(tIdx, sIdx),
        });
        items.push({
          label: 'Stop Clip',
          onClick: () => useSessionStore.getState().stopTrack(tIdx),
          separator: true,
        });
      } else {
        items.push({
          label: 'Create Clip',
          onClick: () => {
            // In production: create a new clip at this position
          },
        });
      }
    }
    if (selected.size > 0) {
      items.push({
        label: `Stop ${selected.size} Clip(s)`,
        onClick: () => {
          selected.forEach((id) => {
            const [tIdx] = (id as string).split('-').map(Number);
            useSessionStore.getState().stopTrack(tIdx);
          });
        },
        danger: true,
      });
    }
    items.push({ label: 'Clear Selection', onClick: clearSelection, separator: true });
    return items;
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
      className="glass"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: 12,
        overflow: 'auto',
        height: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 2 }}>
          Session
        </h2>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {tracks.length} tracks × {numScenes} scenes{selected.size > 0 ? ` · ${selected.size} selected` : ''}
        </span>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} onContextMenu={onContextMenu}>
        {/* Scene launch row */}
        <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(' + numScenes + ', 1fr)', gap: 4, paddingLeft: 0 }}>
          <div /> {/* spacer for track header column */}
          {Array.from({ length: numScenes }).map((_, i) => (
            <SceneLauncher key={i} sceneIdx={i} />
          ))}
        </div>

        {/* Track rows */}
        {tracks.map((track, trackIdx) => (
          <div
            key={track.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px repeat(' + numScenes + ', 1fr)',
              gap: 4,
              alignItems: 'center',
            }}
          >
            <TrackHeader trackIdx={trackIdx} />
            {Array.from({ length: numScenes }).map((_, sceneIdx) => {
              const cellId = `${trackIdx}-${sceneIdx}`;
              return (
                <ClipCell
                  key={cellId}
                  clip={track.clips[sceneIdx] ?? null}
                  trackIdx={trackIdx}
                  sceneIdx={sceneIdx}
                  isSelected={selected.has(cellId)}
                  isOver={false}
                  onSelect={(e) => handleSelect(cellId, e)}
                  onContext={(e) => {
                    e.preventDefault();
                    handleSelect(cellId, { shiftKey: false, ctrlKey: false, metaKey: false });
                    onContextMenu(e);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      <ContextMenu items={getContextMenuItems()} anchor={anchor} onClose={close} />
    </motion.div>
  );
}
