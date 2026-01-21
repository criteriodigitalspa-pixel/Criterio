
import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

// Explicit map for simple lookup if type is unknown (fallback to DDR4 prices usually)
// In a real app, we'd want strict types.
const FALLBACK_TYPE = 'DDR4';

export function useFinancials() {
    const [ramPrices, setRamPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const q = query(collection(db, 'hardware_prices'));
                const snap = await getDocs(q);
                const data = snap.docs.map(d => d.data());
                // Data format: { category: 'RAM', type: 'DDR4', capacity: '8GB', price: 15000 }
                setRamPrices(data.filter(p => p.category === 'RAM'));
            } catch (e) {
                console.error("Financials Load Error:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Helper to find price
    const getRamPrice = useCallback((capacity, type = FALLBACK_TYPE) => {
        if (!capacity) return 0;
        // Clean capacity string just in case
        const cap = capacity.trim();

        // Exact match attempt
        const match = ramPrices.find(p => p.capacity === cap && p.type === type);
        if (match) return match.price;

        // Fallback: Find ANY RAM with this capacity (prefer DDR4, then arbitrary)
        const partial = ramPrices.filter(p => p.capacity === cap);
        if (partial.length > 0) {
            // Try explicit fallback type
            const fb = partial.find(p => p.type === FALLBACK_TYPE);
            return fb ? fb.price : partial[0].price;
        }

        return 0; // Unknown price
    }, [ramPrices]);

    /**
     * Calculates the financial breakdown of a ticket
     * @param {Object} ticket 
     * @returns {Object} { baseCost, totalCost, upgradeDelta, isModified, details: [...] }
     */
    const calculateTicketFinancials = useCallback((ticket) => {
        if (!ticket) return { baseCost: 0, totalCost: 0, upgradeDelta: 0 };

        const baseCost = Number(ticket.precioCompra) || 0;

        // Original Specs
        const originalRam = ticket.originalSpecs?.ram?.detalles || ticket.ram?.detalles || []; // Fallback if no original

        // Current Specs
        const currentRam = ticket.ram?.detalles || [];

        // Identify Changes
        // Need to sum prices.
        // Issue: ticket.ram doesn't store Type. We assume ALL slots are same type for the machine usually?
        // Or we infer from CPU generation logic (later feature). 
        // For now: Use Fallback Type.

        let originalTotalValcheck = 0;
        let currentTotalValcheck = 0;

        originalRam.forEach(cap => originalTotalValcheck += getRamPrice(cap));
        currentRam.forEach(cap => currentTotalValcheck += getRamPrice(cap));

        const serviceCost = Number(ticket.totalServiceCost) || 0;
        const upgradeDelta = currentTotalValcheck - originalTotalValcheck;
        const totalCost = baseCost + upgradeDelta + serviceCost;

        const isModified = upgradeDelta !== 0 || serviceCost > 0;

        return {
            baseCost,
            totalCost,
            upgradeDelta,
            serviceCost,
            isModified,
            originalRamVal: originalTotalValcheck,
            currentRamVal: currentTotalValcheck
        };
    }, [getRamPrice]);

    return {
        loading,
        ramPrices,
        calculateTicketFinancials,
        getRamPrice
    };
}
