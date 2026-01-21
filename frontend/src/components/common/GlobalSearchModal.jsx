import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, ArrowRight } from 'lucide-react';
import { useGlobalSearch } from '../../context/GlobalSearchContext';
import { useSearchIndex } from '../../hooks/useSearchIndex';
import clsx from 'clsx';

export default function GlobalSearchModal() {
    const { isOpen, closeSearch } = useGlobalSearch();
    const { search, loading } = useSearchIndex();
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    // Auto-focus when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 50);
            setQuery('');
            setResults([]);
        }
    }, [isOpen]);

    // Handle Search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        const matches = search(query);
        setResults(matches.slice(0, 10)); // Limit to 10
        setSelectedIndex(0);
    }, [query, search]);

    // Keyboard Navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        }
    };

    const handleSelect = (ticket) => {
        // Navigate inside modal context?
        // We probably want to close modal and navigate.
        closeSearch();
        // Assuming we have a ticket details view or just filter board?
        // Current app doesn't seem to have a dedicated /tickets/:id page yet?
        // It opens modals. 
        // Best approach for now: Navigate to /tickets?search=ID (if supported) 
        // OR just simple toast "Not implemented yet" but wait user wants navigation.

        // Let's TRY to find if we can open ticket modal via URL or similar.
        // Actually, KanbanBoard reads ?ticketId= query param? No.

        // FOR NOW: Let's log it and maybe filter the board if we are on /tickets?
        // Wait, the plan said "Navigation & Highlight".
        // Let's implement a navigate to Kanban with filter for now.
        // Or if the app has a specific Ticket Detail page.

        // HACK: We can navigate to /tickets query params if useKanban supports it.
        // But useKanban reads from local state.

        // Let's implement a query param listener in KanbanBoard later.
        // For now, let's just Close and Alert.
        // Better: Navigate to /tickets and rely on user finding it? No.

        // Let's add a ?search=ID to URL and hope we can hook it up.
        // But let's check if the user has a detail page.
        // "IngresoTicket" is creation.

        // Let's go with: Navigate to /tickets state. 
        // We might need to expose a way to "Open Ticket" globally.
        // But for MVP of search:
        console.log("Selected:", ticket.ticketId);

        // Temporary: Copy ID to clipboard and go to board
        navigator.clipboard.writeText(ticket.ticketId);
        navigate('/tickets');
        // Ideally we pass state or search param
        // navigate(`/tickets?search=${ticket.ticketId}`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={closeSearch}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Search Bar */}
                <div className="flex items-center px-4 py-4 border-b border-gray-800 gap-3">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar ticket por ID, cliente, rut..."
                        className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-gray-500 font-medium"
                    />
                    <div className="flex items-center gap-2">
                        {loading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                        <button
                            onClick={closeSearch}
                            className="p-1 hover:bg-gray-800 rounded-md text-gray-400 transition-colors"
                        >
                            <span className="text-xs font-mono border border-gray-700 rounded px-1.5 py-0.5">ESC</span>
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="p-2 space-y-1">
                            {results.map((ticket, index) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => handleSelect(ticket)}
                                    className={clsx(
                                        "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group cursor-pointer transition-all",
                                        index === selectedIndex ? "bg-blue-600/20" : "hover:bg-gray-800"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full",
                                            ticket.status === 'Closed' ? "bg-green-500" : "bg-blue-500"
                                        )} />
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <span className={clsx("font-mono font-bold", index === selectedIndex ? "text-blue-300" : "text-gray-300")}>
                                                    {ticket.ticketId}
                                                </span>
                                                <span className="text-gray-400 text-sm">
                                                    {ticket.nombreCliente}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 flex gap-2">
                                                <span>{ticket.modelo}</span>
                                                <span>•</span>
                                                <span>{ticket.currentArea}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {index === selectedIndex && (
                                        <ArrowRight className="w-4 h-4 text-blue-400" />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : query ? (
                        <div className="p-8 text-center text-gray-500">
                            No se encontraron resultados para "{query}"
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-600 text-sm">
                            Escribe para buscar en todo el sistema.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-950 px-4 py-2 border-t border-gray-800 flex justify-between text-[10px] text-gray-500 font-mono">
                    <div className="flex gap-4">
                        <span>↑↓ navegar</span>
                        <span>↵ abrir</span>
                    </div>
                    <span>Criterio Search v1.0</span>
                </div>
            </div>
        </div>
    );
}
