import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Check, Brain, MessageSquare, Fingerprint, Plus, Edit3, Lock, Target, Zap, DollarSign } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';
import masterPersona from '../data/master_persona.json';
import { compileSystemPrompt } from '../lib/PromptCompiler';
import MemoryEditor from './MemoryEditor';
import PersonaSimulator from './PersonaSimulator';
import cloneMatrix from '../data/clone_matrix.json';
import mirrorDB from '../data/mirror_db.json';

export default function PersonaTuner({ personaId, initialData }) {
    const { user } = useAuth();

    // --- STATE INITIALIZATION ---
    const [selectedTraits, setSelectedTraits] = useState(new Set());
    const [customTraits, setCustomTraits] = useState([]);
    const [selectedMemories, setSelectedMemories] = useState(new Set());
    const [customMemories, setCustomMemories] = useState([]);
    const [objectives, setObjectives] = useState([]);

    // Config State
    const [baseMood, setBaseMood] = useState("Neutral/Casual");
    const [useMirrorDB, setUseMirrorDB] = useState(true);
    const [intelligenceLevel, setIntelligenceLevel] = useState(30); // 0-100% PRO usage sensitivity

    // Operational State
    const [autoSync, setAutoSync] = useState(true);
    const [showSimulator, setShowSimulator] = useState(false);
    const [generatedPrompt, setGeneratedPrompt] = useState("");

    // UI Helpers
    const [newTraitInput, setNewTraitInput] = useState("");
    const [newObjectiveInput, setNewObjectiveInput] = useState("");
    const [showMemoryForm, setShowMemoryForm] = useState(false);
    const [editingMemory, setEditingMemory] = useState(null);
    const [newMemory, setNewMemory] = useState({ year: '2026', event: '', description: '', sentiment: 'Neutral' });

    const MOOD_OPTIONS = [
        "Neutral", "Happy", "Professional", "Sarcastic", "Irreverent",
        "Dry", "Warm", "Volatile", "Intellectual", "Flirty", "Defensive", "Direct"
    ];

    // --- HYDRATION ---
    useEffect(() => {
        if (!initialData) return;
        console.log("Hydrating PersonaTuner for:", initialData.name);

        // 1. Traits
        console.log("🔍 [PersonaTuner] Hydrating traits for:", initialData.name);
        console.log("   - initialData.traits:", initialData.traits);
        console.log("   - Type:", typeof initialData.traits, "IsArray:", Array.isArray(initialData.traits));

        if (initialData.traits && Array.isArray(initialData.traits)) {
            console.log("   - Setting traits:", initialData.traits.length, "items");
            setSelectedTraits(new Set(initialData.traits));
        } else if (initialData.is_default) {
            setSelectedTraits(new Set(masterPersona.traits.slice(0, 10).map(t => t.id)));
        } else {
            console.log("   - No traits found, setting empty");
            setSelectedTraits(new Set());
        }

        // 2. Memories
        if (initialData.memories && Array.isArray(initialData.memories)) {
            const set = new Set(initialData.memories.map(m => JSON.stringify(m)));
            setSelectedMemories(set);
        } else if (initialData.is_default) {
            const set = new Set(masterPersona.memory_bank.slice(-10).map(m => JSON.stringify(m)));
            setSelectedMemories(set);
        } else {
            setSelectedMemories(new Set());
        }

        // 3. Objectives
        if (initialData.objectives && Array.isArray(initialData.objectives)) {
            setObjectives(initialData.objectives);
        } else {
            setObjectives([]);
        }

        // 4. Config
        if (initialData.base_mood) setBaseMood(initialData.base_mood);
        if (initialData.intelligence_level !== undefined) setIntelligenceLevel(initialData.intelligence_level);

        if (initialData.use_mirror_db !== undefined) {
            setUseMirrorDB(initialData.use_mirror_db);
        } else {
            setUseMirrorDB(!!initialData.is_default);
        }

        // 5. Prompt
        setGeneratedPrompt(initialData.system_prompt || "");

    }, [personaId]);


    // --- ACTIONS --- (Keep add/remove logic...)
    const toggleTrait = (id) => {
        const next = new Set(selectedTraits);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedTraits(next);
    };

    const addCustomTrait = () => {
        if (!newTraitInput.trim()) return;
        const id = `custom_${Date.now()}`;
        const t = { id, label: newTraitInput.trim(), isCustom: true };
        setCustomTraits([...customTraits, t]);
        setSelectedTraits(prev => new Set(prev).add(id));
        setNewTraitInput("");
    };

    const addObjective = () => {
        if (!newObjectiveInput.trim()) return;
        setObjectives([...objectives, newObjectiveInput.trim()]);
        setNewObjectiveInput("");
    };

    const removeObjective = (index) => {
        const next = [...objectives];
        next.splice(index, 1);
        setObjectives(next);
    };

    const toggleMemory = (m) => {
        const str = JSON.stringify(m);
        const next = new Set(selectedMemories);
        if (next.has(str)) next.delete(str);
        else next.add(str);
        setSelectedMemories(next);
    };

    const addCustomMemory = () => {
        if (!newMemory.event) return toast.error("Evento requerido");
        const mem = { ...newMemory, isCustom: true };
        setCustomMemories([...customMemories, mem]);
        setSelectedMemories(prev => new Set(prev).add(JSON.stringify(mem)));
        setShowMemoryForm(false);
        setNewMemory({ year: '2026', event: '', description: '', sentiment: 'Neutral' });
    };

    const handleMemoryUpdate = (updatedMem) => {
        const mem = { ...updatedMem, isCustom: true };
        setCustomMemories(prev => [...prev, mem]);
        setSelectedMemories(prev => new Set(prev).add(JSON.stringify(mem)));
        setEditingMemory(null);
    };


    // --- COMPILER ENGINE ---
    useEffect(() => {
        if (!autoSync || !initialData) return;

        const allTraitsSource = [...masterPersona.traits, ...customTraits];
        const activeTraits = allTraitsSource.filter(t => selectedTraits.has(t.id));
        const activeMemories = Array.from(selectedMemories).map(s => JSON.parse(s)).sort((a, b) => a.year - b.year);

        const prompt = compileSystemPrompt({
            name: initialData.name,
            traits: activeTraits,
            memories: activeMemories,
            objectives,
            vocabulary: masterPersona.vocabulary,
            samples: initialData.is_default ? (masterPersona.style_samples || []) : [],
            baseInstruction: "You are an AI assistant.",
            baseMood,
            timeContext: {
                timestamp: new Date().toLocaleString(),
                timeOfDay: new Date().getHours() < 12 ? 'Morning' : (new Date().getHours() < 18 ? 'Afternoon' : 'Night')
            },
            cloneMatrix: initialData.is_default ? cloneMatrix : null,
            mirrorDB: useMirrorDB ? mirrorDB : null,
            selectedRole: null // DISABLED FOR STORAGE (Pure Prompt)
        });

        setGeneratedPrompt(prompt);
    }, [
        initialData?.name, selectedTraits, selectedMemories, customTraits, objectives,
        autoSync, baseMood, useMirrorDB, personaId
    ]);


    // --- SAVE ---
    const handleSave = async () => {
        if (!personaId) return;
        try {
            await updateDoc(doc(db, 'personas', personaId), {
                system_prompt: generatedPrompt,
                traits: Array.from(selectedTraits),
                memories: Array.from(selectedMemories).map(s => JSON.parse(s)),
                objectives,
                base_mood: baseMood,
                use_mirror_db: useMirrorDB,
                intelligence_level: intelligenceLevel,
                ownerId: user.uid,
                updatedAt: new Date(),
                description: `Tuned with ${selectedTraits.size} traits & ${selectedMemories.size} memories.`
            });
            toast.success("Personalidad Actualizada");
        } catch (e) {
            toast.error(e.message);
        }
    };

    // Render Lists
    // Traits: Always show the master library (shared catalog) + any custom traits
    // useMirrorDB only affects memories (contextual data), not the trait catalog
    const renderTraits = [...customTraits, ...masterPersona.traits];

    const renderMemories = useMirrorDB
        ? [...masterPersona.memory_bank, ...customMemories].sort((a, b) => a.year - b.year)
        : customMemories.sort((a, b) => a.year - b.year);

    return (
        <div className="flex h-full gap-6">

            {/* LEFT: CONTROLS */}
            <div className="w-1/2 overflow-y-auto space-y-8 pr-2 custom-scrollbar pb-20">

                {/* --- V5/V9: CONTEXT ENGINE & MASKS --- */}
                {/* MOOD & INTELLIGENCE */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-semibold flex items-center gap-2 text-xs uppercase text-gray-400">
                            <Brain className="w-4 h-4 text-purple-400" />
                            Base Mood
                        </h3>
                        <select
                            value={baseMood}
                            onChange={(e) => setBaseMood(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white rounded-lg p-1.5 text-xs outline-none focus:border-purple-500"
                        >
                            {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    {/* AI INTELLIGENCE SLIDER */}
                    <div className="pt-4 border-t border-slate-700">
                        <h3 className="text-white font-semibold flex items-center gap-2 text-sm uppercase text-gray-400 mb-3">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            Nivel de Inteligencia (Gemini 3.0)
                        </h3>

                        <div className="flex items-center gap-3 mb-2">
                            <input
                                type="range"
                                min="0" max="100"
                                value={intelligenceLevel}
                                onChange={(e) => setIntelligenceLevel(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <span className="text-yellow-400 font-bold text-xl w-14 text-right">{intelligenceLevel}%</span>
                        </div>

                        <div className="bg-slate-900/60 rounded-lg p-4 text-xs text-gray-300 grid grid-cols-2 gap-4 border border-slate-700 shadow-inner">
                            <div>
                                <p className="leading-relaxed mb-2 font-medium text-gray-400 uppercase text-[10px] tracking-wider">Modos de Operación:</p>
                                <ul className="space-y-1.5 text-gray-400">
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-green-400 font-bold">0%</span>
                                        <span>Modo Ahorro (Flash)</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-yellow-400 font-bold">30%</span>
                                        <span>Híbrido (Recomendado)</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <span className="text-orange-400 font-bold">100%</span>
                                        <span>Genio (Pro)</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="text-right border-l border-slate-700 pl-4 flex flex-col justify-center">
                                <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">Costo / 100 Msgs</div>
                                {(() => {
                                    // DYNAMIC COST CALCULATION
                                    const promptTokens = Math.round(generatedPrompt.length / 4);
                                    const avgHistory = 1000; // Buffer for chat history
                                    const avgOutput = 300;
                                    const totalInput = promptTokens + avgHistory;

                                    // Pricing (Per 1M Tokens)
                                    const flashPrice = ((totalInput * 0.10) + (avgOutput * 0.40)) / 1000000;
                                    const proPrice = ((totalInput * 3.50) + (avgOutput * 10.50)) / 1000000;

                                    const blendedCost = (flashPrice * (1 - intelligenceLevel / 100)) + (proPrice * (intelligenceLevel / 100));
                                    const cost100 = blendedCost * 100;

                                    return (
                                        <>
                                            <div className={`font-mono font-bold text-xl mb-1 ${intelligenceLevel > 50 ? 'text-orange-400' : 'text-green-400'}`}>
                                                ~${cost100.toFixed(2)}
                                            </div>
                                            <div className="text-gray-500 text-[10px] mb-2 leading-tight">
                                                (Flash: ${(flashPrice * 100).toFixed(2)} vs Pro: ${(proPrice * 100).toFixed(2)})
                                            </div>
                                            <div className="text-[9px] text-gray-600 italic border-t border-gray-800 pt-2 mt-1 leading-tight">
                                                *Cálculo incluye tu Prompt (~{promptTokens} tkns) + Historial.
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* OBJECTIVES (MISSION) - Phase 22 */}
                <div className="bg-slate-800/20 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-bold flex items-center gap-2 text-yellow-500 uppercase mb-3">
                        <Target className="w-4 h-4" /> Misión / Objetivos
                    </h3>
                    <div className="space-y-2 mb-3">
                        {objectives.map((obj, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-900/50 border border-slate-700 p-2 rounded text-xs gap-2 group">
                                <span className="flex-1 text-gray-300">{obj}</span>
                                <button onClick={() => removeObjective(i)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {objectives.length === 0 && <p className="text-[10px] text-gray-600 italic">Sin objetivos definidos.</p>}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newObjectiveInput}
                            onChange={e => setNewObjectiveInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addObjective()}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-yellow-500"
                            placeholder="Ej: Vender notebooks gamer..."
                        />
                        <button onClick={addObjective} className="bg-yellow-900/30 text-yellow-500 border border-yellow-800 px-3 rounded text-xs hover:bg-yellow-900/50">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* TRAITS */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold flex items-center gap-2 text-gray-400 uppercase">
                            <Brain className="w-4 h-4 text-purple-400" /> Rasgos Psicológicos
                        </h3>
                    </div>

                    {/* ADD TRAIT INPUT */}
                    <div className="flex gap-2 mb-3">
                        <input
                            value={newTraitInput}
                            onChange={e => setNewTraitInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addCustomTrait()}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white outline-none focus:border-purple-500"
                            placeholder="Ej: Analítico, Impulsivo..."
                        />
                        <button onClick={addCustomTrait} className="bg-purple-900/30 text-purple-400 border border-purple-800 px-3 rounded text-xs hover:bg-purple-900/50">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Traits Grid Grouped */}
                    <div className="space-y-4">
                        {(() => {
                            // Helper to group
                            const groups = {};
                            renderTraits.forEach(t => {
                                const cat = t.category || "Otros";
                                if (!groups[cat]) groups[cat] = [];
                                groups[cat].push(t);
                            });

                            // Define Order
                            const order = ["Emotional", "Negotiation", "Cognitive", "Social", "Otros"];

                            return order.map(cat => {
                                const traitsInCat = groups[cat];
                                if (!traitsInCat || traitsInCat.length === 0) return null;

                                return (
                                    <div key={cat}>
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 border-b border-gray-800 pb-1">
                                            {cat === 'Otros' ? 'Personalizados / Otros' :
                                                cat === 'Emotional' ? '🎭 Emocionales' :
                                                    cat === 'Negotiation' ? '🤝 Negociación' :
                                                        cat === 'Cognitive' ? '🧠 Cognitivos' :
                                                            '💬 Social'}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {traitsInCat.map(trait => {
                                                const isSelected = selectedTraits.has(trait.id);
                                                return (
                                                    <button
                                                        key={trait.id}
                                                        onClick={() => toggleTrait(trait.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${isSelected
                                                            ? 'bg-purple-900/40 border-purple-500 text-purple-200 shadow-lg shadow-purple-900/20'
                                                            : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500'
                                                            }`}
                                                    >
                                                        {trait.label} {trait.isCustom && '*'}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* COMANDOS DISPONIBLES */}
                <div>
                    <h3 className="text-xs font-bold flex items-center gap-2 text-gray-400 uppercase mb-3">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Comandos Disponibles
                    </h3>

                    <div className="space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        <div className="flex items-start gap-2 text-xs">
                            <code className="bg-cyan-900/20 text-cyan-400 px-2 py-0.5 rounded font-mono border border-cyan-900/30 whitespace-nowrap">
                                /reset
                            </code>
                            <span className="text-gray-400 text-[11px]">Reinicia la conversación y borra el historial</span>
                        </div>

                        <div className="flex items-start gap-2 text-xs">
                            <code className="bg-cyan-900/20 text-cyan-400 px-2 py-0.5 rounded font-mono border border-cyan-900/30 whitespace-nowrap">
                                /RasgoList
                            </code>
                            <span className="text-gray-400 text-[11px]">Muestra todos los rasgos psicológicos activos</span>
                        </div>

                        <div className="flex items-start gap-2 text-xs">
                            <code className="bg-cyan-900/20 text-cyan-400 px-2 py-0.5 rounded font-mono border border-cyan-900/30 whitespace-nowrap">
                                /help
                            </code>
                            <span className="text-gray-400 text-[11px]">Muestra la lista completa de comandos</span>
                        </div>

                        <div className="text-[10px] text-gray-600 italic mt-2 pt-2 border-t border-slate-800">
                            💡 Escribe estos comandos en el chat (simulador o WhatsApp) para ejecutarlos
                        </div>
                    </div>
                </div>

                {/* MEMORIES */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold flex items-center gap-2 text-gray-400 uppercase">
                            <MessageSquare className="w-4 h-4 text-green-400" /> Memorias Activas
                        </h3>
                        <button
                            onClick={() => setShowMemoryForm(!showMemoryForm)}
                            className="text-[10px] bg-gray-800 hover:bg-white hover:text-black px-2 py-1 rounded border border-gray-600 text-gray-300 flex items-center gap-1 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Añadir Evento
                        </button>
                    </div>

                    {showMemoryForm && (
                        /* Memory Form Logic (Simplified) */
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4">
                            {/* Inputs for newMemory... */}
                            <input
                                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white mb-2"
                                placeholder="Evento..."
                                value={newMemory.event}
                                onChange={e => setNewMemory({ ...newMemory, event: e.target.value })}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowMemoryForm(false)} className="px-3 py-1 bg-gray-700 rounded text-xs">Cancelar</button>
                                <button onClick={addCustomMemory} className="px-3 py-1 bg-green-600 rounded text-xs font-bold">Guardar</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 pl-4 border-l-2 border-gray-800">
                        {renderMemories.slice(-20).map((mem, i) => { // Limit render for perf
                            const isSelected = selectedMemories.has(JSON.stringify(mem));
                            return (
                                <div key={i} onClick={() => toggleMemory(mem)} className="cursor-pointer group relative pl-4 opacity-80 hover:opacity-100">
                                    <div className={`absolute left-[-21px] top-1 w-3 h-3 rounded-full border-2 ${isSelected ? 'bg-green-500 border-green-500' : 'bg-gray-900 border-gray-700'}`}></div>
                                    <div className="text-xs">
                                        <span className="font-bold text-gray-400">{mem.year}</span> <span className="text-gray-200">{mem.event}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT: PREVIEW */}
            <div className="w-1/2 flex flex-col h-full bg-black rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                <div className="bg-gray-950 p-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500">PREVIEW</span>
                        <div className="text-[10px] text-gray-600 bg-gray-900 px-2 py-0.5 rounded border border-gray-800 font-mono">
                            ~{Math.round(generatedPrompt.length / 4)} tokens
                        </div>
                        <button onClick={() => setAutoSync(!autoSync)} className={`text-[10px] px-2 py-0.5 border rounded ${autoSync ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'text-gray-500 border-gray-700'}`}>
                            {autoSync ? 'SYNC ON' : 'MANUAL'}
                        </button>
                        <button onClick={() => setShowSimulator(true)} className="text-[10px] px-2 py-0.5 bg-indigo-900/30 text-indigo-300 border border-indigo-800 rounded flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> TEST
                        </button>
                    </div>
                </div>
                <textarea
                    className="flex-1 bg-transparent p-6 font-mono text-xs resize-none outline-none leading-relaxed text-gray-300"
                    value={generatedPrompt}
                    onChange={e => { if (!autoSync) setGeneratedPrompt(e.target.value); }}
                />
                <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                    <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> Aplicar Cambios a {initialData?.name}
                    </button>
                </div>
            </div>

            {/* SIMULATOR MODAL */}
            {
                showSimulator && (
                    <PersonaSimulator
                        systemPrompt={generatedPrompt}
                        personaName={initialData?.name}
                        activeTraits={Array.from(selectedTraits)}
                        onClose={() => setShowSimulator(false)}
                    />
                )
            }

        </div >
    );
}

// Check Icon helper for delete button if not imported
function XIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    )
}
