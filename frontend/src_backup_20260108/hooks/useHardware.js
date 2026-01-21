import { useState, useEffect } from 'react';
import { systemService } from '../services/systemService';
import { useAuth } from '../context/AuthContext';
import { PROCESSORS, GPUS } from '../data/hardware-constants';

export const useHardware = () => {
    const { userProfile } = useAuth();
    const [hardwareData, setHardwareData] = useState({
        processors: PROCESSORS, // Default Initial State (Instant Load)
        gpus: GPUS
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 1. Subscribe to updates
        const unsubscribe = systemService.subscribeToHardware((data) => {
            if (data) {
                setHardwareData({
                    processors: data.processors || PROCESSORS,
                    gpus: data.gpus || GPUS
                });
            }
            setLoading(false);
        });

        // 2. Migration Check (Lazy Seed)
        // Only if Admin, check if we need to seed
        if (userProfile?.role === 'Admin') {
            const checkSeed = async () => {
                await systemService.seedDefaultHardware();
            };
            checkSeed();
        }

        return () => unsubscribe();
    }, [userProfile]);

    return {
        processors: hardwareData.processors,
        gpus: hardwareData.gpus,
        loading,
        error
    };
};
