import { db } from './firebase';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where
} from 'firebase/firestore';

const COLLECTION_NAME = 'products';

export const inventoryService = {
    // Add a new product
    addProduct: async (productData) => {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...productData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return { id: docRef.id, ...productData };
        } catch (error) {
            console.error("Error adding product: ", error);
            throw error;
        }
    },

    // Get all products
    getAllProducts: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting products: ", error);
            throw error;
        }
    },

    // Update a product
    updateProduct: async (id, productData) => {
        try {
            const productRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(productRef, {
                ...productData,
                updatedAt: new Date().toISOString()
            });
            return { id, ...productData };
        } catch (error) {
            console.error("Error updating product: ", error);
            throw error;
        }
    },

    // Delete a product
    deleteProduct: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            return id;
        } catch (error) {
            console.error("Error deleting product: ", error);
            throw error;
        }
    },

    // Get low stock products logic could be added here or filtered on frontend
};
