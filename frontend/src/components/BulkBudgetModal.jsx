import React, { useState, useMemo } from 'react';
import { XCircle, Calculator, Copy, Printer, DollarSign, FileText } from 'lucide-react';
import { useFinancialsContext } from '../context/FinancialContext';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function BulkBudgetModal({ tickets, onClose }) {
    const { calculateFinancials } = useFinancialsContext();

    // Initialize state with financial calculations
    // We allow editing 'price' locally for the budget view (doesn't save to DB unless we want it to)
    const [items, setItems] = useState(() => {
        return tickets.map(t => {
            const fin = calculateFinancials(t);

            // RAM Formatting Logic
            const ramDetails = t.ram?.detalles || [];
            let totalRam = 0;
            const formattedParts = ramDetails.map(r => {
                const clean = r.toString().toUpperCase().replace('GB', '').trim();
                const val = parseInt(clean) || 0;
                totalRam += val;
                return `${val}GB`;
            });
            const ramString = formattedParts.length > 0
                ? `${formattedParts.join(' + ')} (${totalRam}GB)`
                : 'N/A';

            return {
                id: t.id,
                ticketId: t.ticketId,
                model: `${t.marca} ${t.modelo}`,
                specs: `${t.additionalInfo?.cpuBrand || ''} ${t.additionalInfo?.gpuModel || ''}`.trim(),
                ram: ramString,
                disk: (t.disco?.detalles || []).join(' + '),
                price: fin.salePrice || 0, // Inferred Sale Price
                originalPrice: fin.salePrice || 0,
                selected: true
            };
        });
    });

    const [clientName, setClientName] = useState('');
    const [discount, setDiscount] = useState(0); // Global discount

    // derived totals
    const totals = useMemo(() => {
        const activeItems = items.filter(i => i.selected);
        const subtotal = activeItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
        const total = Math.max(0, subtotal - discount);
        const iva = Math.round(total * 0.19); // Est. IVA
        const net = total; // USually we quote Gross? Let's assume quote is Gross (Total a Pagar)
        // If system is Net + IVA, we should clarify.
        // Assuming 'price' is Final Price (Gross).
        const netValue = Math.round(total / 1.19);
        const taxValue = total - netValue;

        return { subtotal, total, netValue, taxValue };
    }, [items, discount]);

    const formatMoney = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);

    const handleCopy = () => {
        const lines = [
            `PRESUPUESTO #PRE-${new Date().getTime().toString().slice(-6)}`,
            `Cliente: ${clientName || 'General'}`,
            `Fecha: ${new Date().toLocaleDateString()}`,
            '',
            ...items.filter(i => i.selected).map(i =>
                `• [${i.ticketId}] ${i.model} (${i.specs} / ${i.ram} / ${i.disk}) - ${formatMoney(i.price)}`
            ),
            '',
            `Subtotal: ${formatMoney(totals.subtotal)}`,
            discount > 0 ? `Descuento: -${formatMoney(discount)}` : null,
            `TOTAL: ${formatMoney(totals.total)}`
        ].filter(Boolean);

        navigator.clipboard.writeText(lines.join('\n'));
        toast.success("Presupuesto copiado");
    };

    // --- PDF GENERATION ---
    const handlePrint = () => {
        const activeItems = items.filter(i => i.selected);
        const { subtotal, total, netValue, taxValue } = totals;
        const dateStr = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('es-CL');

        // Logo Path (Public URL)
        const logoUrl = window.location.origin + '/logo_criterio.png';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Por favor permite las ventanas emergentes");
            return;
        }

        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presupuesto Técnico - Criterio Digital</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            .no-print { display: none !important; }
            body { background-color: white !important; padding: 0 !important; }
            .container-main { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f1f5f9;
            color: #000000;
        }
    </style>
