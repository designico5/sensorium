# SENSORIUM IMPLEMENTATION TODO LIST
**Source:** SENSORIUM_PLANNING_AGENDA_v3_2026.md + Reality-Check 2026-08-20
**Last Sync:** Session-Abgleich
**Scope:** `sensorium-harness/` (Hauptscope); `sensorium-v2/` ist **Out-of-Scope** für diesen Harness, aber als Parallel-Skelett vorhanden.
**Rate Limit Note:** NVIDIA NIM free endpoints ~40 req/min - batch requests, cache responses, use local models where possible.

> **Reality-Check:** Dieses Dokument wurde mit dem tatsächlichen Dateibestand abgeglichen. Checklisten reflektieren den Ist-Stand; Abweichungen sind markiert.

---

## HARNESS-INFRASTRUKTUR

### Skills (9/9) ✅
- [x] `nih-plug-development` → `skills/nih-plug-development/SKILL.md`
- [x] `automerge-crdt-patterns` → `skills/automerge-crdt-patterns/SKILL.md`
- [x] `webtransport-quic-patterns` → `skills/webtransport-quic-patterns/SKILL.md`
- [x] `formal-verification-audio` → `skills/formal-verification-audio/SKILL.md`
- [x] `eval-driven-development` → `skills/eval-driven-development/SKILL.md`
- [x] `wgpu-compute-audio` → `skills/wgpu-compute-audio/SKILL.md`
- [x] `candle-local-llm` → `skills/candle-local-llm/SKILL.md`
- [x] `latency-critical-patterns` → `skills/latency-critical-patterns/SKILL.md`
- [x] `contract-first-api` → `skills/contract-first-api/SKILL.md`

### ADRs (6/6) ✅
- [x] 001-nih-plug-audio-engine.md
- [x] 002-automerge-state-sync.md
- [x] 003-webtransport-midi.md
- [x] 004-webgpu-compute-dsp.md
- [x] 005-llamafile-local-ai.md
- [x] 006-formal-verification.md

### Evals (M1–M7)
- [x] M1-audio-callback-latency.md + Python-Implementierung (`evals/M1/audio_callback_latency.py`)
- [x] M2-contract-generation.md + Python-Implementierung (`evals/M2/contract_drift.py`)
- [x] M3-health-prediction.md + Python-Implementierung (`evals/M3/resilience_health.py`)
- [ ] M4-gpu-compute-throughput.md (nur Markdown)
- [ ] M5-llm-inference-speed.md (nur Markdown)
- [ ] M6-neural-morph-latency.md (nur Markdown)
- [ ] M7-production-readiness.md (nur Markdown)

### Workflows (7/8 geplant)
- [x] `phase-1-zero-latency.yaml`
- [x] `phase-2-contracts.yaml`
- [x] `phase-3-self-healing.yaml`
- [x] `phase-4-resource-optimal.yaml`
- [x] `phase-5-dev-velocity.yaml`
- [x] `phase-6-features.yaml`
- [x] `phase-7-hardening.yaml`
- [ ] `phase-0-bootstrap.yaml` — **FEHLT** (wird in Schritt 4 erstellt)

### CI/CD (6/6) ✅
- [x] `ci/verify.yml`
- [x] `ci/benchmark.yml`
- [x] `ci/chaos.yml`
- [x] `ci/security.yml`
- [x] `ci/release.yml`
- [x] `ci/eval.yml`

### Hooks (2/4 + 2 fehlend)
- [x] `hooks/ci-gate-checks.sh`
- [x] `hooks/verify-loop.sh`
- [ ] `hooks/eval-runner.sh` — **FEHLT** (wird in Schritt 4 erstellt)
- [ ] `hooks/post-merge-benchmark.sh` — **FEHLT**
- [ ] `hooks/pre-commit-verification.sh` — **FEHLT**

### Contract Specs (6/6) ✅
- [x] `specs/audio-engine.proto`
- [x] `specs/midi-2.0.proto`
- [x] `specs/state-sync.proto`
- [x] `specs/visual-engine.proto`
- [x] `specs/local-ai.proto`
- [x] `specs/openapi.yaml`

### Agents (8/8 dokumentiert) ✅
- [x] `agents/audio-engine.md` + `run.sh`
- [x] `agents/midi-2.0.md` + `run.sh`
- [x] `agents/state-sync.md` + `run.sh`
- [x] `agents/visual-engine.md` + `run.sh`
- [x] `agents/local-ai.md` + `run.sh`
- [x] `agents/formal-verification.md` + `run.sh`
- [x] `agents/chaos-engineering.md` + `run.sh`
- [x] `agents/release-automation.md` + `run.sh`

