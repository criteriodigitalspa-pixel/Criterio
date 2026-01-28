
import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Power, Activity, PauseCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AIStatusToggle() {
    const [status, setStatus] = useState('offline'); // online, offline, paused
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'system', 'status'), (snap) => {
            if (snap.exists()) {
                setStatus(snap.data().state || 'offline');
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const toggleStatus = async () => {
        const nextState = status === 'online' ? 'paused' : (status === 'paused' ? 'offline' : 'online');
        try {
            await setDoc(doc(db, 'system', 'status'), {
                state: nextState,
                lastUpdate: new Date()
            }, { merge: true });

            const msgs = {
                online: "Sistemas IA Activados",
                paused: "IA Pausada (Solo Lectura)",
                offline: "Sistemas IA Apagados"
            };
            toast.success(msgs[nextState]);
        } catch (e) {
            toast.error("Error cambiando estado");
        }
    };

    if (loading) return <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />;

    return (
        <button
            onClick={toggleStatus}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${status === 'online' ? 'bg-green-900/30 border-green-500/50 text-green-400 hover:bg-green-900/50' :
                    status === 'paused' ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400 hover:bg-yellow-900/50' :
                        'bg-red-900/30 border-red-500/50 text-red-400 hover:bg-red-900/50'
                }`}
            title={`Estado Actual: ${status.toUpperCase()}`}
        >
            {status === 'online' && <Activity className="w-4 h-4" />}
            {status === 'paused' && <PauseCircle className="w-4 h-4" />}
            {status === 'offline' && <Power className="w-4 h-4" />}
            <span className="text-xs font-bold uppercase">{status}</span>
        </button>
    );
}
