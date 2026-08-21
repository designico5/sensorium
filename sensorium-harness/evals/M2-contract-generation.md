# Eval Suite: M2 — Type-Safe Contracts + Formal Verification

**Gate:** M2 (Ende Woche 3)  
**Eval-Typ:** Capability + Regression  
**pass@k:** 3, **pass^k:** 100%

## Capability Evals

### Eval M2-C1: Protobuf → Rust + TS Generierung
**Ziel:** Automatisierte Code-Generierung aus `.proto`-Dateien  
**Messmethode:** Build-Step + Type-Check  
**Grader:** Code-basiert  
**Bestanden:** Rust- und TS-Types generieren und kompilieren

### Eval M2-C2: Automerge State Sync
**Ziel:** Sync < 5ms (Local + Network)  
**Messmethode:** Criterion Benchmark + Integrationstest  
**Grader:** Code-basiert  
**Bestanden:** P99 ≤ 5ms

### Eval M2-C3: Yjs + WebTransport Sync im Browser
**Ziel:** Browser-seitige Synchronisation funktional  
**Messmethode:** Playwright E2E-Test  
**Grader:** Code-basiert (Test-Assertions)  
**Bestanden:** Sync innerhalb < 5ms, 0 Konflikte bei 3 gleichzeitigen Editoren

### Eval M2-C4: Kani/Prusti Hot Paths
**Ziel:** 100% der Hot-Path-Funktionen verifiziert  
**Messmethode:** `cargo kani` + `cargo prusti`  
**Grader:** Code-basiert (Abdeckungs-Report)  
**Bestanden:** Alle annotierten Funktionen verifiziert

### Eval M2-C5: Property Tests CRDT Merge
**Ziel:** Merge-Operationen korrekt unter Concurrency  
**Messmethode:** `cargo test --package sensorium-state -- property_tests`  
**Grader:** Code-basiert (QuickCheck/Proptest)  
**Bestanden:** pass@3 > 90%, 0 Fehler in 1000 zufälligen Testfällen

## Regression Evals

### Eval M2-R1: Contract Drift Test
**Ziel:** Provider Responses entsprechen dem Contract  
**Messmethode:** Contract-Comparison-Test-Suite  
**Grader:** Code-basiert  
**Bestanden:** 0 Drift-Detections

## Report-Format
```json
{
  "gate": "M2",
  "timestamp": "<ISO-8601>",
  "capability": {
    "C1": {"passed": true},
    "C2": {"passed": true, "metric": "4.2ms"},
    "C3": {"passed": true},
    "C4": {"passed": true, "coverage": "100%"},
    "C5": {"passed": true, "pass_at_3": "95%"}
  },
  "regression": {
    "R1": {"passed": true}
  },
  "pass_at_k": 3,
  "pass_k": 100
}
```