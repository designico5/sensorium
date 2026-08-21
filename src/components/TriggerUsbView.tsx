import React, { useState, useEffect, useRef } from 'react';
import { Usb, Zap, Sliders, Battery, Power, RefreshCw, Layers } from 'lucide-react';

interface TriggerUsbViewProps {
  pollingRate: '125' | '250' | '500' | '1000';
  onPollingRateChange: (rate: '125' | '250' | '500' | '1000') => void;
  voltageSim: number;
  onVoltageSimChange: (volts: number) => void;
  threshold: number;
  onThresholdChange: (val: number) => void;
  crosstalk: number;
  onCrosstalkChange: (val: number) => void;
  powerSavingBlocked: boolean;
  onPowerSavingBlockedChange: (blocked: boolean) => void;
  addLog: (source: any, level: any, msg: string) => void;
  devices: any[];
}

interface Packet {
  id: string;
  time: string;
  port: number;
  device: string;
  bytes: number;
  data: string;
}

export default function TriggerUsbView({
  pollingRate,
  onPollingRateChange,
  voltageSim,
  onVoltageSimChange,
  threshold,
  onThresholdChange,
  crosstalk,
  onCrosstalkChange,
  powerSavingBlocked,
  onPowerSavingBlockedChange,
  addLog,
  devices,
}: TriggerUsbViewProps) {
  const [vbusLoaded, setVbusLoaded] = useState(false);
  const [drumRipples, setDrumRipples] = useState<Record<string, boolean>>({});
  const [packets, setPackets] = useState<Packet[]>([]);
  const packetIdRef = useRef(0);

  // Generate real-time USB packets streaming
  useEffect(() => {
    const intervalMs = pollingRate === '1000' ? 600 : pollingRate === '500' ? 1200 : pollingRate === '250' ? 2400 : 4000;
    
    const timer = setInterval(() => {
      const activeDevices = devices.filter((d) => d.status === 'Healthy');
      if (activeDevices.length === 0) return;

      const randomDev = activeDevices[Math.floor(Math.random() * activeDevices.length)];
      const date = new Date();
      const timeStr = `${date.toTimeString().split(' ')[0]}.${String(date.getMilliseconds()).padStart(3, '0')}`;
      
      const byteSize = Math.floor(Math.random() * 8) + 4;
      const ccNum = Math.floor(Math.random() * 127);
      const valNum = Math.floor(Math.random() * 127);
      
      packetIdRef.current += 1;
      const newPacket: Packet = {
        id: `p-${packetIdRef.current}`,
        time: timeStr,
        port: randomDev.id === 'dev-drum' ? 3 : randomDev.id === 'dev-keys' ? 1 : randomDev.id === 'dev-launchpad' ? 2 : 4,
        device: randomDev.name.substring(0, 12),
        bytes: byteSize,
        data: `0x90 ${ccNum.toString(16).toUpperCase()} ${valNum.toString(16).toUpperCase()}`,
      };

      setPackets((prev) => [newPacket, ...prev].slice(0, 15));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [devices, pollingRate]);

  // Load VBUS simulation effect
  useEffect(() => {
    if (vbusLoaded) {
      // Simulate voltage drop
      const drop = 4.62 + Math.random() * 0.15;
      onVoltageSimChange(parseFloat(drop.toFixed(2)));
      addLog('SYSTEM', 'warn', `[USB HEAVY LOAD] VBUS Spannungseinbruch auf USB-Schnittstelle: ${drop.toFixed(2)}V. Signal-Fehlerrate kann ansteigen!`);
    } else {
      const stable = 5.01 + Math.random() * 0.04;
      onVoltageSimChange(parseFloat(stable.toFixed(2)));
    }
  }, [vbusLoaded]);

  // Trigger pad click
  const handleTriggerPad = (padId: string) => {
    // 1. Check if trigger threshold is crossed. If threshold is 100, soft clicks might fail.
    // Let's calculate crosstalk. If crosstalk cancellation is low, adjacent pads also ripple.
    setDrumRipples((prev) => ({ ...prev, [padId]: true }));
    setTimeout(() => {
      setDrumRipples((prev) => ({ ...prev, [padId]: false }));
    }, 400);

    const padName = padId === 'kick' ? 'Bass Drum Piezo' : padId === 'snare' ? 'Snare Mesh Pad' : padId === 'hihat' ? 'HiHat Control Pedal' : 'Crash cymbal';
    addLog('MIDI', 'success', `[USB TRIGGER] Pad '${padName}' ausgelöst (Geschwindigkeit: 110). Latenz: 0.9ms.`);

    // If crosstalk cancel is too low (<40), trigger adjacent pad softly
    if (crosstalk < 40) {
      let adjacentId = '';
      if (padId === 'kick') adjacentId = 'snare';
      else if (padId === 'snare') adjacentId = 'hihat';
      else if (padId === 'hihat') adjacentId = 'crash';
      else adjacentId = 'snare';

      if (adjacentId) {
        setTimeout(() => {
          setDrumRipples((prev) => ({ ...prev, [adjacentId]: true }));
          addLog('MIDI', 'warn', `[CROSSTALK BLEED] Übersprechen (Bleed) auf '${adjacentId}' erkannt! Erhöhe die Crosstalk-Unterdrückung.`);
          setTimeout(() => {
            setDrumRipples((prev) => ({ ...prev, [adjacentId]: false }));
          }, 400);
        }, 80);
      }
    }
  };

  return (
    <div className="space-y-6 text-left" id="trigger-usb-workspace">
      {/* Header */}
      <div className="rounded-2xl glass-panel border border-white/10 p-5 bg-black/40 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg text-gray-100 uppercase tracking-wide flex items-center gap-2">
              <Usb className="w-5 h-5 text-neon-cyan" /> Trigger &amp; USB Bus Diagnostik
            </h2>
            <p className="font-sans text-xs text-gray-400">
              Kalibriere die Triggersensitivität von Piezo-E-Drums, reguliere die USB Polling Rate und blockiere Windows Energiesparpläne zur Latenz-Optimierung.
            </p>
          </div>
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan font-bold tracking-wider">
            KERNEL INTERRUPT POLLING ACTIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: USB Host diagnostics */}
        <div className="lg:col-span-6 rounded-2xl glass-panel border border-white/5 p-5 bg-black/30 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-200 flex items-center gap-1.5">
                <Power className="w-4 h-4 text-neon-cyan" /> USB Bus Energie &amp; Taktrate
              </h3>
            </div>

            {/* Polling rate select */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Windows USB Polling Intervall (Kernel Driver)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { rate: '125', text: '125 Hz (8ms)', desc: 'Standard' },
                  { rate: '250', text: '250 Hz (4ms)', desc: 'Mittel' },
                  { rate: '500', text: '500 Hz (2ms)', desc: 'Pro' },
                  { rate: '1000', text: '1000 Hz (1ms)', desc: 'Ultrafast' },
                ] as const).map((item) => {
                  const isSelected = pollingRate === item.rate;
                  return (
                    <button
                      key={item.rate}
                      onClick={() => {
                        onPollingRateChange(item.rate);
                        addLog('SYSTEM', 'info', `[USB DRIVER] Polling-Frequenz auf ${item.text} angepasst. Latenz-Jitter neu berechnet.`);
                      }}
                      className={`p-2 rounded-xl border text-center transition ${
                        isSelected
                          ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan font-bold shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                          : 'bg-black/40 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <div className="text-[10px]">{item.rate}Hz</div>
                      <div className="text-[7px] font-mono opacity-80 mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* VBUS Voltage Gauge */}
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase">USB VBUS Port-Spannung (Simuliert)</span>
                <span className={`font-mono text-xs font-bold ${voltageSim < 4.8 ? 'text-neon-red animate-pulse' : 'text-neon-green'}`}>
                  {voltageSim.toFixed(2)} V
                </span>
              </div>
              
              <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    voltageSim < 4.8
                      ? 'bg-neon-red shadow-[0_0_8px_rgba(255,49,49,0.5)]'
                      : 'bg-neon-green shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  }`}
                  style={{ width: `${Math.min(100, (voltageSim / 5.5) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-1.5">
                <span className="text-[8px] font-sans text-gray-500 italic">
                  Grenzbereich: 4.75V für stabile DSP Audio-Schnittstellen.
                </span>
                <button
                  onClick={() => setVbusLoaded(!vbusLoaded)}
                  className={`px-2.5 py-1 rounded text-[9px] font-mono uppercase tracking-wide transition border ${
                    vbusLoaded
                      ? 'bg-neon-red/10 border-neon-red/30 text-neon-red font-bold animate-pulse'
                      : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {vbusLoaded ? 'Stoppe Bus-Last' : 'Simuliere Bus-Last'}
                </button>
              </div>
            </div>

            {/* Block power saving */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono text-gray-200 uppercase tracking-wide">
                  USB Selective Suspend Blockieren
                </div>
                <div className="text-[8px] font-sans text-gray-400 leading-tight">
                  Verhindert den Energiespar-Ruhezustand von Windows USB Root-Hubs.
                </div>
              </div>
              <button
                onClick={() => {
                  onPowerSavingBlockedChange(!powerSavingBlocked);
                  addLog('SYSTEM', 'info', `[POWER OPTIMIZER] Selective Suspend ist nun ${!powerSavingBlocked ? 'BLOCKIERT (Latenz-Sicher)' : 'VOM OS GESTEUERT (Stromsparmodus)'}.`);
                }}
                className={`px-3 py-1 text-[9px] font-mono uppercase rounded transition border ${
                  powerSavingBlocked
                    ? 'bg-neon-green/10 border-neon-green/30 text-neon-green font-bold shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                    : 'bg-white/5 border-white/5 text-gray-400'
                }`}
              >
                {powerSavingBlocked ? 'Aktiv (Empfohlen)' : 'Deaktiviert'}
              </button>
            </div>
          </div>

          {/* Real-time packet scrolling log */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <div className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">
              Real-time USB Interrupt Buffer Stream (INTR Endpoint)
            </div>
            <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[9px] h-32 overflow-y-auto space-y-1 scrollbar-thin text-left">
              {packets.length === 0 ? (
                <div className="text-gray-600 text-center py-8">Lade USB-Schnittstellen Datenströme...</div>
              ) : (
                packets.map((p) => (
                  <div key={p.id} className="flex justify-between hover:bg-white/[0.02] py-0.5 px-1 rounded transition">
                    <span className="text-gray-500">{p.time}</span>
                    <span className="text-neon-cyan font-bold">PORT {p.port}</span>
                    <span className="text-gray-300 truncate w-20">{p.device}</span>
                    <span className="text-neon-magenta">{p.bytes}B</span>
                    <span className="text-neon-green">{p.data}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Piezo Drum Trigger Settings and Pad Playground */}
        <div className="lg:col-span-6 rounded-2xl glass-panel border border-white/5 p-5 bg-black/30 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-neon-magenta animate-pulse" /> E-Drum Piezo Trigger Kalibrierung
            </h3>
          </div>

          {/* Slider controls */}
          <div className="space-y-4">
            {/* Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-400 uppercase">Trigger Schwellwert (Threshold):</span>
                <span className="text-neon-cyan font-bold">{threshold} dB</span>
              </div>
              <input
                type="range"
                min="5"
                max="85"
                value={threshold}
                onChange={(e) => onThresholdChange(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
              />
              <p className="text-[8px] font-sans text-gray-500 leading-normal">
                Verhindert Geister-Triggern durch Umgebungsgeräusche oder Bühnen-Vibrationen. Höherer Wert filtert leisere Anschläge heraus.
              </p>
            </div>

            {/* Crosstalk Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-gray-400 uppercase">Crosstalk (Übersprechungs) Unterdrückung:</span>
                <span className="text-neon-magenta font-bold">{crosstalk} ms</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={crosstalk}
                onChange={(e) => onCrosstalkChange(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-magenta"
              />
              <p className="text-[8px] font-sans text-gray-500 leading-normal">
                Verhindert das versehentliche Mit-Triggern von Nachbar-Pads auf dem gleichen Rack bei harten Schlägen. {crosstalk < 40 && <span className="text-neon-yellow font-semibold">Aktuell geringe Dämpfung!</span>}
              </p>
            </div>
          </div>

          {/* Drum pad playground */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
              Drum Pad Triggers - Testbereich (Klicke zum Anschlagen)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'kick', name: 'KICK DRUM', color: 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan/5' },
                { id: 'snare', name: 'SNARE MESH', color: 'border-neon-magenta text-neon-magenta hover:bg-neon-magenta/5' },
                { id: 'hihat', name: 'HI-HAT CYMBAL', color: 'border-neon-yellow text-neon-yellow hover:bg-neon-yellow/5' },
                { id: 'crash', name: 'CRASH TRIGGER', color: 'border-neon-green text-neon-green hover:bg-neon-green/5' },
              ] as const).map((pad) => {
                const isActive = drumRipples[pad.id];
                return (
                  <button
                    key={pad.id}
                    onClick={() => handleTriggerPad(pad.id)}
                    className={`py-6 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-100 relative overflow-hidden ${pad.color} ${
                      isActive
                        ? 'scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)] bg-white/10'
                        : 'bg-black/30'
                    }`}
                  >
                    {/* Ring expansion effect */}
                    {isActive && (
                      <span className="absolute inset-0 rounded-2xl border border-white animate-ping opacity-60" />
                    )}
                    <span className="text-[10px] font-display font-extrabold tracking-wider">{pad.name}</span>
                    <span className="font-mono text-[8px] opacity-75">
                      {pad.id === 'kick' ? 'PORT 3' : pad.id === 'snare' ? 'PORT 1' : pad.id === 'hihat' ? 'PORT 2' : 'PORT 4'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
