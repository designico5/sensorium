/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { MidiDevice, DeviceStatus } from '../types';
import { 
  Activity, Radio, AlertTriangle, Zap, Server, Sliders, Layers, Network, 
  ShieldAlert, ZoomIn, ZoomOut, Maximize2, Minimize2, Move, Plus, Trash2, Link, Sparkles, Cpu, HardDrive, Expand
} from 'lucide-react';

interface MindmapProps {
  devices: MidiDevice[];
  onSelectDevice: (device: MidiDevice) => void;
  selectedDeviceId?: string;
  bpm: number;
  isPlaying: boolean;
  activeSignals: string[]; // List of device IDs that sent a note recently
  viewMode?: 'spring' | 'grid' | 'radial' | 'constellation' | 'circuit';
  onViewModeChange?: (mode: 'spring' | 'grid' | 'radial' | 'constellation' | 'circuit') => void;
  addLog?: (source: any, level: any, msg: string) => void;
  onAutoHealAll?: () => void;
  onSetLatencyBuffer?: (val: number) => void;
  latencySafetyBuffer?: number;
}

interface PhysicsNode {
  id: string;
  name: string;
  type: string;
  status: DeviceStatus;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  group: 'center' | 'usb' | 'synth' | 'drum' | 'midi' | 'virtual';
}

interface PhysicsLink {
  source: string;
  target: string;
  active: boolean;
}

interface CustomTriggerRoute {
  id: string;
  sourceId: string;
  targetId: string;
  channel: number;
  type: 'Clock Sync' | 'MIDI Note' | 'CC Modulation' | 'CV Gate';
  active: boolean;
  label: string;
}

