import { useState, useEffect, useRef } from 'react';
import { useFinancials } from '../hooks/useFinancials';
import { useProcessing } from '../context/ProcessingContext';
import {
    X, Save, AlertTriangle, Check, Smartphone, Cpu, CircuitBoard, HardDrive,
    Monitor, Battery, Hash, RotateCcw, ArrowRight, AlertCircle, RefreshCw,
    CheckCircle, Info, CreditCard, Zap, Printer, Wand2, Upload, FileText
} from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { aiService } from '../services/aiService';
import { descriptionGenerator } from '../services/descriptionGenerator';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { QA_ITEMS } from '../data/constants';
import { parseSpecsFile as parseSpecsShared } from '../utils/specsParser'; // Import shared parser (Corrected Path)

// --- DATA OPTIONS (Keep existing constants) ---
const SCREEN_SIZES = ["11.6\"", "12.5\"", "13.3\"", "14.0\"", "15.6\"", "16.0\"", "17.3\""];
const RESOLUTIONS = ["HD (1366x768)", "HD+ (1600x900)", "FHD (1920x1080)", "2K (2560x1440)", "4K (3840x2160)", "Retina"];
const BATTERY_HEALTH = ["0-20% (Mala)", "21-40% (Regular)", "41-60% (Aceptable)", "61-80% (Buena)", "81-100% (Excelente)"];
const RAM_OPTIONS = [2, 4, 8, 12, 16, 20, 24, 32, 64, 128];
const DISK_OPTIONS = ["120GB", "128GB", "240GB", "256GB", "480GB", "500GB", "512GB", "1TB", "2TB"];
const DISK_TYPES = ["HDD", "SSD", "NVMe", "eMMC"];

import { PROCESSORS, GPUS } from '../data/hardware-constants';
import StorageForm from './modals/additional-info/StorageForm';
import CpuGpuForm from './modals/additional-info/CpuGpuForm';

// Required fields
const REQUIRED_FIELDS = ['screenSize', 'screenRes', 'cpuBrand', 'cpuGen', 'gpuBrand', 'gpuModel', 'batteryHealth', 'serialNumber'];

const checkCompletion = (info) => {
    return REQUIRED_FIELDS.every(field => info[field] && String(info[field]).trim() !== '');
};


