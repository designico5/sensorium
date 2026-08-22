import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CheckCircledIcon,
  ClockIcon,
  Cross2Icon,
  CubeIcon,
  DrawingPinIcon,
  ExclamationTriangleIcon,
  EyeOpenIcon,
  GearIcon,
  LayersIcon,
  LightningBoltIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PauseIcon,
  PlayIcon,
  ReloadIcon,
  SpeakerLoudIcon,
  StackIcon,
} from "@radix-ui/react-icons";
import { MobileScroll, MobileTextField } from "./mobile";

type AppView = "room" | "patch" | "discover" | "scenarios" | "devices";
type SpatialMode = "phone" | "ar" | "vr";
type SpatialLayer = "audio" | "midi" | "clock" | "network" | "power";
type LibraryMode = "acapellas" | "midi" | "multitracks" | "stems";
type DeviceId = "rme" | "push" | "launchpad" | "keylab" | "foh" | "stagebox";
type ShowMode = "rehearse" | "live";

type AppSettings = {
  holdToCommit: boolean;
  beatSafeCommit: boolean;
  autoRecover: boolean;
  feedbackGuard: boolean;
  spenWand: boolean;
  lowPowerHud: boolean;
  persistentAnchors: boolean;
  previewNormalize: boolean;
  offlineCache: boolean;
  offlineShowPack: boolean;
  thermalFallback: boolean;
  localPrivateAnalysis: boolean;
  modelTrainingConsent: boolean;
  hapticStrength: number;
  headroomGuard: number;
  gestureSmoothing: number;
  twinMaxAge: number;
  cameraFps: 30 | 60;
  controlAuthority: "desktop" | "phone" | "hardware";
  role: "artist" | "foh" | "producer";
  dominantHand: "left" | "right";
  stagePreset: "dark" | "gloves" | "glare" | "contrast";
  calmMode: boolean;
};

const defaultSettings: AppSettings = {
  holdToCommit: true,
  beatSafeCommit: true,
  autoRecover: true,
  feedbackGuard: true,
  spenWand: true,
  lowPowerHud: false,
  persistentAnchors: true,
  previewNormalize: true,
  offlineCache: true,
  offlineShowPack: true,
  thermalFallback: true,
  localPrivateAnalysis: true,
  modelTrainingConsent: false,
  hapticStrength: 72,
  headroomGuard: 6,
  gestureSmoothing: 68,
  twinMaxAge: 15,
  cameraFps: 30,
  controlAuthority: "desktop",
  role: "artist",
  dominantHand: "right",
  stagePreset: "dark",
  calmMode: false,
};

const SETTINGS_STORAGE_KEY = "ma-ii-mi.preferences.v1";

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return defaultSettings;
    const envelope = parsed as { version?: unknown; settings?: unknown };
    if (envelope.version !== 1 || !envelope.settings || typeof envelope.settings !== "object") return defaultSettings;
    const value = envelope.settings as Record<string, unknown>;
    const bool = (key: keyof AppSettings, fallback: boolean) => typeof value[key] === "boolean" ? value[key] as boolean : fallback;
    const number = (key: keyof AppSettings, fallback: number, min: number, max: number) => typeof value[key] === "number" ? Math.max(min, Math.min(max, value[key] as number)) : fallback;
    const choice = <T extends string | number>(key: keyof AppSettings, options: readonly T[], fallback: T) => options.includes(value[key] as T) ? value[key] as T : fallback;
    return {
      holdToCommit: bool("holdToCommit", defaultSettings.holdToCommit),
      beatSafeCommit: bool("beatSafeCommit", defaultSettings.beatSafeCommit),
      autoRecover: bool("autoRecover", defaultSettings.autoRecover),
      feedbackGuard: bool("feedbackGuard", defaultSettings.feedbackGuard),
      spenWand: bool("spenWand", defaultSettings.spenWand),
      lowPowerHud: bool("lowPowerHud", defaultSettings.lowPowerHud),
      persistentAnchors: bool("persistentAnchors", defaultSettings.persistentAnchors),
      previewNormalize: bool("previewNormalize", defaultSettings.previewNormalize),
      offlineCache: bool("offlineCache", defaultSettings.offlineCache),
      offlineShowPack: bool("offlineShowPack", defaultSettings.offlineShowPack),
      thermalFallback: bool("thermalFallback", defaultSettings.thermalFallback),
      localPrivateAnalysis: bool("localPrivateAnalysis", defaultSettings.localPrivateAnalysis),
      modelTrainingConsent: bool("modelTrainingConsent", defaultSettings.modelTrainingConsent),
      hapticStrength: number("hapticStrength", defaultSettings.hapticStrength, 0, 100),
      headroomGuard: number("headroomGuard", defaultSettings.headroomGuard, 3, 18),
      gestureSmoothing: number("gestureSmoothing", defaultSettings.gestureSmoothing, 0, 100),
      twinMaxAge: number("twinMaxAge", defaultSettings.twinMaxAge, 3, 60),
      cameraFps: choice("cameraFps", [30, 60] as const, defaultSettings.cameraFps),
      controlAuthority: choice("controlAuthority", ["desktop", "phone", "hardware"] as const, defaultSettings.controlAuthority),
      role: choice("role", ["artist", "foh", "producer"] as const, defaultSettings.role),
      dominantHand: choice("dominantHand", ["left", "right"] as const, defaultSettings.dominantHand),
      stagePreset: choice("stagePreset", ["dark", "gloves", "glare", "contrast"] as const, defaultSettings.stagePreset),
      calmMode: bool("calmMode", defaultSettings.calmMode),
    };
  } catch {
    return defaultSettings;
  }
}

const devices: Array<{ id: DeviceId; label: string; detail: string; x: number; y: number }> = [
  { id: "rme", label: "RME UCX II", detail: "12 in · 12 out · 48 kHz", x: 18, y: 42 },
  { id: "push", label: "Push 3", detail: "MPE · USB · MIDI", x: 46, y: 31 },
  { id: "launchpad", label: "Launchpad Pro", detail: "64 pads · MIDI", x: 69, y: 38 },
  { id: "keylab", label: "KeyLab 88", detail: "MIDI · USB · aftertouch", x: 55, y: 57 },
  { id: "foh", label: "FOH", detail: "32 channels · multitrack", x: 83, y: 43 },
  { id: "stagebox", label: "Stagebox", detail: "24 in · 8 out", x: 35, y: 68 },
];

