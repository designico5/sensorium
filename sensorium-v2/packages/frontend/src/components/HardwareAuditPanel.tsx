/**
 * SENSORIUM V2 — Hardware Audit Panel
 * Blueprint §6.1: Real-time device health monitoring
 * Audio devices, MIDI controllers, GPU status, latency metrics
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { GlowPulse } from '../lib/interactions';
import { StatusIndicator } from '../lib/joyFeatures';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
  sampleRate: number;
  bufferSize: number;
  channels: number;
  latency: number; // ms
  status: 'active' | 'standby' | 'error';
  driver: string;
}

interface MidiDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
  channels: number;
  lastActivity: number;
  status: 'connected' | 'idle' | 'disconnected';
}

interface GpuStatus {
  name: string;
  api: string;
  vram: number; // MB
  vramUsed: number;
  computeUnits: number;
  temperature: number;
  utilization: number; // 0..1
}

/* ═══════════════════════════════════════════════════════════════════
   Simulated Device Data
   ═══════════════════════════════════════════════════════════════════ */

const AUDIO_DEVICES: AudioDevice[] = [
  { id: 'ad1', name: 'RME Fireface UCX II', type: 'output', sampleRate: 48000, bufferSize: 256, channels: 2, latency: 5.3, status: 'active', driver: 'ASIO' },
  { id: 'ad2', name: 'RME Fireface UCX II', type: 'input', sampleRate: 48000, bufferSize: 256, channels: 2, latency: 5.3, status: 'active', driver: 'ASIO' },
  { id: 'ad3', name: 'Focusrite Scarlett 2i2', type: 'output', sampleRate: 44100, bufferSize: 512, channels: 2, latency: 11.6, status: 'standby', driver: 'WASAPI' },
  { id: 'ad4', name: 'Virtual Audio Cable', type: 'output', sampleRate: 48000, bufferSize: 1024, channels: 2, latency: 21.3, status: 'standby', driver: 'WASAPI' },
];

const MIDI_DEVICES: MidiDevice[] = [
  { id: 'md1', name: 'Arturia KeyLab 88', type: 'input', channels: 16, lastActivity: Date.now() - 2000, status: 'connected' },
  { id: 'md2', name: 'Novation Launchpad Pro', type: 'input', channels: 16, lastActivity: Date.now() - 5000, status: 'connected' },
  { id: 'md3', name: 'Ableton Push 3', type: 'input', channels: 16, lastActivity: Date.now() - 30000, status: 'idle' },
  { id: 'md4', name: 'MIDI Loopback', type: 'output', channels: 16, lastActivity: Date.now() - 1000, status: 'connected' },
];

const GPU_STATUS: GpuStatus = {
  name: 'NVIDIA RTX 4090',
  api: 'WebGPU / Vulkan',
  vram: 24576,
  vramUsed: 2340,
  computeUnits: 128,
  temperature: 42,
  utilization: 0.15,
};

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Status Badge (with StatusIndicator integration) ────────────── */
function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, 'safe' | 'armed' | 'live' | 'standby' | 'offline'> = {
    active: 'safe',
    connected: 'safe',
    standby: 'standby',
    idle: 'offline',
    error: 'live',
    disconnected: 'live',
  };
  const colorMap: Record<string, string> = {
    active: 'var(--neon-success)',
    connected: 'var(--neon-success)',
    standby: 'var(--neon-warning)',
    idle: 'var(--text-tertiary)',
    error: 'var(--neon-danger)',
    disconnected: 'var(--neon-danger)',
  };
  const color = colorMap[status] ?? 'var(--text-tertiary)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 9,
      color,
      fontWeight: 600,
    }}>
      <StatusIndicator status={statusMap[status] ?? 'offline'} size="sm" />
      {status.toUpperCase()}
    </div>
  );
}

