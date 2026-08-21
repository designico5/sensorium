/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

// Core types
export interface MidiDevice {
  id: string;
  name: string;
  type: string;
  status: string;
  isPhysicalHardware: boolean;
  connectionType: string;
  portNameIn: string;
  portNameOut: string;
  bufferUsage: number;
  clockDrift: number;
  latency: number;
  dropCount: number;
  lastMessageTime: number;
  lastMessageValue: string;
  triggerDirection: string;
  midiChannel: number;
  ccFilterActive: boolean;
  velocityCurve: string;
  pollingRate: number;
  debounceMs: number;
  noiseFloor: number;
  usbSuspensionDisabled: boolean;
  bufferSizeSamples: number;
  driftCompensationMs: number;
  autoRecalibrateEnabled: boolean;
  firmwareVersion: string;
  latestFirmwareVersion: string;
  firmwareUpdateAvailable: boolean;
  firmwareUpdateStatus: string;
  firmwareUpdateProgress: number;
  backups: Array<{
    id: string;
    timestamp: string;
    firmwareVersion: string;
    note: string;
    isAuto?: boolean;
  }>;
}

export interface DiagnosticCardData {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

export interface SystemLog {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  source: string;
  message: string;
}

export type DeviceStatus = 'Healthy' | 'Warning' | 'Critical' | 'Disconnected';
export type DeviceType = 'Drum Machine' | 'Synthesizer' | 'USB Controller' | 'Audio Interface' | 'MIDI Interface';

export interface FirmwareInfo {
  deviceId: string;
  currentVersion: string;
  availableVersion: string;
  updateAvailable: boolean;
  downloadUrl: string;
  changelog: string[];
  isUpdating: boolean;
  updateProgress: number;
  updateStep: string;
  updateLog: string[];
  restorePoints: Array<{
    id: string;
    version: string;
    timestamp: string;
    name: string;
    size: string;
    isAuto?: boolean;
  }>;
}

interface ThemePack {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}

const THEME_PACKS: ThemePack[] = [
  {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk ⚡',
    description: 'Hochkontrastreiches Neon-Blau & Magenta-Cockpit.',
    primaryColor: '#00f0ff',
    secondaryColor: '#ff007f',
  },
  {
    id: 'synthesizerGold',
    name: 'Synthesizer Gold 📻',
    description: 'Analoges Moog-Amber & Orange für Vintage-Gefühl.',
    primaryColor: '#f59e0b',
    secondaryColor: '#ea580c',
  },
  {
    id: 'toxic',
    name: 'Acid Toxic ☢️',
    description: 'Radioaktive Säure-Grün & Giftgelb Akzente.',
    primaryColor: '#10b981',
    secondaryColor: '#eab308',
  },
  {
    id: 'deepSpace',
    name: 'Deep Space Cosmic 🌌',
    description: 'Dunkles, kosmisches Violett & Indigo-Thema.',
    primaryColor: '#8b5cf6',
    secondaryColor: '#6366f1',
  },
  {
    id: 'cleanSlate',
    name: 'Clean Slate Studio 🎚️',
    description: 'Professionelles SSL-Studio-Blau & Teal Theme.',
    primaryColor: '#06b6d4',
    secondaryColor: '#0f766e',
  },
];

// Theme CSS as string (will be injected)
const THEME_AND_PULSE_CSS = `
@keyframes red-pulse-glow {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 4px rgba(255, 49, 49, 0.15);
    border-color: rgba(255, 49, 49, 0.2);
    background-color: rgba(255, 49, 49, 0.02);
  }
  50% {
    box-shadow: 0 4px 25px rgba(0,0,0,0.5), 0 0 20px rgba(255, 49, 49, 0.55);
    border-color: rgba(255, 49, 49, 0.75);
    background-color: rgba(255, 49, 49, 0.08);
  }
}
.animate-red-pulse-glow {
  animation: red-pulse-glow 1.4s infinite ease-in-out !important;
}
@keyframes panic-pulse-glow {
  0%, 100% {
    transform: scale(0.97);
    background-color: #ff3131;
    box-shadow: 0 0 20px #ff3131;
  }
  50% {
    transform: scale(1.03);
    background-color: #ff0055;
    box-shadow: 0 0 35px #ff0055;
  }
}
.animate-panic-pulse-glow {
  animation: panic-pulse-glow 0.25s infinite ease-in-out !important;
}

:root {
  --theme-bg: #07070a;
  --theme-panel-bg: rgba(0, 0, 0, 0.45);
  --theme-panel-border: rgba(255, 255, 255, 0.05);
  --theme-panel-hover-border: rgba(0, 240, 255, 0.2);
  --neon-cyan-rgb: 0, 240, 255;
  --neon-magenta-rgb: 255, 0, 127;
  --neon-green-rgb: 16, 185, 129;
  --neon-yellow-rgb: 245, 158, 11;
  --neon-red-rgb: 255, 49, 49;
}

[data-theme="cyberpunk"] {
  --theme-bg: #07070a;
  --theme-panel-bg: rgba(0, 0, 0, 0.45);
  --theme-panel-border: rgba(255, 255, 255, 0.05);
  --theme-panel-hover-border: rgba(0, 240, 255, 0.25);
  --neon-cyan-rgb: 0, 240, 255;
  --neon-magenta-rgb: 255, 0, 127;
  --neon-green-rgb: 16, 185, 129;
  --neon-yellow-rgb: 245, 158, 11;
  --neon-red-rgb: 255, 49, 49;
}

[data-theme="synthesizerGold"] {
  --theme-bg: #0f0b08;
  --theme-panel-bg: rgba(26, 18, 12, 0.85);
  --theme-panel-border: rgba(245, 158, 11, 0.15);
  --theme-panel-hover-border: rgba(245, 158, 11, 0.45);
  --neon-cyan-rgb: 245, 158, 11;
  --neon-magenta-rgb: 234, 88, 12;
  --neon-green-rgb: 217, 119, 6;
  --neon-yellow-rgb: 180, 83, 9;
  --neon-red-rgb: 239, 68, 68;
}

[data-theme="toxic"] {
  --theme-bg: #010603;
  --theme-panel-bg: rgba(4, 15, 8, 0.85);
  --theme-panel-border: rgba(132, 204, 22, 0.15);
  --theme-panel-hover-border: rgba(132, 204, 22, 0.5);
  --neon-cyan-rgb: 163, 230, 53;
  --neon-magenta-rgb: 234, 179, 8;
  --neon-green-rgb: 16, 185, 129;
  --neon-yellow-rgb: 132, 204, 22;
  --neon-red-rgb: 239, 68, 68;
}

[data-theme="deepSpace"] {
  --theme-bg: #04010b;
  --theme-panel-bg: rgba(15, 6, 36, 0.85);
  --theme-panel-border: rgba(192, 132, 252, 0.15);
  --theme-panel-hover-border: rgba(192, 132, 252, 0.45);
  --neon-cyan-rgb: 192, 132, 252;
  --neon-magenta-rgb: 232, 121, 249;
  --neon-green-rgb: 129, 140, 248;
  --neon-yellow-rgb: 244, 114, 182;
  --neon-red-rgb: 244, 63, 94;
}

[data-theme="cleanSlate"] {
  --theme-bg: #0b0f19;
  --theme-panel-bg: rgba(15, 23, 42, 0.8);
  --theme-panel-border: rgba(148, 163, 184, 0.15);
  --theme-panel-hover-border: rgba(59, 130, 246, 0.45);
  --neon-cyan-rgb: 59, 130, 246;
  --neon-magenta-rgb: 6, 182, 212;
  --neon-green-rgb: 20, 184, 166;
  --neon-yellow-rgb: 245, 158, 11;
  --neon-red-rgb: 244, 63, 94;
}

.text-neon-cyan { color: rgb(var(--neon-cyan-rgb)) !important; }
.text-neon-magenta { color: rgb(var(--neon-magenta-rgb)) !important; }
.text-neon-green { color: rgb(var(--neon-green-rgb)) !important; }
.text-neon-yellow { color: rgb(var(--neon-yellow-rgb)) !important; }
.text-neon-red { color: rgb(var(--neon-red-rgb)) !important; }

.bg-neon-cyan { background-color: rgb(var(--neon-cyan-rgb)) !important; }
.bg-neon-magenta { background-color: rgb(var(--neon-magenta-rgb)) !important; }
.bg-neon-green { background-color: rgb(var(--neon-green-rgb)) !important; }
.bg-neon-yellow { background-color: rgb(var(--neon-yellow-rgb)) !important; }
.bg-neon-red { background-color: rgb(var(--neon-red-rgb)) !important; }

.border-neon-cyan { border-color: rgb(var(--neon-cyan-rgb)) !important; }
.border-neon-magenta { border-color: rgb(var(--neon-magenta-rgb)) !important; }
.border-neon-green { border-color: rgb(var(--neon-green-rgb)) !important; }
.border-neon-yellow { border-color: rgb(var(--neon-yellow-rgb)) !important; }
.border-neon-red { border-color: rgb(var(--neon-red-rgb)) !important; }

.bg-neon-cyan\\/10 { background-color: rgba(var(--neon-cyan-rgb), 0.1) !important; }
.bg-neon-magenta\\/10 { background-color: rgba(var(--neon-magenta-rgb), 0.1) !important; }
.bg-neon-green\\/10 { background-color: rgba(var(--neon-green-rgb), 0.1) !important; }
.bg-neon-yellow\\/10 { background-color: rgba(var(--neon-yellow-rgb), 0.1) !important; }
.bg-neon-red\\/10 { background-color: rgba(var(--neon-red-rgb), 0.1) !important; }

.border-neon-cyan\\/20 { border-color: rgba(var(--neon-cyan-rgb), 0.2) !important; }
.border-neon-magenta\\/20 { border-color: rgba(var(--neon-magenta-rgb), 0.2) !important; }
.border-neon-green\\/20 { border-color: rgba(var(--neon-green-rgb), 0.2) !important; }
.border-neon-yellow\\/20 { border-color: rgba(var(--neon-yellow-rgb), 0.2) !important; }
.border-neon-red\\/30 { border-color: rgba(var(--neon-red-rgb), 0.3) !important; }

.min-h-screen {
  background-color: var(--theme-bg) !important;
  transition: background-color 0.4s ease;
}
.glass-panel {
  background-color: var(--theme-panel-bg) !important;
  border-color: var(--theme-panel-border) !important;
  transition: border-color 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
}
.glass-panel:hover {
  border-color: var(--theme-panel-hover-border) !important;
}

.grid-dot-style {
  fill: rgb(var(--neon-cyan-rgb)) !important;
  opacity: 0.12 !important;
}

@keyframes wave {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.animate-wave {
  animation: wave 1.5s ease-in-out infinite;
}
`;

// Initial device data
const INITIAL_DEVICES: MidiDevice[] = [
  {
    id: 'dev-drum',
    name: 'DrumMachine MIDI 3 (Demo)',
    type: 'Drum Machine',
    status: 'Healthy',
    isPhysicalHardware: false,
    connectionType: 'VIRTUAL_SIMULATION',
    portNameIn: 'Ableton MIDI In (Port 3)',
    portNameOut: 'Ableton MIDI Out (Port 3)',
    bufferUsage: 14,
    clockDrift: 0.7,
    latency: 3.4,
    dropCount: 0,
    lastMessageTime: Date.now(),
    lastMessageValue: 'NoteOn C1 Vel:112',
    triggerDirection: 'Rising Edge',
    midiChannel: 10,
    ccFilterActive: true,
    velocityCurve: 'Linear',
    pollingRate: 1000,
    debounceMs: 2,
    noiseFloor: 5,
    usbSuspensionDisabled: true,
    bufferSizeSamples: 64,
    driftCompensationMs: 0,
    autoRecalibrateEnabled: true,
    firmwareVersion: 'v2.1.0',
    latestFirmwareVersion: 'v2.4.2',
    firmwareUpdateAvailable: true,
    firmwareUpdateStatus: 'idle',
    firmwareUpdateProgress: 0,
    backups: [
      { id: 'bak-drum-1', timestamp: '2026-05-12 14:32', firmwareVersion: 'v2.1.0', note: 'Pre-production stable backup' }
    ],
  },
  {
    id: 'dev-keys',
    name: 'Keyboard Synth (Demo)',
    type: 'Synthesizer',
    status: 'Healthy',
    isPhysicalHardware: false,
    connectionType: 'VIRTUAL_SIMULATION',
    portNameIn: 'MIDI USB Keyboard 1',
    portNameOut: 'MIDI USB Keyboard 1',
    bufferUsage: 8,
    clockDrift: 1.1,
    latency: 2.1,
    dropCount: 0,
    lastMessageTime: Date.now(),
    lastMessageValue: 'CC 74 (Cutoff) Val:64',
    triggerDirection: 'Rising Edge',
    midiChannel: 1,
    ccFilterActive: false,
    velocityCurve: 'Exponential',
    pollingRate: 1000,
    debounceMs: 4,
    noiseFloor: 8,
    usbSuspensionDisabled: true,
    bufferSizeSamples: 32,
    driftCompensationMs: 0,
    autoRecalibrateEnabled: true,
    firmwareVersion: 'v1.0.8',
    latestFirmwareVersion: 'v1.1.2',
    firmwareUpdateAvailable: true,
    firmwareUpdateStatus: 'idle',
    firmwareUpdateProgress: 0,
    backups: [
      { id: 'bak-keys-1', timestamp: '2026-06-01 11:15', firmwareVersion: 'v1.0.8', note: 'Gig-ready stable image' }
    ],
  },
  {
    id: 'dev-launchpad',
    name: 'USB Launcher Pad (Demo)',
    type: 'USB Controller',
    status: 'Healthy',
    isPhysicalHardware: false,
    connectionType: 'VIRTUAL_SIMULATION',
    portNameIn: 'Launchpad Pro MK3',
    portNameOut: 'Launchpad Pro MK3',
    bufferUsage: 22,
    clockDrift: 0.3,
    latency: 1.8,
    dropCount: 0,
    lastMessageTime: Date.now(),
    lastMessageValue: 'NoteOn D#2 Vel:98',
    triggerDirection: 'Rising Edge',
    midiChannel: 1,
    ccFilterActive: false,
    velocityCurve: 'Logarithmic',
    pollingRate: 1000,
    debounceMs: 1,
    noiseFloor: 3,
    usbSuspensionDisabled: true,
    bufferSizeSamples: 16,
    driftCompensationMs: 0,
    autoRecalibrateEnabled: true,
    firmwareVersion: 'v1.3.0',
    latestFirmwareVersion: 'v1.3.0',
    firmwareUpdateAvailable: false,
    firmwareUpdateStatus: 'idle',
    firmwareUpdateProgress: 0,
    backups: [],
  },
];

// Skeleton loader for initial render
const AppSkeleton = () => (
  <div className="min-h-screen bg-[var(--theme-bg)] text-white font-sans" data-theme="cyberpunk">
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-48 bg-white/5 border border-white/10 rounded" />
          <div className="h-4 w-64 bg-white/5 border border-white/10 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-white/5 border border-white/10 rounded" />
          <div className="h-10 w-24 bg-white/5 border border-white/10 rounded" />
          <div className="h-10 w-24 bg-white/5 border border-white/10 rounded" />
        </div>
      </div>
      
      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left panel skeleton */}
        <div className="lg:col-span-5 space-y-6">
          <div className="h-64 bg-white/5 border border-white/10 rounded-xl" />
          <div className="h-48 bg-white/5 border border-white/10 rounded-xl" />
          <div className="h-48 bg-white/5 border border-white/10 rounded-xl" />
        </div>
        
