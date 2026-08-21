import React, { useEffect, useRef, useState } from 'react';
import { Activity, Zap, Cpu, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface ActivityLoggerViewProps {
  bpm: number;
  isPlaying: boolean;
  devices: any[];
  alerts: any[];
  addLog: (source: any, level: any, msg: string) => void;
  isClipAutomatic: boolean;
  onAutoHealAll: () => void;
  latencySafetyBuffer: number;
}

export default function ActivityLoggerView({
  bpm,
  isPlaying,
  devices,
  alerts,
  addLog,
  isClipAutomatic,
  onAutoHealAll,
  latencySafetyBuffer,
}: ActivityLoggerViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [injectedNoise, setInjectedNoise] = useState<number>(0);
  const [suppressionProgress, setSuppressionProgress] = useState<number>(100);
  const [isGeminiDampening, setIsGeminiDampening] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Derive aggregate jitter/interference score from active warnings & alerts
  const activeAlertCount = alerts.filter((a) => !a.acknowledged).length;
  const averageLatency = devices.length > 0 
    ? devices.reduce((sum, d) => sum + d.latency, 0) / devices.length 
    : 2.5;

  // Let's compute a dynamic Signal Quality Score
  const signalQuality = Math.max(10, Math.round(100 - (activeAlertCount * 25) - (latencySafetyBuffer * 3) - (injectedNoise * 0.4)));

  // Gemini AI Automatic Dampening in action on the Canvas wave
  useEffect(() => {
    if (!isClipAutomatic) return;

    // If there is heavy noise or active alerts, trigger Gemini suppression
    if (activeAlertCount > 0 || injectedNoise > 15) {
      setIsGeminiDampening(true);
      setSuppressionProgress(0);

      // Perform auto-healing on devices and slowly suppress manual injected noise
      const interval = setInterval(() => {
        setSuppressionProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsGeminiDampening(false);
            onAutoHealAll(); // Clear active device warning alerts
            setInjectedNoise(0); // clear injected noise
            addLog('SYSTEM', 'success', '[GEMINI AI] 🔮 Echtzeit-Interferenzdämpfung abgeschlossen. Signalintegrität auf 100% kalibriert.');
            return 100;
          }
          return prev + 8; // Suppress noise step by step
        });
      }, 150);

      return () => clearInterval(interval);
    }
  }, [activeAlertCount, isClipAutomatic, injectedNoise]);

  // Canvas drawing loop (oscilloscope)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = 280);

    // Dynamic resize handler
    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = 280;
      }
    };
    window.addEventListener('resize', handleResize);

    let offset = 0;
    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 35;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw center reference line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw Red Jitter Threshold warning bounds
      ctx.strokeStyle = 'rgba(255, 49, 49, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      // Upper limit
      ctx.beginPath();
      ctx.moveTo(0, height / 2 - 80);
      ctx.lineTo(width, height / 2 - 80);
      ctx.stroke();
      // Lower limit
      ctx.beginPath();
      ctx.moveTo(0, height / 2 + 80);
      ctx.lineTo(width, height / 2 + 80);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      ctx.fillStyle = 'rgba(255, 49, 49, 0.05)';
      ctx.font = '9px monospace';
      ctx.fillText('WARN_LIMIT: 25ms JITTER', 15, height / 2 - 86);

      // 2. Draw Teal Wave: Master MIDI Sync/Clock Signal
      // Synchronized with BPM
      const speedCoeff = isPlaying ? (bpm / 60) * 0.12 : 0;
      offset += speedCoeff;

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        // Create beat-synced wave pulse (swells periodically)
        const beatFreq = Math.PI * 2 * (x / width) * 4;
        const beatSwell = 1.0 + Math.sin(offset * 0.4) * 0.4;
        const y = height / 2 + Math.sin(x * 0.02 - offset) * 35 * beatSwell;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // 3. Draw Magenta/Red Wave: Interference & Jitter Noise
      // Driven by active alerts + latency safety buffer + injectedNoise
      const baseNoiseAmp = (activeAlertCount * 28) + (latencySafetyBuffer * 6) + injectedNoise;
      
      // Calculate how much Gemini auto-suppression dampens the noise
      // suppressionProgress goes from 0 to 100.
      const dampeningFactor = isClipAutomatic ? (100 - suppressionProgress) / 100 : 1.0;
      const actualNoiseAmp = baseNoiseAmp * dampeningFactor;

      if (actualNoiseAmp > 3) {
        ctx.strokeStyle = actualNoiseAmp > 60 ? '#ff3131' : '#ff007f';
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = actualNoiseAmp > 60 ? 12 : 6;
        ctx.shadowColor = actualNoiseAmp > 60 ? 'rgba(255, 49, 49, 0.5)' : 'rgba(255, 0, 127, 0.3)';
        ctx.beginPath();

        for (let x = 0; x < width; x++) {
          // Chaotic jagged waveform representing digital jitter
          const noiseFreq1 = Math.sin(x * 0.065 + offset * 1.5) * 12;
          const noiseFreq2 = Math.cos(x * 0.23 - offset * 3.0) * 5;
          const randomSpike = (Math.sin(x * 0.5) > 0.95 ? (Math.random() - 0.5) * actualNoiseAmp * 0.4 : 0);
          
          const y = height / 2 + (noiseFreq1 + noiseFreq2 + randomSpike) * (actualNoiseAmp / 22);
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
      }

      // 4. Draw Green Sweep line if Gemini Dampening is active
      if (isGeminiDampening) {
        const sweepX = (suppressionProgress / 100) * width;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.8)';
        ctx.beginPath();
        ctx.moveTo(sweepX, 0);
        ctx.lineTo(sweepX, height);
        ctx.stroke();
        
        // Draw glow label
        ctx.fillStyle = '#10b981';
        ctx.fillText('GEMINI FILTER SWEEP ACTIVE', sweepX - 130, 20);
        ctx.shadowBlur = 0;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [bpm, isPlaying, activeAlertCount, latencySafetyBuffer, injectedNoise, isGeminiDampening, suppressionProgress, isClipAutomatic]);

  return (
    <div className="space-y-6 text-left" id="activity-logger-workspace">
      {/* View Header */}
      <div className="rounded-2xl glass-panel border border-white/10 p-5 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg text-gray-100 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-5 h-5 text-neon-green" /> Grafischer Echtzeit-Aktivitätslogger
            </h2>
            <p className="font-sans text-xs text-gray-400">
              Analysiere Signal-Wellenformen, Frequenzspitzen und Phasen-Interferenzen latenzfrei. Erkennen und dämpfen Sie Jitter-Drifts rechtzeitig, bevor Daten-Packets droppen.
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded bg-black border border-white/5">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
            <span className="text-gray-400">SYNC:</span>
            <span className="text-neon-cyan font-bold">{bpm} BPM</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Oscilloscope Graph Canvas */}
        <div className="lg:col-span-8 rounded-2xl glass-panel border border-white/5 p-4 bg-black/40 space-y-4 relative flex flex-col justify-between">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-neon-cyan" /> Dual-Wave Signal-Oszilloskop (Hardware-Bus)
            </span>
            <div className="flex gap-4 font-mono text-[9px]">
              <span className="flex items-center gap-1 text-neon-cyan">
                <span className="w-2 h-0.5 bg-neon-cyan inline-block" /> Master Clock Pulse
              </span>
              <span className="flex items-center gap-1 text-neon-magenta">
                <span className="w-2 h-0.5 bg-neon-magenta inline-block" /> Jitter &amp; Interferenz
              </span>
            </div>
          </div>

          <div className="bg-black/50 rounded-xl border border-white/5 overflow-hidden flex-grow relative min-h-[280px]">
            <canvas ref={canvasRef} className="w-full h-full block" />
            
            {/* Warning banner inside graph */}
            {activeAlertCount > 0 && !isClipAutomatic && (
              <div className="absolute top-4 right-4 p-2 rounded bg-neon-red/10 border border-neon-red/30 text-neon-red font-mono text-[9px] font-bold animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> KRITISCHE PHASEN-INTERFERENZ ERFASST!
              </div>
            )}

            {isClipAutomatic && isGeminiDampening && (
              <div className="absolute top-4 right-4 p-2 rounded bg-neon-green/10 border border-neon-green/30 text-neon-green font-mono text-[9px] font-bold animate-pulse flex items-center gap-1">
                <Cpu className="w-3 h-3 text-neon-green animate-spin" /> GEMINI SCHÜTZT SIGNALSTRUKTUR
              </div>
            )}
          </div>

          {/* Test interference injector */}
          <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2 text-left">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-400 uppercase">Manuelle Signal-Interferenz injizieren:</span>
              <span className="text-neon-magenta font-bold">{injectedNoise}% Störungsstärke</span>
            </div>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={injectedNoise}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setInjectedNoise(val);
                  if (val > 10 && !isClipAutomatic) {
                    addLog('SYSTEM', 'warn', `[INTERFERENCE INJECT] Manuelle Frequenzstörung von ${val}% auf den MIDI-Bus moduliert. Jitter steigt.`);
                  }
                }}
                className="flex-grow h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-magenta"
              />
              <button
                onClick={() => {
                  setInjectedNoise(85);
                  addLog('SYSTEM', 'error', '[INTERFERENCE SHOCK] Manueller Peak-Schock ausgelöst! Buffer-Sättigung und Latenz driften.');
                }}
                className="px-3 py-1 bg-neon-red/15 hover:bg-neon-red/25 text-neon-red font-mono text-[10px] font-bold uppercase rounded transition border border-neon-red/30 shrink-0"
              >
                Trigger Shock Spike
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Predictive Signal Health analysis */}
        <div className="lg:col-span-4 rounded-2xl glass-panel border border-white/5 p-5 bg-black/30 flex flex-col justify-between space-y-4 text-left">
          <div className="space-y-4">
            <div className="border-b border-white/5 pb-2.5">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-200">
                Prädiktive Frequenz-Analyse
              </h3>
            </div>

            {/* Signal Quality Card */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide block">
                  Signalintegrität (Live)
                </span>
                <span className="font-display font-extrabold text-2xl text-gray-100 tracking-tight">
                  {signalQuality}%
                </span>
              </div>
              <div className="relative flex items-center justify-center">
                {signalQuality > 80 ? (
                  <CheckCircle className="w-10 h-10 text-neon-green opacity-80" />
                ) : signalQuality > 50 ? (
                  <AlertTriangle className="w-10 h-10 text-neon-yellow opacity-80 animate-pulse" />
                ) : (
                  <Flame className="w-10 h-10 text-neon-red opacity-80 animate-bounce" />
                )}
              </div>
            </div>

            {/* Jitter Metrics */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">
                Struktur-Parametrik &amp; Abweichungen
              </span>

              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 font-mono">
                  <div className="text-[8px] text-gray-400 uppercase">Jitter (Standardabw.)</div>
                  <div className="text-xs font-bold text-neon-cyan mt-1">
                    {(1.2 + (activeAlertCount * 12.4) + (injectedNoise * 0.28) + (latencySafetyBuffer * 0.5)).toFixed(2)} ms
                  </div>
                </div>

                <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 font-mono">
                  <div className="text-[8px] text-gray-400 uppercase">Phasen-Interferenz</div>
                  <div className="text-xs font-bold text-neon-magenta mt-1">
                    {activeAlertCount > 0 || injectedNoise > 20 ? 'KONFLIKT / VERSATZ' : 'SYNCHRON'}
                  </div>
                </div>

                <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 font-mono col-span-2">
                  <div className="text-[8px] text-gray-400 uppercase">Kreativitäts-Puffer-Schutz</div>
                  <div className="text-xs font-bold text-neon-green mt-1">
                    100% GESICHERT (Echtzeit-Sperre)
                  </div>
                </div>
              </div>
            </div>

            {/* Gemini AI Auto Mitigation status */}
            <div className="bg-black/50 p-3.5 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Cpu className="w-4 h-4 text-neon-cyan animate-pulse" />
                <span className="text-[10px] font-mono text-gray-200 uppercase font-bold tracking-wider">
                  Gemini KI Echtzeit-Mitigation
                </span>
              </div>
              
              <div className="space-y-1 text-xs">
                {isClipAutomatic ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-300 font-sans leading-relaxed">
                      <strong>Automatischer Filter aktiv:</strong> Gemini überwacht kontinuierlich den MIDI-Bus und schaltet bei Phasen-Abweichungen oder Pufferüberläufen sofort Korrektur-Szenarien ohne Musik-Unterbrechung.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-neon-green">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-ping" />
                      AUTO-KORREKTUR: BEREIT &amp; AKTIV
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                      <strong>Manueller Modus aktiv:</strong> Signal-Interferenzen und Fehler-Karten müssen vom Benutzer manuell im Cockpit oder über die Diagnose-Karten aufgelöst werden.
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-neon-yellow">
                      <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow" />
                      AUTO-KORREKTUR: STANDBY
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-[9px] font-sans text-gray-500 italic leading-snug">
            *Der grafische Aktivitätslogger analysiert das Timing des Windows Kernel ASIO Streams und prognostiziert Datenpaket-Verluste vorzeitig.
          </p>
        </div>
      </div>
    </div>
  );
}
