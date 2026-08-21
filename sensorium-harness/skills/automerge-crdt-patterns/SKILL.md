---
name: automerge-crdt-patterns
description: Use when implementing offline-first state sync with Automerge 2.0 Rust + Yjs Web, binary format, WASM, and automerge-repo network sync
---

# Automerge CRDT Patterns

## Overview
Automerge 2.0 (2024 release) provides a production-ready CRDT with Rust core, WASM support, binary encoding, and `automerge-repo` for network synchronization. Combines with Yjs 13.6 + `y-webtransport` for browser clients.

## When to Use
- Collaborative editing / shared state across devices
- Offline-first applications with eventual consistency
- Need conflict-free merges without central server
- Cross-platform: Rust backend + Web (Yjs) frontend
- Binary format for efficient storage/transport

## Core Pattern

### Cargo.toml Setup
```toml
[dependencies]
automerge = { version = "2.0", features = ["wasm", "serde", "bytes"] }
automerge-repo = "2.0"        # Network sync layer
# For Web (npm):
# yjs = "13.6"
# y-webtransport = "0.1"
```

### Document Model (Shared Types)
```rust
use automerge::{Automerge, ObjType, Value, ChangeHash};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Track {
    id: String,
    name: String,
    clips: Vec<Clip>,
    volume: f32,
    pan: f32,
    muted: bool,
    solo: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Clip {
    id: String,
    track_id: String,
    start_time: f64,        // Beats
    duration: f64,          // Beats
    source: ClipSource,
    warp_markers: Vec<WarpMarker>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
enum ClipSource {
    Audio { file_path: String, gain: f32 },
    Midi { notes: Vec<MidiNote> },
    Neural { model_id: String, latent: Vec<f32> },
}
```

### Rust Backend: Automerge Repo
```rust
use automerge_repo::{Repo, RepoBackend, StorageBackend, NetworkBackend};
use automerge_repo::storage::SqliteStorage;
use automerge_repo::network::WebTransportBackend;

async fn create_repo() -> Repo {
    let storage = SqliteStorage::new("sensorium.db").await?;
    let network = WebTransportBackend::new("https://sync.sensorium.dev").await?;
    
    Repo::new(
        Box::new(storage),
        vec![Box::new(network)],
        Default::default(),
    )
}

// Create document
let repo = create_repo().await?;
let doc_handle = repo.create().await?;
doc_handle.change(|doc| {
    doc.put_object(ROOT, "tracks", ObjType::List)?;
    doc.put_object(ROOT, "settings", ObjType::Map)?;
    Ok(())
})?;

// Subscribe to changes
let mut subscription = doc_handle.subscribe();
tokio::spawn(async move {
    while let Some(change) = subscription.next().await {
        // Broadcast to connected clients via WebTransport
        broadcast_change(change).await;
    }
});
```

### Binary Format (Efficient Sync)
```rust
use automerge::Automerge;

// Encode to binary (compact, no JSON overhead)
let bytes = Automerge::save(&doc)?;
println!("Document size: {} bytes", bytes.len());

// Decode from binary
let doc = Automerge::load(&bytes)?;

// Incremental sync: send only changes since last known head
let heads = doc.get_heads();
let changes = doc.get_changes(&heads)?;
let encoded = Automerge::encode_changes(&changes)?;
```

### Web Client: Yjs + WebTransport
```typescript
// npm: yjs@13.6, y-webtransport@0.1, webtransport@0.12
import * as Y from 'yjs';
import { WebtransportProvider } from 'y-webtransport';

const ydoc = new Y.Doc();
const provider = new WebtransportProvider(
    'https://sync.sensorium.dev',
    'sensorium-session',
    ydoc,
    { maxRetries: 10, retryTimeout: 1000 }
);

// Shared types map to Rust structs
const tracks = ydoc.getArray('tracks');
const settings = ydoc.getMap('settings');

// Observe changes
tracks.observe(event => {
    console.log('Tracks changed:', event.changes);
});

// Offline-first: changes queue locally, sync on reconnect
provider.on('status', event => {
    console.log('Sync status:', event.status); // 'connecting', 'connected', 'disconnected'
});
```

### Conflict Resolution (Automatic)
```rust
// Automerge resolves conflicts automatically:
// - Last-writer-wins for scalar values
// - Union for sets/lists (both inserts preserved)
// - Move operations: intent preserved

// Custom conflict resolution for complex types:
use automerge::transaction::Transactable;

doc.change_with_callback(|doc| {
    let tracks = doc.get_object(ROOT, "tracks")?.unwrap();
    // Merge strategy: keep both clips, adjust timing
    let clip_a = tracks.get(0)?.unwrap();
    let clip_b = tracks.get(1)?.unwrap();
    // Custom merge logic via application-level types
    Ok(())
}, |change| {
    // Called after change is applied
    broadcast_to_clients(change);
})?;
```

### Performance: Binary + Compression
```rust
use automerge::AutoCommit;
use lz4_flex::compress_prepend_size;

// Auto-commit batches changes
let mut doc = Automerge::new();
doc.set_auto_commit(AutoCommit::Enabled);

// Compress for network transfer
let encoded = Automerge::save(&doc)?;
let compressed = compress_prepend_size(&encoded);
// Typical: 60-80% size reduction
```

## Verification Commands
```bash
# Build with WASM
cargo build --target wasm32-unknown-unknown --features wasm

# Run property tests (proptest)
cargo test --package automerge-crdt -- property_tests

# Benchmark sync latency
cargo bench --package automerge-repo-sync

# Test offline/online cycles
cargo test --package automerge-crdt -- offline_sync_test
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using JSON instead of binary | Use `Automerge::save()` / `load()` for binary |
| Not handling `ChangeHash` for sync | Track heads for incremental sync |
| Blocking on network in Rust | Use `automerge-repo` async backends |
| Large documents without compaction | Call `doc.compact()` periodically |
| Ignoring WASM size | Enable `opt-level = "z"` for wasm build |

## Real-World Impact
- Offline-first: edit anywhere, sync later
- Zero conflicts: CRDT guarantees convergence
- Binary format: 10x smaller than JSON
- WASM: same core runs in browser + Rust
- `automerge-repo`: handles network, storage, auth