### Memory / Wissen
- [x] `memory/project-context.md`
- [x] `memory/architecture-decisions/` (6 ADRs)
- [x] `memory/learned-patterns/` (3 Muster: audio-rt, crdt-merge, quic-midi)

### Phase-0-Plan
- [x] `plans/sensorium-phase0-bootstrap.md`

---

## PHASE 0: FOUNDATION BOOTSTRAP (WOCHE 0) — ABGLEICH

### Tag 1: Blueprint & ADR Templates
- [x] **Blueprint erstellen** → `blueprint` skill → `plans/sensorium-phase0-bootstrap.md` vorhanden
- [x] **ADR Templates** → `architecture-decision-records` skill → `memory/architecture-decisions/` mit 001–006 gefüllt

### Tag 2: Monorepo Setup + NIH-Plug Scaffold
- [x] **Monorepo Setup** → `sensorium-v2/Cargo.toml` Workspace mit 9 Membern vorhanden; `package.json`/`turbo.json` fehlen noch
- [ ] **NIH-Plug Scaffold** → `sensorium-v2/crates/sensorium-audio` existiert mit Basis-Plugin (Gain) — **fundsp-DSP-Graph und rubato fehlen noch**

### Tag 3: Automerge 2.0 + Yjs + WebTransport + QUIC
- [ ] **Automerge 2.0 + Yjs** → `sensorium-v2/crates/sensorium-sync` vorhanden — **ABER: nutzt `automerge = 0.7.0` statt geplant `2.0`**; WebTransport-Backend fehlt
- [ ] **WebTransport + QUIC** → `sensorium-v2/crates/sensorium-midi` mit UMP-Parser-Grundgerüst — **QUIC/WebTransport sind Stubs (`bail!`)**

### Tag 4: CI mit Formal Verification + Contract Artifacts
- [x] **CI mit Formal Verification** → `sensorium-harness/ci/verify.yml` etc. vorhanden — **ABER: nicht in `.github/workflows/` aktiviert**
- [x] **Contract Artifacts** → `specs/*.proto` (5 Stück) + `specs/openapi.yaml` vorhanden

### Tag 5: Eval Harness Setup + Agent Harness Skeleton
- [x] **Eval Harness Setup** → `evals/M1`–`M7` vorhanden (M1–M3 mit Python); **`hooks/eval-runner.sh` fehlt noch**
- [x] **Agent Harness Skeleton** → `sensorium-harness/` Struktur + 8 Agenten-Dokus + `run.sh`-Skripte vorhanden

### Tag 6-7: Erste Benchmarks + Evals
- [ ] **Erste Benchmarks + Evals** → `criterion`-Benches fehlen noch; **Gate M1 Baseline nicht etabliert**

**Deliverable:** Harness-Artefakte angelegt, aber **Execution und CI-Aktivierung ausstehend**. `sensorium-v2` hat nur 2 von 9 Crates mit echtem Code.

---

## PHASE 1–7: FEHLENDE IMPLEMENTIERUNGEN (INITIALZUSTAND FÜR NODE-NULL)

### Woche 1: Audio Engine Core + MIDI 2.0 UMP Parser + WebTransport MIDI
- [ ] **Audio Engine Core** → `nih-plug` Wrapper vorhanden; `fundsp` DSP Graph **fehlt**; `rubato` **fehlt**
  - RED: Callback Latency Test → GREEN: Implementation → REFACTOR
  - Agent: `audio-engine`
- [x] **MIDI 2.0 UMP Parser** → `midly` + Custom UMP 1.1 (32/64/96/128-Bit) in `sensorium-midi` vorhanden
  - RED: Parse/Route <10µs → **Property-Based Tests fehlen noch**
  - Agent: `midi-2.0`
- [ ] **WebTransport MIDI** → QUIC Streams, 0-RTT Reconnect, Multiplexing
  - RED: Reconnect <50ms → **Stub-Implementierung (`bail!`) vorhanden, keine echte Integration**
  - Agent: `midi-2.0`

### Woche 2: Musical Time Engine + GPU-Audio Pipeline + Formal Verification Start
- [ ] **Musical Time Engine** → Sample-Accurate, `nih-plug` Transport, Ableton Link — **fehlt**
  - Agent: `audio-engine`
