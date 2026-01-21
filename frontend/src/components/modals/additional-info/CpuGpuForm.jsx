import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import { useHardware } from '../../../hooks/useHardware';

export default function CpuGpuForm({ info, onChange, getInputClass }) {
    const { processors, gpus } = useHardware();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU */}
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600/50">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                    <Cpu className="w-4 h-4 text-blue-400" /> Procesador
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    {/* Brand */}
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Marca</label>
                        <select
                            value={info.cpuBrand || ''}
                            onChange={(e) => onChange('cpuBrand', e.target.value)}
                            className={getInputClass('cpuBrand', "w-full rounded-lg p-2 text-sm text-gray-200")}
                        >
                            <option value="">Selec...</option>
                            {Object.keys(processors).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    {/* Model/Gen */}
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Modelo / Gen</label>
                        <select
                            value={info.cpuGen || ''}
                            onChange={(e) => onChange('cpuGen', e.target.value)}
                            disabled={!info.cpuBrand}
                            className={getInputClass('cpuGen', "w-full rounded-lg p-2 text-sm text-gray-200")}
                        >
                            <option value="">Selec...</option>
                            {info.cpuBrand && processors[info.cpuBrand]?.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* GPU */}
            <div className="bg-gray-700/30 p-4 rounded-xl border border-gray-600/50">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-3">
                    <Zap className="w-4 h-4 text-yellow-400" /> Gráfica
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    {/* Brand */}
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Tipo</label>
                        <select
                            value={info.gpuBrand || ''}
                            onChange={(e) => onChange('gpuBrand', e.target.value)}
                            className={getInputClass('gpuBrand', "w-full rounded-lg p-2 text-sm text-gray-200")}
                        >
                            <option value="">Selec...</option>
                            {Object.keys(gpus).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    {/* Model */}
                    <div>
                        <label className="text-[10px] uppercase text-gray-500 font-bold">Serie / Chip</label>
                        <select
                            value={info.gpuModel || ''}
                            onChange={(e) => onChange('gpuModel', e.target.value)}
                            disabled={!info.gpuBrand}
                            className={getInputClass('gpuModel', "w-full rounded-lg p-2 text-sm text-gray-200")}
                        >
                            <option value="">Selec...</option>
                            {info.gpuBrand && gpus[info.gpuBrand]?.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
