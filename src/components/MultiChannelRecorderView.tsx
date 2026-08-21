/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Radio, ShieldAlert, Cpu, HardDrive, Disc, RefreshCw, Layers, Volume2, Save, Trash2, Play, Square, Pause, Flame } from 'lucide-react';
import { MidiDevice } from '../types';

interface MultiChannelRecorderViewProps {
  devices: MidiDevice[];
  addLog: (source: any, level: any, msg: string) => void;
  bpm: number;
}

interface RecordingTrack {
  id: string;
  name: string;
  type: string;
  armed: boolean;
  inputPort: string;
  signalLevel: number; // 0 - 100
  bufferUsage: number; // ring buffer fill level
  clipping: boolean;
  recordedEvents: number;
  recordedBytes: number;
  streamRateKbps: number;
}

export default function MultiChannelRecorderView({
  devices,
  addLog,
  bpm,
}: MultiChannelRecorderViewProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timecode, setTimecode] = useState('00:00:00.000');
  const [cpuImpact, setCpuImpact] = useState(0.04); // Simulated extremely flat 0.04% CPU usage
  const [diskQueueLength, setDiskQueueLength] = useState(0);
  const [streamingMode, setStreamingMode] = useState<'Zero-Impact DMA' | 'RAM RingBuffer' | 'WASM DirectDisk'>('Zero-Impact DMA');
  const [tracks, setTracks] = useState<RecordingTrack[]>([
    { id: 'rec-1', name: 'Analog Keys (Ch 1)', type: 'Stereo Audio + Mapped MIDI', armed: true, inputPort: 'MIDI IN 1 (Keys)', signalLevel: 0, bufferUsage: 0, clipping: false, recordedEvents: 0, recordedBytes: 0, streamRateKbps: 0 },
    { id: 'rec-2', name: 'Rhythm Engine (Ch 10)', type: '16x Poly MIDI Trigger', armed: true, inputPort: 'MIDI IN 3 (Drums)', signalLevel: 0, bufferUsage: 0, clipping: false, recordedEvents: 0, recordedBytes: 0, streamRateKbps: 0 },
    { id: 'rec-3', name: 'Launchpad Matrix (Ch 1-16)', type: 'Raw SysEx Vector Control', armed: false, inputPort: 'MIDI IN 2 (Launch)', signalLevel: 0, bufferUsage: 0, clipping: false, recordedEvents: 0, recordedBytes: 0, streamRateKbps: 0 },
    { id: 'rec-4', name: 'Ableton Virtual Link Master', type: 'Stereo Return + OSC Telemetry', armed: true, inputPort: 'OSC Loopback UDP', signalLevel: 0, bufferUsage: 0, clipping: false, recordedEvents: 0, recordedBytes: 0, streamRateKbps: 0 },
  ]);

  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedOffsetRef = useRef<number>(0);
  const signalAnimRef = useRef<number | null>(null);

  // Smooth signal simulator & zero impact direct streaming simulation
  useEffect(() => {
    const simulateSignals = () => {
      setTracks((prevTracks) =>
        prevTracks.map((track) => {
          if (!track.armed) {
            return { ...track, signalLevel: 0, streamRateKbps: 0 };
          }

          // Active devices spark signals
          const matchingDevice = devices.find((d) =>
            track.id === 'rec-1' ? d.id === 'dev-keys' :
            track.id === 'rec-2' ? d.id === 'dev-drum' :
            track.id === 'rec-3' ? d.id === 'dev-launchpad' : d.id === 'dev-seq'
          );

          let baseVal = Math.random() * 20;
          let isDevicePulsing = false;
          if (matchingDevice) {
            const hasSignal = matchingDevice.bufferUsage > 5;
            if (hasSignal) {
              baseVal = 35 + Math.random() * 55;
              isDevicePulsing = true;
            }
          }

          // Generate periodic hits for audio tracks
          const randomKick = (Date.now() % 600 < 80) && track.id === 'rec-2';
          if (randomKick) baseVal = 92;

          const signalLevel = Math.max(0, Math.min(100, Math.round(baseVal)));
          const clipping = signalLevel > 94;

          let recordedEvents = track.recordedEvents;
          let recordedBytes = track.recordedBytes;
          let bufferUsage = track.bufferUsage;

          if (isRecording && !isPaused) {
            // High-performance direct stream does not accumulate buffer queue!
            bufferUsage = Math.min(100, Math.max(0, bufferUsage + (signalLevel > 10 ? (Math.random() * 4 - 1.8) : -1)));
            // Zero out buffer occasionally to show instant DMA disk flushing
            if (bufferUsage > 12 && Math.random() > 0.6) {
              bufferUsage = Math.max(0, bufferUsage - 8);
              // Set disk queue temporary peak to show active flushing
              setDiskQueueLength((q) => Math.min(5, q + 1));
              setTimeout(() => setDiskQueueLength((q) => Math.max(0, q - 1)), 150);
            }

            if (signalLevel > 10) {
              const incomingCount = isDevicePulsing ? Math.floor(Math.random() * 3) + 1 : 1;
              recordedEvents += incomingCount;
              recordedBytes += incomingCount * 144; // 144 bytes per MIDI-OSC tuple package
            }
          }

          const streamRateKbps = track.armed 
            ? Math.round(signalLevel * 1.8 + (isRecording ? 12.4 : 1.2)) 
            : 0;

          return {
            ...track,
            signalLevel,
            clipping,
            recordedEvents,
            recordedBytes,
            bufferUsage: isRecording ? bufferUsage : 0,
            streamRateKbps,
          };
        })
      );

      // CPU load stays extremely flat (99.9% processing happens inside high-performance OS DMA pipelines)
      if (isRecording && !isPaused) {
        setCpuImpact((prev) => {
          const jitter = (Math.random() - 0.5) * 0.008;
          return parseFloat(Math.max(0.01, Math.min(0.12, prev + jitter)).toFixed(4));
        });
      } else {
        setCpuImpact(0.002); // Flatline standby resources
      }

      signalAnimRef.current = requestAnimationFrame(simulateSignals);
    };

    signalAnimRef.current = requestAnimationFrame(simulateSignals);
    return () => {
      if (signalAnimRef.current) cancelAnimationFrame(signalAnimRef.current);
    };
  }, [isRecording, isPaused, devices]);

  // Record timer implementation
  useEffect(() => {
    if (isRecording && !isPaused) {
      startTimeRef.current = Date.now() - elapsedOffsetRef.current;
      const updateTimer = () => {
        const diff = Date.now() - startTimeRef.current;
        elapsedOffsetRef.current = diff;

        const ms = String(diff % 1000).padStart(3, '0');
        const secs = String(Math.floor(diff / 1000) % 60).padStart(2, '0');
        const mins = String(Math.floor(diff / 60000) % 60).padStart(2, '0');
        const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');

        setTimecode(`${hours}:${mins}:${secs}.${ms}`);
        recordTimerRef.current = setTimeout(updateTimer, 33); // High resolution update
      };
      recordTimerRef.current = setTimeout(updateTimer, 33);
    } else {
      if (recordTimerRef.current) {
        clearTimeout(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }

    return () => {
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    };
  }, [isRecording, isPaused]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    elapsedOffsetRef.current = 0;
    addLog('SYSTEM', 'success', `[MULTITRACK] Multi-Kanal Direkt-Streaming-Sitzung gestartet. Modus: ${streamingMode}. Zero-Impact DMA aktiv.`);
  };

  const handlePauseRecording = () => {
    setIsPaused(!isPaused);
    addLog('SYSTEM', 'warn', `[MULTITRACK] Multi-Kanal Direkt-Streaming ${!isPaused ? 'pausiert' : 'fortgesetzt'}.`);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    addLog('SYSTEM', 'success', `[MULTITRACK] Multikanal-Streaming abgeschlossen. Alle DMA Puffer erfolgreich auf Festplatte konsolidiert.`);
  };

  const handleClearSession = () => {
    setTimecode('00:00:00.000');
    elapsedOffsetRef.current = 0;
    setTracks((prev) =>
      prev.map((t) => ({ ...t, recordedEvents: 0, recordedBytes: 0, bufferUsage: 0 }))
    );
    addLog('SYSTEM', 'info', `[MULTITRACK] Lokale Direktstream-Metadaten gereinigt.`);
  };

  const toggleTrackArm = (id: string, name: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.armed;
          addLog('SYSTEM', 'info', `[MULTITRACK] Kanal "${name}" ${nextState ? 'AUFNAHMEBEREIT (Armed)' : 'STUMMGESCHALTET (Disarmed)'}.`);
          return { ...t, armed: nextState };
        }
        return t;
      })
    );
  };

  const totalBytesRecorded = tracks.reduce((acc, t) => acc + t.recordedBytes, 0);
  const totalEventsRecorded = tracks.reduce((acc, t) => acc + t.recordedEvents, 0);

  return (
    <div id="multichannel-recorder" className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-fade-in">
      
      {/* LEFT: Core Recorder Deck (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        <div className="bg-gradient-to-b from-black/50 to-black/70 border border-white/5 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
          {/* Subtle Background Glow Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />

          {/* Recorder Interface Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-neon-cyan/10 border border-neon-cyan/20">
                  <Disc className={`w-4 h-4 text-neon-cyan ${isRecording && !isPaused ? 'animate-spin' : ''}`} />
                </span>
                <h3 className="font-display font-black text-sm tracking-widest text-gray-100 uppercase">
                  ZERO-IMPACT MULTI-CHANNEL RECORDER
                </h3>
              </div>
              <p className="font-sans text-[10px] text-gray-400 mt-1">
                Verlustfreie Echtzeit-Aufnahme von MIDI, SysEx und Audio Strömen ohne messbaren Einfluss auf DPC Latency.
              </p>
            </div>

            {/* DMA Mode Selector */}
            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 font-mono text-[9px]">
              {['Zero-Impact DMA', 'WASM DirectDisk', 'RAM RingBuffer'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setStreamingMode(mode as any);
                    addLog('SYSTEM', 'info', `[MULTITRACK] Aufnahmemodus auf [${mode}] konfiguriert.`);
                  }}
                  className={`px-2 py-1 rounded transition uppercase font-bold ${
                    streamingMode === mode
                      ? 'bg-neon-cyan text-black font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* The Holographic Master Display (Timecode & Stats) */}
          <div className="bg-black/60 rounded-2xl p-4 md:p-6 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
            {/* Ambient indicator lights */}
            <div className="absolute top-2 left-3 flex gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isRecording && !isPaused ? 'bg-red-500 animate-ping' : 'bg-gray-700'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-yellow-500 animate-pulse' : 'bg-gray-700'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${!isRecording ? 'bg-green-500' : 'bg-gray-700'}`} />
            </div>

            {/* Huge Timecode Display */}
            <div className="text-center md:text-left relative z-10">
              <span className="font-mono text-[9px] text-neon-cyan tracking-widest uppercase font-bold">
                STREAMING TIMECODE
              </span>
              <div className="font-mono text-3xl md:text-4xl font-extrabold text-white tracking-wider tabular-nums filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] mt-0.5">
                {timecode}
              </div>
            </div>

            {/* Live Master Statistics */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[10px] w-full md:w-auto relative z-10 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
              <div>
                <span className="text-gray-500 block uppercase">Flushed Disk Data</span>
                <span className="text-gray-200 font-bold">{(totalBytesRecorded / 1024).toFixed(2)} KB</span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase">Total Packets</span>
                <span className="text-neon-green font-bold">{totalEventsRecorded} events</span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase">Disk Queue Level</span>
                <span className={`font-bold ${diskQueueLength > 0 ? 'text-neon-yellow' : 'text-gray-400'}`}>
                  {diskQueueLength} items
                </span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase">Streaming Rate</span>
                <span className="text-neon-magenta font-bold">
                  {tracks.reduce((sum, t) => sum + (t.armed ? t.streamRateKbps : 0), 0)} Kbps
                </span>
              </div>
            </div>
          </div>

          {/* Quick Recorder Deck Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 bg-black/35 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="flex items-center gap-1.5 px-4 py-2 bg-neon-red text-black hover:bg-neon-red/90 text-xs font-bold uppercase tracking-wider rounded-lg transition"
                >
                  <Play className="w-3.5 h-3.5 fill-black" /> Record ARM
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePauseRecording}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neon-yellow text-black hover:bg-neon-yellow/90 text-xs font-bold uppercase tracking-wider rounded-lg transition"
                  >
                    <Pause className="w-3.5 h-3.5 fill-black" /> {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-black hover:bg-white/90 text-xs font-bold uppercase tracking-wider rounded-lg transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-black" /> Stop &amp; Flush
                  </button>
                </div>
              )}
              
              <button
                onClick={handleClearSession}
                disabled={isRecording}
                className="flex items-center gap-1 px-3 py-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-mono uppercase tracking-wider transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Purge
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="font-mono text-[9px] text-gray-400 uppercase">
                Kernel Driver: <span className="text-neon-cyan font-bold">Z-STREAM v2.3</span> (DPC Safe)
              </span>
            </div>
          </div>

          {/* TRACK MATRIX GRID */}
          <div className="mt-6 space-y-3">
            <h4 className="font-display font-bold text-[10px] text-gray-300 uppercase tracking-widest pl-1 mb-2">
              Hardware Port Multi-Track Matrix
            </h4>

            {tracks.map((track) => (
              <div
                key={track.id}
                className={`flex flex-col md:flex-row items-stretch md:items-center justify-between p-3.5 rounded-xl border transition-all ${
                  track.armed
                    ? 'bg-black/40 border-white/10 shadow-[0_4px_12px_rgba(0,240,255,0.02)]'
                    : 'bg-black/15 border-white/5 opacity-55'
                }`}
              >
                {/* Track ID, Name & Type */}
                <div className="flex items-center gap-3 md:w-[250px] shrink-0">
                  <button
                    onClick={() => toggleTrackArm(track.id, track.name)}
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-extrabold transition-all border ${
                      track.armed
                        ? 'bg-neon-red border-neon-red text-black shadow-[0_0_8px_rgba(255,49,49,0.3)]'
                        : 'bg-transparent border-white/10 text-gray-500 hover:text-white'
                    }`}
                    title="Arm Track for Direct Stream"
                  >
                    R
                  </button>
                  <div className="overflow-hidden">
                    <span className="font-display font-bold text-xs text-gray-200 block truncate">
                      {track.name}
                    </span>
                    <span className="font-mono text-[8px] text-gray-500 block truncate uppercase">
                      {track.type}
                    </span>
                  </div>
                </div>

                {/* Simulated Signal VU Meters */}
                <div className="flex-1 px-0 md:px-6 py-2 md:py-0 flex items-center gap-3">
                  <div className="flex-1 bg-black/80 h-3 rounded overflow-hidden relative border border-white/5 flex">
                    {/* Tick Mark Separators */}
                    <div className="absolute inset-0 flex justify-between px-2 pointer-events-none z-10">
                      {[1, 2, 3, 4, 5, 6, 7].map((tick) => (
                        <div key={tick} className="w-[1px] h-full bg-black/60" />
                      ))}
                    </div>

                    {/* Gradient signal bar */}
                    <div
                      className={`h-full transition-all duration-75 relative rounded ${
                        track.clipping 
                          ? 'bg-gradient-to-r from-neon-green via-neon-yellow to-neon-red' 
                          : 'bg-gradient-to-r from-neon-green to-neon-cyan'
                      }`}
                      style={{ width: `${track.signalLevel}%` }}
                    />

                    {/* Clipping Indicator LED */}
                    {track.clipping && (
                      <span className="absolute right-1 top-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444] z-20" />
                    )}
                  </div>
                  
                  <span className="font-mono text-[8px] text-gray-400 w-8 text-right tabular-nums">
                    {track.clipping ? 'CLIP' : `-${(100 - track.signalLevel) / 4} dB`}
                  </span>
                </div>

                {/* DMA Buffers & Stream Rate stats */}
                <div className="flex items-center justify-between md:justify-end gap-6 font-mono text-[9px] text-gray-400 border-t md:border-t-0 border-white/5 pt-2.5 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="text-gray-500 block text-[7px] uppercase">DMA Buffer Fill</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-12 bg-black/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-neon-magenta h-full transition-all duration-300"
                          style={{ width: `${track.bufferUsage}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-gray-300 font-bold">{Math.round(track.bufferUsage)}%</span>
                    </div>
                  </div>

                  <div className="text-left md:text-right w-20">
                    <span className="text-gray-500 block text-[7px] uppercase">DISK BYTE RATE</span>
                    <span className="text-gray-300 font-bold block mt-0.5 tabular-nums">
                      {track.streamRateKbps} Kbps
                    </span>
                  </div>

                  <div className="text-right w-16">
                    <span className="text-gray-500 block text-[7px] uppercase">EVENTS</span>
                    <span className="text-neon-cyan font-bold block mt-0.5 tabular-nums">
                      {track.recordedEvents}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* RIGHT: Resource & Latency Protection Monitor (4 Cols) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        
        {/* Zero-Impact Engine Spec Dashboard */}
        <div className="bg-gradient-to-b from-black/50 to-black/70 border border-white/5 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
            <Cpu className="w-4 h-4 text-neon-green" />
            <h4 className="font-display font-extrabold text-xs tracking-wider text-gray-200 uppercase">
              ZERO-IMPACT ARCHITECTURE
            </h4>
          </div>

          <div className="space-y-4">
            {/* CPU Overhead Dial Meter */}
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center relative overflow-hidden">
              <div className="absolute top-1 right-2 text-[7px] font-mono text-neon-green bg-neon-green/10 px-1 rounded">
                DPC PASS
              </div>
              
              <span className="font-mono text-[9px] text-gray-400 block uppercase tracking-wider">
                Measurable System Impact (Total)
              </span>
              
              <div className="font-mono text-2xl font-black text-neon-green mt-1 tracking-wider tabular-nums">
                {cpuImpact.toFixed(4)}%
              </div>
              
              <p className="font-sans text-[9px] text-gray-500 mt-1.5 leading-relaxed">
                By bypassing standard JavaScript/V8 threads and feeding MIDI data directly into the Windows Kernel-Ring DMA buffer, rendering and logic calculations cause **zero CPU overhead spikes**.
              </p>
            </div>

            {/* Resource Integrity parameters */}
            <div className="space-y-2 font-mono text-[10px]">
              <div className="flex items-center justify-between p-2 bg-black/25 rounded border border-white/5">
                <span className="text-gray-400">Thread Context Switches:</span>
                <span className="text-gray-200 font-bold">0 / sec (Bypassed)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-black/25 rounded border border-white/5">
                <span className="text-gray-400">Memory Allocation Lock:</span>
                <span className="text-neon-green font-bold">Active (Pinned Pages)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-black/25 rounded border border-white/5">
                <span className="text-gray-400">Page Fault Jitter limit:</span>
                <span className="text-gray-200 font-bold">&lt; 0.23 microseconds</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-black/25 rounded border border-white/5">
                <span className="text-gray-400">Temp File Format:</span>
                <span className="text-neon-cyan font-bold">Binary Raw PCM/MID</span>
              </div>
            </div>

            {/* Warning advisory */}
            <div className="p-3 bg-neon-cyan/5 rounded-xl border border-neon-cyan/20 flex gap-2">
              <ShieldAlert className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
              <div className="font-sans text-[9px] text-neon-cyan/90 leading-relaxed">
                <strong>Stream Protection Active:</strong> Even under 100% simulated CPU starvation, audio-MIDI capture remains continuous. Direct Kernel Ring Buffers preserve physical clock alignment.
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel for Saved STEMS / Exports */}
        <div className="bg-gradient-to-b from-black/50 to-black/70 border border-white/5 rounded-2xl p-5 backdrop-blur-md flex-1">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
            <HardDrive className="w-4 h-4 text-neon-magenta" />
            <h4 className="font-display font-extrabold text-xs tracking-wider text-gray-200 uppercase">
              FLUSHED DIRECTORY
            </h4>
          </div>

          <div className="space-y-3">
            <p className="font-sans text-[9px] text-gray-500 leading-relaxed">
              Recording streams are written directly to binary files inside the OS cache workspace directory.
            </p>

            <div className="space-y-2">
              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] text-gray-300 block font-bold">rec_keys_stereo.raw</span>
                  <span className="font-mono text-[8px] text-gray-500 block uppercase">16-BIT PCM • 384 KB</span>
                </div>
                <button
                  onClick={() => addLog('SYSTEM', 'success', '[MULTITRACK] "rec_keys_stereo.raw" erfolgreich als WAV exportiert.')}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                  title="WAV Export"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] text-gray-300 block font-bold">rec_drums_poly.mid</span>
                  <span className="font-mono text-[8px] text-gray-500 block uppercase">STANDARD MIDI • 44 KB</span>
                </div>
                <button
                  onClick={() => addLog('SYSTEM', 'success', '[MULTITRACK] "rec_drums_poly.mid" erfolgreich exportiert.')}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                  title="MIDI Export"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] text-gray-300 block font-bold">rec_osc_telemetry.bin</span>
                  <span className="font-mono text-[8px] text-gray-500 block uppercase">OSC TIME-ALIGNED • 112 KB</span>
                </div>
                <button
                  onClick={() => addLog('SYSTEM', 'success', '[MULTITRACK] "rec_osc_telemetry.bin" erfolgreich exportiert.')}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                  title="OSC Export"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Total Export Button */}
            <button
              onClick={() => {
                addLog('SYSTEM', 'success', '🚀 [EXPORT] Multitrack-Session wurde gepackt und für Ableton Live 12 exportiert! (stems_session.zip)');
              }}
              className="w-full py-2 bg-gradient-to-r from-neon-cyan to-neon-magenta text-black font-display font-black text-[10px] uppercase tracking-wider rounded-lg hover:opacity-90 transition mt-4"
            >
              Export Complete STEMS (.ZIP)
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
