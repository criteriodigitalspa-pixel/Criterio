
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const FinancialContext = createContext();

const FALLBACK_TYPE = 'DDR4';

export function FinancialProvider({ children }) {
    const [ramPrices, setRamPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Real-time listener for price changes (important so green/red numbers update if price changes)
    useEffect(() => {
        const q = query(collection(db, 'hardware_prices'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => d.data());
            // Data format: { category: 'RAM', type: 'DDR4', capacity: '8GB', price: 15000 }
            setRamPrices(data.filter(p => p.category === 'RAM'));
            setLoading(false);
        }, (error) => {
            console.error("Financials Context Error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Helper to find price
    const getRamPrice = useCallback((capacity, type = FALLBACK_TYPE) => {
        if (!capacity) return 0;
        let cap = capacity.toString().trim();

        // Regex to extract "XGB" if embedded in other text
        const matchGB = cap.match(/(\d+)\s*GB/i);
        if (matchGB) {
            cap = `${matchGB[1]}GB`;
        }

        // Exact match attempt
        const match = ramPrices.find(p => p.capacity === cap && p.type === type);
        if (match) return Number(match.price);

        // Fallback: Find ANY RAM with this capacity
        const partial = ramPrices.filter(p => p.capacity === cap);
        if (partial.length > 0) {
            const fb = partial.find(p => p.type === FALLBACK_TYPE);
            return Number(fb ? fb.price : partial[0].price);
        }

        return 0;
    }, [ramPrices]);

    /**
     * Calculates:
     * - Base Cost (Purchase)
     * - Hardware Additions/Removals value
     * - Total Ticket Cost
     */
    const calculateFinancials = useCallback((ticket) => {
        if (!ticket) return { baseCost: 0, ramDelta: 0, totalCost: 0, changes: [], margins: {} };

        const baseCost = Number(ticket.precioCompra) || 0;
        const salePrice = Number(ticket.precioVenta) || 0;

        // --- RAM DELTA ---
        let ramDelta = 0;
        let originalRamVal = 0;
        let currentRamVal = 0;

        // 1. Try structured originalSpecs (New Standard)
        if (ticket.originalSpecs?.ram?.detalles) {
            const origDetails = ticket.originalSpecs.ram.detalles;
            origDetails.forEach(cap => originalRamVal += getRamPrice(cap));
        }
        // 2. Fallback: Parse string-based original (Legacy/Existing Records)
        else if (ticket.ram?.original && typeof ticket.ram.original === 'string') {
            ticket.ram.original.split('+').forEach(cap => originalRamVal += getRamPrice(cap.trim()));
        }

        const currDetails = ticket.ram?.detalles || [];
        currDetails.forEach(cap => currentRamVal += getRamPrice(cap));

        ramDelta = currentRamVal - originalRamVal;

        // --- OTHER COSTS ---
        // 1. Service / Labor
        const serviceCost = Number(ticket.reparacion?.costoServicio) || 0;

        // 2. Spare Parts
        const sparePartsCost = Number(ticket.reparacion?.costoRepuestos) || 0;

        // 3. Extra Costs (Misc)
        const extraCosts = Number(ticket.costosExtra) || 0;

        // --- TOTAL COST (To Business) ---
        // Base Device + Upgrades (RAM) + Parts + Labor + Extras
        const totalCost = baseCost + ramDelta + sparePartsCost + serviceCost + extraCosts;

        // --- MARGINS ---
        // Gross Margin = Sale Price - Total Cost
        const grossMargin = salePrice - totalCost;

        // Net Margin (Approximate, removing VAT 19% from Margin if positive, or just simple logic)
        // For now: Simple (Sale - Cost)
        // If user wants Net (Ex-Tax), we'd need: (Sale/1.19) - (Cost/1.19)
        // Let's provide Gross for now and a "Net Outcome" which is usually the final profit.

        // --- WEB PRICE CALCULATION (Requested Logic) ---
        // Formula: (SalePrice * 1.25 [Markup]) * 1.19 [VAT]
        // 1. Base Price: salePrice (Precio Venta Actual)
        // 2. Add 25% Markup (Admin + Ads):
        const webMarkup = salePrice * 0.25;
        const webPricePreTax = salePrice + webMarkup;

        // 3. Add 19% VAT on top of the marked-up price:
        const webVat = webPricePreTax * 0.19;
        const webPriceFinal = webPricePreTax + webVat;

        return {
            baseCost,
            ramDelta,
            originalRamVal,
            currentRamVal,
            serviceCost,
            sparePartsCost,
            extraCosts,
            totalCost,
            salePrice,
            grossMargin,
            // New Web Fields
            webPriceFinal,
            webPricePreTax,
            webMarkup,
            webVat,
            isModified: ramDelta !== 0 || serviceCost > 0 || sparePartsCost > 0 || extraCosts > 0
        };
    }, [getRamPrice]);

    return (
        <FinancialContext.Provider value={{ ramPrices, loading, getRamPrice, calculateFinancials }}>
            {children}
        </FinancialContext.Provider>
    );
}

export const useFinancialsContext = () => useContext(FinancialContext);
