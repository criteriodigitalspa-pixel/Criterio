import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { PROCESSORS, GPUS } from '../data/hardware-constants';

const CONFIG_COLLECTION = 'system_config';
const HARDWARE_DOC_ID = 'hardware';

export const systemService = {
    // 1. Get Hardware Constants (One-time fetch)
    getHardwareConstants: async () => {
        try {
            const docRef = doc(db, CONFIG_COLLECTION, HARDWARE_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null; // Not initialized
            }
        } catch (error) {
            console.error("Error fetching hardware constants:", error);
            throw error;
        }
    },

    // 2. Subscribe (Real-time)
    subscribeToHardware: (callback) => {
        const docRef = doc(db, CONFIG_COLLECTION, HARDWARE_DOC_ID);
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            } else {
                // Return defaults if doc doesn't exist yet (Client-side fallback)
                callback({ processors: PROCESSORS, gpus: GPUS });
            }
        }, (error) => {
            console.error("Hardware subscription error:", error);
        });
    },

    // 3. Update (Admin)
    updateHardwareConstants: async (data) => {
        try {
            const docRef = doc(db, CONFIG_COLLECTION, HARDWARE_DOC_ID);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating hardware constants:", error);
            throw error;
        }
    },

    // 4. Seed Default Data (Migration)
    seedDefaultHardware: async () => {
        try {
            const docRef = doc(db, CONFIG_COLLECTION, HARDWARE_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                console.log("🌱 Seeding Default Hardware Database...");
                await setDoc(docRef, {
                    processors: PROCESSORS,
                    gpus: GPUS,
                    lastUpdated: new Date().toISOString()
                });
                console.log("✅ Hardware Database Seeded!");
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error seeding hardware:", error);
            return false;
        }
    }
};
