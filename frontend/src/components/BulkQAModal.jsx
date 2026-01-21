import { useState, useEffect } from 'react';
import { X, Save, CheckCircle, CheckSquare, ListChecks } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Import QA Items from shared constants
import { QA_ITEMS } from '../data/constants.jsx';

export default function BulkQAModal({ tickets, onClose, onComplete }) {
    // Local State: Map of ticketId -> checklist object
    const [gridState, setGridState] = useState({});
    const [saving, setSaving] = useState(false);

    // Initialize state from tickets
    useEffect(() => {
        const initial = {};
        tickets.forEach(t => {
            // Ensure valid object
            initial[t.id] = t.qaChecklist || {};
        });
        setGridState(initial);
    }, [tickets]);

    // HANDLERS
    const toggleCell = (ticketId, key) => {
        setGridState(prev => ({
            ...prev,
            [ticketId]: {
                ...prev[ticketId],
                [key]: !prev[ticketId][key]
            }
        }));
    };

    const toggleRow = (key) => {
        // Check if all are currently checked to determine action (check all vs uncheck all)
        const allChecked = tickets.every(t => gridState[t.id]?.[key]);
        const newValue = !allChecked;

        setGridState(prev => {
            const next = { ...prev };
            tickets.forEach(t => {
                next[t.id] = { ...next[t.id], [key]: newValue };
            });
            return next;
        });
    };

    const toggleColumn = (ticketId) => {
        const current = gridState[ticketId] || {};
        const allChecked = QA_ITEMS.every(item => current[item.key]);
        const newValue = !allChecked;

        setGridState(prev => {
            const nextChecklist = {};
            QA_ITEMS.forEach(item => nextChecklist[item.key] = newValue);
            return { ...prev, [ticketId]: nextChecklist };
        });
    }

    const handleSave = async () => {
        setSaving(true);
        const toastId = toast.loading(`Guardando progreso de ${tickets.length} equipos...`);

        try {
            const promises = tickets.map(async (ticket) => {
                const checklist = gridState[ticket.id] || {};

                // Calculate Progress
                const passedCount = QA_ITEMS.filter(i => checklist[i.key]).length;
                const progress = Math.round((passedCount / QA_ITEMS.length) * 100);

                // Sanitize
                const safeChecklist = { ...checklist };
                Object.keys(safeChecklist).forEach(key => {
                    if (safeChecklist[key] === undefined) safeChecklist[key] = false;
                });

                // Update Ticket
                await ticketService.updateTicket(ticket.id, {
                    qaChecklist: safeChecklist,
                    qaProgress: progress
                });

                // Log if 100% (Optional, maybe skip for bulk to avoid spam, or log generic bulk event?)
                // Let's log if 100% to ensure audit trail is complete for "Ready" status
                if (progress === 100) {
                    await ticketService.logQA(
                        ticket.id,
                        ticket.currentArea || 'Bulk QA',
                        safeChecklist,
                        progress,
                        ticket.createdBy || 'System' //Ideally current user, but we don't have user prop here. It's fine for now.
                    );
                }
            });

            await Promise.all(promises);
            toast.success("QA Masivo Guardado", { id: toastId });
            onComplete();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    // Derived: Progress per ticket
    const getProgress = (ticketId) => {
        const c = gridState[ticketId] || {};
        const passed = QA_ITEMS.filter(i => c[i.key]).length;
        return Math.round((passed / QA_ITEMS.length) * 100);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-3xl shadow-2xl border border-gray-700 w-fit max-w-[95vw] h-auto max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <ListChecks className="text-green-400" /> Matriz de QA Masivo
                        </h2>
                        <p className="text-sm text-gray-400">
                            Equipos seleccionados: <span className="text-white font-bold">{tickets.length}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Matrix Content - Scrollable */}
                <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full border-collapse">
                        {/* Sticky Header Row (Ticket columns) */}
                        <thead className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur shadow-md">
                            <tr>
                                {/* Corner Cell */}
                                <th className="p-4 text-left border-b border-r border-gray-700 min-w-[200px] z-30 sticky left-0 bg-gray-900">
                                    <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Puntos de Control</span>
                                </th>
                                {/* Ticket Headers */}
                                {tickets.map(t => (
                                    <th key={t.id} className="p-3 border-b border-gray-700 min-w-[140px] text-left group relative hover:bg-gray-800">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-mono text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded w-fit">{t.ticketId}</span>
                                            <span className="text-xs text-gray-200 font-bold truncate max-w-[120px]" title={`${t.marca} ${t.modelo}`}>
                                                {t.marca} {t.modelo}
                                            </span>
                                            {/* Progress Bar Mini */}
                                            <div className="w-full h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 transition-all duration-300"
                                                    style={{ width: `${getProgress(t.id)}%` }}
                                                />
                                            </div>
                                        </div>
                                        {/* Column Selector */}
                                        <button
                                            onClick={() => toggleColumn(t.id)}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-opacity bg-gray-800 rounded shadow-sm"
                                            title="Seleccionar todo para este equipo"
                                        >
                                            <CheckSquare className="w-3 h-3" />
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {QA_ITEMS.map((item, rowIdx) => (
                                <tr key={item.key} className={clsx("hover:bg-gray-800/30 transition-colors", rowIdx % 2 === 0 ? 'bg-gray-900/20' : '')}>
                                    {/* Left Header (QA Item) */}
                                    <td className="p-3 border-r border-gray-700/50 sticky left-0 z-10 bg-[#0f172a] min-w-[200px]">
                                        <div className="flex items-center gap-3 group">
                                            {/* Row Selector Checkbox */}
                                            <label className="flex items-center cursor-pointer" title="Seleccionar toda la fila">
                                                <input
                                                    type="checkbox"
                                                    checked={tickets.every(t => gridState[t.id]?.[item.key])}
                                                    onChange={() => toggleRow(item.key)}
                                                    className="w-4 h-4 rounded border-gray-600 text-blue-500 bg-gray-800 focus:ring-offset-0 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                                                />
                                            </label>

                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 rounded text-gray-400 bg-gray-800 border border-gray-700">
                                                    {item.icon}
                                                </div>
                                                <span className="text-sm font-medium text-gray-300">{item.label}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Checkboxes */}
                                    {tickets.map(t => {
                                        const isChecked = gridState[t.id]?.[item.key] || false;
                                        return (
                                            <td key={`${t.id}-${item.key}`} className="p-0 border-r border-gray-800/50 text-center relative group-cell">
                                                <label className="flex items-center justify-center w-full h-full p-4 cursor-pointer hover:bg-gray-700/50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleCell(t.id, item.key)}
                                                        className="hidden"
                                                    />
                                                    <div className={clsx(
                                                        "w-6 h-6 rounded border-2 transition-all flex items-center justify-center",
                                                        isChecked
                                                            ? "bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)] scale-110"
                                                            : "border-gray-600 bg-gray-800 group-cell-hover:scale-105"
                                                    )}>
                                                        {isChecked && <CheckSquare className="w-4 h-4 text-white" />}
                                                    </div>
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-900 border-t border-gray-700 flex justify-end gap-3 z-30">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl text-gray-400 font-bold hover:bg-gray-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-900/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Guardando..." : "Guardar Todo"}
                    </button>
                </div>

            </div>
        </div>
    );
}
