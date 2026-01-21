
import React from 'react';
import { useFinancialsContext } from '../../context/FinancialContext';
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

export default function CostDisplay({ ticket, compact = false }) {
    const { calculateFinancials, loading } = useFinancialsContext();

    if (loading) return <span className="animate-pulse bg-gray-700 h-4 w-12 rounded"></span>;
    if (!ticket) return null;

    const {
        totalCost, ramDelta, isModified, baseCost,
        serviceCost, sparePartsCost, extraCosts,
        salePrice, grossMargin
    } = calculateFinancials(ticket);

    const format = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

    // Color Logic:
    const deltaColor = ramDelta > 0 ? "text-red-400" : "text-green-400";
    const Arrow = ramDelta > 0 ? ArrowUp : ArrowDown;

    const [showBreakdown, setShowBreakdown] = React.useState(false);

    // 1. COMPACT ICON MODE
    if (compact === 'icon') {
        return (
            <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                <div
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className={clsx(
                        "flex items-center justify-center w-5 h-5 rounded-full border cursor-pointer transition-colors shadow-sm",
                        showBreakdown
                            ? "bg-green-900 text-green-400 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                            : "bg-gray-800 text-green-600 border-gray-600 hover:bg-gray-700"
                    )}
                >
                    <DollarSign className="w-3 h-3 stroke-[2.5]" />
                </div>

                {/* Tooltip / Breakdown */}
                {showBreakdown && (
                    <div className="absolute top-0 right-7 mt-0 w-72 bg-[#0f172a]/95 backdrop-blur-md rounded-xl border border-gray-700 shadow-2xl p-4 z-[9999] animate-in fade-in zoom-in-95 origin-top-right text-left ring-1 ring-white/10">
                        <div className="absolute top-2 -right-1.5 w-3 h-3 bg-[#0f172a]/95 rotate-45 border-r border-t border-gray-700"></div>

                        <h4 className="text-[10px] font-black text-gray-500 uppercase border-b border-gray-700/50 pb-2 mb-3 tracking-widest flex justify-between">
                            <span>Finanzas Ticket</span>
                            <span className="text-gray-600">#{ticket.id}</span>
                        </h4>

                        <div className="space-y-1.5">
                            {/* Costs Breakdown */}
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">Costo Equipo</span>
                                <span className="text-gray-200 font-mono">{format(baseCost)}</span>
                            </div>

                            {ramDelta !== 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className={clsx(ramDelta > 0 ? "text-blue-400" : "text-emerald-400")}>
                                        {ramDelta > 0 ? 'Upgrade RAM' : 'Ahorro RAM'}
                                    </span>
                                    <span className={clsx("font-mono font-bold", ramDelta > 0 ? "text-red-400" : "text-green-400")}>
                                        {ramDelta > 0 ? '+' : ''}{format(ramDelta)}
                                    </span>
                                </div>
                            )}

                            {sparePartsCost > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-orange-400">Repuestos</span>
                                    <span className="text-red-400 font-mono font-bold">+{format(sparePartsCost)}</span>
                                </div>
                            )}

                            {serviceCost > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-purple-400">Mano de Obra</span>
                                    <span className="text-red-400 font-mono font-bold">+{format(serviceCost)}</span>
                                </div>
                            )}

                            {extraCosts > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-yellow-400">Costos Extra</span>
                                    <span className="text-red-400 font-mono font-bold">+{format(extraCosts)}</span>
                                </div>
                            )}

                            <div className="border-t border-gray-700/50 my-2"></div>

                            {/* Totals */}
                            <div className="flex justify-between items-center bg-gray-800/50 p-1.5 rounded">
                                <span className="text-xs font-bold text-red-400 uppercase">Costo Total</span>
                                <span className="font-mono text-white font-bold text-sm">{format(totalCost)}</span>
                            </div>

                            {salePrice > 0 && (
                                <>
                                    <div className="flex justify-between items-center p-1.5 rounded">
                                        <span className="text-xs font-bold text-green-400 uppercase">Precio Venta</span>
                                        <span className="font-mono text-green-400 font-bold text-sm">{format(salePrice)}</span>
                                    </div>

                                    <div className={clsx(
                                        "flex justify-between items-center p-2 rounded border mt-2",
                                        grossMargin >= 0 ? "bg-green-900/20 border-green-500/30" : "bg-red-900/20 border-red-500/30"
                                    )}>
                                        <span className={clsx("text-xs font-black uppercase", grossMargin >= 0 ? "text-green-400" : "text-red-400")}>
                                            Utilidad Bruta
                                        </span>
                                        <span className={clsx("font-mono font-bold text-sm", grossMargin >= 0 ? "text-green-400" : "text-red-400")}>
                                            {format(grossMargin)}
                                        </span>
                                    </div>

                                    {/* TAX & NET PROFIT PREVIEW (Approximation) */}
                                    <div className="mt-2 text-[10px] space-y-1 opacity-80">
                                        <div className="flex justify-between text-orange-400">
                                            <span>IVA (19%) Estimado</span>
                                            {/* Using simplified assumption for Kanban View: Price * 19% (Debito only shown as estimate) */}
                                            <span>{format(Math.round(salePrice * 0.19))}</span>
                                        </div>
                                        <div className="flex justify-between text-yellow-500">
                                            <span>Renta (25%)</span>
                                            <span>{format(Math.max(0, Math.round(grossMargin * 0.25)))}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-400 font-bold border-t border-gray-700 pt-1 mt-1">
                                            <span>Utilidad Neta (Est.)</span>
                                            {/* Net = Gross - IVA Full - Renta (Conservative Estimate) */}
                                            <span>
                                                {format(grossMargin - Math.round(salePrice * 0.19) - Math.max(0, Math.round(grossMargin * 0.25)))}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* WEB PRICE SECTION (New) */}
                            {salePrice > 0 && (
                                <div className="mt-3 pt-2 border-t border-gray-700/50">
                                    <div className="flex justify-between items-center px-1.5 py-1 rounded bg-blue-900/10 border border-blue-500/20">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-blue-400">Precio Web</span>
                                            <span className="text-[9px] text-gray-500">Markup 25% + IVA</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-mono text-blue-300 font-bold text-sm">
                                                {format(calculateFinancials(ticket).webPriceFinal)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between px-2 mt-1">
                                        <span className="text-[9px] text-gray-600">Neto + Markup: {format(calculateFinancials(ticket).webPricePreTax)}</span>
                                        <span className="text-[9px] text-gray-600">IVA: {format(calculateFinancials(ticket).webVat)}</span>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. COMPACT LABEL (Legacy/Card)
    if (compact) {
        return (
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold bg-gray-900/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                <span className="text-gray-300" title="Costo Total">{format(totalCost)}</span>
                {salePrice > 0 && (
                    <span className={clsx("ml-1 pl-1 border-l border-gray-700", grossMargin >= 0 ? "text-green-400" : "text-red-400")}>
                        {format(grossMargin)}
                    </span>
                )}
            </div>
        );
    }

    // 3. FULL MODE (Modal Detail)
    return (
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-3">
            {/* Header Summary */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block mb-0.5">Costo Total (Insumos + Servicios)</span>
                    <div className="text-2xl font-mono font-bold text-white tracking-tight">
                        {format(totalCost)}
                    </div>
                </div>
                {salePrice > 0 && (
                    <div className="text-right">
                        <span className="text-xs text-gray-400 font-bold uppercase block mb-0.5">Margen / Ganancia</span>
                        <div className={clsx("text-2xl font-mono font-bold tracking-tight", grossMargin >= 0 ? "text-green-400" : "text-red-400")}>
                            {format(grossMargin)}
                        </div>
                    </div>
                )}
            </div>

            {/* Breakdown Badges */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
                <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded border border-gray-700">
                    Base: {format(baseCost)}
                </span>

                {ramDelta !== 0 && (
                    <span className={clsx("text-[10px] flex items-center gap-1 px-2 py-1 rounded border border-gray-700 bg-gray-800", deltaColor)}>
                        {ramDelta > 0 ? 'RAM' : 'Ahorro RAM'}: {ramDelta > 0 ? '+' : ''}{format(ramDelta)}
                    </span>
                )}

                {sparePartsCost > 0 && (
                    <span className="text-[10px] text-red-300 bg-red-900/20 px-2 py-1 rounded border border-red-900/30">
                        Repuestos: +{format(sparePartsCost)}
                    </span>
                )}

                {serviceCost > 0 && (
                    <span className="text-[10px] text-purple-300 bg-purple-900/20 px-2 py-1 rounded border border-purple-900/30">
                        Mano Obra: +{format(serviceCost)}
                    </span>
                )}
                {extraCosts > 0 && (
                    <span className="text-[10px] text-yellow-300 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-900/30">
                        Extras: +{format(extraCosts)}
                    </span>
                )}
            </div>
        </div>
    );
}
