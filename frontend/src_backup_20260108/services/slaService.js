
// SLA Configuration (Time in Milliseconds)
const MS_HOUR = 3600 * 1000;
const MS_DAY = 24 * MS_HOUR;

export const SLA_LIMITS = {
    'Compras': 2 * MS_DAY,
    'Servicio Rapido': 3 * MS_DAY,
    'Servicio Dedicado': 30 * MS_DAY,
    'Caja Publicidad': 48 * MS_HOUR,
    'Caja Despacho': 15 * MS_DAY,
    'Caja Espera': 6 * 30 * MS_DAY, // 6 Months (Approx)
    'Caja Reciclaje': 6 * 30 * MS_DAY, // 6 Months (Approx)
};

// Helper to get time elapsed
export const getTimeElapsed = (ticket) => {
    // Priority: movedToAreaAt > createdAt
    const startTimeData = ticket.movedToAreaAt || ticket.createdAt;

    if (!startTimeData) return 0;

    const now = Date.now();
    const start = startTimeData.seconds ? startTimeData.seconds * 1000 : new Date(startTimeData).getTime();

    return now - start;
};

// Check SLA Status
export const getSLAStatus = (ticket) => {
    const area = ticket.currentArea;
    const limit = SLA_LIMITS[area];

    if (!limit) return { status: 'na', elapsed: 0, limit: 0, compliance: 100 };

    const elapsed = getTimeElapsed(ticket);
    const remaining = limit - elapsed;
    const isExceeded = elapsed > limit;

    // Calculate percentage of time used (0 to 100+)
    const percentage = Math.floor((elapsed / limit) * 100);

    return {
        status: isExceeded ? 'danger' : (percentage > 80 ? 'warning' : 'ok'),
        elapsed,
        remaining,
        limit,
        percentage,
        isExceeded
    };
};
