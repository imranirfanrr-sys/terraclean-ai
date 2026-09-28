@echo off
title TerraClean AI - Smart Waste Dashboard Launcher
echo ========================================================
echo         TERRACLEAN AI DASHBOARD LAUNCHER
echo  AI-Powered Smart Waste Overflow ^& Bio-Filtration System
echo ========================================================
echo.
echo Launching TerraClean AI Web Dashboard in your default browser...
start "" "%~dp0index.html"
echo.
echo Done! The dashboard is now open in your browser.
echo You can test the interactive visual dustbin slider, real-time sensor chart, and live Wokwi circuit simulation!
echo.
ping -n 3 127.0.0.1 >nul
