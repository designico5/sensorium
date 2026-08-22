/**
 * SENSORIUM V2 — Global State Layer
 * Zustand stores for Audio, MIDI, Visual, Session, and AI Co-Pilot.
 * Zero-boilerplate, atomic slices, reactive subscriptions.
 */
import { create } from 'zustand';

/* ═══════════════════════════════════════════════════════════════════
   Audio Store — Transport, Metering, BPM
   ═══════════════════════════════════════════════════════════════════ */

export type TransportState = 'stopped' | 'playing' | 'recording' | 'paused';

export interface AudioStore {
  transport: TransportState;
  bpm: number;
  beat: number;           // current beat position (0-based)
  bar: number;            // current bar
  masterLevel: number;    // 0..1
  masterPeakL: number;    // 0..1 instantaneous
  masterPeakR: number;    // 0..1
  spectrum: Float32Array; // frequency bins (normalized 0..1)
  waveform: Float32Array; // time-domain samples

  // Actions
  play: () => void;
  stop: () => void;
  record: () => void;
  pause: () => void;
  setBpm: (bpm: number) => void;
  setMasterLevel: (level: number) => void;
  setMetering: (peakL: number, peakR: number) => void;
  setSpectrum: (data: Float32Array) => void;
  setWaveform: (data: Float32Array) => void;
  tick: () => void; // advance beat
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  transport: 'stopped',
  bpm: 128,
  beat: 0,
  bar: 0,
  masterLevel: 0.8,
  masterPeakL: 0,
  masterPeakR: 0,
  spectrum: new Float32Array(64),
  waveform: new Float32Array(128),

  play: () => set({ transport: 'playing' }),
  stop: () => set({ transport: 'stopped', beat: 0, bar: 0 }),
  record: () => set({ transport: 'recording' }),
  pause: () => set({ transport: 'paused' }),
  setBpm: (bpm) => set({ bpm: Math.max(20, Math.min(300, bpm)) }),
  setMasterLevel: (level) => set({ masterLevel: Math.max(0, Math.min(1, level)) }),
  setMetering: (peakL, peakR) => set({ masterPeakL: peakL, masterPeakR: peakR }),
  setSpectrum: (data) => set({ spectrum: data }),
  setWaveform: (data) => set({ waveform: data }),
  tick: () => {
    const { beat } = get();
    const nextBeat = (beat + 1) % 4;
    const barIncrement = nextBeat === 0 ? 1 : 0;
    set({ beat: nextBeat, bar: get().bar + barIncrement });
  },
}));


/* ═══════════════════════════════════════════════════════════════════
   Visual Store — Active visual preset, parameters
   ═══════════════════════════════════════════════════════════════════ */

export type VisualPreset = 'waveform' | 'spectrum' | 'particles' | 'nebula' | 'fluid';

export interface VisualStore {
  preset: VisualPreset;
  intensity: number;     // 0..1
  colorShift: number;    // 0..360 hue rotation
  bloom: number;         // 0..1
  reactive: boolean;     // audio-reactive mode

  setPreset: (p: VisualPreset) => void;
  setIntensity: (v: number) => void;
  setColorShift: (v: number) => void;
  setBloom: (v: number) => void;
  toggleReactive: () => void;
}

export const useVisualStore = create<VisualStore>((set) => ({
  preset: 'nebula',
  intensity: 0.72,
  colorShift: 0,
  bloom: 0.61,
  reactive: true,

  setPreset: (preset) => set({ preset }),
  setIntensity: (intensity) => set({ intensity: Math.max(0, Math.min(1, intensity)) }),
  setColorShift: (colorShift) => set({ colorShift: colorShift % 360 }),
  setBloom: (bloom) => set({ bloom: Math.max(0, Math.min(1, bloom)) }),
  toggleReactive: () => set((s) => ({ reactive: !s.reactive })),
}));


/* ═══════════════════════════════════════════════════════════════════
   Session Store — Scenes, Clips, Tracks
   ═══════════════════════════════════════════════════════════════════ */

