@echo off
cd /d "%~dp0"
title AGENTE CRITERIO - V4 TELEMETRIA
color 0B

echo ==================================================
echo      CRITERIO AGENT V4 (AUTO-UPDATE)
echo      Modo: OIDO ABSOLUTO + TELEMETRIA
echo ==================================================
echo.

:bucle_maestro
cls
echo [INFO] Directorio: %CD%

:: 1. AUTO-ACTUALIZACION
echo [GIT] Buscando actualizaciones en la nube...
git pull origin main

:: 2. ENTRAR A LA ZONA
cd "AGENTE_PORTABLE\print_agent"

:: 3. VERIFICAR DEPENDENCIAS (Check rapido)
if not exist "node_modules" (
    echo [NPM] Instalando cerebros...
    call npm install
)

:: 4. EJECUTAR
echo.
echo [SISTEMA] Iniciando Agente...
echo [INFO] Si ves una ventana de Chrome, NO LA CIERRES.
color 0A
node index.js

:: 5. REINICIO AUTOMATICO
color 0C
echo.
echo [CRASH] Caida detectada. Reiniciando en 5s...
timeout /t 5
cd /d "%~dp0"
goto bucle_maestro
