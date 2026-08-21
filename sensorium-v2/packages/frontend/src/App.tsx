/**
 * SENSORIUM V2 — Main Application Shell
 * Modular, fluid, haptic-first audio production interface.
 * Dark glass morphism + audio-reactive WebGL visualizer.
 */
import { AnimatePresence, motion } from 'motion/react';
import Navigation from './components/Navigation';
import GlobalHeader from './components/GlobalHeader';
import VolumetricFrequencyCloud from './components/VolumetricFrequencyCloud';
import SessionGrid from './components/SessionGrid';
import MixerConsole from './components/MixerConsole';
import SnapshotMorphSuite from './components/SnapshotMorphSuite';
import SpatialMindmap from './components/SpatialMindmap';
import AudiophileAcousticLab from './components/AudiophileAcousticLab';
import Spatial5DStadium from './components/Spatial5DStadium';
import QuantumInstinctMatrix from './components/QuantumInstinctMatrix';
import HardwareAuditPanel from './components/HardwareAuditPanel';
import IndustrialProductionSuite from './components/IndustrialProductionSuite';
import AiPanel from './components/AiPanel';
import { useUiStore, useAiStore, useAudioStore, useVisualStore, useSessionStore, useMixerStore } from './store';
import { useEffect, useState, useMemo } from 'react';
import { ToastContainer, notify, useKeyboardShortcuts, useShowMode, useQuickActions, StatusIndicator, type QuickAction, useLufsMeter, useRoundTripLatency, LatencyDisplay, useTalkback, TalkbackButton, useVisualMixHealth, MixHealthBadge, useCountdown, CountdownDisplay } from './lib/joyFeatures';

/* ── Visual Preset Selector ────────────────────────────────────── */
function VisualPresetBar() {
  const preset = useVisualStore((s) => s.preset);
  const setPreset = useVisualStore((s) => s.setPreset);
  const intensity = useVisualStore((s) => s.intensity);
  const setIntensity = useVisualStore((s) => s.setIntensity);
  const bloom = useVisualStore((s) => s.bloom);
  const setBloom = useVisualStore((s) => s.setBloom);
  const reactive = useVisualStore((s) => s.reactive);
  const toggleReactive = useVisualStore((s) => s.toggleReactive);
  const showVisualizer = useUiStore((s) => s.showVisualizer);

  if (!showVisualizer) return null;

  const presets = ['waveform', 'spectrum', 'particles', 'nebula', 'fluid'] as const;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.3 }}
      className="glass"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 14px',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <span style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1 }}>
        Visual
      </span>
      {presets.map((p) => (
        <motion.button
          key={p}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setPreset(p)}
          style={{
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            background: preset === p ? 'rgba(90,200,250,0.15)' : 'transparent',
            border: `1px solid ${preset === p ? 'var(--neon-treble)' : 'var(--border-subtle)'}`,
            color: preset === p ? 'var(--neon-treble)' : 'var(--text-tertiary)',
            fontSize: 9,
            fontWeight: preset === p ? 600 : 400,
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {p}
        </motion.button>
      ))}
      <div style={{ flex: 1 }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Reactive</span>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleReactive}
          style={{
            width: 28,
            height: 16,
            borderRadius: 8,
            background: reactive ? 'var(--neon-treble)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
          }}
          aria-label="Toggle audio-reactive mode"
          aria-pressed={reactive}
        >
          <motion.div
            animate={{ x: reactive ? 14 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: reactive ? '#000' : 'var(--text-tertiary)',
              position: 'absolute',
              top: 2,
            }}
          />
        </motion.button>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>Intensity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={intensity}
          onChange={(e) => setIntensity(parseFloat(e.target.value))}
          style={{ width: 60, accentColor: 'var(--neon-treble)' }}
          aria-label="Visual intensity"
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>Bloom</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={bloom}
          onChange={(e) => setBloom(parseFloat(e.target.value))}
          style={{ width: 50, accentColor: 'var(--neon-mid)' }}
          aria-label="Bloom amount"
        />
      </div>
    </motion.div>
  );
}

