import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success("Conexión Restaurada", { icon: <Wifi className="w-4 h-4 text-green-500" /> });
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
            toast.error("Sin Conexión a Internet", { icon: <WifiOff className="w-4 h-4 text-red-500" /> });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showBanner && isOnline) return null;

    return (
        <div className={clsx(
            "fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-500",
            isOnline ? "bg-green-500/10 border border-green-500/20 text-green-400 translate-y-20 opacity-0" : "bg-red-500/90 text-white translate-y-0 opacity-100"
        )}>
            <WifiOff className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-sm">Modo Offline</span>
        </div>
    );
}
