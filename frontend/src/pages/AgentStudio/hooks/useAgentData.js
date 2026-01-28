
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { loadData } from '../data/loader';

/**
 * Hook to strictly manage access to Agent Visualization Data.
 * Enforces that data is only loaded if a user is authenticated.
 * In the future, this will query Firestore with `where('userId', '==', user.uid)`.
 */
export function useAgentData() {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Strict Privacy Check
        if (!user) {
            console.warn("🔒 Access Denied: No user authenticated for Agent Data.");
            setData([]);
            setLoading(false);
            return;
        }

        try {
            // 2. Load Local Data (Simulation of User Data)
            // In production, this replaces `loadData()` with a Firestore query.
            const localData = loadData();

            // 3. Attach dummy ownership if missing (for local dev)
            // This ensures downstream components can check `d.userId` if they need to double-check.
            const secureData = localData.map(d => ({
                ...d,
                ownerId: user.uid // Stamping ownership
            }));

            setData(secureData);
        } catch (err) {
            console.error("Error loading agent data:", err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    return { data, loading };
}
