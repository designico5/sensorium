import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Radio,
  Activity,
  Layers,
  Palette,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

export interface VolumetricCloudProps {
  bpm?: number;
  isPlaying?: boolean;
  activeSignals?: string[];
  audioSensitivity?: number;
  isBackgroundOnly?: boolean;
  onCloseFullscreen?: () => void;
}

export type VisualPreset = 'nebula' | 'wavegrid' | 'shockwave' | 'auraplasma';
export type ColorTheme = 'cyber' | 'gold' | 'emerald' | 'ultraviolet' | 'monochrome';

export const VolumetricFrequencyCloudBg: React.FC<VolumetricCloudProps> = ({
  bpm = 120,
  isPlaying = true,
  activeSignals = [],
  audioSensitivity = 1.0,
  isBackgroundOnly = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Control State
  const [enabled, setEnabled] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(0.35);
  const [particleCount, setParticleCount] = useState<number>(550); // Optimized for ultra-smooth 60 FPS
  const [preset, setPreset] = useState<VisualPreset>('nebula');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('cyber');
  const [showControlPanel, setShowControlPanel] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [interactiveForce, setInteractiveForce] = useState<boolean>(false); // Off by default for maximum zero-latency performance
  const [ecoMode, setEcoMode] = useState<boolean>(false); // Low-CPU Mode toggle
  const [testFrequencyPulse, setTestFrequencyPulse] = useState<number>(0);

  // Physics & Audio Frequency States
  const mouseRef = useRef<{ x: number; y: number; active: boolean; radius: number }>({
    x: 0,
    y: 0,
    active: false,
    radius: 180
  });

  // Simulated Frequency Bands (Sub-bass, Mid, Treble, Impulse)
  const freqRef = useRef<{ subBass: number; midFreq: number; highFreq: number; impulse: number }>({
    subBass: 0.2,
    midFreq: 0.3,
    highFreq: 0.1,
    impulse: 0
  });

  // Color schemes (RGB values for interpolation)
  const getThemeColors = (theme: ColorTheme) => {
    switch (theme) {
      case 'gold':
        return {
          c1: [255, 190, 40],   // Gold
          c2: [255, 100, 20],   // Deep Amber
          c3: [255, 235, 160],  // White Gold
          glow: 'rgba(255, 180, 0, 0.25)'
        };
      case 'emerald':
        return {
          c1: [16, 230, 150],   // Bioluminescent Mint
          c2: [0, 180, 220],    // Aquamarine
          c3: [200, 255, 220],  // Soft Silver Mint
          glow: 'rgba(16, 230, 150, 0.25)'
        };
      case 'ultraviolet':
        return {
          c1: [180, 60, 255],   // Deep Neon Violet
          c2: [255, 0, 128],    // Neon Magenta
          c3: [120, 220, 255],  // Electric Sky Blue
          glow: 'rgba(180, 60, 255, 0.25)'
        };
      case 'monochrome':
        return {
          c1: [240, 240, 250],  // Pure Titanium
          c2: [140, 150, 170],  // Slate Steel
          c3: [255, 255, 255],  // Platinum
          glow: 'rgba(255, 255, 255, 0.2)'
        };
      case 'cyber':
      default:
        return {
          c1: [0, 240, 255],    // Neon Cyan
          c2: [255, 0, 128],    // Neon Magenta
          c3: [255, 230, 0],    // Bright Yellow Spark
          glow: 'rgba(0, 240, 255, 0.25)'
        };
    }
  };

  // Trigger test tone / signal burst
  const triggerAudioImpulse = (band: 'bass' | 'chord' | 'treble') => {
    if (band === 'bass') {
      freqRef.current.subBass = 1.0;
      freqRef.current.impulse = 1.0;
    } else if (band === 'chord') {
      freqRef.current.midFreq = 1.0;
    } else {
      freqRef.current.highFreq = 1.0;
    }
    setTestFrequencyPulse(prev => prev + 1);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      // Cap DPR to 1 when in Eco mode or max 1.25 for buttery smooth rendering
      const dpr = ecoMode ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Particle Data Structure
    const PHI = 1.61803398875;
    interface Particle {
      x: number;
      y: number;
      z: number;
      origX: number;
      origY: number;
      origZ: number;
      vx: number;
      vy: number;
      vz: number;
      size: number;
      baseAlpha: number;
      freqOffset: number;
      colorFactor: number;
    }

    const particles: Particle[] = [];
    const count = particleCount;

    // Generate 3D Golden-Ratio Fibonacci Sphere & Cloud distribution
    for (let i = 0; i < count; i++) {
      const theta = 2 * Math.PI * i / PHI;
      const phi = Math.acos(1 - 2 * (i + 0.5) / count);
      const radius = 250 + Math.random() * 350;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particles.push({
        x,
        y,
        z,
        origX: x,
        origY: y,
        origZ: z,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        size: 1.2 + Math.random() * 2.8,
        baseAlpha: 0.2 + Math.random() * 0.6,
        freqOffset: Math.random() * Math.PI * 2,
        colorFactor: Math.random()
      });
    }

    // Mouse events
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Main Render Loop
    const render = () => {
      time += 0.012 * (isPlaying ? (bpm / 120) : 0.4);

      // Smoothly decay audio impulse / signals
      const activeSignalCount = activeSignals.length;
      const targetSub = (isPlaying ? 0.25 + Math.sin(time * 2.5) * 0.15 : 0.1) + (activeSignalCount * 0.12) * audioSensitivity;
      const targetMid = (isPlaying ? 0.35 + Math.cos(time * 1.8) * 0.2 : 0.1) + (activeSignalCount * 0.1) * audioSensitivity;
      const targetHigh = (isPlaying ? 0.2 + Math.sin(time * 4) * 0.15 : 0.05);

      freqRef.current.subBass += (targetSub - freqRef.current.subBass) * 0.08;
      freqRef.current.midFreq += (targetMid - freqRef.current.midFreq) * 0.08;
      freqRef.current.highFreq += (targetHigh - freqRef.current.highFreq) * 0.08;
      freqRef.current.impulse *= 0.93;

      const sub = Math.min(1.5, freqRef.current.subBass + freqRef.current.impulse);
      const mid = freqRef.current.midFreq;
      const high = freqRef.current.highFreq;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      const colors = getThemeColors(colorTheme);

      // 1. RENDER VOLUMETRIC AURA PLASMA / NEBULA CORE (Glow in background)
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 50 * sub,
        centerX, centerY, Math.max(width, height) * 0.65
      );
      const c1Str = `rgba(${colors.c1[0]}, ${colors.c1[1]}, ${colors.c1[2]}, ${0.15 * sub * opacity})`;
      const c2Str = `rgba(${colors.c2[0]}, ${colors.c2[1]}, ${colors.c2[2]}, ${0.08 * mid * opacity})`;
      const c3Str = `rgba(0, 0, 0, 0)`;

      gradient.addColorStop(0, c1Str);
      gradient.addColorStop(0.5, c2Str);
      gradient.addColorStop(1, c3Str);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // 3D Perspective Projection factors
      const focalLength = 500;
      const rotY = time * 0.2;
      const rotX = Math.sin(time * 0.15) * 0.2;

      // 2. RENDER PRESET SPECIFIC GEOMETRY (Mesh / Shockwave / Nebula)
      if (preset === 'wavegrid') {
        // Draw interconnected 3D Phi-Surface Wave Mesh
        ctx.save();
        ctx.strokeStyle = `rgba(${colors.c1[0]}, ${colors.c1[1]}, ${colors.c1[2]}, ${0.25 * opacity})`;
        ctx.lineWidth = 1;

        const cols = 24;
        const rows = 16;
        const spacing = 45;

        for (let r = 0; r < rows; r++) {
          ctx.beginPath();
          for (let c = 0; c < cols; c++) {
            const gx = (c - cols / 2) * spacing;
            const gy = (r - rows / 2) * spacing;
            
            // Wave formula
            const dist = Math.sqrt(gx * gx + gy * gy);
            const gz = Math.sin(dist * 0.02 - time * 3) * 35 * sub + Math.cos(gx * 0.03 + time * 2) * 20 * mid;

            // Rotate Y & X
            const rx = gx * Math.cos(rotY) - gz * Math.sin(rotY);
            const rz = gx * Math.sin(rotY) + gz * Math.cos(rotY);
            const ry = gy * Math.cos(rotX) - rz * Math.sin(rotX);

            const projScale = focalLength / (focalLength + rz + 400);
            const px = centerX + rx * projScale;
            const py = centerY + ry * projScale;

            if (c === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        ctx.restore();
      } else if (preset === 'shockwave') {
        // Volumetric Concentric Wave Rings
        ctx.save();
        const numRings = 7;
        for (let i = 0; i < numRings; i++) {
          const ringProgress = ((time * 1.5 + i / numRings) % 1);
          const radius = ringProgress * (Math.max(width, height) * 0.55);
          const alpha = (1 - ringProgress) * 0.35 * sub * opacity;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${colors.c1[0]}, ${colors.c1[1]}, ${colors.c1[2]}, ${alpha})`;
          ctx.lineWidth = 2 + ringProgress * 4;
          ctx.stroke();

          // Particle spikes along the ring
          const spikes = 12;
          for (let s = 0; s < spikes; s++) {
            const angle = (s / spikes) * Math.PI * 2 + time;
            const sx = centerX + Math.cos(angle) * radius;
            const sy = centerY + Math.sin(angle) * radius;
            ctx.fillStyle = `rgba(${colors.c3[0]}, ${colors.c3[1]}, ${colors.c3[2]}, ${alpha * 1.5})`;
            ctx.fillRect(sx - 2, sy - 2, 4, 4);
          }
        }
        ctx.restore();
      }

      // 3. RENDER 3D PARTICLES (VOLUMETRIC CLOUD)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Wave displacement formula
        const waveX = Math.sin(time * 2 + p.freqOffset) * 15 * mid;
        const waveY = Math.cos(time * 1.8 + p.freqOffset) * 15 * sub;
        const waveZ = Math.sin(time * 3 + p.colorFactor * 10) * 30 * sub;

        let curX = p.origX + waveX;
        let curY = p.origY + waveY;
        let curZ = p.origZ + waveZ;

        // Interactive Mouse Gravitational Repulsion
        if (interactiveForce && mouseRef.current.active) {
          const dx = curX - (mouseRef.current.x - centerX);
          const dy = curY - (mouseRef.current.y - centerY);
          const distSq = dx * dx + dy * dy;
          const maxDist = mouseRef.current.radius;

          if (distSq < maxDist * maxDist) {
            const dist = Math.sqrt(distSq) || 1;
            const force = (1 - dist / maxDist) * 45;
            curX += (dx / dist) * force;
            curY += (dy / dist) * force;
          }
        }

        // Rotate 3D particle positions
        const rx = curX * Math.cos(rotY) - curZ * Math.sin(rotY);
        const rz = curX * Math.sin(rotY) + curZ * Math.cos(rotY);
        const ry = curY * Math.cos(rotX) - rz * Math.sin(rotX);

        // Perspective Projection
        const zDistance = focalLength + rz + 300;
        if (zDistance <= 10) continue;

        const scale = focalLength / zDistance;
        const screenX = centerX + rx * scale;
        const screenY = centerY + ry * scale;

        // Skip offscreen
        if (screenX < -20 || screenX > width + 20 || screenY < -20 || screenY > height + 20) continue;

        // Dynamic Size & Alpha based on Z and Audio Frequencies
        const renderSize = Math.max(0.5, p.size * scale * (1 + high * 0.8));
        const alpha = Math.min(1, Math.max(0.05, (p.baseAlpha * (scale * 0.9) * opacity * (0.6 + sub * 0.6))));

        // Color interpolation based on particle factor
        let colR = colors.c1[0];
        let colG = colors.c1[1];
        let colB = colors.c1[2];

        if (p.colorFactor > 0.6) {
          colR = colors.c2[0];
          colG = colors.c2[1];
          colB = colors.c2[2];
        } else if (p.colorFactor > 0.85) {
          colR = colors.c3[0];
          colG = colors.c3[1];
          colB = colors.c3[2];
        }

        // Draw particle point / glow
        ctx.beginPath();
        ctx.arc(screenX, screenY, renderSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colR}, ${colG}, ${colB}, ${alpha})`;
        ctx.fill();

        // High frequency shimmering sparks on select particles
        if (high > 0.3 && p.colorFactor > 0.7 && Math.random() < 0.15) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgb(${colors.c3[0]}, ${colors.c3[1]}, ${colors.c3[2]})`;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.5})`;
          ctx.fillRect(screenX - 1, screenY - 1, 2, 2);
          ctx.shadowBlur = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, opacity, particleCount, preset, colorTheme, isPlaying, bpm, activeSignals, audioSensitivity, interactiveForce]);

  if (!enabled) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none transition-all duration-700 ${
        isFullscreen ? 'z-50 bg-black' : 'z-0'
      }`}
    >
      {/* HTML5 CANVAS ENGINE LAYER */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-auto"
      />

      {/* FLOATING CONTROLLER TOGGLE / BADGE (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-40 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => setEcoMode(!ecoMode)}
          className={`px-2.5 py-2 rounded-xl backdrop-blur-xl border transition flex items-center gap-1.5 text-xs font-mono font-bold uppercase shadow-2xl ${
            ecoMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
          title="Eco Low-CPU Mode toggle (Schont CPU & Latenz)"
        >
          <Zap className={`w-3.5 h-3.5 ${ecoMode ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span className="hidden md:inline">{ecoMode ? 'Eco Low-CPU' : 'Ultra-Fluid 60FPS'}</span>
        </button>

        <button
          onClick={() => setShowControlPanel(!showControlPanel)}
          className={`px-3 py-2 rounded-xl backdrop-blur-xl border transition flex items-center gap-2 text-xs font-mono font-bold uppercase shadow-2xl ${
            showControlPanel
              ? 'bg-neon-cyan/25 text-neon-cyan border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)]'
              : 'bg-black/80 hover:bg-black/90 text-gray-300 border-white/10 hover:border-white/20'
          }`}
          title="Frequenz-Wolken Engine Einstellungen"
        >
          <Sparkles className="w-4 h-4 text-neon-cyan animate-pulse" />
          <span className="hidden sm:inline">3D Volumetric Wave Engine</span>
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 bg-black/80 hover:bg-black/90 text-gray-300 hover:text-white border border-white/10 rounded-xl transition shadow-2xl"
          title={isFullscreen ? 'Vollbild Beenden' : 'Vollbild Visualizer'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* DETAILED CONTROL PANEL DRAWER */}
      {showControlPanel && (
        <div className="absolute bottom-16 right-4 z-50 w-80 sm:w-96 bg-gradient-to-b from-gray-950/95 via-black/95 to-zinc-950/95 border border-neon-cyan/40 rounded-2xl p-4 sm:p-5 backdrop-blur-2xl text-white space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.9)] pointer-events-auto animate-fade-in text-left">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-display font-black text-xs uppercase tracking-wider text-white">
                  3D Frequenz-Wolken Engine
                </h4>
                <p className="text-[10px] text-gray-400">Volumetrische Visuals &amp; Wellen-Synthese</p>
              </div>
            </div>
            <button
              onClick={() => setShowControlPanel(false)}
              className="p-1 text-gray-400 hover:text-white rounded bg-white/5"
            >
              ✕
            </button>
          </div>

          {/* Preset Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center justify-between">
              <span>Wellen-Modus / Visual Preset</span>
              <span className="text-neon-cyan font-bold uppercase">{preset}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono font-bold">
              {[
                { id: 'nebula', label: '🌌 Nebula Wolke' },
                { id: 'wavegrid', label: '🌊 Phi Wave Grid' },
                { id: 'shockwave', label: '⚡ Schockwelle' },
                { id: 'auraplasma', label: '💫 Aura Plasma' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id as VisualPreset)}
                  className={`p-2 rounded-lg border transition text-left ${
                    preset === p.id
                      ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan font-extrabold shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                      : 'bg-black/60 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center gap-1">
              <Palette className="w-3 h-3 text-neon-magenta" />
              <span>Farb-Palette / Spektrum</span>
            </label>
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
              {[
                { id: 'cyber', label: 'Cyber' },
                { id: 'gold', label: 'Gold' },
                { id: 'emerald', label: 'Mint' },
                { id: 'ultraviolet', label: 'Violett' },
                { id: 'monochrome', label: 'Silber' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColorTheme(c.id as ColorTheme)}
                  className={`flex-1 py-1.5 rounded-lg transition uppercase font-bold text-center ${
                    colorTheme === c.id
                      ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Opacity & Density */}
          <div className="space-y-3 pt-1 border-t border-white/10">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-gray-400 font-bold mb-1">
                <span>Intensität / Opazität:</span>
                <span className="text-neon-cyan">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-neon-cyan cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] font-mono text-gray-400 font-bold mb-1">
                <span>Partikel-Dichte:</span>
                <span className="text-neon-cyan">{particleCount} Knoten</span>
              </div>
              <input
                type="range"
                min="400"
                max="2500"
                step="100"
                value={particleCount}
                onChange={(e) => setParticleCount(parseInt(e.target.value))}
                className="w-full accent-neon-cyan cursor-pointer"
              />
            </div>
          </div>

          {/* Interactive Gravitational Mouse Physics Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono">
            <span className="text-gray-300 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Maus-Gravitation
            </span>
            <button
              onClick={() => setInteractiveForce(!interactiveForce)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase transition ${
                interactiveForce
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-gray-500 border-white/10'
              }`}
            >
              {interactiveForce ? 'Aktiv' : 'Inaktiv'}
            </button>
          </div>

          {/* Audio Test Impulse Triggers */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
              Frequenz-Testimpuls Auslösen:
            </span>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
              <button
                onClick={() => triggerAudioImpulse('bass')}
                className="py-1.5 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 rounded-lg font-bold transition uppercase"
              >
                Sub-Bass 💥
              </button>
              <button
                onClick={() => triggerAudioImpulse('chord')}
                className="py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold transition uppercase"
              >
                Mitten 🌊
              </button>
              <button
                onClick={() => triggerAudioImpulse('treble')}
                className="py-1.5 bg-neon-magenta/20 hover:bg-neon-magenta/30 text-neon-magenta border border-neon-magenta/40 rounded-lg font-bold transition uppercase"
              >
                Höhen ✨
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumetricFrequencyCloudBg;
