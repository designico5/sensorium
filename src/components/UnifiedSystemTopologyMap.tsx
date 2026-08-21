import React, { useState } from 'react';
import {
  Activity,
  Layers,
  Zap,
  Sliders,
  Cpu,
  Radio,
  Clock,
  Bot,
  Terminal,
  Grid,
  Maximize2,
  Minimize2,
  ChevronRight,
  ShieldCheck,
  Disc,
  Workflow,
  Sparkles
} from 'lucide-react';
import { MidiDevice } from '../types';

interface UnifiedSystemTopologyMapProps {
  devices: MidiDevice[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  bpm: number;
  isCalibrating?: boolean;
}

export default function UnifiedSystemTopologyMap({
  devices,
  activeTab,
  setActiveTab,
  bpm,
  isCalibrating = false,
}: UnifiedSystemTopologyMapProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // System Nodes definition
  const nodes = [
    {
      id: 'mindmap',
      title: 'Signal Mindmap',
      sub: `${devices.length} Knoten aktiv`,
      icon: Layers,
      color: 'cyan',
      glow: 'rgba(0, 240, 255, 0.4)',
    },
    {
      id: 'diagnostics',
      title: 'Diagnostik & Matrix',
      sub: '0.08 ms DMA Puffer',
      icon: Activity,
      color: 'green',
      glow: 'rgba(16, 185, 129, 0.4)',
    },
    {
      id: 'code',
      title: 'DAW Bridge (Ableton)',
      sub: 'UDP Port 5126 Sync',
      icon: Terminal,
      color: 'magenta',
      glow: 'rgba(255, 0, 127, 0.4)',
    },
    {
      id: 'trxblueprint',
      title: 'Hardware Blueprints',
      sub: 'DIN & TRS-MIDI Pins',
      icon: Sliders,
      color: 'yellow',
      glow: 'rgba(245, 158, 11, 0.4)',
    },
    {
      id: 'recorder',
      title: 'Multi-Channel Recorder',
      sub: `${bpm} BPM Master Clock`,
      icon: Disc,
      color: 'purple',
      glow: 'rgba(168, 85, 247, 0.4)',
    },
    {
      id: 'mapping',
      title: 'MIDI Mapping',
      sub: 'Matrix Routing',
      icon: Workflow,
      color: 'blue',
      glow: 'rgba(59, 130, 246, 0.4)',
    },
  ];

  return (
    <div className="w-full bg-gradient-to-r from-zinc-950 via-slate-950 to-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden text-left my-4">
      
      {/* Background Subtle Grid Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <Workflow className={`w-4 h-4 ${isCalibrating ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-white">
                Zusammenhängende Sensorium System-Map
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30 font-mono text-[9px] font-bold uppercase">
                Visuelle Bandbreite
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono">
              Integrierter Überblick aller gekoppelten Subsysteme, MIDI-Busse &amp; DAW-Brücken im vollen Kreislauf.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
            ⚡ 100% Signal-Synchronisation
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-mono text-gray-300 transition flex items-center gap-1.5"
          >
            {isExpanded ? <Minimize2 className="w-3 h-3 text-neon-cyan" /> : <Maximize2 className="w-3 h-3 text-neon-cyan" />}
            {isExpanded ? 'Kompakt' : 'Vollbild Map'}
          </button>
        </div>
      </div>

      {/* Interconnected Visual Topology Map */}
      {isExpanded && (
        <div className="relative z-10 pt-2 animate-fade-in space-y-4">
          
          {/* Node Matrix Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 relative">
            
            {nodes.map((node) => {
              const Icon = node.icon;
              const isActive = activeTab === node.id;

              return (
                <button
                  key={node.id}
                  onClick={() => setActiveTab(node.id)}
                  className={`group relative p-3 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between ${
                    isActive
                      ? 'bg-slate-900 border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.25)] scale-[1.02]'
                      : 'bg-black/50 hover:bg-zinc-900/80 border-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Top Row Icon + Active Dot */}
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-1.5 rounded-lg border ${
                        isActive
                          ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                          : 'bg-white/5 border-white/10 text-gray-400 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                    )}
                  </div>

                  {/* Title & Sub */}
                  <div>
                    <h4
                      className={`font-display text-[11px] font-bold leading-tight ${
                        isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                      }`}
                    >
                      {node.title}
                    </h4>
                    <p className="font-mono text-[9px] text-gray-500 mt-0.5 truncate">
                      {node.sub}
                    </p>
                  </div>

                  {/* Interconnected Line Badge */}
                  <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between font-mono text-[8px] text-gray-400">
                    <span>{isActive ? 'Aktiviert' : 'Gekoppelt'}</span>
                    <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isActive ? 'translate-x-1 text-neon-cyan' : 'text-gray-600'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Animated Connecting Bus Bar */}
          <div className="relative h-6 rounded-xl bg-black/60 border border-white/10 px-4 flex items-center justify-between font-mono text-[9px] overflow-hidden">
            
            {/* Pulsing Bus Beam */}
            <div className="absolute inset-x-0 h-[1px] top-1/2 -translate-y-1/2 bg-gradient-to-r from-neon-cyan via-neon-green to-neon-magenta opacity-60 animate-pulse" />
            
            <span className="relative z-10 text-neon-cyan font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-ping" />
              IN-FLIGHT BUS: 24 PPQN CLOCK &amp; OSC UDP 5126 ACTIVE
            </span>

            <div className="relative z-10 flex items-center gap-4 text-gray-400">
              <span>HARDWARE DMA: 0.08ms</span>
              <span className="hidden md:inline text-neon-green font-semibold">STATUS: KREISLAUF STABIL</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
