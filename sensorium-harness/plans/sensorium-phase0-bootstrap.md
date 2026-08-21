# Sensorium Phase 0: Foundation Bootstrap Plan

**Objective**: sensorium-v2 foundation bootstrap with nih-plug, automerge, webtransport, formal verification, eval harness

**Generated**: 2026-08-20 | **Blueprint Version**: 5-phase pipeline | **Mode**: Direct (no git/gh detected)

---

## Phase Overview

| Step | Title | Dependencies | Parallel | Model Tier | Est. Time |
|------|-------|--------------|----------|------------|-----------|
| 1 | Harness Skeleton + Memory Init | — | — | Default | 15 min |
| 2 | Blueprint this Plan | 1 | — | Strongest | 30 min |
| 3 | ADR Templates + Architecture Decisions | 1 | — | Default | 30 min |
| 4 | Monorepo Setup (Cargo + npm + Turborepo) | 1 | — | Default | 1 hr |
| 5 | NIH-Plug Scaffold (VST3/CLAP/Standalone/Vizia) | 4 | — | Default | 2 hr |
| 6 | Automerge 2.0 + Yjs + automerge-repo | 4 | 5 | Default | 2 hr |
| 7 | WebTransport/QUIC Server + Client | 4 | 5 | Default | 2 hr |
| 8 | CI with Formal Verification (Kani/Prusti/Creusot) | 4 | — | Strongest | 1 hr |
| 9 | Contract Artifacts (Protobuf + OpenAPI) | 4 | 6 | Default | 1 hr |
| 10 | Eval Harness Setup + Gate M1 Definitions | 1,8 | — | Default | 1 hr |
| 11 | First Benchmarks + Eval Run (Gate M1 Baseline) | 5,7,8,10 | — | Default | 2 hr |

**Total**: ~13.5 hours | **Parallel Groups**: {5,6,7}, {8,9,10}

---

## Step 1: Harness Skeleton + Memory Init

### Context Brief
Initialize the agent harness directory structure and memory system for cross-session persistence.

### Task List
- [ ] Create `sensorium-harness/{agents,skills,evals,workflows,memory,hooks,ci,specs}`
- [ ] Create `memory/architecture-decisions/` and `memory/learned-patterns/`
- [ ] Initialize `memory/project-context.md` with current state
- [ ] Link 9 ECC skills to `skills/` directory

### Verification Commands
```bash
ls -la sensorium-harness/
ls -la sensorium-harness/skills/
cat sensorium-harness/memory/project-context.md
```

### Exit Criteria
- All directories exist
- 9 ECC skills symlinked
- project-context.md documents current decisions

---

## Step 2: Blueprint This Plan

### Context Brief
Run the blueprint skill to generate this self-contained plan with adversarial review.

### Task List
- [ ] Execute blueprint skill with objective
- [ ] Review generated plan for completeness
- [ ] Save to `plans/sensorium-phase0-bootstrap.md`

### Verification Commands
```bash
cat plans/sensorium-phase0-bootstrap.md
```

### Exit Criteria
- Plan file exists with all 11 steps
- Each step has context brief, tasks, verification, exit criteria
- Adversarial review passed (no critical gaps)

---

## Step 3: ADR Templates + Architecture Decisions

### Context Brief
Create Architecture Decision Record templates and document the 6 foundational ADRs.

### Task List
- [ ] Create `memory/architecture-decisions/template.md`
- [ ] Write ADR 001: NIH-Plug Audio Engine
- [ ] Write ADR 002: Automerge State Sync
- [ ] Write ADR 003: WebTransport MIDI 2.0
- [ ] Write ADR 004: WebGPU Compute DSP
- [ ] Write ADR 005: llamafile Local AI
- [ ] Write ADR 006: Formal Verification Strategy

### Verification Commands
```bash
ls -la sensorium-harness/memory/architecture-decisions/
head -50 sensorium-harness/memory/architecture-decisions/001-nih-plug-audio-engine.md
```

### Exit Criteria
- 6 ADRs written with status=accepted
- Template follows standard format
- All reference skills/tech from planning agenda

---

## Step 4: Monorepo Setup (Cargo + npm + Turborepo)

### Context Brief
Create the sensorium-v2 monorepo with Rust workspace, npm workspaces, and Turborepo orchestration.

### Task List
- [ ] Create `sensorium-v2/` root with `Cargo.toml` workspace
- [ ] Define workspace dependencies (nih-plug, automerge, quinn, wgpu, candle, kani, etc.)
- [ ] Create `packages/` for frontend (React + TypeScript + Vite)
- [ ] Configure `turbo.json` for build/test/lint pipelines
- [ ] Set up `package.json` with npm workspaces
- [ ] Configure Tauri 2.0 in `src-tauri/`

### Verification Commands
```bash
cd sensorium-v2 && cargo check --workspace
cd sensorium-v2 && npm install
cd sensorium-v2 && npx turbo run build
```

