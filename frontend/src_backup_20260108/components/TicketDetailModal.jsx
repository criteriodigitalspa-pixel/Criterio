import React, { useState, useEffect } from 'react';
import { X, Calendar, Server, Cpu, Activity, User, DollarSign, Clock, MapPin, Database, Printer, Trash2 } from 'lucide-react';
import TicketHistoryList from './TicketHistoryList';
import { printService } from '../services/printService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import PrintLabel from './PrintLabel';
import PrintLabelInitial from './PrintLabelInitial';
import { db } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import CostDisplay from './common/CostDisplay'; // Import

export default function TicketDetailModal({ ticket, onClose, onDelete }) {
    const { userProfile } = useAuth();
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

    // Load Templates for WYSIWYG Printing
    const [templates, setTemplates] = React.useState([]);
    React.useEffect(() => {
        const fetchTemplates = async () => {
            try {
                // We need to fetch to get the design config
                // We need to fetch to get the design config
                // Fetches active templates to apply their styles
                // Heuristic: Get the first 'detailed' and first 'simple' template found
                const q = query(collection(db, 'label_templates'));
                const snap = await getDocs(q);
                let loaded = [];
                snap.forEach(d => loaded.push({ id: d.id, ...d.data() }));
                setTemplates(loaded);
            } catch (e) {
                console.error("Error loading templates for print:", e);
            }
        };
        fetchTemplates();
    }, []);

    const technicalTemplate = templates.find(t => t.type === 'detailed') || {};
    const simpleTemplate = templates.find(t => t.type === 'initial') || {};

    const handlePrint = async (type = 'initial') => {
        const toastId = toast.loading("Generando y Enviando...");
        try {
            if (type === 'technical') {
                await printService.printDomElement('print-target-technical', 70, 50, 'PRINT');
            } else {
                // Force 40mm for standard labels if that is the standard
                // Or check the template name? Let's use 50x30/40 logic from Playground
                // For simplicity/safety, we assume 50x30 unless forced otherwise? 
                // Better: Use the same logic as the playground -> 30mm visual, but let the print service handle the routing.
                // Wait, printDomElement logic takes explicit dimensions.
                // User said "ya tengo las 3 plantillas guardadas".
                // If the user wants 40mm, we should probably send 40mm. 
                // Let's default to standard 50x30 unless the template name says 40.

                let h = 30;
                if (simpleTemplate.name && (simpleTemplate.name.includes('40') || simpleTemplate.config?.heightSingle > 280)) h = 40;

                await printService.printDomElement('print-target-initial', 50, h, 'PRINT');
            }
            toast.success("Trabajo enviado al Agente 🖨️", { id: toastId });
        } catch (e) {
            console.error("PRINT ERROR:", e);
            toast.error(`Error: ${e.message}`, { id: toastId });
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Active') return 'text-green-400 bg-green-900/20 border-green-500/30';
        if (status === 'Closed') return 'text-gray-400 bg-gray-800 border-gray-600';
        return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">

            {/* HIDDEN PRINT TARGETS (Rendered Off-Screen) */}
            <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', visibility: 'hidden' }}>
                {/* 1. Technical Label Target */}
                <div id="print-target-technical" className="bg-white inline-block">
                    {/* Ensure we pass the config from the DB template */}
                    <PrintLabel ticket={ticket} id="tech-lbl-render" config={technicalTemplate.config} />
                </div>

                {/* 2. Simple Label Target */}
                <div id="print-target-initial" className="bg-white inline-block">
                    <PrintLabelInitial ticket={ticket} show={true} config={simpleTemplate.config} renderAsPortal={false} />
                </div>
            </div>


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
                            onClick={() => handlePrint('initial')}
                            className="p-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-colors flex items-center gap-2"
                            title="Imprimir Etiqueta Inicial (50x30)"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-bold">50x30</span>
                        </button>
                        <button
                            onClick={() => handlePrint('technical')}
                            className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                            title="Imprimir Ficha Técnica (70x50)"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-bold">70x50</span>
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
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-gray-700">


                    {/* 2. SPECS & COMPONENTS (NOW FIRST) */}
                    <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/50 mb-6">
                        <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <Cpu className="w-5 h-5" /> Hardware & Especificaciones
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                            {/* Basic Specs */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-700 pb-1 mb-2">Equipo</h4>
                                <div>
                                    <span className="block text-xs text-gray-400">Marca/Modelo</span>
                                    <span className="text-white font-medium">{ticket.marca} {ticket.modelo}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400">Serial (SN)</span>
                                    <span className="text-white font-mono text-sm">{ticket.additionalInfo?.serialNumber || ticket.serialNumber || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400">CPU</span>
                                    <span className="text-white text-sm">
                                        {ticket.additionalInfo?.cpuBrand || ticket.specs?.cpu || '-'}
                                        {ticket.additionalInfo?.cpuGen || ticket.specs?.generation ? ` (${ticket.additionalInfo?.cpuGen || ticket.specs?.generation})` : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Graphics & Screen */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-700 pb-1 mb-2">Gráficos/Pantalla</h4>
                                <div>
                                    <span className="block text-xs text-gray-400">GPU</span>
                                    <span className="text-white text-sm">
                                        {ticket.additionalInfo?.gpuBrand
                                            ? `${ticket.additionalInfo.gpuBrand} ${ticket.additionalInfo.gpuModel || ''}`
                                            : (ticket.specs?.gpu || 'Integrada')}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400">Pantalla</span>
                                    <span className="text-white text-sm">
                                        {ticket.additionalInfo?.screenSize || ticket.specs?.screenSize || '-'}
                                        {ticket.additionalInfo?.screenRes || ticket.specs?.resolution ? ` [${ticket.additionalInfo?.screenRes || ticket.specs?.resolution}]` : ''}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400">Bat. / Estética</span>
                                    <span className="text-white text-sm">{ticket.additionalInfo?.batteryHealth || ticket.specs?.aesthetics || '-'}</span>
                                </div>
                            </div>

                            {/* RAM */}
                            <div className="bg-gray-900/30 p-3 rounded-lg border border-gray-700/30">
                                <h4 className="text-xs font-bold text-blue-300 uppercase mb-3 flex items-center gap-2">
                                    <Server className="w-3 h-3" /> RAM
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Original:</span>
                                        <span className="text-gray-300">{ticket.ram?.original || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-700/50 pt-2">
                                        <span className="text-gray-500">Final:</span>
                                        <span className="text-blue-200 font-bold">
                                            {(ticket.ram?.detalles?.length ? ticket.ram.detalles : ticket.originalSpecs?.ram?.detalles)?.join(' + ') || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* DISK */}
                            <div className="bg-gray-900/30 p-3 rounded-lg border border-gray-700/30">
                                <h4 className="text-xs font-bold text-indigo-300 uppercase mb-3 flex items-center gap-2">
                                    <Database className="w-3 h-3" /> Almacenamiento
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Original:</span>
                                        <span className="text-gray-300">{ticket.disco?.original || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-700/50 pt-2">
                                        <span className="text-gray-500">Final:</span>
                                        <span className="text-indigo-200 font-bold">
                                            {(ticket.disco?.detalles?.length ? ticket.disco.detalles : ticket.originalSpecs?.disco?.detalles)?.join(' + ') || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* 1. KEY INFO & CLIENT */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/50 col-span-2">
                            <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5" /> Información Principal
                            </h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Cliente</label>
                                    <p className="text-white font-medium text-lg">{ticket.nombreCliente || 'Sin Nombre'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Ubicación Actual</label>
                                    <p className="text-white font-medium text-lg flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                        {ticket.currentArea || 'N/A'}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Motivo / Falla</label>
                                    <div className="space-y-2">
                                        {(ticket.motivoEspera || ticket.obsEspera) && (
                                            <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-700/50">
                                                <span className="block text-xs text-yellow-500 font-bold mb-1">⏳ MOTIVO DE ESPERA</span>
                                                <p className="text-yellow-100 font-medium">{ticket.motivoEspera}</p>
                                                {ticket.obsEspera && <p className="text-yellow-200/70 text-sm mt-1">"{ticket.obsEspera}"</p>}
                                            </div>
                                        )}
                                        <p className="text-gray-300 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                                            {ticket.motivo || ticket.description || 'Sin descripción'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {canViewFinancials && (
                            <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/50">
                                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" /> Financiero
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Precio Venta</span>
                                        <span className="text-xl font-bold text-green-400">${(ticket.precioVenta || 0).toLocaleString()}</span>
                                    </div>

                                    {/* WEB PRICE SIMULATION */}
                                    <div className="flex justify-between items-center bg-blue-900/10 p-2 rounded border border-blue-500/20">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-blue-400 uppercase">Precio Web (Est.)</span>
                                            <span className="text-[10px] text-gray-500">Markup 25% + IVA</span>
                                        </div>
                                        <span className="text-lg font-mono font-bold text-blue-300">
                                            {(() => {
                                                const p = parseFloat(ticket.precioVenta) || 0;
                                                const web = (p * 1.25) * 1.19;
                                                return `$${web.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">Costo Repuestos</span>
                                        <span className="text-lg font-mono text-red-300">-${(ticket.reparacion?.costoRepuestos || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-700">
                                        <CostDisplay ticket={ticket} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>



                    {/* 3. HISTORY LOG */}
                    <div className="border-t border-gray-700 pt-6">
                        <h3 className="text-lg font-bold text-gray-300 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5" /> Historial de Movimientos
                        </h3>
                        <div className="relative border-l-2 border-gray-700 ml-3 space-y-6">

                            {/* Current State */}
                            <div className="mb-6 ml-6">
                                <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full -left-[13px] ring-4 ring-gray-900">
                                    <Activity className="w-3 h-3 text-white" />
                                </span>
                                <h4 className="flex items-center mb-1 text-sm font-semibold text-white">
                                    Estado Actual: {ticket.currentArea}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <time className="text-xs font-normal text-gray-500">Ahora</time>
                                    {/* Current Duration Badge */}
                                    {(() => {
                                        const getMs = (ts) => ts ? (ts.seconds ? ts.seconds * 1000 : new Date(ts).getTime()) : 0;
                                        const start = getMs(ticket.movedToAreaAt || ticket.createdAt); // Use movedToAreaAt if valid
                                        const now = Date.now();
                                        const duration = now - start;

                                        const formatDuration = (ms) => {
                                            if (!ms && ms !== 0) return '';
                                            const hours = Math.floor(ms / (1000 * 60 * 60));
                                            const days = Math.floor(hours / 24);
                                            const remHours = hours % 24;
                                            if (days > 0) return `${days}d ${remHours}h`;
                                            if (hours > 0) return `${hours}h`;
                                            return '< 1h';
                                        };

                                        return (
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-900/30 border border-blue-800 text-xs text-blue-300 font-mono">
                                                <Clock className="w-3 h-3" />
                                                Lleva: {formatDuration(duration)}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Process History Logic */}
                            <TicketHistoryList history={ticket.history} />

                            <div className="ml-6">
                                <span className="absolute flex items-center justify-center w-4 h-4 bg-emerald-900/50 rounded-full -left-[21px]"></span>
                                <h4 className="text-sm font-medium text-gray-500">Ticket Creado</h4>
                                <time className="text-xs text-gray-700">{formatDate(ticket.createdAt)}</time>
                            </div>

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
