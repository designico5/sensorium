@echo off
setlocal
title Sensorium - Retired Zero-Impact Setup
cd /d "%~dp0"

echo [BLOCKED] The legacy Zero-Impact setup is retired.
echo It no longer installs runtimes, kills port owners, creates bridges, or
echo changes security policy. Use a reviewed and signed release artifact.
pause
exit /b 1
