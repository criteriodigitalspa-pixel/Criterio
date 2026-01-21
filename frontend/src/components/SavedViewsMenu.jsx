import { useState, useEffect } from 'react';
import { Bookmark, Save, Trash2, ChevronDown, Check, Star, Plus } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function SavedViewsMenu({ currentConfig, onLoad, onSetDefault }) {
    const [isOpen, setIsOpen] = useState(false);
    const [savedViews, setSavedViews] = useState([]);
    const [newViewName, setNewViewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('kanban_saved_views');
        if (stored) {
            try {
                setSavedViews(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse saved views", e);
            }
        }
    }, []);

    const handleSave = () => {
        if (!newViewName.trim()) return;

        const newView = {
            id: Date.now().toString(),
            name: newViewName.trim(),
            config: currentConfig, // Capture current state
            createdAt: new Date().toISOString()
        };

        const updated = [...savedViews, newView];
        setSavedViews(updated);
        localStorage.setItem('kanban_saved_views', JSON.stringify(updated));

        setNewViewName('');
        setIsCreating(false);
        toast.success("Vista guardada");
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (!window.confirm("¿Eliminar esta vista?")) return;

        const updated = savedViews.filter(v => v.id !== id);
        setSavedViews(updated);
        localStorage.setItem('kanban_saved_views', JSON.stringify(updated));
        toast.success("Vista eliminada");
    };

    const handleLoad = (view) => {
        if (onLoad) {
            onLoad(view.config);
            setIsOpen(false);
            toast.success(`Vista "${view.name}" cargada`);
        }
    };

    const handleSetDefault = (id, e) => {
        e.stopPropagation();
        const updated = savedViews.map(v => ({
            ...v,
            isDefault: v.id === id ? !v.isDefault : false // Toggle or set, ensure only one default
        }));
        setSavedViews(updated);
        localStorage.setItem('kanban_saved_views', JSON.stringify(updated));

        if (updated.find(v => v.id === id && v.isDefault)) {
            toast.success("Vista predeterminada actualizada");
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                    isOpen ? "bg-amber-900/40 text-amber-400 border-amber-500/50" : "bg-gray-800 text-gray-300 border-gray-700 hover:text-white hover:bg-gray-700"
                )}
                title="Vistas Guardadas"
            >
                <Bookmark className="w-3.5 h-3.5" />
                Vistas
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-64 bg-[#1e293b] border border-gray-700 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 origin-top-right">

                        {/* Header / Create */}
                        <div className="mb-3">
                            {isCreating ? (
                                <div className="space-y-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Nombre de la vista..."
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-1.5 text-xs text-white outline-none focus:border-amber-500"
                                        value={newViewName}
                                        onChange={e => setNewViewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsCreating(false)} className="text-[10px] text-gray-400 hover:text-white px-2 py-1">Cancelar</button>
                                        <button onClick={handleSave} className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1">
                                            <Save className="w-3 h-3" /> Guardar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-2 rounded-lg border border-gray-700 border-dashed transition-all text-xs font-bold"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Nueva Vista Actual
                                </button>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gray-700 my-2"></div>

                        {/* List */}
                        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {savedViews.length === 0 ? (
                                <div className="text-center py-4 text-gray-500 text-xs italic">
                                    No hay vistas guardadas.
                                </div>
                            ) : (
                                savedViews.map(view => (
                                    <div
                                        key={view.id}
                                        onClick={() => handleLoad(view)}
                                        className="group flex items-center justify-between p-2 rounded hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Bookmark className={clsx("w-3.5 h-3.5 shrink-0", view.isDefault ? "text-amber-400 fill-amber-400" : "text-gray-500")} />
                                            <span className="text-xs text-gray-200 truncate font-medium">{view.name}</span>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleSetDefault(view.id, e)}
                                                className={clsx("p-1 hover:bg-gray-600 rounded", view.isDefault ? "text-amber-400" : "text-gray-500 hover:text-amber-400")}
                                                title="Establecer como predeterminada al inicio"
                                            >
                                                <Star className={clsx("w-3 h-3", view.isDefault && "fill-amber-400")} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(view.id, e)}
                                                className="p-1 hover:bg-red-900/30 text-gray-500 hover:text-red-400 rounded"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
