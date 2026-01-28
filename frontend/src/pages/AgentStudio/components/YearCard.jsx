import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertTriangle, Briefcase } from 'lucide-react';

const YearCard = ({ profile, isSelected, onClick }) => {
    const { year, metrics, dominant, raw } = profile;

    const getBorderColor = () => {
        if (dominant === 'Stressed') return 'border-red-500/50 hover:border-red-500';
        if (dominant === 'Focused') return 'border-blue-500/50 hover:border-blue-500';
        return 'border-emerald-500/50 hover:border-emerald-500';
    };

    const sentimentColor = (sentiment) => {
        if (sentiment === 'Positive') return 'text-emerald-400';
        if (sentiment === 'Negative') return 'text-red-400';
        if (sentiment === 'Conflict') return 'text-orange-400';
        return 'text-blue-400';
    };

    return (
        <motion.div
            layout
            onClick={onClick}
            className={cn(
                "cursor-pointer rounded-xl p-6 border transition-all duration-300 relative overflow-hidden",
                "bg-slate-800/40 backdrop-blur-md hover:bg-slate-800/60",
                getBorderColor(),
                isSelected ? "ring-2 ring-blue-400 scale-[1.02] bg-slate-800 z-10" : ""
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-3xl font-bold text-white">{year}</h3>
                    <span className={cn(
                        "text-sm font-medium px-2 py-0.5 rounded-full",
                        dominant === 'Stressed' ? "bg-red-500/20 text-red-300" :
                            dominant === 'Focused' ? "bg-blue-500/20 text-blue-300" : "bg-emerald-500/20 text-emerald-300"
                    )}>
                        {dominant === 'Stressed' ? 'Estresado' : dominant === 'Focused' ? 'Enfocado' : 'Equilibrado'}
                    </span>
                </div>
                {dominant === 'Stressed' ? <AlertTriangle className="text-red-400" /> : <CheckCircle2 className="text-emerald-400" />}
            </div>

            <div className="space-y-4">
                {/* Metrics Bar */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Briefcase size={14} />
                        <span>Profesionalismo</span>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-1000"
                            style={{ width: `${metrics.professionalism}%` }}
                        />
                    </div>
                </div>

                {isSelected && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 mt-4"
                    >
                        {/* Summary */}
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                            <p className="text-sm text-slate-300 italic leading-relaxed">
                                "{raw.psyche.summary_of_self}"
                            </p>
                        </div>

                        {/* Canonical Events */}
                        {raw.psyche.canonical_events && (
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Eventos Canónicos</h4>
                                <div className="space-y-2">
                                    {raw.psyche.canonical_events.map((ev, i) => (
                                        <div key={i} className="flex gap-3 items-start p-2 rounded hover:bg-white/5 transition-colors">
                                            <div className={`mt-1 font-bold text-xs ${sentimentColor(ev.sentiment)}`}>
                                                {ev.year || '★'}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">{ev.event}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    con <span className="text-slate-300">{ev.person}</span>
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Traits */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {raw.psyche.traits.map((trait, i) => (
                                <span key={i} className="text-xs bg-blue-900/30 border border-blue-500/20 px-2 py-1 rounded-full text-blue-200">
                                    {trait}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default YearCard;
