import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import {
  ArrowCounterClockwise,
  ArrowRight,
  Brain,
  Broadcast,
  Buildings,
  CheckCircle,
  CirclesThree,
  Cpu,
  Gear,
  GridFour,
  Gauge,
  HardDrives,
  Headphones,
  Info,
  Lock,
  MagicWand,
  MagnifyingGlass,
  Pause,
  Play,
  Record,
  ShieldCheck,
  SlidersHorizontal,
  Stop,
  VideoCamera,
  Warning,
  WarningCircle,
  Waveform,
  X,
  XCircle,
} from '@phosphor-icons/react';
import PerformanceWorkspace from './components/PerformanceWorkspace';
import { type QuickAction, notify, useQuickActions, useToasts } from './lib/joyFeatures';
import { useAudioStore } from './store';
import './styles/performance.css';

const HardwareAuditPanel = lazy(() => import('./components/HardwareAuditPanel'));
const AiPanel = lazy(() => import('./components/AiPanel'));
const AudiophileAcousticLab = lazy(() => import('./components/AudiophileAcousticLab'));
const IndustrialProductionSuite = lazy(() => import('./components/IndustrialProductionSuite'));
const LiveToolsWorkspace = lazy(() => import('./components/LiveToolsWorkspace'));
const MixerConsole = lazy(() => import('./components/MixerConsole'));
const QuantumInstinctMatrix = lazy(() => import('./components/QuantumInstinctMatrix'));
const SessionGrid = lazy(() => import('./components/SessionGrid'));
const SnapshotMorphSuite = lazy(() => import('./components/SnapshotMorphSuite'));
const Spatial5DStadium = lazy(() => import('./components/Spatial5DStadium'));
const SpatialMindmap = lazy(() => import('./components/SpatialMindmap'));
const VolumetricFrequencyCloud = lazy(() => import('./components/VolumetricFrequencyCloud'));

type WorkspaceMode =
  | 'perform'
  | 'sections'
  | 'mix'
  | 'macros'
  | 'visual'
  | 'mindmap'
  | 'acoustic'
  | 'stadium'
  | 'instinct'
  | 'production'
  | 'tools'
  | 'ai'
  | 'system';

const NAV_ITEMS = [
  { id: 'perform', label: 'Perform', icon: CirclesThree },
  { id: 'sections', label: 'Sections', icon: GridFour },
  { id: 'mix', label: 'Mix', icon: SlidersHorizontal },
  { id: 'macros', label: 'Macros', icon: MagicWand },
  { id: 'visual', label: 'Visual', icon: VideoCamera },
  { id: 'mindmap', label: 'Mindmap', icon: CirclesThree },
  { id: 'acoustic', label: 'Acoustic', icon: Headphones },
  { id: 'stadium', label: '5D Stage', icon: Buildings },
  { id: 'instinct', label: 'Instinct', icon: Brain },
  { id: 'production', label: 'Production', icon: Cpu },
  { id: 'tools', label: 'Live Tools', icon: Gauge },
  { id: 'ai', label: 'AI', icon: MagicWand },
  { id: 'system', label: 'System', icon: Gear },
] as const;

function MasterScope({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let raf = 0;
    let disposed = false;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const maxDpr = window.innerWidth >= 5000 ? 1 : window.innerWidth >= 2400 ? 1.5 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.lineWidth = 1.5;
      context.strokeStyle = active ? 'rgba(93, 226, 255, .9)' : 'rgba(140, 151, 168, .45)';
      context.beginPath();
      const phase = active ? frame * 0.045 : 0;
      for (let x = 0; x <= rect.width; x += 2) {
        const normalized = x / Math.max(1, rect.width);
        const envelope = Math.sin(normalized * Math.PI);
        const y = rect.height / 2
          + Math.sin(normalized * 30 + phase) * envelope * rect.height * 0.22
          + Math.sin(normalized * 83 - phase * 0.7) * envelope * rect.height * 0.07;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      frame += 1;
    };

    const tick = () => {
      if (disposed) return;
      draw();
      raf = window.requestAnimationFrame(tick);
    };

    if (active && !reducedMotion) tick();
    else draw();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw);
    resizeObserver?.observe(canvas);
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [active, reducedMotion]);

  return <canvas ref={canvasRef} className="performance-scope" aria-hidden="true" />;
}

