import React from 'react';
import {
  Activity,
  Cable,
  CircleAlert,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  Square,
  Usb,
} from 'lucide-react';
import type { MidiDevice } from '../types';

interface StageReadinessViewProps {
  devices: MidiDevice[];
  webMidiStatus: {
    active: boolean;
    count: number;
    info: string;
  };
  isScanning: boolean;
  isCalibrating: boolean;
  onScan: () => void | Promise<void>;
  onCalibrate: () => void | Promise<void>;
  onSafeStop: () => void;
  onStartDemo: () => void;
}

const connectionLabel = (device: MidiDevice) => {
  if (device.connectionType === 'OS_MIDI_ENDPOINT') return 'OS MIDI-Endpunkt';
  if (device.connectionType === 'PHYSICAL_USB') return 'USB / OS MIDI';
  if (device.connectionType === 'VIRTUAL_SIMULATION') return 'Virtuelle Simulation';
  return 'Unbekannte Verbindung';
};

export default function StageReadinessView({
  devices,
  webMidiStatus,
  isScanning,
  isCalibrating,
  onScan,
  onCalibrate,
  onSafeStop,
  onStartDemo,
}: StageReadinessViewProps) {
  const stageEndpoints = devices.filter(
    (device) => device.operationalMode === 'STAGE',
  );
  const observedEndpoints = stageEndpoints.filter((device) => device.telemetryVerified);

  return (
    <section className="w-full max-w-7xl mx-auto space-y-5" aria-labelledby="stage-readiness-title">
      <div className="rounded-2xl border border-emerald-400/30 bg-black/70 p-5 sm:p-6 shadow-[0_0_28px_rgba(16,185,129,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl text-left">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/10 px-3 font-mono text-[10px] font-black uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Stage-Modus · read-only
              </span>
              <span className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-white/5 px-3 font-mono text-[10px] font-bold uppercase text-gray-300">
                Keine synthetischen Messwerte
              </span>
            </div>
            <h1 id="stage-readiness-title" className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              OS-Endpunkte. Beobachtete Ereignisse. Keine Simulation.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300">
              In dieser Ansicht werden ausschließlich vom Betriebssystem gemeldete MIDI-Endpunkte gezeigt.
              Unbestätigte Ports bleiben auf „Prüfung offen“; Sensorium sendet hier keine Testnoten,
              Firmware-Pakete oder virtuellen Routing-Befehle an Hardware.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartDemo}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/60 bg-amber-400 px-5 font-display text-xs font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(251,191,36,0.22)] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            Demo starten
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3" role="status" aria-live="polite" aria-atomic="true">
        <div className="rounded-2xl border border-white/10 bg-black/55 p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400">OS-Portstatus</span>
            <Usb className={`h-4 w-4 ${webMidiStatus.active ? 'text-neon-cyan' : 'text-amber-300'}`} aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-2xl font-black text-white">{webMidiStatus.count}</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">{webMidiStatus.info}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/55 p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400">OS-Endpunkte</span>
            <Cable className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-2xl font-black text-white">{stageEndpoints.length}</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">Keine App-seitige Geräteobergrenze; die OS- und Treibergrenzen gelten.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/55 p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400">RX beobachtet</span>
            <Activity className="h-4 w-4 text-neon-magenta" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-2xl font-black text-white">{observedEndpoints.length}</div>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">Ein MIDI-Ereignis bestätigt nur Empfang, nicht Geräteidentität oder End-to-End-Funktion.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <h2 className="font-display text-sm font-black uppercase tracking-wider text-white">Erkannte OS-MIDI-Endpunkte</h2>
            <p className="mt-1 text-xs text-gray-400">Die Liste wächst mit allen vom Betriebssystem gemeldeten Ports.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onScan()}
              disabled={isScanning}
              aria-busy={isScanning}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neon-cyan/35 bg-neon-cyan/10 px-4 font-mono text-[10px] font-black uppercase text-neon-cyan transition hover:bg-neon-cyan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} aria-hidden="true" /> {isScanning ? 'Scan läuft' : 'Neu scannen'}
            </button>
            <button
              type="button"
              onClick={() => void onCalibrate()}
              disabled={isCalibrating}
              aria-busy={isCalibrating}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-4 font-mono text-[10px] font-black uppercase text-emerald-300 transition hover:bg-emerald-400/20 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <Activity className={`h-4 w-4 ${isCalibrating ? 'animate-pulse' : ''}`} aria-hidden="true" />
              {isCalibrating ? 'Prüfung läuft' : 'Readiness prüfen'}
            </button>
            <button
              type="button"
              onClick={onSafeStop}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-400/10 px-4 font-mono text-[10px] font-black uppercase text-red-300 transition hover:bg-red-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              title="Stoppt ausschließlich lokalen Transport und lokales Browser-Audio"
            >
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Lokaler Safe-Stop
            </button>
          </div>
        </div>

        {stageEndpoints.length === 0 ? (
          <div className="mt-5 flex min-h-32 items-center gap-3 rounded-xl border border-dashed border-amber-300/25 bg-amber-300/5 p-4 text-left" role="status">
            <CircleAlert className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <div className="font-mono text-[11px] font-black uppercase text-amber-200">Keine OS-MIDI-Endpunkte erkannt</div>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                Gerät und Treiber verbinden, Browser-/App-Berechtigung freigeben und erneut scannen. Es werden keine Demo-Geräte als Ersatz eingefügt.
              </p>
            </div>
          </div>
        ) : (
          <ul className="mt-5 max-h-[28rem] space-y-2 overflow-y-auto pr-1" aria-label="Vom Betriebssystem gemeldete MIDI-Endpunkte">
            {stageEndpoints.map((device) => (
              <li key={device.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{device.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase text-gray-500">
                    <span>{connectionLabel(device)}</span>
                    <span>In: {device.portNameIn || '—'}</span>
                    <span>Out: {device.portNameOut || '—'}</span>
                  </div>
                </div>
                <span className={`inline-flex min-h-7 items-center justify-center rounded-full border px-3 font-mono text-[9px] font-black uppercase ${
                  device.telemetryVerified
                    ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-300'
                    : 'border-amber-300/35 bg-amber-300/10 text-amber-200'
                }`}>
                  {device.telemetryVerified ? 'RX beobachtet' : 'Prüfung offen'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
