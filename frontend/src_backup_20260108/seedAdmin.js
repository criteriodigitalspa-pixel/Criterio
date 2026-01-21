import { db } from './services/firebase.js'; // Ajusta la ruta si corres esto como script independiente
import { doc, setDoc } from 'firebase/firestore';

// Este script es para crear un usuario ADMIN manualmente para pruebas
// Úsalo si tu Auth UID ya existe pero no tienes perfil en Firestore.

const createAdmin = async (uid, email) => {
    try {
        await setDoc(doc(db, 'users', uid), {
            email: email,
            displayName: 'Admin Principal',
            role: 'Admin',
            createdAt: new Date().toISOString()
        });
        console.log(`Usuario ${email} configurado como ADMIN.`);
    } catch (e) {
        console.error("Error:", e);
    }
};

// Reemplaza con TU UID real de Firebase Auth y tu email
// createAdmin('TU_UID_DESDE_FIREBASE_CONSOLE', 'tu@email.com');
