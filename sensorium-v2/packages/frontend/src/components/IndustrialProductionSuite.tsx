/**
 * SENSORIUM V2 — Industrial Production Suite
 * Blueprint §6.2: Professional production metering & system health
 * CPU/RAM/Audio thread monitoring, xrun counter, thermal gauge
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAudioStore } from '../store';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface ThreadMetric {
  name: string;
  cpu: number;       // 0..100
  priority: string;
  color: string;
  realtime: boolean;
}

interface SystemHealth {
  cpuTotal: number;
  cpuPerCore: number[];
  ramUsed: number;   // GB
  ramTotal: number;
  xruns: number;
  droppedFrames: number;
  uptime: number;    // seconds
  audioThreadLoad: number;
  gpuTemp: number;
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Circular Gauge ────────────────────────────────────────────── */
function CircularGauge({
  value,
  max,
  label,
  unit,
  color,
  size = 80,
  warning = 0.7,
  danger = 0.9,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
  warning?: number;
  danger?: number;
}) {
  const pct = value / max;
  const actualColor = pct >= danger ? '#ff453a' : pct >= warning ? '#ff9f0a' : color;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees
  const dashOffset = arcLength * (1 - pct);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={4}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
        {/* Value arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={actualColor}
          strokeWidth={4}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{
            filter: `drop-shadow(0 0 3px ${actualColor}40)`,
            transition: 'stroke-dashoffset 0.3s ease-out',
          }}
        />
        {/* Center value */}
        <text
          x={size / 2}
          y={size / 2 - 2}
          textAnchor="middle"
          fill={actualColor}
          fontSize={size > 60 ? 16 : 12}
          fontWeight={700}
          fontFamily="JetBrains Mono, monospace"
        >
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize={8}
          fontFamily="JetBrains Mono, monospace"
        >
          {unit}
        </text>
      </svg>
      <span style={{
        fontSize: 9,
        fontWeight: 600,
        color: 'var(--text-secondary)',
      }}>
        {label}
      </span>
    </div>
  );
}

