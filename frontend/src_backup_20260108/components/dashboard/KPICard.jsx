import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ title, value, icon: Icon, trend, trendValue, color = "blue", prefix = "" }) {

    // Color variants
    const colorStyles = {
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        green: "bg-green-500/10 text-green-500 border-green-500/20",
        yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        red: "bg-red-500/10 text-red-500 border-red-500/20",
        purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };

    const currentStyle = colorStyles[color] || colorStyles.blue;

    return (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-lg border", currentStyle)}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={clsx("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                        trend === 'up' ? "bg-green-500/20 text-green-400" :
                            trend === 'down' ? "bg-red-500/20 text-red-400" : "bg-gray-700 text-gray-400")}>
                        {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                        {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                        {trend === 'neutral' && <Minus className="w-3 h-3" />}
                        {trendValue}
                    </div>
                )}
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
            <div className="text-2xl font-black text-white tracking-tight">
                {prefix}{value}
            </div>
        </div>
    );
}
