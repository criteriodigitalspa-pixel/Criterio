/**
 * AI Service for generating content using Google Vertex AI (Firebase)
 * ADAPTED: Uses underlying getAI() pattern since getVertexAI alias is missing in installed lib.
 */

import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import app from "./firebase"; // Import the initialized Firebase App

// Initialize Vertex AI
// We use the direct "getAI" method with VertexAIBackend backend strategy.
let model = null;

try {
    const ai = getAI(app, { backend: new VertexAIBackend() });
    model = getGenerativeModel(ai, { model: "gemini-2.5-flash-lite" });
    console.log("Vertex AI Initialized via getAI()");
} catch (e) {
    console.error("Vertex AI Init Error:", e);
}

// --- Intelligent Helpers ---

function formatHardware(hw) {
    if (!hw) return null;
    if (typeof hw === 'string') return hw;
    if (hw.detalles && Array.isArray(hw.detalles)) {
        const parts = hw.detalles.filter(Boolean);
        if (parts.length === 0) return null;
        return parts.join(' + ');
    }
    return null;
}

function getHardwareTier(ticket) {
    const ramStr = JSON.stringify(ticket.ram || '').toLowerCase();
    const gpuStr = (ticket.gpuBrand || '').toLowerCase();
    const cpuStr = (ticket.cpuBrand || '').toLowerCase();

    let ramGB = 0;
    const ramMatches = ramStr.match(/(\d+)gb/g);
    if (ramMatches) {
        ramMatches.forEach(m => ramGB += parseInt(m));
    } else {
        if (ramStr.includes('4gb')) ramGB = 4;
        if (ramStr.includes('8gb')) ramGB = 8;
        if (ramStr.includes('16gb')) ramGB = 16;
        if (ramStr.includes('32gb')) ramGB = 32;
    }

    if (gpuStr.includes('nvidia') || gpuStr.includes('rtx') || gpuStr.includes('gtx') || gpuStr.includes('radeon') && !gpuStr.includes('vega')) {
        return { id: 'GAMER', name: 'Gamer & Creator Pro' };
    }
    if (ramGB >= 16 || cpuStr.includes('i7') || cpuStr.includes('ryzen 7') || cpuStr.includes('i9')) {
        return { id: 'PRO', name: 'Profesional Multitarea' };
    }
    if (ramGB >= 8 || cpuStr.includes('i5') || cpuStr.includes('ryzen 5')) {
        return { id: 'MID', name: 'Negocios & Universidad' };
    }
    return { id: 'ENTRY', name: 'Básico / Hogar' };
}

function getSoftwareContext(tier) {
    switch (tier.id) {
        case 'GAMER':
            return "Render 3D (Blender, AutoCAD), Edición Video 4K (Premiere, DaVinci), Juegos AAA (Warzone, GTA V, Fortnite a +100FPS), Streaming (OBS).";
        case 'PRO':
            return "Virtualización (Docker, VMs), Programación Pesada (VS Code, Android Studio), Edición Fotográfica (Lightroom, Photoshop), Excel Masivo (Power BI).";
        case 'MID':
            return "Multitarea Fluida (+20 pestañas Chrome), Office 365 Completo, Zoom/Teams con fondo virtual, Photoshop Básico, Gestión Administrativa (ERPs web).";
        case 'ENTRY':
            return "Navegación Web, Streaming (Netflix, YouTube), Clases Online (Zoom/Meet), Microsoft Word/PowerPoint, Correo Electrónico.";
        default:
            return "Uso general de oficina y hogar.";
    }
}

