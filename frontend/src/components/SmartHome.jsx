import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SmartHome() {
    const { userProfile, loading } = useAuth();

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900 text-white">Verificando acceso...</div>;
    }

    if (!userProfile) {
        return <Navigate to="/login" replace />;
    }

    if (userProfile.role === 'Pending') {
        return <Navigate to="/unauthorized" replace />;
    }

    // PRIORITY LIST (Where to send them first?)
    const MODULE_PRIORITY = [
        { key: 'tickets', path: '/tickets' },
        { key: 'dashboard', path: '/dashboard' },
        { key: 'ingreso', path: '/ingreso' },
        { key: 'pos', path: '/pos' },
        { key: 'tasks', path: '/tasks' },
        { key: 'roadmap', path: '/roadmap' },
        { key: 'users', path: '/users' },
        { key: 'settings', path: '/settings' }
    ];

    const perms = userProfile.permissions || {};

    // Check Master Admin
    if (userProfile.role === 'Admin') {
        return <Navigate to="/tickets" replace />;
    }

    // Find first authorized module
    for (const mod of MODULE_PRIORITY) {
        // New Object Format
        if (perms[mod.key] && perms[mod.key].view === true) {
            return <Navigate to={mod.path} replace />;
        }
        // Legacy Array Format fallback
        if (Array.isArray(perms) && perms.includes(mod.path)) {
            return <Navigate to={mod.path} replace />;
        }
    }

    // No modules found
    return <Navigate to="/unauthorized" replace />;
}
