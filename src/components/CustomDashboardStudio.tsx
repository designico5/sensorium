import React, { useState, useEffect } from 'react';
import { MidiDevice, SystemLog } from '../types';
import IsometricDevice from './IsometricDevice';
import Spatial3DClusterView from './Spatial3DClusterView';
import Spatial5DStadiumEngine from './Spatial5DStadiumEngine';
import SnapshotMorphSuite from './SnapshotMorphSuite';
import AudiophileAcousticLab from './AudiophileAcousticLab';
import DAWProductionHub from './DAWProductionHub';
import MultiChannelRecorderView from './MultiChannelRecorderView';
import MidiMappingView from './MidiMappingView';
import TriggerUsbView from './TriggerUsbView';
import TripleAuditHardeningSuite from './TripleAuditHardeningSuite';
import RemoteSyncPortal from './RemoteSyncPortal';
import ActivityLoggerView from './ActivityLoggerView';
import QuantumInstinctMatrix from './QuantumInstinctMatrix';
import Mindmap from './Mindmap';
import HardwareBlueprintView from './HardwareBlueprintView';
import EnsembleVisualizer from './EnsembleVisualizer';
import AuraStudioCoach from './AuraStudioCoach';
import {
  LayoutGrid,
  Move,
  Plus,
  X,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Sliders,
  Settings,
  Sparkles,
  Box,
  Globe,
  Activity,
  Volume2,
  Disc,
  ShieldCheck,
  Smartphone,
  Network,
  Cpu,
  Layers,
  Grid,
  SlidersHorizontal,
  Brain,
  Usb,
  Flame,
  Check,
  Search,
  Filter,
  Palette,
  Play,
  Pause,
  Clock,
  Radio,
  Sliders as SlidersIcon
} from 'lucide-react';

export interface DashboardWidget {
  id: string;
  title: string;
  subtitle: string;
  category: 'cockpit' | 'spatial' | 'audio' | 'hardware' | 'ai' | 'system';
  icon: string;
  colSpan: 1 | 2 | 3; // 1 = 1 col, 2 = 2 col, 3 = full width
  visible: boolean;
  order: number;
  accentColor: 'cyan' | 'magenta' | 'amber' | 'emerald' | 'purple';
  minimized?: boolean;
}

