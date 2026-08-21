# Eval Suite: M3 — Self-Healing Resilience + Autonomous Agents

**Gate:** M3 (Ende Woche 4)  
**Eval-Typ:** Capability + Regression  
**pass@k:** 3, **pass^k:** 100%

## Capability Evals

### Eval M3-C1: Health Assessor
**Ziel:** Health-Score > 0.8 bei Normalbetrieb  
**Messmethode:** OpenTelemetry-Metriken + Dashboard-Export  
**Grader:** Code-basiert (Metrik-Aggregation)  
**Bestanden:** Mittelwert > 0.8 über 10min Baseline

### Eval M3-C2: Failure Prediction
**Ziel:** Prediction Horizon > 30s, Precision > 80%  
**Messmethode:** Chaos-Test mit voraufgezeichneten Failure-Szenarien  
**Grader:** Code-basiert (Isolation Forest Inference)  
**Bestanden:** Precision ≥ 80%, Recall ≥ 70%, Horizon ≥ 30s

### Eval M3-C3: Remediation MTTR
**Ziel:** MTTR < 500ms (Audio), < 100ms (MIDI)  
**Messmethode:** Chaos-Engineering-Injektion + Zeitmessung  
**Grader:** Code-basiert (Zeitstempel-Diff)  
**Bestanden:** P95 MTTR unter Limits

### Eval M3-C4: Supervisor + 4 Sidecars
**Ziel:** Supervisor verwaltet 4 Sidecars (Audio, Visual, MIDI, Network)  
**Messmethode:** Integrationstest (Prozess-Lifecycle)  
**Grader:** Code-basiert  
**Bestanden:** Alle Sidecars gestartet, überwacht, neugestartet

### Eval M3-C5: Automerge Repo Offline-First
**Ziel:** Offline-First, Conflict-Free, Binary Format  
**Messmethode:** Simulierte Network-Partition + Reconnect  
**Grader:** Code-basiert  
**Bestanden:** Keine Conflicts, Sync nach Reconnect < 50ms

### Eval M3-C6: Autonomous Agent PR Review
**Ziel:** PR Review + Merge Decision ohne Human  
**Messmethode:** Simulierter PR mit Known-Issue  
**Grader:** Code-basiert (Agent-Entscheidungs-Log)  
**Bestanden:** Korrekte Review-Entscheidung (Approve/Reject)

## Regression Evals

### Eval M3-R1: Sidecar-Isolation
**Ziel:** Sidecar-Absturz beeinträchtigt nicht Hauptprozess  
**Messmethode:** Chaos-Injektion (Kill Sidecar)  
**Grader:** Code-basiert  
**Bestanden:** Hauptprozess überlebt, Sidecar neugestartet

## Report-Format
```json
{
  "gate": "M3",
  "timestamp": "<ISO-8601>",
  "capability": {
    "C1": {"passed": true, "metric": "0.85"},
    "C2": {"passed": true, "metric": "35s, 82%"},
    "C3": {"passed": true, "metric": "420ms/85ms"},
    "C4": {"passed": true},
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