export interface Clip {
  id: string;
  name: string;
  color: string;
  length: number; // beats
  playing: boolean;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  mute: boolean;
  solo: boolean;
  volume: number; // 0..1
  clips: (Clip | null)[]; // one per scene
}

export interface SessionStore {
  tracks: Track[];
  activeScene: number;
  numScenes: number;
  selectedTrack: number | null;
  selectedClip: { track: number; scene: number } | null;

  addTrack: (name: string, color: string) => void;
  removeTrack: (index: number) => void;
  setTrackName: (index: number, name: string) => void;
  toggleMute: (index: number) => void;
  toggleSolo: (index: number) => void;
  setTrackVolume: (index: number, volume: number) => void;
  setClip: (track: number, scene: number, clip: Clip | null) => void;
  setActiveScene: (scene: number) => void;
  selectTrack: (index: number | null) => void;
  launchClip: (track: number, scene: number) => void;
  stopTrack: (track: number) => void;
}

const TRACK_COLORS = ['#ff2d55', '#af52de', '#5ac8fa', '#ff9f0a', '#30d158', '#ffd60a', '#ff453a', '#64d2ff'];

export const useSessionStore = create<SessionStore>((set) => ({
  tracks: [
    { id: 't1', name: 'Synth Lead', color: '#ff2d55', mute: false, solo: false, volume: 0.8, clips: [
      { id: 'c1', name: 'Arp Pattern', color: '#ff2d55', length: 4, playing: false },
      null,
      { id: 'c3', name: 'Lead Hook', color: '#ff2d55', length: 8, playing: false },
      null,
    ]},
    { id: 't2', name: 'Bass', color: '#af52de', mute: false, solo: false, volume: 0.75, clips: [
      { id: 'c4', name: 'Sub Pulse', color: '#af52de', length: 4, playing: false },
      { id: 'c5', name: 'Acid Line', color: '#af52de', length: 8, playing: false },
      null,
      null,
    ]},
    { id: 't3', name: 'Drums', color: '#5ac8fa', mute: false, solo: false, volume: 0.85, clips: [
      { id: 'c6', name: 'Beat A', color: '#5ac8fa', length: 4, playing: false },
      { id: 'c7', name: 'Fill', color: '#5ac8fa', length: 2, playing: false },
      { id: 'c8', name: 'Breakdown', color: '#5ac8fa', length: 8, playing: false },
      null,
    ]},
    { id: 't4', name: 'Pad', color: '#ff9f0a', mute: false, solo: false, volume: 0.6, clips: [
      null,
      { id: 'c9', name: 'Ambient Wash', color: '#ff9f0a', length: 16, playing: false },
      null,
      { id: 'c10', name: 'Chord Stab', color: '#ff9f0a', length: 4, playing: false },
    ]},
  ],
  activeScene: 0,
  numScenes: 4,
  selectedTrack: null,
  selectedClip: null,

  addTrack: (name, color) => set((s) => ({
    tracks: [...s.tracks, {
      id: `t${Date.now()}`,
      name,
      color: color || TRACK_COLORS[s.tracks.length % TRACK_COLORS.length],
      mute: false, solo: false, volume: 0.8,
      clips: new Array(s.numScenes).fill(null),
    }],
  })),
  removeTrack: (index) => set((s) => ({
    tracks: s.tracks.filter((_, i) => i !== index),
  })),
  setTrackName: (index, name) => set((s) => ({
    tracks: s.tracks.map((t, i) => i === index ? { ...t, name } : t),
  })),
  toggleMute: (index) => set((s) => ({
    tracks: s.tracks.map((t, i) => i === index ? { ...t, mute: !t.mute } : t),
  })),
  toggleSolo: (index) => set((s) => ({
    tracks: s.tracks.map((t, i) => i === index ? { ...t, solo: !t.solo } : t),
  })),
  setTrackVolume: (index, volume) => set((s) => ({
    tracks: s.tracks.map((t, i) => i === index ? { ...t, volume: Math.max(0, Math.min(1, volume)) } : t),
  })),
  setClip: (track, scene, clip) => set((s) => ({
    tracks: s.tracks.map((t, ti) => ti === track ? {
      ...t,
      clips: t.clips.map((c, ci) => ci === scene ? clip : c),
    } : t),
  })),
  setActiveScene: (scene) => set({ activeScene: scene }),
  selectTrack: (index) => set({ selectedTrack: index }),
  launchClip: (track, scene) => set((s) => ({
    tracks: s.tracks.map((t, ti) => ti === track ? {
      ...t,
      clips: t.clips.map((c, ci) => c && ci === scene ? { ...c, playing: true } : c),
    } : t),
  })),
  stopTrack: (track) => set((s) => ({
    tracks: s.tracks.map((t, ti) => ti === track ? {
      ...t,
      clips: t.clips.map((c) => c ? { ...c, playing: false } : c),
    } : t),
  })),
}));


