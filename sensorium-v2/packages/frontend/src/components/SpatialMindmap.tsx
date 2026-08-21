/**
 * SENSORIUM V2 — Spatial Mindmap & Patchbay
 * Blueprint §3.1: Node-based audio routing graph with 144Hz drag
 * Catenary cable physics between connected nodes
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAudioStore } from '../store';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface MindmapNode {
  id: string;
  type: 'source' | 'process' | 'output' | 'effect';
  label: string;
  x: number;
  y: number;
  inputs: number;
  outputs: number;
  color: string;
  active: boolean;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  fromPort: number;
  toPort: number;
}

/* ═══════════════════════════════════════════════════════════════════
   Default Nodes (Audio Signal Chain)
   ═══════════════════════════════════════════════════════════════════ */

const INITIAL_NODES: MindmapNode[] = [
  { id: 'osc1', type: 'source', label: 'Oscillator 1', x: 60, y: 80, inputs: 0, outputs: 1, color: '#ff2d55', active: true },
  { id: 'osc2', type: 'source', label: 'Oscillator 2', x: 60, y: 180, inputs: 0, outputs: 1, color: '#ff6482', active: true },
  { id: 'noise', type: 'source', label: 'Noise Gen', x: 60, y: 280, inputs: 0, outputs: 1, color: '#ff9f0a', active: false },
  { id: 'filter', type: 'process', label: 'SVF Filter', x: 260, y: 120, inputs: 2, outputs: 1, color: '#af52de', active: true },
  { id: 'amp', type: 'process', label: 'VCA Amp', x: 420, y: 120, inputs: 2, outputs: 1, color: '#bf5af2', active: true },
  { id: 'lfo1', type: 'source', label: 'LFO 1', x: 260, y: 280, inputs: 0, outputs: 2, color: '#5ac8fa', active: true },
  { id: 'reverb', type: 'effect', label: 'Reverb', x: 560, y: 80, inputs: 1, outputs: 1, color: '#30d158', active: true },
  { id: 'delay', type: 'effect', label: 'Delay', x: 560, y: 180, inputs: 1, outputs: 1, color: '#30db5b', active: false },
  { id: 'chorus', type: 'effect', label: 'Chorus', x: 560, y: 280, inputs: 1, outputs: 1, color: '#64d2ff', active: false },
  { id: 'mixer', type: 'process', label: 'Mixer', x: 720, y: 140, inputs: 4, outputs: 1, color: '#ffd60a', active: true },
  { id: 'master', type: 'output', label: 'Master Out', x: 880, y: 140, inputs: 2, outputs: 0, color: '#ff2d55', active: true },
  { id: 'meter', type: 'output', label: 'Meter', x: 880, y: 260, inputs: 1, outputs: 0, color: '#5ac8fa', active: true },
];

const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'c1', from: 'osc1', to: 'filter', fromPort: 0, toPort: 0 },
  { id: 'c2', from: 'osc2', to: 'filter', fromPort: 0, toPort: 1 },
  { id: 'c3', from: 'filter', to: 'amp', fromPort: 0, toPort: 0 },
  { id: 'c4', from: 'lfo1', to: 'filter', fromPort: 0, toPort: 1 },
  { id: 'c5', from: 'amp', to: 'reverb', fromPort: 0, toPort: 0 },
  { id: 'c6', from: 'amp', to: 'delay', fromPort: 0, toPort: 0 },
  { id: 'c7', from: 'reverb', to: 'mixer', fromPort: 0, toPort: 0 },
  { id: 'c8', from: 'delay', to: 'mixer', fromPort: 0, toPort: 1 },
  { id: 'c9', from: 'chorus', to: 'mixer', fromPort: 0, toPort: 2 },
  { id: 'c10', from: 'mixer', to: 'master', fromPort: 0, toPort: 0 },
  { id: 'c11', from: 'mixer', to: 'meter', fromPort: 0, toPort: 0 },
];

