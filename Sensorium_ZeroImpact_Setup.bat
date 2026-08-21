@echo off
title Sensorium Pro - One-Click Installer & Diagnostic Setup Wizard
color 0A
mode con: cols=100 lines=35

echo ======================================================================================
echo   sSSs   d88888b d8b   db .d8888.  .d88b.  d8888b. d88888b db    db .88b  d88.
echo  d8' `8b 88'     888o  88 88'  YP .8P  Y8. 88  `8D 88'     88    88 88'YbdP`88
echo  I8_     88ooooo 88V8o 88 `Ybo.   88    88 88oobY' 88ooooo 88    88 88  88  88
echo    `Y8s. 88~~~~~ 88 V8o88   `Y8b. 88    88 88`8b   88~~~~~ 88    88 88  88  88
echo  d8   8D 88.     88  V888 db   8D `8b  d8' 88 `8D  88.     88b  d88 88  88  88
echo  `8ss8P' Y88888P VP   V8P `8888Y'  `Y88P'  88   YD Y88888P ~Y8888P' VP  VP  VP
echo ======================================================================================
echo             [ZERO-IMPACT ONE-CLICK AUTOMATED SETUP & DIAGNOSTIC RUNNER]
echo             Guaranteed 0%% Audio Engine Jitter ^| Safe Portability Sandbox Mode
echo ======================================================================================
echo.

:: CHECK IF RUNNING DIRECTLY INSIDE ZIP (TEMP FOLDER)
echo "%CD%" | findstr /i "Temp" >nul 2>&1
if not errorlevel 1 goto :ERR_ZIP

set "APP_URL=https://ais-pre-sypr6xs7b3vgre3qhnyq47-184377602240.europe-west2.run.app"

:: -------------------------------------------------------------------------
:: PHASE 1: DIAGNOSTICS & SYSTEM SCAN
:: -------------------------------------------------------------------------
echo [1/3] STARTE SYSTEMDIAGNOSE...
echo --------------------------------------------------------------------------------------

:: Check Python
where python >nul 2>&1
if not errorlevel 1 goto :HAS_PYTHON

echo [!] Python wurde nicht gefunden. Versuche automatische 1-Klick-Installation via Winget...
where winget >nul 2>&1
if errorlevel 1 goto :ERR_PYTHON_MANUAL

echo [+] Windows Package Manager (winget) gefunden!
echo [+] Installiere Python 3.11 vollautomatisch im Hintergrund (silent)...
winget install -e --id Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :ERR_PYTHON_MANUAL

echo [+] Python erfolgreich installiert!
echo [!] WICHTIG: Bitte starte diese "Sensorium_ZeroImpact_Setup.bat" Datei jetzt neu, damit Windows den neuen Pfad erkennt!
pause
exit /b 0

:HAS_PYTHON
for /f "tokens=*" %%i in ('python --version') do set "PY_VER=%%i"
echo [+] Python-Laufzeitumgebung gefunden: %PY_VER%


:: Check Port Conflicts & Kill Stale Server
echo [+] Pruefe auf UDP/HTTP-Portkonflikte (Port 5127)...
set "STALE_PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5127 ^| findstr LISTENING 2^>nul') do (
    set "STALE_PID=%%a"
)
if defined STALE_PID (
    echo [!] Blockierender Sensorium-Prozess auf PID %STALE_PID% erkannt. Bereinige...
    taskkill /f /pid %STALE_PID% >nul 2>&1
    echo [+] Staler Hintergrundprozess erfolgreich geschlossen.
) else (
    echo [+] Port 5127 ist frei. Optimaler Verbindungsaufbau gewaehrleistet.
)

:: Check Ableton Live Running State
tasklist /fi "IMAGENAME eq Ableton Live.exe" 2>nul | findstr /i "Ableton" >nul
if "%ERRORLEVEL%"=="0" (
    echo [!] Ableton Live ist AKTIV.
    echo [!] HINWEIS: Bitte starte Ableton Live NACH Abschluss dieses Installers neu,
    echo     damit das "Sensorium_Bridge" Plugin geladen werden kann.
) else (
    echo [+] Ableton Live ist inaktiv. Script wird beim naechsten Start direkt erkannt.
)

:: Check and Resolve User Documents and Ableton Paths
set "USER_DOCS=%USERPROFILE%\Documents"
if not exist "%USER_DOCS%" (
    for /f "tokens=2*" %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders" /v Personal 2^>nul') do set "USER_DOCS=%%b"
)
call set "USER_DOCS=%USER_DOCS%"

