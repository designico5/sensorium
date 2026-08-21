# M1-audio-callback-latency

**Gate:** M1  
**Phase:** Zero-Latency Core  
**Skill:** `latency-critical-patterns` + `criterion`

## Capability Evals (pass@3)

### EVAL-001: Audio callback p99 latency
- **Scenario:** realtime audio thread, 1024-sample buffer
- **Action:** run `cargo bench --package sensorium-audio`
- **Expected:** p99 < 0.5ms
- **Verification:** Criterion report

### EVAL-002: No allocation in audio callback
- **Scenario:** process callback under valgrind/dhat
- **Action:** run `cargo bench ... --profile`
- **Expected:** zero heap allocations in process()
- **Verification:** dhat profile + Kani proof

## Regression Evals (pass^3)

### EVAL-R1: Kani proof audio callback no-panic
- **Scenario:** model-checked audio callback
- **Action:** `cargo kani --package sensorium-audio`
- **Expected:** proof passes
- **Verification:** CI green

## Blockers
- NIH-Plug process() implementation must be complete
- dhat integration must be available