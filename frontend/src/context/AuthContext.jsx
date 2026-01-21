import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { auth, db } from "../services/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { userService } from '../services/userService';

// Configure Google Provider with Tasks Scope
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/tasks');

export const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshUserProfile = async () => {
        if (!user) return;
        try {
            // Dynamic import to avoid cycles/bloat if outside
            // Assuming simplified flow:
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../services/firebase');

            const docSnap = await getDoc(doc(db, 'users', user.uid));
            if (docSnap.exists()) {
                console.log("[AuthContext] Refreshed User Profile");
                setUserProfile(docSnap.data());
            }
        } catch (error) {
            console.error("Error refreshing profile:", error);
        }
    };

    // Login function using the configured provider
    const login = () => {
        return signInWithPopup(auth, googleProvider);
    };

    useEffect(() => {
        // 1. Check for Dev Override First
        if (localStorage.getItem('DEV_OVERRIDE') === 'true') {
            const devUser = { uid: 'dev-admin', email: 'dev@criterio.digital', displayName: 'Dev Admin' };
            setUser(devUser);
            setUserProfile({
                id: 'dev-admin',
                role: 'Admin',
                permissions: {},
                displayName: 'Dev Admin',
                email: 'dev@criterio.digital'
            });
            setLoading(false);
            return; // Skip Firebase Listener if in Dev Mode
        }

        let profileUnsubscribe = null;

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (localStorage.getItem('DEV_OVERRIDE') === 'true') return;

            if (firebaseUser) {
                setUser(firebaseUser);

                // Real-time listener REPLACED with One-Time Fetch to avoid "PersistentListenStream" crashes
                // We use getDoc for stability in Memory-Only mode.
                try {
                    import('firebase/firestore').then(({ doc, getDoc }) => {
                        import('../services/firebase').then(({ db }) => {
                            getDoc(doc(db, 'users', firebaseUser.uid)).then((docSnap) => {
                                if (docSnap.exists()) {
                                    setUserProfile(docSnap.data());
                                } else {
                                    console.log("No profile found for user.");
                                    setUserProfile(null);
                                }
                                setLoading(false);
                            }).catch(err => {
                                console.error("Error fetching profile:", err);
                                setLoading(false);
                            });
                        }).catch(err => {
                            console.error("Error importing firebase service:", err);
                            setLoading(false);
                        });
                    }).catch(err => {
                        console.error("Error importing firestore:", err);
                        setLoading(false);
                    });
                } catch (error) {
                    console.error("Error setting up profile fetch:", error);
                    setLoading(false);
                }
            } else {
                // Cleanup
                if (profileUnsubscribe) profileUnsubscribe();
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        });

        // Safety Timeout: Force stop loading after 5 seconds if Firebase is stuck
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.warn("Auth Listener timed out. Forcing app load.");
                setLoading(false);
            }
        }, 5000);

        // Global Cleanup
        return () => {
            clearTimeout(safetyTimeout);
            unsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, []);

    const loginAsDev = () => {
        localStorage.setItem('DEV_OVERRIDE', 'true');
        // Force reload to apply clean state from useEffect
        window.location.reload();
    };

    // NEW: Robust Logout Handler
    const logout = async () => {
        try {
            localStorage.removeItem('DEV_OVERRIDE'); // Clear dev mode if active
            await signOut(auth);
            // State clearing is handled by onAuthStateChanged listener
        } catch (error) {
            console.error("Logout Error:", error);
            setUser(null);
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        login, // Expose login for re-auth / initial auth
        logout,
        refreshUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
