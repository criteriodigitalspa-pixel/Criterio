import { useMemo } from 'react';
import { useKanban } from './useKanban';

export const useAnalytics = () => {
    // We reuse the existing Kanban logic to fetch tickets efficiently
    // In a larger app, we might want a dedicated aggregate query, but for <1000 tickets this is fine.
    const { tickets, loading, error } = useKanban();

    const metrics = useMemo(() => {
        if (!tickets || tickets.length === 0) return null;

        const initialMetrics = {
            totalTickets: 0,
            byArea: {},
            financials: {
                totalInvestment: 0,
                potentialRevenue: 0,
                realizedRevenue: 0,
                pendingRevenue: 0
            },
            efficiency: {
                avgLeadTimeDays: 0,
                ticketsOverdue: 0 // > 7 days in process
            }
        };

        const now = new Date();

        return tickets.reduce((acc, ticket) => {
            // 1. Counts by Area
            const area = ticket.currentArea || 'Unknown';
            acc.byArea[area] = (acc.byArea[area] || 0) + 1;
            acc.totalTickets++;

            // 2. Financials
            const cost = Number(ticket.totalServiceCost) || 0;
            const price = Number(ticket.precioVenta) || 0;

            acc.financials.totalInvestment += cost;
            acc.financials.potentialRevenue += price;

            if (area === 'Caja Despacho' || area === 'Entregado') { // Assuming 'Entregado' exists or will exist
                acc.financials.realizedRevenue += price;
            } else {
                acc.financials.pendingRevenue += price;
            }

            // 3. Efficiency (Lead Time)
            if (ticket.createdAt) {
                const created = ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt);
                const diffTime = Math.abs(now - created);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Rolling average calculation? Or just sum for now and divide later
                // Let's store sum and count to Avg later, simplified here:
                // Actually reduce accumulator isn't great for avg without external count. 
                // We'll calculate total days here.
                acc.efficiency._totalDays = (acc.efficiency._totalDays || 0) + diffDays;

                if (diffDays > 7 && area !== 'Caja Despacho' && area !== 'Entregado') {
                    acc.efficiency.ticketsOverdue++;
                }
            }

            return acc;
        }, initialMetrics);

    }, [tickets]);

    // Final calculations
    const finalMetrics = useMemo(() => {
        if (!metrics) return null;

        const avg = metrics.totalTickets > 0 ? (metrics.efficiency._totalDays / metrics.totalTickets).toFixed(1) : 0;

        return {
            ...metrics,
            efficiency: {
                ...metrics.efficiency,
                avgLeadTimeDays: avg
            }
        };
    }, [metrics]);

    return { metrics: finalMetrics, loading, error };
};
