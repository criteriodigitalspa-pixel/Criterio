import { renderHook } from '@testing-library/react';
import { useRole } from '../useRole';
import { useAuth } from '../../context/AuthContext';
import { describe, it, expect, vi } from 'vitest';

// Mock useAuth
vi.mock('../../context/AuthContext');

describe('useRole Hook', () => {
    it('returns default Guest role if no user', () => {
        useAuth.mockReturnValue({ user: null, userProfile: null, loading: false });
        const { result } = renderHook(() => useRole());
        expect(result.current.role).toBe('Guest');
        expect(result.current.isAdmin).toBe(false);
    });

    it('identifies Admin correctly', () => {
        useAuth.mockReturnValue({
            user: { uid: '123' },
            userProfile: { role: 'Admin' },
            loading: false
        });
        const { result } = renderHook(() => useRole());
        expect(result.current.role).toBe('Admin');
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.canDeleteTicket()).toBe(true);
    });

    it('identifies Technician and restricts delete', () => {
        useAuth.mockReturnValue({
            user: { uid: '456' },
            userProfile: { role: 'Technician' },
            loading: false
        });
        const { result } = renderHook(() => useRole());
        expect(result.current.role).toBe('Technician');
        expect(result.current.isTechnician).toBe(true);
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.canDeleteTicket()).toBe(false);
    });

    it('resolves master admin by email', () => {
        useAuth.mockReturnValue({
            user: { uid: '789', email: 'criteriodigitalspa@gmail.com' },
            userProfile: { role: 'Technician' }, // Even if role is lower
            loading: false
        });
        const { result } = renderHook(() => useRole());
        expect(result.current.isAdmin).toBe(true);
    });
});
