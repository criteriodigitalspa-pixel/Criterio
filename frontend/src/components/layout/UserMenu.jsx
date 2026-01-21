import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
    const { user, userProfile, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <div className="relative z-50" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-800 transition-all group border border-transparent hover:border-gray-700"
            >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[1px] relative overflow-hidden shadow-lg shadow-blue-900/20">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-xs text-white">
                                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Name & Chevron (Desktop) */}
                <div className="hidden sm:flex items-center gap-2 pr-1">
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">
                            {user.displayName?.split(' ')[0] || 'Usuario'}
                        </span>
                        <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">
                            {userProfile?.role || 'Miembro'}
                        </span>
                    </div>
                    <ChevronDown className={clsx("w-3 h-3 text-gray-500 transition-transform duration-200", isOpen && "rotate-180")} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-12 w-56 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden"
                    >
                        {/* Header inside Dropdown */}
                        <div className="p-4 border-b border-gray-800/50 bg-gray-800/20">
                            <p className="text-sm font-bold text-white truncate">{user.displayName || 'Usuario'}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>

                        {/* Menu Items */}
                        <div className="p-1">
                            <button
                                onClick={() => navigate('/users')}
                                className="w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg flex items-center gap-3 transition-colors"
                            >
                                <User className="w-4 h-4 text-gray-400" />
                                Perfil
                            </button>
                            <button
                                className="w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg flex items-center gap-3 transition-colors"
                            >
                                <Settings className="w-4 h-4 text-gray-400" />
                                Configuración
                            </button>
                            <div className="h-px bg-gray-800 my-1 mx-2"></div>
                            <button
                                onClick={handleLogout}
                                className="w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center gap-3 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
