import { useState, useEffect } from 'react';
import { X, Save, Truck, User, Phone, Mail, Calendar, Clock, MapPin, FileText, CheckCircle, DollarSign, Tag, Search, Database, Receipt, Megaphone, Briefcase } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { clientService } from '../services/clientService'; // Import Service
import { useAuth } from '../context/AuthContext';
import { calculateReadiness } from '../utils/wooCommerceReadiness'; // NEW
import { useFinancialsContext } from '../context/FinancialContext'; // NEW
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function DispatchModal({ ticket, onClose, onUpdate }) {
    const { user, userProfile } = useAuth();
    const { calculateFinancials } = useFinancialsContext(); // NEW

    // Financial Calculation
    const financials = calculateFinancials(ticket);

    // Helper to filter out placeholder names like "Stock / Compra"
    const getSafeClientName = (name) => {
        if (!name) return '';
        if (name.includes('Stock / Compra')) return '';
        return name;
    };

    const initialClientName = getSafeClientName(ticket.nombreCliente);

    // UI Mode State
    const [clientMode, setClientMode] = useState(initialClientName ? 'EXISTING' : 'NEW');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [saveToDb, setSaveToDb] = useState(true); // Default save new clients

    // 1. Client Info State
    const [clientInfo, setClientInfo] = useState({
        nombreCliente: initialClientName,
        clientAlias: ticket.clientAlias || '',
        clientEmail: ticket.clientEmail || '',
        clientPhone: ticket.clientPhone || '',
        clientRut: ticket.clientRut || '',
        clientAddress: ticket.clientAddress || ''
    });

    // 2. Dispatch Details State
    const [dispatchDetails, setDispatchDetails] = useState({
        dispatchDay: ticket.dispatchDay || '',
        dispatchHour: ticket.dispatchHour || '',
        dispatchAddress: ticket.dispatchAddress || '',
        dispatchNotes: ticket.dispatchNotes || '',
        isReserved: ticket.isReserved || false
    });

    // 3. Price & Financial Addons State
    const [salesDocumentType, setSalesDocumentType] = useState(ticket.financials?.salesDocumentType || 'Otro');
    const [viaticoCost, setViaticoCost] = useState(ticket.financials?.viaticoCost ?? 2500); // Default 2500
    const [publicidadCost, setPublicidadCost] = useState(ticket.financials?.publicidadCost ?? 3500); // Default 3500

    // Calculate Dynamic Total Cost
    const currentTotalCost = (financials.totalCost || 0) + Number(viaticoCost) + Number(publicidadCost);

    // Default price to calculated total if available, else ticket price
    const [price, setPrice] = useState(ticket.precioVenta || (currentTotalCost > 0 ? currentTotalCost : ''));

    const [saving, setSaving] = useState(false);

    // 4. Images State
    const [images, setImages] = useState(ticket.images || []);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(''); // Text status

    // Handlers
    const handleClientChange = (field, value) => {
        setClientInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 1. Optimistic Updates (Blobs)
        const newBlobs = files.map(file => URL.createObjectURL(file));
        setImages(prev => [...prev, ...newBlobs]);

        // Dynamic import inside handler or top-level? Top-level is better but let's keep it here if lazy.
        // Actually best to import compression at top, but for now we follow pattern.
        const imageCompression = (await import('browser-image-compression')).default;
        const { storage } = await import('../services/firebase');
        const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');

        // 2. Background Process
        // We process each file independently to update its specific blob
        files.forEach(async (file, index) => {
            const blobUrl = newBlobs[index];
            try {
                // Compassion Config
                const options = {
                    maxSizeMB: 0.25, // 250KB target
                    maxWidthOrHeight: 1920,
                    useWebWorker: true
                };

                // Compress
                const compressedFile = await imageCompression(file, options);

                // Upload
                const storageRef = ref(storage, `tickets/${ticket.ticketId || 'temp'}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytesResumable(storageRef, compressedFile);
                const downloadURL = await getDownloadURL(snapshot.ref);

                // 3. Swap Blob -> Real URL
                setImages(prev => prev.map(img => img === blobUrl ? downloadURL : img));

                // Optional: Revoke blob to free memory (garbage collected eventually but good practice)
                // URL.revokeObjectURL(blobUrl); 

            } catch (error) {
                console.error("Upload failed for file:", file.name, error);
                toast.error(`Error al subir ${file.name}`);
                // Remove failed blob
                setImages(prev => prev.filter(img => img !== blobUrl));
            }
        });
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const moveImage = (index, direction) => {
        const newImages = [...images];
        if (direction === 'left' && index > 0) {
            [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
        } else if (direction === 'right' && index < newImages.length - 1) {
            [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
        }
        setImages(newImages);
    };

    const handleDetailChange = (field, value) => {
        setDispatchDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxChange = (field) => {
        setDispatchDetails(prev => ({ ...prev, [field]: !prev[field] }));
    };

    // Client Search Logic
    const handleSearch = async (term) => {
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await clientService.searchClients(term);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectClient = (client) => {
        setClientInfo({
            nombreCliente: client.name || '',
            clientAlias: client.alias || '',
            clientEmail: client.email || '',
            clientPhone: client.phone || '',
            clientRut: client.rut || '',
            clientAddress: client.address || ''
        });
        setSearchTerm(''); // Clear search input visually
        setSearchResults([]);
    };

    // Derived Validation for "Vendido"
    const isValidForSold = clientInfo.nombreCliente?.trim().length > 0 && Number(price) > 0;

    const handleSave = async (actionType = 'SAVE') => {
        if (!ticket.id) return;
        setSaving(true);
        const toastId = toast.loading(actionType === 'SOLD' ? "Procesando Venta..." : "Guardando...");

        try {
            // STEP 0: Auto-Save Client if NEW and Checkbox checked
            if (clientMode === 'NEW' && saveToDb && clientInfo.nombreCliente) {
                try {
                    await clientService.createClient({
                        name: clientInfo.nombreCliente,
                        rut: clientInfo.clientRut || '',
                        phone: clientInfo.clientPhone || '',
                        email: clientInfo.clientEmail || '',
                        address: clientInfo.clientAddress || '',
                        alias: clientInfo.clientAlias || ''
                    });
                } catch (clientErr) {
                    console.error("Failed to save client DB", clientErr);
                }
            }

            const updates = {
                ...clientInfo,
                ...dispatchDetails,
                precioVenta: Number(price),
                images: images // Persist images
            };

            // Logic for 'Vendido' action
            if (actionType === 'SOLD') {
                if (salesDocumentType === 'Factura' && !clientInfo.clientRut) {
                    toast.error("Para Factura, el RUT del cliente es obligatorio.");
                    setSaving(false);
                    return;
                }

                updates.status = 'Closed';
                updates.currentArea = 'Ventas'; // Move to Sales Module
                updates.soldAt = new Date().toISOString();
                updates.soldBy = user.uid;
                updates.isSold = true;

                // Financial Calculations
                const salePrice = Number(price) || 0;
                const purchasePrice = Number(ticket.precioCompra) || 0;
                const extraCosts = Number(ticket.costosExtra) || 0;
                const partsCost = Number(ticket.reparacion?.costoRepuestos) || 0;
                const ramDelta = financials.ramDelta || 0;
                const vCost = Number(viaticoCost) || 0;
                const pCost = Number(publicidadCost) || 0;

                const totalCost = purchasePrice + extraCosts + partsCost + ramDelta + vCost + pCost;

                // Simplified Tax Logic (Net Basis):
                const netSale = Math.round(salePrice / 1.19);
                const ivaDebit = salePrice - netSale;
                const grossMargin = netSale - totalCost;

                updates.financials = {
                    salesDocumentType,
                    viaticoCost: vCost,
                    publicidadCost: pCost,
                    salePrice,
                    purchasePrice,
                    extraCosts,
                    partsCost,
                    ramDelta,
                    totalCost,
                    netSale,
                    ivaDebit,
                    grossMargin,
                    taxRate: 0.19
                };
            } else {
                // Save these even if not sold yet
                updates.financials = {
                    ...ticket.financials, // preserve existing
                    salesDocumentType,
                    viaticoCost: Number(viaticoCost),
                    publicidadCost: Number(publicidadCost)
                };
            }

            await ticketService.updateTicket(ticket.id, updates, {
                userId: user.uid,
                reason: actionType === 'SOLD' ? 'Venta Finalizada - Movido a Ventas' : 'Dispatch Info Update',
                changes: updates
            });

            onUpdate({ ...ticket, ...updates });
            toast.success(actionType === 'SOLD' ? "¡Venta Exitosa!" : "Información Guardada", { id: toastId });
            onClose();

        } catch (error) {
            console.error("Save failed", error);
            toast.error("Error al guardar", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-800/80">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Truck className="text-orange-400" /> Ficha de Despacho
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-bold bg-gray-700 px-2 py-0.5 rounded text-gray-300">{ticket.ticketId}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Section 1: Client Info */}
                    <div className="bg-gray-900/30 p-4 rounded-2xl border border-gray-700/50 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4" /> Información del Cliente
                            </h3>

                            {/* RESTORED TABS */}
                            <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                                <button
                                    onClick={() => setClientMode('EXISTING')}
                                    className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", clientMode === 'EXISTING' ? "bg-blue-600 text-white shadow-md" : "text-gray-400 hover:text-white")}
                                >
                                    Existente
                                </button>
                                <button
                                    onClick={() => setClientMode('NEW')}
                                    className={clsx("px-3 py-1 text-xs font-bold rounded-md transition-all", clientMode === 'NEW' ? "bg-green-600 text-white shadow-md" : "text-gray-400 hover:text-white")}
                                >
                                    Nuevo
                                </button>
                            </div>
                        </div>

                        {/* EXISTING CLIENT SEARCH */}
                        {clientMode === 'EXISTING' && (
                            <div className="relative z-50">
                                <label className="block text-xs font-bold text-gray-400 mb-1">Buscar Cliente (Nombre)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-500" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            handleSearch(e.target.value);
                                        }}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-9 pr-2.5 py-2.5 text-white focus:ring-2 ring-blue-500 outline-none"
                                        placeholder="Escribe para buscar..."
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                    )}
                                </div>

                                {/* Autocomplete Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto">
                                        {searchResults.map(client => (
                                            <button
                                                key={client.id}
                                                onClick={() => selectClient(client)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-700/50 flex items-center justify-between group border-b border-gray-700/50 last:border-0"
                                            >
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{client.name}</div>
                                                    <div className="text-xs text-gray-500 flex gap-2">
                                                        <span>{client.phone || 'Sin télefono'}</span>
                                                        <span>•</span>
                                                        <span>{client.email || 'Sin email'}</span>
                                                    </div>
                                                </div>
                                                <CheckCircle className="w-4 h-4 text-gray-600 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SELECTED EXISTING CLIENT CARD (Hidden details mode) */}
                        {clientMode === 'EXISTING' && clientInfo.nombreCliente && !searchTerm && (
                            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between animate-in fade-in zoom-in-95">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
                                        {clientInfo.nombreCliente.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{clientInfo.nombreCliente}</div>
                                        <div className="text-xs text-blue-300 font-mono">Datos cargados de BD</div>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    setClientInfo({ nombreCliente: '', clientEmail: '', clientPhone: '' }); // Clear
                                    setSearchTerm('');
                                }} className="p-1 hover:bg-blue-900/50 rounded-lg text-blue-300 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* NEW FORM (Visible if in NEW mode) */}
                        {clientMode === 'NEW' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 mb-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            value={clientInfo.nombreCliente}
                                            onChange={(e) => handleClientChange('nombreCliente', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="Nombre..."
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-gray-400 mb-1">RUT (Opcional)</label>
                                        <input
                                            type="text"
                                            value={clientInfo.clientRut || ''}
                                            onChange={(e) => handleClientChange('clientRut', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="12.345..."
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={clientInfo.clientPhone}
                                            onChange={(e) => handleClientChange('clientPhone', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="+56 9..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={clientInfo.clientEmail}
                                            onChange={(e) => handleClientChange('clientEmail', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-green-500 outline-none"
                                            placeholder="email@..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Dirección</label>
                                    <input
                                        type="text"
                                        value={clientInfo.clientAddress || ''}
                                        onChange={(e) => handleClientChange('clientAddress', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-xl p-2.5 text-white focus:ring-2 ring-green-500 outline-none"
                                        placeholder="Dirección completa..."
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="saveClient"
                                        checked={saveToDb}
                                        onChange={(e) => setSaveToDb(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-500 bg-gray-700"
                                    />
                                    <label htmlFor="saveClient" className="text-sm text-gray-300 cursor-pointer select-none">Guardar en Base de Clientes automáticamente</label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Dispatch Logistics */}
                    <div className="bg-gray-900/30 p-4 rounded-2xl border border-gray-700/50 space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Logística de Entrega (Opcional)
                        </h3>

                        {/* Day & Hour */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Día</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        type="date"
                                        value={dispatchDetails.dispatchDay}
                                        onChange={(e) => handleDetailChange('dispatchDay', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-9 pr-2.5 py-2.5 text-white focus:ring-2 ring-orange-500 outline-none custom-date-input"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Hora</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        type="time"
                                        value={dispatchDetails.dispatchHour}
                                        onChange={(e) => handleDetailChange('dispatchHour', e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-9 pr-2.5 py-2.5 text-white focus:ring-2 ring-orange-500 outline-none custom-time-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Dirección</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={dispatchDetails.dispatchAddress}
                                    onChange={(e) => handleDetailChange('dispatchAddress', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-9 pr-2.5 py-2.5 text-white focus:ring-2 ring-orange-500 outline-none"
                                    placeholder="Dirección de entrega..."
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">Notas Adicionales</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                <textarea
                                    value={dispatchDetails.dispatchNotes}
                                    onChange={(e) => handleDetailChange('dispatchNotes', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-9 pr-2.5 py-2.5 text-white focus:ring-2 ring-orange-500 outline-none min-h-[80px] resize-none"
                                    placeholder="Instrucciones especiales..."
                                />
                            </div>
                        </div>

                        {/* Reserved Checkbox */}
                        <div className="flex items-center gap-3 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer group select-none">
                                <div className={clsx(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    dispatchDetails.isReserved ? "bg-purple-600 border-purple-600" : "bg-gray-800 border-gray-600 group-hover:border-purple-500"
                                )}>
                                    {dispatchDetails.isReserved && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={dispatchDetails.isReserved}
                                        onChange={() => handleCheckboxChange('isReserved')}
                                    />
                                </div>
                                <span className={clsx("font-bold text-sm", dispatchDetails.isReserved ? "text-purple-400" : "text-gray-400")}>
                                    Reservado
                                </span>
                            </label>

                            {/* COPY SUMMARY BUTTON */}
                            {dispatchDetails.isReserved && (
                                <button
                                    onClick={() => {
                                        const lines = [
                                            `ID Ticket: ${ticket.ticketId || 'ID Pendiente'}`,
                                            `Nombre: ${clientInfo.nombreCliente || 'Sin Nombre'}`,
                                            `Teléfono: ${clientInfo.clientPhone || 'null'}`,
                                            `Dirección: ${dispatchDetails.dispatchAddress || 'Sin Dirección'}`,
                                            `Fecha: ${dispatchDetails.dispatchDay || 'Sin Fecha'}`,
                                            `Hora: ${dispatchDetails.dispatchHour || 'Sin Hora'}`,
                                            `Notas: ${dispatchDetails.dispatchNotes || 'Sin Notas'}`,
                                            `Precio: $${(price || 0).toLocaleString()}`,
                                            `Equipo: ${ticket.marca} ${ticket.modelo}`,
                                            `Procesador: ${`${ticket.additionalInfo?.cpuBrand || ''} ${ticket.additionalInfo?.cpuGen || ''}`.trim()}`,
                                            `RAM/Disco: ${(ticket.ram?.detalles || []).join('+')} / ${(ticket.disco?.detalles || []).join('+')}`
                                        ];
                                        const text = lines.join('\n');
                                        navigator.clipboard.writeText(text);
                                        toast.success("Copiado al portapapeles");
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-600 transition-colors text-xs font-bold"
                                    title="Copiar Resumen para Repartidor"
                                >
                                    <Briefcase className="w-3 h-3" /> {/* Using Briefcase as generic clipboard icon since Clipboard not imported, or just import Copy */}
                                    Copiar
                                </button>
                            )}
                        </div>

                    </div>

                    {/* Section 2.5: Photos (Marketing) & Readiness */}
                    {/* Reverted border, added log */}
                    <div className="bg-gray-900/30 p-4 rounded-2xl border border-gray-700/50 space-y-4 relative overflow-hidden">

                        {/* WOOCOMMERCE READINESS INDICATOR (Admin Only) */}
                        {/* WOOCOMMERCE READINESS INDICATOR (Admin Only) */}


                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                📸 Fotografías del Producto (Ordenable)
                            </h3>
                            <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                {images.length} fotos
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-4 items-start">
                            {/* Upload Button */}
                            <label className={clsx(
                                "cursor-pointer bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-500/30 border-dashed rounded-xl w-24 h-24 flex flex-col items-center justify-center gap-1 transition-all",
                                uploading && "opacity-50 cursor-not-allowed"
                            )}>
                                <span className="text-2xl">{uploading ? '⏳' : '+'}</span>
                                <span className="text-[10px] font-bold uppercase text-center px-1 leading-tight">
                                    {uploading ? uploadStatus : 'Subir (Mult.)'}
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                />
                            </label>

                            {/* Image Preview Grid */}
                            {images.map((img, idx) => {
                                const isBlob = img.startsWith('blob:');
                                return (
                                    <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-gray-700 shadow-sm bg-black">
                                        <img src={img} alt="preview" className={clsx("w-full h-full object-cover transition-opacity", isBlob && "opacity-50")} />

                                        {/* Loading Indicator for Blobs */}
                                        {isBlob && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}

                                        {/* Overlay Actions (Disabled while uploading blob? Or allow remove?) */}
                                        {!isBlob && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                                {/* Actions */}
                                                {idx > 0 && (
                                                    <button type="button" onClick={() => moveImage(idx, 'left')} className="p-1 text-white hover:text-blue-400" title="Mover Izquierda">
                                                        ◀
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => removeImage(idx)} className="p-1 text-red-400 hover:text-red-500" title="Eliminar">
                                                    <X size={14} />
                                                </button>
                                                {idx < images.length - 1 && (
                                                    <button type="button" onClick={() => moveImage(idx, 'right')} className="p-1 text-white hover:text-blue-400" title="Mover Derecha">
                                                        ▶
                                                    </button>
                                                )}
                                            </div>
                                        )}


                                        {/* Main Label */}
                                        {idx === 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-blue-600/90 text-white text-[9px] font-bold text-center py-0.5">
                                                PRINCIPAL
                                            </div>
                                        )}
                                        {idx > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-gray-800/80 text-gray-400 text-[9px] font-bold text-center py-0.5">
                                                {idx + 1}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Section 3: Financials */}
                    <div className="bg-gray-900/30 p-4 rounded-2xl border border-gray-700/50">

                        {/* Document Type Selection */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-blue-400" /> Tipo de Documento
                            </label>
                            <div className="flex gap-2">
                                {['Boleta', 'Factura', 'Otro'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSalesDocumentType(type)}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-xs font-bold transition-all border",
                                            salesDocumentType === type
                                                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50"
                                                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Viatico & Publicidad Inputs (Mini) */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                                    <Briefcase className="w-3 h-3 text-yellow-500" /> Viático
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={viaticoCost}
                                        onChange={(e) => setViaticoCost(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-5 pr-2 py-1.5 text-white text-xs font-mono focus:ring-1 ring-yellow-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                                    <Megaphone className="w-3 h-3 text-pink-500" /> Publicidad
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={publicidadCost}
                                        onChange={(e) => setPublicidadCost(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-5 pr-2 py-1.5 text-white text-xs font-mono focus:ring-1 ring-pink-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-700/50 my-4"></div>

                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase">Monto Venta Final</label>
                            {financials.isModified && (
                                <span className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-500/30">
                                    Modificado
                                </span>
                            )}
                        </div>

                        {/* Financial Breakdown (if applicable) */}
                        <div className="mb-3 text-xs bg-black/40 p-3 rounded-xl border border-gray-700/50 space-y-1">
                            <div className="flex justify-between text-gray-400">
                                <span>Base Compra:</span>
                                <span>${financials.baseCost.toLocaleString()}</span>
                            </div>
                            {financials.ramDelta !== 0 && (
                                <div className="flex justify-between text-blue-400 font-bold">
                                    <span>Upgrade RAM:</span>
                                    <span>{financials.ramDelta > 0 ? '+' : ''}${financials.ramDelta.toLocaleString()}</span>
                                </div>
                            )}
                            {(Number(viaticoCost) > 0 || Number(publicidadCost) > 0) && (
                                <div className="flex justify-between text-yellow-400 font-bold opacity-80">
                                    <span>Extras (V+P):</span>
                                    <span>+${(Number(viaticoCost) + Number(publicidadCost)).toLocaleString()}</span>
                                </div>
                            )}

                            <div className="border-t border-gray-700 my-1"></div>
                            <div className="flex justify-between text-green-400 font-bold text-sm">
                                <span>Sugerido Total:</span>
                                <span>${currentTotalCost.toLocaleString()}</span>
                            </div>
                            {Number(price) !== currentTotalCost && (
                                <button
                                    onClick={() => setPrice(currentTotalCost)}
                                    className="w-full mt-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 rounded py-1 transition-colors text-xs font-bold"
                                >
                                    Usar Precio Sugerido
                                </button>
                            )}
                        </div>

                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-green-500" />
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-9 pr-2.5 py-2.5 text-green-400 font-mono font-bold text-lg focus:ring-2 ring-green-500 outline-none placeholder-gray-600"
                                placeholder="0"
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-5 bg-gray-900/50 border-t border-gray-700/50 flex flex-col gap-3">

                    {/* Primary Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleSave('SAVE')}
                            disabled={saving || images.some(img => img.startsWith('blob:'))}
                            className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {images.some(img => img.startsWith('blob:')) ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span className="text-sm">Subiendo Fotos...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Info
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => handleSave('SOLD')}
                            disabled={saving || !isValidForSold || images.some(img => img.startsWith('blob:'))}
                            className={clsx(
                                "flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                                !isValidForSold
                                    ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700"
                                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/20"
                            )}
                            title={!isValidForSold ? "Ingresa Nombre Cliente y Precio para vender" : "Finalizar Venta"}
                        >
                            {images.some(img => img.startsWith('blob:')) ? (
                                <span className="text-sm">Espere...</span>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    VENDIDO
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
