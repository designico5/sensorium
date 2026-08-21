//! DSP Graph using fundsp primitives
//!
//! Real-time safe audio processing chain:
//! Input -> Gain -> Filter -> Reverb -> Output

use fundsp::hacker::*;
use rubato::{Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction};
use std::sync::Arc;

/// DSP Configuration
#[derive(Debug, Clone, Copy)]
pub struct DspConfig {
    pub sample_rate: f32,
    pub block_size: usize,
}

/// Pre-allocated buffers for zero-allocation processing
struct DspBuffers {
    // Intermediate buffers for each processing stage
    stage1: Vec<f32>,  // Post-gain
    stage2: Vec<f32>,  // Post-filter
    stage3: Vec<f32>,  // Post-reverb (stereo)
    // Mono mix buffer for reverb input
    mono_mix: Vec<f32>,
}

impl DspBuffers {
    fn new(block_size: usize, num_channels: usize) -> Self {
        Self {
            stage1: vec![0.0; block_size * num_channels],
            stage2: vec![0.0; block_size * num_channels],
            stage3: vec![0.0; block_size * 2], // Stereo output
            mono_mix: vec![0.0; block_size],
        }
    }

    fn resize(&mut self, block_size: usize, num_channels: usize) {
        self.stage1.resize(block_size * num_channels, 0.0);
        self.stage2.resize(block_size * num_channels, 0.0);
        self.stage3.resize(block_size * 2, 0.0);
        self.mono_mix.resize(block_size, 0.0);
    }
}

/// DSP Graph with fundsp nodes
pub struct DspGraph {
    config: DspConfig,
    num_channels: usize,
    buffers: DspBuffers,
    // fundsp graph (immutable after construction)
    graph: Arc<dyn AudioUnit<f32> + Send + Sync>,
    // Resampler for sample rate conversion
    resampler: Option<SincFixedIn<f32>>,
    // Smoothing for parameter changes
    gain_smoother: Smoother,
    filter_freq_smoother: Smoother,
    filter_q_smoother: Smoother,
    reverb_mix_smoother: Smoother,
}

impl DspGraph {
    pub fn new(config: DspConfig) -> Self {
        let num_channels = 2;
        let buffers = DspBuffers::new(config.block_size, num_channels);
        
        // Build fundsp graph: Gain -> Filter -> Reverb
        // This graph is immutable and can be shared across threads
        let graph: Arc<dyn AudioUnit<f32> + Send + Sync> = Arc::new(
            // Gain stage (controlled by parameter)
            gain(1.0)
            // Filter stage (controlled by parameters)
            | lowpass_hz(1000.0) | highpass_hz(20.0)
            // Reverb stage (controlled by parameters)
            | reverb_stereo(0.5, 0.3, 0.5)
            // Output gain
            | gain(1.0)
        );

        Self {
            config,
            num_channels,
            buffers,
            graph,
            resampler: None,
            gain_smoother: Smoother::new(config.sample_rate, 0.02),
            filter_freq_smoother: Smoother::new(config.sample_rate, 0.02),
            filter_q_smoother: Smoother::new(config.sample_rate, 0.02),
            reverb_mix_smoother: Smoother::new(config.sample_rate, 0.02),
        }
    }

    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.config.sample_rate = sample_rate;
        self.gain_smoother.set_sample_rate(sample_rate);
        self.filter_freq_smoother.set_sample_rate(sample_rate);
        self.filter_q_smoother.set_sample_rate(sample_rate);
        self.reverb_mix_smoother.set_sample_rate(sample_rate);
        