/* ── VU Meter (Stereo Pair) ────────────────────────────────────── */
function VuMeterPair() {
  const masterPeakL = useAudioStore((s) => s.masterPeakL);
  const masterPeakR = useAudioStore((s) => s.masterPeakR);
  const transport = useAudioStore((s) => s.transport);
  const isActive = transport === 'playing' || transport === 'recording';

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 120 }}>
      {[masterPeakL, masterPeakR].map((peak, ch) => {
        const level = isActive ? peak : 0;
        const segments = 20;
        return (
          <div key={ch} style={{
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 1,
            width: 8,
          }}>
            {Array.from({ length: segments }).map((_, i) => {
              const threshold = i / segments;
              const active = level > threshold;
              const segColor = i >= segments * 0.85 ? '#ff453a' : i >= segments * 0.6 ? '#ff9f0a' : '#30d158';
              return (
                <motion.div
                  key={i}
                  animate={{ opacity: active ? 1 : 0.1 }}
                  transition={{ duration: 0.05 }}
                  style={{
                    height: 4,
                    borderRadius: 1,
                    background: active ? segColor : 'rgba(255,255,255,0.04)',
                    boxShadow: active ? `0 0 3px ${segColor}40` : 'none',
                  }}
                />
              );
            })}
          </div>
        );
      })}
      {/* Scale labels */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 120,
        paddingLeft: 4,
      }}>
        {['+6', '0', '-6', '-12', '-24', '-∞'].map((label) => (
          <span key={label} style={{
            fontSize: 7,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Thread Monitor ────────────────────────────────────────────── */
function ThreadMonitor({ threads }: { threads: ThreadMetric[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {threads.map((thread) => (
        <div key={thread.name} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* RT badge */}
          {thread.realtime && (
            <span style={{
              padding: '1px 4px',
              borderRadius: 2,
              background: 'rgba(48,209,88,0.15)',
              border: '1px solid rgba(48,209,88,0.3)',
              color: 'var(--neon-success)',
              fontSize: 7,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              minWidth: 18,
              textAlign: 'center',
            }}>
              RT
            </span>
          )}
          {/* Name */}
          <span style={{
            fontSize: 9,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            minWidth: 100,
          }}>
            {thread.name}
          </span>
          {/* CPU bar */}
          <div style={{
            flex: 1,
            height: 6,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <motion.div
              animate={{ width: `${thread.cpu}%` }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              style={{
                height: '100%',
                background: thread.cpu > 80 ? '#ff453a' : thread.cpu > 50 ? '#ff9f0a' : thread.color,
                borderRadius: 3,
              }}
            />
          </div>
          {/* Value */}
          <span style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: thread.cpu > 80 ? '#ff453a' : thread.color,
            minWidth: 36,
            textAlign: 'right',
          }}>
            {thread.cpu.toFixed(1)}%
          </span>
          {/* Priority */}
          <span style={{
            fontSize: 8,
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
            minWidth: 30,
          }}>
            P{thread.priority}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── XRun Counter ──────────────────────────────────────────────── */
function XRunDisplay({ xruns }: { xruns: number }) {
  const color = xruns === 0 ? 'var(--neon-success)' : xruns < 5 ? 'var(--neon-warning)' : 'var(--neon-danger)';
  const status = xruns === 0 ? 'CLEAN' : xruns < 5 ? 'MINOR' : 'CRITICAL';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      background: `${color}08`,
      border: `1px solid ${color}20`,
    }}>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color,
      }}>
        {xruns}
      </div>
      <div>
        <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>XRuns (buffer underruns)</div>
        <div style={{ fontSize: 10, fontWeight: 600, color }}>{status}</div>
      </div>
    </div>
  );
}

/* ── CPU Core Heatmap ──────────────────────────────────────────── */
function CpuCoreHeatmap({ cores }: { cores: number[] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(8, cores.length)}, 1fr)`,
      gap: 3,
    }}>
      {cores.map((load, i) => {
        const color = load > 80 ? '#ff453a' : load > 50 ? '#ff9f0a' : load > 20 ? '#5ac8fa' : '#30d158';
        return (
          <div key={i} style={{
            padding: '4px 6px',
            borderRadius: 3,
            background: `${color}${Math.round(load * 0.3).toString(16).padStart(2, '0')}`,
            border: `1px solid ${color}20`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color,
            }}>
              {load.toFixed(0)}%
            </div>
            <div style={{
              fontSize: 7,
              color: 'var(--text-tertiary)',
            }}>
              C{i}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main IndustrialProductionSuite Component
   ═══════════════════════════════════════════════════════════════════ */

export default function IndustrialProductionSuite() {
  const [health, setHealth] = useState<SystemHealth>({
    cpuTotal: 12.3,
    cpuPerCore: [8, 15, 22, 5, 12, 3, 18, 7, 10, 25, 4, 14, 9, 6, 11, 20],
    ramUsed: 4.2,
    ramTotal: 32,
    xruns: 0,
    droppedFrames: 0,
    uptime: 3847,
    audioThreadLoad: 23.5,
    gpuTemp: 42,
  });

  // Simulate health updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHealth((prev) => ({
        ...prev,
        cpuTotal: 8 + Math.random() * 12,
        cpuPerCore: prev.cpuPerCore.map(() => Math.random() * 30),
        ramUsed: 3.8 + Math.random() * 1.5,
        audioThreadLoad: 18 + Math.random() * 15,
        gpuTemp: 38 + Math.random() * 10,
        uptime: prev.uptime + 1,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const threads: ThreadMetric[] = useMemo(() => [
    { name: 'Audio Engine', cpu: health.audioThreadLoad, priority: '99', color: '#ff2d55', realtime: true },
    { name: 'MIDI Parser', cpu: 2.1, priority: '90', color: '#af52de', realtime: true },
    { name: 'GPU Submit', cpu: 4.8, priority: '50', color: '#5ac8fa', realtime: false },
    { name: 'AI Inference', cpu: 8.3, priority: '30', color: '#30d158', realtime: false },
    { name: 'UI Render', cpu: 6.2, priority: '20', color: '#ffd60a', realtime: false },
    { name: 'CRDT Sync', cpu: 1.4, priority: '40', color: '#ff9f0a', realtime: false },
  ], [health.audioThreadLoad]);

  const uptimeStr = useMemo(() => {
    const h = Math.floor(health.uptime / 3600);
    const m = Math.floor((health.uptime % 3600) / 60);
    const s = health.uptime % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [health.uptime]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'auto',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}>
            Production Monitor
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginTop: 2,
            display: 'flex',
            gap: 12,
          }}>
            <span>Uptime: {uptimeStr}</span>
            <span style={{ color: 'var(--neon-success)' }}>● All Systems Nominal</span>
          </div>
        </div>
        <VuMeterPair />
      </div>

      {/* Gauges Row */}
      <div style={{
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        padding: '8px 0',
      }}>
        <CircularGauge
          value={health.cpuTotal}
          max={100}
          label="CPU Total"
          unit="%"
          color="#5ac8fa"
          size={90}
        />
        <CircularGauge
          value={health.ramUsed}
          max={health.ramTotal}
          label="RAM"
          unit="GB"
          color="#af52de"
          size={90}
        />
        <CircularGauge
          value={health.audioThreadLoad}
          max={100}
          label="Audio Thread"
          unit="%"
          color="#ff2d55"
          size={90}
          warning={0.6}
          danger={0.8}
        />
        <CircularGauge
          value={health.gpuTemp}
          max={100}
          label="GPU Temp"
          unit="°C"
          color="#30d158"
          size={90}
          warning={0.7}
          danger={0.85}
        />
      </div>

      {/* XRun + Dropped Frames */}
      <div style={{ display: 'flex', gap: 8 }}>
        <XRunDisplay xruns={health.xruns} />
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(90,200,250,0.05)',
          border: '1px solid rgba(90,200,250,0.15)',
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--neon-treble)',
          }}>
            {health.droppedFrames}
          </div>
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Dropped Frames</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--neon-treble)' }}>ZERO DROPS</div>
          </div>
        </div>
      </div>

      {/* CPU Core Heatmap */}
      <div>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}>
          CPU Core Heatmap ({health.cpuPerCore.length} cores)
        </div>
        <CpuCoreHeatmap cores={health.cpuPerCore} />
      </div>

      {/* Thread Monitor */}
      <div>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}>
          Thread Monitor
        </div>
        <ThreadMonitor threads={threads} />
      </div>
    </div>
  );
}
