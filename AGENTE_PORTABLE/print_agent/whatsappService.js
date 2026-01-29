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

    logger.info("📱 Iniciando Servicio WhatsApp (MODO VISUAL FORZADO v3)...");

    client = new Client({
        // NEW STRATEGY: Session Rotation (No manual delete)
        authStrategy: new LocalAuth({ clientId: "print_agent_new" }),

        puppeteer: {
            headless: false,
            bypassCSP: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--shm-size=1gb'
            ]
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

        // VERIFY MATRIX USERS (User Request)
        verifyMatrixUsers(db, client);
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

    // --- RAW DEBUGGER & FALLBACK TRIGGER ---
    client.on('message_create', async (msg) => {
        console.log(`👂 [RAW] ${msg.from}: ${msg.body.substring(0, 10)}... (Type: ${msg.type})`);

        // WAR FORCE: If 'message' event is dead, we use this as backup
        if (!msg.fromMe) {
            console.log("⚡ [FALLBACK TRIGGER] Usando message_create para procesar mensaje entrante...");
            await handleIncomingMessage(msg);
        }
    });

    // HANDLER FOR INCOMING MESSAGES ONLY
    const handleIncomingMessage = async (msg) => {

        const fromNumber = msg.from.replace(/\D/g, '');
        console.log(`🔔 [EVENTO RECEIVED] De: ${fromNumber} | Tipo: ${msg.type} | Body: "${msg.body.substring(0, 30)}..."`);

        try {
            // 1. Loop Guard: Ignore messages sent by the bot itself (Redundant with 'message' event but safe)
            if (msg.fromMe) return;

            // 2. Ignore status updates / broadcast
            if (msg.type === 'e2e_notification' || msg.id.remote === 'status@broadcast') return;

            // [SECURITY] DYNAMIC WHITELIST CHECK (App Controlled)
            const sender = fromNumber;
            const isAllowed = await aiService.isUserAllowed(sender);

            if (!isAllowed) {
                console.log(`⛔ [BLOCKED] Usuario ${sender} no autorizado en Matrix.`);
                // OPTIONAL: Reply "Access Denied" if you want strict feedback
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

    // client.on('message', handleIncomingMessage); // DISABLED (Moved to message_create fallback)

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

    // --- REMOTE KILL SWITCH & REPAIR ---
    // Escucha comandos de reinicio desde la web
    db.collection('system').doc('agent_commands').onSnapshot(async (doc) => {
        if (doc.exists) {
            const cmd = doc.data();

            // RESTART
            if (cmd.restart === true) {
                logger.warn("♻️ COMANDO DE REINICIO RECIBIDO. Apagando para actualizar...");
                try {
                    await db.collection('system').doc('agent_commands').update({ restart: false });
                    setTimeout(() => process.exit(0), 500);
                } catch (e) { process.exit(1); }
            }

            // NUCLEAR RESET (Delete Session)
            if (cmd.nuke_session === true) {
                logger.warn("☢️ COMANDO NUCLEAR RECIBIDO. Borrando sesión de WhatsApp...");
                const fs = require('fs');
                const path = require('path');
                try {
                    const authPath = path.join(__dirname, '.wwebjs_auth');
                    const cachePath = path.join(__dirname, '.wwebjs_cache');

                    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
                    if (fs.existsSync(cachePath)) fs.rmSync(cachePath, { recursive: true, force: true });

                    logger.info("✅ Sesión borrada. Reiniciando para solicitar QR nuevo...");
                    await db.collection('system').doc('agent_commands').update({ nuke_session: false });

                    setTimeout(() => process.exit(0), 1000);
                } catch (e) {
                    logger.error("❌ Error borrando sesión:", e);
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

const verifyMatrixUsers = async (db, client) => {
    if (!db) return;
    try {
        console.log("\n🕵️ --- VERIFICANDO USUARIOS EN WHATSAPP ---");
        const snapshot = await db.collection('user_mappings').get();
        if (snapshot.empty) {
            console.log("⚠️ No hay usuarios en la Matriz para verificar.");
        } else {
            const results = [];

            // Process in parallel
            const checks = snapshot.docs.map(async (doc) => {
                const data = doc.data();
                const phone = data.phoneNumber || doc.id;
                const cleanPhone = phone.replace(/\D/g, '');

                let waStatus = "❓";
                try {
                    // Check registration on WhatsApp
                    // Suffix @c.us is for standard chats
                    const registered = await client.getNumberId(cleanPhone); // Returns { _serialized: '...', user: '...' } or null
                    waStatus = registered ? "✅ REGISTRADO" : "❌ NO EXISTE";
                } catch (e) {
                    waStatus = "⚠️ ERROR CHECK";
                }

                return {
                    Nombre: data.name || 'Sin Nombre',
                    Telefono: cleanPhone,
                    Estado_WA: waStatus
                };
            });

            const finalResults = await Promise.all(checks);
            console.table(finalResults);
        }
        console.log("------------------------------------------\n");
    } catch (error) {
        console.error("❌ Error verificando usuarios:", error.message);
    }
};

module.exports = { start };
