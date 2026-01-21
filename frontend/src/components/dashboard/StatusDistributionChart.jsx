import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function StatusDistributionChart({ data }) {
    // Expect data: { "AreaName": 10, "OtherArea": 5 }

    // Transform object to array for Recharts
    const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

    // Custom Colors matching the Kanban Board columns if possible
    const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'];

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-96 flex flex-col">
            <h3 className="text-white font-bold mb-4">Distribución por Estado</h3>
            <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                            itemStyle={{ color: '#F3F4F6' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
