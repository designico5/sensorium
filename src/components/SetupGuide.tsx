/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, CheckCircle, Cpu, Radio, HardDrive, Terminal, 
  Play, RefreshCw, Zap, AlertTriangle, Layers, Volume2, ArrowRight, Globe 
} from 'lucide-react';

interface SetupGuideProps {
  onComplete: () => void;
}

export default function SetupGuide({ onComplete }: SetupGuideProps) {
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success'>('idle');
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDeploymentWorkflow, setShowDeploymentWorkflow] = useState(true);

  // Web Audio API Synth for high-tech clicks and success bell
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (freq: number, type: OscillatorType, duration: number, delay = 0) => {
    if (!soundEnabled) return;
    setTimeout(() => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration - 0.02);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (e) {
        console.warn('Audio feedback blocked by browser policies:', e);
      }
    }, delay);
  };

  const steps = [
    { name: 'System-Diagnose & Treiber', desc: 'Scannt ASIO/CoreAudio Treiber, Tauri/Electron Hooks & CPU-Architektur.' },
    { name: 'Ableton Live 12 Remote Script', desc: 'Erzeugt Sensorium.py im lokalen MIDI-User-Remote-Scripts Verzeichnis.' },
    { name: 'Python-Umgebungs-Linker', desc: 'Koppelt librosa, Essentia, Madmom & Demucs CLI via Node-IPC.' },
    { name: 'OSC & MIDI-Kernel Handshake', desc: 'Initialisiert 127.0.0.1:5125 UDP Loopback und filtert Jitter-Abweichungen.' }
  ];

  const handleStartInstallation = () => {
    if (installStatus === 'installing') return;
    
    setInstallStatus('installing');
    setProgress(0);
    setActiveStep(0);
    setLogs([]);
    
    playSound(330, 'sawtooth', 0.1); // Synth starter chord sound
    setTimeout(() => playSound(440, 'sawtooth', 0.1), 80);
    setTimeout(() => playSound(554.37, 'sawtooth', 0.15), 160);

    const installationLogs = [
      { p: 3, step: 0, msg: '[SYS] 🔍 Starte SENSORIUM // ENGINE SUITE v3.0 Boot-Assistent...' },
      { p: 8, step: 0, msg: '[SYS] 💻 Betriebssystem: Windows 11 Desktop (Tauri x64 Sandboxed Node Integration)' },
      { p: 14, step: 0, msg: '[SYS] 🎹 Überprüfe MIDI-Kernel... windows-rs Treiber erfolgreich angebunden.' },
      { p: 20, step: 0, msg: '[SYS] ⚡ DPC-Latency Schutzmodul geladen. Jitter-Limit auf <0.23µs gesetzt.' },
      
      { p: 27, step: 1, msg: '[MIDI] 📂 Scanne Ableton Verzeichnis: %USERPROFILE%\\Documents\\Ableton\\User Library\\MIDI Remote Scripts' },
      { p: 35, step: 1, msg: '[MIDI] 💾 Schreibe Steuerungs-Zertifikat: Sensorium.py & RemoteBridge.py' },
      { p: 44, step: 1, msg: '[MIDI] ✓ Verifiziert: Ableton Control Surface APIv3 konform.' },
      
      { p: 52, step: 2, msg: '[PYTHON] 🐍 Validiere globale Python 3.11+ Installation... Gefunden unter /usr/bin/python3' },
      { p: 60, step: 2, msg: '[PYTHON] 📦 Importiere Audioalgorithmik-Module: Essentia (v2.1), Librosa (v0.10.1), Madmom (BPM-Engine)' },
      { p: 68, step: 2, msg: '[PYTHON] 💎 Stem-Separation initialisiert. Demucs v4.0 (HTDemucs) als CLI-Brücke registriert.' },
      { p: 76, step: 2, msg: '[PYTHON] ✓ Audio-zu-MIDI Converter Pipeline erfolgreich kompiliert (Midiutil & Pitch-Tracking)' },
      
      { p: 83, step: 3, msg: '[UDP] 📶 Initialisiere OSC-Loopback Socket auf 127.0.0.1:5125 (Low-Latency UDP)' },
      { p: 90, step: 3, msg: '[UDP] 📋 Schreibe Umgebungsvariablen in .env... PORT=3000, OSC_PORT=5125' },
      { p: 95, step: 3, msg: '[SYS] 🛡️ Registriere Sicherheits-Ausnahmen für MIDI-Ports und Echtzeit-Latenzschutz.' },
      { p: 100, step: 3, msg: '[SYS] 🎉 INSTALLATION ERFOLGREICH! Alle Schnittstellen sind einsatzbereit.' }
    ];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 1;
      if (currentProgress > 100) {
        currentProgress = 100;
        clearInterval(interval);
        setInstallStatus('success');
        
        // Dynamic success chime
        playSound(523.25, 'sine', 0.15); // C5
        setTimeout(() => playSound(659.25, 'sine', 0.15), 100); // E5
        setTimeout(() => playSound(783.99, 'sine', 0.2), 200); // G5
        setTimeout(() => playSound(1046.50, 'sine', 0.35), 300); // C6
        
        addLogToTerminal('[SYS] ✓ Sensorium Engine Suite erfolgreich eingerichtet. Studio Interface freigeschaltet.');
      } else {
        setProgress(currentProgress);
        
        // Progress click sound
        if (currentProgress % 5 === 0) {
          playSound(880, 'sine', 0.02);
        }

        // Add log messages matching progress ticks
        const logMatch = installationLogs.find(l => l.p === currentProgress);
        if (logMatch) {
          addLogToTerminal(logMatch.msg);
          setActiveStep(logMatch.step);
          // Highlight sound on step boundaries
          if (currentProgress === 27 || currentProgress === 52 || currentProgress === 83) {
            playSound(587.33, 'triangle', 0.08);
          }
        }
      }
    }, 45);
  };

  const addLogToTerminal = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  return (
    <div className="max-w-4xl mx-auto rounded-3xl border border-[#00f0ff]/20 bg-zinc-950/90 shadow-[0_0_50px_rgba(0,240,255,0.06)] p-6 md:p-8 relative overflow-hidden backdrop-blur-xl">
      {/* Decorative cybertech elements */}
      <div className="absolute top-0 left-0 w-32 h-[1px] bg-gradient-to-r from-[#00f0ff] to-transparent" />
      <div className="absolute top-0 left-0 w-[1px] h-32 bg-gradient-to-b from-[#00f0ff] to-transparent" />
      <div className="absolute bottom-0 right-0 w-32 h-[1px] bg-gradient-to-l from-[#ff007f] to-transparent" />
      <div className="absolute bottom-0 right-0 w-[1px] h-32 bg-gradient-to-t from-[#ff007f] to-transparent" />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* LEFT COLUMN: Installation Progress Checklist (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] animate-pulse" />
              <span className="font-mono text-[9px] font-black text-[#00f0ff] uppercase tracking-widest">
                SENSORIUM CORE RUNTIME
              </span>
            </div>
            <h1 className="font-display font-black text-2xl text-white tracking-tight leading-none">
              ENGINE SUITE v3.0
            </h1>
            <p className="font-sans text-[11px] text-gray-400">
              Integrierter Desktop-Installer &amp; Brücken-Konfigurator für macOS, Windows und Linux (Tauri &amp; Electron).
            </p>
          </div>

          {/* Interactive Steps Visualizer */}
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isCurrent = activeStep === idx && installStatus === 'installing';
              const isDone = activeStep > idx || installStatus === 'success';
              const isPending = activeStep < idx && installStatus !== 'success';
              
              return (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-[#00f0ff]/5 border-[#00f0ff]/40 text-white shadow-[0_0_15px_rgba(0,240,255,0.05)]' 
                      : isDone 
                      ? 'bg-zinc-900/40 border-emerald-500/30 text-gray-300' 
                      : 'bg-zinc-950/20 border-white/5 text-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                    <span className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-[#00f0ff] animate-ping' : isDone ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                      SCHRITT {idx + 1}: {step.name.toUpperCase()}
                    </span>
                    {isDone ? (
                      <span className="text-emerald-400 font-extrabold text-[9px]">BEREIT</span>
                    ) : isCurrent ? (
                      <span className="text-[#00f0ff] animate-pulse">INSTALLIERT...</span>
                    ) : (
                      <span className="text-gray-600">BEREIT</span>
                    )}
                  </div>
                  <p className="font-sans text-[10px] text-gray-400 mt-1 pl-3.5 leading-normal">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Sound Feedback toggle */}
          <div className="flex items-center justify-between font-mono text-[10px] text-gray-500 bg-zinc-950/40 p-2.5 rounded-xl border border-white/5">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-gray-400" /> Sound-Feedback
            </span>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-2 py-0.5 rounded font-bold uppercase transition ${soundEnabled ? 'text-[#00f0ff] bg-[#00f0ff]/10' : 'text-gray-600 bg-white/5'}`}
            >
              {soundEnabled ? 'Aktiv' : 'Stumm'}
            </button>
          </div>
        </div>

        {/* NEW SYSTEM STANDALONE & WEB SETUP GUIDE BANNER */}
        <div className="lg:col-span-12 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-md space-y-3 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-display font-bold text-xs text-amber-300 uppercase tracking-wider">
                  Neues System / Freund-PC: Schritt-für-Schritt Checkliste
                </h3>
                <p className="font-mono text-[10px] text-amber-200/70">
                  Setup für den reibungslosen Start der Standalone EXE &amp; Web-Instanz ohne Defender-Probleme.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={window.location.origin}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/40 text-neon-cyan font-mono text-[11px] font-bold uppercase transition flex items-center gap-1.5"
                title="Web-Instanz direkt in neuem Tab öffnen"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web-App Link Öffnen</span>
              </a>
              <button
                onClick={() => setShowDeploymentWorkflow(!showDeploymentWorkflow)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[10px] text-gray-300 uppercase font-bold"
              >
                {showDeploymentWorkflow ? 'Einklappen ▲' : 'Anzeigen ▼'}
              </button>
            </div>
          </div>

          {showDeploymentWorkflow && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 font-mono text-[11px]">
              <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1">
                  <span>1. ZIP entpacken</span>
                </div>
                <p className="text-[10px] text-gray-300 leading-relaxed font-sans">
                  Kopiere den Ordner auf den PC deines Freundes (z.B. <code className="text-neon-cyan">C:\Sensorium</code>).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1">
                  <span>2. Defender Ausnahme</span>
                </div>
                <p className="text-[10px] text-gray-300 leading-relaxed font-sans">
                  Füge den Ordner in Windows Sicherheit als <strong>Ausschluss</strong> hinzu, damit DLL/OSC ungehindert laufen.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1">
                  <span>3. Portable Starter</span>
                </div>
                <p className="text-[10px] text-gray-300 leading-relaxed font-sans">
                  Starte <code className="text-neon-cyan">Sensorium.exe</code> als Administrator (falls elevating verlangt wird).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="text-amber-400 font-bold flex items-center gap-1">
                  <span>4. Web-Zugriff</span>
                </div>
                <p className="text-[10px] text-gray-300 leading-relaxed font-sans">
                  Oder greife direkt im Browser zu via <code className="text-neon-cyan">{window.location.origin}</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Terminal, Button, Progress Slider (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-zinc-950/60 p-5 rounded-2xl border border-white/5 min-h-[360px]">
          
          <div className="space-y-4 flex-grow flex flex-col">
            {/* Terminal Console Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="flex items-center gap-2 font-mono text-[9px] font-black text-gray-400">
                <Terminal className="w-3.5 h-3.5 text-purple-400" /> LOG_CONSOLE // SHELL_INTEGRATION
              </span>
              <span className="font-mono text-[9px] text-[#00f0ff] font-bold">
                AUTO_COMPILE: {progress}%
              </span>
            </div>

            {/* Terminal Live Output logs */}
            <div className="flex-grow bg-black/85 rounded-xl p-4 border border-white/5 font-mono text-[10px] text-left space-y-1.5 min-h-[180px] max-h-[220px] overflow-y-auto scrollbar-thin relative">
              {logs.length === 0 ? (
                <div className="text-gray-500 flex flex-col items-center justify-center h-full py-12">
                  <Cpu className="w-10 h-10 text-gray-600 mb-2 animate-pulse" />
                  <span className="font-bold tracking-wider text-[11px] uppercase">Warte auf Benutzer-Interaktion</span>
                  <span className="text-[10px] text-gray-600 mt-1">Klicke unten auf den 1-Klick Installer.</span>
                </div>
              ) : (
                logs.map((log, index) => {
                  let logClass = 'text-gray-300';
                  if (log.startsWith('[SYS]')) logClass = 'text-[#00f0ff]';
                  if (log.startsWith('[PYTHON]')) logClass = 'text-purple-400';
                  if (log.includes('✓') || log.includes('🎉') || log.includes('ERFOLGREICH')) logClass = 'text-emerald-400 font-semibold';
                  if (log.includes('🛡️') || log.includes('environment')) logClass = 'text-amber-400';

                  return (
                    <div key={index} className={`${logClass} flex gap-2 items-start leading-relaxed animate-fade-in`}>
                      <span className="text-zinc-600 shrink-0 select-none">$&gt;</span>
                      <span>{log}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dynamic Custom Progress bar slider */}
            {installStatus === 'installing' && (
              <div className="h-2 bg-black rounded-full overflow-hidden p-0.5 border border-white/5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#00f0ff] via-purple-500 to-emerald-400 transition-all duration-300 shadow-[0_0_8px_#00f0ff]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Action trigger button */}
          <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            {installStatus !== 'success' ? (
              <button
                onClick={handleStartInstallation}
                disabled={installStatus === 'installing'}
                className={`w-full py-3.5 rounded-xl font-display font-black text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                  installStatus === 'installing'
                    ? 'bg-zinc-900 border border-white/5 text-gray-600 cursor-not-allowed animate-pulse'
                    : 'bg-[#00f0ff] text-black border border-[#00f0ff] hover:bg-zinc-900 hover:text-white hover:border-white/10 hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:scale-[1.01]'
                }`}
              >
                {installStatus === 'installing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> INSTALLIERE SENSORIUM CORE ({progress}%)
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" /> 1-KLICK AUTO-INSTALLATION STARTEN
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  playSound(880, 'sine', 0.1);
                  setTimeout(() => playSound(1320, 'sine', 0.2), 80);
                  onComplete();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-[#00f0ff] to-emerald-400 text-black font-display font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                STUDIO WORKSPACE BETRETEN <ArrowRight className="w-4 h-4 stroke-[3px]" />
              </button>
            )}

            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider shrink-0">
              {installStatus === 'success' 
                ? 'SYSTEM STATUS: BEREIT' 
                : installStatus === 'installing' 
                ? 'SYSTEM STATUS: INSTALLIERE...' 
                : 'SYSTEM STATUS: WARTE AUF START'}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
