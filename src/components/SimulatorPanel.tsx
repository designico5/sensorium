/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, Radio, Activity, RefreshCw, Layers } from 'lucide-react';

interface SimulatorPanelProps {
  bpm: number;
  isPlaying: boolean;
  onBpmChange: (val: number) => void;
  onTogglePlay: () => void;
  onTriggerClockDrift: () => void;
  onTriggerBufferOverflow: () => void;
  onTriggerHotplug: () => void;
  onInjectLargeMatrix: () => void;
  onResetSimulator: () => void;
  deviceCount: number;
  onTriggerTrendAcceleration: () => void;
  isAccelerating: boolean;
}

export default function SimulatorPanel({
  bpm,
  isPlaying,
  onBpmChange,
  onTogglePlay,
  onTriggerClockDrift,
  onTriggerBufferOverflow,
  onTriggerHotplug,
  onInjectLargeMatrix,
  onResetSimulator,
  deviceCount,
  onTriggerTrendAcceleration,
  isAccelerating,
}: SimulatorPanelProps) {
  return (
    <div className="p-5 rounded-2xl glass-panel border border-white/5 space-y-5">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-neon-magenta animate-pulse" />
          <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-gray-200">
            Real-Time Hardware Simulator
          </h3>
        </div>
        <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan uppercase">
          Mock Mode
        </span>
      </div>

      {/* Section 1: Ableton Master Clock controls */}
      <div className="space-y-3">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
          Ableton Link Telemetry
        </span>
        
        {/* Play/Pause */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex-grow flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-display font-medium text-xs tracking-wider uppercase transition ${
              isPlaying
                ? 'bg-neon-magenta text-white border-neon-magenta/35 shadow-lg shadow-neon-magenta/25'
                : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Stop Transport
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start Ableton Link
              </>
            )}
          </button>
        </div>

        {/* BPM Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[11px] text-gray-400">
            <span>Tempo Control</span>
            <span className="text-neon-cyan font-bold">{bpm} BPM</span>
          </div>
          <input
            type="range"
            min="60"
            max="220"
            step="1"
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-cyan focus:outline-none"
          />
        </div>
      </div>

      {/* Section 2: MIDI Error Injectors */}
      <div className="space-y-3 pt-2">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
          Simulate MIDI Exceptions
        </span>
        
        <div className="grid grid-cols-2 gap-2">
          {/* USB Disconnect */}
          <button
            onClick={onTriggerHotplug}
            className="flex flex-col items-start p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-left transition"
          >
            <Radio className="w-4 h-4 text-neon-cyan mb-1.5" />
            <span className="font-display font-semibold text-[11px] text-gray-200">
              USB Hotplug
            </span>
            <span className="font-sans text-[9px] text-gray-400 mt-0.5">
              Simulate USB Cable Pull
            </span>
          </button>

          {/* Clock Drift */}
          <button
            onClick={onTriggerClockDrift}
            className="flex flex-col items-start p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-left transition"
          >
            <AlertTriangle className="w-4 h-4 text-neon-yellow mb-1.5" />
            <span className="font-display font-semibold text-[11px] text-gray-200">
              Clock Drift
            </span>
            <span className="font-sans text-[9px] text-gray-400 mt-0.5">
              Delay midi clock &gt; 25ms
            </span>
          </button>

          {/* Buffer Overflow */}
          <button
            onClick={onTriggerBufferOverflow}
            className="flex flex-col items-start p-2.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-left transition"
            style={{ gridColumn: 'span 2' }}
          >
            <Activity className="w-4 h-4 text-neon-red mb-1.5" />
            <span className="font-display font-semibold text-[11px] text-gray-200">
              MIDI SysEx Buffer Overflow
            </span>
            <span className="font-sans text-[9px] text-gray-400 mt-0.5">
              Flood controller with massive status dumps to trigger dropping events
            </span>
          </button>

          {/* Jitter Acceleration / Predictive Failure */}
          <button
            onClick={onTriggerTrendAcceleration}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition ${
              isAccelerating
                ? 'bg-neon-magenta/10 border-neon-magenta/40 shadow-lg shadow-neon-magenta/10'
                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
            }`}
            style={{ gridColumn: 'span 2' }}
          >
            <span className="flex items-center gap-1.5 mb-1.5">
              <span className={`w-2 h-2 rounded-full ${isAccelerating ? 'bg-neon-magenta animate-ping' : 'bg-gray-400'}`} />
              <Activity className="w-4 h-4 text-neon-magenta" />
            </span>
            <span className="font-display font-semibold text-[11px] text-gray-200">
              Trend Jitter Acceleration (Predictive Warn)
            </span>
            <span className="font-sans text-[9px] text-gray-400 mt-0.5">
              Simulate exponential clock drift trend to trigger predictive fault warning within 30s
            </span>
          </button>
        </div>
      </div>

      {/* Section 3: Large Hardware Matrix Seeding */}
      <div className="space-y-3 pt-2">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
          Scale & Benchmark
        </span>

        <button
          onClick={onInjectLargeMatrix}
          className="w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-lg border border-neon-cyan/20 bg-neon-cyan/[0.04] hover:bg-neon-cyan/[0.08] text-neon-cyan font-display font-medium text-xs tracking-wider uppercase transition"
        >
          <Layers className="w-3.5 h-3.5" />
          Inject 60+ MIDI Ports
        </button>

        <p className="font-sans text-[10px] text-gray-400 leading-normal text-center italic">
          Currently tracking <span className="text-gray-200 font-semibold">{deviceCount}</span> ports
        </p>
      </div>

      {/* Section 4: Global Reset */}
      <div className="pt-2">
        <button
          onClick={onResetSimulator}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-gray-400 hover:text-white font-mono text-[11px] hover:bg-white/[0.02] rounded border border-dashed border-white/10 transition"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All Devices to Healthy
        </button>
      </div>
    </div>
  );
}
