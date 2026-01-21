import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Upload, Download, FileSpreadsheet, Loader, CheckCircle, Database } from 'lucide-react';
import { backupService } from '../services/backupService';

export default function DataMigration() {
    const { user } = useAuth();
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [logs, setLogs] = useState([]);
    const [userMap, setUserMap] = useState({});

    // Load User Map for ID -> Email resolution
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const users = await userService.getAllUsers();
                const map = {};
                users.forEach(u => {
                    map[u.id] = u.email;
                });
                setUserMap(map);
            } catch (e) {
                console.error("Error loading users for export mapping", e);
            }
        };
        loadUsers();
    }, []);

    const getUserLabel = (uid) => userMap[uid] || uid || 'Sistema';

    // --- TEMPLATE DOWNLOAD ---
    const handleDownloadTemplate = () => {
        const headers = [
            {
                'ID': '2512-0036',
                'Marca temporal': '2025-01-01 10:00:00',
                'Nombre del Cliente': 'Diego Perez',
                'Marca': 'Lenovo',
                'Modelo': 'ThinkPad T14',
                'Serie/SN': 'PF2XYZ123',
                'Problema': 'Pantalla parpadea',
                'Ubicacion': 'Servicio Rápido',
                'CPU': 'i5-1135G7',
                'Generacion': '11va',
                'RAM Final': '16GB',
                'Disco Final': '512GB SSD',
                'GPU': 'Intel Iris Xe',
                'GB GPU': 'N/A',
                'Tamaño Pantalla': '14',
                'Resolucion Pantalla': '1920x1080',
                'Vida Util Bateria': '85%',
                'Estetica': 'B+',
                'Precio Venta': 150000,
                'Costo Repuestos': 45000,
                'ID Transacción': 'TXN-123456'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Guia");
        XLSX.writeFile(wb, "Plantilla_Guia_Integracion.xlsx");
    };

    // --- IMPORT LOGIC ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                // Use ArrayBuffer for better compatibility
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];

                // Use header:1 to get raw array to find the header
                const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (!rawRows || rawRows.length === 0) {
                    toast.error("El archivo parece vacío.");
                    return;
                }

                // Strategy: Find the row that contains 'ID', 'Marca', 'Cliente', etc.
                let headerIndex = 0;
                let foundHeader = false;
                const candidates = ['ID', 'MARCA', 'CLIENTE', 'NOMBRE', 'FECHA', 'TIMESTAMP', 'MODELO', 'PROCESADOR'];

                // Search first 20 rows
                for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
                    const row = rawRows[i];
                    if (!row || row.length < 2) continue;

                    const rowStr = JSON.stringify(row).toUpperCase();
                    const matches = candidates.filter(c => rowStr.includes(c));
                    if (matches.length >= 2) {
                        headerIndex = i;
                        foundHeader = true;
                        break;
                    }
                }

                if (!foundHeader) {
                    console.warn("No se detectó fila de encabezado obvia. Intentando leer desde fila 0.");
                }

                // Re-parse with detected header
                const dataRows = XLSX.utils.sheet_to_json(ws, { range: headerIndex });

                if (!dataRows || dataRows.length === 0) {
                    toast.error("No se encontraron datos despues de la cabecera.");
                    return;
                }

                parseAndPreview(dataRows);
            } catch (error) {
                console.error("Error parsing Excel:", error);
                toast.error(`Error de lectura: ${error.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Helper for Robust Date Parsing
    const parseRobustDate = (val) => {
        if (!val) return new Date(); // Default to now

        // 1. If it's already a Date object
        if (val instanceof Date) return val;

        // 2. If it's a number (Excel Serial Date) - unlikely if we use sheet_to_json default but possible
        // Excel base date is Dec 30 1899 usually.
        if (typeof val === 'number') {
            // Simple heuristic: > 40000 is likely recent years
            if (val > 20000) {
                return new Date(Math.round((val - 25569) * 86400 * 1000));
            }
            return new Date();
        }

        const strVal = String(val).trim();

        // 3. Try standard parser first
        const d = new Date(strVal);
        if (!isNaN(d.getTime())) return d;

        // 4. Try DD-MM-YYYY or DD/MM/YYYY (Common in Spanish headers)
        // Regex for DD/MM/YYYY HH:MM or DD-MM-YYYY
        const parts = strVal.split(/[-/ :]/);
        if (parts.length >= 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // JS months are 0-based
            const year = parseInt(parts[2]);
            const hour = parts[3] ? parseInt(parts[3]) : 0;
            const min = parts[4] ? parseInt(parts[4]) : 0;

            if (day && !isNaN(month) && year) {
                const manualDate = new Date(year, month, day, hour, min);
                if (!isNaN(manualDate.getTime())) return manualDate;
            }
        }

        console.warn("Could not parse date:", val, "Defaulting to NOW");
        return new Date();
    };

    const parseAndPreview = (rawData) => {
        try {
            const mapped = rawData.map((row) => {
                // --- HELPER: Find by Name or Index ---
                const find = (...labels) => {
                    const keys = Object.keys(row);
                    for (const label of labels) {
                        const match = keys.find(k => k.toLowerCase().trim() === label.toLowerCase().trim());
                        if (match) return row[match];
                        const partial = keys.find(k => k.toLowerCase().includes(label.toLowerCase()));
                        if (partial) return row[partial];
                    }
                    return null;
                };

                const getVal = (...labels) => {
                    const v = find(...labels);
                    return (v === undefined || v === null) ? '' : String(v).trim();
                };

                // --- MAPPING ---
                const ticketId = getVal('ID', 'CODIGO', 'ID Producto');
                const fechaRaw = getVal('Marca temporal', 'HORA Y FECHA', 'Timestamp', 'Fecha');
                const email = getVal('Dirección de correo electrónico', 'Correo', 'Email');
                const cliente = getVal('Nombre Cliente', 'Nombre', 'Cliente');
                const sn = getVal('Codigo/Numero Serie Unico', 'Serie', 'SN', 'Serial');

                const marca = getVal('Marca');
                const modelo = getVal('Modelo');
                const cpu = getVal('CPU', 'Procesador');
                const cpuGen = getVal('Generación de Procesador', 'Generacion');
                const gpu = getVal('GPU', 'Grafica');
                const gpuGb = getVal('GB GPU');
                const screen = getVal('Tamaño Pantalla');
                const resolution = getVal('Resolucion Pantalla');
                const battery = getVal('Vida Util Bateria');
                const aesthetics = getVal('Estetica');

                const ramDefault = getVal('RAM por Defecto', 'RAM Defecto');
                const diskDefault = getVal('Disco 1 Por Defecto', 'Disco Defecto');
                const ramFinal = getVal('RAM Instalada', 'RAM Final', 'RAM YA FINAL');
                const diskFinal = getVal('Disco Instalado', 'ROM FINAL', 'Disco final');
                const finalRamVal = ramFinal || ramDefault || '-';
                const finalDiskVal = diskFinal || diskDefault || '-';

                const currentAreaRaw = getVal('A que Caja se traslada el Equipo?', 'Caja actual', 'Ubicacion', 'Estado', 'Area');
                let currentArea = 'Compras';
                const lowerArea = currentAreaRaw.toLowerCase();
                if (lowerArea.includes('rapido') || lowerArea.includes('rápido')) currentArea = 'Servicio Rapido';
                else if (lowerArea.includes('dedicado')) currentArea = 'Servicio Dedicado';
                else if (lowerArea.includes('espera')) currentArea = 'Caja Espera';
                else if (lowerArea.includes('reciclaje')) currentArea = 'Caja Reciclaje';
                else if (lowerArea.includes('publicidad')) currentArea = 'Caja Publicidad';
                else if (lowerArea.includes('despacho') || lowerArea.includes('terminado')) currentArea = 'Caja Despacho';

                const moveReason = getVal('Explique el motivo del traslado', 'Observacion', 'Motivo');
                const problem = getVal('Marque el Problema', 'Problema', 'Falla', 'Descripcion');

                const parseMoney = (val) => {
                    if (!val) return 0;
                    return parseInt(val.toString().replace(/[^0-9]/g, '')) || 0;
                };

                const costSpares = parseMoney(getVal('Costo Aprox. del/los Repuesto'));
                const timeEst = parseInt(getVal('¿Tiempo estimado para reparar?', 'Tiempo estimado')) || 0;
                const salePrice = parseMoney(getVal('Precio Venta'));
                const warranty = getVal('Numero Garantia');
                const txnId = getVal('ID-Fecha', 'ID Transacción', 'Transaccion');
                const qaProgress = currentArea.includes('Despacho') || currentArea.includes('Publicidad') ? 100 : 0;

                // Robust Date Parsing
                const finalDate = parseRobustDate(fechaRaw);

                return {
                    _original: row,
                    status: 'pending',
                    data: {
                        ticketId: ticketId || `EXP-${Math.floor(Math.random() * 999999)}`,
                        createdAt: finalDate.toISOString(), // Safe ISO convert
                        createdBy: email || user.email,

                        marca: marca || 'Genérico',
                        modelo: modelo || 'Desconocido',
                        serialNumber: sn,
                        nombreCliente: cliente || 'Anónimo',

                        specs: {
                            cpu,
                            generation: cpuGen,
                            gpu,
                            gpuVram: gpuGb,
                            screenSize: screen,
                            resolution: resolution,
                            aesthetics,
                            batteryHealth: battery,
                        },

                        ram: { slots: 1, detalles: [finalRamVal], original: ramDefault || '' },
                        disco: { slots: 1, detalles: [finalDiskVal], original: diskDefault || '' },

                        currentArea,
                        description: problem,
                        motivo: moveReason,

                        precioVenta: salePrice,
                        warrantyNumber: warranty,
                        precioCompra: 0,

                        reparacion: {
                            costoRepuestos: costSpares,
                            tiempoEstimado: timeEst,
                            costoTotal: costSpares
                        },

                        importTxnId: txnId,
                        isImported: true,
                        importedAt: new Date().toISOString()
                    }
                };
            });

            setPreviewData(mapped);
            toast.success(`Leídos ${mapped.length} tickets correctamente.`);
        } catch (e) {
            console.error("Mapping error details:", e);
            toast.error(`Error al mapear: ${e.message}`);
        }
    };

    const executeImport = async () => {
        if (!previewData.length) return;
        if (!window.confirm(`¿Estás seguro de importar ${previewData.length} tickets? Esto agregará los tickets a la base de datos.`)) return;

        setImporting(true);
        setLogs([]);
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < previewData.length; i++) {
            const item = previewData[i];
            try {
                await ticketService.addTicket({
                    ...item.data,
                    isImported: true,
                    importedAt: new Date().toISOString()
                }, user.uid);

                setLogs(prev => [`[OK] ${item.data.ticketId}: Importado`, ...prev]);
                successCount++;
            } catch (error) {
                console.error(error);
                setLogs(prev => [`[ERROR] ${item.data.ticketId}: ${error.message}`, ...prev]);
                errorCount++;
            }
        }

        setImporting(false);
        setPreviewData([]);
        toast.success(`Importación finalizada: ${successCount} OK, ${errorCount} Errores`);
    };

    // --- EXPORT LOGIC ---
    const flattenTicket = (t) => {
        const formatDate = (dateVal) => {
            if (!dateVal) return '';
            const d = new Date(dateVal);
            return isNaN(d.getTime()) ? '' : d.toLocaleString();
        };

        const base = {
            'ID Producto': t.ticketId,
            'Fecha Ingreso': formatDate(t.createdAt),
            'Estado Actual': t.status === 'Deleted' ? 'ELIMINADO' : (t.currentArea || 'Desconocido'),
            'Cliente': t.nombreCliente,
            'Marca': t.marca,
            'Modelo': t.modelo,
            'Falla Reportada': t.description,
            'Técnico/Usuario': getUserLabel(t.createdBy),
            'Precio Venta': t.precioVenta || 0,
            'RAM': t.ram?.detalles?.[0] || '',
            'Disco': t.disco?.detalles?.[0] || '',
        };
        return base;
    };

    const handleExportInventory = async () => {
        setExporting(true);
        const toastId = toast.loading("Generando Inventario...");
        try {
            const tickets = await ticketService.getAllTickets();
            const exportData = tickets.map(flattenTicket);
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Inventario Actual");
            XLSX.writeFile(wb, `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Descarga iniciada", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Fallo la exportación", { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const handleExportTransactions = async () => {
        setExporting(true);
        const toastId = toast.loading("Generando Historial...");
        try {
            const tickets = await ticketService.getAllTickets();
            const rows = [];
            tickets.forEach(t => {
                const events = t.history || [];
                // Base creation
                rows.push({
                    'ID Transacción': t.importTxnId || `${t.ticketId}-INIT`,
                    'ID Producto': t.ticketId,
                    'Fecha': new Date(t.createdAt).toLocaleString(),
                    'Movimiento': 'INGRESO',
                    'Detalle': 'Creación Ticket'
                });
                // Events
                events.forEach((evt, i) => {
                    rows.push({
                        'ID Transacción': `${t.ticketId}-${i}`,
                        'ID Producto': t.ticketId,
                        'Fecha': evt.timestamp ? new Date(evt.timestamp).toLocaleString() : '',
                        'Movimiento': evt.action,
                        'Detalle': evt.note || ''
                    });
                });
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Historial Global");
            XLSX.writeFile(wb, `Transacciones_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success("Descarga iniciada", { id: toastId });
        } catch (e) {
            toast.error("Fallo exportacion");
        } finally {
            setExporting(false);
        }
    };

    const handleFullBackup = async () => {
        setExporting(true);
        const toastId = toast.loading("Generando Respaldo JSON...");
        try {
            const result = await backupService.exportDatabase();
            toast.success(`Respaldo JSON Listo (${result.count} items)`, { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Fallo el respaldo", { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-4">

            {/* EXPORT SECTION RESTORED */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"> <Download className="text-blue-400" /> Exportar Base de Datos</h3>
                        <p className="text-gray-400 text-sm">Descarga los datos actuales del sistema.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportInventory}
                            disabled={exporting}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {exporting ? <Loader className="animate-spin" /> : <FileSpreadsheet />}
                            Inventario
                        </button>
                        <button
                            onClick={handleExportTransactions}
                            disabled={exporting}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {exporting ? <Loader className="animate-spin" /> : <FileSpreadsheet />}
                            Historial
                        </button>
                        <button
                            onClick={handleFullBackup}
                            disabled={exporting}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                            title="Guardar copia idéntica de toda la base de datos"
                        >
                            {exporting ? <Loader className="animate-spin" /> : <Database />}
                            Respaldo Total (JSON)
                        </button>
                    </div>
                </div>
            </div>

            {/* IMPORT SECTION */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 shadow-lg">
                <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"> <Upload className="text-green-400" /> Importación Masiva</h3>
                        <p className="text-gray-400 text-sm">Compatible con Hoja "Guia de Integracion".</p>
                    </div>
                    <button
                        onClick={handleDownloadTemplate}
                        className="text-green-400 hover:text-green-300 text-sm font-bold border border-green-500/30 bg-green-900/10 px-4 py-2 rounded-lg hover:bg-green-900/20 transition-all flex items-center gap-2"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Plantilla Ejemplo
                    </button>
                </div>

                {!previewData.length ? (
                    <div className="border-2 border-dashed border-gray-600 rounded-xl p-10 text-center hover:border-gray-500 transition-colors bg-gray-900/30">
                        <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-300 font-medium mb-2">Selecciona tu Excel (XLSX)</p>
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="inline-block bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg cursor-pointer transition-colors">
                            Buscar Archivo
                        </label>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="text-gray-200 font-bold sticky top-0 bg-gray-900">
                                    <tr>
                                        <th className="p-2">ID</th>
                                        <th className="p-2">Fecha</th>
                                        <th className="p-2">Cliente</th>
                                        <th className="p-2">Marca/Modelo</th>
                                        <th className="p-2 text-right">Área Destino</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                                            <td className="p-2 text-xs font-mono">{row.data.ticketId}</td>
                                            <td className="p-2">{new Date(row.data.createdAt).toLocaleDateString()}</td>
                                            <td className="p-2">{row.data.nombreCliente}</td>
                                            <td className="p-2">{row.data.marca} {row.data.modelo}</td>
                                            <td className="p-2 text-right font-bold text-blue-400">{row.data.currentArea}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setPreviewData([])}
                                className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={executeImport}
                                disabled={importing}
                                className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                {importing ? <Loader className="animate-spin" /> : <CheckCircle />}
                                {importing ? `Importando...` : 'Confirmar Importación'}
                            </button>
                        </div>
                        {logs.length > 0 && (
                            <div className="mt-4 bg-black/50 rounded-lg p-3 font-mono text-xs max-h-32 overflow-y-auto">
                                {logs.map((log, i) => (
                                    <div key={i} className={log.includes('ERROR') ? 'text-red-400' : 'text-green-400'}>{log}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
