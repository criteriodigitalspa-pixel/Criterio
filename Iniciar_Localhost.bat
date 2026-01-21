@echo off
title 💻 Criterio Digital - LOCALHOST
color 0B
echo ===================================================
echo   INICIANDO MODO DESARROLLO (LOCALHOST)
echo ===================================================
echo.
echo Para abrir el sitio, espera a que aparezca "Local: http://localhost:5173"
echo y presiona Ctrl + Click en el enlace o abrelo en tu navegador.
echo.
echo Presiona Ctrl + C para detener el servidor.
echo.
cd frontend
call npm run dev
pause
