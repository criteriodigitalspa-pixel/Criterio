import { useState, useEffect, useRef } from 'react';
import { X, Tag, CheckSquare, Calendar, User } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { taskService } from '../services/taskService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

const COLORS = [
    { name: 'Red', value: 'bg-red-500', text: 'text-white' },
    { name: 'Orange', value: 'bg-orange-500', text: 'text-white' },
    { name: 'Amber', value: 'bg-amber-400', text: 'text-black' },
    { name: 'Green', value: 'bg-green-500', text: 'text-white' },
    { name: 'Emerald', value: 'bg-emerald-500', text: 'text-white' },
    { name: 'Cyan', value: 'bg-cyan-400', text: 'text-black' },
    { name: 'Blue', value: 'bg-blue-500', text: 'text-white' },
    { name: 'Purple', value: 'bg-purple-500', text: 'text-white' },
    { name: 'Pink', value: 'bg-pink-500', text: 'text-white' },
];

export default function BulkTagModal({ tickets, onClose, onComplete }) {
    const { user } = useAuth();
    const [tagText, setTagText] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [loading, setLoading] = useState(false);

    // --- TASK INTEGRATION STATE ---
    const [createTask, setCreateTask] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [projectMembers, setProjectMembers] = useState([]);
    const [taskAssignee, setTaskAssignee] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [loadingProjects, setLoadingProjects] = useState(true);

    const [areas, setAreas] = useState([]);

    // TAB STATE
    const [activeTab, setActiveTab] = useState('tags');
    const [subtasks, setSubtasks] = useState([]);
    const [newSubtask, setNewSubtask] = useState('');

    const [taskTime, setTaskTime] = useState('');
    const [taskDescription, setTaskDescription] = useState('');

    // Track if description has been auto-filled
    const seededRef = useRef(false);

    // Reset seed if tickets change significantly
    useEffect(() => {
        seededRef.current = false;
    }, [tickets[0]?.id]);

    // PRE-FILL DESCRIPTION
    useEffect(() => {
        if (createTask && tickets.length > 0 && !taskDescription && !seededRef.current) {
            const defaultDesc = `Tarea creada desde Kanban para seguimiento de etiqueta: "${tagText}".\n\nTickets vinculados:\n${tickets.map(t => {
                const cpu = t.additionalInfo?.cpuBrand || t.specs?.cpu || '';
                const gen = t.additionalInfo?.cpuGen || t.specs?.generation || '';
                const specs = [t.modelo, cpu, gen].filter(Boolean).join(' ');
                const area = t.currentArea || 'Desconocido';
                return `- [${t.ticketId}] ${specs}`;
            }).join('\n')}`;

            setTaskDescription(defaultDesc);
            seededRef.current = true;
        }
    }, [createTask, tickets, tagText]);

    // Load Projects AND Areas on Mount
    useEffect(() => {
        if (!user?.uid) return;
        const loadData = async () => {
            try {
                const [projectsList, areasList] = await Promise.all([
                    taskService.getProjects(user.uid),
                    taskService.getAreas(user.uid)
                ]);

                // DEDUPLICATE PROJECTS BY NAME
                const uniqueMap = new Map();
                projectsList.forEach(p => {
                    if (!uniqueMap.has(p.name)) {
                        uniqueMap.set(p.name, p);
                    }
                });

                const uniqueList = Array.from(uniqueMap.values());
                uniqueList.sort((a, b) => a.name.localeCompare(b.name));

                setProjects(uniqueList);
                setAreas(areasList);
            } catch (err) {
                console.error("Failed to load data", err);
                setProjects([]);
            } finally {
                setLoadingProjects(false);
            }
        };
        loadData();
    }, [user]);

    // Group Projects by Area for UI
    const getProjectsByArea = () => {
        const grouped = {};
        const noArea = [];

        projects.forEach(p => {
            if (p.areaId) {
                if (!grouped[p.areaId]) grouped[p.areaId] = [];
                grouped[p.areaId].push(p);
            } else {
                noArea.push(p);
            }
        });

        // Use area order
        const orderedGroups = [];
        areas.forEach(area => {
            if (grouped[area.id]) {
                orderedGroups.push({ areaName: area.name, projects: grouped[area.id] });
            }
        });

        if (noArea.length > 0) {
            orderedGroups.push({ areaName: 'General / Sin Área', projects: noArea });
        }

        return orderedGroups;
    };

    // Load Members when Project Select changes
    useEffect(() => {
        if (!selectedProjectId) {
            setProjectMembers([]);
            return;
        }
        const loadMembers = async () => {
            const members = await taskService.getProjectMembers(selectedProjectId);
            setProjectMembers(members);
            // Auto-select self if member
            if (members.find(m => m.id === user.uid)) {
                setTaskAssignee(user.uid);
            }
        };
        loadMembers();
    }, [selectedProjectId, user]);


    // --- SUBTASK HANDLERS ---
    const handleAddSubtask = () => {
        if (!newSubtask.trim()) return;
        setSubtasks([...subtasks, { id: Date.now(), text: newSubtask.trim(), completed: false }]);
        setNewSubtask('');
    };

    const removeSubtask = (index) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    const handleApply = async () => {
        if (!tagText.trim()) {
            toast.error("Escribe un texto para la etiqueta");
            return;
        }

        // Validate Task
        if (createTask) {
            if (!selectedProjectId) return toast.error("Selecciona un Proyecto");
            if (!taskAssignee) return toast.error("Selecciona un Responsable");
            if (!taskDueDate) return toast.error("Selecciona una Fecha Límite");
        }

        setLoading(true);
        const toastId = toast.loading(`Procesando...`);

        try {
            const timestamp = Date.now();

            // 1. Tag Tickets
            const promises = tickets.map((ticket, index) => {
                const currentTags = Array.isArray(ticket.tags) ? ticket.tags : [];
                const cleanTags = currentTags.filter(t => t && typeof t.text === 'string');

                // Check duplicate (Safe)
                const exists = cleanTags.some(t => t.text.toLowerCase() === tagText.trim().toLowerCase() && t.color === selectedColor.value);
                if (exists) return Promise.resolve();

                const newTag = {
                    text: tagText.trim(),
                    color: selectedColor.value,
                    textColor: selectedColor.text,
                    id: `${timestamp}_${index}_${Math.floor(Math.random() * 1000)}`
                };

                const updatedTags = [...cleanTags, newTag];
                return ticketService.updateTicket(ticket.id, { tags: updatedTags });
            });

            await Promise.all(promises);

            // 2. Create Task (If enabled)
            if (createTask) {
                toast.loading(`Creando ${tickets.length} tareas vinculadas...`, { id: toastId });

                // Prepare notifications info
                let assignedUserPhoneNumber = null;
                if (taskAssignee) {
                    try {
                        const u = await userService.getUser(taskAssignee);
                        if (u?.phoneNumber) assignedUserPhoneNumber = u.phoneNumber;
                    } catch (e) {
                        console.warn("Could not fetch assignee for notifications", e);
                    }
                }

                // Create one task PER ticket
                const taskPromises = tickets.map(async (ticket) => {
                    const cpu = ticket.additionalInfo?.cpuBrand || ticket.specs?.cpu || '';
                    const gen = ticket.additionalInfo?.cpuGen || ticket.specs?.generation || '';
                    const specs = [ticket.modelo, cpu, gen].filter(Boolean).join(' ');
                    const area = ticket.currentArea || 'Desconocido';

                    const specificHeader = `Tarea Asignada para el Equipo [${specs}] Ubicado en la caja de [${area}]`;
                    const finalDescription = `${specificHeader}\n\n${taskDescription}`;

                    const taskData = {
                        text: `${tagText} (Ticket #${ticket.ticketId})`,
                        projectId: selectedProjectId,
                        assignedTo: [taskAssignee],
                        dueDate: taskDueDate,
                        startTime: taskTime,
                        description: finalDescription,
                        subtasks: [...subtasks], // Use the array directly
                        status: 'todo'
                    };

                    const newTask = await taskService.addTask(taskData, user.uid);

                    // Send WhatsApp if enabled
                    if (assignedUserPhoneNumber) {
                        const taskLink = `https://app.criteriodigital.cl/tasks`; // Or usage of window.location.origin
                        const msgBody = `📋 *Nueva Tarea Asignada (Desde Batch)*\n\n` +
                            `*Tarea:* ${taskData.text}\n` +
                            `*Vencimiento:* ${taskDueDate || "Sin fecha"}\n\n` +
                            `📝 ${specificHeader}\n` +
                            `👇 *Acción Requerida*\n` +
                            `👉 *[ VER TAREA EN APP ]* ${taskLink}`;

                        // Async fire and forget (don't await loop to prevent slow batch)
                        notificationService.queueWhatsAppNotification(assignedUserPhoneNumber, {
                            body: msgBody,
                            taskId: newTask.id || 'new_batch'
                        }).catch(err => console.error("WA Notify Fail", err));
                    }

                    return newTask;
                });

                await Promise.all(taskPromises);
            }

            toast.success("Completado con éxito", { id: toastId });
            if (onComplete) onComplete();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar", { id: toastId });
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">

                {/* HEADERS / TABS */}
                <div className="flex items-center border-b border-gray-700 bg-gray-900/50">
                    <button
                        onClick={() => setActiveTab('tags')}
                        className={clsx(
                            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
                            activeTab === 'tags' ? "bg-gray-800 text-pink-400 border-pink-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
                        )}
                    >
                        Tags
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('tasks');
                            if (!createTask) setCreateTask(true); // Auto-enable if switching to tasks
                        }}
                        className={clsx(
                            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
                            activeTab === 'tasks' ? "bg-gray-800 text-blue-400 border-blue-500 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
                        )}
                    >
                        Tareas
                    </button>
                    <button onClick={onClose} className="p-3 text-gray-400 hover:text-white border-l border-gray-700 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#1e293b]">

                    {/* --- TAB: TAGS --- */}
                    {activeTab === 'tags' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Tag className="text-pink-400" /> Nueva Etiqueta
                                </h3>
                                <div className="px-2 py-1 rounded bg-gray-800 text-[10px] text-gray-400 border border-gray-700">
                                    {tickets.length} tickets
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Texto de la Etiqueta</label>
                                <input
                                    type="text"
                                    value={tagText}
                                    onChange={(e) => setTagText(e.target.value)}
                                    placeholder="Ej: Urgente, Repuestos..."
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 ring-pink-500 outline-none text-sm shadow-inner"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Color</label>
                                <div className="grid grid-cols-5 gap-3">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.name}
                                            onClick={() => setSelectedColor(c)}
                                            className={clsx(
                                                "w-10 h-10 rounded-xl transition-all border-2 flex items-center justify-center",
                                                c.value,
                                                selectedColor.name === c.name ? "border-white scale-110 shadow-xl ring-2 ring-white/20" : "border-transparent hover:scale-105 opacity-80 hover:opacity-100"
                                            )}
                                            title={c.name}
                                        >
                                            {selectedColor.name === c.name && <CheckSquare className={clsx("w-4 h-4", c.text)} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-dashed border-gray-700/50 flex flex-col items-center justify-center gap-2">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Vista Previa</span>
                                <span className={clsx("px-3 py-1 rounded-lg text-sm font-bold shadow-lg transition-all transform hover:scale-105", selectedColor.value, selectedColor.text)}>
                                    {tagText || "Etiqueta Ejemplo"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: TASKS --- */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-200">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
                                <label className="flex items-center gap-3 cursor-pointer group w-full">
                                    <div className={clsx("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm", createTask ? "bg-blue-500 border-blue-500 shadow-blue-500/20" : "border-gray-600 bg-gray-800 group-hover:border-gray-500")}>
                                        {createTask && <CheckSquare className="w-4 h-4 text-white" />}
                                    </div>
                                    <input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} className="hidden" />
                                    <div className="flex flex-col">
                                        <span className={clsx("text-sm font-bold transition-colors", createTask ? "text-blue-400" : "text-gray-400")}>
                                            Generar Tareas de Seguimiento
                                        </span>
                                        <span className="text-[10px] text-gray-500">Se crearán {tickets.length} tareas individuales</span>
                                    </div>
                                </label>
                            </div>

                            {createTask && (
                                <div className="space-y-4 pt-2">
                                    {/* Project */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Proyecto Destino</label>
                                        <select
                                            value={selectedProjectId}
                                            onChange={(e) => setSelectedProjectId(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:ring-1 outline-none focus:ring-blue-500 cursor-pointer hover:bg-gray-750 transition-colors"
                                        >
                                            <option value="">Seleccionar Proyecto...</option>
                                            {getProjectsByArea().map(group => (
                                                <optgroup key={group.areaName} label={group.areaName}>
                                                    {group.projects.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Assignee */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Asignar a</label>
                                            <div className="relative group">
                                                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                                <select
                                                    value={taskAssignee}
                                                    onChange={(e) => setTaskAssignee(e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 pl-9 pr-2 text-xs text-white focus:ring-1 outline-none focus:ring-blue-500 appearance-none cursor-pointer"
                                                    disabled={!selectedProjectId}
                                                >
                                                    <option value="">{selectedProjectId ? 'Responsable...' : '-'}</option>
                                                    {projectMembers.map(m => (
                                                        <option key={m.id} value={m.id}>{m.displayName || m.email || 'Usuario'}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Date/Time */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Fecha</label>
                                                <input
                                                    type="date"
                                                    value={taskDueDate}
                                                    onChange={(e) => setTaskDueDate(e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 px-2 text-[10px] text-white focus:ring-1 outline-none focus:ring-blue-500 text-center"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold text-gray-500 uppercase ml-1">Hora</label>
                                                <input
                                                    type="time"
                                                    value={taskTime}
                                                    onChange={(e) => setTaskTime(e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2 px-2 text-[10px] text-white focus:ring-1 outline-none focus:ring-blue-500 text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Descripción</label>
                                        <textarea
                                            value={taskDescription}
                                            onChange={(e) => setTaskDescription(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-white focus:ring-1 outline-none focus:ring-blue-500 min-h-[80px] leading-relaxed resize-none shadow-inner"
                                            placeholder="Detalles de la tarea..."
                                        />
                                    </div>

                                    {/* Subtasks (Dynamic List) */}
                                    <div className="pt-2 border-t border-gray-700/50">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Subtareas</label>
                                        <div className="space-y-2">
                                            {subtasks.map((st, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-gray-800/80 p-2 rounded-lg group hover:bg-gray-800 border border-transparent hover:border-gray-700 transition-all">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></div>
                                                    <span className="flex-1 text-xs text-gray-300">{st.text}</span>
                                                    <button onClick={() => removeSubtask(idx)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-2 text-gray-500 font-bold">+</span>
                                                    <input
                                                        type="text"
                                                        value={newSubtask}
                                                        onChange={(e) => setNewSubtask(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                                        placeholder="Agregar subtarea (Enter)"
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-6 pr-3 py-1.5 text-xs text-white focus:ring-1 outline-none focus:ring-blue-500 placeholder-gray-600 transition-shadow focus:shadow-md"
                                                    />
                                                </div>
                                                <button onClick={handleAddSubtask} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors border border-gray-600">
                                                    <CheckSquare className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className="p-5 border-t border-gray-700 bg-gray-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-10">
                    <button
                        onClick={handleApply}
                        disabled={loading || !tagText.trim()}
                        className={clsx(
                            "w-full py-3.5 rounded-xl font-bold shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2",
                            activeTab === 'tags' && !createTask ? "bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/20" : "",
                            createTask ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25" : "",
                            (loading || !tagText.trim()) && "opacity-50 cursor-not-allowed transform-none"
                        )}
                    >
                        {loading ? "Procesando..." : (createTask ? `Guardar Etiqueta y Crear Tareas` : "Guardar Etiqueta")}
                    </button>
                </div>

            </div>
        </div>
    );
}