const auditionTriggers = [
  { id: "kick", label: "Kick", color: "cyan", frequency: 58 },
  { id: "bass", label: "Bass Pulse", color: "violet", frequency: 92 },
  { id: "echo", label: "Echo Chord", color: "orange", frequency: 220 },
  { id: "rise", label: "Scene Rise", color: "teal", frequency: 330 },
];

const libraryContent = {
  acapellas: [
    { title: "Neon Choir", kind: "Dry vocal", meta: "128 BPM · Am · Licensed", accent: "magenta" },
    { title: "Midnight Spoken", kind: "Acapella", meta: "126 BPM · Dm · Lossless", accent: "blue" },
    { title: "Glass Breath", kind: "Vocal texture", meta: "124 BPM · Em · Licensed", accent: "ice" },
  ],
  midi: [
    { title: "Warehouse Pressure", kind: "MPE performance", meta: "128 BPM · Dm · Push 3", accent: "cyan" },
    { title: "Hawtin Microgroove", kind: "Drum + CC chain", meta: "130 BPM · 58% swing", accent: "orange" },
    { title: "Underworld Lift", kind: "Chord + arp system", meta: "126 BPM · Am · KeyLab", accent: "violet" },
  ],
  multitracks: [
    { title: "Signal Bloom", kind: "Full song DNA", meta: "18 tracks · MIDI · 48 kHz", accent: "cyan" },
    { title: "Concrete Halo", kind: "Licensed multitrack", meta: "24 tracks · 126 BPM · Fm", accent: "magenta" },
    { title: "Black Glass", kind: "Touring arrangement", meta: "32 tracks · snapshots", accent: "ice" },
  ],
  stems: [
    { title: "Neon Choir Stems", kind: "Vocal · drums · bass · music", meta: "Lossless · 128 BPM · Am", accent: "magenta" },
    { title: "Machine Breath", kind: "8 stereo stems", meta: "48 kHz · licensed", accent: "orange" },
    { title: "Night Transit", kind: "12 spatial stems", meta: "ADM-ready · 126 BPM", accent: "blue" },
  ],
} as const;

let hapticStrengthScale = 0.72;

function haptic(pattern: number | number[] = 8) {
  if (hapticStrengthScale <= 0 || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const scaled = Array.isArray(pattern)
    ? pattern.map((value) => Math.max(1, Math.round(value * hapticStrengthScale)))
    : Math.max(1, Math.round(pattern * hapticStrengthScale));
  navigator.vibrate(scaled);
}

let demoAudioContext: AudioContext | null = null;
let activeDemoOscillator: OscillatorNode | null = null;
let activeDemoGain: GainNode | null = null;
let activeDemoEnded: (() => void) | null = null;

function stopDemoTone(notify = true) {
  const ended = activeDemoEnded;
  activeDemoEnded = null;
  if (activeDemoOscillator) {
    activeDemoOscillator.onended = null;
    try { activeDemoOscillator.stop(); } catch { /* The source may already have ended. */ }
    activeDemoOscillator.disconnect();
  }
  activeDemoGain?.disconnect();
  activeDemoOscillator = null;
  activeDemoGain = null;
  if (notify) ended?.();
}

async function playDemoTone(frequency = 220, duration = 0.32, amplitude = 0.08, onEnded?: () => void) {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return false;
  try {
    stopDemoTone(false);
    if (!demoAudioContext || demoAudioContext.state === "closed") demoAudioContext = new AudioContext();
    const context = demoAudioContext;
    if (context.state === "suspended") await context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const finish = () => {
      if (activeDemoOscillator !== oscillator) return;
      oscillator.disconnect();
      gain.disconnect();
      activeDemoOscillator = null;
      activeDemoGain = null;
      const callback = activeDemoEnded;
      activeDemoEnded = null;
      callback?.();
    };
    oscillator.type = frequency < 100 ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(36, frequency * 0.72), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, Math.min(0.1, amplitude)), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.onended = finish;
    activeDemoOscillator = oscillator;
    activeDemoGain = gain;
    activeDemoEnded = onEnded ?? null;
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    return true;
  } catch {
    stopDemoTone(false);
    onEnded?.();
    return false;
  }
}

function ContextLayers({ value, onChange }: { value: SpatialLayer; onChange: (layer: SpatialLayer) => void }) {
  return (
    <div className="context-layers" aria-label="Signal layer" data-scroll-drag="ignore">
      {(["audio", "midi", "clock", "network", "power"] as const).map((layer) => (
        <button
          key={layer}
          aria-pressed={value === layer}
          className={value === layer ? "is-active" : ""}
          onClick={() => { onChange(layer); haptic(5); }}
        >
          {layer}
        </button>
      ))}
    </div>
  );
}

