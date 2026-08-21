/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { DeviceStatus } from '../types';

interface IsometricDeviceProps {
  key?: string;
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  isPhysicalHardware?: boolean;
  active: boolean; // MIDI signal is pulsing
  isPlaying?: boolean; // MIDI clock is active
  bpm?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
}

export default function IsometricDevice({
  id,
  name,
  type,
  status,
  isPhysicalHardware = false,
  active,
  isPlaying = false,
  bpm = 120,
  size = 'md',
  onClick,
  selected = false,
}: IsometricDeviceProps) {
  const [step, setStep] = useState(0);

  // Animate sequencer light steps if playing
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = (60 / bpm) * 1000 / 4; // 16th notes
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 16);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, bpm]);

  // Determine scale and dimensions
  const dims = {
    sm: { width: 80, height: 80, view: '0 0 100 100' },
    md: { width: 140, height: 140, view: '0 0 160 160' },
    lg: { width: 220, height: 200, view: '0 0 240 220' },
  }[size];

  // Colors based on device status
  const themeColor = {
    Healthy: '#39ff14', // neon-green
    Warn: '#ffdf00', // yellow
    Error: '#ff3131', // red
  }[status];

  const glowClass = {
    Healthy: 'shadow-[0_0_15px_rgba(57,255,20,0.15)]',
    Warn: 'shadow-[0_0_15px_rgba(255,223,0,0.15)]',
    Error: 'shadow-[0_0_20px_rgba(255,49,49,0.3)] animate-pulse',
  }[status];

  // Specific device graphics
  const renderHardwareSvg = () => {
    if (type === 'Drum Machine' || id === 'dev-drum') {
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full">
          <defs>
            <linearGradient id="drum-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e202b" />
              <stop offset="100%" stopColor="#0f1016" />
            </linearGradient>
            <linearGradient id="drum-left" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8d5b4c" />
              <stop offset="100%" stopColor="#4e2c21" />
            </linearGradient>
            <linearGradient id="drum-right" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#121319" />
              <stop offset="100%" stopColor="#08090c" />
            </linearGradient>
            <radialGradient id="pad-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={active ? '#ff007f' : '#00f0ff'} stopOpacity="0.8" />
              <stop offset="100%" stopColor={active ? '#ff007f' : '#00f0ff'} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 3D Chassis */}
          {/* Left Wood Side Panel */}
          <polygon points="15,95 45,120 45,135 15,110" fill="url(#drum-left)" stroke="#3e2118" strokeWidth="0.5" />
          
          {/* Bottom Edge Panel */}
          <polygon points="45,120 170,120 170,135 45,135" fill="url(#drum-right)" stroke="#0e1015" strokeWidth="0.5" />
          
          {/* Right Wood Side Panel */}
          <polygon points="170,120 185,95 185,110 170,135" fill="#4e2c21" stroke="#3e2118" strokeWidth="0.5" />

          {/* Top Plate faceplate */}
          <polygon points="15,95 185,95 170,120 45,120" fill="url(#drum-top)" stroke="#2a2c3a" strokeWidth="0.75" />
          <polygon points="15,95 45,60 170,60 185,95" fill="#151720" stroke="#2a2c3a" strokeWidth="0.75" />

          {/* Wood side panel detail (isometric thickness) */}
          <polygon points="10,95 15,95 15,110 10,110" fill="#a46d5c" />
          <polygon points="185,95 190,95 190,110 185,110" fill="#5e382c" />

          {/* LED display on top chassis */}
          <polygon points="50,70 100,70 95,85 45,85" fill="#050a12" stroke="#22d3ee" strokeWidth="0.5" />
          {/* Text/wave on display */}
          <path d="M 52,80 L 60,75 L 68,82 L 75,72 L 82,82 L 90,74" fill="none" stroke={active ? '#ff007f' : '#00f0ff'} strokeWidth="1" className={isPlaying ? 'animate-pulse' : ''} />
          <text x="52" y="78" fill="#22d3ee" fontSize="5" fontFamily="monospace" transform="skewX(-15)">
            {status === 'Error' ? 'ERR 503' : active ? 'SIGNAL' : 'SMPL:03'}
          </text>

          {/* Dials / Knobs (isometric ellipses) */}
          <g transform="translate(115, 75)">
            <ellipse cx="0" cy="0" rx="6" ry="3" fill="#334155" stroke="#475569" strokeWidth="0.5" />
            <line x1="0" y1="0" x2={active ? "4" : "-4"} y2={active ? "-2" : "1"} stroke="#f8fafc" strokeWidth="1.2" />
          </g>
          <g transform="translate(135, 75)">
            <ellipse cx="0" cy="0" rx="6" ry="3" fill="#334155" stroke="#475569" strokeWidth="0.5" />
            <line x1="0" y1="0" x2={isPlaying ? "1" : "5"} y2={isPlaying ? "-3" : "0"} stroke="#f8fafc" strokeWidth="1.2" />
          </g>
          <g transform="translate(155, 75)">
            <ellipse cx="0" cy="0" rx="6" ry="3" fill="#334155" stroke="#475569" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="-2" y2="-2" stroke="#f8fafc" strokeWidth="1.2" />
          </g>

          {/* Master Volume Red knob */}
          <g transform="translate(30, 80)">
            <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#991b1b" stroke="#b91c1c" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="3" y2="-1.5" stroke="#ffffff" strokeWidth="1.5" />
          </g>

          {/* 4x4 Pads Grid on bottom top plate */}
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 4 }).map((_, c) => {
              // Calculate isometric coordinate for pads
              // Origin at (40, 100)
              const px = 52 + c * 23 + r * 6;
              const py = 100 + r * 5 - c * 2;
              const isPadLit = active && (r + c) % 3 === (step % 3);
              const padFill = status === 'Error' 
                ? '#ef4444' 
                : status === 'Warn' 
                ? '#f59e0b'
                : isPadLit 
                ? '#ff007f' 
                : '#1e293b';
              const padBorder = isPadLit ? '#ffffff' : '#334155';

              return (
                <g key={`pad-${r}-${c}`}>
                  {isPadLit && (
                    <ellipse cx={px + 9} cy={py + 3} rx="14" ry="7" fill="url(#pad-glow)" />
                  )}
                  <polygon
                    points={`${px},${py} ${px+15},${py-3} ${px+21},${py+2} ${px+6},${py+7}`}
                    fill={padFill}
                    stroke={padBorder}
                    strokeWidth="0.75"
                    style={{ transition: 'fill 0.1s ease, stroke 0.1s ease' }}
                  />
                  {/* Subtle 3D Depth under each pad */}
                  <polygon
                    points={`${px},${py+7} ${px+6},${py+7} ${px+6},${py+9} ${px},${py+9}`}
                    fill="#0f172a"
                  />
                </g>
              );
            })
          )}

          {/* Status LED lamp at top right */}
          <circle cx="170" cy="68" r="3.5" fill={themeColor} style={{ filter: `drop-shadow(0 0 5px ${themeColor})` }} />
          <circle cx="170" cy="68" r="1" fill="#ffffff" />
        </svg>
      );
    }

    if (type === 'Synthesizer' || id === 'dev-keys') {
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full">
          <defs>
            <linearGradient id="synth-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2e313d" />
              <stop offset="100%" stopColor="#1a1c23" />
            </linearGradient>
            <linearGradient id="wood-side" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c2410c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
            <radialGradient id="synth-neon" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Wood Side panel left */}
          <polygon points="12,100 40,128 40,140 12,112" fill="url(#wood-side)" stroke="#431407" />
          {/* Lower front lip */}
          <polygon points="40,128 178,128 178,140 40,140" fill="#0f172a" stroke="#1e293b" />
          {/* Wood Side panel right */}
          <polygon points="178,128 188,118 188,130 178,140" fill="#7c2d12" stroke="#431407" />

          {/* Top plates */}
          <polygon points="12,100 188,100 178,128 40,128" fill="url(#synth-body)" stroke="#334155" />
          <polygon points="12,100 35,62 165,62 188,100" fill="#181a21" stroke="#334155" />

          {/* Synth keys (3D Isometric projection) */}
          {Array.from({ length: 14 }).map((_, idx) => {
            const kx = 45 + idx * 9;
            const ky = 127 - idx * 0.4;
            // simulate keypress on active MIDI notes
            const isPressed = active && (idx === 3 || idx === 7 || idx === 10);
            const keyShift = isPressed ? 1.5 : 0;
            return (
              <g key={`key-${idx}`}>
                {/* White Key Top */}
                <polygon
                  points={`${kx},${ky + keyShift} ${kx+8},${ky-1 + keyShift} ${kx+14},${ky+11 + keyShift} ${kx+6},${ky+12 + keyShift}`}
                  fill={isPressed ? '#e0f2fe' : '#ffffff'}
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                />
                {/* Key Front Edge */}
                <polygon
                  points={`${kx+6},${ky+12 + keyShift} ${kx+14},${ky+11 + keyShift} ${kx+14},${ky+16} ${kx+6},${ky+17}`}
                  fill="#cbd5e1"
                  stroke="#94a3b8"
                  strokeWidth="0.5"
                />
                {isPressed && (
                  <ellipse cx={kx+10} cy={ky+14} rx="8" ry="4" fill="url(#synth-neon)" />
                )}
              </g>
            );
          })}

          {/* Black Keys */}
          {[1, 2, 4, 5, 6, 8, 9, 11, 12].map((kIdx) => {
            const kx = 45 + kIdx * 9 + 5.5;
            const ky = 127 - kIdx * 0.4 - 2.5;
            const isPressed = active && (kIdx === 2 || kIdx === 9);
            const keyShift = isPressed ? 1.2 : 0;
            return (
              <g key={`bkey-${kIdx}`}>
                <polygon
                  points={`${kx},${ky + keyShift} ${kx+5},${ky-0.6 + keyShift} ${kx+9},${ky+7 + keyShift} ${kx+4},${ky+7.5 + keyShift}`}
                  fill="#090d16"
                  stroke="#1e293b"
                  strokeWidth="0.5"
                />
                <polygon
                  points={`${kx+4},${ky+7.5 + keyShift} ${kx+9},${ky+7 + keyShift} ${kx+9},${ky+10.5} ${kx+4},${ky+11}`}
                  fill="#1e293b"
                />
              </g>
            );
          })}

          {/* Graphic Screen on Back panel */}
          <polygon points="65,70 115,70 110,92 60,92" fill="#020617" stroke="#10b981" strokeWidth="0.75" />
          {/* Sine wave draw */}
          <path d="M 65,85 Q 75,72 85,83 T 105,80" fill="none" stroke="#10b981" strokeWidth="1.2" className={isPlaying ? 'animate-pulse' : ''} />
          <line x1="62" y1="80" x2="112" y2="80" stroke="#10b981" strokeWidth="0.25" strokeDasharray="2,2" />

          {/* 3D Sliders and Knobs on top plate */}
          <g transform="translate(130, 75)">
            {/* Knob 1 */}
            <ellipse cx="0" cy="0" rx="5" ry="2.5" fill="#38bdf8" />
            <line x1="0" y1="0" x2={active ? "3" : "-2"} y2={active ? "-1.5" : "-1"} stroke="#ffffff" strokeWidth="1" />
          </g>
          <g transform="translate(145, 71)">
            {/* Knob 2 */}
            <ellipse cx="0" cy="0" rx="5" ry="2.5" fill="#38bdf8" />
            <line x1="0" y1="0" x2={isPlaying ? "-3" : "1"} y2={isPlaying ? "1.5" : "-2"} stroke="#ffffff" strokeWidth="1" />
          </g>
          <g transform="translate(160, 67)">
            {/* Knob 3 */}
            <ellipse cx="0" cy="0" rx="5" ry="2.5" fill="#38bdf8" />
            <line x1="0" y1="0" x2="3" y2="1" stroke="#ffffff" strokeWidth="1" />
          </g>

          {/* Slider tracks */}
          {[25, 33, 41, 49].map((sx, sIdx) => {
            const basePy = 75 + sIdx * 1.5;
            const handlePos = active ? 4 : (sIdx * 2.5);
            return (
              <g key={`slider-${sIdx}`} transform={`translate(${sx}, ${basePy})`}>
                <line x1="0" y1="0" x2="5" y2="10" stroke="#475569" strokeWidth="1.2" />
                {/* slider handle block */}
                <polygon
                  points={`${handlePos},${handlePos*2} ${handlePos+3},${handlePos*2-1} ${handlePos+4},${handlePos*2+2} ${handlePos+1},${handlePos*2+3}`}
                  fill="#ff007f"
                  stroke="#ffffff"
                  strokeWidth="0.5"
                />
              </g>
            );
          })}

          {/* Status LED lamp at top right */}
          <circle cx="150" cy="80" r="3" fill={themeColor} style={{ filter: `drop-shadow(0 0 5px ${themeColor})` }} />
          <circle cx="150" cy="80" r="0.8" fill="#ffffff" />
        </svg>
      );
    }

    if (type === 'USB Controller' || id === 'dev-launchpad') {
      return (
        <svg viewBox="0 0 200 180" className="w-full h-full">
          <defs>
            <linearGradient id="pad-top" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>
            <radialGradient id="glass-rim" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Transparent bottom glowing chassis */}
          <polygon points="25,95 55,125 55,133 25,103" fill="#083344" opacity="0.85" stroke="#0e7490" strokeWidth="0.5" />
          <polygon points="55,125 165,125 165,133 55,133" fill="#0c4a6e" opacity="0.85" stroke="#0e7490" strokeWidth="0.5" />
          <polygon points="165,125 175,115 175,123 165,133" fill="#0c4a6e" opacity="0.85" stroke="#0e7490" strokeWidth="0.5" />

          {/* Top Main glass slab */}
          <polygon points="25,95 145,95 165,115 45,115" fill="url(#pad-top)" stroke="#0891b2" strokeWidth="1" />
          <polygon points="25,95 45,60 165,60 175,115" fill="#030712" stroke="#0891b2" strokeWidth="1" />

          {/* Underglow vector lines */}
          <path d="M 20,103 L 55,137 L 170,137" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.7" style={{ filter: 'drop-shadow(0 0 6px #22d3ee)' }} />

          {/* Mini launchpad matrix grid (isometric squares) */}
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 6 }).map((_, c) => {
              const px = 50 + c * 15 + r * 5;
              const py = 75 + r * 5 - c * 2;
              const isCellLit = active && (r + c + step) % 5 === 0;
              const cellFill = status === 'Error'
                ? '#ef4444'
                : status === 'Warn'
                ? '#eab308'
                : isCellLit
                ? '#a855f7' // purple
                : '#1f2937';
              const cellGlow = isCellLit ? 'rgba(168, 85, 247, 0.4)' : 'transparent';

              return (
                <g key={`lp-${r}-${c}`}>
                  {isCellLit && (
                    <ellipse cx={px+7} cy={py+2} rx="10" ry="5" fill="url(#glass-rim)" />
                  )}
                  <polygon
                    points={`${px},${py} ${px+10},${py-2} ${px+14},${py+2} ${px+4},${py+4}`}
                    fill={cellFill}
                    stroke={isCellLit ? '#ffffff' : '#374151'}
                    strokeWidth="0.5"
                    style={{ filter: isCellLit ? `drop-shadow(0 0 3px ${themeColor})` : '' }}
                  />
                </g>
              );
            })
          )}

          {/* Functional buttons on the left and right rims */}
          {[1,2,3,4,5].map((btnIdx) => {
            // Left row circular buttons
            const lx = 37 + btnIdx * 5;
            const ly = 95 - btnIdx * 2.5;
            return (
              <ellipse key={`btn-l-${btnIdx}`} cx={lx} cy={ly} rx="2.5" ry="1.2" fill={active ? "#06b6d4" : "#4b5563"} stroke="#1f2937" strokeWidth="0.5" />
            );
          })}
          {[1,2,3,4,5].map((btnIdx) => {
            // Right row circular buttons
            const rx = 153 + btnIdx * 3;
            const ry = 80 + btnIdx * 3.2;
            return (
              <ellipse key={`btn-r-${btnIdx}`} cx={rx} cy={ry} rx="2.5" ry="1.2" fill={isPlaying ? "#f43f5e" : "#4b5563"} stroke="#1f2937" strokeWidth="0.5" />
            );
          })}

          {/* Status glow bulb */}
          <ellipse cx="140" cy="68" rx="4" ry="2" fill={themeColor} style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }} />
        </svg>
      );
    }

    // Default: Sequencer / Internal MIDI / Rack Module
    return (
      <svg viewBox="0 0 200 180" className="w-full h-full">
        <defs>
          <linearGradient id="rack-panel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="metal-handle" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* 3D depth sides */}
        <polygon points="10,90 20,105 20,123 10,108" fill="#475569" stroke="#334155" />
        <polygon points="20,105 180,105 180,123 20,123" fill="#020617" stroke="#1e293b" />
        <polygon points="180,105 190,90 190,108 180,123" fill="#334155" stroke="#1e293b" />

        {/* Front panel main */}
        <polygon points="10,90 190,90 180,105 20,105" fill="url(#rack-panel)" stroke="#475569" strokeWidth="1" />
        <polygon points="10,90 25,60 175,60 190,90" fill="#0b0f19" stroke="#334155" strokeWidth="1" />

        {/* Rack Ears (Screws) */}
        <circle cx="15" cy="70" r="2" fill="#64748b" stroke="#334155" />
        <circle cx="15" cy="100" r="2" fill="#64748b" stroke="#334155" />
        <circle cx="185" cy="70" r="2" fill="#64748b" stroke="#334155" />
        <circle cx="185" cy="100" r="2" fill="#64748b" stroke="#334155" />

        {/* Chrome Handles (Left & Right) */}
        <path d="M 23,65 L 20,65 L 20,100 L 23,100" fill="none" stroke="url(#metal-handle)" strokeWidth="3" strokeLinecap="round" />
        <path d="M 177,65 L 180,65 L 180,100 L 177,100" fill="none" stroke="url(#metal-handle)" strokeWidth="3" strokeLinecap="round" />

        {/* Analog VU Meter */}
        <polygon points="35,68 85,68 80,95 30,95" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.2" />
        <path d="M 35,92 A 38,38 0 0,1 78,92" fill="none" stroke="#ca8a04" strokeWidth="1" strokeDasharray="2,2" />
        
        {/* Dynamic Needle dance */}
        <line
          x1="57"
          y1="95"
          x2={active ? "74" : isPlaying ? "62" : "42"}
          y2={active ? "71" : isPlaying ? "73" : "78"}
          stroke="#dc2626"
          strokeWidth="1.8"
          style={{ transition: 'x2 0.08s ease, y2 0.08s ease' }}
        />
        <circle cx="57" cy="95" r="4" fill="#1e293b" />
        <text x="38" y="77" fill="#854d0e" fontSize="5" fontFamily="monospace">VU TEMP</text>

        {/* Large Dial encoder */}
        <g transform="translate(105, 80)">
          <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#334155" stroke="#64748b" strokeWidth="1" />
          <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#1e293b" />
          {/* pointer dot */}
          <circle cx={active ? "4" : "-4"} cy={active ? "-2" : "1"} r="1" fill="#38bdf8" />
        </g>
        <text x="96" y="93" fill="#94a3b8" fontSize="5" fontFamily="monospace">SYNC PORT</text>

        {/* Sequencer step LEDs (16 small diodes inside horizontal tracks) */}
        <polygon points="120,73 170,73 166,88 116,88" fill="#1e293b" />
        {Array.from({ length: 8 }).map((_, i) => {
          const lX = 122 + i * 5.8;
          const lY = 76 + i * 1.2;
          const isLit = isPlaying && (step % 8 === i);
          const cellColor = isLit ? '#ff007f' : active ? '#00f0ff' : '#475569';
          return (
            <circle
              key={`led-${i}`}
              cx={lX}
              cy={lY}
              r="1.4"
              fill={cellColor}
              style={{ filter: isLit ? 'drop-shadow(0 0 3px #ff007f)' : '' }}
            />
          );
        })}

        {/* Status LED lamp at top center */}
        <circle cx="150" cy="66" r="3.2" fill={themeColor} style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }} />
        <circle cx="150" cy="66" r="0.8" fill="#ffffff" />
      </svg>
    );
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative rounded-2xl p-4 transition-all duration-300 select-none ${
        selected
          ? 'bg-gradient-to-br from-black/60 to-black/85 border-2 border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.15)] scale-[1.02]'
          : 'bg-black/35 border border-white/5 hover:border-white/10 hover:shadow-[0_10px_25px_rgba(0,0,0,0.4)] hover:scale-[1.01]'
      } ${onClick ? 'cursor-pointer' : ''} ${glowClass}`}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {/* Physical vs Virtual Hardware Badge */}
      <div className="absolute top-2.5 right-2.5 z-20">
        {isPhysicalHardware ? (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ⚡ PHYSISCH
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-500/15 text-amber-300/90 border border-amber-500/30 flex items-center gap-1">
            🧪 DEMO
          </span>
        )}
      </div>

      {/* 3D tilt hover highlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-transparent to-white/[0.05] rounded-2xl pointer-events-none" />

      {/* Hardware Graphic container */}
      <div className="w-full flex justify-center items-center h-[120px] relative">
        {renderHardwareSvg()}

        {/* Signal Flash Pulse backdrop */}
        {active && (
          <div className="absolute inset-0 bg-neon-cyan/5 rounded-full filter blur-xl animate-ping pointer-events-none" />
        )}
      </div>

      {/* Info details */}
      <div className="mt-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }} />
          <h4 className="font-display font-bold text-[11px] text-gray-200 uppercase tracking-wider truncate max-w-[130px]">
            {name}
          </h4>
        </div>
        <p className="font-mono text-[8px] text-gray-500 uppercase mt-0.5 tracking-wide">
          {type}
        </p>
      </div>

      {/* Selected Indicator Glow ring */}
      {selected && (
        <div className="absolute inset-x-4 bottom-2 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-80" />
      )}
    </div>
  );
}
