const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load .env from current dir

// CONFIGURATION
const CHAT_FILE = path.join(__dirname, 'training_data', '_chat.txt');
const OUTPUT_FILE = path.join(__dirname, 'persona_config.json');

async function analyzeStyle() {
    console.log("🕵️‍♂️ Iniciando análisis de estilo personal...");

    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ Error: GEMINI_API_KEY no encontrada. Asegúrate de tener el archivo .env configurado.");
        process.exit(1);
    }

    if (!fs.existsSync(CHAT_FILE)) {
        console.error(`❌ Error: No encontré el archivo de chat en: ${CHAT_FILE}`);
        console.log("👉 Por favor exporta tu chat de WhatsApp y guárdalo como '_chat.txt' en la carpeta 'training_data'.");
        process.exit(1);
    }

    const chatContent = fs.readFileSync(CHAT_FILE, 'utf-8');
    // Limit content to last 50,000 chars to avoid token limits if file is huge (Gemini 1.5 has big context, but good to be safe/fast)
    // Actually Gemini 1.5 Flash has 1M context, so let's try a bigger chunk or full file if reasonable.
    // Let's grab the last 100kb of text which is usually plenty for style.
    const sliceSize = 100000;
    const meaningfulContent = chatContent.length > sliceSize ? chatContent.slice(-sliceSize) : chatContent;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
    Analiza el siguiente historial de chat de WhatsApp.
    Identifica al usuario principal (probablemente el que envía los mensajes, o infiérelo por el contexto si es un chat exportado completo).
    SI es un chat de grupo, identifica el estilo del participante más activo o el que parece ser el dueño del dispositivo.
    
    Tu tarea es extraer su "Personalidad Digital" para configurar un Bot que hable EXACTAMENTE como él.

    Analiza:
    1. **Tono**: (Irónico, formal, entusiasta, seco, cortante, cariñoso, etc).
    2. **Vocabulario**: Palabras clave que usa mucho (muletillas, slangs, jergas de Argentina/España/Latam si aplica).
    3. **Estructura**: Usa mayúsculas? Signos de puntuación? Escribe en párrafos o líneas cortas? Usa muchos emojis?
    4. **Reglas de Estilo**: 5 reglas de oro para imitarlo.

    Output JSON Format:
    {
        "style_name": "Nombre del estilo (ej: Diego Casual)",
        "tone": "Descripción del tono",
        "common_phrases": ["lista", "de", "frases"],
        "emojis": ["emoji1", "emoji2"],
        "formatting_rules": ["regla 1", "regla 2"],
        "system_prompt_instruction": "Un párrafo denso en primera persona instruyendo al modelo de cómo comportarse para ser este personaje. Ej: 'Soy Diego. Hablo corto. No saludo...'"
    }

    CHAT LOG (Partial):
    ${meaningfulContent}
    `;

    try {
        console.log("🧠 Enviando a Gemini para extracción de personalidad (esto puede tardar unos segundos)...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const json = response.text();

        fs.writeFileSync(OUTPUT_FILE, json);
        console.log(`✅ Personalidad extraída y guardada en: ${OUTPUT_FILE}`);
        console.log("📄 Preview:", json.substring(0, 200) + "...");

    } catch (error) {
        console.error("❌ Error en análisis:", error);
        fs.writeFileSync('script_error.log', `Error: ${error.message}\nStack: ${error.stack}\nDetails: ${JSON.stringify(error, null, 2)}`);
    } finally {
        console.log("🏁 Script finished.");
    }
}

analyzeStyle();
