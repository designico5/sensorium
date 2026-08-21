---
name: latency-critical-patterns
description: Use when designing realtime audio/MIDI/visual paths in Sensorium where p50/p95/p99 budgets, backpressure, zero-copy, and canary checks matter.
---

# Latency Critical Patterns

## Overview
Sensorium’s audio, MIDI, and visual paths have hard real-time constraints. This skill captures thread-safe, allocation-free, and backpressure-aware patterns specific to audio callback and interactive control surfaces.

## When to Use
- Audio callback / process hot path
- MIDI input scheduling and routing
- GUI data pump under lock-free constraints
- Resource budgets with O(1) enforcement
- Detecting stale data before it reaches the render stage

## Core Pattern

### Hot Path Audit
Enumerate every call in the callback:
- atomic loads for parameters
- lock-free ring buffer push
- DSP math using pre-allocated buffers
- no blocking I/O, no `Mutex`, no heap alloc

### Backpressure + Degradation
```rust
if audio_tx.remaining() < needed {
  // skip oldest sample or downgrade quality
  // never block the audio callback
}
```

### Budget Enforcement
Track per-segment latency with atomic counters or ring-buffer telemetry:
- audio callback
- MIDI parse + route
- visual render frame
- state sync delta application

### Canary for Stale Data
Detect when producers lag:
```rust
let last = latest_timestamp.load(Ordering::Relaxed);
if now - last > STALE_THRESHOLD { trigger_degraded_mode(); }
```

## Verification
Use criterion benchmarks plus Kani proofs. Gate thresholds should be codified in `evals/M1` and `evals/M4`.

## Common Mistakes
- Blocking on a network stream from the audio thread
- Allocating `Vec` inside the process callback
- Sharing GUI state behind a `Mutex` across threads
- Optimizing cold-path code while hot-path regresses