- [ ] **GPU-Audio Pipeline** → WebGPU Compute Shaders (FFT, Filter, Analysis) — **fehlt**
  - Agent: `visual-engine`
- [ ] **Formal Verification Start** → Kani Proof: No-Panic, No-Alloc, Bounds — **CI-Workflow vorhanden, nicht ausgeführt**
  - Agent: `formal-verification`

**Gate M1 (Ende Woche 2):**
- [ ] Audio Callback P99 < 0.5ms (Criterion Benchmark + Canary) — **nicht gemessen**
- [ ] MIDI 2.0 UMP Parse + Route < 10µs (Property Test + Benchmark) — **Unit-Tests vorhanden, Benchmarks fehlen**
- [ ] VST3/CLAP/Standalone Build erfolgreich (CI Matrix) — **lokal möglich, CI nicht aktiviert**
- [ ] Kani Proof: Audio Callback No-Panic + No-Alloc (CI Gate) — **nicht ausgeführt**
- [ ] WebTransport: 0-RTT Reconnect < 50ms (Integration Test) — **nicht implementiert**
- [ ] Eval Report: pass@3 = 100% für M1 Capability Evals — **`eval-runner.sh` fehlt**

---

### Woche 2: Protobuf Contracts + Automerge State
- [x] **Protobuf Contracts** → `specs/*.proto` vorhanden (5 Dateien); Rust/TS-Generierung **nicht automatisiert**
  - Consumer-First: Jobs → Contract → Types
  - Agent: `state-sync`
- [ ] **Automerge State** → `automerge::Automerge` + `automerge-repo` Network Sync — **Basis vorhanden (0.7.0), Migration auf 2.0 ausstehend**
  - Binary Format, Offline-First, Conflict-Free
  - Agent: `state-sync`

### Woche 3: Yjs Web Binding + Formal Verification + Property-Based Tests
- [ ] **Yjs Web Binding** → `yjs` + `y-webtransport` Provider für Browser — **fehlt**
  - Same Contract, Web-Native
  - Agent: `state-sync`
- [x] **Formal Verification** → Kani/Prusti/Creusot in CI-Workflows skizziert — **nicht ausgeführt/verifiziert**
  - Agent: `formal-verification`
- [ ] **Property-Based Tests** → `proptest` + `quickcheck` für CRDT Merge — **fehlen**
  - QuickCheck in CI
  - Agent: `formal-verification`

**Gate M2 (Ende Woche 3):**
- [ ] Protobuf → Rust + TS Generierung automatisiert (Build Step) — **nicht konfiguriert**
- [ ] Automerge State Sync < 5ms (Local + Network, Benchmark) — **nicht gemessen**
- [ ] Yjs + WebTransport Sync im Browser funktional (E2E Test) — **nicht implementiert**
- [ ] Kani/Prusti Proofs für 100% Hot Path Functions (CI Gate) — **nicht ausgeführt**
- [ ] Property Tests für CRDT Merge (pass@3 > 90%) — **nicht vorhanden**
- [ ] Contract Drift Test: Provider Responses = Contract (CI) — **nicht vorhanden**

---

### Woche 3: Health Assessor + Failure Predictor
- [ ] **Health Assessor** → 5 Dimensionen (Audio, MIDI, Network, System, State) — **fehlt**
  - Metrics Collection via OpenTelemetry
  - Agent: `chaos-engineering`
- [ ] **Failure Predictor** → Isolation Forest (Online Learning) auf Health Metrics — **fehlt**
  - `candle` für Inference, Training Data Pipeline
  - Agent: `local-ai`

### Woche 4: Automated Remediation + Supervisor + Sidecars + Automerge Repo Sync + Autonomous CI Agents
- [ ] **Automated Remediation** → Escalation Ladder + Cooldowns + Human-in-Loop — **fehlt**
  - Decision Engine mit Audit Trail
  - Agent: `chaos-engineering`
- [ ] **Supervisor + Sidecars** → `cargo-dist` Sidecar Pattern (Audio, Visual, MIDI, Network) — **fehlt**
  - Process Isolation, Independent Deploy
  - Agent: `release-automation`
- [ ] **Automerge Repo Sync** → `automerge-repo` mit `WebTransport` Backend — **fehlt (WebTransport-Backend nicht implementiert)**
  - Conflict Resolution Metrics
  - Agent: `state-sync`
- [ ] **Autonomous CI Agents** → Scheduled Tasks für Continuous Verification — **Agent-Skripte vorhanden, Scheduler fehlt**
  - Self-Healing PR Reviews
  - Agent: `autonomous-agent-harness`

