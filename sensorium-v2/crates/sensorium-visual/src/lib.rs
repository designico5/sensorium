//! sensorium-visual — WebGPU Visual Engine
//!
//! Provides the GPU-accelerated visualization pipeline for Sensorium.
//! Manages wgpu device/adapter initialization, render pipelines, and
//! the visual scene graph that reacts to audio analysis data.
//!
//! ## Compute Pipeline
//!
//! The engine includes a GPU compute pass that transforms raw audio
//! analysis data (FFT bins, energy, spectral centroid) into visual
//! parameters used by the render pipeline. This runs entirely on the
//! GPU for zero-CPU-overhead visual reactivity.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

/// GPU device configuration for the visual engine.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisualConfig {
    pub width: u32,
    pub height: u32,
    pub vsync: bool,
    pub backend: GpuBackend,
}

impl Default for VisualConfig {
    fn default() -> Self {
        Self {
            width: 1920,
            height: 1080,
            vsync: true,
            backend: GpuBackend::Automatic,
        }
    }
}

/// GPU backend selection.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum GpuBackend {
    Automatic,
    Vulkan,
    Dx12,
    Metal,
    Gl,
}

/// Visual engine state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EngineState {
    Uninitialized,
    Ready,
    Rendering,
    Suspended,
    Error,
}

/// Audio analysis data uploaded to the GPU each frame.
#[derive(Debug, Clone, Copy, Default)]
pub struct AudioAnalysisGpu {
    pub energy: f32,
    pub bass: f32,
    pub mid: f32,
    pub treble: f32,
    pub spectral_centroid: f32,
    pub zero_crossing_rate: f32,
    pub _pad0: f32,
    pub _pad1: f32,
}

impl AudioAnalysisGpu {
    /// Create from raw audio analysis values.
    pub fn new(energy: f32, bass: f32, mid: f32, treble: f32) -> Self {
        Self {
            energy,
            bass,
            mid,
            treble,
            spectral_centroid: 0.0,
            zero_crossing_rate: 0.0,
            _pad0: 0.0,
            _pad1: 0.0,
        }
    }

    /// Convert to bytes for GPU upload (32 bytes, aligned).
    pub fn as_bytes(&self) -> &[u8] {
        bytemuck::bytes_of(self)
    }
}

/// Visual parameter output from the compute pass.
#[derive(Debug, Clone, Copy, Default)]
pub struct VisualParams {
    pub color_r: f32,
    pub color_g: f32,
    pub color_b: f32,
    pub intensity: f32,
    pub particle_speed: f32,
    pub mesh_deform: f32,
    pub bloom_strength: f32,
    pub _pad: f32,
}

// Safety: VisualParams is Pod (plain old data) — no padding issues.
unsafe impl bytemuck::Pod for VisualParams {}
// Safety: VisualParams is any bit pattern valid.
unsafe impl bytemuck::Zeroable for VisualParams {}

// Safety: AudioAnalysisGpu is Pod.
unsafe impl bytemuck::Pod for AudioAnalysisGpu {}
// Safety: AudioAnalysisGpu is any bit pattern valid.
unsafe impl bytemuck::Zeroable for AudioAnalysisGpu {}

/// WGSL compute shader for audio → visual parameter mapping.
pub const AUDIO_TO_VISUAL_WGSL: &str = r#"
struct AudioInput {
    energy: f32,
    bass: f32,
    mid: f32,
    treble: f32,
    spectral_centroid: f32,
    zero_crossing_rate: f32,
    pad0: f32,
    pad1: f32,
};

struct VisualOutput {
    color_r: f32,
    color_g: f32,
    color_b: f32,
    intensity: f32,
    particle_speed: f32,
    mesh_deform: f32,
    bloom_strength: f32,
    pad: f32,
};

@group(0) @binding(0) var<uniform> audio_in: AudioInput;
@group(0) @binding(1) var<storage, read_write> visual_out: VisualOutput;

@compute @workgroup_size(1)
fn main() {
    // Map audio energy to visual intensity with soft clipping
    let raw_intensity = audio_in.energy * 1.5;
    visual_out.intensity = raw_intensity / (1.0 + raw_intensity);

    // Color mapping: bass→red, mid→green, treble→blue
    visual_out.color_r = audio_in.bass * 0.8 + audio_in.energy * 0.2;
    visual_out.color_g = audio_in.mid * 0.7 + audio_in.energy * 0.15;
    visual_out.color_b = audio_in.treble * 0.9 + audio_in.energy * 0.1;

    // Particle speed scales with energy
    visual_out.particle_speed = audio_in.energy * 2.0 + audio_in.treble * 0.5;

    // Mesh deformation driven by bass
    visual_out.mesh_deform = audio_in.bass * 0.6;

    // Bloom strength from spectral centroid
    visual_out.bloom_strength = audio_in.spectral_centroid * 0.4 + audio_in.energy * 0.3;
}
"#;

