import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { printService } from '../services/printService';
import PrintLabel, { DEFAULT_MODULE_CONFIG } from '../components/PrintLabel';
import PrintLabelInitial, { DEFAULT_ADMISSION_CONFIG } from '../components/PrintLabelInitial';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Base Config for Detailed (shared)
const BASE_DETAILED_CONFIG = {
    barcodeHeight: 260,
    rightStripWidth: 300,
    modules: DEFAULT_MODULE_CONFIG // Imported from PrintLabel
};

// Default Templates to bootstrap the DB if empty
const DEFAULT_TEMPLATES = [
    {
        id: 'template_detailed_7050',
        name: 'Ficha Técnica 70x50mm (Editable)',
        type: 'detailed',
        config: BASE_DETAILED_CONFIG
    }
    // {
    //     id: 'template_full_technical',
    //     name: 'Ficha Técnica (Full)',
    //     type: 'detailed',
    //     config: BASE_DETAILED_CONFIG
    // },
    // {
    //     id: 'template_admission_aaa', 
    //     name: 'Ingreso 50x30mm (AAA)',
    //     type: 'simple',
    //     config: { ...DEFAULT_ADMISSION_CONFIG, heightSingle: 240, heightBatch: 240, width: 400, hideBatchFooter: true }
    // },
    // {
    //     id: 'template_admission_batch',
    //     name: 'Ingreso 50x40mm (Lote)',
    //     type: 'simple',
    //     config: { ...DEFAULT_ADMISSION_CONFIG, heightSingle: 320, heightBatch: 320, width: 400 }
    // }
];

const MODULES_LIST = [
    { id: 'logoCriterio', label: '1. Logo Criterio' },
    { id: 'logoBrand', label: '2. Logo Marca' },
    { id: 'modelSerial', label: '3. Modelo y Serie' },
    { id: 'ticketId', label: '4. ID Notebook' },
    { id: 'barcode', label: '5. Código de Barras' },
    { id: 'cpu', label: '6. Procesador' },
    { id: 'ram', label: '7. RAM' },
    { id: 'screen', label: '8. Pantalla' },
    { id: 'storage', label: '9. Almacenamiento' },
    { id: 'gpu', label: '10. GPU' },
    { id: 'osImage', label: '11. Windows/Office' },
];

