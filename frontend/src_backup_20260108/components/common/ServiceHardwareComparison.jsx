
import React from 'react';
import { ArrowRight, Server, HardDrive } from 'lucide-react';
import HardwareSpecSelector from './HardwareSpecSelector';
import { RAM_OPTIONS, DISK_OPTIONS } from '../../data/hardware-constants';

export default function ServiceHardwareComparison({ type, originalDetails, finalData, onChange }) {
    // type: 'RAM' | 'DISK'
    // originalDetails: Array of strings ["8GB"]
    // finalData: { slots: N, detalles: [...] } (Editable State)

    const isRam = type === 'RAM';
    const Icon = isRam ? Server : HardDrive;
    const options = isRam ? RAM_OPTIONS : DISK_OPTIONS;
    const label = isRam ? "Memoria RAM" : "Disco / Almacenamiento";

    return (
        <div className="mt-3 bg-black/20 p-3 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase">
                <Icon className="w-3.5 h-3.5" />
                <span>Validación de Hardware ({type})</span>
            </div>

            <div className="flex items-start gap-3">
                {/* Original (Left) */}
                <div className="flex-1 opacity-70">
                    <label className="block text-[10px] text-gray-500 uppercase mb-1">Antes (Ingreso)</label>
                    <div className="bg-gray-800 p-2 rounded border border-gray-700 text-xs text-gray-300">
                        {Array.isArray(originalDetails) ? originalDetails.join(' + ') : (originalDetails || 'N/A')}
                    </div>
                </div>

                <div className="self-center pt-4 text-gray-500">
                    <ArrowRight className="w-4 h-4" />
                </div>

                {/* Final (Right - Editable) */}
                <div className="flex-1">
                    <label className="block text-[10px] text-green-400 uppercase mb-1 font-bold">Final (Confirmado)</label>
                    <HardwareSpecSelector
                        label="" // No internal label needed
                        options={options}
                        value={finalData}
                        onChange={onChange}
                    />
                </div>
            </div>
        </div>
    );
}
