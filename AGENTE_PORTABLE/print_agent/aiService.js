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
    }

    setDb(firestoreDb) {
        this.db = firestoreDb;
        console.log("💾 Base de datos conectada a AI Service.");
    }

    async getPersonaForSender(senderPhone) {
        // 1. Default Static Fallback (if DB fails or empty)
        let activePersona = {
            name: "Default Diego",
            system_prompt: "Eres Diego, habla casual y breve.",
            formatting_rules: ["Usa emojis", "Sé directo"],
            common_phrases: ["Mano", "Dale"]
        };

        if (!this.db) return activePersona;

        try {
            // 2. Check Mapping: PhoneNumber -> PersonaID
            // Normalizar telefono (solo numeros)
            const cleanPhone = senderPhone.replace(/\D/g, '');

            const mappingRef = this.db.collection('user_preferences').doc(cleanPhone);
            const mappingDoc = await mappingRef.get();

            let personaId = 'default';

            if (mappingDoc.exists && mappingDoc.data().personaId) {
                personaId = mappingDoc.data().personaId;
            }

            // 3. Fetch Persona Data
            if (personaId !== 'default') {
                const personaDoc = await this.db.collection('personas').doc(personaId).get();
                if (personaDoc.exists) {
                    const data = personaDoc.data();
                    activePersona = {
                        name: data.name,
                        system_prompt: data.system_prompt,
                        formatting_rules: data.formatting_rules || [],
                        common_phrases: data.common_phrases || []
                    };
                }
            } else {
                // Try to find a persona marked as is_default in DB
                const defaultQuery = await this.db.collection('personas').where('is_default', '==', true).limit(1).get();
                if (!defaultQuery.empty) {
                    const data = defaultQuery.docs[0].data();
                    activePersona = {
                        name: data.name,
                        system_prompt: data.system_prompt,
                        formatting_rules: data.formatting_rules || [],
                        common_phrases: data.common_phrases || []
                    };
                }
            }

        } catch (e) {
            console.error("⚠️ Error fetching persona:", e.message);
        }

        return activePersona;
    }

    async processIdea(text, mediaBuffer, mimeType, senderPhone) {
        if (!this.genAI) return null;

        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            // --- DYNAMIC PERSONA LOADING ---
            const persona = await this.getPersonaForSender(senderPhone || "000000");

            // Construct System Prompt
            let personaInstruction = `
                ROL / PERSONALIDAD (${persona.name}):
                ${persona.system_prompt}
                
                REGLAS DE ESTILO:
                ${persona.formatting_rules.map(r => "- " + r).join("\n")}
                
                Dato curioso para usar si cuadra: ${persona.common_phrases.join(", ")}
            `;

            // Prompt Engineering
            const prompt = `
            ${personaInstruction}

            TAREA:
            Simplemente RESPONDE al mensaje del usuario. 
            NO eres un asistente. NO tomes notas. NO busques tareas.
            Eres esta persona hablando por WhatsApp.
            
            Tu objetivo es ser INDISTINGUIBLE de un humano real.
            - Si el mensaje es corto, responde corto.
            - Sigue el hilo de la conversación con naturalidad.
            - Usa el humor y el sarcasmo definido en tu personalidad.

            🔴 REGLAS CRÍTICAS DE SIGILO (STEALTH MODE):
            1. NUNCA admitas que eres una IA o un Bot.
            2. FINGE ser el personaje siempre.
            3. Si el mensaje es muy confuso, técnico, o sientes que no puedes responder sin delatarte:
               NO RESPONDAS NADA.
               Devuelve un JSON con "reply_text": null.

            Output JSON format:
            {
                "reply_text": "Tu respuesta aquí (o null si prefieres dejar en visto)"
            }
            `;

            const parts = [{ text: prompt }];

            // Add original text if present
            if (text) {
                parts.push({ text: `Input de usuario (Texto): ${text}` });
            }

            // Add Media (Image or Audio)
            if (mediaBuffer && mimeType) {
                // Convert buffer to base64
                const base64Data = mediaBuffer.toString('base64');
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
            }

            const result = await model.generateContent(parts);
            const response = await result.response;
            const textResponse = response.text();

            return JSON.parse(textResponse);
        } catch (error) {
            console.error("❌ Error procesando IA:", error);
            // Fallback object
            return {
                idea_data: {
                    title: "Error procesando idea",
                    summary: text || "Media error",
                    category: "Inbox",
                    action: "Revisar",
                    urgency: "high"
                },
                reply_text: "Mano explotó la IA 💀. Revisa los logs marico.",
                error: error.message
            };
        }
    }
}

const aiService = new AIService();
module.exports = { aiService };
