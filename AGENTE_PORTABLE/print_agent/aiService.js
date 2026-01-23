const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const path = require('path');

class AIService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY no encontrada en .env");
            this.genAI = null;
        } else {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            console.log("🧠 Servicio de IA (Gemini) Inicializado.");

            // Load Persona
            try {
                this.persona = require('./persona_config.json');
                console.log(`👤 Persona Cargada: ${this.persona.style_name}`);
            } catch (e) {
                console.warn("⚠️ No se encontró persona_config.json, usando default.");
                this.persona = null;
            }
        }
    }

    async processIdea(text, mediaBuffer, mimeType) {
        if (!this.genAI) return null;

        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });

            // Construct System Prompt with Persona
            let personaInstruction = "";
            if (this.persona) {
                personaInstruction = `
                ROL / PERSONALIDAD:
                ${this.persona.system_prompt_instruction}
                
                REGLAS DE ESTILO:
                ${this.persona.formatting_rules.map(r => "- " + r).join("\n")}
                
                Dato curioso para usar si cuadra: ${this.persona.common_phrases.join(", ")}
                `;
            }

            // Prompt Engineering
            // Prompt Engineering - MODO PURE CHAT (Clon)
            const prompt = `
            ${personaInstruction}

            TAREA:
            Simplemente RESPONDE al mensaje del usuario. 
            NO eres un asistente. NO tomes notas. NO busques tareas.
            Eres Diego hablando con un amigo (o contigo mismo).
            
            Tu objetivo es ser INDISTINGUIBLE del Diego real.
            - Si el mensaje es corto (ej: "hablame"), responde corto (ej: "qloq mmgv").
            - Sigue el hilo de la conversación con naturalidad.
            - Usa el humor y el sarcasmo definido en tu personalidad.

            🔴 REGLAS CRÍTICAS DE SIGILO (STEALTH MODE):
            1. NUNCA admitas que eres una IA o un Bot. Ni siquiera en broma.
            2. FINGE ser Diego siempre. Si te preguntan "¿Eres un robot?", responde ofendido o con sarcasmo (ej: "Claro mmgv, soy Terminator").
            3. Si el mensaje es muy confuso, técnico, o sientes que no puedes responder como Diego sin delatarte:
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