function TransportHeader({ showLocked, onToggleLock, onExitDemo }: {
  showLocked: boolean;
  onToggleLock: () => void;
  onExitDemo: () => void;
}) {
  const transport = useAudioStore((state) => state.transport);
  const bpm = useAudioStore((state) => state.bpm);
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);
  const stop = useAudioStore((state) => state.stop);
  const record = useAudioStore((state) => state.record);
  const setBpm = useAudioStore((state) => state.setBpm);
  const [panicArmed, setPanicArmed] = useState(false);

  useEffect(() => {
    if (!panicArmed) return;
    const timer = window.setTimeout(() => setPanicArmed(false), 3200);
    return () => window.clearTimeout(timer);
  }, [panicArmed]);

  const handlePanic = () => {
    if (!panicArmed) {
      setPanicArmed(true);
      return;
    }
    stop();
    setPanicArmed(false);
  };

  return (
    <header className="performance-transport" aria-label="Demo transport">
      <div className="sensorium-mark" aria-label="Sensorium V2">S</div>
      <div className="live-identity">
        <span className="live-identity__signal" aria-hidden="true" />
        <span>DEMO</span>
        <strong>Simulation / Main</strong>
      </div>

      <div className="transport-cluster" aria-label="Transport controls">
        <motion.button
          className="transport-key transport-key--play"
          whileTap={{ scale: 0.92 }}
          onClick={transport === 'playing' ? pause : play}
          aria-label={transport === 'playing' ? 'Pause show' : 'Play show'}
          aria-pressed={transport === 'playing'}
        >
          {transport === 'playing' ? <Pause weight="fill" /> : <Play weight="fill" />}
        </motion.button>
        <motion.button className="transport-key" whileTap={{ scale: 0.92 }} onClick={stop} aria-label="Stop show">
          <Stop weight="fill" />
        </motion.button>
        <motion.button
          className={`transport-key transport-key--record ${transport === 'recording' ? 'is-active' : ''}`}
          whileTap={{ scale: 0.92 }}
          onClick={record}
          aria-label="Record performance"
          aria-pressed={transport === 'recording'}
        >
          <Record weight="fill" />
        </motion.button>
      </div>

      <div className="bpm-control" aria-label="Tempo">
        <button onClick={() => setBpm(bpm - 1)} aria-label="Decrease tempo" disabled={showLocked}>−</button>
        <div><strong>{Math.round(bpm)}</strong><span>BPM</span></div>
        <button onClick={() => setBpm(bpm + 1)} aria-label="Increase tempo" disabled={showLocked}>+</button>
      </div>

      <button
        className={`show-lock ${showLocked ? 'is-locked' : ''}`}
        onClick={onToggleLock}
        aria-pressed={showLocked}
        title="Locks structural and calibration edits. Performance gestures remain active."
      >
        <Lock weight={showLocked ? 'fill' : 'regular'} />
        <span>{showLocked ? 'SHOW LOCKED' : 'LOCK SHOW'}</span>
      </button>

      <div className="sync-health" aria-label="Synchronization status">
        <Broadcast weight="duotone" />
        <div><strong>SYNC MODEL</strong><span>SIM · MIDI · OSC · PTP</span></div>
      </div>

      <div className="master-output">
        <div className="master-output__copy"><span>MASTER · SIM</span><strong>−6.2 LUFS</strong></div>
        <MasterScope active={transport === 'playing' || transport === 'recording'} />
      </div>

      <button className="demo-exit-button" onClick={onExitDemo}>
        <Lock weight="bold" />
        <span>DEMO VERLASSEN</span>
      </button>

      <button className={`panic-button ${panicArmed ? 'is-armed' : ''}`} onClick={handlePanic}>
        <Warning weight={panicArmed ? 'fill' : 'bold'} />
        <span>{panicArmed ? 'CONFIRM' : 'PANIC'}</span>
      </button>
    </header>
  );
}

