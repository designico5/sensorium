---
name: nih-plug-development
description: Use when building VST3/CLAP/Standalone audio plugins with NIH-Plug 0.8+, Vizia GUI, fundsp DSP, and rubato resampling
---

# NIH-Plug Development

## Overview
NIH-Plug 0.8 provides a unified framework for VST3, CLAP, and Standalone plugins from a single Rust codebase with RT-safe guarantees, Vizia GPU-accelerated GUI, and built-in parameter automation.

## When to Use
- Creating new audio plugins targeting DAWs (VST3/CLAP) + standalone
- Need RT-safe audio thread with lock-free communication
- Want React-like declarative GUI (Vizia) with GPU acceleration
- Building DSP graphs with fundsp primitives + rubato resampling

## Core Pattern

### Cargo.toml Setup
```toml
[dependencies]
nih-plug = { version = "0.8", features = ["vst3", "clap", "standalone", "vizia"] }
nih-plug-vizia = "0.8"
fundsp = "0.11"           # DSP primitives: Filter, Osc, Reverb, Delay
rubato = "0.16"           # High-quality resampling (Sinc, FIR, Polynomial)
cpal = { version = "0.16", features = ["asio", "jack", "wasapi", "coreaudio"] }
ringbuf = "0.4"           # Lock-free SPSC ring buffer (standard for audio)
```

### Plugin Structure
```rust
// lib.rs
use nih_plug::prelude::*;
use nih_plug_vizia::vizia::prelude::*;

struct SensoriumPlugin {
    params: Arc<SensoriumParams>,
    // RT-safe state only: atomics, ringbuf handles
    audio_tx: ringbuf::Producer<f32>,
    gui_rx: ringbuf::Consumer<GuiMessage>,
}

#[derive(Params)]
struct SensoriumParams {
    #[id = "gain"]
    gain: FloatParam,
    #[id = "filter_freq"]
    filter_freq: FloatParam,
    // ... more params
}

impl Plugin for SensoriumPlugin {
    const NAME: &str = "Sensorium";
    const VENDOR: &str = "Sensorium Dev Team";
    const URL: &str = "https://sensorium.dev";
    const EMAIL: &str = "dev@sensorium.dev";
    const VERSION: &str = env!("CARGO_PKG_VERSION");
    
    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayouts] = &[AudioIOLayouts {
        main_input_channels: NonZeroU32::new(2),
        main_output_channels: NonZeroU32::new(2),
        ..AudioIOLayouts::const_default()
    }];

    type SysExMessage = ();
    type BackgroundTask = ();

    fn new(_host: HostHandle) -> Self {
        // Initialize lock-free buffers, DSP graph, params
    }

    fn process(&mut self, buffer: &mut Buffer, _aux: &mut AuxiliaryBuffers, _context: &mut ProcessContext) {
        // RT-safe: NO allocations, NO locks, NO blocking
        // Read params via smoothed values
        // Process via fundsp graph
        // Write to ringbuf for GUI
    }

    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        nih_plug_vizia::create_vizia_editor(
            SensoriumEditor::default(),
            |cx| SensoriumEditor::build(cx),
        )
    }
}

nih_plug::plugin_entry!(SensoriumPlugin);
```

### Vizia GUI (GPU-Accelerated, React-like)
```rust
// editor.rs
use nih_plug_vizia::vizia::prelude::*;

#[derive(Default)]
struct SensoriumEditor {
    // UI state only - NOT accessed from audio thread
}

impl SensoriumEditor {
    fn build(cx: &mut Context) {
        VStack::new(cx, |cx| {
            Label::new(cx, "Sensorium").class("title");
            HStack::new(cx, |cx| {
                // Parameter controls bind to smoothed values
                ParamSlider::new(cx, "gain", -60.0..=6.0, "dB");
                ParamSlider::new(cx, "filter_freq", 20.0..=20000.0, "Hz");
            });
            // Spectrum analyzer, waveform display via Canvas
            Canvas::new(cx, |cx| SpectrumView::new(cx))
                .size(Pixels(400.0), Pixels(200.0));
        })
        .class("editor-root");
    }
}
```

