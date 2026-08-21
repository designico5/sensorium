# REASONIX DESKTOP (WINDOWS) — MASTER PROMPT & REPRODUCTION SCRIPT

Diese Datei liefert eine **vollständige, fehlerfreie Arbeitsanleitung (Master Blueprint)** für KI-Systeme (wie Reasonix Desktop, Claude, Gemini oder Cursor), um das **Sensorium Audio-Diagnose & Full-Control Center** eigenständig, fehlerfrei und ohne Platzhalter/Mocks neu aufzubauen.

---

## SCHNELLSTART: Reasonix Desktop unter Windows einrichten (In 3 einfachen Schritten)

### Schritt 1: Voraussetzungen auf Windows installieren
Stelle sicher, dass folgende Standard-Tools auf Deinem Windows 11 / 10 PC installiert sind:
1. **Node.js (v20 oder höher)** — [nodejs.org](https://nodejs.org) (wähle LTS).
2. **Git for Windows** — [git-scm.com](https://git-scm.com).
3. **VS Code** (empfohlen) oder Dein bevorzugter Editor.

### Schritt 2: Reasonix Ordner-Zugriff & API-Key konfigurieren
1. Öffne **Reasonix Desktop**.
2. Gehe in die **Einstellungen (Settings ⚙️)**:
   - **Workspace Directory / Zielordner**: Wähle einen leeren Ordner aus, z. B. `C:\Projects\Sensorium`.
   - **API Key**: Trage Deinen API-Schlüssel ein (z.B. Gemini API Key oder Anthropic Key).
   - **Model**: Wähle ein leistungsfähiges Modell (`gemini-2.5-pro`, `gemini-1.5-pro` oder `claude-3-5-sonnet`).

### Schritt 3: Execution Permissions (Ausführungsrechte) setzen
1. Stelle den Modus in Reasonix auf **"Auto-Approve / Agentic Coding Mode"** (damit Dateierstellungen, Builds und Terminalbefehle flüssig durchlaufen).
2. Kopiere den untenstehenden **MASTER PROMPT** in Reasonix und drücke **Enter**.

---

## MASTER PROMPT FOR REASONIX (1:1 kopieren und an die KI übergeben)

```markdown
Du bist ein führender Senior Audio Systems & Fullstack Engineer. Deine Aufgabe ist es, das "Sensorium Audio Hardware Diagnostic & Full-Control Center" als vollständige, vollfunktionsfähige, fehlerfreie und produktionsreife Web- & Desktop-Anwendung neu zu bauen.

### ARCHITEKTUR & STACK
- Framework: React 19 + TypeScript 5.8+ mit Vite 6
- Backend: Custom Express.js (Express v4) Server (`server.ts`) auf Port 3000 (bind an 0.0.0.0)
- Styles: Tailwind CSS v4 (@tailwindcss/vite) mit Neon-Cyberpunk Theme (#07080d Hintergrund, Neon-Cyan, Neon-Green, Alert-Yellow, Emergency-Red)
- Animationen & Visualisierungen: D3.js für Physics-Graphen, HTML5 Dynamic Canvas für Audio-Wellenformen, Lucide-React für Vector-Icons, CSS 3D Transforms für Isometrische Board-Layouts
- Export-Engine: adm-zip auf dem Express Backend für 1-Klick Projekt-Source (.zip) Downloads

### PFLICHT-MODULE & SEKTIONEN DER ANWENDUNG
Erstelle eine modulare, modular aufgeteilte Ordnerstruktur (`/src/components/*`, `/src/types.ts`, `server.ts` etc.) mit folgenden voll ausgebauten Komponenten (KEINE MOCK STUBS ODER UNVOLLSTÄNDIGER CODE):

1. **Mindmap Canvas (`src/components/Mindmap.tsx`)**:
   - D3 Physics-gestützte Spring-Force Gravity Visualisierung für Hardware-Knotenpunkte, Ableton Tracks & OSC Endpunkte.
   - 4 Workflows: Brainstorming, Arrangement, Live-Performance, Hybrid.
   - Ripple-Effekte bei Klick und Signalübertragung.
   - Emergency Safe Mode Overrides (setzt Buffer hoch, stabilisiert Jitter auf Knopfdruck).

2. **USB Register & Latency Control (`src/components/TriggerUsbView.tsx`)**:
   - Live-Anpassung von Debounce-Fenster (1–16ms), Polling Rates (250Hz, 500Hz, 1000Hz), Velocity Curves (Linear, Exp, Log, Fixed).
   - Deaktivierung der Windows USB Selektiv-Suspendierung gegen Dropout-Spikes.

3. **DAW Production & OSC Bridge (`src/components/DAWProductionHub.tsx`)**:
   - Live OSC Status Monitor (BPM, Beat, Bar, Track Arm Status).
   - Ableton Remote Script Generator & Downloader (`live-remote/Sensorium.py` & `Ableton_Remote_Script.py`).

4. **Isometrischer 3D Hardware Blueprint (`src/components/IsometricDevice.tsx` & `HardwareBlueprintView.tsx`)**:
   - CSS 3D transformiertes Board mit beschrifteten ICs, USB-Controllern, DACs und Taktgebern.
   - Interaktive Hervorhebung von Hardware-Komponenten bei Diagnose-Warnungen.

5. **Diagnostic Cards & Risk Analytics (`src/components/DiagnosticCard.tsx` & `LatencyChart.tsx`)**:
   - Vorausschauende Predictive-Risk-Analyse (Berechnung von Jitter und Drift in Millisekunden).
   - Real-Time Sparkline Jitter Diagramme.

6. **System Diagnostics & Doctor Skripte**:
   - Inklusive Windows PowerShell Optimizer (`Sensorium_Win11_Doctor.ps1`) für MMCSS Registry Tweak & High Performance Power Plan.
   - Full ZIP Exporter Endpoint in `server.ts` via `adm-zip`.

### QUALITÄTSKRITERIEN
- Kein Auslassen von Code; alle Imports und Typen in `src/types.ts` definieren.
- Führe nach Erstellung `npm run lint` und `npm run build` aus, um absolute Fehlerfreiheit zu garantieren.
```

---

## DATEI- UND ORDNERÜBERSICHT DES ENDPRODUKTS

Nach Ausführung generiert die KI folgende fertige Dateistruktur:

```text
├── package.json                       # Scripts: dev ("tsx server.ts"), build ("vite build && esbuild ...")
├── server.ts                          # Express Server mit adm-zip ZIP-Export Endpoint
├── vite.config.ts                     # Vite Configuration mit Tailwind V4 Plugin
├── tsconfig.json                      # TypeScript 5.8 Configuration
├── Sensorium_Win11_Doctor.ps1         # Windows Kernel Optimizer Script
├── Ableton_Remote_Script.py           # Ableton Python Remote Script
├── live-remote/Sensorium.py           # Live OSC Bridge
└── src/
    ├── main.tsx                       # React Mounting Entry Point
    ├── App.tsx                        # Haupt-State Engine, Navigation, Panic Engine
    ├── index.css                      # Tailwind V4 import & Cyberpunk Themes
    ├── types.ts                       # Zentrale TypeScript Schnittstellen
    └── components/
        ├── Mindmap.tsx                # Dynamic Node Physics Canvas
        ├── TriggerUsbView.tsx         # USB Polling & Velocity Manager
        ├── DAWProductionHub.tsx       # Ableton OSC Sync & BPM Counter
        ├── IsometricDevice.tsx        # CSS 3D Hardware Visualizer
        ├── HardwareBlueprintView.tsx  # Dynamic Component Board
        ├── DiagnosticCard.tsx         # Realtime Diagnostics & Symptom Logs
        ├── LatencyChart.tsx           # Jitter Jitter-Chart & Clock Drift
        ├── MultiChannelRecorderView.tsx # Peak-Meter Audio Recorder
        ├── PressKitView.tsx           # PR & Spec Sheet Generator
        ├── CodeViewer.tsx             # In-App Python/PowerShell Inspector
        └── ActivityLoggerView.tsx     # Realtime System & MIDI Logs
```

---

## FEHLERFREIE PRÜFUNG & DURCHFÜHRUNG

Sobald Reasonix den Code generiert hat, führt das System automatisch folgende Befehle aus:

1. **Pakete installieren**:
   ```bash
   npm install
   ```
2. **Code auf TypeScript-Fehler prüfen**:
   ```bash
   npm run lint
   ```
3. **Anwendung kompilieren**:
   ```bash
   npm run build
   ```
4. **Anwendung starten**:
   ```bash
   npm run dev
   ```

Das System läuft anschließend unter `http://localhost:3000` als vollumfängliches, getestetes **Sensorium Full-Control Center**.
