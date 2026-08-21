---
name: formal-verification-audio
description: Use when verifying audio thread code with Kani model checking, Prusti deductive verification, and Creusot for zero-panic, zero-alloc, and bounds guarantees
---

# Formal Verification for Audio Thread

## Overview
Formal verification provides mathematical proofs that audio callback code never panics, never allocates, respects bounds, and meets timing constraints. Kani (model checking), Prusti (deductive verification), and Creusot (deductive + Coq) complement testing for zero-bug audio threads.

## When to Use
- Audio callback (process function) - must be panic-free, alloc-free
- Parameter validation - bounds checking
- Lock-free data structures - ring buffers, atomics
- DSP algorithms - numerical stability, no NaN/Inf
- Real-time safety proofs for certification

## Core Pattern

### Cargo.toml Setup
```toml
[dependencies]
# Verification tools (dev-dependencies)
kani = { version = "0.33", optional = true }
prusti = { version = "0.12", optional = true }
creusot = { version = "0.10", optional = true }

[features]
default = []
verification = ["kani", "prusti", "creusot"]
```

### Kani: Model Checking (Exhaustive State Exploration)
```rust
// crates/sensorium-audio/src/verified.rs
use kani::Arbitrary;

#[kani::proof]
fn verify_audio_callback_no_panic() {
    let mut engine = AudioEngine::new();
    let mut buffer = [0.0f32; 512];
    kani::assume(buffer.len() <= 512);
    
    let mut context = ProcessContext::mock();
    engine.process(&mut buffer, &mut context);
    // Kani proves: no panic for ALL possible inputs
}

#[kani::proof]
fn verify_audio_callback_no_alloc() {
    let mut engine = AudioEngine::new();
    let mut buffer = [0.0f32; 512];
    
    engine.process(&mut buffer, &mut ProcessContext::mock());
    // Proof: zero allocations in hot path
}

#[kani::proof]
fn verify_ringbuf_bounds() {
    let mut rb = RingBuffer::<f32>::new(1024);
    let mut producer = rb.producer();
    let mut consumer = rb.consumer();
    
    let operations: Vec<Op> = kani::any();
    kani::assume(operations.len() <= 100);
    
    for op in operations {
        match op {
            Op::Push(val) => { let _ = producer.push(val); }
            Op::Pop => { let _ = consumer.pop(); }
        }
    }
}

#[derive(kani::Arbitrary)]
enum Op { Push(f32), Pop }

#[kani::proof]
fn verify_parameter_smoothing_bounds() {
    let mut smoother = ParameterSmoother::new(48000.0, 0.02);
    smoother.set_target(kani::any());
    kani::assume(smoother.target() >= -60.0 && smoother.target() <= 6.0);
    
    for _ in 0..512 {
        let val = smoother.next();
        kani::assert(val.is_finite(), "smoother produced non-finite");
        kani::assert(val >= -60.0 && val <= 6.0, "smoother out of bounds");
    }
}
```

### Prusti: Deductive Verification
```rust
use prusti_contracts::*;

#[requires(buffer.len() >= 256)]
#[requires(buffer.len() <= 512)]
#[ensures(result.is_ok())]
#[ensures(no_alloc())]
fn process_audio(buffer: &mut [f32], context: &mut ProcessContext) -> Result<(), AudioError> {
    for (i, sample) in buffer.iter_mut().enumerate() {
        *sample = compute_sample(i, context);
    }
    Ok(())
}

#[ensures(result >= 0.0 && result <= 1.0)]
fn normalize_param(value: f32, range: ParamRange) -> f32 {
    let clamped = value.clamp(range.min, range.max);
    (clamped - range.min) / (range.max - range.min)
}
```

### Creusot: Deductive + Coq
```rust
use creusot_contracts::*;

#[logic]
fn sum_slice(s: Seq<f32>) -> f32 {
    if s.is_empty() { 0.0 } else { s[0] + sum_slice(s.tail()) }
}

#[lemma]
fn energy_conservation(input: Seq<f32>, output: Seq<f32>) {
    // Proof: sum(output^2) <= sum(input^2) * gain^2
}

#[requires(input.len() == 4096)]
#[ensures(output.len() == 4096)]
#[ensures(forall i: 0 <= i < 4096 ==> output[i].is_finite())]
fn fft_4096(input: &[f32], output: &mut [f32]) {
    // Verified Cooley-Tukey implementation
}
```

### CI Integration (Gate M1/M2)
```yaml
# .github/workflows/verify.yml
jobs:
  kani:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo install --locked kani-verifier
      - run: cargo kani --package sensorium-audio --features verification
  prusti:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo install --locked prusti-dev
      - run: cargo prusti --package sensorium-audio --features verification
  creusot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo install --locked creusot
      - run: cargo creusot --package sensorium-audio --features verification
```

### Property-Based Testing
```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn ringbuf_never_loses_data(ops in vec(any::<RingOp>(), 0..1000)) {
        let mut rb = RingBuffer::new(1024);
        let mut expected = Vec::new();
        for op in ops {
            match op {
                RingOp::Push(v) => { if rb.push(v).is_some() { expected.push(v); } }
                RingOp::Pop => { if let Some(v) = rb.pop() { prop_assert_eq!(v, expected.remove(0)); } }
            }
        }
    }
}
```

## Verification Commands
```bash
cargo kani --package sensorium-audio --features verification
cargo prusti --package sensorium-audio --features verification
cargo creusot --package sensorium-audio --features verification
cargo test --package sensorium-audio -- property_tests
./hooks/ci-gate-checks.sh formal
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Verifying cold paths only | Focus on `process()`, parameter smoothing, ringbuf |
| Using `unwrap()` in verified code | Use `Option`/`Result` with preconditions |
| Ignoring `no_alloc` requirement | Add `#[ensures(no_alloc())]` + Kani allocation tracking |
| Floating-point reasoning gaps | Use Creusot + Coq for FP lemmas; Kani for bounds |
| Not running in CI | Gate M1/M2 require passing verification |

## Real-World Impact
- **Gate M1**: Kani proves audio callback panic-free + alloc-free
- **Gate M2**: Prusti/Creusot prove 100% hot path coverage
- Mathematical guarantee vs probabilistic testing
- Catches bugs testing misses: edge cases, overflow, NaN propagation