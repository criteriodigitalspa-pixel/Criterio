import { useState, useEffect } from 'react';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import { DollarSign, TrendingUp, Archive, Clock, Wrench, BarChart2, Activity, Users } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function ReportsDashboard() {
    const [stats, setStats] = useState({
        totalTickets: 0,
        activeTickets: 0,
        totalInventoryValue: 0,
        totalServiceInvested: 0,
        avgTicketCost: 0,
        areaDistribution: {},
        topModels: [],
        brandDistribution: [],
        techPerformance: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [tickets, users] = await Promise.all([
                ticketService.getAllTickets(),
                userService.getAllUsers()
            ]);
            calculateStats(tickets, users);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando reporte");
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (tickets, users) => {
        let inventoryValue = 0;
        let serviceInvested = 0;
        let areaCount = {};
        let modelCount = {};
        let brandCount = {};
        let techStats = {}; // { uid: { count: 0, totalTime: 0 } }

        tickets.forEach(t => {
            // Inventory Value
            inventoryValue += (Number(t.precioCompra) || 0);

            // Service Investment (History + Active)
            const historyLogs = t.serviceLogs || [];
            const historyCost = historyLogs.reduce((acc, log) => acc + (log.analysis?.realCost || 0), 0);
            const activeCost = (Number(t.totalServiceCost) || 0);
            serviceInvested += (historyCost + activeCost);

            // Area Count
            const area = t.currentArea || 'Desconocido';
            areaCount[area] = (areaCount[area] || 0) + 1;

            // Brand & Model Count
            const brand = t.marca || 'Genérico';
            brandCount[brand] = (brandCount[brand] || 0) + 1;

            const modelKey = `${t.marca} ${t.modelo}`;
            modelCount[modelKey] = (modelCount[modelKey] || 0) + 1;

            // Tech Performance (from Service Logs)
            historyLogs.forEach(log => {
                if (log.tech) {
                    if (!techStats[log.tech]) techStats[log.tech] = { count: 0, totalTime: 0 };
                    techStats[log.tech].count += 1;
                    // Simple logic: if realTime is logged, add it.
                    if (log.analysis?.realTime) techStats[log.tech].totalTime += Number(log.analysis.realTime);
                }
            });
        });

        // Parse Top Models
        const sortedModels = Object.entries(modelCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count, percentage: (count / tickets.length) * 100 }));

        // Parse Top Brands
        const sortedBrands = Object.entries(brandCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count, percentage: (count / tickets.length) * 100 }));

        // Parse Tech Performance
        const parsedTechStats = Object.entries(techStats).map(([uid, data]) => {
            const user = users.find(u => u.id === uid);
            return {
                id: uid,
                name: user?.displayName || 'Desconocido',
                email: user?.email || '',
                initials: (user?.displayName || 'Unknown').slice(0, 2).toUpperCase(),
                count: data.count,
                avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0
            };
        }).sort((a, b) => b.count - a.count);

        setStats({
            totalTickets: tickets.length,
            activeTickets: tickets.filter(t => t.currentArea !== 'Caja Reciclaje' && t.currentArea !== 'Caja Despacho').length,
            totalInventoryValue: inventoryValue,
            totalServiceInvested: serviceInvested,
            avgTicketCost: tickets.length ? (inventoryValue + serviceInvested) / tickets.length : 0,
            areaDistribution: areaCount,
            topModels: sortedModels,
            brandDistribution: sortedBrands,
            techPerformance: parsedTechStats
        });
    };

    if (loading) return <div className="p-10 text-center text-gray-400 animate-pulse">Calculando Finanzas...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <TrendingUp className="text-green-500 w-8 h-8" />
                        Tablero Financiero
                    </h1>
                    <p className="text-gray-400">Análisis de rendimiento, costos e inventario.</p>
                </div>
                <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 text-xs text-gray-400 font-mono">
                    Última actualización: {new Date().toLocaleTimeString()}
                </div>
            </header>

            {/* KC1: Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Total Capital Invested */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-24 h-24 text-blue-500" />
                    </div>
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Capital en Inventario</h3>
                    <div className="text-3xl font-mono text-blue-400 font-black">
                        ${stats.totalInventoryValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Valor de compra de equipos.</p>
                </div>

                {/* Service Investment */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wrench className="w-24 h-24 text-orange-500" />
                    </div>
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Inversión en Servicio</h3>
                    <div className="text-3xl font-mono text-orange-400 font-black">
                        ${stats.totalServiceInvested.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Repuestos y Mano de Obra Real.</p>
                </div>

                {/* Total Cost Basis */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24 text-blue-500" />
                    </div>
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Costo Base Total</h3>
                    <div className="text-3xl font-mono text-blue-400 font-black">
                        ${(stats.totalInventoryValue + stats.totalServiceInvested).toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Inventario + Servicio.</p>
                </div>

                {/* Volume */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Archive className="w-24 h-24 text-green-500" />
                    </div>
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Volumen de Equipos</h3>
                    <div className="text-3xl font-mono text-white font-black flex items-baseline gap-2">
                        {stats.totalTickets}
                        <span className="text-sm font-normal text-gray-500">Tickets Totales</span>
                    </div>
                    <p className="text-xs text-green-400 mt-2">{stats.activeTickets} Activos en Taller</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Area Distribution Chart (CSS Bars) */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 col-span-2">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-gray-400" /> Distribución por Área
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.areaDistribution).map(([area, count]) => (
                            <div key={area} className="group">
                                <div className="flex justify-between text-xs text-gray-300 mb-1">
                                    <span className="font-bold">{area}</span>
                                    <span>{count} ({((count / stats.totalTickets) * 100).toFixed(1)}%)</span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 group-hover:bg-blue-400 transition-all duration-500"
                                        style={{ width: `${(count / stats.totalTickets) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Brand Distribution Chart */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Archive className="w-5 h-5 text-gray-400" /> Distribución por Marca
                    </h3>
                    <div className="space-y-4">
                        {stats.brandDistribution.map((item, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between text-xs text-gray-300 mb-1">
                                    <span className="font-bold">{item.name}</span>
                                    <span>{item.count} ({item.percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500 group-hover:bg-orange-400 transition-all duration-500"
                                        style={{ width: `${item.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Technician Leaderboard */}
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 col-span-1 md:col-span-2 lg:col-span-3">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" /> Rendimiento Técnico
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                                    <th className="py-3 px-4">Técnico</th>
                                    <th className="py-3 px-4 text-center">Intervenciones</th>
                                    <th className="py-3 px-4 text-center">Eficiencia (Min/Ticket)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.techPerformance.map((tech, idx) => (
                                    <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                                        <td className="py-4 px-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center font-bold text-xs ring-1 ring-blue-500/30">
                                                {tech.initials}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm">{tech.name}</div>
                                                <div className="text-xs text-gray-600">{tech.email}</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="bg-gray-700 text-white px-3 py-1 rounded-lg text-xs font-bold font-mono">
                                                {tech.count}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center text-gray-400 text-sm font-mono">
                                            {tech.avgTime > 0 ? `${tech.avgTime}m` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {stats.techPerformance.length === 0 && (
                                    <tr>
                                        <td colSpan="3" className="py-8 text-center text-gray-500 italic">
                                            No hay registros de servicio aún.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
