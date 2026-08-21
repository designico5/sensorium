import React, { useState, useEffect } from 'react';
import {
  Globe,
  Radio,
  Sparkles,
  Zap,
  Volume2,
  Compass,
  Wind,
  Thermometer,
  Layers,
  RotateCw,
  Sliders,
  CheckCircle2,
  Maximize2,
  Activity,
  Flame,
  ShieldCheck,
  Disc,
  Boxes
} from 'lucide-react';
import { MidiDevice } from '../types';

interface Spatial5DStadiumEngineProps {
  devices: MidiDevice[];
  bpm: number;
  isPlaying: boolean;
  addLog: (category: 'MIDI' | 'SYSTEM' | 'ABLETON' | 'OSC', level: 'info' | 'warn' | 'error' | 'success', message: string) => void;
}

export default function Spatial5DStadiumEngine({
  devices,
  bpm,
  isPlaying,
  addLog
}: Spatial5DStadiumEngineProps) {
  // Venue profiles for 2031 Giga-Stage Productions
  const [selectedVenue, setSelectedVenue] = useState<'Sphere Dome (167,000 WFS Drivers)' | 'Wembley Stadium (350m Delay Array)' | 'Tomorrowland Mainstage (Open-Air Doppler)' | 'Cyber-Arena Tokyo (22.2 Ambisonics + Haptic Matrix)'>('Sphere Dome (167,000 WFS Drivers)');

  // 5D Environmental Physics Engine Parameters
  const [airTempC, setAirTempC] = useState<number>(22);
  const [humidityPercent, setHumidityPercent] = useState<number>(60);
  const [windSpeedKmh, setWindSpeedKmh] = useState<number>(12);
  const [crowdAbsorptionFactor, setCrowdAbsorptionFactor] = useState<number>(0.85);

  // 5D Dimensions State
  const [spatialTrajectoryPattern, setSpatialTrajectoryPattern] = useState<'360-Degree Binaural Vortex' | 'Spiral Quad-Height Flyby' | 'Sub-Bass Infrasound Pulse Wave' | 'Wave Field Synthesis (WFS) Direct Points'>('360-Degree Binaural Vortex');
  const [orbitSpeedRpm, setOrbitSpeedRpm] = useState<number>(18);
  const [hapticTransducerIntensity, setHapticTransducerIntensity] = useState<number>(75); // 5th Dimension: Physical Sub-vibration
  const [dopplerCompensationMs, setDopplerCompensationMs] = useState<number>(2.4);

  // Holographic 5D Node Positions for Devices
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [activeClusterZone, setActiveClusterZone] = useState<'ALL' | 'STAGE_FRONT' | 'HIGH_DOME' | 'SUB_FLOOR' | 'PERIMETER'>('ALL');

  // Animation Loop for 5D Trajectory Visualization
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setRotationAngle((prev) => (prev + (orbitSpeedRpm / 20)) % 360);
      animId = requestAnimationFrame(animate);
    };
    if (isPlaying) {
      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, orbitSpeedRpm]);

  const handleRecalibrateAtmosphere = () => {
    const calculatedSpeedOfSound = 331.3 + (0.606 * airTempC);
    addLog('SYSTEM', 'info', `🌡️ [ATMOSPHERE RECALIBRATION] Schallgeschwindigkeit neu berechnet: ${calculatedSpeedOfSound.toFixed(1)} m/s bei ${airTempC}°C & ${humidityPercent}% Luftfeuchte.`);
    setTimeout(() => {
      addLog('SYSTEM', 'success', `✨ [5D COMPENSATED] All 60 Sound Clusters Phase-Aligned for ${selectedVenue}. Zero HF air absorption loss.`);
    }, 600);
  };

  const handleApplyTrajectory = (pattern: any) => {
    setSpatialTrajectoryPattern(pattern);
    addLog('OSC', 'success', `🌀 [5D TRAJECTORY] Live 3D/4D/5D Raumflug-Muster "${pattern}" an Wave-Field-Synthesis Prozessor gesendet.`);
  };

  return (
    <div className="w-full bg-gradient-to-r from-cyan-950/80 via-zinc-950 to-purple-950/80 border border-neon-cyan/40 rounded-2xl p-5 shadow-[0_0_50px_rgba(0,240,255,0.2)] relative overflow-hidden text-left my-6">
      
      {/* Futuristic Background Gradients */}
      <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-neon-cyan/30 via-purple-500/30 to-amber-500/30 border border-neon-cyan/50 text-neon-cyan shadow-[0_0_25px_rgba(0,240,255,0.4)]">
            <Globe className="w-6 h-6 animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
              2031 SPATIAL 5D GIGA-STADIUM ENGINE
              <span className="px-2 py-0.5 rounded-full bg-neon-cyan text-black font-mono text-[10px] font-bold">
                WFS &amp; HAPTIC 5D
              </span>
            </h2>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              3D Raumklang (X/Y/Z) + 4D Zeit-Doppler-Kompensation + 5D Haptische Sub-Boden-Resonanz für Stadion-Giganten.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecalibrateAtmosphere}
            className="px-3.5 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/40 text-neon-cyan border border-neon-cyan/40 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          >
            <Wind className="w-3.5 h-3.5 text-neon-cyan animate-pulse" />
            Atmosphäre-Physik Kalibrieren
          </button>
        </div>
      </div>

      {/* Stadium Venue Selection Bar */}
      <div className="mb-5 relative z-10 bg-black/60 border border-white/10 p-3.5 rounded-xl font-mono text-xs">
        <div className="text-gray-400 mb-2 flex items-center justify-between">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-neon-cyan" /> GIGA-ARENA &amp; AUDITORIUM PROFIL (2031 STANDARD):
          </span>
          <span className="text-neon-cyan text-[10px] font-bold">
            0.001ms WFS Latency
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            'Sphere Dome (167,000 WFS Drivers)',
            'Wembley Stadium (350m Delay Array)',
            'Tomorrowland Mainstage (Open-Air Doppler)',
            'Cyber-Arena Tokyo (22.2 Ambisonics + Haptic Matrix)'
          ].map((venue) => (
            <button
              key={venue}
              onClick={() => {
                setSelectedVenue(venue as any);
                addLog('SYSTEM', 'info', `🏟️ [STADIUM SETUP] 5D Acoustic Matrix geladen für: ${venue}`);
              }}
              className={`p-2.5 rounded-lg border text-left transition text-[11px] font-bold ${
                selectedVenue === venue
                  ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {venue}
            </button>
          ))}
        </div>
      </div>

      {/* Main 5D Holographic Visualization Canvas & Control Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10 mb-5">
        
        {/* Holographic Arena Motion Radar (2 Cols on Large) */}
        <div className="lg:col-span-2 bg-black/70 border border-neon-cyan/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden min-h-[360px]">
          <div className="flex justify-between items-center z-10 font-mono text-xs">
            <span className="text-gray-300 font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-cyan animate-pulse" />
              LIVE 5D SPATIAL CLUSTER TRAJECTORY RADAR
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/40">
              ROTATION: {Math.round(rotationAngle)}°
            </span>
          </div>

          {/* Holographic Radar Concentric Circles */}
          <div className="relative w-full h-64 my-4 flex items-center justify-center">
            {/* Outer Arena Boundary */}
            <div className="absolute w-60 h-60 rounded-full border border-neon-cyan/20 animate-pulse" />
            <div className="absolute w-44 h-44 rounded-full border border-purple-500/30" />
            <div className="absolute w-28 h-28 rounded-full border border-amber-500/30" />
            
            {/* Center Stage Hub */}
            <div className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan to-purple-600 border border-white flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.8)] z-20">
              <span className="font-mono text-[9px] font-black text-black">STAGE</span>
            </div>

            {/* Rotating Trajectory Laser Beam */}
            <div
              className="absolute w-60 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-60"
              style={{ transform: `rotate(${rotationAngle}deg)` }}
            />

            {/* Hardware & Virtual Devices orbiting as 5D Sound Objects */}
            {devices.map((dev, idx) => {
              const angle = ((idx * (360 / Math.max(devices.length, 1))) + rotationAngle) * (Math.PI / 180);
              const radius = 60 + (idx % 3) * 35; // Distribute across spatial rings
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={dev.id}
                  className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-neon-cyan border border-white/80 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all duration-75 flex items-center justify-center cursor-pointer group"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  title={`${dev.name} - 5D Vector: X:${x.toFixed(0)} Y:${y.toFixed(0)} Z:${(idx * 5)}m`}
                >
                  <span className="text-[7px] font-mono font-black text-black">{idx + 1}</span>
                  
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black/90 border border-neon-cyan text-white text-[9px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">
                    {dev.name} (Ch.{dev.midiChannel || 1})
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cluster Zone Quick Filter Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 z-10 font-mono text-[11px] pt-3 border-t border-white/10">
            <span className="text-gray-400">Cluster-Zonen Filter:</span>
            <div className="flex gap-1.5">
              {(['ALL', 'STAGE_FRONT', 'HIGH_DOME', 'SUB_FLOOR', 'PERIMETER'] as const).map((zone) => (
                <button
                  key={zone}
                  onClick={() => setActiveClusterZone(zone)}
                  className={`px-2 py-1 rounded border text-[10px] font-bold transition ${
                    activeClusterZone === zone
                      ? 'bg-neon-cyan text-black border-neon-cyan'
                      : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 5D Dimensions Faders & Physical Haptics Controls */}
        <div className="bg-black/70 border border-purple-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <h3 className="font-mono text-xs text-purple-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            5D DIMENSIONEN &amp; ACOUSTIC PHYSICS:
          </h3>

          {/* 4D Doppler Speed */}
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between text-gray-300">
              <span>Orbit-Geschwindigkeit (RPM):</span>
              <span className="text-neon-cyan font-bold">{orbitSpeedRpm} RPM</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={orbitSpeedRpm}
              onChange={(e) => setOrbitSpeedRpm(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
            />
          </div>

          {/* 5D Haptic Sub-Bass Resonance (Physical Dimension) */}
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between text-gray-300">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                5D Haptische Boden-Resonanz:
              </span>
              <span className="text-amber-400 font-bold">{hapticTransducerIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={hapticTransducerIntensity}
              onChange={(e) => setHapticTransducerIntensity(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Atmosphere Parameters */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-2 border-t border-white/10">
            <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-gray-400 text-[9px]">LUFTTEMPERATUR</div>
              <div className="text-white font-bold flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-red-400" />
                {airTempC}°C
              </div>
            </div>

            <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
              <div className="text-gray-400 text-[9px]">LUFTFEUCHTIGKEIT</div>
              <div className="text-white font-bold flex items-center gap-1">
                <Wind className="w-3 h-3 text-cyan-400" />
                {humidityPercent}%
              </div>
            </div>
          </div>

          {/* Trajectory Pattern Selectors */}
          <div className="space-y-2 pt-2 border-t border-white/10 font-mono text-xs">
            <div className="text-gray-400 text-[10px]">TRAJEKTORIEN-MUSTER:</div>
            {[
              '360-Degree Binaural Vortex',
              'Spiral Quad-Height Flyby',
              'Sub-Bass Infrasound Pulse Wave',
              'Wave Field Synthesis (WFS) Direct Points'
            ].map((pattern) => (
              <button
                key={pattern}
                onClick={() => handleApplyTrajectory(pattern as any)}
                className={`w-full py-1.5 px-2.5 rounded border text-left text-[10px] font-bold transition flex items-center justify-between ${
                  spatialTrajectoryPattern === pattern
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <span>{pattern}</span>
                {spatialTrajectoryPattern === pattern && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
              </button>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
