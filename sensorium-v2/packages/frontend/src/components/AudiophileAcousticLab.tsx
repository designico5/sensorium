/**
 * SENSORIUM V2 — Audiophile Acoustic Lab
 * Blueprint §3.2: DSP-Pipeline Visualizer
 * Tube Preamp, 4-Band SIMD Biquad EQ, Convolution Reverb IR Viewer
 */
import { useState, useRef, useMemo, useEffect } from 'react';
import { useAudioStore } from '../store';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface EqBand {
  label: string;
  freq: number;
  gain: number;   // -12..+12 dB
  q: number;      // 0.5..8.0
  color: string;
  type: 'lowshelf' | 'peaking' | 'highshelf';
}

/* ═══════════════════════════════════════════════════════════════════
   Biquad Magnitude Response Calculator
   ═══════════════════════════════════════════════════════════════════ */

function computeBiquadResponse(
  freq: number,
  gainDb: number,
  q: number,
  type: 'lowshelf' | 'peaking' | 'highshelf',
  sampleRate: number = 48000
): number[] {
  const points: number[] = [];
  const numPoints = 256;
  const gain = Math.pow(10, gainDb / 40);
  const w0 = 2 * Math.PI * freq / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);

  for (let i = 0; i < numPoints; i++) {
    const f = 20 * Math.pow(2500, i / numPoints); // 20Hz to 20kHz log scale
    const w = 2 * Math.PI * f / sampleRate;
    const cosW = Math.cos(w);

    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

    if (type === 'peaking') {
      b0 = 1 + alpha * gain;
      b1 = -2 * cosW;
      b2 = 1 - alpha * gain;
      a0 = 1 + alpha / gain;
      a1 = -2 * cosW;
      a2 = 1 - alpha / gain;
    } else if (type === 'lowshelf') {
      const A = Math.pow(10, gainDb / 40);
      const sqrtA = Math.sqrt(A);
      b0 = A * ((A + 1) - (A - 1) * cosW + 2 * sqrtA * alpha);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW);
      b2 = A * ((A + 1) - (A - 1) * cosW - 2 * sqrtA * alpha);
      a0 = (A + 1) + (A - 1) * cosW + 2 * sqrtA * alpha;
      a1 = -2 * ((A - 1) + (A + 1) * cosW);
      a2 = (A + 1) + (A - 1) * cosW - 2 * sqrtA * alpha;
    } else {
      // highshelf
      const A = Math.pow(10, gainDb / 40);
      const sqrtA = Math.sqrt(A);
      b0 = A * ((A + 1) + (A - 1) * cosW + 2 * sqrtA * alpha);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW);
      b2 = A * ((A + 1) + (A - 1) * cosW - 2 * sqrtA * alpha);
      a0 = (A + 1) - (A - 1) * cosW + 2 * sqrtA * alpha;
      a1 = 2 * ((A - 1) - (A + 1) * cosW);
      a2 = (A + 1) - (A - 1) * cosW - 2 * sqrtA * alpha;
    }

    // Compute magnitude at this frequency
    const numReal = b0 + b1 * Math.cos(-w) + b2 * Math.cos(-2 * w);
    const numImag = b1 * Math.sin(-w) + b2 * Math.sin(-2 * w);
    const denReal = a0 + a1 * Math.cos(-w) + a2 * Math.cos(-2 * w);
    const denImag = a1 * Math.sin(-w) + a2 * Math.sin(-2 * w);

    const numMag = Math.sqrt(numReal * numReal + numImag * numImag);
    const denMag = Math.sqrt(denReal * denReal + denImag * denImag);
    const mag = numMag / denMag;
    const db = 20 * Math.log10(Math.max(mag, 0.0001));
    points.push(db);
  }
  return points;
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/* ── Tube Preamp Visualization ─────────────────────────────────── */
function TubePreampViz({ drive }: { drive: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectrum = useAudioStore((s) => s.spectrum);
  const transport = useAudioStore((s) => s.transport);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const isPlaying = transport === 'playing' || transport === 'recording';

      // Draw tube transfer function (soft clipping)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,149,10,0.6)';
      ctx.lineWidth = 2;

      for (let x = 0; x < w; x++) {
        const input = (x / w - 0.5) * 4; // -2 to +2
        // Soft clipping with drive
        const saturated = Math.tanh(input * drive);
        const y = h / 2 - saturated * (h / 2) * 0.8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw linear reference
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Audio waveform overlay
      if (isPlaying) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,149,10,0.3)';
        ctx.lineWidth = 1.5;
        for (let x = 0; x < w; x++) {
          const bandIdx = Math.floor((x / w) * 32);
          const val = spectrum[bandIdx] ?? 0;
          const y = h / 2 + Math.sin(x * 0.05 + animRef.current) * val * 30;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animRef.current += 0.05;
    };

    let raf: number;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [drive, transport, spectrum]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={100}
      style={{
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,149,10,0.15)',
      }}
    />
  );
}

