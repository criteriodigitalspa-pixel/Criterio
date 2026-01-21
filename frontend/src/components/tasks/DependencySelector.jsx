import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Link, X } from 'lucide-react';
import clsx from 'clsx';

export default function DependencySelector({ tasks, currentTaskId, existingDependencies = [], onSelect }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter available tasks (exclude self and already linked)
    const availableTasks = useMemo(() => {
        return tasks.filter(t =>
            t.id !== currentTaskId &&
            !existingDependencies.includes(t.id) &&
            t.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tasks, currentTaskId, existingDependencies, searchTerm]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-blue-400 transition-colors uppercase tracking-wide mt-2"
                >
                    <PlusIcon className="w-3 h-3" /> Añadir Dependencia
                </button>
            ) : (
                <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-64 absolute z-50 top-0 left-0 mt-1">
                    <div className="p-2 border-b border-gray-800 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-gray-500" />
                        <input
                            autoFocus
                            className="bg-transparent text-xs text-white w-full outline-none placeholder-gray-600"
                            placeholder="Buscar tarea..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        {availableTasks.length === 0 ? (
                            <div className="p-2 text-[10px] text-gray-500 text-center">No hay tareas disponibles</div>
                        ) : (
                            availableTasks.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        onSelect(t.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className="w-full text-left px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-800 rounded truncate flex items-center justify-between group transition-colors"
                                >
                                    <span className="truncate flex-1">{t.text}</span>
                                    <span className={clsx(
                                        "text-[9px] px-1 rounded opacity-50 group-hover:opacity-100 ml-2 uppercase",
                                        t.status === 'done' ? "bg-green-500/20 text-green-400" : "bg-gray-800 text-gray-400"
                                    )}>
                                        {t.status === 'done' ? 'Listo' : 'Pend.'}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function PlusIcon({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    )
}
