import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Trash2, Plus, DollarSign, Server, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const RAM_OPTIONS = ["4GB", "8GB", "12GB", "16GB", "24GB", "32GB", "64GB"];
const STORAGE_OPTIONS = ["120GB", "240GB", "250GB", "256GB", "480GB", "500GB", "512GB", "1TB", "2TB", "4TB"];

export default function HardwarePriceManager() {
    const [activeTab, setActiveTab] = useState('RAM'); // 'RAM' or 'STORAGE'
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newCapacity, setNewCapacity] = useState('8GB');
    const [newPrice, setNewPrice] = useState('');
    const [newType, setNewType] = useState('DDR4'); // Default

    // Reset form when tab changes
    useEffect(() => {
        if (activeTab === 'RAM') {
            setNewType('DDR4');
            setNewCapacity('8GB');
        } else {
            setNewType('SSD 2.5"');
            setNewCapacity('240GB');
        }
    }, [activeTab]);

    useEffect(() => {
        setLoading(true);
        // Listen to prices for active category
        const targetCategory = activeTab === 'RAM' ? 'RAM' : 'STORAGE';
        const q = query(collection(db, 'hardware_prices'), where('category', '==', targetCategory));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort Logic
            setPrices(data.sort((a, b) => {
                // Parse capacity (remove GB/TB)
                const parseCap = (cap) => {
                    const num = parseFloat(cap);
                    return cap.includes('TB') ? num * 1000 : num;
                };
                return parseCap(a.capacity) - parseCap(b.capacity);
            }));
            setLoading(false);
        }, (error) => {
            console.error("Error loading prices:", error);
            toast.error(`Error cargando precios: ${error.message}`);
        });
        return () => unsubscribe();
    }, [activeTab]);

    const handleAddPrice = async () => {
        if (!newPrice || !newCapacity) return;
        try {
            // Check if exists
            const exists = prices.find(p => p.capacity === newCapacity && p.type === newType);
            if (exists) {
                toast.error("Ya existe un precio para esta configuración. Elimínalo primero.");
                return;
            }

            const targetCategory = activeTab === 'RAM' ? 'RAM' : 'STORAGE';

            await addDoc(collection(db, 'hardware_prices'), {
                category: targetCategory,
                type: newType,
                capacity: newCapacity,
                price: Number(newPrice),
                updatedAt: new Date().toISOString()
            });
            toast.success("Precio actualizado");
            setNewPrice('');
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar precio");
        }
    };

    const handleDeletePrice = async (id) => {
        if (!window.confirm("¿Eliminar este precio?")) return;
        try {
            await deleteDoc(doc(db, 'hardware_prices', id));
            toast.success("Precio eliminado");
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6 transition-all duration-300">
            <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-bold text-white uppercase">Lista de Precios Hardware</h3>
                </div>

                {/* TABS */}
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-600">
                    <button
                        onClick={() => setActiveTab('RAM')}
                        className={clsx(
                            "px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all",
                            activeTab === 'RAM' ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Server className="w-3 h-3" /> RAM
                    </button>
                    <button
                        onClick={() => setActiveTab('STORAGE')}
                        className={clsx(
                            "px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all",
                            activeTab === 'STORAGE' ? "bg-purple-600 text-white shadow-md" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <HardDrive className="w-3 h-3" /> ALMACENAMIENTO
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className={clsx(
                    "border  p-4 rounded-xl mb-6 transition-colors",
                    activeTab === 'RAM' ? "bg-blue-900/10 border-blue-500/20" : "bg-purple-900/10 border-purple-500/20"
                )}>
                    <p className={clsx("text-sm mb-4", activeTab === 'RAM' ? "text-blue-300" : "text-purple-300")}>
                        {activeTab === 'RAM'
                            ? "Gestiona los costos base para las memorias RAM."
                            : "Gestiona los costos para Discos Duros y SSD."}
                    </p>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="min-w-[120px]">
                            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Tipo</label>
                            <select
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white focus:ring-2 ring-blue-500 outline-none"
                            >
                                {activeTab === 'RAM' ? (
                                    <>
                                        <option value="DDR3">DDR3</option>
                                        <option value="DDR4">DDR4</option>
                                        <option value="DDR5">DDR5</option>
                                        <option value="DDR3L">DDR3L</option>
                                        <option value="LPDDR4">LPDDR4</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="SSD 2.5&quot;">SSD 2.5"</option>
                                        <option value="NVMe">NVMe M.2</option>
                                        <option value="SSD M.2 SATA">SSD M.2 SATA</option>
                                        <option value="HDD 2.5&quot;">HDD 2.5" (Laptop)</option>
                                        <option value="HDD 3.5&quot;">HDD 3.5" (PC)</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div className="min-w-[120px]">
                            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Capacidad</label>
                            <select
                                value={newCapacity}
                                onChange={e => setNewCapacity(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white focus:ring-2 ring-blue-500 outline-none"
                            >
                                {activeTab === 'RAM'
                                    ? RAM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                    : STORAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                }
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Precio (CLP)</label>
                            <input
                                type="number"
                                value={newPrice}
                                onChange={e => setNewPrice(e.target.value)}
                                placeholder="$ 15000"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleAddPrice}
                            disabled={!newPrice}
                            className={clsx(
                                "px-4 py-2 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-colors",
                                activeTab === 'RAM' ? "bg-blue-600 hover:bg-blue-500" : "bg-purple-600 hover:bg-purple-500"
                            )}
                        >
                            <Plus className="w-4 h-4" /> Agregar
                        </button>
                    </div>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {prices.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-700/20 rounded-lg border border-gray-700/50 hover:bg-gray-700/40 transition-colors group">
                            <div className="flex items-center gap-6">
                                <div className={clsx(
                                    "px-3 py-1 rounded-md flex items-center justify-center text-xs font-bold border w-24 text-center",
                                    activeTab === 'RAM' ? "bg-blue-900/30 text-blue-300 border-blue-500/30" : "bg-purple-900/30 text-purple-300 border-purple-500/30"
                                )}>
                                    {item.type}
                                </div>
                                <div className="w-20 font-bold text-white text-lg">{item.capacity}</div>
                                <div className="text-green-400 font-mono font-bold text-lg">$ {item.price?.toLocaleString()}</div>
                            </div>
                            <button onClick={() => handleDeletePrice(item.id)} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {!loading && prices.length === 0 && (
                        <div className="text-center text-gray-500 text-sm py-8 border-2 border-dashed border-gray-800 rounded-xl">
                            No hay precios de {activeTab} configurados. Agrega uno arriba.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
