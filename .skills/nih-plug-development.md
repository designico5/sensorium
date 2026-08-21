# NIH-Plug Development Skill

## When to Use
Building, verifying, and releasing VST3/CLAP/Standalone audio plugins with the NIH-Plug framework in Rust.

## Core Patterns

### Project Structure
```
sensorium-audio/
├── Cargo.toml
├── src/
│   ├── lib.rs          # Plugin entry point
│   ├── plugin.rs       # AudioPlugin trait impl
│   ├── params.rs       # Parameter definitions
│   ├── process.rs      # Audio callback (hot path)
│   └── editor.rs       # Vizia GUI
```

### Cargo.toml Template
```toml
[package]
name = "sensorium-audio"
version = "0.1.0"
edition = "2021"
categories = ["audio", "multimedia"]

[dependencies]
nih-plug = { version = "0.8", features = ["vst3", "clap", "standalone", "vizia"] }
nih-plug-vizia = { version = "0.8", features = ["vizia"] }
fundsp = "0.11"
rubato = "0.16"
cpal = "0.16"
ringbuf = "0.4"
thiserror = "1.0"
anyhow = "1.0"

[features]
default = ["vst3", "clap", "standalone", "vizia"]
vst3 = ["nih-plug/vst3", "nih-plug-vizia/vst3"]
clap = ["nih-plug/clap"]
standalone = ["nih-plug/standalone"]
vizia = ["nih-plug-vizia"]
verification = ["kani", "prusti"]

[dev-dependencies]
kani = { version = "0.1", optional = true }
prusti = { version = "0.1", optional = true }
criterion = "0.5"
```

### AudioPlugin Implementation
```rust
// lib.rs
nih_plug::nih_export_plugin!(SensoriumPlugin);

struct SensoriumPlugin {
    params: Arc<SensoriumParams>,
    // DSP state
    gain_processor: fundsp::hack::Gain<f32>,
    resampler: Option<rubato::SincFixedIn<f32>>,
}

impl Plugin for SensoriumPlugin {
    const NAME: &'static str = "Sensorium";
    const VENDOR: &'static str = "Sensorium AI Studio";
    const URL: &'static str = "https://sensorium.ai";
    const EMAIL: &'static str = "dev@sensorium.ai";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");
    
    type SysExMessage = ();
    type BackgroundTask = ();

    fn new(_host: HostCallback) -> Self {
        let params = Arc::new(SensoriumParams::default());
        Self {
            params,
            gain_processor: fundsp::hack::Gain::default(),
            resampler: None,
        }
    }

    fn process(&mut self, buffer: &mut Buffer, _aux: &mut AuxiliaryBuffers, context: &mut ProcessContext) {
        // Hot path - NO ALLOCATIONS, NO PANICS
        let gain = self.params.gain.smoothed.next();
        for channel in buffer.iter_channels() {
            for sample in channel {
                *sample *= gain;
            }
        }
    }

    fn params(&self) -> Arc<dyn Params> { self.params.clone() }
    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        Some(Box::new(SensoriumEditor::default()))
    }
}
```

### Parameter Definitions
```rust
// params.rs
#[derive(Params)]
struct SensoriumParams {
    #[id = "gain"]
    #[range = -60.0 .. 24.0]
    #[default = 0.0]
    #[unit = " dB"]
    gain: FloatParam,
    
    #[id = "bypass"]
    #[default = false]
    bypass: BoolParam,
}

impl SensoriumParams {
    fn smoothed(&self) -> SmoothedValue {
        self.gain.smoothed.clone()
    }
}
```

## Verification Gates

### Gate M1: Audio Callback Latency
```bash
# Benchmark
cargo bench --package sensorium-audio -- audio_callback_latency

# Kani Proof
cargo kani --package sensorium-audio --features verification \
  --harness verify_audio_callback_no_panic \
  --harness verify_audio_callback_no_alloc
```

**Targets:**
- p99 latency < 0.5 ms
- Zero allocations in `process()`
- No panics in `process()`
- Build success with all features

### Gate M2: DSP Correctness
```bash
# Prusti deductive verification
cargo prusti --package sensorium-audio

# Creusot Coq proofs for DSP lemmas
cargo creusot --package sensorium-audio
```

## Common Fixes

### Version Drift Fix
```bash
# WRONG: Git master dependency
# nih-plug = { git = "https://github.com/robbert-vdh/nih-plug" }

# CORRECT: Versioned crate
nih-plug = { version = "0.8", features = ["vst3", "clap", "standalone", "vizia"] }
```

### Fundsp Integration
```rust
use fundsp::hacker::*;

let mut chain = gain(0.5) >> lowpass_hz(44100.0, 1000.0);
chain.process(&mut buffer);
```

### Rubato Resampling
```rust
let resampler = SincFixedIn::<f32>::new(
    48000.0 / 44100.0,  // ratio
    2.0,                // max ratio
    rubato::SincInterpolationParameters {
        sinc_len: 256,
        f_cutoff: 0.95,
        oversampling_factor: 256,
        interpolation: rubato::SincInterpolationType::Linear,
        window: rubato::WindowFunction::BlackmanHarris2,
    },
    2,  // channels
    512, // max input len
).unwrap();
```

## Build Verification
```bash
# Full feature build
cargo build --package sensorium-audio --release \
  --features vst3,clap,standalone,vizia

# Verify artifacts
ls target/release/*.so      # Linux VST3/CLAP
ls target/release/*.dylib   # macOS VST3
ls target/release/*.vst3    # VST3 bundle
ls target/release/sensorium # Standalone executable
```

## Verification Report Template
```
NIH-PLUG VERIFICATION REPORT
============================
Build:        [PASS/FAIL] (features: vst3,clap,standalone,vizia)
Kani Proofs:  [PASS/FAIL] (X/Y proofs passed)
Prusti:       [PASS/FAIL] (X/Y functions verified)
Creusot:      [PASS/FAIL] (X/Y lemmas proven)
Benchmark:    [PASS/FAIL] (p99: X ms, target: < 0.5 ms)
Artifacts:    [PASS/FAIL] (VST3, CLAP, Standalone, Vizia)
Overall:      [READY/NOT READY] for release
```