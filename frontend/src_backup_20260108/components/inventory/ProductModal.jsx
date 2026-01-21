import { useState, useEffect } from 'react';
import { X, Cpu, HardDrive, Monitor, Box, Zap, Cable, Ruler, Grid } from 'lucide-react';

export default function ProductModal({ isOpen, onClose, checkProduct, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: '',
        quantity: 0,
        price: 0,
        minStock: 5,
        description: '',
        // Extended Specs (Notebooks)
        marca: '',
        modelo: '',
        serieUnica: '',
        estetica: 'Bueno',
        cpu: { modelo: '', generacion: '' },
        ram: { tipo: '', capacidad: '' },
        disco: { tipo: '', capacidad: '' },
        // Spare Parts Specs
        volts: '',
        amps: '',
        connector: '', // Tip type
        screenSize: '',
        screenRes: '',
        screenPins: '',
        ramFreq: '',
        diskType: '', // SSD/HDD
        diskInterface: '' // SATA/NVMe
    });

    const [showSpecs, setShowSpecs] = useState(false);

    useEffect(() => {
        if (checkProduct) {
            setFormData({
                ...formData, // Default blanks for new fields
                ...checkProduct,
                cpu: checkProduct.cpu || { modelo: '', generacion: '' },
                ram: checkProduct.ram || { tipo: '', capacidad: '' },
                disco: checkProduct.disco || { tipo: '', capacidad: '' }
            });
            setShowSpecs(!!checkProduct.cpu?.modelo || !!checkProduct.marca);
        } else {
            setFormData({
                name: '', sku: '', category: '', quantity: 0, price: 0, minStock: 5, description: '',
                marca: '', modelo: '', serieUnica: '', estetica: 'Bueno',
                cpu: { modelo: '', generacion: '' },
                ram: { tipo: '', capacidad: '' },
                disco: { tipo: '', capacidad: '' },
                volts: '', amps: '', connector: '',
                screenSize: '', screenRes: '', screenPins: '',
                ramFreq: '', diskType: '', diskInterface: ''
            });
            setShowSpecs(false);
        }
    }, [checkProduct, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: ['quantity', 'price', 'minStock'].includes(name) ? parseFloat(value) : value
        }));
    };

    const handleNestedChange = (category, field, value) => {
        setFormData(prev => ({
            ...prev,
            [category]: { ...prev[category], [field]: value }
        }));
    };

    const getInputClass = () => "block w-full rounded-xl border border-gray-600 bg-gray-700/50 p-2.5 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 outline-none transition-all";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl rounded-2xl bg-gray-800 shadow-2xl border border-gray-700 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between border-b border-gray-700 p-6 sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-xl font-bold text-white">
                        {checkProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-bold text-blue-400 uppercase">Nombre del Producto</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className={getInputClass()} required />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">SKU / Código</label>
                            <input type="text" name="sku" value={formData.sku} onChange={handleChange} className={getInputClass()} required />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Categoría</label>
                            <select name="category" value={formData.category} onChange={handleChange} className={getInputClass()}>
                                <option value="">Seleccionar...</option>
                                <option value="Notebooks">Notebooks / Equipos</option>
                                <option value="Cargadores">Cargadores</option>
                                <option value="RAM">Memorias RAM</option>
                                <option value="Discos">Discos (SSD/HDD)</option>
                                <option value="Pantallas">Pantallas</option>
                                <option value="Repuestos">Otros Repuestos</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Cantidad (Stock)</label>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className={getInputClass()} required min="0" />
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold text-green-400 uppercase">Precio ($)</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} className={getInputClass()} required min="0" step="0.01" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Descripción</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows="2" className={getInputClass()}></textarea>
                        </div>
                    </div>

                    {/* DYNAMIC FIELDS BASED ON CATEGORY */}

                    {/* CARGADORES */}
                    {formData.category === 'Cargadores' && (
                        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 grid grid-cols-3 gap-4">
                            <h3 className="col-span-3 text-xs font-bold text-yellow-500 uppercase flex items-center gap-2 mb-2"><Zap className="w-4 h-4" /> Especificaciones Cargador</h3>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Voltaje (V)</label>
                                <input name="volts" value={formData.volts || ''} onChange={handleChange} className={getInputClass()} placeholder="19V" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Amperaje (A)</label>
                                <input name="amps" value={formData.amps || ''} onChange={handleChange} className={getInputClass()} placeholder="3.42A" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Punta / Conector</label>
                                <input name="connector" value={formData.connector || ''} onChange={handleChange} className={getInputClass()} placeholder="Ej: Punta Azul" />
                            </div>
                        </div>
                    )}

                    {/* PANTALLAS */}
                    {formData.category === 'Pantallas' && (
                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 grid grid-cols-3 gap-4">
                            <h3 className="col-span-3 text-xs font-bold text-blue-500 uppercase flex items-center gap-2 mb-2"><Monitor className="w-4 h-4" /> Especificaciones Pantalla</h3>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Tamaño</label>
                                <input name="screenSize" value={formData.screenSize || ''} onChange={handleChange} className={getInputClass()} placeholder='15.6"' />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Resolución</label>
                                <input name="screenRes" value={formData.screenRes || ''} onChange={handleChange} className={getInputClass()} placeholder="FHD / HD" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Pines</label>
                                <select name="screenPins" value={formData.screenPins || ''} onChange={handleChange} className={getInputClass()}>
                                    <option value="">Seleccionar</option>
                                    <option value="30 Pines">30 Pines</option>
                                    <option value="40 Pines">40 Pines</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* RAM */}
                    {formData.category === 'RAM' && (
                        <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 grid grid-cols-2 gap-4">
                            <h3 className="col-span-2 text-xs font-bold text-green-500 uppercase flex items-center gap-2 mb-2"><Box className="w-4 h-4" /> Especificaciones RAM</h3>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Frecuencia (MHz)</label>
                                <input name="ramFreq" value={formData.ramFreq || ''} onChange={handleChange} className={getInputClass()} placeholder="2666 / 3200" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Formato</label>
                                <select name="ramType" value={formData.ram?.tipo || ''} onChange={(e) => handleNestedChange('ram', 'tipo', e.target.value)} className={getInputClass()}>
                                    <option value="">Seleccionar</option>
                                    <option value="DDR3">DDR3</option>
                                    <option value="DDR3L">DDR3L</option>
                                    <option value="DDR4">DDR4</option>
                                    <option value="DDR5">DDR5</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* DISK */}
                    {formData.category === 'Discos' && (
                        <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 grid grid-cols-2 gap-4">
                            <h3 className="col-span-2 text-xs font-bold text-purple-500 uppercase flex items-center gap-2 mb-2"><HardDrive className="w-4 h-4" /> Especificaciones Disco</h3>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Tipo</label>
                                <select name="diskType" value={formData.diskType || ''} onChange={handleChange} className={getInputClass()}>
                                    <option value="">Seleccionar</option>
                                    <option value="SSD">SSD</option>
                                    <option value="HDD">HDD</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-400 uppercase mb-1">Interfaz</label>
                                <select name="diskInterface" value={formData.diskInterface || ''} onChange={handleChange} className={getInputClass()}>
                                    <option value="">Seleccionar</option>
                                    <option value="SATA">SATA (2.5")</option>
                                    <option value="M.2 SATA">M.2 SATA</option>
                                    <option value="NVMe">M.2 NVMe</option>
                                </select>
                            </div>
                        </div>
                    )}


                    {/* Specs Toggle for Notebooks */}
                    <div className="flex items-center space-x-2 border-t border-gray-700 pt-4">
                        <input
                            type="checkbox"
                            id="showSpecs"
                            checked={showSpecs}
                            onChange={(e) => setShowSpecs(e.target.checked)}
                            className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="showSpecs" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                            Incluir Datos de Equipo (Marca/Modelo/S/N)
                        </label>
                    </div>

                    {/* Extended Specs Section */}
                    {showSpecs && (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 bg-gray-700/30 p-4 rounded-xl border border-gray-700">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Marca</label>
                                <input type="text" name="marca" value={formData.marca} onChange={handleChange} className={getInputClass()} />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Modelo</label>
                                <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} className={getInputClass()} />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Serie Única</label>
                                <input type="text" name="serieUnica" value={formData.serieUnica} onChange={handleChange} className={getInputClass()} />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-400 uppercase">Estado Estético</label>
                                <select name="estetica" value={formData.estetica} onChange={handleChange} className={getInputClass()}>
                                    <option value="Nuevo">Nuevo</option>
                                    <option value="Bueno">Bueno (Usado)</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Repuesto">Para Repuesto</option>
                                </select>
                            </div>

                            {/* Complex Nested Fields */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-600/50 pt-4 mt-2">
                                {/* CPU */}
                                <div className="space-y-2">
                                    <div className="flex items-center text-xs font-bold text-gray-500 uppercase"><Cpu className="w-3 h-3 mr-1" /> Procesador</div>
                                    <input placeholder="Modelo" value={formData.cpu.modelo} onChange={(e) => handleNestedChange('cpu', 'modelo', e.target.value)} className={getInputClass()} />
                                    <input placeholder="Gen" value={formData.cpu.generacion} onChange={(e) => handleNestedChange('cpu', 'generacion', e.target.value)} className={getInputClass()} />
                                </div>
                                {/* RAM */}
                                <div className="space-y-2">
                                    <div className="flex items-center text-xs font-bold text-gray-500 uppercase"><Box className="w-3 h-3 mr-1" /> RAM</div>
                                    <input placeholder="Tipo (DDR4)" value={formData.ram.tipo} onChange={(e) => handleNestedChange('ram', 'tipo', e.target.value)} className={getInputClass()} />
                                    <input placeholder="Capacidad (8GB)" value={formData.ram.capacidad} onChange={(e) => handleNestedChange('ram', 'capacidad', e.target.value)} className={getInputClass()} />
                                </div>
                                {/* DISK */}
                                <div className="space-y-2">
                                    <div className="flex items-center text-xs font-bold text-gray-500 uppercase"><HardDrive className="w-3 h-3 mr-1" /> Disco</div>
                                    <input placeholder="Tipo (SSD)" value={formData.disco.tipo} onChange={(e) => handleNestedChange('disco', 'tipo', e.target.value)} className={getInputClass()} />
                                    <input placeholder="Capacidad (256GB)" value={formData.disco.capacidad} onChange={(e) => handleNestedChange('disco', 'capacidad', e.target.value)} className={getInputClass()} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-3 border-t border-gray-700 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-600 bg-gray-700 px-5 py-2.5 text-sm font-bold text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all"
                        >
                            {checkProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
