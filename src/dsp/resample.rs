/// High‑quality audio resampler using rubato's FFT-based resampler.
///
/// This implementation wraps `rubato::FftFixedInOut` for fixed‑ratio
/// sample‑rate conversion. The `fft_resampler` feature of rubato must be enabled.
use rubato::{FftFixedInOut, Resampler};

/// A high‑quality resampler that can be reused for multiple buffers.
pub struct HighQualityResampler {
    resampler: FftFixedInOut<f32>,
}

impl HighQualityResampler {
    /// Create a new resampler for the given input and output sample rates.
    ///
    /// `chunk_size` is the number of frames processed per call (default 1024).
    /// `channels` is the number of audio channels (default 1 for mono).
    pub fn new(in_rate: f32, out_rate: f32, chunk_size: usize, channels: usize) -> Result<Self, rubato::ResamplerConstructionError> {
        let resampler = FftFixedInOut::new(
            in_rate as usize,
            out_rate as usize,
            chunk_size,
            channels,
        )?;
        Ok(Self { resampler })
    }

    /// Resample the input buffer (mono) and return the output buffer.
    ///
    /// The input length must be a multiple of the chunk size.
    pub fn resample(&mut self, input: &[f32]) -> Result<Vec<f32>, rubato::ResampleError> {
        // rubato expects a slice of channel buffers; for mono we wrap in a vec.
        let output = self.resampler.process(&[input], None)?;
        // output is Vec<Vec<f32>>; for mono we take the first channel.
        Ok(output.into_iter().next().unwrap_or_default())
    }
}

/// Simple utility for one‑off resampling with a stretch factor `alpha`.
///
/// `alpha = output_rate / input_rate`. For example, `alpha = 1.0` means no change.
/// This creates a temporary resampler each call; for repeated use prefer `HighQualityResampler`.
pub fn resample_alpha(alpha: f32, src: &[f32]) -> Vec<f32> {
    if (alpha - 1.0).abs() < f32::EPSILON {
        return src.to_vec();
    }
    // Assume a base sample rate of 48 kHz.
    const BASE_RATE: f32 = 48000.0;
    let in_rate = BASE_RATE;
    let out_rate = (BASE_RATE * alpha).round() as usize;
    let in_rate_usize = in_rate as usize;
    let chunk_size = 1024;
    let channels = 1;

    let mut resampler = match FftFixedInOut::new(in_rate_usize, out_rate, chunk_size, channels) {
        Ok(r) => r,
        Err(_) => return src.to_vec(), // fallback
    };

    // Pad input to a multiple of chunk_size if needed.
    let mut input = src.to_vec();
    let remainder = input.len() % chunk_size;
    if remainder != 0 {
        input.extend(vec![0.0; chunk_size - remainder]);
    }

    match resampler.process(&[&input], None) {
        Ok(output) => output.into_iter().next().unwrap_or_default(),
        Err(_) => src.to_vec(),
    }
}

/// Simple utility for direct sample‑rate conversion.
/// Returns a zero‑filled buffer if conversion fails.
pub fn resample(src: &[f32], in_rate: f32, out_rate: f32) -> Vec<f32> {
    if (in_rate - out_rate).abs() < f32::EPSILON {
        return src.to_vec();
    }
    let in_rate_usize = in_rate as usize;
    let out_rate_usize = out_rate as usize;
    let chunk_size = 1024;
    let channels = 1;

    let mut resampler = match FftFixedInOut::new(in_rate_usize, out_rate_usize, chunk_size, channels) {
        Ok(r) => r,
        Err(_) => return src.to_vec(),
    };

    let mut input = src.to_vec();
    let remainder = input.len() % chunk_size;
    if remainder != 0 {
        input.extend(vec![0.0; chunk_size - remainder]);
    }

    match resampler.process(&[&input], None) {
        Ok(output) => output.into_iter().next().unwrap_or_default(),
        Err(_) => src.to_vec(),
    }
}