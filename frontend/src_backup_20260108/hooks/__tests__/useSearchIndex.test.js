import { renderHook } from '@testing-library/react';
import { useSearchIndex } from '../useSearchIndex';
import { useKanban } from '../useKanban';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../useKanban', () => ({
    useKanban: vi.fn()
}));

describe('useSearchIndex Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockTickets = [
        { ticketId: '25-0001', nombreCliente: 'Juan Perez', modelo: 'iPhone 13', batchId: 'L001' },
        { ticketId: '25-0002', nombreCliente: 'Maria Gomez', modelo: 'Samsung S22', batchId: 'L001' },
        { ticketId: '25-0003', nombreCliente: 'Carlos Ruiz', modelo: 'MacBook Pro', batchId: 'L002' },
    ];

    it('should find exact matches', () => {
        useKanban.mockReturnValue({ tickets: mockTickets, loading: false });

        const { result } = renderHook(() => useSearchIndex());
        const matches = result.current.search('25-0001');

        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].ticketId).toBe('25-0001');
    });

    it('should find fuzzy matches (typos)', () => {
        useKanban.mockReturnValue({ tickets: mockTickets, loading: false });

        const { result } = renderHook(() => useSearchIndex());
        // Typo: "Juna" instead of "Juan"
        const matches = result.current.search('Juna');

        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0].nombreCliente).toBe('Juan Perez');
    });

    it('should filter correctly', () => {
        useKanban.mockReturnValue({ tickets: mockTickets, loading: false });

        const { result } = renderHook(() => useSearchIndex());
        const matches = result.current.search('MacBook');

        expect(matches.length).toBe(1);
        expect(matches[0].modelo).toBe('MacBook Pro');
    });

    it('should return empty keys if no query', () => {
        useKanban.mockReturnValue({ tickets: mockTickets, loading: false });
        const { result } = renderHook(() => useSearchIndex());
        expect(result.current.search('')).toEqual([]);
    });
});
