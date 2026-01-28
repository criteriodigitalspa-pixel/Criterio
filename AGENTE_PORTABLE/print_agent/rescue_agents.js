const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-account.json'); // Assumes existing service account in Mirror_Private? 
// No, user said they had to copy it to AGENTE_PORTABLE.
// I need to check where I can run this. 
// Mirror_Private might NOT have the key if the user never put it there (I only wrote the file configure_crida.js there, didn't run it successfully).
// BUT AGENTE_PORTABLE/print_agent might have it if the user listened to me.
// I will try running from AGENTE_PORTABLE/print_agent.

initializeApp({
    credential: cert(serviceAccount)
});
const db = getFirestore();

async function rescueAgents() {
    console.log("🕵️‍♂️ Buscando agentes perdidos...");

    // 1. Get Reference Owner ID from 'Crida'
    const cridaSnap = await db.collection('personas')
        .where('name', '==', 'Crida')
        .limit(1)
        .get();

    if (cridaSnap.empty) {
        console.error("❌ No encontré a Crida para robar el ID del dueño sois vos.");
        return;
    }

    const correctOwnerId = cridaSnap.docs[0].data().ownerId;
    console.log(`✅ Dueño detectado: ${correctOwnerId} (desde Crida)`);

    // 2. Find Orphans (No ownerId or different)
    const allSnap = await db.collection('personas').get();

    let count = 0;
    const batch = db.batch();

    allSnap.docs.forEach(doc => {
        const data = data.data ? doc.data() : doc; // admin sdk vs client
        const name = data.name || "Sin Nombre";

        if (doc.id === cridaSnap.docs[0].id) return; // Skip Crida

        if (data.ownerId !== correctOwnerId) {
            console.log(`⚠️ Rescatando a: ${name} (${doc.id})...`);
            batch.update(doc.ref, { ownerId: correctOwnerId, recoveredAt: new Date() });

            // Also enable them by default if "is_default" is true? No touch flags.
            count++;
        } else {
            console.log(`👍 ${name} ya está a salvo.`);
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`🎉 ${count} agentes recuperados exitsosamente.`);
    } else {
        console.log("🤷‍♂️ No se encontraron agentes huérfanos.");
    }
}

rescueAgents().catch(console.error);
