const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

class AIService {
    constructor() {
        this.db = null; // Firestore DB
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY no encontrada en .env");
            this.genAI = null;
        } else {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            console.log("🧠 Servicio de IA (Gemini) Inicializado.");
        }

        // TOOL REGISTRY (Hardcoded implementations for now)
        this.toolRegistry = {
            searchInventory: this.searchInventory.bind(this)
        };
    }

    setDb(firestoreDb) {
        this.db = firestoreDb;
        console.log("💾 Base de datos conectada a AI Service.");
        this.printAuthorizedUsers();
    }

    async printAuthorizedUsers() {
        if (!this.db) return;
        try {
            console.log("\n📋 --- MATRIZ DE USUARIOS AUTORIZADOS ---");
            const snapshot = await this.db.collection('user_mappings').get();
            if (snapshot.empty) {
                console.log("⚠️ No hay usuarios en la Matriz.");
            } else {
                const users = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    users.push({
                        Nombre: data.name || 'Sin Nombre',
                        Telefono: data.phoneNumber || doc.id,
                        Rol: data.role || 'Usuario'
                    });
                });
                console.table(users);
            }
            console.log("------------------------------------------\n");
        } catch (error) {
            console.error("❌ Error listando usuarios:", error.message);
        }
    }

    /**
     * V12: Modular User Config (Persona + Actions)
     */
    async getUserConfig(senderPhone) {
        // Default Configuration
        let config = {
            persona: {
                name: "Default Agent",
                system_prompt: "Eres un asistente útil.",
                formatting_rules: [],
                common_phrases: []
            },
            actions: [] // List of Tool Definitions
        };

        if (!this.db) return config;

        try {
            const cleanPhone = senderPhone.replace(/\D/g, '');
            console.log(`🔍 Buscando configuración para: ${cleanPhone}`);

            // 1. Look up User Matrix
            // We search by ID (phone number) if we set it as Doc ID in UserMatrix, 
            // OR query if field is phoneNumber. UserMatrix sets 'phoneNumber' field, but let's check how we saved it.
            // UserMatrix uses addDoc (auto ID) but stores phoneNumber field.

            const mappingQuery = await this.db.collection('user_mappings')
                .where('phoneNumber', '==', cleanPhone)
                .limit(1)
                .get();

            let personaId = 'default';
            let actionIds = [];

            if (!mappingQuery.empty) {
                const mapData = mappingQuery.docs[0].data();
                personaId = mapData.personaId;
                actionIds = mapData.actionIds || [];
                console.log(`✅ Usuario encontrado: ${mapData.name} -> Persona: ${personaId}, Actions: ${actionIds.length}`);
            } else {
                console.log("⚠️ Usuario no mapeado. Usando defaults.");
                // Try legacy lookup
                const oldPref = await this.db.collection('user_preferences').doc(cleanPhone).get();
                if (oldPref.exists) personaId = oldPref.data().personaId;
            }

            // 2. Fetch Persona
            if (personaId && personaId !== 'default') {
                const pDoc = await this.db.collection('personas').doc(personaId).get();
                if (pDoc.exists) {
                    config.persona = pDoc.data();
                }
            } else {
                // Fetch Global Default
                const defQ = await this.db.collection('personas').where('is_default', '==', true).limit(1).get();
                if (!defQ.empty) config.persona = defQ.docs[0].data();
            }

            // 3. Fetch Actions
            if (actionIds.length > 0) {
                // Firestore 'in' query supports up to 10 items. Safest to fetch all actions or fetch individually.
                // Since this runs locally, let's fetch all active actions globally for cache or just query 'in' if small.
                // Let's do simple Promise.all
                const actionDocs = await Promise.all(actionIds.map(id => this.db.collection('actions').doc(id).get()));

                config.actions = actionDocs
                    .filter(d => d.exists && d.data().enabled)
                    .map(d => {
                        const data = d.data();
                        return {
                            name: data.trigger, // function name
                            description: data.description,
                            parameters: JSON.parse(data.schema || '{}') // Ensure valid JSON Schema
                        };
                    });
            }

        } catch (e) {
            console.error("⚠️ Error loading user config:", e);
        }

        return config;
    }

    /**
     * Checks if the user is authorized in the App (User Matrix)
     */
    async isUserAllowed(phone) {
        if (!this.db) return false;
        try {
            const cleanPhone = phone.replace(/\D/g, '');
            console.log(`🔍 [AUTH CHECK] Validando acceso para: ${cleanPhone}...`);

            // 1. Check User Matrix (The Source of Truth)
            const mappingQuery = await this.db.collection('user_mappings')
                .where('phoneNumber', '==', cleanPhone)
                .limit(1)
                .get();

            if (!mappingQuery.empty) {
                const userData = mappingQuery.docs[0].data();
                console.log(`✅ [AUTH SUCCESS] Usuario encontrado en Matrix: ${userData.name || 'Sin Nombre'}`);
                return true;
            }

            // 2. Fallback: Check Legacy Preferences
            const oldPref = await this.db.collection('user_preferences').doc(cleanPhone).get();
            if (oldPref.exists) {
                console.log(`✅ [AUTH SUCCESS] Usuario encontrado en Legacy Prefs.`);
                return true;
            }

            // 3. Last Resort: Check Super Admin
            const adminNumbers = (process.env.ADMIN_NUMBER || "").split(',').map(n => n.trim());
            if (adminNumbers.includes(cleanPhone)) {
                console.log(`✅ [AUTH SUCCESS] Usuario es SUPER ADMIN (.env).`);
                return true;
            }

            console.log(`⛔ [AUTH FAILED] Usuario ${cleanPhone} no existe en la Matriz.`);
            return false;

        } catch (e) {
            console.error("Error checking auth:", e);
            return false;
        }
    }

    // --- TOOL IMPLEMENTATIONS ---
    async searchInventory(criteria) {
        if (!this.db) return [];
        console.log("📦 EJECUTANDO TOOL: Inventory Search", criteria);

        try {
            const snapshot = await this.db.collection('tickets')
                .where('status', '!=', 'sold')
                .limit(100)
                .get();

            let matches = snapshot.docs.map(doc => {
                const d = doc.data();

                // Robust Field Extraction
                const cpu = d.additionalInfo?.cpuBrand || d.cpuBrand || '';
                const gen = d.additionalInfo?.cpuGen || d.cpuGen || '';
                const ram = (d.ram?.detalles || []).join(' + ') || d.additionalInfo?.ram || '?';
                const disk = (d.disco?.detalles || []).join(' + ') || d.additionalInfo?.disco || '?';
                const gpu = d.additionalInfo?.gpuModel || d.gpuModel || d.additionalInfo?.gpu || 'Integrada';
                const vram = d.additionalInfo?.vram ? `(${d.additionalInfo.vram})` : '';

                const specs = `CPU: ${cpu} ${gen} | RAM: ${ram} | DISCO: ${disk} | GPU: ${gpu} ${vram}`;
                const title = `${d.marca} ${d.modelo}`;

                return {
                    id: doc.id,
                    title: title,
                    specs: specs,
                    price: d.precioVenta || (d.precioCompra ? Math.round(d.precioCompra * 1.35) : 0),
                    searchStr: `${title} ${specs} ${d.additionalInfo?.serialNumber || ''}`.toLowerCase()
                };
            });

            if (criteria.query) {
                const q = criteria.query.toLowerCase();
                matches = matches.filter(m => m.searchStr.includes(q));
            }

            if (criteria.maxPrice) {
                matches = matches.filter(m => m.price <= criteria.maxPrice);
            }

            return matches.slice(0, 5).map(m => ({
                title: m.title,
                specs: m.specs,
                price: m.price
            })); // Clean output for LLM

        } catch (e) {
            console.error("Error searching inventory:", e);
            return [{ error: "Error de base de datos al buscar inventario." }];
        }
    }

    /**
     * COMMAND SYSTEM - Handle "/" commands
     */
    async handleCommand(text, senderPhone) {
        const parts = text.slice(1).trim().split(' '); // Remove "/" and split
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        console.log(`🎮 [COMANDO] "${command}" ejecutado por ${senderPhone}`);

        try {
            switch (command) {
                case 'reset':
                    return await this.commandReset(senderPhone);

                case 'rasgolist':
                case 'rasgos':
                    return await this.commandRasgoList(senderPhone);

                case 'help':
                case 'ayuda':
                    return this.commandHelp();

                default:
                    return `❌ Comando desconocido: "/${command}"\n\nUsa /help para ver comandos disponibles.`;
            }
        } catch (e) {
            console.error(`Error ejecutando comando /${command}:`, e);
            return `⚠️ Error al ejecutar /${command}: ${e.message}`;
        }
    }

    /**
     * /reset - Clear conversation history
     */
    async commandReset(senderPhone) {
        // Reset is handled by creating a new chat session
        // For WhatsApp, we don't store session state, so just confirm
        return `🔄 *Conversación reiniciada*\n\nHistorial borrado. Empecemos de nuevo.`;
    }

    /**
     * /RasgoList - Show active/inactive traits
     */
    async commandRasgoList(senderPhone) {
        const userConfig = await this.getUserConfig(senderPhone);
        const { persona } = userConfig;

        if (!persona || !persona.traits || persona.traits.length === 0) {
            return `📋 *Rasgos Psicológicos*\n\n⚠️ No hay rasgos configurados para esta identidad.`;
        }

        // Format active traits
        const traitsList = persona.traits.map((t, i) => `${i + 1}. ✅ ${t}`).join('\n');

        return `📋 *Rasgos Psicológicos Activos*\n\n${traitsList}\n\n_Total: ${persona.traits.length} rasgos_`;
    }

    /**
     * /help - Show available commands
     */
    commandHelp() {
        return `🎮 *Comandos Disponibles*\n\n` +
            `*Gestión:*\n` +
            `/reset - Reiniciar conversación\n` +
            `/RasgoList - Ver rasgos activos\n` +
            `/help - Mostrar esta ayuda\n\n` +
            `_Escribe el comando con "/" para ejecutarlo_`;
    }

    // --- MAIN PROCESSOR ---
    async processIdea(text, mediaBuffer, mimeType, senderPhone) {
        if (!this.genAI) return null;

        // 0. COMMAND SYSTEM - Intercept "/" commands before AI
        if (text.trim().startsWith('/')) {
            return await this.handleCommand(text.trim(), senderPhone);
        }

        // 1. Load User Context
        const userConfig = await this.getUserConfig(senderPhone);
        const { persona, actions } = userConfig;

        try {
            // 2. Prepare Tools
            // Map actions definitions to Gemini Tool Format
            let toolsConfig = [];
            if (actions.length > 0) {
                toolsConfig = [{
                    functionDeclarations: actions.map(a => ({
                        name: a.name,
                        description: a.description,
                        parameters: {
                            type: "OBJECT",
                            properties: a.parameters.properties || {},
                            required: a.parameters.required || []
                        }
                    }))
                }];
                console.log(`🛠️ Herramientas activas para este chat: ${actions.map(a => a.name).join(', ')}`);
            }

            // 3. Initialize Model (Hybrid Strategy - User Controlled)
            // 3. Initialize Model (Hybrid Strategy - User Controlled)
            // Using Gemini 2.0 Flash (aka "2.5") and Gemini 2.0 Pro (aka "3.0")
            const FLASH_MODEL = "gemini-2.0-flash-exp";
            const PRO_MODEL = "gemini-2.0-pro-exp-02-05";


            // Get User Preference (Default 30% if not set)
            const intelligenceLevel = (persona.intelligence_level !== undefined) ? persona.intelligence_level : 30;

            // Heuristic A: Critical Complexity (Force Pro unless level is near zero)
            const isCritical = (text) => {
                if (!text) return false;
                const len = text.length;
                const complexKeywords = ["analiza", "crea", "plan", "lista", "resumen", "explica", "por qué", "estrategia", "código", "diferencia", "ayuda con"];
                const hasKeyword = complexKeywords.some(k => text.toLowerCase().includes(k));
                return len > 200 || hasKeyword;
            };

            const isCriticalInput = isCritical(text);
            const randomChance = Math.random() * 100;

            // DECISION LOGIC:
            // 1. Critical Input + Level > 10 -> Force PRO (Safety net for functionality)
            // 2. Random Chance < Level -> Use PRO (User defined sensitivity/budget)
            // 3. Else -> FLASH
            let selectedModelName = FLASH_MODEL;
            let reason = "Economy Mode";

            if (isCriticalInput && intelligenceLevel > 10) {
                selectedModelName = PRO_MODEL;
                reason = "Critical Complexity";
            } else if (randomChance < intelligenceLevel) {
                selectedModelName = PRO_MODEL;
                reason = `User Sensitivity (${intelligenceLevel}%)`;
            }

            console.log(`🧠 AI Router: [${selectedModelName}] selected. | Reason: ${reason} | Level: ${intelligenceLevel}%`);

            const model = this.genAI.getGenerativeModel({
                model: selectedModelName,
                tools: toolsConfig.length > 0 ? toolsConfig : undefined,
                // Create a system prompt that includes Persona + Tool Instructions
                systemInstruction: {
                    parts: [{
                        text: `
                        IDENTITY (OVERRIDES):
                        Nombre: CRIDA
                        Rol: Asistente Ejecutiva de Criterio Digital (y tu mano derecha).
                        Idioma: ESPAÑOL (Siempre, salvo que te hablen en otro idioma).
                        Personalidad: ${persona.base_mood || "Amable, eficiente, profesional pero cercana (chilena/latina)"}.
                        
                        CONTEXTO:
                        ${persona.system_prompt || "Eres Crida, la IA central de Criterio Digital. Ayudas a gestionar el taller, inventario y ventas. Responde corto y al pie."}

                        FORMATTING RULES:
                        ${(persona.formatting_rules || []).join('\n')}
                        - Usa emojis ocasionalmente 🚀.
                        - No seas robótica. Habla como una compañera de equipo.
                        - Si no sabes algo, pregunta.

                        AVAILABLE TOOLS:
                        ${actions.length > 0 ? "You have access to tools. USE THEM when explicitly requested or needed to answer." : "No tools available."}
                        
                        RESPONSE FORMAT:
                        Return ONLY a raw JSON object with this structure:
                        { "reply_text": "TU_RESPUESTA_EN_ESPAÑOL" }
                    ` }],
                    role: "system"
                },
                generationConfig: { responseMimeType: "application/json" }
            });

            // 4. Chat Session
            const chat = model.startChat({ history: [] });

            // Prepare Input
            const userParts = [{ text: text || "..." }];
            if (mediaBuffer && mimeType) {
                userParts.push({ inlineData: { mimeType: mimeType, data: mediaBuffer.toString('base64') } });
            }

            console.log("📤 Sending to AI...");
            const result = await chat.sendMessage(userParts);
            const response = await result.response;

            // 5. Handle Tool Calls
            // Gemini 1.5/2.0 returns functionCalls in the response candidates
            const calls = response.functionCalls();

            if (calls && calls.length > 0) {
                const call = calls[0];
                console.log(`📞 AI wants to call: ${call.name} with args:`, call.args);

                if (this.toolRegistry[call.name]) {
                    // Execute
                    const toolResult = await this.toolRegistry[call.name](call.args);

                    // Feed back
                    console.log("📥 Feeding back tool result...");
                    const nextResult = await chat.sendMessage([{
                        functionResponse: {
                            name: call.name,
                            response: { result: toolResult }
                        }
                    }]);

                    const finalResp = await nextResult.response;
                    const finalJson = JSON.parse(finalResp.text());
                    return finalJson;
                } else {
                    console.warn(`⚠️ Tool ${call.name} not found in Local Registry.`);
                    return { reply_text: "Intente usar una herramienta que no tengo instalada." };
                }
            }

            // No Tool Call
            return JSON.parse(response.text());

        } catch (error) {
            console.error("❌ Error critical AI:", error);
            return { reply_text: null, error: error.message };
        }
    }
}

const aiService = new AIService();
module.exports = { aiService };
