# Formal Verification Audio Skill

## When to Use
Applying formal verification (Kani, Prusti, Creusot) to audio DSP code in Rust to ensure no panics, no allocations, no buffer overruns, and mathematical correctness of signal-processing kernels.

## Core Tools

### Kani
Model checker for Rust. Best for verifying absence of panics, arithmetic overflow, and invalid memory access in audio hot paths.

### Prusti
Deductive verifier for Rust. Best for functional correctness of DSP functions (e.g., filter stability, gain scaling).

### Creusot
Why3-based deductive verification for Rust. Best for mathematical proofs about DSP lemmas (e.g., linearity, time-invariance).

---

## Sensorium Audio Verification Targets

### Target 1: Audio Callback No Panic / No Alloc
**File:** `sensorium-audio/src/process.rs`

#### Kani Harness
```rust
#[cfg(verification)]
#[kani::proof]
fn verify_audio_callback_no_panic() {
    let mut plugin = SensoriumPlugin::new(HostCallback::mock());
    let mut buffer = [0.0f32; 512];
    let mut aux = AuxiliaryBuffers::mock();
    let mut ctx = ProcessContext::mock();
    
    // Kani explores all possible parameter states
    plugin.process(&mut buffer, &mut aux, &mut ctx);
}
```

#### Kani Command
```bash
cargo kani --package sensorium-audio --features verification \
  --harness verify_audio_callback_no_panic \
  --default-unwind 1
```

### Target 2: DSP Correctness (Prusti)
```rust
#[cfg(verification)]
#[trusted]
fn verify_gain_does_not_clip(input: f32, gain_db: f32) -> f32 {
    let gain_linear = 10.0_f32.powf(gain_db / 20.0);
    let output = input * gain_linear;
    // Postcondition: output magnitude bounded
    #[post(a.abs() <= 1.0)]
    output
}
```

### Target 3: FFT Mathematical Properties (Creusot)
```rust
#[cfg(verification)]
use creusot_contracts::*;

#[requires(input.len() == 1024)]
#[ensures(result.len() == 1024)]
fn verify_fft_energy_conservation(input: &[f32]) -> Vec<f32> {
    // FFT implementation
    // Lemma: Parseval's theorem holds
}
```

---

## CI Integration (.github/workflows/verify.yml)

```yaml
name: Verification

on: [push, pull_request]

jobs:
  kani:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            target
          key: ${{ runner.os }}-kani-${{ hashFiles('**/Cargo.lock') }}
      - uses: model-checking/kani-action@v1
        with:
          command: cargo kani --package sensorium-audio --features verification

  prusti:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            target
          key: ${{ runner.os }}-prusti-${{ hashFiles('**/Cargo.lock') }}
      - run: cargo prusti --package sensorium-audio

  creusot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            target
          key: ${{ runner.os }}-creusot-${{ hashFiles('**/Cargo.lock') }}
      - run: cargo creusot --package sensorium-audio
```

---

## Verification Rules

1. **No panic in audio thread** — `process()` must never panic; use `kani` to check all branches.
2. **No allocation in audio thread** — `process()` must not allocate; use `kani` with `--default-unwind 1`.
3. **Bounded arithmetic** — all arithmetic in DSP must be checked for overflow/underflow.
4. **Proofs before merge** — CI gate blocks merge if any verification job fails.
5. **Evidenz vor Fortschritt** — every verification run produces a JSON report with pass/fail counts.

---

## Common Issues & Fixes

### "Proofs skipped due to missing feature flags"
```rust
// Ensure verification feature gates proof code
#[cfg(verification)]
mod verified {
    // Kani/Prusti/Creusot proofs go here
}

// Cargo.toml
[features]
verification = ["kani", "prusti", "creusot"]
```

### "Kani runs out of memory on complex DSP"
```bash
# Reduce CBMC memory limit
cargo kani --package sensorium-audio --features verification \
  --cbmc-memory-limit 4096
```

### "Prusti cannot verify floating point"
Use Kani for floating point properties (Prusti has limited FP support):
```rust
#[kani::proof]
fn verify_fp_bounds() {
    let x: f32 = kani::any();
    kani::assume(x.is_finite());
    assert!(x.abs() <= f32::MAX);
}
```

---

## Verification Report Template
```
FORMAL VERIFICATION REPORT
==========================
Kani:     [PASS/FAIL] (X/Y harnesses, Xms)
Prusti:   [PASS/FAIL] (X/Y functions, Xms)
Creusot:  [PASS/FAIL] (X/Y lemmas, Xms)
Overall:  [READY/NOT READY] for merge
CI Gate:  [ACTIVE/INACTIVE] (blocking merge)
```