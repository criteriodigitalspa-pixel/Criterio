
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Trash2, RefreshCw, MessageSquare } from 'lucide-react';
import { aiService } from '../../../services/aiService';
import { toast } from 'react-hot-toast';
import { ROLES_LIST } from '../data/roles';

export default function PersonaSimulator({ systemPrompt, onClose, personaName, activeTraits = [] }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const chatSessionRef = useRef(null);
    const scrollRef = useRef(null);

    // Default to "Mamá" or first
    const [selectedRole, setSelectedRole] = useState(ROLES_LIST[0]);

    // Initialize Chat
    useEffect(() => {
        const initChat = async () => {
            try {
                // INJECT MASK for Simulation Only
                const MASK_INSTRUCTION = `
### 🎭 ACTIVE MASK: SPEAKING TO [${selectedRole.label}] 🎭
**POWER DYNAMICS**: ${selectedRole.dynamics}
**CRITICAL**: Adjust your vocabulary, tone, and confidence level to match this relationship.
You are NOT talking to a generic user. You are talking to this specific person.
                `.trim();

                const finalPrompt = systemPrompt + "\n\n" + MASK_INSTRUCTION;

                const session = await aiService.startSimulationChat(finalPrompt);
                chatSessionRef.current = session;

                // Add initial greeting (simulated)
                setMessages([{
                    role: 'model',
                    text: `*Iniciando simulación con máscara: ${selectedRole.label}...*`
                }]);

            } catch (e) {
                console.error(e);
                toast.error("Error iniciando simulación: " + e.message);
            }
        };

        if (systemPrompt) initChat();
    }, [systemPrompt, personaName, selectedRole]); // Re-run when role changes!

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);

        // COMMAND SYSTEM - Handle "/" commands
        if (userMsg.trim().startsWith('/')) {
            const command = userMsg.slice(1).trim().toLowerCase();
            let response = "";

            if (command === 'reset') {
                // Reset chat session
                try {
                    const MASK_INSTRUCTION = `
### 🎭 ACTIVE MASK: SPEAKING TO [${selectedRole.label}] 🎭
**POWER DYNAMICS**: ${selectedRole.dynamics}
**CRITICAL**: Adjust your vocabulary, tone, and confidence level to match this relationship.
                    `.trim();
                    const finalPrompt = systemPrompt + "\n\n" + MASK_INSTRUCTION;
                    const session = await aiService.startSimulationChat(finalPrompt);
                    chatSessionRef.current = session;
                    response = "🔄 *Conversación reiniciada*\n\nHistorial borrado. Empecemos de nuevo.";
                } catch (e) {
                    response = "⚠️ Error al reiniciar: " + e.message;
                }
            } else if (command === 'rasgolist' || command === 'rasgos') {
                if (activeTraits.length === 0) {
                    response = "📋 *Rasgos Psicológicos*\n\n⚠️ No hay rasgos configurados.";
                } else {
                    const traitsList = activeTraits.map((t, i) => `${i + 1}. ✅ ${t}`).join('\n');
                    response = `📋 *Rasgos Psicológicos Activos*\n\n${traitsList}\n\n_Total: ${activeTraits.length} rasgos_`;
                }
            } else if (command === 'help' || command === 'ayuda') {
                response = `🎮 *Comandos Disponibles*\n\n` +
                    `*Gestión:*\n` +
                    `/reset - Reiniciar conversación\n` +
                    `/RasgoList - Ver rasgos activos\n` +
                    `/help - Mostrar esta ayuda\n\n` +
                    `_Escribe el comando con "/" para ejecutarlo_`;
            } else {
                response = `❌ Comando desconocido: "/${command}"\n\nUsa /help para ver comandos disponibles.`;
            }

            setMessages(prev => [...prev, { role: 'model', text: response }]);
            return;
        }

        // Normal AI response
        if (!chatSessionRef.current) {
            setMessages(prev => [...prev, { role: 'error', text: 'Error: Chat no inicializado' }]);
            return;
        }

        setIsTyping(true);

        try {
            const result = await chatSessionRef.current.sendMessage(userMsg);
            const response = await result.response;
            const text = response.text();

            setMessages(prev => [...prev, { role: 'model', text: text }]);
        } catch (e) {
            console.error(e);
            toast.error("Error en respuesta: " + e.message);
            setMessages(prev => [...prev, { role: 'error', text: "Error: " + e.message }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="bg-gray-950 p-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/50">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg flex items-center gap-2">
                                {personaName}
                                <span className="text-[10px] bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-700">SIMULACIÓN</span>
                            </h2>
                            {/* MASK SELECTOR IN HEADER */}
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-gray-400 uppercase font-bold">Máscara:</span>
                                <select
                                    className="bg-gray-900 border border-gray-700 text-white text-[10px] rounded px-1 py-0.5 outline-none focus:border-indigo-500"
                                    value={selectedRole.id}
                                    onChange={(e) => setSelectedRole(ROLES_LIST.find(r => r.id === e.target.value))}
                                >
                                    <optgroup label="Familia">
                                        {ROLES_LIST.filter(r => r.category === 'Family').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </optgroup>
                                    <optgroup label="Empresa">
                                        {ROLES_LIST.filter(r => r.category === 'Enterprise').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </optgroup>
                                    <optgroup label="Social">
                                        {ROLES_LIST.filter(r => r.category === 'Social').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </optgroup>
                                    <optgroup label="Empleado">
                                        {ROLES_LIST.filter(r => r.category === 'Employee').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMessages([])}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Limpiar Chat"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900/50 scroll-smooth"
                >
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl p-4 shadow-md backdrop-blur-sm ${msg.role === 'user'
                                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-none'
                                : msg.role === 'error'
                                    ? 'bg-red-900/20 border border-red-500 text-red-200'
                                    : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-none'
                                }`}>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-none p-4 flex gap-1 items-center">
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-950 border-t border-gray-800">
                    <div className="relative flex items-end gap-2 bg-gray-900 border border-gray-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Escribe un mensaje para ${personaName}...`}
                            className="w-full bg-transparent border-none outline-none text-white p-2 min-h-[44px] max-h-32 resize-none text-sm"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                            Modo Simulación • Máscara Activa: {selectedRole.label}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
