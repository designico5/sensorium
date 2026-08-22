@echo off
setlocal
title Sensorium - Retired Unsafe Builder
cd /d "%~dp0"

echo =======================================================================
echo  THIS LEGACY SELF-HEALING BUILDER IS DISABLED
echo =======================================================================
echo.
echo It no longer changes Windows Defender, firewall policy, installed
echo runtimes, dependencies, or background processes. Those operations are
echo unsafe and unauditable on a live production workstation.
echo.
echo Approved local verification commands:
echo   npm ci
echo   npm run check
echo   npm run build:win
echo.
echo Use a signed CI release for production distribution.
pause
exit /b 1