/* ═══════════════════════════════════════════════════════════════════
   Mixer Store — Channel strips
   ═══════════════════════════════════════════════════════════════════ */

export interface ChannelStrip {
  id: string;
  name: string;
  color: string;
  volume: number;   // 0..1 (linear)
  pan: number;      // -1..1
  mute: boolean;
  solo: boolean;
  eqLow: number;    // dB, -12..12
  eqMid: number;
  eqHigh: number;
  peakL: number;    // 0..1
  peakR: number;
  send: number;     // FX send amount 0..1
}

export interface MixerStore {
  channels: ChannelStrip[];
  selectedChannel: number | null;

  setVolume: (index: number, volume: number) => void;
  setPan: (index: number, pan: number) => void;
  toggleMute: (index: number) => void;
  toggleSolo: (index: number) => void;
  setEq: (index: number, band: 'low' | 'mid' | 'high', value: number) => void;
  setSend: (index: number, value: number) => void;
  setPeaks: (index: number, peakL: number, peakR: number) => void;
  selectChannel: (index: number | null) => void;
}

export const useMixerStore = create<MixerStore>((set) => ({
  channels: [
    { id: 'ch1', name: 'Kick', color: '#ff2d55', volume: 0.85, pan: 0, mute: false, solo: false, eqLow: 3, eqMid: 0, eqHigh: -2, peakL: 0, peakR: 0, send: 0 },
    { id: 'ch2', name: 'Snare', color: '#af52de', volume: 0.78, pan: 0.05, mute: false, solo: false, eqLow: -1, eqMid: 2, eqHigh: 1, peakL: 0, peakR: 0, send: 0.2 },
    { id: 'ch3', name: 'Hi-Hat', color: '#5ac8fa', volume: 0.65, pan: -0.1, mute: false, solo: false, eqLow: -6, eqMid: 0, eqHigh: 4, peakL: 0, peakR: 0, send: 0.1 },
    { id: 'ch4', name: 'Bass', color: '#ff9f0a', volume: 0.80, pan: 0, mute: false, solo: false, eqLow: 6, eqMid: -2, eqHigh: 0, peakL: 0, peakR: 0, send: 0 },
    { id: 'ch5', name: 'Synth', color: '#30d158', volume: 0.70, pan: -0.3, mute: false, solo: false, eqLow: 0, eqMid: 3, eqHigh: 2, peakL: 0, peakR: 0, send: 0.4 },
    { id: 'ch6', name: 'Pad', color: '#64d2ff', volume: 0.55, pan: 0.2, mute: false, solo: false, eqLow: -3, eqMid: 1, eqHigh: 5, peakL: 0, peakR: 0, send: 0.6 },
    { id: 'ch7', name: 'Vocal', color: '#ffd60a', volume: 0.75, pan: 0, mute: false, solo: false, eqLow: -2, eqMid: 4, eqHigh: 3, peakL: 0, peakR: 0, send: 0.3 },
    { id: 'ch8', name: 'FX', color: '#ff453a', volume: 0.50, pan: 0, mute: false, solo: false, eqLow: 0, eqMid: 0, eqHigh: 0, peakL: 0, peakR: 0, send: 0.8 },
  ],
  selectedChannel: null,

  setVolume: (index, volume) => set((s) => ({
    channels: s.channels.map((c, i) => i === index ? { ...c, volume: Math.max(0, Math.min(1, volume)) } : c),
  })),
  setPan: (index, pan) => set((s) => ({
    channels: s.channels.map((c, i) => i === index ? { ...c, pan: Math.max(-1, Math.min(1, pan)) } : c),
  })),
  toggleMute: (index) => set((s) => ({
    channels: s.channels.map((c, i) => i === index ? { ...c, mute: !c.mute } : c),
  })),
  toggleSolo: (index) => set((s) => ({
    channels: s.channels.map((c, i) => i === index ? { ...c, solo: !c.solo } : c),
  })),
  setEq: (index, band, value) => set((s) => ({
    channels: s.channels.map((c, i) => i === index ? { ...c, [`eq${band.charAt(0).toUpperCase()}${band.slice(1)}`]: Math.max(-12, Math.min(12, value)) } : c),
  })),
  setSend: (index, value) => set((s) => ({
    channels: s.channels.map((c, i) => i === index ? { ...c, send: Math.max(0, Math.min(1, value)) } : c),
  })),
  setPeaks: (index, peakL, peakR) => set((s) => ({
    channels: s.channels.map((c, i) => i === index ? { ...c, peakL, peakR } : c),
  })),
  selectChannel: (index) => set({ selectedChannel: index }),
}));


