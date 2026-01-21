@echo off
cd /d "%~dp0"
title ACTUALIZANDO SISTEMA - Criterio Digital
color 0B

echo ==================================================
echo      SISTEMA DE ACTUALIZACION AUTOMATICO
echo ==================================================
echo.
echo [INFO] Directorio de trabajo: %CD%

:: 1. Verificacion de Seguridad: ¿Existe la carpeta?
if not exist "Criterio" (
    color 0E
    echo [AVISO] No encuentro la carpeta 'Criterio' aqui.
    echo Descargando el sistema completo...
    echo.
    git clone https://github.com/criteriodigitalspa-pixel/Criterio.git
    echo.
)

:: 2. Entrar a la carpeta
cd Criterio
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR CRITICO] No se pudo entrar a la carpeta 'Criterio'.
    pause
    exit
)

:: 3. Descargar cambios recientes
echo [INFO] Sincronizando con la nube...
git pull origin main

:: 4. Instalar librerias nuevas si las hubiere
cd AGENTE_PORTABLE\print_agent
if %errorlevel% neq 0 (
    echo [ERROR] No encuentro la carpeta del Agente interno.
    pause
    exit
)

echo [INFO] Verificando librerias...
call npm install

echo.
echo ==================================================
echo      SISTEMA ACTUALIZADO - INICIANDO AGENTE
echo ==================================================
echo.
color 0A
node index.js
pause
