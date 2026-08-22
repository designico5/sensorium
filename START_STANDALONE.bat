@echo off
setlocal
title Sensorium Stage Preview - Safe Local Launcher
cd /d "%~dp0"

echo =======================================================================
echo  SENSORIUM - SAFE LOCAL PREVIEW
echo  No Defender exclusion. No firewall rule. Loopback access only.
echo =======================================================================

where node >nul 2>&1
if errorlevel 1 (
  echo [BLOCKED] Node.js is not installed or not on PATH.
  echo Install an approved Node.js LTS build, then run this launcher again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [BLOCKED] Dependencies are not installed.
  echo Run: npm ci
  echo Review the lockfile and lifecycle scripts before installing on a stage PC.
  pause
  exit /b 1
)

echo Starting the local service on 127.0.0.1 only...
start "Sensorium Local Service" /min cmd /c "npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:3000"
exit /b 0
