@echo off
chcp 65001 > nul
title 🚀 Actualizando Sitio Web (Criterio Digital)
color 0A

echo ===================================================
echo      CRITERIO DIGITAL - GENERANDO NUEVA VERSIÓN
echo ===================================================
echo.
echo 1. Construyendo la aplicación web...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ ERROR AL CONSTRUIR LA APP.
    pause
    exit /b
)

echo.
echo 2. Subiendo a la nube (Firebase)...
call npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ ERROR AL SUBIR. REVISA TU CONEXIÓN.
    pause
    exit /b
)

echo.
echo ===================================================
echo       ✅ ¡SITIO ACTUALIZADO CORRECTAMENTE!
echo ===================================================
echo.
echo Ya puedes ver los cambios en: https://app.criteriodigital.cl
echo.
echo Cerrando automáticamente en 5 segundos...
timeout /t 5 >nul
exit
