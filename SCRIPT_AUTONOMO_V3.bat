@echo off
cd /d "C:\Users\HP"
title AGENTE CRITERIO - MODO AUTONOMO (V3)
color 0B

echo ==================================================
echo      GHOST PROTOCOL ACTIVATED (V3)
echo ==================================================
echo.

:bucle_maestro
cls
echo [INFO] Verificando sistema...

:: 1. Asegurar carpeta
if not exist "Criterio" (
    echo [ALERTA] No existe carpeta Criterio. Clonando...
    git clone https://github.com/criteriodigitalspa-pixel/Criterio.git
)

:: 2. Actualizar
cd "C:\Users\HP\Criterio"
echo [GIT] Descargando actualizaciones...
git pull origin main

:: 3. Entrar a la zona del Agente
cd "C:\Users\HP\Criterio\AGENTE_PORTABLE\print_agent"

:: 4. Verificar dependencias (Rapido)
if not exist "node_modules" (
    echo [NPM] Instalando librerias por primera vez...
    call npm install
)

:: 5. EJECUTAR AGENTE
echo.
echo [SISTEMA] Iniciando Agente...
color 0A
node index.js

:: 6. Si el agente muere, esperamos y reiniciamos
color 0C
echo.
echo [CRASH] El agente se cerro. Reiniciando en 5 segundos...
timeout /t 5
goto bucle_maestro
