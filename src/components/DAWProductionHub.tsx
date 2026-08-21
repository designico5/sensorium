/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { 
  Sliders, Activity, Music, Sparkles, Volume2, Info, Check, Play, Square, Plus, Trash2, 
  RefreshCw, Layers, Link, FileAudio, Eye, ShieldAlert, Cpu, Award, Zap, Repeat 
} from 'lucide-react';

interface DAWProductionHubProps {
  addLog: (source: any, level: any, msg: string) => void;
  bpm: number;
}

interface StemTrack {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number; // -100 (L) to 100 (R)
  solo: boolean;
  mute: boolean;
  peakDb: number;
}

interface TrackSection {
  name: string;
  startBar: number;
  durationBars: number;
  key: string;
  energyLevel: number; // 0-100
  desc: string;
}

export default function DAWProductionHub({ addLog, bpm }: DAWProductionHubProps) {
  // 1. Algorithm Selection States
  const [activeAlgos, setActiveAlgos] = useState({
    spectral: true,
    beat: true,
    harmonic: true,
    dynamics: true,
    mlSegment: false // ML-based is asynchronous and can be turned on/off independently
  });
  const [isMlProcessing, setIsMlProcessing] = useState(false);

  // 2. Loop Setter States
  const [loopLength, setLoopLength] = useState<2 | 4 | 8 | 16>(8);
  const [loopStartBar, setLoopStartBar] = useState(24);
  const [activeLooping, setActiveLooping] = useState(false);

  // 3. Arrangement & Length States (5, 8, 12 min)
  const [selectedDuration, setSelectedDuration] = useState<5 | 8 | 12>(8);
  const [currentArrangement, setCurrentArrangement] = useState<TrackSection[]>([]);
  const [trackKey, setTrackKey] = useState('D-Moll (Dorisch)');

  // 4. Stems & External Song Loader States
  const [songUrl, setSongUrl] = useState('https://soundcloud.com/user/hyper-composition-flac');
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [separationProgress, setSeparationProgress] = useState(0);
  const [stemTracks, setStemTracks] = useState<StemTrack[]>([
    { id: 'stem-1', name: 'Drums (HTDemucs-Drum-Trans)', color: '#00f0ff', volume: 80, pan: 0, solo: false, mute: false, peakDb: -3 },
    { id: 'stem-2', name: 'Sub-Bass (Differentiator-Core)', color: '#ff007f', volume: 85, pan: -10, solo: false, mute: false, peakDb: -1.5 },
    { id: 'stem-3', name: 'Synthesizer & Lead Motif', color: '#f59e0b', volume: 75, pan: 25, solo: false, mute: false, peakDb: -4 },
    { id: 'stem-4', name: 'Vocals & Ambience Pad', color: '#10b981', volume: 70, pan: -20, solo: false, mute: false, peakDb: -6 }
  ]);
  const [wowEffect, setWowEffect] = useState(65); // WOW MIDI modifier slider
  const [midiConversionOutput, setMidiConversionOutput] = useState<string | null>(null);

  // 5. Klangsymbiose Orchestration complexity levels
  const [complexityLevel, setComplexityLevel] = useState<1 | 2>(1);

  // Interactive Timeline state (Markers weighted by user click)
  const [userMarkers, setUserMarkers] = useState<{ bar: number; weight: number }[]>([
    { bar: 16, weight: 80 },
    { bar: 44, weight: 95 },
    { bar: 68, weight: 90 }
  ]);

  // Audio Playback simulation
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPosition, setPlayPosition] = useState(0); // 0 to 100% of track length

  const timelineSvgRef = useRef<SVGSVGElement | null>(null);
  const playheadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger simulated ML Analysis with Interruptibility
  useEffect(() => {
    if (activeAlgos.mlSegment) {
      setIsMlProcessing(true);
      addLog('SYSTEM', 'info', '[ML-ENGINE] Asynchrones ML-Segmentierungsmodul (Essentia Neural API) gestartet. Musikfluss läuft ungestört weiter...');
      
      const timer = setTimeout(() => {
        setIsMlProcessing(false);
        addLog('SYSTEM', 'success', '[ML-ENGINE] ML-Segmentierung beendet: Formale Gliederungsgrenzen erfolgreich mit Onset-Clustering korreliert.');
      }, 4000);

      return () => {
        clearTimeout(timer);
        setIsMlProcessing(false);
      };
    } else {
      setIsMlProcessing(false);
      addLog('SYSTEM', 'warn', '[ML-ENGINE] ML-Segmentierung asynchron unterbrochen (Interruptible). Systemressourcen freigegeben.');
    }
  }, [activeAlgos.mlSegment]);

  // Generate Arrangement Structure based on Duration & Motifs
  useEffect(() => {
    let structure: TrackSection[] = [];
    if (selectedDuration === 5) {
      structure = [
        { name: 'Intro-Ramp', startBar: 1, durationBars: 8, key: 'D-Moll', energyLevel: 25, desc: 'Normalisierte Gain-Kurve startet bei -24dB mit linearem Tiefpass-Schnitt.' },
        { name: 'Aufbau / Motif A', startBar: 9, durationBars: 16, key: 'D-Moll', energyLevel: 55, desc: 'Einführung des perkussiven Drum-Stems; Frequenzspektrum öffnet sich harmonisch.' },
        { name: 'Breakdown / Key Shift', startBar: 25, durationBars: 8, key: 'G-Dur (Modale Verwechslung)', energyLevel: 40, desc: 'Akkorde wechseln zur subdominanten modalen Verwechslung; Bass-Pause.' },
        { name: 'Drop / Energy Spike', startBar: 33, durationBars: 24, key: 'D-Moll (Dorisch)', energyLevel: 98, desc: 'Vollständige Orchestrierung. Alle 4 Stems auf Maximalpegel mit LUFS-Begrenzung.' },
        { name: 'Outro-Fade', startBar: 57, durationBars: 8, key: 'D-Moll', energyLevel: 15, desc: 'Exponentieller Gain-Abfall; Resonanzfilter schließt sich bis zur absoluten Stille.' }
      ];
    } else if (selectedDuration === 8) {
      structure = [
        { name: 'Intro-Ramp', startBar: 1, durationBars: 16, key: 'D-Moll', energyLevel: 20, desc: 'Atmosphärisches Anschwellen; langsame Überblendung des Vocals- & Ambient-Stems.' },
        { name: 'Aufbau (Komp. 1)', startBar: 17, durationBars: 16, key: 'D-Moll', energyLevel: 50, desc: 'Rhythmische Webung. Minimalistische Synkope im Sub-Bass-Fundament.' },
        { name: 'Motif A dekonstruiert', startBar: 33, durationBars: 16, key: 'D-Moll (Dorisch)', energyLevel: 75, desc: 'Entwicklung des Hauptthemas. Spektral-Schnitt filtert Mitten heraus.' },
        { name: 'Breakdown (Zenith)', startBar: 49, durationBars: 16, key: 'A-Moll (Aeolisch)', energyLevel: 35, desc: 'Obertonanalyse triggert modale Modulation. Volles Reverb-Glidement.' },
        { name: 'The Golden Drop', startBar: 65, durationBars: 32, key: 'D-Moll (Dorisch)', energyLevel: 100, desc: 'Der primäre Hochpunkt. Hohe Harmoniedichte und maximale Spektral-Breite.' },
        { name: 'Remix-Dekonstruktion', startBar: 97, durationBars: 16, key: 'G-Dur (Subdominant)', energyLevel: 60, desc: 'Spezifischer DJ-Schnitt: Drums und Bass laufen isoliert mit Vocal-Modulationen.' },
        { name: 'Outro-Fade', startBar: 113, durationBars: 16, key: 'D-Moll', energyLevel: 10, desc: 'Verbleibende Synkopen weichen sanft auf; Normalisierung kühlt ab.' }
      ];
    } else { // 12 Minutes (Deep Experimental / Long Hybrid Remix)
      structure = [
        { name: 'Drone Intro', startBar: 1, durationBars: 24, key: 'D-Moll', energyLevel: 15, desc: 'Tiefes spektrales Bassgrollen; Phasen-Weaving des Synthesizer-Stems.' },
        { name: 'Minimal Aufbau', startBar: 25, durationBars: 32, key: 'D-Moll', energyLevel: 45, desc: 'Subtiles Einschneiden des Beat-Onsets; schrittweise Gain-Stabilisierung.' },
        { name: 'Motif A Entfaltung', startBar: 57, durationBars: 32, key: 'D-Moll (Dorisch)', energyLevel: 70, desc: 'Synthesizer-Lead entfaltet sich vollständig; algorithmische Phasenkorrekturen.' },
        { name: 'Harmonischer Modulator', startBar: 89, durationBars: 16, key: 'F-Dur (Lydisch)', energyLevel: 55, desc: 'Modale Verschiebung der Melodiestimme über festem Ostinato-Bass.' },
        { name: 'The Golden Drop', startBar: 105, durationBars: 48, key: 'D-Moll (Dorisch)', energyLevel: 100, desc: 'Dramatischer, massiver Energieausbruch. Rekordbox-analoge Loop-Vektoren.' },
        { name: 'Acid Breakdown (Tension)', startBar: 153, durationBars: 24, key: 'C-Dur (Modulation)', energyLevel: 40, desc: 'Zweiter Ruhepunkt; algorithmisch generierte rhythmische Gegenakzente.' },
        { name: 'Drums Deconstruction', startBar: 177, durationBars: 32, key: 'D-Moll', energyLevel: 80, desc: 'DJ-freundliches Werkzeug mit polyrhythmischem Grid für fließende Übergänge.' },
        { name: 'Outro-Fade', startBar: 209, durationBars: 24, key: 'D-Moll', energyLevel: 8, desc: 'Tiefpassfilter fegt das Spektrum leer; nur die harmonische Grundwelle bleibt.' }
      ];
    }
    setCurrentArrangement(structure);
  }, [selectedDuration]);

  // SVG Render containing D3 Parallel Curves Visualization
  useEffect(() => {
    if (!timelineSvgRef.current) return;
    const svgElement = d3.select(timelineSvgRef.current);
    svgElement.selectAll('*').remove();

    const width = timelineSvgRef.current.clientWidth || 800;
    const height = 180;
    const margin = { top: 20, right: 30, bottom: 20, left: 40 };

    // Set height attributes
    svgElement.attr('viewBox', `0 0 ${width} ${height}`);

    const xScale = d3.scaleLinear()
      .domain([0, 100])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    // Draw background grid lines (horizontal ticks)
    const gridLines = [25, 50, 75];
    svgElement.selectAll('.grid-line')
      .data(gridLines)
      .enter()
      .append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', 'rgba(255, 255, 255, 0.04)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Create 4 wave patterns based on mathematical formulas (trig and noise)
    const generateCurveData = (offsetPhase: number, frequency: number, jitterAmp: number) => {
      const data: [number, number][] = [];
      for (let x = 0; x <= 100; x++) {
        // High peak at x=44 and x=68 to simulate dynamic attraction points
        const distanceToClimax1 = Math.abs(x - 44);
        const distanceToClimax2 = Math.abs(x - 68);
        const surge = Math.exp(-Math.pow(distanceToClimax1 / 10, 2)) * 60 + Math.exp(-Math.pow(distanceToClimax2 / 8, 2)) * 45;
        
        let sineVal = Math.sin(x * frequency + offsetPhase) * 15;
        let randomNoise = (Math.sin(x * 2.3) * Math.cos(x * 1.7)) * jitterAmp;
        
        let yVal = 20 + sineVal + surge + randomNoise;
        // Clip values between 0 and 100
        yVal = Math.max(0, Math.min(100, yVal));
        data.push([x, yVal]);
      }
      return data;
    };

    // Parallel curves drawing conditional on toggled states
    const curveConfigs = [
      { key: 'spectral', color: '#00f0ff', phase: 0.5, freq: 0.15, jitter: 10, label: 'Spektraldichte (FFT)' },
      { key: 'beat', color: '#ff007f', phase: 1.2, freq: 0.28, jitter: 15, label: 'Onset Beatgrid-Energie' },
      { key: 'harmonic', color: '#f59e0b', phase: 2.5, freq: 0.08, jitter: 4, label: 'Harmonischer Chroma-Score' },
      { key: 'dynamics', color: '#10b981', phase: 3.1, freq: 0.05, jitter: 8, label: 'Lautstärke-Kurve (RMS/LUFS)' }
    ];

    curveConfigs.forEach(cfg => {
      if (!(activeAlgos as any)[cfg.key]) return;

      const curveData = generateCurveData(cfg.phase, cfg.freq, cfg.jitter);
      const lineGenerator = d3.line<[number, number]>()
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]))
        .curve(d3.curveBasis);

      // Render actual glow outline
      svgElement.append('path')
        .datum(curveData)
        .attr('d', lineGenerator)
        .attr('fill', 'none')
        .attr('stroke', cfg.color)
        .attr('stroke-width', 4)
        .attr('opacity', 0.12);

      // Render sharp line
      svgElement.append('path')
        .datum(curveData)
        .attr('d', lineGenerator)
        .attr('fill', 'none')
        .attr('stroke', cfg.color)
        .attr('stroke-width', 1.8)
        .attr('opacity', 0.85);
    });

    // Draw Asynchronous ML segmentation borders as vertical banners if enabled
    if (activeAlgos.mlSegment) {
      const mlBoundaries = [15, 38, 55, 78, 92];
      svgElement.selectAll('.ml-boundary')
        .data(mlBoundaries)
        .enter()
        .append('g')
        .attr('class', 'ml-boundary')
        .each(function(barPos) {
          const g = d3.select(this);
          g.append('line')
            .attr('x1', xScale(barPos))
            .attr('x2', xScale(barPos))
            .attr('y1', margin.top)
            .attr('y2', height - margin.bottom)
            .attr('stroke', '#a855f7')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '5,3')
            .attr('opacity', 0.7);

          g.append('rect')
            .attr('x', xScale(barPos) - 15)
            .attr('y', margin.top + 5)
            .attr('width', 30)
            .attr('height', 10)
            .attr('rx', 2)
            .attr('fill', 'rgba(168, 85, 247, 0.2)')
            .attr('stroke', '#a855f7')
            .attr('stroke-width', 0.5);

          g.append('text')
            .attr('x', xScale(barPos))
            .attr('y', margin.top + 12)
            .attr('text-anchor', 'middle')
            .attr('fill', '#d8b4fe')
            .attr('font-size', '6.5px')
            .attr('font-family', 'monospace')
            .text('ML_SEG');
        });
    }

    // Highlight Auto-Attraction points (where peak curves intersect)
    const climaxPoints = [44, 68];
    climaxPoints.forEach(pt => {
      // Background Glow Pillar
      svgElement.append('rect')
        .attr('x', xScale(pt) - 10)
        .attr('y', margin.top)
        .attr('width', 20)
        .attr('height', height - margin.top - margin.bottom)
        .attr('fill', 'url(#glow-gradient)')
        .attr('opacity', 0.15)
        .attr('pointer-events', 'none');

      // Center dotted line
      svgElement.append('line')
        .attr('x1', xScale(pt))
        .attr('x2', xScale(pt))
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#00f0ff')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3');

      // Top Attractivity badge
      svgElement.append('circle')
        .attr('cx', xScale(pt))
        .attr('cy', yScale(92))
        .attr('r', 4.5)
        .attr('fill', '#00f0ff')
        .attr('stroke', '#0a0b10')
        .attr('stroke-width', 1.5);
    });

    // Draw User weighted attraction markers (draggable & adjustable)
    userMarkers.forEach((m, idx) => {
      const g = svgElement.append('g')
        .attr('cursor', 'pointer');

      // Visual handle
      g.append('polygon')
        .attr('points', `${xScale(m.bar)},${height - margin.bottom} ${xScale(m.bar) - 6},${height - margin.bottom + 8} ${xScale(m.bar) + 6},${height - margin.bottom + 8}`)
        .attr('fill', '#f59e0b')
        .attr('stroke', '#0a0b10')
        .attr('stroke-width', 1);

      // Light vertical indicator
      g.append('line')
        .attr('x1', xScale(m.bar))
        .attr('x2', xScale(m.bar))
        .attr('y1', margin.top + 25)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1)
        .attr('opacity', 0.4);

      // Weight label bubble
      g.append('text')
        .attr('x', xScale(m.bar))
        .attr('y', height - margin.bottom + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f59e0b')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text(`w:${m.weight}%`);
    });

    // Draw active Beatgrid-Analogie Loop window
    if (activeLooping) {
      const loopWidthPercent = (loopLength * 0.7) || 4; // approximate visual scale
      const loopX = xScale(loopStartBar);
      const loopW = xScale(loopStartBar + loopLength) - loopX;

      // Draw the loop window overlay
      svgElement.append('rect')
        .attr('x', loopX)
        .attr('y', margin.top)
        .attr('width', loopW)
        .attr('height', height - margin.top - margin.bottom)
        .attr('fill', 'rgba(0, 240, 255, 0.08)')
        .attr('stroke', '#00f0ff')
        .attr('stroke-width', 1.5)
        .attr('rx', 3);

      // Handles on left & right boundaries
      svgElement.append('line')
        .attr('x1', loopX)
        .attr('x2', loopX)
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#00f0ff')
        .attr('stroke-width', 3);

      svgElement.append('line')
        .attr('x1', loopX + loopW)
        .attr('x2', loopX + loopW)
        .attr('y1', margin.top)
        .attr('y2', height - margin.bottom)
        .attr('stroke', '#00f0ff')
        .attr('stroke-width', 3);

      // Loop Label
      svgElement.append('rect')
        .attr('x', loopX + 4)
        .attr('y', margin.top + 4)
        .attr('width', 40)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', '#00f0ff');

      svgElement.append('text')
        .attr('x', loopX + 24)
        .attr('y', margin.top + 11)
        .attr('text-anchor', 'middle')
        .attr('fill', '#000000')
        .attr('font-size', '7px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text(`LOOP:${loopLength}T`);
    }

    // Gradient definition for glowing attractivity pillar
    const defs = svgElement.append('defs');
    const grad = defs.append('linearGradient')
      .attr('id', 'glow-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#00f0ff').attr('stop-opacity', 0.8);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#000000').attr('stop-opacity', 0);

  }, [activeAlgos, activeLooping, loopLength, loopStartBar, userMarkers, activeAlgos.mlSegment]);

  // Handle Playback Simulation for playhead
  const handleTogglePlayback = () => {
    if (isPlaying) {
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
      setIsPlaying(false);
      addLog('MIDI', 'info', '[DAW-HUB] Playback pausiert.');
    } else {
      setIsPlaying(true);
      addLog('MIDI', 'success', '[DAW-HUB] Wiedergabe gestartet. Clock synct mit 120BPM Ableton Master.');
      
      playheadIntervalRef.current = setInterval(() => {
        setPlayPosition(prev => {
          let next = prev + 0.4;
          if (next >= 100) {
            next = 0;
            addLog('SYSTEM', 'info', '[DAW-HUB] Track Loopback springt zum Anfang zurück.');
          }
          // Peak meters flutter
          setStemTracks(tracks => tracks.map(t => ({
            ...t,
            peakDb: parseFloat((-2 + Math.random() * -8).toFixed(1))
          })));
          return next;
        });
      }, 100);
    }
  };

  useEffect(() => {
    return () => {
      if (playheadIntervalRef.current) clearInterval(playheadIntervalRef.current);
    };
  }, []);

  // Simulating external song FLAC extraction (like SpotiFLAC)
  const handleLoadExternalSong = () => {
    if (isLoadingSong) return;
    setIsLoadingSong(true);
    setSeparationProgress(0);
    setMidiConversionOutput(null);
    addLog('SYSTEM', 'info', `[EXT-LOADER] Lade Song von ${songUrl}...`);

    let prg = 0;
    const interval = setInterval(() => {
      prg += 4;
      if (prg >= 100) {
        prg = 100;
        clearInterval(interval);
        setIsLoadingSong(false);
        addLog('SYSTEM', 'success', '[DEMUCS] Stem-Separation erfolgreich abgeschlossen! Alle 4 Stems extrahiert und in 24-bit FLAC gepuffert.');
      }
      setSeparationProgress(prg);
    }, 150);
  };

  // MIDI Convertor simulation with WOW EFFECT
  const handleConvertAudioToMidi = (stemName: string) => {
    addLog('SYSTEM', 'info', `[MIDI-CONV] Analysiere monophone Pitch-Fluktuationen in Spuren "${stemName}"...`);
    setTimeout(() => {
      const notes = ['D2', 'F2', 'A2', 'D3', 'E3', 'G3', 'A3', 'D4'];
      const generatedSeq = Array.from({ length: 16 }).map(() => {
        const randNote = notes[Math.floor(Math.random() * notes.length)];
        const velocity = Math.floor(60 + Math.random() * 50);
        return `${randNote}(v:${velocity})`;
      }).join(' → ');

      setMidiConversionOutput(`[MIDI] ${stemName.split(' ')[0]} konvertiert mit WOW-Verschiebung (${wowEffect}%):\nSequence: ${generatedSeq}\nTempo: ${bpm} BPM | Quantisierung: 16tel Swing`);
      addLog('MIDI', 'success', `[MIDI-CONV] Spur "${stemName}" erfolgreich in MIDI transformiert! Polyrhythmische Arpeggierung aktiv.`);
    }, 1000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left relative z-10">
      
      {/* LEFT: Core Analysis Timeline and Loops (8 Cols) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        
        {/* Component 1: Algorhythmische Kurven-Analyse (Markierungssystem) */}
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20">
                  <Activity className="w-4 h-4 text-[#00f0ff]" />
                </span>
                <h3 className="font-display font-black text-xs tracking-widest text-white uppercase">
                  1. ALGORHYTHMISCHE KURVEN-ANALYSE &amp; GRID
                </h3>
              </div>
              <p className="font-sans text-[10px] text-gray-400 mt-1">
                Visualisiert parallele mathematische Kurven zur Detektion von Top-Attraktivitätspunkten.
              </p>
            </div>

            {/* Algorithm Selectors */}
            <div className="flex flex-wrap gap-1.5 bg-black/60 p-1 rounded-xl border border-white/5 font-mono text-[9px] font-bold">
              <button 
                onClick={() => setActiveAlgos(prev => ({ ...prev, spectral: !prev.spectral }))}
                className={`px-2 py-1 rounded transition ${activeAlgos.spectral ? 'bg-[#00f0ff]/15 text-[#00f0ff]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                FFT-Spektral
              </button>
              <button 
                onClick={() => setActiveAlgos(prev => ({ ...prev, beat: !prev.beat }))}
                className={`px-2 py-1 rounded transition ${activeAlgos.beat ? 'bg-[#ff007f]/15 text-[#ff007f]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Beat-Onset
              </button>
              <button 
                onClick={() => setActiveAlgos(prev => ({ ...prev, harmonic: !prev.harmonic }))}
                className={`px-2 py-1 rounded transition ${activeAlgos.harmonic ? 'bg-[#f59e0b]/15 text-[#f59e0b]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Chroma-Harm
              </button>
              <button 
                onClick={() => setActiveAlgos(prev => ({ ...prev, dynamics: !prev.dynamics }))}
                className={`px-2 py-1 rounded transition ${activeAlgos.dynamics ? 'bg-[#10b981]/15 text-[#10b981]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                RMS-Gain
              </button>
              <button 
                onClick={() => setActiveAlgos(prev => ({ ...prev, mlSegment: !prev.mlSegment }))}
                className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                  activeAlgos.mlSegment 
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                    : 'text-gray-500 border border-transparent hover:text-gray-300'
                }`}
              >
                {isMlProcessing && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                ML-Segment
              </button>
            </div>
          </div>

          {/* D3.js Curve Chart Frame */}
          <div className="bg-black/80 rounded-2xl p-4 border border-white/5 relative">
            <div className="flex items-center justify-between font-mono text-[9px] text-gray-500 mb-2">
              <span>ATTRACTIVITY LEVEL (0 - 100%)</span>
              <span className="text-[#00f0ff] font-bold animate-pulse">• MULTI-ALGO FUSION ACTIVE</span>
            </div>

            {/* Simulated Playhead Overlay */}
            <div className="absolute top-10 bottom-10 w-[1.5px] bg-red-500 z-10 pointer-events-none" style={{ left: `calc(40px + ${playPosition}% * (100% - 70px) / 100)` }}>
              <div className="w-2 h-2 rounded-full bg-red-500 absolute -top-1 -left-[3px] shadow-[0_0_8px_#ef4444]" />
            </div>

            <svg ref={timelineSvgRef} className="w-full h-[180px]" />

            {/* Click Timeline to weight helper */}
            <div className="mt-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-gray-400 font-mono text-[9px]">
              <span>💡 Klicke auf die Attraktivitätspunkte, um eigene Loops / Gewichte einzustellen.</span>
              <div className="flex gap-4">
                <span className="text-gray-500"><span className="text-[#00f0ff]">●</span> Auto-Peak</span>
                <span className="text-gray-500"><span className="text-[#f59e0b]">▲</span> User-Gewicht</span>
                {activeAlgos.mlSegment && <span className="text-gray-500"><span className="text-purple-400">---</span> ML Grenze</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Component 2: Loop-Setzer (Beatgrid-Analogie) */}
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#ff007f]/10 border border-[#ff007f]/20">
                  <Repeat className="w-4 h-4 text-[#ff007f]" />
                </span>
                <h3 className="font-display font-black text-xs tracking-widest text-white uppercase">
                  2. LOOP-SETZER (BEATGRID-ANALOGIE)
                </h3>
              </div>
              <p className="font-sans text-[10px] text-gray-400 mt-1">
                Koppelt sich mit Attraktivitätspunkten für rekordbox-analoges Loop-Setzen.
              </p>
            </div>

            <button 
              onClick={() => {
                setActiveLooping(!activeLooping);
                addLog('MIDI', 'info', `[LOOP-SET] Loop-Fenster ${!activeLooping ? 'aktiviert' : 'deaktiviert'}.`);
              }}
              className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider transition ${
                activeLooping 
                  ? 'bg-[#ff007f] text-white shadow-[0_0_12px_rgba(255,0,127,0.35)]' 
                  : 'bg-zinc-900 border border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {activeLooping ? '✓ Loop Aktiv' : 'Loop Aktivieren'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Quick Length selector */}
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2 text-left">
              <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Loop-Länge (Takte)</span>
              <div className="grid grid-cols-4 gap-1 font-mono text-[10px] font-bold">
                {[2, 4, 8, 16].map(len => (
                  <button
                    key={len}
                    onClick={() => {
                      setLoopLength(len as any);
                      addLog('MIDI', 'info', `[LOOP-SET] Loop-Länge auf ${len} Takte umgestellt.`);
                    }}
                    className={`py-1.5 rounded-lg transition ${loopLength === len ? 'bg-[#ff007f] text-white' : 'bg-zinc-900 text-gray-400 hover:text-white'}`}
                  >
                    {len}T
                  </button>
                ))}
              </div>
            </div>

            {/* Loop Position Slider */}
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1.5 text-left">
              <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Loop-Startposition (Takt)</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range"
                  min="1"
                  max="96"
                  value={loopStartBar}
                  onChange={(e) => {
                    const bar = parseInt(e.target.value);
                    setLoopStartBar(bar);
                  }}
                  className="w-full bg-zinc-800 accent-[#ff007f] h-1 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-[10px] font-bold text-white w-8">T:{loopStartBar}</span>
              </div>
            </div>

            {/* Preset Snap Targets */}
            <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1 text-left">
              <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Snap-To-Attraction-Peak</span>
              <div className="flex gap-1.5 pt-0.5">
                <button
                  onClick={() => {
                    setLoopStartBar(12);
                    setLoopLength(8);
                    setActiveLooping(true);
                    addLog('MIDI', 'success', '[LOOP-SET] Loop an Takt 12 gerastet (Intro Peak - 8 Bar).');
                  }}
                  className="flex-1 py-1 px-2 rounded bg-zinc-900 text-[9px] font-mono hover:text-white transition"
                >
                  Peak 1 (Intro)
                </button>
                <button
                  onClick={() => {
                    setLoopStartBar(40);
                    setLoopLength(16);
                    setActiveLooping(true);
                    addLog('MIDI', 'success', '[LOOP-SET] Loop an Takt 40 gerastet (Golden Drop - 16 Bar).');
                  }}
                  className="flex-1 py-1 px-2 rounded bg-zinc-900 text-[9px] font-mono hover:text-white transition"
                >
                  Peak 2 (Drop)
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Component 3: Fertig-Trackstruktur-Generator (Post-Recording) */}
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20">
                  <Sparkles className="w-4 h-4 text-[#f59e0b]" />
                </span>
                <h3 className="font-display font-black text-xs tracking-widest text-white uppercase">
                  3. TRACKSTRUKTUR-GENERATOR &amp; SCHNITTE
                </h3>
              </div>
              <p className="font-sans text-[10px] text-gray-400 mt-1">
                Generiert vollständige Gain-Kurven, Strukturen und Längen-Varianten ohne simple Wiederholungen.
              </p>
            </div>

            {/* Length Switcher */}
            <div className="flex bg-black/60 p-1 rounded-xl border border-white/5 gap-1 font-mono text-[9px] font-bold">
              {[5, 8, 12].map(duration => (
                <button
                  key={duration}
                  onClick={() => {
                    setSelectedDuration(duration as any);
                    addLog('SYSTEM', 'success', `[ARRANGER] Trackstruktur auf ${duration} Minuten umgerechnet.`);
                  }}
                  className={`px-2.5 py-1 rounded transition uppercase ${
                    selectedDuration === duration 
                      ? 'bg-[#f59e0b] text-black font-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {duration} Min
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Block-Structure map of arrangement */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-gray-400">ARRANGEMENT-SKIZZE ({selectedDuration} MIN-VARIANTE - DEKONSTRUKTIONS-MODE)</span>
              <span className="text-[#f59e0b] font-bold">Tonart: {trackKey}</span>
            </div>

            {/* Generated Blocks Timeline */}
            <div className="grid grid-cols-12 gap-1.5 font-mono text-[9px] text-center">
              {currentArrangement.map((section, idx) => {
                // Approximate visual widths
                const colsSpan = section.name.includes('Drop') ? 'col-span-3' : section.name.includes('Intro') || section.name.includes('Outro') ? 'col-span-2' : 'col-span-2';
                return (
                  <div 
                    key={idx}
                    className={`${colsSpan} p-3 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.01]`}
                    style={{
                      backgroundColor: `rgba(245, 158, 11, ${section.energyLevel / 350 + 0.02})`,
                      borderColor: `rgba(245, 158, 11, ${section.energyLevel / 200 + 0.1})`
                    }}
                  >
                    <div className="font-bold text-gray-100 block truncate">{section.name.toUpperCase()}</div>
                    <div className="text-[7px] text-gray-400 block mt-0.5">Takt {section.startBar} ({section.durationBars}T)</div>
                    
                    {/* Tiny energy visualizer bar inside block */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                      <div className="h-full bg-[#f59e0b]" style={{ width: `${section.energyLevel}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linear Gain Curve graph overlay */}
            <div className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-2">
              <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Zusätzliche Motive &amp; Strukturelle Neuinterpretation (DJ-friendly deconstruction)</span>
              <div className="font-mono text-[9px] text-gray-300 space-y-1.5 leading-relaxed">
                <div>• <strong className="text-[#f59e0b]">Gain-Verlauf:</strong> Gain-Kurve voll-normalisiert auf <span className="text-emerald-400">-14 LUFS</span> (Streaming-Standard), mit 4% Intro-Ramp und 12% Outro-Fading.</div>
                <div>• <strong className="text-[#f59e0b]">Strukturelle Varianten:</strong> Anstelle einfacher Loop-Duplikationen erzeugt das System bei der <span className="text-[#f59e0b]">8m &amp; 12m Variante</span> dekonstruierte Remix-Sektionen (reine Sub-Bass &amp; Transient Motive), um DJs müheloses Weben im Mix zu erlauben.</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT: Stem Separators, Audio-to-MIDI & Weaving recommendations (4 Cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Component 4: Multi-Track-Recording und Stem-Extraktion */}
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Layers className="w-4 h-4 text-emerald-400" />
              </span>
              <h3 className="font-display font-black text-xs tracking-widest text-white uppercase">
                4. STEM-SEPARATION &amp; AUDIO-MIDI
              </h3>
            </div>
            <p className="font-sans text-[10px] text-gray-400 mt-1">
              Extrahiere Stems in Echtzeit aus FLAC/Spotify oder wandle in MIDI um.
            </p>
          </div>

          {/* Loader input */}
          <div className="space-y-2 text-left">
            <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Externe Song-Quelle laden (SpotiFLAC Analogie)</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={songUrl}
                onChange={(e) => setSongUrl(e.target.value)}
                placeholder="Spotify Link, FLAC oder lokaler Dateipfad..."
                className="flex-1 bg-black text-gray-200 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] font-mono focus:border-emerald-500 focus:outline-none"
              />
              <button 
                onClick={handleLoadExternalSong}
                disabled={isLoadingSong}
                className="px-3 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-30 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5"
              >
                {isLoadingSong ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Link className="w-3 h-3" />}
                Laden
              </button>
            </div>

            {isLoadingSong && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between font-mono text-[8px] text-gray-500">
                  <span>RUNNING DEMUCS HT-SEPARATION...</span>
                  <span>{separationProgress}%</span>
                </div>
                <div className="h-1 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-150" style={{ width: `${separationProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Stem Matrix */}
          <div className="space-y-2 font-mono text-[10px]">
            <span className="font-mono text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Extrahierte Stem-Mischerkanäle</span>
            {stemTracks.map((stem) => (
              <div key={stem.id} className="p-2 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded" style={{ backgroundColor: stem.color }} />
                  <div className="text-left">
                    <span className="text-gray-200 font-bold block text-[10px] truncate w-[130px]">{stem.name}</span>
                    <span className="text-gray-500 block text-[8px] uppercase">dB Level: {stem.peakDb}dB</span>
                  </div>
                </div>

                {/* Convert MIDI action */}
                <button
                  onClick={() => handleConvertAudioToMidi(stem.name)}
                  className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white rounded border border-white/5 text-[8px] uppercase font-bold transition"
                  title="Wandle Stem in MIDI Noten"
                >
                  To MIDI
                </button>
              </div>
            ))}
          </div>

          {/* MIDI Pitch-Tracking Wow Effect Slider */}
          <div className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between font-mono text-[8px] text-gray-500">
              <span className="font-bold">MIDI WOW-EFFEKT (SWING, HUMANIZATION, GLIDE)</span>
              <span className="text-emerald-400 font-bold">{wowEffect}%</span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              value={wowEffect}
              onChange={(e) => setWowEffect(parseInt(e.target.value))}
              className="w-full bg-zinc-800 accent-emerald-400 h-1 rounded-lg cursor-pointer"
            />
          </div>

          {/* Output representation of MIDI Conversion */}
          {midiConversionOutput && (
            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-left font-mono text-[8.5px] leading-relaxed text-emerald-400 whitespace-pre-wrap">
              {midiConversionOutput}
            </div>
          )}

        </div>

        {/* Component 5: Klangssymbiose-Orchestrierung */}
        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Music className="w-4 h-4 text-purple-400" />
              </span>
              <h3 className="font-display font-black text-xs tracking-widest text-white uppercase">
                5. KLANGSSYMBIOSE-ORCHESTRIERUNG
              </h3>
            </div>

            {/* Complexity Switch */}
            <div className="flex bg-black/60 p-0.5 rounded-lg border border-white/5 font-mono text-[8px] font-bold">
              <button 
                onClick={() => setComplexityLevel(1)}
                className={`px-1.5 py-0.5 rounded transition uppercase ${complexityLevel === 1 ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
              >
                Konkret (Lv 1)
              </button>
              <button 
                onClick={() => setComplexityLevel(2)}
                className={`px-1.5 py-0.5 rounded transition uppercase ${complexityLevel === 2 ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
              >
                Abstrakt (Lv 2)
              </button>
            </div>
          </div>

          {/* Complexity-Based suggestions */}
          <div className="space-y-3 text-left">
            {complexityLevel === 1 ? (
              <div className="space-y-2.5 font-mono text-[9px] text-gray-300">
                <span className="text-gray-500 block uppercase font-bold text-[8px]">Audio-Empfehlungen (Complexity Level 1):</span>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                  <div className="text-purple-400 font-bold">• PANNING-WEAVING AT 2.3s</div>
                  <p className="text-[8.5px] text-gray-400 leading-normal pl-2">
                    Bewege Synth-Stem 25% nach rechts, um dem zentrierten Vocals-Stem optimalen Frequenz-Platz zu geben.
                  </p>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                  <div className="text-purple-400 font-bold">• FILTER-SWEEP AT 44.0s</div>
                  <p className="text-[8.5px] text-gray-400 leading-normal pl-2">
                    Leite den Breakdown mit einem 2-Bar Hochpassfilter ein, um Energie vor dem Drop drastisch aufzubauen.
                  </p>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                  <div className="text-purple-400 font-bold">• REVERB LAYER AT 68.4s</div>
                  <p className="text-[8.5px] text-gray-400 leading-normal pl-2">
                    Füge dem Synthesizer-Lead am Zenith einen massiven algorithmischen Hallraum (Wet 45%) hinzu.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 font-mono text-[9px] text-gray-300">
                <span className="text-gray-500 block uppercase font-bold text-[8px]">Abstrakte Musikalische Anleitung (Complexity Level 2):</span>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                  <div className="text-purple-400 font-bold">• MODALE VERWECHSLUNG (D-Dorisch / D-Moll)</div>
                  <p className="text-[8.5px] text-gray-400 leading-normal pl-2">
                    Erzeuge harmonische Spannung, indem die Subdominante (G-Dur statt G-Moll) die helle dorische Note B (H) gezielt einführt.
                  </p>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                  <div className="text-purple-400 font-bold">• RHYTHMISCHE KOMPLEMENTARITÄT</div>
                  <p className="text-[8.5px] text-gray-400 leading-normal pl-2">
                    Platziere die Bass-Transienten exakt in den Sechzehntel-Pausen der Kickdrum, um Frequenzschlamm im Sub-Bereich zu verhindern.
                  </p>
                </div>
                <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5">
                  <div className="text-purple-400 font-bold">• OBERTONREIHEN-WEVING</div>
                  <p className="text-[8.5px] text-gray-400 leading-normal pl-2">
                    Triggere Sinus-Obertöne im Lead an den Quinten (D5 &amp; A5), um die natürliche Resonanz des Bass-Grundtons anzuheben.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Global Interactive Playback control bar */}
      <div className="lg:col-span-12 bg-black/80 rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleTogglePlayback}
            className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-widest transition flex items-center gap-2 ${
              isPlaying 
                ? 'bg-[#ff007f] text-white shadow-[0_0_15px_rgba(255,0,127,0.35)]' 
                : 'bg-[#00f0ff] text-black shadow-[0_0_15px_rgba(0,240,255,0.25)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" /> STOP TRACK
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> PLAY SYSTEM CLOCK
              </>
            )}
          </button>
          
          <div className="font-mono text-[10px]">
            <span className="text-gray-500 block">WORT-TEMPO CLOCK</span>
            <span className="text-white font-black">{bpm} BPM // SYNCED VIA OSC</span>
          </div>
        </div>

        {/* Global Progress Indicator */}
        <div className="flex-1 w-full md:w-auto flex items-center gap-4 px-2 md:px-8">
          <span className="font-mono text-[9px] text-gray-500">00:00</span>
          <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden relative border border-white/5">
            <div className="h-full bg-gradient-to-r from-[#00f0ff] to-[#ff007f]" style={{ width: `${playPosition}%` }} />
          </div>
          <span className="font-mono text-[9px] text-gray-500">{(selectedDuration * 60 * (playPosition / 100) / 60).toFixed(1)}m / {selectedDuration}:00m</span>
        </div>

        {/* Quick Save Trigger */}
        <button
          onClick={() => {
            addLog('SYSTEM', 'success', `🎉 [EXPORT] Track Blueprint "${selectedDuration} Min Symmetrie" erfolgreich als Ableton Live (.ALS) & FLAC exportiert.`);
          }}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white rounded-xl border border-white/5 font-mono text-[10px] uppercase font-bold transition flex items-center gap-1.5 shrink-0"
        >
          Blueprint Exportieren
        </button>
      </div>

    </div>
  );
}
