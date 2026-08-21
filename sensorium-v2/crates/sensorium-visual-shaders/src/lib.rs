//! sensorium-visual-shaders — WGSL Shader Library
//!
//! Collection of WGSL compute and render shaders for the Sensorium
//! visual engine. Includes audio-reactive shaders, particle systems,
//! and frequency visualization effects.

use serde::{Deserialize, Serialize};
use tracing::info;

/// Shader type enumeration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ShaderType {
    /// Frequency spectrum visualization.
    SpectrumAnalyzer,
    /// Waveform display.
    Waveform,
    /// Particle system driven by audio energy.
    ParticleField,
    /// Audio-reactive mesh deformation.
    MeshMorph,
    /// Volumetric frequency cloud.
    FrequencyCloud,
    /// Custom user shader.
    Custom,
}

/// Shader compilation target.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ShaderStage {
    Vertex,
    Fragment,
    Compute,
}

/// Shader module descriptor.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShaderDescriptor {
    pub name: String,
    pub shader_type: ShaderType,
    pub stage: ShaderStage,
    pub wgsl_source: String,
}

/// Shader registry managing all available shaders.
pub struct ShaderRegistry {
    shaders: Vec<ShaderDescriptor>,
}

impl ShaderRegistry {
    /// Create a new empty shader registry.
    pub fn new() -> Self {
        info!("Shader registry initialized");
        Self {
            shaders: Vec::new(),
        }
    }

    /// Register a shader module.
    pub fn register(&mut self, descriptor: ShaderDescriptor) {
        info!(name = %descriptor.name, "Shader registered");
        self.shaders.push(descriptor);
    }

    /// Get a shader by name.
    pub fn get(&self, name: &str) -> Option<&ShaderDescriptor> {
        self.shaders.iter().find(|s| s.name == name)
    }

    /// Returns the number of registered shaders.
    pub fn count(&self) -> usize {
        self.shaders.len()
    }

    /// List all registered shader names.
    pub fn list_names(&self) -> Vec<&str> {
        self.shaders.iter().map(|s| s.name.as_str()).collect()
    }
}

impl Default for ShaderRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Built-in WGSL shader sources.
pub mod builtin {
    /// Passthrough vertex shader.
    pub const PASSTHROUGH_VERT: &str = r#"
@vertex
fn main(@location(0) position: vec3<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(position, 1.0);
}
"#;

    /// Audio-reactive fragment shader.
    pub const AUDIO_REACTIVE_FRAG: &str = r#"
struct AudioUniforms {
    energy: f32,
    bass: f32,
    mid: f32,
    treble: f32,
    time: f32,
};
@group(0) @binding(0) var<uniform> audio: AudioUniforms;

@fragment
fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = pos.xy / vec2<f32>(1920.0, 1080.0);
    let color = vec3<f32>(
        audio.bass * (1.0 - uv.y) + audio.treble * uv.y,
        audio.mid * 0.5,
        audio.energy * 0.3
    );
    return vec4<f32>(color, 1.0);
}
"#;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_creation() {
        let registry = ShaderRegistry::new();
        assert_eq!(registry.count(), 0);
    }

    #[test]
    fn register_and_get() {
        let mut registry = ShaderRegistry::new();
        registry.register(ShaderDescriptor {
            name: "test_shader".into(),
            shader_type: ShaderType::SpectrumAnalyzer,
            stage: ShaderStage::Fragment,
            wgsl_source: String::new(),
        });
        assert_eq!(registry.count(), 1);
        assert!(registry.get("test_shader").is_some());
        assert!(registry.get("nonexistent").is_none());
    }

    #[test]
    fn builtin_shaders_exist() {
        assert!(!builtin::PASSTHROUGH_VERT.is_empty());
        assert!(!builtin::AUDIO_REACTIVE_FRAG.is_empty());
    }
}
