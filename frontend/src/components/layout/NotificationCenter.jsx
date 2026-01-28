import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Info, UserPlus, ClipboardCheck, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function NotificationCenter({ onNavigate, placement = 'bottom-right' }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
    const menuRef = useRef(null);
    const lastNotifCountRef = useRef(0);

    // Subscribe & Toast Logic
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = notificationService.subscribeToNotifications(user.uid, (newNotifs) => {
            // Check for new notifications to toast
            if (newNotifs.length > lastNotifCountRef.current && lastNotifCountRef.current > 0) {
                const latest = newNotifs[0]; // Assuming desc order
                // Only toast if it's very recent (avoid toast storm on load)
                const isRecent = latest.createdAt?.seconds && (Date.now() / 1000 - latest.createdAt.seconds < 10);
                if (isRecent && !latest.read) {
                    toast(
                        <div className="flex items-center gap-2 text-sm" onClick={() => handleNotificationClick(latest)}>
                            <span className="font-bold">{latest.title}</span>
                            <span className="text-gray-400 text-xs truncate max-w-[150px]">{latest.message}</span>
                        </div>,
                        { icon: '🔔', duration: 4000, position: 'top-right' }
                    );
                }
            }
            setNotifications(newNotifs);
            lastNotifCountRef.current = newNotifs.length;
        });
        return () => unsub();
    }, [user]);

    // CLICK OUTSIDE HANDLER
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleMarkRead = async (id, e) => {
        e?.stopPropagation();
        await notificationService.markAsRead(id);
    };

    const handleMarkAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;
        await notificationService.markAllAsRead(user.uid);
        toast.success("Todo marcado como leído");
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            handleMarkRead(notification.id);
        }

        if (notification.link && onNavigate) {
            onNavigate(notification.link);
            setIsOpen(false);
        }
    };

    // Filter Logic
    const filteredNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read).length;

    const getIcon = (type) => {
        switch (type) {
            case 'invite_project':
            case 'invite_area': return <UserPlus className="w-4 h-4 text-blue-400" />;
            case 'assign_task': return <ClipboardCheck className="w-4 h-4 text-green-400" />;
            case 'alert': return <Info className="w-4 h-4 text-red-400" />;
            default: return <Info className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => {
                    if (!isOpen) {
                        const hasUnread = notifications.some(n => !n.read);
                        setActiveTab(hasUnread ? 'unread' : 'all');
                    }
                    setIsOpen(!isOpen);
                }}
                className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all"
            >
                <Bell className={clsx("w-5 h-5 transition-transform", isOpen && "rotate-12 text-blue-400")} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-gray-900"></span>
                    </span>
                )}
            </button>

            {/* Modal Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={clsx(
                            "absolute w-96 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden",
                            placement === 'bottom-right' && "right-0 top-12",
                            placement === 'sidebar-footer' && "left-full bottom-0 ml-4 mb-2" // Pops out to the right
                        )}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-800 bg-gray-950/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                                    Notificaciones
                                    {unreadCount > 0 && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                                </h3>
                                <div className="flex gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-xs text-gray-400 hover:text-blue-400 font-medium transition-colors"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={clsx(
                                        "flex-1 text-xs font-medium py-1.5 rounded-md transition-all text-center",
                                        activeTab === 'all' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-300"
                                    )}
                                >
                                    Todas
                                </button>
                                <button
                                    onClick={() => setActiveTab('unread')}
                                    className={clsx(
                                        "flex-1 text-xs font-medium py-1.5 rounded-md transition-all text-center",
                                        activeTab === 'unread' ? "bg-gray-700 text-white shadow-sm" : "text-gray-400 hover:text-gray-300"
                                    )}
                                >
                                    No leídas
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                            {filteredNotifications.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                                    <Bell className="w-8 h-8 mb-4 opacity-20" />
                                    <p className="text-xs mb-4">Sin notificaciones.</p>
                                </div>
                            ) : (
                                <div>
                                    {filteredNotifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={clsx(
                                                "p-4 border-b border-gray-800 flex gap-3 hover:bg-gray-800/40 transition-colors relative group cursor-pointer",
                                                !notification.read ? "bg-blue-900/5" : "opacity-80"
                                            )}
                                        >
                                            {/* Same Item Structure */}
                                            <div className={clsx("mt-1 p-1.5 rounded-lg shrink-0 h-fit", !notification.read ? "bg-gray-800 text-blue-400" : "bg-gray-800/50 text-gray-500")}>
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className={clsx("text-sm font-medium leading-tight", !notification.read ? "text-gray-200" : "text-gray-400")}>
                                                        {notification.title}
                                                    </h4>
                                                    <span className="text-[10px] text-gray-600 shrink-0 ml-2">
                                                        {notification.createdAt?.seconds
                                                            ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true, locale: es })
                                                            : 'Ahora'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 leading-snug line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => handleMarkRead(notification.id, e)}
                                                        className="p-1.5 bg-gray-700 hover:bg-blue-600 hover:text-white rounded-full text-gray-400 transition-colors shadow-lg"
                                                        title="Marcar como leída"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        // Optimistic Update: Remove immediately
                                                        const prevNotifs = notifications;
                                                        setNotifications(prev => prev.filter(n => n.id !== notification.id));

                                                        try {
                                                            await notificationService.deleteNotification(notification.id);
                                                            toast.success("Notificación eliminada");
                                                        } catch (err) {
                                                            console.error("Delete failed:", err);
                                                            // Revert on failure
                                                            setNotifications(prevNotifs);
                                                            toast.error("Error al eliminar (Permisos o Red)");
                                                        }
                                                    }}
                                                    className="p-1.5 bg-gray-700 hover:bg-red-600 hover:text-white rounded-full text-gray-400 transition-colors shadow-lg"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                            {!notification.read && (
                                                <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-blue-500 rounded-r-full"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                    </motion.div >
                )
                }
            </AnimatePresence >
        </div >
    );
}
