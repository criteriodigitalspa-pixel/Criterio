import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, Calendar, Truck, AlertTriangle, CheckCircle, Package, Clock } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_OPTIONS = [
    { id: 'pending', label: 'Por Comprar', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
    { id: 'bought', label: 'Comprado', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
    { id: 'shipping', label: 'En Camino', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
    { id: 'arrived', label: 'Llegó', icon: Package, color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
    { id: 'out_of_stock', label: 'Agotado / Error', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' }
];

export default function TicketBudgetModal({ ticket, onClose }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        status: 'pending',
        partsCost: '',
        shippingCost: '',
        estimatedArrival: '',
        notes: ''
    });

    useEffect(() => {
        if (ticket?.budget) {
            setFormData({
                status: ticket.budget.status || 'pending',
                partsCost: ticket.budget.partsCost || '',
                shippingCost: ticket.budget.shippingCost || '',
                estimatedArrival: ticket.budget.estimatedArrival || '',
                notes: ticket.budget.notes || ''
            });
        }
    }, [ticket]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const budgetData = {
                ...formData,
                lastUpdated: new Date()
            };

            // Calculate total extra costs to update the main financial field
            const totalExtra = Number(formData.partsCost || 0) + Number(formData.shippingCost || 0);

            await ticketService.updateTicket(ticket.id, {
                budget: budgetData,
                costosExtra: totalExtra // Sync with main financials
            });

            toast.success("Presupuesto actualizado");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 relative overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-400" />
                        Sala de Espera
                        <span className="text-sm font-normal text-gray-500">#{ticket.ticketId}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* 1. Status Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado del Repuesto</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {STATUS_OPTIONS.map(opt => {
                                const Icon = opt.icon;
                                const isSelected = formData.status === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status: opt.id })}
                                        className={clsx(
                                            "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all",
                                            isSelected
                                                ? `${opt.bg} ${opt.border} ring-1 ring-offset-1 ring-offset-gray-900 ring-${opt.color.split('-')[1]}-500`
                                                : "bg-gray-800 border-gray-700 hover:bg-gray-750 opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <Icon className={clsx("w-5 h-5", opt.color)} />
                                        <span className={clsx("text-[10px] font-bold", isSelected ? "text-white" : "text-gray-400")}>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Costs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Costo Repuesto
                            </label>
                            <input
                                type="number"
                                value={formData.partsCost}
                                onChange={e => setFormData({ ...formData, partsCost: e.target.value })}
                                placeholder="0"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Truck className="w-3 h-3" /> Costo Envío
                            </label>
                            <input
                                type="number"
                                value={formData.shippingCost}
                                onChange={e => setFormData({ ...formData, shippingCost: e.target.value })}
                                placeholder="0"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* 3. Dates & Notes */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Llegada Estimada
                            </label>
                            <input
                                type="date"
                                value={formData.estimatedArrival}
                                onChange={e => setFormData({ ...formData, estimatedArrival: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Notas / Link</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Link de compra o detalles..."
                                rows={2}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-sm resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-900/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {loading ? <span className="animate-spin text-white">⌛</span> : <Save className="w-4 h-4" />}
                            Actualizar Presupuesto
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
