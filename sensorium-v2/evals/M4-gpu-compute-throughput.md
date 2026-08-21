# M4-gpu-compute-throughput

**Gate:** M4  
**Phase:** Resource-Optimal Scaling  
**Skill:** `wgpu-compute-audio` + `latency-critical-patterns`

## Capability Evals (pass@3)

### EVAL-001: WebGPU FFT 4096 < 0.1ms
- **Scenario:** GPU compute shader on 4096-point FFT
- **Action:** run `cargo bench --package sensorium-visual`
- **Expected:** GPU time < 100µs
- **Verification:** Criterion bench + wgpu timestamp query

## Regression Evals (pass^3)

### EVAL-R1: Zero audio alloc in compute hot path
- **Scenario:** audio thread drives GPU upload every block
- **Action:** profile with dhat
- **Expected:** zero heap allocations in hot path
- **Verification:** dhat profile + Kani proof

## Blockers
- wgpu compute pipeline must be implemented
- dhat integration required