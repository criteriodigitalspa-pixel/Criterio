import { useState } from 'react';
import { X, DollarSign, Clock, Wrench, History, ArrowRight, Activity, User, FileText, ArrowLeftRight } from 'lucide-react';
import clsx from 'clsx';
import { useTicketHistory } from '../hooks/useTicketHistory';

export default function ServiceHistoryModal({ ticket, onClose }) {
    const { history, loading, error } = useTicketHistory(ticket.id);
    const logs = ticket.serviceLogs || [];
    const currentActions = ticket.serviceActions || [];

    // Calculate totals from Service Logs (Hardware/Service Cycles)
    const totalAccumulatedCost = logs.reduce((acc, log) => acc + (log.analysis?.realCost || 0), 0);
    const totalAccumulatedTime = logs.reduce((acc, log) => acc + (log.analysis?.realTime || 0), 0);

    // Toggle between Service Cycles (Financial) and Full Audit (System)
    const [viewMode, setViewMode] = useState('audit'); // 'cycles', 'audit'

    // Diff Helper
    const renderDiff = (changes) => {
        if (!changes || Object.keys(changes).length === 0) return null;
        return (
            <div className="mt-2 bg-black/20 rounded p-2 text-[10px] font-mono space-y-1">
                {Object.entries(changes).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                        <span className="text-blue-300">{key}:</span>
                        <span className="text-gray-300 truncate max-w-[200px]">{JSON.stringify(value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return <FileText className="w-4 h-4 text-emerald-400" />;
            case 'MOVE': return <ArrowRight className="w-4 h-4 text-blue-400" />;
            case 'UPDATE': return <Wrench className="w-4 h-4 text-yellow-400" />;
            case 'QA_UPDATE': return <Activity className="w-4 h-4 text-purple-400" />;
            default: return <Activity className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-700/50 bg-gray-800/80 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <History className="text-blue-400" /> Historial Completo
                        </h2>
                        <div className="flex gap-4 mt-2 text-sm">
                            <button
                                onClick={() => setViewMode('audit')}
                                className={clsx("pb-1 border-b-2 transition-colors", viewMode === 'audit' ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300")}
                            >
                                Auditoría (Timeline)
                            </button>
                            <button
                                onClick={() => setViewMode('cycles')}
                                className={clsx("pb-1 border-b-2 transition-colors", viewMode === 'cycles' ? "border-green-500 text-green-400" : "border-transparent text-gray-500 hover:text-gray-300")}
                            >
                                Ciclos de Servicio (Rentabilidad)
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 bg-gray-900/30 p-6">

                    {viewMode === 'audit' ? (
                        <div className="space-y-6 relative">
                            {/* Timeline Line */}
                            <div className="absolute left-6 top-4 bottom-4 w-px bg-gray-700/50" />

                            {loading ? (
                                <div className="text-center text-gray-500 py-10">Cargando historial...</div>
                            ) : history.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">No hay registros de auditoría.</div>
                            ) : (
                                history.map((event, idx) => (
                                    <div key={event.id || idx} className="relative pl-14 group">
                                        {/* Dot */}
                                        <div className="absolute left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-gray-600 border border-gray-900 group-hover:bg-blue-500 transition-colors z-10" />

                                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="p-1 rounded-full bg-gray-700/50">{getActionIcon(event.action)}</span>
                                                    <span className="font-bold text-gray-200 text-sm">{event.action}</span>
                                                    {event.area && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{event.area}</span>}
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-500">
                                                    {event.timestamp?.seconds ? new Date(event.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                                                </span>
                                            </div>

                                            {event.reason && (
                                                <p className="text-xs text-gray-400 mb-2 italic">"{event.reason}"</p>
                                            )}

                                            {renderDiff(event.changes)}

                                            <div className="mt-2 pt-2 border-t border-gray-700/30 flex items-center gap-2 text-[10px] text-gray-500">
                                                <User className="w-3 h-3" />
                                                <span className="font-mono">{event.userId || 'System'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        // CYCLES VIEW (Previous Implementation)
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600">
                                    <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Costo Total</span>
                                    <div className="text-2xl font-mono text-green-400 font-bold flex items-center gap-1">
                                        <DollarSign className="w-5 h-5" /> {totalAccumulatedCost.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600">
                                    <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Tiempo Total</span>
                                    <div className="text-2xl font-mono text-blue-400 font-bold flex items-center gap-1">
                                        <Clock className="w-5 h-5" /> {totalAccumulatedTime}m
                                    </div>
                                </div>
                                <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600">
                                    <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Ciclos</span>
                                    <div className="text-2xl font-mono text-blue-400 font-bold flex items-center gap-1">
                                        <History className="w-5 h-5" /> {logs.length}
                                    </div>
                                </div>
                            </div>

                            {/* Logs List */}
                            <div className="space-y-4">
                                {logs.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                                        No hay ciclos de servicio finalizados aún.
                                    </div>
                                ) : (
                                    logs.map((log, idx) => (
                                        <div key={idx} className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden px-4 py-3">
                                            <div className="flex justify-between items-center text-xs mb-2">
                                                <span className="font-bold text-gray-300">Ciclo #{idx + 1} - Salida de {log.area}</span>
                                                <span className="text-gray-500 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-xs">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-gray-400"><span>Real:</span> <span className="text-white font-bold">${log.analysis?.realCost?.toLocaleString()}</span></div>
                                                    <div className="flex justify-between text-gray-400"><span>Dif:</span> <span className={clsx((log.analysis?.diffCost || 0) > 0 ? "text-red-400" : "text-green-400")}>{(log.analysis?.diffCost || 0) > 0 ? '+' : ''}{log.analysis?.diffCost}</span></div>
                                                </div>
                                                <div className="space-y-1">
                                                    {log.swaps?.swappedRAM && <span className="block text-cyan-400">RAM Swapped</span>}
                                                    {log.swaps?.swappedDisk && <span className="block text-orange-400">Disk Swapped</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
