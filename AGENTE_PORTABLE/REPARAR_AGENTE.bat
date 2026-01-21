@echo off
title REPARANDO AGENTE - Criterio Digital
color 0E

echo ==================================================
echo   REPARACION PROFUNDA DEL AGENTE (WhatsApp Fix)
echo ==================================================
echo.
echo 1. Eliminando librerias antiguas...
cd print_agent
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo    - Carpeta node_modules eliminada.
)
if exist "package-lock.json" (
    del "package-lock.json"
    echo    - Archivo package-lock.json eliminado.
)

echo.
echo 2. Instalando version corregida de WhatsApp...
echo    (Esto puede tardar unos minutos, por favor espere)
call npm install

echo.
echo 3. Iniciando Agente...
color 0A
node index.js
pause