/* ── EQ Curve Display ──────────────────────────────────────────── */
function EqCurveDisplay({ bands }: { bands: EqBand[] }) {
  const width = 400;
  const height = 120;

  // Compute combined response
  const combinedResponse = useMemo(() => {
    const result = new Float32Array(256);
    bands.forEach((band) => {
      const response = computeBiquadResponse(band.freq, band.gain, band.q, band.type);
      response.forEach((db, i) => { result[i] += db; });
    });
    return result;
  }, [bands]);

  // Build SVG path
  const pathD = useMemo(() => {
    let d = '';
    for (let i = 0; i < 256; i++) {
      const x = (i / 256) * width;
      const db = combinedResponse[i];
      const y = height / 2 - (db / 24) * (height / 2);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }, [combinedResponse]);

  // Fill path (area under curve)
  const areaD = useMemo(() => {
    return pathD + ` L ${width} ${height} L 0 ${height} Z`;
  }, [pathD]);

  // Frequency labels
  const freqLabels = [50, 100, 200, 500, '1k', '2k', '5k', '10k', '20k'];

  return (
    <svg width={width} height={height} style={{ borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.3)' }}>
      {/* Grid lines */}
      {[-12, -6, 0, 6, 12].map((db) => (
        <line
          key={db}
          x1={0}
          y1={height / 2 - (db / 24) * (height / 2)}
          x2={width}
          y2={height / 2 - (db / 24) * (height / 2)}
          stroke={db === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
          strokeWidth={db === 0 ? 1 : 0.5}
          strokeDasharray={db === 0 ? 'none' : '2 4'}
        />
      ))}

      {/* Individual band curves */}
      {bands.map((band) => {
        const response = computeBiquadResponse(band.freq, band.gain, band.q, band.type);
        let d = '';
        for (let i = 0; i < 256; i++) {
          const x = (i / 256) * width;
          const y = height / 2 - (response[i] / 24) * (height / 2);
          d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
        }
        return (
          <path
            key={band.label}
            d={d}
            fill="none"
            stroke={band.color}
            strokeWidth={1}
            opacity={0.25}
          />
        );
      })}

      {/* Combined curve fill */}
      <path d={areaD} fill="url(#eqGradient)" opacity={0.15} />

      {/* Combined curve */}
      <path d={pathD} fill="none" stroke="var(--neon-treble)" strokeWidth={2} opacity={0.8} />

      {/* Gradient definition */}
      <defs>
        <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--neon-treble)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Frequency labels */}
      {freqLabels.map((label, i) => (
        <text
          key={label}
          x={(i / (freqLabels.length - 1)) * width}
          y={height - 4}
          fill="rgba(255,255,255,0.2)"
          fontSize={8}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

/* ── EQ Band Knob ──────────────────────────────────────────────── */
function EqBandControl({ band, onChange }: { band: EqBand; onChange: (b: EqBand) => void }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border-subtle)',
    }}>
      {/* Gain knob */}
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <svg width={48} height={48} viewBox="0 0 48 48">
          {/* Track */}
          <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
          {/* Value arc */}
          <circle
            cx={24}
            cy={24}
            r={20}
            fill="none"
            stroke={band.color}
            strokeWidth={3}
            strokeDasharray={`${((band.gain + 12) / 24) * 125.6} 125.6`}
            strokeLinecap="round"
            transform="rotate(-225 24 24)"
            opacity={0.6}
          />
          {/* Center dot */}
          <circle cx={24} cy={24} r={8} fill="rgba(20,20,30,0.9)" stroke={band.color} strokeWidth={1.5} />
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: band.color,
        }}>
          {band.gain > 0 ? '+' : ''}{band.gain.toFixed(1)}
        </div>
      </div>

      {/* Label */}
      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)' }}>{band.label}</span>
      <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {band.freq >= 1000 ? `${band.freq / 1000}k` : band.freq}Hz
      </span>

      {/* Gain slider */}
      <input
        type="range"
        min={-12}
        max={12}
        step={0.5}
        value={band.gain}
        onChange={(e) => onChange({ ...band, gain: parseFloat(e.target.value) })}
        style={{ width: 60, accentColor: band.color }}
        aria-label={`${band.label} gain`}
      />
    </div>
  );
}

