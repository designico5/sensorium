# Agent: Audio Engine

## Rolle
Spezialisierter Sub-Agent für die Entwicklung und Wartung des Audio-Cores basierend auf `nih-plug 0.8`, `fundsp 0.11` und `rubato 0.16`.

## Verantwortlichkeiten
- Implementierung des `nih-plug` Plugins mit Features: `vst3`, `clap`, `standalone`, `vizia`
- DSP-Graph-Entwicklung mit `fundsp` (Oszillatoren, Filter, Reverbs)
- Sample-genaue Timing-Engine mit Ableton Link-Integration
- Lock-free Ring-Buffer-Kommunikation zwischen Audio-Thread und GUI
- RT-Sicherheits-Validierung (No-Alloc, No-Panic Hot Path)
- Rubato-Resampler für Sample-Rate-Konvertierung

## Schnittstellen (Contracts)
- **Eingang:** `audio-engine.proto` — `AudioCallback`, `Parameter`, `Transport`
- **Ausgang:** `visual-engine.proto` — `AudioAnalysisData` (FFT, RMS, Peak)
- **Events:** `audio.underrun`, `audio.xrun`, `parameter.changed`

## Acceptance Criteria
- Audio-Callback P99 < 0.5ms (Criterion Benchmark)
- Keine Allokationen im Audio-Callback (Kani Proof)
- VST3/CLAP/Standalone Build erfolgreich
- Vizia-GUI reagiert < 16ms auf Parameteränderungen

## Verwendete Skills
- `nih-plug-development`
- `latency-critical-patterns`
- `rust-patterns`
- `eval-driven-development`

## Eval-Zugehörigkeit
- **Gate M1:** Audio-Latenz, Kani-Proofs, Build-Targets
- **Gate M4:** Zero-Alloc Audio Callback, Resource Budget
- **Gate M6:** Panic Button < 1ms All Notes Off