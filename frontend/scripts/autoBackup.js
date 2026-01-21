import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../src'); // Watch src folder
const BACKUP_ROOT = path.resolve(__dirname, '../../backups'); // Store outside frontend to avoid infinite loop
const INTERVAL_MS = 10 * 60 * 1000; // Check every 10 minutes

// --- LOGIC ---
console.log(`🛡️  Sistema de Respaldo Automático Iniciado`);
console.log(`📂 Origen: ${SOURCE_DIR}`);
console.log(`💾 Destino: ${BACKUP_ROOT}`);

if (!fs.existsSync(BACKUP_ROOT)) {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
}

let lastBackupTime = 0;

function getLatestModification(dir) {
    let latest = 0;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const subLatest = getLatestModification(fullPath);
            if (subLatest > latest) latest = subLatest;
        } else {
            if (stat.mtimeMs > latest) latest = stat.mtimeMs;
        }
    }
    return latest;
}

function performBackup(reason) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `backup_${timestamp}`;
    const destDir = path.join(BACKUP_ROOT, folderName);

    console.log(`📦 Creando respaldo... [${reason}]`);

    try {
        fs.cpSync(SOURCE_DIR, path.join(destDir, 'src'), { recursive: true });

        // Also copy package.json for context
        fs.copyFileSync(path.resolve(__dirname, '../package.json'), path.join(destDir, 'package.json'));

        console.log(`✅ Respaldo exitoso: ${folderName}`);
        lastBackupTime = Date.now();
    } catch (err) {
        console.error("❌ Error creando respaldo:", err);
    }
}

function checkAndBackup() {
    const now = Date.now();
    const lastEdit = getLatestModification(SOURCE_DIR);
    const timeSinceEdit = now - lastEdit;
    const timeSinceBackup = now - lastBackupTime;

    const ONE_HOUR = 60 * 60 * 1000;
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    console.log(`Tick: Última edición hace ${(timeSinceEdit / 60000).toFixed(1)} min. Último respaldo hace ${(timeSinceBackup / 60000).toFixed(1)} min.`);

    // Rule 1: Active Editing (< 2 hours since last edit)
    if (timeSinceEdit < TWO_HOURS) {
        // Backup every 1 hour
        if (timeSinceBackup >= ONE_HOUR) {
            performBackup("Actividad Detectada (Frecuencia: 1h)");
        }
    }
    // Rule 2: Inactive (> 2 hours since last edit)
    else {
        // Backup every 24 hours
        if (timeSinceBackup >= TWENTY_FOUR_HOURS) {
            performBackup("Modo Reposo (Frecuencia: 24h)");
        }
    }
}

// Initial Run
console.log("🔍 Verificando estado inicial...");
// Force a backup if none exists ever
const backups = fs.readdirSync(BACKUP_ROOT);
if (backups.length === 0) {
    performBackup("Respaldo Inicial");
} else {
    // If backups exist, we just start the timer loop, maybe finding the last one's time would be smart but 
    // simple memory state is fine for a running process.
    // Let's try to infer last backup from folder names? No, too complex.
    // Just assume we need to check rules.
    checkAndBackup();
}

// Loop
setInterval(checkAndBackup, INTERVAL_MS);
