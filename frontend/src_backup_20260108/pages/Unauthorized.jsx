import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, Home, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
    const navigate = useNavigate();
    const { logout } = useAuth(); // Use robust logout

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 font-sans text-gray-100 selection:bg-red-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-red-600/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-600/5 blur-[100px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="z-10 w-full max-w-lg px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                    className="relative overflow-hidden rounded-3xl border border-white/10 bg-gray-900/40 backdrop-blur-2xl p-8 shadow-2xl ring-1 ring-white/5"
                >
                    {/* Top Decorative Line */}
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 opacity-50" />

                    <div className="flex flex-col items-center text-center">
                        <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-red-900/20 ring-4 ring-red-500/10 relative"
                        >
                            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
                            <Lock className="h-10 w-10 text-red-500/80 absolute top-7 left-7 opacity-50" />
                            <ShieldAlert className="relative h-12 w-12 text-red-500 drop-shadow-lg" />
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-3 text-4xl font-black tracking-tight text-white"
                        >
                            Acceso Restringido
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mb-10 max-w-sm text-sm font-medium leading-relaxed text-gray-400"
                        >
                            No tienes los permisos necesarios para acceder a este módulo. Si crees que es un error, contacta a la Administración.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex w-full flex-col gap-3 sm:flex-row"
                        >
                            <button
                                onClick={() => navigate('/')}
                                className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 active:scale-95 border border-white/5 hover:border-white/20"
                            >
                                <Home className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                                Ir al Inicio
                            </button>

                            <button
                                onClick={handleLogout}
                                className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition-all hover:from-red-500 hover:to-red-400 hover:shadow-red-900/40 active:scale-95"
                            >
                                <LogOut className="h-4 w-4" />
                                Cambiar Cuenta
                            </button>
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            onClick={() => navigate(-1)}
                            className="mt-8 flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest group"
                        >
                            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                            Regresar
                        </motion.button>
                    </div>
                </motion.div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-600 font-mono">ERROR 403 • FORBIDDEN_ACCESS</p>
                </div>
            </div>
        </div>
    );
}
