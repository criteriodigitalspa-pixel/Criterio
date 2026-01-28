import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const TimelineHero = ({ data, onYearSelect }) => {

    const chartData = useMemo(() => {
        return data.map(d => ({
            year: d.year,
            Stress: d.metrics.stress,
            Professionalism: d.metrics.professionalism,
            Happiness: d.metrics.happiness,
        }));
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-[400px] bg-slate-900/50 rounded-2xl p-6 border border-slate-700 backdrop-blur-sm"
        >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Evolución Emocional (2018-2026)
            </h2>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    onClick={(e) => {
                        if (e && e.activePayload) {
                            onYearSelect(e.activePayload[0].payload.year);
                        }
                    }}
                >
                    <defs>
                        <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
                        itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="Stress"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#colorStress)"
                        strokeWidth={3}
                    />
                    <Area
                        type="monotone"
                        dataKey="Professionalism"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorPro)"
                        strokeWidth={3}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </motion.div>
    );
};

export default TimelineHero;
