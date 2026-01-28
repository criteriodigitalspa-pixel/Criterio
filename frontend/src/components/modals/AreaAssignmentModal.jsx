import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, Save, User } from 'lucide-react';
import { userService } from '../services/userService';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function AreaAssignmentModal({ isOpen, onClose, columns }) {
    const [users, setUsers] = useState([]);
    const [assignments, setAssignments] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            try {
                // 1. Load Users
                const userList = await userService.getAllUsers();
                setUsers(userList);

                // 2. Load Config
                const docRef = doc(db, 'settings', 'kanban_assignments');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setAssignments(docSnap.data());
                }
            } catch (e) {
                console.error(e);
                toast.error("Error cargando configuraciones");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isOpen]);

    const handleSave = async () => {
        try {
            await setDoc(doc(db, 'settings', 'kanban_assignments'), assignments);
            toast.success("Asignaciones guardadas");
            // We could trigger a refresh in parent, but reloading will pick it up
            // Ideally we pass an 'onSave' to update parent state locally
            onClose();
        } catch (e) {
            toast.error("Error guardando");
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Asignación Automática</h3>
                    <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-500 hover:text-white" /></button>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-gray-400 mb-4">
                        Seleccione el usuario responsable para cada área. Las tareas automáticas se le asignarán a él.
                    </p>

                    {loading ? (
                        <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-500 rounded-full border-t-transparent mx-auto"></div></div>
                    ) : (
                        Object.values(columns).map(col => (
                            <div key={col.id} className="flex items-center justify-between gap-4 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
                                <span className="font-bold text-gray-300 text-sm w-1/2 truncate" title={col.title}>{col.title}</span>
                                <select
                                    className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none w-1/2"
                                    value={assignments[col.id] || ''}
                                    onChange={e => setAssignments(prev => ({ ...prev, [col.id]: e.target.value }))}
                                >
                                    <option value="">-- Sin Asignar --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                                    ))}
                                </select>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-5 border-t border-gray-700 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                        <Save className="w-4 h-4" /> Guardar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
