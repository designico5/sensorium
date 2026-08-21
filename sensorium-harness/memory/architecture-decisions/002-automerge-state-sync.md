# ADR-002: Automerge 2.0 State Sync

**Status**: Accepted
**Date**: 2026-08-20
**Deciders**: Sensorium Architecture Team
**Technical Story**: Phase 0 - Foundation Bootstrap

## Context

Need offline-first, conflict-free state synchronization across:
- Rust backend (plugin, server, sidecars)
- Web frontend (React + Tauri)
- Multiple devices (desktop, mobile, controllers)
- Network partitions and intermittent connectivity

Requirements:
- CRDT with strong eventual consistency
- Binary format for efficient storage/transport
- WASM support for browser parity
- Network sync layer with multiple transport options
- Integration with Yjs for web ecosystem

## Decision

Adopt **Automerge 2.0** (Rust core) + **automerge-repo 2.0** (sync layer) + **Yjs 13.6** (web) + **y-webtransport** (transport).

### Implementation Details

```toml
# Cargo.toml
automerge = { version = "2.0", features = ["wasm", "serde", "bytes"] }
automerge-repo = "2.0"
# Storage: SqliteStorage, MemoryStorage, IndexedDBStorage (WASM)
# Network: WebTransportBackend, WebSocketBackend, CustomBackend

# package.json (frontend)
yjs = "13.6"
y-webtransport = "0.1"
```

### Document Schema
```rust
// Shared types (Rust ↔ TypeScript via Protobuf)
struct SessionDoc {
    tracks: Vec<Track>,      // List (CRDT sequence)
    clips: Map<ClipId, Clip>, // Map (CRDT map)
    settings: Settings,       // Map
    timeline: Timeline,       // Custom CRDT type
}
```

### Sync Architecture
```
┌─────────────┐     Binary Changes      ┌─────────────┐
│ Rust Repo   │◄────────────────────────►│ Browser     │
│ (automerge- │     WebTransport        │ (Yjs +      │
│  repo)      │     / QUIC              │  y-webtransport)│
└─────────────┘                         └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│ SQLite      │                         │ IndexedDB   │
│ Persistence │                         │ Persistence │
└─────────────┘                         └─────────────┘
```

## Consequences

### Positive
- True offline-first: edit anywhere, sync later
- Zero conflicts: CRDT guarantees convergence
- Binary format: 10x smaller than JSON
- WASM: same core runs in browser + Rust
- automerge-repo handles: storage, network, auth, conflicts
- Yjs ecosystem: rich text, bindings for React/Vue/Svelte

### Negative
- Automerge 2.0 API differs from 1.x (migration needed)
- Binary format not human-readable (debugging harder)
- Large documents need periodic compaction
- Network backend requires custom implementation for WebTransport

### Neutral
- Conflict resolution is automatic (last-writer-wins for scalars)
- Custom merge logic via application-level types
- Compression (lz4) recommended for network transfer

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| Yjs only (no Rust) | Web-native | No Rust backend parity | Need shared core |
| Custom CRDT | Full control | Enormous effort, subtle bugs | Reinventing wheel |
| Redis CRDT | Managed | Requires Redis, not offline-first | Architecture mismatch |
| Event sourcing | Audit trail | Manual conflict resolution | Not conflict-free |
| Raft consensus | Strong consistency | Requires quorum, not offline | Wrong tradeoff |

## References

- [Automerge 2.0 Release](https://github.com/automerge/automerge/releases/tag/v2.0.0)
- [Automerge Repo](https://github.com/automerge/automerge-repo)
- [Skill: automerge-crdt-patterns](sensorium-harness/skills/automerge-crdt-patterns/SKILL.md)
- [Yjs 13.6](https://github.com/yjs/yjs)
- [y-webtransport](https://github.com/yjs/y-webtransport)