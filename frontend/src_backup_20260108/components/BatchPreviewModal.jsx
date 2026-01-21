import { useState } from 'react';
import { X, Save, Trash2, Edit2, Check, AlertTriangle } from 'lucide-react';
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
                        <label className="text-xs text-gray-400">Marca</label>
                        <input name="marca" value={editData.marca} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Modelo</label>
                        <input name="modelo" value={editData.modelo} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Alias / ID Cliente (Opcional)</label>
                        <input name="modeloAlias" value={editData.modeloAlias || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Precio Compra</label>
                        <input type="number" name="precioCompra" value={editData.precioCompra} onChange={handleChange} className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" />
                    </div>
                </div>
                {/* Specs Condensed */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400">RAM ({editData.ram?.slots || 0} slots)</label>
                        <div className="text-xs text-gray-500 truncate">{editData.ram?.detalles?.join(', ')}</div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400">Discos ({editData.disco?.slots || 0} units)</label>
                        <div className="text-xs text-gray-500 truncate">{editData.disco?.detalles?.join(', ')}</div>
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
                        <span className="text-green-400">${Number(item.precioCompra).toLocaleString()}</span>
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
