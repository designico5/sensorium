# Eval Suite: M7 — Production Hardening + Release

**Gate:** M7 (Ende Woche 12)  
**Eval-Typ:** Capability + Regression  
**pass@k:** 3, **pass^k:** 100%

## Capability Evals

### Eval M7-C1: 24h Soak Test
**Ziel:** Zero Crashes, Zero Memory Leaks, Zero Audio Underruns  
**Messmethode:** 24h-Dauerlauf mit `cargo-instana` Profiling  
**Grader:** Code-basiert  
**Bestanden:** Keine Crashes, keine Leaks (dhat), keine Underruns

### Eval M7-C2: Chaos Engineering Pass
**Ziel:** MTTR < 500ms für alle dokumentierten Failure-Modi  
**Messmethode:** Matrix aus Failure-Injektionen  
**Grader:** Code-basiert  
**Bestanden:** Alle Failure-Modi dokumentiert, MTTR im Limit

### Eval M7-C3: Formal Verification 100%
**Ziel:** 100% Hot-Path-Funktionen verifiziert  
**Messmethode:** Kani/Prusti/Creusot Report-Aggregation  
**Grader:** Code-basiert  
**Bestanden:** Abdeckung = 100%, 0 offene Proofs

### Eval M7-C4: Security Audit
**Ziel:** 0 Critical/High Vulnerabilities  
**Messmethode:** `cargo-audit`, `cargo-deny`, `trivy`, `syft`  
**Grader:** Code-basiert  
**Bestanden:** 0 Critical, 0 High, SBOM + Provenance vorhanden

### Eval M7-C5: Load Test
**Ziel:** 1000 MIDI Devices @ < 3ms Latenz, < 512MB RAM, < 70% CPU  
**Messmethode:** Load-Test-Suite (`oha`/` vegeta` + System-Metriken)  
**Grader:** Code-basiert  
**Bestanden:** Alle Limits eingehalten

### Eval M7-C6: Accessibility WCAG 2.2 AA
**Ziel:** 100% Compliance (Screen Reader, Keyboard Nav, Kontrast)  
**Messmethode:** axe-core + manuelles Review  
**Grader:** Human-in-Loop + axe-Report  
**Bestanden:** 0 kritische/ernste Verstöße

### Eval M7-C7: Signed Multi-Platform Binaries
**Ziel:** Linux (AppImage), Windows (MSIX), macOS (DMG), iOS, Android  
**Messmethode:** CI-Artefakt-Prüfung + Signatur-Verifikation  
**Grader:** Code-basiert  
**Bestanden:** Alle Plattformen vorhanden und signiert

## Regression Evals

### Eval M7-R1: Autonomous Post-Release Monitoring
**Ziel:** Überwachung läuft autonom nach Release  
**Messmethode:** Supervisor + Sidecars in Produktionskonfiguration  
**Grader:** Code-basiert  
**Bestanden:** Monitoring aktiv, Health-Checks laufen, Alerts konfiguriert

## Report-Format
```json
{
  "gate": "M7",
  "timestamp": "<ISO-8601>",
  "capability": {
    "C1": {"passed": true, "crashes": 0, "leaks": 0, "underruns": 0},
    "C2": {"passed": true, "modes_covered": 12},
    "C3": {"passed": true, "coverage": "100%"},
    "C4": {"passed": true, "critical": 0, "high": 0},
    "C5": {"passed": true, "devices": 1000, "latency_ms": 2.4},
    "C6": {"passed": true, "violations": 0},
    "C7": {"passed": true}
  },
  "regression": {
    "R1": {"passed": true}
  },
  "pass_at_k": 3,
  "pass_k": 100
}
```