import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp, where } from 'firebase/firestore';

const COLLECTION = 'tasks';

export const taskService = {
    async addTask(taskData, userId) {
        try {
            const docRef = await addDoc(collection(db, COLLECTION), {
                ...taskData,
                createdBy: userId,
                createdAt: serverTimestamp(),
                completed: false
            });
            return { id: docRef.id, ...taskData };
        } catch (error) {
            console.error("Error adding task:", error);
            throw error;
        }
    },

    async getAllTasks() {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async updateTask(taskId, updates) {
        const ref = doc(db, COLLECTION, taskId);
        await updateDoc(ref, updates);
    },

    async deleteTask(taskId) {
        await deleteDoc(doc(db, COLLECTION, taskId));
    }
};
