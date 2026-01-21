import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Users } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

export default function ActiveUsers() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Only run if user is authenticated to minimize anonymous permission errors
        if (!user) return;

        // SAFETY: If we get a permission error, we stop listening globally to avoid Firestore SDK crashes
        // due to "Unexpected state" assertions when streams are forcibly closed by server repeatedly.
        let unsubscribe = () => { };

        try {
            const q = query(collection(db, 'presence'));

            unsubscribe = onSnapshot(q, (snapshot) => {
                const now = Date.now();
                const active = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.lastSeen?.seconds) {
                        const diff = (now - (data.lastSeen.seconds * 1000)) / 1000 / 60; // minutes
                        if (diff < 5) {
                            active.push({ id: doc.id, ...data });
                        }
                    }
                });
                setUsers(active);
            }, (error) => {
                // SILENCE: Do not warn loudly, and more importantly, this *should* handle the stream error.
                // If permission denied, just clearing users is correct.
                console.debug("ActiveUsers Access Denied (Expected for non-admin)");
                setUsers([]);
            });
        } catch (err) {
            console.debug("ActiveUsers setup failed", err);
        }

        return () => unsubscribe();
    }, [user]);

    if (users.length === 0) return null;

    return (
        <div className="flex items-center gap-1 bg-gray-800/50 rounded-full px-3 py-1 border border-gray-700/50">
            <Users className="w-4 h-4 text-blue-400" />
            <div className="flex -space-x-2">
                {users.slice(0, 5).map(u => (
                    <div
                        key={u.id}
                        className="w-6 h-6 rounded-full border-2 border-gray-900 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer relative group overflow-hidden"
                        title={`${u.email} (${u.role}) - ${u.currentPath}`}
                    >
                        {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName || u.email} className="w-full h-full object-cover" />
                        ) : (
                            u.email.charAt(0).toUpperCase()
                        )}
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-gray-900 rounded-full z-10"></span>
                    </div>
                ))}
            </div>
            {users.length > 5 && (
                <span className="text-xs text-gray-400 ml-1">+{users.length - 5}</span>
            )}
        </div>
    );
}
