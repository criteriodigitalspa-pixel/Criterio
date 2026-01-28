import React, { useState, useEffect } from 'react';
import { db } from '../../../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Users, Plus, Trash2, Save, Smartphone, Link as LinkIcon, Zap, Brain } from 'lucide-react';
import { DEMO_USERS } from '../data/demo_data';
import contacts from '../data/master_contacts.json';
import { useAuth } from '../../../context/AuthContext';

export default function UserMatrix({ personaId }) {
    const { user } = useAuth();
    const [mappings, setMappings] = useState([]);
    const [selectedMappingId, setSelectedMappingId] = useState(null);

    // Config Data
    const [personas, setPersonas] = useState([]);
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    // View Filter State
    const [showAllUsers, setShowAllUsers] = useState(!personaId);

    // Editor State
    const [editForm, setEditForm] = useState({
        phoneNumber: '',
        name: '',
        personaId: personaId || '', // Auto-fill
        actionIds: []
    });

    // Update local state when prop changes
    useEffect(() => {
        if (personaId) {
            setEditForm(prev => ({ ...prev, personaId }));
            setShowAllUsers(false);
        } else {
            setShowAllUsers(true);
        }
    }, [personaId]);

    // 1. Load Data
    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // MIGRATION MODE: Fetch ALL (legacy) to allow claiming
            // Once migrated, we can revert to strict filtering
            // Security Fix: Query only owned documents to match Firestore Rules
            const qOwner = where('ownerId', '==', user.uid);

            // DEBUG: Log UID to verify auth state
            console.log("🔍 Fetching Matrix Data for User:", user.uid);

            // 1. Mappings (Private)
            try {
                const mapSnap = await getDocs(query(collection(db, 'user_mappings'), qOwner));
                setMappings(mapSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("❌ Error fetching USER_MAPPINGS:", e);
                toast.error(`Error loading Mappings: ${e.message}`);
            }

            // 2. Personas (Public/Shared)
            try {
                const perSnap = await getDocs(collection(db, 'personas'));
                setPersonas(perSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("❌ Error fetching PERSONAS:", e);
                toast.error(`Error loading Personas: ${e.message}`);
            }

            // 3. Actions (Private)
            try {
                const actSnap = await getDocs(query(collection(db, 'actions'), qOwner));
                setActions(actSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("❌ Error fetching ACTIONS:", e);
                toast.error(`Error loading Actions: ${e.message}`);
            }
        } catch (err) {
            console.error("❌ Error General:", err);
            toast.error("Error crítico cargando matriz.");
        } finally {
            setLoading(false);
        }
    };

    const handleMigrateData = async () => {
        if (!confirm(`¿Asignar TODOS los ${mappings.length + personas.length + actions.length} registros existentes a TU usuario actual?`)) return;

        setLoading(true);
        try {
            const batch = [];
            // Claim Mappings
            mappings.filter(m => !m.ownerId).forEach(m => {
                batch.push(updateDoc(doc(db, 'user_mappings', m.id), { ownerId: user.uid }));
            });
            // Claim Personas
            personas.filter(p => !p.ownerId).forEach(p => {
                batch.push(updateDoc(doc(db, 'personas', p.id), { ownerId: user.uid }));
            });
            // Claim Actions
            actions.filter(a => !a.ownerId).forEach(a => {
                batch.push(updateDoc(doc(db, 'actions', a.id), { ownerId: user.uid }));
            });

            await Promise.all(batch);
            toast.success("¡Datos migrados exitosamente!");
            window.location.reload();
        } catch (e) {
            toast.error("Error migrando: " + e.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    // 2. Sync Selection
    useEffect(() => {
        if (selectedMappingId) {
            const map = mappings.find(m => m.id === selectedMappingId);
            if (map) {
                setEditForm({
                    phoneNumber: map.phoneNumber || '',
                    name: map.name || '',
                    personaId: map.personaId || '',
                    actionIds: map.actionIds || []
                });
            }
        } else {
            setEditForm({ phoneNumber: '', name: '', personaId: personaId || '', actionIds: [] });
        }
    }, [selectedMappingId, mappings, personaId]);

    // 3. Handlers
    const toggleAction = (actionId) => {
        const current = new Set(editForm.actionIds);
        if (current.has(actionId)) current.delete(actionId);
        else current.add(actionId);
        setEditForm({ ...editForm, actionIds: Array.from(current) });
    };

    const handleSave = async () => {
        if (!user) return;
        if (!editForm.phoneNumber) return toast.error("El número de teléfono es obligatorio (ID)");

        try {
            if (selectedMappingId) {
                await updateDoc(doc(db, 'user_mappings', selectedMappingId), {
                    ...editForm,
                    updatedAt: new Date()
                });
                toast.success("Mapeo actualizado");
            } else {
                const docRef = await addDoc(collection(db, 'user_mappings'), {
                    ...editForm,
                    ownerId: user.uid, // TAG WITH OWNER
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                setSelectedMappingId(docRef.id);
                toast.success("Usuario registrado");
            }
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleDelete = async () => {
        if (!selectedMappingId || !confirm("¿Eliminar este usuario del sistema?")) return;
        try {
            await deleteDoc(doc(db, 'user_mappings', selectedMappingId));
            setSelectedMappingId(null);
            toast.success("Usuario eliminado");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleCreateNew = () => {
        setSelectedMappingId(null);
        setEditForm({ phoneNumber: '', name: 'Nuevo Usuario', personaId: personaId || '', actionIds: [] });
    };

    // Demo Injection
    const handleLoadDemo = async () => {
        // Debug
        console.log("Starting Demo Load...");

        if (!user) return;
        if (!confirm("¿Crear usuarios de demostración?")) return;

        setLoading(true);
        try {
            console.log("Creating users...");
            const batch = [];
            // Get first available persona and action to attach to demo users
            const defaultPersona = personas[0]?.id || '';
            const defaultActions = actions.slice(0, 3).map(a => a.id);

            DEMO_USERS.forEach(usr => {
                // Client-side uniqueness check (only against loaded mappings for this user)
                if (!mappings.find(m => m.phoneNumber === usr.phoneNumber)) {
                    batch.push(addDoc(collection(db, 'user_mappings'), {
                        ...usr,
                        personaId: defaultPersona,
                        actionIds: defaultActions,
                        ownerId: user.uid, // TAG WITH OWNER
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }));
                }
            });
            await Promise.all(batch);
            toast.success(`${batch.length} Usuarios demo creados`);
            fetchData(); // Refresh list
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };


    // Derived
    const activePersona = personas.find(p => p.id === editForm.personaId);

    // Filter Logic
    const filteredMappings = showAllUsers
        ? mappings
        : mappings.filter(m => m.personaId === personaId);

    // View State
    const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'contacts'

    return (
        <div className="flex h-full bg-gray-950 text-white font-sans overflow-hidden">
            {/* LEFT: SIDEBAR */}
            <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-900/50">

                {/* TABS HEADER */}
                <div className="p-2 border-b border-gray-800 grid grid-cols-2 gap-1 bg-gray-900">
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors ${activeTab === 'matrix' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <LinkIcon className="w-3 h-3" /> Matriz
                    </button>
                    <button
                        onClick={() => setActiveTab('contacts')}
                        className={`text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors ${activeTab === 'contacts' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Users className="w-3 h-3" /> Directorio
                    </button>
                </div>

                {/* CONTENT: MAPPINGS LIST */}
                {activeTab === 'matrix' && (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-3 border-b border-gray-800 bg-gray-900/30 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    {showAllUsers ? "Todos los Usuarios" : "Usuarios Asignados"}
                                </span>
                                <div className="flex gap-1">
                                    <button onClick={handleCreateNew} className="p-1 hover:bg-gray-800 rounded text-green-400" title="Nuevo Usuario">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {/* FILTER TOGGLE */}
                            {personaId && (
                                <button
                                    onClick={() => setShowAllUsers(!showAllUsers)}
                                    className={`w-full text-[10px] py-1 rounded border border-dashed flex justify-center items-center gap-1 transition-colors ${showAllUsers ? 'border-gray-700 text-gray-500' : 'border-blue-900/50 text-blue-400 bg-blue-900/10'
                                        }`}
                                >
                                    {showAllUsers ? "Filtrar por esta Identidad" : `Mostrando solo para: ${personas.find(p => p.id === personaId)?.name || '...'}`}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {filteredMappings.map(map => {
                                const persona = personas.find(p => p.id === map.personaId);
                                const actionCount = (map.actionIds || []).length;
                                return (
                                    <button
                                        key={map.id}
                                        onClick={() => setSelectedMappingId(map.id)}
                                        className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${selectedMappingId === map.id ? 'bg-green-900/30 text-green-300 border border-green-800' : 'text-gray-400 hover:bg-gray-800'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-500">
                                            {map.name ? map.name[0].toUpperCase() : <Users className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 truncate">
                                            <div className="text-xs font-bold truncate text-white">{map.name || 'Sin Nombre'}</div>
                                            <div className="text-[10px] text-gray-500 font-mono truncate">{map.phoneNumber}</div>
                                        </div>
                                        {actionCount > 0 && <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-yellow-500">{actionCount} ⚡</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* CONTENT: CONTACTS LIST */}
                {activeTab === 'contacts' && (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-3 border-b border-gray-800 bg-gray-900/30">
                            <input
                                className="w-full bg-gray-950 border border-gray-700 rounded p-1.5 text-xs text-white outline-none focus:border-blue-500"
                                placeholder="Buscar contacto..."
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {contacts.sort((a, b) => (b.mentions || 0) - (a.mentions || 0)).slice(0, 100).map(c => (
                                <div key={c.id} className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-gray-800 border border-transparent hover:border-gray-700 group">
                                    <div className="w-8 h-8 rounded-full bg-blue-900/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-900/30">
                                        {c.name ? c.name[0].toUpperCase() : '?'}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <div className="text-xs font-bold truncate text-gray-300">{c.name}</div>
                                        <div className="text-[10px] text-gray-500 truncate">{c.role}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setActiveTab('matrix');
                                            handleCreateNew();
                                            setEditForm(prev => ({ ...prev, name: c.name }));
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 bg-green-900/50 text-green-400 rounded hover:bg-green-600 hover:text-white transition-all"
                                        title="Importar a Matriz"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT: CONFIG OR DETAIL */}
            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                {activeTab === 'matrix' ? (
                    <div className="max-w-3xl mx-auto w-full space-y-8">
                        {/* [EXISTING MATRIX EDITOR CODE] */}
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <LinkIcon className="w-6 h-6 text-gray-500" />
                                    {selectedMappingId ? 'Editar Asignación' : 'Nuevo Registro'}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">Conecta "Quién es" (Identidad) y "Qué puede hacer" (Acciones) a un número de teléfono.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedMappingId && (
                                    <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-900/20 rounded-lg flex items-center gap-2 text-xs font-bold">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-green-900/20">
                                    <Save className="w-4 h-4" /> Guardar
                                </button>
                            </div>
                        </div>

                        {/* BASIC INFO */}
                        <div className="grid grid-cols-2 gap-6 bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <Users className="w-3 h-3" /> Nombre Usuario
                                </label>
                                <input
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-green-500 outline-none"
                                    placeholder="Ej: Diego (Admin)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <Smartphone className="w-3 h-3" /> WhatsApp ID
                                </label>
                                <input
                                    value={editForm.phoneNumber}
                                    onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm font-mono text-green-400 focus:border-green-500 outline-none"
                                    placeholder="549351..."
                                />
                            </div>
                        </div>

                        {/* IDENTITY SELECTOR (Scoped vs Global) */}
                        <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                <Brain className="w-4 h-4 text-purple-400" /> Identidad Asignada
                            </label>

                            {personaId ? (
                                // SCOPED MODE: Read Only
                                <div className="flex items-center gap-3 p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg">
                                    <div className="w-10 h-10 rounded-full bg-purple-900/20 flex items-center justify-center text-purple-400 font-bold">
                                        {activePersona?.name?.[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-gray-200">
                                            {activePersona?.name}
                                        </div>
                                        <div className="text-xs text-purple-400/70">
                                            Este usuario interactuará exclusivamente con esta identidad.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // GLOBAL MODE: Selector
                                <div className="grid grid-cols-3 gap-3">
                                    {personas.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setEditForm({ ...editForm, personaId: p.id })}
                                            className={`text-left p-3 rounded-lg border transition-all ${editForm.personaId === p.id
                                                ? 'bg-purple-900/20 border-purple-500 ring-1 ring-purple-500'
                                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                                                }`}
                                        >
                                            <div className={`text-sm font-bold ${editForm.personaId === p.id ? 'text-purple-300' : 'text-gray-300'}`}>{p.name}</div>
                                            <div className="text-[10px] text-gray-500 mt-1 truncate">{p.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ACTION SELECTOR */}
                        <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-500" /> Acciones Habilitadas
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {actions.map(act => {
                                    const isSelected = editForm.actionIds.includes(act.id);
                                    return (
                                        <button
                                            key={act.id}
                                            onClick={() => toggleAction(act.id)}
                                            className={`flex items - start gap - 3 text - left p - 3 rounded - lg border transition - all ${isSelected
                                                ? 'bg-yellow-900/10 border-yellow-600/50'
                                                : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                                                } `}
                                        >
                                            <div className={`w - 4 h - 4 mt - 0.5 rounded border flex items - center justify - center ${isSelected ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'} `}>
                                                {isSelected && <div className="w-2 h-2 bg-black rounded-sm" />}
                                            </div>
                                            <div>
                                                <div className={`text - sm font - bold ${isSelected ? 'text-yellow-100' : 'text-gray-400'} `}>{act.name}</div>
                                                <div className="text-[10px] text-gray-600 font-mono mt-0.5">{act.trigger}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {actions.length === 0 && <div className="text-gray-500 text-xs italic p-2">No hay acciones disponibles. Crea una en Herramientas.</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600">
                        <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center mb-6">
                            <Users className="w-10 h-10 text-gray-700" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-300 mb-2">Directorio de Contactos (Espejo)</h3>
                        <p className="max-w-md text-center text-sm">
                            Esta lista proviene del análisis de WhatsApp de "Project Mirror".
                            <br />Usa el botón <span className="inline-block bg-green-900/50 text-green-400 px-1 rounded text-[10px]"><Plus className="w-2 h-2 inline" /></span> para importar un contacto a la Matriz de Usuarios.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