interface CustomDashboardStudioProps {
  devices: MidiDevice[];
  activeSignals: string[];
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  selectedDevice: MidiDevice | null;
  setSelectedDevice: (dev: MidiDevice | null) => void;
  addLog: (category: SystemLog['category'], level: SystemLog['level'], message: string) => void;
  runDiagnosticsRepair: (id: string) => void;
  logs: SystemLog[];
  language: 'de' | 'en';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  latencySafetyBuffer?: number;
  setLatencySafetyBuffer?: (buf: number) => void;
  isClipAutomatic?: boolean;
  setIsClipAutomatic?: (auto: boolean) => void;
  isCustomizingMode?: boolean;
  setIsCustomizingMode?: (val: boolean) => void;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  {
    id: 'cockpit_rack',
    title: 'Studio Cockpit & Hardware Nodes',
    subtitle: 'Direktanzeige aller USB-MIDI & Synthesizer-Nodes',
    category: 'cockpit',
    icon: 'Cpu',
    colSpan: 3,
    visible: true,
    order: 1,
    accentColor: 'cyan'
  },
  {
    id: 'spatial_3d',
    title: 'Spatial 3D Cluster Racks',
    subtitle: 'Interaktiver 3D-Geometrie Mix-Raum (WFS)',
    category: 'spatial',
    icon: 'Box',
    colSpan: 2,
    visible: true,
    order: 2,
    accentColor: 'cyan'
  },
  {
    id: 'snapshot_morph',
    title: 'Cross-Morph Suite (&infin;)',
    subtitle: 'Unbeschränkter Morph zwischen Presets & Klängen',
    category: 'audio',
    icon: 'SlidersHorizontal',
    colSpan: 1,
    visible: true,
    order: 3,
    accentColor: 'amber'
  },
  {
    id: 'spatial_5d',
    title: '2031 Spatial 5D Arena',
    subtitle: 'Multi-Array Stadion- & Hallen-Akustik Simulator',
    category: 'spatial',
    icon: 'Globe',
    colSpan: 2,
    visible: true,
    order: 4,
    accentColor: 'purple'
  },
  {
    id: 'daw_production',
    title: 'DAW & Ableton 12 Link Hub',
    subtitle: 'Sub-Sample Sync & Remote Link Script Matrix',
    category: 'hardware',
    icon: 'Activity',
    colSpan: 1,
    visible: true,
    order: 5,
    accentColor: 'magenta'
  },
  {
    id: 'acoustic_lab',
    title: 'Audiophile Klang-Lab (192kHz)',
    subtitle: 'Echtzeit Klirrfaktor-, Spektrum- & Jitter-Analyse',
    category: 'audio',
    icon: 'Volume2',
    colSpan: 2,
    visible: true,
    order: 6,
    accentColor: 'amber'
  },
  {
    id: 'multich_record',
    title: 'Multi-Channel Direct Recorder',
    subtitle: 'Latenzfreier 32-Spur WAV/FLAC Audio-Capture',
    category: 'audio',
    icon: 'Disc',
    colSpan: 1,
    visible: true,
    order: 7,
    accentColor: 'emerald'
  },
  {
    id: 'quantum_instinct',
    title: 'Quantum Instinct Matrix & AI Genius',
    subtitle: 'Inspiration, Auto-Harmony & Arrangement Coach',
    category: 'ai',
    icon: 'Brain',
    colSpan: 2,
    visible: true,
    order: 8,
    accentColor: 'magenta'
  },
  {
    id: 'triple_audit',
    title: '3-Fach Audit & Security Suite',
    subtitle: 'Schutz vor Latenz-Jitter, Buffer-Dropouts & Attacks',
    category: 'system',
    icon: 'ShieldCheck',
    colSpan: 1,
    visible: true,
    order: 9,
    accentColor: 'emerald'
  },
  {
    id: 'trigger_usb',
    title: 'Trigger USB & Hardware Inspector',
    subtitle: 'Echtzeit USB Signal-Analyse & Port Health',
    category: 'hardware',
    icon: 'Usb',
    colSpan: 1,
    visible: true,
    order: 10,
    accentColor: 'cyan'
  },
  {
    id: 'remote_portal',
    title: 'Mobile Remote Sync Portal',
    subtitle: 'Steuerung per Smartphone, Tablet & Web-Interface',
    category: 'system',
    icon: 'Smartphone',
    colSpan: 1,
    visible: true,
    order: 11,
    accentColor: 'emerald'
  },
  {
    id: 'activity_logger',
    title: 'System Activity & Protocol Stream',
    subtitle: 'Live-Diagnose, Event-Streams & Performance-Logs',
    category: 'system',
    icon: 'Activity',
    colSpan: 1,
    visible: true,
    order: 12,
    accentColor: 'amber'
  }
];

