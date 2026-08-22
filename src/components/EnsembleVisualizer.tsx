import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Smartphone, 
  Network, 
  Wifi, 
  Usb, 
  Activity, 
  Cpu, 
  Sliders, 
  Database, 
  Save, 
  Binary, 
  FileCheck, 
  ArrowRightLeft, 
  Infinity as InfinityIcon, 
  FileCode, 
  RefreshCw, 
  Zap, 
  Server, 
  CheckCircle, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface EnsembleVisualizerProps {
  activeTab: 'mindmap' | 'diagnostics' | 'midimapping' | 'triggerusb' | 'activitylogger' | 'multirecord' | 'trxblueprint' | 'code' | 'export' | 'presskit' | 'customdashboard' | 'spatial3d' | 'spatial5d' | 'tripleaudit' | 'arrgenius' | 'snapshotmorph' | 'remoteportal' | 'acousticlab';
  displayMode: 'smartest_focus' | 'standard' | 'nerdy' | 'custom';
  customSettings?: {
    glowStrength: number;
    simulationSpeed: number;
    jitterFactor: number;
    noiseLevel: number;
    audioFeedback: boolean;
  };
  onUpdateCustomSetting?: (key: string, val: any) => void;
}

export default function EnsembleVisualizer({ 
  activeTab, 
  displayMode,
  customSettings = { glowStrength: 80, simulationSpeed: 50, jitterFactor: 20, noiseLevel: 10, audioFeedback: false },
  onUpdateCustomSetting
}: EnsembleVisualizerProps) {
  const [pulseOffset, setPulseOffset] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [latencyInjected, setLatencyInjected] = useState(false);
  const [jitterTriggered, setJitterTriggered] = useState(false);

  // Speed of animation depends on display mode and custom settings
  const speedFactor = displayMode === 'custom' 
    ? (customSettings.simulationSpeed / 50) 
    : displayMode === 'nerdy' ? 1.5 : displayMode === 'smartest_focus' ? 0.6 : 1.0;

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseOffset((prev) => (prev + (2 * speedFactor)) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, [speedFactor]);

  // Tab details for explanation
  const getTabLabel = () => {
    switch (activeTab) {
      case 'mindmap': return 'Signal-Matrix (Mindmap) Fluss';
      case 'diagnostics': return 'Midi-Cockpit & Windows Kernel Diagnose';
      case 'midimapping': return 'Physikalische Controller-Zuweisung';
      case 'triggerusb': return 'Huawei P30 Pro USB/Wi-Fi Koppelungs-Brücke';
      case 'activitylogger': return 'MIDI-Event Stream & Hex Logger';
      case 'multirecord': return 'Multi-Kanal MIDI Bandaufnahme';
      case 'trxblueprint': return 'TR-X Phasenstarre Loopback Schleife';
      case 'code': return 'Sandbox Code-Kompilierung & Schema';
      case 'export': return 'Tauri C++ Native Windows / APK Builder';
      default: return 'Gesamt-Ensemble';
    }
  };

  const getThemeColor = () => {
    switch (activeTab) {
      case 'midimapping':
      case 'trxblueprint':
        return 'text-neon-magenta border-neon-magenta/30 shadow-neon-magenta/10';
      case 'activitylogger':
        return 'text-neon-green border-neon-green/30 shadow-neon-green/10';
      case 'triggerusb':
        return 'text-neon-cyan border-neon-cyan/30 shadow-neon-cyan/10';
      default:
        return 'text-neon-cyan border-neon-cyan/30 shadow-neon-cyan/10';
    }
  };

  const getGlowStyle = (color: 'cyan' | 'magenta' | 'green' | 'yellow') => {
    const strength = displayMode === 'custom' ? (customSettings.glowStrength / 100) : 1.0;
    const baseGlows = {
      cyan: `0 0 ${12 * strength}px rgba(0, 240, 255, 0.4)`,
      magenta: `0 0 ${12 * strength}px rgba(255, 0, 127, 0.4)`,
      green: `0 0 ${12 * strength}px rgba(16, 185, 129, 0.4)`,
      yellow: `0 0 ${12 * strength}px rgba(245, 158, 11, 0.4)`,
    };
    return { boxShadow: baseGlows[color] };
  };

  return (
    <div className={`w-full rounded-2xl border p-5 bg-black/60 backdrop-blur-xl transition-all duration-300 relative overflow-hidden ${getThemeColor()} shadow-lg`}>
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none" />

      {/* Header bar of visualizer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-neon-cyan animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              Aufbauensemble-Visualisierung
              <span className="text-[10px] text-gray-400 font-mono font-medium lowercase">({getTabLabel()})</span>
            </h3>
            <p className="text-[9px] font-mono text-gray-500 uppercase">
              Aktiver Modus: <span className="text-neon-cyan font-bold">{displayMode}</span> • Jitter: {latencyInjected ? '38ms (Simuliert)' : '0.8ms'}
            </p>
          </div>
        </div>

        {/* Interactive simulation controls for 'custom' mode */}
        {displayMode === 'custom' && (
          <div className="flex items-center gap-3 bg-black/50 px-3 py-1.5 rounded-lg border border-white/5 font-mono text-[9px]">
            <span className="text-neon-cyan font-bold uppercase tracking-wider">Custom Controls:</span>
            <button 
              onClick={() => {
                setLatencyInjected(!latencyInjected);
                if (onUpdateCustomSetting) onUpdateCustomSetting('jitterFactor', !latencyInjected ? 80 : 20);
              }}
              className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase transition ${
                latencyInjected 
                  ? 'bg-neon-yellow border-neon-yellow text-black' 
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/25'
              }`}
            >
              ⚡ Latenz injizieren
            </button>
            <button 
              onClick={() => {
                setJitterTriggered(!jitterTriggered);
                if (onUpdateCustomSetting) onUpdateCustomSetting('noiseLevel', !jitterTriggered ? 75 : 10);
              }}
              className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase transition ${
                jitterTriggered 
                  ? 'bg-neon-red border-neon-red text-white' 
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/25'
              }`}
            >
              ⚠️ Jitter einbringen
            </button>
          </div>
        )}
      </div>

      {/* Primary SVG / HTML Layout of the Assembly Ensemble */}
      <div className="w-full relative min-h-[160px] md:min-h-[180px] bg-black/40 rounded-xl border border-white/5 p-4 flex flex-col justify-center items-center z-10 overflow-x-auto">
        
        {/* Render different graphics dynamically based on active tab */}
        {activeTab === 'mindmap' && (
          <div className="w-full max-w-2xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12 py-3">
            {/* Device 1: Mobile */}
            <div 
              onMouseEnter={() => setHoveredNode('phone')}
              onMouseLeave={() => setHoveredNode(null)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div 
                className={`p-3 rounded-2xl bg-zinc-950 border transition-all duration-300 relative ${
                  hoveredNode === 'phone' ? 'border-neon-cyan scale-105' : 'border-white/10'
                }`}
                style={hoveredNode === 'phone' ? getGlowStyle('cyan') : {}}
              >
                <Smartphone className="w-6 h-6 text-neon-cyan" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-neon-green animate-ping" />
              </div>
              <span className="font-mono text-[9px] font-bold text-gray-300 uppercase">Huawei P30 Pro</span>
              <span className="font-mono text-[8px] text-gray-500 uppercase">UDP Client</span>
            </div>

            {/* Connection path: UDP Wi-Fi */}
            <div className="flex-grow flex flex-col items-center justify-center min-w-[80px] relative py-2 md:py-0 w-full md:w-auto">
              <span className="font-mono text-[8px] text-neon-cyan font-bold uppercase mb-1.5 animate-pulse flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" /> UDP Port 5125
              </span>
              <div className="h-[2px] bg-white/5 w-full relative rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 bottom-0 w-3 bg-gradient-to-r from-transparent via-neon-cyan to-transparent rounded"
                  style={{ left: `${pulseOffset}%` }}
                />
              </div>
              <span className="font-mono text-[8px] text-gray-500 mt-1">Latenz: ~1.2ms</span>
            </div>

            {/* Device 2: PC Windows (Host) */}
            <div 
              onMouseEnter={() => setHoveredNode('pc')}
              onMouseLeave={() => setHoveredNode(null)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div 
                className={`p-3 rounded-2xl bg-zinc-950 border transition-all duration-300 relative ${
                  hoveredNode === 'pc' ? 'border-neon-magenta scale-105' : 'border-white/10'
                }`}
                style={hoveredNode === 'pc' ? getGlowStyle('magenta') : {}}
              >
                <Laptop className="w-6 h-6 text-neon-magenta" />
                <div className="absolute -bottom-1 -right-1 px-1 rounded bg-neon-cyan text-[7px] text-black font-extrabold">HUB</div>
              </div>
              <span className="font-mono text-[9px] font-bold text-gray-300 uppercase">Tauri Host PC</span>
              <span className="font-mono text-[8px] text-gray-500 uppercase">MIDI Diagnostician</span>
            </div>

            {/* Connection path: CoreMIDI USB Loopback */}
            <div className="flex-grow flex flex-col items-center justify-center min-w-[80px] relative py-2 md:py-0 w-full md:w-auto">
              <span className="font-mono text-[8px] text-neon-magenta font-bold uppercase mb-1.5 animate-pulse flex items-center gap-1">
                <Usb className="w-2.5 h-2.5" /> Virtual MIDI Bus
              </span>
              <div className="h-[2px] bg-white/5 w-full relative rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 bottom-0 w-3 bg-gradient-to-r from-transparent via-neon-magenta to-transparent rounded"
                  style={{ left: `${100 - pulseOffset}%` }}
                />
              </div>
              <span className="font-mono text-[8px] text-gray-500 mt-1">Jitter Shield: Aktiv</span>
            </div>

            {/* Device 3: Ableton Live */}
            <div 
              onMouseEnter={() => setHoveredNode('ableton')}
              onMouseLeave={() => setHoveredNode(null)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div 
                className={`p-3 rounded-2xl bg-zinc-950 border transition-all duration-300 relative ${
                  hoveredNode === 'ableton' ? 'border-neon-green scale-105' : 'border-white/10'
                }`}
                style={hoveredNode === 'ableton' ? getGlowStyle('green') : {}}
              >
                <Server className="w-6 h-6 text-neon-green" />
              </div>
              <span className="font-mono text-[9px] font-bold text-gray-300 uppercase">Ableton Live 12</span>
              <span className="font-mono text-[8px] text-gray-500 uppercase">DAW Target</span>
            </div>
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <div className="w-full max-w-xl flex flex-col items-center gap-4 py-2">
            <div className="flex items-center gap-10">
              <div className="flex flex-col items-center">
                <Cpu className="w-8 h-8 text-neon-cyan mb-1 animate-pulse" />
                <span className="font-mono text-[8px] text-gray-400">Windows MIDI Kernel</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <ArrowRightLeft className="w-5 h-5 text-neon-magenta animate-bounce" />
                <span className="font-mono text-[7px] text-neon-green bg-neon-green/10 px-1 py-0.5 rounded font-bold mt-1 uppercase">Latency Shield</span>
              </div>
              <div className="flex flex-col items-center">
                <Server className="w-8 h-8 text-neon-magenta mb-1" />
                <span className="font-mono text-[8px] text-gray-400">Sensorium Diagnostics Engine</span>
              </div>
            </div>
            
            {/* Realtime clock diagnostic bridge graphic */}
            <div className="w-full bg-black/60 p-2.5 rounded-xl border border-white/5 font-mono text-[9px] space-y-1.5 text-left text-gray-300">
              <div className="flex items-center justify-between text-gray-400 border-b border-white/5 pb-1 text-[8px]">
                <span>DIAGNOSTIK-PARAMETER</span>
                <span>STATUS: PRÄZISE</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Clock-Drift:</span> <span className="text-neon-cyan font-bold">{latencyInjected ? '±3.1 ms' : '±0.04 ms'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Baudrate Link:</span> <span className="text-neon-green font-bold">31250 bps</span></div>
                <div className="flex justify-between"><span className="text-gray-500">USB-Polling:</span> <span className="text-neon-cyan font-bold">1000 Hz</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Buffer Usage:</span> <span className="text-neon-magenta font-bold">12% / 1024 Bytes</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'midimapping' && (
          <div className="w-full max-w-xl flex flex-col items-center py-2 gap-4">
            <div className="flex items-center justify-between w-full border border-white/5 bg-black/30 p-3 rounded-xl">
              <div className="flex flex-col items-center gap-1">
                <Sliders className="w-6 h-6 text-neon-magenta" />
                <span className="font-mono text-[8px] text-gray-400">Hardware Controller</span>
              </div>

              <div className="flex-grow flex flex-col items-center justify-center px-4">
                <div className="text-[8px] font-mono text-neon-magenta font-bold uppercase tracking-wider mb-1">
                  Mappe CC #74 --&gt; Synth Cutoff
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full relative overflow-hidden">
                  <div 
                    className="absolute top-0 bottom-0 w-4 bg-neon-magenta rounded shadow-[0_0_8px_rgba(255,0,127,0.8)]"
                    style={{ left: `${(pulseOffset * 0.8) + 10}%` }}
                  />
                </div>
                <span className="text-[7px] font-mono text-gray-500 mt-1">Übertragung aktiv: 127 Byte Puffer</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <Cpu className="w-6 h-6 text-neon-cyan" />
                <span className="font-mono text-[8px] text-gray-400">Ableton CC Map</span>
              </div>
            </div>
            
            <div className="flex gap-2 w-full">
              <div className="flex-1 bg-black/50 p-2 rounded border border-white/5 text-left font-mono text-[8px] text-gray-400">
                <span className="text-neon-cyan font-bold block uppercase mb-1">PORT-DIAGRAMM</span>
                <div>Eingang: Virtual Keyboard MIDI (CH 1)</div>
                <div>Ausgang: Ableton Track 1 (Synth Control)</div>
              </div>
              <div className="flex-1 bg-black/50 p-2 rounded border border-white/5 text-left font-mono text-[8px] text-gray-400">
                <span className="text-neon-magenta font-bold block uppercase mb-1">FILTER STATUS</span>
                <div>Dämpfung: Aus</div>
                <div>Jitter-Kompensation: 4ms geglättet</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'triggerusb' && (
          <div className="w-full max-w-xl flex flex-col items-center py-2 gap-4">
            {/* Visualizing Huawei P30 Pro specific setup */}
            <div className="flex items-center gap-6 w-full justify-between border border-neon-cyan/20 bg-neon-cyan/5 p-4 rounded-xl relative overflow-hidden">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[8px] font-mono text-neon-cyan font-bold uppercase bg-neon-cyan/15 px-1.5 py-0.5 rounded">
                  HUAWEI P30 PRO EMUI 12
                </span>
                <span className="text-[11px] font-bold text-white flex items-center gap-1">
                  <Smartphone className="w-4 h-4 text-neon-cyan" /> Mobile Companion App
                </span>
                <span className="text-[8px] font-mono text-gray-400">AppGuard: Deaktiviert</span>
              </div>

              {/* Animated lightning / USB connection symbol */}
              <div className="flex-grow flex flex-col items-center px-3">
                <div className="flex items-center gap-1 text-[9px] font-mono text-neon-green font-bold uppercase animate-pulse">
                  <Usb className="w-3.5 h-3.5" /> USB Debugging (ADB Bridge)
                </div>
                <div className="w-full h-[1px] bg-neon-cyan/20 my-1.5 relative">
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
                </div>
                <span className="text-[8px] font-mono text-gray-400">USB-Kabel: Angeschlossen</span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] font-mono text-neon-magenta font-bold uppercase bg-neon-magenta/15 px-1.5 py-0.5 rounded">
                  STUDIO COMPILER
                </span>
                <span className="text-[11px] font-bold text-white flex items-center gap-1">
                  <Laptop className="w-4 h-4 text-neon-magenta" /> Host Machine (Port 3000)
                </span>
                <span className="text-[8px] font-mono text-gray-400">OS: Win 11 Pro MIDI v2</span>
              </div>
            </div>

            <div className="w-full text-left font-mono text-[8.5px] text-gray-400 leading-relaxed bg-black/60 p-3 rounded-lg border border-white/5">
              <span className="text-neon-cyan font-bold uppercase block mb-1">
                ⚡ VERKABELUNGSRICHTLINIEN FÜR FEHLERFREIES SIGNAL:
              </span>
              • Nutze das originale Huawei SuperCharge Typ-C Kabel am USB-3.0 Port deines PCs.<br />
              • Die ADB-Schnittstelle tunnelt MIDI-Datenströme direkt als Raw-Byte-Pakete über TCP.<br />
              • EMUI AppGuard blockiert Offline-APKs – daher der PWA- oder BAT-Weg als 1-Klick-Setup.
            </div>
          </div>
        )}

        {activeTab === 'activitylogger' && (
          <div className="w-full max-w-xl flex flex-col items-center py-2 gap-4">
            <div className="w-full grid grid-cols-3 gap-2">
              <div className="p-3 bg-black/50 border border-white/5 rounded-xl flex flex-col items-center">
                <Activity className="w-5 h-5 text-neon-green mb-1 animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-gray-300">MIDI Event Bus</span>
                <span className="text-[7.5px] font-mono text-gray-500">240 Events/Sek</span>
              </div>
              <div className="p-3 bg-black/50 border border-white/5 rounded-xl flex flex-col items-center">
                <Database className="w-5 h-5 text-neon-cyan mb-1" />
                <span className="text-[9px] font-mono font-bold text-gray-300">Parser Buffer</span>
                <span className="text-[7.5px] font-mono text-gray-500">Raw Hex Array</span>
              </div>
              <div className="p-3 bg-black/50 border border-white/5 rounded-xl flex flex-col items-center">
                <Save className="w-5 h-5 text-neon-magenta mb-1" />
                <span className="text-[9px] font-mono font-bold text-gray-300">Storage Output</span>
                <span className="text-[7.5px] font-mono text-gray-500">.MID / .TXT Files</span>
              </div>
            </div>

            {/* Simulated Live Stream flow */}
            <div className="w-full bg-black/80 rounded-lg p-3 border border-white/5 text-left font-mono text-[8px] text-gray-400 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 font-bold text-neon-green text-[7px] bg-neon-green/10 rounded">LIVE STREAM</div>
              <div className="text-gray-500">TIMESTAMP | ID | EVENT TYPE | HEX PAYLOAD | VALUE</div>
              <div className="text-gray-200 mt-1">
                [15:52:01.004] | Port1 | NoteOn  | <span className="text-neon-cyan">90 3C 64</span> | C3 Velocity 100
              </div>
              <div className="text-gray-300">
                [15:52:01.085] | Port1 | NoteOff | <span className="text-neon-cyan">80 3C 00</span> | C3 Release
              </div>
              <div className="text-neon-green font-bold">
                [15:52:01.120] | Port1 | CC      | <span className="text-neon-magenta">B0 4A 2A</span> | CC74 (Cutoff) value 42
              </div>
            </div>
          </div>
        )}

        {activeTab === 'multirecord' && (
          <div className="w-full max-w-xl flex flex-col items-center py-2 gap-4">
            <div className="w-full border border-white/5 bg-black/30 p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[7px] text-neon-red font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-red animate-ping" /> MULTI-TRACK RECORDING
                </span>
                <span className="text-xs font-bold text-white">Input Hub Routing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/10 rounded font-mono text-[8px] text-gray-300">Track 1 (Ch1)</span>
                <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/10 rounded font-mono text-[8px] text-gray-300">Track 2 (Ch10)</span>
                <span className="px-1.5 py-0.5 bg-zinc-900 border border-white/10 rounded font-mono text-[8px] text-gray-300">Track 3 (Ch16)</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 text-left font-mono text-[8px] text-gray-400">
              <div className="p-2.5 rounded bg-black/50 border border-white/5">
                <span className="text-neon-cyan font-bold block mb-1">RECORDING THREADS</span>
                <div>• Thread 01 (Virtual Keyboard): Speichert in RAM Buffer</div>
                <div>• Thread 02 (Drum Pad): Warte auf MIDI Clock Trigger</div>
              </div>
              <div className="p-2.5 rounded bg-black/50 border border-white/5">
                <span className="text-neon-magenta font-bold block mb-1">FILE PERSISTENCE</span>
                <div>Format: Standard MIDI File (SMF Format 1)</div>
                <div>Lese-Verzögerung: 0ms (Direkter I/O Puffer)</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trxblueprint' && (
          <div className="w-full max-w-xl flex flex-col items-center py-2 gap-4">
            {/* Phasenstarre Schleife */}
            <div className="flex items-center gap-4 border border-neon-magenta/20 bg-neon-magenta/5 p-4 rounded-xl w-full justify-between">
              <div className="flex flex-col items-start">
                <span className="text-neon-magenta font-mono text-[8px] font-bold block uppercase">TR-X SCHLEIFE OUT</span>
                <span className="font-bold text-white flex items-center gap-1 text-[11px]">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-neon-magenta" /> MIDI Ausgangs-Port
                </span>
                <span className="text-[7.5px] font-mono text-gray-500">Sende Phase Alignment Tick</span>
              </div>

              {/* Loop icon with rotation animation */}
              <div className="flex flex-col items-center px-4 shrink-0">
                <div className="relative p-2 rounded-full border border-neon-magenta/20 bg-black">
                  <InfinityIcon className="w-7 h-7 text-neon-magenta animate-pulse" />
                  <span className="absolute -inset-1 rounded-full border border-dashed border-neon-cyan animate-spin opacity-50" />
                </div>
                <span className="text-[8px] font-mono text-neon-cyan font-bold mt-1 uppercase animate-pulse">
                  PHASENKORREKTUR: 100% aktiv
                </span>
              </div>

              <div className="flex flex-col items-end text-right">
                <span className="text-neon-magenta font-mono text-[8px] font-bold block uppercase">TR-X SCHLEIFE IN</span>
                <span className="font-bold text-white flex items-center gap-1 text-[11px] justify-end">
                  MIDI Eingangs-Port <ArrowRightLeft className="w-3.5 h-3.5 text-neon-magenta" />
                </span>
                <span className="text-[7.5px] font-mono text-gray-500">Messe Schleifenlatenz</span>
              </div>
            </div>

            <div className="w-full bg-black/60 p-2.5 rounded-lg border border-white/5 font-mono text-[8px] text-gray-400 text-left">
              <span className="text-neon-cyan font-bold block mb-1">LOOPBACK DIAGNOSTIK:</span>
              Mithilfe der TR-X Hardware-Loopback Schleife misst und korrigiert die Sensorium Engine automatisch die Signallaufzeit der angeschlossenen USB-Geräte. Hierdurch wird Jitter in Ableton Live vollständig eliminiert.
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="w-full max-w-xl flex flex-col items-center py-2 gap-4">
            <div className="w-full border border-white/5 bg-black/30 p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-6 h-6 text-neon-cyan" />
                <div className="text-left">
                  <div className="text-[10px] font-bold text-white uppercase tracking-wider">React &amp; TS Codebase</div>
                  <div className="text-[8px] font-mono text-gray-500">6,659 Zeilen • Modularer Aufbau</div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-black/60 border border-white/5 px-2 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-[8px] font-mono text-neon-green font-bold">LINTER READY</span>
              </div>
            </div>
            
            <div className="w-full bg-zinc-950 p-2.5 rounded border border-white/5 text-left font-mono text-[7.5px] text-gray-400">
              <span className="text-neon-cyan font-bold block mb-1">MODUL-DIAGRAMM:</span>
              src/App.tsx (Main Coordinator) --&gt; src/components/EnsembleVisualizer.tsx (This Visualizer)<br />
              src/components/SetupGuide.tsx (Wizard) --&gt; src/components/TriggerUsbView.tsx (USB Mapping)<br />
              src/components/Mindmap.tsx (D3 Network Matrix) --&gt; src/components/ActivityLoggerView.tsx
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="w-full max-w-xl flex flex-col items-center py-2 gap-4">
            <div className="w-full grid grid-cols-2 gap-3">
              <div className="p-3 bg-black/50 border border-white/5 rounded-xl text-left font-mono">
                <span className="text-neon-cyan font-bold block text-[9px] mb-1">WIN 11 EXECUTABLE (.EXE)</span>
                <p className="text-[8px] text-gray-400">Tauri Compiler verpackt Web-Engine mit nativem C++ Windows-MIDI Core.</p>
              </div>
              <div className="p-3 bg-black/50 border border-white/5 rounded-xl text-left font-mono">
                <span className="text-neon-magenta font-bold block text-[9px] mb-1">ANDROID COMPANION (.APK)</span>
                <p className="text-[8px] text-gray-400">PWA-Zellwand mit USB/WiFi-Schnittstelle. Huawei EMUI-optimiert.</p>
              </div>
            </div>

            <div className="w-full bg-black/60 p-2.5 rounded-lg border border-white/5 flex items-center justify-between font-mono text-[8px] text-gray-400">
              <span>RUST-COMPILER PIPELINE STATE:</span>
              <span className="text-neon-green font-bold animate-pulse flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-neon-green" /> BEREIT ZUM EXPORT (0 Fehler)
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Mode-specific explanations/detailed metrics bottom row */}
      {displayMode === 'nerdy' && (
        <div className="mt-3.5 border-t border-white/5 pt-3.5 relative z-10">
          <div className="p-3 rounded-xl bg-zinc-950 border border-neon-cyan/15 font-mono text-[8px] text-gray-400 space-y-1.5 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 px-1.5 py-0.5 rounded-bl bg-neon-cyan/20 text-neon-cyan font-bold uppercase tracking-widest text-[7px]">
              NERDY TELEMETRY OVERLAY
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-white font-bold uppercase block text-[8px] border-b border-white/5 pb-0.5 mb-1 text-neon-cyan">
                  ⚡ Interrupts &amp; Timings
                </span>
                <div>IRQ Priority: Realtime-Class 15</div>
                <div>Timer Resolution: 0.500 ms</div>
                <div>Thread Affinity: Core 0 (Locked)</div>
              </div>
              <div>
                <span className="text-white font-bold uppercase block text-[8px] border-b border-white/5 pb-0.5 mb-1 text-neon-magenta">
                  📥 Packet Buffers
                </span>
                <div>Queue Size: 256 messages</div>
                <div>Parser Rate: 16-bit FastPath</div>
                <div>Protocol: MIDI 2.0 Direct UMP</div>
              </div>
              <div>
                <span className="text-white font-bold uppercase block text-[8px] border-b border-white/5 pb-0.5 mb-1 text-neon-green">
                  📶 Wi-Fi TCP/UDP Tunnel
                </span>
                <div>MTU Size: 1460 bytes</div>
                <div>Socket Keep-Alive: 5000ms</div>
                <div>Multicast IGMP v3: Active</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {displayMode === 'smartest_focus' && (
        <div className="mt-3 relative z-10">
          <div className="p-2.5 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20 text-left">
            <p className="text-[10px] font-sans text-gray-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block animate-ping" />
              <strong className="text-neon-cyan">Fokus-Tipp:</strong> Dein System läuft stabil. Keine kritischen Latenz-Ausreißer festgestellt. Du kannst dich voll auf die Performance in Ableton Live konzentrieren.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
