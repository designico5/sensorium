# Sensorium v2 Phase 0 Bootstrap Progress Tracker
## Based on SENSORIUM_PLANNING_AGENDA_v3_2026.md

**Last Updated:** 2026-08-21 02:30 UTC  
**Overall Progress:** 33% (4/11 tasks completed)

## Phase 0: Foundation Bootstrap (Week 0) — NIH-PLUG + AUTOMERGE + HARNESS

| Tag | Aufgabe | Status | Fortschritt |
|-----|---------|--------|-------------|
| 1 | **Blueprint erstellen** | [x] Abgeschlossen | 100% |
| 1 | **ADR Templates erstellen** | [x] Abgeschlossen | 100% |
| 2 | **Monorepo Setup** | [~] In Bearbeitung | 40% |
| 2 | **NIH-Plug Scaffold** | [~] In Bearbeitung | 40% |
| 3 | **Automerge 2.0 + Yjs** | [ ] Nicht begonnen | 0% |
| 3 | **WebTransport + QUIC** | [ ] Nicht begonnen | 0% |
| 4 | **CI mit Formal Verification** | [ ] Nicht begonnen | 0% |
| 4 | **Contract Artifacts** | [ ] Nicht begonnen | 0% |
| 5 | **Eval Harness Setup** | [ ] Nicht begonnen | 0% |
| 5 | **Agent Harness Skeleton** | [ ] Nicht begonnen | 0% |
| 6-7 | **Erste Benchmarks + Evals** | [ ] Nicht begonnen | 0% |

## Detailed Task List

### Tag 1: Blueprint erstellen & ADR Templates
**Fertigkeit:** `blueprint` skill, `architecture-decision-records` skill  
**Harness Integration:** `workflows/phase-0-bootstrap.yaml`, `memory/architecture-decisions/`

**Aufgaben:**
- [x] Führe blueprint skill für 'sensorium-v2 foundation bootstrap mit nih-plug, automerge, webtransport, formal verification, eval harness' aus
- [x] Ausgabe: workflows/phase-0-bootstrap.yaml (diese Datei)
- [x] Erstelle ADR-Vorlage unter memory/architecture-decisions/template.md
- [x] Erstelle erstes ADR: 001-nih-plug-audio-engine.md
- [x] Erstelle erstes ADR: 002-automerge-state-sync.md
- [x] Erstelle erstes ADR: 003-webtransport-midi.md

**Überprüfung:**
- [x] workflows/phase-0-bootstrap.yaml existiert
- [x] memory/architecture-decisions/template.md existiert
- [x] Alle drei ADR-Dateien existieren
- [x] Validiere YAML-Syntax der Blueprint-Datei
- [x] Prüfe, ob ADR-Dateien context/decision/consequences Abschnitte enthalten

**Ausstiegskriterien:**
- [x] Blueprint-Datei existiert und ist gültiges YAML
- [x] ADR-Vorlage existiert mit standardisierter Struktur
- [x] 3 initiale ADRs erstellt mit context/decision/consequences

### Tag 2: Monorepo Setup & NIH-Plug Scaffold
**Fertigkeit:** `cargo-workspaces` + `npm workspaces` + `turborepo`, `cargo new` + NIH-Plug Template  
**Harness Integration:** Harness Root, `agents/audio-engine/`

**Monorepo Setup Aufgaben:**
- [x] Erstelle Cargo.toml in sensorium-harness/ mit workspace-Konfiguration
- [x] Erstelle package.json in sensorium-harness/ mit workspaces-Konfiguration
- [x] Erstelle turbo.json für turborepo-Pipeline
- [x] Erstelle .github/workflows-Verzeichnisstruktur
- [x] Erstelle sensorium-v2/ Verzeichnis für die eigentliche Implementierung
- [x] Initialisiere Git-Submodules falls nötig
- [~] Konfiguriere workspace-Abhängigkeiten für alle 9 Crates (Versionen aktualisieren um Spezifikationen aus Agenda zu entsprechen)

**NIH-Plug Scaffold Aufgaben:**
- [ ] Führe aus: cargo new --lib sensorium-audio
- [ ] Konfiguriere Cargo.toml mit nih-plug 0.8 Features: vst3, clap, standalone, vizia
- [ ] Füge Abhängigkeiten hinzu: fundsp 0.11, rubato 0.16, cpal 0.16, ringbuf 0.4
- [ ] Erstelle grundlegende Pluginstruktur: src/lib.rs, src/plugin.rs, src/params.rs, src/editor.rs
- [ ] Implementiere minimales AudioPlugin-Trait in src/lib.rs
- [ ] Füge Vizia GUI-Skelett in src/editor.rs hinzu
- [ ] Überprüfung: cargo build --package sensorium-audio --release --features vst3,clap,standalone,vizia