function StageReadiness({ onStartDemo }: { onStartDemo: () => void }) {
  const checks = [
    { icon: HardDrives, label: 'Audio interfaces', state: 'UNVERIFIZIERT', detail: 'Kein nativer Readback; Hardwarestatus unbekannt' },
    { icon: Waveform, label: 'MIDI endpoints', state: 'NICHT GEPRÜFT', detail: 'Keine Ports geöffnet, keine Schreibfreigabe' },
    { icon: Broadcast, label: 'Clock & network', state: 'UNVERIFIZIERT', detail: 'OSC, PTP und Transport bleiben aus' },
    { icon: ShieldCheck, label: 'Stage authority', state: 'FAIL-CLOSED', detail: 'Physische Ausgänge sind nicht freigegeben' },
  ];

  return (
    <div className="stage-readiness-app">
      <header className="stage-readiness-header">
        <div className="sensorium-mark" aria-label="Sensorium V2">S</div>
        <div>
          <span>STAGE MODE</span>
          <strong>Hardware truth before show control</strong>
        </div>
        <div className="stage-readiness-header__state"><i /> AUSGÄNGE GESPERRT</div>
      </header>

      <main className="stage-readiness-main">
        <section className="stage-readiness-panel" aria-labelledby="stage-readiness-title">
          <div className="stage-readiness-eyebrow"><ShieldCheck weight="fill" /> PHYSICAL READINESS</div>
          <h1 id="stage-readiness-title">Keine Simulation im Stage-Modus.</h1>
          <p>
            Diese Oberfläche meldet erst dann echte Betriebsbereitschaft, wenn Audio, MIDI, Clock und
            Geräteidentität durch einen verbundenen Hardware-Core gemessen wurden. Bis dahin bleibt der
            Bühneneinsatz gesperrt.
          </p>

          <div className="stage-readiness-grid">
            {checks.map(({ icon: Icon, label, state, detail }) => (
              <article key={label}>
                <Icon weight="duotone" />
                <div><span>{label}</span><strong>{state}</strong><small>{detail}</small></div>
              </article>
            ))}
          </div>

          <div className="stage-readiness-actions">
            <button className="stage-demo-button" onClick={onStartDemo}>
              <Play weight="fill" />
              <span><strong>DEMO STARTEN</strong><small>Alle Modelle und Spielereien isoliert öffnen</small></span>
            </button>
            <div role="status"><Warning weight="fill" /> Hardware-Tests und Stage-Abnahme stehen noch aus.</div>
          </div>
        </section>
      </main>

      <footer className="stage-readiness-footer">
        <span>Sensorium V2 · Stage boundary</span>
        <span>Keine stillen Gerätezugriffe · keine simulierte Health-Freigabe</span>
      </footer>
    </div>
  );
}

