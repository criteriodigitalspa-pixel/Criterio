import React, { useState, useEffect, useMemo } from 'react';
import { ticketService } from '../../services/ticketService'; // Adjust path if needed
import { CheckSquare, ArrowRight, Save, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ModelNormalizer() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Selection for Merge
    const [selectedGroups, setSelectedGroups] = useState(new Set());
    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [mergeTarget, setMergeTarget] = useState({ marca: '', modelo: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const all = await ticketService.getAllTickets();
            // Filter only active tickets? or all? Let's do all not deleted.
            const active = all.filter(t => t.status !== 'Deleted');
            setTickets(active);
        } catch (error) {
            console.error("Error loading tickets", error);
            toast.error("Error al cargar inventario");
        } finally {
            setLoading(false);
        }
    };

    // Grouping Logic
    const groupedData = useMemo(() => {
        const groups = {};

        tickets.forEach(t => {
            const marca = (t.marca || 'GENERICO').trim();
            const modelo = (t.modelo || 'S/M').trim();
            const key = `${marca}::${modelo}`; // Unique Key

            if (!groups[key]) {
                groups[key] = {
                    key,
                    marca,
                    modelo,
                    count: 0,
                    ticketIds: []
                };
            }
            groups[key].count++;
            groups[key].ticketIds.push(t.id);
        });

        // Convert to array and sort by count desc
        return Object.values(groups).sort((a, b) => b.count - a.count);
    }, [tickets]);

    // Filter Logic
    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groupedData;
        const lower = searchTerm.toLowerCase();
        return groupedData.filter(g =>
            g.marca.toLowerCase().includes(lower) ||
            g.modelo.toLowerCase().includes(lower)
        );
    }, [groupedData, searchTerm]);

    const handleToggleGroup = (key) => {
        const newSet = new Set(selectedGroups);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setSelectedGroups(newSet);
    };

    const handleOpenMerge = () => {
        if (selectedGroups.size < 2 && selectedGroups.size !== 1) {
            // Allow size 1 just to rename? Yes.
            // But usually merge is > 1.
        }

        // Pre-fill with the first selected's data as suggestion
        const firstKey = Array.from(selectedGroups)[0];
        const firstGroup = groupedData.find(g => g.key === firstKey);

        if (firstGroup) {
            setMergeTarget({ marca: firstGroup.marca, modelo: firstGroup.modelo });
        }

        setIsMergeModalOpen(true);
    };

    const executeMerge = async () => {
        if (!mergeTarget.marca || !mergeTarget.modelo) {
            toast.error("Marca y Modelo son obligatorios");
            return;
        }

        const toastId = toast.loading("Fusionando modelos...");

        try {
            // Gatther all ticket IDs from selected groups
            let allTicketIds = [];
            selectedGroups.forEach(key => {
                const group = groupedData.find(g => g.key === key);
                if (group) {
                    allTicketIds = [...allTicketIds, ...group.ticketIds];
                }
            });

            await ticketService.batchUpdateModel(allTicketIds, mergeTarget.marca, mergeTarget.modelo);

            toast.success(`¡Éxito! ${allTicketIds.length} tickets actualizados`, { id: toastId });
            setSelectedGroups(new Set());
            setIsMergeModalOpen(false);
            loadData(); // Reload to see fresh groups

        } catch (error) {
            console.error(error);
            toast.error("Error al fusionar", { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans text-slate-800">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Homologador de Inventario</h1>
                    <p className="text-slate-500">Unifica nombres de modelos dispares para evitar duplicados en WooCommerce.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar modelo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <button onClick={loadData} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                        <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Merge Action Bar */}
            <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-6 transition-all duration-300 ${selectedGroups.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                <div className="font-bold border-r border-gray-700 pr-6">
                    {selectedGroups.size} <span className="font-normal text-gray-400">variaciones seleccionadas</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-xs font-bold">ACCION</span>
                    Serán unificadas en un solo nombre
                </div>
                <button
                    onClick={handleOpenMerge}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/50 flex items-center gap-2 transition-transform active:scale-95"
                >
                    <ArrowRight className="w-4 h-4" /> Proceder a Fusión
                </button>
            </div>

            {/* Table / List */}
            <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">
                                {/* Select All could go here */}
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Marca Detectada</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Modelo Detectado</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredGroups.map(group => (
                            <tr
                                key={group.key}
                                className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${selectedGroups.has(group.key) ? 'bg-blue-50' : ''}`}
                                onClick={() => handleToggleGroup(group.key)}
                            >
                                <td className="px-6 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedGroups.has(group.key)}
                                        onChange={() => { }} // handled by row click
                                        className="rounded border-gray-300 text-blue-600 w-5 h-5 focus:ring-0 cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">{group.marca}</td>
                                <td className="px-6 py-4 text-gray-600 font-mono text-sm">{group.modelo}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="bg-gray-100 text-gray-700 font-bold px-2 py-1 rounded-full text-xs">
                                        {group.count}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {filteredGroups.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                                    No se encontraron modelos con ese criterio.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Merge Modal */}
            {isMergeModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                            <RefreshCw className="text-blue-600" /> Definir Nombre Maestro
                        </h2>

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 text-sm text-blue-800">
                            Estás a punto de actualizar <strong>{selectedGroups.size} variaciones</strong> distintas.
                            Todos los equipos afectados pasarán a tener exactamente esta Marca y Modelo.
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marca Final</label>
                                <input
                                    type="text"
                                    value={mergeTarget.marca}
                                    onChange={e => setMergeTarget({ ...mergeTarget, marca: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-3 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modelo Final</label>
                                <input
                                    type="text"
                                    value={mergeTarget.modelo}
                                    onChange={e => setMergeTarget({ ...mergeTarget, modelo: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-3 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsMergeModalOpen(false)}
                                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeMerge}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                            >
                                Confirmar y Fusionar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
