import React from 'react';
import { Tag, FileSpreadsheet, ShieldCheck, Activity, ChevronRight, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const UtilityCard = ({ title, description, icon: Icon, to, locked = false, comingSoon = false }) => {
    return (
        <component className={`group relative flex flex-col p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 ${locked ? 'opacity-75 cursor-not-allowed grayscale' : 'hover:-translate-y-1 cursor-pointer'}`}>
            {comingSoon && (
                <div className="absolute top-4 right-4 bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Próximamente
                </div>
            )}

            <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-4 ${locked ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors'}`}>
                <Icon size={24} strokeWidth={2} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {description}
            </p>

            <div className="mt-auto flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                {locked ? (
                    <span className="flex items-center text-gray-400"><Lock size={14} className="mr-1" /> Bloqueado</span>
                ) : (
                    <span className="flex items-center">Abrir Utilidad <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" /></span>
                )}
            </div>

            {/* Link wrapper if not locked */}
            {!locked && to && (
                <Link to={to} className="absolute inset-0 z-10" />
            )}
        </component>
    );
};

export default function Utilities() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-12">
                <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Centro de Utilidades</h1>
                <p className="text-lg text-gray-500">Herramientas avanzadas para gestión y mantenimiento del sistema.</p>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Active App: Label Studio */}
                <UtilityCard
                    title="Editor de Etiquetas"
                    description="Diseña, personaliza y gestiona las plantillas de impresión para tickets e ingresos. Control total sobre píxeles y márgenes."
                    icon={Tag}
                    to="/playground"
                />

                <UtilityCard
                    title="Homologador de Inventario"
                    description="Unifica nombres de modelos dispares (ej: 'Thinkpad' vs 'ThinkPad') para evitar productos duplicados en la web."
                    icon={RefreshCw}
                    to="/utilities/model-normalizer"
                />

                {/* Ideas / Coming Soon */}
                <UtilityCard
                    title="Importación Masiva"
                    description="Carga inventario rápidamente desde archivos Excel o CSV. Ideal para migraciones o cargas por lote."
                    icon={FileSpreadsheet}
                    comingSoon={true}
                    locked={true}
                />

                <UtilityCard
                    title="Panel de Auditoría"
                    description="Historial detallado de cambios. Rastrea quién editó tickets, eliminó registros o modificó configuraciones."
                    icon={ShieldCheck}
                    comingSoon={true}
                    locked={true}
                />

                <UtilityCard
                    title="Diagnóstico de Red"
                    description="Verifica el estado de las impresoras remotas, latencia de base de datos y conectividad general."
                    icon={Activity}
                    comingSoon={true}
                    locked={true}
                />
            </div>
        </div>
    );
}
