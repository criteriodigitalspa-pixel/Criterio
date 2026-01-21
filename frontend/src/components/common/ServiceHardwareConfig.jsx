
import React, { useState, useEffect } from 'react';
import { Cpu, CreditCard } from 'lucide-react';
import clsx from 'clsx';
import { RAM_OPTIONS } from '../../data/hardware-constants';
import { db } from '../../services/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export default function ServiceHardwareConfig({ ramData, onRamChange, diskData, onDiskChange }) {
    const [storageOptions, setStorageOptions] = useState([]);
    const [loadingStorage, setLoadingStorage] = useState(true);

    // Fetch Authorized Storage List
    useEffect(() => {
        const fetchStorage = async () => {
            try {
                const q = query(collection(db, 'hardware_prices'), where('category', '==', 'STORAGE'));
                const snap = await getDocs(q);

                const loaded = snap.docs.map(doc => {
                    const d = doc.data();
                    // normalize
                    return {
                        id: doc.id,
                        label: `${d.type} ${d.capacity}`, // e.g. "SSD 2.5" 240GB"
                        value: `${d.type} ${d.capacity}`,
                        capacityVal: parseCapacity(d.capacity)
                    };
                });

                // Sort by Capacity
                loaded.sort((a, b) => a.capacityVal - b.capacityVal);
                setStorageOptions(loaded);
            } catch (e) {
                console.error("Error loading storage db", e);
            } finally {
                setLoadingStorage(false);
            }
        };
        fetchStorage();
    }, []);

    const parseCapacity = (cap) => {
        if (!cap) return 0;
        const num = parseFloat(cap);
        if (cap.includes('TB')) return num * 1000;
        return num;
    };

    // Helper to update RAM slots
    const handleRamSlotsChange = (num) => {
        let newDetails = [...(ramData.detalles || [])];
        if (num > newDetails.length) {
            newDetails = [...newDetails, ...Array(num - newDetails.length).fill('')];
        } else {
            newDetails = newDetails.slice(0, num);
        }
        onRamChange({ slots: num, detalles: newDetails });
    };

    // Helper to update RAM detail
    const handleRamDetailChange = (index, value) => {
        const newDetails = [...(ramData.detalles || [])];
        newDetails[index] = value;
        onRamChange({ ...ramData, detalles: newDetails });
    };

    // Helper to update Disk slots
    const handleDiskSlotsChange = (num) => {
        let newDetails = [...(diskData.detalles || [])];
        if (num > newDetails.length) {
            newDetails = [...newDetails, ...Array(num - newDetails.length).fill('')];
        } else {
            newDetails = newDetails.slice(0, num);
        }
        onDiskChange({ slots: num, detalles: newDetails });
    };

    // Helper to update Disk detail
    const handleDiskDetailChange = (index, value) => {
        const newDetails = [...(diskData.detalles || [])];
        newDetails[index] = value;
        onDiskChange({ ...diskData, detalles: newDetails });
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/30 p-4 rounded-xl border border-gray-700/50 mt-2">
            {/* RAM */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-green-400" /> Memoria RAM
                </label>
                <div className="flex gap-2 mb-2">
                    {[0, 1, 2, 4].map(num => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleRamSlotsChange(num)}
                            className={clsx(
                                "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                ramData.slots === num
                                    ? "bg-green-500/20 border-green-500 text-green-400"
                                    : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                            )}
                        >
                            {num}
                        </button>
                    ))}
                </div>
                <div className="space-y-2">
                    {Array.from({ length: ramData.slots || 0 }).map((_, i) => (
                        <select
                            key={i}
                            value={ramData.detalles[i] || ''}
                            onChange={(e) => handleRamDetailChange(i, e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-white outline-none focus:border-green-500"
                        >
                            <option value="">Seleccionar...</option>
                            {RAM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ))}
                    {(ramData.slots === 0) && <div className="text-[10px] text-gray-600 italic text-center py-2">Sin RAM (Onboard/Mac)</div>}
                </div>
            </div>

            {/* Disk */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-400" /> Almacenamiento
                </label>
                <div className="flex gap-2 mb-2">
                    {[0, 1, 2].map(num => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleDiskSlotsChange(num)}
                            className={clsx(
                                "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                diskData.slots === num
                                    ? "bg-orange-500/20 border-orange-500 text-orange-400"
                                    : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600"
                            )}
                        >
                            {num}
                        </button>
                    ))}
                </div>
                <div className="space-y-2">
                    {Array.from({ length: diskData.slots || 0 }).map((_, i) => (
                        <div key={i} className="relative">
                            {loadingStorage ? (
                                <div className="text-[10px] text-gray-500">Cargando la lista...</div>
                            ) : (
                                <select
                                    value={diskData.detalles[i] || ''}
                                    onChange={(e) => handleDiskDetailChange(i, e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-xs text-white outline-none focus:border-orange-500"
                                >
                                    <option value="">Seleccionar (Hardware DB)...</option>
                                    {storageOptions.map(opt => (
                                        <option key={opt.id} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    ))}
                    {(diskData.slots === 0) && <div className="text-[10px] text-gray-600 italic text-center py-2">Sin Disco Extraíble</div>}
                </div>
            </div>
        </div>
    );
}
