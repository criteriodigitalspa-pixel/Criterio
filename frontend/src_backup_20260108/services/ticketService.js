import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp, writeBatch, limit, arrayUnion, where, runTransaction, onSnapshot } from 'firebase/firestore';

const COLLECTION = 'tickets';
const HISTORY_COLLECTION = 'ticket_history'; // We can use this if we want a global history, or just subcollections

const COUNTERS_COLLECTION = 'counters';

// Helper to calculate IDs inside a transaction
const getNextId = async (transaction, type, count = 1) => {
    const counterRef = doc(db, COUNTERS_COLLECTION, type);
    const counterDoc = await transaction.get(counterRef);

    let nextSequence;
    let currentPrefix = "";

    // Date logic for Tickets
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // "25"
    // Ticket Prefix: YY (e.g. "25")
    // Batch Prefix: "L" (Fixed)

    if (type === 'tickets') {
        const targetPrefix = `${year}`;

        if (!counterDoc.exists()) {
            // First ever ticket
            nextSequence = 1;
            transaction.set(counterRef, { count: count, prefix: targetPrefix });
            currentPrefix = targetPrefix;
        } else {
            const data = counterDoc.data();
            // Check for Year Rollover
            if (data.prefix !== targetPrefix) {
                nextSequence = 1;
                transaction.set(counterRef, { count: count, prefix: targetPrefix });
                currentPrefix = targetPrefix;
            } else {
                nextSequence = data.count + 1;
                transaction.update(counterRef, { count: data.count + count });
                currentPrefix = data.prefix;
            }
        }

        // Return array of IDs
        // Format: YY-XXXX (e.g. 25-0001)
        const ids = [];
        for (let i = 0; i < count; i++) {
            ids.push(`${currentPrefix}-${(nextSequence + i).toString().padStart(4, '0')}`);
        }
        return ids;

    } else if (type === 'batches') {
        // Batch Logic: "L" + 3 digits (001...999...)
        if (!counterDoc.exists()) {
            nextSequence = 1;
            transaction.set(counterRef, { count: count });
        } else {
            const data = counterDoc.data();
            nextSequence = data.count + 1;
            transaction.update(counterRef, { count: data.count + count });
        }

        const ids = [];
        for (let i = 0; i < count; i++) {
            // Format: L001
            ids.push(`L${(nextSequence + i).toString().padStart(3, '0')}`);
        }
        return ids;
    }
};

