import React, { useState, useEffect } from 'react';
import {
    X, Hash, Briefcase, Layout, Terminal, Code2, Database,
    Smartphone, Globe, Cpu, Server, Shield, Monitor,
    Wifi, Radio, Settings, PenTool, Box, Hexagon, Circle,
    Package, Truck, ShoppingCart, DollarSign, Users, LineChart,
    ClipboardList, Calendar, Image, Camera, Wrench, Hammer, Search
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

// Predefined Icon List (15 items as requested + a few standard ones)
// Comprehensive Icon List
export const AVAILABLE_ICONS = [
    // General / Admin
    { id: 'hash', icon: Hash, label: 'Default' }, { id: 'layout', icon: Layout, label: 'Layout' },
    { id: 'briefcase', icon: Briefcase, label: 'Work' }, { id: 'settings', icon: Settings, label: 'Config' },
    { id: 'shield', icon: Shield, label: 'Secure' }, { id: 'box', icon: Box, label: 'Product' },

    // Tech / Dev
    { id: 'terminal', icon: Terminal, label: 'Terminal' }, { id: 'code', icon: Code2, label: 'Code' },
    { id: 'database', icon: Database, label: 'DB' }, { id: 'server', icon: Server, label: 'Server' },
    { id: 'cpu', icon: Cpu, label: 'Hardware' }, { id: 'wifi', icon: Wifi, label: 'Network' },
    { id: 'globe', icon: Globe, label: 'Web' }, { id: 'smartphone', icon: Smartphone, label: 'Mobile' },
    { id: 'monitor', icon: Monitor, label: 'Desktop' },

    // Business / Operations
    { id: 'package', icon: Package, label: 'Logistics' }, { id: 'truck', icon: Truck, label: 'Transport' },
    { id: 'cart', icon: ShoppingCart, label: 'Sales' }, { id: 'dollar', icon: DollarSign, label: 'Finance' },
    { id: 'users', icon: Users, label: 'Team' }, { id: 'chart', icon: LineChart, label: 'Analytics' },
    { id: 'clipboard', icon: ClipboardList, label: 'Tasks' }, { id: 'calendar', icon: Calendar, label: 'Plan' },

    // Creative / Tools
    { id: 'pen', icon: PenTool, label: 'Design' }, { id: 'image', icon: Image, label: 'Media' },
    { id: 'camera', icon: Camera, label: 'Photo' }, { id: 'wrench', icon: Wrench, label: 'Repair' },
    { id: 'hammer', icon: Hammer, label: 'Build' }, { id: 'search', icon: Search, label: 'Research' }
];

export function getIconComponent(iconId) {
    const found = AVAILABLE_ICONS.find(i => i.id === iconId);
    return found ? found.icon : Hash;
}

export default function EditProjectModal({ isOpen, onClose, item, type, onSave }) {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('hash');

    useEffect(() => {
        if (isOpen && item) {
            setName(item.name || '');
            setSelectedIcon(item.icon || 'hash');
        }
    }, [isOpen, item]);

    const handleSave = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave(item.id, { name, icon: selectedIcon });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
            >
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-500" />
                        Editar {type === 'area' ? 'Área' : 'Proyecto'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                            placeholder={type === 'area' ? "Nombre del Área" : "Nombre del Proyecto"}
                            autoFocus
                        />
                    </div>

                    {/* Icon Picker */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Icono</label>
                        <div className="grid grid-cols-5 gap-2">
                            {AVAILABLE_ICONS.map((iconOption) => {
                                const IconComp = iconOption.icon;
                                const isSelected = selectedIcon === iconOption.id;
                                return (
                                    <button
                                        key={iconOption.id}
                                        type="button"
                                        onClick={() => setSelectedIcon(iconOption.id)}
                                        className={clsx(
                                            "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all border",
                                            isSelected
                                                ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20"
                                                : "bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700 hover:text-gray-300"
                                        )}
                                        title={iconOption.label}
                                    >
                                        <IconComp className="w-5 h-5" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
