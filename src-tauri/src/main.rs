// SENSORIUM Tauri v2 Rust Backend Daemon
// Bridges Windows-MIDI Hotplugging & Ableton Live 12 Remote OSC Script to Web Frontend.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use std::fs;
use std::env;
use tokio::net::UdpSocket;
use tokio::sync::broadcast;
use axum::{
    routing::get,
    Router,
    extract::ws::{WebSocket, WebSocketUpgrade, Message},
    response::IntoResponse,
};
use tower_http::cors::CorsLayer;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
struct MidiDeviceState {
    id: String,
    name: String,
    status: String, // "Healthy", "Warn", "Error"
    buffer_usage: f32,
    clock_drift_ms: f32,
    latency_ms: f32,
    drop_count: u32,
    error_msg: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct GlobalState {
    bpm: f32,
    is_playing: bool,
    active_clip: String,
    track_armed: String,
    devices: Vec<MidiDeviceState>,
}

// Global state container
struct AppState {
    global_state: Mutex<GlobalState>,
    ws_tx: broadcast::Sender<String>,
}

#[tauri::command]
fn verify_and_install_ableton_script() -> Result<String, String> {
    // 1. Determine User Profile folder on Windows
    let user_profile = match env::var("USERPROFILE") {
        Ok(path) => path,
        Err(_) => return Err("USERPROFILE environment variable not found. Are you on Windows?".to_string()),
    };

    let mut target_dir = PathBuf::from(user_profile);
    target_dir.push("Documents");
    target_dir.push("Ableton");
    target_dir.push("User Library");
    target_dir.push("MIDI Remote Scripts");
    target_dir.push("Sensorium");

    let mut script_file = target_dir.clone();
    script_file.push("Sensorium.py");

    if script_file.exists() {
        return Ok(format!("Script found and verified at {:?}", script_file));
    }

    // Attempt to auto-create the folders and copy the script
    if let Err(e) = fs::create_dir_all(&target_dir) {
        return Err(format!("Could not create Ableton script directory structure: {}", e));
    }

    // In a real tauri binary, we embed the python script bytes.
    let script_bytes = include_bytes!("../../live-remote/Sensorium.py");
    if let Err(e) = fs::write(&script_file, script_bytes) {
        return Err(format!("Failed to write Remote Script to user library: {}", e));
    }

    Ok(format!(
        "Successfully installed Sensorium script into: {:?}. Please select 'Sensorium' in Ableton Live's Link/MIDI settings as a Control Surface.",
        script_file
    ))
}

#[tokio::main]
async fn main() {
    println!("Starting Sensorium Tauri Daemon...");
    
    // Check/install remote script on startup
    match verify_and_install_ableton_script() {
        Ok(msg) => println!("Ableton setup check: {}", msg),
        Err(e) => println!("Ableton setup check (non-blocking warning): {}", e),
    }

    // Broadcaster for sending socket telemetry down to react UI
    let (tx, _rx) = broadcast::channel(100);
    
    let initial_state = GlobalState {
        bpm: 120.0,
        is_playing: false,
        active_clip: "None".to_string(),
        track_armed: "None".to_string(),
        devices: vec![
            MidiDeviceState {
                id: "win-midi-0".to_string(),
                name: "DrumMachine MIDI 3".to_string(),
                status: "Healthy".to_string(),
                buffer_usage: 12.0,
                clock_drift_ms: 0.8,
                latency_ms: 4.2,
                drop_count: 0,
                error_msg: None,
            },
            MidiDeviceState {
                id: "win-midi-1".to_string(),
                name: "Keyboard Synth".to_string(),
                status: "Healthy".to_string(),
                buffer_usage: 5.5,
                clock_drift_ms: 1.2,
                latency_ms: 3.1,
                drop_count: 0,
                error_msg: None,
            }
        ]
    };

    let app_state = Arc::new(AppState {
        global_state: Mutex::new(initial_state),
        ws_tx: tx.clone(),
    });

    // Run OSC UDP loop in background
    let osc_state = app_state.clone();
    tokio::spawn(async move {
        run_osc_udp_receiver(osc_state).await;
    });

    // Run Windows MIDI Hotplug hook simulator in background
    let hotplug_state = app_state.clone();
    tokio::spawn(async move {
        run_windows_hotplug_watcher(hotplug_state).await;
    });

    // Setup Axum WebSocket server
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 5125));
    println!("Axum WS Server running on http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.ws_tx.subscribe();
    
    // First, send the current snapshot upon connecting
    let snapshot = {
        let guard = state.global_state.lock().unwrap();
        serde_json::to_string(&*guard).unwrap()
    };
    let _ = socket.send(Message::Text(snapshot)).await;

    // Stream state transitions
    while let Ok(msg) = rx.recv().await {
        if socket.send(Message::Text(msg)).await.is_err() {
            break; // Client disconnected
        }
    }
}

// Parses JSON and OSC events from Ableton Remote Script on Port 5125
async fn run_osc_udp_receiver(state: Arc<AppState>) {
    let sock = UdpSocket::bind("127.0.0.1:5125").await.unwrap();
    let mut buf = vec![0u8; 4096];
    println!("Listening for OSC/UDP packets on 127.0.0.1:5125...");

    loop {
        if let Ok((len, _addr)) = sock.recv_from(&mut buf).await {
            let data = &buf[..len];
            
            // Try parsing JSON event from Ableton Python script
            if let Ok(json_str) = std::str::from_utf8(data) {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(json_str) {
                    let mut guard = state.global_state.lock().unwrap();
                    
                    if let Some(event) = value.get("event").and_then(|e| e.as_str()) {
                        match event {
                            "tempo" => {
                                if let Some(bpm) = value.get("data").and_then(|d| d.get("bpm")).and_then(|b| b.as_f64()) {
                                    guard.bpm = bpm as f32;
                                }
                            }
                            "transport" => {
                                if let Some(is_playing) = value.get("data").and_then(|d| d.get("is_playing")).and_then(|i| i.as_bool()) {
                                    guard.is_playing = is_playing;
                                }
                            }
                            _ => {}
                        }
                    }
                    
                    // Dispatch update to all listeners
                    let serialized = serde_json::to_string(&*guard).unwrap();
                    let _ = state.ws_tx.send(serialized);
                }
            }
        }
    }
}

// Simulates windows-rs MidiInPort device changes and hotplug checks
async fn run_windows_hotplug_watcher(state: Arc<AppState>) {
    // In actual production code, we use RegisterDeviceNotificationW with windows::Win32::UI::WindowsAndMessaging
    // to catch WM_DEVICECHANGE events. Here we run a daemon loop simulating low-latency evaluation.
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
        
        let mut guard = state.global_state.lock().unwrap();
        // Check fuzzy-match table to map ports
        // If a real device drifts, mark as Warning
        for dev in &mut guard.devices {
            if dev.buffer_usage > 90.0 {
                dev.status = "Error".to_string();
                dev.error_msg = Some("MIDI Buffer Overflow: Dropping Clock packets!".to_string());
            } else if dev.clock_drift_ms > 15.0 {
                dev.status = "Warn".to_string();
                dev.error_msg = Some("Clock drift detected on sync-master (>15ms)".to_string());
            }
        }
        
        let serialized = serde_json::to_string(&*guard).unwrap();
        let _ = state.ws_tx.send(serialized);
    }
}
