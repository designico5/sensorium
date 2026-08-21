# Latency Critical Patterns Skill

## When to Use
Implementing and verifying low-latency patterns for Sensorium’s real-time audio, MIDI, and visual pipelines. Focus on deterministic execution, bounded latency, and backpressure without blocking audio threads.

## Core Metrics (Do Not Collapse)

- **p50 / p95 / p99 latency** — differentiate typical from worst case
- **throughput** — messages, samples, or frames per second
- **freshness age** — time from event to visible result
- **queue depth** — ring buffer occupancy, backpressure state
- **cache hit rate** — for any reused computation
- **failure and retry behavior** — how does degraded mode feel

---

## Hot Path Map

```text
Audio callback (DAW)
  -> DSP process (fundsp/rubato)
  -> Parameter read (gain, filter)
  -> Buffer write (ringbuf shared with GPU)
     -> GPU upload (wgpu)
     -> Visualizer render (60 fps)
```

Every segment must be measured independently.

---

## Optimization Order

1. Remove unnecessary round trips (batch parameter reads).
2. Cache stable reads (static config, device capabilities).
3. Batch small calls (MIDI UMP batching).
4. Move compute closer to data (GPU-side FFT, not CPU).
5. Split hot and cold paths (audio thread separate from file I/O).
6. Apply backpressure before queues grow unbounded (ringbuf full → drop lowest priority).
7. Use streaming only when it improves freshness or UX.

---

## Rate-Limit Guardrails (Sensorium Rule #4)

```bash
# NEVER run these in parallel on the same runner
cargo build --workspace            # Memory-heavy
cargo bench --package sensorium-audio  # CPU-heavy

# Serialize them:
cargo check --workspace
# wait for cache warm
cargo bench --package sensorium-audio
```

---

## Ringbuf + Backpressure Pattern

```rust
use ringbuf::SharedHeapRb;

pub struct AudioToVisualBridge {
    ring: SharedHeapRb<f32>,
}

impl AudioToVisualBridge {
    pub fn push(&self, samples: &[f32]) -> Result<(), RingError> {
        // Non-blocking push; drop oldest if full
        for &s in samples {
            let _ = self.ring.push_overwrite(s);
        }
        Ok(())
    }
    
    pub fn pull(&self, out: &mut [f32]) -> usize {
        // Pull what’s available without waiting
        self.ring.pop_slice(out)
    }
}
```

---

## No-Alloc Hot Path Rules

```rust
// Audio callback — NEVER allocate
fn process(&mut self, buffer: &mut Buffer, _aux: &mut Aux, _ctx: &mut Context) {
    let gain = self.params.gain.smoothed.next();  // pre-allocated
    for frame in buffer.iter_frames() {
        *frame = frame.mul(gain);
    }
}

// Use pre-allocated ring buffers, pools, or bumpalo arenas for cold paths
```

---

## Verification Gates

### Gate M1: Audio Callback Latency
```bash
cargo bench --package sensorium-audio -- audio_callback
# Target p99 < 0.5 ms, 0 allocations
```

### Gate M4: GPU Compute Throughput
```bash
cargo bench --package sensorium-visual -- gpu_fft
# Target FFT < 0.1 ms, 10k nodes @ 60 fps
```

### Gate M7: Production Soak
- 24-hour soak test
- Chaos MTTR < 500 ms
- No buffer underruns

---

## Common Fixes

### Blocking I/O in Audio Thread
```rust
// WRONG: file read in audio callback
fn process(..) { std::fs::read("config.json")... }

// RIGHT: pre-load and cache
let config: Arc<Config> = preload_once();
fn process(..) { use(&*config); }
```

### Unbounded Queue Growth
```rust
// WRONG: unbounded channel
let (tx, rx) = mpsc::unbounded_channel();

// RIGHT: bounded with overflow strategy
let (tx, rx) = mpsc::channel(1024);
drop_if_full(tx.send(msg));
```

---

## Report Template
```
LATENCY CRITICAL REPORT
=======================
Audio Callback p99:[PASS/FAIL] (X µs)
GPU FFT:          [PASS/FAIL] (X µs)
Allocations:      [PASS/FAIL] (X per callback)
Backpressure:     [PASS/FAIL]
Soak 24h:         [PASS/FAIL]
Overall:          [READY/NOT READY]
```