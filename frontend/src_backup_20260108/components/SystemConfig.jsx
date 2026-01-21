import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Smartphone, Database, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { configService } from '../services/configService';
import RamPriceManager from './admin/RamPriceManager';

export default function SystemConfig() {
    const [lists, setLists] = useState({ brands: [], models: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    const [newBrand, setNewBrand] = useState('');
    const [newModel, setNewModel] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await configService.getLists();
            setLists({
                brands: data.brands || [],
                models: data.models || []
            });
        } catch (error) {
            toast.error("Error cargando configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (type, item, setter) => {
        if (!item.trim()) return;
        const listKey = type === 'Brand' ? 'brands' : 'models';

        // Optimistic Update
        const oldList = lists[listKey];
        setLists(prev => ({ ...prev, [listKey]: [...prev[listKey], item.trim()] }));
        setter('');

        try {
            await configService.addItem(listKey, item);
            toast.success(`${type} Agregada`);
        } catch (error) {
            setLists(prev => ({ ...prev, [listKey]: oldList })); // Revert
            toast.error("Error al guardar");
        }
    };

    const handleRemove = async (type, item) => {
        if (!confirm(`¿Borrar "${item}" de la lista?`)) return;

        const listKey = type === 'Brand' ? 'brands' : 'models';

        // Optimistic
        const oldList = lists[listKey];
        setLists(prev => ({ ...prev, [listKey]: prev[listKey].filter(i => i !== item) }));

        try {
            await configService.removeItem(listKey, item);
            toast.success("Eliminado");
        } catch (error) {
            setLists(prev => ({ ...prev, [listKey]: oldList })); // Revert
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Database className="text-blue-500" /> Configuración del Sistema
            </h2>

            {/* TABS */}
            <div className="flex gap-4 border-b border-gray-700 mb-6">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'general'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                >
                    Listas (Marcas/Modelos)
                </button>
                <button
                    onClick={() => setActiveTab('hardware')}
                    className={`pb-3 px-4 font-medium transition-colors border-b-2 ${activeTab === 'hardware'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Server className="w-4 h-4" /> Precios Hardware
                    </div>
                </button>
            </div>

            {/* CONTENT */}
            {activeTab === 'general' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* BRANDS COLUMN */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Tag className="w-5 h-5 text-purple-400" /> Marcas
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Nueva Marca..."
                                value={newBrand}
                                onChange={(e) => setNewBrand(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd('Brand', newBrand, setNewBrand)}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                            />
                            <button
                                onClick={() => handleAdd('Brand', newBrand, setNewBrand)}
                                className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {lists.brands.map((brand, idx) => (
                                <div key={`${brand}-${idx}`} className="group flex justify-between items-center bg-gray-700/30 p-3 rounded-lg border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                                    <span className="font-medium text-gray-200">{brand}</span>
                                    <button
                                        onClick={() => handleRemove('Brand', brand)}
                                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MODELS COLUMN */}
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-blue-400" /> Modelos Frecuentes
                        </h3>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Nuevo Modelo..."
                                value={newModel}
                                onChange={(e) => setNewModel(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd('Model', newModel, setNewModel)}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                            />
                            <button
                                onClick={() => handleAdd('Model', newModel, setNewModel)}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {lists.models.map((model, idx) => (
                                <div key={`${model}-${idx}`} className="group flex justify-between items-center bg-gray-700/30 p-3 rounded-lg border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                                    <span className="font-medium text-gray-200">{model}</span>
                                    <button
                                        onClick={() => handleRemove('Model', model)}
                                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* HARDWARE TAB */
                <RamPriceManager />
            )}
        </div>
    );
}
