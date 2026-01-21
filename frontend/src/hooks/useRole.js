import { useAuth } from '../context/AuthContext';

export const useRole = () => {
    const { user, userProfile, loading } = useAuth();

    const role = (user?.email === 'criteriodigitalspa@gmail.com') ? 'Admin' : (userProfile?.role || 'Guest');
    const permissions = userProfile?.permissions || {};

    const isAdmin = role === 'Admin' || user?.email === 'criteriodigitalspa@gmail.com';
    const isTechnician = role === 'Technician' || isAdmin; // Techs inherit Admin usually? Or Admin implies Tech. Let's say Admin includes all.
    // Actually, distinct roles might be better. But for now, Admin > Technician.

    // Helper to check granular permissions
    const hasPermission = (module, action = 'view') => {
        if (loading) return false;
        if (isAdmin) return true; // Master Admin bypass

        // 1. Check permissions object
        if (permissions && typeof permissions === 'object') {
            // Legacy Array Support (Backward Compatibility)
            if (Array.isArray(permissions)) {
                const pathMap = {
                    'tickets': '/tickets',
                    'ingreso': '/ingreso',
                    'roadmap': '/roadmap',
                    'users': '/users',
                    'dashboard': '/dashboard',
                    'settings': '/settings',
                    'pos': '/pos',
                    'tasks': '/tasks'
                };
                const requiredPath = pathMap[module];
                return permissions.includes(requiredPath);
            }

            // New Object Structure
            const modulePerms = permissions[module];
            if (modulePerms) {
                if (action === 'view') return !!modulePerms; // Truthy means they have access
                return modulePerms[action] === true;
            }
        }

        // 2. Fallback for Empty Permissions / Legacy Default Roles
        // If no granular permissions defined, rely on Role defaults? 
        // Current system seems to rely heavily on the permissions object/array.
        // If it's empty, they typically have NO access except maybe Login/Home.

        return false;
    };

    /**
     * Specific Capability Checks (Sugar)
     */
    const canDeleteTicket = () => isAdmin; // Strict: Only Admins
    const canEditUsers = () => isAdmin;
    const canViewDashboard = () => hasPermission('dashboard');
    const canSeeFinancials = () => isAdmin; // Hide costs/profits

    return {
        role,
        permissions,
        loading,
        isAdmin,
        isTechnician,
        hasPermission,
        canDeleteTicket,
        canEditUsers,
        canViewDashboard,
        canSeeFinancials
    };
};
