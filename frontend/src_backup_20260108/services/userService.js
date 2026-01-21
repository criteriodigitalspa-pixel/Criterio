import { db } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // Auth methods
import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    query,
    orderBy,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

// Need the config to initialize second app
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const COLLECTION_NAME = 'users';

export const userService = {
    // 🔐 Admin: Create New User (Auth + Firestore) without logout
    createNewUser: async (email, password, userData) => {
        let secondaryApp = null;
        try {
            // 1. Init Request App with unique name to avoid conflicts
            // Using timestamp ensures uniqueness even if cleanup fails momentarily
            const appName = `SecondaryApp-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, appName);
            const secondaryAuth = getAuth(secondaryApp);

            // 2. Create User in Auth
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // 3. Create Profile in Firestore (Using MAIN app db to ensure consistency)
            // We use the main 'db' import because it is authenticated as the current Admin
            try {
                await setDoc(doc(db, COLLECTION_NAME, uid), {
                    ...userData,
                    email, // Ensure email is in profile
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isActive: true
                });
            } catch (firestoreError) {
                // ⚠️ ROLLBACK: If Firestore fails, delete the Auth user to prevent "Zombie" state
                console.error("Firestore creation failed. Rolling back Auth user...", firestoreError);
                await deleteDoc(doc(db, COLLECTION_NAME, uid)).catch(() => { }); // cleanup just in case
                if (secondaryAuth.currentUser) {
                    await secondaryAuth.currentUser.delete();
                }
                throw firestoreError; // Re-throw
            }

            // 4. Logout secondary to avoid lingering sessions
            await signOut(secondaryAuth);

            return { uid, email, ...userData };

        } catch (error) {
            console.error("Error creating new user:", error.code, error.message);

            // Map Firebase errors to User Friendly Spanish
            let friendlyMsg = "Error al crear usuario.";
            if (error.code === 'auth/email-already-in-use') friendlyMsg = "El correo electrónico ya está registrado.";
            if (error.code === 'auth/weak-password') friendlyMsg = "La contraseña es muy débil (mínimo 6 caracteres).";
            if (error.code === 'auth/invalid-email') friendlyMsg = "El formato del correo electrónico no es válido.";
            if (error.code === 'auth/operation-not-allowed') friendlyMsg = "El registro por correo/contraseña no está habilitado en Firebase.";
            if (error.code === 'permission-denied') friendlyMsg = "Permiso denegado: No tienes autorización para crear usuarios en la base de datos.";

            throw new Error(friendlyMsg);
        } finally {
            // Strict Cleanup: Ensure memory is freed
            if (secondaryApp) {
                try {
                    await deleteApp(secondaryApp);
                } catch (cleanupErr) {
                    console.warn("Minor warning during app cleanup (safe to ignore):", cleanupErr);
                }
            }
        }
    },
    // Create or update user profile
    createUserProfile: async (uid, userData) => {
        try {
            const userRef = doc(db, COLLECTION_NAME, uid);
            await setDoc(userRef, {
                ...userData,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            return { uid, ...userData };
        } catch (error) {
            console.error("Error creating user profile: ", error);
            throw error;
        }
    },

    // Get user profile by UID
    getUserProfile: async (uid) => {
        try {
            const userRef = doc(db, COLLECTION_NAME, uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                return userSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error getting user profile: ", error);
            throw error;
        }
    },

    // Get all users (Admin only ideally)
    getAllUsers: async () => {
        try {
            const q = query(collection(db, COLLECTION_NAME));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error getting users: ", error);
            throw error;
        }
    },

    // Update user profile (Admin function mainly)
    updateUser: async (uid, updateData) => {
        try {
            const userRef = doc(db, COLLECTION_NAME, uid);
            await updateDoc(userRef, {
                ...updateData,
                updatedAt: new Date().toISOString()
            });
            return { id: uid, ...updateData };
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        }
    },

    // Toggle user active status
    toggleUserStatus: async (uid, currentStatus) => {
        try {
            const userRef = doc(db, COLLECTION_NAME, uid);
            await updateDoc(userRef, {
                isActive: !currentStatus,
                updatedAt: new Date().toISOString()
            });
            return !currentStatus;
        } catch (error) {
            console.error("Error toggling user status:", error);
            throw error;
        }
    },

    // Delete user
    deleteUser: async (uid) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, uid));
            return uid;
        } catch (error) {
            console.error("Error deleting user:", error);
            throw error;
        }
    }
};
