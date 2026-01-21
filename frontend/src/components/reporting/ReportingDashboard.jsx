import { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { Plus, Play, Edit, Trash2, FileText, Calendar, Clock, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import ReportEditorModal from './ReportEditorModal';
import * as XLSX from 'xlsx';

export default function ReportingDashboard() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingReport, setEditingReport] = useState(null);

    const loadReports = async () => {
        setLoading(true);
        try {
            const data = await reportService.getAllConfigs();
            setReports(data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar reportes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleCreate = () => {
        setEditingReport(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (report) => {
        setEditingReport(report);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este reporte?")) return;
        try {
            await reportService.deleteConfig(id);
            toast.success("Reporte eliminado");
            loadReports();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const handleRunNow = async (report) => {
        const toastId = toast.loading(`Generando reporte "${report.name}"...`);
        try {
            const data = await reportService.generateData(report);

            if (data.length === 0) {
                toast.success("Generado (Sin datos)", { id: toastId });
                return;
            }

            // Client-side Download for "Run Now"
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Datos");
            XLSX.writeFile(wb, `${report.name}_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast.success(`Reporte descargado (${data.length} filas)`, { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Error al generar: " + error.message, { id: toastId });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText className="text-purple-400" /> Reportería & BI
                    </h2>
                    <p className="text-gray-400 text-sm">Automatiza el envío de reportes y análisis de datos.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                >
                    <Plus className="w-5 h-5" /> Nuevo Reporte
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Cargando configuraciones...</div>
            ) : reports.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/30 rounded-3xl border border-gray-700/50">
                    <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-300">Sin Reportes Configurados</h3>
                    <p className="text-gray-500 mb-6">Crea tu primer reporte automático para recibir métricas periódicas.</p>
                    <button onClick={handleCreate} className="text-purple-400 hover:text-white font-bold underline">Crear Reporte</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map(report => (
                        <div key={report.id} className="bg-gray-800 rounded-2xl border border-gray-700 p-5 hover:border-purple-500/50 transition-colors group relative overflow-hidden">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-900/20 rounded-xl text-purple-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(report)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(report.id)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 truncate" title={report.name}>{report.name}</h3>

                            {/* Schedule Info */}
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{report.schedule?.frequency === 'weekly' ? 'Semanal: ' + (report.schedule.days || []) : 'Diario'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{report.schedule?.time || '08:00'} hrs</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-auto">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${report.schedule?.active ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>
                                    {report.schedule?.active ? 'ACTIVO' : 'PAUSADO'}
                                </span>
                                <button
                                    onClick={() => handleRunNow(report)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" /> Ejecutar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isEditorOpen && (
                <ReportEditorModal
                    report={editingReport}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={() => {
                        setIsEditorOpen(false);
                        loadReports();
                    }}
                />
            )}
        </div>
    );
}
