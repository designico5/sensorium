/**
 * SENSORIUM V2 — Spatial 5D Stadium (HRTF Visualizer)
 * Blueprint §3.3: 3D spatial audio visualization with HRTF head model
 */
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useAudioStore } from '../store';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════
   Spatial Source (sound emitter in 3D space)
   ═══════════════════════════════════════════════════════════════════ */

interface SpatialSource {
  id: string;
  label: string;
  position: [number, number, number];
  color: string;
  gain: number;
}

const SOURCES: SpatialSource[] = [
  { id: 'kick', label: 'Kick', position: [0, 0, -3], color: '#ff2d55', gain: 0.9 },
  { id: 'snare', label: 'Snare', position: [0, 0.5, -2.5], color: '#ff9f0a', gain: 0.7 },
  { id: 'hat', label: 'Hi-Hat', position: [1.5, 1, -2], color: '#5ac8fa', gain: 0.5 },
  { id: 'bass', label: 'Bass', position: [-1, -0.5, -3], color: '#af52de', gain: 0.8 },
  { id: 'pad', label: 'Pad', position: [2, 1.5, -4], color: '#30d158', gain: 0.4 },
  { id: 'vox', label: 'Vocals', position: [0, 1, -2], color: '#ffd60a', gain: 0.6 },
];

/* ═══════════════════════════════════════════════════════════════════
   Head Model (listener)
   ═══════════════════════════════════════════════════════════════════ */

function HeadModel() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    // Subtle head movement
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
  });

  return (
    <group ref={meshRef}>
      {/* Head sphere */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Left ear */}
      <mesh position={[-0.42, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* Right ear */}
      <mesh position={[0.42, 0, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* Nose direction indicator */}
      <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.15, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Sound Source Visualization
   ═══════════════════════════════════════════════════════════════════ */

function SoundSource({ source }: { source: SpatialSource }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const spectrum = useAudioStore((s) => s.spectrum);
  const transport = useAudioStore((s) => s.transport);
  const isPlaying = transport === 'playing' || transport === 'recording';

  useFrame((state) => {
    if (!meshRef.current || !ringRef.current) return;
    const t = state.clock.elapsedTime;

    // Pulse with audio
    const energy = isPlaying ? (spectrum[Math.floor(Math.random() * 16)] ?? 0.3) : 0.2;
    const scale = 0.15 + energy * source.gain * 0.3;
    meshRef.current.scale.setScalar(scale);

    // Expanding ring
    const ringScale = 0.3 + Math.sin(t * 2 + source.position[0]) * 0.15 + energy * 0.5;
    ringRef.current.scale.setScalar(ringScale);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 * (1 - ringScale / 1.5);
  });

  return (
    <group position={source.position}>
      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={source.color} transparent opacity={0.8} />
      </mesh>
      {/* Expanding ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial
          color={source.color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Connection line to head */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, -source.position[0], -source.position[1], -source.position[2]])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={source.color} transparent opacity={0.15} />
      </line>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Camera
   ═══════════════════════════════════════════════════════════════════ */

function StadiumCamera() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(t * 0.15) * 5;
    state.camera.position.y = 2 + Math.sin(t * 0.1) * 0.5;
    state.camera.position.z = Math.cos(t * 0.15) * 5;
    state.camera.lookAt(0, 0, -2);
  });
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   HUD Overlay
   ═══════════════════════════════════════════════════════════════════ */

function StadiumHUD() {
  const transport = useAudioStore((s) => s.transport);
  const isPlaying = transport === 'playing' || transport === 'recording';

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
      {/* Top */}
      <div>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          5D Spatial Stadium
        </div>
        <div style={{
          fontSize: 9,
          color: 'var(--text-tertiary)',
          marginTop: 4,
          display: 'flex',
          gap: 12,
        }}>
          <span>HRTF: Enabled</span>
          <span>Sources: {SOURCES.length}</span>
          <span style={{ color: isPlaying ? 'var(--neon-success)' : 'var(--text-tertiary)' }}>
            {isPlaying ? '● Spatialized' : '○ Idle'}
          </span>
        </div>
      </div>

      {/* Bottom: Source legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {SOURCES.map((src) => (
          <div key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: src.color,
              boxShadow: `0 0 4px ${src.color}`,
            }} />
            <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{src.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Export
   ═══════════════════════════════════════════════════════════════════ */

export default function Spatial5DStadium() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <Canvas
        camera={{ position: [0, 2, 5], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'var(--surface-0)' }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.5} />

        {/* Head (listener) */}
        <HeadModel />

        {/* Sound sources */}
        {SOURCES.map((src) => (
          <SoundSource key={src.id} source={src} />
        ))}

        {/* Ground grid */}
        <gridHelper args={[20, 20, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.02)']} position={[0, -2, 0]} />

        <StadiumCamera />
      </Canvas>
      <StadiumHUD />
    </div>
  );
}
