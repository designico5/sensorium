# SENSORIUM — Master Blueprint & AI Replication Guide

This document is a comprehensive, production-grade specification guide designed for an AI Developer to completely reproduce, compile, and bundle the **Sensorium** platform from scratch. It details the exact file structures, design systems, application layouts, core state systems, backend APIs, wrapper layers (Tauri/Electron), scripting layers, and target execution configurations.

---

## 1. Executive Summary & Core Concept

**Sensorium** is an advanced, real-time, low-latency audio hardware monitoring workspace, MIDI diagnostic interface, and production control hub. Crafted as a high-performance visual dashboard, it serves audio engineers, live performers, and DAW producers (with deep Ableton Live integration).

### Visual & Interactive Aesthetic
- **Visual Identity:** Cyberpunk/Synthwave aesthetics characterized by high-contrast dark-mode backgrounds, deep charcoal cards, neon glow borders (neon cyan, neon green, bright warning yellow, emergency red), and smooth motion transitions.
- **Micro-Animations:** Fluid, responsive state transitions, glowing ripple effects, reactive status indicators, and real-time canvas visualizations.
- **Desktop/Mobile Adaptability:** Highly responsive desktop-first layout, converting into modular tab panels on smaller displays, with complete hardware/software integration configurations.

---

## 2. Directory Tree & Workspace Manifest

To reproduce Sensorium, establish the following project tree structure:

```text
├── .env.example                       # Environment template for keys & urls
├── .gitignore                         # Build, cache, and module exclusions
├── Ableton_Remote_Script.py           # Custom Python remote script for Ableton Live
├── DESIGN_SYSTEM.md                   # Visual, layout, and color specifications
├── HANDOUT.md                         # Project pitch, technical scope, and specs
├── MACOS_IOS_PLUGIN_SPEC.md           # Apple CoreAudio & AUv3 AU plugin integration spec
├── MARKET_ANALYSIS_PATENT_STRATEGY.md # Market position, patent pathways, and USPs
├── PRESSKIT_PROMPTBOOK.md             # Marketing assets and AI-generation media prompts
├── Sensorium_Win11_Doctor.ps1         # Windows OS kernel latency optimizer script
├── Sensorium_ZeroImpact_Setup.bat     # Windows environment initializer & compiler wizard
├── build-windows-exe.bat              # Script to package web/node code into desktop EXE
├── bun.lock                           # Lockfile for rapid workspace instantiation
├── electron-main.js                   # Electron wrapper main process entry point
├── index.html                         # SPA index entry point
├── package.json                       # Scripts, dependencies, and bundler parameters
├── server.ts                          # Full-stack Express backend with Vite middleware
├── tsconfig.json                      # Type system rules (TypeScript 5.8+)
├── vite.config.ts                     # Vite bundler with Tailwind V4 integration
├── live-remote/
│   └── Sensorium.py                   # High-speed local OSC/MIDI bridge script
├── src-tauri/                         # Tauri Desktop Wrapper configurations
│   ├── Cargo.toml                     # Rust dependency manager configuration
│   ├── SETUP.md                       # Building Tauri guides for macOS, Linux, and Windows
│   └── src/
│       └── main.rs                    # Rust backend commands & desktop harness
└── src/
    ├── App.tsx                        # Core Application entry point & State Engine
    ├── index.css                      # Tailwind V4 import & custom CSS-variables
    ├── main.tsx                       # React DOM mounting entry point
    ├── types.ts                       # Unified TypeScript Type Declarations
    └── components/                    # Modular view and controller panels
        ├── ActivityLoggerView.tsx     # Real-time message logs (SYSTEM, OSC, MIDI, etc.)
        ├── CodeViewer.tsx             # Interactive source code / python script inspector
        ├── DAWProductionHub.tsx       # OSC status, BPM tracking, and Ableton Link controls
        ├── DiagnosticCard.tsx         # Responsive list of active hardware failures/recommendations
        ├── EnsembleVisualizer.tsx     # Dynamic audio waveform & mathematical wave canvas
        ├── HardwareBlueprintView.tsx  # Dynamic interactive schematic layout of selected device
        ├── IsometricDevice.tsx        # Responsive CSS 3D translated vector model of hardware
        ├── LatencyChart.tsx           # Vector line graph plotting jitter & physical drift over time
        ├── MidiMappingView.tsx        # High-speed input/output channel mapping matrix
        ├── Mindmap.tsx                # Physics-driven dynamic node graph workflow canvas
        ├── MultiChannelRecorderView.tsx # Multi-track recorder panel with peak meter graphs
        ├── PressKitView.tsx           # Generates press materials, specs, and promo details
        ├── SetupGuide.tsx             # Step-by-step wizard for setting up physical devices
        ├── SimulatorPanel.tsx         # Synthesizer/controller event stream generator
        └── TriggerUsbView.tsx         # USB polling rate, buffer size, & power controllers
```

