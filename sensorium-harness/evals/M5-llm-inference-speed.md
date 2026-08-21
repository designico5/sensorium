# Eval Suite: M5 — Developer Velocity + Eval-Driven

**Gate:** M5 (Ende Woche 6)  
**Eval-Typ:** Capability + Regression  
**pass@k:** 3, **pass^k:** 100%

## Capability Evals

### Eval M5-C1: llamafile Inferenzgeschwindigkeit
**Ziel:** First Token < 500ms, RAM < 100MB  
**Messmethode:** `cargo bench --package sensorium-ai` + Memory-Profiling  
**Grader:** Code-basiert  
**Bestanden:** First Token ≤ 500ms, Peak RAM ≤ 100MB

### Eval M5-C2: Hot Reload
**Ziel:** Rust < 2s, TypeScript < 200ms  
**Messmethode:** `cargo-watch` + Vite HMR Messung  
**Grader:** Code-basiert (File-Change → Rebuild-Zeit)  
**Bestanden:** Rust ≤ 2s, TS ≤ 200ms

### Eval M5-C3: cargo-dist Signed Releases
**Ziel:** Signierte Releases für Linux/Win/Mac/iOS/Android  
**Messmethode:** CI-Workflow `release.yml` Ausgabe  
**Grader:** Code-basiert (Signature-Prüfung)  
**Bestanden:** Alle Plattformen signiert, CI grün

### Eval M5-C4: REPL Live Parameter Tweaking
**Ziel:** Live-Parameter-Änderung im laufenden System  
**Messmethode:** `evcxr` REPL + Integrationstest  
**Grader:** Code-basiert  
**Bestanden:** Parameteränderung hörbar/ sichtbar < 100ms

### Eval M5-C5: SBOM + Provenance Auto
**Ziel:** Automatisierte SBOM- und Provenance-Generierung  
**Messmethode:** CI-Workflow `security.yml` Artefakte  
**Grader:** Code-basiert (Syft + SLSA Output)  
**Bestanden:** SBOM.json + Provenance existieren, gültig

### Eval M5-C6: Skills Complete
**Ziel:** Alle 9 Sensorium-Skills geschrieben + versioniert  
**Messmethode:** `ls sensorium-harness/skills/*/SKILL.md`  
**Grader:** Code-basiert  
**Bestanden:** 9 Skills vorhanden, jede mit vollständigem Inhalt

## Regression Evals

### Eval M5-R1: Eval Harness pass@k
**Ziel:** pass@3 > 90% für alle M1-M5 Capability Evals  
**Messmethode:** `./hooks/eval-runner.sh report M1..M5`  
**Grader:** Code-basiert  
**Bestanden:** Aggregierte pass@3 ≥ 90%

## Report-Format
```json
{
  "gate": "M5",
  "timestamp": "<ISO-8601>",
  "capability": {
    "C1": {"passed": true, "metric": "420ms/78MB"},
    "C2": {"passed": true, "metric": "1.8s/180ms"},
    "C3": {"passed": true},
    "C4": {"passed": true},
    "C5": {"passed": true},
    "C6": {"passed": true, "count": 9}
  },
  "regression": {
    "R1": {"passed": true, "aggregate_pass_at_3": "94%"}
  },
  "pass_at_k": 3,
  "pass_k": 100
}
```