/* ── Main Content Area ─────────────────────────────────────────── */
function MainContent() {
  const viewMode = useUiStore((s) => s.viewMode);
  const showVisualizer = useUiStore((s) => s.showVisualizer);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Visualizer Background — Volumetric Frequency Cloud */}
      <AnimatePresence>
        {showVisualizer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          >
            <VolumetricFrequencyCloud />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Overlay */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: 8, gap: 8 }}>
        {/* Visual Preset Bar */}
        <VisualPresetBar />

        {/* Main Panel */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {viewMode === 'session' && (
              <motion.div
                key="session"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ height: '100%' }}
              >
                <SessionGrid />
              </motion.div>
            )}
            {viewMode === 'mixer' && (
              <motion.div
                key="mixer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ height: '100%' }}
              >
                <MixerConsole />
              </motion.div>
            )}
            {viewMode === 'visual' && (
              <motion.div
                key="visual"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  height: '100%',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                <VolumetricFrequencyCloud />
              </motion.div>
            )}
            {viewMode === 'arrangement' && (
              <motion.div
                key="arrangement"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass"
                style={{
                  height: '100%',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 48 }}>🎵</span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Arrangement View</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Timeline editor — coming in Phase 3</span>
              </motion.div>
            )}
            {viewMode === 'mindmap' && (
              <motion.div
                key="mindmap"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ height: '100%' }}
              >
                <SpatialMindmap />
              </motion.div>
            )}
            {viewMode === 'acoustic' && (
              <motion.div
                key="acoustic"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass"
                style={{ height: '100%', overflow: 'hidden' }}
              >
                <AudiophileAcousticLab />
              </motion.div>
            )}
            {viewMode === 'stadium' && (
              <motion.div
                key="stadium"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ height: '100%' }}
              >
                <Spatial5DStadium />
              </motion.div>
            )}
            {viewMode === 'instinct' && (
              <motion.div
                key="instinct"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass"
                style={{ height: '100%', overflow: 'hidden' }}
              >
                <QuantumInstinctMatrix />
              </motion.div>
            )}
            {viewMode === 'hardware' && (
              <motion.div
                key="hardware"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass"
                style={{ height: '100%', overflow: 'hidden' }}
              >
                <HardwareAuditPanel />
              </motion.div>
            )}
            {viewMode === 'production' && (
              <motion.div
                key="production"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass"
                style={{ height: '100%', overflow: 'hidden' }}
              >
                <IndustrialProductionSuite />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Status Bar (with Show Mode + Status Indicators) ──────────── */
function StatusBar() {
  const bpm = useAudioStore((s) => s.bpm);
  const transport = useAudioStore((s) => s.transport);
  const { isShowMode, toggle: toggleShowMode } = useShowMode();
  const viewMode = useUiStore((s) => s.viewMode);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 12px',
        fontSize: 9,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-tertiary)',
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid var(--border-subtle)',
        height: 22,
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>SENSORIUM V2.0</span>
        <StatusIndicator status={transport === 'playing' ? 'safe' : transport === 'recording' ? 'live' : 'offline'} size="sm" />
        <span style={{ color: transport === 'playing' ? 'var(--neon-success)' : transport === 'recording' ? 'var(--neon-danger)' : 'var(--text-tertiary)' }}>
          {transport.toUpperCase()}
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>|</span>
        <span>{viewMode.toUpperCase()}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>48kHz / 256 buf</span>
        <span>{bpm} BPM</span>
        <span>CPU: 2.1%</span>
        <span style={{ color: 'var(--neon-success)' }}>● Connected</span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleShowMode}
          style={{
            padding: '1px 6px',
            borderRadius: 'var(--radius-full)',
            background: isShowMode ? 'rgba(255,45,85,0.15)' : 'transparent',
            border: `1px solid ${isShowMode ? 'var(--neon-danger)' : 'var(--border-subtle)'}`,
            color: isShowMode ? 'var(--neon-danger)' : 'var(--text-tertiary)',
            fontSize: 8,
            fontWeight: 700,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
          aria-label="Toggle Show Mode"
        >
          {isShowMode ? '● SHOW' : 'SHOW'}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Quick Actions Palette Overlay ─────────────────────────────── */
function QuickActionsOverlay() {
  const setViewMode = useUiStore((s) => s.setViewMode);
  const toggleVisualizer = useUiStore((s) => s.toggleVisualizer);

  const actions: QuickAction[] = useMemo(() => [
    { id: 'session', label: 'Session Grid', category: 'Views', shortcut: '1', action: () => setViewMode('session') },
    { id: 'mixer', label: 'Mixer Console', category: 'Views', shortcut: '2', action: () => setViewMode('mixer') },
    { id: 'cloud', label: 'Frequency Cloud', category: 'Views', shortcut: '3', action: () => setViewMode('visual') },
    { id: 'patch', label: 'Spatial Mindmap', category: 'Views', shortcut: '4', action: () => setViewMode('mindmap') },
    { id: 'dsp', label: 'Acoustic Lab', category: 'Views', shortcut: '5', action: () => setViewMode('acoustic') },
    { id: '5d', label: '5D Stadium', category: 'Views', shortcut: '6', action: () => setViewMode('stadium') },
    { id: 'ai', label: 'Quantum AI', category: 'Views', shortcut: '7', action: () => setViewMode('instinct') },
    { id: 'hw', label: 'Hardware Audit', category: 'Views', shortcut: '8', action: () => setViewMode('hardware') },
    { id: 'prod', label: 'Production Suite', category: 'Views', shortcut: '9', action: () => setViewMode('production') },
    { id: 'vis', label: 'Toggle Visualizer', category: 'Actions', shortcut: 'V', action: () => toggleVisualizer() },
    { id: 'play', label: 'Play / Pause', category: 'Transport', shortcut: 'Space', action: () => useAudioStore.getState().play() },
    { id: 'stop', label: 'Stop', category: 'Transport', shortcut: 'S', action: () => useAudioStore.getState().stop() },
    { id: 'rec', label: 'Record', category: 'Transport', shortcut: 'R', action: () => useAudioStore.getState().record() },
  ], [setViewMode, toggleVisualizer]);

  const { isOpen, setIsOpen, query, setQuery, filtered, execute } = useQuickActions(actions);

  // View number shortcuts
  useKeyboardShortcuts([
    { key: '1', action: () => setViewMode('session'), label: 'Session' },
    { key: '2', action: () => setViewMode('mixer'), label: 'Mixer' },
    { key: '3', action: () => setViewMode('visual'), label: 'Cloud' },
    { key: '4', action: () => setViewMode('mindmap'), label: 'Patch' },
    { key: '5', action: () => setViewMode('acoustic'), label: 'DSP' },
    { key: '6', action: () => setViewMode('stadium'), label: '5D' },
    { key: '7', action: () => setViewMode('instinct'), label: 'AI' },
    { key: '8', action: () => setViewMode('hardware'), label: 'HW' },
    { key: '9', action: () => setViewMode('production'), label: 'Prod' },
    { key: ' ', action: () => { useAudioStore.getState().play(); notify('Play', 'info', 800); }, label: 'Play', preventDefault: true },
  ]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 400,
        maxHeight: 400,
        background: 'rgba(14,14,22,0.97)',
        backdropFilter: 'blur(32px) saturate(200%)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
        zIndex: 'var(--z-modal)' as any,
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search input */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
            if (e.key === 'Enter' && filtered.length > 0) execute(filtered[0]);
          }}
          placeholder="Type a command or search..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>
      {/* Results */}
      <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 0' }}>
        {filtered.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => execute(action)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              background: i === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: 'var(--text-primary)',
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', width: 50, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {action.category}
            </span>
            <span style={{ flex: 1 }}>{action.label}</span>
            {action.shortcut && (
              <span style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                padding: '1px 4px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 3,
              }}>
                {action.shortcut}
              </span>
            )}
          </motion.button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
            No results found
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Live Production Bar (LUFS + Latency + Talkback + Health) ─── */
function LiveProductionBar() {
  const transport = useAudioStore((s) => s.transport);
  const masterPeakL = useAudioStore((s) => s.masterPeakL);
  const masterPeakR = useAudioStore((s) => s.masterPeakR);
  const { momentary, compliance, update: updateLufs } = useLufsMeter();
  const { latencyMs, jitterMs, status: latencyStatus, update: updateLatency } = useRoundTripLatency();
  const { isActive: talkbackActive, toggle: toggleTalkback } = useTalkback();
  const { health, update: updateHealth } = useVisualMixHealth();
  const countdown = useCountdown();

  // Simulate LUFS updates from metering
  useEffect(() => {
    if (transport !== 'playing' && transport !== 'recording') return;
    const interval = setInterval(() => {
      const samples = Array.from({ length: 128 }, () => (Math.random() - 0.5) * (masterPeakL + masterPeakR));
      updateLufs(samples);
    }, 100);
    return () => clearInterval(interval);
  }, [transport, masterPeakL, masterPeakR, updateLufs]);

  // Simulate latency updates
  useEffect(() => {
    const interval = setInterval(() => {
      updateLatency(2.5 + Math.random() * 3);
    }, 200);
    return () => clearInterval(interval);
  }, [updateLatency]);

  // Simulate mix health
  useEffect(() => {
    if (transport !== 'playing' && transport !== 'recording') return;
    const interval = setInterval(() => {
      updateHealth({
        peakLevel: masterPeakL,
        rmsLevel: masterPeakL * 0.6,
        leftRightBalance: (masterPeakL - masterPeakR) * 0.5,
      });
    }, 200);
    return () => clearInterval(interval);
  }, [transport, masterPeakL, masterPeakR, updateHealth]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 12px',
      height: 20,
      background: 'rgba(0,0,0,0.2)',
      borderTop: '1px solid var(--border-subtle)',
      fontSize: 8,
      fontFamily: 'var(--font-mono)',
    }}>
      {/* LUFS Mini */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 7 }}>LUFS</span>
        <span style={{ color: compliance === 'broadcast' ? 'var(--status-safe)' : compliance === 'too-loud' ? 'var(--neon-danger)' : 'var(--neon-warning)', fontWeight: 700 }}>
          {momentary.toFixed(1)}
        </span>
      </div>

      {/* Latency */}
      <LatencyDisplay latencyMs={latencyMs} jitterMs={jitterMs} status={latencyStatus} />

      {/* Mix Health */}
      <MixHealthBadge health={health} />

      {/* Talkback */}
      <div style={{ transform: 'scale(0.6)', transformOrigin: 'left center' }}>
        <TalkbackButton isActive={talkbackActive} onToggle={toggleTalkback} />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Countdown (if running) */}
      {countdown.isRunning && (
        <div style={{ transform: 'scale(0.5)', transformOrigin: 'right center' }}>
          <CountdownDisplay remaining={countdown.remaining} progress={countdown.progress} isUrgent={countdown.isUrgent} />
        </div>
      )}
    </div>
  );
}

