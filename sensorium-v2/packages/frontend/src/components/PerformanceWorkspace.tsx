import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Broadcast,
  CheckCircle,
  GitBranch,
  Lock,
  Pulse,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react';
import { useAudioStore, useVisualStore } from '../store';

type SurfaceKey = 'current' | 'next' | 'energy' | 'space' | 'rhythm' | 'visual';
type SurfaceValues = Record<SurfaceKey, number>;

interface PerformanceWorkspaceProps {
  showLocked: boolean;
  undoSignal: number;
  onUndoAvailability: (available: boolean) => void;
}

interface SurfaceDefinition {
  id: SurfaceKey;
  eyebrow: string;
  title: string;
  valueLabel: (value: number) => string;
  instruction: string;
  detail: string;
  color: string;
  secondary: string;
}

const DEFAULT_VALUES: SurfaceValues = {
  current: 58,
  next: 42,
  energy: 72,
  space: 61,
  rhythm: 50,
  visual: 68,
};

const SURFACES: SurfaceDefinition[] = [
  {
    id: 'current', eyebrow: 'Current Section', title: 'Echo Fields',
    valueLabel: (value) => `${value.toFixed(0)}% texture`, instruction: 'Drag to morph',
    detail: 'Stem-safe harmonic morph', color: '#22d3ee', secondary: '#8b5cf6',
  },
  {
    id: 'next', eyebrow: 'Next Section', title: 'Rise',
    valueLabel: (value) => `${Math.max(1, Math.round(value / 12))} bars`, instruction: 'Drag to preview',
    detail: 'Quantized transition preview', color: '#14f1d9', secondary: '#2563eb',
  },
  {
    id: 'energy', eyebrow: 'Energy', title: 'Intensity',
    valueLabel: (value) => `${Math.round(value)}`, instruction: 'Pinch to control',
    detail: 'Audio · lighting · visuals', color: '#f97316', secondary: '#ec4899',
  },
  {
    id: 'space', eyebrow: 'Space', title: 'Depth',
    valueLabel: (value) => `${Math.round(value)}%`, instruction: 'Drag to position',
    detail: 'ADM scene · reverb field', color: '#a855f7', secondary: '#06b6d4',
  },
  {
    id: 'rhythm', eyebrow: 'Rhythm', title: 'Groove',
    valueLabel: (value) => `${Math.round((value - 50) * 0.32)} ms`, instruction: 'Swipe to shift',
    detail: 'Phase-safe pocket control', color: '#f43f5e', secondary: '#f59e0b',
  },
  {
    id: 'visual', eyebrow: 'Visual World', title: 'Synth Wave',
    valueLabel: (value) => `${Math.round(value)}% reactive`, instruction: 'Drag to explore',
    detail: 'Color · motion · atmosphere', color: '#38bdf8', secondary: '#d946ef',
  },
];

function haptic(pattern: number | number[] = 8) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
}

function OrbitalDisplay({ value, color, secondary, activePointers }: {
  value: number;
  color: string;
  secondary: string;
  activePointers: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const valueRef = useRef(value);
  const activePointersRef = useRef(activePointers);
  valueRef.current = value;
  activePointersRef.current = activePointers;

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
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const currentValue = valueRef.current;
      const pointerCount = activePointersRef.current;
      const base = Math.min(rect.width, rect.height) * (0.19 + currentValue * 0.00062);
      const energy = currentValue / 100;
      const phase = reducedMotion ? 0.3 : frame * 0.012;
      const gradient = context.createRadialGradient(cx, cy, base * 0.04, cx, cy, base * 1.55);
      gradient.addColorStop(0, `${color}66`);
      gradient.addColorStop(0.44, `${secondary}22`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(cx, cy, base * 1.6, 0, Math.PI * 2);
      context.fill();

      for (let ring = 0; ring < 5; ring += 1) {
        context.beginPath();
        const radius = base * (0.62 + ring * 0.18);
        const start = phase * (ring % 2 ? -1 : 1) + ring * 0.72;
        const length = Math.PI * (0.78 + energy * 0.75);
        context.arc(cx, cy, radius, start, start + length);
        context.lineWidth = ring === 2 ? 2.4 : 1;
        context.strokeStyle = ring % 2 ? `${secondary}${pointerCount ? 'dd' : '8a'}` : `${color}${pointerCount ? 'f2' : 'a8'}`;
        context.stroke();
      }

      context.beginPath();
      for (let index = 0; index <= 72; index += 1) {
        const angle = (index / 72) * Math.PI * 2;
        const ripple = Math.sin(index * 0.58 + phase * 5) * base * 0.06 * energy;
        const radius = base * 0.72 + ripple;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.strokeStyle = `${color}d9`;
      context.lineWidth = 1.25;
      context.stroke();

      context.fillStyle = '#f8fbff';
      context.beginPath();
      context.arc(cx, cy, pointerCount > 1 ? 5 : 3.2, 0, Math.PI * 2);
      context.fill();

      frame += 1;
    };

    const tick = () => {
      if (disposed) return;
      draw();
      raf = window.requestAnimationFrame(tick);
    };

    if (reducedMotion) draw();
    else tick();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw);
    resizeObserver?.observe(canvas);
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [color, reducedMotion, secondary]);

  return <canvas ref={canvasRef} className="orbital-display" aria-hidden="true" />;
}

