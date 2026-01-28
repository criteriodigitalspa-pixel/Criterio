import { db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

export const ideaService = {
    // 1. Subscribe to Ideas (Real-time)
    subscribeIDEAS: (callback) => {
        const q = query(collection(db, 'ideas'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const ideas = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(ideas);
        });
    },

    // 2. Delete Idea
    deleteIdea: async (ideaId) => {
        try {
            await deleteDoc(doc(db, 'ideas', ideaId));
        } catch (error) {
            console.error("Error deleting idea:", error);
            throw error;
        }
    },

    // 3. Convert to Task (Helper mainly for logging or custom logic before opening modal)
    // Actually, conversion happens in the UI by calling taskService.addTask
    // But we might want to mark the idea as "converted" instead of deleting it?
    markConverted: async (ideaId, taskId) => {
        try {
            await updateDoc(doc(db, 'ideas', ideaId), {
                converted: true,
                convertedTaskId: taskId
            });
        } catch (error) {
            console.error("Error updating idea:", error);
        }
    }
};
