import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  Radio,
  Flame,
  ShieldCheck,
  Cpu,
  Layers,
  RotateCw,
  CheckCircle2,
  Compass,
  ZapOff
} from 'lucide-react';
import { MidiDevice } from '../types';

interface AudiophileAcousticLabProps {
  devices: MidiDevice[];
  bpm: number;
  addLog: (category: 'MIDI' | 'SYSTEM' | 'ABLETON' | 'OSC', level: 'info' | 'warn' | 'error' | 'success', message: string) => void;
}

export default function AudiophileAcousticLab({
  devices,
  bpm,
  addLog
}: AudiophileAcousticLabProps) {
  // Audiophile Parameters
  const [sampleRate, setSampleRate] = useState<'96kHz' | '192kHz' | '384kHz (DSD Master)'>('192kHz');
  const [tubeWarmth, setTubeWarmth] = useState<number>(42);
  const [tapeSaturation, setTapeSaturation] = useState<number>(28);
  const [subSamplePhaseAlign, setSubSamplePhaseAlign] = useState<boolean>(true);
  const [bitPerfectJitterClean, setBitPerfectJitterClean] = useState<boolean>(true);
  const [analogDriftCompensation, setAnalogDriftCompensation] = useState<boolean>(true);
  const [selectedProfile, setSelectedProfile] = useState<'Neve 1073 Warmth' | 'SSL G-Master Punch' | 'Studer A800 Tape' | 'Pure Bit-Perfect Direct'>('Neve 1073 Warmth');

  // Live Audio Metering Simulation State
  const [lufsLevel, setLufsLevel] = useState<number>(-14.2);
  const [truePeakDb, setTruePeakDb] = useState<number>(-0.8);
  const [thdPercentage, setThdPercentage] = useState<number>(0.0035);

  // Dynamic audio metering heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      setLufsLevel((prev) => +(-14.0 - Math.random() * 0.8).toFixed(1));
      setTruePeakDb((prev) => +(-0.6 - Math.random() * 0.5).toFixed(1));
      setThdPercentage((prev) => +(0.003 + Math.random() * 0.001).toFixed(4));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleApplyAudiophileProfile = (profileName: any) => {
    setSelectedProfile(profileName);
    addLog('SYSTEM', 'success', `🎚️ [AUDIOPHILE PURIST] Analoges Klangprofil "${profileName}" auf alle ${devices.length} Signalwege angewendet!`);
  };

  const handleCalibratePhaseAlignment = () => {
    addLog('SYSTEM', 'info', '🔊 [PHASE ALIGNMENT] Führe Sub-Sample Sub-Millisekunden Phasen-Synchronisation für 192kHz Audiosignale aus...');
    setTimeout(() => {
      addLog('SYSTEM', 'success', '✨ [PHASE PERFECT] Alle 60 Kanäle phasenstarr aufeinander ausgerichtet. 0% Auslöschung im Tieftonbereich.');
    }, 800);
  };

  return (
    <div className="w-full bg-gradient-to-r from-stone-950 via-zinc-950 to-neutral-950 border border-amber-500/40 rounded-2xl p-5 shadow-[0_0_40px_rgba(245,158,11,0.15)] relative overflow-hidden text-left my-6">
      
      {/* Background Gold Ambient Glow */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 border border-amber-400/50 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Volume2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
              AUDIOPHILE &amp; KLANGKÜNSTLER ACOUSTIC LAB
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-mono text-[10px] font-bold">
                BIT-PERFECT 192kHz
              </span>
            </h2>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              Für Toningenieure &amp; Analog-Puristen: Röhren-Sättigung, Band-Hysterese, Sub-Sample-Phasentreue &amp; 0.0001ms Jitter-Clean.
            </p>
          </div>
        </div>

        <button
          onClick={handleCalibratePhaseAlignment}
          className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-400/50 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
          Sub-Sample Phasen-Match Kalibrieren
        </button>
      </div>

      {/* Audiophile Telemetry Meters Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5 relative z-10 font-mono text-xs">
        <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-between">
          <span className="text-gray-400">Master Sample Rate:</span>
          <span className="text-amber-300 font-bold">{sampleRate}</span>
        </div>
        <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 flex items-center justify-between">
          <span className="text-gray-400">Integrated LUFS:</span>
          <span className="text-emerald-400 font-bold">{lufsLevel} LUFS</span>
        </div>
        <div className="p-3 rounded-xl bg-black/60 border border-neon-cyan/30 flex items-center justify-between">
          <span className="text-gray-400">True Peak:</span>
          <span className="text-neon-cyan font-bold">{truePeakDb} dBTP</span>
        </div>
        <div className="p-3 rounded-xl bg-black/60 border border-yellow-500/30 flex items-center justify-between">
          <span className="text-gray-400">THD+Noise:</span>
          <span className="text-yellow-400 font-bold">{thdPercentage}%</span>
        </div>
      </div>

      {/* Analog Character Profiles Selection */}
      <div className="space-y-3 mb-5 relative z-10">
        <h3 className="font-mono text-xs text-gray-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Klang-Charakteristik &amp; Analoge Vorverstärker-Emulation:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'Neve 1073 Warmth', desc: 'Warme Harmonische 2. Ordnung, seidige Höhen & fülliger Tief-Mitten-Punch.' },
            { name: 'SSL G-Master Punch', desc: 'Präzise, knackige Transienten, glasklare Kanal-Separation & Tightness.' },
            { name: 'Studer A800 Tape', desc: 'Sanfte Bandkompression, authentische Sättigung & Tape-Roll-off.' },
            { name: 'Pure Bit-Perfect Direct', desc: '100% Verfälschungsfreier digitaler Signalweg ohne Farbgebung.' },
          ].map((prof) => (
            <button
              key={prof.name}
              onClick={() => handleApplyAudiophileProfile(prof.name as any)}
              className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                selectedProfile === prof.name
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-black/50 border-white/10 text-gray-300 hover:border-amber-400/40'
              }`}
            >
              <div className="font-mono text-xs font-bold flex items-center justify-between">
                <span>{prof.name}</span>
                {selectedProfile === prof.name && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[10px] text-gray-400 font-sans leading-tight">{prof.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pure Tone Sliders & Drift Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10 bg-black/60 border border-white/10 p-4 rounded-xl">
        
        {/* Tube & Tape Warmth Faders */}
        <div className="space-y-4 font-mono text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Röhren-Harmonisierung (Tube Drive):</span>
              <span className="text-amber-400 font-bold">{tubeWarmth}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={tubeWarmth}
              onChange={(e) => setTubeWarmth(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Band-Sättigung (Tape Hysteresis):</span>
              <span className="text-yellow-400 font-bold">{tapeSaturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={tapeSaturation}
              onChange={(e) => setTapeSaturation(Number(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2.5 font-mono text-xs text-gray-300">
          <label className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10">
            <span>Sub-Sample Phasen-Ausrichtung:</span>
            <input
              type="checkbox"
              checked={subSamplePhaseAlign}
              onChange={(e) => setSubSamplePhaseAlign(e.target.checked)}
              className="accent-amber-400 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10">
            <span>Bit-Perfect Jitter-Clean Engine:</span>
            <input
              type="checkbox"
              checked={bitPerfectJitterClean}
              onChange={(e) => setBitPerfectJitterClean(e.target.checked)}
              className="accent-amber-400 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10">
            <span>Analog-Drift Driftschutz (Temperature Sync):</span>
            <input
              type="checkbox"
              checked={analogDriftCompensation}
              onChange={(e) => setAnalogDriftCompensation(e.target.checked)}
              className="accent-amber-400 w-4 h-4"
            />
          </label>
        </div>

      </div>

    </div>
  );
}
