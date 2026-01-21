import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Edit2, Trash2, XCircle, User, Phone, Mail, MapPin, Hash, UserCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientService } from '../../services/clientService';
import clsx from 'clsx';

export default function ClientManager() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        rut: '',
        alias: ''
    });

    // Fetch Clients
    const fetchClients = async () => {
        setLoading(true);
        try {
            // Fetch latest 100 for now. 
            // Ideally we should do server-side search if list is huge, 
            // but for "Client Management" usually admins want to see list.
            const data = await clientService.getAllClients(200);
            setClients(data);
        } catch (error) {
            toast.error('Error al cargar clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    // Filter Logic
    const filteredClients = clients.filter(client => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (client.name || '').toLowerCase().includes(term) ||
            (client.email || '').toLowerCase().includes(term) ||
            (client.phone || '').includes(term)
        );
    });

    const openCreateModal = () => {
        setEditingClient(null);
        setFormData({ name: '', phone: '', email: '', address: '', rut: '', alias: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || '',
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || '',
            rut: client.rut || '',
            alias: client.alias || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("El nombre es obligatorio");
            return;
        }

        setIsProcessing(true);
        const toastId = toast.loading(editingClient ? 'Actualizando...' : 'Creando cliente...');

        try {
            if (editingClient) {
                await clientService.updateClient(editingClient.id, formData);
                toast.success('Cliente actualizado', { id: toastId });
            } else {
                await clientService.createClient(formData);
                toast.success('Cliente creado', { id: toastId });
            }
            setIsModalOpen(false);
            fetchClients();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar", { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (client) => {
        if (!confirm(`¿Estás seguro de eliminar a ${client.name}? Esta acción no se puede deshacer.`)) return;

        const toastId = toast.loading("Eliminando...");
        try {
            await clientService.deleteClient(client.id);
            toast.success("Cliente eliminado", { id: toastId });
            fetchClients(); // Refresh
        } catch (error) {
            toast.error("Error al eliminar", { id: toastId });
        }
    };

    const handleImportHistory = async () => {
        if (!confirm("Esto escaneará tus ventas antiguas e importará los nombres de clientes que no estén guardados aún. ¿Continuar?")) return;

        setIsProcessing(true);
        const toastId = toast.loading("Analizando historial de ventas...");

        try {
            const result = await clientService.importClientsFromHistory();
            if (result.success) {
                toast.success(`Importación completada: ${result.count} clientes nuevos encontrados.`, { id: toastId });
                fetchClients();
            } else {
                toast.error(result.error || "Hubo un problema con la importación", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al importar", { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <UserCheck className="text-green-500 w-8 h-8" />
                        Gestión de Clientes
                    </h2>
                    <p className="text-gray-400">Base de datos de clientes registrados.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-white outline-none focus:ring-2 ring-blue-500 w-64"
                        />
                    </div>
                    <button
                        onClick={handleImportHistory}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/30 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                        title="Importar clientes desde tickets antiguos"
                    >
                        <RefreshCw className={clsx("w-5 h-5", isProcessing && "animate-spin")} />
                        <span className="hidden md:inline">Sincronizar Historial</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl flex flex-col">
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Nombre / Alias</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Contacto</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Ubicación</th>
                                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 bg-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                        </div>
                                        Cargando clientes...
                                    </td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                        No se encontraron clientes.
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map((client) => (
                                    <tr key={client.id} className="hover:bg-gray-700/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    {(client.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">{client.name}</div>
                                                    {client.alias && <div className="text-xs text-blue-400 font-mono">{client.alias}</div>}
                                                    {client.rut && <div className="text-xs text-gray-500">RUT: {client.rut}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                {client.email && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                                        <Mail className="w-3 h-3 text-gray-500" /> {client.email}
                                                    </div>
                                                )}
                                                {client.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                                        <Phone className="w-3 h-3 text-gray-500" /> {client.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {client.address ? (
                                                <div className="flex items-start gap-2 text-sm text-gray-400 max-w-xs truncate">
                                                    <MapPin className="w-3 h-3 mt-0.5 text-gray-600" />
                                                    <span className="truncate">{client.address}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-600 italic">Sin dirección</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(client)}
                                                    className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(client)}
                                                    className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Portal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-green-500" />
                                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre Completo *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 p-3 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="Nombre del cliente o empresa"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 p-3 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="+56 9..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 p-3 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="cliente@email.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">RUT (Opcional)</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={formData.rut}
                                            onChange={e => setFormData({ ...formData, rut: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 p-3 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="12.345.678-9"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alias (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formData.alias}
                                        onChange={e => setFormData({ ...formData, alias: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white focus:ring-2 ring-green-500 outline-none"
                                        placeholder="Ej: Oficina Central"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dirección</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-xl pl-10 p-3 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="Dirección completa de despacho..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-gray-700 bg-gray-900/50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={isProcessing}
                                className="px-6 py-2.5 text-gray-400 hover:text-white font-bold hover:bg-gray-800 rounded-xl transition-colors border border-transparent hover:border-gray-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isProcessing}
                                className="px-8 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {editingClient ? 'Guardar Cambios' : 'Crear Cliente'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
