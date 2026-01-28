
import React, { useMemo } from 'react';
import { Network, Fingerprint, Star, Clock, Activity } from 'lucide-react';

export default function TraitTimeline({ data }) {

    // Process Data: Traits Matrix
    const { years, traitsMap, sortedTraits } = useMemo(() => {
        if (!data || data.length === 0) return { years: [], traitsMap: {}, sortedTraits: [] };

        const validYears = data.map(d => d.year).filter(y => y);
        if (validYears.length === 0) return { years: [], traitsMap: {}, sortedTraits: [] };

        const minYear = Math.min(...validYears);
        const maxYear = Math.max(...validYears);
        const years = [];
        for (let y = minYear; y <= maxYear; y++) years.push(y);
        const traitsMap = {}; // { "trait_id": { firstYear, lastYear, years: Set() } }

        data.forEach(d => {
            const rawTraits = d.raw.psyche?.traits || [];
            rawTraits.forEach(tRaw => {
                // Handle different formats (string vs object)
                let label = typeof tRaw === 'string' ? tRaw.split(':')[0].trim() : (tRaw.label || tRaw.id || "Unknown");
                if (!label) label = "Unknown";
                // Simple ID normalization
                const id = label.toLowerCase();

                if (!traitsMap[id]) {
                    traitsMap[id] = {
                        id,
                        label,
                        years: new Set(),
                        firstYear: d.year,
                        lastYear: d.year
                    };
                }
                traitsMap[id].years.add(d.year);
                traitsMap[id].lastYear = d.year; // Update last seen
            });
        });

        // Convert to array and sort
        // Sorting Logic: 
        // 1. Persistency (More years = higher)
        // 2. Recency (Last seen 2026 > 2018)
        const sortedTraits = Object.values(traitsMap).sort((a, b) => {
            const rangeA = (a.lastYear - a.firstYear) + 1; // poorly approximated range span if contiguous
            const countA = a.years.size;

            const rangeB = (b.lastYear - b.firstYear) + 1;
            const countB = b.years.size;

            if (a.lastYear !== b.lastYear) return b.lastYear - a.lastYear; // Most recent first
            return countB - countA; // Most persistent second
        });

        return { years, traitsMap, sortedTraits };
    }, [data]);

    if (!data || data.length === 0) return <div className="p-8 text-gray-500">Cargando línea de tiempo...</div>;

    return (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-full max-h-[600px]">
            {/* HEADER */}
            <div className="bg-gray-950 p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
                <h3 className="font-bold flex items-center gap-2 text-white">
                    <Activity className="w-5 h-5 text-blue-500" /> Evolución Psicológica (Timeline)
                </h3>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Estrés</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Profesionalismo</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div> Felicidad</div>
                </div>
            </div>

            {/* SECTION 1: MACRO METRICS (Charts) */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/30">
                <div className="flex h-32 relative">
                    {/* Y-Axis Labels */}
                    <div className="w-8 flex flex-col justify-between text-[10px] text-gray-600 py-1 border-r border-gray-800 mr-2">
                        <span>100%</span>
                        <span>50%</span>
                        <span>0%</span>
                    </div>

                    {/* Charts Area */}
                    <div className="flex-1 relative flex items-end">
                        {years.map((year, i) => {
                            const d = data.find(item => item.year === year);
                            // Safe access or interpolation could go here, for now using raw or 0
                            const stress = d?.metrics?.stress || 0;
                            const prof = d?.metrics?.professionalism || 0;
                            const happy = d?.metrics?.happiness || 0;

                            return (
                                <div key={year} className="flex-1 flex flex-col justify-end items-center gap-1 h-full hover:bg-white/5 transition-colors relative group">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 bg-black border border-gray-700 p-2 rounded text-xs hidden group-hover:block z-20 whitespace-nowrap shadow-xl">
                                        <div className="font-bold mb-1">{year}</div>
                                        <div className="text-red-400">Estrés: {stress}%</div>
                                        <div className="text-blue-400">Prof: {prof}%</div>
                                        <div className="text-yellow-400">Feliz: {happy}%</div>
                                    </div>

                                    {/* Bars (Stacked or Grouped? Let's use simple dots/lines concept simplified as thin bars for now) */}
                                    <div className="w-1.5 bg-red-500/80 rounded-t" style={{ height: `${stress}%` }}></div>
                                    <div className="w-1.5 bg-blue-500/80 rounded-t" style={{ height: `${prof}%` }}></div>
                                    <div className="w-1.5 bg-yellow-500/80 rounded-t" style={{ height: `${happy}%` }}></div>

                                    {/* Year Label */}
                                    <div className="absolute -bottom-6 text-[10px] text-gray-500">{year}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-gray-950 px-4 py-2 border-b border-gray-800 text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                <Fingerprint className="w-3 h-3" /> Matriz de Rasgos
            </div>

            {/* BODY (SCROLLABLE) */}
            <div className="overflow-auto custom-scrollbar flex-1 relative">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-950 z-10 shadow-lg">
                        <tr>
                            <th className="p-4 w-1/3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800">Rasgo</th>
                            {years.map(y => (
                                <th key={y} className="p-4 text-center text-xs font-bold text-gray-400 border-b border-gray-800 min-w-[60px]">{y}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {sortedTraits.map(trait => {
                            const isStillActive = trait.lastYear === years[years.length - 1];
                            const isOneOff = trait.years.size === 1;

                            return (
                                <tr key={trait.id} className="hover:bg-gray-800/30 transition-colors group">
                                    {/* Trait Label */}
                                    <td className="p-3 pl-4 border-r border-gray-800/50">
                                        <div className={`font-medium text-sm flex items-center gap-2 ${isStillActive ? 'text-white' : 'text-gray-500 italic'}`}>
                                            {trait.label}
                                            {isStillActive && <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Activo actualmente"></div>}
                                        </div>
                                        <div className="text-[10px] text-gray-600 mt-0.5">
                                            {trait.years.size} años • {trait.firstYear}-{trait.lastYear}
                                        </div>
                                    </td>

                                    {/* Years Grid */}
                                    {years.map(year => {
                                        const isActive = trait.years.has(year);
                                        const isFirst = year === trait.firstYear;
                                        const isLast = year === trait.lastYear;

                                        // "Connector" logic: if it was active before AND active after, draw a line through? 
                                        // For now, simple Boolean cells are cleaner for a "Matrix" view.

                                        return (
                                            <td key={year} className="p-0 relative h-12">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    {/* Background Track (if within range) */}
                                                    {year >= trait.firstYear && year <= trait.lastYear && (
                                                        <div className={`h-1 w-full absolute ${isActive ? 'bg-blue-900/30' : 'bg-gray-800/30 border-t border-dashed border-gray-700'}`}></div>
                                                    )}

                                                    {/* Dot */}
                                                    {isActive && (
                                                        <div className={`relative z-10 w-4 h-4 rounded-full flex items-center justify-center transition-transform hover:scale-125 ${isFirst ? 'bg-yellow-500 shadow-lg shadow-yellow-500/20' :
                                                            isLast && isStillActive ? 'bg-green-500 shadow-lg shadow-green-500/20' :
                                                                'bg-blue-600'
                                                            }`}>
                                                            {isFirst && !isOneOff && <Star className="w-2 h-2 text-black fill-current" />}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
