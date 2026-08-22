import React, { useState } from 'react';
import { Sliders, Plus, Zap, RefreshCw, Layers, Trash2, HelpCircle, Network, Eye, EyeOff } from 'lucide-react';
import Mindmap from './Mindmap';
import { MidiDevice } from '../types';

interface MappingItem {
  id: string;
  channel: number;
  type: string;
  num: number;
  name: string;
  target: string;
  value: number;
  learned: boolean;
}

interface MidiMappingViewProps {
  midiMappings: MappingItem[];
  onUpdateMappingValue: (id: string, val: number) => void;
  onAddMapping: (mapping: Omit<MappingItem, 'id' | 'learned'>) => void;
  onDeleteMapping: (id: string) => void;
  onResetMappings: () => void;
  isMidiLearning: string | null;
  onStartLearning: (id: string) => void;
  onStopLearning: (id: string, simulatedCC?: number) => void;
  devices: MidiDevice[];
  addLog: (source: any, level: any, msg: string) => void;
  glowStrength: number;
  bpm?: number;
  isPlaying?: boolean;
  activeSignals?: string[];
  onSelectDevice?: (device: MidiDevice) => void;
  selectedDeviceId?: string;
}

export default function MidiMappingView({
  midiMappings,
  onUpdateMappingValue,
  onAddMapping,
  onDeleteMapping,
  onResetMappings,
  isMidiLearning,
  onStartLearning,
  onStopLearning,
  devices,
  addLog,
  glowStrength,
  bpm = 128,
  isPlaying = true,
  activeSignals = [],
  onSelectDevice,
  selectedDeviceId,
}: MidiMappingViewProps) {
  // New mapping form state
  const [newChan, setNewChan] = useState<number>(1);
  const [newType, setNewType] = useState<string>('CC');
  const [newNum, setNewNum] = useState<number>(74);
  const [newName, setNewName] = useState<string>('Filter Resonance');
  const [newTarget, setNewTarget] = useState<string>(devices[0]?.id || 'dev-keys');
  const [showMindmap, setShowMindmap] = useState<boolean>(true);

  // Simulated MIDI controller twiddle helper
  const triggerSimulatedMidiMessage = (id: string) => {
    if (isMidiLearning !== id) return;
    const randomCC = Math.floor(Math.random() * 119) + 1;
    addLog('MIDI', 'success', `[MIDI LEARN] Signal empfangen! CC ${randomCC} auf Kanal 1 erfolgreich zugewiesen.`);
    onStopLearning(id, randomCC);
  };

  return (
    <div className="space-y-6 text-left" id="midi-mapping-workspace">
      {/* View Header */}
      <div className="rounded-2xl glass-panel border border-white/10 p-5 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg text-gray-100 uppercase tracking-wide flex items-center gap-2">
              <Sliders className="w-5 h-5 text-neon-magenta" /> MIDI Control Routing Matrix
            </h2>
            <p className="font-sans text-xs text-gray-400">
              Mappe eingehende physikalische MIDI CC Controller &amp; Key-Notes auf virtuelle Parameter der Sensorium Engine und Ableton Live 12 Spuren.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMindmap(!showMindmap)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 font-mono text-[10px] uppercase rounded-lg border border-white/10 transition flex items-center gap-1.5"
            >
              {showMindmap ? <EyeOff className="w-3.5 h-3.5 text-neon-red" /> : <Eye className="w-3.5 h-3.5 text-neon-cyan" />}
              {showMindmap ? 'Mindmap Ausblenden' : 'Mindmap Einblenden'}
            </button>
            <button
              onClick={onResetMappings}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[10px] uppercase rounded-lg border border-white/5 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Standard zurücksetzen
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Live Mindmap Topo Canvas */}
      {showMindmap && (
        <div className="rounded-2xl glass-panel border border-white/10 bg-black/40 p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-neon-cyan animate-pulse" />
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-200">
                Echtzeit Signal-Mindmap &amp; Knoten-Topologie
              </h3>
            </div>
            <span className="font-mono text-[9px] text-gray-400">
              Signalfluss aller {devices.length} verbundenen Geräte
            </span>
          </div>
          <div className="h-[320px] rounded-xl overflow-hidden border border-white/5 bg-black/60 relative">
            <Mindmap
              devices={devices}
              onSelectDevice={onSelectDevice || (() => {})}
              selectedDeviceId={selectedDeviceId}
              bpm={bpm}
              isPlaying={isPlaying}
              activeSignals={activeSignals}
              addLog={addLog}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Mapping Bindings Table */}
        <div className="lg:col-span-7 rounded-2xl glass-panel border border-white/5 p-5 bg-black/30 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-neon-magenta" /> Aktive Routing Zuweisungen
            </h3>
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-neon-magenta/10 border border-neon-magenta/20 text-neon-magenta font-bold">
              {midiMappings.length} ZUWEISUNGEN REGISTRIERT
            </span>
          </div>

          {/* Bindings List */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {midiMappings.map((item) => {
              const device = devices.find((d) => d.id === item.target);
              const isLearningThis = isMidiLearning === item.id;
              
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLearningThis
                      ? 'bg-neon-magenta/10 border-neon-magenta animate-pulse shadow-[0_0_15px_rgba(255,0,127,0.15)]'
                      : 'bg-black/40 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-bold text-xs text-gray-100">
                        {item.name}
                      </span>
                      <span className="font-mono text-[8px] px-1.5 py-0.2 rounded bg-white/5 border border-white/5 text-gray-400">
                        {device ? device.name : item.target}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-gray-400">
                      <span>CH: <span className="text-neon-cyan font-bold">{item.channel}</span></span>
                      <span>Typ: <span className="text-neon-magenta font-bold">{item.type}</span></span>
                      <span>Num: <span className="text-neon-green font-bold">{item.num}</span></span>
                      <span>Aktueller Wert: <span className="text-gray-200 font-bold">{item.value}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isLearningThis ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => triggerSimulatedMidiMessage(item.id)}
                          className="px-2.5 py-1 bg-neon-green text-black font-mono text-[9px] font-bold rounded hover:bg-neon-green/90 transition shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-bounce"
                          title="Simuliert ein Drehen am physikalischen Regler"
                        >
                          Regler drehen (Simuliert)
                        </button>
                        <button
                          onClick={() => onStopLearning(item.id)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/15 text-gray-300 font-mono text-[9px] rounded transition"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onStartLearning(item.id)}
                        className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold uppercase transition flex items-center gap-1 ${
                          item.learned
                            ? 'bg-neon-magenta/10 border border-neon-magenta/30 text-neon-magenta hover:bg-neon-magenta/15'
                            : 'bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                      >
                        <Zap className="w-3 h-3 text-neon-magenta" /> {item.learned ? 'Mapped: Learn' : 'MIDI Learn'}
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteMapping(item.id)}
                      className="p-1 text-gray-500 hover:text-neon-red hover:bg-white/5 rounded transition"
                      title="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Mapping Form */}
          <div className="bg-black/50 p-4 rounded-xl border border-white/5 space-y-4">
            <div className="text-[10px] font-mono text-neon-cyan uppercase tracking-wider font-bold">
              Neue MIDI-Zuweisung anlegen
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-mono text-gray-400 block uppercase">Parameter Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-mono text-gray-400 block uppercase">Kanal (1-16)</label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={newChan}
                  onChange={(e) => setNewChan(Math.min(16, Math.max(1, Number(e.target.value))))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-mono text-gray-400 block uppercase">Sende-Typ</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none"
                >
                  <option value="CC">Control Change (CC)</option>
                  <option value="Note">Note Trigger</option>
                  <option value="Pitchbend">Pitchbend</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-mono text-gray-400 block uppercase">CC / Note #</label>
                <input
                  type="number"
                  min="0"
                  max="127"
                  value={newNum}
                  onChange={(e) => setNewNum(Math.min(127, Math.max(0, Number(e.target.value))))}
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-[8px] font-mono text-gray-400 block uppercase">Ziel-Gerät</label>
                <select
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none"
                >
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                onAddMapping({
                  channel: newChan,
                  type: newType,
                  num: newNum,
                  name: newName,
                  target: newTarget,
                  value: 64,
                });
                addLog('MIDI', 'success', `[MIDI CONFIG] Neue Zuweisung hinzugefügt: "${newName}" auf CC #${newNum}.`);
              }}
              className="w-full py-2 bg-neon-magenta text-white font-display font-bold text-xs uppercase tracking-wide rounded-lg hover:bg-neon-magenta/90 transition shadow-[0_0_12px_rgba(255,0,127,0.2)] flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Zuweisung Registrieren
            </button>
          </div>
        </div>

        {/* Right Panel: MIDI Knobs & Fader Playground */}
        <div className="lg:col-span-5 rounded-2xl glass-panel border border-white/5 p-5 bg-black/30 flex flex-col justify-between space-y-5">
          <div className="space-y-1 border-b border-white/5 pb-3">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-neon-cyan animate-pulse" /> Virtual MIDI Controller Board
            </h3>
            <p className="text-[10px] text-gray-400 font-sans">
              Interaktive Regler zur Echtzeit-Modulation. Bewege die Fader, um simulierte Outbound MIDI OSC Pakete an Ableton zu übertragen.
            </p>
          </div>

          {/* Virtual Channel Strips Rack */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4 flex-grow my-auto">
            {midiMappings.map((map) => (
              <div key={map.id} className="bg-black/50 p-3.5 rounded-2xl border border-white/5 hover:border-neon-cyan/20 transition-all duration-300 space-y-3 relative overflow-hidden flex flex-col justify-between">
                {/* Micro LED level stack */}
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[8px] text-neon-cyan uppercase">CC {map.num}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const isActive = (map.value / 127) * 6 > i;
                      return (
                        <span
                          key={i}
                          className={`w-1.5 h-1 rounded-sm transition-colors duration-100 ${
                            isActive
                              ? i > 4
                                ? 'bg-neon-red'
                                : i > 3
                                ? 'bg-neon-yellow'
                                : 'bg-neon-green'
                              : 'bg-white/5'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Slider Wrapper */}
                <div className="h-28 flex justify-center items-center py-2 bg-black/40 rounded-xl border border-white/[0.03]">
                  <input
                    type="range"
                    min="0"
                    max="127"
                    value={map.value}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateMappingValue(map.id, val);
                      if (Math.abs(val - map.value) > 4) {
                        addLog('MIDI', 'info', `[MIDI REG] Mapped Control "${map.name}" CC#${map.num} value updated: ${val}`);
                      }
                    }}
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    className="h-24 cursor-pointer accent-neon-magenta bg-white/5 rounded-lg w-1.5"
                  />
                </div>

                <div className="space-y-1 text-center">
                  <div className="font-sans font-bold text-[10px] text-gray-200 truncate" title={map.name}>
                    {map.name}
                  </div>
                  <div className="font-mono text-[11px] font-extrabold text-neon-magenta">
                    {map.value} <span className="text-[8px] font-medium text-gray-500">/ 127</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-neon-cyan/5 border border-neon-cyan/10 flex items-start gap-2 text-left">
            <HelpCircle className="w-3.5 h-3.5 text-neon-cyan shrink-0 mt-0.5" />
            <p className="text-[9px] font-sans text-gray-400 leading-normal">
              <strong>MIDI-Learn-Modus:</strong> Klicke auf "MIDI Learn" bei einer Zuweisung, bewege ein Steuerelement an Deinem physikalischen Synthesizer. Die Software lauscht im Hintergrund auf OSC UDP Handshakes auf Port 5125 und nimmt Zuweisungen latenzfrei vor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
