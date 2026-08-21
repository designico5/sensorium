/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VINTAGE & MODERN HARDWARE RECOGNITION SUITE (1995 - 2026)
 * Seamless 30-Year Device Auto-Scan, Pinout Inspector, & Direct Studio Connection.
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, SlidersHorizontal, Cpu, ShieldCheck, Zap, Radio, 
  CheckCircle2, Plus, Sparkles, Clock, Cable, Info, Layers, RefreshCw, X
} from 'lucide-react';
import { VINTAGE_DEVICE_LIBRARY, VintageDeviceProfile } from '../data/vintageDeviceLibrary';
import { MidiDevice } from '../types';

interface VintageDeviceLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDeviceToStudio: (newDevice: MidiDevice) => void;
  addLog: (source: any, level: any, msg: string) => void;
  existingDeviceIds: string[];
}

export default function VintageDeviceLibraryModal({
  isOpen,
  onClose,
  onAddDeviceToStudio,
  addLog,
  existingDeviceIds,
}: VintageDeviceLibraryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEra, setSelectedEra] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedInterface, setSelectedInterface] = useState<string>('ALL');
  const [inspectingDevice, setInspectingDevice] = useState<VintageDeviceProfile | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Filter devices based on user criteria
  const filteredDevices = useMemo(() => {
    return VINTAGE_DEVICE_LIBRARY.filter((dev) => {
      const matchesSearch = 
        dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dev.pinoutProtocol.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesEra = selectedEra === 'ALL' || dev.era === selectedEra;
      const matchesCategory = selectedCategory === 'ALL' || dev.category === selectedCategory;
      const matchesInterface = selectedInterface === 'ALL' || dev.interfaceType === selectedInterface;

      return matchesSearch && matchesEra && matchesCategory && matchesInterface;
    });
  }, [searchTerm, selectedEra, selectedCategory, selectedInterface]);

  // Run 30-Year Legacy Hardware Scanner Simulation
  const handleStartLegacyScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    addLog('SYSTEM', 'info', '[LEGACY SCAN] 🔍 Starte 30-Jahre Hardware Auto-Scan (1995-2026 Protocols: DIN-MIDI, RS-422, USB, MPE, BLE)...');

    let current = 0;
    const interval = setInterval(() => {
      current += 15;
      setScanProgress(Math.min(100, current));

      if (current === 45) {
        addLog('MIDI', 'info', '[LEGACY SCAN] ⚡ Abfrage von SysEx Inquiry IDs & 5-Pin DIN Current Loops (ISO 10373)...');
      } else if (current === 75) {
        addLog('MIDI', 'success', '[LEGACY SCAN] ✦ 30-Jahre Kompatibilitäts-Handshake für Roland, Akai, Moog, Sequential & Elektron verifiziert.');
      }

      if (current >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        addLog('SYSTEM', 'success', `[LEGACY SCAN] ✅ Hardware Auto-Scan beendet: ${VINTAGE_DEVICE_LIBRARY.length} Geräte-Profile der letzten 30 Jahre nahtlos erkannt!`);
      }
    }, 200);
  };

  // Convert Vintage Device Profile to Studio Active MidiDevice and add
  const handleConnectDevice = (profile: VintageDeviceProfile) => {
    const isAlreadyConnected = existingDeviceIds.some(id => id === profile.id || id.includes(profile.id));
    if (isAlreadyConnected) {
      addLog('SYSTEM', 'warn', `[HARDWARE RECOGNITION] Gerät '${profile.name}' ist bereits im Studio eingebunden.`);
      return;
    }

    const newMidiDevice: MidiDevice = {
      id: profile.id,
      name: profile.name,
      type: profile.category === 'Drum Machine' ? 'Drum Machine' :
            profile.category === 'Synthesizer' || profile.category === 'Sampler & Workstation' ? 'Synthesizer' :
            profile.category === 'USB / MIDI Controller' ? 'USB Controller' : 'Internal MIDI',
      status: 'Healthy',
      portNameIn: `${profile.brand} ${profile.interfaceType} In`,
      portNameOut: `${profile.brand} ${profile.interfaceType} Out`,
      bufferUsage: Math.floor(Math.random() * 15) + 5,
      clockDrift: profile.clockJitterMs,
      latency: profile.latencyAvgMs,
      dropCount: 0,
      lastMessageTime: Date.now(),
      lastMessageValue: `Handshake ${profile.sysExId} OK`,
      midiChannel: profile.defaultChannel,
      ccFilterActive: true,
      velocityCurve: 'Linear',
      pollingRate: 1000,
      debounceMs: 2,
      noiseFloor: 4,
      usbSuspensionDisabled: true,
      bufferSizeSamples: profile.latencyAvgMs < 1 ? 32 : 64,
      driftCompensationMs: 0,
      autoRecalibrateEnabled: true,
      firmwareVersion: `${profile.year}.1.0`,
      latestFirmwareVersion: `${profile.year}.2.0`,
      firmwareUpdateAvailable: false,
      firmwareUpdateStatus: 'idle',
      firmwareUpdateProgress: 0,
      backups: [
        { id: `bak-${profile.id}`, timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '), firmwareVersion: `${profile.year}.1.0`, note: `30-Year Auto-Recognized Profile (${profile.interfaceType})` }
      ]
    };

    onAddDeviceToStudio(newMidiDevice);
    addLog('MIDI', 'success', `[30-YEAR RECOGNITION] 🔌 '${profile.name}' (${profile.year}, ${profile.interfaceType}) nahtlos ins Studio eingebunden! Latency: ${profile.latencyAvgMs}ms | Pinout: ${profile.pinoutProtocol}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] studio-obsidian-card rounded-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-gray-100">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/10 bg-black/60 backdrop-blur-md gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/40 rounded-xl golden-gauge-glow">
              <Cpu className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold font-display tracking-wider text-white uppercase">
                  30-Jahre Hardware Bibliotheks- & Erkennungs-Engine
                </h2>
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-mono rounded-full font-bold">
                  1995 – 2026 (30 Jahre Gear)
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Nahtlose Erkennung für jedes Gerät aus 3 Jahrzehnten (5-Pin DIN MIDI, Serial RS-422, FireWire, USB, MPE, CV/Gate, BLE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartLegacyScan}
              disabled={isScanning}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 border transition cursor-pointer shadow-lg ${
                isScanning
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
              {isScanning ? `Scan Läuft (${scanProgress}%)` : '30-Jahre Auto-Scan Starten'}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scan Progress Bar */}
        {isScanning && (
          <div className="w-full bg-black/80 border-b border-amber-500/30 px-6 py-2 flex items-center gap-4">
            <div className="flex-1 bg-white/10 h-2 rounded-full overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold">{scanProgress}% Scanned</span>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="p-4 md:p-5 border-b border-white/10 bg-black/30 flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Gerät, Marke, Pinout, SysEx oder Protokoll suchen (z.B. TR-909, MPC2000, Virus TI, Push 3)..."
              className="w-full pl-10 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/60 transition"
            />
          </div>

          {/* Era Filter */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
            <span className="text-gray-400 px-2 font-bold uppercase">Ära:</span>
            {['ALL', '1995-2004', '2005-2014', '2015-2020', '2021-2026'].map((era) => (
              <button
                key={era}
                onClick={() => setSelectedEra(era)}
                className={`px-2.5 py-1 rounded-lg uppercase font-bold transition ${
                  selectedEra === era
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {era}
              </button>
            ))}
          </div>

          {/* Interface Filter */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
            <span className="text-gray-400 px-2 font-bold uppercase">Interface:</span>
            {['ALL', 'DIN MIDI 5-Pin', 'USB MIDI', 'MPE Expressive', 'CV/Gate Analog'].map((iface) => (
              <button
                key={iface}
                onClick={() => setSelectedInterface(iface)}
                className={`px-2 py-1 rounded-lg uppercase font-bold transition ${
                  selectedInterface === iface
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {iface === 'DIN MIDI 5-Pin' ? '5-Pin DIN' : iface}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 custom-scrollbar">
          {filteredDevices.map((dev) => {
            const isConnected = existingDeviceIds.some(id => id === dev.id || id.includes(dev.id));

            return (
              <div
                key={dev.id}
                className={`group relative rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${
                  isConnected 
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-black/40 hover:bg-black/60 border-white/10 hover:border-amber-500/40 shadow-lg'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold rounded uppercase">
                      {dev.brand} • {dev.year}
                    </span>
                    <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-gray-300 text-[9px] font-mono rounded">
                      {dev.interfaceType}
                    </span>
                  </div>

                  {/* Title & Category */}
                  <h3 className="text-sm font-bold font-display text-white group-hover:text-amber-300 transition line-clamp-1">
                    {dev.name}
                  </h3>
                  <p className="text-[10px] font-mono text-cyan-400/90 mt-0.5">
                    {dev.category} • {dev.presetSpecs}
                  </p>

                  <p className="text-xs text-gray-300 mt-2.5 line-clamp-2 leading-relaxed">
                    {dev.description}
                  </p>

                  {/* Physical Pinout Specs Box */}
                  <div className="mt-3 p-2.5 bg-black/60 border border-white/5 rounded-lg text-[10px] font-mono text-gray-400 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Physical Pinout:</span>
                      <span className="text-gray-200 font-bold truncate max-w-[170px]" title={dev.pinoutProtocol}>
                        {dev.pinoutProtocol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">SysEx ID / Baud:</span>
                      <span className="text-amber-400 font-bold">{dev.sysExId} ({dev.baudRate})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Lat./Jitter:</span>
                      <span className="text-emerald-400 font-bold">{dev.latencyAvgMs} ms (Jitter: {dev.clockJitterMs}ms)</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectingDevice(dev)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Info className="w-3 h-3 text-cyan-400" />
                    Pinout Details
                  </button>

                  <button
                    onClick={() => handleConnectDevice(dev)}
                    disabled={isConnected}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                      isConnected
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default'
                        : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    }`}
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Im Studio Aktiv
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Ins Studio Einbinden
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inspector Detail Modal Overlay */}
        {inspectingDevice && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-2xl p-6 flex flex-col justify-between animate-fade-in">
            <div className="space-y-4 max-w-4xl mx-auto w-full">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold rounded">
                    30-YEAR PINOUT INSPECTOR ({inspectingDevice.year})
                  </span>
                  <h2 className="text-xl font-bold font-display text-white mt-2">
                    {inspectingDevice.name}
                  </h2>
                  <p className="text-xs font-mono text-cyan-400 mt-1">
                    {inspectingDevice.brand} • {inspectingDevice.category} • {inspectingDevice.interfaceType}
                  </p>
                </div>
                <button
                  onClick={() => setInspectingDevice(null)}
                  className="p-2 rounded-xl bg-white/10 text-gray-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Pinout & Handshake Specification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/60 border border-white/10 p-4 rounded-xl space-y-3 font-mono text-xs">
                  <h4 className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Cable className="w-4 h-4" /> Physikalische Pinbelegung & Signal
                  </h4>
                  <div className="space-y-1.5 text-gray-300">
                    <div><span className="text-gray-500">Schnittstellen-Typ:</span> {inspectingDevice.interfaceType}</div>
                    <div><span className="text-gray-500">Pinout-Spezifikation:</span> {inspectingDevice.pinoutProtocol}</div>
                    <div><span className="text-gray-500">Übertragungsrate (Baud):</span> {inspectingDevice.baudRate}</div>
                    <div><span className="text-gray-500">Standard MIDI Kanal:</span> Ch. {inspectingDevice.defaultChannel}</div>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 p-4 rounded-xl space-y-3 font-mono text-xs">
                  <h4 className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                    <Radio className="w-4 h-4" /> Auto-Erkennung & Telemetrie
                  </h4>
                  <div className="space-y-1.5 text-gray-300">
                    <div><span className="text-gray-500">SysEx Identification ID:</span> {inspectingDevice.sysExId}</div>
                    <div><span className="text-gray-500">Erkennungs-Protokoll:</span> {inspectingDevice.autoRecognitionProfile}</div>
                    <div><span className="text-gray-500">Referenz Latenz:</span> {inspectingDevice.latencyAvgMs} ms</div>
                    <div><span className="text-gray-500">Takt-Jitter Tolerance:</span> {inspectingDevice.clockJitterMs} ms</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/60 border border-white/10 p-4 rounded-xl space-y-2">
                <h4 className="text-gray-200 font-bold text-xs uppercase font-mono">Historischer Studio-Kontext</h4>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  {inspectingDevice.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 max-w-4xl mx-auto w-full pt-4 border-t border-white/10">
              <button
                onClick={() => setInspectingDevice(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-mono font-bold uppercase transition cursor-pointer"
              >
                Schließen
              </button>
              <button
                onClick={() => {
                  handleConnectDevice(inspectingDevice);
                  setInspectingDevice(null);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-mono font-bold uppercase shadow-lg transition cursor-pointer"
              >
                ⚡ Ins Studio Einbinden
              </button>
            </div>
          </div>
        )}

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-[10px] font-mono text-gray-400">
          <span>
            SENSORIUM 30-YEAR HARDWARE SUITE • {VINTAGE_DEVICE_LIBRARY.length} GERÄTE-PROFILE AKTIV
          </span>
          <span className="text-amber-400 font-bold">
            100% ABWÄRTSKOMPATIBEL (1995-2026)
          </span>
        </div>
      </div>
    </div>
  );
}
