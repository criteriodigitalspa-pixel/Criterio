/**
 * Calculates the next due date based on recurrence rule
 * @param {Date} currentDate - The anchor date (usually Date.now() or task.dueDate)
 * @param {Object} recurrence - { type, daysOfWeek: [1,4], time, limit, count }
 * @returns {Date|null} - The next Date object
 */
export const calculateNextDueDate = (currentDate, recurrence) => {
    if (!currentDate || !recurrence || !recurrence.type) return null;

    let date = new Date(currentDate); // Using "Today" as base effectively
    // If we want to target a specific time, we should ensure 'date' respects it?
    // Actually, we usually calculate the *Day*, and the Time is applied to 'startTime'.

    // Reset time to avoid confusion during day additions
    date.setHours(12, 0, 0, 0);

    const interval = recurrence.interval || 1;

    switch (recurrence.type) {
        case 'daily':
            date.setDate(date.getDate() + interval);
            break;

        case 'weekly':
            date.setDate(date.getDate() + (interval * 7));
            break;

        case 'monthly':
            // Simple monthly: Just add N months to the date
            // But if we want "Advanced Monthly" (e.g. 1st Monday), we check if weeksOfMonth is present
            if (recurrence.weeksOfMonth && recurrence.weeksOfMonth.length > 0 && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
                // ADVANCED MONTHLY LOGIC
                // We need to find the next occurrence of [WeekPosition] [DayOfWeek]
                // Example: First Monday, Last Friday

                // Limit search to avoid infinite loops (e.g. 12 months ahead)
                let searchDate = new Date(date);
                searchDate.setDate(1); // Start at beginning of current month window? 
                // Actually, if date is today, we check this month first.
                // Reset to 1st of current month to scan fully? No, only future dates.

                // Algorithm: Scan this month, then next month, etc.
                for (let m = 0; m <= 12; m++) {
                    let candidates = [];
                    const currentMonth = searchDate.getMonth();
                    const currentYear = searchDate.getFullYear();

                    recurrence.daysOfWeek.forEach(dayIndex => { // 0=Sun, 1=Mon
                        // Find all occurrences of this day in the month
                        // Then filter by weeksOfMonth (1, 2, 3, 4, -1 for Last)

                        let loopDate = new Date(currentYear, currentMonth, 1);
                        let dayInstances = [];

                        // Fast forward to first instance of this day
                        while (loopDate.getDay() !== dayIndex) {
                            loopDate.setDate(loopDate.getDate() + 1);
                        }

                        // Collect all instances (max 5)
                        while (loopDate.getMonth() === currentMonth) {
                            dayInstances.push(new Date(loopDate));
                            loopDate.setDate(loopDate.getDate() + 7);
                        }

                        // Match with requested weeks
                        recurrence.weeksOfMonth.forEach(weekPos => { // 1, 2... or -1
                            let target = null;
                            if (weekPos === -1) {
                                target = dayInstances[dayInstances.length - 1]; // Last
                            } else if (weekPos > 0 && weekPos <= dayInstances.length) {
                                target = dayInstances[weekPos - 1]; // 1st = index 0
                            }

                            if (target) candidates.push(target);
                        });
                    });

                    // Sort candidates
                    candidates.sort((a, b) => a - b);

                    // Find first valid future date
                    const future = candidates.find(d => d > date); // strict future relative to anchor
                    if (future) return future;

                    // Move to next month
                    searchDate.setMonth(searchDate.getMonth() + 1);
                    searchDate.setDate(1);
                }
                return null; // Not found in 1 year

            } else {
                // Standard Monthly (Same day number)
                date.setMonth(date.getMonth() + interval);
            }
            break;

        case 'years':
            date.setFullYear(date.getFullYear() + interval);
            break;

        case 'specific_days':
            if (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0) return null;

            // 0=Sun, 1=Mon... 6=Sat
            // Sort days just in case
            const days = [...recurrence.daysOfWeek].sort((a, b) => a - b);
            const currentDay = date.getDay();

            // Find next available day in the list that is AFTER today
            // Note: If we are completing it TODAY, and Today is Monday, and Monday is in list...
            // Do we want another one Today? No, "Next" implies future.
            let nextDay = days.find(d => d > currentDay);

            if (nextDay !== undefined) {
                // Found later this week
                date.setDate(date.getDate() + (nextDay - currentDay));
            } else {
                // Not found this week, loop to first day next week
                nextDay = days[0];
                const daysUntilEndOfWeek = 6 - currentDay; // Sat - Today
                const daysFromSunToTarget = nextDay + 1; // +1 because Sunday is 0, getting to 0 needs 1 day from Sat? No.
                // Simpler: Days to add = (7 - Today + Target)
                date.setDate(date.getDate() + (7 - currentDay + nextDay));
            }
            break;

        default:
            return null;
    }

    return date;
};

/**
 * Formats recurrence rule to human string
 */
export const formatRecurrence = (recurrence) => {
    if (!recurrence?.type) return "No se repite";
    if (recurrence.type === 'specific_days') {
        const map = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        const days = (recurrence.daysOfWeek || []).map(d => map[d]).join(', ');
        return `Días: ${days}`;
    }
    const i = recurrence.interval || 1;
    const s = i > 1 ? 's' : '';

    switch (recurrence.type) {
        case 'daily': return i === 1 ? "Diariamente" : `Cada ${i} días`;
        case 'weekly': return i === 1 ? "Semanalmente" : `Cada ${i} semanas`;
        case 'monthly':
            if (recurrence.weeksOfMonth?.length > 0) {
                const wMap = { 1: '1º', 2: '2º', 3: '3º', 4: '4º', '-1': 'Último' };
                const dMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

                const wStr = recurrence.weeksOfMonth.map(w => wMap[w]).join(', ');
                const dStr = recurrence.daysOfWeek?.map(d => dMap[d]).join(', ');

                return `Mensual: ${wStr} ${dStr}`;
            }
            return i === 1 ? "Mensualmente" : `Cada ${i} meses`;
        case 'years': return i === 1 ? "Anualmente" : `Cada ${i} años`;
        default: return "Personalizado";
    }
};
