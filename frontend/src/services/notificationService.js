import { db } from './firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp,
    writeBatch,
    getDocs,
    limit,
    deleteDoc
} from 'firebase/firestore';

const COLLECTION_NAME = 'notifications';

export const notificationService = {
    // Queue a WhatsApp message to Firestore
    async queueWhatsAppNotification(toPhoneNumber, messageData) {
        if (!toPhoneNumber) {
            console.warn("Skipping WhatsApp: No phone number provided.");
            return;
        }

        try {
            // Clean phone number (remove non-digits)
            const cleanPhone = toPhoneNumber.replace(/\D/g, '');

            await addDoc(collection(db, 'whatsapp_queue'), {
                to: cleanPhone,
                message: messageData.body || messageData.message, // Support both formats
                body: messageData.body || messageData.message,
                media: messageData.media || null, // Support for image/pdf attachments
                status: 'pending',
                createdAt: serverTimestamp(),
                metadata: {
                    type: 'task_assignment',
                    taskId: messageData.taskId || null
                }
            });
            console.log("WhatsApp message queued for:", cleanPhone);
        } catch (error) {
            console.error("Error queuing WhatsApp:", error);
            // Don't throw, just log. We don't want to break the UI if WhatsApp fails.
        }
    },

    // Send a notification to a specific user
    async sendNotification(toUserId, title, message, type = 'info', link = null) {
        console.log("Attempting to send notification:", { toUserId, title });
        if (!toUserId) {
            console.error("No userId provided to sendNotification");
            throw new Error("No User ID");
        }

        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                userId: toUserId,
                title,
                message,
                type, // 'info', 'invite', 'assign', 'alert'
                link,
                read: false,
                createdAt: serverTimestamp()
            });
            console.log("Notification sent successfully, ID:", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Error sending notification:", error);
            throw error; // Let the caller handle the UI feedback
        }
    },

    async debugFetchCount(userId) {
        const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
        const snap = await getDocs(q);
        return snap.size;
    },

    // Subscribe to a user's notifications (Recent 50)
    subscribeToNotifications(userId, callback) {
        if (!userId) return () => { };

        const q = query(
            collection(db, COLLECTION_NAME),
            where('userId', '==', userId),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side Sort (Newest first) avoids need for Composite Index
            notifications.sort((a, b) => {
                const ta = a.createdAt?.seconds || 0;
                const tb = b.createdAt?.seconds || 0;
                return tb - ta;
            });

            callback(notifications);
        }, (error) => {
            console.warn("Notification Subscription Failed:", error);
            callback([]);
        });
    },

    async markAsRead(notificationId) {
        try {
            const ref = doc(db, COLLECTION_NAME, notificationId);
            await updateDoc(ref, { read: true });
        } catch (error) {
            console.error("Error marking notification read:", error);
        }
    },

    async markAllAsRead(userId) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('userId', '==', userId),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach(docSnap => {
                batch.update(docSnap.ref, { read: true });
            });

            await batch.commit();
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    },

    async deleteNotification(notificationId) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, notificationId));
        } catch (error) {
            console.error("Error deleting notification:", error);
            throw error;
        }
    }
};
