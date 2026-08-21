import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Download, 
  Volume2, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Sliders, 
  ShieldCheck, 
  Flame, 
  Terminal, 
  ExternalLink,
  ChevronRight,
  Eye,
  Monitor,
  Music,
  Share2
} from 'lucide-react';

interface PressKitViewProps {
  addLog: (source: string, level: 'info' | 'success' | 'warn' | 'error', message: string) => void;
  language: 'de' | 'en';
}

export default function PressKitView({ addLog, language }: PressKitViewProps) {
  const [activeVoice, setActiveVoice] = useState<'cyberpunk' | 'scientific' | 'minimalist'>('cyberpunk');
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  const synthIntervalRef = useRef<any>(null);
  const canvasRef1 = useRef<HTMLCanvasElement>(null);
  const canvasRef2 = useRef<HTMLCanvasElement>(null);
  const canvasRef3 = useRef<HTMLCanvasElement>(null);

  // Triggering text-to-speech for trailer auditioning
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const trailerScripts = {
    cyberpunk: {
      titleDe: "The Cyberpunk (Der Geist des Undergrounds)",
      titleEn: "The Cyberpunk (Spirit of the Underground)",
      textDe: "Dunkle Clubs. Schweißüberströmter Beton. Kabelchaos. Ein einzelner Aussetzer trennt dich vom totalen Abriss. Bis jetzt. Sensorium tritt als eisernes Schild zwischen dein Live-Set und das drohende Chaos. Null Jitter. Null hängende Noten. Ein pulsierendes, unzerstörbares Nervensystem. Wenn die Meute tobt, weicht die Angst der absoluten Ekstase. Willkommen im Safe-Mode der Performance-Evolution.",
      textEn: "Dark warehouses. Sweat-dripping concrete. Modular chaos. A single digital glitch is all that separates your live set from absolute failure. Until now. Sensorium acts as a physical shield between your performance and the chaos of the stage. Zero jitter. Zero stuck notes. An indestructible neural connection. When the warehouse erupts, fear gives way to pure energy. Welcome to the failsafe future of live music."
    },
    scientific: {
      titleDe: "The Scientific Expert (Präzisions-Ingenieurwesen)",
      titleEn: "The Scientific Expert (Precision Engineering)",
      textDe: "Das Signal ist alles. Wir messen Zuverlässigkeit nicht in Hoffnungen, sondern in Mikrosekunden. Sensorium analysiert eingehende Audiosströme simultan durch fünf Spektral- und Phasen-Algorithmen. Mit unserem Phase-Locked-Loop Sync und dem Echtzeit-Latenzpuffer bändigen wir physischen Takt-Jitter auf weniger als 0.02ms. Ein hochpräzises, fehlerbereinigendes Routing, das im Ernstfall die Master-Clock unantastbar sperrt. Reine Wissenschaft, perfektioniert für die Bühne.",
      textEn: "The signal is everything. We do not measure stability in wishes, but in microseconds. Sensorium processes multi-channel signals through five discrete spectral- and phase-analysis algorithms. Utilizing advanced phase-locked loop synchronization, we compress clock-jitter down to less than 0.02 milliseconds. A hyper-accurate, self-healing routing engine that physically immunizes your master clock. Pure engineering, tailored for elite live performance."
    },
    minimalist: {
      titleDe: "The Minimalist Performer (Die reine Symbiose)",
      titleEn: "The Minimalist Performer (Pure Symbiosis)",
      textDe: "Keine Ablenkung. Nur du, die Maschinen und der Raum. Sensorium ist die stille Kraft im Hintergrund, die unsichtbar über dein Setup wacht. Schließe deine Augen. Lass die Kontrolle los. Die Plattform atmet im Einklang mit deiner Musik, harmonisiert deine Signale und lässt dich ganz im Jetzt verweilen. Es gibt keine Ausfälle mehr. Es gibt nur noch den reinen Ausdruck des Augenblicks.",
      textEn: "No distractions. Just you, the synthesizers, and the room. Sensorium is the quiet force in the shadows, invisibly guarding your ecosystem. Close your eyes. Relinquish control. The platform breathes in rhythm with your sequence, aligning data streams so you can stay fully in the moment. No more fear of crashes. Only the pure, unfiltered connection between artist and instrument."
    }
  };

  // Canvas animations for high-end preview cards
  useEffect(() => {
    // Canvas 1: Spectral Waveform Analyzer
    const ctx1 = canvasRef1.current?.getContext('2d');
    let animId1: number;
    let phase1 = 0;
    
    const draw1 = () => {
      if (!canvasRef1.current || !ctx1) return;
      const width = canvasRef1.current.width;
      const height = canvasRef1.current.height;
      ctx1.fillStyle = 'rgba(5, 5, 8, 0.2)';
      ctx1.fillRect(0, 0, width, height);
      
      // Draw grid lines
      ctx1.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx1.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx1.beginPath();
        ctx1.moveTo(i, 0);
        ctx1.lineTo(i, height);
        ctx1.stroke();
      }
      for (let i = 0; i < height; i += 30) {
        ctx1.beginPath();
        ctx1.moveTo(0, i);
        ctx1.lineTo(width, i);
        ctx1.stroke();
      }

      // Draw spectral wave
      ctx1.lineWidth = 2;
      ctx1.shadowBlur = 8;
      
      // Sine wave 1 (Magenta)
      ctx1.shadowColor = 'rgba(255, 0, 127, 0.5)';
      ctx1.strokeStyle = '#ff007f';
      ctx1.beginPath();
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.015 + phase1) * 25 * Math.sin(x * 0.003);
        if (x === 0) ctx1.moveTo(x, y);
        else ctx1.lineTo(x, y);
      }
      ctx1.stroke();

      // Sine wave 2 (Cyan)
      ctx1.shadowColor = 'rgba(0, 240, 255, 0.5)';
      ctx1.strokeStyle = '#00f0ff';
      ctx1.beginPath();
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.cos(x * 0.02 - phase1) * 18 * Math.sin(x * 0.005 + 1);
        if (x === 0) ctx1.moveTo(x, y);
        else ctx1.lineTo(x, y);
      }
      ctx1.stroke();

      // Sine wave 3 (Gold)
      ctx1.shadowColor = 'rgba(234, 179, 8, 0.3)';
      ctx1.strokeStyle = '#eab308';
      ctx1.beginPath();
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.03 + phase1 * 1.5) * 8 * Math.cos(x * 0.004);
        if (x === 0) ctx1.moveTo(x, y);
        else ctx1.lineTo(x, y);
      }
      ctx1.stroke();

      ctx1.shadowBlur = 0;
      phase1 += 0.04;
      animId1 = requestAnimationFrame(draw1);
    };
    draw1();

    // Canvas 2: Neural Orbit Constellation
    const ctx2 = canvasRef2.current?.getContext('2d');
    let animId2: number;
    let angle2 = 0;
    
    const draw2 = () => {
      if (!canvasRef2.current || !ctx2) return;
      const width = canvasRef2.current.width;
      const height = canvasRef2.current.height;
      ctx2.fillStyle = 'rgba(5, 5, 8, 0.2)';
      ctx2.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw orbit rings
      ctx2.strokeStyle = 'rgba(0, 240, 255, 0.1)';
      ctx2.lineWidth = 1;
      [40, 80, 120].forEach(r => {
        ctx2.beginPath();
        ctx2.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx2.stroke();
      });

      // Draw center node (Master Clock)
      ctx2.shadowBlur = 15;
      ctx2.shadowColor = 'rgba(0, 240, 255, 0.6)';
      ctx2.fillStyle = '#00f0ff';
      ctx2.beginPath();
      ctx2.arc(centerX, centerY, 8 + Math.sin(angle2 * 2) * 2, 0, Math.PI * 2);
      ctx2.fill();

      // Draw planetary nodes
      const nodes = [
        { r: 40, speed: 0.02, color: '#ff007f', shadow: 'rgba(255, 0, 127, 0.5)', size: 5 },
        { r: 80, speed: -0.01, color: '#39ff14', shadow: 'rgba(57, 255, 20, 0.5)', size: 6 },
        { r: 120, speed: 0.005, color: '#eab308', shadow: 'rgba(234, 179, 8, 0.5)', size: 4 }
      ];

      nodes.forEach((n, idx) => {
        const currentAngle = angle2 * n.speed * 10;
        const x = centerX + Math.cos(currentAngle) * n.r;
        const y = centerY + Math.sin(currentAngle) * n.r;

        // Draw connection line to center
        ctx2.shadowBlur = 0;
        ctx2.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx2.beginPath();
        ctx2.moveTo(centerX, centerY);
        ctx2.lineTo(x, y);
        ctx2.stroke();

        // Draw node
        ctx2.shadowBlur = 10;
        ctx2.shadowColor = n.shadow;
        ctx2.fillStyle = n.color;
        ctx2.beginPath();
        ctx2.arc(x, y, n.size, 0, Math.PI * 2);
        ctx2.fill();
      });

      ctx2.shadowBlur = 0;
      angle2 += 0.05;
      animId2 = requestAnimationFrame(draw2);
    };
    draw2();

    // Canvas 3: Holographic Safe-Lock Shield
    const ctx3 = canvasRef3.current?.getContext('2d');
    let animId3: number;
    let pulse3 = 0;
    
    const draw3 = () => {
      if (!canvasRef3.current || !ctx3) return;
      const width = canvasRef3.current.width;
      const height = canvasRef3.current.height;
      ctx3.fillStyle = 'rgba(5, 5, 8, 0.2)';
      ctx3.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw pulsing radar rings
      ctx3.strokeStyle = `rgba(57, 255, 20, ${0.15 - Math.sin(pulse3) * 0.05})`;
      ctx3.lineWidth = 1.5;
      const radius = 60 + Math.sin(pulse3) * 15;
      ctx3.beginPath();
      ctx3.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx3.stroke();

      // Draw hexagonal shield grid
      ctx3.strokeStyle = 'rgba(57, 255, 20, 0.3)';
      ctx3.shadowBlur = 12;
      ctx3.shadowColor = 'rgba(57, 255, 20, 0.5)';
      ctx3.lineWidth = 2;
      ctx3.beginPath();
      for (let i = 0; i < 6; i++) {
        const hexAngle = (i * Math.PI) / 3 + pulse3 * 0.2;
        const x = centerX + Math.cos(hexAngle) * 45;
        const y = centerY + Math.sin(hexAngle) * 45;
        if (i === 0) ctx3.moveTo(x, y);
        else ctx3.lineTo(x, y);
      }
      ctx3.closePath();
      ctx3.stroke();

      // Glowing center status
      ctx3.fillStyle = '#39ff14';
      ctx3.beginPath();
      ctx3.arc(centerX, centerY, 5, 0, Math.PI * 2);
      ctx3.fill();

      // Text lock active in monospace
      ctx3.fillStyle = '#39ff14';
      ctx3.shadowBlur = 0;
      ctx3.font = '10px monospace';
      ctx3.textAlign = 'center';
      ctx3.fillText('SAFE MODE ACTIVE', centerX, centerY + 80);

      pulse3 += 0.03;
      animId3 = requestAnimationFrame(draw3);
    };
    draw3();

    return () => {
      cancelAnimationFrame(animId1);
      cancelAnimationFrame(animId2);
      cancelAnimationFrame(animId3);
    };
  }, []);

  // Text reader implementation using browser Speech Synthesis
  const handleAuditionVoice = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
      return;
    }

    const script = language === 'de' ? trailerScripts[activeVoice].textDe : trailerScripts[activeVoice].textEn;
    const langCode = language === 'de' ? 'de-DE' : 'en-US';

    addLog('SYSTEM', 'info', `[AUDIO] Starte Voice-Trailer-Audition für "${activeVoice.toUpperCase()}"...`);

    // Reset current timer
    setCurrentTime(0);
    setIsPlaying(true);

    // Audio animation timer Simulation
    synthIntervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= 100) {
          clearInterval(synthIntervalRef.current);
          setIsPlaying(false);
          return 100;
        }
        return prev + 1.2;
      });
    }, 150);

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = langCode;
    utterance.rate = 1.05;
    utterance.pitch = activeVoice === 'cyberpunk' ? 0.75 : activeVoice === 'scientific' ? 0.95 : 1.1;
    
    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(100);
      clearInterval(synthIntervalRef.current);
      addLog('SYSTEM', 'success', `[AUDIO] Trailer-Audition beendet.`);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      clearInterval(synthIntervalRef.current);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Cancel any active speech when switching voices
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentTime(0);
    if (synthIntervalRef.current) clearInterval(synthIntervalRef.current);
  }, [activeVoice]);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    addLog('SYSTEM', 'success', `[COPY] Pressetext-Kategorie "${label}" kopiert!`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleCopyColor = (colorHex: string) => {
    navigator.clipboard.writeText(colorHex);
    setCopiedColor(colorHex);
    addLog('SYSTEM', 'success', `[COLOR] Farbcode ${colorHex} kopiert!`);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Generate the full standalone, single-file HTML website with CSS animations & interactive elements
  const handleExportPressKitHTML = () => {
    addLog('SYSTEM', 'info', '[EXPORT] Verpacke High-Fidelity Presse-Portal mit interaktiven Echtzeit-Visuals in eine transportable HTML-Datei...');

    const standaloneHTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SENSORIUM • Exclusive Press Portal & Product Kit</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
    
    :root {
      --neon-cyan: #00f0ff;
      --neon-magenta: #ff007f;
      --failsafe-green: #39ff14;
      --cosmic-slate: #050508;
      --luxury-gold: #eab308;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--cosmic-slate);
      color: #e5e7eb;
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
      line-height: 1.6;
    }

    /* Ambient Cinematic Lighting Effects */
    .glowing-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      background: 
        radial-gradient(circle at 10% 20%, rgba(0, 240, 255, 0.03) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(255, 0, 127, 0.03) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, rgba(57, 255, 20, 0.02) 0%, transparent 50%);
    }

    header {
      position: relative;
      padding: 100px 20px 60px 20px;
      text-align: center;
      z-index: 10;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(234, 179, 8, 0.1);
      border: 1px solid var(--luxury-gold);
      color: var(--luxury-gold);
      border-radius: 9999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 20px;
      box-shadow: 0 0 15px rgba(234, 179, 8, 0.1);
    }

    h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 4rem;
      letter-spacing: -2px;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .tagline {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: var(--neon-cyan);
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 30px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 60px 20px;
      position: relative;
      z-index: 10;
    }

    /* Dynamic Interactive Cards Grid */
    .visual-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 30px;
      margin-bottom: 80px;
    }

    .card {
      background: rgba(10, 10, 15, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 24px;
      transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }

    .card:hover {
      transform: translateY(-5px);
      border-color: rgba(0, 240, 255, 0.2);
      box-shadow: 0 10px 40px rgba(0, 240, 255, 0.05);
    }

    .card-canvas {
      width: 100%;
      height: 180px;
      background: #030305;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .card-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.25rem;
      color: white;
      margin-bottom: 10px;
    }

    .card-desc {
      font-size: 0.875rem;
      color: #9ca3af;
      line-height: 1.6;
    }

    /* Press Release Text Area */
    .press-release-box {
      background: rgba(10, 10, 15, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.03);
      border-radius: 20px;
      padding: 40px;
      margin-bottom: 80px;
      backdrop-filter: blur(10px);
    }

    .press-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .press-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #6b7280;
    }

    .press-body {
      font-size: 1.05rem;
      line-height: 1.8;
      color: #d1d5db;
    }

    .press-body p {
      margin-bottom: 24px;
    }

    .press-body h2 {
      font-family: 'Space Grotesk', sans-serif;
      color: white;
      font-size: 1.75rem;
      margin: 40px 0 20px 0;
      border-left: 3px solid var(--neon-cyan);
      padding-left: 15px;
    }

    .pillar-list {
      list-style-type: none;
      margin-bottom: 30px;
    }

    .pillar-item {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .pillar-item strong {
      color: var(--neon-cyan);
      display: block;
      margin-bottom: 5px;
      font-family: 'Space Grotesk', sans-serif;
    }

    /* Audio Trailer Interface */
    .audio-section {
      background: radial-gradient(100% 100% at 50% 0%, rgba(234, 179, 8, 0.04) 0%, transparent 100%), rgba(8, 8, 12, 0.8);
      border: 1px solid rgba(234, 179, 8, 0.15);
      border-radius: 20px;
      padding: 40px;
      margin-bottom: 80px;
    }

    .audio-title {
      font-family: 'Space Grotesk', sans-serif;
      color: white;
      font-size: 2rem;
      margin-bottom: 10px;
    }

    .audio-subtitle {
      font-family: 'JetBrains Mono', monospace;
      color: var(--luxury-gold);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 30px;
    }

    .voice-tabs {
      display: flex;
      gap: 15px;
      margin-bottom: 30px;
    }

    .voice-btn {
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      transition: all 0.3s;
    }

    .voice-btn.active {
      background: rgba(234, 179, 8, 0.1);
      border-color: var(--luxury-gold);
      color: var(--luxury-gold);
      font-weight: bold;
    }

    .script-viewer {
      background: #030305;
      border-radius: 12px;
      padding: 24px;
      font-family: 'Inter', sans-serif;
      font-style: italic;
      color: #e5e7eb;
      border: 1px solid rgba(255, 255, 255, 0.02);
      margin-bottom: 30px;
    }

    .copy-button {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s;
    }

    .copy-button:hover {
      background: white;
      color: black;
    }

    /* Footer styling */
    footer {
      text-align: center;
      padding: 60px 20px;
      color: #4b5563;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
  </style>
</head>
<body>
  <div class="glowing-bg"></div>
  
  <header>
    <div class="badge">Official Press Kit • Elite Tier Release</div>
    <h1>SENSORIUM</h1>
    <p class="tagline">The Failsafe Neural System for Live Electronics</p>
  </header>

  <div class="container">
    <div class="visual-grid">
      <!-- Card 1 -->
      <div class="card">
        <canvas id="specCanvas" class="card-canvas"></canvas>
        <h3 class="card-title">Spektraldaten Core Hub</h3>
        <p class="card-desc">Fünffach parallele Echtzeit-Analyse über asynchrone mathematische Extraktions-Algorithmen.</p>
      </div>
      <!-- Card 2 -->
      <div class="card">
        <canvas id="orbitCanvas" class="card-canvas"></canvas>
        <h3 class="card-title">Neuronale Orbit Matrix</h3>
        <p class="card-desc">Interaktives physikgesteuertes Orbit-D3 System zur Echtzeit-Zuweisung aller Signale.</p>
      </div>
      <!-- Card 3 -->
      <div class="card">
        <canvas id="lockCanvas" class="card-canvas"></canvas>
        <h3 class="card-title">Safe-Mode Lock System</h3>
        <p class="card-desc">Holographischer Notfall-Schild zum Schutz hochsensibler Takt- und Audioroutings im Ernstfall.</p>
      </div>
    </div>

    <!-- Audio Section -->
    <div class="audio-section">
      <h2 class="audio-title">The Trailer Prompt Book</h2>
      <p class="audio-subtitle">Interactive Advertising Script Options</p>
      
      <div class="voice-tabs">
        <button class="voice-btn active" onclick="switchVoice('cyberpunk')">THE CYBERPUNK</button>
        <button class="voice-btn" onclick="switchVoice('scientific')">THE SCIENTIFIC EXPERT</button>
        <button class="voice-btn" onclick="switchVoice('minimalist')">THE MINIMALIST</button>
      </div>

      <div class="script-viewer" id="scriptText">
        "Dunkle Clubs. Schweißüberströmter Beton. Kabelchaos. Ein einzelner Aussetzer trennt dich vom totalen Abriss. Bis jetzt. Sensorium tritt als eisernes Schild zwischen dein Live-Set und das drohende Chaos. Null Jitter. Null hängende Noten. Ein pulsierendes, unzerstörbares Nervensystem. Wenn die Meute tobt, weicht die Angst der absoluten Ekstase. Willkommen im Safe-Mode der Performance-Evolution."
      </div>
    </div>

    <!-- Press Release Box -->
    <div class="press-release-box">
      <div class="press-header">
        <div class="press-meta">PRESSEMITTEILUNG • ZUR SOFORTIGEN VERÖFFENTLICHUNG</div>
        <div class="press-meta">14. JULI 2026</div>
      </div>
      
      <div class="press-body">
        <h3 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.8rem; margin-bottom: 20px; line-height: 1.3; color: white;">
          SENSORIUM ENTFESSELT DIE NÄCHSTE EVOLUTION DES HYBRIDEN PERFORMENS: DAS ERSTE AUSFALLSICHERE NERVENSYSTEM FÜR LIVE-ELEKTRONIK
        </h3>
        
        <p><strong>München/London</strong> – Das Software-Kollektiv Sensorium hat heute die Veröffentlichung seiner gleichnamigen Performance-Schaltzentrale bekannt gegeben. <strong>Sensorium</strong> löst das größte, ungesagte Problem der modernen elektronischen Livemusik: die inhärente Instabilität hybrider Setups aus analogen Synthesizern, MIDI-Controllern und digitalen DAWs. Als intelligenter "Live-Puffer" fungiert die Plattform als neuronales Bindeglied, das Echtzeit-Audioanalyse mit einem hochgradig resilienten Hardware-Management kombiniert und Musikern eine Nullfehlerquote-Garantie auf der Bühne bietet.</p>
        
        <p>"Moderne hybride Live-Sets sind hochkomplexe Systeme, bei denen ein einzelner Jitter-Spike oder eine hängengebliebene MIDI-Note die gesamte Performance ruinieren kann", erklärt das Entwicklerteam. "Sensorium ist die Antwort. Es ist kein sequenzieller Tracker, sondern ein lebendiges, mitdenkendes Nervensystem, das Fehler antizipiert, Signalströme interaktiv visualisiert und im Ernstfall per Ein-Klick-Aktivierung das gesamte Setup immunisiert."</p>

        <h2>Die vier technologischen Säulen</h2>
        <ul class="pillar-list">
          <li class="pillar-item">
            <strong>1. Spektraler & Algorithmischer DAW Production Hub</strong>
            Eine parallele Analyse-Engine, die einlaufendes Audio simultan durch fünf Algorithmen schleust: Spektraldaten, Beat-Tracking, harmonische Analyse, RMS-Loudness und modernste, asynchrone Machine-Learning-Segmentierung.
          </li>
          <li class="pillar-item">
            <strong>2. Die Graphische Signal-Matrix (Neuronale Mindmap)</strong>
            Ein interaktives, physikgesteuertes Orbit-System mit fünf transformierbaren Ansichten. Künstler können die Signalwege zu ihren physischen Geräten frei zuweisen: Ausgehend, Eingehend oder im beidseitigen Full Duplex Sync.
          </li>
          <li class="pillar-item">
            <strong>3. Das One-Click Worst-Case Safe-Mode Cockpit</strong>
            Ein holographischer Notfall-Schild für kritische Momente auf der Bühne. Mit nur einem Klick wird ein vollautomatisches Schutzprotokoll gestartet: Sichern der RAM-Zustände, Anheben der Latenzsicherheit auf stabile +15ms, Takt-Jitter-Kompensation und Stummschaltung hängender MIDI-Noten.
          </li>
          <li class="pillar-item">
            <strong>4. Stage Safety System (Live-Locked Patch Matrix & Slip Nudge)</strong>
            Um Fehlbedienungen im Eifer des Auftritts zu verhindern, verfügt der Depeche Mode Multi-Synth Program Change Router über eine physische System-Sperre. Ergänzt durch den Carl Cox Slip Beat Slider für haptisch-visuelle Clock-Feedback Loops.
          </li>
        </ul>
      </div>
    </div>
  </div>

  <footer>
    Sensorium v2.0.0 • Professional Music Performance Pipeline • Generated for VIP Press Distribution
  </footer>

  <script>
    const scripts = {
      cyberpunk: "Dunkle Clubs. Schweißüberströmter Beton. Kabelchaos. Ein einzelner Aussetzer trennt dich vom totalen Abriss. Bis jetzt. Sensorium tritt als eisernes Schild zwischen dein Live-Set und das drohende Chaos. Null Jitter. Null hängende Noten. Ein pulsierendes, unzerstörbares Nervensystem. Wenn die Meute tobt, weicht die Angst der absoluten Ekstase. Willkommen im Safe-Mode der Performance-Evolution.",
      scientific: "Das Signal ist alles. Wir messen Zuverlässigkeit nicht in Hoffnungen, sondern in Mikrosekunden. Sensorium analysiert eingehende Audiosströme simultan durch fünf Spektral- und Phasen-Algorithmen. Mit unserem Phase-Locked-Loop Sync und dem Echtzeit-Latenzpuffer bändigen wir physischen Takt-Jitter auf weniger als 0.02ms. Ein hochpräzises, fehlerbereinigendes Routing, das im Ernstfall die Master-Clock unantastbar sperrt. Reine Wissenschaft, perfektioniert für die Bühne.",
      minimalist: "Keine Ablenkung. Nur du, die Maschinen und der Raum. Sensorium ist die stille Kraft im Hintergrund, die unsichtbar über dein Setup wacht. Schließe deine Augen. Lass die Kontrolle los. Die Plattform atmet im Einklang mit deiner Musik, harmonisiert deine Signale und lässt dich ganz im Jetzt verweilen. Es gibt keine Ausfälle mehr. Es gibt nur noch den reinen Ausdruck des Augenblicks."
    };

    function switchVoice(key) {
      document.querySelectorAll('.voice-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText.includes(key.toUpperCase())) {
          btn.classList.add('active');
        }
      });
      document.getElementById('scriptText').innerText = '"' + scripts[key] + '"';
    }

    // Spec Waveform Canvas Setup
    const specCanvas = document.getElementById('specCanvas');
    const sCtx = specCanvas.getContext('2d');
    let phase = 0;
    
    function animateSpec() {
      sCtx.fillStyle = '#050508';
      sCtx.fillRect(0, 0, specCanvas.width, specCanvas.height);
      sCtx.strokeStyle = '#ff007f';
      sCtx.lineWidth = 2;
      sCtx.beginPath();
      for (let x = 0; x < specCanvas.width; x++) {
        const y = specCanvas.height/2 + Math.sin(x * 0.02 + phase) * 20 * Math.sin(x * 0.005);
        if (x === 0) sCtx.moveTo(x, y);
        else sCtx.lineTo(x, y);
      }
      sCtx.stroke();
      
      sCtx.strokeStyle = '#00f0ff';
      sCtx.beginPath();
      for (let x = 0; x < specCanvas.width; x++) {
        const y = specCanvas.height/2 + Math.cos(x * 0.03 - phase) * 12 * Math.sin(x * 0.007);
        if (x === 0) sCtx.moveTo(x, y);
        else sCtx.lineTo(x, y);
      }
      sCtx.stroke();
      
      phase += 0.04;
      requestAnimationFrame(animateSpec);
    }
    
    // Orbit Canvas Setup
    const orbitCanvas = document.getElementById('orbitCanvas');
    const oCtx = orbitCanvas.getContext('2d');
    let orbitAngle = 0;
    
    function animateOrbit() {
      oCtx.fillStyle = '#050508';
      oCtx.fillRect(0, 0, orbitCanvas.width, orbitCanvas.height);
      const cx = orbitCanvas.width / 2;
      const cy = orbitCanvas.height / 2;
      
      oCtx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      oCtx.beginPath();
      oCtx.arc(cx, cy, 35, 0, Math.PI * 2);
      oCtx.stroke();
      
      oCtx.fillStyle = '#00f0ff';
      oCtx.beginPath();
      oCtx.arc(cx + Math.cos(orbitAngle) * 35, cy + Math.sin(orbitAngle) * 35, 6, 0, Math.PI * 2);
      oCtx.fill();
      
      oCtx.fillStyle = '#ff007f';
      oCtx.beginPath();
      oCtx.arc(cx + Math.cos(-orbitAngle*1.5) * 20, cy + Math.sin(-orbitAngle*1.5) * 20, 4, 0, Math.PI * 2);
      oCtx.fill();
      
      orbitAngle += 0.02;
      requestAnimationFrame(animateOrbit);
    }

    // Lock Canvas Setup
    const lockCanvas = document.getElementById('lockCanvas');
    const lCtx = lockCanvas.getContext('2d');
    let lockPulse = 0;
    
    function animateLock() {
      lCtx.fillStyle = '#050508';
      lCtx.fillRect(0, 0, lockCanvas.width, lockCanvas.height);
      const cx = lockCanvas.width / 2;
      const cy = lockCanvas.height / 2;
      
      lCtx.strokeStyle = \`rgba(57, 255, 20, \${0.3 + Math.sin(lockPulse)*0.1})\`;
      lCtx.lineWidth = 2;
      lCtx.beginPath();
      for(let i=0; i<6; i++) {
        const ang = i * Math.PI / 3 + lockPulse * 0.05;
        const x = cx + Math.cos(ang) * 30;
        const y = cy + Math.sin(ang) * 30;
        if (i===0) lCtx.moveTo(x, y);
        else lCtx.lineTo(x, y);
      }
      lCtx.closePath();
      lCtx.stroke();
      
      lockPulse += 0.05;
      requestAnimationFrame(animateLock);
    }
    
    // Start layout sizing & loops
    function init() {
      [specCanvas, orbitCanvas, lockCanvas].forEach(c => {
        c.width = c.clientWidth;
        c.height = c.clientHeight;
      });
      animateSpec();
      animateOrbit();
      animateLock();
    }
    window.onload = init;
    window.onresize = init;
  </script>
</body>
</html>`;

    const blob = new Blob([standaloneHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Sensorium_PressKit_Elite.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog('SYSTEM', 'success', '[EXPORT] Standalone Elite Press Portal (Sensorium_PressKit_Elite.html) erfolgreich generiert und heruntergeladen!');
  };

  return (
    <div className="space-y-12 text-gray-100 font-sans leading-relaxed animate-fade-in">
      {/* Premium Hero Section */}
      <div className="relative text-center py-10 px-6 rounded-3xl bg-radial-gradient-to-b from-[#0c0d12] to-[#050508] border border-white/5 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.06),transparent_50%)] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-widest shadow-lg shadow-amber-500/5 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Interactive Cinema Experience Hub
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold tracking-tight uppercase text-white mb-2">
          SENSORIUM <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-neon-cyan to-neon-magenta">MEDIA HUB</span>
        </h1>
        <p className="font-mono text-xs text-gray-400 uppercase tracking-[0.3em] max-w-2xl mx-auto mb-8">
          The Premium Press Release & Trailer Deck for Elite Live Performers
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={handleExportPressKitHTML}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(234,179,8,0.25)] hover:scale-105 active:scale-95"
          >
            <Download className="w-4 h-4" /> Export Press Release (.HTML Website)
          </button>
          
          <button
            onClick={() => handleCopyText(
              `SENSORIUM ENTFESSELT DIE NÄCHSTE EVOLUTION DES HYBRIDEN PERFORMENS: DAS ERSTE AUSFALLSICHERE NERVENSYSTEM FÜR LIVE-ELEKTRONIK\n\n` +
              `München/London, 14. Juli 2026 – Das Software-Kollektiv Sensorium hat heute die Veröffentlichung seiner gleichnamigen Performance-Schaltzentrale bekannt gegeben...`, 
              'Full Press Release'
            )}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-mono text-xs uppercase tracking-wider transition-all"
          >
            {copiedText === 'Full Press Release' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy Full Release Plaintext
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Interactive Visualizer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Wave Analyzer */}
        <div className="group relative bg-[#090a0f] border border-white/5 rounded-2xl p-6 transition-all hover:border-neon-magenta/40 hover:shadow-2xl hover:shadow-neon-magenta/5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-magenta to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative mb-4 h-44 rounded-lg bg-black/60 overflow-hidden border border-white/5">
            <canvas ref={canvasRef1} className="w-full h-full" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-neon-magenta/25 text-neon-magenta font-mono text-[9px] border border-neon-magenta/40 uppercase">
              Live Core Spectral
            </div>
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-2 group-hover:text-neon-magenta transition-colors">
            1. Spektraler DAW Analytics Core
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Echtzeit-Strukturextraktion durch simultanes Schleusen von Audio-Signalen durch 5 hochkomplexe algorithmische Filterketten.
          </p>
        </div>

        {/* Card 2: Constellation Orbit */}
        <div className="group relative bg-[#090a0f] border border-white/5 rounded-2xl p-6 transition-all hover:border-neon-cyan/40 hover:shadow-2xl hover:shadow-neon-cyan/5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative mb-4 h-44 rounded-lg bg-black/60 overflow-hidden border border-white/5">
            <canvas ref={canvasRef2} className="w-full h-full" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-neon-cyan/25 text-neon-cyan font-mono text-[9px] border border-neon-cyan/40 uppercase">
              D3 Constellation
            </div>
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-2 group-hover:text-neon-cyan transition-colors">
            2. Neuronale Mindmap & Routing
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Ein physik-basiertes, hochgradig transformierbares Node-Netzwerk zur interaktiven Takt- und Synchronisierungssteuerung in Echtzeit.
          </p>
        </div>

        {/* Card 3: Worst Case Mode Lock */}
        <div className="group relative bg-[#090a0f] border border-white/5 rounded-2xl p-6 transition-all hover:border-neon-green/40 hover:shadow-2xl hover:shadow-neon-green/5 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative mb-4 h-44 rounded-lg bg-black/60 overflow-hidden border border-white/5">
            <canvas ref={canvasRef3} className="w-full h-full" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-neon-green/25 text-neon-green font-mono text-[9px] border border-neon-green/40 uppercase">
              Safe-Mode
            </div>
          </div>
          <h3 className="text-lg font-display font-bold text-white mb-2 group-hover:text-neon-green transition-colors">
            3. Worst-Case Safe Cockpit
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            Aktivierung des holographischen Schutzschildes: Pufferspeicherung, automatische Jitter-PLL & absolute Taktimmunisierung.
          </p>
        </div>
      </div>

      {/* Cinematic Ad Copy Auditioning Center */}
      <div className="border border-amber-500/20 bg-gradient-to-b from-[#0c0d12] to-[#040407] rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-amber-400" /> Cinematic Trailer Prompts & Voiceover Auditions
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Testen Sie alternative Werbeskripte live im integrierten Trailer-Player
            </p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start">
            <button
              onClick={() => setActiveVoice('cyberpunk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeVoice === 'cyberpunk' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cyberpunk
            </button>
            <button
              onClick={() => setActiveVoice('scientific')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeVoice === 'scientific' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Scientific
            </button>
            <button
              onClick={() => setActiveVoice('minimalist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeVoice === 'minimalist' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Minimalist
            </button>
          </div>
        </div>

        {/* Player Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-6 italic text-gray-300 relative">
              <span className="absolute top-2 right-3 font-mono text-[9px] text-amber-500/60 uppercase tracking-widest">
                Voiceover Script Text
              </span>
              <p className="text-base sm:text-lg leading-relaxed text-slate-100">
                "{language === 'de' ? trailerScripts[activeVoice].textDe : trailerScripts[activeVoice].textEn}"
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleAuditionVoice}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition ${
                  isPlaying 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-600 text-black'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" /> Stop Auditioning
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current animate-bounce" /> Audition AI Voice Trailer
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopyText(
                  language === 'de' ? trailerScripts[activeVoice].textDe : trailerScripts[activeVoice].textEn, 
                  `Voiceover (${activeVoice})`
                )}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-400 hover:text-white transition"
              >
                {copiedText === `Voiceover (${activeVoice})` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Script!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Script Text
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 bg-black/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-gray-500 tracking-wider mb-4">
                Synthetic Signal Diagnostics
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
                    <span>Speech Flow Rate</span>
                    <span>1.05x</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
                    <span>Pitch Modulation</span>
                    <span>{activeVoice === 'cyberpunk' ? '0.75x' : activeVoice === 'scientific' ? '0.95x' : '1.1x'}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-neon-magenta h-full rounded-full" style={{ width: activeVoice === 'cyberpunk' ? '40%' : activeVoice === 'scientific' ? '65%' : '85%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
                    <span>Interactive Stream Render</span>
                    <span>{Math.round(currentTime)}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-neon-cyan h-full rounded-full transition-all duration-300" style={{ width: `${currentTime}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 mt-6 flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span className="flex items-center gap-1.5">
                <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'text-amber-400 animate-pulse' : 'text-gray-500'}`} />
                {isPlaying ? 'STREAMING ACTIVE' : 'STREAM STANDBY'}
              </span>
              <span>v2.0.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Detailed Written Press Release (Präzise formatierte Pressemitteilung) */}
      <div className="bg-[#08090d] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
          <div>
            <span className="font-mono text-[10px] text-neon-cyan uppercase tracking-widest block">
              PRESSEMITTEILUNG • IMMEDATE RELEASE
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white mt-1">
              Offizieller Pressetext (München / London)
            </h2>
          </div>

          <button
            onClick={() => handleCopyText(
              `SENSORIUM ENTFESSELT DIE NÄCHSTE EVOLUTION DES HYBRIDEN PERFORMENS: DAS ERSTE AUSFALLSICHERE NERVENSYSTEM FÜR LIVE-ELEKTRONIK\n\n` +
              `München/London, 14. Juli 2026 – Das Software-Kollektiv Sensorium hat heute die Veröffentlichung seiner gleichnamigen Performance-Schaltzentrale bekannt gegeben. Sensorium löst das größte, ungesagte Problem der modernen elektronischen Livemusik: die inhärente Instabilität hybrider Setups aus analogen Synthesizern, MIDI-Controllern und digitalen DAWs.\n\n` +
              `Die vier technologischen Säulen:\n` +
              `1. Spektraler & Algorithmischer DAW Production Hub\n` +
              `2. Die Graphische Signal-Matrix\n` +
              `3. Das One-Click Worst-Case Safe-Mode Cockpit\n` +
              `4. Stage Safety System`, 
              'German Press Release Body'
            )}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-mono text-gray-300 transition"
          >
            {copiedText === 'German Press Release Body' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Plaintext!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Kopieren
              </>
            )}
          </button>
        </div>

        <div className="space-y-6 text-sm sm:text-base text-gray-300 leading-relaxed max-w-4xl">
          <h3 className="text-lg sm:text-xl font-display font-bold text-white uppercase tracking-tight leading-snug">
            SENSORIUM ENTFESSELT DIE NÄCHSTE EVOLUTION DES HYBRIDEN PERFORMENS: DAS ERSTE AUSFALLSICHERE NERVENSYSTEM FÜR LIVE-ELEKTRONIK
          </h3>

          <p>
            <strong className="text-white">München/London, 14. Juli 2026</strong> – Das Software-Kollektiv Sensorium hat heute die Veröffentlichung seiner gleichnamigen Performance-Schaltzentrale bekannt gegeben. 
            <strong className="text-neon-cyan"> Sensorium</strong> löst das größte, ungesagte Problem der modernen elektronischen Livemusik: die inhärente Instabilität hybrider Setups aus analogen Synthesizern, MIDI-Controllern und digitalen DAWs. Als intelligenter "Live-Puffer" fungiert die Plattform als neuronales Bindeglied, das Echtzeit-Audioanalyse mit einem hochgradig resilienten Hardware-Management kombiniert und Musikern eine Nullfehlerquote-Garantie auf der Bühne bietet.
          </p>

          <blockquote className="border-l-2 border-amber-400 bg-white/5 p-4 rounded-r-xl italic text-gray-200">
            "Moderne hybride Live-Sets sind hochkomplexe Systeme, bei denen ein einzelner Jitter-Spike oder eine hängengebliebene MIDI-Note die gesamte Performance ruinieren kann. Sensorium ist die Antwort. Es ist kein sequenzieller Tracker, sondern ein lebendiges, mitdenkendes Nervensystem, das Fehler antizipiert, Signalströme interaktiv visualisiert und im Ernstfall per Ein-Klick-Aktivierung das gesamte Setup immunisiert."
          </blockquote>

          <div className="pt-4 space-y-6">
            <h4 className="text-base font-display font-bold text-white uppercase tracking-wider text-neon-cyan">
              Die vier technologischen Säulen von Sensorium:
            </h4>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="font-mono text-xs text-neon-magenta font-bold uppercase tracking-wider block mb-1">
                  Säule 1 • Spektraler Analytics Hub
                </span>
                <p className="text-sm text-gray-300">
                  Eine parallele Analyse-Engine, die einlaufendes Audio simultan durch fünf Algorithmen schleust: Spektraldaten, Beat-Tracking, harmonische Analyse, RMS-Loudness und modernste, asynchrone Machine-Learning-Segmentierung. Songstrukturen werden in Echtzeit extrahiert.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="font-mono text-xs text-neon-cyan font-bold uppercase tracking-wider block mb-1">
                  Säule 2 • Graphische Signal-Matrix
                </span>
                <p className="text-sm text-gray-300">
                  Ein interaktives, D3-physikgesteuertes Orbit-System mit fünf transformierbaren Ansichten (Orbit, Radial, Grid, Constellation, Circuit). Künstler können die Signalwege zu ihren physischen Geräten frei zuweisen: Ausgehend (Clock-Sync), Eingehend (Controller) oder im beidseitigen Full Duplex Sync.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="font-mono text-xs text-neon-green font-bold uppercase tracking-wider block mb-1">
                  Säule 3 • One-Click Worst-Case Safe Cockpit
                </span>
                <p className="text-sm text-gray-300">
                  Ein holographischer Notfall-Schild für kritische Momente auf der Bühne. Mit nur einem Klick wird ein vollautomatisches Schutzprotokoll gestartet: Sichern der RAM-Zustände im flüchtigen Puffer, Anheben der Latenzsicherheit auf stabile +15ms zur Abfangung von CPU-Spikes, Takt-Jitter-Kompensation via PLL-Ausrichtung und Stummschaltung hängender MIDI-Noten.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="font-mono text-xs text-amber-400 font-bold uppercase tracking-wider block mb-1">
                  Säule 4 • Stage Safety System & Slip Nudge
                </span>
                <p className="text-sm text-gray-300">
                  Um Fehlbedienungen im Eifer des Auftritts zu verhindern, verfügt der Depeche Mode Multi-Synth Program Change Router über eine physische System-Sperre (🔒 Locked/Unlocked). Ergänzt wird dies durch den Carl Cox Slip Beat Slider, welcher beim manuellen Phasen-Nudgen ein pulsierendes Cyan-Leuchten über die gesamte Benutzeroberfläche schickt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand assets panel */}
      <div className="bg-[#090a0f] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-neon-cyan" /> Corporate Brand Identity & Palette
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Genaue Farbcodes und Spezifikationen für Medienagenturen und Designer
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {/* Cyan */}
          <div 
            onClick={() => handleCopyColor('#00f0ff')}
            className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-neon-cyan/40 transition-all cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-[#00f0ff] mx-auto mb-3 shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white mb-0.5">Neon-Cyan</div>
            <div className="text-[10px] font-mono text-gray-400">#00f0ff</div>
          </div>

          {/* Magenta */}
          <div 
            onClick={() => handleCopyColor('#ff007f')}
            className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-neon-magenta/40 transition-all cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-[#ff007f] mx-auto mb-3 shadow-[0_0_15px_rgba(255,0,127,0.4)] group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white mb-0.5">Electric-Magenta</div>
            <div className="text-[10px] font-mono text-gray-400">#ff007f</div>
          </div>

          {/* Green */}
          <div 
            onClick={() => handleCopyColor('#39ff14')}
            className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-neon-green/40 transition-all cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-[#39ff14] mx-auto mb-3 shadow-[0_0_15px_rgba(57,255,20,0.4)] group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white mb-0.5">Failsafe-Grün</div>
            <div className="text-[10px] font-mono text-gray-400">#39ff14</div>
          </div>

          {/* Gold */}
          <div 
            onClick={() => handleCopyColor('#eab308')}
            className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-400/40 transition-all cursor-pointer text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-[#eab308] mx-auto mb-3 shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white mb-0.5">Stability-Gold</div>
            <div className="text-[10px] font-mono text-gray-400">#eab308</div>
          </div>
        </div>
      </div>
    </div>
  );
}
