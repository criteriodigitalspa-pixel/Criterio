import React from 'react';
import { Clock } from 'lucide-react';

const TicketHistoryList = ({ history }) => {
    // 1. Pre-process history to calculate durations
    const rawHistory = Array.isArray(history) ? [...history] : [];

    const formatDate = (dateInput) => {
        if (!dateInput) return '';
        const date = dateInput.seconds ? new Date(dateInput.seconds * 1000) : new Date(dateInput);
        return date.toLocaleString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to get MS from timestamp
    const getMs = (ts) => {
        if (!ts) return 0;
        return ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime();
    };

    // Sort Oldest -> Newest
    rawHistory.sort((a, b) => getMs(a.timestamp) - getMs(b.timestamp));

    // Identify Move Events and Calculate Duration
    const eventsWithDuration = rawHistory.map(e => ({ ...e }));
    const moveIndices = [];
    eventsWithDuration.forEach((ev, idx) => {
        if (ev.action === 'MOVE' || ev.action === 'CREATE') {
            moveIndices.push(idx);
        }
    });

    const now = Date.now();
    // Visit Counter Map
    const areaCounts = {};

    moveIndices.forEach((idx, i) => {
        const currentEvent = eventsWithDuration[idx];
        const startTime = getMs(currentEvent.timestamp);

        // Count Visits
        if (currentEvent.area) {
            areaCounts[currentEvent.area] = (areaCounts[currentEvent.area] || 0) + 1;
            currentEvent.visitNumber = areaCounts[currentEvent.area];
        }

        // End time is the start of the NEXT move, or NOW if it's the last one
        const nextMoveIdx = moveIndices[i + 1];
        const endTime = nextMoveIdx !== undefined
            ? getMs(eventsWithDuration[nextMoveIdx].timestamp)
            : now;

        currentEvent.duration = endTime - startTime;
    });

    // Helper for formatting
    const formatDuration = (ms) => {
        if (!ms && ms !== 0) return '';
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        if (days > 0) return `${days}d ${remHours}h`;
        if (hours > 0) return `${hours}h`;
        return '< 1h';
    };

    // Render Reversed (Newest First)
    return (
        <div className="relative border-l-2 border-gray-700 ml-3 space-y-6">
            {eventsWithDuration.reverse().map((evt, i) => (
                <div key={i} className="mb-6 ml-6 relative group">
                    <span className={`absolute flex items-center justify-center w-4 h-4 rounded-full -left-[21px] transition-colors ${evt.action === 'MOVE' || evt.action === 'CREATE' ? 'bg-cyan-900 ring-2 ring-cyan-500/30' : 'bg-gray-700'
                        }`}></span>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                        <div>
                            <h4 className="flex flex-col sm:flex-row sm:items-center sm:gap-2 mb-1 text-sm text-gray-300">
                                <span className={`font-bold ${evt.action === 'MOVE' ? 'text-cyan-400' : 'text-blue-300'}`}>
                                    {evt.action}
                                </span>
                                {evt.area && evt.area !== 'Unknown' && (
                                    <span className="text-xs text-gray-400">
                                        ({evt.area} {evt.visitNumber > 1 ? `#${evt.visitNumber}` : ''})
                                    </span>
                                )}
                                {(evt.user || evt.userId) && <span className="text-xs text-gray-500">por {evt.user || evt.userId}</span>}
                            </h4>
                            <time className="block mb-2 text-xs font-normal text-gray-600">{formatDate(evt.timestamp)}</time>
                        </div>

                        {/* DURATION BADGE */}
                        {evt.duration !== undefined && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-400 font-mono whitespace-nowrap">
                                <Clock className="w-3 h-3" />
                                <span className="hidden sm:inline">{formatDuration(evt.duration)}</span>
                                <span className="sm:hidden">{formatDuration(evt.duration).split(' ')[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* REASON & NOTE */}
                    <div className="space-y-1">
                        {
                            evt.reason && (
                                <p className="text-xs font-bold text-gray-400">{evt.reason}</p>
                            )
                        }
                        {evt.note && <p className="text-sm font-mono text-gray-500 bg-black/20 p-2 rounded border border-gray-800">{evt.note}</p>}
                    </div>

                    {/* DETAILS INSPECTOR (Changes) */}
                    {
                        evt.changes && Array.isArray(evt.changes) && evt.changes.length > 0 && (
                            <div className="mt-1 text-[10px] text-gray-600 font-mono">
                                Modificado: {evt.changes.join(', ')}
                            </div>
                        )
                    }

                    {/* DETAILS INSPECTOR (Legacy/Fallback) */}
                    {
                        evt.details && (
                            <div className="mt-1 text-xs text-gray-500">
                                {evt.details.priorArea && <span>Desde: {evt.details.priorArea}</span>}
                            </div>
                        )
                    }
                </div>
            ))}
        </div>
    );
};

export default TicketHistoryList;
