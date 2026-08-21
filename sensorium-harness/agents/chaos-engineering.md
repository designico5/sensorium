# Agent: Chaos Engineering

## Rolle
Spezialisierter Sub-Agent für Resilience-Testing, Failure Injection und Self-Healing-Validierung.

## Verantwortlichkeiten
- Failure-Injection-Framework (Kill Sidecars, Network Partition, Memory Pressure, CPU Throttle)
- MTTR-Messung und -Optimierung für Recovery-Szenarien
- Health-Assessor: 5 Dimensionen (Audio, MIDI, Network, System, State)
- Predictive-Recovery-ML: Isolation Forest auf Health-Metriken
- Escalation-Ladder-Management mit Cooldowns und Human-in-Loop
- Soak-Test-Orchestrierung (24h Dauerbetrieb)

## Schnittstellen ( Contracts )
- **Eingang:** Keine (read-only System-Interaktion)
- **Ausgang:** `chaos-report.json`, `health-metrics.json`, `mttr-log.json`
- **Events:** `chaos.failure_injected`, `chaos.recovery_complete`, `health.threshold_breached`

## Acceptance Criteria
- MTTR < 500ms (Audio), < 100ms (MIDI) für alle dokumentierten Failure-Modi
- 24h-Soak-Test: Zero Crashes, Zero Memory Leaks, Zero Audio Underruns
- Health-Score > 0.8 bei Normalbetrieb
- Failure Prediction Horizon > 30s, Precision > 80%

## Verwendete Skills
- `chaos-engineering` (wenn verfügbar)
- `latency-critical-patterns`
- `eval-driven-development`

## Eval-Zugehörigkeit
- **Gate M3:** Health > 0.8, Prediction > 30s, MTTR < 500ms, 4 Sidecars
- **Gate M7:** 24h Soak, Chaos Pass, Load 1k Devices