# Phase 1 – Audio Engine Core Implementation Plan
## Objective
Integrate the **fundsp** DSP graph and **rubato** resampling library into the `sensorium-audio` Rust crate, enabling high‑performance audio processing with support for VST3/CLAP/Standalone playback.

## Scope
- **Fundsp DSP Graph**: Create node‑based processing graph (sources, filters, mixers, outputs).  
- **Rubato Resampling**: Add high‑quality time‑stretch and sample‑rate conversion utilities.  
- **Audio Callback**: Wire the DSP graph into the `nih-plug` audio callback loop.  
- **Performance Targets**:  
  - Callback latency **p99 < 0.5 ms** (tested on Windows/macOS/Linux).  
  - Zero‑allocation hot path for sample processing.  
- **Testing**:  
  - Unit tests for each DSP node.  
  - Criterion benchmarks for latency and throughput.  
  - Integration test with a simple VST host (e.g., Carla) to verify real‑world operation.

## Step‑by‑Step Breakdown
| Step | Description | Artifacts | Verification |
|------|-------------|-----------|--------------|
| 1 | **Add fundsp dependency** – update `Cargo.toml` with `fundsp = { version = "0.11", features = ["default"] }` and `rubato = "0.16"` | `Cargo.toml` changes | `cargo check` succeeds |
| 2 | **Create DSP graph skeleton** – define `enum Node { Source, Filter, Mixer, Output }` and `struct Graph { nodes: Vec<Node>, edges: Vec<Edge> }` | `src/dsp/graph.rs` | Compiles, nodes are reachable |
| 3 | **Implement core DSP nodes** – Source (e.g., microphone or playback), Filter (low‑pass, high‑pass), Mixer, Output | `src/dsp/nodes/*.rs` | Unit tests for each node’s processing |
| 4 | **Connect nodes via graph API** – implement `add_edge(src, dst, param)` and a simple traversal that processes audio samples in order | `src/dsp/graph.rs` (method `process`) | `cargo test` passes connectivity tests |
| 5 | **Integrate rubato** – wrap `rubato::Robin` for high‑quality resampling; expose `resample(alpha: f32, src: &[f32]) -> Vec<f32>` | `src/dsp/resample.rs` | Benchmarks show ≤ 0.1 ms per 1024‑sample block |
| 6 | **Hook DSP graph into `nih-plug` audio callback** – replace default callback with `graph.process(frame)` | `src/lib.rs` (plugin `process` method) | Audio passes through with no clipping, latency measured |
| 7 | **Add performance‑critical optimizations** – eliminate allocations in hot path, use `bumpalo` arena, SIMD where possible | `src/dsp/arena.rs` | `cargo bench` shows p99 latency ≤ 0.5 ms |
| 8 | **Write benchmarks** – add `benches/audio_callback_latency.rs` using Criterion; collect p50/p95/p99 | `benches/` directory | `cargo bench` produces report with required latency numbers |
| 9 | **Add unit & integration tests** – test graph construction, node linking, resampling accuracy | `src/dsp/tests/` | `cargo test` passes all |
| 10 | **Documentation** – update `README.md` and `src/dsp/` module docs with usage examples | `docs/` | `cargo doc` builds without errors |

## Dependencies
- `fundsp` (latest stable) – DSP primitives.
- `rubato` – high‑quality resampling.
- `cpal` – cross‑platform audio input/output handling (already used by `nih-plug`).
- `ringbuf` – lock‑free buffering for the audio callback (already a dependency).

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| DSP graph dead‑lock or Processing order bug | Audio callback hangs, crashes | Validate graph is a DAG before processing; unit tests for topological sort. |
| rubato quality/speed mis‑match | Audio artifacts, latency spikes | Benchmark on target platforms; fallback to `cpal` resample if needed. |
| Integration with `nih-plug` breaks existing VST builds | Breaks CI, fails release | Keep existing callback as fallback; run CI matrix on all platforms. |
| Performance not meeting p99 < 0.5 ms | Fails VST host timing requirements | Add back‑pressure logic to drop non‑critical processing, profile hot paths. |

## Exit Criteria
- `cargo build --release` succeeds without warnings.  
- `cargo test` passes 100 % of unit & integration tests.  
- `cargo bench` reports **p99 latency ≤ 0.5 ms** for the audio callback.  
- A simple VST host (e.g., Carla) loads the resulting plugin and processes audio without glitches.  
- Documentation builds successfully (`cargo doc --open`).

## Next Steps
1. Update `Cargo.toml` with fundsp & rubato dependencies.  
2. Scaffold the DSP graph skeleton (Step 2).  
3. Implement and unit‑test core nodes (Step 3).  

This plan is **cold‑start executable**: a fresh agent can read `plans/phase1-audio-engine-core.md` and perform all steps without additional context.