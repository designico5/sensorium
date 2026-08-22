//! DSP processing pipeline for the Sensorium audio engine.
//!
//! Provides zero-allocation, sample-accurate audio processing for the
//! real-time callback. Implements gain staging, metering, and a
//! simple biquad filter — all without heap allocation.

use tracing::info;

/// Biquad filter type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterType {
    Lowpass,
    Highpass,
    Bandpass,
    Notch,
}

/// Biquad filter coefficients (Direct Form I).
#[derive(Debug, Clone, Copy)]
pub struct BiquadCoeffs {
    pub b0: f64,
    pub b1: f64,
    pub b2: f64,
    pub a1: f64,
    pub a2: f64,
}

impl BiquadCoeffs {
    /// Compute biquad coefficients for the given filter type.
    pub fn new(filter_type: FilterType, cutoff_hz: f64, q: f64, sample_rate: f64) -> Self {
        let sample_rate = if sample_rate.is_finite() && sample_rate > 0.0 {
            sample_rate
        } else {
            48_000.0
        };
        let cutoff_hz = if cutoff_hz.is_finite() {
            cutoff_hz.clamp(1.0, sample_rate * 0.49)
        } else {
            1_000.0_f64.min(sample_rate * 0.49)
        };
        let q = if q.is_finite() && q > 0.0 { q } else { 0.707 };
        let omega = 2.0 * std::f64::consts::PI * cutoff_hz / sample_rate;
        let sin_omega = omega.sin();
        let cos_omega = omega.cos();
        let alpha = sin_omega / (2.0 * q);

        let (b0, b1, b2, a0, a1, a2) = match filter_type {
            FilterType::Lowpass => {
                let b0 = (1.0 - cos_omega) / 2.0;
                let b1 = 1.0 - cos_omega;
                let b2 = b0;
                let a0 = 1.0 + alpha;
                let a1 = -2.0 * cos_omega;
                let a2 = 1.0 - alpha;
                (b0, b1, b2, a0, a1, a2)
            }
            FilterType::Highpass => {
                let b0 = (1.0 + cos_omega) / 2.0;
                let b1 = -(1.0 + cos_omega);
                let b2 = b0;
                let a0 = 1.0 + alpha;
                let a1 = -2.0 * cos_omega;
                let a2 = 1.0 - alpha;
                (b0, b1, b2, a0, a1, a2)
            }
            FilterType::Bandpass => {
                let b0 = alpha;
                let b1 = 0.0;
                let b2 = -alpha;
                let a0 = 1.0 + alpha;
                let a1 = -2.0 * cos_omega;
                let a2 = 1.0 - alpha;
                (b0, b1, b2, a0, a1, a2)
            }
            FilterType::Notch => {
                let b0 = 1.0;
                let b1 = -2.0 * cos_omega;
                let b2 = 1.0;
                let a0 = 1.0 + alpha;
                let a1 = -2.0 * cos_omega;
                let a2 = 1.0 - alpha;
                (b0, b1, b2, a0, a1, a2)
            }
        };

        // Normalize by a0
        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
        }
    }
}

/// Per-channel biquad state (Direct Form I).
#[derive(Debug, Clone, Copy, Default)]
pub struct BiquadState {
    x1: f64,
    x2: f64,
    y1: f64,
    y2: f64,
}

impl BiquadState {
    /// Process a single sample through the biquad.
    pub fn process(&mut self, coeffs: &BiquadCoeffs, input: f64) -> f64 {
        let output = coeffs.b0 * input + coeffs.b1 * self.x1 + coeffs.b2 * self.x2
            - coeffs.a1 * self.y1 - coeffs.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = output;
        output
    }

    /// Reset the filter state.
    pub fn reset(&mut self) {
        self.x1 = 0.0;
        self.x2 = 0.0;
        self.y1 = 0.0;
        self.y2 = 0.0;
    }
}

/// Audio processing graph.
///
/// Processes interleaved stereo audio through:
/// 1. Gain stage (linear multiplier, dB-controllable)
/// 2. Optional stereo biquad filter
///
/// All processing is zero-allocation and safe for real-time audio callbacks.
pub struct AudioGraph {
    /// Current linear gain.
    gain_linear: f64,
    /// Sample rate.
    sample_rate: f64,
    /// Whether the graph is bypassed.
    bypassed: bool,
    /// Left channel filter state.
    filter_l: BiquadState,
    /// Right channel filter state.
    filter_r: BiquadState,
    /// Current filter coefficients (None = filter disabled).
    filter_coeffs: Option<BiquadCoeffs>,
}

