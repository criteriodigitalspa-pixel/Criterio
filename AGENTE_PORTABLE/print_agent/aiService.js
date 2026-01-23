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

    // --- INVENTORY TOOL ---
    async searchInventory(criteria) {
        if (!this.db) return [];
        console.log("📦 AI Buscando en Inventario:", criteria);

        try {
            // Basic query: "Active" tickets (not sold)
            // Assuming 'status' != 'sold' (or check done col? For now, fetch all 'todo' if possible, or just fetch all and filter)
            // Kanban usually uses collections or status field. Let's assume 'tickets' root collection.
            const snapshot = await this.db.collection('tickets')
                .where('status', '!=', 'sold') // Basic filter
                .limit(50) // Don't fetch everything
                .get();

            let matches = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    title: `${d.marca} ${d.modelo} (${d.cpuBrand} ${d.cpuGen})`,
                    specs: `RAM: ${d.ram?.detalles?.join('+') || '?'} | DISCO: ${d.disco?.detalles?.join('+') || '?'} | GPU: ${d.additionalInfo?.gpu || 'Integrada'}`,
                    price: d.precioVenta || (d.precioCompra * 1.3), // Fallback margin if sale price not set
                    status: d.status
                };
            });

            // Local Fuzzy Search (RAG-lite)
            // Filter matches based on criteria keywords
            if (criteria.query) {
                const q = criteria.query.toLowerCase();
                matches = matches.filter(m =>
                    m.title.toLowerCase().includes(q) ||
                    m.specs.toLowerCase().includes(q)
                );
            }

            if (criteria.maxPrice) {
                matches = matches.filter(m => m.price <= criteria.maxPrice);
            }

            return matches.slice(0, 5); // Return top 5 relevant

        } catch (e) {
            console.error("Error searching inventory:", e);
            return [];
        }
    }

    async processIdea(text, mediaBuffer, mimeType, senderPhone) {
        if (!this.genAI) return null;

        try {
            // --- TOOLS DEFINITION ---
            const inventoryTool = {
                functionDeclarations: [
                    {
                        name: "searchInventory",
                        description: "Buscar computadores en el inventario disponible. Úsalo cuando pregunten por precios, modelos o características.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                query: { type: "STRING", description: "Palabras clave del producto (ej: 'notebook gamer', 'hp ryzen', 'macbook')." },
                                maxPrice: { type: "NUMBER", description: "Presupuesto máximo del cliente (si lo menciona)." }
                            },
                        }
                    }
                ]
            };

            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash", // Ensure this model supports tools, else use gemini-pro or 1.5-flash
                tools: [inventoryTool],
                generationConfig: { responseMimeType: "application/json" } // JSON Mode with Tools? Be careful.
                // Gemini 1.5 Flash supports strict JSON mode AND tools, but sometimes it's tricky.
                // Converting response to text loop manually is safer.
            });

            // For tool calling to work reliably, we might need to drop strict JSON mode for the *first* turn
            // or handle the tool call response structure.
            // Let's stick to standard flow: 
            // 1. Generate (might call tool)
            // 2. If functionCall, execute and re-generate.

            // --- DYNAMIC PERSONA LOADING ---
            const persona = await this.getPersonaForSender(senderPhone || "000000");

            // Construct System Prompt
            let personaInstruction = `
                ROL / PERSONALIDAD (${persona.name}):
                ${persona.system_prompt}
                
                REGLAS DE ESTILO:
                ${persona.formatting_rules.map(r => "- " + r).join("\n")}
                
                Dato curioso: ${persona.common_phrases.join(", ")}
            `;

            const prompt = `
            ${personaInstruction}

            CONTEXTO TÉCNICO:
            Tienes acceso al inventario en tiempo real usando la herramienta 'searchInventory'.
            SIEMPRE que pregunten "¿tienes...?", "¿cuánto vale...?", "busco...", USA LA HERRAMIENTA.
            
            TAREA:
            Responde al usuario. Si usas la herramienta, incorpora los resultados en tu respuesta con tu tono de vendedor.
            Si no hay resultados, ofrece alternativas o di que revisas bodega.
            
            Output JSON format (FINAL):
            {
                "reply_text": "Respuesta final al usuario"
            }
            `;

            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: prompt }] }
                ]
            });

            // Send User Message
            const userParts = [{ text: text || "..." }];
            if (mediaBuffer && mimeType) {
                const base64Data = mediaBuffer.toString('base64');
                userParts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
            }

            const result = await chat.sendMessage(userParts);
            const response = await result.response;

            // Handle Function Call
            const calls = response.functionCalls();
            if (calls && calls.length > 0) {
                const call = calls[0];
                if (call.name === "searchInventory") {
                    const apiResponse = await this.searchInventory(call.args);

                    // Feed back to model
                    const toolResult = await chat.sendMessage([
                        {
                            functionResponse: {
                                name: "searchInventory",
                                response: { products: apiResponse }
                            }
                        }
                    ]);

                    const finalResponse = await toolResult.response;
                    return JSON.parse(finalResponse.text());
                }
            }

            // Normal Text Response (No tool used)
            return JSON.parse(response.text());

        } catch (error) {
            console.error("❌ Error procesando IA:", error);
            return {
                reply_text: "Mano, me marié buscando eso. Pregúntame de nuevo.",
                error: error.message
            };
        }
    }
}

const aiService = new AIService();
module.exports = { aiService };
