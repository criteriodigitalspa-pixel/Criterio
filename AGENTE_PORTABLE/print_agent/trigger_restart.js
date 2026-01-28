const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-account.json'); // Assumes it exists for this script to run locally

// If service-account.json is missing locally, we can't run this.
// But earlier I saw index.js uses it. I couldn't list it though.
// If missing, I can try to use the one from Mirror_Private if I find it?
// No, I'll assume the user has configured the local environment correctly for now.
// If this script fails, I'll tell the user.

try {
    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();

    async function triggerRestart() {
        console.log("🔄 Enviando comando de reinicio remoto...");
        await db.collection('system').doc('agent_commands').set({ restart: true }, { merge: true });
        console.log("✅ Comando enviado. El agente debería reiniciarse en breve.");
    }

    triggerRestart();
} catch (e) {
    console.error("❌ Error running script:", e.message);
}