---

## 3. Package Configuration (`package.json`)

Ensure the workspace dependencies match the specified versions. Tailwind V4 and `@tailwindcss/vite` are utilized for styling compilation.

```json
{
  "name": "sensorium-workspace",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.1.14",
    "@types/d3": "^7.4.3",
    "@vitejs/plugin-react": "^5.0.4",
    "adm-zip": "^0.6.0",
    "d3": "^7.9.0",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@types/adm-zip": "^0.5.8",
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2"
  }
}
```

---

## 4. Backend Architecture (`server.ts`)

The server has two environments: Development (using Vite's live middleware) and Production (serving compiled static assets). It exposes a high-speed compression API that zips and downloads the complete project directory.

### Key Implementation Guidelines
- Bound strictly to host `0.0.0.0` and port `3000`.
- Implements on-the-fly zip archival via `adm-zip` to bundle all scripts, source codes, and presets.
- Excludes heavy runtime caches (`node_modules`, `.cache`, `.git`, `dist`, and output zip files) to keep the project archive highly optimized.

```typescript
import express from "express";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { createServer as createViteServer } from "vite";
import AdmZip from "adm-zip";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === "production";

  // Full Project On-The-Fly Exporter API
  app.get("/api/export-project", (req, res) => {
    try {
      console.log("Starting full workspace project compression...");
      const workspaceRoot = process.cwd();
      const zip = new AdmZip();

      // Recursive function to add all files with absolute path safety
      const addDirectoryToZip = (currentDir: string, zipPathPrefix: string = "") => {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          if (
            item === "node_modules" ||
            item === ".git" ||
            item === ".github" ||
            item === ".cache" ||
            item === "test.zip" ||
            item === "dist"
          ) {
            continue;
          }

          const fullPath = path.join(currentDir, item);
          const relativeZipPath = zipPathPrefix ? `${zipPathPrefix}/${item}` : item;
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            addDirectoryToZip(fullPath, relativeZipPath);
          } else if (stat.isFile()) {
            try {
              const fileContent = fs.readFileSync(fullPath);
              zip.addFile(relativeZipPath, fileContent);
            } catch (err: any) {
              console.warn(`Error reading file ${fullPath}:`, err.message);
            }
          }
        }
      };

      addDirectoryToZip(workspaceRoot);
      const zipBuffer = zip.toBuffer();

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="sensorium-full-project-source.zip"');
      res.setHeader("Content-Length", zipBuffer.length);
      res.send(zipBuffer);
      console.log(`Successfully bundled project! ZIP size: ${(zipBuffer.length / 1024).toFixed(2)} KB`);
    } catch (error: any) {
      console.error("Error creating project zip:", error);
      res.status(500).json({ error: "Failed to export project ZIP: " + error.message });
    }
  });

  // Serve static UI assets and handle hot reload / routing
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SENSORIUM BACKEND] Listening at http://localhost:${PORT}`);
  });
}

startServer();
```

---

## 5. Global Types Definition (`src/types.ts`)

Represents the core domain structure of the Sensorium application, ensuring strict type-safety across components.

```typescript
export type DeviceStatus = 'Healthy' | 'Warn' | 'Error';

export type DeviceType = 'USB Controller' | 'Synthesizer' | 'Drum Machine' | 'Internal MIDI' | 'Virtual Bridge';

export interface MidiDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  portNameIn: string;
  portNameOut: string;
  bufferUsage: number; // 0 - 100%
  clockDrift: number; // in milliseconds
  latency: number; // in milliseconds
  latencyHistory?: number[]; // history of latency values (ms) for real-time charts
  dropCount: number;
  lastMessageTime: number;
  lastMessageValue: string;
  errorMessage?: string;
  recommendation?: string;
  triggerDirection?: 'Rising Edge' | 'Falling Edge' | 'Bidirectional';
  midiChannel?: number;
  ccFilterActive?: boolean;
  velocityCurve?: 'Linear' | 'Exponential' | 'Logarithmic' | 'Fixed';
  pollingRate?: 250 | 500 | 1000;
  debounceMs?: number;
  noiseFloor?: number;
  usbSuspensionDisabled?: boolean;
  bufferSizeSamples?: 32 | 64 | 128 | 256 | 512 | 1024;
  driftCompensationMs?: number;
  autoRecalibrateEnabled?: boolean;
  firmwareVersion?: string;
  latestFirmwareVersion?: string;
  firmwareUpdateAvailable?: boolean;
  firmwareUpdateStatus?: 'idle' | 'downloading' | 'backing_up' | 'updating' | 'success' | 'failed';
  firmwareUpdateProgress?: number;
  backups?: Array<{ id: string; timestamp: string; firmwareVersion: string; note: string }>;
  predictiveRisk?: {
    score: number; // 0-100 risk score
    secondsToError: number; // estimated seconds remaining
    explanation: string; // descriptive warning text
  };
}

