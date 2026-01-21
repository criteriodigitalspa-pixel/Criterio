import { motion } from 'framer-motion';
import { Briefcase, CheckSquare, Clock, AlertCircle, Hash, PieChart } from 'lucide-react';
import clsx from 'clsx';

export default function AreaDashboard({ area, projects, projectStats }) {
    // 1. Calculate Aggregated Stats
    const totalProjects = projects.length;
    let totalTasks = 0;
    let completedTasks = 0;

    projects.forEach(p => {
        const stats = projectStats[p.id] || { total: 0, completed: 0 };
        totalTasks += stats.total;
        completedTasks += stats.completed;
    });

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const pendingTasks = totalTasks - completedTasks;

    return (
        <div className="h-full overflow-y-auto p-8 custom-scrollbar">
            {/* Header */}
            <header className="mb-10">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{area.name}</h1>
                        <p className="text-gray-400 flex items-center gap-2 text-sm">
                            <PieChart className="w-4 h-4" /> Dashboard de Área
                        </p>
                    </div>
                </div>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard
                    title="Proyectos Activos"
                    value={totalProjects}
                    icon={Hash}
                    color="text-purple-400"
                    bg="bg-purple-500/10"
                    border="border-purple-500/20"
                />
                <StatCard
                    title="Progreso General"
                    value={`${completionRate}%`}
                    subtitle={`${completedTasks}/${totalTasks} tareas completadas`}
                    icon={CheckSquare}
                    color="text-green-400"
                    bg="bg-green-500/10"
                    border="border-green-500/20"
                />
                <StatCard
                    title="Pendientes"
                    value={pendingTasks}
                    icon={Clock}
                    color="text-orange-400"
                    bg="bg-orange-500/10"
                    border="border-orange-500/20"
                />
            </div>

            {/* Project Deep Dive Grid */}
            <h2 className="text-xl font-bold text-gray-200 mb-6 flex items-center gap-2">
                <Hash className="w-5 h-5 text-gray-500" /> Detalle por Proyecto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => {
                    const stats = projectStats[project.id] || { total: 0, completed: 0 };
                    const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

                    return (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/60 transition-colors group cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-gray-200 group-hover:text-blue-400 transition-colors">
                                    {project.name}
                                </h3>
                                <div className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-500">
                                    <Hash className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-gray-400 font-medium">Progreso</span>
                                    <span className="text-gray-300 font-mono">{stats.completed}/{stats.total}</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full transition-all duration-1000",
                                            progress === 100 ? "bg-green-500" : "bg-blue-500"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="px-2 py-1 bg-gray-900 rounded text-xs text-gray-500 border border-gray-800">
                                    {stats.total - stats.completed} pendientes
                                </div>
                                {progress === 100 && (
                                    <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs border border-green-500/20">
                                        Completado
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}


                {projects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-gray-900/30 rounded-xl border border-dashed border-gray-800">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No hay proyectos en esta área</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, color, bg, border }) {
    return (
        <div className={clsx("p-6 rounded-2xl border backdrop-blur-sm", bg, border)}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wide">{title}</h3>
                    <div className="mt-1 text-3xl font-bold text-white">{value}</div>
                    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
                </div>
                <div className={clsx("p-3 rounded-xl bg-white/5 border border-white/10", color)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
