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

    try {
        // 1. Sanitization: Remove ALL non-numeric characters (spaces, +, -, etc)
        const numericPhone = to.replace(/\D/g, '');
        let finalId = `${numericPhone}@c.us`;

        logger.info(`🔍 Buscando usuario real para: ${numericPhone}...`);

        // 2. Resolve the correct WhatsApp ID (Handles legacy formats if needed)
        // This ensures the number is actually registered
        let targetId = finalId;
        try {
            const contact = await client.getNumberId(finalId);
            if (contact && contact._serialized) {
                targetId = contact._serialized;
                logger.info(`🎯 Usuario encontrado: ${targetId}`);
            } else {
                logger.warn(`⚠️ El número ${numericPhone} no parece estar registrado. Intentando envío directo...`);
            }
        } catch (e) {
            logger.warn(`⚠️ No se pudo verificar el número (posible error de red), intentando directo.`);
        }

        logger.info(`📨 Enviando WhatsApp a ${targetId}...`);
        await client.sendMessage(targetId, body);

        await db.collection('whatsapp_queue').doc(msgId).update({
            status: 'sent',
            sentAt: new Date(),
            debug_target: targetId // Guardamos a quién se envió realmente
        });
        logger.info(`✅ Mensaje ${msgId} enviado correctamente.`);

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
