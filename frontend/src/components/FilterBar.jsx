import React from 'react';
import { Search, X, Calendar, AlertTriangle, Monitor, CheckCircle, Flame, Filter } from 'lucide-react';
import clsx from 'clsx';

export default function FilterBar({ filters, totalTickets, visibleTickets }) {
    const {
        searchTerm, setSearchTerm,
        quickFilters, setQuickFilters,
        activeTags, setActiveTags
    } = filters;

    // Semantic Filters Definition
    const QUICK_FILTERS = [
        { id: 'urgent', label: 'Urgentes', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-900/40', border: 'border-orange-500/50' },
        { id: 'today', label: 'Hoy', icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-900/40', border: 'border-blue-500/50' },
        { id: 'qa_pending', label: 'QA Pendiente', icon: CheckCircle, color: 'text-yellow-400', bg: 'bg-yellow-900/40', border: 'border-yellow-500/50' },
        { id: 'no_info', label: 'Sin Ficha', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/40', border: 'border-red-500/50' },
        { id: 'gaming', label: 'Gaming', icon: Monitor, color: 'text-purple-400', bg: 'bg-purple-900/40', border: 'border-purple-500/50' },
    ];

    const toggleFilter = (id) => {
        if (quickFilters.includes(id)) {
            setQuickFilters(prev => prev.filter(f => f !== id));
        } else {
            setQuickFilters(prev => [...prev, id]);
        }
    };

    const clearAll = () => {
        setSearchTerm('');
        setQuickFilters([]);
        setActiveTags([]);
    };

    const hasActiveFilters = searchTerm || quickFilters.length > 0 || activeTags.length > 0;

    return (
        <div className="bg-[#1e293b] border-b border-gray-700/50 px-4 py-3 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-16 z-30 shadow-md">

            {/* 1. Main Search & Chips */}
            <div className="flex flex-1 items-center gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                {/* Search Input */}
                <div className="relative group min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar ticket, cliente, modelo..."
                        className="w-full bg-gray-900/50 text-sm text-gray-200 pl-9 pr-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2 text-gray-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-700/50 hidden md:block" />

                {/* Quick Chips */}
                <div className="flex items-center gap-2">
                    {QUICK_FILTERS.map(f => {
                        const Icon = f.icon;
                        const isActive = quickFilters.includes(f.id);
                        return (
                            <button
                                key={f.id}
                                onClick={() => toggleFilter(f.id)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 whitespace-nowrap select-none",
                                    isActive
                                        ? `${f.bg} ${f.color} ${f.border}`
                                        : "bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-700 hover:border-gray-600"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {f.label}
                                {isActive && <X className="w-3 h-3 ml-1 opacity-50 hover:opacity-100" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Feedback & Clear */}
            <div className="flex items-center gap-4 shrink-0 border-l border-gray-700/50 pl-4">
                {hasActiveFilters ? (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-5">
                        <span className="text-xs text-gray-400 font-mono">
                            Mostrando <strong className="text-white">{visibleTickets}</strong> de {totalTickets}
                        </span>
                        <button
                            onClick={clearAll}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold underline decoration-red-500/30 hover:decoration-red-500"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                ) : (
                    <span className="text-xs text-gray-600 font-mono flex items-center gap-2">
                        <Filter className="w-3 h-3" />
                        Vista Completa
                    </span>
                )}
            </div>
        </div>
    );
}
