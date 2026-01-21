import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Users } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

export default function ActiveUsers() {
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Query users active in the last 15 minutes (conceptually, but we just get all 'online' flagged ones)
        // Since we can't delete on disconnect easily with Firestore, we rely on 'lastSeen'.
        // We'll filter client-side for "Active < 5 min ago".

        const q = query(collection(db, 'presence'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = Date.now();
            const active = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Check if lastSeen is within 5 minutes
                if (data.lastSeen?.seconds) {
                    const diff = (now - (data.lastSeen.seconds * 1000)) / 1000 / 60; // minutes
                    if (diff < 5) {
                        active.push({ id: doc.id, ...data });
                    }
                }
            });
            setUsers(active);
        });

        return () => unsubscribe();
    }, []);

    if (users.length === 0) return null;

    return (
        <div className="flex items-center gap-1 bg-gray-800/50 rounded-full px-3 py-1 border border-gray-700/50">
            <Users className="w-4 h-4 text-blue-400" />
            <div className="flex -space-x-2">
                {users.slice(0, 5).map(u => (
                    <div
                        key={u.id}
                        className="w-6 h-6 rounded-full border-2 border-gray-900 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer relative group"
                        title={`${u.email} (${u.role}) - ${u.currentPath}`}
                    >
                        {u.email.charAt(0).toUpperCase()}
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-gray-900 rounded-full"></span>
                    </div>
                ))}
            </div>
            {users.length > 5 && (
                <span className="text-xs text-gray-400 ml-1">+{users.length - 5}</span>
            )}
        </div>
    );
}
