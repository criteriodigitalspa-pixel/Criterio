import { useState } from 'react';
import { XCircle, Printer, FileText, Check, LayoutTemplate, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { printService } from '../services/printService';
import clsx from 'clsx';

// Future templates can be added here
const TEMPLATES = [
    { id: 'initial', label: '🏷️ Etiqueta Inicial (50x30)', description: 'Código de barras e ID básico', icon: LayoutTemplate },
    { id: 'full', label: '📄 Ficha Completa', description: 'Detalles técnicos y estado', icon: FileText },
    // Placeholders for future expansion as requested
    // { id: 't3', label: 'Plantilla 3', description: '...', icon: LayoutTemplate },
];

export default function BulkPrintModal({ tickets, onClose, onComplete }) {
    const [selectedTemplate, setSelectedTemplate] = useState('initial');
    const [printing, setPrinting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handlePrint = async () => {
        if (!selectedTemplate) return;
        setPrinting(true);
        const toastId = toast.loading(`Generando PDF para ${tickets.length} etiquetas...`);

        try {
            // Use the new Consolidated Batch Method
            await printService.printBatchLabels(tickets, selectedTemplate);

            toast.success(`Lote de ${tickets.length} enviado a la cola`, { id: toastId });
            if (onComplete) onComplete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error en impresión masiva", { id: toastId });
        } finally {
            setPrinting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl relative animate-in fade-in zoom-in-95">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                        <XCircle className="w-6 h-6" />
                    </button>

                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Printer className="text-purple-400" /> Impresión Masiva
                    </h3>
                    <p className="text-gray-400 text-sm mb-6">
                        Seleccionados: <span className="text-white font-bold">{tickets.length} equipos</span>
                    </p>

                    <div className="space-y-4 mb-8 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Selecciona Plantilla</label>

                        <div className="grid grid-cols-1 gap-3">
                            {TEMPLATES.map(tpl => (
                                <div
                                    key={tpl.id}
                                    onClick={() => setSelectedTemplate(tpl.id)}
                                    className={clsx(
                                        "p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 group",
                                        selectedTemplate === tpl.id
                                            ? "bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500/50"
                                            : "bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                                    )}
                                >
                                    <div className={clsx("p-2 rounded-lg", selectedTemplate === tpl.id ? "bg-purple-500 text-white" : "bg-gray-700 text-gray-400 group-hover:bg-gray-600")}>
                                        <tpl.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={clsx("font-bold text-sm", selectedTemplate === tpl.id ? "text-purple-300" : "text-gray-200")}>{tpl.label}</h4>
                                        <p className="text-xs text-gray-500">{tpl.description}</p>
                                    </div>
                                    {selectedTemplate === tpl.id && <Check className="w-5 h-5 text-purple-400" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between gap-3 pt-4 border-t border-gray-700">
                        <button
                            onClick={async () => {
                                setDownloading(true);
                                try {
                                    await printService.downloadBatchZip(tickets, selectedTemplate);
                                    toast.success("ZIP descargado");
                                } catch (e) {
                                    console.error(e);
                                    toast.error("Error al descargar ZIP");
                                } finally {
                                    setDownloading(false);
                                }
                            }}
                            disabled={downloading || printing}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {downloading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Comprimiendo...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">Descargar ZIP</span>
                                </>
                            )}
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                                disabled={printing || downloading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={printing || downloading || !selectedTemplate}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                            >
                                {printing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Printer className="w-4 h-4" />
                                        Imprimir
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>


        </>
    );
}