        {/* Right panel skeleton */}
        <div className="lg:col-span-7 space-y-6">
          <div className="h-80 bg-white/5 border border-white/10 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-white/5 border border-white/10 rounded-xl" />
            <div className="h-40 bg-white/5 border border-white/10 rounded-xl" />
            <div className="h-40 bg-white/5 border border-white/10 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Import ErrorBoundary
import { ErrorBoundary, CriticalErrorBoundary } from './ErrorBoundary';

// Main App component (modular version)
const SensoriumApp: React.FC = () => {
  // Theme management
  const [theme, setTheme] = useState<'cyberpunk' | 'synthesizerGold' | 'toxic' | 'deepSpace' | 'cleanSlate'>('cyberpunk');
  const [mounted, setMounted] = useState(false);

  // Inject theme CSS on mount
  useEffect(() => {
    setMounted(true);
    const styleId = 'sensorium-theme-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = THEME_AND_PULSE_CSS;
    document.documentElement.setAttribute('data-theme', theme);
    
    return () => {
      if (styleEl) styleEl.remove();
    };
  }, [theme]);

  // Show skeleton while loading
  if (!mounted) {
    return <AppSkeleton />;
  }

  return (
    <ErrorBoundary>
      <CriticalErrorBoundary>
        <div className="min-h-screen bg-[var(--theme-bg)] text-white font-sans" data-theme={theme}>
          {/* App content will be rendered here */}
          <AppContent theme={theme} setTheme={setTheme} />
        </div>
      </CriticalErrorBoundary>
    </ErrorBoundary>
  );
};

// Main content component - split from App.tsx for modularity
const AppContent: React.FC<{ 
  theme: string; 
  setTheme: React.Dispatch<React.SetStateAction<string>> 
}> = ({ theme, setTheme }) => {
  // This component will contain the main UI logic
  // Split into smaller feature components for maintainability
  
  const [activeTab, setActiveTab] = useState<'devices' | 'mapping' | 'diagnostics' | 'simulator' | 'logs' | 'hub' | 'recorder' | 'blueprint' | 'visualizer' | 'presskit' | 'aura' | 'topology' | 'quantum' | 'spatial' | 'arrangement' | 'snapshot' | 'remote' | 'acoustic' | 'stadium' | 'audit' | 'dashboard' | 'mindmap' | 'settings'>('devices');
  const [devices, setDevices] = useState<MidiDevice[]>(INITIAL_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<MidiDevice | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // ... State management moved here from original App.tsx
  
  // Add log helper
  const addLog = useCallback((source: string, level: SystemLog['level'], message: string) => {
    const log: SystemLog = {
      timestamp: new Date().toLocaleTimeString('de-DE', { hour12: false }),
      level,
      source,
      message,
    };
    setSystemLogs(prev => [log, ...prev.slice(0, 499)]);
  }, []);

  // Device selection handler
  const handleDeviceSelect = useCallback((device: MidiDevice) => {
    setSelectedDevice(device);
    addLog('UI', 'info', `[SELECT] Gerät gewählt: ${device.name}`);
  }, [addLog]);

  return (
    <>
      {/* Theme styles already injected by parent */}
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-panel border-b border-white/10 backdrop-blur-xl shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-full mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-magenta flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                <span className="text-black font-display font-black text-xs">S</span>
              </div>
              <div>
                <h1 className="font-display font-black text-lg md:text-xl text-white tracking-tighter">
                  SENSORIUM BRIDGE MATRIX
                </h1>
                <p className="font-mono text-[10px] text-neon-cyan/70 uppercase tracking-widest">
                  Native Instinct Quantum Engine
                </p>
              </div>
            </div>

            {/* Center: Connection Status */}
            <div className="hidden md:flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono uppercase tracking-wider ${
                isConnected 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-neon-red/10 border-neon-red/30 text-neon-red'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-neon-red'}`} />
                {isConnected ? 'LIVE VERBUNDEN' : 'OFFLINE'}
              </div>
            </div>

            {/* Right: Theme Selector & Actions */}
            <div className="flex items-center gap-2">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as typeof theme)}
                className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono appearance-none cursor-pointer hover:border-neon-cyan/30 transition"
                aria-label="Theme auswählen"
              >
                {THEME_PACKS.map(pack => (
                  <option key={pack.id} value={pack.id}>{pack.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 md:px-6 lg:px-8">
        <div className="max-w-full">
          {/* Tab Navigation */}
          <nav 
            className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide" 
            role="tablist"
            aria-label="Hauptnavigation"
          >
            {[
              { id: 'devices', label: 'Geräte', icon: '🎛️' },
              { id: 'mapping', label: 'MIDI Mapping', icon: '🔗' },
              { id: 'diagnostics', label: 'Diagnostik', icon: '📊' },
              { id: 'simulator', label: 'Simulator', icon: '🎮' },
              { id: 'logs', label: 'Logs', icon: '📋' },
              { id: 'hub', label: 'DAW Hub', icon: '🎚️' },
              { id: 'recorder', label: 'Recorder', icon: '🎙️' },
              { id: 'blueprint', label: 'Blueprint', icon: '📐' },
              { id: 'visualizer', label: 'Visualizer', icon: '🌈' },
              { id: 'presskit', label: 'Press Kit', icon: '📦' },
              { id: 'aura', label: 'AURA Coach', icon: '🧠' },
              { id: 'topology', label: 'Topologie', icon: '🕸️' },
              { id: 'quantum', label: 'Quanten', icon: '⚛️' },
              { id: 'spatial', label: 'Spatial 3D', icon: '🌌' },
              { id: 'arrangement', label: 'Arrangement', icon: '🎼' },
              { id: 'snapshot', label: 'Snapshots', icon: '📸' },
              { id: 'remote', label: 'Remote', icon: '📱' },
              { id: 'acoustic', label: 'Akustik', icon: '🎵' },
              { id: 'stadium', label: 'Stadium 5D', icon: '🏟️' },
              { id: 'audit', label: 'Audit', icon: '🛡️' },
              { id: 'dashboard', label: 'Dashboard', icon: '🎨' },
              { id: 'mindmap', label: 'Mindmap', icon: '🧩' },
              { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as typeof activeTab);
                  addLog('UI', 'info', `[TAB] Gewechselt zu: ${tab.label}`);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-[10px] uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'bg-black/40 border border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                }`}
                style={{ minWidth: '44px', minHeight: '44px' }} // Touch target minimum
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Panels */}
          <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'devices' && (
              <DeviceManagementPanel 
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
                setDevices={setDevices}
                addLog={addLog}
              />
            )}
            {activeTab === 'diagnostics' && (
              <DiagnosticsPanel devices={devices} selectedDevice={selectedDevice} />
            )}
            {activeTab === 'mapping' && (
              <LazyMidiMappingView 
                devices={devices} 
                selectedDevice={selectedDevice} 
                onDeviceSelect={handleDeviceSelect}
              />
            )}
            {activeTab === 'simulator' && (
              <LazySimulatorPanel devices={devices} />
            )}
            {activeTab === 'logs' && (
              <ActivityLoggerView logs={systemLogs} />
            )}
            {activeTab === 'hub' && (
              <LazyDAWProductionHub devices={devices} />
            )}
            {activeTab === 'recorder' && (
              <LazyMultiChannelRecorderView />
            )}
            {activeTab === 'blueprint' && (
              <LazyHardwareBlueprintView />
            )}
            {activeTab === 'visualizer' && (
              <LazyEnsembleVisualizer />
            )}
            {activeTab === 'presskit' && (
              <LazyPressKitView />
            )}
            {activeTab === 'aura' && (
              <LazyAuraStudioCoach />
            )}
            {activeTab === 'topology' && (
              <LazyUnifiedSystemTopologyMap />
            )}
            {activeTab === 'quantum' && (
              <LazyQuantumInstinctMatrix />
            )}
            {activeTab === 'spatial' && (
              <LazySpatial3DClusterView />
            )}
            {activeTab === 'arrangement' && (
              <LazyArrangementGeniusAI />
            )}
            {activeTab === 'snapshot' && (
              <LazySnapshotMorphSuite />
            )}
            {activeTab === 'remote' && (
              <LazyRemoteSyncPortal />
            )}
            {activeTab === 'acoustic' && (
              <LazyAudiophileAcousticLab />
            )}
            {activeTab === 'stadium' && (
              <LazySpatial5DStadiumEngine />
            )}
            {activeTab === 'audit' && (
              <LazyTripleAuditHardeningSuite />
            )}
            {activeTab === 'dashboard' && (
              <LazyCustomDashboardStudio />
            )}
            {activeTab === 'mindmap' && (
              <LazyMindmap />
            )}
            {activeTab === 'settings' && (
              <SettingsPanel theme={theme} setTheme={setTheme} />
            )}
          </div>
        </div>
      </main>
    </>
  );
};