function getTemplate(tier) {
    if (tier.id === 'GAMER') {
        return `
            <div class="product-intro">DOMINA EL JUEGO Y LA CREACIÓN. Este equipo está diseñado para quienes no aceptan lag ni esperas.</div>
            <ul class="neon-specs-list">
                <li><span class="spec-label">Marca:</span> <span class="spec-value">{{ticket.marca}}</span></li>
                <li><span class="spec-label">Modelo:</span> <span class="spec-value">{{ticket.modelo}}</span></li>
                <li><span class="spec-label">Potencia:</span> <span class="spec-value">{{specs.cpu}}</span></li>
                <li><span class="spec-label">Gráficos:</span> <span class="spec-value">{{specs.gpu}}</span></li>
                <li><span class="spec-label">Memoria:</span> <span class="spec-value">{{specs.ram}}</span></li>
                <li><span class="spec-label">Espacio:</span> <span class="spec-value">{{specs.disk}}</span></li>
            </ul>
            <div class="product-benefits">
                <strong>⚡ Rendimiento Puro:</strong> Mantenimiento térmico recién realizado para asegurar máximos FPS.
                <br><br>
                <strong>🎮 Listo para:</strong> {{softwareContext}}
            </div>
        `;
    }
    if (tier.id === 'PRO' || tier.id === 'MID') {
        return `
            <div class="product-intro">POTENCIA EMPRESARIAL EN TU MOCHILA. Diseñado para profesionales que no se detienen. Durabilidad superior y rendimiento constante.</div>
            <ul class="neon-specs-list">
                <li><span class="spec-label">Marca:</span> <span class="spec-value">{{ticket.marca}}</span></li>
                <li><span class="spec-label">Modelo:</span> <span class="spec-value">{{ticket.modelo}}</span></li>
                <li><span class="spec-label">Procesador:</span> <span class="spec-value">{{specs.cpu}}</span></li>
                <li><span class="spec-label">RAM Multitarea:</span> <span class="spec-value">{{specs.ram}}</span></li>
                <li><span class="spec-label">Almacenamiento:</span> <span class="spec-value">{{specs.disk}}</span></li>
                <li><span class="spec-label">Condición:</span> <span class="spec-value">Grado A (Impecable)</span></li>
            </ul>
            <div class="product-benefits">
                <strong>💼 Ideal para:</strong> {{softwareContext}}
                <br>
                Incluye Windows 10/11 Pro Activado y Garantía de 6 Meses.
            </div>
        `;
    }
    return `
        <div class="product-intro">TU COMPAÑERO DIARIO. La solución perfecta y económica para el hogar y estudios. Rápido, confiable y listo para usar.</div>
        <ul class="neon-specs-list">
            <li><span class="spec-label">Equipo:</span> <span class="spec-value">{{ticket.marca}} {{ticket.modelo}}</span></li>
            <li><span class="spec-label">Velocidad:</span> <span class="spec-value">{{specs.cpu}}</span></li>
            <li><span class="spec-label">Memoria:</span> <span class="spec-value">{{specs.ram}}</span></li>
            <li><span class="spec-label">Disco Rápido:</span> <span class="spec-value">{{specs.disk}}</span></li>
        </ul>
        <div class="product-benefits">
            <strong>🏠 Perfecto para:</strong> {{softwareContext}}
            <br>
            Batería testeada y cargador original incluido.
        </div>
    `;
}

// --- CORE SERVICE ---

