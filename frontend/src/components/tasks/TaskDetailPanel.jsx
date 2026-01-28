import { useState, useEffect, useRef } from 'react';
import { X, Calendar, CheckSquare, AlignLeft, Trash2, Clock, Plus, UserCircle2, ShoppingCart, DollarSign, CalendarClock, Tag as TagIcon, Link, RefreshCw, Send, Bell, Save, AlertCircle, Circle, ChevronDown } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

import toast from 'react-hot-toast';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import DependencySelector from './DependencySelector';
import RecurrenceSelector from './RecurrenceSelector';
import StatusSelector from './StatusSelector';

// SERVICES
import { taskService } from '../../services/taskService';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Helper to get formatted date string YYYY-MM-DD
const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
};

export default function TaskDetailPanel({ task, activeProjectId, onClose, onUpdate, allTasks = [], onDelete, projectMembers = [] }) {
    const isNew = task.id === 'new';
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Fields
    const [title, setTitle] = useState(task.text || '');
    const [description, setDescription] = useState(task.description || '');
    const [dueDate, setDueDate] = useState(task.dueDate ? (typeof task.dueDate === 'string' ? task.dueDate : formatDate(task.dueDate)) : '');
    const [startTime, setStartTime] = useState(task.startTime || '');
    const [endTime, setEndTime] = useState(task.endTime || '');
    const [subtasks, setSubtasks] = useState(task.subtasks || []);
    const [dependencies, setDependencies] = useState(task.dependencies || []);
    const [recurrence, setRecurrence] = useState(task.recurrence || { type: '', interval: 1, notifyOnRecurrence: false });
    const [newSubtask, setNewSubtask] = useState('');
    const [assigneeId, setAssigneeId] = useState(task.assignedTo?.[0] || '');
    const [isAssigning, setIsAssigning] = useState(false);
    const [tags, setTags] = useState(task.tags || []);
    const [newTag, setNewTag] = useState('');
    const [status, setStatus] = useState(task.status || 'todo');

    // Sync state only if task changes (and not dirty?)
    // Actually, if we switch tasks, we must reset everything.
    useEffect(() => {
        setTitle(task.text || '');
        setDescription(task.description || '');
        setDueDate(task.dueDate ? (typeof task.dueDate === 'string' ? task.dueDate : formatDate(task.dueDate)) : '');
        setStartTime(task.startTime || '');
        setEndTime(task.endTime || '');
        setSubtasks(task.subtasks || []);
        setDependencies(task.dependencies || []);
        setRecurrence(task.recurrence || { type: '', interval: 1, notifyOnRecurrence: false });
        setAssigneeId(task.assignedTo?.[0] || '');
        setTags(task.tags || []);
        setStatus(task.status || 'todo');
        setHasUnsavedChanges(false);
    }, [task.id]);

    // Change Handler helper
    const handleChange = (setter, value) => {
        setter(value);
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        // Sanitize Payload: Firestore crashes if any field is 'undefined'
        const safePayload = {
            text: title || 'Sin Título',
            description: description || '',
            dueDate: dueDate || null,
            startTime: startTime || '',
            endTime: endTime || '',
            subtasks: subtasks || [],
            dependencies: dependencies || [],
            recurrence: recurrence || { type: '', interval: 1, notifyOnRecurrence: false },
            assignedTo: assigneeId ? [assigneeId] : [],
            tags: tags || [],
            status: status || 'todo',
            // CRITICAL FIX: Fallback to null if undefined
            projectId: activeProjectId || task.projectId || null
        };

        console.log("Saving Task Payload:", safePayload);

        // --- NOTIFICATION LOGIC (Pre-Save) ---
        // Ensure we trigger this BEFORE closing the modal or updating state that might unmount us
        const targetAssignee = safePayload.assignedTo?.[0];
        const isAssigneeChanged = isNew || (task.assignedTo?.[0] !== targetAssignee);

        if (targetAssignee && isAssigneeChanged) {
            console.log("🔔 Triggering WhatsApp Notification for:", targetAssignee);
            try {
                const { notificationService } = await import('../../services/notificationService');
                const { userService } = await import('../../services/userService');
                const assignedUser = await userService.getUser(targetAssignee);

                if (assignedUser && assignedUser.phoneNumber) {
                    const taskLink = `https://app.criteriodigital.cl/tasks`;
                    const msgBody = `📋 *Nueva Tarea Asignada*\n\n` +
                        `*Tarea:* ${title}\n` +
                        `*Vencimiento:* ${dueDate || "Sin fecha"}\n\n` +
                        `📝 ${description ? description.slice(0, 100) + (description.length > 100 ? '...' : '') : "Sin descripción"}\n\n` +
                        `👇 *Acción Requerida*\n` +
                        `👉 *[ VER TAREA EN APP ]* ${taskLink}`;

                    await notificationService.queueWhatsAppNotification(assignedUser.phoneNumber, {
                        body: msgBody,
                        taskId: isNew ? 'new' : task.id
                    });
                    console.log("✅ Notification queued successfully");
                } else {
                    console.warn("⚠️ Assignee has no phone number");
                }
            } catch (notifyError) {
                console.error("❌ Failed to send notification:", notifyError);
                // Warning only, don't block save
            }
        }
        // ----------------------------------------------------

        if (isNew) {
            // Validate
            if (!title.trim()) {
                toast.error("El título es obligatorio");
                return;
            }
            try {
                // calls taskService.addTask
                const newTask = await taskService.addTask({ ...safePayload, status: status || 'todo' });
                onUpdate('new', newTask); // Pass the FULL new task object
                toast.success("Tarea creada");
                onClose();
            } catch (e) {
                console.error("Create Task Error:", e);
                toast.error("Error al crear tarea: " + e.message);
            }
        } else {
            // Update
            try {
                await taskService.updateTask(task.id, safePayload);
                onUpdate(task.id, safePayload);
                setHasUnsavedChanges(false);
                toast.success("Cambios guardados");
            } catch (error) {
                console.error("Update Task Error:", error);
                toast.error("Error guardando cambios: " + (error.message || 'Error Desconocido'));
            }
        }
    };

    // ... helper handlers ...

    const handleAssign = (userId) => {
        setAssigneeId(userId);
        setHasUnsavedChanges(true);
        setIsAssigning(false);
    };

    const addSubtask = () => {
        if (!newSubtask.trim()) return;
        setSubtasks(prev => [...prev, { id: Date.now(), text: newSubtask, completed: false }]);
        setNewSubtask('');
        setHasUnsavedChanges(true);
    };

    const toggleSubtask = (index) => {
        const newSubs = [...subtasks];
        newSubs[index].completed = !newSubs[index].completed;
        setSubtasks(newSubs);
        setHasUnsavedChanges(true);
    };

    const removeSubtask = (index) => {
        setSubtasks(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // Image Paste Handler
    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        let imageItem = null;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageItem = items[i];
                break;
            }
        }

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            const toastId = toast.loading("Subiendo imagen... 📤");

            try {
                // Upload to Firebase Storage
                const fileName = `paste_${Date.now()}.png`;
                const storageRef = ref(storage, `task_images/${task.id || 'new'}/${fileName}`);

                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);

                // Insert Markdown at Cursor
                const textarea = e.target;
                const cursorStart = textarea.selectionStart;
                const cursorEnd = textarea.selectionEnd;
                const textBefore = description.substring(0, cursorStart);
                const textAfter = description.substring(cursorEnd);

                const markdownImage = `\n![Imagen](${downloadURL})\n`;
                const newText = textBefore + markdownImage + textAfter;

                setDescription(newText);
                setHasUnsavedChanges(true);

                toast.success("Imagen pegada", { id: toastId });
            } catch (error) {
                console.error("Upload error:", error);
                toast.error("Error al subir imagen", { id: toastId });
            }
        }
    };

    // Click Outside Handling
    const panelRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                onClose();
            }
        };

        // Use mousedown to detect "intention" to click outside immediately
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[450px] bg-gray-900 border-l border-gray-700 h-full shadow-2xl overflow-hidden flex flex-col z-30 fixed right-0 top-0"
        >


            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Workflow Status Selector */}
                    <StatusSelector
                        value={status}
                        onChange={(newStatus) => handleChange(setStatus, newStatus)}
                    />

                    <span className="text-sm font-mono text-gray-500">{isNew ? 'NUEVA TAREA' : task.ticketId || 'TASK'}</span>
                </div>

                <div className="flex items-center gap-2">
                    {!isNew && (
                        <button
                            onClick={() => onDelete(task.id)}
                            className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800"
                            title="Eliminar Tarea"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                {/* Title */}
                <div>
                    <input
                        className="w-full bg-transparent text-xl font-bold text-white placeholder-gray-600 outline-none"
                        placeholder="Nombre de la tarea"
                        value={title}
                        onChange={(e) => handleChange(setTitle, e.target.value)}
                        autoFocus={isNew}
                    />
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap gap-4">
                    {/* Assignee */}
                    <div className="relative">
                        <button
                            onClick={() => setIsAssigning(!isAssigning)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors text-sm text-gray-300"
                        >
                            <UserCircle2 className="w-4 h-4" />
                            {assigneeId ? (
                                // Try to find name if we have members, else ID
                                projectMembers.find(m => m.id === assigneeId)?.displayName || 'Asignado'
                            ) : 'Asignar'}
                        </button>
                        {isAssigning && (
                            <div className="absolute top-full left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                                {projectMembers.length > 0 ? projectMembers.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleAssign(u.id)}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-200 flex items-center gap-2"
                                    >
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                                            {u.displayName ? u.displayName[0] : (u.email ? u.email[0] : '?')}
                                        </div>
                                        {u.displayName || u.email}
                                    </button>
                                )) : (
                                    <div className="p-4 text-xs text-center text-gray-500">No hay miembros en este proyecto</div>
                                )}
                            </div>
                        )}
                    </div>



                    {/* Recurrence Dropdown */}
                    <RecurrenceSelector
                        value={recurrence}
                        onChange={(newRecurrence) => handleChange(setRecurrence, newRecurrence)}
                    />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Vencimiento</label>
                        <input
                            type="date"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                            value={dueDate}
                            onChange={(e) => handleChange(setDueDate, e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Horario</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                value={startTime}
                                onChange={(e) => handleChange(setStartTime, e.target.value)}
                            />
                            <span className="text-gray-500">-</span>
                            <input
                                type="time"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                value={endTime}
                                onChange={(e) => handleChange(setEndTime, e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400">
                        <AlignLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Descripción</span>
                    </div>
                    <RichTextEditor
                        value={description}
                        onChange={(html) => handleChange(setDescription, html)}
                        taskId={task.id || 'new'}
                    />
                </div>

                {/* Subtasks */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-gray-400">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" />
                            <span className="text-sm font-medium">Subtareas</span>
                        </div>
                        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full">
                            {subtasks.filter(s => s.completed).length}/{subtasks.length}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {subtasks.map((sub, idx) => (
                            <div key={sub.id} className="flex items-center gap-3 group">
                                <button
                                    onClick={() => toggleSubtask(idx)}
                                    className={clsx(
                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                        sub.completed ? "bg-blue-600 border-blue-600" : "border-gray-600 hover:border-blue-500"
                                    )}
                                >
                                    {sub.completed && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                </button>
                                <input
                                    className={clsx("flex-1 text-sm bg-transparent outline-none", sub.completed ? "text-gray-500 line-through" : "text-gray-300")}
                                    value={sub.text}
                                    onChange={(e) => {
                                        const newSubs = [...subtasks];
                                        newSubs[idx].text = e.target.value;
                                        setSubtasks(newSubs);
                                        setHasUnsavedChanges(true);
                                    }}
                                />
                                <button onClick={() => removeSubtask(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-gray-800 rounded">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <Plus className="w-4 h-4 text-gray-500" />
                        <input
                            className="bg-transparent text-sm text-white placeholder-gray-600 outline-none flex-1"
                            placeholder="Añadir paso..."
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') addSubtask();
                            }}
                        />
                    </div>
                </div>

                {/* Dependencies */}
                {!isNew && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                            <Link className="w-4 h-4" />
                            <span className="text-sm font-medium">Dependencias (Bloqueadores)</span>
                        </div>

                        {/* Existing Dependencies List */}
                        {dependencies.length > 0 && (
                            <div className="flex flex-col gap-1 mb-2">
                                {dependencies.map(depId => {
                                    const depTask = allTasks.find(t => t.id === depId);
                                    return (
                                        <div key={depId} className="flex items-center justify-between bg-gray-800 px-2 py-1.5 rounded border border-gray-700">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className={clsx("w-2 h-2 rounded-full", depTask && depTask.status === 'done' ? "bg-green-500" : "bg-red-500")} />
                                                <span className={clsx("text-xs truncate", depTask ? "text-gray-300" : "text-gray-500 italic")}>
                                                    {depTask ? depTask.text : 'Tarea eliminada'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleChange(setDependencies, dependencies.filter(d => d !== depId))}
                                                className="text-gray-500 hover:text-red-400"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <DependencySelector
                            currentTaskId={task.id}
                            tasks={allTasks}
                            existingDependencies={dependencies}
                            onSelect={(newId) => handleChange(setDependencies, [...dependencies, newId])}
                        />
                    </div>
                )}

                {/* Tags */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400">
                        <TagIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Etiquetas</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 flex items-center gap-1 border border-gray-700">
                                {tag}
                                <button onClick={() => handleChange(setTags, tags.filter(t => t !== tag))} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                        <input
                            className="bg-transparent text-xs text-white placeholder-gray-600 outline-none border border-dashed border-gray-700 rounded px-2 py-1 hover:border-blue-500 focus:border-blue-500 w-20 transition-colors"
                            placeholder="+ Tag"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    handleChange(setTags, [...tags, e.currentTarget.value.trim()]);
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm flex justify-end gap-3">
                {hasUnsavedChanges && (
                    <span className="text-xs text-yellow-500 flex items-center mr-auto">
                        <AlertCircle className="w-3 h-3 mr-1" /> Cambios sin guardar
                    </span>
                )}

                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-400 hover:text-white font-medium text-sm transition-colors"
                >
                    {hasUnsavedChanges ? 'Descartar' : 'Cerrar'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges && !isNew}
                    className={clsx(
                        "px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
                        (hasUnsavedChanges || isNew)
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed"
                    )}
                >
                    <Save className="w-4 h-4" />
                    {isNew ? 'Crear Tarea' : 'Guardar'}
                </button>
            </div>

        </motion.div>
    );
}
