/**
 * SENSORIUM V2 — Audio-Reactive 3D Visualizer
 * WebGL canvas with real-time frequency-reactive particle nebula.
 * Uses @react-three/fiber for declarative Three.js in React.
 */
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore, useVisualStore } from '../store';

/* ── Particle Nebula ───────────────────────────────────────────── */
function AudioNebula() {
  const meshRef = useRef<THREE.Points>(null);
  const spectrum = useAudioStore((s) => s.spectrum);
  const transport = useAudioStore((s) => s.transport);
  const intensity = useVisualStore((s) => s.intensity);
  const colorShift = useVisualStore((s) => s.colorShift);
  const bloom = useVisualStore((s) => s.bloom);
  const reactive = useVisualStore((s) => s.reactive);

  const { positions, colors, basePositions } = useMemo(() => {
    const count = 4096;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 2.5;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      base[i * 3] = x;
      base[i * 3 + 1] = y;
      base[i * 3 + 2] = z;

      const t = (y + 3) / 6;
      col[i * 3] = 0.3 + t * 0.4;
      col[i * 3 + 1] = 0.1 + t * 0.6;
      col[i * 3 + 2] = 0.8 + t * 0.2;
    }
    return { positions: pos, colors: col, basePositions: base };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const geo = meshRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colAttr = geo.attributes.color as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    const isActive = transport === 'playing' || transport === 'recording';
    const energy = reactive ? (spectrum[2] + spectrum[4] + spectrum[8]) / 3 : 0.3;
    const bassEnergy = reactive ? spectrum[1] : 0.2;
    const trebleEnergy = reactive ? (spectrum[16] + spectrum[24] + spectrum[32]) / 3 : 0.1;

    const hueOffset = colorShift / 360;
    const count = posArray.length / 3;

    for (let i = 0; i < count; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];

      const freqIdx = Math.floor((i / count) * 32);
      const freqVal = reactive ? spectrum[freqIdx] || 0 : 0.15;

      const displacement = isActive
        ? freqVal * intensity * 1.5
        : Math.sin(time * 0.5 + i * 0.01) * 0.1;

      const angle = time * 0.15 + i * 0.001;
      const wobble = Math.sin(time * 0.3 + i * 0.05) * 0.05;

      posArray[i * 3] = bx * (1 + displacement * 0.3) + Math.sin(angle) * wobble;
      posArray[i * 3 + 1] = by * (1 + displacement * 0.2) + Math.cos(angle * 0.7) * wobble;
      posArray[i * 3 + 2] = bz * (1 + displacement * 0.25) + wobble;

      const hue = (i / count + hueOffset + energy * 0.2) % 1;
      const saturation = 0.6 + freqVal * 0.4;
      const lightness = 0.3 + freqVal * intensity * 0.5 + bassEnergy * 0.2;

      const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
      const x2 = c * (1 - Math.abs((hue * 6) % 2 - 1));
      const m = lightness - c / 2;
      const sector = Math.floor(hue * 6) % 6;

      let r = 0, g = 0, b = 0;
      switch (sector) {
        case 0: r = c; g = x2; break;
        case 1: r = x2; g = c; break;
        case 2: g = c; b = x2; break;
        case 3: g = x2; b = c; break;
        case 4: r = x2; b = c; break;
        case 5: r = c; b = x2; break;
      }
      colArray[i * 3] = r + m;
      colArray[i * 3 + 1] = g + m;
      colArray[i * 3 + 2] = b + m + trebleEnergy * 0.15;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    meshRef.current.rotation.y = time * 0.05;
    meshRef.current.rotation.x = Math.sin(time * 0.03) * 0.1;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.025 + bloom * 0.02} vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/* ── Frequency Bars Ring ───────────────────────────────────────── */
function FrequencyRing() {
  const groupRef = useRef<THREE.Group>(null);
  const spectrum = useAudioStore((s) => s.spectrum);
  const transport = useAudioStore((s) => s.transport);
  const reactive = useVisualStore((s) => s.reactive);
  const intensity = useVisualStore((s) => s.intensity);

  const bars = 64;
  const barRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const isActive = transport === 'playing' || transport === 'recording';

    for (let i = 0; i < bars; i++) {
      const mesh = barRefs.current[i];
      if (!mesh) continue;

      const freqVal = isActive && reactive ? spectrum[i] || 0 : 0.05;
      const targetScale = 0.1 + freqVal * intensity * 3;
      mesh.scale.y += (targetScale - mesh.scale.y) * 0.15;

      const angle = (i / bars) * Math.PI * 2;
      const radius = 3.5;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = Math.sin(time * 0.5 + i * 0.1) * 0.1;
      mesh.lookAt(0, mesh.position.y, 0);

      const hue = i / bars;
      const color = new THREE.Color();
      color.setHSL(hue * 0.8 + 0.55, 0.9, 0.4 + freqVal * 0.4);
      (mesh.material as THREE.MeshBasicMaterial).color = color;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: bars }).map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) barRefs.current[i] = el; }}>
          <boxGeometry args={[0.08, 1, 0.08]} />
          <meshBasicMaterial color="#5ac8fa" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Camera Controller ─────────────────────────────────────────── */
function CameraRig() {
  const transport = useAudioStore((s) => s.transport);
  const spectrum = useAudioStore((s) => s.spectrum);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const isActive = transport === 'playing' || transport === 'recording';
    const energy = isActive ? spectrum[2] || 0 : 0;
    const breathe = energy * 0.3;

    state.camera.position.x = Math.sin(time * 0.1) * (0.5 + breathe);
    state.camera.position.y = 1.5 + Math.sin(time * 0.08) * 0.3;
    state.camera.position.z = 6 + Math.cos(time * 0.1) * 0.5;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ── Main Visualizer Component ─────────────────────────────────── */
export default function AudioVisualizer() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: [0, 1.5, 6], fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <fog attach="fog" args={['#0a0a0f', 8, 20]} />
        <ambientLight intensity={0.1} />
        <CameraRig />
        <AudioNebula />
        <FrequencyRing />
      </Canvas>
    </div>
  );
}