export interface DiagnosticCardData {
  id: string;
  deviceId: string;
  deviceName: string;
  symptom: string;
  cause: string;
  action: string;
  severity: 'Warn' | 'Error';
  timestamp: string;
  acknowledged: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  source: 'SYSTEM' | 'ABLETON' | 'OSC' | 'MIDI';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface AbletonState {
  bpm: number;
  isPlaying: boolean;
  beat: number;
  bar: number;
  activeClip: string;
  trackArmed: string;
  deviceName: string;
  remoteScriptStatus: 'CONNECTED' | 'DISCONNECTED' | 'INSTALL_PENDING';
}
```

---

## 6. Core Application Shell (`src/App.tsx`)

`App.tsx` contains the centralized application state engine. It manages device synchronization, Ableton simulation parameters, system log triggers, active overlays, diagnostics, panel layouts, and zip/source exports.

### Major Core Functions of App State
1. **Initial Device State Generator:** Generates custom-configured physical devices:
   - *Sensorium Trigger-USB Core:* Low-latency controller.
   - *OmniWave Synth-7:* Dynamic Synthesizer module.
   - *RhythmFlux Drum-8:* Native Drum machine.
   - *Ableton Link Bridge:* Virtual MIDI/OSC sync.
2. **Global Real-Time Tick Loop (`useEffect`):**
   - Updates jitter, physical drift, buffer usage, and signal states on an interval.
   - Simulates active MIDI note stream flow and logs alerts when drift or latency spike.
   - Triggers predictive risks when clock deviations surpass 12ms.
3. **Smart Latency and Buffer Optimizers:**
   - Computes recommendations using a virtual ASIO calculus.
   - Dynamic buffer size switching from 32 to 1024 samples depending on the measured load.
4. **Panic Engine:**
   - Sends "All-Notes-Off" (MIDI CC 123) and "All-Sound-Off" (MIDI CC 120) controllers to clear stuck notes.
5. **Panel Visibility Toggle Configuration:**
   - Controls active dashboards including the physics Mindmap, hardware blueprinters, OSC synchronizers, and firmware centers.

---

## 7. Modular Components Specifications (`src/components/`)

### A. Physics-Driven Dynamic Node Graph (`Mindmap.tsx`)
- **Visual Presentation:** Implements dynamic spring-gravity simulation models built on D3/physics rules inside SVG canvasses. 
- **Features:** 
  - Simulates connections between physical controllers, Ableton tracks, and OSC outputs.
  - Multi-Workflow modes: *Brainstorming*, *Arrangement*, *Live Mode*, *Hybrid Grid*.
  - Reactive canvas rings: Click triggers ripple waves that propagate across interconnected nodes.
  - **One-Click Emergency Safe Mode:** Automatically triggers critical fail-safe rules, bypasses unstable bridges, increases buffer sizes to 512, locking system stability.

### B. USB Register Configuration Controller (`TriggerUsbView.tsx`)
- Provides precise physical property modification sliders:
  - *Debounce Filter Window:* 1ms to 16ms slider settings.
  - *Midi Velocity Curve Type Selection:* Linear, Exponential, Logarithmic, Fixed.
  - *USB Polling Rates:* Host-optimized toggles for 250Hz, 500Hz, and 1000Hz.
  - *Selective Suspend:* Disables Windows USB power suspension to guarantee device response times.

### C. DAW Production & OSC Controller (`DAWProductionHub.tsx`)
- Coordinates the Ableton OSC script bridge interface:
  - Visual status indicator of OSC Remote Python Script.
  - Dynamic display tracking BPM (90-180), Beats, Bars, and Armed tracks.
  - Built-in live script downloader for Ableton standard scripts.

### D. Mathematical Audio Waveform Canvas (`EnsembleVisualizer.tsx`)
- Real-time mathematical simulation of active audio wave signals:
  - Supports multiple wave shapes: Sine, Square, Sawtooth, and Noise.
  - Configurable amplitude, frequency, and wave phase modulators.
  - Interactive canvas visualizer dynamically synchronized with device simulator parameters.

### E. 3D CSS-Transformed Isometric Hardware Blueprint (`IsometricDevice.tsx` / `HardwareBlueprintView.tsx`)
- Interactive vector interface representing the physical hardware board:
  - Rendered using CSS 3D perspectives (`rotateX`, `rotateY`, `perspective`).
  - Highlights input ports, active digital-to-analog converters (DAC), and clock micro-chips.
  - Highlights specific physical components dynamically when the user selects corresponding modules in the diagnostics panels.

---

## 8. External Integrations & Native Wrapper Harnesses

### A. Python Ableton OSC Script (`live-remote/Sensorium.py`)
Provides real-time local socket handling to bridge standard OSC/UDP data packs into MIDI signals.

```python
import sys
import socket
import time
from pythonosc import osc_message_builder
from pythonosc import udp_client

# Sensorium UDP Client/Server Bridge Configuration
OSC_IP = "127.0.0.1"
OSC_PORT = 9001

def send_osc_ping(bpm, playing):
    try:
        client = udp_client.SimpleUDPClient(OSC_IP, OSC_PORT)
        client.send_message("/sensorium/state", [bpm, int(playing)])
        print(f"[SENSORIUM] OSC status update dispatched: BPM={bpm}, Playing={playing}")
    except Exception as e:
        print(f"[SENSORIUM ERROR] OSC Dispatch failed: {e}")

if __name__ == "__main__":
    send_osc_ping(120.0, True)
```

### B. Electron Main Window Harness (`electron-main.js`)
Configures a borderless window with GPU hardware acceleration to act as a desktop client wrapper.

```javascript
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "Sensorium Control Workspace",
    backgroundColor: "#07080d",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: true,
    autoHideMenuBar: true
  });

  // Load backend server or local distribution files
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### C. Tauri Desktop Native Builder (`src-tauri/Cargo.toml`)
High-performance Rust compiler config for building lightweight native packages (under 10MB) across Windows, macOS, and Linux.