/* ═══════════════════════════════════════════════════════════════════
   Node Type Icons
   ═══════════════════════════════════════════════════════════════════ */

function NodeIcon({ type }: { type: MindmapNode['type'] }) {
  const size = 14;
  switch (type) {
    case 'source':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4" />
          <path d="M7 3V7L9.5 9.5" />
        </svg>
      );
    case 'process':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="10" height="10" rx="2" />
          <path d="M5 7H9M7 5V9" />
        </svg>
      );
    case 'effect':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 7C2 7 4 3 7 3C10 3 12 7 12 7C12 7 10 11 7 11C4 11 2 7 2 7Z" />
          <circle cx="7" cy="7" r="2" />
        </svg>
      );
    case 'output':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="3,2 11,7 3,12" />
        </svg>
      );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Catenary Cable (SVG Path between nodes)
   ═══════════════════════════════════════════════════════════════════ */

function CatenaryCable({
  fromX, fromY, toX, toY, color, active,
}: {
  fromX: number; fromY: number; toX: number; toY: number; color: string; active: boolean;
}) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Catenary sag: more sag for longer cables
  const sag = Math.min(dist * 0.15, 40);
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 + sag;

  const path = `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;

  return (
    <g>
      {/* Glow */}
      {active && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={4}
          opacity={0.15}
          strokeLinecap="round"
        />
      )}
      {/* Main cable */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2 : 1.2}
        opacity={active ? 0.8 : 0.3}
        strokeLinecap="round"
        strokeDasharray={active ? 'none' : '4 4'}
      />
      {/* Signal flow particles */}
      {active && (
        <circle r="2.5" fill={color}>
          <animateMotion dur={`${1.5 + dist * 0.003}s`} repeatCount="indefinite" path={path} />
        </circle>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Patchbay Node Component
   ═══════════════════════════════════════════════════════════════════ */

function PatchbayNode({
  node,
  onDragStart,
  isSelected,
  onClick,
}: {
  node: MindmapNode;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  isSelected: boolean;
  onClick: (id: string) => void;
}) {
  const spectrum = useAudioStore((s) => s.spectrum);
  const transport = useAudioStore((s) => s.transport);
  const isPlaying = transport === 'playing' || transport === 'recording';

  // Audio-reactive glow based on frequency band
  const freqIndex = useMemo(() => Math.floor(Math.random() * 32), []);
  const energy = isPlaying ? (spectrum[freqIndex] ?? 0) : 0;

  return (
    <motion.g
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(node.id, e); }}
      onClick={() => onClick(node.id)}
      style={{ cursor: 'grab' }}
    >
      {/* Audio-reactive glow */}
      {node.active && isPlaying && (
        <rect
          x={node.x - 4}
          y={node.y - 4}
          width={148}
          height={52}
          rx={10}
          fill={node.color}
          opacity={energy * 0.2}
          filter="url(#glow)"
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <rect
          x={node.x - 3}
          y={node.y - 3}
          width={146}
          height={50}
          rx={10}
          fill="none"
          stroke={node.color}
          strokeWidth={2}
          strokeDasharray="4 2"
          opacity={0.6}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${node.x + 70} ${node.y + 22}`}
            to={`360 ${node.x + 70} ${node.y + 22}`}
            dur="8s"
            repeatCount="indefinite"
          />
        </rect>
      )}

      {/* Node body */}
      <rect
        x={node.x}
        y={node.y}
        width={140}
        height={44}
        rx={8}
        fill={node.active ? 'rgba(20,20,30,0.95)' : 'rgba(15,15,20,0.8)'}
        stroke={node.active ? node.color : 'rgba(255,255,255,0.08)'}
        strokeWidth={node.active ? 1.5 : 1}
      />

      {/* Color accent bar */}
      <rect
        x={node.x}
        y={node.y}
        width={4}
        height={44}
        rx={2}
        fill={node.color}
        opacity={node.active ? 1 : 0.3}
      />

      {/* Icon */}
      <foreignObject x={node.x + 12} y={node.y + 6} width={16} height={16}>
        <div style={{ color: node.color, opacity: node.active ? 1 : 0.4 }}>
          <NodeIcon type={node.type} />
        </div>
      </foreignObject>

      {/* Label */}
      <text
        x={node.x + 34}
        y={node.y + 18}
        fill={node.active ? '#fff' : 'rgba(255,255,255,0.4)'}
        fontSize={11}
        fontWeight={600}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {node.label}
      </text>

      {/* Type badge */}
      <text
        x={node.x + 34}
        y={node.y + 33}
        fill="rgba(255,255,255,0.25)"
        fontSize={8}
        fontFamily="JetBrains Mono, monospace"
      >
        {node.type}
      </text>

      {/* Input ports */}
      {Array.from({ length: node.inputs }).map((_, i) => (
        <circle
          key={`in-${i}`}
          cx={node.x}
          cy={node.y + 12 + i * 12}
          r={4}
          fill="rgba(20,20,30,0.95)"
          stroke={node.color}
          strokeWidth={1.5}
        />
      ))}

      {/* Output ports */}
      {Array.from({ length: node.outputs }).map((_, i) => (
        <circle
          key={`out-${i}`}
          cx={node.x + 140}
          cy={node.y + 12 + i * 12}
          r={4}
          fill={node.color}
          stroke="rgba(20,20,30,0.95)"
          strokeWidth={1.5}
        />
      ))}
    </motion.g>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main SpatialMindmap Component
   ═══════════════════════════════════════════════════════════════════ */

