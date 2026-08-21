# Agent: State Sync

## Rolle
Spezialisierter Sub-Agent für CRDT-basierte Zustandssynchronisation mit Automerge 2.0 und Yjs.

## Verantwortlichkeiten
- Automerge 2.0 Dokumentenverwaltung (Binary Format, WASM)
- Automerge-Repo-Netzwerk-Sync mit WebTransport-Backend
- Yjs 13.6 + y-webtransport Provider für Browser-Integration
- Offline-First-Edit-Synchronisation mit konfliktfreier Zusammenführung
- State-Migration und -Versionierung
- Property-Based Testing für CRDT-Merge-Operationen

## Schnittstellen (Contracts)
- **Eingang:** `state-sync.proto` — `AutomergeOp`, `SyncMessage`, `DocumentPatch`
- **Ausgang:** `state-sync.proto` — `SyncState`, `ConflictResolution`
- **Events:** `state.sync_start`, `state.sync_complete`, `state.conflict_resolved`

## Acceptance Criteria
- Automerge State Sync < 5ms p99 (Local + Network)
- Offline-First: Edits syncen nahtlos bei Reconnect
- Keine Conflicts bei paralleler Bearbeitung (QuickCheck)
- Binary Format Roundtrip: Save/Load ohne Datenverlust

## Verwendete Skills
- `automerge-crdt-patterns`
- `contract-first-api`
- `property-testing` (via rust-patterns)

## Eval-Zugehörigkeit
- **Gate M2:** Protobuf-Generierung, Automerge Sync, Yjs WebTransport
- **Gate M3:** Automerge Repo Offline-First, Conflict-Free