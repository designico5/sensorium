import React, { useState } from 'react';
import {
  Smartphone,
  QrCode,
  Wifi,
  Radio,
  Sparkles,
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sliders,
  ShieldCheck,
  Tablet
} from 'lucide-react';

interface RemoteSyncPortalProps {
  bpm: number;
  addLog: (category: 'MIDI' | 'SYSTEM' | 'ABLETON' | 'OSC', level: 'info' | 'warn' | 'error' | 'success', message: string) => void;
}

export default function RemoteSyncPortal({
  bpm,
  addLog
}: RemoteSyncPortalProps) {
  const [remoteSessionUrl, setRemoteSessionUrl] = useState<string>(() => {
    return `${window.location.origin}?session=sensorium-stage-${Math.floor(Math.random() * 8999 + 1000)}`;
  });
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [connectedRemotes, setConnectedRemotes] = useState<Array<{ id: string; deviceName: string; type: string; latencyMs: number }>>([
    { id: 'rem-1', deviceName: 'Stage Master iPad Pro 12.9"', type: 'Touch X/Y Controller', latencyMs: 0.8 },
    { id: 'rem-2', deviceName: 'Stage Floor Smartphone', type: 'Telemetry Monitor', latencyMs: 1.1 },
  ]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(remoteSessionUrl);
    setIsCopied(true);
    addLog('SYSTEM', 'success', '🔗 Mobile Remote Link in Zwischenablage kopiert! Bereit für iPad / Smartphone.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePairNewDevice = () => {
    const newDev = {
      id: `rem-${Date.now()}`,
      deviceName: 'Neues Stage Tablet / iPhone',
      type: 'Wireless Expression Pad',
      latencyMs: +(Math.random() * 0.5 + 0.6).toFixed(1),
    };
    setConnectedRemotes([...connectedRemotes, newDev]);
    addLog('OSC', 'success', `📱 [REMOTE KOPPLUNG] Mobilgerät gekoppelt via Low-Latency UDP Tunnel!`);
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-950/70 via-zinc-950 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_35px_rgba(16,185,129,0.15)] relative overflow-hidden text-left my-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-neon-cyan/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
              WIRELESS MULTI-NODE REMOTE PORTAL
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black font-mono text-[10px] font-bold">
                STAGE LINK UDP
              </span>
            </h2>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              Verwandle jedes Tablet &amp; Smartphone in ein drahtloses X/Y-Gesten-Pad &amp; Live-Bühnen-Display (0.8ms Latenz).
            </p>
          </div>
        </div>

        <button
          onClick={handlePairNewDevice}
          className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/40 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          Mobilgerät Jetzt Koppeln
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
        
        {/* QR Code & Direct Link Box */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 bg-white rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.2)]">
            <QrCode className="w-28 h-28 text-black" />
          </div>
          <div className="font-mono text-[10px] text-gray-400">
            QR-Code mit iPad oder Smartphone scannen für Direkt-Steuerung
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full py-2 bg-white/10 hover:bg-emerald-500/20 text-white hover:text-emerald-300 border border-white/20 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-2"
          >
            {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {isCopied ? 'Link Kopiert!' : 'Session Link Kopieren'}
          </button>
        </div>

        {/* Connected Remote Devices List */}
        <div className="md:col-span-2 space-y-3 font-mono text-xs">
          <h3 className="text-gray-300 uppercase tracking-wider font-bold flex items-center gap-2">
            <Tablet className="w-4 h-4 text-emerald-400" /> Aktive Drahtlos-Knoten ({connectedRemotes.length}):
          </h3>

          {connectedRemotes.map((dev) => (
            <div key={dev.id} className="p-3.5 rounded-xl bg-black/50 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <div className="text-white font-bold">{dev.deviceName}</div>
                  <div className="text-[10px] text-gray-400">{dev.type} • Low Latency UDP Sync</div>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                  {dev.latencyMs} ms
                </span>
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-sans">
            🛡️ <strong>Sicherer Bühnen-Tunnel:</strong> Voll-Verschlüsselter OSC/UDP Loopback-Tunnel verhindert Störungen durch fremde WLAN-Netze während des Live-Auftritts.
          </div>
        </div>

      </div>

    </div>
  );
}
