import { useState, useEffect } from 'react';
import { X, Trash2, RefreshCw, AlertTriangle, CheckCircle, Search, Calendar, Hash, ShoppingBag, RotateCcw } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function TrashBinModal({ onClose, onRestore }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('deleted'); // 'deleted' | 'sales'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchItems();
    }, [activeTab]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            let q;
            if (activeTab === 'deleted') {
                q = query(collection(db, 'tickets'), where("status", "==", "Deleted"));
            } else {
                // Fetch Sales: tickets in 'Ventas' area
                q = query(collection(db, 'tickets'), where("currentArea", "==", "Ventas"));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => {
                    const dateA = (activeTab === 'deleted' ? a.deletedAt?.seconds : a.updatedAt?.seconds) || 0;
                    const dateB = (activeTab === 'deleted' ? b.deletedAt?.seconds : b.updatedAt?.seconds) || 0;
                    return dateB - dateA;
                });
            setItems(data);
        } catch (error) {
            console.error("Error fetching items:", error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (ticket) => {
        if (!window.confirm(`¿Restaurar ticket ${ticket.ticketId}? Volverá a su estado activo.`)) return;

        setProcessingId(ticket.id);
        const toastId = toast.loading("Restaurando...");
        try {
            await ticketService.restoreTicket(ticket.id, user.uid);
            toast.success("Ticket restaurado", { id: toastId });
            setItems(prev => prev.filter(t => t.id !== ticket.id));
            if (onRestore) onRestore(ticket.id);
        } catch (error) {
            console.error(error);
            toast.error("Error al restaurar", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleHardDelete = async (ticket) => {
        if (!window.confirm(`⛔ ¿ELIMINAR DEFINITIVAMENTE ${ticket.ticketId}?\n\nEsta acción NO se puede deshacer. El ticket desaparecerá para siempre.`)) return;

        setProcessingId(ticket.id);
        const toastId = toast.loading("Eliminando...");
        try {
            await ticketService.hardDeleteTicket(ticket.id, user.uid);
            toast.success("Ticket eliminado para siempre", { id: toastId });
            setItems(prev => prev.filter(t => t.id !== ticket.id));
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleUndoSale = async (ticket) => {
        if (!window.confirm(`¿Devolver ${ticket.ticketId} al Tablero?\nSe marcará como activo en 'Diagnóstico' para corregir.`)) return;

        setProcessingId(ticket.id);
        const toastId = toast.loading("Devolviendo al tablero...");
        try {
            // Move back to 'Diagnóstico' (or a safe default area)
            // We use moveTicket to properly log the history
            // 1. Move Ticket Area -> Caja Despacho (Logic previous step for sales)
            // Changed from 'Servicio Rapido' to 'Caja Despacho' per user request
            await ticketService.moveTicket(ticket.id, 'Caja Despacho', user.uid, {
                reason: 'Corrección de Venta (Undo Sale from TrashBin)',
                inputData: {}
            });

            // 2. Reset Status to Active (Critical: un-close the ticket so it shows on board)
            // also clear 'soldAt' if exists to prevent confusion, but keep price for editing?
            // User intention is "Corregir", so keeping price is helpful.
            await ticketService.updateTicket(ticket.id, {
                status: 'Active',
                // Optional: clear sold date to reflect it's open again
                soldAt: null,
                // We keep financials/prices so they can be corrected
            }, { userId: user.uid, reason: 'Re-opening Sale' });

            toast.success("Ticket devuelto al tablero", { id: toastId });
            setItems(prev => prev.filter(t => t.id !== ticket.id));
            if (onRestore) onRestore(ticket.id); // Refresh board
        } catch (error) {
            console.error(error);
            toast.error("Error al devolver ticket", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const filteredItems = items.filter(t =>
        t.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.modelo || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 bg-gray-900/50 border-b border-gray-700/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Trash2 className="w-8 h-8 text-gray-400" /> Gestión de Eliminados y Ventas
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Recupera tickets eliminados o corrige ventas mal ingresadas.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700/50 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 bg-gray-900/30">
                    <button
                        onClick={() => setActiveTab('deleted')}
                        className={clsx(
                            "flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors relative",
                            activeTab === 'deleted' ? "text-red-400 bg-red-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                        )}
                    >
                        <Trash2 className="w-4 h-4" /> Papelera
                        {activeTab === 'deleted' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={clsx(
                            "flex-1 p-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors relative",
                            activeTab === 'sales' ? "text-green-400 bg-green-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                        )}
                    >
                        <ShoppingBag className="w-4 h-4" /> Corregir Ventas
                        {activeTab === 'sales' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"></div>}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 bg-gray-900/50 border-b border-gray-700 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder={activeTab === 'deleted' ? "Buscar en papelera..." : "Buscar ventas..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={clsx(
                                "w-full bg-gray-800 border rounded-xl pl-9 pr-4 py-2 text-white outline-none focus:ring-2",
                                activeTab === 'deleted' ? "border-gray-600 focus:ring-red-500" : "border-gray-600 focus:ring-green-500"
                            )}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
                    {loading ? (
                        <div className="flex justify-center items-center h-48 space-x-2">
                            <div className={clsx("w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s]", activeTab === 'deleted' ? "bg-red-500" : "bg-green-500")}></div>
                            <div className={clsx("w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s]", activeTab === 'deleted' ? "bg-red-500" : "bg-green-500")}></div>
                            <div className={clsx("w-2 h-2 rounded-full animate-bounce", activeTab === 'deleted' ? "bg-red-500" : "bg-green-500")}></div>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 opacity-50">
                            {activeTab === 'deleted' ? <Trash2 className="w-16 h-16 mb-4" /> : <ShoppingBag className="w-16 h-16 mb-4" />}
                            <p className="text-lg font-medium">{activeTab === 'deleted' ? "Papelera vacía" : "No hay ventas recientes"}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredItems.map(ticket => (
                                <div key={ticket.id} className="bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl p-4 flex items-center justify-between group transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center font-mono font-bold text-gray-500 border border-gray-700">
                                            {ticket.ticketId.split('-')[1]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-200">{ticket.marca} {ticket.modelo}</span>
                                                <span className={clsx("text-xs px-2 py-0.5 rounded-full", activeTab === 'deleted' ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400")}>
                                                    {activeTab === 'deleted' ? 'Eliminado' : 'Vendido'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Hash className="w-3 h-3" /> {ticket.ticketId}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {activeTab === 'deleted'
                                                        ? (ticket.deletedAt?.seconds ? new Date(ticket.deletedAt.seconds * 1000).toLocaleString() : 'Desconocida')
                                                        : (ticket.updatedAt?.seconds ? new Date(ticket.updatedAt.seconds * 1000).toLocaleDateString() : '-')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {activeTab === 'deleted' ? (
                                            <>
                                                <button
                                                    onClick={() => handleRestore(ticket)}
                                                    disabled={!!processingId}
                                                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg font-bold text-sm transition-colors border border-blue-500/30 flex items-center gap-2"
                                                >
                                                    <RefreshCw className={clsx("w-4 h-4", processingId === ticket.id && "animate-spin")} />
                                                    Restaurar
                                                </button>
                                                <button
                                                    onClick={() => handleHardDelete(ticket)}
                                                    disabled={!!processingId}
                                                    className="px-4 py-2 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg font-bold text-sm transition-colors border border-red-900/30 flex items-center gap-2"
                                                >
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Eliminar
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleUndoSale(ticket)}
                                                disabled={!!processingId}
                                                className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-white rounded-lg font-bold text-sm transition-colors border border-yellow-500/30 flex items-center gap-2"
                                            >
                                                <RotateCcw className={clsx("w-4 h-4", processingId === ticket.id && "animate-spin")} />
                                                Devolver al Tablero
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-900/50 border-t border-gray-700 text-center text-xs text-gray-500">
                    {activeTab === 'deleted'
                        ? "Los tickets activos se restauran a su estado original. Eliminación permanente es irreversible."
                        : "Devolver al tablero mueve el ticket a 'Diagnóstico' para permitir correcciones."}
                </div>
            </div>
        </div>
    );
}
