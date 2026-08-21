# Learned Pattern: CRDT Merge for Session State

## Context
Sensorium state sync must merge concurrent edits without conflicts.

## Solution
- Store canonical state shapes in Automerge maps/lists.
- Use binary format for transport.
- Compact documents periodically.
- Derive high-level view from CRDT document rather than caching separate state.

## Verification
- QuickCheck/proptest merge tests under concurrent edits.
- Benchmark sync latency: target < 5 ms p99.
- Offline/reconnect simulation with automerge-repo.

## Source
Gate M2 practice + automerge-crdt-patterns skill