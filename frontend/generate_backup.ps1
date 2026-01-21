# Criterio ERP - Backup Generator Script
# "Contra Todo Pronóstico" Edition
# Author: Antigravity AI

$ErrorActionPreference = "Stop"
$projectRoot = Get-Location
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupName = "CriterioERP_FullBackup_$timestamp.zip"
$backupPath = Join-Path $projectRoot $backupName

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   INICIANDO PROTOCOLO DE RESPALDO TOTAL" -ForegroundColor Cyan
Write-Host "   Archivo: $backupName" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Define Critical Assets (Files & Folders)
$foldersToBackup = @("src", "public") 
$brainPath = "c:\Users\diego\.gemini\antigravity\brain\0ee6e3e4-bddd-47ec-827c-a8dc5ca53ccd"

$filesToBackup = @(
    "package.json", 
    "package-lock.json", 
    "vite.config.js", 
    "tailwind.config.js", 
    "postcss.config.js", 
    ".env",
    ".env.local",
    ".env.example",
    ".eslintrc.cjs",
    "index.html"
)

# 2. Prepare Temp Folder for Clean Zipping
$tempDir = Join-Path $projectRoot "temp_backup_$timestamp"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
    # 3. Copy Folders
    foreach ($folder in $foldersToBackup) {
        if (Test-Path $folder) {
            Write-Host "  [+] Copiando carpeta: $folder..." -ForegroundColor Green
            Copy-Item -Path $folder -Destination $tempDir -Recurse -Container
        } else {
            Write-Host "  [!] Carpeta no encontrada (Omitida): $folder" -ForegroundColor Yellow
        }
    }

    # 3b. Copy Brain (Artifacts)
    if (Test-Path $brainPath) {
         Write-Host "  [+] Copiando Documentación (Brain)..." -ForegroundColor Green
         $destBrain = Join-Path $tempDir "brain"
         New-Item -ItemType Directory -Force -Path $destBrain | Out-Null
         Copy-Item -Path "$brainPath\*" -Destination $destBrain -Recurse
    } else {
         Write-Host "  [!] NO SE ENCONTRÓ LA DOCUMENTACIÓN (Brain) en: $brainPath" -ForegroundColor Red
    }

    # 4. Copy Files
    foreach ($file in $filesToBackup) {
        if (Test-Path $file) {
            Write-Host "  [+] Copiando archivo: $file..." -ForegroundColor Green
            Copy-Item -Path $file -Destination $tempDir
        } else {
             if ($file -like ".env*") {
                 Write-Host "  [!] Secretos no encontrados ($file). Asegúrate de tener respaldo manual." -ForegroundColor Magenta
             } else {
                 Write-Host "  [!] Archivo no encontrado (Posiblemente opcional): $file" -ForegroundColor Yellow
             }
        }
    }

    # 5. Create ZIP
    Write-Host "`n  [>] Comprimiendo archivos (Esto puede tomar unos segundos)..." -ForegroundColor Cyan
    Compress-Archive -Path "$tempDir\*" -DestinationPath $backupPath -Force

    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   RESPALDO COMPLETADO CON ÉXITO" -ForegroundColor Green
    Write-Host "   Ubicación: $backupPath" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "   GUARDA ESTE ARCHIVO EN UN DISCO EXTERNO." -ForegroundColor Red

} catch {
    Write-Host "`n  [X] ERROR FATAL DURANTE EL RESPALDO:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # 6. Cleanup
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force
    }
}
