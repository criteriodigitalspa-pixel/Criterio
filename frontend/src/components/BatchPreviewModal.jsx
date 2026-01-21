import { useState } from 'react';
import { X, Save, Trash2, Edit2, Check, AlertTriangle, Users, FileText } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function BatchPreviewModal({ isOpen, onClose, batchList, onRemoveItem, onUpdateItem, onSaveBatch, isSaving }) {
    if (!isOpen) return null;

    const totalCost = batchList.reduce((acc, item) => acc + (Number(item.precioCompra) || 0), 0);

    const handleSave = () => {
        if (batchList.length === 0) {
            toast.error("La lista está vacía");
            return;
        }
        onSaveBatch();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                            Previsualización de Lote
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Revisa y edita los equipos antes de ingresarlos al sistema.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="px-6 py-3 bg-blue-900/10 border-b border-gray-800 flex items-center gap-4">
                    <Users className="w-5 h-5 text-blue-400" />
                    <div className="flex-1">
                        <label className="text-xs font-bold text-blue-300 uppercase block mb-1">Proveedor (Para todo el lote)</label>
                        <input
                            type="text"
                            placeholder="Ej: Stock, Compra Juan, etc."
                            value={batchList[0]?.proveedor || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Update ALL items
                                batchList.forEach((_, idx) => onUpdateItem(idx, { proveedor: val }));
                            }}
                            className="w-full bg-gray-900 border border-blue-500/30 rounded-lg p-2 text-white text-sm focus:ring-2 ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Global Invoice Toggle */}
                    <button
                        onClick={() => {
                            const newState = !batchList[0]?.conFactura;
                            batchList.forEach((_, idx) => onUpdateItem(idx, { conFactura: newState }));
                        }}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all h-full self-end mb-0.5",
                            batchList[0]?.conFactura
                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20"
                                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white"
                        )}
                        title="Marcar todos con Factura"
                    >
                        <FileText className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Factura</span>
                        {batchList[0]?.conFactura && <Check className="w-3 h-3 ml-1" />}
                    </button>

                    <div className="text-xs text-gray-500 max-w-[200px] leading-tight hidden md:block">
                        *Este valor se asignará a todos los equipos del lote actual.
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-900/30">
                    {batchList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                            <p>No hay equipos en el lote.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {batchList.map((item, index) => (
                                <BatchItem
                                    key={item.tempId || index}
                                    item={item}
                                    index={index}
                                    onRemove={() => onRemoveItem(index)}
                                    onUpdate={(updates) => onUpdateItem(index, updates)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Totals & Actions */}
                <div className="p-6 border-t border-gray-800 bg-gray-900 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 text-sm">
                        <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                            <span className="text-gray-400 uppercase text-xs font-bold mr-2">Total Equipos</span>
                            <span className="text-white font-mono text-xl font-bold">{batchList.length}</span>
                        </div>
                        <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                            <span className="text-gray-400 uppercase text-xs font-bold mr-2">Costo Total Lote</span>
                            <span className="text-green-400 font-mono text-xl font-bold">${totalCost.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-bold hover:bg-gray-800 transition-colors w-full md:w-auto"
                        >
                            Seguir Editando
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || batchList.length === 0}
                            className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    CONFIRMAR Y GUARDAR PACK
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BatchItem({ item, index, onRemove, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...item });

    const handleSaveEdit = () => {
        onUpdate(editData);
        setIsEditing(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    if (isEditing) {
        return (
            <div className="bg-gray-800 border border-blue-500/50 rounded-xl p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Marca</label>
                        <input name="marca" value={editData.marca} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Modelo</label>
                        <input name="modelo" value={editData.modelo} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-400 font-bold uppercase">CPU Complet (Brand + Gen)</label>
                        <div className="flex gap-2">
                            <input name="cpuBrand" placeholder="Ej: Intel Core i5" value={editData.cpuBrand || ''} onChange={handleChange} className="w-1/2 bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs" />
                            <input name="cpuGen" placeholder="Ej: 8th Gen" value={editData.cpuGen || ''} onChange={handleChange} className="w-1/2 bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Precio Compra</label>
                        <input type="number" name="precioCompra" value={editData.precioCompra} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs" />
                    </div>
                    {/* Provider globalized - Removed per-item input */}
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-400 font-bold uppercase">Serial Number / SN</label>
                        <input name="serial" value={editData.serial || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs font-mono" />
                    </div>

                    {/* GPU & VRAM */}
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-400 font-bold uppercase">GPU + VRAM</label>
                        <div className="flex gap-2">
                            <input
                                name="gpu"
                                placeholder="GPU (Ej: Intel Iris)"
                                value={editData.additionalInfo?.gpu || ''}
                                onChange={(e) => setEditData({ ...editData, additionalInfo: { ...editData.additionalInfo, gpu: e.target.value } })}
                                className="w-2/3 bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                            />
                            <input
                                name="vram"
                                placeholder="VRAM (Ej: 1GB)"
                                value={editData.additionalInfo?.vram || ''}
                                onChange={(e) => setEditData({ ...editData, additionalInfo: { ...editData.additionalInfo, vram: e.target.value } })}
                                className="w-1/3 bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                            />
                        </div>
                    </div>

                    {/* Resolution & Battery */}
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Resolución</label>
                        <input
                            name="resolution"
                            placeholder="Ej: 1920x1080"
                            value={editData.additionalInfo?.resolution || ''}
                            onChange={(e) => setEditData({ ...editData, additionalInfo: { ...editData.additionalInfo, resolution: e.target.value } })}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold uppercase">Vida Batería</label>
                        <input
                            name="batteryHealth"
                            placeholder="Ej: 80% (Buena)"
                            value={editData.additionalInfo?.batteryHealth || ''}
                            onChange={(e) => setEditData({ ...editData, additionalInfo: { ...editData.additionalInfo, batteryHealth: e.target.value } })}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white text-xs"
                        />
                    </div>
                </div>

                {/* Specs Condensed - Editable somewhat through text for now logic?
                    Actually, we need to edit the DETAILS array usually.
                    Let's provide simple text inputs for the first slot or join them?
                    For simplicity and robustness: Edit the FIRST slot text directly.
                */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-700/50 pt-2">
                    <div>
                        <label className="text-xs text-gray-400 font-bold flex justify-between mb-1">
                            RAM Details
                            <span className="text-[10px] text-gray-500">{editData.ram?.slots || 0} Slots</span>
                        </label>
                        <div className="flex flex-col gap-2">
                            {editData.ram?.detalles?.map((detail, idx) => (
                                <div key={idx} className="relative">
                                    <span className="absolute left-2 top-1.5 text-[10px] text-gray-500 font-mono">#{idx + 1}</span>
                                    <input
                                        value={detail || ''}
                                        onChange={(e) => {
                                            const newDetalles = [...(editData.ram.detalles || [])];
                                            newDetalles[idx] = e.target.value;
                                            setEditData({ ...editData, ram: { ...editData.ram, detalles: newDetalles } });
                                        }}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-1 pl-8 text-white text-xs"
                                        placeholder={`RAM Slot ${idx + 1}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 font-bold flex justify-between mb-1">
                            Disk Details
                            <span className="text-[10px] text-gray-500">{editData.disco?.slots || 0} Disks</span>
                        </label>
                        <div className="flex flex-col gap-2">
                            {editData.disco?.detalles?.map((detail, idx) => (
                                <div key={idx} className="relative">
                                    <span className="absolute left-2 top-1.5 text-[10px] text-gray-500 font-mono">#{idx + 1}</span>
                                    <input
                                        value={detail || ''}
                                        onChange={(e) => {
                                            const newDetalles = [...(editData.disco.detalles || [])];
                                            newDetalles[idx] = e.target.value;
                                            setEditData({ ...editData, disco: { ...editData.disco, detalles: newDetalles } });
                                        }}
                                        className="w-full bg-gray-900 border border-gray-700 rounded p-1 pl-8 text-white text-xs"
                                        placeholder={`Disk ${idx + 1}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm text-gray-400 hover:text-white">Cancelar</button>
                    <button onClick={handleSaveEdit} className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 flex items-center gap-2">
                        <Check className="w-4 h-4" /> Guardar Cambios
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 rounded-xl p-4 flex items-center justify-between group transition-all">
            <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                    {index + 1}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{item.marca} {item.modelo}</span>
                        {item.modeloAlias && <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{item.modeloAlias}</span>}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">💾 {item.ram?.slots}x RAM</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                        <span className="flex items-center gap-1">💿 {item.disco?.slots}x SSD</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                        <div className="flex items-center bg-gray-900 border border-gray-700/50 rounded px-2 py-0.5 focus-within:border-green-500/50 transition-colors" onClick={e => e.stopPropagation()}>
                            <span className="text-green-500 font-bold mr-1">$</span>
                            <input
                                type="number"
                                value={item.precioCompra}
                                onChange={(e) => onUpdate({ precioCompra: e.target.value })}
                                className="bg-transparent text-green-400 font-bold text-xs w-20 outline-none placeholder-green-800/50 appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                            />
                        </div>
                        {item.proveedor && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                <span className="text-amber-400">Prov: {item.proveedor}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors"
                    title="Editar este item"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onRemove}
                    className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                    title="Eliminar del lote"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