function HoldCommitButton({
  children,
  onConfirm,
  disabled = false,
  requireHold = true,
}: {
  children: string;
  onConfirm: () => void;
  disabled?: boolean;
  requireHold?: boolean;
}) {
  const [holding, setHolding] = useState(false);
  const [accessibleArmed, setAccessibleArmed] = useState(false);
  const timer = useRef<number | null>(null);
  const accessibleTimer = useRef<number | null>(null);
  const activePointer = useRef<number | null>(null);
  const confirmedRecently = useRef(false);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    activePointer.current = null;
    setHolding(false);
  };

  const start = () => {
    if (disabled || timer.current !== null) return;
    if (!requireHold) {
      haptic([8, 18, 8]);
      onConfirm();
      return;
    }
    setHolding(true);
    haptic(7);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      activePointer.current = null;
      setHolding(false);
      confirmedRecently.current = true;
      window.setTimeout(() => { confirmedRecently.current = false; }, 450);
      haptic([12, 28, 18]);
      onConfirm();
    }, 1100);
  };

  useEffect(() => {
    const cancelOnLoss = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
      activePointer.current = null;
      setHolding(false);
    };
    const cancelWhenHidden = () => { if (document.visibilityState !== "visible") cancelOnLoss(); };
    window.addEventListener("blur", cancelOnLoss);
    document.addEventListener("visibilitychange", cancelWhenHidden);
    return () => {
      window.removeEventListener("blur", cancelOnLoss);
      document.removeEventListener("visibilitychange", cancelWhenHidden);
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (accessibleTimer.current !== null) window.clearTimeout(accessibleTimer.current);
    };
  }, []);

  useEffect(() => { if (disabled) cancel(); }, [disabled]);

  return (
    <button
      className={`hold-button ${holding ? "is-holding" : ""}`}
      disabled={disabled}
      data-scroll-drag="ignore"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        start();
      }}
      onPointerUp={(event) => { if (activePointer.current === event.pointerId) cancel(); }}
      onPointerCancel={(event) => { if (activePointer.current === event.pointerId) cancel(); }}
      onLostPointerCapture={(event) => { if (activePointer.current === event.pointerId) cancel(); }}
      onBlur={cancel}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") cancel();
      }}
      onClick={(event) => {
        if (!requireHold || event.detail !== 0 || confirmedRecently.current) return;
        if (accessibleArmed) {
          if (accessibleTimer.current !== null) window.clearTimeout(accessibleTimer.current);
          accessibleTimer.current = null;
          setAccessibleArmed(false);
          haptic([8, 18, 8]);
          onConfirm();
        } else {
          setAccessibleArmed(true);
          accessibleTimer.current = window.setTimeout(() => { setAccessibleArmed(false); accessibleTimer.current = null; }, 4000);
        }
      }}
      aria-label={accessibleArmed ? `${children}. Activate again to confirm` : children}
    >
      <span>{accessibleArmed ? "Activate again to confirm" : children}</span>
    </button>
  );
}

function RoomView({
  selectedDevice,
  onSelect,
  spatialMode,
  onSpatialMode,
  layer,
  onLayer,
  showMode,
  settings,
}: {
  selectedDevice: DeviceId;
  onSelect: (id: DeviceId) => void;
  spatialMode: SpatialMode;
  onSpatialMode: (mode: SpatialMode) => void;
  layer: SpatialLayer;
  onLayer: (layer: SpatialLayer) => void;
  showMode: ShowMode;
  settings: AppSettings;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1.04);
  const [scanActive, setScanActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [reliefOpen, setReliefOpen] = useState(false);
  const [macroStatus, setMacroStatus] = useState("Pinned macros are local simulations");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { kind: "pan"; id: number; x: number; y: number; panX: number; panY: number }
    | { kind: "pinch"; distance: number; centerX: number; centerY: number; panX: number; panY: number; scale: number }
    | null
  >(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!scanActive) return;
    setScanProgress(8);
    const interval = window.setInterval(() => {
      setScanProgress((value) => {
        if (value >= 100) {
          window.clearInterval(interval);
          return 100;
        }
        return Math.min(100, value + 4);
      });
    }, 90);
    return () => window.clearInterval(interval);
  }, [scanActive]);

  useEffect(() => {
    const clearGestures = () => { pointers.current.clear(); gesture.current = null; };
    const clearWhenHidden = () => { if (document.visibilityState !== "visible") clearGestures(); };
    window.addEventListener("blur", clearGestures);
    document.addEventListener("visibilitychange", clearWhenHidden);
    return () => {
      window.removeEventListener("blur", clearGestures);
      document.removeEventListener("visibilitychange", clearWhenHidden);
    };
  }, []);

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...pointers.current.values()];
    if (values.length > 2) {
      pointers.current.delete(event.pointerId);
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (values.length === 1) {
      gesture.current = { kind: "pan", id: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    } else if (values.length === 2) {
      const [first, second] = values;
      gesture.current = {
        kind: "pinch",
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
        panX: pan.x,
        panY: pan.y,
        scale,
      };
    }
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...pointers.current.values()];
    if (values.length === 1 && gesture.current?.kind === "pan" && gesture.current.id === event.pointerId) {
      setPan({
        x: Math.max(-64, Math.min(64, gesture.current.panX + event.clientX - gesture.current.x)),
        y: Math.max(-36, Math.min(36, gesture.current.panY + event.clientY - gesture.current.y)),
      });
    } else if (values.length === 2 && gesture.current?.kind === "pinch") {
      const [first, second] = values;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      setScale(Math.max(1, Math.min(1.65, gesture.current.scale * (distance / Math.max(1, gesture.current.distance)))));
      setPan({
        x: Math.max(-64, Math.min(64, gesture.current.panX + centerX - gesture.current.centerX)),
        y: Math.max(-36, Math.min(36, gesture.current.panY + centerY - gesture.current.centerY)),
      });
    }
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const remaining = [...pointers.current.entries()];
    if (remaining.length === 2) {
      const [, first] = remaining[0];
      const [, second] = remaining[1];
      gesture.current = {
        kind: "pinch",
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
        panX: pan.x,
        panY: pan.y,
        scale,
      };
    } else if (remaining.length === 1) {
      const [id, point] = remaining[0];
      gesture.current = { kind: "pan", id, x: point.x, y: point.y, panX: pan.x, panY: pan.y };
    } else {
      gesture.current = null;
    }
  };

  return (
    <section className={`spatial-card layer-${layer}`} aria-label="5D spatial device room">
      <div className="spatial-toolbar">
        <div className="spatial-mode" aria-label="Spatial mode">
          {(["phone", "ar", "vr"] as const).map((mode) => (
            <button key={mode} className={spatialMode === mode ? "is-active" : ""} onClick={() => { onSpatialMode(mode); haptic(6); }} aria-pressed={spatialMode === mode}>{mode}</button>
          ))}
        </div>
        <span className="ready"><CheckCircledIcon /> S23 depth · demo</span>
        <div className="zoom-control" data-scroll-drag="ignore">
          <button onClick={() => setScale((value) => Math.max(1, value - 0.08))} aria-label="Zoom out">−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((value) => Math.min(1.65, value + 0.08))} aria-label="Zoom in">+</button>
        </div>
      </div>

      <ContextLayers value={layer} onChange={onLayer} />

      <div
        className={`spatial-room ${scanActive ? "is-scanning" : ""}`}
        data-scroll-drag="ignore"
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onLostPointerCapture={endPan}
      >
        <motion.div
          className="spatial-world"
          animate={{ x: pan.x, y: pan.y, scale }}
          transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 330, damping: 36 }}
        >
          <div className="spatial-room__image" style={{ backgroundImage: "url('/assets/ma-ii-mi/spatial-room.png')" }} />
          <div className={`signal-route signal-route--${layer}`} aria-hidden="true"><span /><span /><span /></div>
          {devices.map((device) => (
            <button
              key={device.id}
              className={`device-hotspot ${selectedDevice === device.id ? "is-selected" : ""}`}
              style={{ left: `${device.x}%`, top: `${device.y}%` }}
              onClick={() => { onSelect(device.id); haptic([8, 18, 8]); }}
              aria-pressed={selectedDevice === device.id}
            >
              <span className="device-hotspot__pulse" />
              <span className="device-hotspot__copy"><strong>{device.label}</strong><small>{device.detail}</small></span>
            </button>
          ))}
        </motion.div>
        <div className="room-vignette" aria-hidden="true" />
        <div className="confidence-halo" aria-label="Simulated room confidence"><span><strong>92</strong><small>SIM</small></span><span><strong>Clock locked</strong><small>2.9 ms · 0 faults</small></span></div>
        <button className={`room-scan ${scanActive ? "is-active" : ""}`} onClick={() => { setScanActive((value) => !value); haptic([7, 14, 7]); }} aria-pressed={scanActive}><EyeOpenIcon /> {scanActive ? `${scanProgress}% sweep` : "Sweep room"}</button>
        {scanActive && <div className="scan-overlay" aria-hidden="true"><i style={{ top: `${scanProgress}%` }} /><span>AR ROOM SWEEP · SIMULATION</span></div>}
        <div className="gesture-coach" aria-hidden="true"><span>Pinch</span><span>Drag</span><span>{settings.spenWand ? "S Pen" : "Rotate"}</span></div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDevice}
          className="selected-device"
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        >
          <div><span>SELECTED TWIN</span><strong>{devices.find((device) => device.id === selectedDevice)?.label}</strong></div>
          <div className="port-health"><i /><span>Ports mapped</span><strong>SIM</strong></div>
          <button onClick={() => { setReliefOpen((value) => !value); haptic(12); }} aria-expanded={reliefOpen}>{reliefOpen ? "Close relief" : "Open relief"}</button>
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {reliefOpen && <motion.div className="relief-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><div><span>PHOTOREAL TWIN</span><strong>{devices.find((device) => device.id === selectedDevice)?.label}</strong><small>Port geometry and materials are a visual simulation until the owner scan arrives.</small></div><button disabled><DrawingPinIcon /> Native scan hook</button></motion.div>}
      </AnimatePresence>
      <div className="macro-deck" aria-label="Pinned live macros">
        {["Talkback", "Next scene", "Emergency dry", "Marker"].map((macro, index) => (
          <button key={macro} onClick={() => { setMacroStatus(`${macro} staged locally · simulation`); haptic(index === 2 ? [14, 24, 14] : 6); if (index === 3) void playDemoTone(440, 0.14); }}><span>{index + 1}</span><strong>{macro}</strong></button>
        ))}
      </div>
      <div className="mode-disclaimer" role="status" aria-live="polite"><LockClosedIcon /> {macroStatus}. {showMode === "live" ? "Live Safe policy active" : "Rehearse: edits stay local"}.</div>
    </section>
  );
}

