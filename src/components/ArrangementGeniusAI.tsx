import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Music,
  Activity,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Sliders,
  Flame,
  Radio
} from 'lucide-react';
import { MidiDevice } from '../types';

interface ArrangementGeniusAIProps {
  devices: MidiDevice[];
  bpm: number;
  isPlaying: boolean;
  addLog: (category: 'MIDI' | 'SYSTEM' | 'ABLETON' | 'OSC', level: 'info' | 'warn' | 'error' | 'success', message: string) => void;
  setActiveTab: (tab: any) => void;
}

export default function ArrangementGeniusAI({
  devices,
  bpm,
  isPlaying,
  addLog,
  setActiveTab
}: ArrangementGeniusAIProps) {
  const [detectedKey, setDetectedKey] = useState<string>('F Minor (Harmonic)');
  const [detectedScale, setDetectedScale] = useState<string>('128 BPM Techno / Melodic House');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);
  const [frequencyCollisionCount, setFrequencyCollisionCount] = useState<number>(1);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    id: string;
    type: 'harmony' | 'rhythm' | 'arrangement' | 'collision';
    title: string;
    description: string;
    actionText: string;
    applied: boolean;
  }>>([
    {
      id: 'sug-1',
      type: 'collision',
      title: 'Frequenz-Kollision erkannt: Bass-Synth & Kick Drum',
      description: 'Moog Bass (Ch.1) und Roland Kick (Ch.10) überlagern sich bei 65Hz. Automatisches Sidechaining im Ableton RACK empfohlen.',
      actionText: 'Auto-Sidechain in Ableton 12 aktivieren',
      applied: false,
    },
    {
      id: 'sug-2',
      type: 'rhythm',
      title: 'Polyrhythmischer Offset auf Arpeggiator (Ch. 3)',
      description: 'Korg Minilogue sendet 3/16 Triolen gegen 4/4 Beat. Perfekter Spannungsmoment für Drop-Scene 4 in Ableton Live.',
      actionText: 'Polyrhythmus-Clip in Ableton Scene 4 anlegen',
      applied: false,
    },
    {
      id: 'sug-3',
      type: 'harmony',
      title: 'Aura-Akkordfolge Erweiterung (Fm9 -> DbMaj7)',
      description: 'KI erkennt 8-Takt Loop und schlägt automatisch eine übergangsfreie Bridge für 4 VST-Synths gleichzeitig vor.',
      actionText: 'Bridge-Harmonie an Synth-Ensemble senden',
      applied: false,
    },
  ]);

  // Simulate real-time harmony & frequency scan
  const handleReanalyzeEnsemble = () => {
    setIsAnalyzing(true);
    addLog('ABLETON', 'info', '🧠 [ARRANGEMENT GENIUS] Scanne MIDI-Datenströme von 60 Geräten & Ableton Clips...');
    setTimeout(() => {
      setIsAnalyzing(false);
      setFrequencyCollisionCount(0);
      addLog('ABLETON', 'success', '✨ [ARRANGEMENT GENIUS] Harmonie & Rhythmus optimiert. 0 Frequenz-Kollisionen verbleibend.');
    }, 1200);
  };

  const handleApplySuggestion = (id: string) => {
    setAiSuggestions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          addLog('ABLETON', 'success', `⚡ [GENIUS ACTION] Angewendet: "${s.title}" -> An Ableton Live 12 übertragen!`);
          return { ...s, applied: true };
        }
        return s;
      })
    );
  };

  return (
    <div className="w-full bg-gradient-to-r from-purple-950/80 via-zinc-950 to-slate-950 border border-purple-500/30 rounded-2xl p-5 shadow-[0_0_35px_rgba(168,85,247,0.15)] relative overflow-hidden text-left my-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-neon-magenta/20 border border-purple-400/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-wider text-white flex items-center gap-2">
              AI ARRANGEMENT &amp; PATTERN GENIUS
              <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white font-mono text-[10px] font-bold">
                PREDICTIVE AI
              </span>
            </h2>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              Echtzeit-Tonart- &amp; Rhythmus-Analyse für das gesamte 60-Geräte-Ensemble &amp; Ableton 12 Arrangement.
            </p>
          </div>
        </div>

        <button
          onClick={handleReanalyzeEnsemble}
          disabled={isAnalyzing}
          className="px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-400/40 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-purple-400' : ''}`} />
          {isAnalyzing ? 'Analysiere Ensemble...' : 'Ensemble Scannen'}
        </button>
      </div>

      {/* Telemetry Dashboard Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 relative z-10 font-mono text-xs">
        <div className="p-3 rounded-xl bg-black/50 border border-purple-500/30 flex items-center justify-between">
          <span className="text-gray-400">Erkannte Tonart:</span>
          <span className="text-purple-300 font-bold">{detectedKey}</span>
        </div>
        <div className="p-3 rounded-xl bg-black/50 border border-neon-cyan/30 flex items-center justify-between">
          <span className="text-gray-400">Genre &amp; Groove:</span>
          <span className="text-neon-cyan font-bold">{detectedScale}</span>
        </div>
        <div className="p-3 rounded-xl bg-black/50 border border-amber-500/30 flex items-center justify-between">
          <span className="text-gray-400">Frequenz-Kollisionen:</span>
          <span className={`font-bold ${frequencyCollisionCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {frequencyCollisionCount} Konflikte
          </span>
        </div>
      </div>

      {/* AI Suggestions Cards */}
      <div className="space-y-3 relative z-10">
        <h3 className="font-mono text-xs text-gray-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Intelligente Arrangement- &amp; Mix-Empfehlungen:
        </h3>

        {aiSuggestions.map((sug) => (
          <div
            key={sug.id}
            className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              sug.applied
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-black/60 border-white/10 text-white hover:border-purple-400/50'
            }`}
          >
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                  sug.type === 'collision' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  sug.type === 'rhythm' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40' :
                  'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}>
                  {sug.type}
                </span>
                <span className="font-mono text-xs font-bold text-white">{sug.title}</span>
              </div>
              <p className="text-xs text-gray-300 font-sans leading-relaxed">{sug.description}</p>
            </div>

            <button
              onClick={() => handleApplySuggestion(sug.id)}
              disabled={sug.applied}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
                sug.applied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              }`}
            >
              {sug.applied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> In Ableton Live Ausgeführt
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> {sug.actionText}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