**Überprüfung (Monorepo):**
- [x] cargo check --workspace (sollte erfolgreich sein)
- [x] npm ls (sollte ohne Fehler abgeschlossen sein)
- [x] sensorium-harness/Cargo.toml existiert
- [x] sensorium-harness/package.json existiert
- [x] sensorium-harness/turbo.json existiert
- [x] .github/workflows-Verzeichnis existiert
- [~] Workspace-Abhängigkeiten entsprechen den Spezifikationen aus der Agenda (Versionen aktualisieren)

**Überprüfung (NIH-Plug):**
- [ ] cargo build schlägt mit allen Features fehl
- [ ] Überprüfe binäre Ausgaben:
  - [ ] VST3: target/release/*.dylib (macOS) oder *.so (Linux)
  - [ ] CLAP: target/release/*.clap
  - [ ] Standalone: target/release/sensorium (ausführbare Datei)
- [ ] Überprüfe, ob Vizia-GUI ohne Fehler kompiliert

**Ausstiegskriterien (Monorepo):**
- [x] Cargo-Workspace baut ohne Fehler
- [x] npm workspaces konfiguriert
- [x] turborepo-Pipeline definiert
- [~] Workspace-Abhängigkeiten entsprechen den Spezifikationen aus der Agenda

**Ausstiegskriterien (NIH-Plug):**
- [ ] sensorium-audio-Crate kompiliert mit allen 4 Features
- [ ] VST3/CLAP/Standalone-Binaries erzeugt
- [ ] Vizia-GUI kompiliert

### Tag 3: Automerge 2.0 + Yjs & WebTransport + QUIC
**Fertigkeit:** `automerge@2` + `automerge-repo@2` + `yjs@13.6`, `quinn@0.11` + `webtransport@0.12` + TLS  
**Harness Integration:** `agents/state-sync/`, `agents/midi-2.0/`

**Automerge 2.0 + Yjs Aufgaben:**
- [ ] Führe aus: cargo new --lib sensorium-sync
- [ ] Füge Abhängigkeiten hinzu: automerge 2.0 (wasm, serde, bytes), automerge-repo 2.0
- [ ] Erstelle Automerge-Dokumenten-Verwaltungs-API in src/lib.rs
- [ ] Erstelle binäre Format speichern/laden Funktionen
- [ ] Richte wasm-pack für WebAssembly-Ziel ein
- [ ] Erstelle Yjs 13.6 + y-webtransport Provider-Konfiguration für Frontend
- [ ] Überprüfung: cargo build --package sensorium-sync --release --features wasm,serde

**WebTransport + QUIC Aufgaben:**
- [ ] Führe aus: cargo new --lib sensorium-midi
- [ ] Füge Abhängigkeiten hinzu: quinn 0.11, webtransport 0.12, rustls 0.23, tokio 1.38
- [ ] Erstelle QUIC-Server mit TLS-Zertifikat-Generierung (selbstsigniert für Entwicklung)
- [ ] Implementiere WebTransport-Endpunkt-Handler
- [ ] Füge MIDI 2.0 UMP-Nachrichten-Framing über WebTransport-Streams hinzu
- [ ] Implementiere 0-RTT-Reconnect-Logik
- [ ] Füge Stream-Multiplexing für MIDI/SysEx/Metadaten hinzu
- [ ] Überprüfung: cargo build --package sensorium-midi --release --features webtransport,quic

**Überprüfung (Automerge):**
- [ ] cargo build schlägt mit WASM-Features erfolgreich
- [ ] Führe aus: wasm-pack build --target web --out-dir pkg sensorium-sync
- [ ] Bestätige, dass .wasm und .js Bindings erzeugt wurden
- [ ] Überprüfe, ob Yjs Provider-Konfiguration für Frontend bereit ist

**Überprüfung (WebTransport):**
- [ ] cargo build schlägt mit webtransport/quic-Features erfolgreich
- [ ] Führe aus: cargo test --package sensorium-midi --lib
- [ ] Überprüfe, ob QUIC-Server startet und Verbindungen annimmt
- [ ] Überprüfe, ob WebTransport-Endpunkt auf Verbindungen reagiert

**Ausstiegskriterien (Automerge):**
- [ ] sensorium-sync kompiliert mit WASM-Features
- [ ] wasm-pack erzeugt .wasm und .js Bindings
- [ ] Yjs Provider-Konfiguration bereit für Frontend

**Ausstiegskriterien (WebTransport):**
- [ ] sensorium-midi kompiliert mit QUIC/WebTransport-Features
- [ ] QUIC-Server startet und akzeptiert Verbindungen
- [ ] WebTransport-Endpunkt reagiert auf Verbindungen

### Tag 4: CI mit Formal Verification & Contract Artifacts
**Fertigkeit:** `cargo-kani` + `cargo-prusti` + `cargo-creusot`, `prost` + `tonic` + OpenAPI Generator  
**Harness Integration:** `ci/verify.yml`, `specs/*.proto` + `openapi.yaml`

**CI mit Formal Verification Aufgaben:**
- [ ] Erstelle .github/workflows/verify.yml
- [ ] Füge Standard-Jobs hinzu: build, type-check, lint, test
- [ ] Füge formal-verification job mit hinzu:
  - [ ] cargo-kani Installationschritt
  - [ ] Kani Modellprüfung für sensorium-audio
  - [ ] Beweis: Audio-Callback kein Panic, kein Alloc, Grenzen OK
- [ ] Füge cargo-prusti Installationschritt hinzu
- [ ] Füge Prusti deduktive Verifikation für heiße Pfade hinzu
- [ ] Füge cargo-creusot Installationschritt hinzu
- [ ] Füge Creusot Coq-Beweise für DSP-Lemmata hinzu
- [ ] Füge Caching für Verifikationsartefakte hinzu, um Builds zu beschleunigen
- [ ] Füge contract-test job für Protobuf/OpenAPI-Validierung hinzu
- [ ] Überprüfe den Workflow mit: act run oder push zum Auslösen

**Contract Artifacts Aufgaben:**
- [ ] Erstelle specs/ Verzeichnis
- [ ] Schreibe audio-engine.proto (AudioCallback, Parameter, Transport)
- [ ] Schreibe midi-2.0.proto (UMPMessage, PerNoteExpression, DeviceProfile)
- [ ] Schreibe state-sync.proto (AutomergeOp, SyncMessage, DocumentPatch)
- [ ] Schreibe visual-engine.proto (RenderCommand, GPUBuffer, NodeTransform)
- [ ] Schreibe local-ai.proto (InferenceRequest, FunctionCall, MorphParams)
- [ ] Schreibe openapi.yaml für REST API (Web Dashboard)
- [ ] Füge prost/tonic build.rs für Codegenerierung hinzu
- [ ] Überprüfung: cargo build --package sensorium-audio, npm run generate:types

**Überprüfung (CI):**
- [ ] .github/workflows/verify.yml existiert
- [ ] Validiere YAML-Syntax
- [ ] Überprüfe auf alle 6 erforderlichen Jobs: build, type-check, lint, test, formal-verification, contract-test
- [ ] Überprüfe, ob Kani/Prusti/Creusot-Schritte definiert sind

**Überprüfung (Contract):**
- [ ] Bestätige, dass alle 6 .proto-Dateien existieren: specs/*.proto
- [ ] Bestätige, dass openapi.yaml existiert
- [ ] Überprüfe, ob cargo build Rust-Typen über build.rs generiert
- [ ] Überprüfe, ob npm TypeScript-Typen aus openapi.yaml generiert

**Ausstiegskriterien (CI):**
- [ ] verify.yml existiert mit allen 6 Jobs
- [ ] Kani/Prusti/Creusot-Schritte definiert
- [ ] Workflow besteht Syntaxvalidierung

**Ausstiegskriterien (Contract):**
- [ ] 6 Contract-Dateien erstellt
- [ ] Protobuf generiert Rust-Typen über build.rs
- [ ] OpenAPI generiert TypeScript-Typen

### Tag 5: Eval Harness Setup & Agent Harness Skeleton
**Fertigkeit:** `eval-harness` skill, `agent-harness-construction` + `autonomous-agent-harness`  
**Harness Integration:** `evals/*.md` + `hooks/eval-runner.sh`, `sensorium-harness/` Struktur

**Eval Harness Setup Aufgaben:**
- [ ] Erstelle evals/ Verzeichnis mit M1-M7 Eval-Definitionen
- [ ] Erstelle hooks/eval-runner.sh mit capability/regression/report-Modi
- [ ] Definiere M1 Eval: audio-callback-latency.md (p99<0.5ms, Kani-Beweis)
- [ ] Definiere M2 Eval: contract-generation.md (Protobuf-Gen, Automerge-Sync<5ms)
- [ ] Definiere M3 Eval: health-prediction.md (Isolation Forest, Präzision>80%)
- [ ] Definiere M4 Eval: gpu-compute-throughput.md (FFT<0.1ms, 10k Nodes)
- [ ] Definiere M5 Eval: llm-inference-speed.md (llamafile<500ms, Hot Reload<200ms)
- [ ] Definiere M6 Eval: neural-morph-latency.md (RAVE<10ms)
- [ ] Definiere M7 Eval: production-readiness.md (24h Soak, Chaos MTTR<500ms)
- [ ] Überprüfung: bash hooks/eval-runner.sh M1 capability

**Agent Harness Skeleton Aufgaben:**
- [ ] Erstelle agents/ Verzeichnisstruktur für 8 Agents
- [ ] Erstelle Agent-Markdown-Definitionen (bereits vorhanden)
- [ ] Erstelle run.sh für jeden Agent mit schema-first JSON I/O
- [ ] Implementiere Wiederherstellungsverträge für jeden Agent
- [ ] Füge Agents zum Harness-Registrierungssystem hinzu
- [ ] Überprüfung: echo '{"task":"build"}' | bash agents/audio-engine/run.sh

**Überprüfung (Eval Harness):**
- [ ] Bestätige, dass 7 Eval-Defintionsdateien in evals/ existieren
- [ ] Bestätige, dass hooks/eval-runner.sh existiert und ausführbar ist
- [ ] Überprüfe, ob bash hooks/eval-runner.sh M1 capability läuft
- [ ] Überprüfe, ob eval-reports/M1/report.json erzeugt wird

**Überprüfung (Agent Harness):**
- [ ] Bestätige, dass 8 Agent run.sh-Dateien existieren: agents/*/run.sh
- [ ] Überprüfe, dass jede run.sh ausführbar ist
- [ ] Teste JSON I/O: echo '{"task":"build"}'
- [ ] Bestätige, dass agents/*/run.sh existieren und korrekt reagieren

**Ausstiegskriterien (Eval Harness):**
- [ ] 7 Eval-Defintionsdateien erstellt
- [ ] eval-runner.sh führt aus und erzeugt JSON-Reports
- [ ] Gate M1 Capability Evals definiert

**Ausstiegskriterien (Agent Harness):**
- [ ] 8 Agent run.sh-Dateien existieren und sind ausführbar
- [ ] Jeder akzeptiert JSON-Stdin, produziert JSON-Stdout
- [ ] Wiederherstellungsverträge implementiert

### Tag 6-7: Erste Benchmarks + Evals
**Fertigkeit:** `criterion` + `latency-critical-systems`  
**Harness Integration:** Gate M1 Eval Definition

**Aufgaben:**
- [ ] Füge criterion 0.5 zu sensorium-audio dev-dependencies hinzu
- [ ] Erstelle benches/audio_callback_latency.rs
- [ ] Implementiere Audio-Callback-Benchmark mit p50/p95/p99-Tracking
- [ ] Führe aus: cargo bench --package sensorium-audio
- [ ] Führe aus: bash hooks/eval-runner.sh M1 capability
- [ ] Führe aus: bash hooks/eval-runner.sh M1 regression
- [ ] Führe aus: bash hooks/eval-runner.sh M1 report
- [ ] Überprüfe pass@3 > 90% für Capability, pass^3 = 100% für Regression
- [ ] Protokolliere Basiswerte in eval-reports/M1/baseline.json

**Überprüfung:**
- [ ] cargo bench läuft und erzeugt HTML-Reports
- [ ] Überprüfe, ob bash hooks/eval-runner.sh M1 report JSON erzeugt
- [ ] Überprüfe, ob eval-reports/M1/report.json capability_count > 0 enthält
- [ ] Überprüfe, ob Basiswerte für Regressionserkennung etabliert sind

**Ausstiegskriterien:**
- [ ] Criterion-Benchmarks laufen und erzeugen HTML-Reports
- [ ] M1 Eval-Report erzeugt mit capability_count > 0
- [ ] Basiswerte für Regressionserkennung etabliert

## Legende
- [ ] Nicht begonnen
- [~] In Bearbeitung
- [x] Abgeschlossen
- [!] Blockiert

## Wie zu aktualisieren
Während Sie Aufgaben erledigen, markieren Sie die entsprechenden Kästchen. Der Gesamtfortschrittsprozentsatz wird wie folgt berechnet:
(Anzahl der abgeschlossenen Kästchen / Gesamtanzahl der Kästchen) * 100

Sie können die "Gesamtfortschritt" Zeile oben manuell aktualisieren oder ein Skript verwenden, um sie automatisch zu berechnen.

## Nächste Aktion
Beginnen Sie mit Tag 1: Führen Sie den blueprint skill aus, um den Phase 0-Plan zu generieren und die initialen ADRs zu erstellen.