//! Sensorium Tauri IPC Bridge
//!
//! Exposes Rust backend functionality to the React frontend
//! via Tauri commands. Manages shared state for audio, MIDI,
//! sync, visual, and AI engines.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tracing_subscriber::{fmt, EnvFilter};

// Re-export backend types
use sensorium_audio::dsp::{AudioGraph, FilterType, meter_interleaved};
use sensorium_midi::MidiRouter;
use sensorium_sync::{SyncState, Track};
use sensorium_visual::{VisualEngine, VisualConfig};
use sensorium_ai::{AiEngine, AiConfig, InferenceRequest as AiInferenceRequest};
use sensorium_chaos::HealthAssessor;

/// Shared application state accessible from Tauri commands.
struct AppState {
    audio_graph: Mutex<AudioGraph>,
    #[allow(dead_code)]
    midi_router: Mutex<MidiRouter>,
    sync_state: Mutex<SyncState>,
    visual_engine: Mutex<VisualEngine>,
    ai_engine: tokio::sync::Mutex<AiEngine>,
    health_assessor: Mutex<HealthAssessor>,
}

/// Initialize the tracing subscriber for observability.
///
/// Call this once at application startup. Respects RUST_LOG env var.
pub fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    fmt()
        .with_env_filter(filter)
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();
    
    tracing::info!("Sensorium tracing initialized");
}

// ─── Response types ──────────────────────────────────────────────

#[derive(Serialize)]
struct AudioStatus {
    sample_rate: f64,
    gain_db: f64,
    bypassed: bool,
    filter_active: bool,
}

#[derive(Serialize)]
struct MeterStatus {
    peak_l: f32,
    peak_r: f32,
    rms_l: f32,
    rms_r: f32,
}

#[derive(Serialize)]
struct SystemHealth {
    audio_ok: bool,
    midi_ok: bool,
    sync_ok: bool,
    visual_state: String,
    ai_state: String,
    health_overall: String,
    health_uptime_secs: f64,
}

#[derive(Serialize)]
struct AiResponse {
    text: String,
    tokens_used: usize,
    latency_ms: f64,
}

#[derive(Deserialize)]
struct AiRequest {
    prompt: String,
    max_tokens: Option<usize>,
    temperature: Option<f32>,
}

#[derive(Deserialize)]
struct FilterRequest {
    filter_type: String,
    cutoff_hz: f64,
    q: f64,
}

// ─── Tauri Commands ──────────────────────────────────────────────

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Sensorium!", name)
}

#[tauri::command]
fn get_audio_status(state: tauri::State<AppState>) -> AudioStatus {
    let graph = state.audio_graph.lock().unwrap();
    AudioStatus {
        sample_rate: graph.sample_rate(),
        gain_db: 20.0 * graph.current_gain().log10(),
        bypassed: graph.is_bypassed(),
        filter_active: false, // Would need to track this in AudioGraph
    }
}

#[tauri::command]
fn set_gain_db(state: tauri::State<AppState>, gain_db: f64) -> Result<(), String> {
    let mut graph = state.audio_graph.lock().map_err(|e| e.to_string())?;
    graph.set_gain_db(gain_db);
    Ok(())
}

#[tauri::command]
fn set_bypass(state: tauri::State<AppState>, bypassed: bool) -> Result<(), String> {
    let mut graph = state.audio_graph.lock().map_err(|e| e.to_string())?;
    graph.set_bypass(bypassed);
    Ok(())
}

#[tauri::command]
fn set_filter(state: tauri::State<AppState>, req: FilterRequest) -> Result<(), String> {
    let mut graph = state.audio_graph.lock().map_err(|e| e.to_string())?;
    let filter_type = match req.filter_type.to_lowercase().as_str() {
        "lowpass" => FilterType::Lowpass,
        "highpass" => FilterType::Highpass,
        "bandpass" => FilterType::Bandpass,
        "notch" => FilterType::Notch,
        _ => return Err(format!("unknown filter type: {}", req.filter_type)),
    };
    graph.set_filter(filter_type, req.cutoff_hz, req.q);
    Ok(())
}