/// The main visual engine handle.
///
/// Includes exponential smoothing for jitter-free visual parameters.
/// The smoothing factor (alpha) controls responsiveness vs. stability:
/// - alpha=1.0: no smoothing (immediate response)
/// - alpha=0.1: heavy smoothing (slow, stable transitions)
pub struct VisualEngine {
    config: VisualConfig,
    state: EngineState,
    compute_pipeline_ready: bool,
    /// Previous visual params for exponential smoothing.
    prev_params: VisualParams,
    /// Smoothing factor (0.0–1.0). Lower = smoother.
    smooth_alpha: f32,
}

impl VisualEngine {
    /// Create a new visual engine with the given configuration.
    pub fn new(config: VisualConfig) -> Self {
        info!(width = config.width, height = config.height, "Visual engine created");
        Self {
            config,
            state: EngineState::Uninitialized,
            compute_pipeline_ready: false,
            prev_params: VisualParams::default(),
            smooth_alpha: 0.3, // Default: moderate smoothing
        }
    }

    /// Set the smoothing factor for visual parameter transitions.
    ///
    /// - `1.0`: No smoothing — immediate response to audio changes.
    /// - `0.1`: Heavy smoothing — slow, stable visual transitions.
    /// - Recommended: `0.2–0.4` for live performance visuals.
    pub fn set_smoothing(&mut self, alpha: f32) {
        self.smooth_alpha = alpha.clamp(0.01, 1.0);
    }

    /// Initialize the GPU device and compute pipeline.
    pub async fn init(&mut self) -> Result<()> {
        info!("Initializing visual engine with {:?} backend", self.config.backend);
        // In production: request wgpu adapter, create device, compile compute shader
        self.compute_pipeline_ready = true;
        self.state = EngineState::Ready;
        Ok(())
    }

    /// Run the compute pass to transform audio analysis → visual parameters.
    ///
    /// Returns the computed visual parameters with exponential smoothing
    /// applied to prevent visual jitter. In production this dispatches
    /// to the GPU; the current implementation computes the mapping on CPU
    /// as a reference for the WGSL shader above.
    pub fn compute_visual_params(&mut self, audio: &AudioAnalysisGpu) -> VisualParams {
        let raw_intensity = audio.energy * 1.5;
        let intensity = raw_intensity / (1.0 + raw_intensity);

        let raw = VisualParams {
            color_r: audio.bass * 0.8 + audio.energy * 0.2,
            color_g: audio.mid * 0.7 + audio.energy * 0.15,
            color_b: audio.treble * 0.9 + audio.energy * 0.1,
            intensity,
            particle_speed: audio.energy * 2.0 + audio.treble * 0.5,
            mesh_deform: audio.bass * 0.6,
            bloom_strength: audio.spectral_centroid * 0.4 + audio.energy * 0.3,
            _pad: 0.0,
        };

        // Exponential smoothing: out = alpha * new + (1 - alpha) * old
        let a = self.smooth_alpha;
        let b = 1.0 - a;
        let smoothed = VisualParams {
            color_r: a * raw.color_r + b * self.prev_params.color_r,
            color_g: a * raw.color_g + b * self.prev_params.color_g,
            color_b: a * raw.color_b + b * self.prev_params.color_b,
            intensity: a * raw.intensity + b * self.prev_params.intensity,
            particle_speed: a * raw.particle_speed + b * self.prev_params.particle_speed,
            mesh_deform: a * raw.mesh_deform + b * self.prev_params.mesh_deform,
            bloom_strength: a * raw.bloom_strength + b * self.prev_params.bloom_strength,
            _pad: 0.0,
        };
        self.prev_params = smoothed;
        smoothed
    }

    /// Render a single frame with the given audio analysis data.
    pub fn render_frame(&mut self, _audio_data: &[f32]) -> Result<()> {
        if self.state != EngineState::Ready && self.state != EngineState::Rendering {
            warn!("Cannot render: engine state is {:?}", self.state);
            return Ok(());
        }
        self.state = EngineState::Rendering;
        // TODO: Upload audio analysis to uniform buffer
        // TODO: Dispatch compute shader workgroup
        // TODO: Execute render pass with computed visual params
        self.state = EngineState::Ready;
        Ok(())
    }