### Exit Criteria
- `cargo check --workspace` passes
- `npm install` completes without errors
- `turbo run build` executes all packages
- Tauri 2.0 config valid

---

## Step 5: NIH-Plug Scaffold (VST3/CLAP/Standalone/Vizia)

### Context Brief
Scaffold the audio plugin crate using NIH-Plug 0.8 with all four targets.

### Task List
- [ ] `cargo new --lib crates/sensorium-plugin`
- [ ] Configure `Cargo.toml` with nih-plug features: vst3, clap, standalone, vizia
- [ ] Implement `Plugin` trait with `SensoriumParams`
- [ ] Create Vizia editor with parameter controls
- [ ] Build fundsp DSP graph (filter + reverb + gain)
- [ ] Add rubato resampler for sample rate conversion
- [ ] Implement lock-free ringbuf for audio→GUI communication

### Verification Commands
```bash
cd sensorium-v2 && cargo build --release --features vst3,clap,standalone,vizia
# Verify outputs:
ls -la target/release/*.so    # VST3 (Linux)
ls -la target/release/*.clap  # CLAP
ls -la target/release/sensorium  # Standalone
```

### Exit Criteria
- All 4 targets build successfully
- Standalone runs and produces audio
- VST3/CLAP pass `nih-plug` validation
- No warnings in release build

---

## Step 6: Automerge 2.0 + Yjs + automerge-repo

### Context Brief
Set up CRDT state synchronization with Rust backend and Web frontend.

### Task List
- [ ] Add `automerge@2.0` with wasm, serde, bytes features
- [ ] Add `automerge-repo@2.0` with SqliteStorage + WebTransportBackend
- [ ] Define shared document schema (Tracks, Clips, Settings)
- [ ] Implement binary encoding/decoding
- [ ] Set up Yjs 13.6 + y-webtransport in frontend
- [ ] Create sync test: Rust repo ↔ Browser Yjs

### Verification Commands
```bash
cd sensorium-v2 && cargo build --package sensorium-state --features wasm
cd sensorium-v2 && cargo test --package sensorium-state -- offline_sync_test
# Frontend:
cd sensorium-v2/packages/frontend && npm run test:sync
```

### Exit Criteria
- Rust backend creates/loads Automerge docs
- Binary format works (save/load roundtrip)
- Yjs client connects via WebTransport
- Offline edits sync on reconnect
- No conflicts in concurrent edit test

---

## Step 7: WebTransport/QUIC Server + Client

### Context Brief
Implement MIDI 2.0 UMP over WebTransport with 0-RTT and stream multiplexing.

### Task List
- [ ] Create `crates/sensorium-midi` with quinn 0.11 + webtransport 0.12
- [ ] Implement UMP 1.1 packet parser (32/64/96/128-bit)
- [ ] Build QUIC server with TLS 1.3, stream prioritization
- [ ] Implement 0-RTT session ticket persistence
- [ ] Create browser client with WebTransport API
- [ ] Add WebSocket fallback for compatibility

### Verification Commands
```bash
cd sensorium-v2 && cargo build --release --package sensorium-midi
cd sensorium-v2 && cargo test --package sensorium-midi -- webtransport_integration
cd sensorium-v2 && cargo bench --package sensorium-midi -- bench_0rtt_reconnect
```

### Exit Criteria
- Server accepts WebTransport connections
- UMP packets parse/route < 10µs (benchmark)
- 0-RTT reconnect < 50ms measured
- Browser client sends/receives MIDI
- WebSocket fallback works when QUIC blocked

---

## Step 8: CI with Formal Verification (Kani/Prusti/Creusot)

### Context Brief
Configure GitHub Actions with formal verification gates for audio thread.

### Task List
- [ ] Create `.github/workflows/verify.yml`
- [ ] Add Kani model checking job (audio callback proofs)
- [ ] Add Prusti deductive verification job (hot paths)
- [ ] Add Creusot job (FFT/DSP lemmas)
- [ ] Add property-based testing (proptest)
- [ ] Configure gates: fail PR if any verification fails

### Verification Commands
```bash
# Local verification
cd sensorium-v2 && cargo kani --package sensorium-audio --features verification
cd sensorium-v2 && cargo prusti --package sensorium-audio --features verification
cd sensorium-v2 && cargo creusot --package sensorium-audio --features verification
```

### Exit Criteria
- All 3 verification tools run in CI
- Kani proves: no panic, no alloc, bounds OK
- Prusti verifies: parameter bounds, ringbuf invariants
- Creusot proves: DSP energy conservation
- PR blocked if any proof fails

---

## Step 9: Contract Artifacts (Protobuf + OpenAPI)

### Context Brief
Define canonical contracts for all service boundaries with code generation.