**Gate M3 (Ende Woche 4):**
- [ ] Health Dimensions > 0.8 bei Normalbetrieb (Dashboard) — **nicht implementiert**
- [ ] Failure Prediction Horizon > 30s, Precision > 80% (Eval) — **nicht implementiert**
- [ ] Remediation MTTR < 500ms (Audio), < 100ms (MIDI) (Chaos Test) — **nicht implementiert**
- [ ] Supervisor managt 4 Sidecars (Health, Restart, Upgrade) — **nicht implementiert**
- [ ] Automerge Repo: Offline-First, Conflict-Free, Binary Format — **Basis vorhanden, WebTransport-Sync fehlt**
- [ ] Autonomous Agent: PR Review + Merge Decision ohne Human — **nicht implementiert**

---

### Woche 4: WebGPU Compute Audio + Instanced Visual Rendering
- [ ] **WebGPU Compute Audio** → `wgpu` + `pollster` + Compute Shaders (FFT, Filter, Analysis) — **fehlt**
  - Zero-Copy, SIMD Parallel, Fallback
  - Agent: `visual-engine`
- [ ] **Instanced Visual Rendering** → `wgpu` Instanced Draw Calls (10k Nodes = 1 Draw) — **fehlt**
  - Frustum Culling, LOD, Batch
  - Agent: `visual-engine`

### Woche 5: WebTransport/QUIC Network + Resource Budget Enforcement + Memory Pool Arena
- [ ] **WebTransport/QUIC Network** → `quinn` Server + `webtransport` Client, Multiplexing — **Stub vorhanden, Integration fehlt**
  - 0-RTT, Stream Priorities, Backpressure
  - Agent: `midi-2.0`
- [ ] **Resource Budget Enforcement** → Atomic O(1) Tracking, Auto-Degradation bei Pressure — **fehlt**
  - Budget per Subsystem, Hard Limits
  - Agent: `audio-engine`
- [ ] **Memory Pool Arena** → `bumpalo` + `slotmap` für Zero-Alloc Hot Paths — **fehlt**
  - Arena per Frame, No Fragmentation
  - Agent: `formal-verification`

**Gate M4 (Ende Woche 5):**
- [ ] WebGPU Compute: FFT 4096 < 0.1ms GPU Time (Benchmark) — **nicht implementiert**
- [ ] Visual: 10.000 Nodes @ 60fps < 2ms GPU (Profile) — **nicht implementiert**
- [ ] WebTransport: 1000 Concurrent Streams < 50MB RAM (Load Test) — **nicht implementiert**
- [ ] Resource Budget: O(1) Alloc/Dealloc, Zero Leaks (dhat + Verification) — **nicht implementiert**
- [ ] Auto-Degradation: Graceful Quality Scaling (Chaos Test) — **nicht implementiert**
- [ ] Memory Pool: Zero Alloc in Audio Callback (Kani Proof) — **nicht implementiert**

---

### Woche 5: Local AI + Hot Reload
- [ ] **Local AI: llamafile** → Single-File LLM (Llama 3.1 8B Q4_K_M), Cosmopolitan Binary — **fehlt**
  - Function Calling, Session Management
  - Agent: `local-ai`
- [ ] **Hot Reload: cargo-watch + Vite** → Sub-200ms Rust + TS Hot Reload — **fehlt**
  - `cargo-watch` + `vite` HMR
  - Agent: `release-automation`

### Woche 6: Release Automation + DX Tools + Eval Harness Integration + Skill Documentation
- [ ] **Release Automation: cargo-dist** → GitHub Releases, Installers, Auto-Update, SBOM, Provenance — **fehlt**
  - Signed Multi-Platform
  - Agent: `release-automation`
- [ ] **DX Tools: REPL + Time-Travel** → `evcxr` REPL, State Snapshots, Profiling Integration — **fehlt**
  - Live Parameter Tweaking
  - Agent: `audio-engine`
- [ ] **Eval Harness Integration** → `eval-harness` für alle Gates, pass@k Tracking — **Eval-Dateien vorhanden, Runner fehlt**
  - Regression Detection Auto
  - Agent: `chaos-engineering`
- [x] **Skill Documentation** → Alle 9 Sensorium-Skills geschrieben + Versioned — **in `skills/*/SKILL.md` vorhanden**
  - Knowledge Base Complete
  - Target: `memory/learned-patterns/`