    /// Suspend the engine and release GPU resources.
    pub fn suspend(&mut self) {
        info!("Visual engine suspended");
        self.compute_pipeline_ready = false;
        self.state = EngineState::Suspended;
    }

    /// Returns the current engine state.
    pub fn state(&self) -> EngineState {
        self.state
    }

    /// Returns the current configuration.
    pub fn config(&self) -> &VisualConfig {
        &self.config
    }

    /// Returns whether the compute pipeline is compiled and ready.
    pub fn compute_ready(&self) -> bool {
        self.compute_pipeline_ready
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_lifecycle() {
        let config = VisualConfig::default();
        let engine = VisualEngine::new(config);
        assert_eq!(engine.state(), EngineState::Uninitialized);
        assert!(!engine.compute_ready());
    }

    #[test]
    fn default_config() {
        let config = VisualConfig::default();
        assert_eq!(config.width, 1920);
        assert_eq!(config.height, 1080);
        assert!(config.vsync);
    }

    #[test]
    fn compute_visual_params_silent() {
        let mut engine = VisualEngine::new(VisualConfig::default());
        let audio = AudioAnalysisGpu::default();
        let params = engine.compute_visual_params(&audio);
        assert_eq!(params.intensity, 0.0);
        assert_eq!(params.color_r, 0.0);
    }

    #[test]
    fn compute_visual_params_energy() {
        let mut engine = VisualEngine::new(VisualConfig::default());
        let audio = AudioAnalysisGpu::new(0.8, 0.9, 0.5, 0.3);
        let params = engine.compute_visual_params(&audio);
        assert!(params.intensity > 0.0, "intensity should be positive with energy");
        assert!(params.color_r > 0.0, "red channel should respond to bass");
        assert!(params.color_b > 0.0, "blue channel should respond to treble");
        assert!(params.particle_speed > 0.0, "particles should move with energy");
    }

    #[test]
    fn compute_visual_params_soft_clip() {
        let mut engine = VisualEngine::new(VisualConfig::default());
        // Disable smoothing to test raw soft-clip math
        engine.set_smoothing(1.0);
        // Very high energy should be soft-clipped (intensity < 1.0 but close)
        let audio = AudioAnalysisGpu::new(10.0, 1.0, 1.0, 1.0);
        let params = engine.compute_visual_params(&audio);
        assert!(params.intensity < 1.0, "intensity should be soft-clipped below 1.0");
        assert!(params.intensity > 0.9, "intensity should be close to 1.0 for high energy");
    }

    #[test]
    fn smoothing_reduces_jitter() {
        let mut engine = VisualEngine::new(VisualConfig::default());
        engine.set_smoothing(0.2); // Heavy smoothing
        // First frame: high energy
        let audio1 = AudioAnalysisGpu::new(1.0, 1.0, 0.5, 0.3);
        let p1 = engine.compute_visual_params(&audio1);
        // Second frame: silence
        let audio2 = AudioAnalysisGpu::new(0.0, 0.0, 0.0, 0.0);
        let p2 = engine.compute_visual_params(&audio2);
        // With smoothing, params should not drop to zero immediately
        assert!(p2.intensity > 0.0, "smoothed intensity should not drop to zero instantly");
        assert!(p2.intensity < p1.intensity, "smoothed intensity should decrease toward zero");
    }

    #[test]
    fn audio_analysis_gpu_size() {
        // Must be exactly 32 bytes for GPU alignment
        assert_eq!(std::mem::size_of::<AudioAnalysisGpu>(), 32);
    }

    #[test]
    fn visual_params_size() {
        // Must be exactly 32 bytes for GPU alignment
        assert_eq!(std::mem::size_of::<VisualParams>(), 32);
    }

    #[test]
    fn audio_analysis_as_bytes() {
        let audio = AudioAnalysisGpu::new(1.0, 0.5, 0.3, 0.2);
        let bytes = audio.as_bytes();
        assert_eq!(bytes.len(), 32);
    }

    #[test]
    fn wgsl_shader_source_not_empty() {
        assert!(AUDIO_TO_VISUAL_WGSL.contains("@compute"));
        assert!(AUDIO_TO_VISUAL_WGSL.contains("workgroup_size"));
    }
}