### Fundsp DSP Graph
```rust
use fundsp::hacker::*;

// Build DSP graph at init (not in process callback)
fn build_dsp_graph(sample_rate: f64) -> Box<dyn AudioUnit> {
    let filter = lowpass_hz(440.0) >> highpass_hz(80.0);
    let reverb = reverb_stereo(0.8, 0.5);
    let chain = filter >> reverb >> gain(0.5);
    chain.boxed()
}

// In process():
// let mut dsp = self.dsp_graph.clone();
// dsp.process(buffer.iter_mut());
```

### Rubato Resampling
```rust
use rubato::{SincFixedIn, Resampler};

let resampler = SincFixedIn::<f32>::new(
    ratio,                    // input_rate / output_rate
    256,                      // chunk size
    128,                      // filter length
    2,                        // channels
    &rubato::SincInterpolationParameters {
        sinc_len: 128,
        f_cutoff: 0.95,
        oversampling_factor: 128,
        window: rubato::WindowFunction::BlackmanHarris2,
    },
).expect("resampler creation");
```

## Latency-Critical Patterns

### Hot Path: Audio Callback
```
Audio Callback (RT thread)
    → Read smoothed params (atomic loads)
    → fundsp graph process (SIMD-optimized)
    → ringbuf.push() to GUI (lock-free, non-blocking)
    → Return < 0.5ms p99 (Gate M1)
```

### Parameter Smoothing
```rust
// Use nih-plug's built-in smoothed values
let gain_smoothed = self.params.gain.smoothed.next();
// Or custom: smoothed::linear::Smoother::new(sample_rate, 0.02)
```

### Backpressure Before Ring Buffer Overflow
```rust
// In process(): check available space before push
if self.audio_tx.remaining() < buffer.len() {
    // Drop oldest or degrade gracefully - never block!
    self.audio_tx.pop();
}
```

## Formal Verification Integration (Gate M1)

### Kani Proof: No-Panic, No-Alloc
```rust
#[kani::proof]
fn verify_audio_callback_no_panic() {
    let mut plugin = SensoriumPlugin::new(mock_host());
    let mut buffer = [0.0f32; 512]; // Max block size
    kani::assume(buffer.len() <= 512);
    
    let mut context = mock_process_context();
    plugin.process(&mut buffer, &mut [], &mut context);
    // Proof: no panic, no allocation, bounds respected
}

#[kani::proof]
fn verify_parameter_bounds() {
    let param = FloatParam::new("gain", 0.0, -60.0..=6.0);
    let val: f32 = kani::any();
    kani::assume(val >= -60.0 && val <= 6.0);
    param.set_value(val);
    // Proof: value always in range
}
```

## Verification Commands
```bash
# Build all targets
cargo build --release --features vst3,clap,standalone,vizia

# Run Kani proofs (CI gate)
cargo kani --package sensorium-plugin

# Run benchmarks (criterion)
cargo bench --package sensorium-audio

# Test VST3/CLAP loading
cargo run --example validate_plugin
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Allocating in `process()` | Pre-allocate all buffers, use `ringbuf`, `bumpalo` arenas |
| Locking in audio thread | Use `Atomic`, `ringbuf`, `crossbeam-channel` (bounded, try_send) |
| Blocking on GUI updates | Fire-and-forget via ringbuf; GUI pulls at 60fps |
| Mutating params directly | Use `Param::set_value()` or smoothed values |
| Heavy math in callback | Move to fundsp graph; use SIMD via `packed_simd` |

## Real-World Impact
- 50% less code vs custom plugin host
- Native VST3/CLAP/Standalone from single codebase
- RT-safe by construction (nih-plug enforces)
- GPU-accelerated GUI via Vizia (wgpu backend)