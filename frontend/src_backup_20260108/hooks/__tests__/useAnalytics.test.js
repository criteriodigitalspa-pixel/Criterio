import { renderHook } from '@testing-library/react';
import { useAnalytics } from '../useAnalytics';
import { useKanban } from '../useKanban';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Explicit Mock Factory
vi.mock('../useKanban', () => ({
    useKanban: vi.fn()
}));

describe('useAnalytics Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should correctly aggregate ticket data', () => {
        // Setup mock data
        const mockTickets = [
            { id: '1', currentArea: 'Compras', totalServiceCost: 1000, precioVenta: 2000, createdAt: new Date() },
            { id: '2', currentArea: 'Compras', totalServiceCost: 500, precioVenta: 1500, createdAt: new Date() },
            { id: '3', currentArea: 'Caja Despacho', totalServiceCost: 0, precioVenta: 5000, createdAt: new Date() },
        ];

        // useKanban is now a direct spy we caused to exist via the factory
        useKanban.mockReturnValue({ tickets: mockTickets, loading: false });

        const { result } = renderHook(() => useAnalytics());

        // Debug
        // console.log("Result Current:", result.current);

        const { metrics } = result.current;

        expect(metrics).not.toBeNull();
        expect(metrics.totalTickets).toBe(3);
        expect(metrics.byArea['Compras']).toBe(2);
        expect(metrics.byArea['Caja Despacho']).toBe(1);

        expect(metrics.financials.totalInvestment).toBe(1500);
        expect(metrics.financials.potentialRevenue).toBe(8500);
        expect(metrics.financials.realizedRevenue).toBe(5000);
        expect(metrics.financials.pendingRevenue).toBe(3500);
    });

    it('should handle empty data gracefully', () => {
        useKanban.mockReturnValue({ tickets: [], loading: false });
        const { result } = renderHook(() => useAnalytics());
        expect(result.current.metrics).toBeNull();
    });
});