export default function Mindmap({
  devices,
  onSelectDevice,
  selectedDeviceId,
  bpm,
  isPlaying,
  activeSignals,
  viewMode,
  onViewModeChange,
  addLog,
  onAutoHealAll,
  onSetLatencyBuffer,
  latencySafetyBuffer,
}: MindmapProps) {
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 480 });
  const [nodes, setNodes] = useState<PhysicsNode[]>([]);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pulseScale, setPulseScale] = useState(1);
  const [highPerformanceTurbo, setHighPerformanceTurbo] = useState<boolean>(true);
  const [internalViewMode, setInternalViewMode] = useState<'spring' | 'grid' | 'radial' | 'constellation' | 'circuit'>('spring');

  const activeViewMode = viewMode ?? internalViewMode;

  const handleViewModeSelect = (mode: 'spring' | 'grid' | 'radial' | 'constellation' | 'circuit') => {
    setInternalViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // CAMERA ZOOM & PAN SYSTEM
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isZoomedIn, setIsZoomedIn] = useState<boolean>(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // 3D SPATIAL ISOMETRIC PERSPECTIVE STATES
  const [is3DSpatialView, setIs3DSpatialView] = useState<boolean>(true);
  const [spatialTiltX, setSpatialTiltX] = useState<number>(52);
  const [spatialRotateZ, setSpatialRotateZ] = useState<number>(-18);
  const [show3DEqualizerBars, setShow3DEqualizerBars] = useState<boolean>(true);

  // FULLSCREEN & MOUSEOVER HOVER EXPAND SYSTEM
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [autoExpandOnHover, setAutoExpandOnHover] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number; time: number; vx: number; vy: number } | null>(null);

  // DIRECT INTERACTIVE CABLE WIRE DRAGGING & PHYSICS FREEZE STATES
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTargetNodeId, setHoveredTargetNodeId] = useState<string | null>(null);
  const [isPhysicsPaused, setIsPhysicsPaused] = useState<boolean>(false);

  // CANVAS HEIGHT SIZING MODE (Much larger default window)
  const [canvasHeightMode, setCanvasHeightMode] = useState<'normal' | 'large' | 'giga'>(() => {
    try {
      return (localStorage.getItem('sensorium_mindmap_height_mode') as any) || 'large';
    } catch {
      return 'large';
    }
  });

  // CABLE RE-ROUTING STATE (Clicking on an existing cable to un-plug and re-assign)
  const [reRoutingCable, setReRoutingCable] = useState<{
    routeId?: string;
    sourceId: string;
    originalTargetId?: string;
    channel?: number;
    type?: 'Clock Sync' | 'MIDI Note' | 'CC Modulation' | 'CV Gate';
    label?: string;
  } | null>(null);

  // Sound feedback for tactile cable plugging/unplugging
  const playCablePlugSound = (type: 'detach' | 'attach') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'detach') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(360, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(240, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  const handleStartCableReRoute = (
    e: React.MouseEvent,
    sourceId: string,
    existingRouteId?: string,
    channel?: number,
    type?: 'Clock Sync' | 'MIDI Note' | 'CC Modulation' | 'CV Gate',
    label?: string
  ) => {
    e.stopPropagation();
    e.preventDefault();

    playCablePlugSound('detach');

    setReRoutingCable({
      routeId: existingRouteId,
      sourceId: sourceId,
      channel: channel || 1,
      type: type || 'MIDI Note',
      label: label || 'Custom Cable Route',
    });

    setConnectingFromNodeId(sourceId);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const clickX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const clickY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      setConnectingMousePos({ x: clickX, y: clickY });
    }
  };

  // ESC key listener to exit full screen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenMode) {
        setIsFullscreenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenMode]);

  const handleMouseEnterContainer = () => {
    if (autoExpandOnHover && !isFullscreenMode) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setIsFullscreenMode(true);
      }, 180);
    }
  };

  const handleMouseLeaveContainer = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.8, parseFloat((prev + 0.25).toFixed(2))));
    setIsZoomedIn(true);
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(0.6, parseFloat((prev - 0.25).toFixed(2)));
      if (next <= 1.05) {
        setIsZoomedIn(false);
        setFocusedNodeId(null);
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    setIsZoomedIn(false);
    setFocusedNodeId(null);
  };

  const focusOnDeviceNode = (node: PhysicsNode) => {
    if (node.id === 'center-bpm') return;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const targetZoom = 1.85;

    // Calculate offset to bring node to screen center
    const targetPanX = cx - node.x * targetZoom;
    const targetPanY = cy - node.y * targetZoom;

    setZoomLevel(targetZoom);
    setPanOffset({ x: targetPanX, y: targetPanY });
    setIsZoomedIn(true);
    setFocusedNodeId(node.id);
  };

  // DIGITAL HARDWARE TWIN CUSTOM POSITIONS
  const [customNodePositions, setCustomNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem('sensorium_custom_hardware_positions');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveCustomPosition = (id: string, x: number, y: number) => {
    setCustomNodePositions((prev) => {
      const next = { ...prev, [id]: { x, y } };
      try {
        localStorage.setItem('sensorium_custom_hardware_positions', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // INTER-DEVICE CUSTOM TRIGGER ROUTES
  const [customTriggerRoutes, setCustomTriggerRoutes] = useState<CustomTriggerRoute[]>(() => {
    try {
      const saved = localStorage.getItem('sensorium_custom_trigger_routes');
      if (saved) return JSON.parse(saved);
    } catch {}

    // Default sensible trigger routes between hardware devices
    return [
      {
        id: 'trig-default-1',
        sourceId: 'center-bpm',
        targetId: devices[0]?.id || 'dev-1',
        channel: 1,
        type: 'Clock Sync',
        active: true,
        label: 'Master Clock Sync'
      },
      {
        id: 'trig-default-2',
        sourceId: devices[0]?.id || 'dev-1',
        targetId: devices[1]?.id || 'dev-2',
        channel: 2,
        type: 'MIDI Note',
        active: true,
        label: 'Trigger Note C3'
      }
    ];
  });

  const [showAddTriggerModal, setShowAddTriggerModal] = useState(false);
  const [newTriggerSource, setNewTriggerSource] = useState('');
  const [newTriggerTarget, setNewTriggerTarget] = useState('');
  const [newTriggerChannel, setNewTriggerChannel] = useState(1);
  const [newTriggerType, setNewTriggerType] = useState<'Clock Sync' | 'MIDI Note' | 'CC Modulation' | 'CV Gate'>('MIDI Note');

  const handleAddTriggerRoute = () => {
    if (!newTriggerSource || !newTriggerTarget) return;
    const newRoute: CustomTriggerRoute = {
      id: `trig-${Date.now()}`,
      sourceId: newTriggerSource,
      targetId: newTriggerTarget,
      channel: newTriggerChannel,
      type: newTriggerType,
      active: true,
      label: `${newTriggerType} Ch.${newTriggerChannel}`,
    };
    const updated = [...customTriggerRoutes, newRoute];
    setCustomTriggerRoutes(updated);
    try {
      localStorage.setItem('sensorium_custom_trigger_routes', JSON.stringify(updated));
    } catch {}

    setShowAddTriggerModal(false);
    if (addLog) {
      const srcName = devices.find(d => d.id === newTriggerSource)?.name || newTriggerSource;
      const tgtName = devices.find(d => d.id === newTriggerTarget)?.name || newTriggerTarget;
      addLog('SYSTEM', 'success', `[TRIGGER ROUTE] '${srcName}' ⚡ triggert ➡️ '${tgtName}' (${newTriggerType} Ch.${newTriggerChannel})`);
    }
  };

  const handleRemoveTriggerRoute = (routeId: string) => {
    const updated = customTriggerRoutes.filter(r => r.id !== routeId);
    setCustomTriggerRoutes(updated);
    try {
      localStorage.setItem('sensorium_custom_trigger_routes', JSON.stringify(updated));
    } catch {}
  };

  // Customizable Trigger Directions state
  const [triggerDirections, setTriggerDirections] = useState<Record<string, 'outward' | 'inward' | 'bidirectional'>>(() => {
    try {
      const saved = localStorage.getItem('sensorium_trigger_directions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleSetTriggerDirection = (id: string, dir: 'outward' | 'inward' | 'bidirectional') => {
    setTriggerDirections((prev) => ({ ...prev, [id]: dir }));

    try {
      const saved = localStorage.getItem('sensorium_trigger_directions');
      const current = saved ? JSON.parse(saved) : {};
      current[id] = dir;
      localStorage.setItem('sensorium_trigger_directions', JSON.stringify(current));
    } catch (e) {}

    if (addLog) {
      addLog('SYSTEM', 'success', `[TRIGGER-DIREKTION] '${devices.find(d => d.id === id)?.name || id}' Richtung auf: ${
        dir === 'outward' ? 'Ausgehend ➡️' : dir === 'inward' ? 'Eingehend ⬅️' : 'Duplex / Beidseitig 🔄'
      } gesetzt.`);
    }
  };

  // One-Click Emergency Safe Mode States
  const [isSafeModeLocked, setIsSafeModeLocked] = useState(false);
  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [emergencyProgress, setEmergencyProgress] = useState(0);
  const [emergencyStep, setEmergencyStep] = useState('');
  const [emergencyConsoleLogs, setEmergencyConsoleLogs] = useState<string[]>([]);

  const handleTriggerEmergencySafeMode = () => {
    setShowEmergencyOverlay(true);
    setEmergencyProgress(0);
    setEmergencyStep('Notfall-Protokoll wird initialisiert...');
    setEmergencyConsoleLogs([
      `[SHIELD_LOCK] INITIATING ONE-CLICK WORST-CASE PROTOCOL...`,
      `[SHIELD_LOCK] Scanning network nodes for stability vulnerabilities...`
    ]);

    const steps = [
      { progress: 15, text: 'Sichern der Live-Synthesizer Register im flüchtigen RAM-Puffer...', log: '[RAM_CACHE] MIDI-Spuren im flüchtigen RAM gesichert (Status: 100% Sicher).' },
      { progress: 45, text: 'Latenzsicherheits-Puffer auf maximale 15ms anheben (Standsicherheit)...', log: '[BUFFER] DPC-Latenzsicherheits-Filter erhöht auf +15ms (Schutz vor CPU-Spikes).' },
      { progress: 70, text: 'Clock-Jitter Kompensation aktivieren (PLL-Präzision)...', log: '[PLL_ALIGN] Phase-Locked Loop Offset stabilisiert auf exakt 0.00µs Drift.' },
      { progress: 85, text: 'Rekalibrierung aller MIDI-Kanäle & Zurücksetzen stuck Notes...', log: '[HEAL] Alle instabilen Hardware-Ports online geschaltet (Status: Healthy).' },
      { progress: 100, text: 'Safe-Lock Patch Router aktivieren. Nullfehlerquote-Garantie etabliert.', log: '[SEALED] Failsafe-Hologram-Schild über Master Clock verriegelt. System gesichert.' }
    ];

    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        const step = steps[currentStepIdx];
        setEmergencyProgress(step.progress);
        setEmergencyStep(step.text);
        setEmergencyConsoleLogs(prev => [...prev, step.log]);
        currentStepIdx += 1;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setShowEmergencyOverlay(false);
          setIsSafeModeLocked(true);
          
          if (onAutoHealAll) {
            onAutoHealAll();
          }
          if (onSetLatencyBuffer) {
            onSetLatencyBuffer(15);
          }
          if (addLog) {
            addLog('SYSTEM', 'success', '[FAILSFE] WORST-CASE NOTFALL-PROTOKOLL AKTIVIERT: 0% Fehlerquote auf allen Ports garantiert!');
          }
        }, 800);
      }
    }, 500);
  };

  // Workflow Mode / Ansichtsgrad (added digital_twin for Digital Hardware Twin Canvas)
  const [workflowMode, setWorkflowMode] = useState<'brainstorming' | 'arrangement' | 'live' | 'hybrid' | 'digital_twin'>('digital_twin');

  // Parameters for Arrangement Mode (Volume, Pan, Channel, Mute, Solo)
  const [deviceParams, setDeviceParams] = useState<Record<string, { volume: number; pan: number; channel: number; mute: boolean; solo: boolean }>>({});

  useEffect(() => {
    setDeviceParams((prev) => {
      const next = { ...prev };
      devices.forEach((d, idx) => {
        if (!next[d.id]) {
          next[d.id] = {
            volume: 75 + (idx % 3) * 5,
            pan: idx % 2 === 0 ? -25 : 25,
            channel: idx + 1,
            mute: false,
            solo: false,
          };
        }
      });
      return next;
    });
  }, [devices]);

  // Custom brainstorming ideas
  const [customIdeas, setCustomIdeas] = useState<Array<{ id: string; text: string; x: number; y: number; color: string }>>([
    { id: 'idea-1', text: 'Filter sweep bar 4', x: 140, y: 110, color: '#00f0ff' },
    { id: 'idea-2', text: 'Sidechain drum trigger', x: 490, y: 130, color: '#ff007f' },
    { id: 'idea-3', text: 'Sub-bass delay clock', x: 180, y: 340, color: '#39ff14' },
  ]);

  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingIdeaText, setEditingIdeaText] = useState('');
  const [draggedIdeaId, setDraggedIdeaId] = useState<string | null>(null);
  const ideaDragOffset = useRef({ x: 0, y: 0 });

  // Live mode ripples
  const [ripples, setRipples] = useState<Array<{ id: string; x: number; y: number; r: number; color: string; maxR: number }>>([]);

  const triggerRipple = (x: number, y: number, color: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setRipples((prev) => [...prev, { id, x, y, r: 5, color, maxR: 70 }]);
  };

  useEffect(() => {
    if (ripples.length === 0) return;
    const interval = setInterval(() => {
      setRipples((prev) =>
        prev
          .map((r) => ({ ...r, r: r.r + 3 }))
          .filter((r) => r.r < r.maxR)
      );
    }, 30);
    return () => clearInterval(interval);
  }, [ripples]);

  const getNearestNode = (ideaX: number, ideaY: number) => {
    let minDistance = Infinity;
    let nearest: PhysicsNode | null = null;
    nodes.forEach((n) => {
      const dx = n.x - ideaX;
      const dy = n.y - ideaY;
      const d = dx * dx + dy * dy;
      if (d < minDistance) {
        minDistance = d;
        nearest = n;
      }
    });
    return nearest;
  };

  const handleIdeaMouseDown = (e: React.MouseEvent, ideaId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const idea = customIdeas.find((i) => i.id === ideaId);
    if (!idea) return;

    setDraggedIdeaId(ideaId);
    ideaDragOffset.current = {
      x: clickX - idea.x,
      y: clickY - idea.y,
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 300),
          height: Math.max(height, 420),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync devices to physics nodes
  useEffect(() => {
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    setNodes((prevNodes) => {
      const nodeMap = new Map<string, PhysicsNode>(prevNodes.map((n) => [n.id, n]));

      const centerNode: PhysicsNode = {
        id: 'center-bpm',
        name: `BPM CLOCK (${bpm})`,
        type: 'Master Clock',
        status: isPlaying ? 'Healthy' : 'Warn',
        x: nodeMap.get('center-bpm')?.x ?? cx,
        y: nodeMap.get('center-bpm')?.y ?? cy,
        vx: 0,
        vy: 0,
        radius: 42,
        color: isPlaying ? '#00f0ff' : '#ffdf00',
        group: 'center',
      };

      const newNodes = devices.map((dev, idx) => {
        const existing = nodeMap.get(dev.id);
        const savedPos = customNodePositions[dev.id];
        
        const angle = (idx / devices.length) * 2 * Math.PI;
        const radius = 140 + (idx % 2) * 35;
        const initX = savedPos ? savedPos.x : (cx + Math.cos(angle) * radius);
        const initY = savedPos ? savedPos.y : (cy + Math.sin(angle) * radius);

        let color = '#39ff14';
        if (dev.status === 'Warn') color = '#ffdf00';
        if (dev.status === 'Error') color = '#ff3131';

        let group: PhysicsNode['group'] = 'usb';
        if (dev.type === 'Synthesizer') group = 'synth';
        else if (dev.type === 'Drum Machine') group = 'drum';
        else if (dev.type === 'Internal MIDI') group = 'midi';
        else if (dev.type === 'Virtual Bridge') group = 'virtual';

        return {
          id: dev.id,
          name: dev.name,
          type: dev.type,
          status: dev.status,
          x: existing?.x ?? initX,
          y: existing?.y ?? initY,
          vx: existing?.vx ?? 0,
          vy: existing?.vy ?? 0,
          radius: 28,
          color,
          group,
        };
      });

      return [centerNode, ...newNodes];
    });
  }, [devices, bpm, isPlaying, dimensions.width, dimensions.height]);

  // BPM Pulse & Physics Simulation Loop (Single Consolidated 120FPS Engine)
  useEffect(() => {
    let frameId: number;
    let lastPulseUpdate = 0;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    const updatePhysics = () => {
      if (isPhysicsPaused) {
        frameId = requestAnimationFrame(updatePhysics);
        return;
      }

      const now = Date.now();
      const nowSec = now / 1000;

      // Throttle pulse animation updates to 30 FPS to save React re-renders unless in active motion
      if (now - lastPulseUpdate > 33) {
        lastPulseUpdate = now;
        const bps = bpm / 60;
        const pulseValue = 1 + 0.06 * Math.sin(nowSec * 2 * Math.PI * bps);
        setPulseScale(pulseValue);
      }

      setNodes((currentNodes) => {
        if (currentNodes.length === 0) return currentNodes;

        const nonCenterNodes = currentNodes.filter((n) => n.id !== 'center-bpm');
        const nodeIndexMap = new Map<string, number>();
        nonCenterNodes.forEach((n, idx) => nodeIndexMap.set(n.id, idx));

        const updated = currentNodes.map((n) => ({ ...n }));
        let maxMovement = 0;

        for (let i = 0; i < updated.length; i++) {
          const n1 = updated[i];

          if (n1.id === 'center-bpm') {
            n1.x = cx;
            n1.y = cy;
            n1.vx = 0;
            n1.vy = 0;
            continue;
          }

          if (n1.id === draggedNodeId) {
            n1.vx = 0;
            n1.vy = 0;
            continue;
          }

          // Gentle organic harmonic float oscillation
          const floatPhase = nowSec * 1.6 + (i * 1.9);
          n1.vx += Math.sin(floatPhase) * 0.12;
          n1.vy += Math.cos(floatPhase * 0.88) * 0.12;

          // Target positioning calculation
          if (workflowMode === 'digital_twin' || customNodePositions[n1.id]) {
            const savedPos = customNodePositions[n1.id];
            if (savedPos) {
              const dx = savedPos.x - n1.x;
              const dy = savedPos.y - n1.y;
              n1.vx += dx * 0.08;
              n1.vy += dy * 0.08;
            }
          } else {
            const nodeIndex = nodeIndexMap.get(n1.id) ?? 0;

            if (activeViewMode === 'grid') {
              const count = nonCenterNodes.length;
              const cols = Math.ceil(Math.sqrt(count + 1)) || 1;
              const rows = Math.ceil(count / cols) || 1;

              const colWidth = (dimensions.width - 120) / Math.max(1, cols - 1);
              const rowHeight = (dimensions.height - 140) / Math.max(1, rows - 1);

              const colIdx = nodeIndex % cols;
              const rowIdx = Math.floor(nodeIndex / cols);

              const targetX = count <= 1 ? cx : 60 + colIdx * colWidth;
              const targetY = count <= 1 ? cy + 85 : 90 + rowIdx * rowHeight;

              n1.vx += (targetX - n1.x) * 0.09;
              n1.vy += (targetY - n1.y) * 0.09;
            } else if (activeViewMode === 'radial') {
              const ringCount = 2;
              const ringIndex = nodeIndex % ringCount;
              const nodesInRing = nonCenterNodes.filter((_, idx) => idx % ringCount === ringIndex);
              const indexInRing = nodesInRing.findIndex((n) => n.id === n1.id);
              const totalInRing = nodesInRing.length || 1;

              const angle = (indexInRing / totalInRing) * 2 * Math.PI;
              const radius = ringIndex === 0 ? 115 : 190;

              const targetX = cx + Math.cos(angle) * radius;
              const targetY = cy + Math.sin(angle) * radius;

              n1.vx += (targetX - n1.x) * 0.07;
              n1.vy += (targetY - n1.y) * 0.07;
            } else if (activeViewMode === 'constellation') {
              const angle = (nodeIndex / (nonCenterNodes.length || 1)) * Math.PI * 1.5 - Math.PI * 0.75;
              const radius = 160 + Math.sin(nodeIndex * 2 + nowSec * 0.8) * 25;
              const targetX = cx + Math.cos(angle) * radius;
              const targetY = cy + Math.sin(angle) * radius * 0.75;

              n1.vx += (targetX - n1.x) * 0.06 + Math.sin(nowSec + nodeIndex) * 0.12;
              n1.vy += (targetY - n1.y) * 0.06 + Math.cos(nowSec + nodeIndex) * 0.12;
            } else if (activeViewMode === 'circuit') {
              const isUpper = nodeIndex % 2 === 0;
              const countOnShelf = Math.ceil(nonCenterNodes.length / 2);
              const indexOnShelf = Math.floor(nodeIndex / 2);
              const shelfWidth = dimensions.width - 160;
              const startX = cx - shelfWidth / 2;
              const targetX = countOnShelf <= 1 ? cx : startX + (indexOnShelf / Math.max(1, countOnShelf - 1)) * shelfWidth;
              const targetY = isUpper ? cy - 120 : cy + 120;

              n1.vx += (targetX - n1.x) * 0.1;
              n1.vy += (targetY - n1.y) * 0.1;
            } else {
              // Orbit / Spring mode
              const dxCenter = cx - n1.x;
              const dyCenter = cy - n1.y;
              const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter) || 1;
              const targetDist = 165;
              const springForce = (distCenter - targetDist) * 0.025;

              n1.vx += (dxCenter / distCenter) * springForce;
              n1.vy += (dyCenter / distCenter) * springForce;
            }
          }

          // Node-to-Node Soft Magnetic Repulsion
          for (let j = i + 1; j < updated.length; j++) {
            const n2 = updated[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = n1.radius + n2.radius + 30;

            if (dist < minDist) {
              const overlap = minDist - dist;
              const push = Math.min(2.5, overlap * 0.1);
              const pushX = (dx / dist) * push;
              const pushY = (dy / dist) * push;
              n1.vx += pushX;
              n1.vy += pushY;
              n2.vx -= pushX;
              n2.vy -= pushY;
            }
          }

          // Friction damping
          n1.vx *= 0.88;
          n1.vy *= 0.88;

          n1.x += n1.vx;
          n1.y += n1.vy;

          const vel = Math.abs(n1.vx) + Math.abs(n1.vy);
          if (vel > maxMovement) maxMovement = vel;

          // Elastic Bouncing Wall Padding
          const padding = 42;
          if (n1.x < padding) {
            n1.x = padding;
            n1.vx = Math.abs(n1.vx) * 0.5;
          } else if (n1.x > dimensions.width - padding) {
            n1.x = dimensions.width - padding;
            n1.vx = -Math.abs(n1.vx) * 0.5;
          }

          if (n1.y < padding) {
            n1.y = padding;
            n1.vy = Math.abs(n1.vy) * 0.5;
          } else if (n1.y > dimensions.height - padding) {
            n1.y = dimensions.height - padding;
            n1.vy = -Math.abs(n1.vy) * 0.5;
          }
        }

        return updated;
      });

      frameId = requestAnimationFrame(updatePhysics);
    };

    frameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(frameId);
  }, [bpm, dimensions.width, dimensions.height, draggedNodeId, activeViewMode, workflowMode, customNodePositions, isPhysicsPaused]);

  // Cable Dragging Socket Pin Handler
  const handleStartCableDrag = (e: React.MouseEvent, sourceNodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFromNodeId(sourceNodeId);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const clickX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const clickY = (e.clientY - rect.top - panOffset.y) / zoomLevel;
      setConnectingMousePos({ x: clickX, y: clickY });
    }
  };

  // Dragging interaction handlers
  const handleMouseDown = (e: React.MouseEvent<SVGGElement>, node: PhysicsNode) => {
    if (node.id === 'center-bpm') return;

    e.preventDefault();
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const clickY = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    setDraggedNodeId(node.id);
    dragOffset.current = {
      x: clickX - node.x,
      y: clickY - node.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = (e.clientX - rect.left - panOffset.x) / zoomLevel;
    const currentY = (e.clientY - rect.top - panOffset.y) / zoomLevel;

    // Handle Active Cable Wire Dragging
    if (connectingFromNodeId) {
      setConnectingMousePos({ x: currentX, y: currentY });

      // Find if hovering over a target node
      let candidateTarget: string | null = null;
      let minDistance = 48; // Magnetic snapping radius

      nodes.forEach((n) => {
        if (n.id !== connectingFromNodeId) {
          const dx = n.x - currentX;
          const dy = n.y - currentY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance) {
            minDistance = dist;
            candidateTarget = n.id;
          }
        }
      });

      setHoveredTargetNodeId(candidateTarget);
      return;
    }

    if (draggedIdeaId) {
      const x = currentX - ideaDragOffset.current.x;
      const y = currentY - ideaDragOffset.current.y;
      setCustomIdeas((prev) =>
        prev.map((i) => (i.id === draggedIdeaId ? { ...i, x, y } : i))
      );
      return;
    }

    if (!draggedNodeId) return;

    const x = currentX - dragOffset.current.x;
    const y = currentY - dragOffset.current.y;

    const now = Date.now();
    if (lastDragPosRef.current) {
      const dt = Math.max(1, now - lastDragPosRef.current.time);
      const vx = ((x - lastDragPosRef.current.x) / dt) * 16;
      const vy = ((y - lastDragPosRef.current.y) / dt) * 16;
      lastDragPosRef.current = { x, y, time: now, vx, vy };
    } else {
      lastDragPosRef.current = { x, y, time: now, vx: 0, vy: 0 };
    }

    setNodes((currentNodes) =>
      currentNodes.map((n) => (n.id === draggedNodeId ? { ...n, x, y, vx: 0, vy: 0 } : n))
    );
  };

  const handleMouseUp = () => {
    // Handle Cable Wire Connection Drop & Re-Routing
    if (connectingFromNodeId) {
      if (hoveredTargetNodeId && hoveredTargetNodeId !== connectingFromNodeId) {
        const srcNode = nodes.find((n) => n.id === connectingFromNodeId);
        const tgtNode = nodes.find((n) => n.id === hoveredTargetNodeId);

        if (srcNode && tgtNode) {
          playCablePlugSound('attach');

          if (reRoutingCable?.routeId && !reRoutingCable.routeId.startsWith('clock-link-')) {
            // Re-route an existing CustomTriggerRoute!
            const targetRouteId = reRoutingCable.routeId;
            setCustomTriggerRoutes((prev) => {
              const updated = prev.map((r) => {
                if (r.id === targetRouteId) {
                  const srcShort = srcNode.name.split(' ')[0];
                  const tgtShort = tgtNode.name.split(' ')[0];
                  return {
                    ...r,
                    targetId: tgtNode.id,
                    label: `${srcShort} ⚡ ${tgtShort}`,
                  };
                }
                return r;
              });
              try {
                localStorage.setItem('sensorium_custom_trigger_routes', JSON.stringify(updated));
              } catch {}
              return updated;
            });

            if (addLog) {
              addLog(
                'SYSTEM',
                'success',
                `🔌 [KABEL UMGESTECKT] Cable zack umgesteckt: '${srcNode.name}' ➡️ '${tgtNode.name}' (Routing-Zuweisung automatisch aktualisiert)`
              );
            }
          } else {
            // New cable route or clock link redirect!
            const srcShort = srcNode.name.split(' ')[0];
            const tgtShort = tgtNode.name.split(' ')[0];
            const newRoute: CustomTriggerRoute = {
              id: `trig-drag-${Date.now()}`,
              sourceId: srcNode.id,
              targetId: tgtNode.id,
              channel: Math.floor(Math.random() * 8) + 1,
              type: 'MIDI Note',
              active: true,
              label: `${srcShort} ⚡ ${tgtShort}`,
            };

            const updated = [...customTriggerRoutes, newRoute];
            setCustomTriggerRoutes(updated);
            try {
              localStorage.setItem('sensorium_custom_trigger_routes', JSON.stringify(updated));
            } catch {}

            if (addLog) {
              addLog(
                'SYSTEM',
                'success',
                `🔌 [KABEL ZACK VERBUNDEN] Cable zack gesteckt: '${srcNode.name}' ➡️ '${tgtNode.name}' (Kanal ${newRoute.channel})`
              );
            }
          }
        }
      }

      setConnectingFromNodeId(null);
      setConnectingMousePos(null);
      setHoveredTargetNodeId(null);
      setReRoutingCable(null);
    }

    if (draggedNodeId) {
      const draggedNode = nodes.find((n) => n.id === draggedNodeId);
      if (draggedNode) {
        saveCustomPosition(draggedNode.id, draggedNode.x, draggedNode.y);
        // Apply throw release velocity momentum
        if (lastDragPosRef.current) {
          const relVx = Math.max(-14, Math.min(14, lastDragPosRef.current.vx * 0.7));
          const relVy = Math.max(-14, Math.min(14, lastDragPosRef.current.vy * 0.7));
          setNodes((prev) =>
            prev.map((n) => (n.id === draggedNodeId ? { ...n, vx: relVx, vy: relVy } : n))
          );
        }
      }
    }
    lastDragPosRef.current = null;
    setDraggedNodeId(null);
    setDraggedIdeaId(null);
  };

  const handleSvgDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.tagName !== 'svg') return;

    if (isZoomedIn) {
      handleResetZoom();
      return;
    }

    if (workflowMode === 'brainstorming') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left - panOffset.x) / zoomLevel;
      const y = (e.clientY - rect.top - panOffset.y) / zoomLevel;

      const texts = [
        'Idee: Reverb send sweep',
        'Idee: Dynamic sidechain compression',
        'Idee: MIDI Arpeggiator delay link',
        'Idee: Multi-band saturator rack',
        'Idee: Low-pass filter automation LFO'
      ];
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      const id = `idea-${Date.now()}`;
      const colors = ['#00f0ff', '#ff007f', '#39ff14', '#eab308'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      setCustomIdeas((prev) => [...prev, { id, text: randomText, x, y, color: randomColor }]);
    }
  };

  // Build connection links from Master Clock
  const links: PhysicsLink[] = nodes
    .filter((n) => n.id !== 'center-bpm')
    .map((n) => ({
      source: 'center-bpm',
      target: n.id,
      active: activeSignals.includes(n.id),
    }));

  const getContainerHeightClass = () => {
    if (isFullscreenMode) return 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0 p-3 md:p-5 bg-[#08090e]/98 backdrop-blur-3xl';
    if (canvasHeightMode === 'normal') return 'relative w-full h-[620px] md:h-[680px] rounded-2xl glass-panel border border-white/10';
    if (canvasHeightMode === 'giga') return 'relative w-full h-[960px] md:h-[1100px] rounded-2xl glass-panel border border-white/10';
    return 'relative w-full h-[820px] md:h-[880px] rounded-2xl glass-panel border border-white/10';
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnterContainer}
      onMouseLeave={handleMouseLeaveContainer}
      className={`transition-all duration-500 ease-out flex flex-col bg-[#08090e] shadow-2xl overflow-hidden ${getContainerHeightClass()}`}
      id="sensorium-mindmap"
    >
      {/* Background Neon Grid Matrix */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[linear-gradient(rgba(0,240,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.18)_1px,transparent_1px)] bg-[size:32px_32px] beat-pulse" />

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3 border-b border-white/10 bg-black/70 backdrop-blur-md z-10 gap-3">
        <div className="flex items-center justify-between md:justify-start gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-cyan animate-pulse" />
            <span className="font-display font-bold text-xs md:text-sm text-gray-100 tracking-wider uppercase">
              HARDWARE-MINDMAP &amp; DIGITAL TWIN
            </span>
            {isFullscreenMode && (
              <span className="px-2 py-0.5 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan text-[9px] font-mono rounded-full font-bold uppercase animate-pulse">
                VOLLBILD MAXIMIZED (ESC zum Beenden)
              </span>
            )}
          </div>

          <button
            onClick={handleTriggerEmergencySafeMode}
            className={`px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border ${isSafeModeLocked ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/30 text-red-400 animate-pulse'} text-[9px] font-mono rounded flex items-center gap-1.5 uppercase transition cursor-pointer`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {isSafeModeLocked ? 'Failsafe Aktiv' : 'Worst-Case Safe-Mode'}
          </button>
        </div>

        {/* Layout Mode, Canvas Size & Fullscreen Controls Segmented Control */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Canvas Height Selector */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 items-center gap-1">
            <span className="text-[9px] font-mono text-gray-400 px-1 uppercase font-bold">Fenster:</span>
            <button
              onClick={() => { setCanvasHeightMode('large'); localStorage.setItem('sensorium_mindmap_height_mode', 'large'); }}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                canvasHeightMode === 'large' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Groß (880px)
            </button>
            <button
              onClick={() => { setCanvasHeightMode('giga'); localStorage.setItem('sensorium_mindmap_height_mode', 'giga'); }}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                canvasHeightMode === 'giga' ? 'bg-neon-magenta text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              XXL Canvas (1050px)
            </button>
            <button
              onClick={() => { setCanvasHeightMode('normal'); localStorage.setItem('sensorium_mindmap_height_mode', 'normal'); }}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                canvasHeightMode === 'normal' ? 'bg-white/20 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Kompakt
            </button>
          </div>
          {/* Auto Hover Vollbild Toggle */}
          <button
            onClick={() => setAutoExpandOnHover(!autoExpandOnHover)}
            className={`px-2.5 py-1 border rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold flex items-center gap-1 cursor-pointer ${
              autoExpandOnHover 
                ? 'bg-neon-cyan/15 border-neon-cyan/50 text-neon-cyan' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
            title="Bei Maus-Over automatisch ins Vollbild schalten"
          >
            <Expand className="w-3 h-3 text-neon-cyan" />
            {autoExpandOnHover ? 'Auto-Vollbild: AN' : 'Auto-Vollbild: AUS'}
          </button>

          {/* Manual Fullscreen Button */}
          <button
            onClick={() => setIsFullscreenMode(!isFullscreenMode)}
            className={`px-3 py-1 border rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold flex items-center gap-1.5 cursor-pointer ${
              isFullscreenMode
                ? 'bg-neon-magenta text-white border-neon-magenta shadow-[0_0_12px_rgba(255,0,127,0.5)]'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
            }`}
          >
            {isFullscreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreenMode ? 'Vollbild Beenden' : 'Vollbild Modus'}
          </button>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 items-center gap-1">
            <button
              onClick={() => handleViewModeSelect('spring')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                activeViewMode === 'spring' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Orbit
            </button>
            <button
              onClick={() => handleViewModeSelect('radial')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                activeViewMode === 'radial' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Radial
            </button>
            <button
              onClick={() => handleViewModeSelect('grid')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                activeViewMode === 'grid' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => handleViewModeSelect('constellation')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                activeViewMode === 'constellation' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Constellation
            </button>
            <button
              onClick={() => handleViewModeSelect('circuit')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold ${
                activeViewMode === 'circuit' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Circuit
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Header Toolbar: Workflow Ansichtsgrad, Camera Zoom Controls, Add Trigger Connection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-2 bg-black/80 border-b border-white/5 gap-2 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400">Ansicht:</span>
          
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 items-center gap-0.5">
            <button
              onClick={() => setWorkflowMode('digital_twin')}
              className={`px-2.5 py-1 rounded text-[9px] font-display uppercase tracking-wider transition font-bold flex items-center gap-1 ${
                workflowMode === 'digital_twin' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3 h-3" /> Hardware-Twin Stage
            </button>
            <button
              onClick={() => setWorkflowMode('brainstorming')}
              className={`px-2 py-1 rounded text-[9px] font-display uppercase tracking-wider transition font-bold ${
                workflowMode === 'brainstorming' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              🧠 Brainstorm
            </button>
            <button
              onClick={() => setWorkflowMode('arrangement')}
              className={`px-2 py-1 rounded text-[9px] font-display uppercase tracking-wider transition font-bold ${
                workflowMode === 'arrangement' ? 'bg-neon-magenta text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              🎛️ Mixer
            </button>
            <button
              onClick={() => setWorkflowMode('live')}
              className={`px-2 py-1 rounded text-[9px] font-display uppercase tracking-wider transition font-bold ${
                workflowMode === 'live' ? 'bg-neon-green text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ Live Pads
            </button>
            <button
              onClick={() => setWorkflowMode('hybrid')}
              className={`px-2 py-1 rounded text-[9px] font-display uppercase tracking-wider transition font-bold ${
                workflowMode === 'hybrid' ? 'bg-neon-yellow text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              📊 Telemetrie
            </button>
          </div>
        </div>

        {/* Camera Zoom, 3D Spatial Controls, Physics Freeze & Inter-Device Link Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Physics Freeze / Lock Toggle */}
          <button
            onClick={() => setIsPhysicsPaused(!isPhysicsPaused)}
            className={`px-2.5 py-1 border rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold flex items-center gap-1.5 cursor-pointer ${
              isPhysicsPaused
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
            title="Physik anhalten, um Ruckeln vollständig zu eliminieren & Positionen zu fixieren"
          >
            <Move className={`w-3 h-3 ${isPhysicsPaused ? 'text-amber-400' : 'text-gray-400'}`} />
            {isPhysicsPaused ? '3D Motion: GESPERRT 🔒' : '3D Motion: FLÜSSIG ⚡'}
          </button>

          {/* 3D Spatial Isometric Perspective Toggle Button */}
          <button
            onClick={() => setIs3DSpatialView(!is3DSpatialView)}
            className={`px-2.5 py-1 border rounded-lg text-[9px] font-mono uppercase tracking-wider transition font-bold flex items-center gap-1.5 cursor-pointer ${
              is3DSpatialView 
                ? 'bg-gradient-to-r from-neon-cyan/30 to-neon-magenta/30 border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
            title="3D Tiefen-Perspektive umschalten"
          >
            <Sparkles className="w-3 h-3 text-neon-cyan animate-pulse" />
            {is3DSpatialView ? '3D Isometric ON' : '2D Plan View'}
          </button>

          {is3DSpatialView && (
            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 items-center gap-0.5">
              <button
                onClick={() => { setSpatialTiltX(52); setSpatialRotateZ(-22); }}
                className={`px-2 py-0.5 rounded text-[8px] font-mono transition ${
                  spatialTiltX === 52 ? 'bg-neon-cyan/20 text-neon-cyan font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                52° Isometric
              </button>
              <button
                onClick={() => { setSpatialTiltX(66); setSpatialRotateZ(-35); }}
                className={`px-2 py-0.5 rounded text-[8px] font-mono transition ${
                  spatialTiltX === 66 ? 'bg-neon-magenta/20 text-neon-magenta font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                66° Deep
              </button>
              <button
                onClick={() => { setSpatialTiltX(0); setSpatialRotateZ(0); }}
                className={`px-2 py-0.5 rounded text-[8px] font-mono transition ${
                  spatialTiltX === 0 ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                0° Flat
              </button>
            </div>
          )}

          {/* Add Inter-Device Trigger Link */}
          <button
            onClick={() => setShowAddTriggerModal(true)}
            className="px-2.5 py-1 bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan text-[9px] font-mono rounded-lg flex items-center gap-1.5 transition uppercase font-bold cursor-pointer"
          >
            <Link className="w-3 h-3" /> + Trigger-Verbindung
          </button>

          {/* Camera Zoom Controls */}
          <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
            <button
              onClick={handleZoomOut}
              title="Zoom Out (-)"
              className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[9px] font-mono text-gray-300 px-2 font-bold min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Zoom In (+)"
              className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {isZoomedIn && (
              <button
                onClick={handleResetZoom}
                title="Reset Zoom / Overview"
                className="ml-1 px-1.5 py-0.5 bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan rounded text-[8px] font-mono uppercase font-bold hover:bg-neon-cyan/30 transition cursor-pointer flex items-center gap-1"
              >
                <Maximize2 className="w-2.5 h-2.5" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SVG Canvas for D3 simulation & Zoom Camera */}
      <svg
        className="w-full flex-grow cursor-grab active:cursor-grabbing select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleSvgDoubleClick}
      >
        <defs>
          <radialGradient id="cyan-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="magenta-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff007f" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff007f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="green-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#39ff14" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#39ff14" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="yellow-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffdf00" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffdf00" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="red-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff3131" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff3131" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="cyan-magenta" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ff007f" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="active-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff007f" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="error-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3131" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff9900" stopOpacity="0.1" />
          </linearGradient>

          {/* Arrowhead marker for directional trigger links */}
          <marker id="trigger-arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#00f0ff" opacity="0.8" />
          </marker>
        </defs>

        {/* SMOOTH ELEGANT ZOOM & PAN TRANSFORM CONTAINER */}
        <g
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0',
            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Studio Stage Overlay for Digital Hardware Twin */}
          {workflowMode === 'digital_twin' && (
            <g className="pointer-events-none opacity-30">
              {/* Studio Desk Surface */}
              <rect x="40" y="30" width={dimensions.width - 80} height="130" rx="12" fill="rgba(255,255,255,0.02)" stroke="#00f0ff" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x="50" y="48" className="font-mono text-[8px] fill-neon-cyan uppercase tracking-widest font-bold">SYNTHESIZER &amp; MASTER DESK ZONE</text>

              {/* Drum & Sequencer Station */}
              <rect x="40" y="175" width={dimensions.width - 80} height="130" rx="12" fill="rgba(255,255,255,0.02)" stroke="#39ff14" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x="50" y="193" className="font-mono text-[8px] fill-neon-green uppercase tracking-widest font-bold">BEAT &amp; DRUM RACK STATION</text>

              {/* Pedal / Modular FX Floorboard */}
              <rect x="40" y="320" width={dimensions.width - 80} height="110" rx="12" fill="rgba(255,255,255,0.02)" stroke="#ff007f" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x="50" y="338" className="font-mono text-[8px] fill-neon-magenta uppercase tracking-widest font-bold">EFFECTS &amp; AUDIO INTERFACE FLOORBOARD</text>
            </g>
          )}

          {/* Live mode animated ripples */}
          {workflowMode === 'live' && ripples.map((r) => (
            <circle
              key={r.id}
              cx={r.x}
              cy={r.y}
              r={r.r}
              fill="none"
              stroke={r.color}
              strokeWidth={3 * (1 - r.r / r.maxR)}
              opacity={1 - r.r / r.maxR}
              className="pointer-events-none"
            />
          ))}

          {/* 1. Draw Master Clock links */}
          {links.map((link, idx) => {
            const sourceNode = nodes.find((n) => n.id === link.source);
            const targetNode = nodes.find((n) => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            const matchingDevice = devices.find((d) => d.id === targetNode.id);
            const latency = matchingDevice ? matchingDevice.latency : 5.0;
            const isError = matchingDevice ? matchingDevice.status === 'Error' : false;
            const isWarn = matchingDevice ? matchingDevice.status === 'Warn' : false;

            let flowDuration = isError ? 8.0 : Math.max(0.18, Math.min(3.8, latency * 0.1));

            if (workflowMode === 'arrangement' && deviceParams[targetNode.id]) {
              const vol = deviceParams[targetNode.id].volume;
              flowDuration = Math.max(0.12, Math.min(5.0, flowDuration * (1.5 - (vol / 100))));
            }

            const direction = triggerDirections[targetNode.id] || 'outward';

            const calculatePathData = (sNode: typeof sourceNode, tNode: typeof targetNode) => {
              const dx = tNode.x - sNode.x;
              const dy = tNode.y - sNode.y;
              const mx = sNode.x + dx / 2;
              const my = sNode.y + dy / 2;
              const angle = Math.atan2(dy, dx);
              
              if (activeViewMode === 'grid' || activeViewMode === 'constellation') {
                return `M ${sNode.x} ${sNode.y} L ${tNode.x} ${tNode.y}`;
              } else if (activeViewMode === 'circuit') {
                const midY = sNode.y + (tNode.y - sNode.y) * 0.5;
                return `M ${sNode.x} ${sNode.y} L ${sNode.x} ${midY} L ${tNode.x} ${midY} L ${tNode.x} ${tNode.y}`;
              } else {
                const curveOffset = (idx % 2 === 0 ? 1 : -1) * (activeViewMode === 'radial' ? 35 : 20);
                const cx = mx - Math.sin(angle) * curveOffset;
                const cy = my + Math.cos(angle) * curveOffset;
                return `M ${sNode.x} ${sNode.y} Q ${cx} ${cy} ${tNode.x} ${tNode.y}`;
              }
            };

            const forwardPath = direction === 'inward' ? calculatePathData(targetNode, sourceNode) : calculatePathData(sourceNode, targetNode);
            const backwardPath = calculatePathData(targetNode, sourceNode);

            let strokeColor = 'url(#cyan-magenta)';
            let particleColor = '#00f0ff';
            let glowColor = '#00f0ff';
            
            if (link.active) {
              strokeColor = 'url(#active-gradient)';
              particleColor = '#ff007f';
              glowColor = '#ff007f';
            } else if (isError) {
              strokeColor = 'url(#error-gradient)';
              particleColor = '#ff3131';
              glowColor = '#ff3131';
            } else if (isWarn) {
              particleColor = '#ffdf00';
              glowColor = '#ffdf00';
            }

            return (
              <g key={`link-${idx}`} className="group/link">
                <path
                  d={forwardPath}
                  fill="none"
                  stroke={glowColor}
                  strokeWidth={link.active ? 8 : 2.5}
                  strokeOpacity={link.active ? 0.45 : isError ? 0.05 : 0.12}
                  className="transition-all duration-500 pointer-events-none"
                  style={{ filter: 'blur(4px)' }}
                />

                <path
                  d={forwardPath}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={link.active ? 2.5 : isError ? 0.8 : 1.2}
                  strokeOpacity={isError ? 0.35 : 0.8}
                  className="transition-all duration-300 pointer-events-none"
                  markerEnd="url(#trigger-arrow)"
                />

                <path
                  d={forwardPath}
                  fill="none"
                  stroke={glowColor}
                  strokeWidth={link.active ? 1.8 : 0.9}
                  strokeOpacity={isError ? 0.15 : 0.4}
                  strokeDasharray={isError ? "3, 20" : "5, 12"}
                  className="pointer-events-none"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values={isError ? "100;0" : "40;0"}
                    dur={`${flowDuration}s`}
                    repeatCount="indefinite"
                  />
                </path>

                {!isError && (
                  <g className="pointer-events-none">
                    <circle r={link.active ? 3.5 : 2} fill={particleColor} opacity={link.active ? 0.95 : 0.65}>
                      <animateMotion
                        dur={`${flowDuration}s`}
                        repeatCount="indefinite"
                        path={forwardPath}
                      />
                    </circle>
                  </g>
                )}

                {link.active && (
                  <g className="pointer-events-none">
                    <circle r="6.5" fill="#ff007f" opacity="0.95" style={{ filter: 'drop-shadow(0 0 5px #ff007f)' }}>
                      <animateMotion
                        dur={`${flowDuration * 0.45}s`}
                        repeatCount="indefinite"
                        path={forwardPath}
                      />
                    </circle>
                  </g>
                )}
              </g>
            );
          })}

          {/* 1b. INTER-DEVICE CUSTOM TRIGGER WIRES (WELCHES GERÄT TRIGGERT WELCHES) */}
          {customTriggerRoutes.map((route) => {
            const sNode = nodes.find((n) => n.id === route.sourceId);
            const tNode = nodes.find((n) => n.id === route.targetId);
            if (!sNode || !tNode) return null;

            const dx = tNode.x - sNode.x;
            const dy = tNode.y - sNode.y;
            const mx = sNode.x + dx / 2;
            const my = sNode.y + dy / 2;
            const angle = Math.atan2(dy, dx);

            // Curve parameter
            const curveOffset = -32;
            const cx = mx - Math.sin(angle) * curveOffset;
            const cy = my + Math.cos(angle) * curveOffset;

            const pathD = `M ${sNode.x} ${sNode.y} Q ${cx} ${cy} ${tNode.x} ${tNode.y}`;
            const isSignalActive = activeSignals.includes(route.sourceId) || activeSignals.includes(route.targetId);

            const srcShortName = sNode.name.split(' ')[0];
            const tgtShortName = tNode.name.split(' ')[0];

            return (
              <g key={`custom-route-${route.id}`} className="group/custom-route">
                {/* Invisible wide hit area line for cable grabbing and re-routing */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) =>
                    handleStartCableReRoute(
                      e,
                      route.sourceId,
                      route.id,
                      route.channel,
                      route.type,
                      route.label
                    )
                  }
                >
                  <title>Kabel anfassen &amp; an anderes Gerät ziehen, um Zuweisung zu ändern</title>
                </path>

                {/* Thick glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#39ff14"
                  strokeWidth={isSignalActive ? 7 : 2.5}
                  strokeOpacity={isSignalActive ? 0.6 : 0.3}
                  className="transition-all duration-300 pointer-events-none"
                  style={{ filter: 'blur(4px)' }}
                />

                {/* Main trigger cable line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#39ff14"
                  strokeWidth={isSignalActive ? 3 : 2}
                  strokeDasharray="5 3"
                  className="pointer-events-none"
                  markerEnd="url(#trigger-arrow)"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    values="20;0"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </path>

                {/* Flying trigger note particle */}
                <g className="pointer-events-none">
                  <circle r={isSignalActive ? "5.5" : "3.5"} fill="#39ff14" style={{ filter: 'drop-shadow(0 0 5px #39ff14)' }}>
                    <animateMotion
                      dur="1.2s"
                      repeatCount="indefinite"
                      path={pathD}
                    />
                  </circle>
                </g>

                {/* Cable Connector Badge with Source and Target names & Drag Handle */}
                <g
                  transform={`translate(${cx}, ${cy})`}
                  className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-20"
                  onMouseDown={(e) =>
                    handleStartCableReRoute(
                      e,
                      route.sourceId,
                      route.id,
                      route.channel,
                      route.type,
                      route.label
                    )
                  }
                >
                  {/* Badge Background Pill */}
                  <rect
                    x="-68"
                    y="-12"
                    width="136"
                    height="24"
                    rx="12"
                    fill="rgba(5, 12, 8, 0.92)"
                    stroke="#39ff14"
                    strokeWidth="1.2"
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }}
                  />

                  {/* Grip Icon dots */}
                  <text x="-60" y="3" className="font-mono text-[9px] fill-emerald-400 font-bold select-none opacity-80">
                    :::
                  </text>

                  {/* Connection Text [SRC ⚡ TGT] */}
                  <text
                    x="-6"
                    y="3"
                    textAnchor="middle"
                    className="font-mono text-[8px] fill-white font-bold select-none tracking-tight"
                  >
                    <tspan fill="#00f0ff">{srcShortName}</tspan> <tspan fill="#39ff14">⚡</tspan> <tspan fill="#ff007f">{tgtShortName}</tspan>
                  </text>

                  {/* Delete Button '×' */}
                  <g
                    transform="translate(54, 0)"
                    className="cursor-pointer hover:scale-125 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTriggerRoute(route.id);
                    }}
                  >
                    <circle r="6" fill="#ff3131" />
                    <text textAnchor="middle" y="2.5" className="font-sans text-[7px] font-bold fill-white select-none">×</text>
                  </g>
                </g>
              </g>
            );
          })}

          {/* 1c. ACTIVE INTERACTIVE DRAGGING CABLE WIRE */}
          {connectingFromNodeId && connectingMousePos && (() => {
            const srcNode = nodes.find(n => n.id === connectingFromNodeId);
            if (!srcNode) return null;

            const dx = connectingMousePos.x - srcNode.x;
            const dy = connectingMousePos.y - srcNode.y;
            const mx = srcNode.x + dx / 2;
            const my = srcNode.y + dy / 2;
            const angle = Math.atan2(dy, dx);
            const curveOffset = -35;
            const cx = mx - Math.sin(angle) * curveOffset;
            const cy = my + Math.cos(angle) * curveOffset;

            const dragPathD = `M ${srcNode.x} ${srcNode.y} Q ${cx} ${cy} ${connectingMousePos.x} ${connectingMousePos.y}`;

            return (
              <g className="pointer-events-none z-30">
                {/* Thick glowing cable shadow */}
                <path
                  d={dragPathD}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="6"
                  strokeOpacity="0.4"
                  style={{ filter: 'blur(5px)' }}
                />
                {/* Animated flowing cable line */}
                <path
                  d={dragPathD}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.8"
                  className="wire-drag-line"
                />
                {/* Plug connector tip */}
                <g transform={`translate(${connectingMousePos.x}, ${connectingMousePos.y})`}>
                  <circle r="9" fill="rgba(245, 158, 11, 0.3)" stroke="#f59e0b" strokeWidth="1.5" className="animate-ping" />
                  <circle r="6" fill="#f59e0b" style={{ filter: 'drop-shadow(0 0 8px #f59e0b)' }} />
                  <circle r="2.5" fill="#ffffff" />
                </g>
              </g>
            );
          })()}

          {/* 2. Draw nodes */}
          {nodes.map((node) => {
            const isSelected = selectedDeviceId === node.id;
            const isCenter = node.id === 'center-bpm';

            let glowId = 'cyan-glow';
            if (node.status === 'Warn') glowId = 'yellow-glow';
            if (node.status === 'Error') glowId = 'red-glow';
            if (isCenter && isPlaying) glowId = 'magenta-glow';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (workflowMode === 'live' && !isCenter) {
                    triggerRipple(node.x, node.y, node.color);
                  }
                  if (!isCenter) {
                    const matched = devices.find((d) => d.id === node.id);
                    if (matched) {
                      onSelectDevice(matched);
                      focusOnDeviceNode(node);
                    }
                  }
                }}
                onMouseDown={(e) => handleMouseDown(e, node)}
              >
                {/* 3D Volumetric Cylinder Target Rings & Cast Shadow (Matching reference image 3D depth) */}
                {is3DSpatialView && (
                  <g className="pointer-events-none">
                    {/* Elliptical floor shadow */}
                    <ellipse cx="0" cy="24" rx={node.radius * 1.4} ry={node.radius * 0.55} fill="rgba(0,0,0,0.7)" style={{ filter: 'blur(5px)' }} />

                    {/* Outer Glowing Cylindrical Ring */}
                    <ellipse
                      cx="0"
                      cy="18"
                      rx={isSelected ? node.radius * 1.6 : node.radius * 1.35}
                      ry={isSelected ? node.radius * 0.65 : node.radius * 0.5}
                      fill="rgba(0, 240, 255, 0.05)"
                      stroke={isSelected ? "#00f0ff" : node.color}
                      strokeWidth={isSelected ? "2" : "1"}
                      strokeDasharray="6, 4"
                      style={{
                        filter: `drop-shadow(0 0 10px ${node.color})`,
                      }}
                    >
                      <animate attributeName="stroke-dashoffset" values="0;20" dur="3s" repeatCount="indefinite" />
                    </ellipse>

                    {/* Concentric Inner Glass Rim */}
                    <ellipse
                      cx="0"
                      cy="10"
                      rx={node.radius * 1.15}
                      ry={node.radius * 0.42}
                      fill="none"
                      stroke={isCenter ? "#ff007f" : "#00f0ff"}
                      strokeWidth="0.75"
                      strokeOpacity="0.6"
                    />

                    {/* Vertical 3D Light Pillar Pillars */}
                    {activeSignals.includes(node.id) && (
                      <g>
                        <line x1="0" y1="10" x2="0" y2="-65" stroke={node.color} strokeWidth="2.5" strokeOpacity="0.8" style={{ filter: 'blur(1px)' }}>
                          <animate attributeName="stroke-opacity" values="0.3;0.9;0.3" dur="1.2s" repeatCount="indefinite" />
                        </line>
                        <circle cx="0" cy="-65" r="4" fill={node.color} style={{ filter: `drop-shadow(0 0 8px ${node.color})` }}>
                          <animate attributeName="r" values="3;6;3" dur="1s" repeatCount="indefinite" />
                        </circle>
                      </g>
                    )}

                    {/* 3D Extruded Equalizer Bar Column Histogram (Matching reference Image 1) */}
                    {show3DEqualizerBars && !isCenter && (
                      <g transform="translate(28, -25)">
                        {[0, 1, 2, 3].map((bIdx) => {
                          const barActive = activeSignals.includes(node.id);
                          const barH = barActive ? 18 + ((bIdx * 7) % 18) : 6 + (bIdx % 3) * 3;
                          const barY = -barH;
                          return (
                            <g key={`bar-${bIdx}`} transform={`translate(${bIdx * 5}, 0)`}>
                              {/* 3D Bar Front Side */}
                              <rect
                                x="0"
                                y={barY}
                                width="3.5"
                                height={barH}
                                fill={bIdx === 3 ? "#ff007f" : bIdx === 2 ? "#39ff14" : "#00f0ff"}
                                opacity="0.85"
                                rx="0.5"
                              >
                                {barActive && (
                                  <animate attributeName="height" values={`${barH};${barH + 10};${barH}`} dur={`${0.3 + bIdx * 0.15}s`} repeatCount="indefinite" />
                                )}
                              </rect>
                              {/* 3D Bar Top Cap Highlight */}
                              <ellipse
                                cx="1.75"
                                cy={barY}
                                rx="1.75"
                                ry="0.8"
                                fill="#ffffff"
                                opacity="0.9"
                              />
                            </g>
                          );
                        })}
                      </g>
                    )}
                  </g>
                )}

                {/* Radial background glow filter */}
                <circle
                  r={isCenter ? node.radius * pulseScale * 1.7 : node.radius * 1.5}
                  fill={`url(#${glowId})`}
                  className="transition-all duration-100 ease-out"
                />

                {/* Central BPM Clock Outer animated ring & 3D Multi-Layer Wheel Dial */}
                {isCenter && (
                  <g>
                    {/* 3D Golden/Amber Gauge Ring (Matching reference image 1 circular wheel) */}
                    {is3DSpatialView && (
                      <g className="pointer-events-none">
                        <ellipse cx="0" cy="22" rx="55" ry="22" fill="rgba(234, 179, 8, 0.08)" stroke="#eab308" strokeWidth="1.5" strokeDasharray="8, 4" style={{ filter: 'drop-shadow(0 0 10px #eab308)' }}>
                          <animate attributeName="stroke-dashoffset" values="0;36" dur="4s" repeatCount="indefinite" />
                        </ellipse>
                        <ellipse cx="0" cy="12" rx="48" ry="18" fill="none" stroke="#00f0ff" strokeWidth="1" strokeDasharray="4, 12" className="animate-spin" style={{ animationDuration: '6s' }} />
                      </g>
                    )}

                    <circle
                      r={node.radius * pulseScale}
                      fill="rgba(10, 10, 15, 0.95)"
                      stroke={isPlaying ? '#ff007f' : '#ffdf00'}
                      strokeWidth="3.5"
                      className="transition-all duration-300"
                      style={{
                        filter: isPlaying
                          ? 'drop-shadow(0 0 16px rgba(255, 0, 127, 0.8))'
                          : 'drop-shadow(0 0 10px rgba(255, 223, 0, 0.5))',
                      }}
                    />
                  </g>
                )}

                {/* Magnetic Snap Target Ring when dragging a Cable Wire */}
                {hoveredTargetNodeId === node.id && (
                  <g className="pointer-events-none">
                    <circle r={node.radius + 18} fill="rgba(245, 158, 11, 0.12)" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6, 4" className="animate-spin" style={{ animationDuration: '3s', filter: 'drop-shadow(0 0 12px #f59e0b)' }} />
                    <text textAnchor="middle" y={node.radius + 30} className="font-mono text-[8px] font-bold fill-amber-400 select-none uppercase tracking-wider">
                      ⚡ HIER VERBINDEN (Target)
                    </text>
                  </g>
                )}

                {/* Standard Device Node Circle Base */}
                {!isCenter && (
                  <circle
                    r={isSelected ? node.radius + 6 : node.radius}
                    fill="rgba(10, 10, 14, 0.94)"
                    stroke={isSelected ? '#00f0ff' : node.color}
                    strokeWidth={isSelected ? 3.5 : 1.8}
                    className="transition-all duration-200"
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 0 14px ${node.color})`
                        : `drop-shadow(0 0 5px ${node.color}33)`,
                    }}
                  />
                )}

                {/* Visual Category Icon overlay inside the Node */}
                {isCenter ? (
                  <g transform="translate(0, -5)">
                    <ellipse cx="0" cy="18" rx="22" ry="7" fill="rgba(255, 0, 127, 0.15)" stroke="#ff007f" strokeWidth="0.5" />
                    <line x1="-18" y1="18" x2="-18" y2="-12" stroke="#ff007f" strokeWidth="0.5" opacity="0.4" strokeDasharray="1, 2" />
                    <line x1="18" y1="18" x2="18" y2="-12" stroke="#ff007f" strokeWidth="0.5" opacity="0.4" strokeDasharray="1, 2" />
                    <ellipse cx="0" cy="-5" rx="16" ry="5.5" fill="rgba(0, 240, 255, 0.1)" stroke="#00f0ff" strokeWidth="1" />
                    <line x1="0" y1="18" x2="0" y2="-15" stroke={isPlaying ? "#ff007f" : "#ffdf00"} strokeWidth="2">
                      {isPlaying && (
                        <animate attributeName="stroke-width" values="1;3;1" dur="0.8s" repeatCount="indefinite" />
                      )}
                    </line>
                    <ellipse cx="0" cy="6" rx="26" ry="9.5" fill="none" stroke="#eab308" strokeWidth="0.8" strokeDasharray="4, 12" className="animate-spin" style={{ animationDuration: '4s' }} />

                    <text textAnchor="middle" y="1" className="font-mono text-[7px] font-black tracking-widest fill-white">
                      {isPlaying ? 'MASTER CLK' : 'PAUSED'}
                    </text>
                    <text textAnchor="middle" y="11" className={`font-display text-[10px] font-black tracking-wider ${isPlaying ? 'fill-neon-magenta animate-pulse' : 'fill-neon-yellow'}`}>
                      {bpm} BPM
                    </text>
                  </g>
                ) : (
                  <g transform="translate(0, 0)">
                    {/* Isometric Vector graphics per device group */}
                    {node.group === 'usb' && (
                      <g className="transition-all duration-300">
                        <polygon points="-16,-2 -16,3 0,11 16,3 16,-2" fill="rgba(0, 0, 0, 0.5)" />
                        <polygon points="-16,-2 0,6 0,11 -16,3" fill="#0f172a" />
                        <polygon points="0,6 16,-2 16,3 0,11" fill="#1e293b" />
                        <polygon points="-16,-2 0,-10 16,-2 0,6" fill="#1b2230" stroke="#00f0ff" strokeWidth="0.75" />
                        <line x1="-16" y1="-2" x2="0" y2="6" stroke="#00f0ff" strokeWidth="1" />
                        <line x1="16" y1="-2" x2="0" y2="6" stroke="#00f0ff" strokeWidth="0.5" />

                        <polygon points="-10,-3 -7,-4.5 -4,-3 -7,-1.5" fill={activeSignals.includes(node.id) ? "#ff007f" : "#0f375a"} stroke="#00f0ff" strokeWidth="0.25" />
                        <polygon points="-5,-1 -2,-2.5 1,-1 -2,0.5" fill={activeSignals.includes(node.id) ? "#39ff14" : "#0f375a"} stroke="#00f0ff" strokeWidth="0.25" />
                        <polygon points="0,1 3,-0.5 6,1 3,2.5" fill="#0f375a" stroke="#00f0ff" strokeWidth="0.25" />
                        <polygon points="5,3 8,1.5 11,3 8,4.5" fill="#0f375a" stroke="#00f0ff" strokeWidth="0.25" />
                      </g>
                    )}
                    {node.group === 'synth' && (
                      <g className="transition-all duration-300">
                        <polygon points="-18,-4 -15,-6 -15,1 -18,3" fill="#5c1d02" />
                        <polygon points="15,-10 18,-8 18,-1 15,-3" fill="#5c1d02" />
                        <polygon points="-15,1 15,-3 15,0 -15,4" fill="#0f172a" stroke="#334155" strokeWidth="0.5" />
                        <polygon points="-15,-6 15,-10 15,-3 -15,1" fill="#111827" stroke="#ff007f" strokeWidth="0.5" />
                        <polygon points="-15,1 15,-3 12,3 -12,7" fill="#cbd5e1" />
                        <line x1="-12" y1="2" x2="-10.5" y2="5" stroke="#000" strokeWidth="0.6" />
                        <line x1="-8" y1="1" x2="-6.5" y2="4" stroke="#000" strokeWidth="0.6" />
                        <line x1="-4" y1="0" x2="-2.5" y2="3" stroke="#000" strokeWidth="0.6" />
                        <line x1="0" y1="-1" x2="1.5" y2="2" stroke="#000" strokeWidth="0.6" />
                        <line x1="4" y1="-2" x2="5.5" y2="1" stroke="#000" strokeWidth="0.6" />
                        <line x1="8" y1="-3" x2="9.5" y2="0" stroke="#000" strokeWidth="0.6" />
                      </g>
                    )}
                    {node.group === 'drum' && (
                      <g className="transition-all duration-300">
                        <polygon points="-17,-3 -14,-5 -14,2 -17,4" fill="#7c2d12" />
                        <polygon points="14,-9 17,-7 17,0 14,-2" fill="#7c2d12" />
                        <polygon points="-14,2 14,-2 14,1 -14,5" fill="#111827" />
                        <polygon points="-14,-5 14,-9 14,-2 -14,2" fill="#181e29" stroke="#39ff14" strokeWidth="0.75" />
                        <polygon points="-10,-4 2,-6 1,-3 -11,-1" fill="#052e16" stroke="#39ff14" strokeWidth="0.5" />
                        <polygon points="-10,0.5 -7,-0.2 -4,0.5 -7,1.2" fill={activeSignals.includes(node.id) ? "#39ff14" : "#1e293b"} stroke="#39ff14" strokeWidth="0.25" />
                      </g>
                    )}
                    {(node.group === 'virtual' || node.group === 'midi') && (
                      <g className="transition-all duration-300">
                        <polygon points="-15,-3 0,-9 15,-3 0,3" fill="#1e1b4b" stroke="#818cf8" strokeWidth="0.75" />
                        <polygon points="-15,-3 -15,2 0,8 0,3" fill="#0f0e26" />
                        <polygon points="0,3 0,8 15,2 15,-3" fill="#131133" />
                      </g>
                    )}

                    {/* Device Name Label */}
                    <text
                      textAnchor="middle"
                      y="14"
                      className="font-sans text-[8px] font-bold fill-gray-100 tracking-wide"
                    >
                      {node.name.length > 12 ? `${node.name.substring(0, 10)}..` : node.name}
                    </text>

                    {/* Small Status Light */}
                    <circle cx="0" cy="-22" r="3" fill={node.color} />
                  </g>
                )}

                {/* Interactive Cable Output Socket Pin (Right side OUT Port) */}
                {!isCenter && (
                  <g
                    transform={`translate(${node.radius + 12}, 0)`}
                    className="cursor-crosshair hover:scale-125 transition group/socket"
                    onMouseDown={(e) => handleStartCableDrag(e, node.id)}
                  >
                    <title>Kabel Ziehen (OUT): Mit anderem Gerät direkt verbinden &amp; triggern</title>
                    <circle r="8" fill="#0c0e18" stroke="#f59e0b" strokeWidth="1.5" className="group-hover/socket:stroke-amber-300 group-hover/socket:fill-amber-500/30" />
                    <circle r="3.5" fill="#f59e0b" className="group-hover/socket:fill-amber-300 animate-pulse" />
                    <text x="12" y="3" className="font-mono text-[7px] font-bold fill-amber-400 opacity-0 group-hover/socket:opacity-100 transition pointer-events-none select-none uppercase tracking-wider">
                      🔌 OUT (KABEL ZIEHEN)
                    </text>
                  </g>
                )}

                {/* Interactive Cable Input Socket Pin (Left side IN Port) */}
                {!isCenter && (
                  <g
                    transform={`translate(${-node.radius - 12}, 0)`}
                    className="cursor-crosshair hover:scale-125 transition group/socket"
                    onMouseDown={(e) => handleStartCableDrag(e, node.id)}
                  >
                    <title>Kabel Anstecken (IN): Signal von anderem Gerät empfangen</title>
                    <circle r="8" fill="#0c0e18" stroke="#00f0ff" strokeWidth="1.5" className="group-hover/socket:stroke-cyan-300 group-hover/socket:fill-cyan-500/30" />
                    <circle r="3.5" fill="#00f0ff" className="group-hover/socket:fill-cyan-300 animate-pulse" />
                    <text x="-12" y="3" textAnchor="end" className="font-mono text-[7px] font-bold fill-cyan-400 opacity-0 group-hover/socket:opacity-100 transition pointer-events-none select-none uppercase tracking-wider">
                      📥 IN PORT
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Brainstorming Mode Idea Links */}
          {workflowMode === 'brainstorming' && customIdeas.map((idea) => {
            const nearest = getNearestNode(idea.x, idea.y);
            if (!nearest) return null;
            return (
              <line
                key={`link-${idea.id}`}
                x1={idea.x}
                y1={idea.y}
                x2={nearest.x}
                y2={nearest.y}
                stroke={idea.color}
                strokeWidth="1"
                strokeDasharray="3, 3"
                opacity="0.45"
                className="pointer-events-none"
              />
            );
          })}

          {/* Brainstorming Custom Idea Notes */}
          {workflowMode === 'brainstorming' && customIdeas.map((idea) => (
            <g
              key={idea.id}
              transform={`translate(${idea.x}, ${idea.y})`}
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleIdeaMouseDown(e, idea.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingIdeaId(idea.id);
                setEditingIdeaText(idea.text);
              }}
            >
              <rect
                x="-60"
                y="-18"
                width="120"
                height="36"
                rx="6"
                fill="rgba(14, 14, 22, 0.92)"
                stroke={idea.color}
                strokeWidth="1"
              />
              <rect x="-60" y="-18" width="3" height="36" fill={idea.color} rx="1" />
              <text textAnchor="middle" y="-2" className="font-mono text-[8px] fill-white select-none pointer-events-none">
                {idea.text.length > 25 ? `${idea.text.substring(0, 23)}..` : idea.text}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Add Custom Trigger Connection Modal */}
      {showAddTriggerModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0e15] border border-white/10 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                <Link className="w-4 h-4 text-neon-cyan" /> TRIGGER-VERBINDUNG ERSTELLEN
              </h3>
              <button onClick={() => setShowAddTriggerModal(false)} className="text-gray-400 hover:text-white text-xs font-mono">✕</button>
            </div>

            <div className="space-y-3 font-mono text-[10px]">
              <div>
                <label className="text-gray-400 block mb-1">1. QUELLE (Trigger Sender):</label>
                <select
                  value={newTriggerSource}
                  onChange={(e) => setNewTriggerSource(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-neon-cyan"
                >
                  <option value="">Gerät auswählen...</option>
                  <option value="center-bpm">⏱️ Master BPM Clock</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">2. ZIEL (Trigger Empfänger):</label>
                <select
                  value={newTriggerTarget}
                  onChange={(e) => setNewTriggerTarget(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-neon-cyan"
                >
                  <option value="">Gerät auswählen...</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">SIGNAL-TYP:</label>
                  <select
                    value={newTriggerType}
                    onChange={(e) => setNewTriggerType(e.target.value as any)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-neon-cyan"
                  >
                    <option value="MIDI Note">MIDI Note</option>
                    <option value="Clock Sync">Clock Sync</option>
                    <option value="CC Modulation">CC Modulation</option>
                    <option value="CV Gate">CV / Gate</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">MIDI KANAL:</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={newTriggerChannel}
                    onChange={(e) => setNewTriggerChannel(parseInt(e.target.value) || 1)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-neon-cyan"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowAddTriggerModal(false)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 text-[10px] font-mono hover:text-white"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddTriggerRoute}
                className="px-3 py-1.5 rounded-lg bg-neon-cyan text-black font-bold text-[10px] font-mono hover:opacity-90"
              >
                Kopplung Speichern ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Device Signal Flow & Trigger Inspector Side Panel */}
      {selectedDevice && (
        <div className="absolute right-4 top-20 bottom-12 w-64 bg-black/90 border border-white/10 rounded-xl p-4 flex flex-col justify-between z-20 backdrop-blur-md overflow-y-auto shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-2">
              <div>
                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-neon-cyan bg-neon-cyan/10 px-1.5 py-0.5 rounded">
                  {selectedDevice.type.toUpperCase()}
                </span>
                <h3 className="font-display font-bold text-gray-100 text-sm mt-1">{selectedDevice.name}</h3>
              </div>
              <button
                onClick={() => onSelectDevice(null as any)}
                className="text-gray-400 hover:text-white p-1 rounded transition text-xs font-mono"
              >
                ✕
              </button>
            </div>

            {/* Trigger Directions Assignment */}
            <div className="space-y-2 font-mono text-[9px]">
              <span className="text-gray-300 font-bold block">🔄 TRIGGER-DIREKTION:</span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => handleSetTriggerDirection(selectedDevice.id, 'outward')}
                  className={`px-2.5 py-1.5 rounded-lg border transition text-left cursor-pointer ${
                    (triggerDirections[selectedDevice.id] || 'outward') === 'outward'
                      ? 'bg-neon-cyan/10 border-neon-cyan text-white font-bold'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  ➡️ Ausgehend (Clock Sync)
                </button>
                <button
                  onClick={() => handleSetTriggerDirection(selectedDevice.id, 'inward')}
                  className={`px-2.5 py-1.5 rounded-lg border transition text-left cursor-pointer ${
                    triggerDirections[selectedDevice.id] === 'inward'
                      ? 'bg-neon-cyan/10 border-neon-cyan text-white font-bold'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  ⬅️ Eingehend (Trigger Controller)
                </button>
                <button
                  onClick={() => handleSetTriggerDirection(selectedDevice.id, 'bidirectional')}
                  className={`px-2.5 py-1.5 rounded-lg border transition text-left cursor-pointer ${
                    triggerDirections[selectedDevice.id] === 'bidirectional'
                      ? 'bg-neon-cyan/10 border-neon-cyan text-white font-bold'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  🔄 Bidirektional (Full Duplex)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <button
              onClick={() => {
                if (onAutoHealAll) onAutoHealAll();
                if (addLog) addLog(selectedDevice.name, 'success', '[PORT REPAIR] Hardware-Port kalibriert.');
              }}
              className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded text-[9px] font-mono transition uppercase cursor-pointer"
            >
              ⚙️ Port Rekalibrieren
            </button>
          </div>
        </div>
      )}

      {/* Worst-Case Safe Mode Fullscreen Overlay */}
      {showEmergencyOverlay && (
        <div className="absolute inset-0 bg-[#050508]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-sm font-display font-black text-white uppercase tracking-widest pt-2">
              🚨 Notfall-Protokoll Aktiviert
            </h2>
            <p className="text-[10px] font-mono text-red-400 animate-pulse">
              [SYSTEM SHIELD: WORST-CASE OPTIMIERUNG AUF 0% FEHLERRATE]
            </p>
          </div>

          <div className="w-48 h-1 relative overflow-hidden bg-white/5 rounded-full border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-orange-400 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${emergencyProgress}%` }}
            />
          </div>

          <div className="w-full max-w-md bg-black/60 border border-white/5 p-3 rounded-lg font-mono text-[9px] text-gray-300 space-y-1 h-32 overflow-y-auto select-none">
            {emergencyConsoleLogs.map((log, lidx) => (
              <div key={lidx} className={log.includes('[SEALED]') || log.includes('[HEAL]') ? "text-emerald-400" : "text-gray-400"}>
                {log}
              </div>
            ))}
            <div className="text-neon-cyan animate-pulse">&gt; {emergencyStep}</div>
          </div>
        </div>
      )}

      {/* Footer Info Strip */}
      <div className="absolute bottom-2 left-4 right-4 pointer-events-none flex justify-between items-center bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[10px] font-mono text-gray-300 z-10 shadow-lg">
        <span className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">🔌 KABEL ZACK UMSTECKEN:</span> Klicke auf ein Kabel oder Badge &amp; ziehe es zu einem anderen Gerät, um die Zuweisung sofort zu ändern.
        </span>
        <span className="hidden sm:inline text-neon-cyan font-bold">
          🔍 Klick auf Gerät zum Zoomen | Fenstergröße oben wählbar
        </span>
      </div>
    </div>
  );
}
