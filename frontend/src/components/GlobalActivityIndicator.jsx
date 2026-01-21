
import { useProcessing } from '../context/ProcessingContext';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function GlobalActivityIndicator() {
    const { tasks } = useProcessing();

    if (tasks.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            {tasks.map(task => (
                <div
                    key={task.id}
                    className={clsx(
                        "bg-gray-800 border shadow-2xl rounded-xl p-4 flex items-center gap-3 w-80 animate-in slide-in-from-right fade-in pointer-events-auto",
                        task.status === 'error' ? "border-red-500/50 text-red-400" :
                            task.status === 'success' ? "border-green-500/50 text-green-400" :
                                "border-blue-500/50 text-blue-400"
                    )}
                >
                    <div className="relative shrink-0">
                        {task.status === 'pending' && <Loader2 className="w-8 h-8 animate-spin" />}
                        {task.status === 'success' && <CheckCircle2 className="w-8 h-8" />}
                        {task.status === 'error' && <AlertCircle className="w-8 h-8" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{task.message}</p>
                        <div className="flex justify-between items-center mt-1">
                            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={clsx(
                                        "h-full transition-all duration-300",
                                        task.status === 'error' ? "bg-red-500" :
                                            task.status === 'success' ? "bg-green-500" :
                                                "bg-blue-500"
                                    )}
                                    style={{ width: `${task.progress || 0}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] ml-2 font-mono text-gray-400">{Math.round(task.progress || 0)}%</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
