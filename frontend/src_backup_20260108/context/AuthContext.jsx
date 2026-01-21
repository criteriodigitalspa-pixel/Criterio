import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Import signOut
import { userService } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

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

                // Real-time listener for profile changes (Roles/Permissions)
                // This ensures instant updates when Admin toggles permissions
                try {
                    import('firebase/firestore').then(({ doc, onSnapshot }) => {
                        import('../services/firebase').then(({ db }) => {
                            profileUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
                                if (docSnap.exists()) {
                                    setUserProfile(docSnap.data());
                                } else {
                                    console.log("No profile found for user, creating/waiting...");
                                    setUserProfile(null);
                                }
                                setLoading(false);
                            }, (error) => {
                                console.error("Error listening to profile:", error);
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
                    console.error("Error setting up profile listener:", error);
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

    const value = { user, userProfile, loading, loginAsDev, logout };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Cargando sistema...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
