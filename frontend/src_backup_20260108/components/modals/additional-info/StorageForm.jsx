import React from 'react';
import { HardDrive, CircuitBoard } from 'lucide-react';
import clsx from 'clsx';

export default function StorageForm({ ram, disk, onRamChange, onDiskChange, getInputClass }) {

    // RAM Helpers
    const handleRamDetail = (index, value) => {
        const newDetalles = [...ram.detalles];
        newDetalles[index] = value;
        onRamChange({ ...ram, detalles: newDetalles });
    };

    const handleRamSlots = (count) => {
        const slots = Number(count);
        onRamChange({
            ...ram,
            slots: slots,
            detalles: Array(slots).fill('').map((_, i) => ram.detalles[i] || '')
        });
    };

    // Disk Helpers
    const handleDiskDetail = (index, value) => {
        const newDetalles = [...disk.detalles];
        newDetalles[index] = value;
        onDiskChange({ ...disk, detalles: newDetalles });
    };

    const handleDiskSlots = (count) => {
        const slots = Number(count);
        onDiskChange({
            ...disk,
            slots: slots,
            detalles: Array(slots).fill('').map((_, i) => disk.detalles[i] || '')
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RAM Section */}
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600/50">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                    <CircuitBoard className="w-4 h-4 text-purple-400" /> Memoria RAM
                </h4>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Slots Ocupados</label>
                        <select
                            value={ram.slots}
                            onChange={(e) => handleRamSlots(e.target.value)}
                            className={getInputClass('ram', "w-full rounded-lg p-2 text-sm text-gray-200")}
                        >
                            {[0, 1, 2, 4].map(n => <option key={n} value={n}>{n} Slots</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        {ram.detalles.map((detalle, i) => (
                            <input
                                key={i}
                                type="text"
                                placeholder={`Slot #${i + 1} (ej: 8GB DDR4)`}
                                value={detalle}
                                onChange={(e) => handleRamDetail(i, e.target.value)}
                                className={getInputClass('ram', "w-full rounded-lg p-2 text-xs bg-gray-800 border-gray-600 text-gray-300")}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Disk Section */}
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600/50">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                    <HardDrive className="w-4 h-4 text-orange-400" /> Almacenamiento
                </h4>
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Unidades</label>
                        <select
                            value={disk.slots}
                            onChange={(e) => handleDiskSlots(e.target.value)}
                            className={getInputClass('disk', "w-full rounded-lg p-2 text-sm text-gray-200")}
                        >
                            {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n} Unidades</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        {disk.detalles.map((detalle, i) => (
                            <input
                                key={i}
                                type="text"
                                placeholder={`Disco #${i + 1} (ej: 512GB SSD)`}
                                value={detalle}
                                onChange={(e) => handleDiskDetail(i, e.target.value)}
                                className={getInputClass('disk', "w-full rounded-lg p-2 text-xs bg-gray-800 border-gray-600 text-gray-300")}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