```toml
[package]
name = "sensorium"
version = "1.0.0"
description = "High-performance latency diagnostic app"
authors = ["Sensorium Core Team"]
license = "Apache-2.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "1.5" }

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tauri = { version = "1.5", features = ["api-all"] }

[features]
default = [ "custom-protocol" ]
custom-protocol = [ "tauri/custom-protocol" ]
```

---

## 9. Windows Deployment & Optimization Scripts

### Windows kernel latency doctor (`Sensorium_Win11_Doctor.ps1`)
Adjusts registry values, unlocks high-performance CPU scheduling, disables USB sleep management, and optimizes local MMCSS parameters for zero audio dropouts.

```powershell
# SENSORIUM NATIVE WINDOWS 11 AUDIO LATENCY OPTIMIZER
# Requires Administrator Permissions to Apply Kernel Settings

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   SENSORIUM NATIVE WINDOWS 11 AUDIO DOCTOR  " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Unlocking High Performance Power Plan
Write-Host "[1/4] Unlocking Windows High Performance Power Scheme..." -ForegroundColor Yellow
powercfg -duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

# 2. Adjust System MMCSS Profile (Multimedia Class Scheduler Service)
Write-Host "[2/4] Optimizing MMCSS kernel registry configuration..." -ForegroundColor Yellow
$RegistryPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
Set-ItemProperty -Path $RegistryPath -Name "SystemResponsiveness" -Value 0
Set-ItemProperty -Path "$RegistryPath\Tasks\Audio" -Name "GPU Priority" -Value 8
Set-ItemProperty -Path "$RegistryPath\Tasks\Audio" -Name "Priority" -Value 6
Set-ItemProperty -Path "$RegistryPath\Tasks\Audio" -Name "Scheduling Category" -Value "High"

# 3. Disable USB Selective Suspend
Write-Host "[3/4] Overriding USB Selective Suspend settings..." -ForegroundColor Yellow
$usbPath = "HKLM:\SYSTEM\CurrentControlSet\Services\USB"
if (-not (Test-Path $usbPath)) { New-Item -Path $usbPath -Force }
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\2a737441-1930-4402-8d77-b2bebba7d678\4f971e89-eebd-4455-a8de-9e59040e7347" -Name "Attributes" -Value 2

# 4. Success Log
Write-Host "[SUCCESS] Windows Kernel optimized. Please restart computer for changes to take effect." -ForegroundColor Green
```

---

## 10. Reconstruction Sequence for AI Systems

To recreate and instantiate this exact workspace, execute these step-by-step commands:

1. **Workspace Initialization:**
   ```bash
   # Initialize folder structure and install required workspace nodes
   npm install
   ```

2. **Asset Compiling Phase:**
   ```bash
   # Run Vite build to generate client static assets inside /dist
   npm run build
   ```

3. **Backend Execution:**
   ```bash
   # Launch Express custom server with hot reload and client bridge
   npm run dev
   ```

4. **Desktop Wrapper Native Packaging:**
   - To build an Electron standalone app, configure `electron-main.js` and package using Electron Builder.
   - To compile Tauri into native Windows `.exe` or macOS `.app`, run `cargo build --release` inside the `src-tauri` directory.
