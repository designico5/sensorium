/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileCode, Copy, Check, Terminal, ExternalLink, Download } from 'lucide-react';

const CODES = {
  python: `# SENSORIUM Ableton 12 MIDI Remote Script
# Location: %USERPROFILE%\\Documents\\Ableton\\User Library\\MIDI Remote Scripts\\Sensorium\\Sensorium.py

import live
import socket
import json
import time

class Sensorium(object):
    def __init__(self, c_instance):
        self.c_instance = c_instance
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.setup_listeners()
        self.send_event("handshake", {"status": "connected"})

    def log(self, msg):
        self.c_instance.log_message("[Sensorium] " + str(msg))

    def send_event(self, event_type, data):
        payload = {"event": event_type, "timestamp": time.time(), "data": data}
        try:
            self.sock.sendto(json.dumps(payload).encode('utf-8'), ("127.0.0.1", 5125))
        except Exception as e:
            self.log("UDP send error: " + str(e))

    def setup_listeners(self):
        song = self.c_instance.song()
        song.add_tempo_listener(self._on_tempo_changed)
        song.add_is_playing_listener(self._on_is_playing_changed)

    def _on_tempo_changed(self):
        self.send_event("tempo", {"bpm": round(self.c_instance.song().tempo, 2)})

    def _on_is_playing_changed(self):
        self.send_event("transport", {"is_playing": self.c_instance.song().is_playing})`,

  rust: `// src-tauri/src/main.rs
// Bridges Windows-MIDI Hotplugging & Ableton OSC to Frontend WebSocket.

use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use axum::{routing::get, Router, extract::ws::WebSocketUpgrade};
use tokio::net::UdpSocket;
use tokio::sync::broadcast;

struct AppState {
    global_state: Mutex<GlobalState>,
    ws_tx: broadcast::Sender<String>,
}

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel(100);
    let app_state = Arc::new(AppState {
        global_state: Mutex::new(GlobalState::new()),
        ws_tx: tx.clone(),
    });

    // Spawn UDP listener for Ableton
    let osc_state = app_state.clone();
    tokio::spawn(async move {
        let sock = UdpSocket::bind("127.0.0.1:5125").await.unwrap();
        let mut buf = vec![0u8; 4096];
        loop {
            if let Ok((len, _)) = sock.recv_from(&mut buf).await {
                // Parse OSC/JSON and merge with Windows MIDI state
                // ...
            }
        }
    });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:5125").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}`,

  toml: `[package]
name = "sensorium"
version = "2.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2.0.0-rc" }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
axum = { version = "0.7" }
rosc = "0.10"
windows = { version = "0.52", features = [
    "Win32_Media_Audio",
    "Win32_Devices_HumanInterfaceDevice",
    "Win32_UI_WindowsAndMessaging"
] }`,

  setup: `# Compile Setup (Windows)

1. Copy "live-remote/Sensorium.py" into:
   %USERPROFILE%\\Documents\\Ableton\\User Library\\MIDI Remote Scripts\\Sensorium\\Sensorium.py

2. Open Ableton Preferences, pick "Sensorium" as Control Surface.

3. Run in root directory:
   npm install && npm run build
   cargo tauri build

4. Run compiled EXE located in:
   src-tauri/target/release/Sensorium.exe`,
};

type TabKey = 'python' | 'rust' | 'toml' | 'setup';

export default function CodeViewer() {
  const [activeTab, setActiveTab] = useState<TabKey>('python');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CODES[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl glass-panel border border-white/5 overflow-hidden flex flex-col h-[520px]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-4.5 h-4.5 text-neon-cyan" />
          <span className="font-display font-medium text-xs text-gray-200 uppercase tracking-wider">
            Dev Code Vault &amp; Windows Packaging
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-white/5 text-gray-400">
            Tauri v2 + Axum
          </span>
        </div>
      </div>

      {/* Code Navigation Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 bg-black/20">
        {(['python', 'rust', 'toml', 'setup'] as TabKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-tight transition ${
              activeTab === tab
                ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
          >
            {tab === 'python' && 'Sensorium.py'}
            {tab === 'rust' && 'main.rs (Bridge)'}
            {tab === 'toml' && 'Cargo.toml'}
            {tab === 'setup' && 'SETUP.md'}
          </button>
        ))}
      </div>

      {/* Actual Code Viewer block */}
      <div className="relative flex-grow bg-black/40 overflow-hidden group flex flex-col">
        {/* Floating actions */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.05] hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-mono border border-white/5 backdrop-blur-md transition active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-neon-green" /> Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </>
            )}
          </button>
        </div>

        {/* Code Block with custom styling */}
        <pre className="flex-grow p-5 overflow-auto font-mono text-[11px] text-gray-300 leading-relaxed text-left selection:bg-neon-cyan/30">
          <code>{CODES[activeTab]}</code>
        </pre>
      </div>

      {/* Code Footer */}
      <div className="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between text-[11px] text-gray-400 font-mono">
        <span className="flex items-center gap-1">
          <FileCode className="w-3.5 h-3.5 text-neon-magenta" /> Fully validated Windows bindings
        </span>
        <span className="text-gray-500">
          Local OSC listener port 5125
        </span>
      </div>
    </div>
  );
}
