import React, { useMemo } from 'react';
import { useFinancialsContext } from '../context/FinancialContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Treemap, Legend
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck,
    Clock, Activity, Package, MapPin, Zap, Target, CreditCard, Award
} from 'lucide-react';
import clsx from 'clsx';

// Helper for formatting CLP
const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

export default function SalesCommandCenter({ tickets = [] }) {
    const { calculateFinancials } = useFinancialsContext();

    // --- 1. DATA AGGREGATION & METRICS CALCULATION ---
    const stats = useMemo(() => {
        // Init totals
        let totalCashProfit = 0;
        let totalSalesVol = 0;
        let totalBaseRecouped = 0;
        let countSold = 0;

        // Taxes (Simulated)
        let totalIvaDebito = 0;
        let totalIvaCreditoUsed = 0;
        let totalIvaCreditoLost = 0; // The "Golpe"

        // Operational
        let totalCycleTime = 0; // Entry -> Sale
        let soldTickets = [];

        // Stock
        const stockTickets = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Vendido');
        const staleStockInfo = stockTickets.reduce((acc, t) => {
            const days = (new Date() - new Date(t.createdAt?.seconds * 1000 || t.createdAt)) / (1000 * 60 * 60 * 24);
            if (days > 60) {
                acc.count++;
                acc.value += (Number(t.precioCompra) || 0);
            }
            return acc;
        }, { count: 0, value: 0 });

        // Iterate ALL tickets but process only SOLD for financial
        const processedTickets = tickets.map(t => {
            const fin = calculateFinancials(t);
            const isSold = fin.isSold;

            if (isSold) {
                countSold++;
                totalCashProfit += fin.gananciaInmediata;
                totalSalesVol += fin.salePrice;
                totalBaseRecouped += fin.baseCost;

                // Tax Logic
                if (fin.isVentaFormal) {
                    totalIvaDebito += fin.ivaDebito;
                    // Credit Used: Bought Formal + Sold Formal
                    if (fin.isCompraFactura) totalIvaCreditoUsed += fin.ivaCredito;
                } else {
                    // Credit Lost: Bought Formal + Sold Informal
                    if (fin.isCompraFactura) totalIvaCreditoLost += fin.ivaCredito;
                }

                // Dates
                const saleDate = t.soldAt ? new Date(t.soldAt) : (t.fechaSalida ? new Date(t.fechaSalida) : new Date());
                const entryDate = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(t.createdAt);

                fin.daysToSell = Math.max(0, (saleDate - entryDate) / (1000 * 60 * 60 * 24));
                totalCycleTime += fin.daysToSell;

                fin.saleDateObj = saleDate;
                soldTickets.push(fin);
            }
            return fin;
        });

        // TIME SERIES DATA
        // Group by Month (Last 12)
        const monthlyData = {};
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
            monthlyData[key] = { name: key, profit: 0, sales: 0, taxPaid: 0, count: 0, sortDate: d };
        }

        soldTickets.forEach(fin => {
            const d = fin.saleDateObj;
            if (!d) return;
            const key = d.toLocaleString('es-CL', { month: 'short', year: '2-digit' });
            if (monthlyData[key]) {
                monthlyData[key].profit += fin.gananciaInmediata;
                monthlyData[key].sales += fin.salePrice;
                monthlyData[key].count += 1;
                // Estimate tax paid cashflow: (Debito - Credito Used)
                // This is rough approximation for the chart
                const monthlyTax = (fin.isVentaFormal ? (fin.ivaDebito - (fin.isCompraFactura ? fin.ivaCredito : 0)) : 0);
                monthlyData[key].taxPaid += Math.max(0, monthlyTax);
            }
        });

        const monthlyChartData = Object.values(monthlyData).sort((a, b) => a.sortDate - b.sortDate);

        // VELOCITY CHART (Moving Avg Days to Sell by Month)
        const velocityChartData = monthlyChartData.map(m => ({
            name: m.name,
            days: m.count > 0 ? (soldTickets.filter(t => t.saleDateObj && t.saleDateObj.getMonth() === m.sortDate.getMonth()).reduce((sum, t) => sum + t.daysToSell, 0) / m.count) : 0
        }));

        // DISTRIBUTION (Histogram)
        const buckets = { '0-50k': 0, '50k-100k': 0, '100k-200k': 0, '200k+': 0 };
        soldTickets.forEach(t => {
            const p = t.gananciaInmediata;
            if (p < 50000) buckets['0-50k']++;
            else if (p < 100000) buckets['50k-100k']++;
            else if (p < 200000) buckets['100k-200k']++;
            else buckets['200k+']++;
        });
        const distData = Object.keys(buckets).map(k => ({ name: k, count: buckets[k] }));

        return {
            totalCashProfit,
            totalSalesVol,
            totalBaseRecouped,
            countSold,
            avgCycleTime: countSold ? (totalCycleTime / countSold).toFixed(1) : 0,

            // Tax
            totalIvaDebito,
            totalIvaCreditoUsed,
            totalIvaCreditoLost, // THE GOLPE
            estimatedRenta: totalCashProfit * 0.25, // Rough SII estimation base

            // Arrays
            soldTickets,
            monthlyChartData,
            velocityChartData,
            distData,
            staleStockInfo,

            // Ratios
            cashMargin: totalSalesVol ? (totalCashProfit / totalSalesVol) * 100 : 0,

        };

    }, [tickets, calculateFinancials]);

    // SECTION COLORS
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="space-y-6 pt-2 pb-12 animate-in fade-in duration-500">

            {/* === SECTION 1: LIQUIDITY (SURVIVAL) === */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    1. Liquidez & Supervivencia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KPI 1: GANANCIA INMEDIATA */}
                    <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-2xl backdrop-blur-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <div className="text-emerald-400 text-xs font-bold uppercase mb-1 flex justify-between">
                            Ganancia Inmediata Total
                            <Target className="w-4 h-4 opacity-50" />
                        </div>
                        <div className="text-3xl font-black text-white tracking-tight">
                            {formatMoney(stats.totalCashProfit)}
                        </div>
                        <div className="text-xs text-emerald-300/60 mt-2 font-medium">
                            Dinero real "al bolsillo" (Post-Costos)
                        </div>
                    </div>

                    {/* KPI 2: MONTHLY TREND MINI-CHART */}
                    <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-2xl md:col-span-2 relative overflow-hidden">
                        <div className="absolute top-4 left-4 z-10">
                            <div className="text-gray-400 text-xs font-bold uppercase">Tendencia Utilidad (12 Meses)</div>
                        </div>
                        <div className="h-24 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.monthlyChartData}>
                                    <defs>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* KPI 3: CASH MARGIN */}
                    <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-2xl">
                        <div className="text-blue-400 text-xs font-bold uppercase mb-1">Margen Real</div>
                        <div className="text-3xl font-black text-white">
                            {stats.cashMargin.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            Por cada $100k venta, ganas {formatMoney(100000 * (stats.cashMargin / 100))}
                        </div>
                    </div>
                </div>
            </div>

            {/* === SECTION 2: THE TAX TRAP (TRANSITION) === */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                    <ShieldCheck className="w-4 h-4 text-orange-400" />
                    2. La Trampa Tributaria
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* KPI 6: IVA DEBITO GENERADO */}
                    <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                        <div className="p-3 bg-blue-900/20 rounded-lg text-blue-400">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 font-bold uppercase">IVA Generado (Débito)</div>
                            <div className="text-xl font-bold text-white">{formatMoney(stats.totalIvaDebito)}</div>
                        </div>
                    </div>

                    {/* KPI 7: CREDITO UTILIZADO */}
                    <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl flex items-center gap-4">
                        <div className="p-3 bg-green-900/20 rounded-lg text-green-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 font-bold uppercase">Crédito Fiscal Usado</div>
                            <div className="text-xl font-bold text-white">{formatMoney(stats.totalIvaCreditoUsed)}</div>
                        </div>
                    </div>

                    {/* KPI 8: THE GOLPE (LOST CREDIT) */}
                    <div className="bg-red-900/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-4 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-1 bg-red-500 text-[10px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">PERDIDA</div>
                        <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs text-red-300 font-bold uppercase">"Golpe" Tributario (Crédito Perdido)</div>
                            <div className="text-xl font-bold text-red-400">{formatMoney(stats.totalIvaCreditoLost)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === SECTION 3: OPERATIONAL EFFICIENCY === */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* CHART 14: COST COMPOSITION */}
                <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4" /> Composición del Costo
                    </h4>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Equipos (Base)', value: stats.totalBaseRecouped },
                                        { name: 'IVA/Impuestos', value: stats.totalIvaDebito }, // Rough proxy
                                        { name: 'Profit', value: stats.totalCashProfit }
                                    ]}
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {/* Base, Tax, Profit */}
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#ef4444" />
                                    <Cell fill="#10b981" />
                                </Pie>
                                <Tooltip formatter={(val) => formatMoney(val)} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CHART 11: MARGIN BY BRAND (Using Treemap style as Bar substitute due to space) */}
                {/* Actually, let's use a simple Vertical Bar for Top Sell Models */}
                <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-2xl lg:col-span-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Distribución de Ganancias (Tickets)
                    </h4>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.distData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                                <YAxis stroke="#9ca3af" fontSize={10} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} name="Cantidad Tickets" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* === SECTION 4: INVENTORY VELOCITY === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {/* CHART 16: DAYS TO SELL */}
                <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-2xl">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" /> Velocidad de Venta (Días)
                    </h4>
                    <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.velocityChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                                <YAxis stroke="#9ca3af" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                <Line type="monotone" dataKey="days" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Días Promedio" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* KPI: STALE STOCK */}
                <div className="bg-gray-800/50 border border-gray-700 p-5 rounded-2xl flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-red-500/10 rounded-full">
                            <Clock className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase">Stock Crítico (>60 Días)</div>
                            <div className="text-4xl font-black text-white">{stats.staleStockInfo.count}</div>
                        </div>
                    </div>
                    <div className="bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-red-300">Capital Estancado:</span>
                            <span className="font-mono font-bold text-red-400">{formatMoney(stats.staleStockInfo.value)}</span>
                        </div>
                    </div>
                    <div className="mt-3 text-[10px] text-gray-500 text-center">
                        * Dinero que no está rotando. Prioridad de venta.
                    </div>
                </div>
            </div>

            {/* === SECTION 5: STRATEGIC OVERVIEW (Bottom Metrics) === */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-800">
                <div className="text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Volumen Total Ventas</div>
                    <div className="text-lg font-bold text-white font-mono">{formatMoney(stats.totalSalesVol)}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Capital Recuperado</div>
                    <div className="text-lg font-bold text-indigo-400 font-mono">{formatMoney(stats.totalBaseRecouped)}</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Ticket Promedio</div>
                    <div className="text-lg font-bold text-blue-400 font-mono">
                        {formatMoney(stats.countSold ? stats.totalSalesVol / stats.countSold : 0)}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Tickets Vendidos</div>
                    <div className="text-lg font-bold text-white font-mono">{stats.countSold}</div>
                </div>
            </div>

        </div>
    );
}
