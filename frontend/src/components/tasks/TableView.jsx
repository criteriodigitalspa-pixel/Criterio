import React from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export default function TableView({ tasks, onTaskClick }) {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <span className="text-4xl mb-2">🧊</span>
                <p>No hay tareas en esta tabla.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900/80 text-gray-200 uppercase tracking-widest text-[10px] font-bold">
                        <tr>
                            <th className="px-4 py-3 border-b border-gray-800">Tarea</th>
                            <th className="px-4 py-3 border-b border-gray-800 w-1/3">Descripción</th>
                            <th className="px-4 py-3 border-b border-gray-800 w-32">ID Tarea</th>
                            <th className="px-4 py-3 border-b border-gray-800 w-32">ID Proyecto</th>
                            <th className="px-4 py-3 border-b border-gray-800 w-32">Status</th>
                            <th className="px-4 py-3 border-b border-gray-800 w-32">Fecha Fin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {tasks.map((task) => (
                            <tr
                                key={task.id}
                                onClick={() => onTaskClick && onTaskClick(task)}
                                className="group hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                <td className="px-4 py-3 font-medium text-white group-hover:text-blue-400 transition-colors">
                                    {task.text}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-xs" title={task.description}>
                                    {task.description || '-'}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600 select-all" title={task.id}>
                                    {task.id.slice(0, 8)}...
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-yellow-600/70 select-all">
                                    {task.projectId}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold border",
                                        task.status === 'done' ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                            task.status === 'doing' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                "bg-gray-700/30 text-gray-400 border-gray-700"
                                    )}>
                                        {task.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs">
                                    {task.dueDate ? format(new Date(task.dueDate), 'dd MMM yyyy') : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
