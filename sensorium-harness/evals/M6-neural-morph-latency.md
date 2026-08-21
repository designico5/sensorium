# Eval Suite: M6 — Live Performance Features

**Gate:** M6 (Ende Woche 9)  
**Eval-Typ:** Capability + Regression  
**pass@k:** 3, **pass^k:** 100%

## Capability Evals

### Eval M6-C1: MIDI 2.0 MPE + Per-Note Expression
**Ziel:** Funktional mit Hardware (Push 3, Launchpad)  
**Messmethode:** Hardware-Test + Property Test  
**Grader:** Code-basiert + Human-in-Loop (Signed-Off)  
**Bestanden:** Per-Note Expression hörbar, MPE korrekt geroutet

### Eval M6-C2: Session View + Ableton Link Sync
**Ziel:** Clip/Scene-Launcher mit quantisierter Auslösung  
**Messmethode:** Integrationstest + Link-Sync-Messung  
**Grader:** Code-basiert  
**Bestanden:** Follow Actions korrekt, Link-Sync < 1ms Drift

### Eval M6-C3: Neural Morph RAVE Latent Space Interpolation
**Ziel:** Interpolation < 10ms  
**Messmethode:** `candle`-Pipeline Benchmark  
**Grader:** Code-basiert  
**Bestanden:** P99 ≤ 10ms für 128-dim Latent-Interpolation

### Eval M6-C4: Performance Mode Stage-Ready
**Ziel:** Sonnenlicht, Schweiß, Handschuhe getestet  
**Messmethode:** UX-Test-Szenario + Accessibility Audit  
**Grader:** Human-in-Loop (Signed-Off)  
**Bestanden:** Alle Touch-Targets ≥ 80px,High-Contrast-Mode aktiv

### Eval M6-C5: Dual Screen Sync
**Ziel:** Performer View + Audience View synchron via SharedArrayBuffer + WebGPU  
**Messmethode:** E2E-Test mit zwei Render-Targets  
**Grader:** Code-basiert  
**Bestanden:** Frame-Drift < 1 Frame, 0 Tearing

### Eval M6-C6: Panic Button
**Ziel:** < 1ms All Notes Off + CC Reset  
**Messmethode:** Hardware-Trigger + Zeitmessung  
**Grader:** Code-basiert (GPIO/OSC-Trigger → MIDI-Output)  
**Bestanden:** Hardware + Software < 1ms

## Regression Evals

### Eval M6-R1: M1-M5 Eval-Suite
**Ziel:** Keine Regression in vorherigen Gates  
**Messmethode:** `./hooks/eval-runner.sh regression M1..M5`  
**Grader:** Code-basiert  
**Bestanden:** pass^3 = 100% für alle Regression Evals

## Report-Format
```json
{
  "gate": "M6",
  "timestamp": "<ISO-8601>",
  "capability": {
    "C1": {"passed": true, "hardware_tested": ["Push 3", "Launchpad"]},
    "C2": {"passed": true, "drift_ms": 0.3},
    "C3": {"passed": true, "metric": "8.2ms"},
    "C4": {"passed": true},
    "C5": {"passed": true, "drift_frames": 0},
    "C6": {"passed": true, "metric": "0.6ms"}
  },
  "regression": {
    "R1": {"passed": true, "pass_cubed": "100%"}
  },
  "pass_at_k": 3,
  "pass_k": 100
}
```