/* ── Device Card (with hover interaction) ──────────────────────── */
function DeviceCard({ name, children }: { name: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'var(--border-default)' : 'var(--border-subtle)'}`,
        transition: 'all var(--t-fast) var(--t-smooth)',
      }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {name}
        {hovered && <GlowPulse color="var(--neon-treble)" isActive size="sm" />}
      </div>
      {children}
    </div>
  );
}

/* ── GPU Meter ─────────────────────────────────────────────────── */
function GpuMeter({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit: string;
}) {
  const pct = value / max;
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 9,
        color: 'var(--text-tertiary)',
        marginBottom: 3,
      }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color }}>{value}{unit} / {max}{unit}</span>
      </div>
      <div style={{
        height: 4,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{
            height: '100%',
            background: color,
            borderRadius: 2,
            boxShadow: `0 0 4px ${color}40`,
          }}
        />
      </div>
    </div>
  );
}

/* ── Latency Gauge ─────────────────────────────────────────────── */
function LatencyGauge({ latency }: { latency: number }) {
  const color = latency < 6 ? 'var(--neon-success)' : latency < 15 ? 'var(--neon-warning)' : 'var(--neon-danger)';
  const rating = latency < 6 ? 'EXCELLENT' : latency < 15 ? 'GOOD' : 'HIGH';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color,
      }}>
        {latency.toFixed(1)}
      </div>
      <div>
        <div style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>ms round-trip</div>
        <div style={{ fontSize: 9, fontWeight: 600, color }}>{rating}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main HardwareAuditPanel Component
   ═══════════════════════════════════════════════════════════════════ */

export default function HardwareAuditPanel() {
  const [gpuTemp, setGpuTemp] = useState(GPU_STATUS.temperature);
  const [gpuUtil, setGpuUtil] = useState(GPU_STATUS.utilization);

  // Simulate GPU telemetry updates
  useEffect(() => {
    const interval = setInterval(() => {
      setGpuTemp(40 + Math.random() * 8);
      setGpuUtil(0.1 + Math.random() * 0.2);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalLatency = useMemo(() => {
    const activeOut = AUDIO_DEVICES.find((d) => d.type === 'output' && d.status === 'active');
    const activeIn = AUDIO_DEVICES.find((d) => d.type === 'input' && d.status === 'active');
    return (activeOut?.latency ?? 0) + (activeIn?.latency ?? 0);
  }, []);

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
            Hardware Audit
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginTop: 2,
          }}>
            Real-time device health monitoring
          </div>
        </div>
        <LatencyGauge latency={totalLatency} />
      </div>

      {/* Audio Devices */}
      <div>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}>
          Audio Devices ({AUDIO_DEVICES.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {AUDIO_DEVICES.map((dev) => (
            <DeviceCard key={dev.id} name={`${dev.name} (${dev.type})`}>
              <div style={{
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <StatusBadge status={dev.status} />
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {dev.sampleRate / 1000}kHz
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {dev.bufferSize} buf
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {dev.channels}ch
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {dev.driver}
                </span>
                <span style={{ fontSize: 9, color: dev.latency < 10 ? 'var(--neon-success)' : 'var(--neon-warning)', fontFamily: 'var(--font-mono)' }}>
                  {dev.latency}ms
                </span>
              </div>
            </DeviceCard>
          ))}
        </div>
      </div>

      {/* MIDI Devices */}
      <div>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}>
          MIDI Devices ({MIDI_DEVICES.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MIDI_DEVICES.map((dev) => (
            <DeviceCard key={dev.id} name={`${dev.name} (${dev.type})`}>
              <div style={{
                display: 'flex',
                gap: 16,
                alignItems: 'center',
              }}>
                <StatusBadge status={dev.status} />
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {dev.channels} CH
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Last: {formatTimeAgo(dev.lastActivity)}
                </span>
              </div>
            </DeviceCard>
          ))}
        </div>
      </div>

      {/* GPU Status */}
      <div>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 8,
        }}>
          GPU Compute
        </div>
        <DeviceCard name={GPU_STATUS.name}>
          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 10,
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {GPU_STATUS.api}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {GPU_STATUS.computeUnits} CUs
            </span>
            <span style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: gpuTemp < 60 ? 'var(--neon-success)' : gpuTemp < 80 ? 'var(--neon-warning)' : 'var(--neon-danger)',
            }}>
              {gpuTemp.toFixed(0)}°C
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <GpuMeter
              label="VRAM"
              value={GPU_STATUS.vramUsed}
              max={GPU_STATUS.vram}
              color="var(--neon-treble)"
              unit="MB"
            />
            <GpuMeter
              label="Utilization"
              value={Math.round(gpuUtil * 100)}
              max={100}
              color="var(--neon-mid)"
              unit="%"
            />
          </div>
        </DeviceCard>
      </div>
    </div>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}
