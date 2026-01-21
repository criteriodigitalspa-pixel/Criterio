import { X, Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { getSLAStatus } from '../services/slaService';
import TicketHistoryList from './TicketHistoryList';

export default function SLADetailModal({ ticket, onClose }) {
    if (!ticket) return null;

    const { status, elapsed, remaining, limit } = getSLAStatus(ticket);
    const createdDate = new Date(ticket.createdAt?.seconds ? ticket.createdAt.seconds * 1000 : ticket.createdAt);

    // Calculate limit date
    const limitDate = new Date(createdDate.getTime() + limit);

    // Humanize Time Function (Days support)
    const humanize = (ms) => {
        const absMs = Math.abs(ms);
        const totalHours = Math.floor(absMs / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const h = totalHours % 24;
        const m = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
        return { days, h, m };
    };

    const { days, h: hoursLeft, m: minsLeft } = humanize(remaining);

    // Status config
    const config = {
        ok: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: CheckCircle, label: 'En Tiempo' },
        warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock, label: 'Por Vencer' },
        danger: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle, label: 'Vencido' },
        na: { color: 'text-gray-400', bg: 'bg-gray-700/50', border: 'border-gray-600', icon: Clock, label: 'N/A' }
    }[status] || { color: 'text-gray-400', bg: 'bg-gray-700', border: 'border-gray-600', icon: Clock, label: 'Unknown' };

    const StatusIcon = config.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className={clsx("p-4 border-b border-gray-700/50 flex justify-between items-center", config.bg)}>
                    <h3 className={clsx("font-black uppercase tracking-wider text-sm flex items-center gap-2", config.color)}>
                        <StatusIcon className="w-4 h-4" />
                        SLA Status: {config.label}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Timer Big Display */}
                    <div className="text-center">
                        <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">
                            {status === 'danger' ? 'Tiempo Excedido (Total)' : 'Tiempo Restante'}
                        </div>
                        <div className={clsx("text-4xl font-black font-mono tracking-tighter", config.color)}>
                            {status === 'danger' && '+'}
                            {days > 0 && <span>{days}D </span>}
                            {hoursLeft}H <span className="text-3xl opacity-50">{minsLeft}M</span>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-800"></div>

                        {/* Start */}
                        <div className="relative flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center shrink-0 z-10">
                                <Calendar className="w-3 h-3 text-gray-400" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-gray-500">Ingreso</div>
                                <div className="text-sm font-bold text-white">{createdDate.toLocaleString('es-ES', { hour12: false })}</div>
                            </div>
                        </div>

                        {/* Limit */}
                        {status !== 'na' && (
                            <div className="relative flex items-center gap-3">
                                <div className={clsx("w-6 h-6 rounded-full border flex items-center justify-center shrink-0 z-10",
                                    status === 'danger' ? "bg-red-900/20 border-red-500 text-red-500" : "bg-gray-800 border-gray-600 text-gray-400"
                                )}>
                                    <AlertTriangle className="w-3 h-3" />
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-500">Límite SLA</div>
                                    <div className={clsx("text-sm font-bold", status === 'danger' ? "text-red-400" : "text-gray-300")}>
                                        {limitDate.toLocaleString('es-ES', { hour12: false })}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        ({Math.floor(limit / (1000 * 60 * 60))} horas max)
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* History List */}
                <div className="border-t border-gray-800 pt-4">
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">
                        Historial Detallado
                    </div>
                    <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        <TicketHistoryList history={ticket.history} />
                    </div>
                </div>
            </div>
        </div>

    );
}
