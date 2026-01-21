import { useState, useEffect, useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import toast from 'react-hot-toast'; // Notification
import { db } from '../../services/firebase'; // Direct DB access for lightweight query or use service
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function TicketModal({ isOpen, onClose, checkTicket, onSave }) {
    const [formData, setFormData] = useState({
        customerName: '',
        contactInfo: '',
        deviceType: '',
        deviceBrand: '', // New Field
        deviceModel: '',
        description: '',
        priority: 'Normal',
        status: 'Pending',
        estimatedCost: 0,
        conFactura: false // New Field
    });

    const [uniqueBrands, setUniqueBrands] = useState([]);
    const [modelSuggestions, setModelSuggestions] = useState([]);
    const [allHistory, setAllHistory] = useState([]); // Store { brand, model } objects

    useEffect(() => {
        if (checkTicket) {
            setFormData(checkTicket);
        } else {
            setFormData({
                customerName: '',
                contactInfo: '',
                deviceType: '',
                deviceBrand: '',
                deviceModel: '',
                description: '',
                priority: 'Normal',
                status: 'Pending',
                estimatedCost: 0,
                conFactura: false
            });
        }
    }, [checkTicket, isOpen]);

    // FETCH HISTORY FOR AUTOCOMPLETE
    useEffect(() => {
        if (isOpen) {
            const fetchHistory = async () => {
                try {
                    // Fetch last 500 tickets to build a suggestion base
                    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'), limit(500));
                    const snapshot = await getDocs(q);

                    const history = [];
                    const brands = new Set();

                    snapshot.forEach(doc => {
                        const d = doc.data();
                        if (d.deviceBrand) {
                            brands.add(d.deviceBrand);
                            if (d.deviceModel) {
                                history.push({ brand: d.deviceBrand, model: d.deviceModel });
                            }
                        }
                        // Fallback for combined strings if previously used? 
                        // For now assuming we start using structured Brand/Model.
                    });

                    setUniqueBrands(Array.from(brands).sort());
                    setAllHistory(history);
                } catch (err) {
                    console.error("Error fetching suggestion history:", err);
                }
            };
            fetchHistory();
        }
    }, [isOpen]);

    // Filter Models when Brand changes
    useEffect(() => {
        if (formData.deviceBrand) {
            const relevantForBrand = allHistory
                .filter(h => h.brand.toLowerCase() === formData.deviceBrand.toLowerCase())
                .map(h => h.model);
            // Unique models
            const uniqueModels = [...new Set(relevantForBrand)].sort();
            setModelSuggestions(uniqueModels);
        } else {
            setModelSuggestions([]);
        }
    }, [formData.deviceBrand, allHistory]);


    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'estimatedCost' ? parseFloat(value) : value)
        }));
    };

    // --- IMAGE UPLOAD LOGIC ---
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Dynamic import to avoid heavy load if not used
            const { storage } = await import('../../services/firebase');
            const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

            const storageRef = ref(storage, `tickets/${formData.ticketId || 'temp'}/${Date.now()}_${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload error", error);
                    toast.error("Error al subir imagen");
                    setUploading(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setFormData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), downloadURL]
                    }));
                    setUploading(false);
                    setUploadProgress(0);
                }
            );

        } catch (error) {
            console.error("Error init upload", error);
            setUploading(false);
        }
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b p-6 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">
                        {checkTicket ? 'Editar Ticket' : 'Nueva Recepción'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-200 transition-colors">
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                        {/* Customer Info */}
                        <div className="md:col-span-2">
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">Datos Cliente</h3>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Nombre Cliente</label>
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                required
                                placeholder="Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Contacto / Teléfono</label>
                            <input
                                type="text"
                                name="contactInfo"
                                value={formData.contactInfo}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                required
                                placeholder="+56 9..."
                            />
                        </div>

                        {/* Device Info */}
                        <div className="md:col-span-2">
                            <h3 className="mb-3 mt-2 text-xs font-bold uppercase tracking-wider text-gray-400">Información del Equipo</h3>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Tipo de Equipo</label>
                            <select
                                name="deviceType"
                                value={formData.deviceType}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                required
                            >
                                <option value="">Seleccionar Tipo</option>
                                <option value="Laptop">Notebook</option>
                                <option value="Desktop">PC Escritorio</option>
                                <option value="Mobile">Celular</option>
                                <option value="Tablet">Tablet</option>
                                <option value="Printer">Impresora</option>
                                <option value="Console">Consola</option>
                                <option value="Other">Otro</option>
                            </select>

                            {/* COMPRA CON FACTURA CHECKBOX */}
                            <div className="mt-3 flex items-center">
                                <input
                                    id="conFactura"
                                    name="conFactura"
                                    type="checkbox"
                                    checked={formData.conFactura || false}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="conFactura" className="ml-2 text-sm font-medium text-gray-900">
                                    ¿Compra con Factura? (Crédito Fiscal)
                                </label>
                            </div>
                        </div>

                        {/* BRAND CHECK */}
                        <div>
                            <label className="mb-2 block text-sm font-bold text-gray-700">Marca</label>
                            <input
                                type="text"
                                name="deviceBrand"
                                value={formData.deviceBrand || ''}
                                onChange={handleChange}
                                list="brand-suggestions"
                                className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder="Ej: Lenovo, Dell, HP..."
                            />
                            <datalist id="brand-suggestions">
                                {uniqueBrands.map(b => (
                                    <option key={b} value={b} />
                                ))}
                            </datalist>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-bold text-gray-700">Modelo</label>
                            <input
                                type="text"
                                name="deviceModel"
                                value={formData.deviceModel}
                                onChange={handleChange}
                                list="model-suggestions"
                                className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                placeholder={modelSuggestions.length > 0 ? `Sugerencias: ${modelSuggestions.slice(0, 3).join(', ')}...` : "Modelo específico..."}
                            />
                            <datalist id="model-suggestions">
                                {modelSuggestions.map(m => (
                                    <option key={m} value={m} />
                                ))}
                            </datalist>
                            {modelSuggestions.length > 0 && (
                                <p className="text-xs text-blue-500 mt-1">
                                    💡 {modelSuggestions.length} modelos encontrados para {formData.deviceBrand}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-bold text-gray-700">Descripción del Problema</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                required
                                placeholder="Describe el problema detalladamente..."
                            ></textarea>
                        </div>

                        {/* --- PHOTOS SECTION --- */}
                        <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-100">
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                📸 Fotografías del Equipo (Marketing)
                            </h3>

                            <div className="flex flex-wrap gap-4 items-center">
                                {/* Upload Button */}
                                <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 border-dashed rounded-xl w-24 h-24 flex flex-col items-center justify-center gap-1 transition-all">
                                    <span className="text-2xl">{uploading ? '⏳' : '+'}</span>
                                    <span className="text-[10px] font-bold uppercase">{uploading ? `${Math.round(uploadProgress)}%` : 'Subir'}</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                </label>

                                {/* Image Preview Grid */}
                                {formData.images && formData.images.map((img, idx) => (
                                    <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                        <img src={img} alt="preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}

                                {(!formData.images || formData.images.length === 0) && (
                                    <div className="text-sm text-gray-400 italic">
                                        Agrega fotos para que aparezcan en WooCommerce.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status & Priority */}
                        <div className="md:col-span-2 grid grid-cols-2 gap-6">
                            <div>
                                <label className="mb-2 block text-sm font-bold text-gray-700">Prioridad</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                >
                                    <option value="Low">Baja</option>
                                    <option value="Normal">Normal</option>
                                    <option value="High">Alta</option>
                                    <option value="Urgent">Urgente</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-gray-700">Costo Estimado</label>
                                <input
                                    type="number"
                                    name="estimatedCost"
                                    value={formData.estimatedCost}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-3 border-t pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                        >
                            {checkTicket ? 'Actualizar Ticket' : 'Crear Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
