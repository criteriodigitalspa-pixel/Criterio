/**
 * Calculates the WooCommerce Readiness Score for a ticket.
 * Returns { score: number (0-100), missing: string[], isReady: boolean }
 */
export const calculateReadiness = (ticket, images = []) => {
    const missing = [];
    const details = []; // { label, met }
    let score = 0;

    // Helper
    const addCheck = (label, isMet) => {
        details.push({ label, met: isMet });
        if (isMet) score += 25;
        else missing.push(label);
    };

    // Total components: 4 (25 pts each)
    // 1. Title (Brand + Model)
    // 2. Price (Assigned)
    // 3. Images (Min 3)
    // 4. Invoice (Factura)

    // 1. Title (Brand + Model)
    addCheck("Marca y Modelo", !!(ticket.marca && ticket.modelo));

    // 2. Images (At least 3)
    // Counts uploaded images.
    const imgCount = images ? images.length : 0;
    const imgLabel = imgCount >= 3 ? `Fotos (${imgCount})` : "Fotos (Mínimo 3)";
    addCheck(imgLabel, imgCount >= 3);

    // 3. Price (Must be assigned > 0)
    // We check if it is explicitly set.
    const price = Number(ticket.precioVenta);
    addCheck("Precio de Venta", price > 0);

    // 4. Invoice (Factura)
    // Fix: Prioritize explicit 'conFactura' boolean if present to avoid legacy field conflicts
    let hasInvoice = false;
    if (typeof ticket.conFactura === 'boolean') {
        hasInvoice = ticket.conFactura;
    } else {
        // Fallback for legacy tickets without the new boolean field
        hasInvoice = ticket.factura || ticket.invoiceNumber || (ticket.tipoCompra === 'FACTURA');
    }

    addCheck("Factura de Compra", !!hasInvoice);

    return {
        score,
        missing,
        details, // New structured data
        isReady: score === 100
    };
};