function AuditionDeck({ normalize, headroomGuard, active }: { normalize: boolean; headroomGuard: number; active: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [activeTrigger, setActiveTrigger] = useState("echo");
  const [comparison, setComparison] = useState<"A" | "B">("A");

  useEffect(() => {
    if (!active) {
      stopDemoTone();
      setPlaying(false);
    }
    return () => { stopDemoTone(false); };
  }, [active]);

  const audition = async (id: string) => {
    const trigger = auditionTriggers.find((item) => item.id === id) ?? auditionTriggers[0];
    setActiveTrigger(id);
    setPlaying(true);
    const amplitude = normalize ? 0.08 * Math.pow(10, -headroomGuard / 20) : 0.08;
    const started = await playDemoTone(trigger.frequency, id === "rise" ? 0.75 : 0.34, amplitude, () => setPlaying(false));
    if (!started) setPlaying(false);
    haptic(7);
  };

  return (
    <section className="audition-deck" aria-label="Isolated preview bus">
      <div className="audition-deck__heading">
        <div><SpeakerLoudIcon /><span>PREVIEW BUS</span><strong>Isolated · synth demo</strong></div>
        <span className="safety-chip"><CheckCircledIcon /> Demo-safe gain</span>
      </div>
      <div className="preview-transport">
        <button
          className="preview-play"
          onClick={() => { if (playing) { stopDemoTone(); setPlaying(false); } else { void audition(activeTrigger); } haptic(10); }}
          aria-label={playing ? "Pause preview" : "Play preview"}
          aria-pressed={playing}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className={`preview-wave ${playing ? "is-playing" : ""}`} aria-hidden="true">
          {Array.from({ length: 30 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 19) % 68)}%`, animationDelay: `${index * -22}ms` }} />)}
        </div>
        <div className="ab-toggle" aria-label="Original or patch comparison">
          {(["A", "B"] as const).map((item) => (
            <button key={item} className={comparison === item ? "is-active" : ""} onClick={() => setComparison(item)} aria-pressed={comparison === item}>{item}</button>
          ))}
        </div>
      </div>
      <div className="preview-meta"><span>128 BPM</span><span>{normalize ? `−${headroomGuard} dB guard` : "Original gain"}</span><span>2.9 ms estimated</span><span>{comparison === "A" ? "Original" : "Patch"}</span></div>
      <div className="trigger-strip" data-scroll-drag="ignore">
        {auditionTriggers.map((trigger) => (
          <button
            key={trigger.id}
            className={`trigger trigger--${trigger.color} ${activeTrigger === trigger.id ? "is-active" : ""}`}
            onClick={() => { void audition(trigger.id); }}
            aria-pressed={activeTrigger === trigger.id}
          >
            <span className="trigger__wave" aria-hidden="true" />
            <strong>{trigger.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function Library({ mode, onMode }: { mode: LibraryMode; onMode: (mode: LibraryMode) => void }) {
  const [qualityOnly, setQualityOnly] = useState(true);
  const [useCase, setUseCase] = useState<"live" | "livestream" | "remix">("live");
  const [gapSearch, setGapSearch] = useState(false);
  const [queued, setQueued] = useState<string | null>(null);
  const entries = libraryContent[mode];

  return (
    <section className="library-panel" aria-label="Discovery library">
      <div className="library-panel__heading"><div><LayersIcon /><span>DISCOVERY LIBRARY</span></div><strong>Licensed demo catalog</strong></div>
      <MobileTextField id="catalog-search" label="Search" placeholder="Acapellas, MIDI, songs, stems…" testId="catalog-search" />
      <div className="clearance-intent">
        <div><LockClosedIcon /><span>USE-CASE FILTER</span></div>
        <div>{(["live", "livestream", "remix"] as const).map((intent) => <button key={intent} className={useCase === intent ? "is-active" : ""} aria-pressed={useCase === intent} onClick={() => setUseCase(intent)}>{intent}</button>)}</div>
      </div>
      <button className={`negative-space-search ${gapSearch ? "is-active" : ""}`} onClick={() => setGapSearch((value) => !value)} aria-pressed={gapSearch}><MagnifyingGlassIcon /><span><strong>Fill the four bars before the drop</strong><small>No drums · dark minor · offline · {useCase} rights demo</small></span></button>
      <div className="library-tabs" aria-label="Library type" data-scroll-drag="ignore">
        {(["acapellas", "midi", "multitracks", "stems"] as const).map((item) => (
          <button key={item} aria-pressed={mode === item} className={mode === item ? "is-active" : ""} onClick={() => onMode(item)}>{item}</button>
        ))}
      </div>
      <div className="filter-strip" data-scroll-drag="ignore">
        <button disabled title="Native catalog filter planned">BPM 124–130 · demo</button><button disabled title="Native catalog filter planned">Key Am · demo</button><button disabled title="Rights adapter planned">Licensed · demo</button><button disabled title="Quality adapter planned">Lossless · demo</button>
        <button className={qualityOnly ? "is-active" : ""} onClick={() => setQualityOnly((value) => !value)} aria-pressed={qualityOnly}>HQ only</button>
      </div>
      <div className="library-results">
        {entries.map((entry, index) => (
          <article className="library-result" key={entry.title}>
            <div className={`library-art library-art--${entry.accent}`} aria-hidden="true"><span>{index + 1}</span></div>
            <button className="library-result__play" aria-label={`Preview ${entry.title}`} onClick={() => { void playDemoTone(180 + index * 72, 0.38); haptic(7); }}><PlayIcon /></button>
            <div className="library-result__copy"><strong>{entry.title}</strong><span>{entry.kind}</span><small>{entry.meta}</small><div className="asset-passport"><b>{useCase} demo</b><b>rig ready</b><b>offline</b></div></div>
            <button className="add-preview" onClick={() => { setQueued(entry.title); void playDemoTone(260 + index * 54, 0.28); haptic([6, 12, 6]); }}>{queued === entry.title ? "Queued" : "+ Preview"}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PatchView({ showMode, settings }: { showMode: ShowMode; settings: AppSettings }) {
  const [layer, setLayer] = useState<SpatialLayer>("audio");
  const [pending, setPending] = useState(true);
  const [committed, setCommitted] = useState(false);
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState("Preview route locally before commit");
  const canWrite = showMode !== "live" || (settings.controlAuthority === "phone" && armed);

  const commit = () => {
    setPending(false);
    setCommitted(true);
    setMessage(settings.beatSafeCommit ? "Queued for next bar · simulation" : "Committed locally · simulation");
  };

  return (
    <section className="workspace-view patch-view" aria-label="Virtual patch workspace">
      <div className="workspace-heading"><div><MixerHorizontalIcon /><span>SEMANTIC PATCH</span><h1>Preview → Commit → Undo</h1></div><strong>SIMULATION</strong></div>
      <ContextLayers value={layer} onChange={(value) => { setLayer(value); setPending(true); setCommitted(false); setMessage("Layer change staged locally"); }} />
      <div className="patch-flow">
        <button className="patch-node"><small>FROM</small><strong>Push 3</strong><span>{layer === "audio" ? "USB Audio 1/2" : `${layer} primary`}</span></button>
        <div className="patch-cable"><i /><span>{layer}</span><i /></div>
        <button className="patch-node"><small>TO</small><strong>RME UCX II</strong><span>{layer === "audio" ? "AN 1/2" : `${layer} receive`}</span></button>
      </div>
      <div className="route-options"><button className="is-active" aria-pressed="true">Stereo</button><button disabled>−6 dB guard · planned</button><button disabled>Follow clock · planned</button><button disabled>Redundant · planned</button></div>
      {showMode === "live" && <div className="authority-gate"><LockClosedIcon /><span><strong>{settings.controlAuthority} authority</strong><small>{settings.controlAuthority === "phone" ? (armed ? "Phone armed for this staged diff" : "Arm the phone before commit") : "Read-only on phone; change authority in Settings"}</small></span><button disabled={settings.controlAuthority !== "phone"} className={armed ? "is-active" : ""} aria-pressed={armed} onClick={() => setArmed((value) => !value)}>{armed ? "Armed" : "Arm"}</button></div>}
      <div className="change-lane">
        <div><EyeOpenIcon /><span>STAGED DIFF</span></div>
        <strong role="status" aria-live="polite">{message}</strong>
        <ul><li>Add {layer} route Push 3 → RME</li><li>Keep Main Out isolated</li><li>Rollback checkpoint created</li></ul>
        <div className="change-actions">
          <button onClick={() => { void playDemoTone(164, 0.28); setMessage("Auditioning on isolated preview bus"); }}>Audition</button>
          <HoldCommitButton onConfirm={commit} disabled={!pending || !canWrite} requireHold={showMode === "live" || settings.holdToCommit}>{showMode === "live" ? (canWrite ? "Hold to commit" : "Commit locked") : "Commit route"}</HoldCommitButton>
          <button className="undo-action" disabled={!committed} onClick={() => { setPending(true); setCommitted(false); setMessage("Rollback complete · last known good restored"); haptic([10, 16, 10]); }}><ReloadIcon /> Undo</button>
        </div>
      </div>
      <div className="safety-note"><LockClosedIcon /> {showMode === "live" ? "Live Safe requires phone authority plus an explicit arm. Native readback is still planned." : "Rehearse changes never touch physical hardware."}</div>
    </section>
  );
}

function ScenariosView({ showMode, settings }: { showMode: ShowMode; settings: AppSettings }) {
  const sceneOptions = [
    { id: "arrival", title: "Room Arrival", detail: "Scan · anchors · quiet line check", status: "Known good" },
    { id: "pulse", title: "Dark Pulse", detail: "Push + RME · 128 BPM · spatial stems", status: "Validated" },
    { id: "dropout", title: "Dropout", detail: "Dry vocal · bass orbit · lights −18%", status: "Ready" },
    { id: "rescue", title: "Last Known Good", detail: "Dry main · local clock · FX bypass", status: "Recovery" },
  ] as const;
  const [selected, setSelected] = useState<(typeof sceneOptions)[number]["id"]>("dropout");
  const [morph, setMorph] = useState(58);
  const [quantize, setQuantize] = useState<"beat" | "bar" | "phrase" | "manual">("bar");
  const [eventText, setEventText] = useState("Dropout preview armed");

  return (
    <section className="workspace-view scenarios-view" aria-label="Scenario lab">
      <div className="workspace-heading"><div><StackIcon /><span>SCENE CAPSULES</span><h1>Rehearse every possible night</h1></div><strong>LOCAL SIM</strong></div>
      <div className="scene-grid">
        {sceneOptions.map((scene) => (
          <button key={scene.id} className={selected === scene.id ? "is-active" : ""} onClick={() => { setSelected(scene.id); setEventText(`${scene.title} preview armed`); haptic(6); }}>
            <span>{scene.status}</span><strong>{scene.title}</strong><small>{scene.detail}</small>
          </button>
        ))}
      </div>
      <div className="morph-panel">
        <div className="morph-heading"><span>ONE-THUMB MORPH</span><strong>{morph}% Dropout</strong></div>
        <input type="range" min="0" max="100" value={morph} onChange={(event) => setMorph(Number(event.target.value))} aria-label="Scene morph" data-scroll-drag="ignore" />
        <div className="morph-labels"><span>Dark Pulse</span><span>Dropout</span></div>
        <div className="quantize-row" aria-label="Commit quantization">{(["beat", "bar", "phrase", "manual"] as const).map((mode) => <button key={mode} className={quantize === mode ? "is-active" : ""} aria-pressed={quantize === mode} onClick={() => setQuantize(mode)}>{mode}</button>)}</div>
        <HoldCommitButton onConfirm={() => setEventText(`Scene recalled on next ${quantize} · simulation`)} requireHold={showMode === "live" || settings.holdToCommit}>Recall selected scene</HoldCommitButton>
      </div>
      <div className="flight-recorder">
        <div><ClockIcon /><span>FLIGHT RECORDER</span><strong>Rolling local history</strong></div>
        <ol><li><time>NOW</time><span role="status" aria-live="polite">{eventText}</span></li><li><time>−00:18</time><span>Clock readback stable · simulated</span></li><li><time>−01:42</time><span>Known-good checkpoint stored</span></li></ol>
      </div>
      <button className="rescue-action" onClick={() => { setSelected("rescue"); setMorph(0); setEventText("Recovery scene restored locally"); haptic([18, 30, 18]); }}><ReloadIcon /> One-tap rescue · last known good</button>
    </section>
  );
}

function DevicesView() {
  const [selected, setSelected] = useState<DeviceId>("rme");
  return (
    <section className="workspace-view devices-view" aria-label="Device twins">
      <div className="workspace-heading"><div><CubeIcon /><span>DEVICE TWINS</span><h1>Truth before photorealism</h1></div><strong>DEMO MAPS</strong></div>
      <p className="workspace-intro">Exact relief twins will use the owner’s photos, port maps and scans. Until then every status below is visibly simulated.</p>
      <div className="readiness-strip" aria-label="Simulated show readiness">
        <div><span>Audio</span><strong>Ready</strong><small>6/6 paths</small></div>
        <div><span>MIDI</span><strong>Ready</strong><small>4/4 twins</small></div>
        <div className="is-warn"><span>Clock</span><strong>Check</strong><small>fallback unset</small></div>
        <div><span>Network</span><strong>Ready</strong><small>local only</small></div>
      </div>
      <div className="baseline-diff"><div><CheckCircledIcon /><span>EXPECTED VS SEEN</span></div><strong>5 matched · 1 generic substitute · simulated</strong><button disabled>Baseline diff · native preview</button></div>
      <div className="device-list">
        {devices.map((device, index) => (
          <button key={device.id} className={selected === device.id ? "is-active" : ""} onClick={() => setSelected(device.id)}>
            <span className={`device-health ${index === 3 ? "is-warn" : ""}`} /><div><strong>{device.label}</strong><small>{device.detail}</small></div><div><span>Port map</span><small>SIM · {4 + index * 2} s</small></div>
          </button>
        ))}
      </div>
      <div className="device-actions"><button disabled><DrawingPinIcon /> Place · native</button><button disabled><LayersIcon /> Ports · native</button><button disabled><EyeOpenIcon /> Relief · native</button></div>
      <div className="device-request"><ExclamationTriangleIcon /><div><strong>Owner device list still needed</strong><span>Photos of front, back, ports and labels unlock exact S23 Ultra twins.</span></div></div>
    </section>
  );
}

function SettingToggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button className="setting-toggle" role="switch" aria-checked={value} onClick={() => onChange(!value)}><span><strong>{label}</strong><small>{detail}</small></span><i className={value ? "is-on" : ""}><b /></i></button>;
}

function SettingsPanel({ showMode, onShowMode, settings, onSettings, onClose }: { showMode: ShowMode; onShowMode: (mode: ShowMode) => void; settings: AppSettings; onSettings: (next: AppSettings) => void; onClose: () => void }) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onSettings({ ...settings, [key]: value });
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <section id="control-safety-settings" className="workspace-view settings-view" aria-label="Control and safety settings">
      <div className="settings-title"><div><GearIcon /><span>CONTROL & SAFETY</span><h1 ref={headingRef} tabIndex={-1}>Your hands. Your rules.</h1></div><button onClick={onClose} aria-label="Close settings"><Cross2Icon /></button></div>
      <div className="show-mode-selector" aria-label="Show mode">
        {showMode === "live" ? <HoldCommitButton onConfirm={() => onShowMode("rehearse")} requireHold>Hold to exit Live Safe</HoldCommitButton> : <button className="is-active" aria-pressed="true"><CubeIcon /><span><strong>Rehearse</strong><small>Free local exploration</small></span></button>}
        <button className={showMode === "live" ? "is-active" : ""} aria-pressed={showMode === "live"} onClick={() => onShowMode("live")}><LockClosedIcon /><span><strong>Live Safe</strong><small>Armed, bounded, reversible</small></span></button>
      </div>
      <div className="prototype-disclaimer"><ExclamationTriangleIcon /><span><strong>Interactive native preview</strong><small>Personal UI preferences work here. Hardware readback, camera, privacy, cache and touring policies connect after the native Android services are installed.</small></span></div>
      <details className="settings-group"><summary>PERSONAL OVERLAY</summary>
        <div className="setting-choice"><strong>Role home</strong><small>Changes priorities and wording, never the shared patch</small><div>{(["artist", "foh", "producer"] as const).map((role) => <button key={role} className={settings.role === role ? "is-active" : ""} aria-pressed={settings.role === role} onClick={() => update("role", role)}>{role}</button>)}</div></div>
        <div className="setting-choice"><strong>Stage preset</strong><small>Bundles visibility and touch settings</small><div>{(["dark", "gloves", "glare", "contrast"] as const).map((preset) => <button key={preset} className={settings.stagePreset === preset ? "is-active" : ""} aria-pressed={settings.stagePreset === preset} onClick={() => update("stagePreset", preset)}>{preset}</button>)}</div></div>
        <div className="setting-choice"><strong>One-hand dock</strong><small>Moves personal quick controls into thumb reach</small><div>{(["left", "right"] as const).map((hand) => <button key={hand} className={settings.dominantHand === hand ? "is-active" : ""} aria-pressed={settings.dominantHand === hand} onClick={() => update("dominantHand", hand)}>{hand}</button>)}</div></div>
        <SettingToggle label="Calm mode" detail="Hide holograms, discovery and noncritical meters" value={settings.calmMode} onChange={(value) => update("calmMode", value)} />
      </details>
      <details className="settings-group" open><summary>SHOW SAFETY</summary>
        <SettingToggle label="Hold to commit" detail="Prevents accidental recalls and routes" value={settings.holdToCommit} onChange={(value) => update("holdToCommit", value)} />
        <SettingToggle label="Beat-safe commit" detail="Fire only on beat, bar or phrase" value={settings.beatSafeCommit} onChange={(value) => update("beatSafeCommit", value)} />
        <SettingToggle label="Auto recovery checkpoint" detail="Keep the last confirmed-good state locally" value={settings.autoRecover} onChange={(value) => update("autoRecover", value)} />
        <SettingToggle label="Feedback-loop guard" detail="Block dangerous audio and MIDI cycles" value={settings.feedbackGuard} onChange={(value) => update("feedbackGuard", value)} />
      </details>
      <details className="settings-group"><summary>S23 ULTRA & GESTURES</summary>
        <SettingToggle label="S Pen live wand" detail="Hover to preview, hold to authorize" value={settings.spenWand} onChange={(value) => update("spenWand", value)} />
        <SettingToggle label="Low-power performance HUD" detail="Drop camera before heat hurts the show" value={settings.lowPowerHud} onChange={(value) => update("lowPowerHud", value)} />
        <SettingToggle label="Persistent room anchors" detail="Remember positions between rehearsals" value={settings.persistentAnchors} onChange={(value) => update("persistentAnchors", value)} />
        <label className="setting-range" data-scroll-drag="ignore"><span><strong>Gesture smoothing</strong><small>{settings.gestureSmoothing}%</small></span><input type="range" min="0" max="100" value={settings.gestureSmoothing} onChange={(event) => update("gestureSmoothing", Number(event.target.value))} /></label>
        <label className="setting-range" data-scroll-drag="ignore"><span><strong>Haptic strength</strong><small>{settings.hapticStrength}%</small></span><input type="range" min="0" max="100" value={settings.hapticStrength} onChange={(event) => { update("hapticStrength", Number(event.target.value)); haptic(5); }} /></label>
      </details>
      <details className="settings-group"><summary>TOURING & AUTHORITY</summary>
        <div className="setting-choice"><strong>Single-writer authority · simulation</strong><small>Only one controller may write to the show</small><div>{(["desktop", "phone", "hardware"] as const).map((authority) => <button key={authority} className={settings.controlAuthority === authority ? "is-active" : ""} aria-pressed={settings.controlAuthority === authority} onClick={() => update("controlAuthority", authority)}>{authority}</button>)}</div></div>
        <SettingToggle label="Offline show pack" detail="Pin topology, scenes, assets and recovery locally" value={settings.offlineShowPack} onChange={(value) => update("offlineShowPack", value)} />
        <SettingToggle label="Thermal fallback" detail="Shed AR first and preserve the 2D cockpit" value={settings.thermalFallback} onChange={(value) => update("thermalFallback", value)} />
        <div className="setting-choice"><strong>AR camera budget · native preview</strong><small>30 fps preserves battery; 60 fps is rehearsal-only</small><div>{([30, 60] as const).map((fps) => <button key={fps} className={settings.cameraFps === fps ? "is-active" : ""} aria-pressed={settings.cameraFps === fps} onClick={() => update("cameraFps", fps)}>{fps} fps</button>)}</div></div>
        <label className="setting-range" data-scroll-drag="ignore"><span><strong>Twin freshness hard stop</strong><small>{settings.twinMaxAge} s</small></span><input type="range" min="3" max="60" value={settings.twinMaxAge} onChange={(event) => update("twinMaxAge", Number(event.target.value))} /></label>
      </details>
      <details className="settings-group"><summary>AUDITION & LIBRARY</summary>
        <SettingToggle label="Safe-gain preview" detail="Normalize auditions without touching Main" value={settings.previewNormalize} onChange={(value) => update("previewNormalize", value)} />
        <SettingToggle label="Offline rehearsal cache" detail="Keep licensed previews and MIDI backstage" value={settings.offlineCache} onChange={(value) => update("offlineCache", value)} />
        <SettingToggle label="Local private analysis" detail="Keep unreleased tracks and set lists on this device" value={settings.localPrivateAnalysis} onChange={(value) => update("localPrivateAnalysis", value)} />
        <SettingToggle label="Allow model training" detail="Separate, revocable consent; off by default" value={settings.modelTrainingConsent} onChange={(value) => update("modelTrainingConsent", value)} />
        <label className="setting-range" data-scroll-drag="ignore"><span><strong>Headroom guard</strong><small>−{settings.headroomGuard} dB</small></span><input type="range" min="3" max="18" value={settings.headroomGuard} onChange={(event) => update("headroomGuard", Number(event.target.value))} /></label>
      </details>
      <div className="settings-footnote"><CheckCircledIcon /> Defaults stay local, reversible and fail closed. Hardware authority requires readback.</div>
    </section>
  );
}

export default function Prototype() {
  const [view, setView] = useState<AppView>("room");
  const [spatialMode, setSpatialMode] = useState<SpatialMode>("ar");
  const [spatialLayer, setSpatialLayer] = useState<SpatialLayer>("audio");
  const [showMode, setShowMode] = useState<ShowMode>("rehearse");
  const [selectedDevice, setSelectedDevice] = useState<DeviceId>("rme");
  const [libraryMode, setLibraryMode] = useState<LibraryMode>("acapellas");
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const title = useMemo(() => settingsOpen ? "Control & Safety" : view === "room" ? "5D Spatial Room" : view, [settingsOpen, view]);

  useEffect(() => { hapticStrengthScale = settings.hapticStrength / 100; }, [settings.hapticStrength]);
  useEffect(() => {
    try { window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, settings })); } catch { /* Preferences remain in memory if storage is unavailable. */ }
  }, [settings]);

  return (
    <MobileScroll className="app-screen">
      <main className={`ma-app stage-${settings.stagePreset} hand-${settings.dominantHand} ${settings.calmMode ? "is-calm" : ""} ${settings.lowPowerHud ? "is-low-power" : ""}`} aria-label="MA-II-MI mobile prototype">
        <header className="ma-header">
          <div className="ma-brand"><span className="ma-brand__mark"><SpeakerLoudIcon /></span><div><strong>MA-II-MI</strong><span>{title}</span></div></div>
          <div className="header-actions">
            <button className={`show-mode-chip ${showMode === "live" ? "is-live" : ""}`} onClick={() => { if (showMode === "live") setSettingsOpen(true); else setShowMode("live"); haptic([6, 14, 6]); }} aria-label={showMode === "live" ? "Open Live Safe settings" : "Switch to Live Safe mode"}>
              {showMode === "live" ? <LockClosedIcon /> : <LightningBoltIcon />}<span>{showMode === "live" ? "LIVE SAFE" : "REHEARSE"}</span>
            </button>
            <button ref={settingsTriggerRef} className={`settings-trigger ${settingsOpen ? "is-active" : ""}`} onClick={() => setSettingsOpen((value) => !value)} aria-label="Open control and safety settings" aria-expanded={settingsOpen} aria-controls="control-safety-settings"><GearIcon /></button>
          </div>
        </header>

        <div hidden={settingsOpen || view !== "room"}>
          <RoomView selectedDevice={selectedDevice} onSelect={setSelectedDevice} spatialMode={spatialMode} onSpatialMode={setSpatialMode} layer={spatialLayer} onLayer={setSpatialLayer} showMode={showMode} settings={settings} />
          <div hidden={settings.calmMode}>
            <AuditionDeck normalize={settings.previewNormalize} headroomGuard={settings.headroomGuard} active={!settingsOpen && view === "room" && !settings.calmMode} />
            <Library mode={libraryMode} onMode={setLibraryMode} />
          </div>
        </div>
        <div hidden={settingsOpen || view !== "patch"}><PatchView showMode={showMode} settings={settings} /></div>
        <div hidden={settingsOpen || view !== "discover"}><Library mode={libraryMode} onMode={setLibraryMode} /></div>
        <div hidden={settingsOpen || view !== "scenarios"}><ScenariosView showMode={showMode} settings={settings} /></div>
        <div hidden={settingsOpen || view !== "devices"}><DevicesView /></div>
        {settingsOpen && <SettingsPanel showMode={showMode} onShowMode={setShowMode} settings={settings} onSettings={setSettings} onClose={() => { setSettingsOpen(false); window.requestAnimationFrame(() => settingsTriggerRef.current?.focus()); }} />}

        <nav className="ma-nav" aria-label="Primary navigation">
          {([
            ["room", CubeIcon, "Room"],
            ["patch", MixerHorizontalIcon, "Patch"],
            ["discover", MagnifyingGlassIcon, "Discover"],
            ["scenarios", StackIcon, "Scenarios"],
            ["devices", LayersIcon, "Devices"],
          ] as const).map(([id, Icon, label]) => (
            <button key={id} className={!settingsOpen && view === id ? "is-active" : ""} onClick={() => { setSettingsOpen(false); setView(id); haptic(5); }} aria-current={!settingsOpen && view === id ? "page" : undefined}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>
      </main>
    </MobileScroll>
  );
}