/* ── Impulse Response Viewer ───────────────────────────────────── */
function IrViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Generate synthetic IR (hall reverb impulse response)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(90,200,250,0.6)';
    ctx.lineWidth = 1;

    for (let x = 0; x < w; x++) {
      const t = x / w;
      // Exponential decay with noise
      const envelope = Math.exp(-t * 6);
      const noise = (Math.random() - 0.5) * 2;
      const earlyReflections = t < 0.05 ? Math.sin(t * 200) * 0.8 : 0;
      const value = (noise * envelope + earlyReflections) * 0.8;
      const y = h / 2 - value * (h / 2) * 0.9;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Center line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Time markers
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillText('0ms', 4, h - 4);
    ctx.fillText('50ms', w * 0.25, h - 4);
    ctx.fillText('100ms', w * 0.5, h - 4);
    ctx.fillText('500ms', w * 0.75, h - 4);
    ctx.fillText('1s', w - 20, h - 4);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={80}
      style={{
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(90,200,250,0.15)',
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main AudiophileAcousticLab Component
   ═══════════════════════════════════════════════════════════════════ */

export default function AudiophileAcousticLab() {
  const [drive, setDrive] = useState(1.5);
  const [eqBands, setEqBands] = useState<EqBand[]>([
    { label: 'Low', freq: 80, gain: 3, q: 0.7, color: '#ff2d55', type: 'lowshelf' },
    { label: 'Lo-Mid', freq: 300, gain: -1.5, q: 1.2, color: '#ff9f0a', type: 'peaking' },
    { label: 'Hi-Mid', freq: 2500, gain: 2, q: 1.5, color: '#af52de', type: 'peaking' },
    { label: 'High', freq: 10000, gain: 4, q: 0.7, color: '#5ac8fa', type: 'highshelf' },
  ]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'auto',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
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
            Acoustic Lab
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-tertiary)',
            marginTop: 2,
          }}>
            48kHz / 256 samples · SIMD Biquad · 4-Band EQ
          </div>
        </div>
        <div style={{
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(48,209,88,0.1)',
          border: '1px solid rgba(48,209,88,0.2)',
          color: 'var(--neon-success)',
          fontSize: 9,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
        }}>
          RT-SAFE
        </div>
      </div>

      {/* Signal Chain Overview */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-subtle)',
      }}>
        {['Input', 'Tube Preamp', '4-Band EQ', 'Convolution IR', 'Limiter', 'Output'].map((stage, i) => (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-subtle)',
              fontSize: 9,
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}>
              {stage}
            </div>
            {i < 5 && (
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                <path d="M0 4H10M8 1L11 4L8 7" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Tube Preamp Section */}
      <div style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        padding: 12,
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255,149,10,0.03)',
        border: '1px solid rgba(255,149,10,0.1)',
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,149,10,0.8)', marginBottom: 8 }}>
            Tube Preamp (12AX7 Model)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Drive</span>
            <input
              type="range"
              min={0.1}
              max={5}
              step={0.1}
              value={drive}
              onChange={(e) => setDrive(parseFloat(e.target.value))}
              style={{ width: 100, accentColor: '#ff9f0a' }}
              aria-label="Tube drive"
            />
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'rgba(255,149,10,0.8)',
              minWidth: 30,
            }}>
              {drive.toFixed(1)}
            </span>
          </div>
        </div>
        <TubePreampViz drive={drive} />
      </div>

      {/* 4-Band EQ Section */}
      <div style={{
        padding: 12,
        borderRadius: 'var(--radius-md)',
        background: 'rgba(90,200,250,0.03)',
        border: '1px solid rgba(90,200,250,0.1)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(90,200,250,0.8)', marginBottom: 12 }}>
          4-Band SIMD Biquad EQ
        </div>

        {/* EQ Curve */}
        <div style={{ marginBottom: 12 }}>
          <EqCurveDisplay bands={eqBands} />
        </div>

        {/* Band Controls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {eqBands.map((band, i) => (
            <EqBandControl
              key={band.label}
              band={band}
              onChange={(updated) => {
                setEqBands((prev) => prev.map((b, j) => j === i ? updated : b));
              }}
            />
          ))}
        </div>
      </div>

      {/* Convolution Reverb IR Viewer */}
      <div style={{
        padding: 12,
        borderRadius: 'var(--radius-md)',
        background: 'rgba(90,200,250,0.03)',
        border: '1px solid rgba(90,200,250,0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(90,200,250,0.8)' }}>
            Convolution Reverb — Impulse Response
          </div>
          <div style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-tertiary)',
          }}>
            Hall · 1.0s · 48kHz · 48000 samples
          </div>
        </div>
        <IrViewer />
      </div>
    </div>
  );
}