function TouchSurface({ definition, value, onChangeStart, onChange, onStatus }: {
  definition: SurfaceDefinition;
  value: number;
  onChangeStart: () => void;
  onChange: (value: number) => void;
  onStatus: (status: string) => void;
}) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; value: number } | null>(null);
  const freezeSingleUntilRelease = useRef(false);
  const latestValue = useRef(value);
  const [activePointers, setActivePointers] = useState(0);
  latestValue.current = value;

  const clampValue = (next: number) => Math.max(0, Math.min(100, next));

  const emitChange = (next: number) => {
    const safeValue = clampValue(next);
    latestValue.current = safeValue;
    onChange(safeValue);
  };

  const updateFromPointers = (element: HTMLElement) => {
    const currentPointers = [...pointers.current.values()];
    if (currentPointers.length >= 2) {
      const [first, second] = currentPointers;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (!pinchStart.current) pinchStart.current = { distance, value };
      emitChange(pinchStart.current.value + (distance - pinchStart.current.distance) * 0.32);
      return;
    }

    pinchStart.current = null;
    if (freezeSingleUntilRelease.current) return;
    const pointer = currentPointers[0];
    if (!pointer) return;
    const rect = element.getBoundingClientRect();
    const xValue = ((pointer.x - rect.left) / Math.max(1, rect.width)) * 100;
    const yValue = (1 - (pointer.y - rect.top) / Math.max(1, rect.height)) * 100;
    emitChange(xValue * 0.66 + yValue * 0.34);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointers.current.size === 0) {
      onChangeStart();
      freezeSingleUntilRelease.current = false;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setActivePointers(pointers.current.size);
    updateFromPointers(event.currentTarget);
    haptic(8);
    onStatus(`${definition.title}: ${definition.instruction}`);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    updateFromPointers(event.currentTarget);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const wasPinching = pointers.current.size > 1;
    pointers.current.delete(event.pointerId);
    pinchStart.current = null;
    if (wasPinching && pointers.current.size === 1) freezeSingleUntilRelease.current = true;
    setActivePointers(pointers.current.size);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointers.current.size === 0) {
      freezeSingleUntilRelease.current = false;
      haptic([6, 18, 6]);
      onStatus(`${definition.title} set to ${definition.valueLabel(latestValue.current)}`);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    let next = value;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += step;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 100;
    else return;
    event.preventDefault();
    onChangeStart();
    emitChange(next);
    onStatus(`${definition.title} set to ${definition.valueLabel(clampValue(next))}`);
  };

  return (
    <motion.div
      className={`touch-surface touch-surface--${definition.id}`}
      style={{ '--surface-color': definition.color, '--surface-secondary': definition.secondary } as CSSProperties}
      role="slider"
      tabIndex={0}
      aria-label={`${definition.eyebrow}, ${definition.title}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={definition.valueLabel(value)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releasePointer}
      onPointerCancel={releasePointer}
      onLostPointerCapture={releasePointer}
      animate={{ scale: activePointers ? 0.992 : 1 }}
      transition={{ type: 'spring', stiffness: 430, damping: 34 }}
    >
      <div className="touch-surface__copy">
        <span>{definition.eyebrow}</span>
        <strong>{definition.title}</strong>
        <em>{definition.valueLabel(value)}</em>
      </div>
      <OrbitalDisplay value={value} color={definition.color} secondary={definition.secondary} activePointers={activePointers} />
      <div className="touch-surface__instruction">
        <span>{activePointers > 1 ? 'Multitouch linked' : definition.instruction}</span>
        <small>{definition.detail}</small>
      </div>
      <div className="touch-surface__resolution-detail" aria-hidden="true">
        <span>confidence 99.98%</span><span>frame 0.6 ms</span><span>twin verified</span>
      </div>
    </motion.div>
  );
}

function ArtistGuardian({ status, onRecover }: { status: string; onRecover: () => void }) {
  const holdTimer = useRef<number | null>(null);
  const recoveredTimer = useRef<number | null>(null);
  const holdPointer = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [recovered, setRecovered] = useState(false);

  const cancelHold = useCallback(() => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    holdPointer.current = null;
    setHolding(false);
  }, []);

  const startHold = useCallback((pointerId: number | null) => {
    if (holding) return;
    holdPointer.current = pointerId;
    setHolding(true);
    haptic(12);
    holdTimer.current = window.setTimeout(() => {
      onRecover();
      setHolding(false);
      setRecovered(true);
      haptic([16, 30, 16]);
      holdTimer.current = null;
      recoveredTimer.current = window.setTimeout(() => setRecovered(false), 2200);
    }, 2000);
  }, [holding, onRecover]);

  useEffect(() => {
    const cancelOnWindowLoss = () => cancelHold();
    const cancelOnVisibilityLoss = () => { if (document.hidden) cancelHold(); };
    window.addEventListener('blur', cancelOnWindowLoss);
    document.addEventListener('visibilitychange', cancelOnVisibilityLoss);
    return () => {
      window.removeEventListener('blur', cancelOnWindowLoss);
      document.removeEventListener('visibilitychange', cancelOnVisibilityLoss);
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
      if (recoveredTimer.current !== null) window.clearTimeout(recoveredTimer.current);
    };
  }, [cancelHold]);

  return (
    <aside className="artist-guardian" aria-label="Artist Guardian">
      <div className="artist-guardian__heading">
        <div><span>ARTIST GUARDIAN</span><h2>Show authority</h2></div>
        <ShieldCheck weight="fill" />
      </div>

      <div className="guardian-orbit" aria-hidden="true">
        <div className="guardian-orbit__core"><Lock weight="fill" /></div>
        <span className="guardian-orbit__node guardian-orbit__node--one" />
        <span className="guardian-orbit__node guardian-orbit__node--two" />
        <span className="guardian-orbit__node guardian-orbit__node--three" />
      </div>

      <div className="guardian-state">
        <span className="guardian-state__dot" />
        <div><strong>DIGITAL TWIN SIMULATION</strong><span>FOH · stage · visual model</span></div>
      </div>

      <div className="guardian-checks">
        <div><CheckCircle weight="fill" /><span>Signal model</span><strong>46 / 46 SIM</strong></div>
        <div><CheckCircle weight="fill" /><span>Recording inputs</span><strong>DEMO A + B</strong></div>
        <div><CheckCircle weight="fill" /><span>One-beat recovery</span><strong>SIM READY</strong></div>
        <div className="guardian-checks__ultra"><CheckCircle weight="fill" /><span>PTP model</span><strong>DEMO ±0.2 µs</strong></div>
      </div>

      <div className="guardian-status" role="status" aria-live="polite">{status}</div>

      <button
        className={`safe-state-button ${holding ? 'is-holding' : ''} ${recovered ? 'is-recovered' : ''}`}
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); startHold(event.pointerId); }}
        onPointerMove={(event) => {
          if (holdPointer.current !== event.pointerId) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const tolerance = 12;
          if (event.clientX < rect.left - tolerance || event.clientX > rect.right + tolerance || event.clientY < rect.top - tolerance || event.clientY > rect.bottom + tolerance) cancelHold();
        }}
        onPointerUp={(event) => { if (holdPointer.current === event.pointerId) cancelHold(); }}
        onPointerCancel={(event) => { if (holdPointer.current === event.pointerId) cancelHold(); }}
        onLostPointerCapture={(event) => { if (holdPointer.current === event.pointerId) cancelHold(); }}
        onBlur={cancelHold}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault();
            startHold(null);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') cancelHold();
        }}
      >
        <span className="safe-state-button__progress" aria-hidden="true" />
        <ShieldCheck weight="fill" />
        <span><strong>{recovered ? 'STATE RESTORED' : 'LAST SAFE STATE'}</strong><small>{holding ? 'Keep holding…' : 'Hold 2 seconds'}</small></span>
      </button>
    </aside>
  );
}

const GRAPH_NODES = [
  { id: 'rise', label: 'Rise', detail: '+16 energy', color: '#22d3ee' },
  { id: 'peak', label: 'Peak', detail: 'full release', color: '#f43f5e' },
  { id: 'fallback', label: 'Fallback', detail: 'safe loop', color: '#a855f7' },
  { id: 'glide', label: 'Glide', detail: 'open form', color: '#14b8a6' },
  { id: 'vamp', label: 'Vamp +8', detail: 'extend', color: '#f59e0b' },
  { id: 'outro', label: 'Outro', detail: 'safe exit', color: '#60a5fa' },
] as const;

function StateGraph({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <section className="state-graph" aria-label="Adaptive musical state graph">
      <div className="state-graph__title">
        <GitBranch weight="duotone" />
        <div><span>ADAPTIVE MUSICAL STATE</span><h2>Possible next moves</h2></div>
      </div>
      <div className="state-graph__current"><span>NOW · DEMO</span><strong>Echo Fields</strong><small>simulated stem model · no hardware readback</small></div>
      <ArrowRight className="state-graph__arrow" aria-hidden="true" />
      <div className="state-graph__nodes">
        {GRAPH_NODES.map((node) => (
          <button
            key={node.id}
            className={selected === node.id ? 'is-selected' : ''}
            style={{ '--node-color': node.color } as CSSProperties}
            onClick={() => { onSelect(node.id); haptic(7); }}
            aria-pressed={selected === node.id}
          >
            <span className="state-graph__node-dot" />
            <strong>{node.label}</strong>
            <small>{node.detail}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function PerformanceWorkspace({ showLocked, undoSignal, onUndoAvailability }: PerformanceWorkspaceProps) {
  const [values, setValues] = useState<SurfaceValues>(() => ({
    ...DEFAULT_VALUES,
    energy: useVisualStore.getState().intensity * 100,
    space: useVisualStore.getState().bloom * 100,
    rhythm: (useAudioStore.getState().bpm - 104) / 0.48,
  }));
  const valuesRef = useRef(values);
  const history = useRef<SurfaceValues[]>([]);
  const lastUndoSignal = useRef(undoSignal);
  const [status, setStatus] = useState('Demo model active. No physical show system has been verified.');
  const [selectedNode, setSelectedNode] = useState('rise');
  const setVisualIntensity = useVisualStore((state) => state.setIntensity);
  const setBloom = useVisualStore((state) => state.setBloom);
  const setBpm = useAudioStore((state) => state.setBpm);

  const applySurfaceValues = useCallback((nextValues: SurfaceValues) => {
    valuesRef.current = nextValues;
    setValues(nextValues);
    setVisualIntensity(nextValues.energy / 100);
    setBloom(nextValues.space / 100);
    setBpm(104 + nextValues.rhythm * 0.48);
  }, [setBloom, setBpm, setVisualIntensity]);

  const pushHistory = useCallback(() => {
    const currentValues = valuesRef.current;
    const previous = history.current.at(-1);
    if (!previous || Object.keys(currentValues).some((key) => previous[key as SurfaceKey] !== currentValues[key as SurfaceKey])) {
      history.current = [...history.current.slice(-11), { ...currentValues }];
      onUndoAvailability(true);
    }
  }, [onUndoAvailability]);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    applySurfaceValues(previous);
    setStatus('Last gesture undone.');
    onUndoAvailability(history.current.length > 0);
    haptic([6, 14, 6]);
  }, [applySurfaceValues, onUndoAvailability]);

  useEffect(() => {
    if (undoSignal !== lastUndoSignal.current) {
      lastUndoSignal.current = undoSignal;
      undo();
    }
  }, [undo, undoSignal]);

  useEffect(() => () => onUndoAvailability(false), [onUndoAvailability]);

  const handleValue = (id: SurfaceKey, value: number) => {
    applySurfaceValues({ ...valuesRef.current, [id]: value });
  };

  const recover = () => {
    pushHistory();
    applySurfaceValues(DEFAULT_VALUES);
    setSelectedNode('fallback');
    setStatus('Last safe state restored across audio, light and visual worlds.');
  };

  const selectedNodeLabel = useMemo(
    () => GRAPH_NODES.find((node) => node.id === selectedNode)?.label ?? 'Rise',
    [selectedNode],
  );

  return (
    <motion.div className="performance-workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <section className="performance-canvas" aria-label="Performance Canvas">
        <h1 className="visually-hidden">Sensorium V2 Performance Canvas</h1>
        <div className="performance-canvas__heading">
          <div>
            <span>PERFORMANCE CANVAS</span>
            <strong>Touch the show, not the software.</strong>
          </div>
          <div className="performance-canvas__badges">
            <span><Pulse weight="fill" /> 10-point touch</span>
            <span><Broadcast weight="fill" /> {showLocked ? 'structure locked' : 'edit authority'}</span>
            <span className="performance-canvas__ultra-badge"><Sparkle weight="fill" /> 8K context</span>
          </div>
        </div>
        <div className="touch-surface-grid">
          {SURFACES.map((definition) => (
            <TouchSurface
              key={definition.id}
              definition={definition}
              value={values[definition.id]}
              onChangeStart={pushHistory}
              onChange={(value) => handleValue(definition.id, value)}
              onStatus={setStatus}
            />
          ))}
        </div>
      </section>
      <ArtistGuardian status={status} onRecover={recover} />
      <StateGraph
        selected={selectedNode}
        onSelect={(node) => {
          setSelectedNode(node);
          setStatus(`${GRAPH_NODES.find((item) => item.id === node)?.label ?? node} is cued as the next valid show state.`);
        }}
      />
      <div className="next-state-announcer" aria-live="polite">Next state: {selectedNodeLabel}</div>
    </motion.div>
  );
}