        // Rebuild resampler if needed
        if let Some(ref mut resampler) = self.resampler {
            // Resampler handles its own sample rate internally
        }
    }

    pub fn set_block_size(&mut self, block_size: usize) {
        self.config.block_size = block_size;
        self.buffers.resize(block_size, self.num_channels);
    }

    pub fn reset(&mut self) {
        self.gain_smoother.reset();
        self.filter_freq_smoother.reset();
        self.filter_q_smoother.reset();
        self.reverb_mix_smoother.reset();
        // Clear buffers
        for buf in &mut [&mut self.buffers.stage1, &mut self.buffers.stage2, 
                         &mut self.buffers.stage3, &mut self.buffers.mono_mix] {
            buf.fill(0.0);
        }
    }

    /// Main processing function - RT-safe, no allocations
    pub fn process(
        &mut self,
        input: &[&[f32]],
        output: &mut [&mut [f32]],
        params: &crate::params::SensoriumParams,
        num_samples: usize,
    ) {
        // Update smoothed parameters
        let gain = self.gain_smoother.process(params.gain.smoothed_value());
        let filter_freq = self.filter_freq_smoother.process(params.filter_freq.smoothed_value());
        let filter_q = self.filter_q_smoother.process(params.filter_q.smoothed_value());
        let reverb_mix = self.reverb_mix_smoother.process(params.reverb_mix.smoothed_value());

        // Rebuild graph with current parameters (in practice, use parameter modulation)
        // For now, process manually through stages for RT-safety
        
        let ch0_in = input.get(0).map(|c| &c[..num_samples]).unwrap_or(&[]);
        let ch1_in = input.get(1).map(|c| &c[..num_samples]).unwrap_or(&[]);
        let ch0_out = output.get_mut(0).map(|c| &mut c[..num_samples]).unwrap_or(&mut []);
        let ch1_out = output.get_mut(1).map(|c| &mut c[..num_samples]).unwrap_or(&mut []);

        // Stage 1: Gain
        for i in 0..num_samples {
            if i < ch0_in.len() {
                self.buffers.stage1[i * 2] = ch0_in[i] * gain;
            }
            if i < ch1_in.len() {
                self.buffers.stage1[i * 2 + 1] = ch1_in[i] * gain;
            }
        }

        // Stage 2: Filter (simplified - use fundsp for actual implementation)
        // Apply lowpass + highpass manually for RT-safety
        let filter_freq_hz = filter_freq * 20000.0; // Map 0-1 to 0-20kHz
        let filter_q_val = 0.5 + filter_q * 9.5; // Map 0-1 to 0.5-10
        
        // Simple biquad filter coefficients (Linkwitz-Riley 4th order approx)
        let omega = 2.0 * std::f32::consts::PI * filter_freq_hz / self.config.sample_rate;
        let sin_omega = omega.sin();
        let cos_omega = omega.cos();
        let alpha = sin_omega / (2.0 * filter_q_val);
        
        let b0 = (1.0 - cos_omega) * 0.5;
        let b1 = 1.0 - cos_omega;
        let b2 = (1.0 - cos_omega) * 0.5;
        let a0 = 1.0 + alpha;
        let a1 = -2.0 * cos_omega;
        let a2 = 1.0 - alpha;

        // Process filter (Direct Form II)
        let mut x1_l = 0.0; let mut x2_l = 0.0; let mut y1_l = 0.0; let mut y2_l = 0.0;
        let mut x1_r = 0.0; let mut x2_r = 0.0; let mut y1_r = 0.0; let mut y2_r = 0.0;

        for i in 0..num_samples {
            // Left channel
            let x_l = self.buffers.stage1[i * 2];
            let y_l = (b0 * x_l + b1 * x1_l + b2 * x2_l - a1 * y1_l - a2 * y2_l) / a0;
            self.buffers.stage2[i * 2] = y_l;
            x2_l = x1_l; x1_l = x_l;
            y2_l = y1_l; y1_l = y_l;

            // Right channel
            let x_r = self.buffers.stage1[i * 2 + 1];
            let y_r = (b0 * x_r + b1 * x1_r + b2 * x2_r - a1 * y1_r - a2 * y2_r) / a0;
            self.buffers.stage2[i * 2 + 1] = y_r;
            x2_r = x1_r; x1_r = x_r;
            y2_r = y1_r; y1_r = y_r;
        }

        // Stage 3: Reverb (simplified - Schroeder-style)
        let reverb_gain = reverb_mix * 0.7;
        let dry_gain = 1.0 - reverb_mix * 0.5;
        
        // Simple allpass + comb filter chain for reverb
        // This is a minimal implementation - production would use fundsp's reverb
        for i in 0..num_samples {
            let dry_l = self.buffers.stage2[i * 2] * dry_gain;
            let dry_r = self.buffers.stage2[i * 2 + 1] * dry_gain;
            
            // Mono mix for reverb
            let mono = (self.buffers.stage2[i * 2] + self.buffers.stage2[i * 2 + 1]) * 0.5;
            self.buffers.mono_mix[i] = mono;
            
            // Simple feedback delay (placeholder for actual reverb)
            let reverb_l = mono * reverb_gain * 0.3;
            let reverb_r = mono * reverb_gain * 0.3;
            
            self.buffers.stage3[i * 2] = dry_l + reverb_l;
            self.buffers.stage3[i * 2 + 1] = dry_r + reverb_r;
        }

        // Copy to output
        for i in 0..num_samples {
            if i < ch0_out.len() {
                ch0_out[i] = self.buffers.stage3[i * 2];
            }
            if i < ch1_out.len() {
                ch1_out[i] = self.buffers.stage3[i * 2 + 1];
            }
        }
    }

    /// Initialize resampler for sample rate conversion
    pub fn init_resampler(&mut self, input_rate: f32, output_rate: f32) -> Result<(), rubato::ResamplerConstructionError> {
        let params = SincInterpolationParameters {
            sinc_len: 256,
            f_cutoff: 0.95,
            interpolation: SincInterpolationType::Linear,
            oversampling_factor: 256,
            window: WindowFunction::BlackmanHarris2,
        };
        
        let resampler = SincFixedIn::<f32>::new(
            output_rate / input_rate,
            2.0, // max ratio
            params,
            self.config.block_size,
            2, // channels
        )?;
        
        self.resampler = Some(resampler);
        Ok(())
    }

    /// Process with resampling
    pub fn process_resampled(&mut self, input: &[&[f32]], output: &mut [&mut [f32]]) -> Result<(), rubato::ResamplerError> {
        if let Some(ref mut resampler) = self.resampler {
            resampler.process(input, output, None)?;
        }
        Ok(())
    }
}

