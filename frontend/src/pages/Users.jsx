import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Shield, Power, Edit2, CheckCircle2, XCircle, Eye, PenTool, RefreshCcw, Copy, Trash2, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';
import clsx from 'clsx';

export default function Users() {
    const { userProfile, refreshUserProfile } = useAuth(); // Current user
    const [editingUser, setEditingUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false); // For Save operations
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Edit Form State
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        role: 'Pending',
        photoURL: '',
        permissions: {} // Object: { module: { view: true, edit: false } }
    });

    const MODULES = [
        { key: 'dashboard', label: 'Dashboard / KPIs' },
        { key: 'tickets', label: 'Tablero Taller' },
        { key: 'ingreso', label: 'Ingreso Equipo' },
        { key: 'pos', label: 'Punto de Venta' },
        { key: 'tasks', label: 'Tareas' },
        { key: 'roadmap', label: 'Bitácora / Status' },
        { key: 'users', label: 'Gestión Usuarios' },
        { key: 'settings', label: 'Configuración' },
        { key: 'financials', label: 'Vista Financiera' }
    ];

    const ROLES = ['Admin', 'Technician', 'Viewer', 'Pending'];

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAllUsers();
            // Client-side sort to ensure order without Index requirements
            const sorted = data.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA; // Descending
            });
            setUsers(sorted);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const openCreateModal = () => {
        setEditingUser(null);
        setImageFile(null);
        setPreviewUrl(null);
        setFormData({
            displayName: '',
            email: '',
            password: '',
            role: 'Pending',
            photoURL: '',
            permissions: {}
        });
        setIsModalOpen(true);
    };



    const openEditModal = (user) => {
        setEditingUser(user);
        setImageFile(null);
        setPreviewUrl(user.photoURL || null);

        // Handle migration: if permissions is array, convert to empty obj or try to map
        let perms = user.permissions || {};
        if (Array.isArray(perms)) {
            perms = {}; // Reset legacy permissions to force Admin to re-assign correctly
        }

        setFormData({
            displayName: user.displayName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            password: '', // Password not editable directly here
            role: user.role || 'Pending',
            photoURL: user.photoURL || '',
            permissions: perms
        });
        setIsModalOpen(true);
    };

    const handleSaveUser = async () => {
        setIsProcessing(true);
        const toastId = toast.loading(editingUser ? 'Actualizando perfil...' : 'Creando usuario seguro...');

        try {
            // 1. Upload Image if exists
            let finalPhotoURL = formData.photoURL;
            if (imageFile) {
                setUploadingImage(true);
                try {
                    // Unique path: users/{email_hash}/{timestamp}_filename
                    // Using email or temp ID as folder since we might not have UID yet
                    const userIdentifier = editingUser ? editingUser.id : 'new_users';
                    const storageRef = ref(storage, `profiles/${userIdentifier}/${Date.now()}_${imageFile.name}`);

                    const snapshot = await uploadBytes(storageRef, imageFile);
                    finalPhotoURL = await getDownloadURL(snapshot.ref);
                } catch (uploadError) {
                    console.error("Upload failed", uploadError);
                    toast.error("Error subiendo imagen, se guardará sin ella.", { id: toastId });
                }
                setUploadingImage(false);
            }

            // Clean permissions: enforce constraints (View=False -> Edit=False)
            const cleanPerms = { ...formData.permissions };
            Object.keys(cleanPerms).forEach(key => {
                if (!cleanPerms[key].view) {
                    cleanPerms[key].edit = false; // Cannot edit if cannot view
                }
                if (cleanPerms[key].edit) {
                    cleanPerms[key].view = true; // Must view if can edit
                }
            });

            if (editingUser) {
                // UPDATE
                await userService.updateUser(editingUser.id, {
                    displayName: formData.displayName,
                    phoneNumber: formData.phoneNumber,
                    role: formData.role,
                    photoURL: finalPhotoURL,
                    permissions: cleanPerms
                });
                toast.success('Perfil actualizado', { id: toastId });
                // If we updated OURSELVES, refresh the context profile for the Header/App
                if (editingUser.id === userProfile.id) {
                    refreshUserProfile();
                }
            } else {
                // CREATE
                if (!formData.email || !formData.password) {
                    toast.error('Email y contraseña requeridos', { id: toastId });
                    setIsProcessing(false);
                    return;
                }

                await userService.createNewUser(formData.email, formData.password, {
                    displayName: formData.displayName,
                    phoneNumber: formData.phoneNumber,
                    role: formData.role,
                    photoURL: finalPhotoURL,
                    permissions: cleanPerms
                });
                toast.success('Usuario creado exitosamente', { id: toastId });
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error(error);
            // Error handling is now robust in service, just display message
            toast.error(error.message, { id: toastId });
        } finally {
            setIsProcessing(false);
        }
    };

    // ... (Rest of component functions)

    const togglePermission = (moduleKey, type) => {
        setFormData(prev => {
            const currentPerms = prev.permissions[moduleKey] || { view: false, edit: false };
            const newPerms = { ...currentPerms };

            // Toggle target
            newPerms[type] = !newPerms[type];

            // Enforce Logic
            // If turning on EDIT -> Turn on VIEW
            if (type === 'edit' && newPerms.edit) {
                newPerms.view = true;
            }
            // If turning off VIEW -> Turn off EDIT
            if (type === 'view' && !newPerms.view) {
                newPerms.edit = false;
            }

            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [moduleKey]: newPerms
                }
            };
        });
    };

    const handleToggleStatus = async (user) => {
        if (!confirm(`¿${user.isActive !== false ? 'Desactivar' : 'Reactivar'} a ${user.displayName}?`)) return;
        try {
            await userService.updateUser(user.id, { isActive: user.isActive === false }); // Toggle
            toast.success("Estado actualizado");
            fetchUsers();
        } catch (e) {
            toast.error("Error actualizando estado");
        }
    };

    const handleDeleteUser = async (user) => {
        if (!confirm(`PELIGRO: ¿Eliminar permanentemente a ${user.displayName}?\nEsta acción no se puede deshacer.`)) return;
        try {
            await userService.deleteUser(user.id);
            toast.success("Usuario eliminado");
            fetchUsers();
        } catch (e) {
            toast.error("Error eliminando usuario");
        }
    };


    return (
        <div className="p-6">
            {/* ... (Header) */}

            <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl">
                <table className="min-w-full divide-y divide-gray-700">
                    {/* ... (Thead) */}
                    <tbody className="divide-y divide-gray-700 bg-gray-800">
                        {users.map((user) => {
                            const isActive = user.isActive !== false; // Default true
                            return (
                                <tr key={user.id} className={clsx("hover:bg-gray-700/50 transition-colors", !isActive && "opacity-50 grayscale")}>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-500/30 font-bold text-blue-300 overflow-hidden">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    (user.displayName || '?').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-white">{user.displayName || 'Sin Nombre'}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                                {user.phoneNumber && (
                                                    <div className="text-[10px] text-green-400 flex items-center gap-1 mt-0.5">
                                                        📱 {user.phoneNumber}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    {/* ... (Rest of columns) */}

                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-wide border",
                                            user.role === 'Admin' ? 'bg-purple-900/50 text-purple-300 border-purple-500/30' :
                                                user.role === 'Pending' ? 'bg-orange-900/50 text-orange-300 border-orange-500/30' :
                                                    'bg-blue-900/50 text-blue-300 border-blue-500/30'
                                        )}>
                                            {user.role || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-center">
                                        {isActive ? (
                                            <span className="text-green-400 text-xs font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Activo</span>
                                        ) : (
                                            <span className="text-red-400 text-xs font-bold flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> Inactivo</span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium flex justify-end gap-2">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="p-2 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors border border-blue-500/30 hover:border-blue-500"
                                            title="Administrar Permisos"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(user)}
                                            className={clsx("p-2 rounded-lg transition-colors border", isActive ? "text-green-400 hover:text-white hover:bg-red-600 border-green-500/30 hover:border-red-500" : "text-gray-400 hover:text-white hover:bg-green-600 border-gray-500/30 hover:border-green-500")}
                                            title={isActive ? "Desactivar Cuenta" : "Reactivar Cuenta"}
                                        >
                                            <Power className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors border border-red-500/30 hover:border-red-500"
                                            title="Eliminar Usuario Permanentemente"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal de Configuración - PORTAL */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header Fixed */}
                        <div className="p-5 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center rounded-t-2xl shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white">{editingUser ? 'Configurar Acceso' : 'Nuevo Usuario'}</h3>
                                <p className="text-sm text-gray-400">{formData.email || 'Complete los datos'}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1 min-h-0">

                            {/* Info Básica */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-900/30 p-4 rounded-xl border border-gray-700/50 relative">

                                {/* Image Upload Component - Spanning Rows */}
                                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center mb-4">
                                    <div className="relative group cursor-pointer">
                                        <div className={clsx(
                                            "w-24 h-24 rounded-full border-4 border-gray-800 shadow-xl overflow-hidden flex items-center justify-center bg-gray-700 transition-all group-hover:border-blue-500",
                                            uploadingImage && "animate-pulse"
                                        )}>
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-3xl font-bold text-gray-500">
                                                    {(formData.displayName || formData.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                                <Camera className="w-8 h-8 text-white" />
                                            </div>
                                        </div>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    setImageFile(file);
                                                    setPreviewUrl(URL.createObjectURL(file));
                                                }
                                            }}
                                        />

                                        {/* Status Badge */}
                                        <div className="absolute bottom-0 right-0 bg-gray-900 rounded-full p-1 border border-gray-700">
                                            <Upload className="w-4 h-4 text-blue-400" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Click para cambiar foto</p>
                                </div>

                                {!editingUser && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Corporativo</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="usuario@empresa.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono (WhatsApp)</label>
                                            <input type="tel" value={formData.phoneNumber || ''} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ej: 56912345678" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contraseña Inicial</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono tracking-wider"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    onClick={generatePassword}
                                                    className="p-3 bg-gray-700 hover:bg-gray-600 text-blue-400 rounded-lg border border-gray-600 transition-colors"
                                                    title="Generar Contraseña Segura"
                                                >
                                                    <RefreshCcw className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={copyToClipboard}
                                                    className="p-3 bg-gray-700 hover:bg-gray-600 text-green-400 rounded-lg border border-gray-600 transition-colors"
                                                    title="Copiar al Portapapeles"
                                                >
                                                    <Copy className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {editingUser && (
                                    <div className="space-y-2 col-span-1 md:col-span-2 border-t border-gray-700 pt-4 mt-2">
                                        <div className="flex items-start gap-3 bg-blue-900/20 p-3 rounded-lg border border-blue-500/20">
                                            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-bold text-blue-300">Gestión de Contraseña</h4>
                                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                    Por seguridad, no es posible modificar la contraseña de un usuario existente desde aquí.
                                                    <br /><br />
                                                    <span className="text-white font-bold">Para cambiar la contraseña:</span>
                                                    <ol className="list-decimal ml-4 mt-1 space-y-1">
                                                        <li>Elimina este usuario (botón rojo en la lista).</li>
                                                        <li>Borra su cuenta en <strong>Firebase Console / Authentication</strong> (si usas el mismo email).</li>
                                                        <li>Créalo nuevamente con la nueva contraseña.</li>
                                                    </ol>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre Completo</label>
                                    <input type="text" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ej: Juan Pérez" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono (WhatsApp)</label>
                                    <input type="tel" value={formData.phoneNumber || ''} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ej: 56912345678" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rol del Sistema</label>
                                    <div className="relative">
                                        <select
                                            value={formData.role}
                                            onChange={(e) => {
                                                const newRole = e.target.value;
                                                let newPerms = { ...formData.permissions };

                                                // AUTO-FILL PERMISSIONS BASED ON ROLE
                                                if (newRole === 'Admin') {
                                                    // Enable everything
                                                    MODULES.forEach(m => {
                                                        newPerms[m.key] = { view: true, edit: true };
                                                    });
                                                } else if (newRole === 'Technician') {
                                                    // Standard Technician Access
                                                    newPerms['tickets'] = { view: true, edit: true };
                                                    newPerms['ingreso'] = { view: true, edit: true };
                                                    newPerms['tasks'] = { view: true, edit: true };
                                                    newPerms['roadmap'] = { view: true, edit: false };
                                                    // Disable Admin stuff if previously checked? Only if explicitly desired.
                                                    // Let's just Add, not remove, to be safe, OR reset?
                                                    // Resetting is better for "Defaults".
                                                    // But we should probably preserve existing if switching?
                                                    // User complained about "not seeing anything", so let's default to *giving access*.
                                                    newPerms['users'] = { view: false, edit: false };
                                                    newPerms['settings'] = { view: false, edit: false };
                                                } else if (newRole === 'Viewer') {
                                                    // Status Viewer
                                                    newPerms['dashboard'] = { view: true, edit: false };
                                                    newPerms['roadmap'] = { view: true, edit: false };
                                                    newPerms['tickets'] = { view: true, edit: false }; // Read only
                                                }

                                                setFormData({ ...formData, role: newRole, permissions: newPerms });
                                            }}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                        >
                                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MATRIZ DE PERMISOS */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
                                    <Shield className="w-5 h-5 text-blue-500" />
                                    <h4 className="font-bold text-white text-lg">Matriz de Permisos</h4>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-gray-700 shadow-lg">
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead className="bg-gray-900">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Módulo</th>
                                                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-400 w-32">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Eye className="w-4 h-4 text-blue-400" /> Visualizar
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-400 w-32">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <PenTool className="w-4 h-4 text-green-400" /> Editar
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700 bg-gray-800/50">
                                            {MODULES.map((mod) => {
                                                const perm = formData.permissions[mod.key] || { view: false, edit: false };
                                                return (
                                                    <tr key={mod.key} className="hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-200 flex items-center gap-3">
                                                            <div className={`w-2 h-2 rounded-full ${perm.view ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
                                                            {mod.label}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <label className="relative inline-flex items-center cursor-pointer justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    checked={perm.view}
                                                                    onChange={() => togglePermission(mod.key, 'view')}
                                                                />
                                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                            </label>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <label className="relative inline-flex items-center cursor-pointer justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    checked={perm.edit}
                                                                    onChange={() => togglePermission(mod.key, 'edit')}
                                                                />
                                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                                            </label>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer Fixed */}
                        <div className="p-5 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3 rounded-b-2xl shrink-0">
                            <button onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="px-6 py-2.5 text-gray-400 hover:text-white text-sm font-bold bg-gray-800 hover:bg-gray-700 rounded-xl transition-all border border-gray-700 disabled:opacity-50">Cancelar</button>
                            <button onClick={handleSaveUser} disabled={isProcessing} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-wait flex items-center gap-2">
                                {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