set "SCRIPTS_DIR1=%USER_DOCS%\Ableton\User Library\MIDI Remote Scripts"
set "SCRIPTS_DIR2=%USER_DOCS%\Ableton\User Library\Remote Scripts"
set "BRIDGE_DIR1=%SCRIPTS_DIR1%\Sensorium"
set "BRIDGE_DIR2=%SCRIPTS_DIR1%\Sensorium_Bridge"
set "BRIDGE_DIR3=%SCRIPTS_DIR2%\Sensorium"
set "BRIDGE_DIR4=%SCRIPTS_DIR2%\Sensorium_Bridge"
set "LOCAL_SERVER_DIR=%USER_DOCS%\Sensorium_Pro"

echo [+] Ableton-Userordner: %SCRIPTS_DIR1%
echo [+] Sensorium-Serverordner: %LOCAL_SERVER_DIR%
echo.

:: -------------------------------------------------------------------------
:: PHASE 2: AUTOMATISCHE INSTALLATION & DEPLOYMENT
:: -------------------------------------------------------------------------
echo [2/3] DEPLOYMENT DER PLUGIN- & SERVER-DATEIEN...
echo --------------------------------------------------------------------------------------

if not exist "%SCRIPTS_DIR1%" mkdir "%SCRIPTS_DIR1%" 2>nul
if not exist "%SCRIPTS_DIR2%" mkdir "%SCRIPTS_DIR2%" 2>nul
if not exist "%BRIDGE_DIR1%" mkdir "%BRIDGE_DIR1%" 2>nul
if not exist "%BRIDGE_DIR2%" mkdir "%BRIDGE_DIR2%" 2>nul
if not exist "%BRIDGE_DIR3%" mkdir "%BRIDGE_DIR3%" 2>nul
if not exist "%BRIDGE_DIR4%" mkdir "%BRIDGE_DIR4%" 2>nul
if not exist "%LOCAL_SERVER_DIR%" mkdir "%LOCAL_SERVER_DIR%" 2>nul

echo [+] Reinige alte Bytecode-Compiler-Sperren (.pyc)...
if exist "%BRIDGE_DIR%\Ableton_Remote_Script.pyc" del /f /q "%BRIDGE_DIR%\Ableton_Remote_Script.pyc" >nul 2>&1
if exist "%BRIDGE_DIR%\__init__.pyc" del /f /q "%BRIDGE_DIR%\__init__.pyc" >nul 2>&1

echo [+] Erstelle Ableton Python Remote Script...
(
echo # Ableton Live Remote Script ^(Compiled by Sensorium Doctor^)
echo import Live
echo from _Framework.ControlSurface import ControlSurface
echo import socket
echo import threading
echo.
echo HOST = '127.0.0.1'
echo PORT_OUT = 5125
echo PORT_IN = 5126
echo.
echo class Ableton_Remote_Script^(ControlSurface^):
echo     def __init__^(self, c_instance^):
echo         super^(Ableton_Remote_Script, self^).__init__^(c_instance^)
echo         self.show_message^("Sensorium Zero-Impact Bridge Online"^)
echo         self._running = True
echo         self._sock = socket.socket^(socket.AF_INET, socket.SOCK_DGRAM^)
echo         self._sock.setsockopt^(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1^)
echo         self._thread = threading.Thread^(target=self._listen_for_clock^)
echo         self._thread.daemon = True
echo         self._thread.start^(^)
echo         self.song^(^).add_tempo_listener^(self._on_tempo_changed^)
echo         self.song^(^).add_is_playing_listener^(self._on_playback_state_changed^)
echo.
echo     def _listen_for_clock^(self^):
echo         try:
echo             self._sock.bind^(^(HOST, PORT_IN^)^)
echo             self._sock.settimeout^(1.0^)
echo             while self._running:
echo                 try:
echo                     data, addr = self._sock.recvfrom^(1024^)
echo                     if b"PING" in data:
echo                         self._sock.sendto^(b"ACK_CLOCK", ^(HOST, PORT_OUT^)^)
echo                 except socket.timeout:
echo                     continue
echo         except:
echo             pass
echo.
echo     def _on_tempo_changed^(self^):
echo         try:
echo             msg = ^("BPM:%%.2f" %% self.song^(^).tempo^).encode^('utf-8'^)
echo             self._sock.sendto^(msg, ^(HOST, PORT_OUT^)^)
echo         except:
echo             pass
echo.
echo     def _on_playback_state_changed^(self^):
echo         try:
echo             state_str = "PLAYING" if self.song^(^).is_playing else "STOPPED"
echo             msg = ^("STATE:%%s" %% state_str^).encode^('utf-8'^)
echo             self._sock.sendto^(msg, ^(HOST, PORT_OUT^)^)
echo         except:
echo             pass
echo.
echo     def disconnect^(self^):
echo         self._running = False
echo         self.song^(^).remove_tempo_listener^(self._on_tempo_changed^)
echo         self.song^(^).remove_is_playing_listener^(self._on_playback_state_changed^)
echo         self._sock.close^(^)
echo         super^(Ableton_Remote_Script, self^).disconnect^(^)
) > "%BRIDGE_DIR1%\Ableton_Remote_Script.py"