impl AudioGraph {
    /// Create a new audio graph with unity gain, no filter.
    pub fn new(sample_rate: f64) -> Self {
        let sample_rate = if sample_rate.is_finite() && sample_rate > 0.0 {
            sample_rate
        } else {
            48_000.0
        };
        info!(sample_rate, "Audio DSP graph created (unity, no filter)");
        Self {
            gain_linear: 1.0,
            sample_rate,
            bypassed: false,
            filter_l: BiquadState::default(),
            filter_r: BiquadState::default(),
            filter_coeffs: None,
        }
    }

    /// Create a graph with initial gain in dB.
    pub fn with_gain(sample_rate: f64, gain_db: f64) -> Self {
        let sample_rate = if sample_rate.is_finite() && sample_rate > 0.0 {
            sample_rate
        } else {
            48_000.0
        };
        let gain_db = if gain_db.is_finite() { gain_db.clamp(-120.0, 24.0) } else { 0.0 };
        let linear = 10.0f64.powf(gain_db / 20.0);
        info!(sample_rate, gain_db, linear, "Audio DSP graph created (gain)");
        Self {
            gain_linear: linear,
            sample_rate,
            bypassed: false,
            filter_l: BiquadState::default(),
            filter_r: BiquadState::default(),
            filter_coeffs: None,
        }
    }

    /// Set the gain in dB.
    pub fn set_gain_db(&mut self, gain_db: f64) {
        let gain_db = if gain_db.is_finite() { gain_db.clamp(-120.0, 24.0) } else { 0.0 };
        self.gain_linear = 10.0f64.powf(gain_db / 20.0);
    }

    /// Set the gain as a linear multiplier.
    pub fn set_gain_linear(&mut self, gain: f64) {
        self.gain_linear = if gain.is_finite() { gain.clamp(0.0, 16.0) } else { 1.0 };
    }

    /// Enable a filter on both channels.
    pub fn set_filter(&mut self, filter_type: FilterType, cutoff_hz: f64, q: f64) {
        let coeffs = BiquadCoeffs::new(filter_type, cutoff_hz, q, self.sample_rate);
        self.filter_coeffs = Some(coeffs);
        self.filter_l.reset();
        self.filter_r.reset();
    }

    /// Disable the filter.
    pub fn clear_filter(&mut self) {
        self.filter_coeffs = None;
        self.filter_l.reset();
        self.filter_r.reset();
    }

    /// Process a stereo interleaved buffer in-place.
    ///
    /// Buffer format: [L0, R0, L1, R1, L2, R2, ...]
    pub fn process_interleaved(&mut self, buffer: &mut [f32]) {
        if self.bypassed || buffer.len() < 2 {
            return;
        }

        let gain = self.gain_linear;
        let frames = buffer.len() / 2;

        if let Some(coeffs) = self.filter_coeffs {
            for i in 0..frames {
                let idx = i * 2;
                let l_in = buffer[idx] as f64 * gain;
                let r_in = buffer[idx + 1] as f64 * gain;
                let l_out = self.filter_l.process(&coeffs, l_in);
                let r_out = self.filter_r.process(&coeffs, r_in);
                buffer[idx] = l_out as f32;
                buffer[idx + 1] = r_out as f32;
            }
        } else {
            for i in 0..frames {
                let idx = i * 2;
                buffer[idx] = (buffer[idx] as f64 * gain) as f32;
                buffer[idx + 1] = (buffer[idx + 1] as f64 * gain) as f32;
            }
        }
    }

    /// Process a mono buffer in-place.
    pub fn process_mono(&mut self, buffer: &mut [f32]) {
        if self.bypassed {
            return;
        }

        let gain = self.gain_linear;

        if let Some(coeffs) = self.filter_coeffs {
            for sample in buffer.iter_mut() {
                let s_in = *sample as f64 * gain;
                let s_out = self.filter_l.process(&coeffs, s_in);
                *sample = s_out as f32;
            }
        } else {
            for sample in buffer.iter_mut() {
                *sample = (*sample as f64 * gain) as f32;
            }
        }
    }

