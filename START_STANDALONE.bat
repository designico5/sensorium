@echo off
title Sensorium Pro - Standalone App Launcher
color 0A
cd /d "%~dp0"

echo =======================================================================
echo    SENSORIUM PRO - STANDALONE OFFLINE / PORTABLE LAUNCHER
echo    Urheber & Entwickler: Nico Mädler
echo =======================================================================
echo.

:: 1. Automatische Defender-Ausnahme fuer den aktuellen Ordner setzen
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionPath '%~dp0' -ErrorAction SilentlyContinue" >nul 2>&1

:: 2. Firewall-Ports freischalten (3000 Web, 8000 OSC, 9000 MTC)
netsh advfirewall firewall add rule name="Sensorium Web 3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Sensorium OSC 8000" dir=in action=allow protocol=UDP localport=8000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Sensorium MTC 9000" dir=in action=allow protocol=UDP localport=9000 profile=any >nul 2>&1

:: 3. Prufe Node.js und starte im autarken App-Fenster
where node >nul 2>&1
if errorlevel 1 (
    echo [+] Offline-Modus ohne Node: Starte isoliertes App-Fenster direkt...
    start msedge --app="%CD%\dist\index.html" 2>nul || start chrome --app="%CD%\dist\index.html" 2>nul || start "" "dist\index.html"
    exit /b 0
)

echo [+] Node.js erkannt! Starte Sensorium Engine im Hintergrund (Port 3000)...
start /min cmd /c "node server.ts"
timeout /t 2 /nobreak >nul

echo [+] Starte Sensorium OS in eigenem rahmenlosen App-Fenster...
start msedge --app=http://localhost:3000 2>nul || start chrome --app=http://localhost:3000 2>nul || start http://localhost:3000
