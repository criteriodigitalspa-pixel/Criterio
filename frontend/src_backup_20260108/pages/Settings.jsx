import { useState } from 'react';
import { Users as UsersIcon, Database, Settings as SettingsIcon, Server, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import Users from './Users'; // Reuse existing Users page logic
import DataMigration from '../components/DataMigration';
import SystemConfig from '../components/SystemConfig';
import HardwareConfig from '../components/admin/HardwareConfig';
import ClientManager from '../components/admin/ClientManager';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('users');

    const TABS = [
        { id: 'users', label: 'Gestión de Usuarios', icon: UsersIcon },
        { id: 'clients', label: 'Gestión de Clientes', icon: UserCheck }, // New Tab
        { id: 'config', label: 'Datos del Sistema', icon: Server },
        { id: 'hardware', label: 'Hardware DB', icon: Database }, // New Tab
        { id: 'migration', label: 'Migración de Datos', icon: Database }, // Should change icon if duplicate
    ];

    return (
        <div className="h-full flex flex-col p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white flex items-center gap-3">
                    <SettingsIcon className="w-8 h-8 text-gray-400" />
                    Configuración
                </h1>
                <p className="text-gray-400 mt-2">Administración del sistema y datos.</p>
            </div>

            {/* TABS */}
            <div className="flex gap-4 border-b border-gray-700 mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "pb-3 px-4 flex items-center gap-2 font-bold transition-all relative",
                            activeTab === tab.id ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 bg-gray-800/30 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                    {activeTab === 'users' && <Users />}
                    {activeTab === 'clients' && <ClientManager />}
                    {activeTab === 'config' && <SystemConfig />}
                    {activeTab === 'hardware' && <HardwareConfig />}
                    {activeTab === 'migration' && <DataMigration />}
                </div>
            </div>
        </div>
    );
}
