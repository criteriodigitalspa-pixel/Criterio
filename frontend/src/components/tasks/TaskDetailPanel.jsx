import { useState, useEffect, useRef } from 'react';
import { X, Calendar, CheckSquare, AlignLeft, Trash2, Clock, Plus, UserCircle2, ShoppingCart, DollarSign, CalendarClock, Tag as TagIcon, Link } from 'lucide-react';
import { taskService } from '../../services/taskService';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import DependencySelector from './DependencySelector';

// Helper to get formatted date string YYYY-MM-DD
const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
};

export default function TaskDetailPanel({ task, project, onClose, onUpdate, allTasks = [], onDelete }) {
    const [title, setTitle] = useState(task.text);
    const [description, setDescription] = useState(task.description || '');
    const [dueDate, setDueDate] = useState(task.dueDate || '');
    const [startTime, setStartTime] = useState(task.startTime || '');
    const [endTime, setEndTime] = useState(task.endTime || '');
    const [subtasks, setSubtasks] = useState(task.subtasks || []);
    const [dependencies, setDependencies] = useState(task.dependencies || []);
    const [newSubtask, setNewSubtask] = useState('');
    const [assigneeId, setAssigneeId] = useState(task.assignedTo?.[0] || ''); // Assuming single assignee for now UI
    const [isAssigning, setIsAssigning] = useState(false);

    // Tags State
    const [tags, setTags] = useState(task.tags || []);
    const [newTag, setNewTag] = useState('');

    // Debounce save (simple version: save on blur or special actions)
    // Real-time would be better but keeping it simple for now.

    // Sync state with props - Granularly to prevent overwriting
    useEffect(() => { setTitle(task.text); }, [task.text]);
    useEffect(() => { setDescription(task.description || ''); }, [task.description]);
    useEffect(() => { setDueDate(task.dueDate || ''); }, [task.dueDate]);
    useEffect(() => { setStartTime(task.startTime || ''); }, [task.startTime]);
    useEffect(() => { setEndTime(task.endTime || ''); }, [task.endTime]);
    useEffect(() => { setAssigneeId(task.assignedTo?.[0] || ''); }, [task.assignedTo]);

    // Arrays: Only update if content changed (avoid ref change resets)
    useEffect(() => {
        setSubtasks(prev => JSON.stringify(prev) !== JSON.stringify(task.subtasks || []) ? (task.subtasks || []) : prev);
    }, [task.subtasks]);

    useEffect(() => {
        setDependencies(prev => JSON.stringify(prev) !== JSON.stringify(task.dependencies || []) ? (task.dependencies || []) : prev);
    }, [task.dependencies]);

    useEffect(() => {
        setTags(prev => JSON.stringify(prev) !== JSON.stringify(task.tags || []) ? (task.tags || []) : prev);
    }, [task.tags]);

    const handleSave = async (updates) => {
        try {
            await taskService.updateTask(task.id, updates);
            onUpdate(task.id, updates); // Optimistic / Notify parent
        } catch (error) {
            toast.error("Error guardando cambios");
        }
    };

    const handleAssign = (userId) => {
        const newAssignedTo = userId ? [userId] : [];
        setAssigneeId(userId);
        handleSave({ assignedTo: newAssignedTo });
        setIsAssigning(false);
    };

    const toggleSubtask = (index) => {
        const newSubs = [...subtasks];
        newSubs[index].completed = !newSubs[index].completed;
        setSubtasks(newSubs);
        handleSave({ subtasks: newSubs });
    };

    const addSubtask = (e) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;
        const newSubs = [...subtasks, { id: Date.now(), text: newSubtask, completed: false }];
        setSubtasks(newSubs);
        setNewSubtask('');
        handleSave({ subtasks: newSubs });
    };

    const removeSubtask = (index) => {
        const newSubs = subtasks.filter((_, i) => i !== index);
        setSubtasks(newSubs);
        handleSave({ subtasks: newSubs });
    };

    // TAGS HANDLERS
    const handleAddTag = (e) => {
        e.preventDefault();
        const trimmed = newTag.trim();
        if (!trimmed) return;
        if (tags.includes(trimmed)) {
            setNewTag('');
            return;
        }
        const newTags = [...tags, trimmed];
        setTags(newTags);
        setNewTag('');
        handleSave({ tags: newTags });
    };

    const removeTag = (tagToRemove) => {
        const newTags = tags.filter(t => t !== tagToRemove);
        setTags(newTags);
        handleSave({ tags: newTags });
    };

    // Derived state for assignee display
    // We assume we have access to a user list or can find the member in the project
    // Since we only get IDs in project.members, we probably need a map of ID -> Name/Email
    // If project.members is array of IDs, we can't show names unless we fetch users or if 'project' object has them populated.
    // The previous code in UserInviteModal fetched ALL users.
    // Ideally, TaskManager should pass a map of users or we fetch member details.
    // SHORTCUT: For now, I'll assume I can't easily get the name without fetching, 
    // BUT the 'project' object in TaskManager might just be the firestore doc data which is usually just IDs.
    // I will try to use the userService to catch cached users or just show the ID/Email if available.
    // Actually, let's assume we can fetch project members or reuse the UserInviteModal logic?
    // Let's implement a simple dropdown that shows IDs for now, or fetch users if I can.
    // Wait, TaskManager uses 'project.members' which are UIDs.
    // I'll fetch the user details for the dropdown on mount if 'project' is present.

    const [projectMembers, setProjectMembers] = useState([]);

    useEffect(() => {
        if (project?.members) {
            // Fetch names for these UIDs. 
            // This might be heavy if done every time. 
            // Optimization: TaskManager could pass 'allUsers' or 'projectUsers'.
            // For now, I will import userService here to fetch them.
            // I'll skip this optimization to ensure correctness first.
            // Actually, I'll just show "Usuario {uid.slice(0,5)}" if I can't fetch.
            // Re-reading UserInviteModal: it fetches getAllUsers().
            // I'll use a hack: Just show the list of members if we could. 
            // I'll try to implement a lazy fetch.
            import('../../services/userService').then(({ userService }) => {
                userService.getAllUsers().then(users => {
                    const members = users.filter(u => project.members.includes(u.id));
                    setProjectMembers(members);
                });
            });
        }
    }, [project]);

    const activeAssignee = projectMembers.find(m => m.id === assigneeId);

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col"
        >
            {/* HEADER */}
            <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (task.status !== 'done') {
                                // 1. Check Dependencies
                                if (task.dependencies && task.dependencies.length > 0) {
                                    const blockingTasks = allTasks.filter(t => task.dependencies.includes(t.id) && t.status !== 'done');
                                    if (blockingTasks.length > 0) {
                                        toast.error(`Bloqueada por: ${blockingTasks.map(t => t.text).join(', ')}`);
                                        return;
                                    }
                                }

                                // 2. Check Subtasks
                                const hasPendingSubtasks = subtasks.some(s => !s.completed);
                                if (hasPendingSubtasks) {
                                    toast.error("Completa las subtareas primero");
                                    return;
                                }
                            }
                            handleSave({ status: task.status === 'done' ? 'todo' : 'done' });
                        }}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                            task.status === 'done'
                                ? "bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30"
                                : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white"
                        )}
                    >
                        <CheckSquare className="w-3.5 h-3.5" />
                        {task.status === 'done' ? 'Completada' : 'Marcar como lista'}
                    </button>
                    {!['done', 'todo'].includes(task.status) && (
                        <span className="bg-gray-800 px-2 py-1 rounded text-[10px] text-gray-500 uppercase font-bold tracking-wider">{task.status}</span>
                    )}
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-all">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* TITLE */}
                <div>
                    <input
                        className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-600 outline-none border-b border-transparent focus:border-gray-700 transition-colors pb-2"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => title !== task.text && handleSave({ text: title })}
                    />
                </div>

                {/* META ROW */}
                <div className="flex items-center gap-6">
                    <div className="flex-1 relative">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Asignado</label>
                        <div
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-700"
                            onClick={() => setIsAssigning(!isAssigning)}
                        >
                            <UserCircle2 className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-300">
                                {activeAssignee ? (activeAssignee.displayName || activeAssignee.email) : "Sin asignar"}
                            </span>
                        </div>

                        {/* Assignment Dropdown */}
                        {isAssigning && (
                            <div className="absolute top-full left-0 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                <div
                                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-400 border-b border-gray-700"
                                    onClick={() => handleAssign(null)}
                                >
                                    Sin asignar
                                </div>
                                {projectMembers.map(member => (
                                    <div
                                        key={member.id}
                                        className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 flex items-center gap-2"
                                        onClick={() => handleAssign(member.id)}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold">
                                            {(member.displayName || member.email)[0].toUpperCase()}
                                        </div>
                                        {member.displayName || member.email}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha Límite</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="w-full bg-transparent text-sm text-gray-300 p-2 rounded-lg hover:bg-gray-800 border border-transparent hover:border-gray-700 outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                                value={dueDate}
                                onChange={(e) => { setDueDate(e.target.value); handleSave({ dueDate: e.target.value }); }}
                            />
                        </div>
                    </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hora Inicio</label>
                        <input
                            type="time"
                            className="w-full bg-transparent text-sm text-gray-300 p-2 rounded-lg hover:bg-gray-800 border border-transparent hover:border-gray-700 outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                            value={startTime}
                            onChange={(e) => { setStartTime(e.target.value); handleSave({ startTime: e.target.value }); }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Hora Fin</label>
                        <input
                            type="time"
                            className="w-full bg-transparent text-sm text-gray-300 p-2 rounded-lg hover:bg-gray-800 border border-transparent hover:border-gray-700 outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                            value={endTime}
                            onChange={(e) => { setEndTime(e.target.value); handleSave({ endTime: e.target.value }); }}
                        />
                    </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <AlignLeft className="w-4 h-4" />
                        <h3 className="font-bold text-sm">Descripción</h3>
                    </div>
                    <textarea
                        className="w-full min-h-[120px] bg-gray-800/50 rounded-lg p-4 text-sm text-gray-300 placeholder-gray-600 focus:bg-gray-800 focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all"
                        placeholder="Añade detalles, contexto..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => description !== task.description && handleSave({ description })}
                    />
                </div>

                {/* SUBTASKS */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-gray-400">
                            <CheckSquare className="w-4 h-4" />
                            <h3 className="font-bold text-sm">Subtareas</h3>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                            {subtasks.filter(s => s.completed).length}/{subtasks.length}
                        </span>
                    </div>

                    <div className="space-y-2 mb-3">
                        {subtasks.map((sub, idx) => (
                            <div key={sub.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50 transition-colors">
                                <button
                                    onClick={() => toggleSubtask(idx)}
                                    className={clsx(
                                        "flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all",
                                        sub.completed ? "bg-blue-500 border-blue-500 text-white" : "border-gray-600 hover:border-blue-400"
                                    )}
                                >
                                    {sub.completed && <CheckSquare className="w-3.5 h-3.5" />}
                                </button>
                                <span className={clsx("flex-1 text-sm transition-all", sub.completed ? "text-gray-500 line-through" : "text-gray-200")}>
                                    {sub.text}
                                </span>
                                <button
                                    onClick={() => removeSubtask(idx)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={addSubtask} className="relative">
                        <Plus className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                        <input
                            className="w-full bg-gray-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Añadir subtarea..."
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                        />
                    </form>
                </div>

                {/* SHOPPING LIST */}
                <ShoppingListSection
                    task={task}
                    onUpdate={(updates) => {
                        // Check for Date extension logic
                        if (updates.shoppingList && dueDate) {
                            // Find max ETA in the new list
                            // We need to check if the updates.shoppingList contains items with ETA > dueDate
                            // But wait, the update comes from the child.
                            // I need to intercept the update here.

                            // Re-calculate max date
                            const items = updates.shoppingList || [];
                            let maxDate = dueDate;
                            let changed = false;

                            items.forEach(item => {
                                if (item.eta && !isNaN(Date.parse(item.eta))) {
                                    if (item.eta > maxDate) {
                                        maxDate = item.eta;
                                        changed = true;
                                    }
                                }
                            });

                            if (changed) {
                                setDueDate(maxDate);
                                handleSave({ ...updates, dueDate: maxDate });
                                toast.success("Fecha límite extendida por entrega de material");
                                return;
                            }
                        }
                        handleSave(updates);
                    }}
                />

                {/* TAGS */}
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                        <TagIcon className="w-4 h-4" />
                        Etiquetas
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30 flex items-center gap-1">
                                {tag}
                                <button onClick={() => removeTag(tag)} className="hover:text-white">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <form onSubmit={handleAddTag} className="relative">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Añadir etiqueta..."
                            className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white w-full focus:border-blue-500 outline-none placeholder-gray-600"
                        />
                        <button type="submit" disabled={!newTag.trim()} className="absolute right-2 top-1.5 text-gray-400 hover:text-white disabled:opacity-50">
                            <Plus className="w-4 h-4" />
                        </button>
                    </form>
                </div>

                {/* DEPENDENCIES */}
                <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Link className="w-4 h-4" />
                        <h3 className="font-bold text-sm">Dependencias</h3>
                    </div>
                    {dependencies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {dependencies.map(depId => {
                                const dep = allTasks.find(t => t.id === depId);
                                return (
                                    <div key={depId} className="flex items-center gap-2 bg-gray-800 px-2 py-1.5 rounded-lg text-xs border border-gray-700 animate-in fade-in zoom-in duration-200">
                                        <div className={clsx("w-2 h-2 rounded-full", dep?.status === 'done' ? "bg-green-500" : "bg-orange-500")} />
                                        <span className={clsx("text-gray-300", dep?.status === 'done' && "line-through opacity-50")}>
                                            {dep?.text || 'Tarea desconocida'}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const newDeps = dependencies.filter(id => id !== depId);
                                                setDependencies(newDeps);
                                                handleSave({ dependencies: newDeps });
                                            }}
                                            className="ml-1 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    <DependencySelector
                        tasks={allTasks}
                        currentTaskId={task.id}
                        existingDependencies={dependencies}
                        onSelect={(id) => {
                            const newDeps = [...dependencies, id];
                            setDependencies(newDeps);
                            handleSave({ dependencies: newDeps });
                        }}
                    />
                </div>

            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900/95 flex justify-end">
                <button
                    onClick={() => { if (confirm('¿Eliminar tarea?')) onDelete(task.id); }}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> Eliminar Tarea
                </button>
            </div>
        </motion.div>
    );
}

function ShoppingListSection({ task, onUpdate }) {
    const [items, setItems] = useState(task.shoppingList || []);
    // ETA is now a date string YYYY-MM-DD
    const [newItem, setNewItem] = useState({ name: '', cost: '', eta: '' });

    useEffect(() => {
        setItems(prev => JSON.stringify(prev) !== JSON.stringify(task.shoppingList || []) ? (task.shoppingList || []) : prev);
    }, [task.shoppingList]);

    const saveItems = (newItems) => {
        setItems(newItems);
        onUpdate({ shoppingList: newItems });
    };

    const addItem = (e) => {
        e.preventDefault();
        if (!newItem.name.trim()) return;

        // item.eta is already YYYY-MM-DD from input type="date"
        const newItems = [...items, { ...newItem, id: Date.now(), completed: false }];
        saveItems(newItems);
        setNewItem({ name: '', cost: '', eta: '' });
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        saveItems(newItems);
    };

    const toggleItem = (index) => {
        const newItems = [...items];
        newItems[index].completed = !newItems[index].completed;
        saveItems(newItems);
    };

    const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-400">
                    <ShoppingCart className="w-4 h-4" />
                    <h3 className="font-bold text-sm">Lista de Compras</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded">
                        ${totalCost.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="space-y-2 mb-3">
                {items.map((item, idx) => (
                    <div key={item.id} className="flex flex-col gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-800">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => toggleItem(idx)}
                                className={clsx(
                                    "flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all",
                                    item.completed ? "bg-green-500 border-green-500 text-white" : "border-gray-600 hover:border-green-400"
                                )}
                            >
                                {item.completed && <CheckSquare className="w-3.5 h-3.5" />}
                            </button>
                            <span className={clsx("flex-1 text-sm font-medium", item.completed ? "text-gray-500 line-through" : "text-gray-200")}>
                                {item.name}
                            </span>
                            <button
                                onClick={() => removeItem(idx)}
                                className="text-gray-500 hover:text-red-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 ml-8 text-xs text-gray-400">
                            <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
                                <DollarSign className="w-3 h-3 text-green-500" />
                                <span>{item.cost || '0'}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded">
                                <CalendarClock className="w-3 h-3 text-orange-400" />
                                {/* Show formatted date if valid, else placeholder */}
                                <span>{item.eta ? new Date(item.eta).toLocaleDateString() : '-'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={addItem} className="bg-gray-800/50 p-3 rounded-xl space-y-2 border border-dashed border-gray-700">
                <input
                    className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none border-b border-gray-700 focus:border-blue-500 pb-1"
                    placeholder="Nombre del artículo..."
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <DollarSign className="absolute left-2 top-2 w-3 h-3 text-gray-500" />
                        <input
                            type="number"
                            className="w-full bg-gray-900 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Costo"
                            value={newItem.cost}
                            onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })}
                        />
                    </div>
                    <div className="flex-1 relative">
                        {/* CHANGED TO DATE INPUT */}
                        <div className="absolute left-2 top-2 pointer-events-none">
                            <CalendarClock className="w-3 h-3 text-gray-500" />
                        </div>
                        <input
                            type="date"
                            className="w-full bg-gray-900 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:invert"
                            placeholder="Entrega"
                            value={newItem.eta}
                            onChange={(e) => setNewItem({ ...newItem, eta: e.target.value })}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newItem.name}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1 text-xs font-bold disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}

