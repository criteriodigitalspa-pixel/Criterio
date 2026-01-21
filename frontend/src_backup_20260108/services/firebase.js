import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey) {
    const errorMsg = "CRITICAL ERROR: Firebase Config Missing. Check .env file.";
    console.error(errorMsg);
    document.body.innerHTML = `<div style="color:red; padding:20px; font-weight:bold; font-family:sans-serif;">
        <h1>Error de Configuración</h1>
        <p>No se encontraron las llaves de Firebase (API_KEY missing).</p>
        <p>Asegúrate de que el archivo .env.local existe y las variables empiezan con VITE_</p>
    </div>`;
    throw new Error(errorMsg);
}

const app = initializeApp(firebaseConfig, "STABLE_CLIENT");

// CRITICAL FIX FOR CRASH (ID: ca9):
// We explicitly initialize Firestore with MEMORY CACHE.
// This forces it to IGNORE any corrupted IndexedDB on the disk.
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

export const auth = getAuth(app);
// Initialize Storage
import { getStorage } from "firebase/storage";
export const storage = getStorage(app);

export const initPersistence = async () => {
    console.log("🚀 Firestore initializing in MEMORY ONLY mode to bypass corruption.");
    // No-op for now, as we handled it in initializeFirestore
};

export default app;
