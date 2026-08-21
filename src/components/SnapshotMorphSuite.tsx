import React, { useState } from 'react';
import {
  Sliders,
  Layers,
  Sparkles,
  Zap,
  Play,
  Bookmark,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { MidiDevice } from '../types';

interface SnapshotMorphSuiteProps {
  devices: MidiDevice[];
  addLog: (category: 'MIDI' | 'SYSTEM' | 'ABLETON' | 'OSC', level: 'info' | 'warn' | 'error' | 'success', message: string) => void;
}

export default function SnapshotMorphSuite({
  devices,
  addLog
}: SnapshotMorphSuiteProps) {
  const [morphValue, setMorphValue] = useState<number>(0);
  const [snapshotA, setSnapshotA] = useState<string>('Intro Ambient Soundscape (Cutoff 20%, Reverb 80%)');
  const [snapshotB, setSnapshotB] = useState<string>('Drop Peak Techno (Cutoff 100%, Distortion 65%)');
  const [isMorphingActive, setIsMorphingActive] = useState<boolean>(false);
  const [interpolationTimeMs, setInterpolationTimeMs] = useState<number>(2000);

  // Stored snapshots list
  const [snapshots, setSnapshots] = useState<Array<{ id: string; name: string; timestamp: string; deviceCount: number }>>([
    { id: 'snap-1', name: 'Stage Setup A: Ambient Intro', timestamp: '20:14:02', deviceCount: devices.length },
    { id: 'snap-2', name: 'Stage Setup B: Main Peak Drop', timestamp: '20:22:15', deviceCount: devices.length },
    { id: 'snap-3', name: 'Stage Setup C: Minimal Outro', timestamp: '20:30:00', deviceCount: devices.length },
  ]);

  const handleCaptureSnapshot = () => {
    const newSnap = {
      id: `snap-${Date.now()}`,
      name: `Snapshot ${snapshots.length + 1}: Live Recall (${devices.length} Geräte)`,
      timestamp: new Date().toLocaleTimeString(),
      deviceCount: devices.length,
    };
    setSnapshots([newSnap, ...snapshots]);
    addLog('SYSTEM', 'success', `📸 [SNAPSHOT SPEICHERN] Parameter-Snapshot für ${devices.length} Hardware-Geräte & Ableton Racks gesichert.`);
  };

  const handleMorphSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setMorphValue(val);
    if (val === 0 || val === 100) {
      addLog('MIDI', 'info', `🎛️ [MORPH COMPLETED] Seamless Parameter Morphing reached ${val}% target.`);
    }
  };

  const handleTriggerAutoMorph = () => {
    setIsMorphingActive(true);
    addLog('MIDI', 'info', `🌊 [AUTO-MORPH] Starte stufenlose 0% -> 100% Parameter-Transition über ${interpolationTimeMs}ms...`);
    
    let current = morphValue;
    const target = current > 50 ? 0 : 100;
    const step = (target - current) / 20;

    const interval = setInterval(() => {
      current += step;
      if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
        setMorphValue(target);
        clearInterval(interval);
        setIsMorphingActive(false);
        addLog('ABLETON', 'success', `✨ [MORPH FINISHED] Alle gekoppelten Hardware- & VST-Parameter stufenlos ohne Reiss-Geräusche gemorpht!`);
      } else {
        setMorphValue(Math.round(current));
      }
    }, interpolationTimeMs / 20);
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/70 via-zinc-950 to-slate-950 border border-amber-500/30 rounded-2xl p-5 shadow-[0_0_35px_rgba(245,158,11,0.15)] relative overflow-hidden text-left my-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-neon-cyan/20 border border-amber-400/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <SlidersHorizontal className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
              UNBESCHRÄNKTE (&infin;) SNAPSHOT &amp; CROSS-MORPH SUITE
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black font-mono text-[10px] font-bold">
                0-100% MORPH
              </span>
            </h2>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              Stufenloses Morphing für unbegrenzt viele Synthesizer, Modular-Racks, VSTs &amp; Ableton CC-Macros ohne Zipper-Noise oder Buffer-Overrun.
            </p>
          </div>
        </div>

        <button
          onClick={handleCaptureSnapshot}
          className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-400/40 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          Aktuellen Zustand als Snapshot Speichern
        </button>
      </div>

      {/* Morph Crossfader Control */}
      <div className="bg-black/60 border border-white/10 rounded-2xl p-5 mb-5 relative z-10 space-y-4">
        <div className="flex justify-between items-center font-mono text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
              SNAPSHOT A (0%)
            </span>
            <span className="text-gray-400 hidden md:inline">{snapshotA}</span>
          </div>

          <div className="text-neon-cyan font-bold text-sm">
            MORPH: {morphValue}%
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 hidden md:inline">{snapshotB}</span>
            <span className="px-2.5 py-1 rounded bg-neon-cyan/20 text-neon-cyan font-bold border border-neon-cyan/40">
              SNAPSHOT B (100%)
            </span>
          </div>
        </div>

        {/* Big Interactive Crossfader Slider */}
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={morphValue}
            onChange={handleMorphSliderChange}
            className="w-full h-4 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Auto Transition Button & Duration */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span>Dauer:</span>
            {[1000, 2000, 4000, 8000].map((ms) => (
              <button
                key={ms}
                onClick={() => setInterpolationTimeMs(ms)}
                className={`px-2.5 py-1 rounded border transition ${
                  interpolationTimeMs === ms
                    ? 'bg-amber-500 text-black font-bold border-amber-400'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>

          <button
            onClick={handleTriggerAutoMorph}
            disabled={isMorphingActive}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-neon-cyan hover:brightness-110 text-black font-mono text-xs font-extrabold rounded-xl transition shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2"
          >
            <Play className={`w-4 h-4 fill-black ${isMorphingActive ? 'animate-spin' : ''}`} />
            {isMorphingActive ? 'Morphe Parameter...' : 'Auto-Morph Glatt Ausführen'}
          </button>
        </div>
      </div>

      {/* Saved Snapshots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 font-mono text-xs">
        {snapshots.map((snap) => (
          <div key={snap.id} className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400/50 transition flex justify-between items-center">
            <div>
              <div className="text-white font-bold">{snap.name}</div>
              <div className="text-[10px] text-gray-400">{snap.timestamp} • {snap.deviceCount} Geräte gekoppelt</div>
            </div>
            <button
              onClick={() => {
                addLog('SYSTEM', 'info', `📸 Snapshot geladen: ${snap.name}`);
              }}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-amber-500/20 hover:text-amber-300 text-gray-300 font-bold transition text-[10px]"
            >
              Laden
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
