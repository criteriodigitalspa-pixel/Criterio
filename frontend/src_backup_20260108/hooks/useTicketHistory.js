import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export const useTicketHistory = (ticketId) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!ticketId) {
            setHistory([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const historyRef = collection(db, 'tickets', ticketId, 'history');
        const q = query(historyRef, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHistory(events);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching history:", err);
            setError(err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [ticketId]);

    return { history, loading, error };
};