**Gate M5 (Ende Woche 6):**
- [ ] llamafile: < 500ms First Token, < 100MB RAM (Benchmark) — **nicht implementiert**
- [ ] Hot Reload: Rust < 2s, TS < 200ms (Measurement) — **nicht implementiert**
- [ ] cargo-dist: Signed Releases für Linux/Win/Mac/iOS/Android (CI) — **nicht implementiert**
- [ ] REPL: Live Parameter Tweaking im Running System (Demo) — **nicht implementiert**
- [ ] SBOM + Provenance Generation automatisiert (CI Gate) — **nicht implementiert**
- [ ] Eval Harness: pass@3 > 90% für alle M1-M5 Capability Evals — **Runner fehlt**

---

### Woche 6-7: MIDI Learn 2.0 + Panic Button
- [ ] **MIDI Learn 2.0** → Per-Note Expression, MPE, Profile Mapping (Push 3, Launchpad) — **fehlt**
  - Touch-Native, Visual Feedback
  - Agent: `midi-2.0`
- [ ] **Panic Button** → Hardware + Software, < 1ms All Notes Off + CC Reset — **fehlt**
  - Stage-Ready, Foolproof
  - Agent: `audio-engine`

### Woche 7: Session View + Macro Surface
- [ ] **Session View** → Clip/Scene Launcher, Follow Actions, Quantized Launch — **fehlt**
  - Ableton Link Sync, Performer Flow
  - Agent: `audio-engine`
- [ ] **Macro Surface** → 16 Macros, Smooth Interpolation (`fundsp` Smoother) — **fehlt**
  - Morphing, Performance Mapping
  - Agent: `visual-engine`

### Woche 8: Mod Matrix + Morph Controller
- [ ] **Mod Matrix** → Touch-Native, Visual Patch Cables, Instanced Rendering — **fehlt**
  - Drag-to-Connect, Real-time
  - Agent: `visual-engine`
- [ ] **Morph Controller** → Neural Morphing via `candle` (RAVE Latent Interpolation) — **fehlt**
  - Expressive, Continuous Control
  - Agent: `local-ai`

### Woche 9: Performance Mode + Dual Screen
- [ ] **Performance Mode** → Fullscreen, 80px Targets, Glove Mode, High Contrast — **fehlt**
  - Sunlight, Sweat, Gloves Ready
  - Agent: `visual-engine`
- [ ] **Dual Screen** → Performer View + Audience View (WebGPU Shared) — **fehlt**
  - Synced via SharedArrayBuffer
  - Agent: `visual-engine`

### Woche 10: Neural Audio + Local AI Assistant
- [ ] **Neural Audio** → `candle` + `burn` für RAVE/DDSP Synthesis — **fehlt**
  - New Timbres, Neural Synthesis
  - Agent: `local-ai`
- [ ] **Local AI Assistant** → `llamafile` + Function Calling für Session Management — **fehlt**
  - Voice/Chat Control, Context Aware
  - Agent: `local-ai`

**Gate M6 (Ende Woche 9):**
- [ ] MIDI 2.0: MPE + Per-Note Expression funktional (Hardware Test) — **nicht implementiert**
- [ ] Session View: Ableton Link Sync, Follow Actions (Integration) — **nicht implementiert**
- [ ] Neural Morph: RAVE Latent Space Interpolation < 10ms (Benchmark) — **nicht implementiert**
- [ ] Performance Mode: Stage-Ready (Sunlight, Sweat, Gloves Test) — **nicht implementiert**
- [ ] Dual Screen: Synced via SharedArrayBuffer + WebGPU (E2E) — **nicht implementiert**
- [ ] Panic Button: < 1ms All Notes Off (Measurement) — **nicht implementiert**
- [ ] Eval Report: pass@3 > 90% für alle Feature Evals — **Runner fehlt**

---

### Woche 10: 24h Soak Test + Chaos Engineering
- [ ] **24h Soak Test** → `cargo-instana` Profiling, Memory Leak Detection
  - Zero Crashes, Zero Leaks, Zero Underruns
  - Agent: `chaos-engineering`
- [ ] **Chaos Engineering** → Kill Sidecars, Network Partition, Memory Pressure, CPU Throttle
  - MTTR < 500ms all Modes
  - Agent: `chaos-engineering`

### Woche 11: Formal Verification Audit + Security Audit + Load Test + Accessibility Audit
- [ ] **Formal Verification Audit** → Kani/Prusti Complete Coverage Audio Thread
  - 100% Hot Path Verified
  - Agent: `formal-verification`