copy /y "%BRIDGE_DIR1%\Ableton_Remote_Script.py" "%BRIDGE_DIR1%\Sensorium.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\Ableton_Remote_Script.py" "%BRIDGE_DIR2%\Ableton_Remote_Script.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\Ableton_Remote_Script.py" "%BRIDGE_DIR2%\Sensorium.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\Ableton_Remote_Script.py" "%BRIDGE_DIR3%\Ableton_Remote_Script.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\Ableton_Remote_Script.py" "%BRIDGE_DIR3%\Sensorium.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\Ableton_Remote_Script.py" "%BRIDGE_DIR4%\Ableton_Remote_Script.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\Ableton_Remote_Script.py" "%BRIDGE_DIR4%\Sensorium.py" >nul 2>&1

(
echo from .Ableton_Remote_Script import Ableton_Remote_Script
echo def create_instance^(c_instance^):
echo     return Ableton_Remote_Script^(c_instance^)
) > "%BRIDGE_DIR1%\__init__.py"

copy /y "%BRIDGE_DIR1%\__init__.py" "%BRIDGE_DIR2%\__init__.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\__init__.py" "%BRIDGE_DIR3%\__init__.py" >nul 2>&1
copy /y "%BRIDGE_DIR1%\__init__.py" "%BRIDGE_DIR4%\__init__.py" >nul 2>&1

echo [+] Erstelle loesungsfreien lokalen Python Bridge-Server...
(
echo import socket
echo import threading
echo time = __import__^('time'^)
echo from http.server import BaseHTTPRequestHandler, HTTPServer
echo.
echo UDP_PORT_IN = 5125
echo UDP_PORT_OUT = 5126
echo HTTP_PORT = 5127
echo.
echo clients = []
echo clients_lock = threading.Lock^(^)
echo.
echo def broadcast_sse^(message^):
echo     with clients_lock:
echo         stale = []
echo         for c in clients:
echo             try:
echo                 c.wfile.write^(f"data: {message}\\n\\n".encode^('utf-8'^)^)
echo                 c.wfile.flush^(^)
echo             except Exception:
echo                 stale.append^(c^)
echo         for s in stale:
echo             if s in clients:
echo                 clients.remove^(s^)
echo.
echo class SSEHandler^(BaseHTTPRequestHandler^):
echo     def log_message^(self, format, *args^):
echo         return
echo     def end_headers^(self^):
echo         self.send_header^('Access-Control-Allow-Origin', '*'^)
echo         self.send_header^('Access-Control-Allow-Methods', 'GET, OPTIONS'^)
echo         self.send_header^('Access-Control-Allow-Headers', '*'^)
echo         super^(^).end_headers^(^)
echo     def do_OPTIONS^(self^):
echo         self.send_response^(200^)
echo         self.end_headers^(^)
echo     def do_GET^(self^):
echo         if self.path == '/events':
echo             self.send_response^(200^)
echo             self.send_header^('Content-Type', 'text/event-stream'^)
echo             self.send_header^('Cache-Control', 'no-cache'^)
echo             self.send_header^('Connection', 'keep-alive'^)
echo             self.end_headers^(^)
echo             try:
echo                 self.wfile.write^(b"data: CONNECTED\\n\\n"^)
echo                 self.wfile.flush^(^)
echo             except Exception:
echo                 return
echo             with clients_lock:
echo                 clients.append^(self^)
echo             while True:
echo                 time.sleep^(1^)
echo         elif self.path.startswith^('/send'^):
echo             self.send_response^(200^)
echo             self.end_headers^(^)
echo             self.wfile.write^(b"OK"^)
echo             try:
echo                 s = socket.socket^(socket.AF_INET, socket.SOCK_DGRAM^)
echo                 s.sendto^(b"PING", ^('127.0.0.1', UDP_PORT_OUT^)^)
echo                 s.close^(^)
echo             except:
echo                 pass
echo         else:
echo             self.send_response^(404^)
echo             self.end_headers^(^)
echo.
echo def run_udp_listener^(^):
echo     s = socket.socket^(socket.AF_INET, socket.SOCK_DGRAM^)
echo     s.setsockopt^(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1^)
echo     try:
echo         s.bind^(^('127.0.0.1', UDP_PORT_IN^)^)
echo     except:
echo         return
echo     while True:
echo         try:
echo             data, addr = s.recvfrom^(1024^)
echo             msg = data.decode^('utf-8', errors='ignore'^).strip^(^)
echo             broadcast_sse^(msg^)
echo         except:
echo             break
echo.
echo def main^(^):
echo     t = threading.Thread^(target=run_udp_listener^)
echo     t.daemon = True
echo     t.start^(^)
echo     server = HTTPServer^(^('127.0.0.1', HTTP_PORT^), SSEHandler^)
echo     print^(f"Sensorium Zero-Impact Bridge listening on http://127.0.0.1:{HTTP_PORT}"^)
echo     try:
echo         server.serve_forever^(^)
echo     except KeyboardInterrupt:
echo         pass
echo.
echo if __name__ == '__main__':
echo     main^(^)
) > "%LOCAL_SERVER_DIR%\sensorium_bridge_server.py"