    /// Update the sample rate. Resets filter state.
    pub fn set_sample_rate(&mut self, sample_rate: f64) {
        let sample_rate = if sample_rate.is_finite() && sample_rate > 0.0 {
            sample_rate
        } else {
            48_000.0
        };
        self.sample_rate = sample_rate;
        self.filter_l.reset();
        self.filter_r.reset();
        // Recalculate filter coefficients if a filter is active
        if let Some(_old) = self.filter_coeffs {
            // Filter type and cutoff are not stored; caller must re-set filter
            self.filter_coeffs = None;
        }
        info!(sample_rate, "DSP graph sample rate updated");
    }

    /// Bypass or un-bypass the graph.
    pub fn set_bypass(&mut self, bypassed: bool) {
        self.bypassed = bypassed;
    }

    /// Returns whether the graph is bypassed.
    pub fn is_bypassed(&self) -> bool {
        self.bypassed
    }

    /// Returns the current sample rate.
    pub fn sample_rate(&self) -> f64 {
        self.sample_rate
    }

    /// Returns the current linear gain.
    pub fn current_gain(&self) -> f64 {
        self.gain_linear
    }
}

/// Metering result for a processed buffer.
#[derive(Debug, Clone, Copy, Default)]
pub struct MeterValues {
    pub peak_l: f32,
    pub peak_r: f32,
    pub rms_l: f32,
    pub rms_r: f32,
}