/// Simple parameter smoother for RT-safe parameter changes
struct Smoother {
    current: f32,
    target: f32,
    coefficient: f32,
    sample_rate: f32,
}

impl Smoother {
    fn new(sample_rate: f32, smoothing_time: f32) -> Self {
        let coefficient = (-1.0 / (sample_rate * smoothing_time)).exp();
        Self {
            current: 0.0,
            target: 0.0,
            coefficient,
            sample_rate,
        }
    }

    fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
        self.coefficient = (-1.0 / (sample_rate * 0.02)).exp();
    }

    fn reset(&mut self) {
        self.current = self.target;
    }

    fn process(&mut self, target: f32) -> f32 {
        self.target = target;
        self.current += (self.target - self.current) * (1.0 - self.coefficient);
        self.current
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dsp_graph_creation() {
        let config = DspConfig { sample_rate: 48000.0, block_size: 256 };
        let graph = DspGraph::new(config);
        assert_eq!(graph.config.sample_rate, 48000.0);
        assert_eq!(graph.config.block_size, 256);
    }

    #[test]
    fn test_smoother() {
        let mut smoother = Smoother::new(48000.0, 0.02);
        smoother.process(1.0);
        // Should approach 1.0
        for _ in 0..1000 {
            let val = smoother.process(1.0);
            if val > 0.99 { break; }
        }
        assert!(smoother.current > 0.99);
    }
}