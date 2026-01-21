const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let client;
let db;
let logger;
let isReady = false;

const start = (firestoreDb, appLogger) => {
    db = firestoreDb;
    logger = appLogger;

    logger.info("📱 Iniciando Servicio WhatsApp...");

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        logger.info("📱 Escanea este código QR para iniciar sesión en WhatsApp:");
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        isReady = true;
        logger.info("✅ Cliente WhatsApp conectado y listo!");

        // Start processing queue once ready
        startQueueListener();
    });

    client.on('auth_failure', (msg) => {
        logger.error(`❌ Error de autenticación WhatsApp: ${msg}`);
    });

    client.on('disconnected', (reason) => {
        isReady = false;
        logger.warn(`⚠️ Cliente WhatsApp desconectado: ${reason}`);
        // Client typically reinitializes automatically or needs a restart logic depending on lib version
    });

    client.initialize();
};

const startQueueListener = () => {
    logger.info("🎧 Escuchando cola de mensajes de WhatsApp...");

    // Listen for 'pending' messages
    db.collection('whatsapp_queue')
        .where('status', '==', 'pending')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const msgData = change.doc.data();
                    const msgId = change.doc.id;

                    if (!isReady) {
                        logger.warn(`⏳ Mensaje ${msgId} en espera. WhatsApp no está listo.`);
                        return;
                    }

                    await processMessage(msgId, msgData);
                }
            });
        }, error => {
            logger.error(`❌ Error en listener de WhatsApp: ${error.message}`);
        });
};

const processMessage = async (msgId, data) => {
    const { to, body } = data;
    // 'to' should be in format '569xxxxxxxx@c.us'
    // If user provides just phone number, we format it.

    let formattedTo = to;
    if (!to.includes('@c.us')) {
        formattedTo = `${to.replace('+', '')}@c.us`;
    }

    try {
        logger.info(`📨 Enviando WhatsApp a ${formattedTo}...`);
        await client.sendMessage(formattedTo, body);

        await db.collection('whatsapp_queue').doc(msgId).update({
            status: 'sent',
            sentAt: new Date()
        });
        logger.info(`✅ Mensaje ${msgId} enviado.`);
    } catch (error) {
        logger.error(`❌ Error enviando mensaje ${msgId}: ${error.message}`);
        await db.collection('whatsapp_queue').doc(msgId).update({
            status: 'error',
            error: error.message,
            processedAt: new Date()
        });
    }
};

module.exports = { start };
