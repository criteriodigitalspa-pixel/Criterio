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
            headless: false, // Visual Debugging Enabled
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

    client.on('message_ack', (msg, ack) => {
        logger.info(`🔄 Actualización ACK para mensaje ${msg.id.id}: ${ack}`);
        // 1=Server, 2=Device, 3=Read
    });

    // --- REMOTE KILL SWITCH (AUTOPILOT) ---
    // Escucha comandos de reinicio desde la web
    db.collection('system').doc('agent_commands').onSnapshot((doc) => {
        if (doc.exists) {
            const cmd = doc.data();
            if (cmd.restart === true) {
                logger.warn("♻️ COMANDO DE REINICIO RECIBIDO. Apagando para actualizar...");
                // Reseteamos el flag para no buclear infinito (opcional)
                db.collection('system').doc('agent_commands').update({ restart: false });

                // Matamos el proceso. El script .bat lo volverá a encender.
                process.exit(0);
            }
        }
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
    logger.info(`📦 PAYLOAD RECIBIDO: ${JSON.stringify(data)}`); // DEBUG SUPREMO

    // SOPORTE HIBRIDO: 'body' (Backend) o 'message' (Frontend)
    const to = data.to;
    // IMPORTANTE: El frontend manda 'message', el backend 'body'. Aceptamos ambos.
    const body = data.body || data.message || "⚠️ Contenido vacío";

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

        const sentMsg = await client.sendMessage(targetId, body);

        // Log the internal Acknowledgement status from WhatsApp
        // 0: Pending, 1: Server Ack, 2: Delivery Ack, 3: Read
        logger.info(`📝 Estado ACK inicial: ${sentMsg.ack} (ID: ${sentMsg.id._serialized})`);

        await db.collection('whatsapp_queue').doc(msgId).update({
            status: 'sent',
            sentAt: new Date(),
            debug_target: targetId,
            debug_ack: sentMsg.ack
        });
        logger.info(`✅ Mensaje enviado (Ack: ${sentMsg.ack}).`);

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
