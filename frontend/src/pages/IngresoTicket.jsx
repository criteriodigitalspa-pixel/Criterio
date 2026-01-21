
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ticketService } from '../services/ticketService';
import { configService } from '../services/configService';
import { printService } from '../services/printService';
import PremiumDropdown from '../components/common/PremiumDropdown';
import { useAuth } from '../context/AuthContext';
import { useProcessing } from '../context/ProcessingContext';
import { useHardware } from '../hooks/useHardware';
import { Save, Printer, Package, DollarSign, Database, Monitor, Disc, Upload, FileText } from 'lucide-react';
import clsx from 'clsx';
import PrintLabelInitial, { INITIAL_LABEL_ID } from '../components/PrintLabelInitial';
import BatchPreviewModal from '../components/BatchPreviewModal';
import { CheckSquare, Users, ShoppingBag, Cpu, Briefcase } from 'lucide-react';
import { QA_ITEMS } from '../data/constants';
import { PROCESSORS } from '../data/hardware-constants';
import { parseSpecsFile } from '../utils/specsParser';

// ... (Keep existing imports/constants options)


const RAM_OPTIONS = [
    "4GB", "8GB", "16GB", "32GB", "64GB", "128GB"
];

const DISK_OPTIONS = [
    "128GB SSD", "240GB SSD", "256GB SSD", "480GB SSD", "500GB SSD", "512GB SSD", "1TB SSD", "500GB HDD", "1TB HDD"
];