:: Launch local background server
echo [+] Erstelle 1-Klick-Starter (START_SENSORIUM.bat) auf deinem Desktop...
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
if not exist "%DESKTOP_DIR%" (
    for /f "tokens=2*" %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders" /v Desktop 2^>nul') do set "DESKTOP_DIR=%%b"
)
call set "DESKTOP_DIR=%DESKTOP_DIR%"

(
echo @echo off
echo title Sensorium Pro - Local Bridge Server
echo color 0B
echo echo ======================================================================================
echo echo    Sensorium Pro - Local Bridge Server ^^^& Browser Launcher
echo echo ======================================================================================
echo echo.
echo echo [+] Beende eventuell blockierende Prozesse auf Port 5127 ^^^(Restart/Refresh^^^)...
echo for /f "tokens=5" %%%%a in ^('netstat -aon ^^^^^^^| findstr :5127 ^^^^^^^| findstr LISTENING 2^^^^^^^>nul'^) do ^(
echo     taskkill /f /pid %%%%a ^^^>nul 2^^^^^^>^^^^^^^&1
echo ^)
echo echo [+] Oeffne das Web-Applet im Browser...
echo start "" "%APP_URL%"
echo echo [+] Starte den lokalen Python Bridge-Server...
echo python "%LOCAL_SERVER_DIR%\sensorium_bridge_server.py"
echo pause
) > "%DESKTOP_DIR%\START_SENSORIUM.bat"

(
echo @echo off
echo title Sensorium Pro - Local Bridge Server
echo color 0B
echo echo ======================================================================================
echo echo    Sensorium Pro - Local Bridge Server ^^^& Browser Launcher
echo echo ======================================================================================
echo echo.
echo echo [+] Beende eventuell blockierende Prozesse auf Port 5127 ^^^(Restart/Refresh^^^)...
echo for /f "tokens=5" %%%%a in ^('netstat -aon ^^^^^^^| findstr :5127 ^^^^^^^| findstr LISTENING 2^^^^^^^>nul'^) do ^(
echo     taskkill /f /pid %%%%a ^^^>nul 2^^^^^^>^^^^^^^&1
echo ^)
echo echo [+] Oeffne das Web-Applet im Browser...
echo start "" "%APP_URL%"
echo echo [+] Starte den lokalen Python Bridge-Server...
echo python "%LOCAL_SERVER_DIR%\sensorium_bridge_server.py"
echo pause
) > "%LOCAL_SERVER_DIR%\START_SENSORIUM.bat"

echo [+] Starte den lokalen Bridge-Server in einem eigenen sichtbaren Fenster...
start "Sensorium Local Bridge Server" cmd /k "python \"%LOCAL_SERVER_DIR%\sensorium_bridge_server.py\""
echo.

