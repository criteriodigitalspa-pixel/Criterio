import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import {
    Bot, Plus, Save, Trash2, RefreshCw, Zap,
    MessageSquare, AlertTriangle, CheckCircle, Terminal
} from 'lucide-react';

export default function PersonaStudio() {
    const { user } = useAuth();
    const [personas, setPersonas] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [agentStatus, setAgentStatus] = useState('unknown');

    // Editor State
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        system_prompt: '',
        formatting_rules: '',
        common_phrases: '',
        is_default: false
    });

    // --- 1. LOAD DATA ---
    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'personas'),
            (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPersonas(list);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching personas:", error);
                toast.error("Error conectando a DB: " + error.message);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    // SEEDING FROM FRONTEND (Authenticated)
    const handleCreateDefault = async () => {
        try {
            const legacyPersona = {
                "name": "Diego 'El Jefe Irreverente'",
                "description": "Tono original del bot (Legacy). Directo, sarcástico e irreverente.",
                "system_prompt": "Soy Diego. Hablo de forma muy directa, al grano, a veces con frases cortas o divididas en varios mensajes. Mi tono es generalmente relajado, sarcástico y con humor irreverente, usando insultos amistosos como 'marico', 'mmgv', 'wn', 'mamarracho'. Utilizo apodos cariñosos como 'pp', 'papi', 'perrito', 'bb'. No me complico con la gramática perfecta ni la puntuación, y a veces uso mayúsculas para enfatizar la urgencia. Siempre termino mis chistes con 'jajajaja' o el emoji 🤣. Mis mensajes son una mezcla de órdenes, planes, quejas y comentarios sobre el día a día. Si me piden algo, puedo responder con emojis o textos muy concisos. No dudes en usar jerga venezolana y chilena. Mantén un ritmo rápido y despreocupado. A veces me quejo, pero siempre busco soluciones y motivo a seguir adelante. Recuerda mi mantra: 'El objetivo es solo 1. Tener mas que el mes anterior, siempre ganando mas de lo que gasto.' ¡A darle con todo!",
                "formatting_rules": [
                    "Escribe mensajes cortos y concisos, a menudo dividiendo ideas en múltiples líneas separadas, como si fueran viñetas.",
                    "Utiliza jergas y modismos venezolanos y chilenos con frecuencia (ej. 'marico', 'mmgv', 'wn', 'papi/pp', 'perrito', 'bb').",
                    "El humor es un elemento central: emplea sarcasmo, bromas subidas de tono y respuestas irreverentes. Siempre acompaña los chistes con 'jajajaja' o emojis de risa (🤣, 😂).",
                    "Emplea mayúsculas ocasionalmente para dar énfasis, urgencia o para destacar una palabra clave ('YA YA YA', 'PP ,E AVISAS').",
                    "Minimiza el uso de puntuación formal; comas y puntos pueden ser omitidos o usados de manera informal, priorizando la fluidez y el estilo conversacional."
                ],
                "common_phrases": [
                    "marico", "mmgv", "wn", "papi", "pp", "perrito", "bb", "jajajaja", "coño",
                    "Quejeso vale", "Que locura", "Fino", "Dale", "Tranqui", "beta", "luca", "pega",
                    "carteluo", "piola", "arrechera", "aweonao", "Brrr", "Chao", "Super", "Genial",
                    "Grandioso", "Cool", "Maravilloso", "Estupendo", "No lo hemos hablado",
                    "El objetivo es solo 1. Tener mas que el mes anterior, siempre ganando mas de lo que gasto."
                ],
                "is_default": true,
                "createdAt": new Date(),
                "updatedBy": user.email
            };

            await addDoc(collection(db, 'personas'), legacyPersona);
            toast.success("✅ Personalidad Default Restaurada");
        } catch (e) {
            toast.error("Error creando default: " + e.message);
        }
    };


    // --- 2. LOAD SELECTION ---
    useEffect(() => {
        if (selectedPersonaId) {
            const persona = personas.find(p => p.id === selectedPersonaId);
            if (persona) {
                setEditForm({
                    name: persona.name || '',
                    description: persona.description || '',
                    system_prompt: persona.system_prompt || '',
                    formatting_rules: (persona.formatting_rules || []).join('\n'), // Array to String
                    common_phrases: (persona.common_phrases || []).join('\n'), // Array to String
                    is_default: persona.is_default || false
                });
            }
        } else {
            // Reset for new
            setEditForm({
                name: '', description: '', system_prompt: '',
                formatting_rules: '', common_phrases: '', is_default: false
            });
        }
    }, [selectedPersonaId, personas]);

    // --- 3. ACTIONS ---
    const handleSave = async () => {
        if (!editForm.name || !editForm.system_prompt) {
            toast.error("El nombre y el prompt son obligatorios");
            return;
        }

        const dataToSave = {
            ...editForm,
            formatting_rules: editForm.formatting_rules.split('\n').filter(l => l.trim()),
            common_phrases: editForm.common_phrases.split('\n').filter(l => l.trim()),
            updatedAt: new Date(),
            updatedBy: user.email
        };

        try {
            if (selectedPersonaId) {
                await updateDoc(doc(db, 'personas', selectedPersonaId), dataToSave);
                toast.success("Personalidad actualizada");
            } else {
                await setDoc(doc(collection(db, 'personas')), dataToSave); // Auto ID
                toast.success("Nueva personalidad creada");
            }
        } catch (e) {
            toast.error("Error guardando: " + e.message);
        }
    };

    const handleDelete = async () => {
        if (!confirmedDelete) {
            setConfirmedDelete(true);
            setTimeout(() => setConfirmedDelete(false), 3000);
            return;
        }
        try {
            await deleteDoc(doc(db, 'personas', selectedPersonaId));
            toast.success("Eliminado correctamente");
            setSelectedPersonaId(null);
        } catch (e) {
            toast.error("Error eliminando: " + e.message);
        }
    };

    const [confirmedDelete, setConfirmedDelete] = useState(false);

    // --- 4. REMOTE RESTART (KILL SWITCH) ---
    const handleRemoteRestart = async () => {
        const confirm = window.confirm("¿Estás seguro? Esto apagará el agente remoto y lo forzará a descargar la última versión del código.");
        if (!confirm) return;

        try {
            await setDoc(doc(db, 'system', 'agent_commands'), {
                restart: true,
                triggeredBy: user.email,
                timestamp: new Date()
            }, { merge: true });
            toast.success("📡 Comando enviado. El agente debería reiniciarse en unos segundos.");
        } catch (e) {
            toast.error("Error enviando comando: " + e.message);
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">

            {/* LEFT: LIST */}
            <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-950/50">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="font-bold flex items-center gap-2">
                        <Bot className="text-blue-500" />
                        AI Personalities
                    </h2>
                    <button onClick={() => setSelectedPersonaId(null)} className="p-2 hover:bg-gray-800 rounded-full">
                        <Plus className="w-5 h-5 text-green-400" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading ? <p className="p-4 text-gray-500 animate-pulse">Cargando...</p> : (
                        personas.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-gray-500 mb-4">No hay personalidades.</p>
                                <button
                                    onClick={handleCreateDefault}
                                    className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 text-sm font-bold border border-blue-500/20"
                                >
                                    Restaurar Diego (Default)
                                </button>
                            </div>
                        ) : (
                            personas.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => setSelectedPersonaId(p.id)}
                                    className={`p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${selectedPersonaId === p.id ? 'bg-blue-900/20 border-l-4 border-l-blue-500' : ''}`}
                                >
                                    <div className="font-bold">{p.name} {p.is_default && <span className="text-xs bg-gray-700 px-1 rounded ml-2">Default</span>}</div>
                                    <div className="text-xs text-gray-500 truncate">{p.description}</div>
                                </div>
                            ))
                        )
                    )}
                </div>

                {/* REMOTE CONTROL FOOTER */}
                <div className="p-4 bg-gray-900 border-t border-gray-800">
                    <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Control Remoto</div>
                    <button
                        onClick={handleRemoteRestart}
                        className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-2 rounded-lg transition-all"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reiniciar Agente (Update)
                    </button>
                    <p className="text-[10px] text-gray-600 mt-2 text-center">
                        Úsalo después de guardar cambios para aplicarlos.
                    </p>
                </div>
            </div>

            {/* RIGHT: EDITOR */}
            <div className="flex-1 flex flex-col h-full bg-gray-900 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto w-full space-y-6">

                    {/* HEADER */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                {selectedPersonaId ? 'Editar Personalidad' : 'Crear Nueva Personalidad'}
                            </h1>
                            <p className="text-gray-400 mt-1">Define cómo se comporta la IA con tus clientes.</p>
                        </div>
                        <div className="flex gap-2">
                            {selectedPersonaId && (
                                <button
                                    onClick={handleDelete}
                                    className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${confirmedDelete ? 'bg-red-600 border-red-600 text-white' : 'border-gray-700 text-red-400 hover:bg-red-900/10'}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {confirmedDelete ? '¿Seguro?' : 'Eliminar'}
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-blue-900/20"
                            >
                                <Save className="w-4 h-4" />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>

                    {/* FORM */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre (Interno)</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej: Diego Sarcástico"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Breve nota sobre qué hace este bot..."
                                />
                            </div>
                            <div className="flex items-center gap-2 p-4 bg-gray-950 rounded-lg border border-gray-800">
                                <input
                                    type="checkbox"
                                    checked={editForm.is_default}
                                    onChange={e => setEditForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                    className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900"
                                />
                                <div>
                                    <div className="font-bold text-sm">Personalidad por Defecto</div>
                                    <div className="text-xs text-gray-500">Usar si no hay otra asignada al usuario.</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1"> System Prompt (Identidad)</label>
                                <textarea
                                    value={editForm.system_prompt}
                                    onChange={e => setEditForm(prev => ({ ...prev, system_prompt: e.target.value }))}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white h-[280px] font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Eres Diego, un asistente experto en..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Reglas de Estilo <span className="text-gray-600">(Una por línea)</span></label>
                            <textarea
                                value={editForm.formatting_rules}
                                onChange={e => setEditForm(prev => ({ ...prev, formatting_rules: e.target.value }))}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white h-40 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="- Usa emojis 😎&#10;- Sé breve&#10;- No uses mayúsculas"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Frases Comunes / Datos Curiosos <span className="text-gray-600">(Una por línea)</span></label>
                            <textarea
                                value={editForm.common_phrases}
                                onChange={e => setEditForm(prev => ({ ...prev, common_phrases: e.target.value }))}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white h-40 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Mano&#10;Dale con fé&#10;Avisame cualquier vaina"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