// Feature Components (split from App.tsx)

const DeviceManagementPanel: React.FC<{
  devices: MidiDevice[];
  selectedDevice: MidiDevice | null;
  onDeviceSelect: (device: MidiDevice) => void;
  setDevices: React.Dispatch<React.SetStateAction<MidiDevice[]>>;
  addLog: (source: string, level: SystemLog['level'], message: string) => void;
}> = ({ devices, selectedDevice, onDeviceSelect, setDevices, addLog }) => {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center text-neon-red">Geräte-Panel Fehler</div>}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Device List */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display font-bold text-sm text-neon-cyan uppercase tracking-wider">
            Verbundene Geräte
          </h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {devices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                isSelected={selectedDevice?.id === device.id}
                onClick={() => onDeviceSelect(device)}
              />
            ))}
          </div>
        </div>

        {/* Device Detail */}
        <div className="lg:col-span-7">
          {selectedDevice ? (
            <DeviceDetailPanel device={selectedDevice} addLog={addLog} />
          ) : (
            <div className="h-[600px] flex items-center justify-center bg-black/30 border border-white/5 rounded-xl">
              <p className="text-gray-500 font-mono text-sm">Wähle ein Gerät für Details</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const DeviceCard: React.FC<{
  device: MidiDevice;
  isSelected: boolean;
  onClick: () => void;
}> = ({ device, isSelected, onClick }) => {
  const statusColors = {
    Healthy: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    Warning: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
    Critical: 'text-neon-red border-neon-red/30 bg-neon-red/10',
    Disconnected: 'text-gray-500 border-gray-500/30 bg-gray-500/10',
  };

  const statusClass = statusColors[device.status as keyof typeof statusColors] || statusColors.Disconnected;

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
        isSelected
          ? 'border-neon-cyan/50 bg-neon-cyan/5 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
          : 'border-white/5 hover:border-white/10 hover:bg-white/5'
      }`}
      style={{ minHeight: '44px' }} // Touch target minimum
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-sm text-white truncate">{device.name}</h3>
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase ${statusClass}`}>
              {device.status}
            </span>
          </div>
          <p className="font-mono text-[10px] text-gray-400 truncate">{device.type}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-gray-500">
            <span>Latenz: {device.latency}ms</span>
            <span>Drift: {device.clockDrift}ms</span>
            <span>Buffer: {device.bufferUsage}%</span>
          </div>
        </div>
        {device.firmwareUpdateAvailable && (
          <div className="flex flex-col items-end gap-1">
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono">
              Update: {device.latestFirmwareVersion}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};

const DeviceDetailPanel: React.FC<{
  device: MidiDevice;
  addLog: (source: string, level: SystemLog['level'], message: string) => void;
}> = ({ device, addLog }) => {
  return (
    <div className="space-y-4 h-[600px] overflow-y-auto">
      <div className="bg-black/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-display font-bold text-lg text-white mb-4">Geräte-Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <DetailRow label="Typ" value={device.type} />
            <DetailRow label="Verbindung" value={device.connectionType} />
            <DetailRow label="Eingang" value={device.portNameIn} />
            <DetailRow label="Ausgang" value={device.portNameOut} />
            <DetailRow label="MIDI Kanal" value={device.midiChannel.toString()} />
            <DetailRow label="Velocity Curve" value={device.velocityCurve} />
          </div>
          <div className="space-y-3">
            <DetailRow label="Latenz" value={`${device.latency} ms`} />
            <DetailRow label="Clock Drift" value={`${device.clockDrift} ms`} />
            <DetailRow label="Buffer Usage" value={`${device.bufferUsage}%`} />
            <DetailRow label="Drop Count" value={device.dropCount.toString()} />
            <DetailRow label="Polling Rate" value={`${device.pollingRate} Hz`} />
            <DetailRow label="Debounce" value={`${device.debounceMs} ms`} />
          </div>
        </div>
      </div>

      {device.firmwareUpdateAvailable && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <h4 className="font-display font-bold text-sm text-amber-400 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Firmware-Update verfügbar
          </h4>
          <p className="font-mono text-[11px] text-gray-300 mb-3">
            Aktuell: {device.firmwareVersion} → Neu: {device.latestFirmwareVersion}
          </p>
          <button
            className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-mono text-xs uppercase tracking-wider transition"
            onClick={() => addLog('FIRMWARE', 'info', `[UPDATE] Update gestartet für ${device.name}`)}
          >
            Update starten
          </button>
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
    <span className="font-mono text-[10px] text-white text-right max-w-[60%] truncate">{value}</span>
  </div>
);

const DiagnosticsPanel: React.FC<{ devices: MidiDevice[]; selectedDevice: MidiDevice | null }> = ({ devices, selectedDevice }) => {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-center text-neon-red">Diagnostik-Panel Fehler</div>}>
      <div className="space-y-6">
        <h2 className="font-display font-bold text-sm text-neon-cyan uppercase tracking-wider">
          System-Diagnostik
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <LazyDiagnosticCard key={device.id} device={device} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
};

const SettingsPanel: React.FC<{ theme: string; setTheme: React.Dispatch<React.SetStateAction<string>> }> = ({ theme, setTheme }) => {
  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-display font-bold text-sm text-neon-cyan uppercase tracking-wider">
        Einstellungen
      </h2>
      
      <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-6">
        <div>
          <label className="font-mono text-[10px] text-gray-400 uppercase tracking-wider block mb-2">
            Theme
          </label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as typeof theme)}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm font-mono appearance-none cursor-pointer hover:border-neon-cyan/30 transition"
          >
            {THEME_PACKS.map(pack => (
              <option key={pack.id} value={pack.id}>{pack.name}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="font-display font-bold text-sm text-neon-magenta uppercase tracking-wider mb-4">
            Performance
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-mono text-xs text-gray-300">Animationen reduzieren</span>
              <input type="checkbox" className="w-4 h-4 accent-neon-cyan" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-mono text-xs text-gray-300">Hardware-Beschleunigung</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-neon-cyan" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-mono text-xs text-gray-300">Auto-Refresh Diagnostik</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-neon-cyan" />
            </label>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <h3 className="font-display font-bold text-sm text-neon-magenta uppercase tracking-wider mb-4">
            Live Performance
          </h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-mono text-xs text-gray-300">Panic-Modus (große Buttons)</span>
              <input type="checkbox" className="w-4 h-4 accent-neon-red" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-mono text-xs text-gray-300">Touch-Optimierung (44px min)</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-neon-cyan" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-mono text-xs text-gray-300">Fehler-Grenzen aktiv</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-emerald-400" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lazy component imports (using dynamic imports with proper fallbacks)
const LazyMidiMappingView = React.lazy(() => import('./MidiMappingView').then(m => ({ default: m.MidiMappingView })));
const LazySimulatorPanel = React.lazy(() => import('./SimulatorPanel').then(m => ({ default: m.SimulatorPanel })));
const LazyDAWProductionHub = React.lazy(() => import('./DAWProductionHub').then(m => ({ default: m.DAWProductionHub })));
const LazyMultiChannelRecorderView = React.lazy(() => import('./MultiChannelRecorderView').then(m => ({ default: m.MultiChannelRecorderView })));
const LazyHardwareBlueprintView = React.lazy(() => import('./HardwareBlueprintView').then(m => ({ default: m.HardwareBlueprintView })));
const LazyEnsembleVisualizer = React.lazy(() => import('./EnsembleVisualizer').then(m => ({ default: m.EnsembleVisualizer })));
const LazyPressKitView = React.lazy(() => import('./PressKitView').then(m => ({ default: m.PressKitView })));
const LazyAuraStudioCoach = React.lazy(() => import('./AuraStudioCoach').then(m => ({ default: m.AuraStudioCoach })));
const LazyUnifiedSystemTopologyMap = React.lazy(() => import('./UnifiedSystemTopologyMap').then(m => ({ default: m.UnifiedSystemTopologyMap })));
const LazyQuantumInstinctMatrix = React.lazy(() => import('./QuantumInstinctMatrix').then(m => ({ default: m.QuantumInstinctMatrix })));
const LazySpatial3DClusterView = React.lazy(() => import('./Spatial3DClusterView').then(m => ({ default: m.Spatial3DClusterView })));
const LazyArrangementGeniusAI = React.lazy(() => import('./ArrangementGeniusAI').then(m => ({ default: m.ArrangementGeniusAI })));
const LazySnapshotMorphSuite = React.lazy(() => import('./SnapshotMorphSuite').then(m => ({ default: m.SnapshotMorphSuite })));
const LazyRemoteSyncPortal = React.lazy(() => import('./RemoteSyncPortal').then(m => ({ default: m.RemoteSyncPortal })));
const LazyAudiophileAcousticLab = React.lazy(() => import('./AudiophileAcousticLab').then(m => ({ default: m.AudiophileAcousticLab })));
const LazySpatial5DStadiumEngine = React.lazy(() => import('./Spatial5DStadiumEngine').then(m => ({ default: m.Spatial5DStadiumEngine })));
const LazyTripleAuditHardeningSuite = React.lazy(() => import('./TripleAuditHardeningSuite').then(m => ({ default: m.TripleAuditHardeningSuite })));
const LazyCustomDashboardStudio = React.lazy(() => import('./CustomDashboardStudio').then(m => ({ default: m.CustomDashboardStudio })));
const LazyMindmap = React.lazy(() => import('./Mindmap').then(m => ({ default: m.Mindmap })));

// Skeleton component for Suspense fallback
const AppSkeletonFallback = () => (
  <div className="h-[600px] flex items-center justify-center bg-black/30 border border-white/5 rounded-xl">
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <div className="w-8 h-8 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
      <span className="font-mono text-xs">Lädt Komponente...</span>
    </div>
  </div>
);

const ActivityLoggerView = React.lazy(() => import('./ActivityLoggerView').then(m => ({ default: m.ActivityLoggerView })));
const LazyDiagnosticCard = React.lazy(() => import('./DiagnosticCard').then(m => ({ default: m.DiagnosticCard })));

// Main export
export default SensoriumApp;