### Task List
- [ ] Create `specs/audio-engine.proto` (AudioCallback, Parameter, Transport)
- [ ] Create `specs/midi-2.0.proto` (UMP Messages, Per-Note Expression)
- [ ] Create `specs/state-sync.proto` (Automerge Ops, Sync Messages)
- [ ] Create `specs/visual-engine.proto` (Render Commands, GPU Buffers)
- [ ] Create `specs/local-ai.proto` (Inference Requests, Function Calling)
- [ ] Create `specs/openapi.yaml` (REST API for Web Dashboard)
- [ ] Configure `prost` + `tonic` build.rs for Rust codegen
- [ ] Configure `ts-proto` for TypeScript generation

### Verification Commands
```bash
cd sensorium-v2 && cargo build --package sensorium-proto
cd sensorium-v2/packages/frontend && npm run generate:types
cd sensorium-v2 && cargo test --package sensorium-proto -- contract_validation
```

### Exit Criteria
- All 6 .proto files define complete contracts
- Rust types generate and compile
- TypeScript types generate and pass `tsc --noEmit`
- Contract drift test passes (provider = contract)

---

## Step 10: Eval Harness Setup + Gate M1 Definitions

### Context Brief
Initialize eval-driven development framework with M1 capability/regression evals.

### Task List
- [ ] Create `.claude/evals/` directory structure
- [ ] Write `M1-audio-callback-latency.md` (5 capability evals)
- [ ] Write `M1-regression.md` (previous gate placeholder)
- [ ] Create `hooks/eval-runner.sh` with code-based graders
- [ ] Define pass@k tracking in Rust
- [ ] Configure `.github/workflows/eval.yml`

### Verification Commands
```bash
./hooks/eval-runner.sh M1 capability
./hooks/eval-runner.sh M1 regression
./hooks/eval-runner.sh M1 report
cat eval-reports/M1/report.md
```

### Exit Criteria
- Eval runner executes all M1 capability evals
- Code-based graders work (criterion, kani, cargo build)
- Report generates with pass@k metrics
- CI workflow triggers on gate dispatch

---

## Step 11: First Benchmarks + Eval Run (Gate M1 Baseline)

### Context Brief
Establish baseline measurements for Gate M1 criteria.

### Task List
- [ ] Run criterion benchmarks for audio callback (p50/p95/p99)
- [ ] Benchmark MIDI UMP parse+route latency
- [ ] Measure VST3/CLAP/Standalone build times
- [ ] Run Kani proofs, record proof time
- [ ] Test WebTransport 0-RTT reconnect latency
- [ ] Execute full M1 eval suite
- [ ] Record baseline metrics in `eval-reports/M1/baseline.json`

### Verification Commands
```bash
cd sensorium-v2 && cargo bench --package sensorium-audio
cd sensorium-v2 && cargo bench --package sensorium-midi
./hooks/eval-runner.sh M1 capability
./hooks/eval-runner.sh M1 report
```

### Exit Criteria
- Audio callback p99 measured (target: < 0.5ms)
- MIDI parse+route p99 measured (target: < 10µs)
- All 4 plugin targets build
- Kani proofs pass
- 0-RTT reconnect measured (target: < 50ms)
- M1 eval report: pass@3 = 100% (baseline)

---

## Rollback Strategies

| Step | Rollback Action |
|------|-----------------|
| 4 | Delete `sensorium-v2/`, restart from Step 4 |
| 5 | `cargo clean`, revert `crates/sensorium-plugin/` to scaffold |
| 6 | Revert `Cargo.toml` deps, delete `crates/sensorium-state/` |
| 7 | Revert `Cargo.toml` deps, delete `crates/sensorium-midi/` |
| 8 | Remove verification jobs from CI, keep standard test job |
| 9 | Delete `specs/`, remove build.rs codegen |
| 10 | Delete `.claude/evals/`, `hooks/eval-runner.sh` |
| 11 | N/A (measurement only) |

---

## Success Metrics Summary

| Metric | Target | Measurement |
|--------|--------|-------------|
| Audio Callback p99 | < 0.5ms | Criterion benchmark |
| MIDI Parse+Route p99 | < 10µs | Criterion benchmark |
| Plugin Build | 4/4 targets | `cargo build --release` |
| Kani Proofs | 100% pass | `cargo kani` |
| 0-RTT Reconnect | < 50ms | Integration test |
| Eval pass@3 (M1) | 100% | `eval-runner.sh M1` |

---

## Next Phase Dependencies

Phase 1 (Zero-Latency Core) requires:
- ✅ NIH-Plug plugin building (Step 5)
- ✅ Automerge sync working (Step 6)
- ✅ WebTransport MIDI functional (Step 7)
- ✅ Formal verification CI green (Step 8)
- ✅ Contracts generated (Step 9)
- ✅ Eval harness operational (Step 10)
- ✅ M1 baseline established (Step 11)