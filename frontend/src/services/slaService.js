
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

// Helper to get time elapsed (Excluding Sundays)
export const getTimeElapsed = (ticket) => {
    // Priority: movedToAreaAt > createdAt
    const startTimeData = ticket.movedToAreaAt || ticket.createdAt;

    if (!startTimeData) return 0;

    const now = new Date();
    const start = startTimeData.seconds ? new Date(startTimeData.seconds * 1000) : new Date(startTimeData);

    let elapsed = 0;

    // Clone start to iterate
    let current = new Date(start);

    // Normalize to midnight to count full days logic if needed, 
    // but better to just subtract Sundays from the total difference?
    // Accurate Approach: Iterate days.

    // Simple Approximation if range is small:
    // Subtract 24h for every Sunday encountered.
    // Iterating is safer.

    while (current < now) {
        const nextDay = new Date(current);
        nextDay.setDate(current.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0); // Start of next day

        // Determine end of this segment (either end of day or NOW)
        let endOfSegment = nextDay;
        if (endOfSegment > now) endOfSegment = now;

        // If current day is NOT Sunday (0), add time
        if (current.getDay() !== 0) {
            elapsed += (endOfSegment - current);
        }

        current = endOfSegment;
    }

    return elapsed;
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
