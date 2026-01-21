import { useState, useRef, useEffect } from 'react';
import { X, Layers, Plus } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import toast from 'react-hot-toast';

export default function BulkBatchModal({ tickets, onClose, onComplete }) {
    const [batchId, setBatchId] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    // Focus input on mount
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleApply = async () => {
        let finalBatchId = batchId.trim().toUpperCase();

        if (!finalBatchId) {
            // If empty, user might want to clear it? No, usually assign. 
            // Requirement said "NEW" or empty -> generate.
            // We can provide a button for that for clarity.
            // If manual input is empty, maybe show error or treat as "Generate".
            // Let's force explicit "Generate" button click or typing.
            toast.error("Ingrese un ID o pulse 'Generar Nuevo'");
            return;
        }

        executeBatch(finalBatchId);
    };

    const handleGenerateNew = async () => {
        setLoading(true);
        try {
            const newId = await ticketService.generateNewBatchId();
            setBatchId(newId);
            executeBatch(newId);
        } catch (error) {
            console.error(error);
            toast.error("Error generando ID");
            setLoading(false);
        }
    };

    const executeBatch = async (idToAssign) => {
        setLoading(true);
        const toastId = toast.loading(`Asignando Lote ${idToAssign}...`);

        try {
            const ticketIds = tickets.map(t => t.id);
            await ticketService.updateBatchId(ticketIds, idToAssign);

            toast.success(`Lote ${idToAssign} asignado`, { id: toastId });
            onComplete();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar lote", { id: toastId });
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Layers className="text-cyan-400" /> Asignar Lote
                </h3>

                <p className="text-sm text-gray-400 mb-6">
                    Moviendo <span className="text-white font-bold">{tickets.length}</span> tickets al lote:
                </p>

                <div className="space-y-4">
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID del Lote</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={batchId}
                            onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleApply();
                            }}
                            placeholder="Ej: L005"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-lg font-mono tracking-wider focus:ring-2 ring-cyan-500 outline-none uppercase"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="h-px bg-gray-700 flex-1"></div>
                        <span className="text-xs text-gray-500 font-bold">O</span>
                        <div className="h-px bg-gray-700 flex-1"></div>
                    </div>

                    <button
                        onClick={handleGenerateNew}
                        disabled={loading}
                        className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-cyan-400 font-bold border border-gray-700 hover:border-cyan-500/50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Generar Lote Nuevo
                    </button>

                    <button
                        onClick={handleApply}
                        disabled={loading || !batchId.trim()}
                        className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? "Aplicando..." : "Confirmar Cambio"}
                    </button>
                </div>
            </div>
        </div>
    );
}
