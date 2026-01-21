
import { db } from './firebase';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';

const CONFIG_COLLECTION = 'system_config';
const LISTS_DOC_ID = 'lists';

export const configService = {
    // Initialize or Get Lists
    getLists: async () => {
        try {
            const docRef = doc(db, CONFIG_COLLECTION, LISTS_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Check if brands are empty and seed them if so (Self-Healing)
                if (!data.brands || data.brands.length === 0) {
                    const defaultBrands = ['HP', 'LENOVO', 'DELL', 'ASUS', 'ACER', 'APPLE', 'OTROS'];
                    await updateDoc(docRef, { brands: defaultBrands });
                    data.brands = defaultBrands;
                }
                return data;
            } else {
                // Initialize default if not exists
                const initialData = {
                    brands: ['HP', 'LENOVO', 'DELL', 'ASUS', 'ACER', 'APPLE', 'OTROS'],
                    models: []
                };
                await setDoc(docRef, initialData);
                return initialData;
            }
        } catch (error) {
            console.error("Error fetching config lists:", error);
            return { brands: [], models: [] }; // Fallback
        }
    },

    // Add Item to List
    addItem: async (listName, item) => {
        if (!item || !item.trim()) return;
        const normalizedItem = item.trim(); // Keep case for display vs simple trim
        try {
            const docRef = doc(db, CONFIG_COLLECTION, LISTS_DOC_ID);
            await updateDoc(docRef, {
                [listName]: arrayUnion(normalizedItem)
            });
            return normalizedItem;
        } catch (error) {
            // If doc doesn't exist (edge case if getLists hasn't run), create it
            // Simple retry logic or assume init handled by getLists
            console.error(`Error adding to ${listName}:`, error);
            throw error;
        }
    },

    // Remove Item from List
    removeItem: async (listName, item) => {
        try {
            const docRef = doc(db, CONFIG_COLLECTION, LISTS_DOC_ID);
            await updateDoc(docRef, {
                [listName]: arrayRemove(item)
            });
            return item;
        } catch (error) {
            console.error(`Error removing from ${listName}:`, error);
            throw error;
        }
    }
};