/// Compute meter values from an interleaved stereo buffer.
pub fn meter_interleaved(buffer: &[f32]) -> MeterValues {
    if buffer.len() < 2 {
        return MeterValues::default();
    }

    let frames = buffer.len() / 2;
    let mut peak_l = 0.0f32;
    let mut peak_r = 0.0f32;
    let mut sum_sq_l = 0.0f32;
    let mut sum_sq_r = 0.0f32;

    for i in 0..frames {
        let l = buffer[i * 2];
        let r = buffer[i * 2 + 1];
        peak_l = peak_l.max(l.abs());
        peak_r = peak_r.max(r.abs());
        sum_sq_l += l * l;
        sum_sq_r += r * r;
    }

    let rms_l = (sum_sq_l / frames as f32).sqrt();
    let rms_r = (sum_sq_r / frames as f32).sqrt();

    MeterValues {
        peak_l,
        peak_r,
        rms_l,
        rms_r,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn graph_creation() {
        let graph = AudioGraph::new(48000.0);
        assert_eq!(graph.sample_rate(), 48000.0);
        assert!(!graph.is_bypassed());
        assert!((graph.current_gain() - 1.0).abs() < 0.001);
    }

    #[test]
    fn gain_attenuates() {
        let mut graph = AudioGraph::with_gain(48000.0, -6.0);
        let mut buffer = vec![1.0f32, 1.0, 0.5, 0.5, -1.0, -1.0];
        graph.process_interleaved(&mut buffer);
        // -6dB ≈ 0.501 linear, so samples should be ~halved
        assert!(buffer[0].abs() < 0.6);
        assert!(buffer[0].abs() > 0.4);
    }

    #[test]
    fn unity_gain_preserves() {
        let mut graph = AudioGraph::with_gain(48000.0, 0.0);
        let original = vec![0.5f32, -0.5, 1.0, -1.0];
        let mut buffer = original.clone();
        graph.process_interleaved(&mut buffer);
        for (a, b) in original.iter().zip(buffer.iter()) {
            assert!((a - b).abs() < 0.001);
        }
    }

    #[test]
    fn bypass_skips_processing() {
        let mut graph = AudioGraph::with_gain(48000.0, -60.0);
        graph.set_bypass(true);
        let mut buffer = vec![1.0f32, 1.0, 1.0, 1.0];
        let original = buffer.clone();
        graph.process_interleaved(&mut buffer);
        assert_eq!(buffer, original);
    }

    #[test]
    fn set_gain_db() {
        let mut graph = AudioGraph::new(48000.0);
        graph.set_gain_db(0.0);
        assert!((graph.current_gain() - 1.0).abs() < 0.001);
        graph.set_gain_db(-20.0);
        assert!((graph.current_gain() - 0.1).abs() < 0.001);
        graph.set_gain_db(6.0);
        assert!((graph.current_gain() - 1.995).abs() < 0.01);
    }

    #[test]
    fn filter_processes() {
        let mut graph = AudioGraph::new(48000.0);
        graph.set_filter(FilterType::Lowpass, 1000.0, 0.707);
        let mut buffer = vec![1.0f32, 1.0, 0.5, 0.5, -1.0, -1.0];
        graph.process_interleaved(&mut buffer);
        // Filter should modify the signal
        assert!(buffer[0].abs() > 0.0);
    }

    #[test]
    fn meter_values_computed() {
        let buffer = vec![0.5f32, -0.5, 1.0, -1.0, 0.25, 0.25];
        let meter = meter_interleaved(&buffer);
        assert!((meter.peak_l - 1.0).abs() < 0.001);
        assert!((meter.peak_r - 1.0).abs() < 0.001);
        assert!(meter.rms_l > 0.0);
        assert!(meter.rms_r > 0.0);
    }

    #[test]
    fn meter_empty_buffer() {
        let meter = meter_interleaved(&[]);
        assert_eq!(meter.peak_l, 0.0);
        assert_eq!(meter.peak_r, 0.0);
    }

    #[test]
    fn mono_processing() {
        let mut graph = AudioGraph::with_gain(48000.0, -6.0);
        let mut buffer = vec![1.0f32, 0.5, -1.0];
        graph.process_mono(&mut buffer);
        assert!(buffer[0].abs() < 1.0);
    }

    #[test]
    fn biquad_coefficients_lowpass() {
        let coeffs = BiquadCoeffs::new(FilterType::Lowpass, 1000.0, 0.707, 48000.0);
        // Coefficients should be finite
        assert!(coeffs.b0.is_finite());
        assert!(coeffs.b1.is_finite());
        assert!(coeffs.b2.is_finite());
        assert!(coeffs.a1.is_finite());
        assert!(coeffs.a2.is_finite());
    }

    #[test]
    fn biquad_state_reset() {
        let mut state = BiquadState::default();
        state.x1 = 1.0;
        state.y1 = 2.0;
        state.reset();
        assert_eq!(state.x1, 0.0);
        assert_eq!(state.y1, 0.0);
    }

    #[test]
    fn invalid_audio_parameters_fail_safe_to_finite_values() {
        let coeffs = BiquadCoeffs::new(FilterType::Lowpass, f64::NAN, 0.0, 0.0);
        assert!(coeffs.b0.is_finite());
        assert!(coeffs.a2.is_finite());

        let mut graph = AudioGraph::with_gain(f64::NAN, f64::INFINITY);
        graph.set_gain_db(f64::NEG_INFINITY);
        graph.set_gain_linear(f64::NAN);
        graph.set_sample_rate(f64::NEG_INFINITY);
        assert!(graph.sample_rate().is_finite());
        assert!(graph.current_gain().is_finite());
    }

    #[test]
    fn odd_interleaved_buffer_does_not_touch_trailing_sample() {
        let mut graph = AudioGraph::with_gain(48_000.0, -6.0);
        let mut buffer = [1.0_f32, 1.0, 1.0];
        graph.process_interleaved(&mut buffer);
        assert!(buffer[0] < 1.0);
        assert!(buffer[1] < 1.0);
        assert_eq!(buffer[2], 1.0);
    }
}

// ── Kani Formal Verification Proofs (H1) ──────────────────────────
//
// These proofs verify safety properties of the audio hot-path:
// - Biquad filter never produces NaN/Inf for finite input
// - Gain processing preserves signal bounds
// - Metering values are always non-negative
//
// Run with: `cargo kani --harness <proof_name>`
// Requires: `cargo install kani-verifier`

#[cfg(kani)]
mod kani_proofs {
    use super::*;
    use kani:: Arbitrary;

    /// Proof: BiquadCoeffs are always finite for valid inputs.
    ///
    /// Verifies that for any valid cutoff frequency, Q, and sample rate,
    /// all biquad coefficients remain finite (no NaN, no Inf).
    #[kani::proof]
    #[kani::unwind(10)]
    fn prove_biquad_coeffs_finite() {
        let cutoff_hz: f64 = kani::any();
        let q: f64 = kani::any();
        let sample_rate: f64 = kani::any();

        // Constrain inputs to physically meaningful ranges
        kani::assume(cutoff_hz > 0.0 && cutoff_hz < 20000.0);
        kani::assume(q > 0.01 && q < 100.0);
        kani::assume(sample_rate > 8000.0 && sample_rate < 192000.0);

        for filter_type in [FilterType::Lowpass, FilterType::Highpass, FilterType::Bandpass, FilterType::Notch] {
            let coeffs = BiquadCoeffs::new(filter_type, cutoff_hz, q, sample_rate);
            assert!(coeffs.b0.is_finite(), "b0 must be finite");
            assert!(coeffs.b1.is_finite(), "b1 must be finite");
            assert!(coeffs.b2.is_finite(), "b2 must be finite");
            assert!(coeffs.a1.is_finite(), "a1 must be finite");
            assert!(coeffs.a2.is_finite(), "a2 must be finite");
        }
    }

    /// Proof: Biquad process never produces NaN/Inf for finite input.
    ///
    /// Verifies that processing a bounded sample through the biquad
    /// filter always produces a finite output.
    #[kani::proof]
    fn prove_biquad_output_finite() {
        let input: f64 = kani::any();
        kani::assume(input.is_finite());
        kani::assume(input.abs() <= 100.0);

        let coeffs = BiquadCoeffs::new(FilterType::Lowpass, 1000.0, 0.707, 48000.0);
        let mut state = BiquadState::default();
        let output = state.process(&coeffs, input);

        assert!(output.is_finite(), "biquad output must be finite for finite input");
    }

    /// Proof: Gain processing preserves signal bounds.
    ///
    /// Verifies that applying gain to a bounded signal produces
    /// a bounded output (no overflow to Inf).
    #[kani::proof]
    fn prove_gain_bounded_output() {
        let sample: f32 = kani::any();
        let gain_db: f64 = kani::any();

        kani::assume(sample.is_finite());
        kani::assume(sample.abs() <= 1.0);
        kani::assume(gain_db.is_finite());
        kani::assume(gain_db >= -60.0 && gain_db <= 6.0);

        let mut graph = AudioGraph::with_gain(48000.0, gain_db);
        let mut buffer = vec![sample, sample];
        graph.process_interleaved(&mut buffer);

        // With gain in [-60, +6] dB and input in [-1, 1],
        // output should be finite and bounded
        for s in buffer.iter() {
            assert!(s.is_finite(), "gain output must be finite");
            assert!(s.abs() <= 10.0, "gain output should be bounded for bounded input");
        }
    }

    /// Proof: Metering values are always non-negative.
    ///
    /// Verifies that peak and RMS values computed by the meter
    /// are always >= 0 for any finite input buffer.
    #[kani::proof]
    #[kani::unwind(10)]
    fn prove_metering_non_negative() {
        let buf_len: usize = kani::any();
        kani::assume(buf_len >= 2 && buf_len <= 8);

        let mut buffer: Vec<f32> = Vec::with_capacity(buf_len);
        for _ in 0..buf_len {
            let s: f32 = kani::any();
            kani::assume(s.is_finite());
            kani::assume(s.abs() <= 10.0);
            buffer.push(s);
        }

        let meter = meter_interleaved(&buffer);
        assert!(meter.peak_l >= 0.0, "peak_l must be non-negative");
        assert!(meter.peak_r >= 0.0, "peak_r must be non-negative");
        assert!(meter.rms_l >= 0.0, "rms_l must be non-negative");
        assert!(meter.rms_r >= 0.0, "rms_r must be non-negative");
    }
}

// ── Neural Audio Engine (M5) — RAVE/DDSP Scaffold ─────────────────

/// Trait for neural audio processing models.
pub trait NeuralAudioModel: Send + Sync {
    /// Process a buffer of audio samples through the neural model.
    fn process(&mut self, input: &[f32], output: &mut [f32], sample_rate: f64);
    /// Returns the model's latent dimension size.
    fn latent_dim(&self) -> usize;
    /// Returns the model name.
    fn model_name(&self) -> &str;
    /// Returns true if the model is loaded and ready.
    fn is_ready(&self) -> bool;
}

/// RAVE (Realtime Audio Variational autoEncoder) model scaffold.
///
/// RAVE encodes audio into a low-dimensional latent space and decodes it back.
/// This scaffold provides the interface for future candle/ort integration.
pub struct RaveModel {
    name: String,
    latent_dim: usize,
    loaded: bool,
    model_path: Option<String>,
}

impl RaveModel {
    pub fn new(name: &str, latent_dim: usize) -> Self {
        Self {
            name: name.to_string(),
            latent_dim,
            loaded: false,
            model_path: None,
        }
    }

    pub fn load_from_path(&mut self, path: &str) -> bool {
        self.model_path = Some(path.to_string());
        // In production: load ONNX/TorchScript model via candle or ort
        self.loaded = true;
        true
    }

    /// Encode audio buffer into latent representation.
    pub fn encode(&self, _input: &[f32]) -> Vec<f32> {
        // Scaffold: return zeroed latent vector
        vec![0.0f32; self.latent_dim]
    }

    /// Decode latent vector back into audio.
    pub fn decode(&self, _latent: &[f32], output_len: usize) -> Vec<f32> {
        // Scaffold: return silence
        vec![0.0f32; output_len]
    }
}

impl NeuralAudioModel for RaveModel {
    fn process(&mut self, input: &[f32], output: &mut [f32], _sample_rate: f64) {
        if !self.loaded {
            let len = input.len().min(output.len());
            output[..len].copy_from_slice(&input[..len]);
            return;
        }
        // Scaffold: pass-through until real model is integrated
        let len = input.len().min(output.len());
        output[..len].copy_from_slice(&input[..len]);
    }

    fn latent_dim(&self) -> usize { self.latent_dim }
    fn model_name(&self) -> &str { &self.name }
    fn is_ready(&self) -> bool { self.loaded }
}

/// DDSP (Differentiable Digital Signal Processing) scaffold.
///
/// DDSP uses neural networks to control classic DSP elements
/// (oscillators, filters, envelopes) for interpretable audio synthesis.
pub struct DdspProcessor {
    name: String,
    loaded: bool,
    num_harmonics: usize,
    noise_enabled: bool,
}

impl DdspProcessor {
    pub fn new(name: &str, num_harmonics: usize) -> Self {
        Self {
            name: name.to_string(),
            loaded: false,
            num_harmonics,
            noise_enabled: true,
        }
    }

    pub fn load(&mut self) -> bool {
        self.loaded = true;
        true
    }

    /// Get the number of harmonic oscillators.
    pub fn num_harmonics(&self) -> usize { self.num_harmonics }

    /// Whether noise synthesis is enabled.
    pub fn noise_enabled(&self) -> bool { self.noise_enabled }

    /// Generate harmonic amplitudes from neural control.
    pub fn harmonic_amplitudes(&self) -> Vec<f32> {
        // Scaffold: uniform amplitudes
        vec![1.0 / self.num_harmonics as f32; self.num_harmonics]
    }
}

impl NeuralAudioModel for DdspProcessor {
    fn process(&mut self, input: &[f32], output: &mut [f32], _sample_rate: f64) {
        if !self.loaded {
            let len = input.len().min(output.len());
            output[..len].copy_from_slice(&input[..len]);
            return;
        }
        let len = input.len().min(output.len());
        output[..len].copy_from_slice(&input[..len]);
    }

    fn latent_dim(&self) -> usize { self.num_harmonics + 1 } // harmonics + noise gain
    fn model_name(&self) -> &str { &self.name }
    fn is_ready(&self) -> bool { self.loaded }
}

/// Neural codec interface for audio-to-audio translation.
pub struct NeuralCodec {
    encoder: Option<RaveModel>,
    processor: Option<DdspProcessor>,
    bypass: bool,
}

impl NeuralCodec {
    pub fn new() -> Self {
        Self { encoder: None, processor: None, bypass: true }
    }

    pub fn set_encoder(&mut self, model: RaveModel) {
        self.encoder = Some(model);
    }

    pub fn set_processor(&mut self, proc: DdspProcessor) {
        self.processor = Some(proc);
    }

    pub fn set_bypass(&mut self, bypass: bool) { self.bypass = bypass; }
    pub fn is_bypass(&self) -> bool { self.bypass }

    pub fn has_encoder(&self) -> bool { self.encoder.is_some() && self.encoder.as_ref().unwrap().is_ready() }
    pub fn has_processor(&self) -> bool { self.processor.is_some() && self.processor.as_ref().unwrap().is_ready() }

    /// Process audio through the neural codec chain.
    pub fn process(&mut self, input: &[f32], output: &mut [f32], sample_rate: f64) {
        if self.bypass {
            let len = input.len().min(output.len());
            output[..len].copy_from_slice(&input[..len]);
            return;
        }
        // Chain: encoder → processor → output
        if let Some(ref mut enc) = self.encoder {
            enc.process(input, output, sample_rate);
        }
        if let Some(ref mut proc) = self.processor {
            let temp = output.to_vec();
            proc.process(&temp, output, sample_rate);
        }
    }
}

impl Default for NeuralCodec {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod neural_tests {
    use super::*;

    #[test]
    fn rave_model_creation() {
        let model = RaveModel::new("rave_v1", 16);
        assert_eq!(model.latent_dim(), 16);
        assert_eq!(model.model_name(), "rave_v1");
        assert!(!model.is_ready());
    }

    #[test]
    fn rave_load_and_process() {
        let mut model = RaveModel::new("rave_test", 8);
        assert!(model.load_from_path("/path/to/model.onnx"));
        assert!(model.is_ready());
        let input = vec![0.5f32; 256];
        let mut output = vec![0.0f32; 256];
        model.process(&input, &mut output, 48000.0);
        // Scaffold: pass-through
        assert_eq!(output[0], 0.5);
    }

    #[test]
    fn rave_encode_decode() {
        let model = RaveModel::new("rave_enc", 16);
        let latent = model.encode(&[0.1; 1024]);
        assert_eq!(latent.len(), 16);
        let audio = model.decode(&latent, 512);
        assert_eq!(audio.len(), 512);
    }

    #[test]
    fn ddsp_creation() {
        let ddsp = DdspProcessor::new("ddsp_v1", 32);
        assert_eq!(ddsp.num_harmonics(), 32);
        assert!(ddsp.noise_enabled());
        assert!(!ddsp.is_ready());
    }

    #[test]
    fn ddsp_load_and_harmonics() {
        let mut ddsp = DdspProcessor::new("ddsp_test", 16);
        ddsp.load();
        assert!(ddsp.is_ready());
        let amps = ddsp.harmonic_amplitudes();
        assert_eq!(amps.len(), 16);
        // Uniform amplitudes should sum to ~1.0
        let sum: f32 = amps.iter().sum();
        assert!((sum - 1.0).abs() < 0.01);
    }

    #[test]
    fn neural_codec_default_bypass() {
        let mut codec = NeuralCodec::new();
        assert!(codec.is_bypass());
        let input = vec![0.3f32; 128];
        let mut output = vec![0.0f32; 128];
        codec.process(&input, &mut output, 44100.0);
        assert_eq!(output[0], 0.3); // Bypass = pass-through
    }

    #[test]
    fn neural_codec_with_encoder() {
        let mut codec = NeuralCodec::new();
        let mut rave = RaveModel::new("rave", 8);
        rave.load_from_path("model.onnx");
        codec.set_encoder(rave);
        codec.set_bypass(false);
        assert!(codec.has_encoder());
        assert!(!codec.has_processor());
    }

    #[test]
    fn neural_codec_full_chain() {
        let mut codec = NeuralCodec::new();
        let mut rave = RaveModel::new("rave", 8);
        rave.load_from_path("enc.onnx");
        let mut ddsp = DdspProcessor::new("ddsp", 16);
        ddsp.load();
        codec.set_encoder(rave);
        codec.set_processor(ddsp);
        codec.set_bypass(false);
        assert!(codec.has_encoder());
        assert!(codec.has_processor());
        let input = vec![0.2f32; 256];
        let mut output = vec![0.0f32; 256];
        codec.process(&input, &mut output, 48000.0);
    }
}
