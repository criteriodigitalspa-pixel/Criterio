import React, { useState, useEffect, useCallback } from 'react';
import {
    FileText, Database, UploadCloud, RefreshCw, Trash2,
    MessageSquare, AlertCircle, CheckCircle, Folder
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../../services/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';

// Helper for file size
const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function DataSourceManager() {
    const { user } = useAuth();
    const [sources, setSources] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch User Sources
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'sources'), where('ownerId', '==', user.uid));
        const unsub = onSnapshot(q, (snap) => {
            setSources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    // Filter Logic
    const whatsappSources = sources.filter(s => s.type === 'whatsapp_txt');
    const jsonSources = sources.filter(s => s.type === 'processed_json');

    // Drag & Drop Handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);

        if (!user) return;

        if (files.length > 0) {
            toast.loading("Registrando archivos...");
            try {
                const batchPromises = files.map(f => {
                    const isJson = f.name.endsWith('.json');
                    return addDoc(collection(db, 'sources'), {
                        name: f.name,
                        size: f.size,
                        sizeLabel: formatSize(f.size),
                        type: isJson ? 'processed_json' : 'whatsapp_txt',
                        ownerId: user.uid, // TAG OWNER
                        createdAt: new Date(),
                        status: 'ready' // Simulated
                    });
                });
                await Promise.all(batchPromises);
                toast.dismiss();
                toast.success(`${files.length} fuentes añadidas.`);
            } catch (err) {
                toast.dismiss();
                toast.error("Error guardando: " + err.message);
            }
        }
    }, [user]);

    const handleDelete = async (id) => {
        if (confirm("¿Seguro que deseas eliminar esta fuente?")) {
            try {
                await deleteDoc(doc(db, 'sources', id));
                toast.success("Fuente eliminada");
            } catch (e) {
                toast.error(e.message);
            }
        }
    };

    return (
        <div className="flex h-full gap-6">

            {/* LEFT: Source List */}
            <div className="w-2/3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

                {/* Header Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Chats WhatsApp</p>
                            <p className="text-xl font-bold text-white">{whatsappSources.length}</p>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Datasets JSON</p>
                            <p className="text-xl font-bold text-white">{jsonSources.length}</p>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Folder className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Total Peso</p>
                            <p className="text-xl font-bold text-white">
                                {formatSize(sources.reduce((a, b) => a + (b.size || 0), 0))}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section: Processed JSONs (The Core) */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-400" /> BASE DE CONOCIMIENTO (JSON)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {jsonSources.map((src) => (
                            <div key={src.id} className="bg-slate-900 border border-slate-700 p-3 rounded-lg flex justify-between items-center group hover:border-blue-500/50 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText className="w-8 h-8 text-slate-600" />
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold text-gray-200 truncate" title={src.name}>{src.name}</p>
                                        <p className="text-[10px] text-gray-500 font-mono">{src.sizeLabel}</p>
                                    </div>
                                </div>
                                <div className="p-1.5 bg-green-900/30 text-green-500 rounded text-[10px] font-bold border border-green-500/20">
                                    READY
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Raw Chats */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-400" /> CHATS CRUDOS (TXT)
                    </h3>
                    <div className="space-y-2">
                        {whatsappSources.map((src) => (
                            <div key={src.id} className="bg-slate-900/50 border border-slate-800 p-2 rounded-lg flex justify-between items-center hover:bg-slate-800">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-1 h-8 bg-green-500 rounded-full"></div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-medium text-gray-300 truncate w-64 md:w-96" title={src.name}>
                                            {src.name.replace('Chat de WhatsApp con ', '')}
                                        </p>
                                        <p className="text-[10px] text-gray-600 font-mono">{src.sizeLabel}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(src.id)}
                                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT: Dropzone & Actions */}
            <div className="w-1/3 flex flex-col gap-4">
                {/* Dropzone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                        flex-1 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center
                        ${isDragging
                            ? 'border-blue-500 bg-blue-900/20 scale-[0.99]'
                            : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
                        }
                    `}
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-blue-400' : 'text-slate-400'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Arrastra tus Chats</h3>
                    <p className="text-xs text-gray-400 mb-6 max-w-[200px]">
                        Soporta archivos <code>_chat.txt</code> (WhatsApp Export) y <code>.json</code> (Facebook Archive).
                    </p>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-all">
                        Seleccionar Archivos
                    </button>
                </div>

                {/* Info Panel */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500" /> Estado del Sistema
                    </h4>
                    <ul className="space-y-2 text-[11px] text-gray-300">
                        <li className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                            <span>Escáner: <strong>Activo</strong> (v.1.0)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                            <span>Mirror DB: <strong>Sincronizado</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <RefreshCw className="w-3 h-3 text-blue-500 mt-0.5" />
                            <span>Última Actualización: {new Date().toLocaleTimeString()}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
