import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';

export default function ProtectedRoute({ children, allowedRoles, module, action = 'view' }) {
    const { user, loading: authLoading } = useAuth();
    const { role, hasPermission, loading: roleLoading } = useRole();

    if (authLoading || roleLoading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Cargando permisos...</div>;
    if (!user) return <Navigate to="/login" />;

    // 1. Pending / No Role = Block
    if (role === 'Pending') {
        return <Navigate to="/unauthorized" replace />;
    }

    // 2. Role-based check (Legacy support)
    if (allowedRoles && !allowedRoles.includes(role)) {
        // Master Admin Bypass Check manually here if needed, but useRole handles isAdmin usually.
        // However, if allowedRoles is explicit (e.g. only 'Technician'), Admin should probably pass too.
        // Our useRole 'role' returns the string. 
        // Let's assume Admin is always allowed if not explicitly excluded? 
        // For safety, let's keep strict check but add Admin if typically needed. 
        // Or rely on the fact that most routes won't use 'allowedRoles' anymore, but 'module'.
        // If allowedRoles IS used, it's strict.

        // Exception: If I am Admin, do I always pass?
        const { isAdmin } = useRole();
        if (!isAdmin) return <Navigate to="/unauthorized" replace />;
    }

    // 3. Granular Permission Check
    if (module) {
        if (!hasPermission(module, action)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
}
