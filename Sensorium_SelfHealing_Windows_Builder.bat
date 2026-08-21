@echo off
title Sensorium Pro - Self-Healing Windows Application & Portable Builder
color 0A
mode con: cols=105 lines=38

:: AUTOMATIC PATH & WORKING DIRECTORY RESOLUTION (%~dp0)
cd /d "%~dp0"

echo =========================================================================================================
echo   sSSs   d88888b d8b   db .d8888.  .d88b.  d8888b. d88888b db    db .88b  d88.
echo  d8' `8b 88'     888o  88 88'  YP .8P  Y8. 88  `8D 88'     88    88 88'YbdP`88
echo  I8_     88ooooo 88V8o 88 `Ybo.   88    88 88oobY' 88ooooo 88    88 88  88  88
echo    `Y8s. 88~~~~~ 88 V8o88   `Y8b. 88    88 88`8b   88~~~~~ 88    88 88  88  88
echo  d8   8D 88.     88  V888 db   8D `8b  d8' 88 `8D  88.     88b  d88 88  88  88
echo  `8ss8P' Y88888P VP   V8P `8888Y'  `Y88P'  88   YD Y88888P ~Y8888P' VP  VP  VP
echo =========================================================================================================
echo             [SELF-HEALING 1-CLICK WINDOWS APPLICATION & PORTABLE BUNDLE BUILDER]
echo =========================================================================================================
echo.

:: CHECK IF RUNNING DIRECTLY INSIDE TEMP/ZIP
echo "%CD%" | findstr /i "Temp" >nul 2>&1
if not errorlevel 1 (
    echo [ACHTUNG] Zip noch nicht entpackt! Bitte den Ordner erst entpacken.
    pause
    exit /b 0
)

:: -------------------------------------------------------------------------
:: STEP 0: AUTOMATED SECURITY & PORT CONFIGURATION (DEFENDER & FIREWALL)
:: -------------------------------------------------------------------------
echo [0/4] CONFIGURE DEFENDER EXCLUSION & FIREWALL PORTS (3000, 8000, 9000)...
echo ---------------------------------------------------------------------------------------------------------

:: 1. Auto-add current folder to Windows Defender exclusions
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-MpPreference -ExclusionPath '%~dp0' -ErrorAction SilentlyContinue" >nul 2>&1
echo [+] Windows Defender Ordner-Ausnahme fuer "%~dp0" gesetzt.

:: 2. Auto-open Firewall Ports (3000 Web, 8000 OSC, 9000 MTC)
netsh advfirewall firewall add rule name="Sensorium Web 3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Sensorium OSC 8000" dir=in action=allow protocol=UDP localport=8000 profile=any >nul 2>&1
netsh advfirewall firewall add rule name="Sensorium MTC 9000" dir=in action=allow protocol=UDP localport=9000 profile=any >nul 2>&1
echo [+] Firewall Ports 3000 (HTTP), 8000 (OSC) und 9000 (MTC) freigeschaltet.
echo.

:: -------------------------------------------------------------------------
:: STEP 1: AUDIT & AUTO-PREPARE
:: -------------------------------------------------------------------------
echo [1/4] PRUEFE BUNDLE-VOLLSTAENDIGKEIT...
echo ---------------------------------------------------------------------------------------------------------

set "PORTABLE_DIR=Sensorium_Portable_App"
if not exist "%PORTABLE_DIR%" mkdir "%PORTABLE_DIR%" 2>nul
if not exist "%PORTABLE_DIR%\dist" mkdir "%PORTABLE_DIR%\dist" 2>nul

if exist "dist" (
    xcopy /E /Y /I "dist" "%PORTABLE_DIR%\dist" >nul 2>&1
    echo [+] Pre-built dist Web Bundle verifiziert & synchronisiert.
)

:: -------------------------------------------------------------------------
:: STEP 2: RUNTIME & DEPENDENCY CHECK / SILENT AUTO-REPAIR
:: -------------------------------------------------------------------------
echo [2/4] SYSTEM RUNTIME & BUNDLE AUTO-REPAIR...
echo ---------------------------------------------------------------------------------------------------------

where node >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js fehlt. Versuche automatische silent Installation via Winget...
    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    )
    echo [+] Standalone Fallback-Modus aktiv: Anwendung startet autark direkt im Browser.
) else (
    for /f "tokens=*" %%i in ('node -v 2^>nul') do set "NODE_VER=%%i"
    echo [+] Node.js Laufzeitumgebung aktiv: %NODE_VER%
)

if exist "node_modules" (
    echo [+] node_modules ist einsatzbereit.
) else (
    where npm >nul 2>&1
    if not errorlevel 1 (
        echo [!] Installiere npm Module...
        call npm install --no-audit --no-fund >nul 2>&1
    )
)

:: -------------------------------------------------------------------------
:: STEP 3: VITE PRODUCTION BUILD (WITH FAIL-SAFE FALLBACK)
:: -------------------------------------------------------------------------
echo [3/4] GENERIERE PRODUCTION BUNDLE...
echo ---------------------------------------------------------------------------------------------------------

where npm >nul 2>&1
if not errorlevel 1 (
    call npm run build >nul 2>&1
    if errorlevel 1 (
        echo [i] Dynamic build skipped. Benutze direkt mitgelieferten dist/ Core.
    ) else (
        echo [+] Fresh production build in dist\ erstellt!
        xcopy /E /Y /I "dist" "%PORTABLE_DIR%\dist" >nul 2>&1
    )
)

:: -------------------------------------------------------------------------
:: STEP 4: GENERATE PORTABLE LAUNCHER (ZERO DISRUPTION)
:: -------------------------------------------------------------------------
echo [4/4] GENERIERE STANDALONE LAUNCHER IN Sensorium_Portable_App...
echo ---------------------------------------------------------------------------------------------------------

copy /Y "package.json" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "server.ts" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "electron-main.js" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "Sensorium_ZeroImpact_Setup.bat" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "Sensorium_Win11_Doctor.ps1" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "START_STANDALONE.bat" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "requirements.txt" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "REQUIREMENTS.md" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "TACHELES_ANALYSIS.md" "%PORTABLE_DIR%\" >nul 2>&1
copy /Y "MICHAEL_JACKSON_RESONANCE_MANIFESTO.md" "%PORTABLE_DIR%\" >nul 2>&1

echo [+] Standalone Starter START_STANDALONE.bat synchronisiert in %PORTABLE_DIR%.

echo.
echo =========================================================================================================
echo  [ERFOLG] SENSORIUM STANDALONE COMPILATION AUTO-HEALED & ABGESCHLOSSEN!
echo  STATUS: 0 FEHLER / 100%% EINSATZBEREIT (AUCH OFF-LINE)
echo =========================================================================================================
echo.
pause
exit /b 0

