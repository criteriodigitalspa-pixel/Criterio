import React from 'react';

export default function GlobalError({ error, resetErrorBoundary }) {
    const handleHardReset = async () => {
        if (window.confirm("¿Seguro? Esto borrará datos locales no sincronizados para recuperar el sistema.")) {
            // 1. Clear LocalStorage
            localStorage.clear();

            // 2. Clear IndexedDB (Firestore Persistence)
            try {
                const dbs = await window.indexedDB.databases();
                for (const db of dbs) {
                    window.indexedDB.deleteDatabase(db.name);
                }
                console.log("Databases Cleared.");
            } catch (e) {
                console.error("Failed to clear DB:", e);
            }

            // 3. Force Reload
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
            <div className="max-w-lg w-full bg-slate-800 p-8 rounded-xl shadow-2xl border border-red-500/30">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Error Crítico del Sistema</h1>
                <p className="text-slate-300 mb-6">
                    Se ha detectado un problema irrecuperable con la base de datos local.
                </p>

                <div className="bg-black/50 p-4 rounded mb-6 font-mono text-xs text-red-300 overflow-auto max-h-40">
                    {error?.message || "Unknown Error"}
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                    >
                        Intentar Recargar
                    </button>

                    <button
                        onClick={handleHardReset}
                        className="w-full py-3 bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-800 rounded-lg font-medium transition-colors"
                    >
                        ⚠️ Restablecer Datos Locales (Hard Reset)
                    </button>
                </div>
            </div>
        </div>
    );
}
