import React from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
    Hash, Eye, Cpu, Layers, HardDrive, CheckSquare, FileText, ArrowRight, Clock, CheckCircle, Flame, Wrench, MessageCircle, Truck, Globe, Copy
} from 'lucide-react';
import { getSLAStatus } from '../services/slaService';
import CostDisplay from './common/CostDisplay';
import { useAuth } from '../context/AuthContext';
import { calculateReadiness } from '../utils/wooCommerceReadiness';

const TicketCard = React.memo(({
    ticket,
    selectionMode,
    isSelected,
    onToggleSelection,
    onDragStart,
    onDetail,
    onQA,
    onInfo,
    onDispatch,
    onSLA,
    onMove,
    onBudget, // NEW
    onTagClick // NEW
}) => {
    // Permission check
    const { userProfile } = useAuth();
    const canViewFinancials = userProfile?.roles?.includes('admin') || userProfile?.role === 'Admin' || userProfile?.permissions?.financials?.view;

    // Helper for date formatting
    const formatDate = (date) => {
        if (!date) return '-';
        const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
        return d.toLocaleString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: false
        });
    };

    // Calculations for Info Progress
    const INFO_FIELDS = ['screenSize', 'screenRes', 'cpuBrand', 'cpuGen', 'gpuBrand', 'gpuModel', 'batteryHealth', 'serialNumber'];
    const infoFilledCount = ticket.additionalInfo ? INFO_FIELDS.filter(f => ticket.additionalInfo[f] && ticket.additionalInfo[f].trim() !== '').length : 0;
    const infoProgress = Math.round((infoFilledCount / INFO_FIELDS.length) * 100);
    const infoComplete = infoProgress === 100;

    // SLA Calculations
    const { status: slaStatus, elapsed, remaining } = getSLAStatus(ticket);
    const isSlaApplicable = slaStatus !== 'na';
    const isUrgent = isSlaApplicable && remaining < (4 * 60 * 60 * 1000); // 4 Hours warning

    const [showReason, setShowReason] = React.useState(false);
    const [showWebTooltip, setShowWebTooltip] = React.useState(false);

    // Helpers
    const isService = ['Servicio Rapido', 'Servicio Dedicado', 'Caja Espera', 'Diagnostico', 'Reparacion'].includes(ticket.currentArea || ticket.status);
    const isDespacho = ticket.currentArea && ticket.currentArea.includes("Despacho");

    // Budget / Waiting Logic
    const isWaiting = (ticket.currentArea === 'Caja Espera');
    let budgetStyles = "";
    if (isWaiting && ticket.budget?.status) {
        switch (ticket.budget.status) {
            case 'bought': budgetStyles = "ring-1 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)] border-emerald-500/50"; break;
            case 'shipping': budgetStyles = "ring-1 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] border-blue-500/50 animate-pulse-slow"; break; // Custom pulse
            case 'arrived': budgetStyles = "ring-1 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] border-orange-500/50"; break;
            case 'out_of_stock': budgetStyles = "ring-1 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] border-red-500/50"; break;
            default: break;
        }
    }

    // Auto-hide tooltip after 15s
    React.useEffect(() => {
        let timer;
        if (showReason) {
            timer = setTimeout(() => setShowReason(false), 15000);
        }
        return () => clearTimeout(timer);
    }, [showReason]);

    // Internal handler to maintain stability
    const handleDragStart = React.useCallback((e) => {
        if (onDragStart) onDragStart(e, ticket);
    }, [onDragStart, ticket]);

    const handleCopyDispatch = (e) => {
        e.stopPropagation();
        const lines = [
            `ID Ticket: ${ticket.ticketId || 'ID Pendiente'}`,
            `Nombre: ${ticket.nombreCliente || 'Sin Nombre'}`,
            `Teléfono: ${ticket.clientPhone || 'null'}`,
            `Dirección: ${ticket.dispatchAddress || 'Sin Dirección'}`,
            `Fecha: ${ticket.dispatchDay || 'Sin Fecha'}`,
            `Hora: ${ticket.dispatchHour || 'Sin Hora'}`,
            `Notas: ${ticket.dispatchNotes || 'Sin Notas'}`,
            `Precio: $${(ticket.precioVenta || 0).toLocaleString()}`,
            `Equipo: ${ticket.marca} ${ticket.modelo}`,
            `Procesador: ${`${ticket.additionalInfo?.cpuBrand || ''} ${ticket.additionalInfo?.cpuGen || ''}`.trim()}`,
            `RAM/Disco: ${(ticket.ram?.detalles || []).join('+')} / ${(ticket.disco?.detalles || []).join('+')}`
        ];
        const text = lines.join('\n');
        navigator.clipboard.writeText(text);
        toast.success("Resumen copiado");
    };

    return (
        <div
            draggable={!selectionMode}
            onDragStart={handleDragStart}
            onClick={() => {
                if (selectionMode && onToggleSelection) {
                    onToggleSelection(ticket.id);
                }
            }}
            className={clsx(
                "relative rounded-lg shadow-lg border transition-all duration-300 group",
                budgetStyles, // Apply Budget Styles
                selectionMode
                    ? (isSelected ? "bg-blue-900/40 border-blue-500 ring-2 ring-blue-500 cursor-pointer" : "bg-gray-700/40 border-gray-600/30 opacity-70 hover:opacity-100 cursor-pointer")
                    : "bg-gray-700/40 border-gray-600/30 cursor-grab active:cursor-grabbing hover:bg-gray-700 hover:border-gray-500/50"
            )}
        >
            {/* SELECTION OVERLAY INDICATOR - ENHANCED VISIBILITY */}
            {selectionMode && (
                <div className="absolute top-2 right-2 z-30 pointer-events-none">
                    {isSelected
                        ? <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg transform scale-110 transition-transform">
                            <CheckSquare className="w-6 h-6 text-white" strokeWidth={3} />
                        </div>
                        : <div className="w-8 h-8 bg-gray-800/80 rounded-lg border-2 border-gray-400/50 flex items-center justify-center shadow-sm backdrop-blur-sm">
                            <div className="w-6 h-6 rounded border border-gray-600/30"></div>
                        </div>
                    }
                </div>
            )}

            {/* RESERVED WATERMARK OVERLAY */}
            {ticket.isReserved && (
                <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-lg flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/10 backdrop-grayscale-[0.5]"></div>
                    <div className="transform -rotate-12 bg-black/60 text-white/30 text-2xl font-black uppercase tracking-[0.2em] py-2 px-10 border-y border-white/5 shadow-xl backdrop-blur-sm select-none whitespace-nowrap">
                        No Disponible
                    </div>
                </div>
            )}

            {/* Header Row: ID, Batch ID, Date, S/N - REFACTORED FOR SPACE */}
            <div className="flex flex-col gap-1 p-2.5 pb-1 relative pr-8">
                {/* URGENT INDICATOR */}
                {isUrgent && (
                    <div className="absolute -top-3 -left-2 z-30 animate-bounce text-orange-500 bg-gray-900 rounded-full p-1 border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.6)]" title="¡Urgente! SLA Crítico">
                        <Flame className="w-4 h-4 fill-orange-600" />
                    </div>
                )}

                {/* Top Row: IDs and Date */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 shadow-sm w-fit">
                            <Hash className="w-3.5 h-3.5" /> <span className="text-sm font-mono font-black tracking-tight">{ticket.ticketId}</span>
                        </div>

                        {ticket.batchId && (
                            <div className="flex items-center gap-1 bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 shadow-sm w-fit" title="ID de Lote">
                                <Layers className="w-2.5 h-2.5" /> <span className="text-[9px] font-mono font-bold">{ticket.batchId}</span>
                            </div>
                        )}
                    </div>

                    {/* COPY DISPATCH BUTTON (Only if Reserved) */}
                    {ticket.isReserved && (
                        <button
                            onClick={handleCopyDispatch}
                            className="flex items-center gap-1 px-2 py-0.5 bg-purple-900/40 hover:bg-purple-800 text-purple-300 hover:text-white rounded border border-purple-500/30 transition-all text-[9px] font-bold uppercase tracking-wider shadow-sm z-20"
                            title="Copiar Resumen de Despacho"
                        >
                            <Copy className="w-3 h-3" />
                            Copiar
                        </button>
                    )}
                </div>

                {/* Second Row: S/N (if exists) - Full width available now */}
                {ticket.additionalInfo?.serialNumber && (
                    <div className="flex items-center gap-1 bg-gray-800/50 text-gray-400 px-1.5 py-0.5 rounded border border-gray-600/30 shadow-sm w-fit max-w-full" title="Número de Serie">
                        <span className="text-[9px] font-mono truncate">{ticket.additionalInfo.serialNumber}</span>
                    </div>
                )}
            </div>


            {/* RIGHT ACTION STACK (Absolute) */}
            <div className="absolute top-2 right-2 flex flex-col items-center gap-2 z-20">
                {/* 1. View Detail (Top) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDetail && onDetail(ticket); }}
                    className="p-1 text-gray-400 hover:text-white rounded transition-colors hover:bg-gray-600"
                    title="Ver Ficha Completa"
                >
                    <Eye className="w-4 h-4" />
                </button>

                {/* 2. Cost Display (Middle) */}
                {canViewFinancials && (
                    <CostDisplay ticket={ticket} compact="icon" />
                )}

                {/* 2.5 BUDGET BUTTON (Waiting Room Only) */}
                {isWaiting && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onBudget && onBudget(ticket); }}
                        className={clsx(
                            "p-1 rounded transition-colors hover:bg-purple-900/20",
                            ticket.budget?.status === 'shipping' ? "text-blue-400 animate-pulse" : "text-purple-400 hover:text-purple-300"
                        )}
                        title="Gestionar Espera / Presupuesto"
                    >
                        {ticket.budget?.status === 'bought' ? <CheckCircle className="w-4 h-4" /> :
                            ticket.budget?.status === 'shipping' ? <Truck className="w-4 h-4" /> :
                                <Clock className="w-4 h-4" />}
                    </button>
                )}

                {/* 3. Service Icon (Bottom) */}
                {isService && (
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowReason(!showReason); }}
                            className="p-1 text-yellow-500 hover:text-yellow-400 rounded transition-colors hover:bg-yellow-900/20"
                            title="Ver motivo de servicio"
                        >
                            <Wrench className="w-3.5 h-3.5" />
                        </button>
                        {/* REASON CLOUD (TOOLTIP) - Adjusted Position */}
                        {showReason && (
                            <div className="absolute top-0 right-8 w-64 bg-slate-800 text-gray-100 p-3 rounded-xl shadow-xl border border-slate-600 z-50 animate-in fade-in zoom-in-95 origin-top-right text-xs">
                                <div className="absolute top-2 -right-1.5 w-3 h-3 bg-slate-800 rotate-45 border-r border-t border-slate-600"></div>

                                {ticket.serviceActions && ticket.serviceActions.length > 0 ? (
                                    <>
                                        <div className="font-bold mb-2 flex items-center gap-2 border-b border-slate-700 pb-2 text-blue-400">
                                            <Wrench className="w-3.5 h-3.5" />
                                            <span>PRESUPUESTO ACTIVO</span>
                                        </div>
                                        <ul className="space-y-1.5 mb-2 max-h-40 overflow-y-auto custom-scrollbar px-1">
                                            {ticket.serviceActions.map((action, idx) => (
                                                <li key={idx} className="flex justify-between items-start gap-2 text-gray-300">
                                                    <span className="leading-tight text-[11px]">• {action.text}</span>
                                                    <span className="font-mono font-bold text-green-400">${(action.cost || 0).toLocaleString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-700 font-bold">
                                            <span className="text-gray-400">TOTAL:</span>
                                            <span className="text-sm text-green-400 font-mono">${(ticket.totalServiceCost || 0).toLocaleString()}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* WAITING ROOM REASON (Priority if exists) */}
                                        {isWaiting && (ticket.motivoEspera || ticket.obsEspera) && (
                                            <div className="mb-3 border-b border-slate-700 pb-2">
                                                <div className="font-bold mb-1 flex items-center gap-2 text-orange-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>MOTIVO DE ESPERA</span>
                                                </div>
                                                <p className="leading-relaxed text-gray-200 font-medium">
                                                    {ticket.motivoEspera}
                                                </p>
                                                {ticket.obsEspera && (
                                                    <p className="text-gray-400 text-xs mt-1 italic">
                                                        "{ticket.obsEspera}"
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="font-bold mb-1 flex items-center gap-2 text-blue-400">
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span>MOTIVO DE SERVICIO</span>
                                        </div>
                                        <p className="leading-relaxed text-gray-300">
                                            {ticket.problemDescription || ticket.description || ticket.motivo || ticket.observaciones || "Sin motivo especificado."}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="px-3 pb-2 relative z-10 pr-8">
                {/* TAGS */}
                {ticket.tags && ticket.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {ticket.tags.map(tag => (
                            <span
                                key={tag.id || tag.text}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTagClick && onTagClick(ticket, tag);
                                }}
                                className={clsx(
                                    "px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-all hover:ring-1 ring-white/30",
                                    tag.color,
                                    tag.textColor || 'text-white'
                                )}
                                title="Click para editar/eliminar"
                            >
                                {tag.text}
                            </span>
                        ))}
                    </div>
                )}

                <h4 className="font-bold text-gray-100 text-xs md:text-sm leading-tight mb-2 truncate uppercase" title={`${ticket.marca} ${ticket.modelo}`}>
                    {ticket.marca} {ticket.modelo}
                </h4>

                {/* Tech Specs Compact Grid - INCREASED TEXT SIZE */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-gray-800/30 p-1.5 rounded-md border border-gray-700/30 mb-2">
                    {/* CPU & GPU (Full Width) */}
                    <div className="col-span-2 flex items-center gap-1.5 overflow-hidden" title="Procesador y Gráfica">
                        <Cpu className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="truncate text-[10px] text-gray-300 font-medium flex items-center gap-1">
                            {ticket.additionalInfo?.cpuBrand ? `${ticket.additionalInfo.cpuBrand} ${ticket.additionalInfo.cpuGen || ''}` : '-'}
                            {ticket.additionalInfo?.gpuModel && (
                                <>
                                    <span className="text-gray-600">|</span>
                                    <span className={clsx(ticket.additionalInfo.vram ? "text-blue-300" : "text-gray-400")}>
                                        {ticket.additionalInfo.gpuModel}
                                        {ticket.additionalInfo.vram && ticket.additionalInfo.vram !== 'Shared' && (
                                            <span className="text-[9px] ml-0.5 opacity-80">({ticket.additionalInfo.vram})</span>
                                        )}
                                    </span>
                                </>
                            )}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-hidden" title="Memoria RAM">
                        <Layers className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="truncate text-[10px] text-gray-300 font-medium">
                            {(ticket.ram?.detalles?.length ? ticket.ram.detalles : ticket.originalSpecs?.ram?.detalles)?.join('+') || '-'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-hidden" title="Almacenamiento">
                        <HardDrive className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="truncate text-[10px] text-gray-300 font-medium">
                            {(ticket.disco?.detalles?.length ? ticket.disco.detalles : ticket.originalSpecs?.disco?.detalles)?.join(' + ') || '-'}
                        </span>
                    </div>
                </div>

                {/* Compact Footer Actions */}
                <div className="flex items-center justify-between gap-1">
                    {/* Status Pillars */}
                    <div className="flex items-center gap-2">
                        {/* QA Status (Hidden in Despacho) */}
                        {!isDespacho && (
                            <div
                                onClick={(e) => { e.stopPropagation(); onQA && onQA(ticket); }}
                                className={clsx(
                                    "relative p-[2px] rounded cursor-pointer overflow-hidden transition-all hover:brightness-110 active:scale-95",
                                    ticket.qaProgress > 0 && "shadow-[0_0_15px_rgba(74,222,128,0.4)]"
                                )}
                                style={{
                                    background: `conic-gradient(from 0deg, #22c55e ${ticket.qaProgress}%, #374151 0)`
                                }}
                                title={`Progreso QA: ${ticket.qaProgress}%`}
                            >
                                <div className={clsx(
                                    "px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold flex items-center gap-1",
                                    ticket.qaProgress === 100 ? "bg-green-900/60 text-green-400" : "bg-gray-800 text-gray-400"
                                )}>
                                    <CheckSquare className="w-2.5 h-2.5" />
                                    QA {ticket.qaProgress === 100 ? 'OK' : `${ticket.qaProgress}%`}
                                </div>
                            </div>
                        )}

                        {/* WooCommerce Readiness (New Pill - Replaces QA in Despacho) */}
                        {/* WooCommerce Readiness (New Pill - Replaces QA in Despacho) */}
                        {isDespacho && (() => {
                            // Use the centralized utility
                            const { score: readyScore, isReady, details } = calculateReadiness(ticket, ticket.images);

                            // Gradient Logic for Progress Ring
                            const gradient = `conic-gradient(from 0deg, #06b6d4 ${readyScore}%, #374151 0)`; // Cyan-500

                            return (
                                <div className="relative group/webBtn"> {/* Wrapper to avoid overflow clipping */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setShowWebTooltip(!showWebTooltip); }}
                                        className={clsx(
                                            "relative p-[2px] rounded cursor-pointer overflow-hidden transition-all hover:brightness-125 active:scale-95",
                                            isReady && "shadow-[0_0_20px_rgba(6,182,212,0.6)] animate-pulse-slow" // Cyan Glow
                                        )}
                                        style={{
                                            background: gradient
                                        }}
                                        title={`Estado Web: ${readyScore}%`}
                                    >
                                        <div className={clsx(
                                            "px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold flex items-center gap-1 border",
                                            isReady
                                                ? "bg-cyan-950 text-cyan-400 border-cyan-500"
                                                : "bg-gray-900 text-gray-400 border-transparent"
                                        )}>
                                            <Globe className={clsx("w-2.5 h-2.5", isReady ? "text-cyan-300" : "text-gray-500")} />
                                            WEB {readyScore}%
                                        </div>
                                    </div>

                                    {/* TOOLTIP CLOUD (Now outside overflow based div) */}
                                    {showWebTooltip && (
                                        <div
                                            className="absolute bottom-full left-0 mb-3 w-40 bg-gray-900 border border-cyan-500/50 text-white text-[10px] rounded-lg p-2.5 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2"
                                            onClick={(e) => e.stopPropagation()} // Prevent close on click inside
                                        >
                                            <div className="absolute -bottom-1.5 left-3 w-3 h-3 bg-gray-900 border-b border-r border-cyan-500/50 rotate-45 transform"></div>
                                            <strong className="block text-cyan-400 mb-1.5 border-b border-gray-700 pb-1">Requisitos Web:</strong>
                                            <ul className="list-none space-y-1 text-gray-300">
                                                {details.map((item, i) => (
                                                    <li key={i} className={clsx("flex items-center gap-1.5", item.met ? "text-gray-500" : "text-gray-200 font-medium")}>
                                                        {item.met ? (
                                                            <>
                                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                                <span className="line-through decoration-gray-600">{item.label}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                                                <span>{item.label}</span>
                                                            </>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Info Status */}
                        <div
                            onClick={(e) => { e.stopPropagation(); onInfo && onInfo(ticket); }}
                            className="relative p-[1.5px] rounded cursor-pointer overflow-hidden transition-all hover:brightness-110 active:scale-95"
                            style={{
                                background: `conic-gradient(from 0deg, #4ade80 ${infoProgress}%, #374151 0)`
                            }}
                            title={`Ficha Técnica: ${infoProgress}%`}
                        >
                            <div className={clsx(
                                "px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold flex items-center gap-1",
                                infoComplete ? "bg-blue-900/60 text-blue-400" : "bg-gray-800 text-gray-400"
                            )}>
                                <FileText className="w-2.5 h-2.5" />
                                INFO
                            </div>
                        </div>

                        {/* Dispatch Status (Only in Despacho Area) */}
                        {/* Dispatch Status (Only in Despacho Area) */}
                        {isDespacho && (
                            <div
                                onClick={(e) => { e.stopPropagation(); onDispatch && onDispatch(ticket); }}
                                className="relative p-[1.5px] rounded cursor-pointer overflow-hidden transition-all hover:brightness-110 active:scale-95 bg-gray-800"
                                title="Ficha Despacho"
                            >
                                <div className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold flex items-center gap-1 bg-orange-900/40 text-orange-400 border border-orange-500/30">
                                    <Truck className="w-2.5 h-2.5" />
                                    DESP
                                </div>
                            </div>
                        )}


                    </div>

                    {/* Move Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onMove && onMove(ticket); }}
                        className="p-1 rounded bg-gray-700 text-gray-400 hover:bg-blue-600 hover:text-white transition-colors"
                    >
                        <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* SLA Footer (Interactive) - COMPACT */}
            {isSlaApplicable && (
                <div
                    onClick={(e) => { e.stopPropagation(); onSLA && onSLA(ticket); }}
                    className={clsx("px-3 py-1 flex justify-between items-center text-[9px] uppercase font-bold tracking-wider rounded-b-lg border-t cursor-pointer hover:brightness-110 transition-all",
                        slaStatus === 'danger' ? "bg-red-900/30 border-red-500/30 text-red-400" :
                            slaStatus === 'warning' ? "bg-amber-900/30 border-amber-500/30 text-amber-400" :
                                "bg-blue-900/20 border-blue-500/20 text-blue-400" // Normal/OK Status
                    )}>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{slaStatus === 'danger' ? 'VENCIDO HACE' : (slaStatus === 'warning' ? 'VENCE EN' : 'TIEMPO RESTANTE')}</span>
                    </div>
                    <span className="bg-black/20 px-1.5 py-0.5 rounded shadow-sm">
                        {/* Logic for humanizing remaining or elapsed overdue */}
                        {(() => {
                            // If danger/overdue: Show how much time PAST the limit (elapsed - limit)
                            // If OK/Warning: Show REMAINING time (limit - elapsed)
                            const { limit, elapsed } = getSLAStatus(ticket);
                            const diff = slaStatus === 'danger' ? (elapsed - limit) : (limit - elapsed);

                            const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
                            const days = Math.floor(hours / 24);

                            if (days >= 1) return `${days}d ${hours % 24}h`;
                            return `${hours}h`;
                        })()}
                    </span>
                </div>
            )}
        </div >
    );
});

export default TicketCard;
