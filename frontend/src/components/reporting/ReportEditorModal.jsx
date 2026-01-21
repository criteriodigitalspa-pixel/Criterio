import { useState, useEffect } from 'react';
import { X, Save, Calendar, Database, Mail, Clock, Check } from 'lucide-react';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

const TAB_GENERAL = 'general';
const TAB_DATA = 'data';
const TAB_SCHEDULE = 'schedule';

export default function ReportEditorModal({ report, onClose, onSave }) {
    const [activeTab, setActiveTab] = useState(TAB_GENERAL);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dataSource: 'sales', // sales, tickets_all
        filters: {
            dateRange: 'last_7_days', // last_7_days, this_month, last_month
            states: [], // Empty = All
            customStart: '',
            customEnd: ''
        },
        recipients: [], // Array of emails
        schedule: {
            active: true,
            frequency: 'weekly',
            days: ['Monday'],
            time: '08:00'
        },
        format: {
            includeExcel: true,
            includeGraphs: false
        }
    });

    // Load existing data
    useEffect(() => {
        if (report) {
            setFormData(report);
        }
    }, [report]);

    // --- HANDLERS ---
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFilterChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            filters: { ...prev.filters, [field]: value }
        }));
    };

    const handleScheduleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            schedule: { ...prev.schedule, [field]: value }
        }));
    };

    const [recipientInput, setRecipientInput] = useState('');
    const addRecipient = () => {
        if (recipientInput && recipientInput.includes('@')) {
            setFormData(prev => ({ ...prev, recipients: [...prev.recipients, recipientInput] }));
            setRecipientInput('');
        }
    };
    const removeRecipient = (email) => {
        setFormData(prev => ({ ...prev, recipients: prev.recipients.filter(r => r !== email) }));
    };

    const handleSubmit = async () => {
        if (!formData.name) return toast.error("El nombre es obligatorio");
        if (formData.recipients.length === 0) return toast.error("Agrega al menos un destinatario");

        setSaving(true);
        try {
            await reportService.saveConfig(formData);
            toast.success("Configuración guardada");
            onSave();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
                    <h2 className="text-xl font-bold text-white">
                        {report ? 'Editar Reporte' : 'Nuevo Reporte Automático'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 px-6 gap-6 text-sm font-bold text-gray-400">
                    <button onClick={() => setActiveTab(TAB_GENERAL)} className={`py-4 border-b-2 transition-colors ${activeTab === TAB_GENERAL ? 'border-purple-500 text-purple-400' : 'border-transparent hover:text-gray-200'}`}>GENERAL</button>
                    <button onClick={() => setActiveTab(TAB_DATA)} className={`py-4 border-b-2 transition-colors ${activeTab === TAB_DATA ? 'border-purple-500 text-purple-400' : 'border-transparent hover:text-gray-200'}`}>DATOS</button>
                    <button onClick={() => setActiveTab(TAB_SCHEDULE)} className={`py-4 border-b-2 transition-colors ${activeTab === TAB_SCHEDULE ? 'border-purple-500 text-purple-400' : 'border-transparent hover:text-gray-200'}`}>AGENDA & ENVÍO</button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {/* GENERAL TAB */}
                    {activeTab === TAB_GENERAL && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Reporte</label>
                                <input
                                    value={formData.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Ej: Ventas Semanales"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción (Opcional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => handleChange('description', e.target.value)}
                                    placeholder="¿Qué contiene este reporte?"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white h-24 resize-none focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* DATA TAB */}
                    {activeTab === TAB_DATA && (
                        <div className="space-y-6">
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                                <label className="block text-xs font-bold text-purple-400 uppercase mb-2 flex items-center gap-2">
                                    <Database className="w-4 h-4" /> Fuente de Datos
                                </label>
                                <select
                                    value={formData.dataSource}
                                    onChange={e => handleChange('dataSource', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
                                >
                                    <option value="sales">Ventas (Tickets Cerrados/Ventas)</option>
                                    <option value="tickets_all">Todos los Tickets (General)</option>
                                    <option value="sla_alerts">Alertas SLA (Vencidos)</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Filtros Automáticos</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-xs text-gray-400 block mb-1">Rango de Fecha</span>
                                        <select
                                            value={formData.filters.dateRange}
                                            onChange={e => handleFilterChange('dateRange', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                                        >
                                            <option value="last_7_days">Últimos 7 Días</option>
                                            <option value="last_month">Mes Pasado</option>
                                            <option value="this_month">Mes Actual (Hasta hoy)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-400 block mb-1">Estados (Opcional)</span>
                                        <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-gray-500" disabled>
                                            <option>Todos los aplicables</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCHEDULE TAB */}
                    {activeTab === TAB_SCHEDULE && (
                        <div className="space-y-6">

                            {/* Schedule Setting */}
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Frecuencia de Envío
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-white">Activo</label>
                                        <input
                                            type="checkbox"
                                            checked={formData.schedule.active}
                                            onChange={e => handleScheduleChange('active', e.target.checked)}
                                            className="w-4 h-4 rounded text-purple-600"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        value={formData.schedule.frequency}
                                        onChange={e => handleScheduleChange('frequency', e.target.value)}
                                        className="bg-gray-800 border-gray-600 rounded-lg p-2 text-white"
                                    >
                                        <option value="daily">Diario</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensual (Día 1)</option>
                                    </select>
                                    <input
                                        type="time"
                                        value={formData.schedule.time}
                                        onChange={e => handleScheduleChange('time', e.target.value)}
                                        className="bg-gray-800 border-gray-600 rounded-lg p-2 text-white"
                                    />
                                </div>
                            </div>

                            {/* Recipients */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Destinatarios
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        value={recipientInput}
                                        onChange={e => setRecipientInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addRecipient()}
                                        placeholder="correo@ejemplo.com"
                                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
                                    />
                                    <button onClick={addRecipient} className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-lg font-bold">+</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.recipients.map(email => (
                                        <span key={email} className="bg-purple-900/30 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs flex items-center gap-2">
                                            {email}
                                            <button onClick={() => removeRecipient(email)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/80 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white font-medium">Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"
                    >
                        {saving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Reporte</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
