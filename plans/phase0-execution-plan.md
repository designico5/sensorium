# Sensorium AI Studio — Phase 0 Execution Plan
**Erstellt:** 2026-08-21 | **Quelle:** `KANBAN_PHASE0.md` + `INSESSION_TASKLIST_SENSORIUM.md` + geladene Skills

---

## Meta-Regeln (Rate Limits & Quality)

1. **Keine parallelen Builds** — `cargo build` und `cargo bench` serialisieren, nicht parallel ausführen.
2. **Gate-First** — Jeder Task beginnt mit einer verifizierbaren Voraussetzung (`cargo check`, `cargo build`).
3. **Evidenz vor Fortschritt** — Für jeden Task muss ein konkretes Artefakt entstehen (Datei, Report, JSON, Diff).
4. **Dokument-Pflicht** — Jede beendete Session aktualisiert Living-Docs (Status/Map/History).
5. **Kein `let me know`** — Tasks sind direkt ausführbar; Rückfragen nur bei Blokkern.

---

## SESSION 1 — Foundation & Verification-Gates

### S.1.1 Struktur-Baseline etablieren
**Artefakt:** `plans/phase0-baseline-status.md`

```bash
# Gate: Build grün
cargo check --workspace

# Gate: Frontend-Typen generieren
cd sensorium-v2/packages/frontend && npm run generate:types
```

**Verifikation:**
- [ ] `cargo check --workspace` exit 0
- [ ] `npm run generate:types` exit 0
- [ ] `plans/phase0-baseline-status.md` existiert und enthält Exit-Codes + Timestamps

---

### S.1.2 NIH-Plug stabilisieren und verifizieren
**Skills:** `nih-plug-development`, `latency-critical-patterns`, `verification-loop`
**Artefakte:** `sensorium-audio/Cargo.toml`, `sensorium-audio/src/lib.rs`, `benches/audio_callback_latency.rs`

```bash
# 1. Versionierte Dependency
# sensorium-audio/Cargo.toml ändern: nih-plug = { version = "0.8", features = [...] }

# 2. fundsp + rubato einbinden
cargo add --package sensorium-audio fundsp@0.11
cargo add --package sensorium-audio rubato@0.16

# 3. Build grün (serialisiert, keine parallelen Builds)
cargo build --package sensorium-audio --release --features vst3,clap,standalone,vizia

# 4. Gate M1: Benchmark nach Build (separater Aufruf)
cargo bench --package sensorium-audio -- audio_callback_latency

# 5. Kani-Proof anlegen und ausführen
cargo kani --package sensorium-audio --features verification \
  --harness verify_audio_callback_no_panic \
  --harness verify_audio_callback_no_alloc
```

**Verifikation:**
- [ ] Build exit 0, Binaries vorhanden
- [ ] Benchmark p99 < 0.5 ms
- [ ] Kani-Proofs exit 0 (oder bekannte, dokumentierte Ausnahmen)

---

### S.1.3 Automerge 2.0 synchronisieren und testen
**Skills:** `automerge-crdt-patterns`, `latency-critical-patterns`, `contract-first-api`
**Artefakte:** `sensorium-sync/src/lib.rs`, `sensorium-sync/Cargo.toml`

```bash
# 1. Dependencies anpassen
cd sensorium-v2/crates/sensorium-sync
cargo add automerge@2.0
cargo add automerge-repo@2.0
cargo add tokio --features full,rt-multi-thread

# 2. Harness Sync-Crate füllen
# sensorium-harness/sensorium-sync/Cargo.toml: gültige Manifest-Einträge

# 3. Build (serialisiert)
cargo build --package sensorium-sync --release --features wasm,serde

# 4. Roundtrip-Test
cargo test --package sensorium-sync -- binary_roundtrip

# 5. Sync-Latenz testen
cargo bench --package sensorium-sync -- sync_roundtrip
```

**Verifikation:**
- [ ] Automerge 2.0 kompiliert
- [ ] Binary Roundtrip < 10 ms für < 1.000 Events
- [ ] `sensorium-harness/sensorium-sync/Cargo.toml` ist nicht leer

---

### S.1.4 MIDI/WebTransport Stubs → erste echte Verbindung
**Skills:** `webtransport-quic-patterns`, `latency-critical-patterns`
**Artefakt:** lauffähiger QUIC-Server in `sensorium-midi`

