const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Attempting to list models (Note: Client doesn't have listModels list method directly exposed easily in all versions, checking manually...)");

        // Actually the SDK doesn't always expose listModels directly on the instance in older versions, 
        // but let's try a simple generation with a very standard model.

        const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro", "gemini-1.5-pro"];

        for (const m of models) {
            console.log(`Testing model: ${m}`);
            try {
                const modelInstance = genAI.getGenerativeModel({ model: m });
                const result = await modelInstance.generateContent("Test");
                console.log(`✅ SUCCESS: ${m}`);
                return; // Exit on first success
            } catch (e) {
                console.log(`❌ FAILED: ${m} - ${e.message}`);
                // console.log(JSON.stringify(e, null, 2));
            }
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

listModels();
