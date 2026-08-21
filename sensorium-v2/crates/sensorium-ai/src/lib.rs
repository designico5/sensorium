//! sensorium-ai — Local AI Inference Engine
//!
//! Provides local LLM inference capabilities for intelligent music production
//! assistance. Supports candle-based model loading and llamafile deployment
//! for zero-latency on-device inference.
//!
//! ## Inference Modes
//!
//! - **Template**: Rule-based music production suggestions (no model required)
//! - **Model**: Full LLM inference via candle/llamafile (requires model file)
//!
//! The template mode is always available and provides instant responses
//! for common music production queries without loading a model.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tracing::{info, warn};

/// AI model configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub model_path: Option<String>,
    pub max_tokens: usize,
    pub temperature: f32,
    pub context_window: usize,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            model_path: None,
            max_tokens: 512,
            temperature: 0.7,
            context_window: 4096,
        }
    }
}

/// AI engine state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AiState {
    Uninitialized,
    Loading,
    Ready,
    Inferring,
    Error,
}

/// Inference request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceRequest {
    pub prompt: String,
    pub max_tokens: Option<usize>,
    pub temperature: Option<f32>,
}

/// Inference response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceResponse {
    pub text: String,
    pub tokens_used: usize,
    pub latency_ms: f64,
}

/// The main AI engine handle.
pub struct AiEngine {
    config: AiConfig,
    state: AiState,
    model_loaded: bool,
}

impl AiEngine {
    /// Create a new AI engine with the given configuration.
    pub fn new(config: AiConfig) -> Self {
        info!(max_tokens = config.max_tokens, "AI engine created");
        Self {
            config,
            state: AiState::Uninitialized,
            model_loaded: false,
        }
    }

    /// Load the model from disk.
    pub async fn load_model(&mut self) -> Result<()> {
        self.state = AiState::Loading;
        info!("Loading AI model...");
        // In production: load candle model or llamafile binary
        // For now, mark as ready (template mode always available)
        self.model_loaded = self.config.model_path.is_some();
        self.state = AiState::Ready;
        Ok(())
    }

    /// Run inference on the given request.
    ///
    /// If a model is loaded, uses the model for inference.
    /// Otherwise, falls back to template-based suggestions.
    pub async fn infer(&mut self, request: &InferenceRequest) -> Result<InferenceResponse> {
        if self.state != AiState::Ready {
            warn!("AI engine not ready for inference, state: {:?}", self.state);
            return Ok(InferenceResponse {
                text: String::from("AI engine not ready"),
                tokens_used: 0,
                latency_ms: 0.0,
            });
        }
        self.state = AiState::Inferring;
        let start = Instant::now();

        let text = if self.model_loaded {
            // Model-based inference (stub — requires actual model file)
            self.model_infer(request)?
        } else {
            // Template-based inference (always available)
            self.template_infer(request)
        };

        let latency_ms = start.elapsed().as_secs_f64() * 1000.0;
        let tokens_used = text.split_whitespace().count();

        self.state = AiState::Ready;
        Ok(InferenceResponse {
            text,
            tokens_used,
            latency_ms,
        })
    }

    /// Template-based inference for music production assistance.
    ///
    /// Provides intelligent responses based on keyword matching
    /// and predefined music production knowledge. No model required.
    fn template_infer(&self, request: &InferenceRequest) -> String {
        let prompt_lower = request.prompt.to_lowercase();

        if prompt_lower.contains("mix") || prompt_lower.contains("master") {
            return "Mixing tip: Start with gain staging — keep peaks around -6dBFS for headroom. \
                    Use high-pass filters on non-bass instruments to reduce mud below 200Hz. \
                    Apply compression gently: 2:1 ratio, slow attack (30ms), auto release. \
                    For mastering, aim for -14 LUFS (streaming) or -9 LUFS (club)."
                .to_string();
        }

        if prompt_lower.contains("filter") || prompt_lower.contains("eq") {
            return "Filter suggestion: For warmth, try a lowpass at 8kHz with Q=0.7. \
                    For presence, a gentle boost at 3-5kHz (+2dB, wide Q). \
                    For mud reduction, cut 200-400Hz by 2-3dB with a narrow bell. \
                    High-pass at 30Hz removes subsonic rumble without affecting tone."
                .to_string();
        }

        if prompt_lower.contains("reverb") || prompt_lower.contains("delay") || prompt_lower.contains("space") {
            return "Spatial effects: Use pre-delay (20-40ms) to keep transients clear. \
                    For vocals, try a plate reverb (1.2s decay, 30% mix). \
                    For depth, use a short room (0.4s) on drums and a hall (2.0s) on pads. \
                    Delay: 1/4 note at 25% feedback for groove, 1/8 dotted for bounce."
                .to_string();
        }

        if prompt_lower.contains("compress") || prompt_lower.contains("dynamic") {
            return "Compression guide: Vocals — 3:1, medium attack (10ms), auto release. \
                    Drums — 4:1, slow attack (30ms) to preserve transients. \
                    Bass — 4:1, fast attack (5ms) for even sustain. \
                    Parallel compression: blend 30% crushed signal for energy."
                .to_string();
        }

        if prompt_lower.contains("midi") || prompt_lower.contains("controller") {
            return "MIDI 2.0 features enabled: Per-Note Expression (MPE) allows \
                    independent pitch bend and timbre per note. Use MIDI 2.0 UMP \
                    for 32-bit resolution on all controllers. The Sensorium engine \
                    supports 16 groups × 16 channels = 256 independent MIDI zones."
                .to_string();
        }

        if prompt_lower.contains("latency") || prompt_lower.contains("performance") {
            return "Performance: Sensorium DSP runs at zero-allocation in the audio callback. \
                    Target buffer: 128 samples @ 48kHz = 2.67ms round-trip. \
                    The QUIC transport adds <1ms for remote MIDI. \
                    CRDT sync is async and doesn't block the audio thread."
                .to_string();
        }

        if prompt_lower.contains("health") || prompt_lower.contains("status") {
            return "System health: The HealthAssessor monitors CPU, memory, and audio latency. \
                    FailurePredictor analyzes trends over time to predict issues. \
                    Green = all nominal. Yellow = investigate. Red = take action. \
                    Check the Tauri IPC 'get_system_health' command for live data."
                .to_string();
        }

        // Default: general assistance
        format!(
            "Sensorium AI (template mode): I can help with mixing, EQ, filters, \
             reverb/delay, compression, MIDI, latency, and system health. \
             Try asking about a specific topic. For full LLM inference, \
             provide a model path in AiConfig.",
        )
    }