#[tauri::command]
fn clear_filter(state: tauri::State<AppState>) -> Result<(), String> {
    let mut graph = state.audio_graph.lock().map_err(|e| e.to_string())?;
    graph.clear_filter();
    Ok(())
}

#[tauri::command]
fn get_meter(_state: tauri::State<AppState>, buffer: Vec<f32>) -> MeterStatus {
    let meter = meter_interleaved(&buffer);
    MeterStatus {
        peak_l: meter.peak_l,
        peak_r: meter.peak_r,
        rms_l: meter.rms_l,
        rms_r: meter.rms_r,
    }
}

#[tauri::command]
fn get_system_health(state: tauri::State<AppState>) -> Result<SystemHealth, String> {
    let graph = state.audio_graph.lock().map_err(|e| e.to_string())?;
    let visual = state.visual_engine.lock().map_err(|e| e.to_string())?;
    let ai_state = match state.ai_engine.try_lock() {
        Ok(ai) => format!("{:?}", ai.state()),
        Err(_) => "Busy".to_string(),
    };
    let health = state.health_assessor.lock().map_err(|e| e.to_string())?;
    let report = health.assess();

    Ok(SystemHealth {
        audio_ok: graph.sample_rate() > 0.0,
        midi_ok: true,
        sync_ok: true,
        visual_state: format!("{:?}", visual.state()),
        ai_state,
        health_overall: format!("{:?}", report.overall),
        health_uptime_secs: report.uptime_secs,
    })
}

#[tauri::command]
async fn ai_infer(
    state: tauri::State<'_, AppState>,
    req: AiRequest,
) -> Result<AiResponse, String> {
    let request = AiInferenceRequest {
        prompt: req.prompt,
        max_tokens: req.max_tokens,
        temperature: req.temperature,
    };
    // Use tokio Mutex for async safety
    let response = {
        let mut engine = state.ai_engine.lock().await;
        engine.infer(&request).await.map_err(|e| e.to_string())?
    };
    Ok(AiResponse {
        text: response.text,
        tokens_used: response.tokens_used,
        latency_ms: response.latency_ms,
    })
}

#[tauri::command]
fn get_document(state: tauri::State<AppState>) -> Result<String, String> {
    let sync = state.sync_state.lock().map_err(|e| e.to_string())?;
    let doc = sync.to_document().map_err(|e| e.to_string())?;
    serde_json::to_string(&doc).map_err(|e| e.to_string())
}

#[tauri::command]
fn add_track(state: tauri::State<AppState>, name: String) -> Result<(), String> {
    let mut sync = state.sync_state.lock().map_err(|e| e.to_string())?;
    let mut doc = sync.to_document().map_err(|e| e.to_string())?;
    let track = Track {
        id: format!("track_{}", doc.tracks.len()),
        name,
        clips: vec![],
        volume: 0.8,
        pan: 0.0,
        muted: false,
        solo: false,
    };
    doc.add_track(track);
    sync.apply_document(&doc).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_tempo(state: tauri::State<AppState>, tempo: f64) -> Result<(), String> {
    let mut sync = state.sync_state.lock().map_err(|e| e.to_string())?;
    let mut doc = sync.to_document().map_err(|e| e.to_string())?;
    doc.settings.tempo = tempo;
    sync.apply_document(&doc).map_err(|e| e.to_string())?;
    Ok(())
}

/// Initialize the Tauri application with shared state.
pub fn run() {
    // Initialize tracing for observability
    init_tracing();
    
    let app_state = AppState {
        audio_graph: Mutex::new(AudioGraph::new(48000.0)),
        midi_router: Mutex::new(MidiRouter::default()),
        sync_state: Mutex::new(SyncState::new()),
        visual_engine: Mutex::new(VisualEngine::new(VisualConfig::default())),
        ai_engine: tokio::sync::Mutex::new(AiEngine::new(AiConfig::default())),
        health_assessor: Mutex::new(HealthAssessor::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            get_audio_status,
            set_gain_db,
            set_bypass,
            set_filter,
            clear_filter,
            get_meter,
            get_system_health,
            ai_infer,
            get_document,
            add_track,
            set_tempo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}