export const aiService = {
    /**
     * Generates a sales description (Legacy / Product)
     */
    async generateProductDescription(ticket) {
        if (!model) throw new Error('Vertex AI no está inicializado. Verifica tu configuración de Firebase.');

        // RE-IMPLEMENTATION OF PROMPT TO KEEP COMPATIBILITY
        const tier = getHardwareTier(ticket);
        const softwareContext = getSoftwareContext(tier);
        const template = getTemplate(tier);
        const specs = {
            cpu: `${ticket.cpuBrand || ''} ${ticket.cpuGen || ''}`.trim() || 'Procesador Intel/AMD',
            ram: formatHardware(ticket.ram) || ticket.additionalInfo?.ram || 'RAM Estándar',
            disk: formatHardware(ticket.disk) || ticket.additionalInfo?.disco || 'Almacenamiento',
            gpu: `${ticket.gpuBrand || ''} ${ticket.gpuModel || ''}`.trim(),
            screen: `${ticket.screenSize || ''} ${ticket.screenRes || ''}`.trim(),
            price: ticket.precioVenta || ticket.precioCompra || 0
        };

        const prompt = `
            ACTÚA COMO: Copywriter Principal de "Criterio Digital".
            MISIÓN: Escribir descripción de venta HTML (Neon Dark Style).
            PLANTILLA: ${template}
            DATOS: ${JSON.stringify(ticket)}
            SPECS: ${JSON.stringify(specs)}
            CONTEXTO: ${softwareContext}
            SOLO HTML.
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim().replace(/^```html/, '').replace(/```$/, '');
        } catch (error) {
            console.error("Vertex Service Error:", error);
            throw error;
        }
    },

    /**
     * Refines a canonical memory based on user context/correction
     */
    async refineMemoryWithAI(memory, userContext) {
        if (!model) throw new Error('Vertex AI no disponible');

        const prompt = `
            ACTÚA COMO: Psico-Analista de Datos experto.
            TAREA: Reescribir un "Evento Canónico" (memoria) basado en una corrección del usuario.
            REGLAS:
            1. Mantén el tono analítico, objetivo y psicológico original.
            2. Corrige los hechos según el contexto del usuario.
            3. RESPONDE SOLAMENTE CON UN JSON VÁLIDO: { year, event, description, sentiment, person }.
            
            MEMORIA ORIGINAL: ${JSON.stringify(memory)}
            CORRECCIÓN: "${userContext}"
        `;

        return this._callGeminiJSON(prompt);
    },

    /**
     * Generates a synthetic profile based on metadata
     */
    async generateProfileFromMetadata(contact, userIdentity = {}) {
        if (!model) throw new Error('Vertex AI no disponible');

        const duration = Number(contact.lastYear) - Number(contact.firstYear);
        const intensity = contact.mentions > 50 ? "Alta" : "Media";

        // CONTEXTO DE IDENTIDAD
        const identityContext = userIdentity?.bio
            ? `\nCONTEXTO DEL PROTAGONISTA (YO): Me llamo ${userIdentity.name || 'Usuario'}. Mi historia: "${userIdentity.bio}". Analiza esta relación basándote en MI contexto.`
            : "";

        const prompt = `
            ACTÚA COMO: Experto en Perfilado de Personalidades y Análisis de Biografías.
            OBJETIVO: Generar un "Perfil Psicológico" profundo y EXTRAER "Eventos Canónicos" REALES basados en el contexto proporcionado.
            
            SUJETO: ${contact.name}
            ROL: ${contact.role || 'Desconocido'}
            DURACIÓN: ${duration} años (${contact.firstYear} - ${contact.lastYear})
            INTENSIDAD: ${intensity} (${contact.mentions} mensajes)
            
            CONTEXTO PROPORCIONADO (Fuente de Verdad):
            "${contact.notes || 'No hay contexto específico. Infiere solo lo general.'}"
            
            ${identityContext}
            
            INSTRUCCIONES CRÍTICAS:
            1. PERFIL: Analiza la dinámica basándote en el contexto. Si dice "Auto-dependencia", explícalo. Si dice "Relación sólida", profundiza.
            2. EVENTOS:
               - SI HAY CONTEXTO: ¡NO INVENTES NADA! \n               - EXTRAE fechas y hechos exactos del texto (Ej: "2016: Nos conocimos", "2019: Mudanza", "2023: Adopción Rory").
               - SI NO HAY CONTEXTO: Infiere 1 o 2 eventos genéricos probables basados en el Rol y Duración (Ej: "Inicio de la relación laboral").
            3. Sentiment: Etiqueta cada evento como 'Positive', 'Conflict', 'Neutral'.

            RESPONDE SOLAMENTE CON ESTE JSON EXACTO:
            {
                "description": "Análisis psicológico de 3-4 líneas. Tono profesional y perspicaz.",
                "events": [
                    { "year": "YYYY", "event": "Título Corto", "description": "Descripción basada en hechos", "sentiment": "Positive" }
                ]
            }
        `;

        return this._callGeminiJSON(prompt);
    },

    // Helper for JSON calls
    async _callGeminiJSON(prompt) {
        try {
            console.log("Invoking Vertex AI...");
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            console.log("Raw Vertex Response:", text);

            // Robust JSON extraction
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response: " + text.substring(0, 50));

            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Vertex JSON Error", e);
            throw e;
        }
    },

    /**
     * Starts a simulation chat with a specific system prompt
     */
    startSimulationChat(systemInstruction) {
        try {
            console.log("Starting Simulation Chat with System Prompt tokens:", systemInstruction.length / 4);
            const ai = getAI(app, { backend: new VertexAIBackend() });

            // USE SAME MODEL AS BACKEND (Standard Conversation - No Tools)
            const COMMUNICATION_MODEL = "gemini-2.5-flash";

            // Create a specific model instance for this chat to enforce the system instruction
            const simModel = getGenerativeModel(ai, {
                model: COMMUNICATION_MODEL,
                systemInstruction: {
                    parts: [{ text: systemInstruction }],
                    role: "system"
                }
            });

            return simModel.startChat({});
        } catch (e) {
            console.error("Simulation Chat Init Error:", e);
            throw e;
        }
    }
};
