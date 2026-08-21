# 📋 Sensorium OS v2.0 - Systemanforderungen & Requirements

Willkommen zur vollständigen Übersicht aller Systemvoraussetzungen und Abhängigkeiten für **Sensorium OS (Windows Standalone & Web)**.

---

## 🛠️ 1. Software & Laufzeitumgebungen (Runtimes)

| Komponente | Erforderliche Version | Verwendungszweck | Automatische Installation |
| :--- | :--- | :--- | :--- |
| **Windows 10/11 64-Bit** | Build 19041+ | Betriebssystem | - |
| **Node.js** | `v18.16.0` oder höher (LTS) | Lokaler Webserver (`server.ts`) & UI Engine | Ja (`winget` in `.bat`) |
| **Python** | `3.9.x` - `3.11.x` | Ableton Remote Script Kompilierung & OSC | Ja (`winget` in `.bat`) |
| **Ableton Live** | Live 10, 11 oder 12 | DAW MIDI & Master Clock Sync | Manuell installiert |
| **MS Edge / Chrome** | Aktuell | Rahmenloses Standalone App-Fenster (`--app`) | Auf Win 11 vorinstalliert |

---

## 📦 2. Python Pakete (Für OSC & MIDI Integration)

Diese Pakete werden für erweiterte MIDI- und OSC-Skripte genutzt:

```text
python-osc>=1.8.3
mido>=1.3.0
python-rtmidi>=1.5.8
```

---

## 🌐 3. Netzwerkschnittstellen & Firewall-Ports

Für den reibungslosen Austausch zwischen Sensorium OS, Ableton Live und externen Hardware-Synthesizern müssen folgende Ports geöffnet sein (wird automatisch von `START_STANDALONE.bat` erledigt):

* **Port 3000 (TCP)**: Web-Anwendung & Express API Server (`http://localhost:3000`)
* **Port 8000 (UDP)**: Sensorium OSC High-Speed Telemetrie-Protokoll
* **Port 9000 (UDP)**: MIDI Timecode (MTC) & Master Clock Synchronisation

---

## 🛡️ 4. Windows Defender & Ausnahmeregeln

Damit Antiviren-Scanner die Python-Bytecode-Dateien (`.pyc`) im Ableton User Library Ordner nicht blockieren:

* **Ordner-Ausnahme**: Der Projektordner (z.B. `C:\Sensorium`) wird als Ausschluss hinzugefügt.
* **Befehl (wird automatisch ausgeführt)**:
  ```powershell
  Add-MpPreference -ExclusionPath "C:\Pfad\Zu\Sensorium"
  ```

---

## 🚀 5. Quick-Start für neue Systeme / Freund-PC

1. **ZIP entpacken**: Gesamten Ordner entpacken.
2. **`START_STANDALONE.bat` per Doppelklick starten**:
   * Richtet automatisch Defender-Ausnahmen ein.
   * Schaltet die Ports 3000, 8000 und 9000 frei.
   * Öffnet Sensorium OS direkt in einem eigenständigen App-Fenster.
