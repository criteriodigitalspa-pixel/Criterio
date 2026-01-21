import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';

export default function WelcomeBanner() {
    const { userProfile } = useAuth();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 p-8 shadow-xl border border-blue-700/30">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-bold border border-blue-400/20 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        Panel de Control
                    </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
                    {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">{userProfile?.displayName?.split(' ')[0] || 'Usuario'}</span>
                </h1>
                <p className="text-blue-200/80 text-lg max-w-2xl">
                    Aquí tienes el resumen de operaciones y rendimiento financiero en tiempo real.
                </p>
            </div>

            {/* Decorative Elements */}
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    );
}
