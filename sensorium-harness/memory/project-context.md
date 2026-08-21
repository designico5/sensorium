# Sensorium Project Context

**Last Updated**: current harness session  
**Phase**: 0 - Foundation Bootstrap  
**Focus**: `sensorium-harness` only; `sensorium-v2/` excluded from this scope  

## Current State

### Completed
- [x] Harness structure created and stabilized (`sensorium-harness/`)
- [x] 8 specialist agent docs in `agents/`
- [x] 7 Gate eval suites in `evals/`
- [x] 8 phase workflow specs in `workflows/`
- [x] 4 quality gate scripts in `hooks/`
- [x] 6 GitHub Actions workflows in `ci/`
- [x] 6 contract artifacts in `specs/`
- [x] ADRs 001-006 in `memory/architecture-decisions/`
- [x] 3 learned patterns in `memory/learned-patterns/`
- [x] 9 Sensorium skills in `skills/`
- [x] Phase 0 plan in `plans/sensorium-phase0-bootstrap.md`

### Pending Execution
- [ ] Bootstrap workflow run
- [ ] First eval baseline for Gate M1
- [ ] CI workflow activation (`.github/workflows/`)
- [ ] Agent runtime registration

### Blockers
- None currently

## Technology Focus

| Area | Decision |
|------|----------|
| Audio Engine | NIH-Plug 0.8 (VST3/CLAP/Standalone/Vizia) |
| State Sync | Automerge 2.0 Rust + Yjs Web |
| Network | WebTransport/QUIC |
| Visual | wgpu Compute Shaders |
| Local AI | candle + llamafile |
| Verification | Kani + Prusti + Creusot |

## Gate Criteria Summary

| Gate | Key Criteria |
|------|--------------|
| M1 | Audio P99<0.5ms, MIDI<10µs, VST3/CLAP Build, Kani Proof, 0-RTT<50ms |
| M2 | Protobuf Gen, Automerge Sync<5ms, Yjs Sync, Kani/Prusti Hot Paths |
| M3 | Health>0.8, Prediction>30s, MTTR<500ms, 4 Sidecars |
| M4 | WebGPU FFT<0.1ms, 10k Nodes@60fps, O(1) Budget |
| M5 | llamafile<500ms, Hot Reload<200ms, cargo-dist Signed |
| M6 | MIDI 2.0 MPE, Session View Link, Neural Morph<10ms |
| M7 | 24h Soak, Chaos Pass, Formal 100%, Security 0 Crit, Signed Multi-Platform |

## Harness Files of Interest
- `plans/sensorium-phase0-bootstrap.md`
- `hooks/eval-runner.sh`
- `hooks/ci-gate-checks.sh`
- `ci/verify.yml`
- `skills/*/SKILL.md`
- `evals/M1-audio-callback-latency.md`