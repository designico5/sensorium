# M3-health-prediction

**Gate:** M3  
**Phase:** Self-Healing Resilience  
**Skill:** `autonomous-agent-harness` + `chaos-engineering`

## Capability Evals (pass@3)

### EVAL-001: Health dimensions return values in [0,1]
- **Scenario:** supervisor queries all dimensions
- **Action:** run health assessor
- **Expected:** all dimensions >= 0 and <= 1
- **Verification:** automated test

## Regression Evals (pass^3)

### EVAL-R1: MTTR < 500ms after sidecar kill
- **Scenario:** chaos test kills audio sidecar
- **Action:** supervisor restarts sidecar
- **Expected:** restart completes within 500ms
- **Verification:** chaos.yml workflow

## Blockers
- Supervisor + sidecars must be implemented
- OpenTelemetry metrics must be wired