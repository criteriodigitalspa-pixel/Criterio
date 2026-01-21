import React, { useState } from 'react';
import { useHardware } from '../../hooks/useHardware';
import { systemService } from '../../services/systemService';
import { Server, Cpu, Zap, ChevronRight, ChevronDown, Plus, Trash2, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import HardwarePriceManager from './RamPriceManager';

export default function HardwareConfig() {
    const { processors, gpus, screens, resolutions, vrams, loading } = useHardware();
    const [expandedSection, setExpandedSection] = useState('cpu');

    // New Item State
    const [newItemBrand, setNewItemBrand] = useState('');
    const [newItemModel, setNewItemModel] = useState('');
    const [newItemSimple, setNewItemSimple] = useState(''); // For simple lists
    const [isAddingNewBrand, setIsAddingNewBrand] = useState(false);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando base de datos de hardware...</div>;

    // --- HANDLERS ---
    const handleAdd = async (type) => {
        // Complex Types (CPU/GPU)
        if (type === 'cpu' || type === 'gpu') {
            if (!newItemBrand || !newItemModel) return toast.error("Complete ambos campos");
            const targetData = type === 'cpu' ? { ...processors } : { ...gpus };
            const currentList = targetData[newItemBrand] || [];
            if (currentList.includes(newItemModel)) return toast.error("El modelo ya existe");

            const newData = {
                ...targetData,
                [newItemBrand]: [...currentList, newItemModel].sort()
            };
            const updatePayload = type === 'cpu' ? { processors: newData } : { gpus: newData };

            try {
                await systemService.updateHardwareConstants(updatePayload);
                toast.success("Agregado exitosamente");
                setNewItemModel('');
                if (isAddingNewBrand) {
                    setNewItemBrand('');
                    setIsAddingNewBrand(false);
                }
            } catch (error) {
                toast.error("Error al guardar");
            }
        }
        // Simple Types (Screen/Res/VRAM)
        else {
            if (!newItemSimple) return toast.error("Ingrese un valor");
            let targetList = [];
            let payloadKey = '';

            if (type === 'screens') { targetList = [...screens]; payloadKey = 'screens'; }
            if (type === 'resolutions') { targetList = [...resolutions]; payloadKey = 'resolutions'; }
            if (type === 'vrams') { targetList = [...vrams]; payloadKey = 'vrams'; }

            if (targetList.includes(newItemSimple)) return toast.error("El valor ya existe");

            targetList.push(newItemSimple);
            // Optional: Sort? Screens maybe numeric sort? keeping simple append for now or alphanumeric sort
            // targetList.sort(); 

            try {
                await systemService.updateHardwareConstants({ [payloadKey]: targetList });
                toast.success("Agregado");
                setNewItemSimple('');
            } catch (error) {
                toast.error("Error al guardar");
            }
        }
    };

    const handleDelete = async (type, brandOrItem, model) => {
        if (!window.confirm(`¿Eliminar?`)) return;

        // Complex
        if (type === 'cpu' || type === 'gpu') {
            const brand = brandOrItem;
            const targetData = type === 'cpu' ? { ...processors } : { ...gpus };
            const currentList = targetData[brand] || [];
            const newList = currentList.filter(m => m !== model);
            const newData = { ...targetData, [brand]: newList };
            if (newList.length === 0) delete newData[brand];

            try {
                await systemService.updateHardwareConstants(type === 'cpu' ? { processors: newData } : { gpus: newData });
                toast.success("Eliminado");
            } catch (error) {
                toast.error("Error al eliminar");
            }
        }
        // Simple
        else {
            const item = brandOrItem;
            let targetList = [];
            let payloadKey = '';
            if (type === 'screens') { targetList = screens; payloadKey = 'screens'; }
            if (type === 'resolutions') { targetList = resolutions; payloadKey = 'resolutions'; }
            if (type === 'vrams') { targetList = vrams; payloadKey = 'vrams'; }

            const newList = targetList.filter(i => i !== item);
            try {
                await systemService.updateHardwareConstants({ [payloadKey]: newList });
                toast.success("Eliminado");
            } catch (error) {
                toast.error("Error al eliminar");
            }
        }
    };

    // --- RENDERERS ---
    const renderSection = (type, icon, title, data) => {
        const isExpanded = expandedSection === type;
        return (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6 transition-all">
                <button
                    onClick={() => setExpandedSection(isExpanded ? null : type)}
                    className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-700/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="text-lg font-bold text-white uppercase">{title}</h3>
                        <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400 font-mono">
                            {Object.values(data).flat().length} items
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                </button>

                {isExpanded && (
                    <div className="p-4 border-t border-gray-700 min-h-[300px]">
                        {/* ADDER */}
                        <div className="bg-gray-900/80 p-4 rounded-xl mb-6 border border-gray-600/50 flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Marca / Tipo</label>
                                {isAddingNewBrand ? (
                                    <input autoFocus value={newItemBrand} onChange={e => setNewItemBrand(e.target.value)} placeholder="Nueva Marca..." className="w-full bg-gray-800 border-blue-500 border rounded-lg p-2 text-sm text-white" />
                                ) : (
                                    <select value={newItemBrand} onChange={e => { if (e.target.value === 'NEW') setIsAddingNewBrand(true); else setNewItemBrand(e.target.value); }} className="w-full bg-gray-800 border-gray-600 border rounded-lg p-2 text-sm text-white">
                                        <option value="">Seleccione...</option>
                                        {Object.keys(data).map(b => <option key={b} value={b}>{b}</option>)}
                                        <option value="NEW" className="font-bold text-blue-400">+ Nueva Marca</option>
                                    </select>
                                )}
                            </div>
                            <div className="flex-[2]">
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Modelo</label>
                                <input value={newItemModel} onChange={e => setNewItemModel(e.target.value)} placeholder="Modelo..." className="w-full bg-gray-800 border-gray-600 border rounded-lg p-2 text-sm text-white" />
                            </div>
                            <button onClick={() => handleAdd(type)} disabled={!newItemBrand || !newItemModel} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                                <Plus className="w-4 h-4" /> Agregar
                            </button>
                            {isAddingNewBrand && <button onClick={() => setIsAddingNewBrand(false)} className="px-3 py-2 text-gray-400 hover:text-white">Cancelar</button>}
                        </div>

                        {/* LIST */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(data).map(([brand, models]) => (
                                <div key={brand} className="bg-gray-700/20 rounded-lg p-3 border border-gray-700">
                                    <div className="flex justify-between items-center mb-2 border-b border-gray-700/50 pb-2">
                                        <h4 className="font-bold text-blue-300 text-sm">{brand}</h4>
                                        <span className="text-[10px] bg-gray-800 px-2 rounded-full text-gray-500">{models.length}</span>
                                    </div>
                                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                        {models.map(model => (
                                            <div key={model} className="group flex justify-between items-center text-xs text-gray-300 hover:bg-gray-700/50 p-1 rounded">
                                                <span>{model}</span>
                                                <button onClick={() => handleDelete(type, brand, model)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSimpleListSection = (type, icon, title, list) => {
        const isExpanded = expandedSection === type;
        return (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6 transition-all">
                <button
                    onClick={() => setExpandedSection(isExpanded ? null : type)}
                    className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-gray-700/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="text-lg font-bold text-white uppercase">{title}</h3>
                        <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400 font-mono">
                            {(list || []).length} items
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                </button>

                {isExpanded && (
                    <div className="p-4 border-t border-gray-700">
                        {/* ADDER */}
                        <div className="bg-gray-900/80 p-4 rounded-xl mb-6 border border-gray-600/50 flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Nuevo Item</label>
                                <input
                                    value={newItemSimple}
                                    onChange={e => setNewItemSimple(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAdd(type)}
                                    placeholder={`Agregar a ${title}...`}
                                    className="w-full bg-gray-800 border-gray-600 border rounded-lg p-2 text-sm text-white"
                                />
                            </div>
                            <button onClick={() => handleAdd(type)} disabled={!newItemSimple} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                                <Plus className="w-4 h-4" /> Agregar
                            </button>
                        </div>

                        {/* LIST */}
                        <div className="flex flex-wrap gap-2">
                            {(list || []).map(item => (
                                <div key={item} className="group bg-gray-700/40 border border-gray-600/50 rounded-lg px-3 py-2 flex items-center gap-3 hover:bg-gray-700/80 transition-colors">
                                    <span className="text-sm text-gray-200">{item}</span>
                                    <button onClick={() => handleDelete(type, item)} className="text-gray-500 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
            <div className="mb-6 flex items-center gap-3">
                <div className="p-3 bg-blue-900/20 rounded-xl border border-blue-500/30">
                    <Server className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Base de Datos de Hardware</h2>
                    <p className="text-sm text-gray-400">Gestión dinámica de componentes soportados por el sistema.</p>
                </div>
            </div>

            {/* HARDWARE PRICE MANAGER */}
            <HardwarePriceManager />

            {renderSection('cpu', <Cpu className="w-5 h-5 text-blue-400" />, 'Procesadores', processors)}
            {renderSection('gpu', <Zap className="w-5 h-5 text-yellow-400" />, 'Tarjetas Gráficas', gpus)}

            {/* NEW SECTIONS */}
            {renderSimpleListSection('screens', <Monitor className="w-5 h-5 text-cyan-400" />, 'Pantallas', screens)}
            {renderSimpleListSection('resolutions', <Monitor className="w-5 h-5 text-purple-400" />, 'Resoluciones', resolutions)}
            {renderSimpleListSection('vrams', <Zap className="w-5 h-5 text-green-400" />, 'Memorias VRAM', vrams)}
        </div>
    );
}