export const CustomDashboardStudio: React.FC<CustomDashboardStudioProps> = ({
  devices,
  activeSignals,
  bpm,
  setBpm,
  isPlaying,
  setIsPlaying,
  selectedDevice,
  setSelectedDevice,
  addLog,
  runDiagnosticsRepair,
  logs,
  language,
  activeTab,
  setActiveTab,
  latencySafetyBuffer = 12,
  setLatencySafetyBuffer,
  isClipAutomatic = false,
  setIsClipAutomatic
}) => {
  const STORAGE_KEY = 'sensorium_custom_dashboard_v2';

  // Load layout from localStorage or default
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load custom dashboard layout', e);
    }
    return DEFAULT_WIDGETS;
  });

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('custom');
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3>(3);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState<boolean>(false);
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Save layout automatically to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.error('Failed saving layout', e);
    }
  }, [widgets]);

  const handleSavePreset = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
      setSavedSuccessMsg(language === 'de' ? 'Layout erfolgreich gespeichert!' : 'Layout saved successfully!');
      setTimeout(() => setSavedSuccessMsg(null), 3000);
      addLog('SYSTEM', 'info', language === 'de' ? '[DASHBOARD] Individuelles Control-Center Layout gespeichert.' : '[DASHBOARD] Custom Control Center layout saved.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetDefault = () => {
    setWidgets(DEFAULT_WIDGETS);
    setActivePreset('custom');
    localStorage.removeItem(STORAGE_KEY);
    addLog('SYSTEM', 'info', language === 'de' ? '[DASHBOARD] Layout auf Werkseinstellung zurückgesetzt.' : '[DASHBOARD] Layout reset to factory default.');
  };

  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    let updated = [...widgets];

    if (presetKey === 'live') {
      updated = updated.map(w => ({
        ...w,
        visible: ['cockpit_rack', 'spatial_3d', 'multich_record', 'trigger_usb', 'activity_logger'].includes(w.id),
        colSpan: w.id === 'cockpit_rack' ? 3 : w.id === 'spatial_3d' ? 2 : 1
      }));
    } else if (presetKey === 'mixing') {
      updated = updated.map(w => ({
        ...w,
        visible: ['acoustic_lab', 'snapshot_morph', 'daw_production', 'triple_audit', 'multich_record'].includes(w.id),
        colSpan: w.id === 'acoustic_lab' ? 2 : 1
      }));
    } else if (presetKey === 'spatial5d') {
      updated = updated.map(w => ({
        ...w,
        visible: ['spatial_5d', 'spatial_3d', 'quantum_instinct', 'remote_portal'].includes(w.id),
        colSpan: w.id === 'spatial_5d' || w.id === 'spatial_3d' ? 2 : 1
      }));
    } else if (presetKey === 'all') {
      updated = updated.map(w => ({ ...w, visible: true }));
    }

    setWidgets(updated);
    addLog('SYSTEM', 'info', `[DASHBOARD] Preset "${presetKey.toUpperCase()}" ${language === 'de' ? 'angewendet.' : 'applied.'}`);
  };

  const toggleWidgetVisibility = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  const updateWidgetColSpan = (id: string, colSpan: 1 | 2 | 3) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, colSpan } : w));
  };

  const updateWidgetAccent = (id: string, accentColor: DashboardWidget['accentColor']) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, accentColor } : w));
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const sorted = [...widgets].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(w => w.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap orders
    const temp = sorted[index].order;
    sorted[index].order = sorted[targetIndex].order;
    sorted[targetIndex].order = temp;

    setWidgets([...sorted]);
  };

  const toggleMinimize = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, minimized: !w.minimized } : w));
  };

  // Filtered visible widgets
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const visibleWidgets = sortedWidgets.filter(w => w.visible);

  // Helper for accent styling
  const getAccentBorder = (accent: DashboardWidget['accentColor']) => {
    switch (accent) {
      case 'cyan': return 'border-neon-cyan/30 hover:border-neon-cyan/60 shadow-[0_0_15px_rgba(0,240,255,0.1)]';
      case 'magenta': return 'border-neon-magenta/30 hover:border-neon-magenta/60 shadow-[0_0_15px_rgba(255,0,128,0.1)]';
      case 'amber': return 'border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
      case 'emerald': return 'border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case 'purple': return 'border-purple-500/30 hover:border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.1)]';
      default: return 'border-white/10';
    }
  };

  const getAccentBg = (accent: DashboardWidget['accentColor']) => {
    switch (accent) {
      case 'cyan': return 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30';
      case 'magenta': return 'bg-neon-magenta/10 text-neon-magenta border-neon-magenta/30';
      case 'amber': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'emerald': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'purple': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      default: return 'bg-white/10 text-white';
    }
  };

  const renderWidgetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu': return <Cpu className="w-4 h-4" />;
      case 'Box': return <Box className="w-4 h-4" />;
      case 'Globe': return <Globe className="w-4 h-4" />;
      case 'SlidersHorizontal': return <SlidersHorizontal className="w-4 h-4" />;
      case 'Volume2': return <Volume2 className="w-4 h-4" />;
      case 'Disc': return <Disc className="w-4 h-4" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4" />;
      case 'Smartphone': return <Smartphone className="w-4 h-4" />;
      case 'Brain': return <Brain className="w-4 h-4" />;
      case 'Usb': return <Usb className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Render individual live widget contents
  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case 'cockpit_rack':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {devices.slice(0, 4).map((dev) => (
                <IsometricDevice
                  key={dev.id}
                  id={dev.id}
                  name={dev.name}
                  type={dev.type}
                  status={dev.status}
                  isPhysicalHardware={dev.isPhysicalHardware}
                  active={activeSignals.includes(dev.id)}
                  isPlaying={isPlaying}
                  bpm={bpm}
                  selected={selectedDevice?.id === dev.id}
                  onClick={() => setSelectedDevice(dev)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs font-mono bg-black/50 p-2.5 rounded-xl border border-white/5 gap-2">
              <span className="text-gray-400">Nodes Active: <strong className="text-neon-cyan">{devices.filter(d=>d.status==='Healthy').length}/{devices.length}</strong></span>
              <span className="text-gray-400">Active Signals: <strong className="text-neon-magenta">{activeSignals.length}</strong></span>
              <span className="text-gray-400">Master Clock: <strong className="text-amber-400">{bpm} BPM</strong></span>
              <button
                onClick={() => setActiveTab('diagnostics')}
                className="px-2.5 py-1 bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 rounded-lg text-[10px] font-bold uppercase transition"
              >
                Ganzes Cockpit Öffnen &rarr;
              </button>
            </div>
          </div>
        );

      case 'spatial_3d':
        return (
          <div className="min-h-[280px]">
            <Spatial3DClusterView
              devices={devices}
              activeSignals={activeSignals}
              selectedDevice={selectedDevice}
              onSelectDevice={(d) => setSelectedDevice(d)}
            />
          </div>
        );

      case 'spatial_5d':
        return (
          <div className="min-h-[300px]">
            <Spatial5DStadiumEngine
              devices={devices}
              bpm={bpm}
              isPlaying={isPlaying}
              activeSignals={activeSignals}
              addLog={addLog}
            />
          </div>
        );

      case 'snapshot_morph':
        return (
          <SnapshotMorphSuite
            devices={devices}
            addLog={addLog}
            bpm={bpm}
            isPlaying={isPlaying}
          />
        );

      case 'acoustic_lab':
        return (
          <AudiophileAcousticLab
            devices={devices}
            activeSignals={activeSignals}
            addLog={addLog}
            isPlaying={isPlaying}
            bpm={bpm}
          />
        );

      case 'daw_production':
        return (
          <DAWProductionHub
            devices={devices}
            activeSignals={activeSignals}
            bpm={bpm}
            isPlaying={isPlaying}
            addLog={addLog}
          />
        );

      case 'multich_record':
        return (
          <MultiChannelRecorderView
            devices={devices}
            activeSignals={activeSignals}
            bpm={bpm}
            isPlaying={isPlaying}
            addLog={addLog}
          />
        );

      case 'quantum_instinct':
        return (
          <QuantumInstinctMatrix
            devices={devices}
            addLog={addLog}
            bpm={bpm}
            isPlaying={isPlaying}
            onTriggerImpulse={(presetName) => {
              addLog('SYSTEM', 'info', `[INSTINCT] Preset ${presetName} im Individualmodus ausgelöst.`);
            }}
          />
        );

      case 'triple_audit':
        return (
          <TripleAuditHardeningSuite
            devices={devices}
            addLog={addLog}
            latencySafetyBuffer={latencySafetyBuffer}
            setLatencySafetyBuffer={setLatencySafetyBuffer}
          />
        );

      case 'trigger_usb':
        return (
          <TriggerUsbView
            devices={devices}
            activeSignals={activeSignals}
            addLog={addLog}
          />
        );

      case 'remote_portal':
        return (
          <RemoteSyncPortal
            devices={devices}
            addLog={addLog}
            bpm={bpm}
            isPlaying={isPlaying}
          />
        );

      case 'activity_logger':
        return (
          <ActivityLoggerView
            logs={logs}
            addLog={addLog}
          />
        );

      default:
        return (
          <div className="p-6 text-center text-gray-400 text-xs">
            Modul nicht geladen.
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 w-full text-left">
      {/* HEADER CONTROL BAR */}
      <div className="bg-gradient-to-r from-black/80 via-black/90 to-black/80 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                <LayoutGrid className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-display font-black text-lg text-white uppercase tracking-wider flex items-center gap-2">
                  <span>{language === 'de' ? 'Individuelles Control-Center' : 'Custom Dashboard Studio'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/40 text-[9px] font-mono font-bold uppercase">
                    Individualmodus
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {language === 'de' 
                    ? 'Gestalten Sie Ihre persönliche Arbeitsumgebung mit frei arrangierbaren Studio-Modulen.'
                    : 'Design your custom studio workspace with drag-and-arrange modular views.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Presets & Action Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            {/* Mode Switcher */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-2 ${
                isEditMode
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black'
                  : 'bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>{isEditMode ? (language === 'de' ? '✏️ Anordnen beenden' : '✏️ Exit Edit Mode') : (language === 'de' ? '⚙️ Layout Anpassen' : '⚙️ Customize Layout')}</span>
            </button>

            {/* Presets dropdown / pill buttons */}
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono font-bold">
              <button
                onClick={() => applyPreset('all')}
                className={`px-2.5 py-1.5 rounded-lg transition uppercase ${activePreset === 'all' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40' : 'text-gray-400 hover:text-white'}`}
                title="Alle Module anzeigen"
              >
                Alle ({widgets.length})
              </button>
              <button
                onClick={() => applyPreset('live')}
                className={`px-2.5 py-1.5 rounded-lg transition uppercase ${activePreset === 'live' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40' : 'text-gray-400 hover:text-white'}`}
                title="Live Performance Setup"
              >
                🎛️ Live
              </button>
              <button
                onClick={() => applyPreset('mixing')}
                className={`px-2.5 py-1.5 rounded-lg transition uppercase ${activePreset === 'mixing' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-gray-400 hover:text-white'}`}
                title="Studio Mixing & Mastering Setup"
              >
                🎧 Mixing
              </button>
              <button
                onClick={() => applyPreset('spatial5d')}
                className={`px-2.5 py-1.5 rounded-lg transition uppercase ${activePreset === 'spatial5d' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-gray-400 hover:text-white'}`}
                title="2031 Spatial 5D Arena"
              >
                🌌 5D
              </button>
            </div>

            {/* Grid Columns */}
            <div className="hidden sm:flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
              <button
                onClick={() => setGridColumns(1)}
                className={`p-1.5 rounded-lg transition ${gridColumns === 1 ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                title="1 Spalte (Vollbreite)"
              >
                <div className="w-3.5 h-3.5 border border-current rounded-sm" />
              </button>
              <button
                onClick={() => setGridColumns(2)}
                className={`p-1.5 rounded-lg transition ${gridColumns === 2 ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                title="2 Spalten Layout"
              >
                <div className="w-3.5 h-3.5 border-x border-current rounded-sm" />
              </button>
              <button
                onClick={() => setGridColumns(3)}
                className={`p-1.5 rounded-lg transition ${gridColumns === 3 ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                title="3 Spalten Grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save & Reset */}
            <button
              onClick={handleSavePreset}
              className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition flex items-center gap-1.5 text-xs font-mono font-bold uppercase"
              title="Layout speichern"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Speichern</span>
            </button>

            <button
              onClick={handleResetDefault}
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 rounded-xl transition"
              title="Zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowAddWidgetModal(true)}
              className="px-3 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 rounded-xl transition flex items-center gap-1.5 text-xs font-mono font-bold uppercase shadow-[0_0_10px_rgba(0,240,255,0.2)]"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'de' ? 'Modul Hinzufügen' : 'Add Widget'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {savedSuccessMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" /> {savedSuccessMsg}
            </span>
            <button onClick={() => setSavedSuccessMsg(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Edit Mode Customization Toolbar */}
        {isEditMode && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                {language === 'de' 
                  ? 'INDIVIDUALMODUS BEARBEITEN: Verschieben Sie Module mit den Pfeilen, blenden Sie unerwünschte aus oder verändern Sie die Spaltenbreite.'
                  : 'EDIT MODE: Move modules up/down, toggle visibility or resize columns.'}
              </span>
              <span className="text-[10px] text-amber-400 font-bold uppercase">
                {visibleWidgets.length} / {widgets.length} Module Aktiv
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/20">
              <span className="text-gray-400 text-[10px] uppercase">Schnell-Schalter:</span>
              {widgets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => toggleWidgetVisibility(w.id)}
                  className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                    w.visible 
                      ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50' 
                      : 'bg-black/40 text-gray-500 border border-white/5 line-through opacity-60'
                  }`}
                >
                  {w.visible ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-red-400" />}
                  <span>{w.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC GRID LAYOUT */}
      <div className={`grid gap-6 ${
        gridColumns === 1 ? 'grid-cols-1' : gridColumns === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {visibleWidgets.map((widget) => {
          // Calculate column span class
          let colSpanClass = '';
          if (gridColumns === 3) {
            if (widget.colSpan === 3) colSpanClass = 'lg:col-span-3';
            else if (widget.colSpan === 2) colSpanClass = 'lg:col-span-2';
            else colSpanClass = 'lg:col-span-1';
          } else if (gridColumns === 2) {
            if (widget.colSpan >= 2) colSpanClass = 'md:col-span-2';
            else colSpanClass = 'md:col-span-1';
          }

          return (
            <div
              key={widget.id}
              className={`rounded-2xl glass-panel border backdrop-blur-md p-4 md:p-5 relative overflow-hidden transition-all duration-300 ${getAccentBorder(widget.accentColor)} ${colSpanClass} bg-black/50`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className={`p-2 rounded-xl ${getAccentBg(widget.accentColor)}`}>
                    {renderWidgetIcon(widget.icon)}
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                      <span>{widget.title}</span>
                    </h3>
                    <p className="text-[10px] text-gray-400">{widget.subtitle}</p>
                  </div>
                </div>

                {/* Widget Controls */}
                <div className="flex items-center gap-1">
                  {/* Edit mode controls */}
                  {isEditMode && (
                    <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-amber-500/30">
                      <button
                        onClick={() => moveWidget(widget.id, 'up')}
                        className="p-1 hover:bg-amber-500/20 text-amber-300 rounded transition"
                        title="Nach oben verschieben"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveWidget(widget.id, 'down')}
                        className="p-1 hover:bg-amber-500/20 text-amber-300 rounded transition"
                        title="Nach unten verschieben"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Width toggles */}
                      <button
                        onClick={() => updateWidgetColSpan(widget.id, widget.colSpan === 3 ? 1 : (widget.colSpan + 1) as 1 | 2 | 3)}
                        className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-200 rounded border border-amber-500/40"
                        title="Breite anpassen"
                      >
                        {widget.colSpan}x
                      </button>

                      {/* Accent color toggle */}
                      <button
                        onClick={() => {
                          const accents: DashboardWidget['accentColor'][] = ['cyan', 'magenta', 'amber', 'emerald', 'purple'];
                          const next = accents[(accents.indexOf(widget.accentColor) + 1) % accents.length];
                          updateWidgetAccent(widget.id, next);
                        }}
                        className="p-1 hover:bg-amber-500/20 text-amber-300 rounded transition"
                        title="Farbe wechseln"
                      >
                        <Palette className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => toggleWidgetVisibility(widget.id)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition"
                        title="Ausblenden"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Collapse / Expand toggle */}
                  <button
                    onClick={() => toggleMinimize(widget.id)}
                    className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition"
                    title={widget.minimized ? 'Maximieren' : 'Minimieren'}
                  >
                    {widget.minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setExpandedWidgetId(expandedWidgetId === widget.id ? null : widget.id)}
                    className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition"
                    title="Großansicht"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              {!widget.minimized && (
                <div className="w-full">
                  {renderWidgetContent(widget.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL / DRAWER FOR ADDING WIDGETS */}
      {showAddWidgetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-gray-900 via-black to-gray-950 border border-white/20 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-wider">
                    {language === 'de' ? 'Studio-Module zum Control-Center Hinzufügen' : 'Add Studio Modules to Dashboard'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {language === 'de' ? 'Wählen Sie aus dem vollen Sortiment der Virtuoso Stage-Suite' : 'Select from the full Virtuoso Stage Suite range'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddWidgetModal(false)}
                className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Module suchen..."
                  className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:border-neon-cyan outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
                {['all', 'cockpit', 'spatial', 'audio', 'hardware', 'system'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                      selectedCategoryFilter === cat ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Widget Catalog List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {widgets
                .filter(w => selectedCategoryFilter === 'all' || w.category === selectedCategoryFilter)
                .filter(w => w.title.toLowerCase().includes(searchQuery.toLowerCase()) || w.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((w) => (
                  <div
                    key={w.id}
                    className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                      w.visible
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`p-2 rounded-lg ${getAccentBg(w.accentColor)}`}>
                        {renderWidgetIcon(w.icon)}
                      </span>
                      <div>
                        <h4 className="font-bold text-xs text-white">{w.title}</h4>
                        <p className="text-[10px] text-gray-400">{w.subtitle}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleWidgetVisibility(w.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                        w.visible
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                          : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/30'
                      }`}
                    >
                      {w.visible ? (language === 'de' ? 'Entfernen' : 'Remove') : (language === 'de' ? 'Aktivieren' : 'Activate')}
                    </button>
                  </div>
                ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowAddWidgetModal(false)}
                className="px-5 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 rounded-xl font-mono text-xs font-bold uppercase transition"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN EXPANDED MODAL */}
      {expandedWidgetId && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col p-4 md:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40">
                <Maximize2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-display font-black text-xl text-white uppercase tracking-wider">
                  {widgets.find(w=>w.id===expandedWidgetId)?.title}
                </h2>
                <p className="text-xs text-gray-400">
                  {widgets.find(w=>w.id===expandedWidgetId)?.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={() => setExpandedWidgetId(null)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-mono text-xs font-bold uppercase transition flex items-center gap-2"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Schließen</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {renderWidgetContent(expandedWidgetId)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDashboardStudio;
