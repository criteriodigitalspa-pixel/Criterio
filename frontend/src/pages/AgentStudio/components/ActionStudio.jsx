import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore'; // Added query, where
import { toast } from 'react-hot-toast';
import { Zap, Plus, Trash2, Save, Code, Terminal } from 'lucide-react';
import { DEMO_ACTIONS } from '../data/demo_data';
import { useAuth } from '../../../context/AuthContext'; // Import useAuth

export default function ActionStudio({ personaId, personaData }) {
    const { user } = useAuth(); // Get current user
    const [actions, setActions] = useState([]);
    const [selectedActionId, setSelectedActionId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Persona-Specific State (Hydrated from prop)
    // We rely on personaData being fresh from parent subscription.
    const assignedActionIds = new Set(personaData?.enabledToolIds || []);

    // Editor State
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        trigger: '',
        schema: '{}',
        enabled: true
    });

    useEffect(() => {
        if (!user) return; // Wait for user

        // Filter by Owner ID
        const q = query(collection(db, 'actions'), where('ownerId', '==', user.uid));

        const unsub = onSnapshot(q, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setActions(list);
            setLoading(false);
        }, err => {
            console.error("Action Sub Error:", err);
        });
        return () => unsub();
    }, [user]);

    // Load into editor when selection changes
    useEffect(() => {
        if (selectedActionId) {
            const act = actions.find(a => a.id === selectedActionId);
            if (act) {
                setEditForm({
                    name: act.name || '',
                    description: act.description || '',
                    trigger: act.trigger || '',
                    schema: act.schema || '{}',
                    enabled: act.enabled ?? true
                });
            }
        } else {
            setEditForm({ name: '', description: '', trigger: '', schema: '{}', enabled: true });
        }
    }, [selectedActionId, actions]);

    const handleSave = async () => {
        if (!user) return;
        try {
            // Validate Schema JSON
            try {
                JSON.parse(editForm.schema);
            } catch (e) {
                return toast.error("JSON Schema inválido: " + e.message);
            }

            if (selectedActionId) {
                await updateDoc(doc(db, 'actions', selectedActionId), {
                    ...editForm,
                    updatedAt: new Date()
                });
                toast.success("Acción (Definición) actualizada");
            } else {
                const docRef = await addDoc(collection(db, 'actions'), {
                    ...editForm,
                    ownerId: user.uid, // TAG WITH OWNER
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                setSelectedActionId(docRef.id);
                // AUTO-ENABLE FOR CURRENT PERSONA ON CREATION
                if (personaId) {
                    toggleToolAssignment(docRef.id, true);
                }
                toast.success("Acción creada y asignada");
            }
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleDelete = async () => {
        if (!selectedActionId || !confirm("¿Eliminar esta acción permanentemente?")) return;
        try {
            await deleteDoc(doc(db, 'actions', selectedActionId));
            setSelectedActionId(null);
            toast.success("Eliminado");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleCreateNew = () => {
        setSelectedActionId(null);
        setEditForm({ name: 'Nueva Acción', description: '', trigger: '', schema: '{}', enabled: true });
    };

    // Toggle Assignment for SPECIFIC PERSONA
    const toggleToolAssignment = async (actionId, forceState = null) => {
        if (!personaId) return toast.error("Selecciona una identidad primero.");

        const currentSet = new Set(assignedActionIds);
        const isAssigned = currentSet.has(actionId);

        // Determine next state
        const shouldEnable = forceState !== null ? forceState : !isAssigned;

        if (shouldEnable) currentSet.add(actionId);
        else currentSet.delete(actionId);

        try {
            await updateDoc(doc(db, 'personas', personaId), {
                enabledToolIds: Array.from(currentSet)
            });
            // Toast is noisy for toggles, maybe skip?
        } catch (e) {
            console.error(e);
            toast.error("Error asignando herramienta");
        }
    };

    // Demo Injection
    const handleLoadDemo = async () => {
        if (!user) return;
        if (!confirm("¿Cargar 10 acciones de ejemplo?")) return;
        setLoading(true);
        try {
            const batch = [];
            DEMO_ACTIONS.forEach(act => {
                if (!actions.find(a => a.trigger === act.trigger)) {
                    batch.push(addDoc(collection(db, 'actions'), {
                        ...act,
                        ownerId: user.uid,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }));
                }
            });
            await Promise.all(batch);
            toast.success("Ejemplos cargados");
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full bg-gray-950 text-white font-sans overflow-hidden">
            {/* LEFT: LIST */}
            <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
                <div className="p-4 border-b border-gray-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider">Módulos de Acción</h3>
                        <div className="flex gap-1">
                            <button onClick={handleLoadDemo} className="p-1 hover:bg-gray-800 rounded text-purple-400" title="Cargar Ejemplos">
                                <Zap className="w-4 h-4" />
                            </button>
                            <button onClick={handleCreateNew} className="p-1 hover:bg-gray-800 rounded text-blue-400" title="Nueva Acción">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {personaData && (
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-900 p-1 rounded px-2 border border-gray-800">
                            <span className="text-gray-400">Configurando para:</span>
                            <strong className="text-blue-300">{personaData.name}</strong>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {actions.map(act => {
                        const isAssigned = assignedActionIds.has(act.id);
                        return (
                            <div
                                key={act.id}
                                className={`group flex items-center pr-2 rounded-lg transition-colors border ${selectedActionId === act.id
                                        ? 'bg-blue-900/20 border-blue-900/50'
                                        : 'hover:bg-gray-800 border-transparent hover:border-gray-700'
                                    }`}
                            >
                                {/* SELECTION CLICK AREA */}
                                <button
                                    onClick={() => setSelectedActionId(act.id)}
                                    className="flex-1 text-left px-3 py-3 flex items-center gap-3 overflow-hidden"
                                >
                                    <Zap className={`w-4 h-4 shrink-0 ${isAssigned ? 'text-green-400' : 'text-gray-600'}`} />
                                    <div className="flex-1 truncate">
                                        <div className={`text-xs font-bold truncate ${selectedActionId === act.id ? 'text-blue-300' : 'text-gray-300'}`}>
                                            {act.name}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono truncate">{act.trigger}</div>
                                    </div>
                                </button>

                                {/* ASSIGNMENT TOGGLE */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleToolAssignment(act.id);
                                    }}
                                    className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${isAssigned ? 'bg-green-600' : 'bg-gray-700'
                                        }`}
                                    title={isAssigned ? "Desactivar para este agente" : "Activar para este agente"}
                                >
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isAssigned ? 'translate-x-4' : 'translate-x-0'
                                        }`} />
                                </button>
                            </div>
                        );
                    })}

                    {actions.length === 0 && !loading && (
                        <div className="text-center p-4 text-gray-600 text-xs italic">
                            No hay acciones definidas.
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: EDITOR */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full space-y-6">
                    {/* HEADER */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Terminal className="w-6 h-6 text-gray-500" />
                                {selectedActionId ? 'Editar Definición' : 'Crear Nueva Acción'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {selectedActionId
                                    ? "Edita la lógica de la herramienta. Esto afecta a TODOS los agentes que la usen."
                                    : "Define una nueva herramienta global."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedActionId && (
                                <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg flex items-center gap-2 text-xs font-bold">
                                    <Trash2 className="w-4 h-4" /> Eliminar Globalmente
                                </button>
                            )}
                            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-900/20">
                                <Save className="w-4 h-4" /> Guardar Cambios
                            </button>
                        </div>
                    </div>

                    {/* FORM */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Módulo</label>
                                <input
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none"
                                    placeholder="Ej: Inventory Search"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Trigger (Function Name)</label>
                                <input
                                    value={editForm.trigger}
                                    onChange={e => setEditForm({ ...editForm, trigger: e.target.value })}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm font-mono text-yellow-400 focus:border-yellow-500 outline-none"
                                    placeholder="Ej: searchInventory"
                                />
                            </div>
                            {/* NOTE: We removed 'Enabled' definition field to avoid confusion with Assignment. 
                                Or we keep it as 'Global Maintenance Mode'? 
                                Let's keep it but label it dearly. */}
                            <div className="flex items-center gap-3 pt-4 border-t border-gray-800 mt-2">
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase block">Mantenimiento Global</label>
                                    <span className="text-[10px] text-gray-600">Si se apaga, nadie puede usarla.</span>
                                </div>
                                <button
                                    onClick={() => setEditForm({ ...editForm, enabled: !editForm.enabled })}
                                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${editForm.enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${editForm.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción (System Prompt)</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={4}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-300 focus:border-blue-500 outline-none resize-none"
                                    placeholder="Explica al modelo cuándo y cómo usar esta herramienta..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SCHEMA EDITOR */}
                    <div className="flex-1 flex flex-col min-h-[300px]">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-2">
                            <Code className="w-4 h-4" /> JSON Schema (Function Definition)
                        </label>
                        <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden bg-gray-950">
                            <textarea
                                value={editForm.schema}
                                onChange={e => setEditForm({ ...editForm, schema: e.target.value })}
                                className="w-full h-full bg-[#1e1e1e] p-4 font-mono text-sm text-green-400 outline-none resize-none"
                                spellCheck={false}
                            />
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                            Define los parámetros esperados en formato JSON Schema estándar.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
