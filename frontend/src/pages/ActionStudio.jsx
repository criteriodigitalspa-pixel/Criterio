import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import {
    Zap, Plus, Save, Trash2, Box, Terminal,
    Briefcase, MessageSquare, ShieldCheck
} from 'lucide-react';

export default function ActionStudio() {
    const { user } = useAuth();
    const [actions, setActions] = useState([]);
    const [selectedActionId, setSelectedActionId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Editor State
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        system_instructions: '',
        tools: []
    });

    // Available System Tools (Hardcoded for now, could be dynamic later)
    const AVAILABLE_TOOLS = [
        { id: 'searchInventory', name: '📦 Buscar Inventario', desc: 'Permite a la IA leer stock de Tickets.' },
        { id: 'checkOrderStatus', name: '🚚 Estado de Orden', desc: 'Consultar estado por N° Orden (Future).' },
        { id: 'calendarBooking', name: '📅 Agenda', desc: 'Consultar/Crear eventos (Future).' }
    ];

    // --- 1. LOAD DATA ---
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'actions'),
            (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setActions(list);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching actions:", error);
                toast.error("Error DB: " + error.message);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    // --- 2. LOAD SELECTION ---
    useEffect(() => {
        if (selectedActionId) {
            const action = actions.find(a => a.id === selectedActionId);
            if (action) {
                setEditForm({
                    name: action.name || '',
                    description: action.description || '',
                    system_instructions: action.system_instructions || '',
                    tools: action.tools || []
                });
            }
        } else {
            setEditForm({
                name: '', description: '', system_instructions: '', tools: []
            });
        }
    }, [selectedActionId, actions]);

    // --- 3. ACTIONS ---
    const handleSave = async () => {
        if (!editForm.name || !editForm.system_instructions) {
            toast.error("Nombre e Instrucciones son obligatorios");
            return;
        }

        const dataToSave = {
            ...editForm,
            updatedAt: new Date(),
            updatedBy: user.email
        };

        try {
            if (selectedActionId) {
                await updateDoc(doc(db, 'actions', selectedActionId), dataToSave);
                toast.success("Acción actualizada");
            } else {
                await addDoc(collection(db, 'actions'), dataToSave);
                toast.success("Nueva acción creada");
            }
        } catch (e) {
            toast.error("Error guardando: " + e.message);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("¿Seguro que quieres eliminar esta acción?")) return;
        try {
            await deleteDoc(doc(db, 'actions', selectedActionId));
            toast.success("Eliminado correctamente");
            setSelectedActionId(null);
        } catch (e) {
            toast.error("Error eliminando: " + e.message);
        }
    };

    const toggleTool = (toolId) => {
        setEditForm(prev => {
            const current = prev.tools || [];
            if (current.includes(toolId)) {
                return { ...prev, tools: current.filter(t => t !== toolId) };
            } else {
                return { ...prev, tools: [...current, toolId] };
            }
        });
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">

            {/* LEFT: LIST */}
            <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-950/50">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="font-bold flex items-center gap-2">
                        <Zap className="text-yellow-500" />
                        Acciones (Skills)
                    </h2>
                    <button onClick={() => setSelectedActionId(null)} className="p-2 hover:bg-gray-800 rounded-full">
                        <Plus className="w-5 h-5 text-green-400" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? <p className="p-4 text-gray-500 animate-pulse">Cargando...</p> : (
                        actions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>No hay acciones definidas.</p>
                                <p className="text-xs mt-2">Crea módulos como "Ventas" o "Soporte".</p>
                            </div>
                        ) : (
                            actions.map(a => (
                                <div
                                    key={a.id}
                                    onClick={() => setSelectedActionId(a.id)}
                                    className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${selectedActionId === a.id ? 'bg-yellow-900/20 border-l-4 border-l-yellow-500' : ''}`}
                                >
                                    <div className="font-bold flex items-center gap-2">
                                        {a.name}
                                        {a.tools?.length > 0 && <span className="text-[10px] bg-gray-800 px-1 rounded text-gray-400">🛠️ {a.tools.length}</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">{a.description}</div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* RIGHT: EDITOR */}
            <div className="flex-1 flex flex-col h-full bg-gray-900 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto w-full space-y-6">

                    {/* HEADER */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                {selectedActionId ? 'Editar Acción' : 'Crear Nueva Acción'}
                            </h1>
                            <p className="text-gray-400 mt-1">Define capacidades técnicas y conocimiento específico.</p>
                        </div>
                        <div className="flex gap-2">
                            {selectedActionId && (
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 rounded-lg flex items-center gap-2 border border-gray-700 text-red-400 hover:bg-red-900/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-yellow-900/20"
                            >
                                <Save className="w-4 h-4" />
                                Guardar
                            </button>
                        </div>
                    </div>

                    {/* FORM */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Módulo</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
                                    placeholder="Ej: Módulo Ventas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción Interna</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white h-24 resize-none focus:ring-2 focus:ring-yellow-500 outline-none"
                                    placeholder="Para qué sirve este módulo..."
                                />
                            </div>

                            {/* TOOLS SELECTOR */}
                            <div className="p-4 bg-gray-950 rounded-lg border border-gray-800">
                                <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-blue-400" /> Herramientas Disponibles
                                </label>
                                <div className="space-y-2">
                                    {AVAILABLE_TOOLS.map(tool => (
                                        <div
                                            key={tool.id}
                                            onClick={() => toggleTool(tool.id)}
                                            className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${editForm.tools.includes(tool.id) ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${editForm.tools.includes(tool.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                                {editForm.tools.includes(tool.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-200">{tool.name}</div>
                                                <div className="text-xs text-gray-500">{tool.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Instrucciones Técnicas (Prompt)</label>
                                <div className="bg-gray-800/50 p-3 rounded-t-lg border border-gray-800 text-xs text-gray-500 border-b-0 flex gap-2">
                                    <Terminal className="w-3 h-3" />
                                    Estas instrucciones se inyectarán al agente cuando este módulo esté activo.
                                </div>
                                <textarea
                                    value={editForm.system_instructions}
                                    onChange={e => setEditForm(prev => ({ ...prev, system_instructions: e.target.value }))}
                                    className="w-full bg-gray-950 border border-t-0 border-gray-800 rounded-b-lg p-3 text-white h-[350px] font-mono text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
                                    placeholder="CONTEXTO: Tienes acceso al inventario...&#10;SI EL CLIENTE PREGUNTA X, haz Y..."
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
