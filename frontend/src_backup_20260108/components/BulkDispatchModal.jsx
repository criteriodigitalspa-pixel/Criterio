import { useState } from 'react';
import { X, Save, Truck, Calendar, Clock, MapPin, FileText, Info } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function BulkDispatchModal({ tickets, onClose, onComplete }) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);

    // Common Dispatch Fields
    const [formData, setFormData] = useState({
        dispatchDay: '',
        dispatchHour: '',
        dispatchAddress: '',
        dispatchNotes: ''
    });

    // Toggle which fields to apply
    const [applyFields, setApplyFields] = useState({
        dispatchDay: false,
        dispatchHour: false,
        dispatchAddress: false,
        dispatchNotes: false
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Auto-enable apply if typing
        if (value && !applyFields[field]) {
            setApplyFields(prev => ({ ...prev, [field]: true }));
        }
    };

    const handleToggle = (field) => {
        setApplyFields(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSave = async () => {
        const fieldsToUpdate = Object.keys(applyFields).filter(key => applyFields[key]);

        if (fieldsToUpdate.length === 0) {
            toast.error("Selecciona al menos un campo para actualizar");
            return;
        }

        setSaving(true);
        const toastId = toast.loading(`Actualizando ${tickets.length} tickets...`);

        try {
            const updates = {};
            fieldsToUpdate.forEach(field => {
                updates[field] = formData[field];
            });

            await Promise.all(tickets.map(ticket =>
                ticketService.updateTicket(ticket.id, updates, {
                    userId: user.uid,
                    reason: 'Bulk Dispatch Update',
                    changes: updates // Simplified audit for bulk
                })
            ));

            toast.success("Despacho masivo actualizado", { id: toastId });
            onComplete();
        } catch (error) {
            console.error(error);
            toast.error("Error en actualización masiva", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/80">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Truck className="text-orange-400" /> Despacho Masivo
                        </h2>
                        <div className="text-xs text-gray-400 mt-1">
                            Editando <strong>{tickets.length}</strong> tickets
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-sm text-blue-200">
                        <Info className="w-5 h-5 shrink-0 text-blue-400" />
                        <p>Solo se actualizarán los campos que selecciones explícitamente. Los datos existentes de los tickets no seleccionados se mantendrán.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Date */}
                        <div className="flex gap-4 items-start">
                            <input
                                type="checkbox"
                                checked={applyFields.dispatchDay}
                                onChange={() => handleToggle('dispatchDay')}
                                className="mt-3 w-5 h-5 rounded border-gray-600 text-orange-500 bg-gray-700 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 mb-1">Fecha de Entrega</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        type="date"
                                        value={formData.dispatchDay}
                                        onChange={(e) => handleChange('dispatchDay', e.target.value)}
                                        disabled={!applyFields.dispatchDay}
                                        className={clsx(
                                            "w-full bg-gray-800 border rounded-xl pl-9 pr-2.5 py-2.5 text-white outline-none transition-all",
                                            applyFields.dispatchDay ? "border-gray-600 focus:ring-2 ring-orange-500" : "border-gray-700 opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hour */}
                        <div className="flex gap-4 items-start">
                            <input
                                type="checkbox"
                                checked={applyFields.dispatchHour}
                                onChange={() => handleToggle('dispatchHour')}
                                className="mt-3 w-5 h-5 rounded border-gray-600 text-orange-500 bg-gray-700 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 mb-1">Hora Estimada</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        type="time"
                                        value={formData.dispatchHour}
                                        onChange={(e) => handleChange('dispatchHour', e.target.value)}
                                        disabled={!applyFields.dispatchHour}
                                        className={clsx(
                                            "w-full bg-gray-800 border rounded-xl pl-9 pr-2.5 py-2.5 text-white outline-none transition-all",
                                            applyFields.dispatchHour ? "border-gray-600 focus:ring-2 ring-orange-500" : "border-gray-700 opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="flex gap-4 items-start">
                            <input
                                type="checkbox"
                                checked={applyFields.dispatchAddress}
                                onChange={() => handleToggle('dispatchAddress')}
                                className="mt-3 w-5 h-5 rounded border-gray-600 text-orange-500 bg-gray-700 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 mb-1">Dirección Común (Opcional)</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={formData.dispatchAddress}
                                        onChange={(e) => handleChange('dispatchAddress', e.target.value)}
                                        disabled={!applyFields.dispatchAddress}
                                        placeholder="Ej: Sucursal Central..."
                                        className={clsx(
                                            "w-full bg-gray-800 border rounded-xl pl-9 pr-2.5 py-2.5 text-white outline-none transition-all",
                                            applyFields.dispatchAddress ? "border-gray-600 focus:ring-2 ring-orange-500" : "border-gray-700 opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="flex gap-4 items-start">
                            <input
                                type="checkbox"
                                checked={applyFields.dispatchNotes}
                                onChange={() => handleToggle('dispatchNotes')}
                                className="mt-3 w-5 h-5 rounded border-gray-600 text-orange-500 bg-gray-700 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-400 mb-1">Nota de Despacho</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                    <textarea
                                        value={formData.dispatchNotes}
                                        onChange={(e) => handleChange('dispatchNotes', e.target.value)}
                                        disabled={!applyFields.dispatchNotes}
                                        placeholder="Instrucción para todos..."
                                        className={clsx(
                                            "w-full bg-gray-800 border rounded-xl pl-9 pr-2.5 py-2.5 text-white outline-none transition-all min-h-[80px] resize-none",
                                            applyFields.dispatchNotes ? "border-gray-600 focus:ring-2 ring-orange-500" : "border-gray-700 opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="p-5 bg-gray-900/50 border-t border-gray-700/50 flex gap-3">
                    <button onClick={onClose} disabled={saving} className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold border border-gray-700 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Guardando...' : 'Aplicar Cambios'}
                    </button>
                </div>

            </div>
        </div>
    );
}