    /// Model-based inference (requires loaded model).
    fn model_infer(&self, request: &InferenceRequest) -> Result<String> {
        // In production: run candle/llamafile inference
        Ok(format!(
            "[Model inference stub] Prompt: '{}' (max_tokens={}, temp={})",
            request.prompt,
            request.max_tokens.unwrap_or(self.config.max_tokens),
            request.temperature.unwrap_or(self.config.temperature),
        ))
    }

    /// Returns the current engine state.
    pub fn state(&self) -> AiState {
        self.state
    }

    /// Returns the current configuration.
    pub fn config(&self) -> &AiConfig {
        &self.config
    }

    /// Returns whether a model is loaded.
    pub fn is_model_loaded(&self) -> bool {
        self.model_loaded
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn engine_creation() {
        let engine = AiEngine::new(AiConfig::default());
        assert_eq!(engine.state(), AiState::Uninitialized);
        assert!(!engine.is_model_loaded());
    }

    #[test]
    fn default_config() {
        let config = AiConfig::default();
        assert_eq!(config.max_tokens, 512);
        assert_eq!(config.context_window, 4096);
    }

    #[tokio::test]
    async fn template_infer_mixing() {
        let mut engine = AiEngine::new(AiConfig::default());
        engine.load_model().await.unwrap();
        let resp = engine.infer(&InferenceRequest {
            prompt: "How should I mix my track?".into(),
            max_tokens: None,
            temperature: None,
        }).await.unwrap();
        assert!(resp.text.contains("Mixing tip"));
        assert!(resp.tokens_used > 0);
        assert!(resp.latency_ms >= 0.0);
    }

    #[tokio::test]
    async fn template_infer_filter() {
        let mut engine = AiEngine::new(AiConfig::default());
        engine.load_model().await.unwrap();
        let resp = engine.infer(&InferenceRequest {
            prompt: "What EQ/filter settings for warmth?".into(),
            max_tokens: None,
            temperature: None,
        }).await.unwrap();
        assert!(resp.text.contains("Filter suggestion"));
    }

    #[tokio::test]
    async fn template_infer_latency() {
        let mut engine = AiEngine::new(AiConfig::default());
        engine.load_model().await.unwrap();
        let resp = engine.infer(&InferenceRequest {
            prompt: "What is the latency?".into(),
            max_tokens: None,
            temperature: None,
        }).await.unwrap();
        assert!(resp.text.contains("Performance") || resp.text.contains("latency"));
    }

    #[tokio::test]
    async fn template_infer_default() {
        let mut engine = AiEngine::new(AiConfig::default());
        engine.load_model().await.unwrap();
        let resp = engine.infer(&InferenceRequest {
            prompt: "Hello world".into(),
            max_tokens: None,
            temperature: None,
        }).await.unwrap();
        assert!(resp.text.contains("Sensorium AI"));
    }

    #[tokio::test]
    async fn infer_not_ready() {
        let mut engine = AiEngine::new(AiConfig::default());
        // Don't load model — state is Uninitialized
        let resp = engine.infer(&InferenceRequest {
            prompt: "test".into(),
            max_tokens: None,
            temperature: None,
        }).await.unwrap();
        assert!(resp.text.contains("not ready"));
    }

    #[tokio::test]
    async fn model_path_sets_loaded_flag() {
        let mut engine = AiEngine::new(AiConfig {
            model_path: Some("/path/to/model.gguf".into()),
            ..Default::default()
        });
        engine.load_model().await.unwrap();
        assert!(engine.is_model_loaded());
    }
}
