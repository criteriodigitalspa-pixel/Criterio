
import React, { useState, useMemo } from 'react';
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

export default function ComparisonView({ data }) {
    // Default to first and last available years
    const [yearA, setYearA] = useState(data[0]?.year || '2018');
    const [yearB, setYearB] = useState(data[data.length - 1]?.year || '2026');

    const profileA = useMemo(() => data.find(d => d.year === yearA), [data, yearA]);
    const profileB = useMemo(() => data.find(d => d.year === yearB), [data, yearB]);

    if (!profileA || !profileB) return <div className="p-10 text-center text-gray-500">Cargando datos para comparar...</div>;

    // --- LOGIC: DELTAS ---
    const getDelta = (valA, valB) => {
        const diff = valB - valA;
        return {
            val: diff,
            percent: valA === 0 ? 0 : Math.round((diff / valA) * 100),
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
        };
    };

    // --- LOGIC: TRAITS LOST/GAINED ---
    // Handle both string arrays and object arrays { id, label }
    const getTraits = (p) => {
        if (!p.raw.psyche?.traits) return [];
        return p.raw.psyche.traits.map(t => typeof t === 'string' ? t.split(':')[0] : t.label || t.id);
    };

    const traitsA = getTraits(profileA);
    const traitsB = getTraits(profileB);

    const lostTraits = traitsA.filter(t => !traitsB.includes(t));
    const gainedTraits = traitsB.filter(t => !traitsA.includes(t));
    const keptTraits = traitsA.filter(t => traitsB.includes(t));

    // --- LOGIC: VOCABULARY SHIFT ---
    const wordsA = profileA.raw.stats?.topWords || [];
    const wordsB = profileB.raw.stats?.topWords || [];

    // Words unique to A (stopped using)
    const forgottenWords = wordsA.filter(w => !wordsB.includes(w)).slice(0, 15);
    // Words unique to B (started using)
    const newWords = wordsB.filter(w => !wordsA.includes(w)).slice(0, 15);

    return (
        <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto p-4 animate-in fade-in duration-500">

            {/* HERDER SELECTORS */}
            <div className="flex items-center justify-between bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                <div className="flex items-center gap-4">
                    <select
                        value={yearA} onChange={e => setYearA(e.target.value)}
                        className="bg-gray-950 text-2xl font-bold text-blue-400 border border-blue-900/30 rounded-lg px-4 py-2 focus:ring-2 ring-blue-500 outline-none"
                    >
                        {data.map(d => <option key={d.year} value={d.year}>{d.year}</option>)}
                    </select>
                    <div className="text-gray-600">
                        <ArrowRight className="w-8 h-8" />
                    </div>
                    <select
                        value={yearB} onChange={e => setYearB(e.target.value)}
                        className="bg-gray-950 text-2xl font-bold text-purple-400 border border-purple-900/30 rounded-lg px-4 py-2 focus:ring-2 ring-purple-500 outline-none"
                    >
                        {data.map(d => <option key={d.year} value={d.year}>{d.year}</option>)}
                    </select>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-400 uppercase font-bold tracking-widest">Evolución de Personalidad</div>
                    <div className="text-xs text-gray-500">Comparando dos puntos en el tiempo</div>
                </div>
            </div>

            {/* METRIC DELTAS */}
            <div className="grid grid-cols-4 gap-4">
                <MetricCard label="Nivel de Estrés" a={profileA.metrics.stress} b={profileB.metrics.stress} color="red" />
                <MetricCard label="Profesionalismo" a={profileA.metrics.professionalism} b={profileB.metrics.professionalism} color="blue" />
                <MetricCard label="Felicidad" a={profileA.metrics.happiness} b={profileB.metrics.happiness} color="yellow" />
                <MetricCard label="Msgs Enviados" a={profileA.raw.stats?.myMsgs || 0} b={profileB.raw.stats?.myMsgs || 0} color="gray" isRaw={true} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">

                {/* COL 1: TRAIT EVOLUTION */}
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="text-xl font-bold border-b border-gray-800 pb-2 flex items-center gap-2">
                        <TrendingUp className="text-blue-500" /> Rasgos de Personalidad
                    </h3>

                    {/* GAINED */}
                    <div className="bg-gradient-to-br from-green-900/10 to-transparent p-4 rounded-xl border border-green-900/30">
                        <div className="text-xs uppercase font-bold text-green-500 mb-3 flex items-center justify-between">
                            <span>Adquiridos en {yearB}</span>
                            <span className="bg-green-900/50 px-2 py-0.5 rounded text-[10px] text-green-300">+{gainedTraits.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {gainedTraits.length > 0 ? gainedTraits.map(t => (
                                <span key={t} className="px-2 py-1 bg-green-900/20 text-green-300 border border-green-800/50 rounded text-xs font-medium">
                                    + {t}
                                </span>
                            )) : <span className="text-gray-600 text-xs italic">Sin rasgos nuevos significativos.</span>}
                        </div>
                    </div>

                    {/* LOST (Now LATENT) */}
                    <div className="bg-gradient-to-br from-gray-900/10 to-transparent p-4 rounded-xl border border-gray-800 border-dashed">
                        <div className="text-xs uppercase font-bold text-gray-500 mb-3 flex items-center justify-between">
                            <span>Latentes / No Observados ({yearA})</span>
                            <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] text-gray-400">-{lostTraits.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {lostTraits.length > 0 ? lostTraits.map(t => (
                                <span key={t} className="px-2 py-1 bg-gray-900 text-gray-500 border border-gray-800 rounded text-xs font-medium opacity-70 hover:opacity-100 transition-opacity cursor-help" title={`Este rasgo estaba presente en ${yearA} pero no fue detectado como dominante en ${yearB}. No necesariamente desapareció, pero perdió protagonismo.`}>
                                    {t}
                                </span>
                            )) : <span className="text-gray-600 text-xs italic">Nada dejado atrás. Identidad estable.</span>}
                        </div>
                    </div>

                    {/* KEPT */}
                    <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                        <div className="text-xs uppercase font-bold text-gray-500 mb-3">Núcleo Permanente (Persiste)</div>
                        <div className="flex flex-wrap gap-2">
                            {keptTraits.map(t => (
                                <span key={t} className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* COL 2: LINGUISTIC DRIFT */}
                <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="text-xl font-bold border-b border-gray-800 pb-2 flex items-center gap-2">
                        <RefreshCcw className="text-purple-500" /> Cambio Lingüístico
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        {/* OLD SLANG */}
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-gray-500 text-center uppercase tracking-wider">Vocabulario {yearA}</div>
                            <div className="flex flex-col gap-1">
                                {forgottenWords.map(w => (
                                    <div key={w} className="bg-gray-900/50 px-3 py-2 rounded text-gray-500 text-sm border-l-2 border-gray-700 flex justify-between group hover:bg-gray-800 transition-colors">
                                        <span className="group-hover:line-through decoration-gray-600">{w}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ARROW CENTER */}
                        {/* <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-800">
                            <ArrowRight />
                        </div> */}

                        {/* NEW SLANG */}
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-purple-400 text-center uppercase tracking-wider">Vocabulario {yearB}</div>
                            <div className="flex flex-col gap-1">
                                {newWords.map(w => (
                                    <div key={w} className="bg-purple-900/10 px-3 py-2 rounded text-purple-200 text-sm border-l-2 border-purple-500 font-medium">
                                        {w}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}

// Subcomponent for Metric Cards
function MetricCard({ label, a, b, color, isRaw }) {
    const diff = b - a;
    const isUp = diff > 0;
    const isFlat = diff === 0;

    const displayA = isRaw ? a.toLocaleString() : `${a}%`;
    const displayB = isRaw ? b.toLocaleString() : `${b}%`;
    const diffDisplay = isRaw ? Math.abs(diff).toLocaleString() : `${Math.abs(diff)}%`;

    const colorClasses = {
        red: 'text-red-400',
        blue: 'text-blue-400',
        yellow: 'text-yellow-400',
        gray: 'text-gray-400'
    };

    // Determine Color based on "Good" direction might be tricky (more stress is bad), 
    // but for now we color code by category identity
    const mainColor = colorClasses[color] || 'text-white';

    return (
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex flex-col justify-between h-28">
            <div className="text-xs text-gray-500 font-bold uppercase">{label}</div>
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-xs text-gray-600 mb-1">{displayA} →</div>
                    <div className={`text-2xl font-bold ${mainColor}`}>{displayB}</div>
                </div>
                {!isFlat && (
                    <div className={`flex items-center text-xs font-bold ${isUp ? 'text-green-500' : 'text-red-400'} bg-gray-950 px-2 py-1 rounded`}>
                        {isUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {diffDisplay}
                    </div>
                )}
                {isFlat && <div className="text-gray-700"><Minus className="w-4 h-4" /></div>}
            </div>
        </div>
    );
}
