import { useState, useEffect } from 'react';
import { X, Tag, CheckSquare, Calendar, User } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { taskService } from '../services/taskService'; // NEW
import { useAuth } from '../context/AuthContext'; // NEW
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
    const { user } = useAuth(); // NEW
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

    const [areas, setAreas] = useState([]); // NEW

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
                setAreas(areasList); // Store areas
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
                toast.loading("Creando tarea vinculada...", { id: toastId });

                const ticketRefText = tickets.length === 1
                    ? `Ticket #${tickets[0].ticketId}`
                    : `${tickets.length} Tickets`;

                const taskData = {
                    text: `${tagText} (${ticketRefText})`,
                    projectId: selectedProjectId,
                    assignedTo: [taskAssignee],
                    dueDate: taskDueDate, // YYYY-MM-DD string is fine, services handles it usually, check logic?
                    // taskService expects string or date? It stores whatever we pass usually.
                    // Standard is string YYYY-MM-DD or ISO.
                    description: `Tarea creada desde Kanban para seguimiento de etiqueta: "${tagText}".\n\nTickets vinculados:\n${tickets.map(t => `- [${t.ticketId}] ${t.marca} ${t.modelo}`).join('\n')}`,
                    status: 'todo'
                };
                await taskService.addTask(taskData, user.uid);
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

    const hasProjectAccess = projects.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Tag className="text-pink-400" /> Nueva Etiqueta
                </h3>

                <p className="text-sm text-gray-400 mb-4">
                    Asignando a <span className="text-white font-bold">{tickets.length}</span> tickets seleccionados.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto</label>
                        <input
                            type="text"
                            value={tagText}
                            onChange={(e) => setTagText(e.target.value)}
                            placeholder="Ej: Urgente, Repuestos..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 ring-pink-500 outline-none"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Color</label>
                        <div className="grid grid-cols-5 gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c.name}
                                    onClick={() => setSelectedColor(c)}
                                    className={clsx(
                                        "w-8 h-8 rounded-full transition-all border-2",
                                        c.value,
                                        selectedColor.name === c.name ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105 opacity-80 hover:opacity-100"
                                    )}
                                    title={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 flex items-center justify-center">
                        <span className={clsx("px-2 py-0.5 rounded text-xs font-bold shadow-sm transition-all", selectedColor.value, selectedColor.text)}>
                            {tagText || "Vista Previa"}
                        </span>
                    </div>

                    {/* PROJECT TASK TOGGLE */}
                    {hasProjectAccess && (
                        <div className="pt-4 border-t border-gray-700/50">
                            <label className="flex items-center gap-2 cursor-pointer mb-3 group">
                                <div className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-colors", createTask ? "bg-blue-500 border-blue-500" : "border-gray-600 bg-gray-900 group-hover:border-gray-500")}>
                                    {createTask && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} className="hidden" />
                                <span className={clsx("text-sm font-bold", createTask ? "text-blue-400" : "text-gray-400")}>
                                    Crear Tarea de Seguimiento
                                </span>
                            </label>

                            {createTask && (
                                <div className="space-y-3 bg-gray-900/50 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 border border-blue-500/20">
                                    {/* Project */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Proyecto</label>
                                        <select
                                            value={selectedProjectId}
                                            onChange={(e) => setSelectedProjectId(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:ring-1 outline-none focus:ring-blue-500"
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

                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Assignee */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Asignar a</label>
                                            <div className="relative">
                                                <User className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-500" />
                                                <select
                                                    value={taskAssignee}
                                                    onChange={(e) => setTaskAssignee(e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1.5 pl-7 pr-2 text-xs text-white focus:ring-1 outline-none focus:ring-blue-500 appearance-none"
                                                    disabled={!selectedProjectId}
                                                >
                                                    <option value="">{selectedProjectId ? 'Responsable...' : '-'}</option>
                                                    {projectMembers.map(m => (
                                                        <option key={m.id} value={m.id}>{m.displayName || m.email || 'Usuario'}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Date */}
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fecha Límite</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-500" />
                                                <input
                                                    type="date"
                                                    value={taskDueDate}
                                                    onChange={(e) => setTaskDueDate(e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-1.5 pl-7 pr-2 text-xs text-white focus:ring-1 outline-none focus:ring-blue-500"
                                                    min={new Date().toISOString().split('T')[0]} // No past dates
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleApply}
                        disabled={loading || !tagText.trim()}
                        className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Procesando..." : "Aplicar Etiqueta"}
                    </button>
                </div>
            </div>
        </div>
    );
}
