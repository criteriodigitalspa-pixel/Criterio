
import { getSLAStatus, SLA_LIMITS } from './src/services/slaService.js';

// Mock Ticket Generator
const createMockTicket = (area, hoursAgo) => {
    const now = Date.now();
    const created = now - (hoursAgo * 3600 * 1000);
    return {
        currentArea: area,
        createdAt: { seconds: created / 1000 }
    };
};

console.log("=== SLA VERIFICATION TESTS ===");

const tests = [
    { area: 'Servicio Rapido', hours: 24, expect: 'ok' },   // 1 day (Limit 3)
    { area: 'Servicio Rapido', hours: 70, expect: 'warning' }, // ~2.9 days (Limit 3) - Logic says >80% is warning
    { area: 'Servicio Rapido', hours: 73, expect: 'danger' },  // > 3 days

    { area: 'Servicio Dedicado', hours: 20 * 24, expect: 'ok' }, // 20 days (Limit 30)
    { area: 'Servicio Dedicado', hours: 29 * 24, expect: 'warning' }, // 29 days
    { area: 'Servicio Dedicado', hours: 31 * 24, expect: 'danger' }, // 31 days

    { area: 'Caja Publicidad', hours: 10, expect: 'ok' }, // 10h (Limit 48h)
    { area: 'Caja Publicidad', hours: 40, expect: 'warning' }, // 40h
    { area: 'Caja Publicidad', hours: 50, expect: 'danger' }, // 50h
];

let passed = 0;
tests.forEach((t, i) => {
    const ticket = createMockTicket(t.area, t.hours);
    const result = getSLAStatus(ticket);
    const isPass = result.status === t.expect;

    if (isPass) passed++;

    console.log(`Test ${i + 1}: [${t.area} @ ${t.hours}h] -> Expected: ${t.expect}, Got: ${result.status} | ${Math.round(result.percentage)}% used. ${isPass ? '✅' : '❌'}`);
});

console.log(`\nResult: ${passed}/${tests.length} passed.`);