</head>
<body class="p-4 md:p-12">

    <div class="container-main max-w-4xl mx-auto bg-white shadow-xl border-2 border-slate-400 rounded-sm overflow-hidden">
        
        <!-- Encabezado -->
        <div class="p-8 md:p-12 border-b-4 border-slate-900 flex flex-col md:flex-row justify-between items-start gap-6">
            <div class="flex-1">
                <div class="mb-4">
                    <img src="${logoUrl}" alt="Criterio Digital" class="h-16 w-auto object-contain" />
                </div>
                <h1 class="text-2xl font-bold text-slate-500 tracking-tight uppercase mb-6">Presupuesto de Equipos</h1>
                <div class="text-lg text-slate-800 space-y-1">
                    <p><span class="font-bold">Cotizacion:</span> #PRE-${new Date().getTime().toString().slice(-6)}</p>
                    <p><span class="font-bold">Fecha:</span> ${dateStr}</p>
                </div>
            </div>
            
            <div class="text-left md:text-right bg-slate-50 p-6 border-2 border-slate-900 rounded-md shadow-sm w-full md:w-auto">
                <h2 class="text-xs font-black text-slate-500 uppercase mb-2 tracking-[0.2em]">PROVEEDOR</h2>
                <p class="text-2xl font-black text-slate-950 uppercase mb-1">Criterio Digital</p>
                <p class="text-lg font-bold text-blue-900">Plaza Pedro de Valdivia 1783, Local 166</p>
                <p class="text-base font-bold text-slate-950">Providencia, Santiago</p>
                <div class="mt-4 pt-4 border-t border-slate-300">
                    <p class="text-sm font-medium text-slate-800 italic">contacto@criteriodigital.cl</p>
                    <p class="text-sm font-bold text-slate-900">+56 9 9491 9000</p>
                </div>
            </div>
        </div>

        <!-- Informacion del Cliente -->
        <div class="px-8 md:px-12 py-10 bg-slate-900 text-white">
            <h2 class="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Preparado para</h2>
            <p class="text-3xl font-black uppercase">${clientName || 'Cliente General'}</p>
            <p class="text-lg text-slate-300 mt-2">Ref: Adquisicion de ${activeItems.length} equipo(s).</p>
        </div>

        <!-- Cuerpo del Presupuesto -->
        <div class="p-8 md:p-12">
            
            <table class="w-full text-left mb-12">
                <thead>
                    <tr class="text-sm uppercase font-black text-slate-950 border-b-4 border-slate-900">
                        <th class="pb-4">Detalle Tecnico</th>
                        <th class="pb-4 text-center">Cant.</th>
                        <th class="pb-4 text-right">Precio Unit. (Ref)</th>
                        <th class="pb-4 text-right">Total</th>
                    </tr>
                </thead>
                <tbody class="text-lg">
                    ${activeItems.map(item => `
                    <tr class="border-b-2 border-slate-100">
                        <td class="py-8">
                            <p class="font-black text-slate-950 text-xl">${item.model}</p>
                            <p class="text-sm text-slate-500 font-mono mb-2">${item.ticketId}</p>
                            <ul class="text-slate-800 text-sm mt-4 space-y-1">
                                <li>• <span class="font-bold">Specs:</span> ${item.specs}</li>
                                <li>• <span class="font-bold">Memoria:</span> ${item.ram}</li>
                                <li>• <span class="font-bold">Almacenamiento:</span> ${item.disk}</li>
                            </ul>
                        </td>
                        <td class="py-8 text-center font-black text-slate-950">1</td>
                        <td class="py-8 text-right font-bold text-slate-800">${formatMoney(item.price)}</td>
                        <td class="py-8 text-right font-black text-slate-950 text-2xl">${formatMoney(item.price)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- Totales -->
            <div class="flex justify-end">
                <div class="w-full md:w-1/2 space-y-4 bg-slate-50 p-8 border-4 border-slate-900 rounded-sm">
                    <div class="flex justify-between text-lg">
                        <span class="text-slate-600 font-bold">Subtotal</span>
                        <span class="text-slate-950 font-black">${formatMoney(subtotal)}</span>
                    </div>
                    ${discount > 0 ? `
                    <div class="flex justify-between text-lg text-red-600">
                        <span class="font-bold">Descuento Global</span>
                        <span class="font-black">-${formatMoney(discount)}</span>
                    </div>
                    ` : ''}
                    <div class="flex justify-between text-lg border-b-2 border-slate-300 pb-4">
                        <span class="text-slate-600 font-bold">IVA (19% Aprox)</span>
                        <span class="text-slate-950 font-black">${formatMoney(taxValue)}</span>
                    </div>
                    <div class="flex justify-between text-3xl font-black pt-2">
                        <span class="text-slate-950 uppercase tracking-tighter">Total Final</span>
                        <span class="text-blue-900">${formatMoney(total)}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Garantia y Compromiso -->
        <div class="p-8 md:p-12 bg-slate-100 border-t-4 border-slate-900">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                    <h4 class="text-sm font-black uppercase text-slate-950 mb-4 tracking-widest">Compromiso de Datos</h4>
                    <p class="text-sm text-slate-800 italic leading-relaxed">
                        Criterio Digital garantiza la confidencialidad absoluta de la informacion tratada. Realizamos un backup externo de seguridad antes de iniciar cualquier proceso para proteger los archivos criticos de su empresa.
                    </p>
                </div>
                <div>
                    <h4 class="text-sm font-black uppercase text-slate-950 mb-4 tracking-widest">Condiciones de Venta</h4>
                    <ul class="text-sm text-slate-800 space-y-2">
                        <li>• <span class="font-bold">Garantia Tecnica:</span> 1 año (Equipos Renovados).</li>
                        <li>• <span class="font-bold">Despacho:</span> Entrega en menos de 24 horas dentro de Santiago.</li>
                        <li>• <span class="font-bold">Forma de Pago:</span> Transferencia contra entrega.</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Area de Impresion -->
        <div class="p-10 text-center no-print bg-slate-50 border-t border-slate-200">
            <button id="btnPrint" onclick="window.print()" class="bg-slate-900 hover:bg-blue-900 text-white px-12 py-4 text-lg font-black rounded-sm shadow-lg transition duration-300 uppercase cursor-pointer mb-4">
                Imprimir / Guardar PDF
            </button>
            <p class="text-slate-500 text-sm font-medium">
                Tip: Selecciona "Guardar como PDF" en el destino de impresión.
            </p>
        </div>

    </div>
    <script>
        // Auto print on load? Optional.
        // window.print();
    </script>
</body>
</html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-out fade-out">
            <div className="bg-[#0f172a] rounded-2xl w-full max-w-5xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-start bg-gray-900/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <Calculator className="text-emerald-400 w-8 h-8" />
                            PRESUPUESTO MASIVO
                        </h2>
                        <p className="text-gray-400 mt-1">Generando cotización para {tickets.length} equipos seleccionados.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XCircle className="w-8 h-8" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Left: Item List */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700">
                        <div className="space-y-4">
                            {/* Client Info Input */}
                            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">Cliente / Referencia</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Nombre del Cliente o Empresa..."
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Table */}
                            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-900/80 text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                                            <th className="p-3 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={items.every(i => i.selected)}
                                                    onChange={(e) => setItems(prev => prev.map(i => ({ ...i, selected: e.target.checked })))}
                                                    className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-0"
                                                />
                                            </th>
                                            <th className="p-3">Equipo</th>
                                            <th className="p-3 hidden sm:table-cell">Specs</th>
                                            <th className="p-3 text-right">Precio Unit.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700/50">
                                        {items.map((item, idx) => (
                                            <tr key={item.id} className={clsx("hover:bg-gray-700/30 transition-colors", !item.selected && "opacity-50 grayscale")}>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.selected}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: checked } : it));
                                                        }}
                                                        className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-0"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-white text-sm">{item.model}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono">{item.ticketId}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 hidden sm:table-cell">
                                                    <div className="text-xs text-gray-400 space-y-0.5">
                                                        <div className="truncate max-w-[200px]">{item.specs}</div>
                                                        <div className="font-mono text-[10px] text-gray-500">{item.ram} / {item.disk}</div>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <input
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            setItems(prev => prev.map((it, i) => i === idx ? { ...it, price: val } : it));
                                                        }}
                                                        disabled={!item.selected}
                                                        className="w-24 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-right text-emerald-400 font-mono font-bold focus:border-emerald-500 outline-none text-sm"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary Panel */}
                    <div className="w-full md:w-80 bg-gray-900/80 border-l border-gray-700 p-6 flex flex-col justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-400" /> Resumen
                            </h3>

                            <div className="space-y-4">
                                <div className="flex justify-between text-gray-400 text-sm">
                                    <span>Subtotal ({items.filter(i => i.selected).length} items)</span>
                                    <span className="font-mono">{formatMoney(totals.subtotal)}</span>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-gray-400 text-sm">
                                        <span>Descuento Global</span>
                                        <span className="font-mono text-red-400">-{formatMoney(discount)}</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={discount}
                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-right text-white font-mono text-sm focus:border-blue-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="border-t border-gray-700 my-4"></div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-yellow-500 text-xs">
                                        <span>Neto</span>
                                        <span className="font-mono">{formatMoney(totals.netValue)}</span>
                                    </div>
                                    <div className="flex justify-between text-orange-500 text-xs">
                                        <span>IVA (19%)</span>
                                        <span className="font-mono">{formatMoney(totals.taxValue)}</span>
                                    </div>
                                </div>

                                <div className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-500/30 mt-4">
                                    <span className="block text-emerald-400 text-xs font-bold uppercase mb-1">Total a Pagar</span>
                                    <div className="text-3xl font-mono font-bold text-white tracking-tight">
                                        {formatMoney(totals.total)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/50"
                            >
                                <Copy className="w-5 h-5" /> Copiar Texto
                            </button>
                            <button
                                onClick={handlePrint}
                                className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 rounded-xl transition-all border border-gray-600 hover:border-gray-500"
                            >
                                <Printer className="w-5 h-5" /> Generar PDF
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
