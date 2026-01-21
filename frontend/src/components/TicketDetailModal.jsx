import React, { useState, useEffect } from 'react';
import { X, Calendar, Server, Cpu, Activity, User, DollarSign, Clock, MapPin, Database, Printer, Trash2, ArrowRight, TrendingUp, TrendingDown, Globe } from 'lucide-react';
import TicketHistoryList from './TicketHistoryList';
import { printService } from '../services/printService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PrintLabel from './PrintLabel';
import PrintLabelInitial from './PrintLabelInitial';
import { db } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import CostDisplay from './common/CostDisplay';
import { useProcessing } from '../context/ProcessingContext'; // Implement Global Printer
import { useFinancialsContext } from '../context/FinancialContext'; // Restore Import
import { wooCommerceService } from '../services/wooCommerceService';

export default function TicketDetailModal({ ticket, onClose, onDelete }) {
    const { userProfile } = useAuth();
    const { calculateFinancials } = useFinancialsContext();
    const { printTask } = useProcessing(); // Get Global Print Task

    // Admin or specific permission required to view financials
    const canViewFinancials = userProfile?.roles?.includes('admin') || userProfile?.role === 'Admin' || userProfile?.permissions?.financials?.view;

    if (!ticket) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = dateStr?.seconds ? new Date(dateStr.seconds * 1000) : new Date(dateStr);
        return d.toLocaleString('es-CL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            hour12: false
        });
    };

    const handlePrint = async () => {
        toast.promise(printTask(ticket), {
            loading: 'Generando etiqueta...',
            success: 'Enviado a impresora',
            error: 'Error al enviar'
        });
    };

    const handleSyncWithWoo = async () => {
        if (!ticket.precioVenta) {
            toast.error("El equipo no tiene precio de venta asignado.");
            return;
        }
        const toastId = toast.loading("Sincronizando con Tienda...");
        try {
            await wooCommerceService.syncProduct(ticket, ticket.precioVenta);
            toast.success("¡Sincronizado Correctamente!", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Error al sincronizar: " + error.message, { id: toastId });
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Active') return 'text-green-400 bg-green-900/20 border-green-500/30';
        if (status === 'Closed') return 'text-gray-400 bg-gray-800 border-gray-600';
        return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">

            <div className="bg-[#1e293b] w-full max-w-5xl max-h-[90vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
                {/* HEADER */}
                <div className="p-6 border-b border-gray-700 bg-gray-800/50 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl font-black text-white tracking-tight">{ticket.ticketId}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                                {ticket.status?.toUpperCase() || 'ACTIVE'}
                            </span>
                            {ticket.isImported && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30">
                                    IMPORTADO
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(ticket.createdAt)}</span>
                            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {ticket.createdBy}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSyncWithWoo}
                            className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-colors flex items-center gap-2"
                            title="Sincronizar con WooCommerce"
                        >
                            <Globe className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-bold">Sincronizar Web</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            title="Imprimir Etiqueta"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-bold">Imprimir Etiqueta</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* CONTENT SCROLLABLE */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700">

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* LEFT COLUMN: SPECS, INFO, HISTORY (Cols 1-7) */}
                        <div className="lg:col-span-7 space-y-6">

                            {/* 1. HARDWARE SPECS (Compact Grid) */}
                            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
                                <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Cpu className="w-4 h-4" /> Hardware
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <label className="text-[10px] items-center gap-1 font-bold text-gray-500 uppercase block mb-0.5">Equipo</label>
                                        <div className="font-medium text-white">{ticket.marca} {ticket.modelo}</div>
                                        <div className="text-gray-400 text-xs truncate" title={ticket.additionalInfo?.serialNumber || ticket.serialNumber}>
                                            SN: {ticket.additionalInfo?.serialNumber || ticket.serialNumber || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Procesador</label>
                                        <div className="text-gray-300 text-xs">
                                            {ticket.additionalInfo?.cpuBrand || ticket.specs?.cpu || '-'}
                                            {ticket.additionalInfo?.cpuGen || ticket.specs?.generation ? ` (${ticket.additionalInfo?.cpuGen || ticket.specs?.generation})` : ''}
                                        </div>
                                    </div>
                                    {/* NEW: SCREEN & GPU DETAILED */}
                                    {(ticket.additionalInfo?.screenSize || ticket.additionalInfo?.screenType) && (
                                        <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-gray-700/30 mt-1">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Pantalla</label>
                                                <div className="text-gray-300 text-xs">
                                                    {ticket.additionalInfo?.screenSize ? `${ticket.additionalInfo.screenSize}` : ''}
                                                    {ticket.additionalInfo?.screenSize && ticket.additionalInfo?.screenType ? ' - ' : ''}
                                                    {ticket.additionalInfo?.screenType}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Gráficos</label>
                                                <div className="text-gray-300 text-xs">
                                                    {ticket.additionalInfo?.gpuBrand || 'Integrada'}
                                                    {ticket.additionalInfo?.gpuModel ? ` ${ticket.additionalInfo.gpuModel}` : ''}
                                                    {ticket.additionalInfo?.vram ? ` (${ticket.additionalInfo.vram})` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RAM & DISK COMPACT */}
                                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-700/30">
                                    <div className="bg-gray-900/30 p-2 rounded border border-gray-700/30">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-bold flex items-center gap-1"><Server className="w-3 h-3" /> RAM</span>
                                            <span className="text-blue-300 font-bold">
                                                {ticket.ram?.detalles?.join(' + ') || '-'}
                                            </span>
                                        </div>
                                        {/* Original RAM */}
                                        {ticket.originalSpecs?.ram && (
                                            <div className="text-[9px] text-gray-500 text-right mt-0.5">
                                                Orig: {ticket.originalSpecs.ram.detalles?.join(' + ') || ticket.originalSpecs.ram.total}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-900/30 p-2 rounded border border-gray-700/30">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-bold flex items-center gap-1"><Database className="w-3 h-3" /> DISK</span>
                                            <span className="text-indigo-300 font-bold">
                                                {ticket.disco?.detalles?.join(' + ') || '-'}
                                            </span>
                                        </div>
                                        {/* Original Disk */}
                                        {ticket.originalSpecs?.disco && (
                                            <div className="text-[9px] text-gray-500 text-right mt-0.5">
                                                Orig: {ticket.originalSpecs.disco.detalles?.join(' + ') || '-'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 2. CLIENT & LOCATION */}
                            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Activity className="w-4 h-4" /> Info
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Cliente</label>
                                        <p className="text-white font-medium text-sm">{ticket.nombreCliente || 'Sin Nombre'}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Ubicación</label>
                                        <p className="text-white font-medium text-sm flex items-center gap-2">
                                            <MapPin className="w-3 h-3 text-emerald-500" />
                                            {ticket.currentArea || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="col-span-2 bg-gray-900/40 p-3 rounded-lg border border-gray-700/30">
                                        {ticket.motivoEspera && (
                                            <div className="mb-2 pb-2 border-b border-gray-700/30">
                                                <span className="text-[10px] text-yellow-500 font-bold block">Espera: {ticket.motivoEspera}</span>
                                            </div>
                                        )}
                                        <p className="text-gray-300 text-xs italic">
                                            "{ticket.motivo || ticket.description || 'Sin descripción'}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. HISTORY COMPACT */}
                            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Clock className="w-4 h-4" /> Historial
                                </h3>
                                <div className="max-h-40 overflow-y-auto pr-2 space-y-3 pl-2 border-l border-gray-700">
                                    <TicketHistoryList history={ticket.history} compact={true} />
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: FINANCIALS (Cols 8-12) */}
                        <div className="lg:col-span-5">
                            {canViewFinancials ? (
                                <div className="bg-gray-900 p-0 rounded-2xl border border-gray-700 shadow-xl overflow-hidden h-full flex flex-col">
                                    <div className="p-4 bg-emerald-900/10 border-b border-emerald-500/20 flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                                            <DollarSign className="w-5 h-5" /> Financiero
                                        </h3>
                                        <CostDisplay ticket={ticket} />
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col gap-0.5">
                                        {(() => {
                                            const fin = calculateFinancials(ticket);
                                            const costosVarios = fin.totalCost - fin.baseCost;

                                            const Row = ({ label, value, color = "text-white", isTotal = false, isSub = false, icon = null }) => (
                                                <div className={`flex justify-between items-center py-2 px-3 rounded hover:bg-white/5 transition-colors ${isTotal ? 'bg-white/5 mt-2 border-t border-white/10' : ''} ${isSub ? 'pl-6 text-sm' : ''}`}>
                                                    <span className={`text-xs font-medium flex items-center gap-2 ${isTotal ? 'text-gray-300 uppercase' : 'text-gray-500'}`}>
                                                        {icon} {label}
                                                    </span>
                                                    <span className={`font-mono font-bold ${isTotal ? 'text-lg' : 'text-sm'} ${color}`}>
                                                        {(typeof value === 'number') ? `$${value.toLocaleString()}` : value}
                                                    </span>
                                                </div>
                                            );

                                            return (
                                                <>
                                                    {/* COSTS */}
                                                    <div className="space-y-0.5 mb-4">
                                                        <Row label="Costo Equipo" value={-fin.baseCost} color="text-purple-300" />

                                                        {/* BREAKDOWN: RAM & DISK */}
                                                        {fin.ramDelta !== 0 && (
                                                            <Row
                                                                label={fin.ramDelta > 0 ? "Upgrade RAM" : "Ahorro RAM"}
                                                                value={-fin.ramDelta}
                                                                color={fin.ramDelta > 0 ? "text-red-400" : "text-emerald-400"}
                                                                isSub={true}
                                                            />
                                                        )}
                                                        {fin.diskDelta !== 0 && (
                                                            <Row
                                                                label={fin.diskDelta > 0 ? "Upgrade Disco" : "Ahorro Disco"}
                                                                value={-fin.diskDelta}
                                                                color={fin.diskDelta > 0 ? "text-red-400" : "text-emerald-400"}
                                                                isSub={true}
                                                            />
                                                        )}

                                                        {/* BREAKDOWN: SERVICES & SPARES */}
                                                        {(fin.serviceCost > 0 || fin.sparePartsCost > 0) && (
                                                            <Row
                                                                label="Reparación / Repuestos"
                                                                value={-(fin.serviceCost + fin.sparePartsCost)}
                                                                color="text-red-400"
                                                                isSub={true}
                                                            />
                                                        )}

                                                        {/* BREAKDOWN: EXTRAS */}
                                                        {fin.viaticoCost > 0 && <Row label="Viático" value={-fin.viaticoCost} color="text-pink-300" isSub={true} />}
                                                        {fin.publicidadCost > 0 && <Row label="Publicidad" value={-fin.publicidadCost} color="text-indigo-300" isSub={true} />}
                                                        {fin.extraCosts > 0 && <Row label="Costos Extra" value={-fin.extraCosts} color="text-yellow-300" isSub={true} />}
                                                        <Row label="Costo Total" value={-fin.totalCost} color="text-red-400" isTotal={true} />
                                                    </div>

                                                    {/* SALES & BASIC PROFIT */}
                                                    <div className="space-y-0.5 mb-4 border-t border-dashed border-gray-700 pt-2">
                                                        <Row label="Precio Venta" value={fin.salePrice} color="text-emerald-400" />

                                                        {/* GANANCIA INMEDIATA (NEW) */}
                                                        <Row
                                                            label="Ganancia Inmediata"
                                                            value={fin.gananciaInmediata}
                                                            color="text-white"
                                                            isTotal={true}
                                                            icon={<TrendingUp className="w-4 h-4 text-gray-400" />}
                                                        />
                                                        <div className="text-[10px] text-gray-500 text-right px-3 italic">
                                                            (Venta - Costo Total)
                                                        </div>
                                                    </div>

                                                    {/* TAXES */}
                                                    <div className="space-y-0.5 mb-4 bg-gray-950/30 rounded-lg p-2 border border-gray-800">
                                                        <h4 className="text-[10px] uppercase font-bold text-gray-600 mb-2 px-1">Impuestos & Deducciones</h4>

                                                        {/* IVA ESTIMADO */}
                                                        <Row label="IVA Total (Est.)" value={fin.ivaReal} color="text-orange-300/50" isSub={true} />

                                                        <Row
                                                            label="IVA (SII)"
                                                            value={fin.taxIva}
                                                            color={fin.taxIva > 0 ? "text-orange-400" : "text-emerald-400"}
                                                            isSub={true}
                                                        />

                                                        <Row label="Renta Total (Est.)" value={fin.rentaReal} color="text-yellow-500/50" isSub={true} />
                                                        <Row label="Renta (SII)" value={fin.rentaFiscal} color="text-yellow-600" isSub={true} />
                                                    </div>

                                                    {/* FINAL PROFITS */}
                                                    <div className="mt-auto pt-2 border-t border-gray-700">
                                                        <Row label="Utilidad Bruta" value={fin.grossMargin} color={fin.grossMargin >= 0 ? "text-green-400" : "text-red-400"} />

                                                        <div className="bg-emerald-500/10 rounded-lg border border-emerald-500/20 mt-2 p-1">
                                                            <Row
                                                                label="Utilidad Neta Real"
                                                                value={fin.utilidadNetaReal}
                                                                color={fin.utilidadNetaReal >= 0 ? "text-emerald-400" : "text-red-500"}
                                                                isTotal={true}
                                                            />
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center p-6 bg-gray-800/20 rounded-2xl border border-gray-700/50 border-dashed">
                                    <div className="text-center text-gray-600">
                                        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Sin permisos para ver información financiera</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                </div>

                {/* FOOTER ACTIONS */}
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex justify-between gap-3">
                    {onDelete && (
                        <button
                            onClick={() => onDelete(ticket.id)}
                            className="px-6 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors border border-gray-700"
                    >
                        Cerrar
                    </button>
                </div>

            </div>
        </div >

    );
}
