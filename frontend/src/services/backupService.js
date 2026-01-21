
import { db } from './firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { saveAs } from 'file-saver';

// Collections to backup
const COLLECTIONS = [
    'tickets',
    'users',
    // 'print_jobs', // Optional, maybe too noisy? Let's include it for completeness but limit it if needed.
    'ticket_history', // This might be large if it's a root collection.
    // Note: ticket_history is currently a SUBCOLLECTION of tickets in some logic, 
    // or a root collection in others?
    // In ticketService.js lines 104 and 220, history is a SUBCOLLECTION: `collection(db, COLLECTION, newDocRef.id, 'history')`
    // BACKING UP SUBCOLLECTIONS IS HARDER. We need to iterate tickets.
    'counters'
];

export const backupService = {

    /**
     * Performs a full backup of the database.
     * Strategies:
     * 1. Fetch all tickets.
     * 2. For each ticket, fetch its history subcollection.
     * 3. Fetch other root collections.
     * 4. Bundle into JSON.
     */
    async exportDatabase() {
        try {
            const backupData = {
                metadata: {
                    timestamp: new Date().toISOString(),
                    version: '1.0',
                    agent: 'BackupService'
                },
                collections: {}
            };

            // 1. BACKUP TICKETS & THEIR HISTORY
            console.log("Backing up Tickets...");
            const ticketsSnap = await getDocs(collection(db, 'tickets'));
            const tickets = [];

            // Parallel fetch for history (careful with rate limits if DB is huge, but for now it's fine)
            // batching promises 10 at a time might be safer but let's try parallel for < 1000 items.
            const ticketPromises = ticketsSnap.docs.map(async (doc) => {
                const ticketData = { _id: doc.id, ...doc.data() };

                // Fetch History Subcollection
                const historySnap = await getDocs(collection(db, 'tickets', doc.id, 'history'));
                const history = historySnap.docs.map(h => ({ _id: h.id, ...h.data() }));

                ticketData._sub_history = history;
                return ticketData;
            });

            backupData.collections.tickets = await Promise.all(ticketPromises);
            console.log(`Backed up ${backupData.collections.tickets.length} tickets.`);

            // 2. BACKUP USERS
            console.log("Backing up Users...");
            const usersSnap = await getDocs(collection(db, 'users'));
            backupData.collections.users = usersSnap.docs.map(d => ({ _id: d.id, ...d.data() }));

            // 3. BACKUP COUNTERS
            const countersSnap = await getDocs(collection(db, 'counters'));
            backupData.collections.counters = countersSnap.docs.map(d => ({ _id: d.id, ...d.data() }));

            // 4. GENERATE FILE
            const fileName = `CRITERIO_FULL_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json;charset=utf-8" });

            saveAs(blob, fileName);
            return { success: true, count: backupData.collections.tickets.length };

        } catch (error) {
            console.error("Backup Failed:", error);
            throw error;
        }
    }
};
