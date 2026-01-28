@echo off
cd /d "%~dp0"
title AGENTE CRITERIO - INICIO (V5 - FORCE UPDATE)
color 0B

echo ==================================================
echo      AGENTE CRITERIO: INICIAR (V5)
echo      Modo: ACTUALIZACION FORZADA
echo ==================================================
echo.

:bucle_maestro
cls
echo [INFO] Directorio: %CD%

:: 1. AUTO-ACTUALIZACION FORZADA (V5)
echo [GIT] Forzando sincronizacion con la nube...
echo     1. Fetching...
git fetch --all
echo     2. Resetting hard to origin/main...
git reset --hard origin/main
echo     3. Pulling...
git pull origin main

:: 2. ENTRAR A LA ZONA (Mantener igual)
if exist "print_agent" (
    cd "print_agent"
) else (
    echo [ERROR] No encuentro la carpeta 'print_agent'.
    pause
    exit
)

:: 3. VERIFICAR DEPENDENCIAS (Mantener igual)
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

:: 5. REINICIO
color 0C
echo.
echo [CRASH] El agente se cerro. Reiniciando en 5s...
timeout /t 5
cd /d "%~dp0"
goto bucle_maestro
