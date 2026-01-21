require('dotenv').config();
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const ptp = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const winston = require('winston');
const { exec, execFile } = require('child_process');

// --- 1. CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');
const PRINTER_QUEUE_STD = process.env.PRINTER_STD || "Zebra_STD";
const PRINTER_QUEUE_TECH = process.env.PRINTER_TECH || "Zebra_TECH";
const TEMP_DIR = os.tmpdir();

// --- 2. LOGGER SETUP (Winston) ---
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        logFormat
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'agent-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'agent-combined.log' })
    ]
});

logger.info("🚀 Iniciando Print Agent v2.0 (Admin SDK + Logical Queues)");

// --- 3. DEPENDENCY CHECK & SETUP ---
const getSumatraPath = () => {
    const targetPath = path.join(TEMP_DIR, 'SumatraPDF-Portable.exe');
    try {
        if (!fs.existsSync(targetPath)) {
            logger.info("📦 Extrayendo driver de impresión portátil...");
            const sourcePath = path.join(__dirname, 'node_modules', 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe');
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, targetPath);
                logger.info("✅ Driver extraído correctamente.");
            } else {
                logger.warn("⚠️ No se encontró el binario interno de SumatraPDF. Se intentará usar el del sistema si existe.");
            }
        }
    } catch (e) {
        logger.error(`⚠️ Error extrayendo SumatraPDF: ${e.message}`);
    }
    return targetPath;
};
const sumatraPath = getSumatraPath();

// --- 4. FIREBASE ADMIN INITIALIZATION ---
let db;
try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        throw new Error(`No se encontró el archivo de credenciales: ${SERVICE_ACCOUNT_PATH}`);
    }
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    db = getFirestore();
    logger.info(`📡 Conectado a Firestore como: ${serviceAccount.client_email}`);

} catch (error) {
    logger.error(`❌ CRITICAL: Fallo en inicialización de Firebase. ${error.message}`);
    logger.error("➡️  Por favor, asegúrese de colocar 'service-account.json' en la carpeta del agente.");
    process.exit(1);
}

// --- 5. LOGIC: PROCESS JOB ---
async function processJob(jobId, job) {
    if (job.type !== 'pdf' || !job.payload) {
        throw new Error("Formato inválido (se esperaba PDF)");
    }

    const fileName = `ticket_${job.ticketId}_${Date.now()}.pdf`;
    const filePath = path.join(TEMP_DIR, fileName);

    try {
        // Save PDF
        const pdfBuffer = Buffer.from(job.payload, 'base64');
        fs.writeFileSync(filePath, pdfBuffer);
        logger.info(`📄 PDF guardado temp: ${fileName} (Ticket: ${job.ticketId})`);

        // Router Logic (Logical Queues)
        let targetPrinter = PRINTER_QUEUE_STD;
        let queueName = "ESTÁNDAR";

        if (job.paper && (job.paper.includes('50x70') || job.paper === '50x70 Ficha Tecnica')) {
            targetPrinter = PRINTER_QUEUE_TECH;
            queueName = "TÉCNICA";
            logger.info(`🔀 Enrutando a COLA TÉCNICA (${targetPrinter}) por formato: ${job.paper}`);
        } else {
            logger.info(`⬇️ Enrutando a COLA ESTÁNDAR (${targetPrinter}).`);
        }

        // Print Execution
        const printArgs = [];
        printArgs.push('-print-to', targetPrinter);
        printArgs.push('-silent');

        let settings = 'noscale';
        if (job.orientation) {
            settings += `,${job.orientation}`; // e.g., "noscale,landscape"
        }
        printArgs.push('-print-settings', settings);
        printArgs.push(filePath);

        logger.info(`🖨️  Enviando trabajo a driver...`);

        await new Promise((resolve, reject) => {
            execFile(sumatraPath, printArgs, (error, stdout, stderr) => {
                if (error) {
                    logger.error(`Sumatra Error: ${stderr}`);
                    reject(error);
                } else {
                    resolve();
                }
            });
        });

        // Mark Done
        await db.collection('print_jobs').doc(jobId).update({
            status: 'printed',
            printedAt: new Date()
        });
        logger.info(`✅ Impresión confirmada.`);

    } catch (e) {
        throw e; // Propagate to retry logic
    } finally {
        // Cleanup
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
    }
}

// --- 6. RESILIENT LISTENER (Backoff) ---
let unsubscribe = null;
let retryDelay = 1000;
const MAX_RETRY_DELAY = 60000;

function startListener() {
    if (unsubscribe) unsubscribe();

    logger.info("🎧 Iniciando listener de trabajos pendientes...");

    try {
        const q = db.collection('print_jobs').where('status', '==', 'pending');

        unsubscribe = q.onSnapshot(snapshot => {
            // Reset delay on successful connection
            retryDelay = 1000;

            if (snapshot.empty) return;

            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const job = change.doc.data();
                    const jobId = change.doc.id;
                    logger.info(`📥 Nuevo trabajo recibido: ${jobId}`);

                    try {
                        await processJob(jobId, job);
                    } catch (error) {
                        logger.error(`❌ Error procesando trabajo ${jobId}: ${error.message}`);
                        // Update status to error to prevent infinite loop
                        await db.collection('print_jobs').doc(jobId).update({
                            status: 'error',
                            error: error.message,
                            processedAt: new Date()
                        }).catch(e => logger.error("Error writing status:", e));
                    }
                }
            });
        }, error => {
            logger.error(`❌ Error de conexión stream: ${error.code}. Reintentando en ${retryDelay / 1000}s...`);
            handleDisconnect();
        });

    } catch (e) {
        logger.error(`❌ Error fatal iniciando listener: ${e.message}`);
        handleDisconnect();
    }
}

function handleDisconnect() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
        startListener();
    }, retryDelay);
}

// --- 7. START ---
// Clear spooler on start
exec(`powershell -Command "Get-Printer | Get-PrintJob | Remove-PrintJob"`, (err) => {
    if (!err) logger.info("🧹 Cola de Windows limpia.");
});

startListener();

// --- 7. SCHEDULED TASKS ---
const reportService = require('./reportService');
const cron = require('node-cron');

// Init Report Service
reportService.setup(db, logger);

// --- 8. WHATSAPP SERVICE ---
const whatsappService = require('./whatsappService');
whatsappService.start(db, logger);

// Schedule: 00:00 every day
cron.schedule('0 0 * * *', () => {
    logger.info("⏰ Ejecutando Cron Job: Reporte Diario");
    reportService.runDailyReport();
});

// Test Flag: Run immediately if --test-report is passed
if (process.argv.includes('--test-report')) {
    logger.info("🧪 Modo Prueba: Generando reporte ahora...");
    reportService.runDailyReport();
}

// Keep alive
setInterval(() => {
    // Heartbeat log every hour
    logger.info("💓 Agente activo.");
}, 3600000);
