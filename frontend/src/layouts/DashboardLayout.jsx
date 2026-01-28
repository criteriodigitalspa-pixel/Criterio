import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Ticket, LogOut, Users, Activity, Menu, X, TrendingUp, PlusCircle, Map, Settings, ClipboardList, BarChart3, ShoppingCart, ListTodo, DollarSign, PanelLeftClose, PanelLeftOpen, Bot } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useState, Suspense, useRef, useEffect } from 'react';
import GlobalActivityIndicator from '../components/GlobalActivityIndicator';
import ActiveUsers from '../components/ActiveUsers';
import { usePresence } from '../hooks/usePresence';
import OfflineIndicator from '../components/common/OfflineIndicator';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { motion } from 'framer-motion';
import GeneralLogo from '../assets/GeneralLogo.png';
import NotificationCenter from '../components/layout/NotificationCenter';

export default function DashboardLayout() {
    const { user, userProfile, logout } = useAuth();
    const location = useLocation();
    usePresence(user, userProfile);

    // --- SMART SIDEBAR LOGIC ---
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile Toggle

    // Default to Collapsed (minimized)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

    // Refs for Smart Behavior
    const hoverTimeoutRef = useRef(null);
    const sidebarRef = useRef(null);
    const navigate = useNavigate();

    // Notification Navigation Handler
    const handleNotificationNavigate = (link) => {
        if (!link) return;
        const { projectId, taskId } = typeof link === 'string' ? JSON.parse(link) : link;
        navigate('/tasks', { state: { openProjectId: projectId, openTaskId: taskId } });
    };

    // 1. Mouse Enter: Expand after delay
    const handleMouseEnter = () => {
        if (!isSidebarCollapsed) return; // Already open

        // Clear any existing clear timeout
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

        // Set delay to open
        hoverTimeoutRef.current = setTimeout(() => {
            setIsSidebarCollapsed(false);
        }, 800); // 0.8s delay
    };

    // 2. Mouse Leave: Cancel expand if it hasn't happened
    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    // 3. Click Handler (Immediate Expand)
    const handleSidebarClick = () => {
        if (isSidebarCollapsed) {
            setIsSidebarCollapsed(false);
        }
    };

    // 4. Click Outside (Auto Collapse)
    useEffect(() => {
        function handleClickOutside(event) {
            // If sidebar is open (not collapsed) AND click is outside sidebar
            if (!isSidebarCollapsed && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarCollapsed(true);
            }
        }

        // Bind the event listener
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isSidebarCollapsed]);


    // --- NAV ITEMS ---
    const navItems = [
        { label: 'Tablero Taller', path: '/tickets', icon: Activity },
        { label: 'Ingreso Equipo', path: '/ingreso', icon: ClipboardList },
        { label: 'Bitácora / Status', path: '/roadmap', icon: Map },
        { label: 'Utilidades', path: '/utilities', icon: Package },
        { label: 'Proyectos', path: '/tasks', icon: ListTodo },
        { label: 'Dashboards', path: '/sales', icon: DollarSign, adminOnly: true },
        { label: 'Configuración', path: '/settings', icon: Settings },
    ];

    const visibleNavItems = navItems.filter(item => {
        if (userProfile?.email === 'criteriodigitalspa@gmail.com' || userProfile?.role === 'Admin') return true;
        const perms = userProfile?.permissions;
        const isEmptyPerms = !perms || (typeof perms === 'object' && Object.keys(perms).length === 0);
        if (isEmptyPerms && userProfile?.role !== 'Pending') {
            return ['/tickets', '/ingreso', '/roadmap', '/dashboard', '/settings'].includes(item.path);
        }
        if (isEmptyPerms || userProfile?.role === 'Pending') return false;
        if (Array.isArray(perms)) {
            return perms.includes(item.path);
        }
        const pathToModule = {
            '/tickets': 'tickets', '/ingreso': 'ingreso', '/roadmap': 'roadmap',
            '/dashboard': 'dashboard', '/settings': 'settings', '/users': 'users',
            '/sales': 'sales', '/tasks': 'tasks'
        };
        const moduleKey = item.module || pathToModule[item.path];
        if (moduleKey && perms?.[moduleKey]?.view) return true;
        return false;
    });

    const finalVisibleItems = (visibleNavItems.length === 0 && userProfile?.role !== 'Pending')
        ? navItems.filter(item => ['/tickets', '/ingreso', '/roadmap', '/dashboard', '/settings'].includes(item.path))
        : visibleNavItems;

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
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full z-40 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="text-white p-2">
                    <Menu className="h-6 w-6" />
                </button>
                <span className="text-white font-bold ml-2">Criterio Digital</span>
                <ActiveUsers />
            </div>

            {/* Backdrop Mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleSidebarClick}
                className={clsx(
                    "fixed inset-y-0 left-0 bg-gray-950 border-r border-gray-800 shadow-2xl transition-all duration-300 z-50 ease-in-out hover:shadow-blue-900/20",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                    "md:translate-x-0 md:static",
                    isSidebarCollapsed ? "md:w-20" : "md:w-64"
                )}
            >
                <div className={clsx("flex flex-col h-full transition-all duration-300", isSidebarCollapsed ? "w-64 md:w-20" : "w-64")}>
                    {/* Logo Section */}
                    <div className={clsx("h-20 flex items-center shrink-0 border-b border-gray-800/50 relative transition-all", isSidebarCollapsed ? "justify-start px-6 md:justify-center md:px-0" : "gap-3 px-6")}>
                        <div className="h-9 w-9 relative flex items-center justify-center bg-white rounded-full shadow-lg p-1.5 ring-2 ring-blue-500/30 shrink-0">
                            <img src={GeneralLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className={clsx("transition-all duration-200 overflow-hidden whitespace-nowrap ml-3 md:ml-0", isSidebarCollapsed ? "w-auto opacity-100 md:w-0 md:opacity-0" : "w-auto opacity-100")}>
                            <h1 className="text-base font-black text-white tracking-tight">Criterio <span className="text-blue-500">Digital</span></h1>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold font-mono">ERP System v1.0</p>
                        </div>
                    </div>

                    {/* Nav Items */}
                    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                        {finalVisibleItems.map((item) => {
                            if (item.adminOnly && userProfile?.role !== 'Admin') return null;
                            const isActiveItem = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    title={isSidebarCollapsed ? item.label : ''}
                                    className={({ isActive }) => clsx(
                                        'relative group flex items-center rounded-xl py-3 transition-all duration-200 min-h-[48px]',
                                        isSidebarCollapsed ? 'px-4 md:px-0 md:justify-center' : 'px-4',
                                        isActive ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                                    )}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <item.icon className={clsx("h-5 w-5 shrink-0 transition-colors", isActive ? "text-blue-400" : "text-gray-500 group-hover:text-white", (isSidebarCollapsed ? "mr-3 md:mr-0" : "mr-3"))} />

                                            <span className={clsx("whitespace-nowrap transition-all duration-300", isSidebarCollapsed ? "w-auto opacity-100 block md:w-0 md:opacity-0 md:hidden" : "w-auto opacity-100 block")}>
                                                {item.label}
                                            </span>
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-800/50 bg-gray-900/50">
                        <div className={clsx(
                            "flex items-center gap-3 transition-all",
                            isSidebarCollapsed ? "flex-col justify-center mb-2 px-0" : "mb-4 px-2"
                        )}>
                            <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center overflow-hidden shrink-0">
                                {userProfile?.photoURL ? (
                                    <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-blue-400 font-bold">
                                        {(userProfile?.displayName || userProfile?.email || '?').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className={clsx("overflow-hidden whitespace-nowrap transition-all duration-200 flex-1", isSidebarCollapsed ? "w-auto opacity-100 md:w-0 md:opacity-0 hidden" : "w-auto opacity-100 block")}>
                                <div className="text-xs text-gray-500 font-medium">Usuario Activo</div>
                                <div className="text-sm text-white truncate font-bold leading-tight" title={userProfile?.email}>
                                    {userProfile?.displayName || userProfile?.email}
                                </div>
                            </div>
                            <div className={clsx("transition-all duration-300", isSidebarCollapsed ? "opacity-100 mt-2" : "opacity-100")}>
                                <NotificationCenter onNavigate={handleNotificationNavigate} placement="sidebar-footer" />
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className={clsx(
                                "flex w-full items-center justify-center rounded-xl py-2 text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20",
                                isSidebarCollapsed ? "px-4 md:px-0" : "px-4"
                            )}
                            title="Cerrar Sesión"
                        >
                            <LogOut className={clsx("h-4 w-4", (isSidebarCollapsed ? "mr-2 md:mr-0" : "mr-2"))} />
                            <span className={clsx(isSidebarCollapsed ? "block md:hidden" : "block")}>Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative pt-16 md:pt-0">
                {/* Desktop Header */}
                <div className="hidden md:flex h-16 bg-gray-900/95 border-b border-gray-800 items-center justify-between px-8 sticky top-0 z-20 backdrop-blur-sm">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Removed Toggle Button */}

                        <div className="flex-1 flex items-center">
                            <div id="dashboard-header-portal" className="flex-1" />
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

            <GlobalActivityIndicator />
            <OfflineIndicator />
        </div>
    );
}
