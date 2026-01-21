
/**
 * Calculates detailed financials for a single ticket.
 * Separates "Real" (Cash Flow) flow from "Fiscal" (SII/Tax) flow.
 * 
 * @param {Object} ticket - The ticket object
 * @returns {Object} Financial breakdown { cost, price, tax, profit }
 */
export const calculateTicketFinancials = (ticket, ramPrices = []) => {
    const f = ticket.financials || {};

    // 1. COSTS (Cash Flow)
    // ----------------------------------------------------------------
    const costoCompra = parseFloat(ticket.precioCompra) || 0;
    const repuestos = parseFloat(ticket.reparacion?.costoRepuestos) || 0;
    const extras = parseFloat(ticket.costosExtra) || 0;

    // Check if viatico/publicidad are stored in financials (legacy vs new)
    const viatico = f.viaticoCost !== undefined ? parseFloat(f.viaticoCost) : 2500;
    const publicidad = f.publicidadCost !== undefined ? parseFloat(f.publicidadCost) : 3500;

    // RAM Delta (Hardware swap logic should be pre-calculated or estimated here)
    // For simplicity, we rely on what's passed or stored. 
    // Ideally this comes from a 'hardwareCost' field if separate, but usually 'costoRepuestos' covers parts.
    // If RAM delta is separate, we assume it's in extras or repuestos.

    // RAM Delta Calculation
    // Requires 'ramPrices' array: [{ capacity: '8GB', type: 'DDR4', price: 15000 }, ...]
    let ramDelta = 0;
    if (ramPrices && Array.isArray(ramPrices) && ramPrices.length > 0) {
        const getPrice = (capStr) => {
            if (!capStr) return 0;
            let cap = capStr.toString().trim();
            const matchGB = cap.match(/(\d+)\s*GB/i);
            if (matchGB) cap = `${matchGB[1]}GB`;

            // Exact match
            const match = ramPrices.find(p => p.capacity === cap && p.category === 'RAM'); // Assuming Filtered or checking category
            if (match) return Number(match.price);

            // Fallback (Any Type)
            const partial = ramPrices.filter(p => p.capacity === cap);
            if (partial.length > 0) return Number(partial[0].price);
            return 0;
        };

        let originalVal = 0;
        let currentVal = 0;

        // Original
        if (ticket.originalSpecs?.ram?.detalles) {
            ticket.originalSpecs.ram.detalles.forEach(c => originalVal += getPrice(c));
        } else if (typeof ticket.ram?.original === 'string') {
            ticket.ram.original.split('+').forEach(c => originalVal += getPrice(c.trim()));
        }

        // Current
        const currDetails = ticket.ram?.detalles || [];
        currDetails.forEach(c => currentVal += getPrice(c));

        ramDelta = currentVal - originalVal;
    }


    const costosVarios = repuestos + extras + viatico + publicidad + ramDelta;
    const totalCostoCash = costoCompra + costosVarios;


    // 2. REVENUE (Cash Flow)
    // ----------------------------------------------------------------
    const precioVenta = parseFloat(ticket.precioVenta) || 0;
    const isSold = ticket.status === 'Closed' || ticket.currentArea === 'Ventas' || ticket.status === 'Vendido' || !!ticket.soldAt;


    // 3. FISCAL LOGIC (SII)
    // ----------------------------------------------------------------
    const salesDocType = f.salesDocumentType || 'Otro';
    const isVentaFormal = ['Factura', 'Boleta'].includes(salesDocType);
    const isCompraFactura = !!(ticket.conFactura || f.boughtWithInvoice);

    // -- VAT (IVA) --
    // Debit: Only if we sell formally
    // Note: Typically Price / 1.19 * 0.19 if price is Gross. 
    // Correction: In Chile, retail prices usually Include IVA.
    // Net = Price / 1.19
    // IVA = Price - Net

    // Let's use precise math:
    const ventaNeto = isVentaFormal ? Math.round(precioVenta / 1.19) : precioVenta;
    const ivaDebitoReal = isVentaFormal ? (precioVenta - ventaNeto) : 0;

    // Credit: Only if we bought formally
    const costoNeto = isCompraFactura ? Math.round(costoCompra / 1.19) : costoCompra;
    const ivaCreditoReal = isCompraFactura ? (costoCompra - costoNeto) : 0;

    // Net VAT Payable
    // If IvaCredit > IvaDebit, it's negative (Saldo a Favor)
    const taxIva = ivaDebitoReal - ivaCreditoReal;


    // -- RENTA (Income Tax) --
    // Rate: 25% (First Category - Simplified)
    // Base Imponible = Venta Neta - Costo Necesario
    // Cost is deductible ONLY if validated (Factura Compra).
    // If I buy informal, Costo Deductible = 0.

    let rentaFiscal = 0;
    if (isVentaFormal) {
        const costoDeducible = isCompraFactura ? costoNeto : 0;
        // Note: Can we deduct Repuestos? Usually yes if we have invoice. 
        // We assume 'repuestos' might be mixed. For safety, let's only deduct base unit cost if sure.
        // Or if we want to be strict: Only deducting what we have invoice for.

        const baseImponible = Math.max(0, ventaNeto - costoDeducible);
        rentaFiscal = Math.round(baseImponible * 0.25);
    }
    // If Informal Sale -> Renta Fiscal = 0 (Evaded)


    // 4. PROFITABILITY
    // ----------------------------------------------------------------

    // A. Bruta (Cash Margin)
    const utilidadBruta = precioVenta - totalCostoCash;

    // B. Neta Real (Cash in Pocket)
    // We pay VAT difference and Renta.
    // If we sold informal, we pay 0 tax, so Net = Bruta.

    // Exception: If we have Negative VAT (Debit < Credit), we don't "pay" it, we keep the credit.
    // So distinct 'Cash Outflow' for tax vs 'Accounting value'.
    const taxesPaidCash = Math.max(0, taxIva) + rentaFiscal;

    // Wait, if taxIva is negative (Credit), it doesn't reduce cash now, but it's an asset. 
    // However, purely cash-wise:
    const utilidadNetaReal = utilidadBruta - taxesPaidCash;


    return {
        // Values
        costoCompra,
        costosVarios,
        ramDelta,
        totalCostoCash,
        precioVenta,

        // Flags
        isSold,
        isVentaFormal,
        isCompraFactura,

        // Taxes
        ivaDebito: ivaDebitoReal,
        ivaCredito: ivaCreditoReal,
        taxIva, // Can be negative
        rentaFiscal,

        // Profits
        utilidadBruta,
        utilidadNetaReal
    };
};

export const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);
};
