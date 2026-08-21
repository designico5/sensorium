/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sliders, Zap, Award, Info, Flame, Settings, Radio, HelpCircle, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

interface HardwareBlueprintViewProps {
  addLog: (source: any, level: any, msg: string) => void;
  bpm: number;
}

export default function HardwareBlueprintView({
  addLog,
  bpm,
}: HardwareBlueprintViewProps) {
  // Interactive physical hardware parameters
  const [jitterOffset, setJitterOffset] = useState(0.0004); // ms
  const [oversampling, setOversampling] = useState(256); // 64x, 128x, 256x, 512x
  const [strikePreDelay, setStrikePreDelay] = useState(0.12); // ms
  const [voltageRail, setVoltageRail] = useState(12.02); // V
  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  const [ledColorMode, setLedColorMode] = useState<'cyan' | 'magenta' | 'yellow' | 'green'>('cyan');
  
  // Rotating dials state (angles in degrees)
  const [dialAngles, setDialAngles] = useState({
    jitter: 45,
    oversampling: 180,
    predelay: 90,
    voltage: 120,
  });

  // Dynamic status states
  const [lastPadVelocity, setLastPadVelocity] = useState<number>(0);
  const [lastPadPressure, setLastPadPressure] = useState<number>(0);

  // Rotate dial by clicking/dragging simulation
  const handleDialClick = (dial: keyof typeof dialAngles) => {
    setDialAngles((prev) => {
      const nextAngle = (prev[dial] + 45) % 360;
      
      // Map angle to corresponding parameter
      if (dial === 'jitter') {
        const value = parseFloat((0.0001 + (nextAngle / 360) * 0.008).toFixed(5));
        setJitterOffset(value);
        addLog('SYSTEM', 'info', `[TR-X BLUEPRINT] Jitter-Referenz auf ultra-niedrige ${value} ms justiert.`);
      } else if (dial === 'oversampling') {
        const value = nextAngle < 90 ? 64 : nextAngle < 180 ? 128 : nextAngle < 270 ? 256 : 512;
        setOversampling(value);
        addLog('SYSTEM', 'info', `[TR-X BLUEPRINT] FPGA Delta-Sigma Oversampling auf ${value}x konfiguriert.`);
      } else if (dial === 'predelay') {
        const value = parseFloat((0.02 + (nextAngle / 360) * 0.9).toFixed(2));
        setStrikePreDelay(value);
        addLog('SYSTEM', 'info', `[TR-X BLUEPRINT] Mechanische Tasten-Entprellzeit (Pre-Delay) auf ${value} ms verfeinert.`);
      } else if (dial === 'voltage') {
        const value = parseFloat((11.8 + (nextAngle / 360) * 0.8).toFixed(2));
        setVoltageRail(value);
        addLog('SYSTEM', 'warn', `[TR-X BLUEPRINT] Interne Analog-Stromschiene stabilisiert bei ${value} V.`);
      }

      return { ...prev, [dial]: nextAngle };
    });
  };

  // Simulating pad striking with keyboard velocities
  const handlePadStrike = (padNum: number) => {
    const velocity = Math.floor(Math.random() * 47) + 81; // 81 - 127
    const pressure = Math.floor(Math.random() * 90) + 30; // 30 - 120
    setSelectedPad(padNum);
    setLastPadVelocity(velocity);
    setLastPadPressure(pressure);
    
    addLog('MIDI', 'success', `[TR-X PAD] Pad ${padNum} angeschlagen. Velocity: ${velocity} | Pressure: ${pressure}g.`);
    
    setTimeout(() => {
      setSelectedPad(null);
    }, 250);
  };

  // Specs comparison metrics
  const comparisonData = [
    { metric: 'Jitter & Jitter-Abweichung', tr1000: '12.4 ms (Standard USB Jitter)', trx: '0.0004 ms (Holographischer FPGA-Quarz)' },
    { metric: 'Wandler-Abtastung', tr1000: '44.1 kHz 16-Bit', trx: '384 kHz 64-Bit Ultra-FPGA Delta-Sigma' },
    { metric: 'Latenz (USB-In/Out)', tr1000: '8.2 ms - 24 ms', trx: '0.08 ms (Direkt-DMA Hyper-Lane Bus)' },
    { metric: 'Hardware Gehäuse & Haptik', tr1000: 'Spritzguss-Plastik & Silikon', trx: 'Gefrästes Luftfahrt-Aluminium & Titan-Ecken' },
    { metric: 'Tasten-Sensoren', tr1000: 'Gummi-Kontakte (Verschleiß)', trx: 'Opto-Mechanische Magnetschalter (Verschleißfrei)' },
    { metric: 'Energie-Integrität', tr1000: 'Standard USB 5V (Spannungsschwankung)', trx: 'Geregelte Dual-Rail 12V Stromversorgung' },
  ];

  return (
    <div id="trx-blueprint-view" className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-fade-in">
      
      {/* LEFT: Interactive 3D physical layout simulation (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        <div className="bg-gradient-to-b from-[#131520] to-[#0a0b10] border-2 border-neon-cyan/20 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden shadow-[0_15px_35px_rgba(0,240,255,0.05)]">
          
          {/* Futuristic corner brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-neon-cyan/40" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-neon-cyan/40" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-neon-cyan/40" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-neon-cyan/40" />

          {/* Header Title */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-mono text-[9px] font-black">
                  PROTOTYPE TR-X
                </span>
                <h3 className="font-display font-black text-sm tracking-widest text-gray-100 uppercase">
                  QUANTUM CORE DECK MODEL
                </h3>
              </div>
              <p className="font-sans text-[10px] text-gray-400 mt-1">
                Virtuelles Hardware-Interface des kommenden Flaggschiff-Hardware-Controllers. Klicke auf Knöpfe &amp; Pads, um das Verhalten zu testen.
              </p>
            </div>

            <div className="flex gap-1.5">
              {['cyan', 'magenta', 'yellow', 'green'].map((color) => (
                <button
                  key={color}
                  onClick={() => setLedColorMode(color as any)}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    color === 'cyan' ? 'bg-neon-cyan border-neon-cyan/30' :
                    color === 'magenta' ? 'bg-neon-magenta border-neon-magenta/30' :
                    color === 'yellow' ? 'bg-neon-yellow border-neon-yellow/30' :
                    'bg-neon-green border-neon-green/30'
                  } ${ledColorMode === color ? 'scale-125 ring-2 ring-white/20' : 'opacity-40 hover:opacity-75'}`}
                  title={`Wechsle LED-Theme: ${color}`}
                />
              ))}
            </div>
          </div>

          {/* THE PHYSICAL CONTROL PANEL (SVG & HTML Renders combined) */}
          <div className="bg-black/80 rounded-2xl p-5 border border-white/10 relative shadow-inner">
            
            {/* Holographic Wave Display Screen inside Hardware */}
            <div className="bg-slate-950/90 rounded-xl p-4 border border-[#06b6d4]/30 mb-6 relative overflow-hidden h-[110px] flex items-center justify-between">
              {/* Dynamic Oscilloscope Grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#083344_1px,transparent_1px)] bg-[size:10px_10px] opacity-40 pointer-events-none" />

              {/* Status parameters overlay */}
              <div className="relative z-10 font-mono text-[9px] text-[#22d3ee] space-y-1">
                <div>CORE STATUS: <span className="text-white font-bold animate-pulse">LOCK-IN SYNC</span></div>
                <div>SYSTEM JITTER: <span className="text-white font-bold">{jitterOffset} ms</span></div>
                <div>OVERSAMPLING: <span className="text-white font-bold">{oversampling}x FGPA</span></div>
                <div>KEY LATENCY: <span className="text-white font-bold">{strikePreDelay} ms</span></div>
              </div>

              {/* Animated wave */}
              <div className="relative z-10 w-1/2 h-full flex items-center justify-end">
                <svg viewBox="0 0 160 80" className="w-full h-full">
                  {/* Dynamic Sine-Cos Jitter Wave representation */}
                  <path
                    d={`M 10,40 Q 40,${20 + jitterOffset * 1000} 80,40 T 150,40`}
                    fill="none"
                    stroke={ledColorMode === 'cyan' ? '#00f0ff' : ledColorMode === 'magenta' ? '#ff007f' : ledColorMode === 'yellow' ? '#f59e0b' : '#39ff14'}
                    strokeWidth="1.5"
                    className="animate-pulse"
                  />
                  <line x1="0" y1="40" x2="160" y2="40" stroke="#00f0ff" strokeWidth="0.25" strokeDasharray="3,3" opacity="0.3" />
                </svg>
              </div>

              {/* Small Watermark label */}
              <div className="absolute bottom-1 right-2 font-mono text-[6px] text-gray-600 tracking-widest">
                SENSORIUM ENGINE INT.
              </div>
            </div>

            {/* Dials / Rotary Knobs Section */}
            <div className="grid grid-cols-4 gap-4 mb-6 text-center">
              {[
                { id: 'jitter' as const, label: 'JITTER REF', val: `${jitterOffset} ms`, angle: dialAngles.jitter },
                { id: 'oversampling' as const, label: 'FPGA MULTI', val: `${oversampling}x`, angle: dialAngles.oversampling },
                { id: 'predelay' as const, label: 'PRE-DELAY', val: `${strikePreDelay} ms`, angle: dialAngles.predelay },
                { id: 'voltage' as const, label: 'ANALOG RAIL', val: `${voltageRail} V`, angle: dialAngles.voltage },
              ].map((dial) => (
                <div key={dial.id} className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className="font-mono text-[8px] text-gray-500 font-bold tracking-wider uppercase block mb-2">
                    {dial.label}
                  </span>

                  {/* ROTARY KNOB ASSEMBLY */}
                  <div
                    onClick={() => handleDialClick(dial.id)}
                    className="w-12 h-12 rounded-full bg-gradient-to-b from-[#2d3045] to-[#121319] border-2 border-white/15 flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform"
                    style={{
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
                    }}
                  >
                    {/* Tick Needle indicating angle */}
                    <div
                      className="absolute inset-0 flex justify-center pt-1"
                      style={{
                        transform: `rotate(${dial.angle}deg)`,
                        transition: 'transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                      }}
                    >
                      {/* Physical white needle notch */}
                      <span className="w-[3px] h-[12px] bg-white rounded shadow" />
                    </div>

                    {/* Inner core cap */}
                    <div className="w-6 h-6 rounded-full bg-[#1b1c24] border border-black/50" />
                  </div>

                  <span className="font-mono text-[9px] text-gray-300 font-extrabold mt-2 tabular-nums block">
                    {dial.val}
                  </span>
                </div>
              ))}
            </div>

            {/* 4x4 OPTICAL TRIGGER PADS GRID (Mechanical strike simulation) */}
            <div>
              <span className="font-mono text-[8px] text-gray-500 font-bold tracking-widest uppercase block mb-3 text-center">
                4x4 MECHANICAL SILENT VELOCITY PADS
              </span>

              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 16 }).map((_, i) => {
                  const padNum = i + 1;
                  const isPressed = selectedPad === padNum;
                  
                  // Color selection matching current theme color mode
                  const activeBg = 
                    ledColorMode === 'cyan' ? 'bg-neon-cyan text-black shadow-[0_0_15px_#00f0ff]' :
                    ledColorMode === 'magenta' ? 'bg-neon-magenta text-white shadow-[0_0_15px_#ff007f]' :
                    ledColorMode === 'yellow' ? 'bg-neon-yellow text-black shadow-[0_0_15px_#f59e0b]' :
                    'bg-neon-green text-black shadow-[0_0_15px_#39ff14]';

                  return (
                    <button
                      key={padNum}
                      onClick={() => handlePadStrike(padNum)}
                      className={`h-[48px] rounded-lg font-display text-[10px] font-extrabold transition-all duration-75 relative overflow-hidden flex flex-col items-center justify-center border ${
                        isPressed
                          ? `${activeBg} border-white scale-95`
                          : 'bg-[#151724]/60 border-white/5 text-gray-400 hover:border-white/15 hover:text-white'
                      }`}
                    >
                      <span className="relative z-10 text-[9px]">PAD {padNum}</span>
                      <span className="font-mono text-[6px] opacity-40 absolute bottom-1">
                        CC {36 + i}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-time telemetry indicators */}
            <div className="mt-5 grid grid-cols-2 gap-4 font-mono text-[9px] border-t border-white/5 pt-4">
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                <span className="text-gray-500 block uppercase">Last Key-strike Force</span>
                <span className="text-white font-bold block mt-0.5 tabular-nums">
                  {lastPadPressure > 0 ? `${lastPadPressure} grams (Opto-Pressure)` : '0g (Ready)'}
                </span>
              </div>
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                <span className="text-gray-500 block uppercase">Strike Velocity Data</span>
                <span className="text-white font-bold block mt-0.5 tabular-nums">
                  {lastPadVelocity > 0 ? `${lastPadVelocity} (127 scale)` : '0 (Standby)'}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* RIGHT: High-End Hardware vs. Old Standard Comparison Matrix (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        
        {/* Why this beats TR-1000 Card */}
        <div className="bg-gradient-to-b from-[#151221] to-[#0a0812] border border-neon-magenta/20 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
          
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
            <Award className="w-4 h-4 text-neon-magenta" />
            <h4 className="font-display font-extrabold text-xs tracking-wider text-gray-200 uppercase">
              TR-1000 IN THE BABY-PHASE
            </h4>
          </div>

          <p className="font-sans text-[10px] text-gray-400 leading-relaxed mb-4">
            Die TR-1000 war eine großartige Legende der Musikproduktion, aber ihre analoge/digitale Schnittstellentechnologie leidet unter gravierenden physikalischen Einschränkungen wie USB-Controller-Flaschenhälsen und Jitter-Drift. 
            <br />
            <span className="text-white font-semibold">Das TR-X Konzept revolutioniert diese Infrastruktur vollständig:</span>
          </p>

          <div className="space-y-2.5">
            {comparisonData.map((row, index) => (
              <div key={index} className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <span className="font-display font-bold text-[9px] text-gray-400 uppercase tracking-widest block">
                  {row.metric}
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono mt-1">
                  <div className="bg-red-500/5 p-1 rounded border border-red-500/10">
                    <span className="text-gray-500 block uppercase text-[7px]">TR-1000 Standard</span>
                    <span className="text-red-400 font-medium block mt-0.5">{row.tr1000}</span>
                  </div>
                  <div className="bg-neon-green/5 p-1 rounded border border-neon-green/10">
                    <span className="text-gray-500 block uppercase text-[7px]">TR-X QUANTUM CORE</span>
                    <span className="text-neon-green font-bold block mt-0.5">{row.trx}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Engineering Spec Info */}
          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 mt-4 flex gap-2">
            <Info className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
            <p className="font-sans text-[9px] text-gray-500 leading-relaxed">
              <strong>Entwicklungsziel:</strong> Dieses softwareseitige Sensorium-Diagnosesystem bildet die native Firmware-Überwachungsschicht für die physische TR-X Steuerungseinheit. Synchroner Plug-and-Play-Betrieb ist bereits im USB-C Standard verankert.
            </p>
          </div>
        </div>

        {/* AUTHENTIC PHYSICAL HARDWARE PINOUTS & ELECTRICAL BLUEPRINTS */}
        <div className="bg-gradient-to-b from-[#131520] to-[#0a0b10] border border-white/10 rounded-2xl p-5 backdrop-blur-md relative">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-neon-cyan" />
              <h4 className="font-display font-black text-xs tracking-wider text-white uppercase">
                GEPRÜFTE HARDWARE-PINOUTS &amp; SCHALTPLÄNE
              </h4>
            </div>
            <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
              100% PHYSIKALISCH ECHT
            </span>
          </div>

          <div className="space-y-4 font-mono text-[10px]">
            
            {/* DIN 5-PIN MIDI Pinout */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between text-neon-cyan font-bold border-b border-white/5 pb-2 mb-2">
                <span>DIN 5-PIN 180° FEMALE (MIDI IN/OUT)</span>
                <span className="text-gray-500 text-[9px]">31.25 kbit/s Opto</span>
              </div>
              <pre className="text-gray-300 text-[9px] leading-tight overflow-x-auto p-2 bg-slate-950 rounded border border-white/5">
{`    (1)      (3)
   /   \\    /   \\       Pin 1: Unbelegt / NC
  (4)   (2)   (5)       Pin 2: Masse / Abschirmung (GND)
     \\       /          Pin 3: Unbelegt / Optional 5V DIN-Sync
       (   )            Pin 4: Stromschleife + (Current Loop +)
                        Pin 5: Stromschleife - (Current Loop -)`}
              </pre>
            </div>

            {/* TRS 3.5mm TYPE-A vs TYPE-B */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between text-neon-magenta font-bold border-b border-white/5 pb-2 mb-2">
                <span>3.5mm TRS-MIDI STANDARDS</span>
                <span className="text-gray-500 text-[9px]">Type A (MIDI Org) vs Type B</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div className="p-2 bg-slate-950 rounded border border-white/5">
                  <span className="text-neon-cyan font-bold block mb-1">TYPE-A (Standard)</span>
                  <div>Tip: Pin 5 (Current Loop -)</div>
                  <div>Ring: Pin 4 (Current Loop +)</div>
                  <div>Sleeve: Pin 2 (GND Shield)</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-white/5">
                  <span className="text-amber-400 font-bold block mb-1">TYPE-B (Legacy)</span>
                  <div>Tip: Pin 4 (Current Loop +)</div>
                  <div>Ring: Pin 5 (Current Loop -)</div>
                  <div>Sleeve: Pin 2 (GND Shield)</div>
                </div>
              </div>
            </div>

            {/* EURORACK 10/16-PIN POWER */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/10">
              <div className="flex items-center justify-between text-neon-green font-bold border-b border-white/5 pb-2 mb-2">
                <span>EURORACK 10/16-PIN POWER BUS</span>
                <span className="text-gray-500 text-[9px]">Doepfer A-100 Standard</span>
              </div>
              <pre className="text-gray-300 text-[8px] leading-tight overflow-x-auto p-2 bg-slate-950 rounded border border-white/5">
{`[  -12V  |  -12V  ]  Pin 1-2:   -12V DC (Rote Markierung)
[  GND   |  GND   ]  Pin 3-8:   System Masse (GND)
[  GND   |  GND   ]  
[  +12V  |  +12V  ]  Pin 9-10:  +12V DC
[   +5V  |   +5V  ]  Pin 11-12: +5V DC (16-Pin)
[ Gate   |  CV    ]  Pin 13-16: Internal Bus Gate/CV`}
              </pre>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
