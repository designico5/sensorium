@echo off
title Sensorium Windows 11 Standalone Exe Builder
color 0A

echo ====================================================================
echo     SENSORIUM ENGINE - WINDOWS 11 STANDALONE EXE BUNDLER (ELECTRON)
echo ====================================================================
echo:
echo This script automates the bundling of your high-performance React
echo MIDI/ASIO diagnostic mindmap into a native Windows 11 executable.
echo:

:: CHECK IF RUNNING DIRECTLY INSIDE ZIP (TEMP FOLDER)
echo "%CD%" | findstr /i "Temp" >nul 2>&1
if not errorlevel 1 goto :ERR_ZIP

:: Check Node.js installation
where node >nul 2>&1
if errorlevel 1 goto :NO_NODE

echo [1/4] Installing development dependencies (Electron & electron-builder)...
call npm install --save-dev electron electron-builder tsx
if errorlevel 1 goto :ERR_NPM

echo:
echo [2/4] Verifying Vite frontend build...
call npm run build
if errorlevel 1 (
    echo [!] Build failed. Attempting automatic repair via npm install...
    call npm install
    call npm run build
    if errorlevel 1 goto :ERR_BUILD
)

echo:
echo [3/4] Configuring package.json settings for Windows standalone executable...
echo { "name": "sensorium-pro", "version": "2.0.0", "main": "electron-main.js", "scripts": { "package": "electron-builder --win" } } > electron-config.json

echo:
echo [4/4] Invoking Electron Builder compiler thread...
echo Packing standalone binary... Please wait...
call npx electron-builder --win portable --config.directories.output=dist/windows
if errorlevel 1 goto :ERR_ELECTRON

echo:
echo ====================================================================
echo  [ERFOLG] STANDALONE COMPILATION ERFOLGREICH COMPILIERT!
echo ====================================================================
echo:
echo Native Executable Location:
echo   dist\windows\Sensorium-Pro-2.0.0-Portable.exe
echo:
echo You can now run the standalone tool or distribute it to your systems.
echo:
pause
exit /b 0

:ERR_ZIP
echo ====================================================================
echo [FEHLER] DIE ZIP-DATEI WURDE NOCH NICHT ENTPACKT!
echo ====================================================================
echo Du hast die .bat-Datei direkt innerhalb der ZIP-Datei doppelt angeklickt.
echo Windows kann Programme nicht direkt in einer ZIP-Datei kompilieren.
echo:
echo SO GEHT'S RICHTIG:
echo 1. Mache einen Rechtsklick auf die heruntergeladene .ZIP Datei.
echo 2. Klicke auf "Alle extrahieren..." (Entpacken).
echo 3. Oeffne den entpackten Ordner und starte "build-windows-exe.bat" dort!
echo ====================================================================
pause
exit /b 1

:NO_NODE
echo [!] Node.js wurde auf Ihrem System noch nicht gefunden.
echo [+] Versuche automatische 1-Klick-Installation via Windows Package Manager (winget)...
where winget >nul 2>&1
if errorlevel 1 goto :ERR_NODE_MANUAL

winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if errorlevel 1 goto :ERR_NODE_MANUAL

echo [+] Node.js wurde erfolgreich installiert!
echo [!] BITTE SCHLIESSEN SIE DIESES FENSTER UND STARTEN SIE "build-windows-exe.bat" ERNEUT!
pause
exit /b 0

:ERR_NODE_MANUAL
echo ====================================================================
echo [FEHLER] Node.js ist nicht auf diesem Computer installiert!
echo ====================================================================
echo Bitte laden Sie Node.js (LTS Version) kostenfrei herunter:
echo   https://nodejs.org/
echo nach der Installation "build-windows-exe.bat" erneut doppelklicken!
echo ====================================================================
pause
exit /b 1

:ERR_NPM
echo ====================================================================
echo [FEHLER] npm install ist fehlgeschlagen!
echo Bitte stellen Sie sicher, dass eine aktive Internetverbindung besteht.
echo ====================================================================
pause
exit /b 1

:ERR_BUILD
echo ====================================================================
echo [FEHLER] Frontend build fehlgeschlagen!
echo ====================================================================
pause
exit /b 1

:ERR_ELECTRON
echo ====================================================================
echo [FEHLER] Standalone executable compilation fehlgeschlagen!
echo ====================================================================
pause
exit /b 1

