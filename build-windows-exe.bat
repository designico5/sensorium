@echo off
setlocal
title Sensorium - Reviewed Windows Preview Build
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [BLOCKED] Approved Node.js runtime not found. Nothing was installed.
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [BLOCKED] npm not found. Nothing was installed.
  exit /b 1
)

if not exist "node_modules" (
  echo [BLOCKED] Dependencies missing. Review package-lock.json, then run npm ci.
  exit /b 1
)

call npm run check
if errorlevel 1 exit /b 1

call npm run build:win
if errorlevel 1 exit /b 1

echo Build complete. Verify signature, hash, SBOM, and smoke tests before distribution.
exit /b 0