```bash
# 1. QUIC-Server bauen und starten
cargo run --package sensorium-midi --features quic

# In zweitem Terminal:
# 2. Verbindungstest
cargo test --package sensorium-midi -- quic_handshake

# 3. 0-RTT-Reconnect testen
cargo test --package sensorium-midi -- reconnect_resilience
```

**Verifikation:**
- [ ] Server startet und lauscht
- [ ] `bail!`-Stubs ersetzt durch echte Stream-Verarbeitung
- [ ] 0-RTT funktioniert (Ticket speichern, reconnect)

---

### S.1.5 CI / Formal Verification aktivieren
**Skills:** `formal-verification-audio`, `verification-loop`
**Artefakt:** `.github/workflows/verify.yml`

```bash
# 1. Workflow triggern
git add .github/workflows/verify.yml
git commit -m "ci: activate formal verification"
git push

# Oder lokal mit act (falls installiert)
act run

# 2. Kani-Konfig prüfen/reparieren
cargo kani --package sensorium-audio --features verification

# 3. Prusti + Creusot parallel aufsetzen (serialisiert ausführen)
cargo prusti --package sensorium-audio
cargo creusot --package sensorium-audio
```

**Verifikation:**
- [ ] CI-Jobs: build, test, lint, formal-verification, contract, frontend
- [ ] Kani: 5 Proofs laufen (nicht übersprungen)
- [ ] Prusti + Creusot definiert und ausführbar

---

## SESSION 2 — Eval-Driven Hardening & Evals M1–M3

### S.2.1 Eval-Runner operationalisieren
**Skills:** `eval-driven-development`, `verification-loop`
**Artefakte:** `hooks/eval-runner.sh`, `eval-reports/M1/report.json`

```bash
# 1. Runner fertigstellen und ausführbar machen
chmod +x hooks/eval-runner.sh

# 2. M1 capability
bash hooks/eval-runner.sh capability M1

# 3. M1 regression
bash hooks/eval-runner.sh regression M1

# 4. M1 report
bash hooks/eval-runner.sh report M1
```

**Verifikation:**
- [ ] `eval-reports/M1/report.json` existiert
- [ ] `pass@3 > 90 %` Capability
- [ ] `pass^3 = 100 %` Regression

---

### S.2.2 M2 & M3 Evals definieren und lauffähig machen
**Artefakte:** `evals/M2-contract-generation.md`, `evals/M3-health-prediction.md`, `eval-reports/M2/metrics.json`, `eval-reports/M3/metrics.json`

```bash
# Serialisiert, nicht parallel mit cargo build
bash hooks/eval-runner.sh capability M2
bash hooks/eval-runner.sh capability M3
```

**Verifikation:**
- [ ] M2: Protobuf-Rust + OpenAPI-TS + Automerge-Sync < 5 ms
- [ ] M3: Health-Assessment > 80 % Precision

---

### S.2.3 Contract-First-Abgleich durchführen
**Skills:** `contract-first-api`, `verification-loop`
**Artefakt:** Contract-Drift-Report (0 Diffs)

```bash
# 1. Protos vs Rust
cargo build --package sensorium-audio  # build.rs prüft generierte Typen

# 2. OpenAPI vs Frontend
npm run generate:types && git diff --exit-code src/api/types.ts

# 3. Wenn Diffs: auflisten und in `contract-drift-report.md` festhalten
```

**Verifikation:**
- [ ] Contract Drift = 0 (oder dokumentierte Ausnahmen in `contract-drift-report.md`)

---

## SESSION 3 — Visual Engine, Local AI & Observability Prep

### S.3.1 Visual Engine Compute-Shader-Pipeline
**Skills:** `wgpu-compute-audio`, `latency-critical-patterns`
**Artefakt:** FFT-Benchmark in `sensorium-visual`

```bash
# 1. Build (serialisiert)
cargo build --package sensorium-visual

# 2. GPU FFT benchmark
cargo bench --package sensorium-visual -- gpu_fft

# 3. Target: FFT < 0.1 ms, 10k nodes @ 60 fps
```

**Verifikation:**
- [ ] Compute-Shader-Pipeline läuft
- [ ] CPU-Fallback dokumentiert in `docs/visual-fallback.md`

---

### S.3.2 Local AI Grundgerüst prüfen
**Skills:** `candle-local-llm`, `verification-loop`
**Artefakt:** Inferenz-Bericht in `sensorium-ai`

