/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Zap,
  Activity,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Play,
  HelpCircle,
  Radio,
  Clock,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Send
} from 'lucide-react';
import { MidiDevice } from '../types';

// Type declaration for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface AuraStudioCoachProps {
  devices: MidiDevice[];
  setDevices: React.Dispatch<React.SetStateAction<MidiDevice[]>>;
  addLog: (source: any, level: any, msg: string) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  scanWebMidiHardware: () => void;
  demoMode: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

interface CoachMessage {
  id: string;
  sender: 'aura' | 'user';
  text: string;
  timestamp: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export default function AuraStudioCoach({
  devices,
  setDevices,
  addLog,
  bpm,
  setBpm,
  isPlaying,
  setIsPlaying,
  scanWebMidiHardware,
  demoMode,
  activeTab,
  setActiveTab,
}: AuraStudioCoachProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const backendAvailable = typeof window !== 'undefined' && window.location.protocol !== 'file:';

  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome',
      sender: 'aura',
      text: 'Hallo! Ich bin AURA, dein beratender KI-Live-Performance-Coach. Ich kann Prüfabläufe, Routing und Studio-Setups einordnen, führe aber keine Geräteaktionen aus und behaupte keine ungemessene Hardware-Telemetrie.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // SpeechRecognition instance ref for proper cleanup
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Voice Speech Synthesis Helper
  const speakText = (text: string) => {
    if (!voiceOutputEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Voice Speech Recognition Input Helper
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('SYSTEM', 'info', '[AURA] Spracherkennung wird in diesem Browser nicht direkt unterstützt.');
      return;
    }

    // Clean up existing recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error cleaning up previous recognition:', e);
      }
      recognitionRef.current = null;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'de-DE';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsListening(true);
      addLog('SYSTEM', 'info', '[AURA] Zuhören gestartet... Sprich deine Frage ein.');

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setUserInput(transcript);
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.warn('Recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error cleaning up recognition on unmount:', e);
        }
      }
      // Also cancel any pending speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Quick Action Presets
  const run50DeviceRig = () => {
    if (!demoMode) {
      addLog('SYSTEM', 'warn', '[STAGE MODUS] Virtuelle Groß-Rigs sind ausschließlich über den Demo-Button verfügbar.');
      return;
    }
    setIsAnalyzing(true);
    addLog('SYSTEM', 'info', '[AURA DEMO] Generiere ein isoliertes virtuelles 50-Geräte-Ensemble...');
    
    setTimeout(() => {
      const generatedDevices: MidiDevice[] = Array.from({ length: 50 }).map((_, i) => {
        const id = `rig-dev-${i + 1}`;
        const typeIndex = i % 4;
        const type = typeIndex === 0 ? 'Synthesizer' : typeIndex === 1 ? 'Drum Machine' : typeIndex === 2 ? 'USB Controller' : 'Virtual Bridge';
        const namePrefix = typeIndex === 0 ? 'Moog / Prophet Synth' : typeIndex === 1 ? 'Elektron / TR Drum' : typeIndex === 2 ? 'Ableton Push / Launchpad' : 'OSC Zero-Jitter Bridge';
        
        return {
          id,
          name: `${namePrefix} #${i + 1}`,
          type: type as any,
          status: 'Healthy',
          isPhysicalHardware: false,
          connectionType: 'VIRTUAL_SIMULATION',
          operationalMode: 'DEMO',
          telemetryVerified: false,
          portNameIn: `USB MIDI In ${i + 1}`,
          portNameOut: `USB MIDI Out ${i + 1}`,
          bufferUsage: Math.floor(Math.random() * 15) + 3,
          clockDrift: parseFloat((Math.random() * 0.2 + 0.05).toFixed(2)),
          latency: parseFloat((0.08 + Math.random() * 0.3).toFixed(2)),
          dropCount: 0,
          lastMessageTime: Date.now(),
          lastMessageValue: `Port #${i + 1} Ready`,
          triggerDirection: 'Rising Edge',
          midiChannel: (i % 16) + 1,
          ccFilterActive: true,
          velocityCurve: 'Linear',
          pollingRate: 1000,
          debounceMs: 1,
          noiseFloor: 0,
          usbSuspensionDisabled: true,
          bufferSizeSamples: 32,
          driftCompensationMs: 0,
          autoRecalibrateEnabled: true,
          firmwareVersion: 'v2.4.0 (Live-Grade)',
          latestFirmwareVersion: 'v2.4.0',
          firmwareUpdateAvailable: false,
        };
      });

      setDevices(generatedDevices);
      setIsAnalyzing(false);
      addLog('SYSTEM', 'info', '[AURA DEMO] 50 virtuelle Knoten im isolierten Demo-Speicher erzeugt. Keine physische Messung.');
      
      const confirmText = 'Das virtuelle 50-Geräte-Ensemble ist im isolierten Demo-Modus geladen. Angezeigte Latenzen sind Simulationswerte und keine Bühnenmessung.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'aura',
          text: confirmText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionButton: {
            label: 'Signal-Mindmap öffnen',
            onClick: () => setActiveTab('mindmap'),
          },
        },
      ]);
      speakText(confirmText);
    }, 800);
  };

  const optimizeZeroLatency = () => {
    if (!demoMode) {
      addLog('SYSTEM', 'warn', '[STAGE MODUS] Der virtuelle Latenz-Tuner ist nur im isolierten Demo-Modus verfügbar.');
      return;
    }
    setIsAnalyzing(true);
    addLog('SYSTEM', 'info', '[AURA DEMO] Simuliere eine Pufferänderung ohne Betriebssystem- oder Gerätezugriff...');

    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) => ({
          ...d,
          bufferSizeSamples: 32,
          pollingRate: 1000,
          latency: 0.08,
          clockDrift: 0.01,
          usbSuspensionDisabled: true,
        }))
      );
      setIsAnalyzing(false);
      addLog('SYSTEM', 'info', '[AURA DEMO] Virtuelle Pufferwerte geändert. Keine Hardware- oder OS-Einstellung verändert.');

      const confirmText = 'Die Demo zeigt jetzt 32 Samples und 0,08 ms als rein virtuelle Zielwerte. Für den Stage-Modus wurde nichts verändert oder freigegeben.';
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'aura',
          text: confirmText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionButton: {
            label: 'Diagnose-Matrix prüfen',
            onClick: () => setActiveTab('diagnostics'),
          },
        },
      ]);
      speakText(confirmText);
    }, 600);
  };

  const checkPinoutBlueprints = () => {
    setActiveTab('trxblueprint');
    addLog('SYSTEM', 'info', '[AURA COACH] Bringe Hardware-Blueprint & Schaltpläne auf den Schirm.');
    const text = 'Ich habe den Hardware Blueprint geöffnet. Hier findest du geprüfte Schaltpläne für DIN 5-Pin MIDI, TRS Type-A/B, Eurorack Power und Optokoppler (PC817/6N137).';
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'aura',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    speakText(text);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || userInput;
    if (!text.trim()) return;

    if (!demoMode) {
      addLog('SYSTEM', 'warn', '[STAGE MODUS] AURA-Demo ist außerhalb des isolierten Demo-Workspace deaktiviert.');
      return;
    }

    if (!backendAvailable) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'aura',
          text: 'AURA benötigt die verbundene Sensorium Web-App. In der portablen Windows-Vorschau bleiben Chat und Mikrofon bewusst deaktiviert; Geräte-, Diagnose- und Routing-Ansichten funktionieren lokal weiter.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    const userMsg: CoachMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setUserInput('');
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/aura-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          systemContext: {
            deviceCount: devices.length,
            bpm,
            activeTab,
            latency: '0.08ms',
            bufferSize: '32 Samples',
          },
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text.slice(0, 2_000) })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const securityText = data.auditId
          ? `Der Sicherheitsguard hat diese Eingabe isoliert und nicht an AURA weitergegeben. Audit-ID: ${data.auditId}`
          : 'AURA konnte diese Eingabe nicht sicher verarbeiten. Es wurde keine Geräteaktion ausgeführt.';
        setIsAnalyzing(false);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'aura',
            text: securityText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        return;
      }
      const replyText = typeof data.reply === 'string' && data.reply.trim()
        ? data.reply.slice(0, 6_000)
        : 'AURA hat keine sichere Antwort erzeugt. Es wurde keine Geräteaktion ausgeführt.';

      let btnAction: { label: string; onClick: () => void } | undefined = undefined;
      const lower = text.toLowerCase();
      if (demoMode && (lower.includes('0ms') || lower.includes('latenz') || lower.includes('buffer'))) {
        btnAction = { label: 'Demo-Puffer simulieren', onClick: optimizeZeroLatency };
      } else if (demoMode && (lower.includes('50') || lower.includes('100') || lower.includes('geräte') || lower.includes('rig'))) {
        btnAction = { label: '50-Geräte Rig Laden', onClick: run50DeviceRig };
      } else if (lower.includes('ableton') || lower.includes('script') || lower.includes('udp')) {
        btnAction = { label: 'DAW Bridge öffnen', onClick: () => setActiveTab('code') };
      } else if (lower.includes('pinout') || lower.includes('schaltplan') || lower.includes('din') || lower.includes('trs')) {
        btnAction = { label: 'Blueprint Ansicht', onClick: checkPinoutBlueprints };
      }

      setIsAnalyzing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'aura',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionButton: btnAction,
        },
      ]);

      speakText(replyText);
    } catch (err) {
      console.error('Error contacting AURA chat API:', err);
      setIsAnalyzing(false);
      const fallbackText = 'AURA ist momentan nicht erreichbar. Es wurde keine Geräteaktion ausgeführt und kein Hardwarezustand bestätigt.';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'aura',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakText(fallbackText);
    }
  };

  return (
    <div className="bg-gradient-to-r from-[#0d0f17] via-[#090b10] to-[#0d0f17] border-b border-neon-cyan/20 px-6 py-3 transition-all duration-300 text-left">
      
      {/* Mini Banner Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 flex items-center justify-center text-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.3)]">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${backendAvailable ? 'bg-neon-green' : 'bg-amber-400'}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xs uppercase tracking-wider text-white">
                AURA <span className="text-neon-cyan font-mono font-normal text-[10px]">KI LIVE OS COACH</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold ${backendAvailable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                {backendAvailable ? 'AURA BACKEND VERBUNDEN' : 'AURA NUR IN WEB-APP'}
              </span>
            </div>
            <p className="font-sans text-[11px] text-gray-300">
              {!backendAvailable
                ? 'Portable Vorschau: lokale Geräte-, Diagnose- und Routing-Funktionen sind verfügbar.'
                : devices.length > 0
                ? `${devices.length} ${demoMode ? 'virtuelle Demo-Knoten' : 'erkannte Port-Einträge'}. AURA bleibt rein beratend.`
                : 'Scanne Hardware oder frage AURA nach Audio-Einrichtungstipps.'}
            </p>
          </div>
        </div>

        {/* Quick Trigger Badges & Voice Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}
            className={`p-1.5 rounded-lg border text-[10px] font-mono transition flex items-center gap-1 ${
              voiceOutputEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/5 text-gray-400 border-white/10'
            }`}
            title={voiceOutputEnabled ? 'Sprachausgabe Aktiviert' : 'Sprachausgabe Stumm'}
          >
            {voiceOutputEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{voiceOutputEnabled ? 'Audio AN' : 'Audio STUMM'}</span>
          </button>

          {demoMode && (
            <>
              <button
                onClick={run50DeviceRig}
                className="px-2.5 py-1 bg-white/5 hover:bg-neon-cyan/15 text-gray-200 hover:text-neon-cyan border border-white/10 hover:border-neon-cyan/30 rounded-lg text-[10px] font-mono transition flex items-center gap-1.5"
                title="Lade ein isoliertes virtuelles 50-Geräte-Ensemble"
              >
                <Zap className="w-3 h-3 text-neon-cyan" /> Demo: 50-Rig
              </button>

              <button
                onClick={optimizeZeroLatency}
                className="px-2.5 py-1 bg-white/5 hover:bg-neon-green/15 text-gray-200 hover:text-neon-green border border-white/10 hover:border-neon-green/30 rounded-lg text-[10px] font-mono transition flex items-center gap-1.5"
                title="Simuliere Pufferwerte ohne Gerätezugriff"
              >
                <Clock className="w-3 h-3 text-neon-green" /> Demo: Puffer
              </button>
            </>
          )}

          <button
            onClick={checkPinoutBlueprints}
            className="px-2.5 py-1 bg-white/5 hover:bg-neon-magenta/15 text-gray-200 hover:text-neon-magenta border border-white/10 hover:border-neon-magenta/30 rounded-lg text-[10px] font-mono transition flex items-center gap-1.5"
            title="Zeige echte PIN-Belegungen"
          >
            <Sliders className="w-3 h-3 text-neon-magenta" /> Pinouts
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 rounded-xl text-[10px] font-mono font-bold transition flex items-center gap-1.5 ml-1 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isExpanded ? 'Coach einklappen' : 'AURA Dialog öffnen'}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Interactive Assistant Panel */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in space-y-3">
          {!backendAvailable && (
            <div role="status" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
              AURA-Chat und Spracheingabe sind in dieser portablen Vorschau deaktiviert. Öffne die verbundene Web-App, um den Coach zu verwenden.
            </div>
          )}
          
          {/* Chat Stream History */}
          <div className="max-h-[260px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 text-xs ${
                  msg.sender === 'aura' ? 'justify-start' : 'justify-end'
                }`}
              >
                {msg.sender === 'aura' && (
                  <div className="w-6 h-6 rounded-lg bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center shrink-0 text-neon-cyan mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3.5 border font-sans leading-relaxed text-left space-y-2 ${
                    msg.sender === 'aura'
                      ? 'bg-slate-900/90 text-gray-100 border-white/15 shadow-md'
                      : 'bg-neon-cyan/20 text-white border-neon-cyan/40 font-medium'
                  }`}
                >
                  <p className="whitespace-pre-line text-xs">{msg.text}</p>
                  
                  {msg.actionButton && (
                    <button
                      onClick={msg.actionButton.onClick}
                      className="mt-2 px-3 py-1.5 bg-neon-cyan text-black font-mono font-bold text-[10px] rounded-lg hover:bg-white transition flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> {msg.actionButton.label}
                    </button>
                  )}

                  <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 pt-1">
                    {msg.sender === 'aura' && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="text-gray-400 hover:text-neon-cyan flex items-center gap-1 transition"
                      >
                        <Volume2 className="w-3 h-3" /> vorlesen
                      </button>
                    )}
                    <span className="block ml-auto">{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex gap-2 items-center text-xs text-neon-cyan font-mono animate-pulse p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                <Bot className="w-4 h-4" /> AURA generiert eine flüssige Antwort...
              </div>
            )}
          </div>

          {/* Quick Question Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[10px]">
            <span className="text-gray-400 text-[9px] uppercase self-center mr-1">Tipps &amp; Fragen:</span>
            {[
              'Wie erreiche ich echten 0ms Jitter?',
              'Erstelle ein 50-Geräte Großensemble',
              'Wie synchronisiere ich Ableton Live 12?',
              'Hardware PIN-Belegungen prüfen',
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={!backendAvailable}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box with Microphone Voice Control */}
          <div className="flex gap-2 items-center">
            <button
              onClick={toggleVoiceInput}
              disabled={!demoMode || !backendAvailable}
              className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-red-500/30 text-red-300 border-red-500/50 animate-pulse'
                  : 'bg-black/60 text-gray-300 border-white/15 hover:border-neon-cyan hover:text-neon-cyan disabled:cursor-not-allowed disabled:opacity-40'
              }`}
              title={!backendAvailable ? 'Nur in der verbundenen Web-App verfügbar' : isListening ? 'Zuhören stoppen...' : 'Mikrofon einschalten (Spracheingabe)'}
            >
              {isListening ? <MicOff className="w-4 h-4 text-red-400 animate-spin" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={!backendAvailable}
              placeholder={backendAvailable ? 'Spreche oder schreibe mit AURA: Frage nach Live-Tipps, Routing, Tunings oder PINs...' : 'AURA ist in der portablen Vorschau nicht verbunden.'}
              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan font-sans disabled:cursor-not-allowed disabled:opacity-60"
            />
            
            <button
              onClick={() => handleSendMessage()}
              disabled={!demoMode || !backendAvailable || isAnalyzing}
              className="px-4 py-2.5 bg-neon-cyan text-black font-mono font-bold text-xs rounded-xl hover:bg-white transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Senden
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
