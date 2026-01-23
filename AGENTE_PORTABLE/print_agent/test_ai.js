const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function test() {
    console.log("Testing API Key:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Response:", result.response.text());
    } catch (e) {
        console.error("Error Full Details:", JSON.stringify(e, null, 2));
        if (e.response) console.error("Response Error:", e.response);
        console.error("Message:", e.message);
    }
}
test();
