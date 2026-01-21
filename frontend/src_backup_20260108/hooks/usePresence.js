import { useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';

export const usePresence = (user, userProfile) => {
    const location = useLocation();

    useEffect(() => {
        if (!user) return;

        const updatePresence = async () => {
            try {
                const presenceRef = doc(db, 'presence', user.uid);
                await setDoc(presenceRef, {
                    uid: user.uid,
                    email: user.email,
                    role: userProfile?.role || 'Unknown',
                    currentPath: location.pathname,
                    lastSeen: serverTimestamp(),
                    isOnline: true
                }, { merge: true });
            } catch (error) {
                console.error("Error updating presence:", error);
            }
        };

        // Update immediately
        updatePresence();

        // Update every 2 minutes (Heartbeat)
        const interval = setInterval(updatePresence, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user, userProfile, location.pathname]);
};
