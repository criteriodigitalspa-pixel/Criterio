import { useState, useEffect } from 'react';
import { X, CheckCircle, Save, CheckSquare } from 'lucide-react';
import { QA_ITEMS } from '../data/constants.jsx';
import { ticketService } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';



export default function QAChecklistModal({ ticket, onClose, onUpdate }) {
    const { user } = useAuth();
    // Local state
    const [checklist, setChecklist] = useState(ticket.qaChecklist || {});
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(ticket.qaChecklist || {});

    const toggleItem = (key) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAll = () => {
        const allSelected = QA_ITEMS.every(i => checklist[i.key]);
        const newChecklist = {};
        QA_ITEMS.forEach(i => {
            newChecklist[i.key] = !allSelected;
        });
        setChecklist(newChecklist);
    };

    // Auto-Save Effect
    useEffect(() => {
        // Debounce save
        const timer = setTimeout(() => {
            // Compare current checklist with last saved version to avoid redundant saves
            if (JSON.stringify(checklist) !== JSON.stringify(lastSaved)) {
                handleSave(true);
            }
        }, 2000); // 2 seconds delay

        return () => clearTimeout(timer);
    }, [checklist, lastSaved]);

    const handleSave = async (isAuto = false) => {
        if (!ticket.id) return;
        if (saving && !isAuto) return; // Prevent double manual submission

        try {
            if (!isAuto) setSaving(true);

            const passedCount = QA_ITEMS.filter(i => checklist[i.key]).length;
            const progress = Math.round((passedCount / QA_ITEMS.length) * 100);

            // Sanitize checklist to ensure no undefined values (Firestore safety)
            const safeChecklist = { ...checklist };
            Object.keys(safeChecklist).forEach(key => {
                if (safeChecklist[key] === undefined) safeChecklist[key] = false;
            });

            // Only log history on Manual Save or 100% Completion
            const auditData = (!isAuto || progress === 100) ? {
                userId: user.uid,
                reason: `QA Progress: ${progress}%`,
                snapshot: { progress, checklist: safeChecklist }
            } : null;

            await ticketService.updateTicket(ticket.id, {
                qaChecklist: safeChecklist,
                qaProgress: progress
            }, auditData);

            // Log Event only on manual save or 100% completion to avoid spamming history
            if (!isAuto || progress === 100) {
                await ticketService.logQA(
                    ticket.id,
                    ticket.currentArea || 'Unknown',
                    safeChecklist,
                    progress,
                    ticket.createdBy || 'System'
                );
            }

            setLastSaved(safeChecklist);

            try {
                if (onUpdate) onUpdate({ ...ticket, qaChecklist: safeChecklist, qaProgress: progress });
            } catch (localErr) {
                console.warn("Local QA update failed:", localErr);
            }

            if (!isAuto) {
                toast.success(progress === 100 ? "QA Completado" : "Progreso Guardado");
                onClose();
            } else {
                // Silent auto-save
            }

        } catch (error) {
            console.error("Save failed", error);
            if (!isAuto) toast.error("Error guardando QA");
        } finally {
            if (!isAuto) setSaving(false);
        }
    };

    const progress = Math.round((QA_ITEMS.filter(i => checklist[i.key]).length / QA_ITEMS.length) * 100);
    const isComplete = progress === 100;
    const allSelected = QA_ITEMS.every(item => checklist[item.key]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/80">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="text-green-400" /> Control de Calidad
                        </h2>
                        <p className="text-sm text-gray-400">Progreso actual: {progress}%</p>
                    </div>
                    {/* Close without saving */}
                    <button onClick={onClose} title="Cancelar" className="p-2 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-700 w-full">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Select All Toggle */}
                <div
                    onClick={toggleAll}
                    className="mx-6 mt-4 mb-1 flex items-center justify-between p-3 bg-gray-700/30 rounded-xl cursor-pointer hover:bg-gray-700/50 border border-gray-700/50 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                            <CheckSquare className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-200 text-sm">MARCAR TODO</span>
                    </div>
                    <div className={clsx(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        allSelected ? "bg-blue-500 border-blue-500" : "border-gray-500 group-hover:border-blue-400"
                    )}>
                        {allSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                </div>

                {/* Checklist Content */}
                <div className="px-6 pb-6 pt-2 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                    {[
                        { name: 'Periféricos', keys: ['teclado', 'mouse', 'camara', 'sonido'] },
                        { name: 'Conectividad', keys: ['wifi', 'bluetooth', 'ethernet'] },
                        { name: 'Físico / Mantenimiento', keys: ['usbs', 'entradas', 'tornillos', 'limpieza'] },
                        { name: 'Sistema', keys: ['drivers'] }
                    ].map(group => {
                        const groupItems = QA_ITEMS.filter(item => group.keys.includes(item.key));
                        if (groupItems.length === 0) return null;

                        const allGroupSelected = groupItems.every(i => checklist[i.key]);

                        const toggleGroup = () => {
                            const newChecklist = { ...checklist };
                            groupItems.forEach(i => {
                                newChecklist[i.key] = !allGroupSelected;
                            });
                            setChecklist(newChecklist);
                        };

                        return (
                            <div key={group.name} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center justify-between mb-3 pl-1 pr-1 border-b border-gray-700/50 pb-1">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{group.name}</h3>
                                    <button
                                        onClick={toggleGroup}
                                        className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md hover:bg-blue-500/20 transition-colors"
                                    >
                                        {allGroupSelected ? "Desmarcar Todo" : "Marcar Todo"}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {groupItems.map((item) => (
                                        <div
                                            key={item.key}
                                            onClick={() => toggleItem(item.key)}
                                            className={clsx(
                                                "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99]",
                                                checklist[item.key]
                                                    ? "bg-green-500/10 border-green-500/50 text-green-100 shadow-sm"
                                                    : "bg-gray-700/30 border-gray-700 hover:bg-gray-700 text-gray-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={clsx("p-1.5 rounded-lg", checklist[item.key] ? "text-green-400 bg-green-500/20" : "text-gray-400 bg-gray-600/20")}>
                                                    {item.icon}
                                                </div>
                                                <span className="font-medium text-sm">{item.label}</span>
                                            </div>

                                            <div className={clsx(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                checklist[item.key] ? "bg-green-500 border-green-500" : "border-gray-500"
                                            )}>
                                                {checklist[item.key] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Buttons */}
                <div className="p-5 bg-gray-900/50 border-t border-gray-700/50 flex flex-col items-center gap-2">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className={clsx(
                            "w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2",
                            isComplete
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-green-500/20"
                                : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                        )}
                    >
                        {saving ? "Guardando..." : isComplete ? "Guardar y Continuar" : "Continuar Después"}
                    </button>
                </div>
            </div>
        </div>
    );
}
