import { useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useKanban } from './useKanban';

export const useSearchIndex = () => {
    const { tickets, loading } = useKanban();

    const fuse = useMemo(() => {
        if (!tickets || tickets.length === 0) return null;

        const options = {
            keys: [
                'ticketId',
                'nombreCliente',
                'modelo',
                'batchId',
                'telefono', // Useful
                'rut'      // Useful
            ],
            threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything. 0.3 is balanced.
            ignoreLocation: true // Search anywhere in the string
        };

        return new Fuse(tickets, options);
    }, [tickets]);

    const search = useCallback((query) => {
        if (!fuse || !query) return [];
        return fuse.search(query).map(result => result.item);
    }, [fuse]);

    return { search, loading };
};
