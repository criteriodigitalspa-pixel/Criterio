import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    orderBy,
    limit,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import toast from 'react-hot-toast';

const TASKS_COLLECTION = 'tasks';
const PROJECTS_COLLECTION = 'projects';
const AREAS_COLLECTION = 'project_areas';

// Helper: Normalize IDs for comparison
export const normalizeId = (id) => String(id || '').trim();

const taskServiceV2 = {
    // --- SUBSCRIPTIONS ---

    /**
     * Subscribe to tasks for a specific project.
     * Guaranteed to return only tasks for the requested project.
     */
    subscribeToProjectTasks(projectId, userId, callback) {
        if (!projectId) return () => { };

        // Revert to V1 logic: Query for both String and Number variants to handle legacy/imported data types
        const variants = [projectId];
        if (typeof projectId === 'string' && !isNaN(Number(projectId)) && projectId.trim() !== '') {
            variants.push(Number(projectId));
        } else if (typeof projectId === 'number') {
            variants.push(String(projectId));
        }
        const uniqueVariants = [...new Set(variants)];

        const q = query(
            collection(db, TASKS_COLLECTION),
            where('projectId', 'in', uniqueVariants)
        );

        console.log(`[TaskServiceV2] Subscribing to Project: ${projectId}`);

        return onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`[V2-Debug] Raw Firestore Items for ${projectId}: ${tasks.length}`);

            // Client-side Safety Filter (The "Portero")
            const validTasks = tasks.filter(t => {
                const match = normalizeId(t.projectId) === normalizeId(projectId);
                return match;
            });

            validTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
            callback(validTasks);
        }, (error) => {
            console.error("[TaskServiceV2] Subscription Error:", error);

            if ((error.code === 'permission-denied' || error.code === 'failed-precondition') && userId) {
                console.warn("[TaskServiceV2] Permission Denied. Activating DOUBLE FALLBACK (Assigned + Created)...");

                let assignedTasks = [];
                let createdTasks = [];

                const updateMerged = () => {
                    const combined = [...assignedTasks, ...createdTasks];
                    // Deduplicate
                    const uniqueMap = new Map();
                    combined.forEach(item => uniqueMap.set(item.id, item));
                    // Filter for current project to be safe
                    const valid = Array.from(uniqueMap.values()).filter(t =>
                        normalizeId(t.projectId) === normalizeId(projectId)
                    );
                    valid.sort((a, b) => (a.order || 0) - (b.order || 0));

                    console.log(`[V2-Fallback] Merged ${valid.length} tasks.`);
                    callback(valid);
                };

                // 1. Assigned To Me
                const qAssigned = query(
                    collection(db, TASKS_COLLECTION),
                    where('projectId', 'in', uniqueVariants),
                    where('assignedTo', 'array-contains', userId)
                );

                // 2. Created By Me
                const qCreated = query(
                    collection(db, TASKS_COLLECTION),
                    where('projectId', 'in', uniqueVariants),
                    where('createdBy', '==', userId)
                );

                onSnapshot(qAssigned, (snap) => {
                    assignedTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    updateMerged();
                }, (e) => console.warn("V2 Fallback Assigned failed", e));

                onSnapshot(qCreated, (snap) => {
                    createdTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    updateMerged();
                }, (e) => console.warn("V2 Fallback Created failed", e));

            } else {
                toast.error(`Error: ${error.message}`);
                callback([]); // V2 explicit empty on error if strict mode
            }
        });
    },

    /**
     * Subscribe to tasks assigned to a specific user (My Tasks view)
     */
    subscribeToUserTasks(userId, callback) {
        if (!userId) return () => { };

        const q = query(
            collection(db, TASKS_COLLECTION),
            where('assignedTo', 'array-contains', userId)
        );

        return onSnapshot(q, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(tasks);
        });
    },

    // --- CRUD OPERATIONS ---

    async createTask(taskData) {
        try {
            const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
                ...taskData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: taskData.status || 'todo',
                subtasks: [],
                tags: []
            });
            return docRef.id;
        } catch (error) {
            console.error("[TaskServiceV2] Create Error:", error);
            toast.error("Error al crear tarea");
            throw error;
        }
    },

    async updateTask(taskId, updates) {
        try {
            const ref = doc(db, TASKS_COLLECTION, taskId);
            await updateDoc(ref, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("[TaskServiceV2] Update Error:", error);
            toast.error("No se pudo actualizar");
        }
    },

    async deleteTask(taskId) {
        try {
            await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
            toast.success("Tarea eliminada");
        } catch (error) {
            console.error("[TaskServiceV2] Delete Error:", error);
            toast.error("Error al eliminar");
        }
    },

    /**
     * Reorder tasks in batch
     * @param {Array<{id: string, order: number, status: string}>} updates 
     */
    async reorderTasks(updates) {
        if (!updates || updates.length === 0) return;

        try {
            const batch = writeBatch(db);
            updates.forEach(({ id, order, status }) => {
                const ref = doc(db, TASKS_COLLECTION, id);
                batch.update(ref, { order, status });
            });
            await batch.commit();
        } catch (error) {
            console.error("[TaskServiceV2] Reorder Error:", error);
            toast.error("Error al guardar orden");
        }
    },

    // --- PROJECTS & AREAS ---

    subscribeToAreas(userId, callback) {
        if (!userId) return () => { };

        const q = query(
            collection(db, AREAS_COLLECTION),
            where('members', 'array-contains', userId)
        );

        return onSnapshot(q, snapshot => {
            const areas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort in JS to avoid index issues
            areas.sort((a, b) => (a.order || 0) - (b.order || 0));
            callback(areas);
        });
    },

    subscribeToProjects(userId, callback) {
        if (!userId) return () => { };

        const q = query(
            collection(db, PROJECTS_COLLECTION),
            where('members', 'array-contains', userId)
        );

        return onSnapshot(q, snapshot => {
            const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            projects.sort((a, b) => (a.order || 0) - (b.order || 0));
            callback(projects);
        }, (error) => {
            console.error("Projects Sub Error:", error);
            // Don't toast here to avoid spam, just log
        });
    }
};

export default taskServiceV2;
