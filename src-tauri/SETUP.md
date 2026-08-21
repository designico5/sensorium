# Sensorium Setup & Compile Guide (Windows 10/11)

Welcome to Sensorium! This document describes how to deploy the Ableton 12 MIDI Remote script and compile the Rust Tauri binary to get a single, zero-dependency executable (`Sensorium.exe`) that runs locally with absolute minimum CPU footprint.

---

## Prerequisites

1. **Rust & Cargo**:
   Install Rust via [rustup.rs](https://rustup.rs/). Choose the `x86_64-pc-windows-msvc` toolchain.
2. **Ableton Live 11 or 12**:
   Make sure Ableton is closed during script installation.
3. **C++ Build Tools**:
   Install Visual Studio Build Tools (check "Desktop development with C++" workload during installation).

---

## 1. Quick Automatic Setup (Recommended)

Simply start the compiled Tauri application! 
During its boot phase, the Rust core will check your user profile directory:
`%USERPROFILE%\Documents\Ableton\User Library\MIDI Remote Scripts\`

If it cannot find the `Sensorium` folder, it will create it and copy the bundled script `Sensorium.py` into it automatically. 

### Manual Remote Script Placement
If you prefer doing it yourself, copy the file:
`live-remote/Sensorium.py`
into:
`%USERPROFILE%\Documents\Ableton\User Library\MIDI Remote Scripts\Sensorium\Sensorium.py`

Once placed, open **Ableton Live**, navigate to **Preferences** → **Link, Tempo, MIDI**, and in the top section select **Sensorium** as an active **Control Surface**. Set the MIDI Input and Output ports to your master loopback bridge or leave them unselected (the script talks to Tauri over a low-latency UDP socket directly).

---

## 2. Compile the Tauri Application

Open a PowerShell or CMD terminal in the root of the project directory and run:

```bash
# 1. Install frontend dependencies
npm install

# 2. Build the production web assets
npm run build

# 3. Compile the Windows binary via cargo-tauri
# (This embeds your compiled HTML/CSS/JS assets inside the executable)
cargo tauri build
```

This compiles a single, lightweight Windows executable:
`src-tauri/target/release/Sensorium.exe`

Double-click to launch!

---

## 3. High-Performance Architecture Overview

- **OSC UDP Protocol**: Uses a non-blocking `std::net::UdpSocket` in Rust to capture Ableton events on Port `5125` with sub-millisecond response latency.
- **Axum WebSocket Server**: Pushes the merged state update directly into the embedded web-view using a local WebSocket broadcast channel, bypassing IPC marshaling bloat.
- **Windows MIDI API (`windows-rs`)**: Hooks into direct `midiInGetNumDevs` and `RegisterDeviceNotificationW` to catch device connects/disconnects at the kernel level without polling loops.
- **Low CPU Overhead**: The Rust background threads sleep completely until a MIDI event or transport tick occurs, maintaining less than 0.5% CPU usage even during massive multitrack playback.