export default function IngresoTicket() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { runBackgroundTask, printTask } = useProcessing();
    const { processors, gpus, screens, resolutions, vrams } = useHardware();
    const [loading, setLoading] = useState(false);
    // State for Last Created Ticket (PDF Download)
    const [lastCreatedTicket, setLastCreatedTicket] = useState(null);
    // Removed old state logic
    const [lastCreatedBatch, setLastCreatedBatch] = useState([]); // For Batch Printing (Keep for Modal?) 
    // Actually batch mode uses batchList. lastCreatedBatch was for success panel.
    // Let's remove it too to be safe.

    // BATCH MODE STATE
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchQuantity, setBatchQuantity] = useState(1);
    const [batchList, setBatchList] = useState([]); // Array of temp tickets
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isSavingBatch, setIsSavingBatch] = useState(false);

    // --- MANUAL ACTIONS (Replaces Auto-Effects) ---
    const handleManualPrint = async () => {
        const toastId = toast.loading("Enviando a impresora...");
        try {
            if (lastCreatedBatch.length > 0) {
                // Loop print for batch (Standard Throttle handled in service? No, service prints ONE. we loop here or service bulk?)
                // Service doesn't have bulk print to firestore method yet, only single.
                // We'll loop here.
                for (let i = 0; i < lastCreatedBatch.length; i++) {
                    await printTask(lastCreatedBatch[i]); // Use Global Context Printer
                    // Small throttle
                    await new Promise(r => setTimeout(r, 600));
                }
            } else if (lastCreatedTicket) {
                await printTask(lastCreatedTicket); // Use Global Context Printer
            }
            toast.success("Enviado a cola de impresión", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Error de impresión", { id: toastId });
        }
    };

    const handleManualDownload = async () => {
        const toastId = toast.loading("Generando archivo...");
        try {
            if (lastCreatedBatch.length > 0) {
                await printService.downloadBatchZip(lastCreatedBatch, 'initial');
                toast.success("ZIP Descargado", { id: toastId });
            } else if (lastCreatedTicket) {
                const pdf = await printService.createPdfObject([lastCreatedTicket], 'initial');
                pdf.save(`${lastCreatedTicket.ticketId}.pdf`);
                toast.success("PDF Descargado", { id: toastId });
            }
        } catch (e) {
            console.error(e);
            toast.error("Error generando descarga", { id: toastId });
        }
    };

    const resetForm = () => {
        setLastCreatedTicket(null);
        setLastCreatedBatch([]);
        setFormData({
            marca: '', modelo: '', proveedor: '', precioCompra: '',
            cpuBrand: '', cpuGen: '',
            conFactura: false,
            ram: { slots: 0, detalles: [] },
            disco: { slots: 0, detalles: [] }
        });
        setBatchList([]);
        setBatchQuantity(1);
        setIsBatchMode(false); // Optional: stay in batch mode? User might prefer staying. 
        // Let's keep batch mode state but clear list.
    };


    const [formData, setFormData] = useState({
        marca: '',
        modelo: '',
        proveedor: '',
        precioCompra: '',

        // Optional CPU Info (Intake)
        cpuBrand: '',
        cpuGen: '',

        conFactura: false,
        tempBrandFilter: 'Intel', // Default filter logic requires a start value

        // Advanced Logic
        ram: { slots: 0, detalles: [] },
        disco: { slots: 0, detalles: [] },

        // Extended Manual Specs (Optional)
        screenSize: '',
        screenType: '', // Resolution/Type
        gpuBrand: '',
        gpuModel: '',
        gpuVram: '',
        gpu: '' // Combo field if needed
    });

    const [suggestions, setSuggestions] = useState({ brands: [], models: [] });

    useEffect(() => {
        const loadSuggestions = async () => {
            try {
                const data = await configService.getLists();
                // Ensure brands has a fallback immediately if empty from DB
                const fallbackBrands = ['HP', 'LENOVO', 'DELL', 'ASUS', 'ACER', 'APPLE', 'SAMSUNG', 'LG', 'MSI', 'HUAWEI', 'OTROS'];

                const finalBrands = (data?.brands && data.brands.length > 0)
                    ? data.brands
                    : fallbackBrands;

                setSuggestions({
                    brands: finalBrands,
                    models: data?.models || []
                });

                // Set default brand if none selected
                setFormData(prev => {
                    if (!prev.marca) return { ...prev, marca: finalBrands[0] };
                    return prev;
                });

            } catch (error) {
                console.error("Error loading suggestions", error);
                // Fallback on error
                setSuggestions(prev => ({
                    ...prev,
                    brands: ['HP', 'LENOVO', 'DELL', 'ASUS', 'ACER', 'APPLE', 'OTROS']
                }));
            }
        };
        loadSuggestions();
    }, []);

    // --- RAM LOGIC ---
    const handleRamSlotsChange = (count) => {
        const slots = Number(count);
        setFormData(prev => ({
            ...prev,
            ram: {
                slots: slots,
                detalles: Array(slots).fill('').map((_, i) => prev.ram.detalles[i] || '')
            }
        }));
    };

    const handleRamDetailChange = (index, value) => {
        const newDetalles = [...formData.ram.detalles];
        newDetalles[index] = value;
        setFormData(prev => ({
            ...prev,
            ram: { ...prev.ram, detalles: newDetalles }
        }));
    };

    // --- DISK LOGIC ---
    const handleDiskSlotsChange = (count) => {
        const slots = Number(count);
        setFormData(prev => ({
            ...prev,
            disco: {
                slots: slots,
                detalles: Array(slots).fill('').map((_, i) => prev.disco?.detalles?.[i] || '')
            }
        }));
    };

    const handleDiskDetailChange = (index, value) => {
        const newDetalles = [...formData.disco.detalles];
        newDetalles[index] = value;
        setFormData(prev => ({
            ...prev,
            disco: { ...prev.disco, detalles: newDetalles }
        }));
    };

    // --- BATCH LOGIC ---
    const qtyTimeoutRef = useRef(null);

    const handleQuantityBlur = (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 1) {
            setBatchQuantity(1);
        } else if (val > 50) {
            setBatchQuantity(50);
            toast.error("Máximo 50 equipos por lote.");
        }
    };

    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const loadingToast = toast.loading(`Procesando ${files.length} archivos...`);
        const newItems = [];

        try {
            for (const file of files) {
                const text = await file.text();
                const parsed = parseSpecsFile(text);

                // Map parsed data to form structure
                // --- CPU MAPPING ---
                // Now handled robustly by specsParser.js
                // Use the parser's result, or fallback to 'Other' if it failed completely
                let cpuBrand = parsed.cpuBrand || 'Other';
                let cpuGen = parsed.cpuGen || '';

                // If parser said "Intel Core Generic", maybe we default to i5? 
                // No, better to leave as Generic or let user edit.
                // The parser logic is now "bulletproof" for i3/i5/i7/i9/Ryzen matches.

                // VALIDATION & CONSISTENCY LOGIC
                // 1. Inherit from Form Global Config (if set) implies "Batch Config"
                // User requirement: "ID LOTE debera ser el mismo, PROVEEDOR tambien"
                const commonProvider = formData.proveedor && formData.proveedor.trim() !== '' ? formData.proveedor : 'Stock / Compra';
                const commonPrice = formData.precioCompra && !isNaN(formData.precioCompra) ? formData.precioCompra : 0;

                // 2. Decide Main Brand/Model Source
                // If the parser found a brand/model, use it. IF NOT, fall back to global form data (e.g. for batch of identical generic units)
                const finalBrand = (parsed.brand && parsed.brand !== 'GENERICO') ? parsed.brand : (formData.marca || 'GENERICO');
                const finalModel = (parsed.model && parsed.model !== 'Unknown') ? parsed.model : (formData.modelo || 'Unknown');

                // 3. RAM & Disks (Multi-slot)
                const finalRamSlots = parsed.ramList && parsed.ramList.length > 0 ? parsed.ramList.length : 1;
                const finalRamDetails = parsed.ramList && parsed.ramList.length > 0 ? parsed.ramList : [parsed.ram || ''];

                const finalDiskSlots = parsed.diskList && parsed.diskList.length > 0 ? parsed.diskList.length : 1;
                const finalDiskDetails = parsed.diskList && parsed.diskList.length > 0 ? parsed.diskList : [parsed.disk || ''];

                newItems.push({
                    marca: finalBrand,
                    modelo: finalModel,
                    proveedor: commonProvider,
                    precioCompra: commonPrice,
                    alias: formData.modeloAlias || '', // Inherit alias if standardizing names
                    cpuBrand: cpuBrand,
                    cpuGen: cpuGen,
                    conFactura: formData.conFactura || false, // Inherit invoice status
                    ram: {
                        slots: finalRamSlots,
                        detalles: finalRamDetails
                    },
                    disco: {
                        slots: finalDiskSlots,
                        detalles: finalDiskDetails
                    },
                    serial: parsed.serial,
                    additionalInfo: {
                        batteryHealth: parsed.batteryHealth || '',
                        serialNumber: parsed.serial || '',
                        cpuBrand: cpuBrand,
                        cpuGen: cpuGen,
                        gpuBrand: parsed.gpuBrand || '',
                        gpuModel: parsed.gpuModel || '',
                        vram: parsed.vram || '',
                        gpu: parsed.gpu || ''
                    },
                    qaChecklist: {
                        camara: parsed.qa?.camera === 'OK',
                        sonido: parsed.qa?.audio === 'OK',
                        teclado: parsed.qa?.keyboard === 'OK',
                    },
                    qaProgress: Math.round(([
                        parsed.qa?.camera === 'OK',
                        parsed.qa?.audio === 'OK',
                        parsed.qa?.keyboard === 'OK'
                    ].filter(Boolean).length / QA_ITEMS.length) * 100),
                    tempId: Date.now() + Math.random(),
                    createdAt: new Date().toISOString()
                });
            }

            // Switch to Batch Mode and Show Preview
            setIsBatchMode(true);
            setBatchList(prev => [...prev, ...newItems]);
            setBatchQuantity(1); // Reset manual qty
            setIsBatchModalOpen(true);
            toast.dismiss(loadingToast);
            toast.success(`${newItems.length} equipos importados correctamente`);

        } catch (error) {
            console.error(error);
            toast.error("Error al procesar archivos");
            toast.dismiss(loadingToast);
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleQuantityChange = (e) => {
        const val = e.target.value;
        if (val === '') {
            setBatchQuantity('');
            setBatchList([]);
            return;
        }

        const newQty = parseInt(val);
        if (isNaN(newQty)) return;

        setBatchQuantity(newQty); // Update UI Immediately

        if (qtyTimeoutRef.current) clearTimeout(qtyTimeoutRef.current);

        if (newQty > 1 && newQty <= 50) {
            // Re-generate list on change (debounced) instead of annoying alert
            // Or keep the alert if that was business logic? 
            // The user said "give me accept to ram distinct message".
            // So we must preserve that alert logic or improve it.
            // Let's preserve strictly but allow typing.
            qtyTimeoutRef.current = setTimeout(() => {
                const confirm = window.confirm("¿Todos los equipos tienen la misma cantidad de RAM y Disco?");
                if (!confirm) {
                    setBatchQuantity(1);
                    setBatchList([]);
                } else {
                    const newItems = Array.from({ length: newQty }).map((_, i) => ({
                        ...formData,
                        tempId: Date.now() + i,
                        createdAt: new Date().toISOString()
                    }));
                    setBatchList(newItems);
                }
            }, 1000);
        }
    };

    const addToBatch = (e) => {
        e.preventDefault();

        if (!formData.marca || !formData.modelo || !formData.precioCompra) {
            toast.error("Complete Marca, Modelo y Precio.");
            return;
        }

        const newItems = Array.from({ length: batchQuantity }).map((_, i) => ({
            ...formData,
            tempId: Date.now() + i, // Temporary ID for list management
            createdAt: new Date().toISOString()
        }));

        setBatchList(prev => [...prev, ...newItems]);
        toast.success(`${batchQuantity} equipo(s) agregado(s) al lote`);

        // Reset or Keep? Usually logic implies reset to add next batch, 
        // OR keep to add similar ones. Let's reset for safety.
        setFormData(prev => ({
            ...prev,
            marca: '', modelo: '', precioCompra: '',
            ram: { slots: 0, detalles: [] }, disco: { slots: 0, detalles: [] }
        }));
        setBatchQuantity(1); // Reset Qty
    };

    const handleSaveBatch = async () => {
        setIsSavingBatch(true);
        setIsBatchModalOpen(false); // Close Modal immediately

        // --- BACKGROUND JOB START ---
        runBackgroundTask(`Ingresando Lote(${batchList.length} equipos)...`, async (updateProgress) => {

            // 1. Prepare Data
            const ticketsToSave = batchList.map(item => {
                const { tempId, cpuBrand, cpuGen, additionalInfo, ...ticketData } = item;
                return {
                    ...ticketData,
                    additionalInfo: {
                        ...(additionalInfo || {}),
                        cpuBrand: cpuBrand,
                        cpuGen: cpuGen,
                        screenSize: item.screenSize,
                        screenType: item.screenType,
                        gpuBrand: item.gpuBrand,
                        gpuModel: item.gpuModel,
                        vram: item.gpuVram
                    },
                    nombreCliente: 'Stock / Compra',
                    motivo: 'Ingreso Lote',
                    originalSpecs: {
                        ram: ticketData.ram,
                        disco: ticketData.disco
                    }
                };
            });

            // 1. VALIDATION CHECK
            // Ensure all items have Provider, Price, Brand, Model
            const incompleteItems = batchList.filter(item =>
                !item.marca || !item.modelo ||
                !item.proveedor || item.proveedor.trim() === '' ||
                !item.precioCompra || Number(item.precioCompra) <= 0
            );

            if (incompleteItems.length > 0) {
                toast.error(`Error: ${incompleteItems.length} equipos no tienen Marca, Modelo, Proveedor o Precio válido.`, {
                    duration: 5000,
                    icon: '🚨'
                });
                return; // STOP execution
            }

            // 2. Create in Firestore
            updateProgress(10);
            const result = await ticketService.createBatch(ticketsToSave, user.email || user.uid);
            updateProgress(40);

            // 3. Print Loop
            const tickets = result.tickets;
            const total = tickets.length;

            for (let i = 0; i < total; i++) {
                await printTask(tickets[i]); // Use Global Context Printer
                // Calculate progress from 40 to 90
                const percent = 40 + Math.round(((i + 1) / total) * 50);
                updateProgress(percent);
                await new Promise(r => setTimeout(r, 800)); // Throttle
            }

            // 4. Download PDF/ZIP
            updateProgress(95);
            // SKIPPED ZIP: DOM elements for zip might not be available in background.
            // Rely on Physical Print.
            // const zip = await printService.downloadBatchZip(tickets, 'initial');

        });
        // --- BACKGROUND JOB END ---

        // Navigate immediately
        navigate('/tickets');
        toast.success("Procesando en segundo plano...");

        // Reset state
        setBatchList([]);
        setBatchQuantity(1);
    };

    const handleUpdateBatchItem = (index, updates) => {
        setBatchList(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], ...updates };
            return newList;
        });
    };

    const handleRemoveBatchItem = (index) => {
        setBatchList(prev => prev.filter((_, i) => i !== index));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const isSubmittingRef = useRef(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setLoading(true);

        // Strict Validation
        if (!formData.marca || !formData.modelo || !formData.precioCompra) {
            toast.error("Complete Marca, Modelo y Precio.");
            setLoading(false);
            isSubmittingRef.current = false;
            return;
        }

        try {
            // Construct payload
            const { cpuBrand, cpuGen, tempBrandFilter, ...baseData } = formData;

            // Merge CPU info into additionalInfo if present
            const finalData = {
                ...baseData,
                additionalInfo: {
                    cpuBrand: cpuBrand,
                    cpuGen: cpuGen,
                    // Manual Extended Specs
                    screenSize: baseData.screenSize,
                    screenType: baseData.screenType,
                    gpuBrand: baseData.gpuBrand,
                    gpuModel: baseData.gpuModel,
                    vram: baseData.gpuVram,
                    gpu: baseData.gpu
                },
                nombreCliente: 'Stock / Compra',
                motivo: 'Ingreso Compra',
                originalSpecs: {
                    ram: baseData.ram,
                    disco: baseData.disco
                }
            };

            const creatorId = user.email || user.uid;

            // Execute Creation
            // We await everything here to be sure
            const result = await ticketService.addTicket(finalData, creatorId);

            // Print Auto (Background)
            const newTicket = { ...finalData, ticketId: result.ticketId, id: result.id };
            printTask(newTicket).catch(err => {
                console.error("Background Print Error:", err);
                toast.error("Error imprimiendo etiqueta (Ticket creado).");
            });

            toast.success("Ticket Ingresado Exitosamente");

            // RESET & NAVIGATE IMMEDIATELY
            resetForm();
            navigate('/tickets');

        } catch (error) {
            console.error(error);
            toast.error(error.message || "Error al ingresar ticket");
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <div className="max-w-3xl mx-auto">

                {/* Header Branding */}
                <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative p-4 bg-gray-800 rounded-full ring-1 ring-white/10">
                            <Package className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    <h1 className="mt-4 text-4xl font-black text-white tracking-tight">
                        Nuevo <span className="text-blue-500">Ingreso</span>
                    </h1>

                    {/* BATCH MODE TOGGLE */}
                    <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-full p-1 flex items-center gap-2">
                        <label className={clsx(
                            "cursor-pointer px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 select-none",
                            isBatchMode ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                        )}>
                            <input
                                type="checkbox"
                                checked={isBatchMode}
                                onChange={(e) => {
                                    setIsBatchMode(e.target.checked);
                                    // Reset Form Data on Toggle
                                    setFormData({
                                        marca: '', modelo: '', modeloAlias: '', precioCompra: '',
                                        cpuBrand: '', cpuGen: '',
                                        conFactura: false,
                                        ram: { slots: 0, detalles: [] },
                                        disco: { slots: 0, detalles: [] }
                                    });
                                    setBatchList([]);
                                    setBatchQuantity(1);
                                }}
                                className="hidden"
                            />
                            <CheckSquare className="w-4 h-4" />
                            Modo Lote
                        </label>
                    </div>

                    <p className="text-gray-400 font-medium tracking-wide text-sm mt-2 uppercase">Sistema de Gestión de Inventario</p>
                </div>

                {/* FILE UPLOAD HIDDEN INPUT */}
                <input
                    type="file"
                    multiple
                    accept=".txt"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />

                {/* IMPORT BUTTON */}
                <div className="flex justify-center mb-6">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                    >
                        <Upload className="w-5 h-5 text-blue-400" />
                        Cargar TXT (Lote)
                    </button>
                </div>

                <form onSubmit={isBatchMode ? addToBatch : handleSubmit} className={clsx(
                    "backdrop-blur-xl border rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-all",
                    isBatchMode ? "bg-blue-900/10 border-blue-500/30" : "bg-gray-800/50 border-gray-700/50"
                )}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600"></div>

                    {/* Hidden Label for Capture (During Form? No, only needed after success. Moving it out or duplicating?) 
                        Actually, existing code had it inside the form. 
                        We moved it into the success block above. 
                        So we can remove it from here? 
                        Wait, if we haven't submitted yet, lastCreatedTicket is null. 
                        So PrintLabelInitial is null. 
                        It's fine. 
                    */}

                    {/* BATCH QUANTITY FIELD */}
                    {isBatchMode && (
                        <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-blue-500/20 p-3 rounded-xl">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-blue-200 font-bold text-lg">Ingreso Masivo</h3>
                                <p className="text-blue-300/60 text-sm">Ingrese equipos idénticos de una sola vez.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-blue-300">CANTIDAD:</label>
                                <input
                                    type="number"
                                    min="1" max="50"
                                    value={batchQuantity}
                                    onChange={handleQuantityChange}
                                    onBlur={handleQuantityBlur}
                                    onFocus={(e) => e.target.select()}
                                    className="w-24 bg-gray-900 border border-blue-500/50 rounded-xl px-3 py-2 text-center text-xl font-bold text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}



                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Brand Selection - Enhanced UI */}
                        <div className="md:col-span-1">
                            <PremiumDropdown
                                label="Marca"
                                options={suggestions.brands}
                                value={formData.marca}
                                onChange={(e) => handleChange(e)}
                                placeholder="Seleccionar Marca..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-blue-400" /> Modelo
                            </label>
                            <input
                                list="model-options"
                                type="text" name="modelo" required placeholder="Ej: ThinkPad T480"
                                value={formData.modelo || ''} onChange={handleChange}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                            />
                            <datalist id="model-options">
                                {suggestions.models?.map(model => <option key={model} value={model} />)}
                            </datalist>
                        </div>
                    </div>

                    {/* Logical Specs */}
                    <div className="bg-gray-900/40 rounded-2xl p-6 border border-gray-700/50 mb-8 space-y-8">
                        <h3 className="text-lg font-bold text-gray-200 flex items-center gap-2 border-b border-gray-700/50 pb-2">
                            <Database className="w-5 h-5 text-green-400" /> Especificaciones Clave
                        </h3>

                        {/* CPU LOGIC - ADVANCED (MATCHING FICHA) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-purple-400" /> Procesador (Cerebro)
                            </label>

                            {/* 1. BRAND BUTTONS (Filter) */}
                            <div className="flex gap-2 w-full md:w-auto mb-4">
                                {['Intel', 'AMD', 'Apple'].map(brand => (
                                    <button
                                        key={brand}
                                        type="button"
                                        onClick={() => {
                                            const filter = brand;
                                            if (brand === 'Apple') {
                                                setFormData(prev => ({ ...prev, tempBrandFilter: 'Apple', cpuBrand: 'Apple Silicon', cpuGen: '' }));
                                            } else {
                                                setFormData(prev => ({ ...prev, tempBrandFilter: brand, cpuBrand: '', cpuGen: '' }));
                                            }
                                        }}
                                        className={clsx(
                                            "flex-1 md:flex-none px-4 py-3 rounded-xl font-bold transition-all border shadow-sm",
                                            (formData.tempBrandFilter === brand || (formData.cpuBrand && formData.cpuBrand.includes(brand)))
                                                ? brand === 'Intel' ? "bg-blue-600 border-blue-400 text-white shadow-blue-900/50" :
                                                    brand === 'AMD' ? "bg-red-600 border-red-400 text-white shadow-red-900/50" :
                                                        "bg-gray-200 border-white text-black shadow-white/20"
                                                : "bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                                        )}
                                    >
                                        {brand}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                {/* 2. MODEL SELECT (Driven by Filter) */}
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Database className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <select
                                        name="cpuBrand" // This is the REAL field compatible with Ficha
                                        value={formData.cpuBrand || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, cpuBrand: e.target.value, cpuGen: '' }))}
                                        disabled={!formData.tempBrandFilter && !formData.cpuBrand}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-medium appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {!formData.tempBrandFilter && !formData.cpuBrand ? "Selecciona Familia (Arriba)..." : "Selecciona Modelo..."}
                                        </option>

                                        {/* Filter Object.keys(PROCESSORS) */}
                                        {(() => {
                                            const filter = formData.tempBrandFilter || (formData.cpuBrand ? formData.cpuBrand.split(' ')[0] : '');
                                            if (!filter) return null;

                                            return Object.keys(PROCESSORS)
                                                .filter(key => key.includes(filter))
                                                .map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ));
                                        })()}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>

                                {/* 3. GENERATION SELECT (Driven by Model) */}
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Cpu className={clsx("h-5 w-5 transition-colors", formData.cpuBrand ? "text-white" : "text-gray-600")} />
                                    </div>
                                    <select
                                        name="cpuGen"
                                        disabled={!formData.cpuBrand}
                                        value={formData.cpuGen || ''}
                                        onChange={handleChange}
                                        className={clsx(
                                            "w-full bg-gray-900 border rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 transition-all font-medium appearance-none",
                                            !formData.cpuBrand
                                                ? "border-gray-800 cursor-not-allowed text-gray-600"
                                                : "border-gray-600 focus:border-purple-500 focus:ring-purple-500"
                                        )}
                                    >
                                        <option value="">{formData.cpuBrand ? "Seleccionar Generación..." : "..."}</option>
                                        {formData.cpuBrand && PROCESSORS[formData.cpuBrand]?.map(gen => (
                                            <option key={gen} value={gen}>{gen}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RAM LOGIC */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3">¿Cuántas Tarjetas RAM tiene instaladas?</label>
                            <div className="flex gap-4">
                                {[0, 1, 2].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleRamSlotsChange(num)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-bold transition-all border",
                                            formData.ram.slots === num
                                                ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)]"
                                                : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                                        )}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>

                            {/* RAM Dropdowns */}
                            {formData.ram.slots > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                    {Array.from({ length: formData.ram.slots }).map((_, i) => (
                                        <div key={i}>
                                            <select
                                                value={formData.ram.detalles[i] || ''}
                                                onChange={(e) => handleRamDetailChange(i, e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                            >
                                                <option value="">Seleccionar RAM {i + 1}...</option>
                                                {RAM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* DISK LOGIC (NEW) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                <Disc className="w-4 h-4 text-orange-400" /> ¿Cuántas Unidades de Almacenamiento?
                            </label>
                            <div className="flex gap-4">
                                {[0, 1, 2].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleDiskSlotsChange(num)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-bold transition-all border",
                                            formData.disco.slots === num
                                                ? "bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                                                : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                                        )}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>

                            {/* Disk Dropdowns */}
                            {formData.disco.slots > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                    {Array.from({ length: formData.disco.slots }).map((_, i) => (
                                        <div key={i}>
                                            <select
                                                value={formData.disco.detalles[i] || ''}
                                                onChange={(e) => handleDiskDetailChange(i, e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium appearance-none"
                                            >
                                                <option value="">Seleccionar Disco {i + 1}...</option>
                                                {DISK_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                        {/* PANTALLA & GRÁFICOS (OPCIONAL) */}
                        <div className="pt-4 border-t border-gray-700/50 mt-4">
                            <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                <Monitor className="w-4 h-4 text-cyan-400" /> Pantalla y Gráficos (Opcional)
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* PANTALLA */}
                                <div>
                                    <select
                                        name="screenSize"
                                        value={formData.screenSize || ''} onChange={handleChange}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">Tamaño Pantalla...</option>
                                        {(screens || []).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <select
                                        name="screenType"
                                        value={formData.screenType || ''} onChange={handleChange}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">Resolución...</option>
                                        {(resolutions || []).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                {/* GRÁFICOS */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select
                                        name="gpuBrand"
                                        value={formData.gpuBrand || ''} onChange={(e) => setFormData(prev => ({ ...prev, gpuBrand: e.target.value, gpuModel: '' }))}
                                        className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">Marca GPU...</option>
                                        {Object.keys(gpus || {}).map(brand => <option key={brand} value={brand}>{brand}</option>)}
                                    </select>

                                    <div className="relative">
                                        <select
                                            name="gpuModel"
                                            disabled={!formData.gpuBrand}
                                            value={formData.gpuModel || ''} onChange={handleChange}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none appearance-none disabled:opacity-50"
                                        >
                                            <option value="">Modelo GPU...</option>
                                            {formData.gpuBrand && (gpus[formData.gpuBrand] || []).map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <select
                                        name="gpuVram"
                                        value={formData.gpuVram || ''} onChange={handleChange}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none appearance-none"
                                    >
                                        <option value="">VRAM...</option>
                                        {(vrams || []).map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Financials */}
                    {/* Financials - HIDDEN IN BATCH MODE */}
                    {!isBatchMode && (
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 block">Precio de Compra</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <DollarSign className="h-6 w-6 text-green-500 group-focus-within:text-green-400 transition-colors" />
                                    </div>
                                    <input
                                        type="number" name="precioCompra" required={!isBatchMode}
                                        value={formData.precioCompra || ''} onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-2xl font-mono text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block"><Briefcase className="inline w-3 h-3 mb-0.5 mr-1" /> Proveedor (Opcional)</label>
                                <input
                                    type="text" name="proveedor"
                                    value={formData.proveedor || ''} onChange={handleChange}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                                    placeholder="Ej: Importadora X"
                                />
                            </div>
                            <div className="flex items-center h-14">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            name="conFactura"
                                            checked={formData.conFactura || false}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">¿Factura?</span>
                                </label>
                            </div>
                        </div>
                    )}



                    {/* Action Button */}
                    {/* Action Button - DUAL MODE */}
                    {!isBatchMode ? (
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-8 w-full group relative flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl text-white font-bold bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.01]"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Guardando...</span>
                            ) : (
                                <span className="flex items-center gap-3 text-lg">
                                    <Printer className="w-6 h-6 group-hover:animate-pulse" />
                                    GUARDAR TICKET
                                </span>
                            )}
                        </button>
                    ) : (
                        /* BATCH BUTTONS MOVED OUTSIDE FORM OR RENDERED HERE?
                           If they are here, they are part of the form. 
                           "Agregar al Lote" can be a submit button if onSubmit={addToBatch}.
                           "Previsualizar" must be type="button".
                        */
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="submit" // Triggers addToBatch
                                className="group relative flex justify-center items-center py-4 px-4 border border-dashed border-gray-600 rounded-2xl text-gray-300 font-bold bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500 hover:text-white transition-all active:scale-95"
                            >
                                <span className="flex items-center gap-3 text-lg">
                                    <Package className="w-6 h-6" /> AGREGAR AL LOTE
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsBatchModalOpen(true)}
                                className={clsx(
                                    "group relative flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl text-white font-bold transition-all shadow-lg active:scale-95",
                                    batchList.length > 0 ? "bg-green-600 hover:bg-green-500 shadow-green-900/30" : "bg-gray-700 text-gray-500 cursor-not-allowed"
                                )}
                                disabled={batchList.length === 0}
                            >
                                <span className="flex items-center gap-3 text-lg">
                                    {batchList.length > 0 && <span className="bg-white/20 px-2 py-0.5 rounded text-sm text-white">{batchList.length}</span>}
                                    PREVISUALIZAR LOTE
                                </span>
                            </button>
                        </div>
                    )}

                </form>


                <BatchPreviewModal
                    isOpen={isBatchModalOpen}
                    onClose={() => setIsBatchModalOpen(false)}
                    batchList={batchList}
                    onRemoveItem={handleRemoveBatchItem}
                    onUpdateItem={handleUpdateBatchItem}
                    onSaveBatch={handleSaveBatch}
                    isSaving={isSavingBatch}
                />
            </div >
        </div >
    );
}
