const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { aiService } = require('./aiService');

let client;
let db;
let logger;
let isReady = false;

const start = (firestoreDb, appLogger) => {
    db = firestoreDb;
    logger = appLogger;

    // Inject DB into AI Service
    aiService.setDb(db);

    logger.info("📱 Iniciando Servicio WhatsApp (MODO DEBUG: VISUAL)...");

    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: false, // <--- VISIBLE BROWSER
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

    // --- DEBUG LISTENERS ---
    client.on('loading_screen', (percent, message) => {
        console.log('⏳ [DEBUG] Carga WhatsApp:', percent, message);
    });

    client.on('change_state', state => {
        console.log('🔄 [DEBUG] Estado cambiado:', state);
    });

    client.on('authenticated', () => {
        console.log('🔐 [DEBUG] Autenticado correctamente.');
    });

    // --- AI LISTENER (Idea Bot) ---
    // [LOOP GUARD] Cache of bot-generated message IDs to prevent self-reply loops
    const botMessageIds = new Set();

    // Clean up old IDs periodically
    setInterval(() => {
        if (botMessageIds.size > 1000) botMessageIds.clear(); // Simple flush
        // HEARTBEAT VISIBLE
        // console.log(`💓 [HEARTBEAT] Bot activo. Memoria de IDs: ${botMessageIds.size}`);
    }, 10000);

    const handleIncomingMessage = async (msg) => {
        // LOGUEO ABSOLUTO DE TODO
        console.log(`📨 [RAW_EVENT] Type: ${msg.type} | From: ${msg.from} | To: ${msg.to} | Me: ${msg.fromMe} | Body: "${msg.body.substring(0, 50)}..."`);

        try {
            // 1. Loop Guard: Ignore messages sent by the bot itself
            if (botMessageIds.has(msg.id.id)) {
                // console.log("🔄 Ignorando mensaje propio (Cache Loop)");
                return;
            }

            // 2. Ignore status updates / broadcast
            if (msg.id.remote.includes('status') || msg.id.remote.includes('broadcast')) return;

            // [SECURITY] DYNAMIC WHITELIST CHECK (App Controlled)
            const sender = msg.from.replace(/\D/g, ''); // Extract digits only
            const isAllowed = await aiService.isUserAllowed(sender);

            if (!isAllowed) {
                // Determine if we should reply with "Unauthorized" or stay silent.
                // For now, silent (anti-spam).
                // console.log(`⛔ [BLOCKED] Sender ${sender} not in User Matrix.`);
                return;
            }

            logger.info(`📨 [PROCESANDO AI] Mensaje de: ${msg.from}`);

            let text = msg.body;
            let mediaBuffer = null;
            let mimeType = null;

            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        mediaBuffer = Buffer.from(media.data, 'base64');
                        mimeType = media.mimetype;
                        logger.info(`📎 Media detectado: ${mimeType}`);
                    }
                } catch (mediaErr) {
                    logger.error(`Error downloading media: ${mediaErr.message}`);
                }
            }

            // Only process if there is text or media
            if (!text && !mediaBuffer) {
                console.log("⚠️ Mensaje vacío o sin contenido procesable.");
                return;
            }

            const analysis = await aiService.processIdea(text, mediaBuffer, mimeType, msg.from);

            if (analysis) {
                const idea = analysis.idea_data || analysis;
                const replyText = analysis.reply_text;

                // SILENT MODE CHECK
                if (!replyText) {
                    logger.info("🤫 Modo Sigilo: IA decidió no responder.");
                    return;
                }

                // Reply with Persona AND TRACK ID
                // Usamos msg.reply y guardamos el ID
                const sentReply = await msg.reply(replyText);
                if (sentReply && sentReply.id) {
                    botMessageIds.add(sentReply.id.id);
                    logger.info(`🤖 Respuesta enviada (ID: ${sentReply.id.id})`);
                }
            }

        } catch (err) {
            logger.error(`Error AI Process: ${err.message}`);
            console.error("❌ ERROR CRITICO EN HANDLER:", err);
        }
    };

    // Usamos message_create para escuchar TODO (entrante y saliente)
    client.on('message_create', handleIncomingMessage);

    client.on('auth_failure', (msg) => {
        logger.error(`❌ Error de autenticación WhatsApp: ${msg}`);
    });

    client.on('disconnected', (reason) => {
        isReady = false;
        logger.warn(`⚠️ Cliente WhatsApp desconectado: ${reason}`);
    });

    client.on('message_ack', (msg, ack) => {
        // 1=Server, 2=Device, 3=Read
        console.log(`✓ ACK Update: ${msg.id.id} -> ${ack}`);
    });

    // --- REMOTE KILL SWITCH (AUTOPILOT) ---
    // Escucha comandos de reinicio desde la web
    db.collection('system').doc('agent_commands').onSnapshot(async (doc) => {
        if (doc.exists) {
            const cmd = doc.data();
            if (cmd.restart === true) {
                logger.warn("♻️ COMANDO DE REINICIO RECIBIDO. Apagando para actualizar...");
                try {
                    await db.collection('system').doc('agent_commands').update({ restart: false });
                    logger.info("✅ Flag de reinicio reseteada. Saliendo...");
                    // Give it a tiny buffer to flush logs
                    setTimeout(() => process.exit(0), 500);
                } catch (e) {
                    logger.error("Error reseteando flag:", e);
                    process.exit(1);
                }
            }
        }
    });

    client.initialize();
};

const startQueueListener = () => {
    logger.info("🎧 Escuchando cola de mensajes de WhatsApp (Queue)...");

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
    // SOPORTE HIBRIDO: 'body' (Backend) o 'message' (Frontend)
    const to = data.to;
    const body = data.body || data.message || "⚠️ Contenido vacío";

    try {
        const numericPhone = to.replace(/\D/g, '');
        let finalId = `${numericPhone}@c.us`;

        logger.info(`🔍 [QUEUE] Enviando mensaje a: ${numericPhone}...`);

        let targetId = finalId;
        try {
            const contact = await client.getNumberId(finalId);
            if (contact && contact._serialized) {
                targetId = contact._serialized;
            } else {
                logger.warn(`⚠️ Número no registrado (probando envío directo)...`);
            }
        } catch (e) {
            logger.warn(`⚠️ Error verificando número, enviando directo.`);
        }

        let sentMsg;
        if (data.media && data.media.data) {
            const media = new MessageMedia(data.media.mimetype, data.media.data, data.media.filename);
            sentMsg = await client.sendMessage(targetId, media, { caption: body });
        } else {
            sentMsg = await client.sendMessage(targetId, body);
        }

        await db.collection('whatsapp_queue').doc(msgId).update({
            status: 'sent',
            sentAt: new Date(),
            debug_ack: sentMsg.ack
        });
        logger.info(`✅ [QUEUE] Mensaje enviado.`);

    } catch (error) {
        logger.error(`❌ Error enviando mensaje ${msgId}: ${error.message}`);

        if (error.message.includes('detached Frame') || error.message.includes('Protocol error')) {
            logger.error("💀 Error crítico del navegador. Reiniciando...");
            process.exit(1);
        }

        await db.collection('whatsapp_queue').doc(msgId).update({
            status: 'error',
            error: error.message,
            processedAt: new Date()
        });
    }
};

module.exports = { start };
