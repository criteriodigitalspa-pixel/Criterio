
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

const FinancialContext = createContext();

const FALLBACK_TYPE = 'DDR4';

export function FinancialProvider({ children }) {
    const [ramPrices, setRamPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Real-time listener for price changes
    useEffect(() => {
        const q = query(collection(db, 'hardware_prices'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => d.data());
            setRamPrices(data); // Store ALL prices, filter locally
            setLoading(false);
        }, (error) => {
            console.error("Financials Context Error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Helper to clean price strings (e.g. "$ 10.000" -> 10000)
    const parsePrice = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        // Keep only digits and minus sign
        const clean = val.toString().replace(/[^0-9-]/g, '');
        return Number(clean) || 0;
    };

    // Helper to find RAM price
    const getRamPrice = useCallback((capacity, type = FALLBACK_TYPE) => {
        if (!capacity) return 0;
        let cap = capacity.toString().trim();

        // Handle pure numbers ("16" -> "16GB")
        if (/^\d+$/.test(cap)) {
            cap = `${cap}GB`;
        }

        const matchGB = cap.match(/(\d+)\s*GB/i);
        if (matchGB) cap = `${matchGB[1]}GB`;

        // Filter for RAM category (case insensitive just in case)
        const rams = ramPrices.filter(p => p.category?.toUpperCase() === 'RAM');

        const match = rams.find(p => p.capacity === cap && p.type === type);
        if (match) return parsePrice(match.price);

        const partial = rams.filter(p => p.capacity === cap);
        if (partial.length > 0) {
            const fb = partial.find(p => p.type === FALLBACK_TYPE);
            return parsePrice(fb ? fb.price : partial[0].price);
        }
        return 0;
    }, [ramPrices]);

    // Helper to find DISK price
    const getDiskPrice = useCallback((capacity, type = 'SSD') => {
        if (!capacity) return 0;
        let cap = capacity.toString().trim();

        // Handle pure numbers ("512" -> "512GB")
        if (/^\d+$/.test(cap)) {
            cap = `${cap}GB`;
        }

        // Normalize "240GB SSD" to "240GB"
        const matchGB = cap.match(/(\d+\s*(?:GB|TB))/i);
        if (matchGB) cap = matchGB[1].replace(/\s/g, ''); // "240 GB" -> "240GB"

        // Filter for DISK category (case insensitive)
        const disks = ramPrices.filter(p => p.category?.toUpperCase() === 'DISK');

        // Try exact match with type (e.g. SSD, NVMe)
        // If type is generic or unknown, prioritize SSD
        const match = disks.find(p => p.capacity === cap && mapDiskType(p.type) === mapDiskType(type));
        if (match) return parsePrice(match.price);

        // Fallback: Find any DISK with this capacity
        const partial = disks.filter(p => p.capacity === cap);
        if (partial.length > 0) {
            // Prioritize SSD
            const fb = partial.find(p => p.type === 'SSD');
            return parsePrice(fb ? fb.price : partial[0].price);
        }
        return 0;
    }, [ramPrices]);

    // Normalize disk types
    const mapDiskType = (t) => {
        if (!t) return 'SSD';
        const up = t.toUpperCase();
        if (up.includes('NVME')) return 'NVME';
        if (up.includes('SSD')) return 'SSD';
        if (up.includes('HDD')) return 'HDD';
        return 'SSD';
    };

    /**
     * Calculates:
     * - Base Cost (Purchase)
     * - Hardware Additions/Removals value (RAM + DISK)
     * - Total Ticket Cost (Service, Spare, Extra, Viatico, Publicidad)
     */
    const calculateFinancials = useCallback((ticket) => {
        if (!ticket) return {
            baseCost: 0, ramDelta: 0, diskDelta: 0, totalCost: 0, changes: [], margins: {},
            salePrice: 0,
            ivaDebito: 0, ivaCredito: 0, taxIva: 0, rentaFiscal: 0,
            utilidadBruta: 0, taxesPaidCash: 0, utilidadNetaReal: 0, rentaReal: 0,
            isSold: false, isVentaFormal: false, isCompraFactura: false
        };

        const baseCost = Number(ticket.precioCompra) || 0;
        const salePrice = Number(ticket.precioVenta) || 0;

        // --- RAM DELTA ---
        let ramDelta = 0;
        let originalRamVal = 0;
        let currentRamVal = 0;

        if (ticket.originalSpecs?.ram?.detalles) {
            ticket.originalSpecs.ram.detalles.forEach(cap => originalRamVal += getRamPrice(cap));
        } else if (ticket.oldOriginalSpecs?.ram?.detalles) {
            // Backward compatibility if we rename it
            ticket.oldOriginalSpecs.ram.detalles.forEach(cap => originalRamVal += getRamPrice(cap));
        } else if (ticket.ram?.original && typeof ticket.ram.original === 'string') {
            const parts = ticket.ram.original.split('+');
            if (parts[0] !== 'N/A' && parts[0].trim() !== '') {
                parts.forEach(cap => originalRamVal += getRamPrice(cap.trim()));
            }
        }

        (ticket.ram?.detalles || []).forEach(cap => currentRamVal += getRamPrice(cap));
        ramDelta = currentRamVal - originalRamVal;

        // --- DISK DELTA ---
        let diskDelta = 0;
        let originalDiskVal = 0;
        let currentDiskVal = 0;

        if (ticket.originalSpecs?.disco?.detalles) {
            ticket.originalSpecs.disco.detalles.forEach(cap => originalDiskVal += getDiskPrice(cap));
        } else if (ticket.disco?.original && typeof ticket.disco.original === 'string') {
            const parts = ticket.disco.original.split('+');
            if (parts[0] !== 'N/A' && parts[0].trim() !== '') {
                parts.forEach(cap => originalDiskVal += getDiskPrice(cap.trim()));
            }
        }

        (ticket.disco?.detalles || []).forEach(cap => currentDiskVal += getDiskPrice(cap));
        diskDelta = currentDiskVal - originalDiskVal;

        // --- OTHER COSTS ---
        const serviceCost = Number(ticket.reparacion?.costoServicio) || 0;
        const sparePartsCost = Number(ticket.reparacion?.costoRepuestos) || 0;
        const extraCosts = Number(ticket.costosExtra) || 0;
        const viaticoCost = Number(ticket.viatico) || 0;
        const publicidadCost = Number(ticket.publicidad) || 0;

        // --- FISCAL FLAGS ---
        const f = ticket.financials || {};
        const isVentaFormal = ['Factura', 'Boleta'].includes(f.salesDocumentType);
        const isCompraFactura = !!(ticket.conFactura || f.boughtWithInvoice);

        // --- IVA LOGIC (Part 1 - Credits) ---
        // Base Cost is usually Gross (Input).
        // If Bought with Invoice, we have a Credit.
        const costoNeto = isCompraFactura ? Math.round(baseCost / 1.19) : baseCost;
        const ivaCredito = isCompraFactura ? (baseCost - costoNeto) : 0;

        // --- TOTAL COST (To Business) ---
        // Base Cost + Upgrades + Overhead
        const totalCost = baseCost + ramDelta + diskDelta + sparePartsCost + serviceCost + extraCosts + viaticoCost + publicidadCost;

        // --- ADJUSTED COST (Economic) ---
        // If we have IVA Credit, the "Economic Cost" is lower (Value ex-VAT).
        // User requested: "Utilidad Bruta no considere el IVA negativo (crédito)".
        // This means we treat the Credit as an Asset, so we subtract it from the Cost basis for Margin.
        const effectiveCost = totalCost - ivaCredito;

        // --- MARGINS ---
        const grossMargin = salePrice - effectiveCost; // Now uses Net Cost if Formal

        // --- WEB PRICE CALCULATION ---
        const webMarkup = salePrice * 0.25;
        const webPricePreTax = salePrice + webMarkup;
        const webVat = webPricePreTax * 0.19;
        const webPriceFinal = webPricePreTax + webVat;

        // --- FISCAL LOGIC (Part 2 - Debits & Renta) ---
        const ventaNeto = isVentaFormal ? Math.round(salePrice / 1.19) : salePrice;
        const ivaDebito = isVentaFormal ? (salePrice - ventaNeto) : 0;
        const taxIva = ivaDebito - ivaCredito;

        // Renta Fiscal (SII)
        let rentaFiscal = 0;
        if (isVentaFormal) {
            const costoDeducible = isCompraFactura ? costoNeto : 0;
            const baseImponible = Math.max(0, ventaNeto - costoDeducible);
            rentaFiscal = Math.round(baseImponible * 0.25);
        }

        // --- PROFITABILITY SIMULATION ---

        // Renta Real Strategy
        // 25% of Adjusted Gross Margin (Net-Net) if Formal
        // 25% of Sale Price if Informal (Approximation)
        const rentaReal = Math.round(isCompraFactura ? (grossMargin * 0.25) : (salePrice * 0.25));

        // IVA Real (Theoretical 19% of Total Sale)
        const ivaReal = Math.round(salePrice - (salePrice / 1.19));

        // Net Real Calculation
        // Gross Margin (Adjusted) - Estimated IVA - Estimated Renta
        const utilidadNetaReal = grossMargin - ivaReal - rentaReal;

        // Taxes Paid (Cashflow view)
        const taxesPaidCash = Math.max(0, taxIva) + rentaFiscal;

        return {
            baseCost,
            ramDelta,
            originalRamVal,
            currentRamVal,
            diskDelta,
            originalDiskVal,
            currentDiskVal,
            serviceCost,
            sparePartsCost,
            extraCosts,
            viaticoCost,
            publicidadCost,
            totalCost,
            salePrice,
            grossMargin,
            webPriceFinal,
            webPricePreTax,
            webMarkup,
            webVat,

            isModified: ramDelta !== 0 || diskDelta !== 0 || serviceCost > 0 || sparePartsCost > 0 || extraCosts > 0 || viaticoCost > 0 || publicidadCost > 0,

            isSold: ticket.status === 'Closed' || ticket.currentArea === 'Ventas' || ticket.status === 'Vendido' || !!ticket.soldAt,
            isVentaFormal,
            isCompraFactura,

            // Financials
            ivaDebito,
            ivaCredito,
            taxIva,
            rentaFiscal,
            utilidadBruta: grossMargin, // Maps to grossMargin
            taxesPaidCash,
            utilidadNetaReal,
            rentaReal,
            ivaReal,
            gananciaInmediata: salePrice - totalCost // Immediate Cash Profit (Ignored Tax Credits)
        };
    }, [getRamPrice, getDiskPrice]);

    const value = React.useMemo(() => ({ ramPrices, loading, getRamPrice, getDiskPrice, calculateFinancials }), [ramPrices, loading, getRamPrice, getDiskPrice, calculateFinancials]);

    return (
        <FinancialContext.Provider value={value}>
            {children}
        </FinancialContext.Provider>
    );
}

export const useFinancialsContext = () => useContext(FinancialContext);