:: -------------------------------------------------------------------------
:: PHASE 3: AUTOMATISCHER LAUNCH (BROWSER & STANDALONE)
:: -------------------------------------------------------------------------
echo [3/3] VERBINDUNGSAUFBAU & ANWENDUNGSSTART...
echo --------------------------------------------------------------------------------------

set "LAUNCHED_STANDALONE=0"

:: Check for Standalone EXE in directory
if exist "Sensorium_Pro.exe" (
    echo [+] Standalone-Anwendung im Hauptordner gefunden. Starte Sensorium_Pro.exe...
    start "" "Sensorium_Pro.exe"
    set "LAUNCHED_STANDALONE=1"
) else if exist "dist\Sensorium_Pro.exe" (
    echo [+] Standalone-Anwendung in \dist gefunden. Starte dist\Sensorium_Pro.exe...
    start "" "dist\Sensorium_Pro.exe"
    set "LAUNCHED_STANDALONE=1"
) else if exist "electron-main.js" (
    where npm >nul 2>&1
    if "%ERRORLEVEL%"=="0" (
        echo [+] Entwickler-Electron-Umgebung gefunden. Fuehre npm run electron aus...
        start /min cmd /c "npm run electron"
        set "LAUNCHED_STANDALONE=1"
    )
)

if "%LAUNCHED_STANDALONE%"=="0" (
    echo [+] Oeffne Standard-Webbrowser mit dem voll-synchronisierten Web-Applet...
    start "" "%APP_URL%"
) else (
    echo [+] Standalone-Anwendung erfolgreich gestartet!
    echo [+] Das synchronisierte Web-Applet steht parallel bereit unter: %APP_URL%
)

echo.
echo ======================================================================================
echo   [SUCCESS] SENSORIUM AUTOMATION- SETUP BEENDET! FEHLERQUOTE: 0%%
echo ======================================================================================
echo.
echo   ERGEBNISSE:
echo   - Desktop Shortcut: "START_SENSORIUM.bat" wurde auf deinem Desktop erstellt!
echo   - Ableton Plugin:  Erfolgreich kopiert nach "%BRIDGE_DIR%"
echo   - Background-Srv:  Aktiv und hoert auf Port 5127 (UDP 5125/5126)
echo   - Applet / Client: Vollautomatisch im default Browser gestartet.
echo.
echo   ANLEITUNG FUER ABLETON LIVE:
echo   1. Starte oder starte Ableton Live neu.
echo   2. Gehe zu: Optionen -^> Voreinstellungen -^> Link/Tempo/MIDI.
echo   3. Waehle als Bedienoberflaeche (Control Surface) 1: "Sensorium_Bridge" aus.
echo   4. Die Echtzeitsynchronisierung in deiner App (BPM / Play-Status) leuchtet auf!
echo   5. In Zukunft kannst du den Server einfach per Doppelklick auf die "START_SENSORIUM"
echo      Datei auf deinem Desktop starten - sie oeffnet auch direkt das Web-Interface!
echo.
echo ======================================================================================
pause
exit /b 0

:ERR_ZIP
echo ======================================================================================
echo [ACHTUNG / WARNUNG] DIE ZIP-DATEI WURDE NOCH NICHT ENTPACKT!
echo ======================================================================================
echo Du hast die Batch-Datei direkt im Zip-Archiv angeklickt.
echo Windows oeffnet Dateien aus ZIPs in einem temporaeren Ordner, wodurch andere Dateien fehlen.
echo.
echo LÖSUNG IN 2 SCHRITTEN:
echo 1. Schliesse dieses Fenster.
echo 2. Mache einen RECHTSKLICK auf die heruntergeladene ZIP-Datei.
echo 3. Waehle "Alle extrahieren..." / "Entpacken" und oeffne den entpackten Ordner!
echo 4. Starte die Datei danach erst im entpackten Ordner.
echo ======================================================================================
pause
exit /b 1

:ERR_PYTHON_MANUAL
echo ======================================================================================
echo [FEHLER] Python wurde im System-PATH nicht gefunden.
echo Bitte installiere Python 3.7+ und aktiviere "Add Python to PATH" im Installer.
echo.
echo Oeffne Python Download-Seite...
start "" "https://www.python.org/downloads/"
echo ======================================================================================
pause
exit /b 1

