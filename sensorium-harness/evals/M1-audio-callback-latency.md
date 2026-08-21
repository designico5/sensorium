# Eval Suite: M1 — Audio Callback Latency & Core Build

**Gate:** M1 (Ende Woche 2)  
**Eval-Typ:** Capability + Regression  
**pass@k:** 3, **pass^k:** 100%

## Capability Evals

### Eval M1-C1: Audio Callback Latenz
**Ziel:** Audio-Callback P99 < 0.5ms  
**Messmethode:** Criterion Benchmark (`cargo bench --package sensorium-audio`)  
**Grader:** Code-basiert (criterion output parsing)  
**Bestanden:** P99 ≤ 0.5ms über 10.000 Iterationen

### Eval M1-C2: MIDI 2.0 UMP Parse + Route
**Ziel:** Parse + Route < 10µs  
**Messmethode:** Criterion Benchmark + Property Test  
**Grader:** Code-basiert (nanosecond precision)  
**Bestanden:** P99 ≤ 10µs

### Eval M1-C3: VST3/CLAP/Standalone Build
**Ziel:** Alle 4 Targets bauen erfolgreich  
**Messmethode:** `cargo build --release --features vst3,clap,standalone,vizia`  
**Grader:** Code-basiert (Exit-Code + Binary-Existenz)  
**Bestanden:** 4/4 Targets vorhanden in `target/release/`

### Eval M1-C4: Kani Proof — Audio Callback
**Ziel:** Kein Panic, Keine Allokation im Audio-Callback  
**Messmethode:** `cargo kani --package sensorium-audio`  
**Grader:** Code-basiert (Kani-Exit-Code + Proof-Report)  
**Bestanden:** Alle Proofs verifiziert, 0 Fehler

### Eval M1-C5: WebTransport 0-RTT Reconnect
**Ziel:** Reconnect < 50ms  
**Messmethode:** Integrationstest (`cargo test --package sensorium-midi webtransport_0rtt`)  
**Grader:** Code-basiert (Test-Output-Parsing)  
**Bestanden:** P95 ≤ 50ms

## Regression Evals

### Eval M1-R1: Audio-Grundgerüst
**Ziel:** Bestehende NIH-Plug-Scaffold-Funktionalität bleibt intakt  
**Messmethode:** `cargo test --workspace`  
**Grader:** Code-basiert (Test-Suite Exit-Code)  
**Bestanden:** 0 Fehlschläge

### Eval M1-R2: Contract-Generierung
**Ziel:** Protobuf → Rust + TS Generierung stabil  
**Messmethode:** `npm run generate:types && cargo build`  
**Grader:** Code-basiert  
**Bestanden:** Build erfolgreich, `tsc --noEmit` erfolgreich

## Report-Format
```json
{
  "gate": "M1",
  "timestamp": "<ISO-8601>",
  "capability": {
    "C1": {"passed": true, "metric": "0.42ms"},
    "C2": {"passed": true, "metric": "8.2µs"},
    "C3": {"passed": true, "metric": "4/4"},
    "C4": {"passed": true, "metric": "0 errors"},
    "C5": {"passed": true, "metric": "38ms"}
  },
  "regression": {
    "R1": {"passed": true},
    "R2": {"passed": true}
  },
  "pass_at_k": 3,
  "pass_k": 100
}
```