/* ── Simulated Data Feed (demo mode) ──────────────────────────── */
function useSimulatedAudio() {
  const setMetering = useAudioStore((s) => s.setMetering);
  const setSpectrum = useAudioStore((s) => s.setSpectrum);
  const transport = useAudioStore((s) => s.transport);
  const tick = useAudioStore((s) => s.tick);

  useEffect(() => {
    if (transport !== 'playing' && transport !== 'recording') return;

    const interval = setInterval(() => {
      // Simulate master metering
      const peakL = 0.3 + Math.random() * 0.4;
      const peakR = 0.3 + Math.random() * 0.4;
      setMetering(peakL, peakR);

      // Simulate spectrum with musical frequency distribution
      const spectrum = new Float32Array(64);
      for (let i = 0; i < 64; i++) {
        const bassWeight = Math.exp(-i * 0.08) * 0.8;
        const midWeight = Math.exp(-((i - 16) ** 2) / 200) * 0.6;
        const trebleWeight = Math.exp(-((i - 40) ** 2) / 300) * 0.4;
        spectrum[i] = (bassWeight + midWeight + trebleWeight) * (0.4 + Math.random() * 0.5);
      }
      setSpectrum(spectrum);
      tick();

      // Simulate mixer channel peaks
      const mixerStore = useMixerStore.getState();
      mixerStore.channels.forEach((_, i) => {
        const chPeakL = 0.2 + Math.random() * 0.5;
        const chPeakR = 0.2 + Math.random() * 0.5;
        mixerStore.setPeaks(i, chPeakL, chPeakR);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [transport, setMetering, setSpectrum, tick]);
}

/* ── App Shell ─────────────────────────────────────────────────── */
export default function App() {
  const showAiPanel = useAiStore((s) => s.isOpen);
  const [showSnapshots, setShowSnapshots] = useState(false);

  // Start simulated audio data for demo
  useSimulatedAudio();

  // Auto-play for demo + launch clips
  useEffect(() => {
    const timer = setTimeout(() => {
      useAudioStore.getState().play();
      // Auto-launch first clip of each track for demo
      const session = useSessionStore.getState();
      session.tracks.forEach((_, trackIdx) => {
        const track = useSessionStore.getState().tracks[trackIdx];
        if (track.clips[0]) {
          useSessionStore.getState().launchClip(trackIdx, 0);
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="bg-grid"
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--surface-0)',
      }}
    >
      {/* Navigation Sidebar */}
      <div style={{ padding: '8px 0 8px 8px' }}>
        <Navigation />
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 8px 0 8px', overflow: 'hidden' }}>
        {/* Global Master Header (replaces old TransportBar) */}
        <div style={{ marginBottom: 8 }}>
          <GlobalHeader />
        </div>

        {/* Content + Snapshots + AI Panel */}
        <div style={{ flex: 1, display: 'flex', gap: 8, overflow: 'hidden' }}>
          <MainContent />

          {/* Snapshot Morph Suite Panel */}
          <AnimatePresence>
            {showSnapshots && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <SnapshotMorphSuite />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showAiPanel && <AiPanel />}
          </AnimatePresence>
        </div>
      </div>

      {/* Snapshot toggle — floating button */}
      <motion.button
        onClick={() => setShowSnapshots(!showSnapshots)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        style={{
          position: 'fixed',
          bottom: 30,
          right: showAiPanel ? 340 : 12,
          zIndex: 100,
          padding: '6px 12px',
          borderRadius: 'var(--radius-full)',
          background: showSnapshots ? 'rgba(90,200,250,0.15)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${showSnapshots ? 'var(--neon-treble)' : 'var(--border-subtle)'}`,
          color: showSnapshots ? 'var(--neon-treble)' : 'var(--text-tertiary)',
          fontSize: 10,
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          transition: 'right 0.3s ease',
        }}
        aria-label="Toggle snapshots panel"
      >
        ◇ Snapshots
      </motion.button>

      {/* Status Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
        <StatusBar />
        <LiveProductionBar />
      </div>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Quick Actions Palette */}
      <QuickActionsOverlay />
    </div>
  );
}
