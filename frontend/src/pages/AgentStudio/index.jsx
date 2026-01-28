import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, doc, updateDoc, deleteDoc, addDoc, onSnapshot, setDoc, getDocs, query, where, writeBatch } from 'firebase/firestore'; // Added writeBatch, getDocs, query, where
import { toast } from 'react-hot-toast';
import {
    LayoutGrid, User, Plus, Trash2, Save, X, Brain, Sliders,
    Zap, Mic2, Users, RefreshCw, Sparkles, Fingerprint, Database,
    Download, Upload, Rocket, RotateCw // Added Rocket
} from 'lucide-react';
import PersonaTuner from './components/PersonaTuner';
import TraitTimeline from './components/TraitTimeline';
import AIStatusToggle from '../../components/common/AIStatusToggle';
import { useAgentData } from './hooks/useAgentData';
import ActionStudio from './components/ActionStudio';
import UserMatrix from './components/UserMatrix';
import DataSourceManager from './components/DataSourceManager';
import { setupCridaProfile } from './data/crida_setup';

/* 
 * Agent Studio v2.4 
 * - Fixed: Name Editing (Local State)
 * - Feature: Objectives (Pending Implementation)
 */
export default function AgentStudio() {
    const { user } = useAuth();

    // --- BACKUP & RESTORE ---
    const handleBackup = async () => {
        if (!user) return toast.error("Debes iniciar sesión para respaldar.");
        const toastId = toast.loading("Generando respaldo...");
        try {
            // Fetch all modules
            const qP = query(collection(db, 'personas'), where('ownerId', '==', user.uid));
            const qA = query(collection(db, 'actions'), where('ownerId', '==', user.uid));
            const qM = query(collection(db, 'user_mappings'), where('ownerId', '==', user.uid));
            const qS = query(collection(db, 'sources'), where('ownerId', '==', user.uid));

            const [pSnap, aSnap, mSnap, sSnap] = await Promise.all([
                getDocs(qP), getDocs(qA), getDocs(qM), getDocs(qS)
            ]);

            const backupData = {
                metadata: {
                    version: "1.0",
                    exportedAt: new Date().toISOString(),
                    exportedBy: user.email,
                    ownerId: user.uid
                },
                personas: pSnap.docs.map(d => ({ ...d.data(), _id: d.id })),
                actions: aSnap.docs.map(d => ({ ...d.data(), _id: d.id })),
                mappings: mSnap.docs.map(d => ({ ...d.data(), _id: d.id })),
                sources: sSnap.docs.map(d => ({ ...d.data(), _id: d.id }))
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `agent_studio_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Respaldo descargado", { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error("Error al exportar: " + e.message, { id: toastId });
        }
    };

    const handleRestore = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!confirm("⚠️ ADVERTENCIA: Esta acción restaurará los datos del respaldo. Se asignarán a TU usuario actual. ¿Continuar?")) return;

            const toastId = toast.loading("Restaurando datos...");
            try {
                const data = JSON.parse(event.target.result);
                const batch = writeBatch(db);
                let count = 0;

                // Helper to add to batch (handling batches > 500 later if needed, simple for now)
                const addToBatch = (collectionName, items) => {
                    if (!items) return;
                    items.forEach(item => {
                        const { _id, ...docData } = item;
                        // SECURITY: Force Owner ID to current user
                        // Use original ID if possible to avoid dupes on re-import
                        // If ID exists, we use it to overwrite. If not, autogen.
                        const ref = _id ? doc(db, collectionName, _id) : doc(collection(db, collectionName));
                        batch.set(ref, { ...docData, ownerId: user.uid, restoredAt: new Date() }, { merge: true });
                        count++;
                    });
                };

                addToBatch('personas', data.personas);
                addToBatch('actions', data.actions);
                addToBatch('user_mappings', data.mappings);
                addToBatch('sources', data.sources);

                await batch.commit();
                toast.success(`Restauración completa: ${count} registros`, { id: toastId });
                // Reload to refresh all views
                setTimeout(() => window.location.reload(), 1500);

            } catch (err) {
                console.error(err);
                toast.error("Error al restaurar: " + err.message, { id: toastId });
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    // UI Trigger for hidden input
    const triggerRestore = () => document.getElementById('restore-input').click();
    // ... prev code ...

    // --- DEPLOY TO WHATSAPP ---
    const [deployedId, setDeployedId] = useState(null); // Local state for active bot

    // Listen to "Live" Bot
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'deployments', 'whatsapp_bot_config'), doc => {
            if (doc.exists()) {
                const data = doc.data();
                setDeployedId(data.config?.personaId || null);
            }
        });
        return () => unsub();
    }, []);

    const handleDeploy = async (targetId = selectedPersonaId) => {
        if (!user || !targetId) return;
        const toastId = toast.loading("Desplegando al Bot Remoto...");

        try {
            // 1. Get Persona Data (Locally is faster if available)
            const personaData = personas.find(p => p.id === targetId);
            if (!personaData) throw new Error("Identidad no encontrada");

            // Allow deploying even if empty prompt (it might be dangerous, but let's just warn or require it)
            if (!personaData.system_prompt) throw new Error("La personalidad no tiene Prompt generado.");

            // 2. Get Enabled Actions
            const qA = query(collection(db, 'actions'), where('ownerId', '==', user.uid), where('enabled', '==', true));
            const aSnap = await getDocs(qA);
            const actions = aSnap.docs.map(d => ({
                name: d.data().name,
                trigger: d.data().trigger,
                description: d.data().description,
                parameters: d.data().parameters || {}
            }));

            // 3. Payload
            const payload = {
                target: "whatsapp_bot",
                deployedAt: new Date(),
                deployedBy: user.email,
                config: {
                    personaId: targetId, // CRITICAL FOR TRACKING
                    botName: personaData.name,
                    systemPrompt: personaData.system_prompt,
                    actions: actions
                }
            };

            // 4. WRITE TO DEAD DROP (Single Doc)
            await setDoc(doc(db, 'deployments', 'whatsapp_bot_config'), payload);

            toast.success(`¡${personaData.name} está EN VIVO!`, { id: toastId });

        } catch (e) {
            console.error(e);
            toast.error("Error desplegando: " + e.message, { id: toastId });
        }
    };


    // --- STATE ---
    const [personas, setPersonas] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    const [viewMode, setViewMode] = useState('tuner');

    const [loading, setLoading] = useState(true);

    // --- DATA SUBSCRIPTION ---
    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, 'personas'), where('ownerId', '==', user.uid));

        const unsub = onSnapshot(q, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPersonas(list);

            // Select default if nothing selected
            if (!selectedPersonaId && list.length > 0) {
                const def = list.find(p => p.is_default) || list[0];
                setSelectedPersonaId(def.id);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error subscribing to personas:", err);
            // Optionally set loading false even on error
            setLoading(false);
        });

        return () => unsub();
    }, [user, selectedPersonaId]);

    // Derived State
    const activePersona = personas.find(p => p.id === selectedPersonaId) || {};

    // --- LOCAL STATE FOR EDITING ---
    const [localName, setLocalName] = useState("");

    // Sync local name when active persona changes
    useEffect(() => {
        if (activePersona.name) setLocalName(activePersona.name);
    }, [activePersona.id, activePersona.name]); // Depend on ID/Name to reset

    // --- HANDLERS ---
    const commitNameUpdate = async () => {
        if (!selectedPersonaId || localName === activePersona.name) return;
        try {
            await updateDoc(doc(db, 'personas', selectedPersonaId), {
                name: localName,
                updatedAt: new Date()
            });
            toast.success("Nombre actualizado");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleCreatePersona = async () => {
        const name = prompt("Nombre de la nueva identidad:");
        if (!name) return;

        try {
            const docRef = await addDoc(collection(db, 'personas'), {
                name,
                description: "Nueva identidad vacía.",
                system_prompt: "Eres un asistente útil.",
                createdAt: new Date(),
                createdBy: user.email,
                is_default: false
            });
            setSelectedPersonaId(docRef.id);
            toast.success("Identidad creada");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const handleDeletePersona = async () => {
        if (!selectedPersonaId || !confirm(`¿Eliminar ${activePersona.name}?`)) return;
        try {
            await deleteDoc(doc(db, 'personas', selectedPersonaId));
            setSelectedPersonaId(null);
            toast.success("Eliminado");
        } catch (e) {
            toast.error(e.message);
        }
    };

    const updateActivePersona = async (updates) => {
        if (!selectedPersonaId) return;
        try {
            await updateDoc(doc(db, 'personas', selectedPersonaId), {
                ...updates,
                updatedAt: new Date()
            });
        } catch (e) {
            toast.error(e.message);
        }
    };

    // --- RENDER ---
    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans">

            {/* 1. SIDEBAR (Identity Switcher) */}
            <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="font-bold flex items-center gap-2 text-lg text-blue-400">
                        <LayoutGrid className="w-5 h-5" /> Agent Studio
                    </h2>
                </div>

                {/* Persona List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <div className="text-xs font-bold text-gray-500 uppercase px-2 py-2 flex justify-between items-center">
                        <span>Identidades Activas</span>
                        <div className="flex items-center gap-1 text-[9px] bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5" title="Estado del Bot">
                            <span className={`w-1.5 h-1.5 rounded-full ${deployedId ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            {deployedId ? 'CONECTADO' : 'DESCONECTADO'}
                        </div>
                    </div>

                    {personas.map(p => {
                        const isDeployed = deployedId === p.id;
                        return (
                            <div
                                key={p.id}
                                className={`group w-full relative flex items-center pr-2 rounded-lg transition-all ${selectedPersonaId === p.id
                                    ? 'bg-blue-900/30 border border-blue-800'
                                    : 'hover:bg-gray-800 border border-transparent hover:border-gray-700'
                                    }`}
                            >
                                <button
                                    onClick={() => setSelectedPersonaId(p.id)}
                                    className="flex-1 text-left px-3 py-2 flex items-center gap-3"
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${selectedPersonaId === p.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
                                        }`}>
                                        {(p.name?.[0] || '?').toUpperCase()}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <div className={`font-medium text-sm truncate ${isDeployed ? 'text-green-400' : (selectedPersonaId === p.id ? 'text-blue-200' : 'text-gray-400')}`}>
                                            {p.name}
                                        </div>
                                        {isDeployed && <div className="text-[9px] text-green-500 font-bold flex items-center gap-1">
                                            <span className="w-1 h-1 bg-green-500 rounded-full"></span> EN VIVO (WHATSAPP)
                                        </div>}
                                        {!isDeployed && p.is_default && <div className="text-[9px] text-gray-500 font-bold">AGENTE PRINCIPAL</div>}
                                    </div>
                                </button>

                                {/* DEPLOY BUTTON (On Hover or if Active) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeploy(p.id);
                                    }}
                                    className={`p-1.5 rounded-md transition-all mr-1 ${isDeployed
                                        ? 'bg-green-500/20 text-green-400 opacity-100'
                                        : 'opacity-0 group-hover:opacity-100 hover:bg-gray-700 text-gray-400 hover:text-white'
                                        }`}
                                    title={isDeployed ? "Activo en WhatsApp" : "Desplegar a WhatsApp"}
                                >
                                    <Rocket className={`w-4 h-4 ${isDeployed ? 'fill-green-500/20' : ''}`} />
                                </button>
                            </div>
                        );
                    })}

                    <button
                        onClick={handleCreatePersona}
                        className="w-full mt-2 border border-dashed border-gray-700 rounded-lg p-2 text-xs text-gray-500 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus className="w-3 h-3" /> Nueva Identidad
                    </button>
                </div>

                {/* Footer */}
                {/* Footer: System Actions */}
                <div className="p-3 border-t border-gray-800 bg-gray-900/50 space-y-2">
                    <input type="file" id="restore-input" hidden accept=".json" onChange={handleRestore} />



                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleBackup} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 flex items-center justify-center gap-2 transition-colors" title="Descargar Respaldo Total">
                            <Download className="w-3 h-3" /> <span className="text-[10px]">Backup</span>
                        </button>
                        <button onClick={triggerRestore} className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 flex items-center justify-center gap-2 transition-colors" title="Restaurar Sistema">
                            <Upload className="w-3 h-3" /> <span className="text-[10px]">Restore</span>
                        </button>
                    </div>

                    {/* REMOTE RESTART (New) */}
                    <button
                        onClick={async () => {
                            if (!confirm("¿Seguro que deseas REINICIAR el Agente Remoto? Esto interrumpirá el servicio unos segundos.")) return;
                            try {
                                await updateDoc(doc(db, "system", "agent_commands"), { restart: true });
                                toast.success("Comando de reinicio enviado. 🫡");
                            } catch (e) {
                                console.error(e);
                                toast.error("Error enviando comando: " + e.message);
                            }
                        }}
                        className="w-full py-2 bg-red-900/10 hover:bg-red-900/20 text-red-500 rounded border border-red-900/20 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 text-[10px] font-bold mt-2"
                        title="Reinicia el proceso Node.js en la PC remota para aplicar cambios de código."
                    >
                        <RotateCw className="w-3 h-3" /> REINICIAR AGENTE REMOTO
                    </button>

                    {/* RESCUE MISSION (Temporary) */}
                    <button
                        onClick={async () => {
                            const toastId = toast.loading("Buscando agentes perdidos...");
                            try {
                                const allSnap = await getDocs(collection(db, 'personas'));
                                const batch = writeBatch(db);
                                let count = 0;

                                allSnap.docs.forEach(d => {
                                    if (d.data().ownerId !== user.uid) {
                                        batch.update(d.ref, { ownerId: user.uid, recoveredAt: new Date() });
                                        count++;
                                    }
                                });

                                if (count > 0) {
                                    await batch.commit();
                                    toast.success(`¡${count} agentes recuperados!`, { id: toastId });
                                    setTimeout(() => window.location.reload(), 1500);
                                } else {
                                    toast("No hay nadie perdido.", { icon: "🤷‍♂️", id: toastId });
                                }
                            } catch (e) {
                                console.error(e);
                                toast.error(e.message, { id: toastId });
                            }
                        }}
                        className="w-full py-2 bg-blue-900/10 hover:bg-blue-900/20 text-blue-500 rounded border border-blue-900/20 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 text-[10px] font-bold mt-2"
                    >
                        <Sparkles className="w-3 h-3" /> RESCATAR AGENTES PERDIDOS
                    </button>

                    <div className="text-[9px] text-gray-600 text-center mt-1">v2.5 System: Ready</div>
                </div>
            </div>

            {/* 2. MAIN CONTEXT */}
            <div className="flex-1 flex flex-col bg-gray-950">

                {selectedPersonaId ? (
                    <>
                        {/* HEADER: CONFIG & TABS */}
                        <div className="h-20 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-md">
                            <div className="flex items-center gap-6 flex-1">

                                {/* IDENTITY METADATA (EDITABLE LOCAL STATE) */}
                                <div className="flex flex-col gap-1 w-1/3">
                                    <input
                                        value={localName}
                                        onChange={e => setLocalName(e.target.value)}
                                        onBlur={commitNameUpdate}
                                        onKeyDown={e => e.key === 'Enter' && commitNameUpdate()}
                                        className="bg-transparent text-xl font-bold text-white focus:bg-gray-800/50 rounded px-2 -ml-2 outline-none border border-transparent focus:border-gray-700 transition-all placeholder-gray-600"
                                        placeholder="Nombre Identidad..."
                                    />
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1 text-blue-400 border border-blue-900/30 bg-blue-900/10 px-1.5 py-0.5 rounded cursor-help" title="Fuente de Datos: Mirror DB">
                                            <Fingerprint className="w-3 h-3" /> WhatsApp (58k)
                                        </span>
                                        <span className="flex items-center gap-1 opacity-50 cursor-not-allowed">
                                            <Users className="w-3 h-3" /> Facebook (Pending)
                                        </span>
                                    </div>
                                </div>

                                {/* TABS (CENTERED/RIGHT) */}
                                <div className="flex bg-black rounded-lg p-1 border border-gray-800">
                                    {[
                                        { id: 'tuner', label: 'Personalidad', icon: Brain },
                                        { id: 'tools', label: 'Herramientas', icon: Zap },
                                        { id: 'matrix', label: 'Matriz', icon: Users },
                                        { id: 'history', label: 'Evolutivo', icon: Fingerprint },
                                        { id: 'sources', label: 'Fuentes', icon: Database },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setViewMode(tab.id)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === tab.id
                                                ? 'bg-gray-800 text-white shadow-sm border border-gray-700'
                                                : 'text-gray-500 hover:text-white'
                                                }`}
                                        >
                                            <tab.icon className="w-3 h-3" /> {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 border-l border-gray-800 pl-4 ml-4">
                                <button onClick={handleDeletePersona} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors" title="Eliminar Identidad Actual">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto p-6 relative">

                            {/* VIEW 1: TUNER (DEFAULT) */}
                            {viewMode === 'tuner' && (
                                <div className="h-full">
                                    <PersonaTuner personaId={selectedPersonaId} initialData={activePersona} />
                                </div>
                            )}

                            {/* VIEW 2: TOOLS (ACTION STUDIO) */}
                            {viewMode === 'tools' && (
                                <div className="h-full">
                                    <ActionStudio personaId={selectedPersonaId} personaData={activePersona} />
                                </div>
                            )}

                            {/* VIEW 4: USER MATRIX */}
                            {viewMode === 'matrix' && (
                                <div className="h-full">
                                    <UserMatrix personaId={selectedPersonaId} />
                                </div>
                            )}

                            {/* VIEW 3: HISTORY */}
                            {viewMode === 'history' && (
                                <div className="h-full">
                                    <TraitTimelineWrapper personaId={selectedPersonaId} />
                                </div>
                            )}

                            {/* VIEW 5: DATA SOURCES */}
                            {viewMode === 'sources' && (
                                <div className="h-full">
                                    <DataSourceManager />
                                </div>
                            )}

                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                        <Users className="w-16 h-16 mb-4 opacity-20" />
                        <p>Selecciona una identidad para comenzar.</p>
                    </div>
                )}
            </div>

        </div>
    );
}

// Wrapper to load timeline data safely
function TraitTimelineWrapper({ personaId }) {
    const { data, loading } = useAgentData();
    if (loading) return <div className="p-8 text-gray-500">Cargando línea de tiempo...</div>;
    return <TraitTimeline data={data} personaId={personaId} />;
}
