import { useState, useEffect } from 'react';
import { X, Search, UserCircle2, Check, Loader2, Users } from 'lucide-react';
import { userService } from '../../services/userService';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserInviteModal({ isOpen, onClose, project, onInvite }) {
    const [eligibleUsers, setEligibleUsers] = useState([]);
    const [existingMembers, setExistingMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]); // Array of UIDs

    useEffect(() => {
        if (isOpen) {
            loadUsers();
            setSelectedUsers([]);
            setSearchTerm('');
        }
    }, [isOpen, project]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await userService.getAllUsers();
            const currentMemberIds = project?.members || [];

            const members = allUsers.filter(u => currentMemberIds.includes(u.id));
            const eligible = allUsers.filter(u => !currentMemberIds.includes(u.id));

            setExistingMembers(members);
            setEligibleUsers(eligible);
        } catch (error) {
            console.error("Error loading users", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleInvite = () => {
        const usersToInvite = eligibleUsers.filter(u => selectedUsers.includes(u.id));
        onInvite(usersToInvite);
        onClose();
    };

    const filteredEligible = eligibleUsers.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            Gestionar Miembros
                        </h2>
                        <p className="text-xs text-gray-400">Proyecto: {project?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="p-4 space-y-6">
                            {/* Existing Members Section */}
                            {existingMembers.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        Miembros Actuales ({existingMembers.length})
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {existingMembers.map(member => (
                                            <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-800">
                                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                                    {member.photoURL ? (
                                                        <img src={member.photoURL} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-white  font-bold">
                                                            {(member.name || member.email || '?')[0].toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-200 truncate">{member.name || 'Sin nombre'}</div>
                                                    <div className="text-[10px] text-gray-500 truncate">{member.email}</div>
                                                </div>
                                                {member.id === project.createdBy && (
                                                    <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20">Owner</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="w-full h-px bg-gray-800"></div>

                            {/* Invite Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                    Invitar Nuevos Usuarios
                                </h3>

                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        className="w-full bg-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all border border-gray-700 focus:border-blue-500/50"
                                        placeholder="Buscar por nombre o email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {filteredEligible.length > 0 ? (
                                        filteredEligible.map(user => {
                                            const isSelected = selectedUsers.includes(user.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    onClick={() => toggleUser(user.id)}
                                                    className={clsx(
                                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                                        isSelected
                                                            ? "bg-blue-600/20 border-blue-500/50"
                                                            : "bg-transparent border-transparent hover:bg-gray-800"
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                                                        isSelected ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
                                                    )}>
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} className="w-full h-full rounded-full object-cover" />
                                                        ) : (
                                                            user.name?.charAt(0).toUpperCase() || <UserCircle2 className="w-6 h-6" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={clsx("font-medium truncate", isSelected ? "text-blue-200" : "text-gray-200")}>
                                                            {user.name || 'Usuario sin nombre'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                                                    </div>
                                                    {isSelected && <Check className="w-5 h-5 text-blue-400" />}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-6 text-gray-500 text-sm italic">
                                            {searchTerm ? 'No se encontraron más usuarios.' : 'No hay más usuarios disponibles para invitar.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleInvite}
                        disabled={selectedUsers.length === 0}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Invitar ({selectedUsers.length})
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