function PerformanceNavigation({ mode, onChange, onUndo, canUndo, onOpenActions, actionTriggerRef }: {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
  onUndo: () => void;
  canUndo: boolean;
  onOpenActions: () => void;
  actionTriggerRef: RefObject<HTMLButtonElement>;
}) {
  return (
    <nav className="performance-nav" aria-label="Performance workspaces">
      <div className="performance-nav__items">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const selected = mode === item.id;
          return (
            <button
              key={item.id}
              className={`performance-nav__item ${selected ? 'is-selected' : ''}`}
              onClick={() => onChange(item.id)}
              aria-current={selected ? 'page' : undefined}
            >
              <Icon weight={selected ? 'fill' : 'regular'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="performance-nav__utilities">
        <button ref={actionTriggerRef} className="command-trigger" onClick={onOpenActions}>
          <MagnifyingGlass weight="bold" aria-hidden="true" />
          <span>Quick<br />Ctrl K</span>
        </button>
        <button className="undo-gesture" onClick={onUndo} disabled={!canUndo}>
          <ArrowCounterClockwise className="undo-gesture__icon" weight="bold" aria-hidden="true" />
          <span>Undo<br />Gesture</span>
        </button>
      </div>
    </nav>
  );
}

type QuickActionsState = ReturnType<typeof useQuickActions>;

function QuickActionOverlay({ quickActions, returnFocusRef }: {
  quickActions: QuickActionsState;
  returnFocusRef: RefObject<HTMLButtonElement>;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!quickActions.isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        quickActions.setIsOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => !element.hasAttribute('hidden'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [quickActions.isOpen, quickActions.setIsOpen, returnFocusRef]);

  return (
    <AnimatePresence>
      {quickActions.isOpen && (
        <motion.div
          className="quick-action-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={() => quickActions.setIsOpen(false)}
        >
          <motion.section
            ref={panelRef}
            className="quick-action-panel"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Quick actions"
          >
            <header>
              <MagnifyingGlass weight="bold" />
              <input
                autoFocus
                value={quickActions.query}
                onChange={(event) => quickActions.setQuery(event.target.value)}
                placeholder="Workspace or action…"
                aria-label="Search quick actions"
              />
              <button type="button" onClick={() => quickActions.setIsOpen(false)} aria-label="Close quick actions"><X weight="bold" /></button>
            </header>
            <div className="quick-action-results">
              {quickActions.filtered.map((action) => (
                <button type="button" key={action.id} onClick={() => quickActions.execute(action)}>
                  <span><strong>{action.label}</strong><small>{action.category}</small></span>
                  {action.shortcut ? <kbd>{action.shortcut}</kbd> : <ArrowRight weight="bold" />}
                </button>
              ))}
              {!quickActions.filtered.length && <div className="quick-action-empty">No matching demo action.</div>}
            </div>
            <footer><span>ISOLATED DEMO COMMANDS</span><kbd>CTRL K</kbd></footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PerformanceToastViewport() {
  const toasts = useToasts();
  const icons = {
    success: CheckCircle,
    warning: WarningCircle,
    error: XCircle,
    info: Info,
  } as const;

  return (
    <div className="performance-toasts" aria-live="polite" aria-label="Demo notifications">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              className={`performance-toast performance-toast--${toast.type}`}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 18, scale: 0.97 }}
            >
              <Icon weight="fill" />
              <span>{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function ExistingWorkspace({ mode }: { mode: Exclude<WorkspaceMode, 'perform'> }) {
  const content = useMemo(() => {
    switch (mode) {
      case 'sections': return <SessionGrid />;
      case 'mix': return <MixerConsole />;
      case 'macros': return <SnapshotMorphSuite />;
      case 'visual': return <VolumetricFrequencyCloud />;
      case 'mindmap': return <SpatialMindmap />;
      case 'acoustic': return <AudiophileAcousticLab />;
      case 'stadium': return <Spatial5DStadium />;
      case 'instinct': return <QuantumInstinctMatrix />;
      case 'production': return <IndustrialProductionSuite />;
      case 'tools': return <LiveToolsWorkspace />;
      case 'ai': return <div className="ai-workspace-shell"><AiPanel /></div>;
      case 'system': return <HardwareAuditPanel />;
    }
  }, [mode]);

  return (
    <motion.section
      className="existing-workspace"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      aria-label={`${mode} workspace`}
    >
      <div className="existing-workspace__bar">
        <div><span>WORKSPACE</span><strong>{mode}</strong></div>
        <div className="existing-workspace__health"><ShieldCheck weight="fill" /> Simulation workspace</div>
      </div>
      <div className="existing-workspace__content">
        <Suspense fallback={<div className="workspace-loading" role="status">Loading show module…</div>}>
          {content}
        </Suspense>
      </div>
    </motion.section>
  );
}

export default function App() {
  const [demoMode, setDemoMode] = useState(true);
  const [mode, setMode] = useState<WorkspaceMode>('perform');
  const [showLocked, setShowLocked] = useState(true);
  const [undoSignal, setUndoSignal] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const quickActionTriggerRef = useRef<HTMLButtonElement>(null);

  const exitDemo = () => {
    useAudioStore.getState().stop();
    setMode('perform');
    setShowLocked(true);
    setCanUndo(false);
    setDemoMode(false);
  };

  const quickActionItems = useMemo<QuickAction[]>(() => [
    ...NAV_ITEMS.map((item) => ({
      id: `workspace-${item.id}`,
      label: `Open ${item.label}`,
      category: 'Workspace',
      action: () => setMode(item.id),
    })),
    {
      id: 'toggle-show-lock',
      label: showLocked ? 'Unlock structural demo edits' : 'Lock structural demo edits',
      category: 'Demo safety',
      action: () => setShowLocked((value) => !value),
    },
    {
      id: 'panic-stop',
      label: 'Stop demo transport',
      category: 'Transport',
      shortcut: 'STOP',
      action: () => {
        useAudioStore.getState().stop();
        notify('Demo transport stopped', 'warning');
      },
    },
    {
      id: 'stage-readiness',
      label: 'Open physical readiness boundary',
      category: 'Demo safety',
      action: exitDemo,
    },
  ], [showLocked]);
  const quickActions = useQuickActions(quickActionItems);

  return (
    <MotionConfig reducedMotion="user">
    {!demoMode ? (
      <StageReadiness onStartDemo={() => setDemoMode(true)} />
    ) : (
    <div className="performance-app">
      <TransportHeader
        showLocked={showLocked}
        onToggleLock={() => setShowLocked((value) => !value)}
        onExitDemo={exitDemo}
      />
      <PerformanceNavigation
        mode={mode}
        onChange={setMode}
        onUndo={() => setUndoSignal((signal) => signal + 1)}
        canUndo={canUndo && mode === 'perform'}
        onOpenActions={() => quickActions.setIsOpen(true)}
        actionTriggerRef={quickActionTriggerRef}
      />
      <main className="performance-main">
        <AnimatePresence mode="wait">
          {mode === 'perform' ? (
            <PerformanceWorkspace
              key="perform"
              showLocked={showLocked}
              undoSignal={undoSignal}
              onUndoAvailability={setCanUndo}
            />
          ) : (
            <ExistingWorkspace key={mode} mode={mode} />
          )}
        </AnimatePresence>
      </main>
      <footer className="performance-footer">
        <span><HardDrives weight="fill" /> Twin A/B model · SIM</span>
        <span><Waveform weight="bold" /> Demo stream · 48 kHz · 64 samples</span>
        <span>Soft takeover: armed</span>
        <span>Touch map: 10-point ready</span>
      </footer>
      <QuickActionOverlay quickActions={quickActions} returnFocusRef={quickActionTriggerRef} />
      <PerformanceToastViewport />
    </div>
    )}
    </MotionConfig>
  );
}
