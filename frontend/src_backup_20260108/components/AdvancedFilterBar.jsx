import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Cpu, HardDrive, LayoutGrid, Monitor, ChevronDown, Check, SlidersHorizontal, Trash2, Layers, FileText } from 'lucide-react';
import clsx from 'clsx';

export default function AdvancedFilterBar({
    filters,
    totalTickets,
    visibleTickets,
    allTickets,
    title,     // [NEW] Logo/Title Component
    selectionActions, // [NEW] Visible Actions
    viewActions       // [NEW] Popover Actions
}) {
    const {
        searchTerm, setSearchTerm,
        hardwareFilters = {}, setHardwareFilters = () => { },
        quickFilters = [], setQuickFilters,
        batchIdFilter, setBatchIdFilter,
        showFacturaOnly, setShowFacturaOnly // [NEW]
    } = filters || {};

    const [isExpanded, setIsExpanded] = useState(false);
    const popoverRef = useRef(null);

    // Close popover when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        }
        if (isExpanded) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isExpanded]);

    // Dynamic Options Extraction (Data Studio Style)
    const facets = useMemo(() => {
        const options = {
            cpu: new Set(),
            ram: new Set(),
            disk: new Set(),
            brand: new Set(),
            cpuGen: new Set()
        };

        if (!allTickets || allTickets.length === 0) return { cpu: [], ram: [], disk: [], brand: [], cpuGen: [] };

        allTickets.forEach(t => {
            const info = t.additionalInfo || {};
            const tRam = t.ram || {};
            const tDisk = t.disco || {};

            // Brand
            if (t.marca) options.brand.add(t.marca);
            else options.brand.add("Sin Marca");

            // CPU Extraction
            const cpuStr = `${info.cpuBrand || ''} ${info.cpuModel || ''} ${info.cpuGen || ''}`.toLowerCase();
            if (cpuStr.includes('i3')) options.cpu.add('i3');
            else if (cpuStr.includes('i5')) options.cpu.add('i5');
            else if (cpuStr.includes('i7')) options.cpu.add('i7');
            else if (cpuStr.includes('i9')) options.cpu.add('i9');
            else if (cpuStr.includes('ryzen 3')) options.cpu.add('Ryzen 3');
            else if (cpuStr.includes('ryzen 5')) options.cpu.add('Ryzen 5');
            else if (cpuStr.includes('ryzen 7')) options.cpu.add('Ryzen 7');
            else if (cpuStr.includes('celeron')) options.cpu.add('Celeron');
            else if (cpuStr.includes('pentium')) options.cpu.add('Pentium');
            else if (info.cpuModel) options.cpu.add(info.cpuModel.split(' ')[0]);

            // CPU Gen
            if (info.cpuGen) options.cpuGen.add(info.cpuGen);

            // RAM Extraction
            const checkRam = (str) => {
                if (!str) return;
                const s = str.toString().toUpperCase();
                if (s.includes('4')) options.ram.add('4GB');
                if (s.includes('8')) options.ram.add('8GB');
                if (s.includes('12')) options.ram.add('12GB');
                if (s.includes('16')) options.ram.add('16GB');
                if (s.includes('20')) options.ram.add('20GB');
                if (s.includes('32')) options.ram.add('32GB');
                if (s.includes('64')) options.ram.add('64GB');
            };
            if (tRam.total) checkRam(tRam.total);
            if (tRam.detalles && Array.isArray(tRam.detalles)) tRam.detalles.forEach(checkRam);

            // Disk Extraction
            const checkDisk = (str) => {
                if (!str) return;
                const s = str.toString().toUpperCase();
                if (s.includes('SSD')) options.disk.add('SSD');
                if (s.includes('HDD')) options.disk.add('HDD');
                if (s.includes('NVME')) options.disk.add('NVMe');
                if (s.includes('M.2')) options.disk.add('M.2');
                if (s.includes('120') || s.includes('128')) options.disk.add('128GB');
                if (s.includes('240') || s.includes('250') || s.includes('256')) options.disk.add('256GB');
                if (s.includes('480') || s.includes('500') || s.includes('512')) options.disk.add('512GB');
                if (s.includes('1T') || s.includes('1000')) options.disk.add('1TB');
            };
            if (tDisk.detalles && Array.isArray(tDisk.detalles)) tDisk.detalles.forEach(checkDisk);
        });

        const sizeSorter = (a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        };

        return {
            cpu: Array.from(options.cpu).filter(Boolean).sort(),
            ram: Array.from(options.ram).filter(Boolean).sort(sizeSorter),
            disk: Array.from(options.disk).filter(Boolean).sort(sizeSorter),
            brand: Array.from(options.brand).filter(Boolean).sort(),
            cpuGen: Array.from(options.cpuGen).filter(Boolean).sort(sizeSorter)
        };
    }, [allTickets]);

    const toggleHardwareFilter = (type, value) => {
        setHardwareFilters(prev => {
            if (prev[type] === value) return { ...prev, [type]: '' };
            return { ...prev, [type]: value };
        });
    };

    const clearAll = () => {
        setSearchTerm('');
        setHardwareFilters({ cpu: '', ram: '', disk: '', brand: '', cpuGen: '', integrated: '' });
        setQuickFilters([]);
        if (setBatchIdFilter) setBatchIdFilter(''); // Clear Batch
        setIsExpanded(false);
    };

    const activeFilterCount = Object.values(hardwareFilters).filter(Boolean).length;
    const hasFilters = searchTerm || activeFilterCount > 0 || quickFilters.length > 0 || batchIdFilter;

    const Chip = ({ label, active, onClick }) => (
        <button
            onClick={onClick}
            className={clsx(
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border flex items-center gap-1 shrink-0",
                active
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
            )}
        >
            {label}
            {active && <Check className="w-3 h-3" />}
        </button>
    );

    return (
        <div className="bg-[#0f172a] border-b border-gray-800 sticky top-0 z-50 shadow-lg h-14 flex items-center relative">
            <div className="w-full px-4 flex items-center gap-4 max-w-[2600px] mx-auto">

                {/* 1. BRAND / TITLE */}
                {title && <div className="shrink-0">{title}</div>}

                {/* 2. GLOBAL SEARCH (Compact) */}
                <div className="relative group w-48 xl:w-64 shrink-0">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full bg-gray-900 text-sm text-gray-200 pl-9 pr-6 py-1.5 rounded-lg border border-gray-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* 2b. BATCH ID INPUT (NEW) */}
                <div className="relative group w-24 xl:w-32 shrink-0">
                    <Layers className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                    <input
                        type="text"
                        value={batchIdFilter || ''}
                        onChange={(e) => setBatchIdFilter && setBatchIdFilter(e.target.value)}
                        placeholder="Lote..."
                        className="w-full bg-gray-900 text-sm text-gray-200 pl-9 pr-2 py-1.5 rounded-lg border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                    />
                    {batchIdFilter && (
                        <button onClick={() => setBatchIdFilter('')} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* 3. SPACER (Replaces Chips) */}
                <div className="flex-1"></div>

                {/* 4. METRICS & ACTIONS (Right) */}
                <div className="flex items-center gap-3 shrink-0 ml-auto border-l border-gray-800 pl-4">
                    {/* Counter */}
                    <div className="flex items-baseline gap-1 mr-2 invisible lg:visible w-0 lg:w-auto overflow-hidden">
                        <span className={clsx("text-sm font-black font-mono", hasFilters ? "text-cyan-400" : "text-gray-300")}>
                            {visibleTickets}
                        </span>
                        <span className="text-[10px] text-gray-600">/ {totalTickets}</span>
                    </div>

                    {/* SELECTION Button (Always Visible) */}
                    {selectionActions}

                    <div className="w-px h-5 bg-gray-800 mx-1"></div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shrink-0",
                            isExpanded || activeFilterCount > 0
                                ? "bg-cyan-900/40 text-cyan-400 border border-cyan-500/30"
                                : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
                        )}
                        title="Opciones de Vista y Filtros"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">Opciones</span>
                        {activeFilterCount > 0 && <span className="bg-cyan-500 text-[#0f172a] text-[9px] px-1 rounded-full">{activeFilterCount}</span>}
                        <ChevronDown className={clsx("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                    </button>

                    {hasFilters && (
                        <button onClick={clearAll} className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg" title="Limpiar">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* FLOATING POPOVER PANEL */}
            {isExpanded && (
                <div
                    ref={popoverRef}
                    className="absolute top-[110%] right-4 w-[800px] bg-[#1e293b]/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl p-5 z-[100] animate-in fade-in zoom-in-95 origin-top-right ring-1 ring-black/50 overflow-visible"
                >
                    {/* ACTIONS HEADER */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700/50">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Herramientas de Vista</span>
                        <div className="flex items-center gap-2">
                            {/* Injected Actions (Moved Here) */}
                            {viewActions}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6">
                        {/* CPU */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-wider">
                                <Cpu className="w-3.5 h-3.5" /> Procesador
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {facets.cpu.map(opt => (
                                    <Chip key={opt} label={opt} active={hardwareFilters.cpu === opt} onClick={() => toggleHardwareFilter('cpu', opt)} />
                                ))}
                            </div>
                        </div>

                        {/* RAM */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-wider">
                                <LayoutGrid className="w-3.5 h-3.5" /> Memoria RAM
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {facets.ram.map(opt => (
                                    <Chip key={opt} label={opt} active={hardwareFilters.ram === opt} onClick={() => toggleHardwareFilter('ram', opt)} />
                                ))}
                            </div>
                        </div>

                        {/* DISK */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 tracking-wider">
                                <HardDrive className="w-3.5 h-3.5" /> Disco
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {facets.disk.map(opt => (
                                    <Chip key={opt} label={opt} active={hardwareFilters.disk === opt} onClick={() => toggleHardwareFilter('disk', opt)} />
                                ))}
                            </div>
                        </div>

                        {/* GPU & GEN */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-1 tracking-wider">
                                    <Cpu className="w-3.5 h-3.5" /> Generación
                                </label>
                                <select
                                    value={hardwareFilters.cpuGen || ''}
                                    onChange={(e) => toggleHardwareFilter('cpuGen', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500"
                                >
                                    <option value="">Todas</option>
                                    {facets.cpuGen.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-1 tracking-wider">
                                    <Monitor className="w-3.5 h-3.5" /> Gráfica
                                </label>
                                <select
                                    value={hardwareFilters.integrated || ''}
                                    onChange={(e) => toggleHardwareFilter('integrated', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500"
                                >
                                    <option value="">Indiferente</option>
                                    <option value="Si">Integrada</option>
                                    <option value="No">Dedicada</option>
                                </select>
                            </div>

                            {/* INVOICE FILTER (Expanded View) */}
                            {setShowFacturaOnly && (
                                <div className="pt-2 border-t border-gray-700 mt-2">
                                    <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer p-1 rounded-lg transition-colors group">
                                        <span className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 group-hover:text-purple-400 transition-colors tracking-wider">
                                            <FileText className="w-3.5 h-3.5" /> Factura
                                        </span>
                                        <div onClick={(e) => { e.preventDefault(); setShowFacturaOnly(!showFacturaOnly); }} className={clsx("w-8 h-4 rounded-full relative transition-colors border border-transparent", showFacturaOnly ? "bg-purple-600 border-purple-500" : "bg-gray-700 border-gray-600")}>
                                            <div className={clsx("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", showFacturaOnly ? "left-4.5" : "left-0.5")} />
                                        </div>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
