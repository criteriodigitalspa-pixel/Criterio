import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

import GeneralLogo from '../assets/GeneralLogo.png';
import LoginBackground from '../assets/LoginBackground.png';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [isLoginView, setIsLoginView] = useState(false); // State to toggle between Receiver and Login
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();

    // Auto-redirect
    useEffect(() => {
        if (user && userProfile) {
            navigate('/', { replace: true });
        }
    }, [user, userProfile, navigate]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = result.user; // Firestore User

            // 1. Check/Create Profile logic
            await checkOrCreateProfile(user);

            toast.success('Bienvenido de vuelta');
            // REMOVED explicit navigate. We wait for AuthContext 'user' state to update.
            // This prevents race condition where ProtectedRoute sees null user.
        } catch (error) {
            console.error(error);
            let msg = "Error al iniciar sesión";
            if (error.code === 'auth/invalid-credential') msg = "Credenciales incorrectas";
            if (error.code === 'auth/user-not-found') msg = "Usuario no encontrado";
            if (error.code === 'auth/wrong-password') msg = "Contraseña incorrecta";
            toast.error(msg);
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            await checkOrCreateProfile(user);

            toast.success('Sesión iniciada correctamente');
            // REMOVED explicit navigate. Rely on useEffect.
        } catch (error) {
            console.error("Login Error:", error);
            const msg = error.code === 'auth/popup-closed-by-user' ? 'Inicio de sesión cancelado' : error.message;
            toast.error(msg);
            setLoading(false);
        }
    };

    const checkOrCreateProfile = async (user) => {
        // 1. Check if profile exists
        const existingProfile = await userService.getUserProfile(user.uid);

        if (!existingProfile) {
            // 2. Only create if new
            await userService.createUserProfile(user.uid, {
                email: user.email,
                displayName: user.displayName || 'Usuario Recuperado',
                role: 'Pending',
                permissions: {}, // No access by default
                createdAt: new Date().toISOString(),
                isActive: true
            });
        } else {
            if (existingProfile.email !== user.email) {
                await userService.updateUser(user.uid, { email: user.email });
            }
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-900 font-sans text-gray-100">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <img
                    src={LoginBackground}
                    alt="Background"
                    className="h-full w-full object-cover opacity-60 filter blur-sm scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-blue-900/30" />
                {/* Subtle Noise Texture for premium feel */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-lg px-4">
                <AnimatePresence mode="wait">
                    {!isLoginView ? (
                        /* RECEIVER VIEW */
                        <motion.div
                            key="receiver"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="flex flex-col items-center justify-center text-center"
                        >
                            {/* Logo with delayed entry */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                                className="mb-8 relative"
                            >
                                <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full" />
                                <img src={GeneralLogo} alt="Logo" className="relative h-32 w-32 object-contain drop-shadow-2xl" />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mb-2 text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-gray-400"
                            >
                                Criterio Digital
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mb-12 text-sm font-medium uppercase tracking-[0.3em] text-blue-400"
                            >
                                Enterprise Resource Planning
                            </motion.p>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsLoginView(true)}
                                className="group relative overflow-hidden rounded-full bg-white px-12 py-4 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)]"
                            >
                                <span className="relative z-10 text-sm font-bold uppercase tracking-widest text-gray-900">
                                    Ingresar al Sistema
                                </span>
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-blue-100 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full opacity-50" />
                            </motion.button>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1, duration: 2 }}
                                className="mt-16 text-xs text-gray-500 font-mono"
                            >
                                SYSTEM V1.0 • SECURE CONNECTION
                            </motion.div>
                        </motion.div>
                    ) : (
                        /* LOGIN FORM VIEW */
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.4 }}
                            className="bg-gray-800/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative Gradients inside card */}
                            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

                            <div className="relative z-10">
                                {/* Back Button */}
                                <button
                                    onClick={() => setIsLoginView(false)}
                                    className="absolute -left-2 -top-2 p-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>

                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-bold text-white mb-2">Bienvenido</h2>
                                    <p className="text-sm text-gray-400">Ingresa tus credenciales para continuar</p>
                                </div>

                                <form onSubmit={handleEmailLogin} className="space-y-5">
                                    {/* Email Input */}
                                    <div>
                                        <div className="relative group">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="peer w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-transparent focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="Email"
                                                id="email"
                                                required
                                            />
                                            <label
                                                htmlFor="email"
                                                className="absolute left-4 -top-2.5 bg-gray-900/0 px-1 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none"
                                            >
                                                Email Corporativo
                                            </label>
                                        </div>
                                    </div>

                                    {/* Password Input */}
                                    <div>
                                        <div className="relative group">
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="peer w-full bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-transparent focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                                placeholder="Password"
                                                id="password"
                                                required
                                            />
                                            <label
                                                htmlFor="password"
                                                className="absolute left-4 -top-2.5 bg-gray-900/0 px-1 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500 pointer-events-none"
                                            >
                                                Contraseña
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Procesando...
                                            </span>
                                        ) : 'Iniciar Sesión'}
                                    </button>
                                </form>

                                <div className="my-6 flex items-center gap-4">
                                    <div className="h-px flex-1 bg-gray-700"></div>
                                    <span className="text-xs font-medium text-gray-500 uppercase">O continuar con</span>
                                    <div className="h-px flex-1 bg-gray-700"></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-700 bg-gray-800/50 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-700/50 hover:text-white hover:border-gray-600 focus:ring-4 focus:ring-gray-700 transition-all group"
                                >
                                    <svg className="h-5 w-5 grayscale group-hover:grayscale-0 transition-all" aria-hidden="true" viewBox="0 0 24 24">
                                        <path d="M12.0003 20.45c-4.6667 0-8.45-3.7833-8.45-8.45 0-4.6667 3.7833-8.45 8.45-8.45 2.1 0 4.0167.7333 5.5333 1.95l-2.05 2.05c-.8667-.65-1.9833-1.05-3.4833-1.05-2.8167 0-5.1 2.2833-5.1 5.5 0 3.2167 2.2833 5.5 5.1 5.5 2.5833 0 4.3833-1.5833 4.75-3.95h-4.75v-3h8.1c.1167.5333.1833 1.1333.1833 1.7667 0 4.9-3.2667 8.1333-8.1 8.1333z" fill="currentColor" />
                                    </svg>
                                    Google
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest hover:text-gray-500 cursor-default transition-colors">Criterio Digital © {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}
