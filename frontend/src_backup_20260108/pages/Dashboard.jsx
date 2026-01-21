import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import KPICard from '../components/dashboard/KPICard';
import StatusDistributionChart from '../components/dashboard/StatusDistributionChart';
import FinancialOverviewChart from '../components/dashboard/FinancialOverviewChart';
import { Ticket, DollarSign, Clock, AlertTriangle, BarChart3 } from 'lucide-react';

import WelcomeBanner from '../components/dashboard/WelcomeBanner';

export default function Dashboard() {
    const { metrics, loading } = useAnalytics();

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!metrics) {
        return <div className="text-white p-8">No hay datos disponibles.</div>;
    }

    const { totalTickets, byArea, financials, efficiency } = metrics;

    const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Header / Welcome */}
            <WelcomeBanner />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Tickets"
                    value={totalTickets}
                    icon={Ticket}
                    color="blue"
                />
                <KPICard
                    title="Ingresos Potenciales"
                    value={formatCurrency(financials.potentialRevenue)}
                    icon={DollarSign}
                    color="green"
                    trend="neutral"
                />
                <KPICard
                    title="Lead Time Promedio"
                    value={`${efficiency.avgLeadTimeDays} días`}
                    icon={Clock}
                    color="purple"
                />
                <KPICard
                    title="Tickets Atrasados (>7d)"
                    value={efficiency.ticketsOverdue}
                    icon={AlertTriangle}
                    color="red"
                    trend={efficiency.ticketsOverdue > 0 ? 'down' : 'neutral'}
                    trendValue="Requiere Atención"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatusDistributionChart data={byArea} />
                <FinancialOverviewChart financials={financials} />
            </div>

            {/* Quick Stats / Recommendations */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-white font-bold mb-4">Eficiencia Financiera</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <span className="text-gray-500 text-sm block">Inversión en Repuestos/MO</span>
                        <span className="text-xl font-bold text-red-400">{formatCurrency(financials.totalInvestment)}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm block">Margen Potencial Bruto</span>
                        <span className="text-xl font-bold text-green-400">
                            {formatCurrency(financials.potentialRevenue - financials.totalInvestment)}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm block">ROI Estimado</span>
                        <span className="text-xl font-bold text-blue-400">
                            {financials.totalInvestment > 0
                                ? `${(((financials.potentialRevenue - financials.totalInvestment) / financials.totalInvestment) * 100).toFixed(1)}%`
                                : 'N/A'
                            }
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
