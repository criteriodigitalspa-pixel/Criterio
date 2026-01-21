import { useState } from 'react';
import { Users as UsersIcon, Database, Settings as SettingsIcon, Server, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import Users from './Users'; // Reuse existing Users page logic
import DataMigration from '../components/DataMigration';
import SystemConfig from '../components/SystemConfig';
import HardwareConfig from '../components/admin/HardwareConfig';
import ClientManager from '../components/admin/ClientManager';

function UsersClientsWrapper() {
    const [subTab, setSubTab] = useState('clients');

    return (
        <div className="h-full flex flex-col">
            {/* Sub-navigation Switcher */}
            <div className="flex justify-center pt-6 pb-2">
                <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-700/50 backdrop-blur-sm shadow-lg">
                    <button
                        onClick={() => setSubTab('clients')}
                        className={clsx(
                            "px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
                            subTab === 'clients' ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-gray-800"
                        )}
                    >
                        <UserCheck className="w-4 h-4" />
                        Gestión de Clientes
                    </button>
                    <button
                        onClick={() => setSubTab('users')}
                        className={clsx(
                            "px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2",
                            subTab === 'users' ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white hover:bg-gray-800"
                        )}
                    >
                        <UsersIcon className="w-4 h-4" />
                        Gestión de Usuarios
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {subTab === 'clients' && <ClientManager />}
                {subTab === 'users' && <Users />}
            </div>
        </div>
    );
}

export default function Settings() {
    const [activeTab, setActiveTab] = useState('config'); // Default to Config since Users/Clients is now specific/at end

    const TABS = [
        { id: 'config', label: 'Datos del Sistema', icon: Server },
        { id: 'hardware', label: 'Hardware DB', icon: Database },
        { id: 'migration', label: 'Migración de Datos', icon: Database },
        // Combined Tab at the End, Icon Only
        { id: 'users_clients', label: null, icon: UsersIcon },
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
                        title={!tab.label ? "Usuarios y Clientes" : tab.label}
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
                    {activeTab === 'users_clients' && <UsersClientsWrapper />}
                    {activeTab === 'config' && <SystemConfig />}
                    {activeTab === 'hardware' && <HardwareConfig />}
                    {activeTab === 'migration' && <DataMigration />}
                </div>
            </div>
        </div>
    );
}
