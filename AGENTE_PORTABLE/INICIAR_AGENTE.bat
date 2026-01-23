@echo off
cd /d "%~dp0"
title AGENTE CRITERIO - INICIO (V4)
color 0B

echo ==================================================
echo      AGENTE CRITERIO: INICIAR (V4)
echo      Modo: OIDO ABSOLUTO + TELEMETRIA
echo      Auto-Actualizable
echo ==================================================
echo.

:bucle_maestro
cls
echo [INFO] Directorio: %CD%

:: 1. AUTO-ACTUALIZACION (Solo si hay internet y git)
echo [GIT] Buscando actualizaciones...
git pull origin main

:: 2. ENTRAR A LA ZONA
if exist "print_agent" (
    cd "print_agent"
) else (
    echo [ERROR] No encuentro la carpeta 'print_agent'.
    echo Asegurate de estar dentro de AGENTE_PORTABLE.
    pause
    exit
)

:: 3. VERIFICAR DEPENDENCIAS
if not exist "node_modules" (
    echo [NPM] Instalando cerebros...
    call npm install
)

:: 4. EJECUTAR
echo.
echo [SISTEMA] Iniciando Agente...
echo [INFO] NO CIERRES la ventana de Chrome que se abrira.
color 0A
node index.js

:: 5. REINICIO AUTOMATICO
color 0C
echo.
echo [CRASH] El agente se cerro. Reiniciando en 5s...
timeout /t 5
cd /d "%~dp0"
goto bucle_maestro
