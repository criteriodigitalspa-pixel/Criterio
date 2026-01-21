
import React from 'react';
import { Plus, Minus } from 'lucide-react';

export default function HardwareSpecSelector({ label, options, value, onChange }) {
    // value = { slots: 1, detalles: ["8GB"] }

    const updateSlots = (delta) => {
        const newSlots = Math.max(0, (value?.slots || 0) + delta);
        const currentDetails = value?.detalles || [];

        let newDetails = [...currentDetails];
        if (newSlots > currentDetails.length) {
            // Added slot
            newDetails.push("");
        } else if (newSlots < currentDetails.length) {
            // Removed slot
            newDetails = newDetails.slice(0, newSlots);
        }

        onChange({ slots: newSlots, detalles: newDetails });
    };

    const updateDetail = (index, val) => {
        const newDetails = [...(value?.detalles || [])];
        newDetails[index] = val;
        onChange({ ...value, detalles: newDetails });
    };

    return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">{label}</span>
                <div className="flex items-center gap-2 bg-gray-900 rounded p-1">
                    <button type="button" onClick={() => updateSlots(-1)} className="p-1 hover:text-red-400"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-mono font-bold w-4 text-center">{value?.slots || 0}</span>
                    <button type="button" onClick={() => updateSlots(1)} className="p-1 hover:text-green-400"><Plus className="w-3 h-3" /></button>
                </div>
            </div>

            <div className="space-y-2">
                {(value?.detalles || []).map((detail, idx) => (
                    <div key={idx} className="flex gap-2">
                        <select
                            value={detail}
                            onChange={(e) => updateDetail(idx, e.target.value)}
                            className="w-full bg-gray-900 border-gray-600 rounded p-1.5 text-xs text-white outline-none"
                        >
                            <option value="">Vacío / Seleccionar...</option>
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
}
