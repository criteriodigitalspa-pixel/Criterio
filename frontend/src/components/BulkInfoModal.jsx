import { useState, useEffect } from 'react';
import { X, Save, Info, Cpu, Monitor, Zap, Hash, AlertTriangle, Layers } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { PROCESSORS, GPUS } from '../data/hardware-constants';
import ServiceHardwareConfig from './common/ServiceHardwareConfig';

const SCREEN_SIZES = ["11.6\"", "12.5\"", "13.3\"", "14.0\"", "15.6\"", "16.0\"", "17.3\""];
const RESOLUTIONS = ["HD (1366x768)", "HD+ (1600x900)", "FHD (1920x1080)", "2K (2560x1440)", "4K (3840x2160)", "Retina"];


export default function BulkInfoModal({ tickets, onClose, onComplete }) {
    // Local state for FORM functionality
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);

    // Logic: Mixed Model Warning
    const [mixedModels, setMixedModels] = useState(false);

    useEffect(() => {
        if (!tickets || tickets.length === 0) return;
        const firstModel = `${tickets[0].marca} ${tickets[0].modelo}`;
        const isMixed = tickets.some(t => `${t.marca} ${t.modelo}` !== firstModel);
        setMixedModels(isMixed);
    }, [tickets]);

    // Derived states
    const [cpuModelOptions, setCpuModelOptions] = useState([]);
    const [gpuModelOptions, setGpuModelOptions] = useState([]);

    // RAM & DISK State (Opt-in)
    const [updateRam, setUpdateRam] = useState(false);
    const [ramData, setRamData] = useState({ slots: 2, detalles: ['', ''] });

    const [updateDisk, setUpdateDisk] = useState(false);
    const [diskData, setDiskData] = useState({ slots: 1, detalles: [''] });

    useEffect(() => {
        if (formData.cpuBrand && PROCESSORS[formData.cpuBrand]) {
            setCpuModelOptions(PROCESSORS[formData.cpuBrand]);
        } else {
            setCpuModelOptions([]);
        }
        if (formData.gpuBrand && GPUS[formData.gpuBrand]) {
            setGpuModelOptions(GPUS[formData.gpuBrand]);
        } else {
            setGpuModelOptions([]);
        }
    }, [formData.cpuBrand, formData.gpuBrand]);

    const handleChange = (field, value) => {
        const newInfo = { ...formData, [field]: value };
        // Reset sub-fields if parent changes
        if (field === 'cpuBrand') newInfo.cpuGen = '';
        if (field === 'gpuBrand') newInfo.gpuModel = '';
        setFormData(newInfo);
    };

    const handleSave = async () => {
        setSaving(true);
        const toastId = toast.loading(`Actualizando ${tickets.length} tickets...`);

        try {
            // 1. Filter out empty fields (Partial Update)
            const updates = {};
            Object.keys(formData).forEach(key => {
                if (formData[key] && formData[key].trim() !== '') {
                    updates[key] = formData[key];
                }
            });

            // Add RAM/Disk updates
            if (updateRam) {
                updates.ram = ramData; // { slots, detalles }
            }
            if (updateDisk) {
                updates.disco = diskData; // { slots, detalles }
            }

            if (Object.keys(updates).length === 0) {
                toast.error("No hay cambios para aplicar", { id: toastId });
                setSaving(false);
                return;
            }

            // 2. Iterate and Update
            const promises = tickets.map(async (ticket) => {
                // Separate RAM/Disk from Info updates
                const { ram, disco, ...infoUpdates } = updates;

                // Merge new info updates into existing additionalInfo
                const currentInfo = ticket.additionalInfo || {};
                const mergedInfo = { ...currentInfo, ...infoUpdates };

                // Recalculate completeness (Simple check)
                const REQUIRED_FIELDS = ['screenSize', 'screenRes', 'cpuBrand', 'cpuGen', 'gpuBrand', 'gpuModel', 'batteryHealth', 'serialNumber'];
                const isComplete = REQUIRED_FIELDS.every(f => mergedInfo[f] && mergedInfo[f].trim() !== '');

                const payload = {
                    additionalInfo: mergedInfo,
                    additionalInfoComplete: isComplete
                };

                // Apply RAM/Disk to root if present
                if (ram) payload.ram = ram;
                if (disco) payload.disco = disco;

                return ticketService.updateTicket(ticket.id, payload);
            });

            await Promise.all(promises);

            toast.success("Actualización masiva exitosa", { id: toastId });
            onComplete(); // Triggers reload in parent
        } catch (error) {
            console.error(error);
            toast.error("Error en actualización masiva", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    // Count how many fields are enabling
    const changedCount = Object.values(formData).filter(v => v && v !== '').length;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Layers className="text-purple-400" /> Edición Masiva de Ficha Técnica
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Aplicando cambios a <span className="text-white font-bold">{tickets.length} tickets</span> seleccionados.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Mixed Model Warning */}
                {mixedModels && (
                    <div className="bg-amber-900/20 border-b border-amber-900/50 p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-400">Modelos Mixtos Detectados</p>
                            <p className="text-xs text-amber-200/70 mt-1">
                                Los tickets seleccionados corresponden a diferentes equipos.
                                <br />
                                <strong>Solo rellene los campos que sean COMUNES</strong> (ej. si todos llevan SSD de 256GB).
                                <br />
                                Los campos que deje vacíos mantendrán su valor original en cada ticket.
                            </p>
                        </div>
                    </div>
                )}

                {/* Form Content */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">

                    {/* Instruction */}
                    {!mixedModels && (
                        <div className="text-xs text-gray-500 bg-gray-900/30 p-3 rounded-lg border border-gray-700/50">
                            Complete solo los campos que desea <strong>sobrescribir</strong> en todos los tickets. Los campos vacíos no afectarán la información existente.
                        </div>
                    )}

                    {/* Screen Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tamaño Pantalla</label>
                            <select
                                value={formData.screenSize || ''}
                                onChange={(e) => handleChange('screenSize', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-purple-500 outline-none"
                            >
                                <option value="">(Sin cambios)</option>
                                {SCREEN_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Resolución</label>
                            <select
                                value={formData.screenRes || ''}
                                onChange={(e) => handleChange('screenRes', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-purple-500 outline-none"
                            >
                                <option value="">(Sin cambios)</option>
                                {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* CPU Section */}
                    <div className="bg-gray-700/20 p-4 rounded-xl border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-3 text-gray-300 font-bold">
                            <Cpu className="w-4 h-4 text-cyan-400" /> Procesador
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase mb-1">Familia</label>
                                <select
                                    value={formData.cpuBrand || ''}
                                    onChange={(e) => handleChange('cpuBrand', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2 text-sm text-white focus:ring-1 ring-cyan-500 outline-none"
                                >
                                    <option value="">(Sin cambios)</option>
                                    {Object.keys(PROCESSORS).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase mb-1">Generación / Versión</label>
                                <select
                                    value={formData.cpuGen || ''}
                                    onChange={(e) => handleChange('cpuGen', e.target.value)}
                                    disabled={!formData.cpuBrand}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2 text-sm text-white focus:ring-1 ring-cyan-500 outline-none disabled:opacity-50"
                                >
                                    <option value="">(Sin cambios - Seleccione Familia)</option>
                                    {cpuModelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* GPU Section */}
                    <div className="bg-gray-700/20 p-4 rounded-xl border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-3 text-gray-300 font-bold">
                            <Monitor className="w-4 h-4 text-blue-400" /> Gráficos
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase mb-1">Marca</label>
                                <select
                                    value={formData.gpuBrand || ''}
                                    onChange={(e) => handleChange('gpuBrand', e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2 text-sm text-white focus:ring-1 ring-blue-500 outline-none"
                                >
                                    <option value="">(Sin cambios)</option>
                                    {Object.keys(GPUS).map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase mb-1">Modelo</label>
                                <select
                                    value={formData.gpuModel || ''}
                                    onChange={(e) => handleChange('gpuModel', e.target.value)}
                                    disabled={!formData.gpuBrand}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2 text-sm text-white focus:ring-1 ring-blue-500 outline-none disabled:opacity-50"
                                >
                                    <option value="">(Sin cambios - Seleccione Marca)</option>
                                    {gpuModelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Battery & Serial */}
                </div>

                {/* RAM & DISK SECTION (OPT-IN) */}
                <div className="space-y-4 pt-4 border-t border-gray-700/50">
                    <div className="flex gap-4">
                        {/* Toggle Controls */}
                        <label className="flex items-center gap-2 text-sm text-gray-300 font-bold bg-gray-900/40 px-3 py-2 rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-800">
                            <input type="checkbox" checked={updateRam} onChange={e => setUpdateRam(e.target.checked)} className="rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500" />
                            <span>Sobrescribir RAM</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300 font-bold bg-gray-900/40 px-3 py-2 rounded-lg border border-gray-700/50 cursor-pointer hover:bg-gray-800">
                            <input type="checkbox" checked={updateDisk} onChange={e => setUpdateDisk(e.target.checked)} className="rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500" />
                            <span>Sobrescribir Almacenamiento</span>
                        </label>
                    </div>

                    {(updateRam || updateDisk) && (
                        <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50 animate-in slide-in-from-top-2">
                            <p className="text-xs text-center text-gray-500 mb-2 italic">
                                Nota: Esto reemplazará la configuración de RAM/Disco en todos los tickets seleccionados.
                            </p>
                            {/* Only pass the data/handlers for the active sections. But ServiceHardwareConfig expects all props.
                                    We can pass dummy no-op handlers if disabled, but visually it shows both. 
                                    Looking at ServiceHardwareConfig, it renders both RAM and Disk in a grid.
                                    Ideally we'd want to hide one if not selected, but the component is coupled.
                                    We'll just pass the state and let the user ignore what they didn't check? 
                                    Or we can wrap it. 
                                    Actually ServiceHardwareConfig renders a grid. If I only want RAM, I see Disk too. 
                                    For now, we render both if at least one is checked, but the logic only saves the checked one.
                                */}
                            <ServiceHardwareConfig
                                ramData={ramData}
                                onRamChange={setRamData}
                                diskData={diskData}
                                onDiskChange={setDiskData}
                            />
                        </div>
                    )}
                </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-5 bg-gray-900/50 border-t border-gray-700/50 flex flex-col items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving || changedCount === 0}
                    className={clsx(
                        "w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2",
                        changedCount > 0
                            ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-purple-500/20"
                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    )}
                >
                    {saving ? "Aplicando cambios..." : `Aplicar Cambios (${changedCount})`}
                </button>
                <p className="text-gray-500 text-xs">
                    {changedCount === 0 ? "Modifique al menos un campo para guardar via masiva." : "Esta acción actualizará los campos seleccionados en todos los tickets."}
                </p>
            </div>
        </div>

    );
}
