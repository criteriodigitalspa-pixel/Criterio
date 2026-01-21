@echo off
cd /d "%~dp0"
title ACTUALIZANDO SISTEMA - Criterio Digital
color 0B

echo ==================================================
echo      MODO PILOTO AUTOMATICO (Lag Cero)
echo ==================================================
echo.
echo [INFO] Directorio de trabajo: %CD%

:: Loop Infinito (Sin consumo de CPU)
:bucle_maestro

:: 1. Verificacion de Seguridad: ¿Existe la carpeta?
if not exist "Criterio" (
    color 0E
    echo [AVISO] No encuentro la carpeta 'Criterio'.
    echo Descargando el sistema completo...
    git clone https://github.com/criteriodigitalspa-pixel/Criterio.git
)

:: 2. Entrar y Actualizar
cd Criterio
echo [INFO] Buscando actualizaciones en GitHub...
git pull origin main

:: 3. Instalar librerias (solo si cambiaron, npm es inteligente)
cd AGENTE_PORTABLE\print_agent
call npm install --loglevel=error

:: 4. INICIAR AGENTE Y ESPERAR
echo.
echo [INFO] >>> INICIANDO AGENTE (Cierra esta ventana para detener) <<<
color 0A
node index.js

:: 5. Cuando el agente se cierre (crashee o se reinicie), volvemos aqui
color 0E
echo.
echo [AVISO] El agente se ha cerrado. Reiniciando en 3 segundos...
timeout /t 3
cd ..\..
cd ..
goto bucle_maestro
