import { renderHook, act, waitFor } from '@testing-library/react';
import { useHardware } from '../useHardware';
import { systemService } from '../../services/systemService';
import { PROCESSORS } from '../../data/hardware-constants';
import { useAuth } from '../../context/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Dependencies
vi.mock('../../services/systemService', () => ({
    systemService: {
        subscribeToHardware: vi.fn(),
        seedDefaultHardware: vi.fn()
    }
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn()
}));

describe('useHardware Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({ userProfile: { role: 'Technician' } }); // Default Non-Admin
    });

    it('should return static constants initially', () => {
        // Mock subscription that never emits (simulating loading/fallback)
        systemService.subscribeToHardware.mockImplementation(() => () => { });

        const { result } = renderHook(() => useHardware());

        expect(result.current.processors).toEqual(PROCESSORS);
        expect(result.current.loading).toBe(true);
    });

    it('should update with data from service', async () => {
        // Mock subscription that emits data immediately
        systemService.subscribeToHardware.mockImplementation((callback) => {
            callback({
                processors: { "TestBrand": ["Model1"] },
                gpus: {}
            });
            return () => { };
        });

        const { result } = renderHook(() => useHardware());

        await waitFor(() => {
            expect(result.current.processors).toEqual({ "TestBrand": ["Model1"] });
            expect(result.current.loading).toBe(false);
        });
    });

    it('should trigger seed if user is Admin', () => {
        useAuth.mockReturnValue({ userProfile: { role: 'Admin' } });
        systemService.subscribeToHardware.mockImplementation(() => () => { });

        renderHook(() => useHardware());

        expect(systemService.seedDefaultHardware).toHaveBeenCalled();
    });

    it('should NOT trigger seed if user is Technician', () => {
        useAuth.mockReturnValue({ userProfile: { role: 'Technician' } });
        systemService.subscribeToHardware.mockImplementation(() => () => { });

        renderHook(() => useHardware());

        expect(systemService.seedDefaultHardware).not.toHaveBeenCalled();
    });
});