export const ticketService = {

    async addTicket(data, userId) {
        try {
            return await runTransaction(db, async (transaction) => {
                // PHASE 1: READS (Must be all done before any write)
                const ticketCounterRef = doc(db, COUNTERS_COLLECTION, 'tickets');
                const batchCounterRef = doc(db, COUNTERS_COLLECTION, 'batches');

                const ticketDoc = await transaction.get(ticketCounterRef);
                const batchDoc = await transaction.get(batchCounterRef);

                // PHASE 2: CALCULATE TICKET ID
                const date = new Date();
                const year = date.getFullYear().toString().slice(-2); // "25"
                const targetPrefix = `${year}`;

                let nextTicketSeq = 1;
                let currentTicketPrefix = targetPrefix;
                let ticketCounterUpdate = { count: 1, prefix: targetPrefix };
                let isTicketNew = true;

                if (ticketDoc.exists()) {
                    const d = ticketDoc.data();
                    if (d.prefix === targetPrefix) {
                        nextTicketSeq = d.count + 1;
                        currentTicketPrefix = d.prefix; // "25"
                        ticketCounterUpdate = { count: d.count + 1 };
                        isTicketNew = false;
                    }
                    // else: Loop year logic already set defaults above
                }

                const smartId = `${currentTicketPrefix}-${nextTicketSeq.toString().padStart(4, '0')}`;


                // PHASE 3: CALCULATE BATCH ID (Single Ticket = 1 Batch)
                let nextBatchSeq = 1;
                let batchCounterUpdate = { count: 1 };
                let isBatchNew = true;

                if (batchDoc.exists()) {
                    const d = batchDoc.data();
                    nextBatchSeq = d.count + 1;
                    batchCounterUpdate = { count: d.count + 1 };
                    isBatchNew = false;
                }
                const batchId = `L${nextBatchSeq.toString().padStart(3, '0')}`;


                // PHASE 4: WRITES (All sets/updates)

                // Update Ticket Counter
                if (isTicketNew) {
                    transaction.set(ticketCounterRef, ticketCounterUpdate);
                } else {
                    transaction.update(ticketCounterRef, ticketCounterUpdate);
                }

                // Update Batch Counter
                if (isBatchNew) {
                    transaction.set(batchCounterRef, batchCounterUpdate);
                } else {
                    transaction.update(batchCounterRef, batchCounterUpdate);
                }

                // Write Ticket
                const newDocRef = doc(collection(db, COLLECTION));
                const ticketData = {
                    currentArea: 'Compras',
                    status: 'Active',
                    qaProgress: 0,
                    qaChecklist: {},
                    additionalInfoComplete: false,
                    ...data,
                    ticketId: smartId,
                    batchId: batchId,
                    createdAt: serverTimestamp(),
                    createdBy: userId,
                    history: [],
                };
                transaction.set(newDocRef, ticketData);

                // Write History
                const historyRef = doc(collection(db, COLLECTION, newDocRef.id, 'history'));
                transaction.set(historyRef, {
                    action: 'CREATE',
                    area: 'Compras',
                    userId,
                    timestamp: serverTimestamp(),
                    note: 'Ticket Ingresado'
                });

                return { id: newDocRef.id, ticketId: smartId, batchId };
            });
        } catch (error) {
            console.error("Error adding ticket (Transaction):", error);
            throw error;
        }
    },

    async createBatch(tickets, userId) {
        try {
            return await runTransaction(db, async (transaction) => {
                // PHASE 1: READS (Must come before ANY writes)
                const batchCounterRef = doc(db, COUNTERS_COLLECTION, 'batches');
                const ticketCounterRef = doc(db, COUNTERS_COLLECTION, 'tickets');

                const batchDoc = await transaction.get(batchCounterRef);
                const ticketDoc = await transaction.get(ticketCounterRef);

                // PHASE 2: CALCULATIONS & ID GENERATION

                // A. Calculate Batch ID
                let nextBatchSeq;
                if (!batchDoc.exists()) {
                    nextBatchSeq = 1;
                } else {
                    nextBatchSeq = batchDoc.data().count + 1;
                }
                // Generate Batch ID string: L001
                const batchId = `L${nextBatchSeq.toString().padStart(3, '0')}`;


                // B. Calculate Ticket IDs
                const count = tickets.length;
                let nextTicketSeq;
                let currentPrefix = "";
                const date = new Date();
                const year = date.getFullYear().toString().slice(-2); // "25"
                const targetPrefix = `${year}`;

                let ticketCounterUpdate = {};
                let isTicketResetOrNew = false;

                if (!ticketDoc.exists()) {
                    nextTicketSeq = 1;
                    currentPrefix = targetPrefix;
                    ticketCounterUpdate = { count: count, prefix: targetPrefix };
                    isTicketResetOrNew = true;
                } else {
                    const data = ticketDoc.data();
                    if (data.prefix !== targetPrefix) {
                        nextTicketSeq = 1;
                        currentPrefix = targetPrefix;
                        ticketCounterUpdate = { count: count, prefix: targetPrefix };
                        isTicketResetOrNew = true;
                    } else {
                        nextTicketSeq = data.count + 1;
                        currentPrefix = data.prefix;
                        ticketCounterUpdate = { count: data.count + count };
                        isTicketResetOrNew = false;
                    }
                }

                const ticketIds = [];
                for (let i = 0; i < count; i++) {
                    ticketIds.push(`${currentPrefix}-${(nextTicketSeq + i).toString().padStart(4, '0')}`);
                }


                // PHASE 3: WRITES

                // 1. Update Counters
                if (!batchDoc.exists()) {
                    transaction.set(batchCounterRef, { count: 1 });
                } else {
                    transaction.update(batchCounterRef, { count: batchDoc.data().count + 1 });
                }

                if (isTicketResetOrNew) {
                    transaction.set(ticketCounterRef, ticketCounterUpdate);
                } else {
                    transaction.update(ticketCounterRef, ticketCounterUpdate);
                }

                // 2. Create Tickets
                const refList = [];
                tickets.forEach((data, index) => {
                    const smartId = ticketIds[index];
                    const newDocRef = doc(collection(db, COLLECTION));

                    const ticketData = {
                        currentArea: 'Compras',
                        status: 'Active',
                        qaProgress: 0,
                        qaChecklist: {},
                        additionalInfoComplete: false,
                        ...data,
                        ticketId: smartId,
                        batchId: batchId, // Unified Batch ID
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                        movedToAreaAt: serverTimestamp(), // SLA Start Time for "Compras"
                        createdBy: userId,
                        history: []
                    };

                    transaction.set(newDocRef, ticketData);
                    refList.push({ id: newDocRef.id, ticketId: smartId });

                    // History
                    const historyRef = doc(collection(db, COLLECTION, newDocRef.id, 'history'));
                    transaction.set(historyRef, {
                        action: 'CREATE',
                        area: 'Compras',
                        userId,
                        timestamp: serverTimestamp(),
                        note: 'Ingreso Lote'
                    });
                });

                return { batchId, tickets: refList };
            });

        } catch (error) {
            console.error("Error creating batch (Transaction):", error);
            throw error;
        }
    },

    async getTicketByDisplayId(displayId) {
        try {
            const q = query(collection(db, COLLECTION), where("ticketId", "==", displayId), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error("Error getting ticket by ID:", error);
            throw error;
        }
    },

    async getAllTickets() {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // REAL-TIME LISTENER
    subscribeToTickets(callback, onError) {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        return onSnapshot(q,
            (snapshot) => {
                const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(tickets);
            },
            (error) => {
                console.error("CRITICAL FIRESTORE ERROR (subscribeToTickets):", error);
                if (onError) onError(error);
            }
        );
    },

    async updateTicket(ticketId, updates, audit = null) {
        const ref = doc(db, COLLECTION, ticketId);

        // 1. Perform Update
        await updateDoc(ref, updates);

        // 2. Audit Log (If provided)
        if (audit && audit.userId) {
            await this.logHistory(ticketId, 'UPDATE', updates.currentArea || 'Unknown', audit.userId, {
                reason: audit.reason || 'General Update',
                changes: updates, // Store the raw changes for diffing
                snapshot: audit.snapshot || null // Optional full snapshot
            });
        }
    },

    async moveTicket(docId, targetArea, userId, extraDetails = {}) {
        const ref = doc(db, COLLECTION, docId);

        // Extract business logic data
        const safeDetails = extraDetails || {};
        const payload = safeDetails.inputData || safeDetails;

        // Prepare updates
        const updates = {
            currentArea: targetArea,
            updatedAt: serverTimestamp(),
            movedToAreaAt: serverTimestamp() // SLA Reset for new area
        };

        // If we have detailed service analysis (Real vs Budget), persist it
        if (payload.realDataAnalysis || payload.newServiceActions) {
            if (payload.realDataAnalysis) {
                const logEntry = {
                    type: 'SERVICE_CYCLE',
                    timestamp: new Date().toISOString(),
                    area: targetArea,
                    fromArea: extraDetails.snapshot?.previousArea || 'Unknown',
                    analysis: payload.realDataAnalysis,
                    swaps: payload.hardwareSwaps || null,
                    tech: userId,
                    note: payload.newServiceActions ? "Transferencia entre Servicios" : "Salida de Servicio"
                };

                await updateDoc(ref, {
                    serviceLogs: arrayUnion(logEntry)
                });
            }

            if (payload.newServiceActions) {
                updates.serviceActions = payload.newServiceActions;
                updates.totalServiceCost = payload.totalServiceCost;
                updates.totalServiceTime = payload.totalServiceTime;
            }

            if (payload.resolvedHardware) {
                Object.values(payload.resolvedHardware).forEach(hw => {
                    if (hw.ram) updates.ram = hw.ram;
                    if (hw.disk) updates.disco = hw.disk;
                });
            }
        }

        // --- PROMOTE WAITING ROOM REASON ---
        if (targetArea === 'Caja Espera') {
            if (payload.motivoEspera) updates.motivoEspera = payload.motivoEspera;
            if (payload.obsEspera) updates.obsEspera = payload.obsEspera;

            // --- MANDATORY BUDGET FIELDS ---
            if (payload.budgetStatus || payload.budgetCost) {
                // We need to construct the budget object carefully.
                // Since this is a move, we might be initializing it.
                // We use dot notation for nested updates to avoid overwriting existing budget data if any (though unlikely on entry)
                if (payload.budgetStatus) updates['budget.status'] = payload.budgetStatus;
                if (payload.budgetCost) {
                    updates['budget.partsCost'] = payload.budgetCost;
                    updates['budget.lastUpdated'] = new Date(); // timestamp
                }
                // Also update main extra costs if needed?
                // TicketBudgetModal updates 'costosExtra' as the sum of parts + shipping.
                // Here we only have partsCost. We should probably set shipping to 0 if undefined?
                // Or just set 'costosExtra' to partsCost for now.
                if (payload.budgetCost) {
                    updates.costosExtra = Number(payload.budgetCost);
                }
            }
        }

        // --- WOOCOMMERCE INTEGRATION START ---
        if (targetArea === 'Caja Despacho') {
            // Extract Prices from Payload (defined in transitionRules)
            const salePrice = payload.precioVenta;
            const offerPrice = payload.precioOferta;

            if (salePrice) {
                updates.precioVenta = salePrice;
                if (offerPrice) updates.precioOferta = offerPrice;

                // We need the FULL ticket data for the sync.
                // We can use the snapshot passed in extraDetails if available, or fetch it.
                // Best practice: Fetch fresh to be sure, or merge snapshot + updates.
                // Since this is inside a move operation, the snapshot might be slightly stale regarding 'currentArea',
                // but the specs (CPU, RAM) should be stable.
                // Let's rely on extracting `ticketId` and spec fields from snapshot.

                try {
                    // Lazy load to avoid circular dependencies
                    const { wooCommerceService } = await import('./wooCommerceService');
                    const { calculateReadiness } = await import('../utils/wooCommerceReadiness');

                    const ticketForSync = {
                        ...(extraDetails.snapshot || {}),
                        ...updates, // Apply the new area and price
                        id: docId
                    };

                    // Validate Readiness
                    const readiness = calculateReadiness(ticketForSync, ticketForSync.images);

                    if (readiness.isReady) {
                        console.log("Triggering WooCommerce Sync for", ticketForSync.ticketId);
                        await wooCommerceService.syncProduct(ticketForSync, salePrice);
                        updates.wcSyncStatus = 'success';
                        updates.wcLastSync = serverTimestamp();
                    } else {
                        console.warn("Skipping WooCommerce Sync: Not Ready", readiness.missing);
                        updates.wcSyncStatus = 'skipped';
                        updates.wcSyncError = `Falta: ${readiness.missing.join(', ')}`;
                    }

                } catch (wcError) {
                    console.error("WooCommerce Sync Failed:", wcError);
                    updates.wcSyncStatus = 'error';
                    updates.wcSyncError = wcError.message;
                    // We still allow the move, but log the error on the ticket
                }
            }
        }
        // --- WOOCOMMERCE INTEGRATION END ---

        // Apply Updates
        await updateDoc(ref, updates);

        // Log History (Move is a specific type of update)
        await this.logHistory(docId, 'MOVE', targetArea, userId, {
            ...extraDetails,
            reason: 'Move Ticket'
        });
    },

    // Detailed Audit Logging
    async logHistory(ticketDocId, action, area, userId, details = {}) {
        try {
            const timestamp = new Date().toISOString(); // Uniform ISO string for array
            const logEntry = {
                action,
                area,
                userId,
                timestamp: serverTimestamp(), // For Firestore Subcollection
                ...details
            };

            // 1. Write to Subcollection (Full Audit)
            const historyRef = collection(db, COLLECTION, ticketDocId, 'history');
            await addDoc(historyRef, logEntry);

            // 2. Sync to Parent Document Array (For UI Reads)
            // We use a slightly different object for the array to avoid serverTimestamp issues mixed with arrayUnion if needed,
            // but usually it's fine. However, let's use the ISO timestamp for the array to be safe and consistent.
            const uiEntry = {
                ...logEntry,
                timestamp: timestamp // Use client-side ISO for the array to ensure immediate UI usability without refetch
            };

            const ticketRef = doc(db, COLLECTION, ticketDocId);
            await updateDoc(ticketRef, {
                history: arrayUnion(uiEntry)
            });

        } catch (error) {
            console.error("Error logging history:", error);
        }
    },

    // Specific QA Logging
    async logQA(ticketDocId, area, checklist, progress, userId) {
        await this.logHistory(ticketDocId, 'QA_UPDATE', area, userId, {
            qaChecklist: checklist,
            qaProgress: progress,
            changes: { qaProgress: progress },
            reason: `QA updated to ${progress}%`
        });
    },

    // NEW: Soft Delete Ticket (Preserves for Audit/Export)
    async deleteTicket(docId, userId) {
        const ref = doc(db, COLLECTION, docId);
        // Soft Delete: Set status to 'Deleted'
        await updateDoc(ref, {
            status: 'Deleted',
            deletedAt: serverTimestamp(),
            deletedBy: userId || 'System'
        });
        // Log it
        if (userId) {
            await this.logHistory(docId, 'DELETE', 'Bin', userId, { note: 'Ticket eliminado lógicamente' });
        }
    },

    // NEW: Clear All Tickets (Dev Helper - SOFT DELETE NOW)
    async clearAllTickets(userId) {
        const snapshot = await getDocs(collection(db, COLLECTION));
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, {
                status: 'Deleted',
                deletedAt: serverTimestamp(),
                deletedBy: userId || 'System - ClearAll'
            });
        });
        await batch.commit();
    },

    // NEW: Update Batch ID for multiple tickets
    async updateBatchId(ticketIds, newBatchId) {
        const batch = writeBatch(db);
        ticketIds.forEach(id => {
            const ref = doc(db, COLLECTION, id);
            batch.update(ref, {
                batchId: newBatchId,
                updatedAt: serverTimestamp()
            });
        });
        await batch.commit();
    },

    // NEW: Restore Ticket (Un-Delete)
    async restoreTicket(docId, userId) {
        const ref = doc(db, COLLECTION, docId);
        await updateDoc(ref, {
            status: 'Active',
            restoredAt: serverTimestamp(),
            restoredBy: userId || 'System'
        });
        await this.logHistory(docId, 'RESTORE', 'Bin', userId, { note: 'Ticket restaurado de la papelera' });
    },

    // NEW: Hard Delete (Permanent)
    async hardDeleteTicket(docId, userId) {
        const ref = doc(db, COLLECTION, docId);
        await deleteDoc(ref);
        // Note: History subcollection might remain orphan or need recursive delete if using client SDK, 
        // but typically standard deleteDoc only deletes the parent. 
        // For a true "Clean" hard delete we should delete subcollections, but for this app complexity, 
        // standard delete is often enough or we can leave history as audit of a "deleted ghost".
        // However, user just wants "Papelera".
    },

    async generateNewBatchId() {
        return await runTransaction(db, async (transaction) => {
            const [batchId] = await getNextId(transaction, 'batches', 1);
            return batchId;
        });
    },

    // NEW: Batch Update Model (Normalizer)
    async batchUpdateModel(ticketIds, newMarca, newModelo) {
        const batch = writeBatch(db);
        ticketIds.forEach(id => {
            const ref = doc(db, COLLECTION, id);
            batch.update(ref, {
                marca: newMarca,
                modelo: newModelo,
                updatedAt: serverTimestamp(),
                modelNormalized: true // Flag to know it was processed
            });
        });
        await batch.commit();
    },

    // Update arbitrary attributes (for forms like AdditionalInfoModal)
    async updateTicketAttributes(docId, updates, audit = null) {
        const ref = doc(db, COLLECTION, docId);
        await updateDoc(ref, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        // Log if audit provided
        if (audit && audit.userId) {
            await this.logHistory(docId, 'UPDATE', updates.currentArea || 'Unknown', audit.userId, {
                reason: audit.reason || 'Actualización Parcial',
                changes: Object.keys(updates), // Log which top-level keys changed
                note: audit.note || ''
            });
        }
    },

    // MIGRATION: Backfill History from Subcollection to Parent Array
    async migrateHistoryToParent(ticketId) {
        try {
            // 1. Fetch Subcollection
            const histRef = collection(db, COLLECTION, ticketId, 'history');
            const snap = await getDocs(query(histRef, orderBy('timestamp', 'asc')));

            if (snap.empty) return 0;

            const historyArray = snap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    // Ensure timestamp is normalized for UI (ISO String preference for array)
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp
                };
            });

            // 2. Overwrite Parent Array
            const ticketRef = doc(db, COLLECTION, ticketId);
            await updateDoc(ticketRef, {
                history: historyArray
            });

            return historyArray.length;
        } catch (e) {
            console.error(`Migration Failed for ${ticketId}:`, e);
            throw e;
        }
    }
};
