import { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService'; // Need to fetch users for assignees
import { useAuth } from '../context/AuthContext';
import {
    Plus, CheckCircle2, Circle, Clock, MoreVertical,
    Trash2, User, Calendar, MessageSquare, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function TaskBoard() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Task Form
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskAssignees, setNewTaskAssignees] = useState([]);
    const [newTaskDueDate, setNewTaskDueDate] = useState('');

    useEffect(() => {
        // Subscribe to tasks
        const unsubscribe = taskService.subscribeToTasks((data) => {
            setTasks(data);
            setLoading(false);
        });

        // Load users for assignment
        const loadUsers = async () => {
            try {
                const allUsers = await userService.getAllUsers();
                setUsers(allUsers);
            } catch (e) {
                console.error(e);
            }
        };
        loadUsers();

        return () => unsubscribe();
    }, []);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            await taskService.addTask({
                title: newTaskTitle,
                description: newTaskDesc,
                assignees: newTaskAssignees,
                dueDate: newTaskDueDate,
                status: 'todo',
                priority: 'normal'
            }, user.uid);

            toast.success("Tarea creada");
            setIsModalOpen(false);
            setNewTaskTitle('');
            setNewTaskDesc('');
            setNewTaskAssignees([]);
            setNewTaskDueDate('');
        } catch (error) {
            toast.error("Error al crear tarea");
        }
    };

    const toggleTaskStatus = async (task) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        try {
            await taskService.updateTask(task.id, { status: newStatus });
            if (newStatus === 'done') toast.success("Tarea completada");
        } catch (error) {
            toast.error("Error al actualizar");
        }
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm("¿Eliminar tarea?")) return;
        try {
            await taskService.deleteTask(taskId);
            toast.success("Tarea eliminada");
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const toggleAssignee = (uid) => {
        setNewTaskAssignees(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    return (
        <div className="flex-1 bg-[#0f172a] text-gray-100 p-6 overflow-hidden flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-400" /> Tareas de Equipo
                    </h2>
                    <p className="text-gray-400 text-sm">Gestiona pendientes y asignaciones.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/20"
                >
                    <Plus className="w-4 h-4" /> Nueva Tarea
                </button>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-20 max-w-5xl mx-auto w-full">
                {loading ? <div className="text-center text-gray-500">Cargando tareas...</div> : (
                    tasks.length === 0 ?
                        <div className="text-center py-20 bg-gray-800/30 rounded-3xl border border-dashed border-gray-700 mx-auto w-full max-w-2xl">
                            <CheckCircle2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-400">Todo al día</h3>
                            <p className="text-gray-500">No hay tareas pendientes en el equipo.</p>
                        </div>
                        : tasks.map(task => (
                            <div key={task.id} className={clsx("group p-4 bg-gray-800/40 border border-gray-700/50 rounded-xl hover:bg-gray-800 transition-all flex gap-4 items-start", task.status === 'done' && "opacity-60")}>
                                <button
                                    onClick={() => toggleTaskStatus(task)}
                                    className={clsx("mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", task.status === 'done' ? "bg-emerald-500 border-emerald-500" : "border-gray-500 hover:border-emerald-400")}
                                >
                                    {task.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className={clsx("font-bold text-base truncate", task.status === 'done' ? "text-gray-500 line-through" : "text-gray-200")}>{task.title}</h3>
                                        {user.uid === task.createdBy && (
                                            <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {task.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>}

                                    <div className="flex items-center gap-4 mt-3">
                                        {/* Assignees */}
                                        {task.assignees?.length > 0 && (
                                            <div className="flex -space-x-2">
                                                {task.assignees.map(uid => {
                                                    const u = users.find(user => user.uid === uid);
                                                    return (
                                                        <div key={uid} className="w-6 h-6 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center text-[10px] text-white font-bold" title={u?.email}>
                                                            {u?.displayName?.[0] || u?.email?.[0] || '?'}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Due Date */}
                                        {task.dueDate && (
                                            <div className={clsx("flex items-center gap-1 text-xs font-mono", new Date(task.dueDate) < new Date() && task.status !== 'done' ? "text-red-400" : "text-gray-500")}>
                                                <Calendar className="w-3 h-3" />
                                                {new Date(task.dueDate).toLocaleDateString()}
                                            </div>
                                        )}

                                        {/* Creator */}
                                        <div className="text-[10px] text-gray-600 flex items-center gap-1 ml-auto">
                                            <User className="w-3 h-3" />
                                            {users.find(u => u.uid === task.createdBy)?.email?.split('@')[0] || 'Unknown'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* Create Task Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                            <h3 className="font-bold text-white">Nueva Tarea</h3>
                            <button onClick={() => setIsModalOpen(false)}><XCircle className="w-5 h-5 text-gray-500 hover:text-white" /></button>
                        </div>
                        <form onSubmit={handleCreateTask} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Título</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                    placeholder="¿Qué hay que hacer?"
                                    value={newTaskTitle}
                                    onChange={e => setNewTaskTitle(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Descripción (Opcional)</label>
                                <textarea
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none h-20 resize-none"
                                    placeholder="Detalles adicionales..."
                                    value={newTaskDesc}
                                    onChange={e => setNewTaskDesc(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Fecha Límite</label>
                                    <input
                                        type="date"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-sm outline-none"
                                        value={newTaskDueDate}
                                        onChange={e => setNewTaskDueDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Asignar a</label>
                                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                                        {users.map(u => (
                                            <label key={u.uid} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white">
                                                <input
                                                    type="checkbox"
                                                    checked={newTaskAssignees.includes(u.uid)}
                                                    onChange={() => toggleAssignee(u.uid)}
                                                    className="rounded bg-gray-800 border-gray-600 text-blue-500"
                                                />
                                                {u.email}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">
                                Crear Tarea
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
