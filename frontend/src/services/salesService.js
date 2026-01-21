import { db } from './firebase';
import { collection, doc, writeBatch, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';

const COLLECTION = 'sales';
const INVENTORY_COLLECTION = 'products'; // Assuming 'products' is the collection name for inventory

export const salesService = {

    async processSale(saleData, userId) {
        const batch = writeBatch(db);

        // 1. Generate Sale ID (Simple Auto-inc or UUID? Let's use Smart ID like tickets for consistency if preferred, or just simple timestamp-random)
        // For POS, speed is key, maybe just a simple ID is enough, but clients might want a "Receipt Number"
        // Let's generate a receipt number: YYMM-S-XXXX
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `${year}${month}-S`;

        // Get last sale id
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);
        let sequence = 1;

        if (!querySnapshot.empty) {
            const lastSale = querySnapshot.docs[0].data();
            if (lastSale.saleId && lastSale.saleId.startsWith(prefix)) {
                sequence = parseInt(lastSale.saleId.split('-S-')[1]) + 1;
            }
        }

        const receiptId = `${prefix}-${sequence.toString().padStart(4, '0')}`;
        const saleRef = doc(collection(db, COLLECTION));

        // 2. Prepare Sale Document
        const saleDoc = {
            saleId: receiptId,
            items: saleData.items, // Array of { id, name, price, quantity }
            subtotal: saleData.subtotal,
            discount: saleData.discount || 0,
            total: saleData.total,
            paymentMethod: saleData.paymentMethod, // 'cash', 'card', 'transfer'
            cashierId: userId,
            createdAt: serverTimestamp(),
            status: 'completed'
        };

        batch.set(saleRef, saleDoc);

        // 3. Decrease Inventory (Validation should happen before this calls ideally, but we can just force it here)
        // Note: This assumes items have a 'productId' that matches the doc ID in 'products' collection.
        // If items are ad-hoc (Service), we skip inventory update for them.

        for (const item of saleData.items) {
            if (item.isInventoryItem && item.productId) {
                const productRef = doc(db, INVENTORY_COLLECTION, item.productId);
                // We use increment(-quantity)
                // Note: Firestore increment is atomic
                const { increment } = await import('firebase/firestore');
                batch.update(productRef, {
                    quantity: increment(-item.quantity)
                });
            }
        }

        await batch.commit();

        return { id: saleRef.id, saleId: receiptId };
    },

    async getRecentSales(limitCount = 10) {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};
