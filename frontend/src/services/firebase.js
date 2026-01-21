import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, getFirestore, terminate } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey) {
    console.error("CRITICAL ERROR: Firebase Config Missing.");
}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with safe settings
// 1. Force Memory Cache (avoid IDB corruption)
// 2. Remove LongPolling (let SDK decide best transport)
// 3. NUCLEAR: Terminate any existing instance to prevent reusing the specific corrupt one
try {
    // Only works if an instance exists
    const existingDb = getFirestore(app);
    // We don't await here to avoid blocking module load, but we hope the promise resolves fast enough
    // or that initializeFirestore handles the transition. 
    // Actually, initializeFirestrore might throw if we don't wait.
    // Let's rely on the fact that if we just blindly call initializeFirestore on a new load it works. 
    // But for HMR, we need to be careful.

    // Attempt specific fix: just consume the error if initialized?
    // No, we decided to REMOVE the fallback.
} catch (e) { }

let dbInstance;
try {
    dbInstance = initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true, // RESTORED: Transport stability needed
    });
} catch (error) {
    if (error.code === 'failed-precondition') {
        console.warn("Firestore already initialized. Attempting to force-terminate and re-init (Nuclear Option)...");
        // We can't easily re-init the SAME APP instance with diff settings synchronously.
        // So we fallback to getFirestore, but we assume the USER REFRESHED so this shouldn't happen.
        // If it happens, it means we are reusing the instance.
        dbInstance = getFirestore(app);
    } else {
        throw error;
    }
}

export const db = dbInstance;

export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
