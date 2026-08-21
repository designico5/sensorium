/**
 * SENSORIUM V2 — Volumetric Frequency Cloud
 * Blueprint §4.1: 4096 particles with beat-reactive explosions
 * Uses Three.js + React Three Fiber with GPU-optimized instancing
 */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion } from 'motion/react';
import * as THREE from 'three';
import { useAudioStore, useVisualStore } from '../store';

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const PARTICLE_COUNT = 4096;
const FREQ_BANDS = 64;
const EXPLOSION_DECAY = 0.92;

/* ═══════════════════════════════════════════════════════════════════
   Volumetric Cloud Core
   ═══════════════════════════════════════════════════════════════════ */

function VolumetricCloud() {
  const meshRef = useRef<THREE.Points>(null);
  const spectrum = useAudioStore((s) => s.spectrum);
  const beat = useAudioStore((s) => s.beat);
  const transport = useAudioStore((s) => s.transport);
  const intensity = useVisualStore((s) => s.intensity);
  const reactive = useVisualStore((s) => s.reactive);

  // Explosion state
  const explosionRef = useRef(0);
  const prevBeatRef = useRef(0);

  // Base positions (spherical distribution)
  const { basePositions, frequencies, velocities, colors } = useMemo(() => {
    const bp = new Float32Array(PARTICLE_COUNT * 3);
    const freq = new Float32Array(PARTICLE_COUNT);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Spherical distribution with volume
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 2.5;

      bp[i3] = r * Math.sin(phi) * Math.cos(theta);
      bp[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      bp[i3 + 2] = r * Math.cos(phi);

      // Frequency band assignment
      freq[i] = Math.floor((i / PARTICLE_COUNT) * FREQ_BANDS);

      // Initial velocity (outward from center)
      const norm = Math.sqrt(bp[i3] ** 2 + bp[i3 + 1] ** 2 + bp[i3 + 2] ** 2) || 1;
      vel[i3] = bp[i3] / norm * 0.02;
      vel[i3 + 1] = bp[i3 + 1] / norm * 0.02;
      vel[i3 + 2] = bp[i3 + 2] / norm * 0.02;

      // Base color (HSL → RGB)
      const hue = freq[i] / FREQ_BANDS;
      const rgb = hslToRgb(hue, 0.8, 0.5);
      col[i3] = rgb[0];
      col[i3 + 1] = rgb[1];
      col[i3 + 2] = rgb[2];
    }
    return { basePositions: bp, frequencies: freq, velocities: vel, colors: col };
  }, []);

  // Detect beat → trigger explosion
  useFrame((state) => {
    if (!meshRef.current) return;

    const isPlaying = transport === 'playing' || transport === 'recording';
    const currentBeat = beat;

    // Beat detection → explosion
    if (currentBeat !== prevBeatRef.current && isPlaying) {
      explosionRef.current = 1.0;
    }
    prevBeatRef.current = currentBeat;

    // Decay explosion
    explosionRef.current *= EXPLOSION_DECAY;

    const positions = meshRef.current.geometry.attributes.position;
    const posArray = positions.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const band = frequencies[i];
      const freqValue = reactive && isPlaying ? spectrum[band] ?? 0 : 0.1;

      // Base oscillation
      const oscX = Math.sin(time * 0.5 + i * 0.01) * 0.1;
      const oscY = Math.cos(time * 0.3 + i * 0.015) * 0.1;
      const oscZ = Math.sin(time * 0.4 + i * 0.008) * 0.1;

      // Frequency displacement (outward from center)
      const bx = basePositions[i3];
      const by = basePositions[i3 + 1];
      const bz = basePositions[i3 + 2];
      const dist = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      const freqDisplace = freqValue * intensity * 2.0;

      // Explosion displacement
      const explosionForce = explosionRef.current;
      const expX = velocities[i3] * explosionForce * 8;
      const expY = velocities[i3 + 1] * explosionForce * 8;
      const expZ = velocities[i3 + 2] * explosionForce * 8;

      posArray[i3] = bx + oscX + (bx / dist) * freqDisplace + expX;
      posArray[i3 + 1] = by + oscY + (by / dist) * freqDisplace + expY;
      posArray[i3 + 2] = bz + oscZ + (bz / dist) * freqDisplace + expZ;
    }

    positions.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={basePositions.slice()}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Beat-Reactive Shockwave Ring
   ═══════════════════════════════════════════════════════════════════ */

function ShockwaveRing() {
  const ringRef = useRef<THREE.Mesh>(null);
  const beat = useAudioStore((s) => s.beat);
  const transport = useAudioStore((s) => s.transport);
  const intensity = useVisualStore((s) => s.intensity);
  const scaleRef = useRef(1);
  const opacityRef = useRef(0);
  const prevBeatRef = useRef(-1);

  useFrame(() => {
    if (!ringRef.current) return;
    const isPlaying = transport === 'playing' || transport === 'recording';

    if (beat !== prevBeatRef.current && isPlaying) {
      scaleRef.current = 0.5;
      opacityRef.current = 0.8 * intensity;
    }
    prevBeatRef.current = beat;

    scaleRef.current += (3.0 - scaleRef.current) * 0.06;
    opacityRef.current *= 0.94;

    ringRef.current.scale.setScalar(scaleRef.current);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacityRef.current;
  });

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.8, 2.0, 64]} />
      <meshBasicMaterial
        color="#5ac8fa"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Camera Rig
   ═══════════════════════════════════════════════════════════════════ */

function CloudCameraRig() {
  const spectrum = useAudioStore((s) => s.spectrum);
  const transport = useAudioStore((s) => s.transport);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const isPlaying = transport === 'playing' || transport === 'recording';

    // Compute average energy
    let energy = 0;
    for (let i = 0; i < 16; i++) energy += spectrum[i] ?? 0;
    energy /= 16;

    // Gentle orbit
    state.camera.position.x = Math.sin(t * 0.1) * 6;
    state.camera.position.y = 2 + energy * (isPlaying ? 1.5 : 0);
    state.camera.position.z = Math.cos(t * 0.1) * 6;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   HSL → RGB Helper
   ═══════════════════════════════════════════════════════════════════ */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

/* ═══════════════════════════════════════════════════════════════════
   Overlay UI (2D HUD)
   ═══════════════════════════════════════════════════════════════════ */

function CloudHUD() {
  const preset = useVisualStore((s) => s.preset);
  const reactive = useVisualStore((s) => s.reactive);
  const intensity = useVisualStore((s) => s.intensity);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 16,
    }}>
      {/* Top-left: Preset info */}
      <div>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          Volumetric Cloud
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginTop: 2,
        }}>
          {preset}
        </div>
        {reactive && (
          <div style={{
            fontSize: 9,
            color: 'var(--neon-success)',
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <div style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--neon-success)',
              boxShadow: '0 0 4px var(--neon-success)',
            }} />
            AUDIO-REACTIVE
          </div>
        )}
      </div>

      {/* Bottom: Intensity bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1 }}>
          Intensity
        </span>
        <div style={{
          flex: 1,
          maxWidth: 120,
          height: 3,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${intensity * 100}%` }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--neon-bass), var(--neon-mid), var(--neon-treble))',
              borderRadius: 2,
            }}
          />
        </div>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
        }}>
          {Math.round(intensity * 100)}%
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════════════════════════════ */

export default function VolumetricFrequencyCloud() {
  const bloom = useVisualStore((s) => s.bloom);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <Canvas
        camera={{ position: [0, 2, 6], fov: 60 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: true,
        }}
        style={{ background: 'var(--surface-0)' }}
      >
        <VolumetricCloud />
        <ShockwaveRing />
        <CloudCameraRig />
        <ambientLight intensity={0.1} />
      </Canvas>
      <CloudHUD />

      {/* Bloom overlay (CSS-based for performance) */}
      {bloom && (
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          mixBlendMode: 'screen',
          filter: 'blur(20px) brightness(0.3)',
          background: 'radial-gradient(circle at center, rgba(175,82,222,0.3), transparent 70%)',
        }} />
      )}
    </div>
  );
}
