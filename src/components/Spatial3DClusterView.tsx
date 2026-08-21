import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Layers,
  RotateCw,
  Eye,
  Maximize2,
  Sparkles,
  Zap,
  Activity,
  Sliders,
  Compass,
  Radio,
  Flame
} from 'lucide-react';
import { MidiDevice } from '../types';

interface Spatial3DClusterViewProps {
  devices: MidiDevice[];
  activeDevice: MidiDevice | null;
  onSelectDevice: (device: MidiDevice) => void;
  bpm: number;
  isPlaying: boolean;
  addLog: (category: 'MIDI' | 'SYSTEM' | 'ABLETON' | 'OSC', level: 'info' | 'warn' | 'error' | 'success', message: string) => void;
}

export default function Spatial3DClusterView({
  devices,
  activeDevice,
  onSelectDevice,
  bpm,
  isPlaying,
  addLog
}: Spatial3DClusterViewProps) {
  const [rotationAngle, setRotationAngle] = useState<number>(25);
  const [tiltAngle, setTiltAngle] = useState<number>(55);
  const [zoom, setZoom] = useState<number>(1);
  const [viewPreset, setViewPreset] = useState<'3d-rack' | 'orbit' | 'stage-front' | 'signal-cube'>('3d-rack');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<string>('all');

  // Auto-rotation effect for 3D depth feeling
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.4) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Handle Preset View Mode Switches
  const handleSetPreset = (preset: '3d-rack' | 'orbit' | 'stage-front' | 'signal-cube') => {
    setViewPreset(preset);
    if (preset === '3d-rack') {
      setTiltAngle(60);
      setRotationAngle(20);
      setIsAutoRotating(false);
    } else if (preset === 'orbit') {
      setTiltAngle(45);
      setIsAutoRotating(true);
    } else if (preset === 'stage-front') {
      setTiltAngle(15);
      setRotationAngle(0);
      setIsAutoRotating(false);
    } else if (preset === 'signal-cube') {
      setTiltAngle(70);
      setRotationAngle(45);
      setIsAutoRotating(false);
    }
    addLog('SYSTEM', 'info', `🌐 [SPATIAL 3D] Ansichtsmodus gewechselt: ${preset.toUpperCase()}`);
  };

  // Group devices into 3D Spatial Racks/Zones
  const getZoneForDevice = (device: MidiDevice, index: number) => {
    if (device.isPhysicalHardware) return 'Rack A (Analogue Core)';
    if (index % 3 === 0) return 'Rack B (Digital Synths)';
    if (index % 3 === 1) return 'Rack C (Peripherals & FX)';
    return 'Rack D (Ableton VSTs)';
  };

  const zones = ['all', 'Rack A (Analogue Core)', 'Rack B (Digital Synths)', 'Rack C (Peripherals & FX)', 'Rack D (Ableton VSTs)'];

  const filteredDevices = devices.filter((d, i) => selectedZone === 'all' || getZoneForDevice(d, i) === selectedZone);

  return (
    <div className="w-full bg-gradient-to-b from-[#060812] via-[#090d1f] to-[#05060d] border border-neon-cyan/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,240,255,0.15)] relative overflow-hidden text-left my-6">
      
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-neon-cyan/20 via-indigo-500/20 to-neon-magenta/20 border border-neon-cyan/40 text-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Box className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
              NEURAL SPATIAL 3D TOPOLOGY CLUSTER
              <span className="px-2 py-0.5 rounded-full bg-neon-cyan text-black font-mono text-[10px] font-bold">
                PROXIMITY 3D
              </span>
            </h2>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              Räumliche 3D-Racks, Signal-Tiefenstaffelung &amp; Heatmaps für {devices.length} physische &amp; virtuelle Hardware-Knoten.
            </p>
          </div>
        </div>

        {/* 3D View Presets & Orbit Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 gap-1">
            {(['3d-rack', 'orbit', 'stage-front', 'signal-cube'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleSetPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition ${
                  viewPreset === preset
                    ? 'bg-neon-cyan text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {preset === '3d-rack' && '3D Rack'}
                {preset === 'orbit' && 'Orbit Rotation'}
                {preset === 'stage-front' && 'Bühnen-Front'}
                {preset === 'signal-cube' && 'Signal Würfel'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-2 rounded-xl border font-mono text-xs font-bold transition flex items-center gap-1.5 ${
              isAutoRotating
                ? 'bg-neon-magenta/20 text-neon-magenta border-neon-magenta/40 shadow-[0_0_12px_rgba(255,0,127,0.3)]'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
            title="Auto 3D Orbit Rotation umstellen"
          >
            <RotateCw className={`w-4 h-4 ${isAutoRotating ? 'animate-spin' : ''}`} />
            {isAutoRotating ? 'Orbit Aktiv' : 'Orbit Pausiert'}
          </button>
        </div>
      </div>

      {/* Rack Zone Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 relative z-10 text-xs font-mono">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-gray-400 font-bold uppercase text-[10px]">Zone:</span>
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition whitespace-nowrap ${
                selectedZone === zone
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow'
                  : 'bg-black/40 text-gray-400 border-white/10 hover:text-white'
              }`}
            >
              {zone === 'all' ? `Alle (${devices.length})` : zone}
            </button>
          ))}
        </div>

        {/* Spatial Angle Sliders */}
        <div className="flex items-center gap-4 text-[10px] text-gray-400 font-mono">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span>Neigung ({tiltAngle}°):</span>
            <input
              type="range"
              min="0"
              max="85"
              value={tiltAngle}
              onChange={(e) => setTiltAngle(Number(e.target.value))}
              className="w-20 accent-neon-cyan cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span>Rotation ({Math.round(rotationAngle)}°):</span>
            <input
              type="range"
              min="0"
              max="360"
              value={rotationAngle}
              onChange={(e) => setRotationAngle(Number(e.target.value))}
              className="w-20 accent-neon-magenta cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 3D Spatial Interactive Canvas Stage */}
      <div className="relative w-full h-[480px] md:h-[540px] bg-[#030408] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
        
        {/* Background 3D Perspective Grid Plane */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-100 ease-out flex items-center justify-center"
          style={{
            transform: `perspective(1000px) rotateX(${tiltAngle}deg) rotateZ(${rotationAngle}deg) scale(${zoom})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Spatial Grid Floor */}
          <div className="w-[1200px] h-[1200px] border border-neon-cyan/20 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.08)_0%,transparent_70%)] relative flex items-center justify-center">
            
            {/* Concentric Signal Rings */}
            <div className="absolute w-[900px] h-[900px] border border-white/10 rounded-full animate-ping opacity-20" />
            <div className="absolute w-[600px] h-[600px] border border-neon-cyan/30 rounded-full border-dashed" />
            <div className="absolute w-[300px] h-[300px] border border-neon-magenta/30 rounded-full" />
            
            {/* Centerpiece Ableton Master Hub Node */}
            <div
              className="absolute w-28 h-28 rounded-2xl bg-gradient-to-br from-neon-cyan/40 to-neon-magenta/40 border-2 border-white/80 flex flex-col items-center justify-center text-center p-2 shadow-[0_0_40px_rgba(0,240,255,0.5)] z-30 transform hover:scale-110 transition cursor-pointer"
              style={{ transform: 'translateZ(60px)' }}
            >
              <Zap className="w-6 h-6 text-white animate-bounce" />
              <span className="font-mono text-[9px] font-extrabold text-white uppercase mt-1">ABLETON 12</span>
              <span className="font-mono text-[8px] text-neon-cyan">{bpm} BPM LINK</span>
            </div>

            {/* 3D Device Nodes Arranged in Spatial Racks */}
            {filteredDevices.map((device, idx) => {
              const total = filteredDevices.length;
              const angle = (idx / total) * (2 * Math.PI);
              const radius = 220 + (idx % 3) * 80;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const zHeight = 20 + (idx % 4) * 35;

              const isSelected = activeDevice?.id === device.id;

              return (
                <div
                  key={device.id}
                  onClick={() => onSelectDevice(device)}
                  className={`absolute p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer group shadow-2xl flex flex-col justify-between ${
                    isSelected
                      ? 'bg-neon-cyan text-black border-white shadow-[0_0_30px_rgba(0,240,255,0.8)] z-40'
                      : device.isPhysicalHardware
                      ? 'bg-slate-900/90 border-emerald-500/50 text-white hover:border-emerald-300 hover:scale-110 z-20'
                      : 'bg-zinc-900/90 border-neon-cyan/40 text-white hover:border-neon-cyan hover:scale-110 z-10'
                  }`}
                  style={{
                    width: '140px',
                    height: '80px',
                    left: `calc(50% + ${x}px - 70px)`,
                    top: `calc(50% + ${y}px - 40px)`,
                    transform: `translateZ(${zHeight}px) rotateZ(${-rotationAngle}deg) rotateX(${-tiltAngle}deg)`,
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Top bar with LED status */}
                  <div className="flex items-center justify-between">
                    <span className={`w-2 h-2 rounded-full ${device.isPhysicalHardware ? 'bg-emerald-400 animate-pulse' : 'bg-neon-cyan'}`} />
                    <span className="font-mono text-[8px] opacity-75 font-bold uppercase">{device.type || 'MIDI'}</span>
                  </div>

                  {/* Device Name */}
                  <div className="font-mono text-[10px] font-bold truncate my-0.5">
                    {device.name}
                  </div>

                  {/* Bottom channel badge */}
                  <div className="flex items-center justify-between text-[8px] font-mono opacity-80 pt-1 border-t border-white/10">
                    <span>Ch.{device.midiChannel || 1}</span>
                    <span className="font-bold">{device.latency ? `${device.latency.toFixed(1)}ms` : '1.2ms'}</span>
                  </div>

                  {/* 3D Laser Cable Connection to Center Hub */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: -1 }}>
                    <line
                      x1="70"
                      y1="40"
                      x2={-x + 70}
                      y2={-y + 40}
                      stroke={device.isPhysicalHardware ? '#10b981' : '#00f0ff'}
                      strokeWidth={isSelected ? '2.5' : '1'}
                      strokeDasharray="4 2"
                      strokeOpacity={isSelected ? '0.9' : '0.3'}
                    />
                  </svg>
                </div>
              );
            })}

          </div>
        </div>

        {/* Floating Spatial HUD Controls Overlay */}
        <div className="absolute top-4 left-4 p-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-xs font-mono text-gray-300 pointer-events-auto space-y-1">
          <div className="text-neon-cyan font-bold flex items-center gap-1.5">
            <Compass className="w-4 h-4" /> 3D SPATIAL TELEMETRY
          </div>
          <div>Knoten Gesamt: <span className="text-white font-bold">{filteredDevices.length}</span></div>
          <div>Bühnen-Latenz Avg: <span className="text-emerald-400 font-bold">1.28 ms</span></div>
        </div>

        {/* Spatial Bottom Help Overlay */}
        <div className="absolute bottom-3 left-4 right-4 p-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-mono text-gray-300 flex justify-between items-center">
          <span>💡 Tipp: Klicke auf ein 3D-Gerät zum Anwählen &amp; Schauen der Laser-Routing-Linie.</span>
          <span className="text-neon-cyan font-bold">3D Real-time Engine • Virtuoso Stage-Suite</span>
        </div>

      </div>

    </div>
  );
}
