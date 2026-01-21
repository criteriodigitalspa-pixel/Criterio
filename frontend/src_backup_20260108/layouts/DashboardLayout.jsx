import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Ticket, LogOut, Users, Activity, Menu, X, TrendingUp, PlusCircle, Map, Settings, ClipboardList, BarChart3, ShoppingCart, ListTodo, DollarSign, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';
// import { auth } from '../services/firebase'; // Removed direct auth usage
import { useAuth } from '../context/AuthContext';
import { useState, Suspense } from 'react';
import GlobalActivityIndicator from '../components/GlobalActivityIndicator';
import ActiveUsers from '../components/ActiveUsers';
import { usePresence } from '../hooks/usePresence';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { motion } from 'framer-motion';

import GeneralLogo from '../assets/GeneralLogo.png';

export default function DashboardLayout() {
    const { user, userProfile, logout } = useAuth(); // Added logout
    const location = useLocation();

    // Validate User Profile Logging
    // console.log('[DashboardLayout] Render. UserProfile:', userProfile);

    // PRESENCE TRACKING
    usePresence(user, userProfile);

    const [sidebarOpen, setSidebarOpen] = useState(false); // Default closed on mobile
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop Toggle
    const navigate = useNavigate();

    // 1. Define all possible items
    const navItems = [
        { label: 'Tablero Taller', path: '/tickets', icon: Activity },
        { label: 'Ingreso Equipo', path: '/ingreso', icon: ClipboardList },
        { label: 'Bitácora / Status', path: '/roadmap', icon: Map },
        { label: 'Dashboard / KPIs', path: '/dashboard', icon: BarChart3 },
        { label: 'Utilidades', path: '/utilities', icon: Package },
        { label: 'Ventas y Finanzas', path: '/sales', icon: DollarSign, adminOnly: true },

        { label: 'Configuración', path: '/settings', icon: Settings },
    ];

    // 2. Filter based on Permissions
    const visibleNavItems = navItems.filter(item => {
        // EMERGENCY BYPASS for Main Admin
        if (userProfile?.email === 'criteriodigitalspa@gmail.com' || userProfile?.role === 'Admin') return true;

        const perms = userProfile?.permissions;

        // 1. No permissions or Pending -> Show nothing (or subset if you prefer, but strictly nothing)
        const isEmptyPerms = !perms || (typeof perms === 'object' && Object.keys(perms).length === 0);

        if (isEmptyPerms && userProfile?.role !== 'Pending') {
            // Legacy/Default fallback for users with no granular config yet
            return ['/tickets', '/ingreso', '/roadmap', '/dashboard', '/settings'].includes(item.path);
        }
        if (isEmptyPerms || userProfile?.role === 'Pending') return false;

        // 2. Handle Legacy Array (Old format)
        if (Array.isArray(perms)) {
            return perms.includes(item.path);
        }

        // 3. New Granular Object Strategy
        const pathToModule = {
            '/tickets': 'tickets',
            '/ingreso': 'ingreso',
            '/roadmap': 'roadmap',
            '/dashboard': 'dashboard',
            '/settings': 'settings',
            '/users': 'users',
            '/sales': 'sales'
        };
        const moduleKey = item.module || pathToModule[item.path];

        if (moduleKey && perms?.[moduleKey]?.view) return true;

        return false;
    });

    // SAFETY NET: If no items are visible and user is NOT Pending (e.g. Broken permissions or Admin), 
    // force show the core modules.
    const finalVisibleItems = (visibleNavItems.length === 0 && userProfile?.role !== 'Pending')
        ? navItems.filter(item => ['/tickets', '/ingreso', '/roadmap', '/dashboard', '/settings'].includes(item.path))
        : visibleNavItems;

    // Helper for Title
    const getPageTitle = () => {
        const item = navItems.find(i => i.path === location.pathname);
        if (item) return item.label;
        if (location.pathname === '/') return 'Inicio';
        return location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.substring(2);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 overflow-hidden">
            {/* Mobile Header & Overlay */}
            <div className="md:hidden fixed top-0 w-full z-40 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="text-white p-2">
                    <Menu className="h-6 w-6" />
                </button>
                <span className="text-white font-bold ml-2">Criterio Digital</span>
                <ActiveUsers />
            </div>

            {/* Backdrop for Mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 bg-gray-800 border-r border-gray-700 shadow-2xl transition-transform duration-300 z-50",
                sidebarOpen ? "translate-x-0" : "-translate-x-full",
                "md:translate-x-0 md:static", // Always visible on Desktop (unless collapsed logic below overrides width)
                isSidebarCollapsed ? "md:w-0 md:border-none md:overflow-hidden" : "md:w-64"
            )}>
                <div className="flex flex-col h-full w-64"> {/* Fixed inner width to prevent squindos */}
                    {/* Logo Section */}
                    <div className="h-28 flex items-center gap-3 px-6 border-b border-gray-700/50 bg-gray-800/50 relative">
                        <div className="h-20 w-20 relative flex items-center justify-center bg-white rounded-full shadow-lg p-2 ring-2 ring-blue-500/30">
                            <img src={GeneralLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white tracking-tight">Criterio <span className="text-blue-500">Digital</span></h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold font-mono">ERP System v1.0</p>
                        </div>
                        {/* Close button for mobile */}
                        <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 right-4 text-gray-400">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {finalVisibleItems.map((item) => {
                            if (item.adminOnly && userProfile?.role !== 'Admin') return null;

                            // Check Active manually to control the motion div
                            const isActiveItem = location.pathname === item.path ||
                                (item.path !== '/' && location.pathname.startsWith(item.path));

                            return (
                                <div key={item.path} className="relative">
                                    {isActiveItem && (
                                        <motion.div
                                            layoutId="active-nav-pill"
                                            className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-blue-400/10 border border-blue-500/30 rounded-xl"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <NavLink
                                        to={item.path}
                                        onClick={() => setSidebarOpen(false)}
                                        className={({ isActive }) => clsx(
                                            'relative z-10 flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200',
                                            isActive
                                                ? 'text-blue-400'
                                                : 'text-gray-400 hover:text-white' // Removed hover background to keep it clean, or use a separate hover pill
                                        )}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <item.icon className={clsx("mr-3 h-5 w-5 transition-colors", isActive ? "text-blue-400" : "text-gray-500 group-hover:text-white")} />
                                                {item.label}
                                            </>
                                        )}
                                    </NavLink>
                                </div>
                            );

                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-700/50 bg-gray-800/50">
                        <div className="mb-4 px-2">
                            <div className="text-xs text-gray-500 font-medium">Usuario Activo</div>
                            <div className="text-sm text-white truncate font-bold" title={userProfile?.email}>
                                {userProfile?.displayName || userProfile?.email || 'Usuario'}
                            </div>
                            <div className="text-xs text-blue-400">{userProfile?.role || 'Technician'}</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative pt-16 md:pt-0">

                {/* Desktop Header */}
                <div className="hidden md:flex h-16 bg-gray-900/95 border-b border-gray-800 items-center justify-between px-8 sticky top-0 z-20 backdrop-blur-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors"
                            title={isSidebarCollapsed ? "Expandir Menú" : "Colapsar Menú"}
                        >
                            {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                        </button>

                        {/* Header Content: Portal Target OR Default Title */}
                        <div className="flex-1 flex items-center">
                            {/* Allow Sales Dashboard to take over this space */}
                            <div id="dashboard-header-portal" className="flex-1" />

                            {/* Default Title (Only show if NOT using portal - currently naive check via CSS or just duplicate? 
                                Better: Hide default if on sales route) */}
                            {!location.pathname.includes('/sales') && (
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                                    {getPageTitle()}
                                </h2>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <ActiveUsers />
                    </div>
                </div>

                <main className="flex-1 overflow-y-scroll bg-gray-900 scrollbar-thin mobile-zoom-container">
                    <div className="mx-auto max-w-full">
                        <ErrorBoundary>
                            <Suspense fallback={
                                <div className="flex h-[calc(100vh-100px)] items-center justify-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                        <span className="text-sm font-medium text-gray-500 animate-pulse">Cargando...</span>
                                    </div>
                                </div>
                            }>
                                <Outlet />
                            </Suspense>
                        </ErrorBoundary>
                    </div>
                </main>
            </div>

            {/* Mobile Zoom CSS Injection */}
            <style>{`
                @media (max-width: 768px) {
                    .mobile-zoom-container {
                        zoom: 0.85;
                    }
                }
            `}</style>
            <GlobalActivityIndicator />
        </div>
    );
}
