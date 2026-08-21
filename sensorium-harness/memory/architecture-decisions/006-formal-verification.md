# ADR-006: Formal Verification Strategy (Kani + Prusti + Creusot)

**Status**: Accepted
**Date**: 2026-08-20
**Deciders**: Sensorium Architecture Team
**Technical Story**: Phase 0 - Foundation Bootstrap

## Context

Need formal proofs for audio thread correctness:
- No panics in real-time callback (p99 < 0.5ms)
- No allocations in audio thread (lock-free)
- No data races (Send + Sync bounds)
- Memory safety (no UB, no buffer overflows)
- Functional correctness: DSP graph invariants

Previous: Testing only - cannot guarantee absence of bugs in hot paths.

## Decision

Adopt **three-tier verification** with **Kani** (model checking), **Prusti** (deductive), **Creusot** (deductive, Why3 backend).

### Implementation Details

```toml
# Cargo.toml
kani = "0.33"
prusti-contracts = "0.12"
creusot = "0.10"

# Verification harness (separate crate)
# crate: sensorium-verify
```

### Tier 1: Kani (Model Checking) - Hot Path Properties
```rust
// Proof: audio callback never panics
#[kani::proof]
fn proof_audio_callback_no_panic() {
    let mut plugin = SensoriumPlugin::new();
    let mut buffer = AudioBuffer::new(2, 512);
    let events = MidiEvents::new();
    
    // Kani explores all possible inputs
    let result = plugin.process(&mut buffer, &events);
    kani::assert(result.is_ok(), "Audio callback must not panic");
}

// Proof: no allocations in audio thread
#[kani::proof]
fn proof_no_alloc_in_audio_thread() {
    let mut plugin = SensoriumPlugin::new();
    let mut buffer = AudioBuffer::new(2, 512);
    
    // Track allocations via custom allocator
    let alloc_count = kani::allocator::allocated();
    plugin.process(&mut buffer, &MidiEvents::new()).unwrap();
    let alloc_after = kani::allocator::allocated();
    
    kani::assert(alloc_after == alloc_count, "Zero allocations in audio thread");
}

// Proof: ringbuf operations are lock-free
#[kani::proof]
fn proof_ringbuf_lockfree() {
    let rb = RingBuffer::<f32>::new(1024);
    let mut producer = rb.producer();
    let mut consumer = rb.consumer();
    
    // Verify push/pop never block
    for _ in 0..100 {
        let _ = producer.push(kani::any());
        let _ = consumer.pop();
    }
}
```

### Tier 2: Prusti (Deductive) - Contract Verification
```rust
// DSP graph node contract
#[requires(buffer.len() >= frames)]
#[ensures(result.is_ok() ==> result.unwrap().len() == frames)]
#[ensures_no_panic]
fn process_dsp_node(buffer: &mut [f32], frames: usize) -> Result<(), DspError> {
    // Implementation with loop invariants
    #[invariant(forall i: usize, 0 <= i < frames ==> buffer[i].is_finite())]
    for i in 0..frames {
        buffer[i] = process_sample(buffer[i]);
    }
    Ok(())
}

// Parameter smoothing contract
#[ensures(|old_val, new_val, smoothed| 
    (smoothed - new_val).abs() <= (old_val - new_val).abs())]
fn smooth_param(old: f32, new: f32, factor: f32) -> f32 {
    old + (new - old) * factor
}
```

### Tier 3: Creusot (Why3) - Complex Invariants
```rust
// Full functional correctness for FFT
#[predicate]
fn fft_correct(input: Seq<f32>, output: Seq<f32>) -> bool {
    // Mathematical FFT definition
    forall k: usize, 0 <= k < input.len() ==>
        output[k] == sum(0..input.len(), |n| input[n] * exp(-2*PI*k*n/input.len()))
}

#[requires(input.len().is_power_of_two())]
#[ensures(fft_correct(input@, result@))]
fn fft_inplace(input: &mut [f32]) {
    // Cooley-Tukey with loop invariants
    #[invariant(fft_partial_correct(..))]
    for stage in 0..log2(input.len()) {
        // Butterfly operations
    }
}
```

### CI Integration
```yaml
# .github/workflows/verify.yml
verify-kani:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@nightly
      with: { components: kani }
    - run: cargo kani --package sensorium-verify -- --default-unwind 10

verify-prusti:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - run: cargo prusti-check --package sensorium-verify

verify-creusot:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - run: cargo creusot --package sensorium-verify
```

### Verification Coverage Targets (per Gate)
| Gate | Kani | Prusti | Creusot |
|------|------|--------|---------|
| M1 (Week 2) | Audio callback, ringbuf | Param smoothing | - |
| M2 (Week 3) | MIDI parser, UMP router | DSP node contracts | FFT correctness |
| M3 (Week 4) | State sync merge | CRDT invariants | - |
| M6 (Week 9) | All hot paths | All public APIs | Core algorithms |
| M7 (Week 12) | 100% audio thread | 100% hot paths | 100% core DSP |

## Consequences

### Positive
- Mathematical guarantees for audio thread safety
- Catches bugs tests miss (concurrency, edge cases)
- Documentation: contracts = executable specs
- CI gate: blocks merge on proof failure
- Tool diversity: model checking + deductive = complementary

### Negative
- Significant annotation burden (contracts, invariants)
- Verification time: Kani ~minutes, Prusti/Creusot ~hours
- Learning curve: separation logic, Why3, proof tactics
- False positives: over-approximation may require refinement

### Neutral
- Staged approach: start with Kani (easiest), add Prusti/Creusot
- Nightly required for Kani (stable for Prusti/Creusot)
- Contracts double as runtime checks (debug builds)
- Verification crate separate from production crate

## Alternatives Considered

| Alternative | Pros | Cons | Why Not Chosen |
|-------------|------|------|----------------|
| Miri only | Finds UB | No functional correctness, slow | Not proof-level |
| Ada/SPARK | Mature proofs | Different language, no Rust ecosystem | Language mismatch |
| TLA+ | System-level | Not code-level, separate model | Gap between model & code |
| Coq/Lean | Full dependent types | Extreme effort, not Rust | Overkill |
| Testing + fuzzing | Practical | No guarantees, misses edge cases | Insufficient for audio thread |

## References

- [Kani Model Checker](https://github.com/model-checking/kani)
- [Prusti](https://github.com/viperproject/prusti-dev)
- [Creusot](https://github.com/creusot-rs/creusot)
- [Skill: formal-verification-audio](sensorium-harness/skills/formal-verification-audio/SKILL.md)
- [Why3](https://why3.lri.fr/)

## Fact-Forcing Gate Metadata

**Importers/Callers**:
- `crates/sensorium-verify/src/kani/` - Kani model checking proofs
- `crates/sensorium-verify/src/prusti/` - Prusti contract verification
- `crates/sensorium-verify/src/creusot/` - Creusot deductive proofs

**Affected API**:
- `kani::proof` functions for audio callback, ringbuf, MIDI parser
- `#[requires]`, `#[ensures]`, `#[invariant]` on all hot-path functions
- `#[predicate]` definitions for mathematical specifications (FFT, CRDT merge)

**Data Schemas**:
- Kani harness: `AudioBuffer { channels: usize, frames: usize, data: Vec<f32> }`
- Prusti contracts: DSP node traits with pre/post conditions
- Creusot predicates: `fft_correct`, `crdt_merge_assoc`, `ringbuf_fifo`

**User Instruction**: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with 'I'll continue' or similar. Pick up the last task as if the break never happened."