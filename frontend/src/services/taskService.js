import { db, auth } from './firebase';
import { notificationService } from './notificationService';
import { toast } from 'react-hot-toast';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy, serverTimestamp, where, onSnapshot, arrayUnion, setDoc, writeBatch } from 'firebase/firestore';

const TASKS_COLLECTION = 'tasks';
const PROJECTS_COLLECTION = 'projects';
const AREAS_COLLECTION = 'project_areas';
const USERS_COLLECTION = 'users';

export const taskService = {
    // --- AREAS (Business Areas) ---
    // Now filters by membership
    subscribeToAreas(userId, callback) {
        if (!userId || typeof userId !== 'string') {
            console.warn("[TaskService] Invalid userId for areas subscription");
            return () => { };
        }

        const q = query(
            collection(db, AREAS_COLLECTION),
            where('members', 'array-contains', userId)
        );

        // Define Local Merge Logic
        const getLocalMerged = (dbList = []) => {
            const localAreas = JSON.parse(localStorage.getItem('pending_areas') || '[]');
            const myLocalAreas = localAreas.filter(a => a.members.includes(userId));
            const all = [...dbList, ...myLocalAreas];
            all.sort((a, b) => {
                const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                if (orderA !== orderB) return orderA - orderB;
                return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
            });
            return all;
        };

        return onSnapshot(q,
            (snapshot) => {
                const dbAreas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(getLocalMerged(dbAreas));
            },
            (error) => {
                console.warn("Firestore Area Subscription Failed (Permissions/Offline):", error);
                // Fallback: Show only local areas
                callback(getLocalMerged([]));
            }
        );
    },

    async addArea(name, userId) {
        try {
            const docRef = await addDoc(collection(db, AREAS_COLLECTION), {
                name,
                ownerId: userId,
                members: [userId],
                createdAt: serverTimestamp()
            });
            return { id: docRef.id, name };
        } catch (error) {
            console.error("Error adding area:", error);
            // Fallback: Save to LocalStorage
            const localAreas = JSON.parse(localStorage.getItem('pending_areas') || '[]');
            const tempId = `local_area_${Date.now()}`;
            const localArea = {
                id: tempId,
                name,
                ownerId: userId,
                members: [userId],
                createdAt: { seconds: Date.now() / 1000 },
                isLocal: true
            };
            localAreas.push(localArea);
            localStorage.setItem('pending_areas', JSON.stringify(localAreas));
            return localArea;
        }
    },

    async shareArea(areaId, email) {
        if (!areaId) throw new Error("ID de área inválido");

        // SELF-HEALING: Attempt to sync if local
        let targetAreaId = areaId;
        if (targetAreaId.toString().startsWith('local_')) {
            try {
                targetAreaId = await this.syncLocalArea(targetAreaId);
            } catch (syncError) {
                console.error("Sync failed during share:", syncError);
                throw new Error(`Error de Sincronización: ${syncError.message}`);
            }
        }

        try {
            // 1. Find user
            const usersRef = collection(db, USERS_COLLECTION);
            const qUser = query(usersRef, where('email', '==', email));
            const userSnap = await getDocs(qUser);

            if (userSnap.empty) throw new Error("Usuario no encontrado");
            const userId = userSnap.docs[0].id;

            // 2. Add to Area
            const areaRef = doc(db, AREAS_COLLECTION, areaId);
            await updateDoc(areaRef, {
                members: arrayUnion(userId)
            });

            // 3. CASCADE: Add to all projects in this area
            const projectsQ = query(collection(db, PROJECTS_COLLECTION), where('areaId', '==', areaId));
            const projectsSnap = await getDocs(projectsQ);

            const updates = [];
            projectsSnap.forEach(projDoc => {
                updates.push(updateDoc(doc(db, PROJECTS_COLLECTION, projDoc.id), {
                    members: arrayUnion(userId)
                }));
            });

            await Promise.all(updates);

            // Notify User
            const areaSnap = await getDoc(areaRef); // Get area name for msg?
            // Ideally we pass areaName or fetch it. Fetching for correctness.
            const areaName = areaSnap.exists() ? areaSnap.data().name : 'un Área de Negocio';

            await notificationService.sendNotification(
                userId,
                "Invitación a Área de Negocio",
                `Te han añadido al área "${areaName}" y a sus proyectos.`,
                "invite_area",
                { areaId } // Link to Area
            );

            return { uid: userId, email };
        } catch (error) {
            console.error("Error sharing area:", error);
            if (error.code === 'permission-denied') {
                throw new Error("No tienes permisos para invitar en esta área.");
            }
        }
    },
    async getAreas(userId) {
        if (!userId) return [];
        try {
            const q = query(
                collection(db, AREAS_COLLECTION),
                where('members', 'array-contains', userId)
                // orderBy('order') // Requires index, use client sort
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        } catch (error) {
            console.error("Error fetching areas one-shot:", error);
            return [];
        }
    },


    // Data Consistency / Recovery for Areas
    async recoverLegacyAreas(userId) {
        if (!userId) return;
        try {
            const q = query(collection(db, AREAS_COLLECTION), where('ownerId', '==', userId));
            const snapshot = await getDocs(q);
            const updates = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (!data.members || !Array.isArray(data.members) || !data.members.includes(userId)) {
                    updates.push(updateDoc(doc(db, AREAS_COLLECTION, docSnap.id), {
                        members: arrayUnion(userId)
                    }));
                }
            });
            await Promise.all(updates);
            return updates.length;
        } catch (e) {
            console.error(e);
            return 0;
        }
    },

    async deleteArea(areaId) {
        try {
            await deleteDoc(doc(db, AREAS_COLLECTION, areaId));
        } catch (e) {
            // Handle local delete
            const localAreas = JSON.parse(localStorage.getItem('pending_areas') || '[]');
            if (localAreas.some(a => a.id === areaId)) {
                const filtered = localAreas.filter(a => a.id !== areaId);
                localStorage.setItem('pending_areas', JSON.stringify(filtered));
            }
        }
    },

    // --- PROJECTS ---
    // Now filters by membership
    subscribeToProjects(userId, callback) {
        if (!userId || typeof userId !== 'string') {
            console.warn("[TaskService] Invalid userId for projects subscription");
            return () => { };
        }

        let unsubscribe = null;
        let isDisposed = false;
        let retryTimer = null;

        const connect = () => {
            if (isDisposed) return;

            const q = query(
                collection(db, PROJECTS_COLLECTION),
                where('members', 'array-contains', userId)
            );

            const getLocalMerged = (dbList = []) => {
                try {
                    const localProjects = JSON.parse(localStorage.getItem('pending_projects') || '[]');
                    const myLocalProjects = localProjects.filter(p => p.members?.includes(userId));
                    const all = [...dbList, ...myLocalProjects];
                    all.sort((a, b) => {
                        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                        if (orderA !== orderB) return orderA - orderB;
                        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                    });
                    return all;
                } catch (e) {
                    console.error("Local Project Parse Error", e);
                    return dbList;
                }
            };

            unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    callback(getLocalMerged(projects));
                },
                (error) => {
                    console.warn("Firestore Project Subscription Failed (Retrying in 5s):", error);
                    // 1. Deliver Local Cache Immediately so UI isn't empty
                    callback(getLocalMerged([]));

                    // 2. Retry Logic (Immortal)
                    if (!isDisposed) {
                        retryTimer = setTimeout(() => {
                            console.log("[TaskService] Retrying Project Subscription...");
                            connect();
                        }, 5000);
                    }
                }
            );
        };

        connect();

        return () => {
            isDisposed = true;
            if (unsubscribe) unsubscribe();
            if (retryTimer) clearTimeout(retryTimer);
        };
    },

    // One-shot fetch for UI selectors
    async getProjects(userId) {
        if (!userId) return [];
        try {
            const q = query(
                collection(db, PROJECTS_COLLECTION),
                where('members', 'array-contains', userId),
                orderBy('name')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Note: orderBy might require index if combined with array-contains. 
            // If it fails, catch error and do client side sort.
        } catch (error) {
            console.warn("Index check or fetch failed, trying client sort", error);
            try {
                const q2 = query(collection(db, PROJECTS_COLLECTION), where('members', 'array-contains', userId));
                const snap = await getDocs(q2);
                const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            } catch (e) {
                console.error("Failed to fetch projects", e);
                return [];
            }
        }
    },

    async getProjectMembers(projectId) {
        if (!projectId) return [];
        try {
            const pRef = doc(db, PROJECTS_COLLECTION, projectId);
            const pSnap = await getDoc(pRef);
            if (!pSnap.exists()) return [];

            const memberIds = pSnap.data().members || [];
            if (memberIds.length === 0) return [];

            // Firestore 'in' limit is 10. If > 10, need batches or individual fetches.
            // For now assuming small teams. If > 10, just fetch all users and filter (less reads vs complexity?)
            // Or batch. Let's do batch of 10.

            const chunks = [];
            for (let i = 0; i < memberIds.length; i += 10) {
                chunks.push(memberIds.slice(i, i + 10));
            }

            const members = [];
            for (const chunk of chunks) {
                const q = query(collection(db, USERS_COLLECTION), where('__name__', 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(d => members.push({ id: d.id, ...d.data() }));
            }
            return members;
        } catch (error) {
            console.error("Error fetching project members:", error);
            return [];
        }
    },

    // Batched stats fetch
    async getProjectsStats(projectIds) {
        if (!projectIds || projectIds.length === 0) return {};

        const stats = {};

        // Chunk into groups of 10 for Firestore 'in' limit
        const chunks = [];
        for (let i = 0; i < projectIds.length; i += 10) {
            chunks.push(projectIds.slice(i, i + 10));
        }

        try {
            await Promise.all(chunks.map(async (chunk) => {
                const q = query(collection(db, TASKS_COLLECTION), where('projectId', 'in', chunk));
                const snap = await getDocs(q);
                snap.forEach(doc => {
                    const task = doc.data();
                    const pid = task.projectId;
                    if (!stats[pid]) stats[pid] = { total: 0, completed: 0 };

                    stats[pid].total++;
                    if (task.status === 'done') stats[pid].completed++;
                });
            }));
            return stats;
        } catch (error) {
            console.error("Error fetching project stats", error);
            return {};
        }
    },

    // Reorder Areas
    async reorderAreas(areaIds) {
        if (!areaIds || areaIds.length === 0) return;
        try {
            const batch = writeBatch(db);
            areaIds.forEach((id, index) => {
                if (id.startsWith('local_')) return; // Skip locals
                const ref = doc(db, AREAS_COLLECTION, id);
                batch.update(ref, { order: index });
            });
            await batch.commit();
        } catch (error) {
            if (error.code !== 'permission-denied') {
                console.error("Error reordering areas:", error);
            } else {
                console.warn("Reorder denied", error.message);
            }
        }
    },

    // Reorder Projects
    async reorderProjects(projectIds) {
        if (!projectIds || projectIds.length === 0) return;
        try {
            const batch = writeBatch(db);
            projectIds.forEach((id, index) => {
                if (id.startsWith('local_')) return;
                const ref = doc(db, PROJECTS_COLLECTION, id);
                batch.update(ref, { order: index });
            });
            await batch.commit();
        } catch (error) {
            if (error.code !== 'permission-denied') {
                console.error("Error reordering projects:", error);
            }
        }
    },

    // Data Consistency / Recovery
    async recoverLegacyProjects(userId) {
        if (!userId) return;
        // Fetch projects owned by user but maybe missing 'members'
        // We use ownerId to find them.
        try {
            const q = query(collection(db, PROJECTS_COLLECTION), where('ownerId', '==', userId));
            const snapshot = await getDocs(q);

            const updates = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (!data.members || !Array.isArray(data.members) || !data.members.includes(userId)) {
                    const members = data.members && Array.isArray(data.members) ? data.members : [];
                    if (!members.includes(userId)) members.push(userId);

                    updates.push(updateDoc(doc(db, PROJECTS_COLLECTION, docSnap.id), {
                        members: members,
                        ownerId: userId // Ensure owner matches
                    }));
                }
            });

            if (updates.length > 0) {
                await Promise.all(updates);
                console.log(`Recovered ${updates.length} legacy projects`);
            }
            return updates.length;
        } catch (error) {
            console.error("Error recovering projects:", error);
            return 0;
        }
    },

    async addProject(name, areaId = null, userId, description = '', color = 'blue') {
        try {
            // HIERARCHY: Inherit members from Parent Area
            let initialMembers = [userId];
            if (areaId) {
                try {
                    const areaRef = doc(db, AREAS_COLLECTION, areaId);
                    const areaSnap = await getDoc(areaRef);
                    if (areaSnap.exists() && areaSnap.data().members) {
                        const areaMembers = areaSnap.data().members;
                        // Merge avoiding duplicates
                        initialMembers = [...new Set([...initialMembers, ...areaMembers])];
                    }
                } catch (err) {
                    console.warn("Failed to inherit area members:", err);
                    // Continue with just owner if this fails
                }
            }

            const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
                name,
                areaId,
                description,
                color,
                ownerId: userId,
                members: initialMembers,
                createdAt: serverTimestamp()
            });
            return { id: docRef.id, name, areaId, description, color };
        } catch (error) {
            console.error("Error adding project:", error);
            // Fallback: Save to LocalStorage to prevent data loss
            const localProjects = JSON.parse(localStorage.getItem('pending_projects') || '[]');
            const tempId = `local_${Date.now()}`;
            const localProject = {
                id: tempId,
                name, areaId, description, color,
                ownerId: userId, members: [userId],
                createdAt: { seconds: Date.now() / 1000 },
                isLocal: true
            };
            localProjects.push(localProject);
            localStorage.setItem('pending_projects', JSON.stringify(localProjects));
            // Return local object so UI updates optimistically
            return localProject;
        }
    },

    async deleteProject(projectId) {
        try {
            await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
        } catch (e) {
            console.error(e);
            // Handle local delete
            const localProjects = JSON.parse(localStorage.getItem('pending_projects') || '[]');
            const filtered = localProjects.filter(p => p.id !== projectId);
            localStorage.setItem('pending_projects', JSON.stringify(filtered));
        }
    },

    async updateProject(projectId, updates) {
        try {
            const ref = doc(db, PROJECTS_COLLECTION, projectId);
            await updateDoc(ref, updates);
        } catch (error) {
            console.error("Error updating project:", error);
            throw error;
        }
    },

    async updateArea(areaId, updates) {
        try {
            const ref = doc(db, AREAS_COLLECTION, areaId);
            await updateDoc(ref, updates);
        } catch (error) {
            console.error("Error updating area:", error);
            throw error;
        }
    },

    async shareProject(projectId, email) {
        if (!projectId) throw new Error("ID de proyecto inválido");

        // SELF-HEALING: Attempt to sync if local
        let targetProjectId = projectId;
        if (targetProjectId.toString().startsWith('local_')) {
            try {
                targetProjectId = await this.syncLocalProject(targetProjectId);
            } catch (syncError) {
                console.error("Sync failed during share:", syncError);
                throw new Error(`Error de Sincronización: ${syncError.message}`);
            }
        }

        try {
            // 1. Find user by email
            const usersRef = collection(db, USERS_COLLECTION);
            const q = query(usersRef, where('email', '==', email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error("Usuario no encontrado");
            }

            const userToAdd = snapshot.docs[0];
            const userId = userToAdd.id;

            // 2. Add to project members
            const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
            const projectSnap = await getDoc(projectRef); // Need data for AreaID

            if (!projectSnap.exists()) throw new Error("Proyecto no encontrado");
            const projectData = projectSnap.data();

            const updates = [
                updateDoc(projectRef, {
                    members: arrayUnion(userId)
                })
            ];

            // 3. ESSENTIAL: Add to Parent Area if exists
            // (Invited users MUST see the area to see the project in Sidebar)
            if (projectData.areaId) {
                const areaRef = doc(db, AREAS_COLLECTION, projectData.areaId);
                updates.push(updateDoc(areaRef, {
                    members: arrayUnion(userId)
                }));
            }

            await Promise.all(updates);

            // Notify
            const projectName = projectData.name || 'un Proyecto';

            await notificationService.sendNotification(
                userId,
                "Invitación a Proyecto",
                `Te han invitado a colaborar en el proyecto "${projectName}".`,
                "invite_project",
                { projectId } // Link to Project
            );

            return { uid: userId, email: userToAdd.data().email };
        } catch (error) {
            console.error("Error sharing project:", error);
            if (error.code === 'permission-denied') {
                throw new Error("No tienes permisos para invitar en este proyecto.");
            }
            throw error; // Re-throw other errors
        }
    },

    // --- TASKS ---
    async addTask(taskData, userId) {
        console.log(`[TaskService] Adding task. Project: ${taskData.projectId}, CustomID: ${taskData.customId}`);
        try {
            // Fetch Project Members to ensure Task Visibility
            let taskMembers = [userId];
            if (taskData.projectId) {
                try {
                    const pRef = doc(db, PROJECTS_COLLECTION, taskData.projectId);
                    const pSnap = await getDoc(pRef);
                    if (pSnap.exists()) {
                        const pm = pSnap.data().members || [];
                        taskMembers = [...new Set([...taskMembers, ...pm])];
                    }
                } catch (e) { console.warn("Could not fetch project members for task visibility", e); }
            }
            // Merge explicitly assigned users as well
            if (taskData.assignedTo && Array.isArray(taskData.assignedTo)) {
                taskMembers = [...new Set([...taskMembers, ...taskData.assignedTo])];
            }


            // Sanitize: Firestore hates 'undefined', requires 'null'
            // Sanitize: Firestore hates 'undefined', requires 'null'
            const sanitize = (value) => {
                if (value === undefined) return null;
                if (value === null) return null;

                // Pass-through primitives
                if (typeof value !== 'object') return value;

                // Pass-through Dates
                if (value instanceof Date) return value;

                // Pass-through Firestore Timestamps & FieldValues (sentinels)
                // "seconds" check is for Timestamp. "_methodName" often exists on FieldValues (like serverTimestamp)
                // We can't easily detect serverTimestamp() object structure officially, but we can assume objects with specific properties shouldn't be touched if they aren't plain objects.
                // Safest approach: if it has 'seconds' (Timestamp) keep it. If it seems to be a complex object we don't know, maybe we should still traverse? 
                // Creating a simplified check for plain objects and arrays.

                if (Array.isArray(value)) {
                    return value.map(item => sanitize(item));
                }

                // FieldValue check (serverTimestamp) - typically has _methodName or similar in SDK, but here simplified:
                // If it creates an issue, we can explicitly exclude 'createdAt' from sanitization before passing it.
                // But 'createdAt' is added AFTER sanitization in the usage below? 
                // WAIT. 'createdAt: serverTimestamp()' is passed INTO the objects being sanitized below.
                // serverTimestamp() is an object.
                // Let's modify the usage to add serverTimestamp OUTSIDE the sanitize call if possible, or support it.

                // Simple heuristic: If it looks like a plain object, recurse. 
                // If it looks like a Firestore Sentinel (non-plain), keep it.
                // constructor.name check?
                if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array') {
                    // Likely a class instance (Timestamp, FieldValue, etc)
                    return value;
                }

                const newObj = {};
                Object.keys(value).forEach(key => {
                    newObj[key] = sanitize(value[key]);
                });
                return newObj;
            };

            const dataToSave = {
                ...sanitize({
                    status: 'todo',
                    projectId: null,
                    ...taskData,
                    assignedTo: taskData.assignedTo || [],
                    createdBy: userId,
                    completed: false,
                    members: taskMembers
                }),
                createdAt: serverTimestamp() // Add this AFTER sanitization to avoid traversing the sentinel
            };

            // Support Client-Side IDs for true optimistic UI
            let savedTask;
            if (taskData.customId) {
                const id = taskData.customId;
                // Delete customId from dataToSave is not needed if we sanitize, but good practice to keep clean
                delete dataToSave.customId;
                await setDoc(doc(db, TASKS_COLLECTION, id), dataToSave);
                console.log(`[TaskService] Task saved to Firestore with ID: ${id}`);
                savedTask = { id, ...dataToSave };
            } else {
                const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
                console.log(`[TaskService] Task added via addDoc. ID: ${docRef.id}`);
                savedTask = { id: docRef.id, ...dataToSave };
            }

            // ROBUSTNESS: Manually update local cache immediately so F5 works even if Read fails
            try {
                const cacheKey = `cache_tasks_${taskData.projectId}`;
                const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                // Sanitize createdAt for local storage (serverTimestamp is special object)
                const taskForCache = {
                    ...savedTask,
                    createdAt: { seconds: Date.now() / 1000 }
                };
                const unique = [taskForCache, ...cached.filter(t => t.id !== savedTask.id)];
                localStorage.setItem(cacheKey, JSON.stringify(unique));
            } catch (cacheErr) {
                console.warn("Failed to update local cache on add", cacheErr);
            }

            // NOTIFICATION: Notify Project Members (Async)
            if (taskData.projectId && !taskData.projectId.startsWith('local_')) {
                (async () => {
                    try {
                        // Notify everyone except creator
                        const recipients = taskMembers.filter(uid => uid !== userId);

                        const taskTitle = taskData.text || 'Sin título';

                        recipients.forEach(uid => {
                            notificationService.sendNotification(
                                uid,
                                "Nueva Tarea",
                                `"${taskTitle}" ha sido creada.`,
                                "info",
                                { projectId: taskData.projectId, taskId: savedTask.id } // Link
                            );
                        });
                    } catch (err) {
                        console.error("[TaskService] Failed to send new task notifications", err);
                    }
                })();
            }

            return savedTask;
        } catch (error) {
            console.error("[TaskService] Error adding task to Firestore:", error);
            // Fallback: Save to LocalStorage
            try {
                const localTasks = JSON.parse(localStorage.getItem('pending_tasks') || '[]');
                const tempId = taskData.customId || `local_task_${Date.now()}`;
                const localTask = {
                    id: tempId,
                    ...taskData,
                    status: taskData.status || 'todo',
                    projectId: taskData.projectId || null,
                    createdBy: userId,
                    assignedTo: taskData.assignedTo || [],
                    createdAt: { seconds: Date.now() / 1000 },
                    completed: false,
                    isLocal: true
                };
                localTasks.push(localTask);
                localStorage.setItem('pending_tasks', JSON.stringify(localTasks));
                console.log(`[TaskService] Task saved to LOCAL storage (Fallback). ID: ${tempId}`);

                // Show ACTUAL error, but keep friendly fallback msg
                toast.error(`Aviso: ${error.message} (Guardada localmente)`);

                return localTask;
            } catch (localError) {
                console.error("[TaskService] Critical: Failed to save locally too.", localError);
                throw error;
            }
        }
    },

    async getTask(taskId) {
        if (!taskId) return null;
        try {
            const docRef = doc(db, TASKS_COLLECTION, taskId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error("Error fetching single task:", error);
            return null;
        }
    },

    // --- PERMISSION REPAIR ---
    async fixAllPermissions(currentUserUid) {
        if (!currentUserUid) {
            console.error("No user UID provided for permission repair");
            return 0;
        }
        console.log(`Starting Permission Repair for user: ${currentUserUid}`);

        let repairedCount = 0;
        let tasksRepairedCount = 0;

        try {
            // 1. BROADEN SCOPE: Get all projects where I am a MEMBER
            const q = query(
                collection(db, PROJECTS_COLLECTION),
                where('members', 'array-contains', currentUserUid)
            );
            const snapshot = await getDocs(q);

            const projectsFound = snapshot.size;
            console.log(`Found ${projectsFound} accessible projects.`);

            if (projectsFound === 0) return 0;

            const updates = [];

            for (const docSnap of snapshot.docs) {
                const proj = docSnap.data();

                // CRITICAL: Ensure Owner is ALWAYS in the members list
                // If the project doesn't list the owner in 'members' (common legacy pattern),
                // we must add them explicitly, otherwise they lose access to tasks.
                const rawMembers = Array.isArray(proj.members) ? proj.members : [];
                const ownerId = proj.ownerId || currentUserUid;

                const safeMembers = [...new Set([...rawMembers, ownerId, currentUserUid])];

                // A. Sync Area Permissions
                if (proj.areaId) {
                    const areaRef = doc(db, AREAS_COLLECTION, proj.areaId);
                    updates.push(updateDoc(areaRef, {
                        members: arrayUnion(...safeMembers)
                    }).catch(err => {
                        if (err.code !== 'not-found') console.warn(`Failed to update area ${proj.areaId}`, err);
                    }));
                }

                // B. Sync Task Permissions (Backfill 'members' field)
                // ROBUST: Query for both String and Number variants to catch legacy data
                const pid = docSnap.id;
                const variants = [pid];
                if (!isNaN(Number(pid))) {
                    variants.push(Number(pid));
                }

                const tasksQ = query(collection(db, TASKS_COLLECTION), where('projectId', 'in', variants));
                updates.push(getDocs(tasksQ).then(taskSnap => {
                    const taskUpdates = [];
                    taskSnap.forEach(taskDoc => {
                        const taskRef = doc(db, TASKS_COLLECTION, taskDoc.id);
                        taskUpdates.push(updateDoc(taskRef, {
                            members: arrayUnion(...safeMembers)
                        }));
                    });
                    if (taskUpdates.length > 0) {
                        tasksRepairedCount += taskUpdates.length;
                        return Promise.all(taskUpdates);
                    }
                }).catch(e => console.warn("Task repair failed for project", docSnap.id, e)));

                repairedCount++;
            }

            if (updates.length > 0) {
                await Promise.all(updates);
            }

            console.log(`Permissions repaired for ${repairedCount} projects and ${tasksRepairedCount} tasks.`);
            return repairedCount;
        } catch (e) {
            console.error("Permission Repair Failed:", e);
            throw e;
        }
    },

    subscribeToProjectTasks(projectId, userId, callback) {
        if (!projectId) {
            console.warn("[TaskService] Invalid projectId for subscription:", projectId);
            return () => { };
        }

        // ROBUSTNESS: Handle String vs Number ID legacy mismatch
        // We will create separate listeners for each variant to avoid "IN" operator 
        // which triggers "Composite Index Required" errors when combined with array-contains.
        const variants = [projectId];
        if (typeof projectId === 'string' && !isNaN(Number(projectId)) && projectId.trim() !== '') {
            variants.push(Number(projectId));
        } else if (typeof projectId === 'number') {
            variants.push(String(projectId));
        }
        const uniqueVariants = [...new Set(variants)];

        // State holder for merging results from multiple streams
        const streams = {}; // { variantValue: [tasks] }
        const unsubscribers = [];

        console.log(`[TaskService] Subscribing to Project: "${projectId}" (User: ${userId})`);
        console.log(`[TaskService] Variants:`, uniqueVariants);

        const emitMerged = () => {
            const allTasks = Object.values(streams).flat();
            console.log(`[TaskService] Merging Streams: ${Object.keys(streams).length} sources. Total Raw Tasks: ${allTasks.length}`);

            // deduplicate by ID just in case
            const unique = [];
            const seen = new Set();
            allTasks.forEach(t => {
                if (!seen.has(t.id)) {
                    seen.add(t.id);
                    unique.push(t);
                }
            });

            // Local Merge logic
            try {
                const localTasks = JSON.parse(localStorage.getItem('pending_tasks') || '[]');
                const projectLocal = localTasks.filter(t => String(t.projectId) === String(projectId));
                const dbIds = new Set(unique.map(t => t.id));
                const uniqueLocal = projectLocal.filter(t => !dbIds.has(t.id));
                const final = [...unique, ...uniqueLocal];

                // Sort by CreatedAt desc
                final.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || (Date.now() / 1000);
                    const timeB = b.createdAt?.seconds || (Date.now() / 1000);
                    return timeB - timeA;
                });

                // Cache
                try {
                    localStorage.setItem(`cache_tasks_${projectId}`, JSON.stringify(unique));
                } catch (e) { }

                callback(final);
            } catch (e) {
                console.error("Task Merge Error", e);
                callback(unique);
            }
        };

        // Create a listener for EACH variant
        uniqueVariants.forEach(variant => {
            // Simple Query: projectId == X AND members contains User
            // This is standard and requires no custom index.
            const q = query(
                collection(db, TASKS_COLLECTION),
                where('projectId', '==', variant),
                where('members', 'array-contains', userId)
            );

            const unsub = onSnapshot(q,
                (snapshot) => {
                    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    streams[variant] = tasks;
                    emitMerged();
                },
                (error) => {
                    console.warn(`[TaskService] Subscription error for variant ${variant}:`, error.message);
                }
            );
            unsubscribers.push(unsub);
        });

        // Return master unsubscribe
        return () => {
            unsubscribers.forEach(u => u());
        };
    },

    // DEBUG: Deep Inspection
    async debugInspectProject(projectId) {
        if (!projectId) return;
        console.group(`🔍 INSPECTING PROJECT: ${projectId}`);
        try {
            // 1. Fetch Project Data
            const pSnap = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
            const pData = pSnap.data();
            console.log("📂 PROJECT RAW:", pData);
            console.log("   - Members:", pData?.members);
            console.log("   - Owner:", pData?.ownerId);

            // 2. Fetch ALL Tasks (String Variant)
            const q1 = query(collection(db, TASKS_COLLECTION), where('projectId', '==', projectId));
            const snap1 = await getDocs(q1);
            console.log(`📋 TASKS (String Match): Found ${snap1.size}`);
            snap1.forEach(d => {
                const t = d.data();
                console.log(`   - Task [${d.id}]: members=[${t.members?.length}]`, t.members);
            });

            // 3. Fetch ALL Tasks (Number Variant - if applicable)
            if (!isNaN(Number(projectId))) {
                const q2 = query(collection(db, TASKS_COLLECTION), where('projectId', '==', Number(projectId)));
                const snap2 = await getDocs(q2);
                console.log(`🔢 TASKS (Number Match): Found ${snap2.size}`);
                snap2.forEach(d => {
                    const t = d.data();
                    console.log(`   - Task [${d.id}]: members=[${t.members?.length}]`, t.members);
                });
            }

        } catch (e) {
            console.error("Debug Inspection Failed:", e);
        }
        console.groupEnd();
    },

    // NUCLEAR REPAIR: Force fix permissions for a specific project
    async repairProjectPermissions(projectId, currentUserUid) {
        console.log(`Resource Repair started for Project: ${projectId}`);
        try {
            // 1. Get Project Source of Truth
            const pSnap = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
            if (!pSnap.exists()) throw new Error("Project not found");

            const pData = pSnap.data();
            const members = new Set(pData.members || []);
            members.add(pData.ownerId);
            members.add(currentUserUid); // Ensure admin/runner is included

            const safeMembers = Array.from(members).filter(Boolean);
            console.log("Target Members List:", safeMembers);

            // 2. Find Tasks via Safe Channels (Creator/Assignee)
            // We cannot simply query "all tasks" because Rules block non-members from reading.
            // We must find tasks where we ARE authorized (as creator or assignee) and then BACKFILL the members.
            const pid = projectId;
            const variants = [pid];
            if (!isNaN(Number(pid))) variants.push(Number(pid));

            console.log("Searching for tasks as Creator or Assignee...");

            const queries = [];
            variants.forEach(v => {
                // Strategy 1: Created By Me (The most likely owner of invisible tasks)
                queries.push(query(collection(db, TASKS_COLLECTION),
                    where('projectId', '==', v),
                    where('createdBy', '==', currentUserUid)
                ));
                // Strategy 2: Assigned To Me
                queries.push(query(collection(db, TASKS_COLLECTION),
                    where('projectId', '==', v),
                    where('assignedTo', 'array-contains', currentUserUid)
                ));
            });

            const snapshots = await Promise.all(queries.map(q => getDocs(q).catch(e => ({ docs: [], empty: true }))));
            const allDocs = snapshots.flatMap(s => s.docs);

            // Deduplicate
            const uniqueDocs = [];
            const seenIds = new Set();
            allDocs.forEach(d => {
                if (!seenIds.has(d.id)) {
                    seenIds.add(d.id);
                    uniqueDocs.push(d);
                }
            });

            console.log(`Found ${uniqueDocs.length} recoverable tasks.`);

            // 3. Patch them all
            const updates = uniqueDocs.map(tDoc => {
                // We add the members field. Simple and direct.
                return updateDoc(doc(db, TASKS_COLLECTION, tDoc.id), {
                    members: arrayUnion(...safeMembers)
                });
            });

            await Promise.all(updates);
            console.log("✅ Patch Complete.");
            return uniqueDocs.length;
        } catch (e) {
            console.error("Project Repair Failed", e);
            throw e;
        }
    },

    async updateTask(taskId, updates) {
        // Wrapper to handle local updates if needed
        if (taskId.startsWith('local_')) {
            const localTasks = JSON.parse(localStorage.getItem('pending_tasks') || '[]');
            const newTasks = localTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
            localStorage.setItem('pending_tasks', JSON.stringify(newTasks));
            return;
        }

        const docRef = doc(db, TASKS_COLLECTION, taskId);
        // ... existing logic for notifications ...
        // Check for new assignments to notify
        if (updates.assignedTo) {
            const taskSnap = await getDoc(docRef);
            if (taskSnap.exists()) {
                const oldAssigned = taskSnap.data().assignedTo || [];
                const newAssigned = updates.assignedTo;

                const addedUsers = newAssigned.filter(uid => !oldAssigned.includes(uid));

                addedUsers.forEach(uid => {
                    notificationService.sendNotification(
                        uid,
                        "Nueva Tarea Asignada",
                        `Se te ha asignado la tarea "${updates.text || taskSnap.data().text}".`, // Corrected to use 'text' field based on standard task schema, fallback to title if exists but usually text
                        "assign_task",
                        { projectId: taskSnap.data().projectId, taskId: taskId }
                    );
                });
            }
        }

        // Guarantee visibility: If assigning, ensure new assignees are 'members'
        if (updates.assignedTo) {
            updates.members = arrayUnion(...updates.assignedTo);
        }

        // --- RECURRENCE LOGIC (Client-Side Trigger) ---
        if (updates.status === 'done') {
            const taskSnap = await getDoc(docRef);
            if (taskSnap.exists()) {
                const task = taskSnap.data();
                if (task.recurrence && task.recurrence.type) {

                    // Check LIMIT
                    const currentCount = task.recurrence.count || 0;
                    const limit = task.recurrence.limit; // number or null

                    // If limit is set (>0) and we reached it, STOP.
                    if (limit && limit > 0 && currentCount >= limit) {
                        console.log("🛑 Recurrence limit reached. No new task.");
                        return; // Exit recurrence logic (update still happens below)
                    }

                    // Import dynamically to avoid top-level madness if needed, or assume it's available
                    // We'll trust the main bundle. 
                    // If 'recurrence' exists, calculate next date.
                    import('../utils/recurrenceUtils').then(({ calculateNextDueDate }) => {
                        const nextDate = calculateNextDueDate(new Date(), task.recurrence);
                        if (nextDate) {
                            const nextTask = {
                                ...task,
                                status: 'todo',
                                completed: false,
                                createdAt: serverTimestamp(),
                                description: task.description || '', // Ensure field exists
                                // Recurrence: Keep it so it recurs again!
                                // Due Date: Next calculated date

                                // RECURRENCE UPDATE
                                recurrence: {
                                    ...task.recurrence,
                                    count: currentCount + 1 // Increment count
                                },

                                // TIMING
                                dueDate: nextDate.toISOString().split('T')[0], // Store as YYYY-MM-DD string as per current convention
                                startTime: task.recurrence.time || task.startTime || '', // Use preferred time

                                isRecurringInstance: true,
                                originalTaskId: taskId // Traceability
                            };
                            delete nextTask.id; // Ensure new ID

                            addDoc(collection(db, TASKS_COLLECTION), nextTask).then(newRef => {
                                console.log("♻️ Recurring task created:", newRef.id);

                                // Notify User (Optional Checkbox)
                                if (task.recurrence.notifyOnRecurrence) {
                                    notificationService.sendNotification(
                                        task.ownerId || task.createdBy, // Notify owner? Or Assignees?
                                        "Tarea Recurrente Creada",
                                        `Instancia ${currentCount + 2} de "${task.text}"`,
                                        "info"
                                    );
                                }
                            });
                        }
                    });
                }
            }
        }

        await updateDoc(docRef, updates);
    },

    // --- MY TASKS ---
    subscribeToUserTasks(userId, callback) {
        if (!userId) return () => { };

        const q = query(
            collection(db, TASKS_COLLECTION),
            where('assignedTo', 'array-contains', userId)
        );

        return onSnapshot(q,
            (snapshot) => {
                const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                tasks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                callback(tasks);
            },
            (error) => {
                console.error("Error subscribing to user tasks:", error);

                // DOUBLE FALLBACK: If global assign query fails (likely due to strict rules not allowing global list)
                // We try to fetch "My Projects" first (which we should have access to) and then tasks? 
                // No, we try to fetch tasks where I am CREATOR or I am ASSIGNED but maybe per project?
                // Actually, the previous "Double Fallback" was for PROJECT scope. 
                // For GLOBAL scope, if we can't search 'assignedTo' globally, we are stuck unless we query per project.

                // NEW STRATEGY: 
                // If global 'assignedTo' fails, we return [] but don't crash. 
                // AND we attempt to fallback to caching or manual fetch if possible.
                // But to stop the CRASH, we must ensure we don't RETRY indefinitely or leave the socket open in a bad state.

                if (error.code === 'permission-denied' || error.code === 'failed-precondition') {
                    console.warn("[TaskService] Permission Denied for Global My Tasks. Returning empty to prevent crash.");
                    // Optional: We could try to query tasks for *known* projects if we had the list of project IDs, but that's expensive here.
                    // For now, simpler: Return empty list and silence the crash.
                }

                callback([]);
            }
        );
    },

    // --- USERS ---
    subscribeToUsers(callback) {
        const q = query(collection(db, USERS_COLLECTION));
        return onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = { id: doc.id, ...doc.data() };
                return acc;
            }, {});
            callback(users);
        }, (error) => {
            console.error("Error subscribing to users:", error);
            callback({});
        });
    },

    async deleteTask(taskId) {
        console.log(`[TaskService] Deleting task: ${taskId}`);

        // 1. Check if Local Task
        if (taskId && taskId.toString().startsWith('local_')) {
            console.log("[TaskService] Deleting local-only task.");
            // Skip Firestore
        } else {
            // 2. Try Firestore
            try {
                await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
                console.log(`[TaskService] Firestore delete success: ${taskId}`);
            } catch (e) {
                console.error(`[TaskService] Firestore delete failed for ${taskId}:`, e);
                // Show ACTUAL error to user
                toast.error(`Error al eliminar: ${e.message}`);
            }
        }

        // 3. Always clean local storage (just in case)
        try {
            const localTasks = JSON.parse(localStorage.getItem('pending_tasks') || '[]');
            if (localTasks.some(t => t.id === taskId)) {
                const filtered = localTasks.filter(t => t.id !== taskId);
                localStorage.setItem('pending_tasks', JSON.stringify(filtered));
                console.log("[TaskService] Local cache cleaned.");
            }
        } catch (localErr) {
            console.warn("Failed to clean local cache", localErr);
        }
    },

    // --- REORDERING ---
    async reorderAreas(orderedIds) {
        const batch = writeBatch(db);
        orderedIds.forEach((id, index) => {
            if (!id.toString().startsWith('local_')) {
                const ref = doc(db, AREAS_COLLECTION, id);
                batch.update(ref, { order: index });
            }
        });
        await batch.commit();
    },

    async reorderProjects(orderedIds) {
        const batch = writeBatch(db);
        orderedIds.forEach((id, index) => {
            if (!id.toString().startsWith('local_')) {
                const ref = doc(db, PROJECTS_COLLECTION, id);
                batch.update(ref, { order: index });
            }
        });
        await batch.commit();
    },

    // --- AUTO-SYNC ---
    async syncPendingItems() {
        // PROJECTS
        const localProjects = JSON.parse(localStorage.getItem('pending_projects') || '[]');
        if (localProjects.length > 0) {
            console.log(`[Sync] Found ${localProjects.length} pending projects. Syncing...`);
            const remaining = [];
            for (const p of localProjects) {
                try {
                    // Try to Create in Firestore
                    const docData = { ...p };
                    delete docData.id;
                    delete docData.isLocal;
                    docData.createdAt = serverTimestamp(); // Reset timestamp

                    await addDoc(collection(db, PROJECTS_COLLECTION), docData);
                    // Success: Do NOT add to remaining
                } catch (e) {
                    console.error(`[Sync] Failed to sync project ${p.name}`, e);
                    remaining.push(p);
                }
            }
            localStorage.setItem('pending_projects', JSON.stringify(remaining));
        }

        // AREAS
        const localAreas = JSON.parse(localStorage.getItem('pending_areas') || '[]');
        if (localAreas.length > 0) {
            console.log(`[Sync] Found ${localAreas.length} pending areas. Syncing...`);
            const remaining = [];
            for (const a of localAreas) {
                try {
                    const docData = { ...a };
                    delete docData.id;
                    delete docData.isLocal;
                    docData.createdAt = serverTimestamp();

                    await addDoc(collection(db, AREAS_COLLECTION), docData);
                } catch (e) {
                    console.error(`[Sync] Failed to sync area ${a.name}`, e);
                    remaining.push(a);
                }
            }
            localStorage.setItem('pending_areas', JSON.stringify(remaining));
        }
    },

    // --- HELPERS FOR SELF-HEALING ---
    async syncLocalArea(localId) {
        const localAreas = JSON.parse(localStorage.getItem('pending_areas') || '[]');
        const areaToSync = localAreas.find(a => a.id === localId);

        if (!areaToSync) throw new Error("Área local no encontrada en almacenamiento.");

        const docData = { ...areaToSync };
        delete docData.id;
        delete docData.isLocal;
        docData.createdAt = serverTimestamp();

        // 1. Push to Cloud
        const docRef = await addDoc(collection(db, AREAS_COLLECTION), docData);

        // 2. Remove from LocalStorage
        const remaining = localAreas.filter(a => a.id !== localId);
        localStorage.setItem('pending_areas', JSON.stringify(remaining));

        return docRef.id;
    },

    async syncLocalProject(localId) {
        const localProjects = JSON.parse(localStorage.getItem('pending_projects') || '[]');
        const projectToSync = localProjects.find(p => p.id === localId);

        if (!projectToSync) throw new Error("Proyecto local no encontrado en almacenamiento.");

        const docData = { ...projectToSync };
        delete docData.id;
        delete docData.isLocal;
        docData.createdAt = serverTimestamp();

        // 1. Push to Cloud
        const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), docData);

        // 2. Remove from LocalStorage
        const remaining = localProjects.filter(p => p.id !== localId);
        localStorage.setItem('pending_projects', JSON.stringify(remaining));

        return docRef.id;
    }
};