export default function AdditionalInfoModal({ ticket, onClose, onUpdate }) {
    const { user } = useAuth();
    const { printTask } = useProcessing();
    const { getRamPrice } = useFinancials();
    const fileInputRef = useRef(null);

    // Local state
    const [info, setInfo] = useState({
        ...ticket.additionalInfo,
        marca: ticket.marca || '',
        modelo: ticket.modelo || '',
        precioCompra: ticket.precioCompra || '',
        costosExtra: ticket.costosExtra || '',
        viatico: ticket.viatico || '',
        publicidad: ticket.publicidad || '',
        proveedor: ticket.proveedor || '',
        conFactura: ticket.conFactura || false,
        description: ticket.description || ticket.additionalInfo?.description || ''
    } || {});

    const [rawSpecs, setRawSpecs] = useState(''); // Store imported text
    const [isGenerating, setIsGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Hardware State
    const [ram, setRam] = useState(ticket.ram || { slots: 0, detalles: [] });
    const [disk, setDisk] = useState(ticket.disco || { slots: 1, detalles: [] });

    // QA State (Hidden but updated via file)
    const [qaChecklist, setQaChecklist] = useState(ticket.qaChecklist || {});

    // Handlers
    const handleChange = (field, value) => {
        setInfo(prev => ({ ...prev, [field]: value }));
    };

    // SYNC STATE ON TICKET CHANGE (Crucial for Persistence of RAM/Disk)
    useEffect(() => {
        setInfo({
            ...ticket.additionalInfo,
            marca: ticket.marca || '',
            modelo: ticket.modelo || '',
            precioCompra: ticket.precioCompra || '',
            costosExtra: ticket.costosExtra || '',
            viatico: ticket.viatico || '',
            publicidad: ticket.publicidad || '',
            proveedor: ticket.proveedor || '',
            conFactura: ticket.conFactura || false,
            description: ticket.description || ticket.additionalInfo?.description || ''
        });
        setRam(ticket.ram || { slots: 0, detalles: [] });
        setDisk(ticket.disco || { slots: 1, detalles: [] });
        setQaChecklist(ticket.qaChecklist || {});
        setRawSpecs(ticket.additionalInfo?.rawSpecs || ''); // RESTORE RAW SPECS
    }, [ticket]);

    // --- PARSING LOGIC ---
    // Uses shared parser to avoid duplication and inconsistencies
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target.result;
                const parsed = parseSpecsShared(text);

                setInfo(prev => ({
                    ...prev,
                    marca: (parsed.brand && parsed.brand !== 'GENERICO') ? parsed.brand : prev.marca,
                    modelo: (parsed.model && parsed.model !== 'Unknown') ? parsed.model : prev.modelo,
                    cpuBrand: parsed.cpuBrand || prev.cpuBrand,
                    cpuGen: parsed.cpuGen || prev.cpuGen,
                    gpuBrand: parsed.gpuBrand || prev.gpuBrand,
                    gpuModel: parsed.gpuModel || prev.gpuModel,
                    vram: parsed.vram || prev.vram,
                    screenRes: parsed.resolution || prev.screenRes, // Map resolution to screenRes
                    batteryHealth: parsed.batteryHealth || prev.batteryHealth,
                    serialNumber: parsed.serialNumber || prev.serialNumber
                }));

                // RAM Mapping
                if (parsed.ramList && parsed.ramList.length > 0) {
                    setRam({
                        slots: parsed.ramList.length,
                        detalles: parsed.ramList,
                        dualChannel: parsed.ramList.length >= 2
                    });
                } else if (parsed.ram) {
                    setRam({ slots: 1, detalles: [parsed.ram], dualChannel: false });
                }

                // Disk Mapping
                if (parsed.diskList && parsed.diskList.length > 0) {
                    setDisk({
                        slots: parsed.diskList.length,
                        detalles: parsed.diskList
                    });
                } else if (parsed.disk) {
                    setDisk({ slots: 1, detalles: [parsed.disk] });
                }

                // QA Mapping
                if (parsed.qa) {
                    setQaChecklist(prev => ({
                        ...prev,
                        camara: parsed.qa.camera === 'OK',
                        sonido: parsed.qa.audio === 'OK',
                        teclado: parsed.qa.keyboard === 'OK'
                    }));
                }

                setRawSpecs(text);
                toast.success('Información importada desde TXT (V45)');
            } catch (err) {
                console.error(err);
                toast.error('Error al procesar el archivo');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleRamSlotsChange = (slots) => {
        setRam(prev => ({
            ...prev,
            slots,
            detalles: prev.detalles.slice(0, slots),
            dualChannel: slots >= 2 ? prev.dualChannel : false
        }));
    };

    const handleRamDetailChange = (index, value) => {
        const newDetalles = [...(ram.detalles || [])];
        newDetalles[index] = value;
        setRam(prev => ({ ...prev, detalles: newDetalles }));
    };

    const handleDiskSlotsChange = (slots) => {
        setDisk(prev => ({ ...prev, slots, detalles: prev.detalles.slice(0, slots) }));
    };

    const handleDiskDetailChange = (index, value) => {
        const newDetalles = [...(disk.detalles || [])];
        newDetalles[index] = value;
        setDisk(prev => ({ ...prev, detalles: newDetalles }));
    };

    const getInputClass = (field, baseClass) => {
        const isMissing = REQUIRED_FIELDS.includes(field) && (!info[field] || String(info[field]).trim() === '');
        return clsx(baseClass, isMissing ? "border-red-500 ring-1 ring-red-500 bg-red-500/10 placeholder-red-400" : "");
    };

    const handleSave = async (isAuto = false) => {
        if (!ticket.id) return;
        if (saving) return; // Prevent double submission

        try {
            if (!isAuto) setSaving(true);
            const isComplete = checkCompletion(info);

            // Sanitize info object
            const safeInfo = { ...info };

            // Extract core fields to update at root level
            const { marca, modelo, precioCompra, conFactura, description, ...restInfo } = safeInfo;

            Object.keys(restInfo).forEach(key => {
                if (restInfo[key] === undefined) restInfo[key] = '';
            });

            // PRESERVATION LOGIC
            const updates = {
                marca: marca,
                modelo: modelo,
                precioCompra: precioCompra,
                conFactura: conFactura, // Save to root
                description: description, // Save to root for WooCommerce
                costosExtra: safeInfo.costosExtra,
                viatico: safeInfo.viatico,
                publicidad: safeInfo.publicidad,
                publicidad: safeInfo.publicidad,
                additionalInfo: { ...restInfo, rawSpecs }, // SAVE RAW SPECS
                additionalInfoComplete: isComplete,
                ram: { ...ram },
                disco: { ...disk }
            };

            // Calculate QA Progress if changed
            if (JSON.stringify(qaChecklist) !== JSON.stringify(ticket.qaChecklist)) {
                const passedCount = QA_ITEMS.filter(i => qaChecklist[i.key]).length;
                const qaProgress = Math.round((passedCount / QA_ITEMS.length) * 100);

                updates.qaChecklist = qaChecklist;
                updates.qaProgress = qaProgress;
            }

            // Check and set Original Specs Snapshot if missing (First Edit)
            // This prevents "Original" from chasing "Current" on subsequent edits
            if (!ticket.originalSpecs) {
                updates.originalSpecs = {
                    ram: { ...ticket.ram },
                    disco: { ...ticket.disco },
                    timestamp: new Date().toISOString()
                };
            }

            await ticketService.updateTicketAttributes(ticket.id, updates, {
                userId: user.uid,
                reason: 'Actualización Ficha Técnica (+QA)',
                note: isComplete ? 'Ficha Técnica Completada' : 'Ficha Técnica Guardada (Parcial)'
            });

            toast.success('Información técnica y QA guardados');

            try {
                if (onUpdate) onUpdate(updates);
            } catch (localErr) {
                console.warn("Local update failed:", localErr);
                // Do not show error to user as DB save succeeded
            }

            if (isComplete && !isAuto) onClose();

        } catch (error) {
            console.error(error);
            toast.error('Error al guardar');
        } finally {
            if (!isAuto) setSaving(false);
        }
    };

    const isComplete = checkCompletion(info);

    // Calculate Progress Percentage for simple bar
    const filledCount = REQUIRED_FIELDS.filter(field => info[field] && info[field].trim() !== '').length;
    const progress = Math.round((filledCount / REQUIRED_FIELDS.length) * 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">

                {/* Header (Same as QA) */}
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/80">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Info className="text-blue-400" /> Información Técnica
                        </h2>
                        <p className="text-sm text-gray-400">Progreso actual: {progress}%</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* HIDDEN FILE INPUT */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".txt"
                            className="hidden"
                        />

                        {/* UPLOAD BUTTON */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            title="Cargar Specs desde TXT"
                            className="p-2 bg-green-900/30 hover:bg-green-500/20 rounded-full text-green-400 hover:text-green-300 transition-colors border border-green-500/30"
                        >
                            <Upload className="w-5 h-5" />
                        </button>

                        {/* Print Technical Label */}
                        <button
                            onClick={() => {
                                toast.promise(printTask(ticket), {
                                    loading: 'Enviando a impresora técnica...',
                                    success: '¡Enviado!',
                                    error: 'Error al imprimir'
                                });
                            }}
                            title="Imprimir Ficha Técnica (50x70)"
                            className="p-2 bg-blue-900/30 hover:bg-blue-500/20 rounded-full text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30"
                        >
                            <Printer className="w-5 h-5" />
                        </button>

                        {/* Close without saving */}
                        <button onClick={onClose} title="Cancelar" className="p-2 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar (Simple Gradient like QA) */}
                <div className="h-1.5 bg-gray-700 w-full">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                        style={{ width: `${progress}% ` }}
                    />
                </div>

                {/* Form Content */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                    {/* BASIC INFO HEADER (Provider, Factura, Brand, Model) */}
                    <div className="bg-blue-900/10 p-4 rounded-2xl border border-blue-700/30 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {/* 1. Proveedor */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-purple-400 uppercase mb-1">Proveedor</label>
                            <input
                                type="text"
                                value={info.proveedor || ''}
                                onChange={(e) => handleChange('proveedor', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-purple-500 outline-none"
                            />
                        </div>

                        {/* 2. Con Factura */}
                        <div className="col-span-1 flex items-end">
                            <label className="flex items-center gap-3 w-full bg-gray-900 border border-gray-600 rounded-xl p-3 cursor-pointer hover:bg-gray-800 transition-colors">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={info.conFactura || false}
                                        onChange={(e) => handleChange('conFactura', e.target.checked)}
                                        className="peer w-5 h-5 appearance-none border-2 border-gray-500 rounded checked:bg-blue-500 checked:border-blue-500 transition-all"
                                    />
                                    <Check className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                </div>
                                <span className="text-xs font-bold text-gray-300 uppercase select-none">Con Factura</span>
                            </label>
                        </div>

                        {/* 3. Marca */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-blue-400 uppercase mb-1">Marca</label>
                            <input
                                type="text"
                                value={info.marca || ''}
                                onChange={(e) => handleChange('marca', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-blue-500 outline-none"
                            />
                        </div>

                        {/* 4. Modelo */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-blue-400 uppercase mb-1">Modelo</label>
                            <input
                                type="text"
                                value={info.modelo || ''}
                                onChange={(e) => handleChange('modelo', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* RAM & Disk Section (New) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/30 p-4 rounded-2xl border border-gray-700/50">
                        {/* RAM */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-green-400" /> Memoria RAM
                            </label>
                            <div className="flex gap-2 mb-2">
                                {[0, 1, 2, 4].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleRamSlotsChange(num)}
                                        className={clsx(
                                            "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                            ram.slots === num
                                                ? "bg-green-500/20 border-green-500 text-green-400"
                                                : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                                        )}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {Array.from({ length: ram.slots }).map((_, i) => (
                                    <select
                                        key={i}
                                        value={ram.detalles[i] || ''}
                                        onChange={(e) => handleRamDetailChange(i, e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-white outline-none focus:border-green-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {RAM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ))}
                                {ram.slots === 0 && <div className="text-[10px] text-gray-600 italic text-center py-2">Sin RAM (Onboard/Mac)</div>}

                                {/* Dual Channel Checkbox */}
                                {ram.slots >= 2 && (
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={ram.dualChannel || false}
                                                onChange={(e) => setRam(prev => ({ ...prev, dualChannel: e.target.checked }))}
                                                className="peer appearance-none w-4 h-4 border border-green-500/50 rounded bg-gray-800 checked:bg-green-500 checked:border-green-500 transition-all"
                                            />
                                            <Check className="w-3 h-3 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 font-bold" />
                                        </div>
                                        <span className={clsx("text-xs font-bold transition-colors", ram.dualChannel ? "text-green-400" : "text-gray-500 group-hover:text-gray-400")}>
                                            DUAL CHANNEL
                                        </span>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Disk */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-orange-400" /> Almacenamiento
                            </label>
                            <div className="flex gap-2 mb-2">
                                {[0, 1, 2].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleDiskSlotsChange(num)}
                                        className={clsx(
                                            "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                            disk.slots === num
                                                ? "bg-orange-500/20 border-orange-500 text-orange-400"
                                                : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                                        )}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {Array.from({ length: disk.slots }).map((_, i) => (
                                    <div key={i} className="relative">
                                        <input
                                            list={`disk-options-modal-${i}`}
                                            type="text"
                                            value={disk.detalles[i] || ''}
                                            onChange={(e) => handleDiskDetailChange(i, e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-white outline-none focus:border-orange-500 placeholder-gray-600"
                                            placeholder="Ej: 512GB SSD"
                                        />
                                        <datalist id={`disk-options-modal-${i}`}>
                                            {DISK_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                                        </datalist>
                                    </div>
                                ))}
                                {disk.slots === 0 && <div className="text-[10px] text-gray-600 italic text-center py-2">Sin Disco Extraíble</div>}
                            </div>
                        </div>
                    </div>

                    {/* Screen Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tamaño Pantalla</label>
                            <select
                                value={info.screenSize || ''}
                                onChange={(e) => handleChange('screenSize', e.target.value)}
                                className={getInputClass('screenSize', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all")}
                            >
                                <option value="" className="bg-gray-900 text-white">Seleccionar...</option>
                                {SCREEN_SIZES.map(s => <option key={s} value={s} className="bg-gray-900 text-white">{s}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Resolución</label>
                            <select
                                value={info.screenRes || ''}
                                onChange={(e) => handleChange('screenRes', e.target.value)}
                                className={getInputClass('screenRes', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all")}
                            >
                                <option value="" className="bg-gray-900 text-white">Seleccionar...</option>
                                {RESOLUTIONS.map(r => <option key={r} value={r} className="bg-gray-900 text-white">{r}</option>)}
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
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Procesador (Marca)</label>
                                <select
                                    value={info.cpuBrand || ''}
                                    onChange={(e) => handleChange('cpuBrand', e.target.value)}
                                    className={getInputClass('cpuBrand', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all")}
                                >
                                    <option value="" className="bg-gray-900 text-white">Seleccionar Marca...</option>
                                    {Object.keys(PROCESSORS).map(p => <option key={p} value={p} className="bg-gray-900 text-white">{p}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Generación / Serie</label>
                                <select
                                    value={info.cpuGen || ''}
                                    onChange={(e) => handleChange('cpuGen', e.target.value)}
                                    disabled={!info.cpuBrand}
                                    className={getInputClass('cpuGen', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all disabled:opacity-50")}
                                >
                                    <option value="" className="bg-gray-900 text-white">Seleccionar Generación...</option>
                                    {info.cpuBrand && PROCESSORS[info.cpuBrand]?.map(g => (
                                        <option key={g} value={g} className="bg-gray-900 text-white">{g}</option>
                                    ))}
                                </select>
                            </div>

                            {/* GPU */}
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Gráficos (Marca)</label>
                                <select
                                    value={info.gpuBrand || ''}
                                    onChange={(e) => handleChange('gpuBrand', e.target.value)}
                                    className={getInputClass('gpuBrand', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all")}
                                >
                                    <option value="" className="bg-gray-900 text-white">Seleccionar Marca...</option>
                                    {Object.keys(GPUS).map(g => <option key={g} value={g} className="bg-gray-900 text-white">{g}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 flex gap-2">
                                <div className="flex-[2]">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Modelo GPU</label>
                                    {info.gpuBrand === 'Otros' ? (
                                        <input
                                            type="text"
                                            value={info.gpuModel || ''}
                                            onChange={(e) => handleChange('gpuModel', e.target.value)}
                                            placeholder="Especifique modelo..."
                                            className={getInputClass('gpuModel', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all placeholder:text-gray-600")}
                                        />
                                    ) : (
                                        <select
                                            value={info.gpuModel || ''}
                                            onChange={(e) => handleChange('gpuModel', e.target.value)}
                                            disabled={!info.gpuBrand}
                                            className={getInputClass('gpuModel', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all disabled:opacity-50")}
                                        >
                                            <option value="" className="bg-gray-900 text-white">Seleccionar Modelo...</option>
                                            {info.gpuBrand && GPUS[info.gpuBrand]?.map(m => (
                                                <option key={m} value={m} className="bg-gray-900 text-white">{m}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="flex-1 min-w-[80px]">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">VRAM</label>
                                    <select
                                        value={info.vram || ''}
                                        onChange={(e) => handleChange('vram', e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-blue-500 outline-none"
                                    >
                                        <option value="" className="bg-gray-900 text-white">-</option>
                                        {["Shared", "2GB", "4GB", "6GB", "8GB", "10GB", "12GB", "16GB", "20GB", "24GB"].map(v => (
                                            <option key={v} value={v} className="bg-gray-900 text-white">{v}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                        </div>
                    </div>




                    {/* BOTTOM ROW: Serial & Battery */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Número de Serie (S/N)</label>
                            <input
                                type="text"
                                value={info.serialNumber || ''}
                                onChange={(e) => handleChange('serialNumber', e.target.value)}
                                placeholder="Escanea o escribe el S/N..."
                                className={getInputClass('serialNumber', "w-full bg-gray-900 border rounded-xl p-2.5 text-white outline-none focus:ring-2 transition-all font-mono tracking-wider")}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-yellow-500" /> Salud Batería
                            </label>
                            <select
                                value={info.batteryHealth || ''}
                                onChange={(e) => handleChange('batteryHealth', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-yellow-500 outline-none"
                            >
                                <option value="" className="bg-gray-900 text-white">Estado...</option>
                                {BATTERY_HEALTH.map(b => <option key={b} value={b} className="bg-gray-900 text-white">{b}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* --- RESUMEN FINAL --- */}
                    <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700/50 mb-6 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-4 text-white font-bold text-lg border-b border-gray-700 pb-2">
                            <CheckCircle className="text-green-500 w-5 h-5" /> Resumen de Cierre
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 1. Basic Identity */}
                            <div className="space-y-3">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Equipo</div>
                                <div className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                                    <Smartphone className="text-blue-400 w-5 h-5" />
                                    <div>
                                        <div className="text-sm font-bold text-white">{info.marca} {info.modelo}</div>
                                        <div className="text-xs text-blue-300 font-mono">{info.cpuBrand} {info.cpuGen}</div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Changes Summary (RAM & Disk) */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Modificaciones de Hardware</div>

                                {/* RAM Comparison */}
                                {(() => {
                                    // 1. Get String Representations
                                    const origVal = ticket.ram?.original ?? (ticket.ram?.detalles?.join(' + ') || 'N/A');
                                    const currVal = ram.detalles?.filter(Boolean).join(' + ') || 'N/A';
                                    const changed = origVal !== currVal;

                                    // 2. Calculate Financials
                                    const parseAndSum = (str) => {
                                        if (!str || str === 'N/A') return 0;
                                        return str.split('+').reduce((sum, item) => sum + getRamPrice(item.trim()), 0);
                                    };

                                    const oldPrice = parseAndSum(origVal);
                                    const newPrice = parseAndSum(currVal);
                                    const diff = newPrice - oldPrice;

                                    return (
                                        <div className={clsx("flex items-center justify-between p-2.5 rounded-lg border transition-colors", changed ? "bg-amber-900/20 border-amber-500/50" : "bg-gray-900/50 border-gray-700/50")}>
                                            <div className="flex items-center gap-2">
                                                <CircuitBoard className={clsx("w-4 h-4", changed ? "text-amber-400" : "text-gray-500")} />
                                                <span className="text-xs font-bold text-gray-400">RAM</span>
                                            </div>

                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-3 text-sm">
                                                    {changed ? (
                                                        <>
                                                            <span className="text-gray-500 line-through text-xs">{origVal}</span>
                                                            <ArrowRight className="w-3 h-3 text-amber-500" />
                                                            <span className="text-amber-300 font-bold">{currVal}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-300">{currVal}</span>
                                                    )}
                                                </div>
                                                {/* Price Differential */}
                                                {changed && diff !== 0 && (
                                                    <div className={clsx("text-[10px] font-mono mt-1 px-1.5 py-0.5 rounded", diff > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                                                        {diff > 0 ? '+' : ''} ${diff.toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Disk Comparison */}
                                {(() => {
                                    const origVal = ticket.disco?.original ?? (ticket.disco?.detalles?.join(' + ') || 'N/A');
                                    const currVal = disk.detalles?.filter(Boolean).join(' + ') || 'N/A';
                                    const changed = origVal !== currVal;

                                    return (
                                        <div className={clsx("flex items-center justify-between p-2.5 rounded-lg border transition-colors", changed ? "bg-purple-900/20 border-purple-500/50" : "bg-gray-900/50 border-gray-700/50")}>
                                            <div className="flex items-center gap-2">
                                                <HardDrive className={clsx("w-4 h-4", changed ? "text-purple-400" : "text-gray-500")} />
                                                <span className="text-xs font-bold text-gray-400">Disco</span>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm">
                                                {changed ? (
                                                    <>
                                                        <span className="text-gray-500 line-through text-xs">{origVal}</span>
                                                        <ArrowRight className="w-3 h-3 text-purple-500" />
                                                        <span className="text-purple-300 font-bold">{currVal}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-300">{currVal}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* --- DESCRIPTION SECTION (AI POWERED) --- */}
                    <div className="bg-gradient-to-r from-gray-900 to-slate-900 p-5 rounded-2xl border border-blue-900/30 shadow-xl mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-blue-300 uppercase flex items-center gap-2">
                                <Monitor className="w-4 h-4" /> Descripción de Venta (HTML)
                            </label>

                            <button
                                type="button"
                                onClick={async () => {
                                    setIsGenerating(true);
                                    try {
                                        // 1. Calculate Scores
                                        const scores = descriptionGenerator.calculateSystemScore(
                                            { ...ticket, ...info }, // Merge form info
                                            ram,
                                            disk
                                        );

                                        // 2. Determine Dedicated GPU
                                        const hasDedicatedGpu =
                                            (info.gpuBrand === 'NVIDIA' || info.gpuBrand === 'AMD') ||
                                            (scores.gpuScore > 40);

                                        // 3. Get Apps
                                        const compatibleApps = descriptionGenerator.getCompatibleApps(scores, hasDedicatedGpu);

                                        // 3. Generate HTML
                                        const generatedHtml = descriptionGenerator.generateDescriptionHtml(
                                            { ...ticket, ...info, additionalInfo: { ...info, ram, disco: disk } },
                                            scores,
                                            compatibleApps
                                        );

                                        handleChange('description', generatedHtml);
                                        toast.success(`Descrip. Generada (CPU:${scores.cpuScore}, RAM:${scores.ramScore})`);
                                    } catch (err) {
                                        console.error(err);
                                        toast.error(err.message);
                                    } finally {
                                        setIsGenerating(false);
                                    }
                                }}
                                disabled={isGenerating || !info.marca}
                                className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full text-xs font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Wand2 className="w-3.5 h-3.5" />
                                )}
                                {isGenerating ? 'Creando Magia...' : 'Generar con IA'}
                            </button>
                        </div>

                        <div className="relative group">
                            <textarea
                                value={info.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                rows={6}
                                className="w-full bg-black/40 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 font-mono focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all resize-y"
                                placeholder="La descripción generada aparecerá aquí..."
                            />
                            <div className="absolute right-3 bottom-3 text-[10px] text-gray-600 pointer-events-none">
                                HTML Format
                            </div>
                        </div>
                    </div>

                    {/* --- READ ONLY RAW SPECS (ALWAYS VISIBLE) --- */}
                    <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-700/50 mb-6">
                        <label className="text-sm font-bold text-gray-400 uppercase flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4" /> Detalle Completo Importado
                        </label>
                        <textarea
                            readOnly
                            value={rawSpecs}
                            placeholder="El contenido del archivo TXT importado aparecerá aquí..."
                            className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-xs text-gray-400 font-mono h-40 focus:outline-none resize-none custom-scrollbar"
                        />
                    </div>

                    {/* Footer Buttons (Standard) */}
                    <div className="p-5 bg-gray-900/50 border-t border-gray-700/50 flex flex-col items-center gap-2">
                        <button
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className={clsx(
                                "w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2",
                                isComplete
                                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-green-500/20"
                                    : "bg-gray-700 hover:bg-gray-600 text-gray-200"
                            )}
                        >
                            {saving ? "Guardando..." : isComplete ? "Guardar y Continuar" : "Continuar Después"}
                        </button>
                        {!isComplete && <p className="text-gray-500 text-xs">Completa los campos requeridos para finalizar.</p>}
                    </div>
                </div >
            </div >
        </div >
    );
}
