import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    startAt,
    endAt,
    deleteDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'clients';

export const clientService = {
    // Search clients by name (Simple prefix search)
    searchClients: async (searchText) => {
        try {
            if (!searchText || searchText.length < 2) return [];

            const term = searchText.trim();

            // 1. Standard Search (As typed)
            const q1 = query(
                collection(db, COLLECTION_NAME),
                orderBy('name'),
                startAt(term),
                endAt(term + '\uf8ff'),
                limit(5)
            );

            // 2. Capitalized Search (First char upper, rest lower) - fixes "fredy" -> "Fredy"
            const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
            const q2 = query(
                collection(db, COLLECTION_NAME),
                orderBy('name'),
                startAt(capitalizedTerm),
                endAt(capitalizedTerm + '\uf8ff'),
                limit(5)
            );

            // Execute in parallel
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const results = new Map();

            const processDoc = (doc) => {
                results.set(doc.id, { id: doc.id, ...doc.data() });
            };

            snap1.docs.forEach(processDoc);
            snap2.docs.forEach(processDoc);

            return Array.from(results.values());
        } catch (error) {
            console.error("Error searching clients:", error);
            return [];
        }
    },

    // Create a new client
    createClient: async (clientData) => {
        try {
            // Check for duplicates by email or phone? 
            // User implies simple flow. Let's just add.
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...clientData,
                createdAt: new Date().toISOString()
            });
            return { id: docRef.id, ...clientData };
        } catch (error) {
            console.error("Error creating client:", error);
            throw error;
        }
    },

    // Get client by ID
    getClientById: async (clientId) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, clientId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error("Error getting client:", error);
            null;
        }
    },

    // Get all clients (Basic pagination/limit)
    getAllClients: async (limitCount = 100) => {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                orderBy('createdAt', 'desc'), // Newest first
                limit(limitCount)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting all clients:", error);
            return [];
        }
    },

    // Update client
    updateClient: async (clientId, updates) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, clientId);
            await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating client:", error);
            throw error;
        }
    },

    // Delete client (Soft delete preferred but user asked for "Eliminar" - stick to Hard Delete or Flag?)
    // Let's do hard delete for now as it's a settings management tool, but maybe safe checks?
    // Actually, usually we don't want to break tickets. 
    // Let's do Soft Delete if possible or just normal delete if user wants full control.
    // I'll implement standard delete for now.
    deleteClient: async (clientId) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, clientId));
            return true;
        } catch (error) {
            console.error("Error deleting client:", error);
            throw error;
        }
    },

    // Import clients from existing tickets (Migration helper)
    importClientsFromHistory: async () => {
        try {
            const ticketsRef = collection(db, 'tickets');
            // We fetch all tickets? Use limit if too many, but for now we need all to find unique names.
            // Optimized: Order by date desc, limit 500? User said "several names".
            // Optimized: Remove orderBy to avoid index requirement errors for now.
            // Just fetch a large batch of tickets.
            const q = query(ticketsRef, limit(2000));
            const snapshot = await getDocs(q);

            const uniqueClients = new Map();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.nombreCliente && !uniqueClients.has(data.nombreCliente.toLowerCase())) {
                    uniqueClients.set(data.nombreCliente.toLowerCase(), {
                        name: data.nombreCliente,
                        phone: data.clientPhone || '',
                        email: data.clientEmail || '',
                        rut: data.clientRut || '',
                        address: data.clientAddress || '',
                        alias: data.clientAlias || ''
                    });
                }
            });

            // Batch write is limited to 500. We'll do serial adds for simplicity or chunks.
            // Also check if already exists in clients selection?
            // For MVP: Just try to add if 'search' returns empty? 
            // Better: Just add all unique found. Firestore 'addDoc' duplicates if we don't check.
            // Let's rely on 'name' being unique? No, Firestore is ID based.
            // Strategy: Check if client exists by name before adding.

            let addedCount = 0;
            for (const client of uniqueClients.values()) {
                // Check exist
                const existQ = query(collection(db, COLLECTION_NAME), where('name', '==', client.name));
                const existSnap = await getDocs(existQ);

                if (existSnap.empty) {
                    await addDoc(collection(db, COLLECTION_NAME), {
                        ...client,
                        source: 'imported_history', // Flag to know
                        createdAt: new Date().toISOString()
                    });
                    addedCount++;
                }
            }

            return { success: true, count: addedCount, totalFound: uniqueClients.size };
        } catch (error) {
            console.error("Import error", error);
            return { success: false, error: error.message };
        }
    }
};