- [ ] **Security Audit** → `cargo-audit` + `cargo-deny` + `trivy` + `syft` SBOM
  - 0 Critical/High
  - Agent: `security-review`
- [ ] **Load Test** → 1000 MIDI Devices, 10k Events/Block, 100 Voices
  - < 3ms Latency, < 512MB, < 70% CPU
  - Agent: `chaos-engineering`
- [ ] **Accessibility Audit** → WCAG 2.2 AA, Screen Reader, Keyboard Nav
  - 100% Compliance
  - Agent: `frontend-a11y`

### Woche 12: Release Automation + Documentation Freeze
- [ ] **Release Automation** → `cargo-dist` Automated Multi-Platform Release
  - Signed Binaries, SBOM, Provenance
  - Agent: `release-automation`
- [ ] **Documentation Freeze** → Living Docs, API Docs, User Guide, Architecture
  - Complete + Versioned
  - Agent: `living-docs-governance`

**Gate M7 (Ende Woche 12):**
- [ ] 24h Soak: Zero Crashes, Zero Memory Leaks, Zero Audio Underruns
- [ ] Chaos: MTTR < 500ms für alle Failure Modes (Documented)
- [ ] Formal: 100% Hot Path Functions Verified (Kani/Prusti Report)
- [ ] Security: 0 Critical/High, SBOM + Provenance (Audit Report)
- [ ] Load: 1000 Devices @ < 3ms Latency, < 512MB RAM, < 70% CPU
- [ ] Accessibility: WCAG 2.2 AA Compliance (Audit)
- [ ] Signed Binaries: Linux (AppImage), Windows (MSIX), macOS (DMG), iOS, Android
- [ ] Eval Harness: pass^3 = 100% für alle Regression Evals
- [ ] Harness: Autonomous Operation für Post-Release Monitoring

---

## SENSORIUM-V2: OUT-OF-SCOFE DELTAS (NICHT GESTEUERT DURCH DIESEN HARNESS)

> Hinweis: `sensorium-v2/` ist **nicht Teil des `sensorium-harness`-Scopes**, existiert aber als eigenes Crate-Skelett.
> Untenstehende Liste dient der Transparenz; Steuerung erfolgt über separates Planning.

| Crate | Vorhanden | Implementiert | Funktionsfähig | Hinweis |
|-------|-----------|---------------|----------------|---------|
| `sensorium-audio` | ✅ | Teilweise | Teilweise | NIH-Plug-Gain-Plugin (VST3/CLAP/Standalone), **kein fundsp-DSP-Graph, kein rubato** |
| `sensorium-midi` | ✅ | Teilweise | Teilweise | UMP-Parser, Router, QUIC/WebTransport-Stubs, **keine echte Netzwerk-Integration** |
| `sensorium-sync` | ✅ | Teilweise | Teilweise | Nutzt **`automerge = 0.7.0`** statt geplant `2.0`, Repo mit InMemory/SQLite |
| `sensorium-visual` | ✅ | ❌ Stub | ❌ | `pub fn visual_init() {}` |
| `sensorium-ai` | ✅ | ❌ Stub | ❌ | `pub fn ai_init() {}` |
| `sensorium-dsp` | ✅ | ❌ Stub | ❌ | `pub fn dsp_init() {}` |
| `sensorium-chaos` | ✅ | ❌ Stub | ❌ | `pub fn chaos_init() {}` |
| `sensorium-release` | ✅ | ❌ Stub | ❌ | `pub fn release_init() {}` |
| `sensorium-visual-shaders` | ✅ | ❌ Stub | ❌ | `pub fn shaders_init() {}` |

**Offene sensorium-v2-Arbeiten (außerhalb dieses TODOs):**
- [ ] Migration `automerge 0.7.0` → `2.0`
- [ ] Implementierung der 7 leeren Crates
- [ ] Fundsp-DSP-Graph + Rubato-Resampling in `sensorium-audio`
- [ ] Echte QUIC/WebTransport-Anbindung in `sensorium-midi`
- [ ] Yjs-Web-Binding
- [ ] Tauri-2-Desktop-Shell

---

## NVIDIA NIM RATE LIMIT COMPLIANCE

- **Free Tier:** ~40 requests/minute
- **Strategy:** 
  - Batch all NIM requests together
  - Cache responses locally (file-based)
  - Use local models (llamafile, candle) for development
  - Only use NIM for specific evaluation/benchmarking tasks
  - Implement exponential backoff on 429 responses
  - Monitor rate limit headers in responses