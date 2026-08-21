# Eval Suite: M4 — Resource-Optimal Scaling + O(1) Budget

**Gate:** M4 (Ende Woche 5)  
**Eval-Typ:** Capability + Regression  
**pass@k:** 3, **pass^k:** 100%

## Capability Evals

### Eval M4-C1: WebGPU Compute FFT
**Ziel:** FFT 4096 < 0.1ms GPU-Zeit  
**Messmethode:** GPU-Timestamp-Query + Criterion  
**Grader:** Code-basiert  
**Bestanden:** P99 ≤ 0.1ms

### Eval M4-C2: Visual Instanced Rendering
**Ziel:** 10.000 Nodes @ 60fps < 2ms GPU-Zeit  
**Messmethode:** GPU-Profiling (Renderdoc/Timestamp)  
**Grader:** Code-basiert  
**Bestanden:** GPU-Zeit ≤ 2ms pro Frame

### Eval M4-C3: WebTransport Concurrent Streams
**Ziel:** 1000 gleichzeitige Streams < 50MB RAM  
**Messmethode:** Load-Test (`oha`/` vegeta` ) + Memory-Profiling (dhat)  
**Grader:** Code-basiert  
**Bestanden:** RAM ≤ 50MB, 0 Stream-Fehler

### Eval M4-C4: Resource Budget O(1)
**Ziel:** O(1) Alloc/Dealloc Tracking, Zero Leaks  
**Messmethode:** dhat Heap-Profiling + Kani Proof  
**Grader:** Code-basiert  
**Bestanden:** Keine Heap-Allokationen im Hot Path, dhat meldet 0 Leaks

### Eval M4-C5: Auto-Degradation bei Pressure
**Ziel:** Graceful Quality Scaling bei Ressourcen-Engpass  
**Messmethode:** Chaos-Injektion (Memory Pressure, CPU Throttle)  
**Grader:** Code-basiert  
**Bestanden:** Qualität skaliert herunter, kein Crash, Audio läuft weiter

### Eval M4-C6: Memory Pool Arena
**Ziel:** Zero Alloc im Audio-Callback via Arena  
**Messmethode:** `bumpalo` + `slotmap` + Kani Proof  
**Grader:** Code-basiert  
**Bestanden:** Arena pro Frame, keine Fragmentierung

## Regression Evals

### Eval M4-R1: Audio-Latenz-Stabilität
**Ziel:** M1-Audio-Latenz bleibt unter 0.5ms trotz GPU-Last  
**Messmethode:** Paralleler GPU-Benchmark + Audio-Benchmark  
**Grader:** Code-basiert  
**Bestanden:** P99 ≤ 0.5ms auch unter GPU-Last

## Report-Format
```json
{
  "gate": "M4",
  "timestamp": "<ISO-8601>",
  "capability": {
    "C1": {"passed": true, "metric": "0.08ms"},
    "C2": {"passed": true, "metric": "1.6ms"},
    "C3": {"passed": true, "metric": "42MB"},
    "C4": {"passed": true, "leaks": 0},
    "C5": {"passed": true},
    "C6": {"passed": true}
  },
  "regression": {
    "R1": {"passed": true}
  },
  "pass_at_k": 3,
  "pass_k": 100
}
```