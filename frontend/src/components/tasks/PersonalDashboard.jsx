import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { CheckCircle2, Clock, AlertCircle, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { format, subDays, isSameDay, parseISO, startOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PersonalDashboard({ tasks }) {

    // 1. Safe Date Helper
    const safeDate = (val) => {
        if (!val) return null;
        try {
            if (val.seconds) return new Date(val.seconds * 1000);
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        } catch (e) { return null; }
    };

    // 2. Calculate Summary Stats
    const stats = useMemo(() => {
        const now = startOfDay(new Date());
        let total = 0;
        let completed = 0;
        let pending = 0;
        let inProgress = 0;
        let overdue = 0;

        tasks.forEach(t => {
            total++;
            const isDone = t.status === 'done';

            if (isDone) {
                completed++;
            } else {
                if (t.status === 'in_progress') inProgress++;
                else pending++; // 'todo' or others

                // Overdue Check
                if (t.dueDate) {
                    const due = parseISO(t.dueDate); // assuming YYYY-MM-DD
                    // If due is before today (not including today)
                    if (isBefore(due, now)) {
                        overdue++;
                    }
                }
            }
        });

        return { total, completed, pending, inProgress, overdue };
    }, [tasks]);

    // 2. Prepare Chart Data (Last 14 Days)
    const chartData = useMemo(() => {
        const days = 14;
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(today, i);
            const dateLabel = format(date, 'dd MMM', { locale: es });

            // Filter tasks for this day
            const assignedCount = tasks.filter(t => {
                const created = safeDate(t.createdAt);
                if (!created) return false;
                return isSameDay(created, date);
            }).length;

            const completedCount = tasks.filter(t => {
                if (t.status !== 'done') return false;
                // Best effort: Use updatedAt if available, otherwise fallback to createdAt
                const time = safeDate(t.updatedAt || t.completedAt || t.createdAt);
                if (!time) return false;
                return isSameDay(time, date);
            }).length;

            data.push({
                name: dateLabel,
                Asignadas: assignedCount,
                Finalizadas: completedCount
            });
        }
        return data;
    }, [tasks]);

    const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 shadow-xl flex items-center justify-between group hover:bg-gray-800 transition-all">
            <div>
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-black text-white">{value}</h3>
                {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
            </div>
            <div className={clsx("p-4 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity", color)}>
                <Icon className="w-8 h-8 text-white" />
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Mi Dashboard</h1>
                <p className="text-gray-400">Resumen de actividad personal y rendimiento.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Asignadas"
                    value={stats.total}
                    icon={Calendar}
                    color="bg-blue-500 shadow-blue-500/20 shadow-lg"
                    subtext="Total histórico"
                />
                <StatCard
                    title="Pendientes"
                    value={stats.pending + stats.inProgress}
                    icon={Clock}
                    color="bg-amber-500 shadow-amber-500/20 shadow-lg"
                    subtext={`${stats.inProgress} en curso`}
                />
                <StatCard
                    title="Vencidas"
                    value={stats.overdue}
                    icon={AlertCircle}
                    color="bg-red-500 shadow-red-500/20 shadow-lg"
                    subtext="Requieren atención"
                />
                <StatCard
                    title="Finalizadas"
                    value={stats.completed}
                    icon={CheckCircle2}
                    color="bg-emerald-500 shadow-emerald-500/20 shadow-lg"
                    subtext={`${Math.round((stats.completed / (stats.total || 1)) * 100)}% de efectividad`}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Main Chart: Completed vs Assigned */}
                <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700/50 shadow-xl col-span-1 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                        Rendimiento Diario (Últimos 14 días)
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#9CA3AF"
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.75rem', color: '#F3F4F6' }}
                                    itemStyle={{ color: '#E5E7EB' }}
                                    cursor={{ fill: '#374151', opacity: 0.4 }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Asignadas" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="Finalizadas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
