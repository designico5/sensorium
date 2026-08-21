# M5-llm-inference-speed

**Gate:** M5  
**Phase:** Developer Velocity  
**Skill:** `candle-local-llm` + `latency-critical-patterns`

## Capability Evals (pass@3)

### EVAL-001: llamafile first token < 500ms
- **Scenario:** load Q4_K_M model and generate first token
- **Action:** run benchmark against local llamafile binary
- **Expected:** p50 < 500ms, memory < 100MB
- **Verification:** automated node script + memory tracker

## Regression Evals (pass^3)

### EVAL-R1: Hot reload < 2s for Rust + < 200ms for TS
- **Scenario:** edit a source file and wait for rebuild
- **Action:** cargo-watch / vite HMR
- **Expected:** rust rebuild < 2s, TS < 200ms
- **Verification:** time measurement script

## Blockers
- llamafile binary not bundled in Phase 0