/* ═══════════════════════════════════════════════════════════════════
   AI Co-Pilot Store
   ═══════════════════════════════════════════════════════════════════ */

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AiStore {
  isOpen: boolean;
  messages: AiMessage[];
  isThinking: boolean;

  toggle: () => void;
  sendMessage: (content: string) => void;
  addResponse: (content: string) => void;
  setThinking: (v: boolean) => void;
  clear: () => void;
}

export const useAiStore = create<AiStore>((set) => ({
  isOpen: true, // Demo: AI Panel visible by default
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to Sensorium AI Co-Pilot. I can help with mixing, sound design, MIDI programming, and session arrangement. What would you like to explore?',
      timestamp: Date.now(),
    },
  ],
  isThinking: false,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  sendMessage: (content) => set((s) => ({
    messages: [...s.messages, { id: `msg-${Date.now()}`, role: 'user', content, timestamp: Date.now() }],
    isThinking: true,
  })),
  addResponse: (content) => set((s) => ({
    messages: [...s.messages, { id: `msg-${Date.now()}`, role: 'assistant', content, timestamp: Date.now() }],
    isThinking: false,
  })),
  setThinking: (v) => set({ isThinking: v }),
  clear: () => set({ messages: [], isThinking: false }),
}));


/* ═══════════════════════════════════════════════════════════════════
   UI Layout Store — Panel visibility
   ═══════════════════════════════════════════════════════════════════ */

export type ViewMode = 'session' | 'mixer' | 'visual' | 'arrangement' | 'mindmap' | 'acoustic' | 'stadium' | 'instinct' | 'hardware' | 'production';

export interface UiStore {
  viewMode: ViewMode;
  showVisualizer: boolean;
  showAiPanel: boolean;
  showTransport: boolean;
  sidebarWidth: number;

  setViewMode: (mode: ViewMode) => void;
  toggleVisualizer: () => void;
  toggleAiPanel: () => void;
  toggleTransport: () => void;
  setSidebarWidth: (w: number) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  viewMode: 'session',
  showVisualizer: true,
  showAiPanel: false,
  showTransport: true,
  sidebarWidth: 280,

  setViewMode: (viewMode) => set({ viewMode }),
  toggleVisualizer: () => set((s) => ({ showVisualizer: !s.showVisualizer })),
  toggleAiPanel: () => set((s) => ({ showAiPanel: !s.showAiPanel })),
  toggleTransport: () => set((s) => ({ showTransport: !s.showTransport })),
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth: Math.max(200, Math.min(500, sidebarWidth)) }),
}));
