@echo off
title AGENTE DE IMPRESION - Logistica Criterio
color 0A

echo ==================================================
echo   INICIANDO SISTEMA DE IMPRESION (v2.0)
echo ==================================================
echo.
echo 1. Verificando Credenciales...
if exist "print_agent\service-account.json" (
    echo    [OK] Llaves encontradas.
) else (
    echo    [ERROR] No se encuentra 'service-account.json' en print_agent.
    echo    Por favor copie sus credenciales.
    pause
    exit
)

echo.
echo 2. Arrancando Motor (Node.js)...
cd print_agent
echo    - Verificando y actualizando librerias...
call npm install
echo    - Iniciando Agente...
node index.js

echo.
echo [ATENCION] El sistema se ha detenido.
pause