export default function LabelPlayground() {
    const [templates, setTemplates] = useState([]);
    const [currentTemplateId, setCurrentTemplateId] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedModules, setSelectedModules] = useState([MODULES_LIST[0].id]);
    const [isDragging, setIsDragging] = useState(false);
    const [testPaperSize, setTestPaperSize] = useState('auto'); // 'auto', '30', '40', '70'
    const [printRotation, setPrintRotation] = useState(0); // 0, 90
    const [pdfRotation, setPdfRotation] = useState(0); // 0, 90

    // Mobile Detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Determines the currently edited configuration object
    const currentTemplate = templates.find(t => t.id === currentTemplateId) || null;

    // --- DRAG & DROP HANDLERS ---
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (!file || !file.name.endsWith('.json')) {
            alert('❌ Solo se permiten archivos .json');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                // Basic validation
                if (!json.id || !json.config) {
                    throw new Error("Formato inválido (falta id o config)");
                }

                // Add or Replace in state
                setTemplates(prev => {
                    const exists = prev.find(t => t.id === json.id);
                    if (exists) {
                        return prev.map(t => t.id === json.id ? json : t);
                    }
                    return [...prev, json];
                });

                // Select immediately
                setCurrentTemplateId(json.id);
                alert(`✅ Plantilla "${json.name || json.id}" importada y activa.`);

            } catch (err) {
                console.error("Error parsing JSON:", err);
                alert('❌ Error al leer el archivo JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    // --- AUTH CONTEXT ---
    const { user } = useAuth(); // Use centralized auth context

    // Load from Firestore + LocalStorage with Timestamp Merge
    useEffect(() => {
        const fetchTemplates = async () => {
            let dbTemplates = [];
            let localTemplates = [];

            // 1. Try Load DB
            try {
                if (db) {
                    const querySnapshot = await getDocs(collection(db, 'label_templates'));
                    querySnapshot.forEach((doc) => {
                        let data = doc.data();
                        // Fix/Migration logic matches original
                        if (data.config && data.config.heightSingle <= 240) data.config.hideBatchFooter = true;
                        if (data.name && (data.name.includes('40mm') || data.name.includes('50x40'))) {
                            if ((data.config?.heightBatch || 0) < 320) {
                                data.config.heightBatch = 320;
                                data.config.heightSingle = 320;
                            }
                        }
                        dbTemplates.push({ id: doc.id, ...data });
                    });
                }
            } catch (error) {
                console.warn("Firestore load failed:", error);
            }

            // 2. Load LocalStorage
            try {
                const local = localStorage.getItem('label_templates_backup');
                if (local) {
                    localTemplates = JSON.parse(local);
                }
            } catch (e) {
                console.error("Local storage load failed", e);
            }

            // 3. MERGE STRATEGY: Prefer NEWER timestamp
            // Create a map by ID
            const mergedMap = new Map();

            // Populate with DB first
            dbTemplates.forEach(t => mergedMap.set(t.id, t));

            // Overlay Local if newer or missing in DB
            localTemplates.forEach(localT => {
                const dbT = mergedMap.get(localT.id);
                if (!dbT) {
                    mergedMap.set(localT.id, localT); // New local template
                } else {
                    // Compare timestamps
                    const timeLocal = new Date(localT.lastModified || 0).getTime();
                    const timeDb = dbT.lastModified ? (dbT.lastModified.seconds ? dbT.lastModified.seconds * 1000 : new Date(dbT.lastModified).getTime()) : 0;

                    if (timeLocal > timeDb) {
                        console.log(`Using LOCAL version for ${localT.id} (Newer)`);
                        mergedMap.set(localT.id, localT);
                    }
                }
            });

            let finalTemplates = Array.from(mergedMap.values());

            // 4. Ensure Defaults
            DEFAULT_TEMPLATES.forEach(def => {
                if (!finalTemplates.find(t => t.id === def.id)) {
                    finalTemplates.push(def);
                }
            });

            setTemplates(finalTemplates);
            if (finalTemplates.length > 0 && !currentTemplateId) {
                setCurrentTemplateId(finalTemplates[0].id);
            }
            setLoading(false);
        };

        fetchTemplates();
    }, []);

    // Reset rotation when switching templates
    useEffect(() => {
        if (!currentTemplate) return;

        // Detailed labels usually require Landscape (0 rotation)
        // Simple labels might have stored rotation preference, but we default to 0 for safety
        if (currentTemplate.type === 'detailed') {
            setPrintRotation(0);
            setPdfRotation(0);
        }
        // If simple, we keep previous or default to 0. 
        // User specifically asked 50x30 to be 0 0.
        if (currentTemplate.type === 'simple') {
            setPrintRotation(0);
            setPdfRotation(0);
        }
    }, [currentTemplateId, currentTemplate]);

    // Save to Firestore + LocalStorage
    const handleSave = async () => {
        if (!currentTemplate) return;

        // 1. Always Save Locally First (The "Definitive" Backup)
        const updatedTemplates = templates.map(t =>
            t.id === currentTemplateId ? { ...t, config: currentTemplate.config, lastModified: new Date() } : t
        );
        localStorage.setItem('label_templates_backup', JSON.stringify(updatedTemplates));

        // 2. Check Auth using Context
        if (!user || !user.uid) {
            toast("💾 Guardado LOCALMENTE (Sin sesión)", { icon: '💻' });
            return;
        }

        // 3. Dev Mode / Permission Safety
        // If we have a context user ('dev-admin') but NO Firebase user, we are in Local Dev Mode.
        // We should SKIP the cloud save attempt to avoid "Permission Denied" errors.
        if (!auth.currentUser) {
            console.warn("Skipping Cloud Save: Local Dev User detected (No Firebase Session)");
            toast.success("Guardado LOCALMENTE ✅\n(Modo Offline/Dev)", { icon: '💻' });
            return;
        }

        // For real users:
        const toastId = toast.loading("Guardando...");
        try {
            await setDoc(doc(db, 'label_templates', currentTemplate.id), {
                name: currentTemplate.name,
                type: currentTemplate.type,
                config: currentTemplate.config,
                lastModified: new Date(),
                modifiedBy: user.uid,
                modifiedByEmail: user.email || 'unknown'
            });
            toast.success('Guardado en NUBE y Local ☁️', { id: toastId });
        } catch (error) {
            console.error("Error saving to cloud:", error);
            const isPermError = error.code === 'permission-denied';
            toast.success(
                isPermError
                    ? `Guardado LOCALMENTE ✅\n(Nube: Sin permisos de escritura)`
                    : `Guardado LOCALMENTE ✅\n(Nube: ${error.message})`,
                {
                    id: toastId,
                    duration: 5000,
                    icon: '⚠️'
                }
            );
        }
    };

    /**
     * FACTORY RESET
     * Clears local storage cache and reloads default templates from code.
     * Fixes "Old Design" issues caused by stale local data.
     */
    const handleFactoryReset = () => {
        if (!confirm("⚠️ ¿Restaurar valores de fábrica?\n\nSe borrarán tus cambios LOCALES no guardados y se recargarán los diseños originales del sistema.")) return;

        try {
            // 1. Clear Local Cache
            localStorage.removeItem('label_templates_backup');

            // 2. Reset State to Code Defaults
            setTemplates(DEFAULT_TEMPLATES);
            setCurrentTemplateId(DEFAULT_TEMPLATES[0].id);

            toast.success("♻️ Diseños restaurados a originales.");

            // Optional: Reload to ensure clean slate?
            // window.location.reload(); 
        } catch (e) {
            toast.error("Error al restaurar");
        }
    };

    // Download JSON
    const handleDownload = () => {
        if (!currentTemplate) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentTemplate, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${currentTemplate.name.replace(/\s+/g, '_').toLowerCase()}_config.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // Import JSON
    const handleImport = (event) => {
        const fileReader = new FileReader();
        if (!event.target.files[0]) return;

        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData.type || !importedData.config) {
                    toast.error("Formato inválido de plantilla JSON");
                    return;
                }

                // Update Check
                // We update the CURRENT selected template with imported data
                // Or if ID varies, maybe add? No, let's Stick to User Intent: "Restore THIS"
                const updated = { ...currentTemplate, ...importedData, id: currentTemplate.id };

                // Update State & LocalStorage Immediately
                const newTemplates = templates.map(t => t.id === currentTemplate.id ? updated : t);
                setTemplates(newTemplates);
                localStorage.setItem('label_templates_backup', JSON.stringify(newTemplates));

                toast.success("Backup Importado y Guardado (Local) ✅");

                // Trigger auto-save request to cloud just in case
                // handleSave(); // Optional, but let's let user click Save to be sure
            } catch (error) {
                toast.error("Error al leer archivo: " + error.message);
            }
        };
    };

    // Test Print / PDF
    const handleTest = async (action) => {
        if (!currentTemplate) return;

        try {
            const isDetailed = currentTemplate.type === 'detailed';

            // Determine target based on action and template type
            let elementId = '';

            if (isDetailed) {
                if (action === 'PRINT') elementId = 'preview-target-detailed-print';
                else if (action === 'DOWNLOAD') elementId = 'preview-target-detailed-pdf';
                else elementId = 'preview-target-detailed'; // Default/Image fallback
            } else {
                if (action === 'PRINT') elementId = 'preview-target-simple-print';
                else if (action === 'DOWNLOAD') elementId = 'preview-target-simple-pdf';
                else elementId = 'preview-target-simple';
            }

            let widthMm = 50;
            let heightMm = 30;

            // Determine which rotation is being used for this action
            let activeRotation = action === 'PRINT' ? printRotation : pdfRotation;

            // SMART ROTATION FIX:
            // REMOVED: User has a 4-inch printer and configured 70x50mm paper.
            // Printing at 0 degrees (Landscape) is correct for this setup.
            // if ((isDetailed || widthMm === 70) && action === 'PRINT') {
            //    activeRotation = 90;
            // }

            const isVertical = activeRotation === 90 || activeRotation === 270;

            if (isDetailed) {
                // Base dimensions for Detailed (Landscape)
                widthMm = 70;
                heightMm = 50;
            } else {
                // ... existing simple logic ...
                // Merge with defaults to ensure we see the Component's effective height
                const fullConfig = { ...DEFAULT_ADMISSION_CONFIG, ...currentTemplate.config };
                // ...
                const configH = fullConfig.heightBatch || fullConfig.heightSingle || 240;
                const nameHas40 = currentTemplate.name.includes('40mm') || currentTemplate.name.includes('50x40');
                const nameHas70 = currentTemplate.name.includes('70mm') || currentTemplate.name.includes('50x70');

                if (configH > 280 || nameHas40) {
                    heightMm = 40;
                }

                if (nameHas70) {
                    widthMm = 70;
                    heightMm = 50;
                }
            }

            // SWAP DIMENSIONS IF VERTICAL ROTATION IS SELECTED
            if (isVertical) {
                const temp = widthMm;
                widthMm = heightMm;
                heightMm = temp;
            }

            // MANUAL OVERRIDE (Forced by User)
            if (testPaperSize !== 'auto') {
                if (testPaperSize === '50x30') { widthMm = 50; heightMm = 30; } // Standard
                if (testPaperSize === '50x40') { widthMm = 50; heightMm = 40; }
                if (testPaperSize === '50x70') { widthMm = 70; heightMm = 50; } // 70 Wide (Landscape)

                // Legacy support just in case
                if (testPaperSize === '30') { widthMm = 50; heightMm = 30; }
                if (testPaperSize === '40') { widthMm = 50; heightMm = 40; }
            }

            if (action === 'PRINT') {
                if (!auth.currentUser) return toast.error('Debes iniciar sesión para imprimir.');
                const jobId = await printService.printDomElement(elementId, widthMm, heightMm, 'PRINT');
                toast.success(`🖨️ Enviado! (${widthMm}x${heightMm})`, { duration: 3000 });
            } else {
                await printService.printDomElement(elementId, widthMm, heightMm, 'DOWNLOAD');
                toast.success('PDF Descargado');
            }
        } catch (error) {
            console.error("Test Error:", error);
            toast.error('Error: ' + error.message);
        }
    };

    // Update Local State Wrapper
    const updateConfig = (updater) => {
        setTemplates(prev => prev.map(t => {
            if (t.id === currentTemplateId) {
                return { ...t, config: updater(t.config) };
            }
            return t;
        }));
    };

    // Mock Ticket
    const mockTicket = {
        ticketId: '25-0013',
        batchId: 'L005', // For batch testing
        marca: 'LENOVO',
        modelo: 'THINKPAD T480',
        serialNumber: 'PF-1A2B3C',
        cpuBrand: 'INTEL',
        cpu: 'CORE I5',
        cpuGen: '8350U',
        ram: ['8GB', '8GB'],
        disco: ['240GB SSD'],
        screenSize: '14"',
        screenRes: 'FHD',
        specs: { gpu: 'INTEGRADA' }
    };

    // --- RENDERERS FOR EDITORS ---

    const renderDetailedEditor = () => {
        const config = currentTemplate.config;
        const modules = config.modules || DEFAULT_MODULE_CONFIG;

        // Multi-select logic: Use the first selected module as the "Representative" for displaying current values
        const primaryId = selectedModules[0] || MODULES_LIST[0].id;
        const currentStyle = modules[primaryId] || {};

        const updateModule = (key, val) => {
            updateConfig(prev => {
                const newModules = { ...prev.modules };

                // Apply change to ALL selected modules
                selectedModules.forEach(modId => {
                    const modConfig = newModules[modId] || {};
                    newModules[modId] = {
                        ...modConfig,
                        [key]: val
                    };
                });

                return {
                    ...prev,
                    modules: newModules
                };
            });
        };

        const toggleSelection = (e, id) => {
            // If Ctrl/Cmd is pressed, toggle. Else, exclusive select.
            if (e.ctrlKey || e.metaKey) {
                setSelectedModules(prev => {
                    if (prev.includes(id)) {
                        // Don't allow empty, default to self if it was the last one
                        return prev.length > 1 ? prev.filter(x => x !== id) : prev;
                    }
                    return [...prev, id];
                });
            } else {
                setSelectedModules([id]);
            }
        };

        return (
            <div className="space-y-4 text-gray-300">
                <div className="mb-4">
                    <label className="block text-xs font-bold mb-2 text-blue-400 uppercase tracking-wider flex justify-between">
                        Módulos a Editar
                        <span className="text-[10px] bg-blue-900/50 px-2 rounded border border-blue-500/30 text-blue-300">
                            {selectedModules.length > 1 ? `${selectedModules.length} SELECCIONADOS` : '1 SELECCIONADO'}
                        </span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {MODULES_LIST.map(m => {
                            const isSelected = selectedModules.includes(m.id);
                            return (
                                <button
                                    key={m.id}
                                    onClick={(e) => toggleSelection(e, m.id)}
                                    className={`
                                        text-[10px] px-2 py-1.5 rounded border text-left transition-all
                                        ${isSelected
                                            ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-lg shadow-blue-900/50'
                                            : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                        }
                                    `}
                                >
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>
                    {/* Import Button */}
                    <div className="mt-2 text-center">
                        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-500/30 rounded cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-wider">
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>Importar Backup Local</span>
                        </label>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 text-center italic">
                        [Ctrl + Click] para selección múltiple
                    </p>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700 shadow-sm">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Tamaño (Escala)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="range" min="0.5" max="2" step="0.1"
                            value={currentStyle.scale || 1}
                            onChange={(e) => updateModule('scale', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs font-mono text-blue-300 w-10 text-right">{currentStyle.scale}x</span>
                    </div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700 shadow-sm">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Márgenes (Padding)</label>
                    <div className="grid grid-cols-2 gap-3">
                        {['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].map(m => (
                            <div key={m}>
                                <span className="text-[9px] text-gray-500 uppercase block mb-1">{m.replace('margin', '')}</span>
                                <input type="number" className="w-full p-1 bg-gray-900 border border-gray-600 rounded text-xs text-white focus:border-blue-500 outline-none"
                                    value={currentStyle[m] !== undefined && currentStyle[m] !== null ? currentStyle[m] : 0}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        updateModule(m, val === '' ? '' : parseInt(val));
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700 shadow-sm">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Colores</label>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <span className="text-[9px] text-gray-500 uppercase block mb-1">Fondo</span>
                            <div className="flex items-center gap-2">
                                <input type="color" className="h-8 w-10 border-0 p-0 rounded cursor-pointer"
                                    value={currentStyle.bgColor === 'transparent' ? '#ffffff' : currentStyle.bgColor}
                                    onChange={(e) => updateModule('bgColor', e.target.value)}
                                />
                                <button
                                    onClick={() => updateModule('bgColor', 'transparent')}
                                    className="text-[10px] text-gray-400 hover:text-white underline"
                                >
                                    Transparente
                                </button>
                            </div>
                        </div>
                        <div className="flex-1">
                            <span className="text-[9px] text-gray-500 uppercase block mb-1">Texto</span>
                            <input type="color" className="h-8 w-full border-0 p-0 rounded cursor-pointer"
                                value={currentStyle.textColor || '#000000'}
                                onChange={(e) => updateModule('textColor', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ROTATION CONTROLS - BLOCKED BY USER REQUEST */}
                <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded border border-gray-200 opacity-60 grayscale cursor-not-allowed" title="Rotación bloqueada por configuración de impresora">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔒</span>
                        <span className="font-bold text-sm text-gray-500">Rotación Fija (Optimizado)</span>
                    </div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700 shadow-sm">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Alineación</label>
                    <div className="space-y-2">
                        <div className="flex gap-1 bg-gray-900 p-1 rounded">
                            {['flex-start', 'center', 'flex-end'].map(a => (
                                <button key={a} onClick={() => updateModule('alignH', a)}
                                    className={`flex-1 text-[9px] py-1 rounded transition-colors ${currentStyle.alignH === a ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:bg-gray-700'}`}>
                                    {a === 'center' ? 'Horiz: Cen' : a === 'flex-start' ? 'Horiz: Izq' : 'Horiz: Der'}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1 bg-gray-900 p-1 rounded">
                            {['flex-start', 'center', 'flex-end'].map(a => (
                                <button key={a} onClick={() => updateModule('alignV', a)}
                                    className={`flex-1 text-[9px] py-1 rounded transition-colors ${currentStyle.alignV === a ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:bg-gray-700'}`}>
                                    {a === 'center' ? 'Vert: Cen' : a === 'flex-start' ? 'Vert: Sup' : 'Vert: Inf'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SPECIAL CONTROLS FOR BARCODE MODULE */}
                {selectedModules.includes('barcode') && (
                    <div className="p-3 bg-gray-800 rounded border border-gray-700 shadow-xl mt-4 border-l-4 border-l-purple-500">
                        <label className="text-[10px] font-bold text-purple-400 uppercase block mb-3 pb-1 border-b border-gray-700">
                            🏗️ Ajustes de Código de Barras
                        </label>
                        <div className="space-y-3">
                            <div>
                                <span className="block text-gray-500 mb-0.5 text-[10px]">Altura Global (px)</span>
                                <input
                                    type="number" min="50" max="400"
                                    value={config.barcodeHeight !== undefined ? config.barcodeHeight : 260}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        updateConfig(prev => ({ ...prev, barcodeHeight: val === '' ? '' : parseInt(val) }));
                                    }}
                                    className="w-full p-1 bg-gray-700 rounded text-xs text-white"
                                />
                            </div>
                            <div>
                                <span className="block text-gray-500 mb-0.5 text-[10px]">Grosor Barras (Width)</span>
                                <input
                                    type="number" min="1" max="15"
                                    value={config.barcodeBarWidth !== undefined ? config.barcodeBarWidth : 7}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        updateConfig(prev => ({ ...prev, barcodeBarWidth: val === '' ? '' : parseInt(val) }));
                                    }}
                                    className="w-full p-1 bg-gray-700 rounded text-xs text-white"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* SHOW HARDWARE GRID CONTROLS IF ANY HARDWARE MODULE IS SELECTED */}
                {selectedModules.some(id => ['cpu', 'ram', 'screen', 'storage', 'gpu'].includes(id)) && (
                    <div className="p-3 bg-gray-800 rounded border border-gray-700 shadow-xl mt-4 border-l-4 border-l-yellow-500">
                        <label className="text-[10px] font-bold text-yellow-400 uppercase block mb-3 pb-1 border-b border-gray-700 flex justify-between items-center">
                            ⚙️ Gestor de Bloques
                            <span className="text-[8px] bg-yellow-900/50 text-yellow-200 px-1 rounded border border-yellow-800">Grilla ({selectedModules.filter(id => ['cpu', 'ram', 'screen', 'storage', 'gpu'].includes(id)).length})</span>
                        </label>

                        <div className="space-y-3">
                            {(currentStyle.order || ['icon', 'title', 'value']).map((subKey, index, arr) => {
                                // Fallback safe access (using primary, but verify it exists)
                                const safeSubModules = currentStyle.subModules || DEFAULT_MODULE_CONFIG.cpu.subModules;
                                const subConfig = safeSubModules[subKey] || {};

                                const updateSub = (prop, val) => {
                                    updateConfig(prev => {
                                        const newModules = { ...prev.modules };

                                        // Apply to ALL selected hardware modules
                                        selectedModules.forEach(modId => {
                                            if (['cpu', 'ram', 'screen', 'storage', 'gpu'].includes(modId)) {
                                                const mod = newModules[modId] || DEFAULT_MODULE_CONFIG[modId];
                                                const currentSubs = mod.subModules || DEFAULT_MODULE_CONFIG.cpu.subModules; // fallback
                                                const targetSub = currentSubs[subKey] || {};

                                                newModules[modId] = {
                                                    ...mod,
                                                    subModules: {
                                                        ...currentSubs,
                                                        [subKey]: {
                                                            ...targetSub,
                                                            [prop]: val
                                                        }
                                                    }
                                                };
                                            }
                                        });

                                        return { ...prev, modules: newModules };
                                    });
                                };

                                const move = (dir) => {
                                    const newOrder = [...arr];
                                    [newOrder[index], newOrder[index + dir]] = [newOrder[index + dir], newOrder[index]];
                                    updateModule('order', newOrder); // This already handles multi-select updateModule
                                };

                                const getLabel = () => {
                                    if (subKey === 'icon') return '📷 Icono';
                                    if (subKey === 'title') return '🏷️ Título';
                                    return '📝 Valor';
                                };

                                return (
                                    <div key={subKey} className="bg-gray-900/50 border border-gray-600 rounded overflow-hidden shadow-sm">
                                        {/* Header */}
                                        <div className="flex justify-between items-center bg-gray-700 px-3 py-1.5 border-b border-gray-600">
                                            <span className="text-[11px] font-bold text-gray-200">{getLabel()}</span>
                                            <div className="flex gap-1">
                                                <button disabled={index === 0} onClick={() => move(-1)} className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white disabled:opacity-20 transition-colors">⬆️</button>
                                                <button disabled={index === arr.length - 1} onClick={() => move(1)} className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white disabled:opacity-20 transition-colors">⬇️</button>
                                            </div>
                                        </div>

                                        {/* Controls */}
                                        <div className="p-2 space-y-2 text-[10px]">

                                            {/* Common: Box Model */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="block text-gray-500 mb-0.5">Altura (px)</span>
                                                    <input
                                                        type="number"
                                                        value={subConfig.height !== undefined ? subConfig.height : 0}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            updateSub('height', val === '' ? '' : parseInt(val));
                                                        }}
                                                        className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white focus:border-yellow-500 outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="block text-gray-500 mb-0.5">Padding</span>
                                                    <input
                                                        type="number"
                                                        value={subConfig.padding !== undefined ? subConfig.padding : 0}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            updateSub('padding', val === '' ? '' : parseInt(val));
                                                        }}
                                                        className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-white focus:border-yellow-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Specifics */}
                                            {subKey === 'icon' && (
                                                <div>
                                                    <span className="block text-gray-500 mb-0.5">Tamaño Imagen</span>
                                                    <div className="flex items-center gap-2">
                                                        <input type="range" min="20" max="150" value={subConfig.iconSize || 80} onChange={(e) => updateSub('iconSize', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                                                        <span className="text-[9px] text-gray-300 w-6 text-right">{subConfig.iconSize}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {(subKey === 'title' || subKey === 'value') && (
                                                <div>
                                                    <span className="block text-gray-500 mb-0.5">Tamaño Fuente</span>
                                                    <div className="flex items-center gap-2">
                                                        <input type="range" min="8" max="60" value={subConfig.fontSize || 12} onChange={(e) => updateSub('fontSize', parseInt(e.target.value))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                                                        <span className="text-[9px] text-gray-300 w-6 text-right">{subConfig.fontSize}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {subKey === 'title' && (
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    <div>
                                                        <span className="block text-gray-500 mb-0.5">Fondo</span>
                                                        <div className="flex items-center gap-2">
                                                            <input type="color" value={subConfig.bgColor || '#000000'} onChange={(e) => updateSub('bgColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                                                            <span className="text-[9px] text-gray-400 font-mono">{subConfig.bgColor}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="block text-gray-500 mb-0.5">Texto</span>
                                                        <div className="flex items-center gap-2">
                                                            <input type="color" value={subConfig.color || '#FFFFFF'} onChange={(e) => updateSub('color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                                                            <span className="text-[9px] text-gray-400 font-mono">{subConfig.color}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {subKey === 'value' && (
                                                <div>
                                                    <span className="block text-gray-500 mb-0.5">Color Texto</span>
                                                    <div className="flex items-center gap-2">
                                                        <input type="color" value={subConfig.color || '#000000'} onChange={(e) => updateSub('color', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                                                        <span className="text-[9px] text-gray-400 font-mono">{subConfig.color}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSimpleEditor = () => {
        const config = currentTemplate.config;

        const handleChange = (key, val) => {
            updateConfig(prev => ({ ...prev, [key]: val }));
        };

        return (
            <div className="space-y-4">
                <div className="p-3 bg-gray-800/50 rounded border border-gray-700/50 shadow-sm">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1 flex items-center gap-1">
                        <span className="text-lg leading-none">🔒</span> Dimensiones Físicas
                    </label>
                    <p className="text-[9px] text-gray-500 mb-2 leading-tight">
                        Bloqueadas para garantizar compatibilidad con impresora térmica.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                            <span className="text-[8px] text-gray-500 uppercase block">Ancho</span>
                            <span className="text-sm font-mono text-gray-400">{config.width}px</span>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                            <span className="text-[8px] text-gray-500 uppercase block">Alto</span>
                            <span className="text-sm font-mono text-gray-400">{config.heightSingle}px</span>
                        </div>
                    </div>
                    {/* Import Button */}
                    <div className="mt-3">
                        <label className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded cursor-pointer transition-colors text-xs font-bold uppercase tracking-wider">
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>Subir Backup</span>
                        </label>
                    </div>
                </div>

                <div className="p-3 bg-gray-800 rounded border border-gray-700 shadow-sm">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Estilos Contenido</label>
                    <div className="mb-3">
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Altura Barras</span>
                        <input type="range" min="50" max="300" value={config.barcodeHeight} onChange={(e) => handleChange('barcodeHeight', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    <div className="mb-3">
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Grosor Barras (Width)</span>
                        <div className="flex items-center gap-2">
                            <input type="range" min="1" max="10" step="1" value={config.barcodeBarWidth || 3} onChange={(e) => handleChange('barcodeBarWidth', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                            <span className="text-[9px] text-gray-400 font-mono w-4">{config.barcodeBarWidth || 3}</span>
                        </div>
                    </div>
                    <div className="mb-3">
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Tamaño ID</span>
                        <input type="range" min="20" max="80" value={config.idFontSize} onChange={(e) => handleChange('idFontSize', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    </div>
                    {!config.hideBatchFooter && (
                        <div className="mb-2">
                            <span className="text-[9px] text-gray-500 uppercase block mb-1">Tamaño Lote (Batch ID)</span>
                            <input type="range" min="10" max="60" value={config.batchFontSize || 32} onChange={(e) => handleChange('batchFontSize', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={!!config.hideBatchFooter}
                                onChange={(e) => handleChange('hideBatchFooter', e.target.checked)}
                                className="w-4 h-4 rounded bg-gray-900 border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                            />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Ocultar Sección Lote</span>
                        </label>
                        <p className="text-[9px] text-gray-600 mt-1 pl-6 leading-tight">
                            Activar para etiquetas pequeñas (30mm) donde no cabe la banda negra de lote.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-10 text-center text-white bg-gray-900 h-screen flex items-center justify-center">Cargando Gestor...</div>;

    return (
        <div
            className="flex h-screen w-full bg-gray-900 text-gray-200 overflow-hidden font-sans relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-blue-500 border-dashed m-4 rounded-xl flex items-center justify-center animate-pulse pointer-events-none">
                    <div className="bg-gray-900/90 p-8 rounded-2xl shadow-2xl text-center transform scale-110">
                        <span className="text-6xl block mb-4">📂</span>
                        <h2 className="text-2xl font-bold text-white mb-2">Soltar Configuración Aquí</h2>
                        <p className="text-blue-300">Se cargará el diseño automáticamente</p>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className="w-[360px] flex flex-col bg-gray-800 border-r border-gray-700 shadow-2xl shrink-0 z-10">
                <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center relative">
                    <h1 className="text-sm font-black tracking-widest uppercase text-gray-400">Label<span className="text-white">Studio</span></h1>
                    <div className="flex gap-2 items-center">
                        {/* Paper Override Removed by User Request */}
                        <div className="hidden"></div>


                        {!isMobile && (
                            <>
                                <button onClick={() => handleTest('DOWNLOAD_IMAGE')} className="bg-gray-700 hover:bg-gray-600 text-purple-400 p-1.5 rounded transition-all shadow-lg" title="Descargar como Imagen (PNG)">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                                <button onClick={() => handleTest('DOWNLOAD')} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition-all shadow-lg" title="Generar PDF de Prueba">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </button>
                            </>
                        )}
                        <button onClick={() => handleTest('PRINT')} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition-all shadow-lg" title="Imprimir Prueba">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded transition-all shadow-lg" title="Descargar Backup JSON">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button onClick={handleFactoryReset} className="bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-500/30 p-1.5 rounded transition-all shadow-lg" title="Restaurar Valores de Fábrica">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-all shadow-lg shadow-green-900/50">
                            GUARDAR
                        </button>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
                </div>

                {/* ROTATION CONTROLS (NEW) */}
                <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Rotación de Salida</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-900 p-1.5 rounded border border-gray-700">
                            <span className="text-[9px] text-gray-500 block">Impresora</span>
                            <div className="flex gap-1 mt-1">
                                <button onClick={() => setPrintRotation(0)} className={`flex-1 text-[9px] py-0.5 rounded ${printRotation === 0 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>0°</button>
                                <button onClick={() => setPrintRotation(90)} className={`flex-1 text-[9px] py-0.5 rounded ${printRotation === 90 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>90°</button>
                            </div>
                        </div>
                        <div className="bg-gray-900 p-1.5 rounded border border-gray-700">
                            <span className="text-[9px] text-gray-500 block">PDF</span>
                            <div className="flex gap-1 mt-1">
                                <button onClick={() => setPdfRotation(0)} className={`flex-1 text-[9px] py-0.5 rounded ${pdfRotation === 0 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>0°</button>
                                <button onClick={() => setPdfRotation(90)} className={`flex-1 text-[9px] py-0.5 rounded ${pdfRotation === 90 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>90°</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                    <label className="block text-[10px] font-bold mb-2 text-gray-500 uppercase tracking-widest">Plantilla Activa</label>
                    <div className="relative">
                        <select
                            className="w-full p-2 pl-3 pr-8 border border-gray-600 rounded bg-gray-900 text-white font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                            value={currentTemplateId}
                            onChange={(e) => setCurrentTemplateId(e.target.value)}
                        >
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                        </div>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                    {currentTemplate && currentTemplate.type === 'detailed' ? renderDetailedEditor() : renderSimpleEditor()}
                </div>

                <div className="p-3 bg-gray-900 text-center text-[10px] text-gray-600 border-t border-gray-700">
                    Criterio Digital • v2.0 Modular
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-gray-950 flex flex-col items-center justify-center overflow-hidden relative">
                {/* Checkboard pattern for transparency */}
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                <div className="flex-1 w-full flex items-center justify-center overflow-auto p-12">
                    {currentTemplate ? (
                        <div className="shadow-2xl shadow-black ring-1 ring-white/10 relative transition-transform duration-300">
                            {currentTemplate.type === 'detailed' ? (
                                <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                                    <div id="preview-target-detailed" className="inline-block bg-white">
                                        <PrintLabel ticket={mockTicket} id="preview-full" config={currentTemplate.config} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-10 items-center">
                                    <div className="relative group">
                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">Vista Previa (Individual)</span>
                                        <div id="preview-target-simple" className="inline-block bg-white">
                                            <PrintLabelInitial ticket={mockTicket} show={false} config={currentTemplate.config} renderAsPortal={false} />
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">Vista Previa (Lote)</span>
                                        <PrintLabelInitial ticket={null} tickets={[mockTicket]} show={false} config={currentTemplate.config} renderAsPortal={false} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                            <span className="text-xl">👈 Selecciona una plantilla para editar</span>
                        </div>
                    )}
                </div>
            </div>

            {/* HIDDEN PRINT TARGETS (Off-screen) */}
            {/* These are rendered permanently but hidden, ensuring they are available for html2canvas */}
            <div className="absolute top-0 left-0 pointer-events-none opacity-0" style={{ transform: 'translateX(-9999px)' }}>
                {currentTemplate && currentTemplate.type === 'detailed' && (
                    <>
                        {/* PRINT VERSION (Rotated based on Print Settings) */}
                        <div
                            id="preview-target-detailed-print"
                            className="inline-block bg-white"
                            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                            key={JSON.stringify(currentTemplate.config) + 'print-wrapper'}
                        >
                            <PrintLabel
                                ticket={mockTicket}
                                id="print-full-print"
                                config={currentTemplate.config}
                                containerRotation={printRotation}
                            />
                        </div>

                        {/* PDF VERSION (Rotated based on PDF Settings) */}
                        <div
                            id="preview-target-detailed-pdf"
                            className="inline-block bg-white"
                            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                            key={JSON.stringify(currentTemplate.config) + 'pdf-wrapper'}
                        >
                            <PrintLabel
                                ticket={mockTicket}
                                id="print-full-pdf"
                                config={currentTemplate.config}
                                containerRotation={pdfRotation}
                            />
                        </div>
                    </>
                )}

                {/* SIMPLE LABEL / ADMISSION TARGETS */}
                {currentTemplate && currentTemplate.type === 'simple' && (
                    <>
                        {/* PRINT VERSION */}
                        <div
                            id="preview-target-simple-print"
                            className="inline-block bg-white"
                            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                            key={JSON.stringify(currentTemplate.config) + 'print-simple-wrapper'}
                        >
                            <PrintLabelInitial
                                ticket={mockTicket}
                                show={false}
                                config={currentTemplate.config}
                                renderAsPortal={false}
                            // Simple labels don't support rotation via prop anymore, 
                            // but we keep the structure for consistency.
                            // If we ever re-add rotation to simple, pass props here.
                            />
                        </div>

                        {/* PDF VERSION */}
                        <div
                            id="preview-target-simple-pdf"
                            className="inline-block bg-white"
                            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                            key={JSON.stringify(currentTemplate.config) + 'pdf-simple-wrapper'}
                        >
                            <PrintLabelInitial
                                ticket={mockTicket}
                                show={false}
                                config={currentTemplate.config}
                                renderAsPortal={false}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>

    );
}
