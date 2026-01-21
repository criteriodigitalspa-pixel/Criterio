import { useState, useRef } from 'react';
import { PROJECT_DATA } from '../data/projectData';
import { BITACORA_MODULES } from '../data/bitacoraData';
import { CheckCircle, AlertTriangle, Star, Telescope, BookOpen, CheckSquare, FileText, Shield, Search, Calendar, ChevronDown, Hash, Clock, AlertOctagon, Flame, EyeOff, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';


export default function ProjectStatus() {
    const [activeTab, setActiveTab] = useState('roadmap'); // 'roadmap' | 'bitacora' | 'tasks'
    const [selectedModule, setSelectedModule] = useState(BITACORA_MODULES[0]);
    const [filterCategory, setFilterCategory] = useState('all');

    const toggleFilter = (category) => {
        setFilterCategory(prev => prev === category ? 'all' : category);
    };

    const isRecencyCheck = (m) => {
        try {
            if (!m?.lastUpdated) return false;
            const months = { 'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11 };
            const parts = m.lastUpdated.split(' ');
            if (parts.length < 3) return false;
            const day = parseInt(parts[0]);
            const month = months[parts[1]];
            const year = parseInt(parts[2]);

            if (day === undefined || month === undefined || year === undefined) return false;

            const date = new Date(year, month, day);
            const now = new Date();
            const diffHours = (now - date) / (1000 * 60 * 60);
            return diffHours <= 48 && diffHours >= 0;
        } catch (e) {
            console.warn("Date parse error for module:", m?.id);
            return false;
        }
    };

    const filteredModules = BITACORA_MODULES.filter(m => {
        if (filterCategory === 'all') return true;
        if (filterCategory === 'recent') return isRecencyCheck(m);
        if (filterCategory === 'core') return ['structure', 'log', 'planning', 'error'].includes(m.category);
        return m.category === filterCategory;
    });

    const renderTabs = () => (
        <div className="flex items-center gap-2 mb-6">
            <button
                onClick={() => setActiveTab('roadmap')}
                className={clsx("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'roadmap' ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}
            >
                <Star className="w-4 h-4" /> Roadmap
            </button>
            <button
                onClick={() => setActiveTab('bitacora')}
                className={clsx("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'bitacora' ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}
            >
                <BookOpen className="w-4 h-4" /> Bitácoras
            </button>
        </div>
    );



    // Stats Calculation
    const stats = {
        total: BITACORA_MODULES.length,
        security: BITACORA_MODULES.filter(m => m.category === 'security').length,
        features: BITACORA_MODULES.filter(m => m.category === 'feature').length, // Kanban, Tickets, Bulk, Printing
        guides: BITACORA_MODULES.filter(m => m.category === 'guide').length, // Migration, Commands
        core: BITACORA_MODULES.filter(m => ['structure', 'log', 'planning', 'error'].includes(m.category)).length, // Architecture, Changelog, Infra, Errors
        improvements: BITACORA_MODULES.filter(m => m.category === 'improvement').length,
        recent: BITACORA_MODULES.filter(m => {
            const months = { 'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11 };
            const parts = m.lastUpdated.split(' ');
            if (parts.length < 3) return false;
            const day = parseInt(parts[0]);
            const month = months[parts[1]] || 0;
            const year = parseInt(parts[2]);
            const date = new Date(year, month, day);
            const now = new Date();
            return (now - date) <= (48 * 60 * 60 * 1000) && (now - date) >= 0;
        }).length
    };

    if (activeTab === 'bitacora') return (
        <div className="h-full flex flex-col p-4">
            <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {renderTabs()}

                {/* 📊 MINI DASHBOARD */}
                <div className="flex flex-wrap gap-2 animate-in slide-in-from-right fade-in duration-700">
                    <button
                        onClick={() => toggleFilter('all')}
                        className={clsx(
                            "border rounded-lg px-3 py-1 flex items-center gap-2 transition-all hover:scale-105 active:scale-95",
                            filterCategory === 'all'
                                ? "bg-gray-700 border-gray-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-900/10"
                                : "bg-gray-800/50 border-gray-700 hover:bg-gray-800"
                        )}
                        title="Ver Todos"
                    >
                        <div className={clsx("w-2 h-2 rounded-full", filterCategory === 'all' ? "bg-white animate-pulse" : "bg-blue-500")}></div>
                        <span className={clsx("text-xs font-bold", filterCategory === 'all' ? "text-white" : "text-gray-400")}>Total: {stats.total}</span>
                    </button>

                    <button
                        onClick={() => toggleFilter('feature')}
                        className={clsx(
                            "border rounded-lg px-3 py-1 flex items-center gap-2 transition-all hover:scale-105 active:scale-95",
                            filterCategory === 'feature'
                                ? "bg-blue-900/40 border-blue-500 ring-2 ring-blue-500/20"
                                : "bg-blue-900/20 border-blue-900/50 hover:bg-blue-900/30"
                        )}
                        title="Filtrar Features"
                    >
                        <CheckSquare className={clsx("w-3 h-3", filterCategory === 'feature' ? "text-blue-300" : "text-blue-500")} />
                        <span className={clsx("text-xs font-bold", filterCategory === 'feature' ? "text-blue-200" : "text-blue-400")}>Features: {stats.features}</span>
                    </button>

                    <button
                        onClick={() => toggleFilter('security')}
                        className={clsx(
                            "border rounded-lg px-3 py-1 flex items-center gap-2 transition-all hover:scale-105 active:scale-95",
                            filterCategory === 'security'
                                ? "bg-red-900/40 border-red-500 ring-2 ring-red-500/20"
                                : "bg-red-900/20 border-red-900/50 hover:bg-red-900/30"
                        )}
                        title="Filtrar Seguridad"
                    >
                        <Shield className={clsx("w-3 h-3", filterCategory === 'security' ? "text-red-300" : "text-red-500")} />
                        <span className={clsx("text-xs font-bold", filterCategory === 'security' ? "text-red-200" : "text-red-400")}>Seguridad: {stats.security}</span>
                    </button>

                    <button
                        onClick={() => toggleFilter('guide')}
                        className={clsx(
                            "border rounded-lg px-3 py-1 flex items-center gap-2 transition-all hover:scale-105 active:scale-95",
                            filterCategory === 'guide'
                                ? "bg-indigo-900/40 border-indigo-500 ring-2 ring-indigo-500/20"
                                : "bg-indigo-900/20 border-indigo-900/50 hover:bg-indigo-900/30"
                        )}
                        title="Filtrar Guías"
                    >
                        <BookOpen className={clsx("w-3 h-3", filterCategory === 'guide' ? "text-indigo-300" : "text-indigo-500")} />
                        <span className={clsx("text-xs font-bold", filterCategory === 'guide' ? "text-indigo-200" : "text-indigo-400")}>Guías: {stats.guides}</span>
                    </button>

                    <button
                        onClick={() => toggleFilter('core')}
                        className={clsx(
                            "border rounded-lg px-3 py-1 flex items-center gap-2 transition-all hover:scale-105 active:scale-95",
                            filterCategory === 'core'
                                ? "bg-slate-700 border-slate-400 ring-2 ring-slate-500/20"
                                : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                        )}
                        title="Filtrar Core & Otros"
                    >
                        <Telescope className={clsx("w-3 h-3", filterCategory === 'core' ? "text-slate-200" : "text-slate-400")} />
                        <span className={clsx("text-xs font-bold", filterCategory === 'core' ? "text-slate-100" : "text-slate-300")}>Core & Otros: {stats.core}</span>
                    </button>

                    {stats.improvements > 0 && (
                        <button
                            onClick={() => toggleFilter('improvement')}
                            className={clsx(
                                "border rounded-lg px-3 py-1 flex items-center gap-2 transition-all hover:scale-105 active:scale-95",
                                filterCategory === 'improvement'
                                    ? "bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/20"
                                    : "bg-purple-900/20 border-purple-900/50 hover:bg-purple-900/30"
                            )}
                        >
                            <Star className={clsx("w-3 h-3", filterCategory === 'improvement' ? "text-purple-300" : "text-purple-500")} />
                            <span className={clsx("text-xs font-bold", filterCategory === 'improvement' ? "text-purple-200" : "text-purple-400")}>Mejoras: {stats.improvements}</span>
                        </button>
                    )}

                    {stats.recent > 0 && (
                        <button
                            onClick={() => toggleFilter('recent')}
                            className={clsx(
                                "border rounded-lg px-3 py-1 flex items-center gap-2 transition-all hover:scale-105 active:scale-95",
                                filterCategory === 'recent'
                                    ? "bg-green-900/40 border-green-500 ring-2 ring-green-500/20"
                                    : "bg-green-900/20 border-green-900/50 hover:bg-green-900/30 animate-pulse"
                            )}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", filterCategory === 'recent' ? "bg-green-200" : "bg-green-400")}></span>
                                <span className={clsx("relative inline-flex rounded-full h-2 w-2", filterCategory === 'recent' ? "bg-green-200" : "bg-green-500")}></span>
                            </span>
                            <span className={clsx("text-xs font-bold", filterCategory === 'recent' ? "text-green-200" : "text-green-400")}>Nuevas (48h): {stats.recent}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Sidebar of Modules */}
                <div className="w-64 space-y-2 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {filterCategory === 'all' ? 'Todos los Módulos' : `Filtro: ${filterCategory}`}
                        </h3>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{filteredModules.length}</span>
                    </div>

                    {filteredModules.map(mod => (
                        <button
                            key={mod.id}
                            onClick={() => setSelectedModule(mod)}
                            className={clsx(
                                "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3",
                                selectedModule.id === mod.id
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                            )}
                        >
                            <FileText className="w-4 h-4" />
                            <div>
                                <div className="font-bold text-sm">{mod.title}</div>
                                <div className="text-[10px] opacity-70">v{mod.version} • {mod.lastUpdated}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Content Viewer */}
                <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-700 p-8 overflow-y-auto">
                    <article className="prose prose-invert prose-amber max-w-none">
                        <ReactMarkdown>{selectedModule.content}</ReactMarkdown>
                    </article>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-700 pb-5">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Estatus del Proyecto</h1>
                    <p className="text-gray-400 mt-2">Roadmap, Bitácoras y Gestión de Tareas.</p>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Última Actualización</div>
                    <div className="text-xl font-mono text-blue-400">09 Dic 2025</div>
                </div>
            </div>

            {renderTabs()}

            {/* ROADMAP VIEW */}
            <div className="flex-1 overflow-visible">
                <RoadmapView />
            </div>
        </div>
    );
}

// Helper to get relative Week Number from start date (Approx)
const getWeekNumber = (dateStr) => {
    const start = new Date('2025-12-01'); // Project Start Approx
    const current = new Date(dateStr);
    const diffTime = Math.abs(current - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
}

function RoadmapView() {
    const [expandedItems, setExpandedItems] = useState({});
    const [filterText, setFilterText] = useState('');
    const [filterMonth, setFilterMonth] = useState('all');
    const [showDone, setShowDone] = useState(false); // Default hidden ("filtrados por defecto")
    const [highlightedId, setHighlightedId] = useState(null);
    const [currentUrgentIndex, setCurrentUrgentIndex] = useState(-1);

    // Refs for scrolling
    const itemRefs = useRef({});

    // 1. Prepare Data
    let allEvents = [
        ...PROJECT_DATA.done.map(i => ({ ...i, status: 'done', type: 'Hitu', icon: CheckCircle })),
        ...PROJECT_DATA.urgent.map(i => ({ ...i, status: 'pending', type: 'Urgente', icon: AlertOctagon })),
        ...PROJECT_DATA.important.map(i => ({ ...i, status: 'pending', type: 'Próximo', icon: Clock })),
        ...PROJECT_DATA.vision.map(i => ({ ...i, status: 'future', type: 'Visión', icon: Telescope }))
    ];

    // 2. Filter Data
    if (!showDone) {
        allEvents = allEvents.filter(e => e.status !== 'done');
    }

    if (filterText) {
        const lower = filterText.toLowerCase();
        allEvents = allEvents.filter(e =>
            e.title.toLowerCase().includes(lower) ||
            e.desc.toLowerCase().includes(lower) ||
            (e.details && e.details.toLowerCase().includes(lower)) ||
            e.id.toLowerCase().includes(lower)
        );
    }
    if (filterMonth !== 'all') {
        allEvents = allEvents.filter(e => e.date.includes(filterMonth));
    }

    // 3. Sort Data ALWAYS BY DATE
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Handle "Next Urgent" Navigation
    const handleNextUrgent = () => {
        // Find visible urgent items sorted by date
        const urgentItems = allEvents.filter(e => e.type === 'Urgente');
        if (urgentItems.length === 0) return;

        let nextIndex = currentUrgentIndex + 1;
        if (nextIndex >= urgentItems.length) {
            nextIndex = 0; // Loop back to start
        }

        const targetItem = urgentItems[nextIndex];
        setCurrentUrgentIndex(nextIndex);
        setHighlightedId(targetItem.id);

        // Scroll to item
        if (itemRefs.current[targetItem.id]) {
            itemRefs.current[targetItem.id].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Remove highlight after 2 seconds
        setTimeout(() => {
            setHighlightedId(null);
        }, 2000);
    };

    const toggleItem = (id) => {
        setExpandedItems(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // Chunk into rows of 4 for Desktop
    const ITEMS_PER_ROW = 4;
    const rows = [];
    for (let i = 0; i < allEvents.length; i += ITEMS_PER_ROW) {
        rows.push(allEvents.slice(i, i + ITEMS_PER_ROW));
    }

    return (
        <div className="space-y-6">
            {/* Controls Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm relative z-50">

                {/* Search & Month Filter Group */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/50 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar en el roadmap..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-gray-600 transition-all font-medium"
                        />
                    </div>

                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/50 w-5 h-5" />
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-12 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer hover:bg-black/60 transition-colors min-w-[180px] font-medium"
                        >
                            <option value="all">Todo el Periodo</option>
                            <option value="2025-12">Dic 2025</option>
                            <option value="2026-01">Ene 2026</option>
                            <option value="2026-02">Feb 2026</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    </div>
                </div>

                {/* Actions Group: Show Completed & Next Urgent */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowDone(!showDone)}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all font-medium",
                            showDone
                                ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                                : "bg-zinc-800 border-zinc-700 text-gray-400 hover:bg-zinc-700 hover:text-gray-200"
                        )}
                        title={showDone ? "Ocultar Completados" : "Mostrar Completados"}
                    >
                        {showDone ? <CheckCircle className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        <span className="hidden sm:inline">{showDone ? "Completados Visibles" : "Ver Completados"}</span>
                    </button>

                    <button
                        onClick={handleNextUrgent}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-wide"
                    >
                        <AlertTriangle className="w-5 h-5" />
                        Siguiente Urgente
                    </button>
                </div>
            </div>

            <div className="relative">
                {/* Lines background only visible on desktop */}
                <div className="absolute inset-0 pointer-events-none hidden md:block">
                    {/* Can place background decorations here if needed */}
                </div>

                {/* MOBILE VIEW (Vertical Stack) */}
                <div className="md:hidden space-y-8 relative pl-6 border-l-2 border-dashed border-gray-800">
                    {allEvents.map((item, idx) => {
                        const isDone = item.status === 'done';
                        const isExpanded = expandedItems[item.id];
                        return (
                            <div key={item.id} ref={el => itemRefs.current[item.id] = el} className="relative pl-8 pb-8 border-l border-white/10 last:border-0 last:pb-0">
                                <div className={clsx(
                                    "absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 z-10 shadow-[0_0_10px_currentColor]",
                                    isDone ? "bg-green-950 border-green-500 text-green-500" : "bg-gray-950 border-gray-600 text-gray-400"
                                )}></div>

                                <div className={clsx(
                                    "bg-white/5 p-5 rounded-2xl border border-white/5 backdrop-blur-sm relative transition-all active:scale-[0.98]",
                                    highlightedId === item.id && "ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] bg-red-500/10"
                                )}>
                                    <div className="absolute top-3 right-3 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 backdrop-blur-md">
                                        <span className="font-mono text-[10px] text-gray-400">#{item.id}</span>
                                    </div>

                                    <div className="flex justify-between items-start mb-2 pr-10">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">{item.type} • {item.date}</span>
                                            <h3 className="font-bold text-gray-200 text-lg">{item.title}</h3>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-3 font-light leading-relaxed">{item.desc}</p>
                                    {item.details && (
                                        <button onClick={() => toggleItem(item.id)} className="text-xs text-cyan-400 font-bold uppercase tracking-wider bg-cyan-950/30 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                                            {isExpanded ? 'Menos info' : 'Más info'}
                                        </button>
                                    )}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-300">
                                            {item.details}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* DESKTOP VIEW (Serpentine Grid) */}
                <div className="hidden md:flex flex-col gap-12 relative pb-40">
                    {rows.length === 0 && (
                        <div className="text-center text-gray-500 py-24 italic bg-white/5 rounded-3xl border border-white/5 border-dashed backdrop-blur-sm">No se encontraron resultados para los filtros seleccionados.</div>
                    )}

                    {rows.map((rowItems, rowIndex) => {
                        // Even rows (0, 2): Left to Right
                        // Odd rows (1, 3): Right to Left
                        const isLTR = rowIndex % 2 === 0;

                        return (
                            <div key={rowIndex} className="relative h-64 flex items-center">

                                {/* The Grid Row */}
                                <div className="w-full grid grid-cols-4 gap-8"
                                    style={{ direction: isLTR ? 'ltr' : 'rtl' }}
                                >
                                    {rowItems.map((item, colIndex) => {
                                        const isLastInRow = colIndex === rowItems.length - 1;
                                        const isAbsoluteLast = (rowIndex === rows.length - 1) && isLastInRow;
                                        const isDone = item.status === 'done';
                                        const isUrgent = item.type === 'Urgente';
                                        const isExpanded = expandedItems[item.id];
                                        const isHighlighted = highlightedId === item.id;

                                        return (
                                            <div key={item.id} ref={el => itemRefs.current[item.id] = el} className="flex-1 min-w-0 relative group perspective-1000" style={{ direction: 'ltr' }}>
                                                {/* Reset direction for card content */}

                                                {/* Connector to Next Sibling (Horizontal) */}
                                                {!isLastInRow && (
                                                    <div className={clsx(
                                                        "absolute top-1/2 -translate-y-1/2 h-0.5 z-0 transition-all duration-700",
                                                        isLTR
                                                            ? "-right-12 w-28 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
                                                            : "-left-12 w-28 bg-gradient-to-l from-transparent via-cyan-500/50 to-transparent"
                                                    )}>
                                                        <div className={clsx(
                                                            "absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]",
                                                            isLTR ? "right-6 animate-pulse" : "left-6 animate-pulse"
                                                        )}></div>
                                                    </div>
                                                )}

                                                {/* Connector to Next Row (Vertical Curve) */}
                                                {isLastInRow && !isAbsoluteLast && (
                                                    <div className={clsx(
                                                        "absolute top-1/2 w-28 h-52 border-cyan-500/20 -z-10 shadow-[0_0_15px_rgba(6,182,212,0.1)]",
                                                        isLTR
                                                            ? "-right-[4.5rem] border-r-2 border-b-2 rounded-br-[5rem] rounded-tr-none"
                                                            : "-left-[4.5rem] border-l-2 border-b-2 rounded-bl-[5rem] rounded-tl-none"
                                                    )}>
                                                    </div>
                                                )}

                                                {/* CARD DESIGN */}
                                                <div className={clsx(
                                                    "relative p-6 rounded-[2rem] border transition-all duration-500 ease-out h-full flex flex-col backdrop-blur-md group-hover:-translate-y-2 group-hover:scale-[1.02]",
                                                    isDone ? "bg-gradient-to-br from-gray-900/90 to-black/90 border-green-500/20 shadow-[0_4px_20px_rgba(34,197,94,0.1)]" :
                                                        isUrgent ? "bg-gradient-to-br from-gray-900/90 to-black/90 border-red-500/20 shadow-[0_4px_20px_rgba(239,68,68,0.1)] group-hover:border-red-500/40" :
                                                            "bg-gradient-to-br from-gray-900/80 to-black/80 border-white/5 hover:border-cyan-500/30 shadow-2xl group-hover:shadow-cyan-900/20",
                                                    isHighlighted && "ring-4 ring-white shadow-[0_0_50px_rgba(255,255,255,0.4)] z-50 scale-105"
                                                )}>
                                                    {/* ID Badge */}
                                                    <div className="absolute top-5 right-5 z-20 layer-blur">
                                                        <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-full px-2.5 py-1 shadow-inner backdrop-blur-md">
                                                            <Hash className="w-3 h-3 text-gray-500" />
                                                            <span className="font-mono text-[10px] font-bold text-gray-300 tracking-wider transition-colors group-hover:text-white">{item.id}</span>
                                                        </div>
                                                    </div>

                                                    {/* Status Dot */}
                                                    <div className={clsx(
                                                        "absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-lg z-20 flex items-center gap-2 backdrop-blur-xl",
                                                        isDone ? "bg-green-950/90 border-green-500/50 text-green-400 shadow-green-900/20" :
                                                            isUrgent ? "bg-red-950/90 border-red-500/50 text-red-400 shadow-red-900/20 animate-pulse" :
                                                                "bg-gray-950/90 border-cyan-500/30 text-cyan-400 shadow-cyan-900/20 group-hover:border-cyan-400/50"
                                                    )}>
                                                        {isDone ? <CheckCircle className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />}
                                                        {item.type}
                                                    </div>

                                                    <div className="mt-4 mb-3 pr-12">
                                                        <span className="font-mono text-[10px] font-bold text-gray-500 block mb-1 tracking-widest uppercase">{item.date}</span>
                                                        <h3 className={clsx(
                                                            "font-bold text-lg leading-snug tracking-tight transition-colors",
                                                            isDone ? "text-gray-500 line-through decoration-green-500/30" : "text-white group-hover:text-cyan-100"
                                                        )}>{item.title}</h3>
                                                    </div>

                                                    <p className="text-sm text-gray-400 leading-relaxed flex-1 font-light border-t border-white/5 pt-3 mt-1 line-clamp-3">{item.desc}</p>

                                                    {item.details && (
                                                        <button onClick={() => toggleItem(item.id)} className="mt-4 self-start text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-2 group/btn">
                                                            <div className={clsx(
                                                                "w-6 h-6 rounded-full flex items-center justify-center border border-white/10 bg-white/5 transition-all group-hover/btn:border-cyan-500/30 group-hover/btn:bg-cyan-500/10",
                                                                isExpanded && "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                                                            )}>
                                                                <FileText className="w-3 h-3" />
                                                            </div>
                                                            {isExpanded ? 'Ocultar' : 'Detalles'}
                                                        </button>
                                                    )}

                                                    {isExpanded && item.details && (
                                                        <div className="absolute top-full left-0 right-0 mt-3 p-5 bg-[#050510]/95 rounded-2xl border border-white/10 z-50 text-xs text-gray-300 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 fade-in backdrop-blur-xl">
                                                            <div className="prose prose-invert prose-xs max-w-none">
                                                                {item.details}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
