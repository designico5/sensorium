# M6-neural-morph-latency

**Gate:** M6  
**Phase:** Feature Implementation  
**Skill:** `candle-local-llm` + `wgpu-compute-audio`

## Capability Evals (pass@3)

### EVAL-001: RAVE latent interpolation < 10ms
- **Scenario:** morph between two latent codes
- **Action:** run candle inference on Metal/WebGPU
- **Expected:** interpolation + synthesis < 10ms
- **Verification:** Criterion bench

## Regression Evals (pass^3)

### EVAL-R1: Per-note expression roundtrip < 1ms
- **Scenario:** MIDI 2.0 per-note controller change
- **Action:** route through UMP parser + visual feedback
- **Expected:** visible feedback within 1ms on hardware testbench
- **Verification:** hardware loopback measurement

## Blockers
- RAVE model not yet integrated
- Hardware testbench not available in CI