import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function FinancialOverviewChart({ financials }) {
    // Data: { totalInvestment, potentialRevenue, realizedRevenue, pendingRevenue }

    const data = [
        {
            name: 'Inversión (Costos)',
            value: financials.totalInvestment,
            color: '#EF4444' // Red
        },
        {
            name: 'Ventas Potenciales',
            value: financials.potentialRevenue,
            color: '#3B82F6' // Blue
        },
        {
            name: 'Ventas Realizadas',
            value: financials.realizedRevenue,
            color: '#10B981' // Green
        },
        {
            name: 'Ventas Pendientes',
            value: financials.pendingRevenue,
            color: '#F59E0B' // Amber
        }
    ];

    const formatCurrency = (value) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-96 flex flex-col">
            <h3 className="text-white font-bold mb-4">Resumen Financiero</h3>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                        <XAxis type="number" stroke="#9CA3AF" tickFormatter={(v) => `$${v / 1000}k`} />
                        <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={100} style={{ fontSize: '10px' }} />
                        <Tooltip
                            cursor={{ fill: '#374151', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            formatter={(value) => [formatCurrency(value), 'Monto']}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
