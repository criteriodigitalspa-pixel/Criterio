import { useState, useRef, useMemo } from 'react';
import { X, ArrowRight, Trash2, GripVertical, Clock, CheckCircle, Truck, Package, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { TRANSITION_RULES } from '../services/transitionRules';
import ServiceHardwareConfig from './common/ServiceHardwareConfig';
import ServiceHardwareComparison from './common/ServiceHardwareComparison';

const STATUS_OPTIONS = [
    { id: 'pending', label: 'Por Comprar', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
    { id: 'bought', label: 'Comprado', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
    { id: 'shipping', label: 'En Camino', icon: Truck, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
    { id: 'arrived', label: 'Llegó', icon: Package, color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
    { id: 'out_of_stock', label: 'Agotado / Error', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30' }
];

export default function TransitionModal({ ticket, fromArea, toArea, onConfirm, onCancel }) {
    const isServiceToService = fromArea.includes('Servicio') && toArea.includes('Servicio');

    // Step 1 Rule (Current Transition)
    const step1Key = `${fromArea}->${toArea}`;
    const step1Rule = TRANSITION_RULES[step1Key];

    // Step 2 Rule (Entry to New Service - borrowing Compras rule)
    const step2Key = `Compras->${toArea}`;
    const step2Rule = TRANSITION_RULES[step2Key];

    const [step, setStep] = useState(fromArea.includes('Servicio') ? 1 : 2);
    const activeRule = step === 1 ? step1Rule : step2Rule;

    // --- SHARED STATE ---
    const [formData, setFormData] = useState({});

    // --- CUSTOM FIELD STATES ---
    const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'summary'

    // Builder (Used in Step 2 or Entry)
    const [selectedAction, setSelectedAction] = useState('');
    const [customActionText, setCustomActionText] = useState('');
    const [actionObs, setActionObs] = useState('');
    const [actionCost, setActionCost] = useState('');
    const [actionTime, setActionTime] = useState('');
    const [actionsList, setActionsList] = useState([]);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    // Resolver (Used in Step 1 Exit)
    const [resolvedActions, setResolvedActions] = useState({}); // { 0: true, 1: true }
    // New: Real Cost/Time Data { 0: { realCost: 5000, realTime: 20 } }
    // New: Real Cost/Time Data { 0: { realCost: 5000, realTime: 20 } }
    const [realData, setRealData] = useState({});

    // New: Hardware Final Verification { 0: { ram: ..., disk: ... } }
    const [finalHardware, setFinalHardware] = useState({});

    // Entry Builder Hardware State
    const [hwEntryRam, setHwEntryRam] = useState({ slots: 0, detalles: [] });
    const [hwEntryDisk, setHwEntryDisk] = useState({ slots: 0, detalles: [] });

    // Hardware Swaps (Independent)
    const [swapRAM, setSwapRAM] = useState(false);
    const [swapDisk, setSwapDisk] = useState(false);
    const [swapData, setSwapData] = useState({
        ram: { extracted: '', installed: '' },
        disk: { extracted: '', installed: '' }
    });



    // Calculator Results (Projected for Builder)
    const projectedTotals = useMemo(() => {
        return actionsList.reduce((acc, item) => ({
            cost: acc.cost + (Number(item.cost) || 0),
            time: acc.time + (Number(item.time) || 0)
        }), { cost: 0, time: 0 });
    }, [actionsList]);

    // Calculator Results (Real vs Budget for Resolver)
    const analysisTotals = useMemo(() => {
        const ticketActions = ticket?.serviceActions || [];
        let totalBudgetCost = 0;
        let totalRealCost = 0;
        let totalBudgetTime = 0;
        let totalRealTime = 0;

        ticketActions.forEach((action, idx) => {
            if (resolvedActions[idx]) {
                totalBudgetCost += (Number(action.cost) || 0);
                totalBudgetTime += (Number(action.time) || 0);

                const real = realData[idx] || {};
                totalRealCost += (Number(real.realCost) || 0);
                totalRealTime += (Number(real.realTime) || 0);
            }
        });

        return {
            budgetCost: totalBudgetCost,
            realCost: totalRealCost,
            diffCost: totalRealCost - totalBudgetCost,
            budgetTime: totalBudgetTime,
            realTime: totalRealTime,
            diffTime: totalRealTime - totalBudgetTime
        };
    }, [ticket?.serviceActions, resolvedActions, realData]);

    // Init Logic
    if (!activeRule) {
        console.error("TransitionModal: NO ACTIVE RULE FOUND", { step, step1Key, step2Key });
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                <div className="bg-red-900/90 p-8 rounded-xl border border-red-500 text-white max-w-md">
                    <h3 className="text-xl font-bold mb-2">Error de Reglas</h3>
                    <p>No se encontró una regla de transición para: {step === 1 ? step1Key : step2Key}</p>
                    <p className="text-sm opacity-75 mt-2">Intente recargar la página.</p>
                    <button onClick={onCancel} className="mt-4 bg-white text-red-900 px-4 py-2 rounded font-bold">Cerrar</button>
                </div>
            </div>
        );
    }

    // console.log("TransitionModal: Rendering with rule", { step, rule: activeRule, key: step === 1 ? step1Key : step2Key });

    const handleChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // --- Action Builder Logic ---
    const addAction = () => {
        const text = selectedAction === 'Otros' ? customActionText : selectedAction;
        if (!text || !text.trim()) return;

        if (!actionObs.trim()) {
            alert("Por favor ingrese una observación.");
            return;
        }

        const newList = [...actionsList, {
            text: text,
            type: 'General',
            obs: actionObs,
            cost: Number(actionCost) || 0,
            time: Number(actionTime) || 0,
            // Capture Hardware Config if applicable
            hardware: selectedAction === 'Cambio de RAM/ROM' ? { ram: hwEntryRam, disk: hwEntryDisk } : null
        }];
        setActionsList(newList);

        if (selectedAction === 'Otros') setCustomActionText('');
        setSelectedAction('');
        setActionObs('');
        setActionCost('');
        setActionTime('');
        // Reset Hardware
        setHwEntryRam({ slots: 0, detalles: [] });
        setHwEntryDisk({ slots: 0, detalles: [] });

        handleChange('serviceActions', newList);
    };

    const removeAction = (index) => {
        const newList = actionsList.filter((_, i) => i !== index);
        setActionsList(newList);
        handleChange('serviceActions', newList);
    };

    const handleSort = () => {
        let _actionsList = [...actionsList];
        const draggedItemContent = _actionsList.splice(dragItem.current, 1)[0];
        _actionsList.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        setActionsList(_actionsList);
        handleChange('serviceActions', _actionsList);
    };

    // --- Hardware Swaps Logic ---
    const updateSwapData = (type, field, value) => {
        setSwapData(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value }
        }));
    };

    // --- Real Data Inputs Logic ---
    const updateRealData = (idx, field, value) => {
        setRealData(prev => ({
            ...prev,
            [idx]: { ...prev[idx], [field]: value }
        }));
    }

    // --- Submit Handlers ---
    const handleStep1Submit = () => {
        // 1. Validation for Resolver
        const isResolver = step1Rule?.fields.some(f => f.type === 'action_resolver');
        if (isResolver) {
            const ticketActions = ticket.serviceActions || [];

            // Check if all selected items have real data
            const missingRealData = ticketActions.some((_, idx) => {
                if (resolvedActions[idx]) {
                    const r = realData[idx];
                    return !r || r.realCost === '' || r.realTime === ''; // simple check, allow 0
                }
                return false;
            });

            if (Object.keys(resolvedActions).length === 0 && ticketActions.length > 0) {
                if (!window.confirm("⚠️ No has marcado ninguna acción como resuelta. ¿Continuar?")) return;
            }

            if (missingRealData) {
                alert("⛔ Por favor ingresa el Costo Real y Tiempo Real para todas las acciones marcadas.");
                return;
            }

            // If final exit (Publicidad/Despacho), strict check
            // MOD: Removed isServiceToService from strict check to allow carry-over
            const isFinalExit = toArea.includes('Publicidad') || toArea.includes('Despacho');
            if (isFinalExit && ticketActions.length > 0) {
                const pending = ticketActions.some((_, i) => !resolvedActions[i]);
                if (pending) {
                    alert("⛔ Debes resolver TODAS las acciones antes de salir.");
                    return;
                }
            }
        }

        // If Service -> Service, Move to Step 2
        if (isServiceToService && step === 1) {
            if (!formData.motivoDerivacion) {
                if (!formData.motivoDerivacion && step1Rule.fields.some(f => f.id === 'motivoDerivacion' && f.required)) {
                    alert("Ingrese el Motivo de Derivación.");
                    return;
                }
            }

            // MOD: Carry over unresolved actions
            const ticketActions = ticket.serviceActions || [];
            const unresolved = ticketActions.filter((_, i) => !resolvedActions[i]);

            if (unresolved.length > 0) {
                const transferredActions = unresolved.map(a => ({
                    text: a.text,
                    type: 'Transfer',
                    obs: `Transferido desde ${fromArea}. Obs orig: ${a.obs || ''}`,
                    cost: Number(a.cost) || 0,
                    time: Number(a.time) || 0
                }));

                // Add to actionsList (State for Step 2)
                setActionsList(prev => [...prev, ...transferredActions]);
                alert(`🔄 ${unresolved.length} acciones pendientes se han transferido al nuevo servicio.`);
            }



            setStep(2);
            setStep(2);
            return;
        }

        // Final Submit (Single Step)
        finalizeTransition();
    };

    const handleStep2Submit = () => {
        // 1. Check for Unsaved Input (Builder)
        if (viewMode === 'edit') {
            const hasPendingInput = (selectedAction && selectedAction !== 'Otros') || actionObs;
            if (hasPendingInput && !window.confirm("Datos sin guardar. ¿Continuar sin agregar?")) return;

            const hasActionBuilder = activeRule?.fields.some(f => f.type === 'action_builder');
            if (hasActionBuilder && actionsList.length === 0) {
                alert("Debes definir al menos una acción para el nuevo servicio.");
                return;
            }

            // If no builder, just pass through (unless other requirements exist, but standard required is handled by browser/react)
            if (hasActionBuilder) {
                setViewMode('summary');
                return;
            } else {
                // Direct Finalize for non-builder forms (like Espera)
                finalizeTransition();
                return;
            }
        }



        finalizeTransition();
    };

    const finalizeTransition = () => {
        const finalData = {
            ...formData,
            // Resolver Data (Step 1)
            resolvedActions,
            realDataAnalysis: analysisTotals,

            // Builder Data (Step 2 or Entry)
            newServiceActions: actionsList,
            totalServiceCost: projectedTotals.cost,
            totalServiceTime: projectedTotals.time,
            // Include Final Hardware Confirmations
            resolvedHardware: finalHardware,

            hardwareSwaps: {
                swappedRAM: swapRAM,
                swappedDisk: swapDisk,
                details: swapData
            }
        };
        onConfirm(finalData);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (step === 1) handleStep1Submit();
        else handleStep2Submit();
    };


    // --- RENDERERS ---

    const renderActionBuilder = (field) => {
        if (viewMode === 'summary') return null;

        return (
            <div key={field.id} className="space-y-4">
                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 space-y-3">
                    <div className="flex gap-2">
                        <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)} className="flex-1 bg-gray-800 border-gray-600 rounded-lg p-2 text-white text-xs outline-none">
                            <option value="">Seleccione Problema...</option>
                            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        {selectedAction === 'Otros' && <input value={customActionText} onChange={(e) => setCustomActionText(e.target.value)} placeholder="Especifique..." className="flex-1 bg-gray-800 border-gray-600 rounded-lg p-2 text-white text-xs outline-none" autoFocus />}
                    </div>
                    <textarea value={actionObs} onChange={(e) => setActionObs(e.target.value)} placeholder="Observación..." className="w-full bg-gray-800 border-gray-600 rounded-lg p-2 text-white text-xs resize-none h-16 outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" value={actionCost} onChange={(e) => setActionCost(e.target.value)} placeholder="Costo ($)" className="bg-gray-800 border-gray-600 rounded-lg p-2 text-white text-xs outline-none" />
                        <input type="number" value={actionTime} onChange={(e) => setActionTime(e.target.value)} placeholder="Tiempo (min)" className="bg-gray-800 border-gray-600 rounded-lg p-2 text-white text-xs outline-none" />
                    </div>

                    {/* Hardware Config Form */}
                    {selectedAction === 'Cambio de RAM/ROM' && (
                        <ServiceHardwareConfig
                            ramData={hwEntryRam}
                            onRamChange={setHwEntryRam}
                            diskData={hwEntryDisk}
                            onDiskChange={setHwEntryDisk}
                        />
                    )}
                    <button type="button" onClick={addAction} disabled={!selectedAction} className="w-full py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 disabled:opacity-50 text-xs font-bold uppercase"> Agregar Item </button>
                </div>
                {/* List Preview */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {actionsList.map((action, idx) => (
                        <div key={idx} draggable onDragStart={() => dragItem.current = idx} onDragEnter={() => dragOverItem.current = idx} onDragEnd={handleSort} className="bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center cursor-move">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <GripVertical className="w-3 h-3 text-gray-500" />
                                <span className="bg-blue-900/40 text-blue-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                <div className="truncate text-xs text-gray-300">{action.text}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-green-400">${action.cost.toLocaleString()}</span>
                                <button type="button" onClick={() => removeAction(idx)}><Trash2 className="w-3 h-3 text-gray-600 hover:text-red-400" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const renderActionResolver = (field) => {
        const ticketActions = ticket.serviceActions || [];
        if (ticketActions.length === 0) return <div className="text-yellow-400 text-xs p-3 border border-yellow-500/30 rounded bg-yellow-900/10">No hay acciones registradas.</div>;

        return (
            <div key={field.id} className="space-y-4">
                <div className="text-center pb-2 border-b border-gray-700/50">
                    <h3 className="text-sm font-bold text-white">Análisis de Costos Reales</h3>
                    <p className="text-[10px] text-gray-400">Ingrese lo que realmente costó y tardó cada acción.</p>
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {ticketActions.map((action, idx) => {
                        const isResolved = resolvedActions[idx];
                        const rData = realData[idx] || {};

                        return (
                            <div key={idx} className={clsx("p-3 rounded-xl border transition-all", isResolved ? "bg-gray-800/80 border-gray-600" : "bg-gray-900/30 border-gray-800 opacity-70")}>
                                <label className="flex items-center gap-3 cursor-pointer mb-3">
                                    <input type="checkbox" checked={!!isResolved} onChange={() => {
                                        const newVal = !isResolved;
                                        setResolvedActions(p => ({ ...p, [idx]: newVal }));
                                        // Auto-fill real data with budget if checking
                                        if (newVal) {
                                            setRealData(prev => ({
                                                ...prev,
                                                [idx]: {
                                                    ...prev[idx],
                                                    realCost: prev[idx]?.realCost ?? action.cost,
                                                    realTime: prev[idx]?.realTime ?? action.time
                                                }
                                            }));
                                        }
                                    }} className="w-4 h-4 rounded border-gray-500 text-green-600 bg-gray-700" />
                                    <span className={clsx("font-bold text-sm", isResolved ? "text-white" : "text-gray-400")}>{action.text}</span>
                                </label>

                                {isResolved && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 pl-7 animate-in fade-in slide-in-from-top-2">
                                            {/* Budget Info */}
                                            <div className="col-span-2 flex gap-4 text-[10px] text-gray-500 uppercase font-mono bg-gray-900/50 p-1.5 rounded">
                                                <span>Presupuesto:</span>
                                                <span className="text-green-500">${(action.cost || 0).toLocaleString()}</span>
                                                <span className="text-blue-500">{(action.time || 0)} min</span>
                                            </div>

                                            {/* Real Inputs */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] items-center gap-1 text-green-300 font-bold">COSTO REAL ($)</label>
                                                <input
                                                    type="number"
                                                    placeholder={action.cost}
                                                    value={rData.realCost || ''}
                                                    onChange={(e) => updateRealData(idx, 'realCost', e.target.value)}
                                                    className="w-full bg-gray-900 border border-green-900/50 focus:border-green-500 rounded p-1.5 text-xs text-white outline-none font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] items-center gap-1 text-blue-300 font-bold">TIEMPO REAL (min)</label>
                                                <input
                                                    type="number"
                                                    placeholder={action.time}
                                                    value={rData.realTime || ''}
                                                    onChange={(e) => updateRealData(idx, 'realTime', e.target.value)}
                                                    className="w-full bg-gray-900 border border-blue-900/50 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none font-mono"
                                                />
                                            </div>
                                        </div>

                                        {/* HARDWARE COMPARISON (If applicable) */}
                                        {action.hardware && (
                                            <div className="mt-2 space-y-2 animate-in fade-in">
                                                {/* RAM Comparison */}
                                                <ServiceHardwareComparison
                                                    type="RAM"
                                                    originalDetails={ticket.ram?.detalles || []}
                                                    finalData={finalHardware[idx]?.ram || action.hardware.ram}
                                                    onChange={(val) => setFinalHardware(p => ({
                                                        ...p,
                                                        [idx]: { ...(p[idx] || {}), ram: val }
                                                    }))}
                                                />
                                                {/* Disk Comparison */}
                                                <ServiceHardwareComparison
                                                    type="DISK"
                                                    originalDetails={ticket.disco?.detalles || []}
                                                    finalData={finalHardware[idx]?.disk || action.hardware.disk}
                                                    onChange={(val) => setFinalHardware(p => ({
                                                        ...p,
                                                        [idx]: { ...(p[idx] || {}), disk: val }
                                                    }))}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Analysis Summary */}
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                    <div className="grid grid-cols-3 text-center text-[10px] uppercase font-bold text-gray-500 mb-2">
                        <div></div>
                        <div>Presupuesto</div>
                        <div>Realidad</div>
                    </div>
                    <div className="grid grid-cols-3 text-center text-xs font-mono items-center border-b border-gray-800 pb-2 mb-2">
                        <div className="text-left text-gray-400 font-sans font-bold">Dinero</div>
                        <div className="text-gray-300">${analysisTotals.budgetCost.toLocaleString()}</div>
                        <div className={clsx("font-bold", analysisTotals.diffCost > 0 ? "text-red-400" : "text-green-400")}>
                            ${analysisTotals.realCost.toLocaleString()}
                            <span className="text-[9px] block opacity-70">({analysisTotals.diffCost > 0 ? '+' : ''}{analysisTotals.diffCost})</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 text-center text-xs font-mono items-center">
                        <div className="text-left text-gray-400 font-sans font-bold">Tiempo</div>
                        <div className="text-gray-300">{analysisTotals.budgetTime}m</div>
                        <div className={clsx("font-bold", analysisTotals.diffTime > 0 ? "text-red-400" : "text-green-400")}>
                            {analysisTotals.realTime}m
                            <span className="text-[9px] block opacity-70">({analysisTotals.diffTime > 0 ? '+' : ''}{analysisTotals.diffTime})</span>
                        </div>
                    </div>
                </div>


            </div >
        );
    }

    const renderBudgetStatusSelector = (field) => {
        const currentStatus = formData[field.id] || '';

        return (
            <div key={field.id} className="space-y-4 mb-4">
                <label className="text-xs font-bold text-gray-400 uppercase">{field.label}</label>
                <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const isSelected = currentStatus === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleChange(field.id, opt.id)}
                                className={clsx(
                                    "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all",
                                    isSelected
                                        ? `${opt.bg} ${opt.border} ring-1 ring-offset-1 ring-offset-gray-900 ring-${opt.color.split('-')[1]}-500`
                                        : "bg-gray-800 border-gray-700 hover:bg-gray-750 opacity-60 hover:opacity-100"
                                )}
                            >
                                <Icon className={clsx("w-4 h-4", opt.color)} />
                                <span className={clsx("text-[9px] font-bold", isSelected ? "text-white" : "text-gray-400")}>{opt.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    const renderSummary = () => (
        <div className="space-y-4">
            <div className="text-center">
                <h3 className="text-lg font-bold text-white">Nuevo Servicio: Presupuesto</h3>
                <p className="text-xs text-gray-400">Verifique el plan para el servicio siguiente.</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-gray-200">Total Proyectado</span>
                    <div className="text-right">
                        <div className="text-xl font-bold text-green-400 font-mono">${projectedTotals.cost.toLocaleString()}</div>
                        <div className="text-xs text-blue-400 font-mono">{projectedTotals.time} min</div>
                    </div>
                </div>
                <div className="space-y-2 text-xs text-gray-400 border-t border-gray-700 pt-2">
                    {actionsList.map((a, i) => <div key={i} className="flex justify-between"><span>• {a.text}</span><span>${a.cost.toLocaleString()}</span></div>)}
                </div>
            </div>


        </div>
    );


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Spectacular */}
                <div className={clsx("p-6 border-b border-gray-700/50 flex justify-between items-center transition-colors duration-500", step === 1 ? "bg-red-900/20" : "bg-blue-900/20")}>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={clsx("text-xs font-black uppercase px-2 py-0.5 rounded border shadow-sm", step === 1 ? "bg-red-500/20 text-red-400 border-red-500/40" : "bg-blue-500/20 text-blue-400 border-blue-500/40")}>
                                {step === 1 ? 'PASO 1/2' : 'PASO 2/2'}
                            </span>
                            <span className="text-gray-500 text-xs tracking-wider font-mono">
                                {step === 1 ? 'CIERRE DE CICLO' : 'APERTURA DE CICLO'}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {step === 1 ? (
                                <>📋 FORMULARIO DE SALIDA: <span className="text-red-300 underline decoration-red-500/30">{fromArea}</span></>
                            ) : (
                                <>🚀 FORMULARIO DE ENTRADA: <span className="text-blue-300 underline decoration-blue-500/30">{toArea}</span></>
                            )}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            {step === 1
                                ? "Confirma costos reales y cierra el ciclo anterior."
                                : "Define el nuevo plan de trabajo y presupuesto."}
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-700 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="transition-form" onSubmit={handleSubmit} className="space-y-6">
                        {viewMode === 'summary' && step === 2
                            ? renderSummary()
                            : activeRule?.fields.map(field => {
                                if (field.type === 'action_resolver') return renderActionResolver(field);
                                if (field.type === 'action_builder') return renderActionBuilder(field);
                                if (field.type === 'budget_status_selector') return renderBudgetStatusSelector(field);
                                if (field.type === 'hardware_swaps') return null; // We'll put this at the end manually if needed, or loop it logic
                                // Standard fields
                                return (
                                    <div key={field.id} className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{field.label}</label>
                                        {field.type === 'textarea'
                                            ? <textarea className="w-full bg-gray-900 border-gray-700 rounded-lg p-3 text-white text-sm" required={field.required} onChange={e => handleChange(field.id, e.target.value)} />
                                            : (field.type === 'select'
                                                ? <select className="w-full bg-gray-900 border-gray-700 rounded-lg p-3 text-white text-sm" required={field.required} onChange={e => handleChange(field.id, e.target.value)} >
                                                    <option value="">Seleccione...</option>
                                                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                                : <input type={field.type} className="w-full bg-gray-900 border-gray-700 rounded-lg p-3 text-white text-sm" required={field.required} onChange={e => handleChange(field.id, e.target.value)} />
                                            )
                                        }
                                    </div>
                                );
                            })
                        }
                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 bg-gray-900/50 border-t border-gray-700/50 flex justify-end gap-3">
                    {viewMode === 'summary' && step === 2 && (
                        <button type="button" onClick={() => setViewMode('edit')} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Editar</button>
                    )}
                    <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800">Cancelar</button>

                    <button form="transition-form" type="submit" className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                        {step === 1 && isServiceToService ? <>Siguiente <ArrowRight className="w-4 h-4" /></> : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
