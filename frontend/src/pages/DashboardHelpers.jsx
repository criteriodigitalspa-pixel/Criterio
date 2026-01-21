import clsx from 'clsx';
import React from 'react';

export function MetricCard({ title, value, subtitle, color, icon: Icon, tooltip, isActive, onClick }) {
    const Component = onClick ? 'button' : 'div';

    return (
        <Component
            className={clsx(
                "p-5 rounded-2xl bg-gray-800/50 border backdrop-blur-sm relative group text-left w-full transition-all duration-200",
                isActive ? "border-green-900/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-gray-700 hover:border-blue-500/50 hover:bg-gray-800",
                onClick && "cursor-pointer active:scale-95"
            )}
            onClick={onClick}
        >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" title={tooltip}>
                {Icon && <Icon className={clsx("w-4 h-4", isActive ? "text-green-600" : "text-gray-500")} />}
            </div>
            <div className={clsx("text-xs font-bold uppercase tracking-wider mb-1", color)}>{title}</div>
            <div className="text-2xl font-black text-white">{typeof value === 'number' ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value) : value}</div>
            <div className={clsx("text-xs mt-1", isActive ? "text-green-500/80" : "text-gray-400")}>{subtitle}</div>
        </Component>
    );
}

export const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-[#1f2937] border border-gray-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export const BreakdownModal = ({ isOpen, onClose, title, items }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-white text-center w-full border-b border-gray-700 pb-2">{title}</h3>
            </div>
            <div className="space-y-3">
                {items && items.map((item, idx) => (
                    <div key={idx} className={clsx("flex justify-between items-center text-sm", item.className)}>
                        <span className="text-gray-400">{item.label}</span>
                        <span className={clsx("font-mono font-medium", item.color || "text-white")}>
                            {item.format ? item.format(item.value) : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.value)}
                        </span>
                    </div>
                ))}
            </div>
            <button
                onClick={onClose}
                className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-2 font-medium transition-colors"
            >
                Cerrar
            </button>
        </Modal>
    );
};