```bash
# 1. Dependencies prüfen
cargo check --package sensorium-ai

# 2. Metal/CUDA Init validieren
cargo run --package sensorium-ai -- infer --dry-run

# 3. Benchmark
cargo bench --package sensorium-ai -- llama_inference
```

**Verifikation:**
- [ ] Modell lädt und inert < 500 ms
- [ ] Kein Block auf Audio-Thread (Architektur-Check)

---

### S.3.3 Observability-Grundgerüst verifizieren
**Skills:** `living-docs-governance`, `verification-loop`
**Artefakt:** `docs/observability-dashboard.md`

```bash
# 1. OpenTelemetry Collector Konfig prüfen
# 2. Prometheus-Endpoint antwortet (curl)
curl -s http://localhost:9090/metrics | head -20
```

**Verifikation:**
- [ ] Prometheus-Endpoint antwortet
- [ ] Dashboard-Entwurf in `docs/observability-dashboard.md` festgehalten

---

## SESSION 4 — Agent Harness Hygiene & Repo-Bereinigung

### S.4.1 Agent Harness Skeleton überprüfen
**Skills:** `blueprint`, `verification-loop`, `living-docs-governance`
**Artefakt:** JSON-I/O-Testreport

```bash
# 1. 8 run.sh Skripte prüfen
for agent in audio-engine midi-2.0 state-sync visual-engine local-ai formal-verification chaos-engineering release-automation; do
  echo '{"task":"build"}' | bash agents/$agent/run.sh
done
```

**Verifikation:**
- [ ] Alle 8 Skripte antworten mit gültigem JSON
- [ ] Exit-Codes dokumentiert

---

### S.4.2 Repo-Bereinigung
**Skills:** `living-docs-governance`
**Artefakte:** aktualisierte `TASKLIST.md`, aufgeräumtes `docs/archive/`

```bash
# 1. Checkpoints endgültig archivieren
mkdir -p docs/archive
mv archive/checkpoint_20260820_*.json docs/archive/

# 2. TASKLIST.md Haken setzen für erreichte Meilensteine (Done-Blöcke aus Kanban)

# 3. Agenda aktualisieren
# Sensorium: Git-Master → versionierte 0.8
# Automerge: 0.7.0 → 2.0 Migration Status
# WebTransport: Stub → echte Implementierung
# Formal Verification: Proofs nicht ausgeführt → Status grün/gelb/rot
```

**Verifikation:**
- [ ] `TASKLIST.md` reflektiert aktuellen Done-Status
- [ ] `SENSORIUM_PLANNING_AGENDA_v3_2026.md` aktualisiert
- [ ] `docs/archive/checkpoint_*` enthält alle archivierten Checkpoints

---

## Exit Criteria for Phase 0 Completion (Auszug)

- [ ] NIH-Plug kompiliert mit VST3/CLAP/Standalone/Vizia
- [ ] Automerge 2.0 Sync funktioniert Rust ↔ WebAssembly
- [ ] WebTransport/QUIC-Server verarbeitet MIDI 2.0 UMP
- [ ] CI-Workflow mit Formal Verification grün
- [ ] Contract-Artifakte generieren korrekte Rust- und TS-Typen
- [ ] Eval-Harness definiert und kann M1–M7 ausführen
- [ ] Agent Harness Skeleton hat 8 funktionale Agents mit JSON-I/O
- [ ] Initial-Benchmarks etablieren Baseline-Metriken
- [ ] Alle Self-Healing-Systeme operational
- [ ] System zeigt Resilienz gegen injizierte Fehler

---

## Serialisierte Ausführungs-Reihenfolge (Rate-Limit-konform)

1. `cargo check --workspace`
2. `npm run generate:types`
3. `cargo build --package sensorium-audio`
4. `cargo bench --package sensorium-audio`
5. `cargo build --package sensorium-sync`
6. `cargo test --package sensorium-sync`
7. `cargo run --package sensorium-midi`
8. `cargo prusti --package sensorium-audio`
9. `cargo creusot --package sensorium-audio`
10. `cargo build --package sensorium-visual`
11. `cargo bench --package sensorium-visual`
12. `npm run generate:types` (erneut, falls Contract-Änderungen)
13. `bash hooks/eval-runner.sh ...`
14. Repo-Bereinigung und Living-Docs-Update

---