export default function SpatialMindmap() {
  const [nodes, setNodes] = useState<MindmapNode[]>(INITIAL_NODES);
  const [connections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // 144Hz drag handler
  const handleDragStart = useCallback((id: string, e: React.MouseEvent) => {
    setDragging(id);
    const node = nodes.find((n) => n.id === id);
    if (!node || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    };
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.current.x;
    const y = e.clientY - rect.top - dragOffset.current.y;
    setNodes((prev) =>
      prev.map((n) => (n.id === dragging ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n))
    );
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Build node lookup for connections
  const nodeMap = useMemo(() => {
    const map = new Map<string, MindmapNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'var(--surface-0)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 16,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          Spatial Mindmap
        </span>
        <span style={{
          fontSize: 9,
          color: 'var(--text-tertiary)',
          padding: '2px 6px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 4,
          fontFamily: 'var(--font-mono)',
        }}>
          {nodes.length} nodes · {connections.length} cables
        </span>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelectedNode(null)}
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Grid pattern */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Catenary cables */}
        <g>
          {connections.map((conn) => {
            const fromNode = nodeMap.get(conn.from);
            const toNode = nodeMap.get(conn.to);
            if (!fromNode || !toNode) return null;
            const fromX = fromNode.x + 140;
            const fromY = fromNode.y + 12 + conn.fromPort * 12;
            const toX = toNode.x;
            const toY = toNode.y + 12 + conn.toPort * 12;
            return (
              <CatenaryCable
                key={conn.id}
                fromX={fromX}
                fromY={fromY}
                toX={toX}
                toY={toY}
                color={fromNode.color}
                active={fromNode.active && toNode.active}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => (
            <PatchbayNode
              key={node.id}
              node={node}
              onDragStart={handleDragStart}
              isSelected={selectedNode === node.id}
              onClick={(id) => setSelectedNode(id)}
            />
          ))}
        </g>
      </svg>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 16,
        display: 'flex',
        gap: 12,
        fontSize: 9,
        color: 'var(--text-tertiary)',
      }}>
        {[
          { type: 'source', color: '#ff2d55', label: 'Source' },
          { type: 'process', color: '#af52de', label: 'Process' },
          { type: 'effect', color: '#30d158', label: 'Effect' },
          { type: 'output', color: '#ffd60a', label: 'Output' },
        ].map((item) => (
          <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
