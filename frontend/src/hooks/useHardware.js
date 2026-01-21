import { useState, useEffect } from 'react';
import { systemService } from '../services/systemService';
import { useAuth } from '../context/AuthContext';
import { PROCESSORS, GPUS, SCREENS, RESOLUTIONS, VRAMS } from '../data/hardware-constants';

export const useHardware = () => {
    const { userProfile } = useAuth();
    const [hardwareData, setHardwareData] = useState({
        processors: PROCESSORS,
        gpus: GPUS,
        screens: SCREENS,
        resolutions: RESOLUTIONS,
        vrams: VRAMS
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 1. Subscribe to updates
        const unsubscribe = systemService.subscribeToHardware((data) => {
            if (data) {
                setHardwareData({
                    processors: data.processors || PROCESSORS,
                    gpus: data.gpus || GPUS,
                    screens: data.screens || SCREENS,
                    resolutions: data.resolutions || RESOLUTIONS,
                    vrams: data.vrams || VRAMS
                });
            }
            setLoading(false);
        });

        // 2. Migration Check (Lazy Seed)
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
        screens: hardwareData.screens,
        resolutions: hardwareData.resolutions,
        vrams: hardwareData.vrams,
        loading,
        error
    };
};
