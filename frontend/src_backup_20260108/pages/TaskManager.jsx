import { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Circle, Trash2, Plus, Calendar, CheckSquare, ListTodo } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function TaskManager() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTaskText, setNewTaskText] = useState('');
    const [filter, setFilter] = useState('all'); // all, active, completed

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const data = await taskService.getAllTasks();
            setTasks(data);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando tareas");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        try {
            const newTask = {
                text: newTaskText,
                priority: 'medium', // Default
                assignedTo: user.uid // Self-assign by default for now
            };
            await taskService.addTask(newTask, user.uid);
            setNewTaskText('');
            loadTasks();
            toast.success("Tarea agregada");
        } catch (error) {
            toast.error("Error al crear tarea");
        }
    };

    const toggleTask = async (task) => {
        try {
            const newStatus = !task.completed;
            // Optimistic update
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newStatus } : t));

            await taskService.updateTask(task.id, { completed: newStatus });
        } catch (error) {
            toast.error("Error al actualizar");
            loadTasks(); // Revert
        }
    };

    const handleDelete = async (taskId) => {
        if (!confirm("¿Borrar tarea?")) return;
        try {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            await taskService.deleteTask(taskId);
            toast.success("Tarea eliminada");
        } catch (error) {
            toast.error("Error al borrar");
            loadTasks();
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'active') return !t.completed;
        if (filter === 'completed') return t.completed;
        return true;
    });

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <ListTodo className="w-8 h-8 text-blue-500" />
                        Tareas del Equipo
                    </h1>
                    <p className="text-gray-400 mt-1">Gestión interna de actividades y pendientes.</p>
                </div>

                <div className="flex bg-gray-800 p-1 rounded-xl">
                    {['all', 'active', 'completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                                filter === f ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-gray-700"
                            )}
                        >
                            {f === 'all' ? 'Todas' : f === 'active' ? 'Pendientes' : 'Listas'}
                        </button>
                    ))}
                </div>
            </header>

            {/* Input Form */}
            <form onSubmit={handleAddTask} className="relative">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="¿Qué hay que hacer? (Ej: Limpiar vitrina, Pedir insumos...)"
                    className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 pl-6 pr-16 text-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-xl"
                />
                <button
                    type="submit"
                    disabled={!newTaskText.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:bg-gray-700 transition-all"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </form>

            {/* Task List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-10 text-gray-500 animate-pulse">Cargando...</div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800/50 rounded-3xl border border-dashed border-gray-700">
                        <CheckSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg font-medium">No hay tareas en esta vista.</p>
                    </div>
                ) : (
                    filteredTasks.map(task => (
                        <div
                            key={task.id}
                            className={clsx(
                                "group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
                                task.completed
                                    ? "bg-gray-900/50 border-gray-800 opacity-60"
                                    : "bg-gray-800 border-gray-700 hover:border-gray-600 shadow-md hover:shadow-xl hover:-translate-y-0.5"
                            )}
                        >
                            <button
                                onClick={() => toggleTask(task)}
                                className={clsx(
                                    "flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                                    task.completed
                                        ? "bg-green-500/20 border-green-500 text-green-500"
                                        : "border-gray-500 text-transparent hover:border-blue-500 hover:text-blue-500/50"
                                )}
                            >
                                <CheckCircle2 className={clsx("w-5 h-5", !task.completed && "scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-50")} />
                            </button>

                            <div className="flex-1 min-w-0">
                                <p className={clsx(
                                    "text-lg font-medium transition-all",
                                    task.completed ? "text-gray-500 line-through decoration-2 decoration-gray-700" : "text-white"
                                )}>
                                    {task.text}
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {task.createdAt?.seconds
                                            ? new Date(task.createdAt.seconds * 1000).toLocaleDateString()
                                            : 'Hoy'}
                                    </span>
                                    {task.assignedTo && (
                                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-md text-gray-300">
                                            Asignado
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(task.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
