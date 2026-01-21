import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { taskService } from '../services/taskService';
import { useAuth, googleProvider } from '../context/AuthContext'; // Import provider
import { googleTasksService } from '../services/googleTasksService'; // Import service
import { notificationService } from '../services/notificationService'; // Notifications
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'; // Import for direct re-auth
import { auth, db } from '../services/firebase';
import { collection, doc } from 'firebase/firestore';
import {
    CheckCircle2, AlertCircle, Calendar as CalendarIcon, Calendar, ChevronRight, MoreVertical, Plus,
    Layout, Hash, Briefcase, PanelLeftClose, UserPlus, Trash2, Check, Clock, Search, XCircle,
    ArrowUpCircle, Filter, X, Kanban, List as ListIcon, FolderPlus, MoreHorizontal, ChevronDown,
    Circle, RefreshCw, Link as LinkIcon, Users, Table, ShieldCheck, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import TaskDetailPanel from '../components/tasks/TaskDetailPanel';
import UserInviteModal from '../components/projects/UserInviteModal';
import EditProjectModal from '../components/projects/EditProjectModal';
// NotificationCenter & UserMenu moved to DashboardLayout
import EmptyState from '../components/layout/EmptyState';
import AreaDashboard from '../components/tasks/AreaDashboard';
import CalendarView from '../components/tasks/CalendarView';
import SidebarList from '../components/tasks/SidebarList';
import TaskCard from '../components/tasks/TaskCard';
import TaskCardSkeleton from '../components/tasks/TaskCardSkeleton';
import TableView from '../components/tasks/TableView';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TaskManager() {
    const { user, login } = useAuth(); // Use login from context if available, or direct
    const navigate = useNavigate();

    // Data State
    const [areas, setAreas] = useState([]);
    const [projects, setProjects] = useState([]);
    const [activeProjectId, setActiveProjectId] = useState(null);

    // REFACTOR: Split state to prevent overwrites
    const [firestoreTasks, setFirestoreTasks] = useState([]);
    const [googleTasks, setGoogleTasks] = useState([]);
    // Derived tasks (memoized-ish by render)
    // Note: optimisticTasks are merged here for read-only access in render
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    // Stats Cache: { projectId: { total: 10, completed: 5 } }
    const [projectStats, setProjectStats] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('project_stats_cache') || '{}');
        } catch (e) { return {}; }
    });

    // Update Stats when tasks change (Active Project)
    useEffect(() => {
        if (!activeProjectId || activeProjectId === 'my-tasks') return;

        const total = firestoreTasks.length;
        const completed = firestoreTasks.filter(t => t.status === 'done').length;

        setProjectStats(prev => {
            const next = {
                ...prev,
                [activeProjectId]: { total, completed, lastUpdated: Date.now() }
            };
            // localStorage.setItem('project_stats_cache', JSON.stringify(next)); // Optional: persist
            return next;
        });
    }, [firestoreTasks, activeProjectId]);

    // Initial Stats Fetch for Sidebar (All Projects)
    useEffect(() => {
        if (projects.length > 0) {
            const ids = projects.map(p => p.id);
            taskService.getProjectsStats(ids).then(stats => {
                setProjectStats(prev => ({ ...prev, ...stats }));
            });
        }
    }, [projects.length]); // Run when projects list size changes (mount or add)

    // Deep Link Logic (Notification Click)
    const location = useLocation();
    useEffect(() => {
        if (location.state?.openProjectId) {
            setActiveProjectId(location.state.openProjectId);
        }

        if (location.state?.openTaskId) {
            const taskId = location.state.openTaskId;
            // Try to find in current list first (faster)
            const found = firestoreTasks.find(t => t.id === taskId);
            if (found) {
                setSelectedTask(found);
            } else {
                // If not found (maybe loading, or other project), fetch it
                taskService.getTask(taskId).then(task => {
                    if (task) setSelectedTask(task);
                });
            }
            // Optional: Clear state so it doesn't reopen if we navigate away and back
            // window.history.replaceState({}, document.title); 
        }
    }, [location.state, firestoreTasks]); // Check when tasks load too

    const [selectedTask, setSelectedTask] = useState(null);

    // Google Tasks State
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
    const [googleTaskLists, setGoogleTaskLists] = useState([]); // Raw lists from Google

    // Multi-Select State
    const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
    const [isAssignMenuOpen, setIsAssignMenuOpen] = useState(false);

    // UI State
    const [viewMode, setViewMode] = useState('board');
    const [expandedAreas, setExpandedAreas] = useState({});



    // Optimistic UI State
    const [optimisticTasks, setOptimisticTasks] = useState([]);

    // Derived Consolidated Tasks
    const tasks = activeProjectId ? [
        // Optimistic: Only show if they belong to this project (Simple check)
        ...optimisticTasks.filter(t =>
            activeProjectId === 'my-tasks'
                ? true
                : String(t.projectId) === String(activeProjectId)
        ).filter(t => !firestoreTasks.find(ft => ft.id === t.id)),

        // Database: Trust the subscription implicitly. If it's here, it belongs here.
        ...firestoreTasks,

        ...googleTasks
    ] : [];

    // Menu State
    const [activeMenuProject, setActiveMenuProject] = useState(null); // projectId
    const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
    const [inviteModalProject, setInviteModalProject] = useState(null);
    const [editModalItem, setEditModalItem] = useState(null);

    // Creation States
    const [isCreatingArea, setIsCreatingArea] = useState(false);
    const [newAreaName, setNewAreaName] = useState('');
    const [creatingProjectInArea, setCreatingProjectInArea] = useState(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskAssignees, setNewTaskAssignees] = useState([]);
    const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);

    // Layout Context (Main Sidebar)
    const { setIsSidebarCollapsed, isSidebarCollapsed: isMainCollapsed } = useOutletContext() || {};
    const [isLocalSidebarCollapsed, setIsLocalSidebarCollapsed] = useState(true);
    const [isHoverExpanded, setIsHoverExpanded] = useState(false);
    const hoverTimeoutRef = useRef(null);
    const sidebarRef = useRef(null);
    const [usersMap, setUsersMap] = useState({});
    const [viewFilter, setViewFilter] = useState({ assignee: null });

    // Derived logic: Sidebar is effectively collapsed if local state says so AND not overridden by hover
    const isEffectiveCollapsed = isLocalSidebarCollapsed && !isHoverExpanded;

    // Auto-Collapse effect
    useEffect(() => {
        // Always minimize Main Sidebar when entering TaskManager
        if (setIsSidebarCollapsed) setIsSidebarCollapsed(true);



    }, [activeProjectId, setIsSidebarCollapsed]);


    // --- ITEM UPDATE (Edit Project/Area) ---
    const handleUpdateItem = async (itemId, updates) => {
        try {
            if (editModalItem.type === 'area') {
                await taskService.updateArea(itemId, updates);
                toast.success('Área actualizada');
                setAreas(prev => prev.map(a => a.id === itemId ? { ...a, ...updates } : a));
            } else {
                await taskService.updateProject(itemId, updates);
                toast.success('Proyecto actualizado');
                setProjects(prev => prev.map(p => p.id === itemId ? { ...p, ...updates } : p));
            }
        } catch (error) {
            console.error("Error updating item:", error);
            toast.error("Error al guardar cambios");
        }
    };

    // OVERDUE NOTIFICATIONS LOGIC
    useEffect(() => {
        // Only run if we have tasks loaded (and user is logged in)
        // We derive 'allTasks' from firestoreTasks etc, but here we can check 'firestoreTasks' directly since Google tasks might be handled differently?
        // Actually, checking all derived tasks is better, but derived is calculated during render.
        // I'll assume 'firestoreTasks' for now as they are the main ones we want to persist alerts for.
        if (!user?.uid || firestoreTasks.length === 0) return;

        const checkOverdue = () => {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Compare dates only? Or exact time? 
            // User asked for "Overdue Logic". Usually Date based.

            firestoreTasks.forEach(task => {
                if (task.status === 'done' || !task.dueDate) return;

                const dueDate = new Date(task.dueDate); // assuming YYYY-MM-DD string or ISO
                // Add 24h buffer if it's just a date string? 
                // If task.dueDate is '2025-01-01', new Date('2025-01-01') is UTC or Local depending on browser parsing.
                // Usually safest: 
                // const dueDate = new Date(task.dueDate + 'T23:59:59'); 
                // Use string comparison for strictly "Past Date".

                const todayStr = now.toISOString().split('T')[0];
                const isOverdue = task.dueDate < todayStr;

                if (isOverdue) {
                    const alertKey = `alerted_overdue_${task.id}`;
                    const alreadyAlerted = localStorage.getItem(alertKey);

                    if (!alreadyAlerted) {
                        notificationService.sendNotification(
                            user.uid,
                            "Tarea Vencida",
                            `La tarea "${task.text}" ha vencido.`,
                            "alert"
                        );
                        localStorage.setItem(alertKey, 'true');
                    }
                }
            });
        };

        // Run check once on mount/update of tasks
        checkOverdue();
    }, [firestoreTasks, user?.uid]);

    // --- MULTI-SELECT KEYBOARD & CLICK OUTSIDE ---
    useEffect(() => {
        const handleInteraction = (e) => {
            // 1. Sidebar Click Outside Logic
            if (isHoverExpanded && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                setIsHoverExpanded(false);
            }

            // 2. Multi-Select Click Outside Logic
            if (isMultiSelectMode) {
                if (!e.target.closest('[data-task-card="true"]') && !e.target.closest('[data-bulk-bar="true"]')) {
                    quitMultiSelect();
                }
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isMultiSelectMode) quitMultiSelect();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('click', handleInteraction);
        // Also listen to touchstart for mobile responsiveness
        window.addEventListener('touchstart', handleInteraction);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [isMultiSelectMode, isHoverExpanded]); // Added isHoverExpanded to dependency

    const unsubRef = useRef(null);
    const googleTokenRef = useRef(null); // Store token temporarily

    // Function to Connect Google
    const handleConnectGoogle = async () => {
        try {
            setIsSyncingGoogle(true);
            // We force a re-login to ensure we get a fresh Access Token
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const accessToken = credential?.accessToken;

            if (accessToken) {
                googleTokenRef.current = accessToken;
                setIsGoogleConnected(true);
                toast.success("Google Tasks Vinculado 🔗");

                // Fetch ALL lists
                const lists = await googleTasksService.listTaskLists(accessToken);
                setGoogleTaskLists(lists);
                toast.success(`Sincronizando ${lists.length} listas...`);
            }
        } catch (error) {
            console.error("Google Sync Error:", error);
            // Show more specific error to help debug
            const msg = error.message || "Error desconocido";
            if (msg.includes("403")) {
                toast.error("Error 403: ¿Habilitaste la Google Tasks API en la consola?");
            } else if (msg.includes("popup")) {
                toast.error("Ventana cerrada o bloqueada.");
            } else {
                toast.error(`Error Google: ${msg.slice(0, 50)}...`);
            }
        } finally {
            setIsSyncingGoogle(false);
        }
    };

    // Load Data
    useEffect(() => {
        if (user?.uid) {
            // Attempt to restore legacy data
            Promise.all([
                taskService.recoverLegacyProjects(user.uid),
                taskService.recoverLegacyAreas(user.uid)
            ]).then(([pCount, aCount]) => {
                if (pCount + aCount > 0) toast.success(`Recuperados: ${pCount} proy. ${aCount} áreas.`);
            }).catch(console.error);
        }



        // Debounce subscriptions to prevent Firestore SDK race conditions on rapid auth changes
        const timer = setTimeout(() => {
            if (user?.uid) {
                console.log("[TaskManager] Establishing Firestore listeners...");

                // DATA RECOVERY & SYNC (Safe Zone)
                taskService.syncPendingItems().catch(console.error);

                const unsubAreas = taskService.subscribeToAreas(user.uid, setAreas);
                const unsubProjects = taskService.subscribeToProjects(user.uid, (data) => {
                    setProjects(data);
                });
                const unsubUsers = taskService.subscribeToUsers(setUsersMap);

                // cleanup function for the listeners
                unsubRef.current = () => {
                    unsubAreas();
                    unsubProjects();
                    unsubUsers();
                };
            }
        }, 50);

        return () => {
            clearTimeout(timer);
            // If listeners were established, clean them up
            if (unsubRef.current) {
                unsubRef.current();
                unsubRef.current = null;
            }
        };
    }, [user?.uid]);

    // --- SEPARATED EFFECTS FOR TASKS ---

    // --- PERSISTENCE: Sync State to Local Mirror ---
    // This ensures that ANY change to the tasks (Add, Move, Edit, Delete) logic 
    // that updates the UI state is immediately saved to our fallback cache.
    // This is the final piece of the "Offline-First" puzzle.
    useEffect(() => {
        if (activeProjectId && firestoreTasks.length > 0) {
            const cacheKey = `cache_tasks_${activeProjectId}`;
            try {
                // Deduplicate before saving just in case
                const unique = Array.from(new Map(firestoreTasks.map(item => [item.id, item])).values());
                localStorage.setItem(cacheKey, JSON.stringify(unique));
                // console.log(`[TaskManager] Synced ${unique.length} tasks to local mirror.`);
            } catch (e) {
                console.warn("Failed to sync state to cache", e);
            }
        }
    }, [firestoreTasks, activeProjectId]);

    // 1. Subscribe to Firestore Tasks
    useEffect(() => {
        if (!activeProjectId) {
            setFirestoreTasks([]);
            return;
        }

        if (activeProjectId === 'my-tasks') {
            setIsLoadingTasks(true);
            const unsub = taskService.subscribeToUserTasks(viewFilter.assignee || user?.uid, (tasks) => {
                setFirestoreTasks(tasks);
                setIsLoadingTasks(false);
            });
            return () => unsub();
        } else {
            // OFFLINE-FIRST: Immediately load from local cache to prevent flashing/empty state
            const cachedKey = `cache_tasks_${activeProjectId}`;
            setFirestoreTasks([]); // PREVENT GHOSTING: Clear previous project's tasks immediately

            try {
                const cached = localStorage.getItem(cachedKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    console.log(`[TaskManager] ⚡ Instant Load: ${parsed.length} tasks from local cache.`);
                    setFirestoreTasks(parsed);
                }
            } catch (e) {
                console.warn("[TaskManager] Failed to load local cache", e);
            }

            // Standard Project Subscription
            setIsLoadingTasks(true);
            console.log(`[TaskManager] Subscribing to tasks for Project: ${activeProjectId}`);
            const unsub = taskService.subscribeToProjectTasks(activeProjectId, user?.uid, (data) => {
                // SAFETY: Filter strictly but robustly (Trim + String)
                // This 'Portero' ensures only tasks for the current project enter the memory
                const validTasks = data.filter(t => {
                    const tPid = String(t.projectId || '').trim();
                    const aPid = String(activeProjectId || '').trim();
                    const match = tPid === aPid;
                    if (!match) console.warn(`[Filter] Rejected task ${t.id} (Project: '${tPid}' vs Expected: '${aPid}')`);
                    return match;
                });

                console.log(`[TaskManager] Updated Firestore tasks: ${validTasks.length} (Filtered from ${data.length})`);
                setFirestoreTasks(validTasks);
                setIsLoadingTasks(false);
            });
            return () => unsub();
        }
    }, [activeProjectId, viewFilter.assignee, user?.uid]);

    // 2. Fetch Google Tasks
    useEffect(() => {
        if (!activeProjectId || !isGoogleConnected) {
            setGoogleTasks([]);
            return;
        }

        const currentProject = projects.find(p => p.id === activeProjectId);
        const matchingGoogleList = currentProject
            ? googleTaskLists.find(l => l.title.toLowerCase() === currentProject.name.toLowerCase())
            : null;

        if (matchingGoogleList && googleTokenRef.current) {
            console.log("Fetching Google Tasks for:", matchingGoogleList.title);
            googleTasksService.listTasks(googleTokenRef.current, matchingGoogleList.id)
                .then(gTasks => {
                    console.log(`[TaskManager] Loaded ${gTasks.length} Google Tasks`);
                    const formattedGTasks = gTasks.map(t => ({
                        id: t.id,
                        text: t.title,
                        status: t.status === 'completed' ? 'done' : 'todo',
                        dueDate: t.due ? t.due.split('T')[0] : null,
                        type: 'google',
                        listId: matchingGoogleList.id,
                        notes: t.notes
                    }));
                    setGoogleTasks(formattedGTasks);
                    toast("Google Tasks Sincronizado", { icon: '🔄', id: 'sync-google-done' });
                })
                .catch(err => {
                    console.error("Failed to fetch Google tasks", err);
                    setGoogleTasks([]);
                });
        } else {
            setGoogleTasks([]);
        }
    }, [activeProjectId, isGoogleConnected, googleTaskLists, projects]);

    // 3. Passive Cleanup of Optimistic Tasks
    // When a task arrives from Firestore, we remove its optimistic counterpart.
    useEffect(() => {
        if (optimisticTasks.length > 0 && firestoreTasks.length > 0) {
            const confirmedIds = new Set(firestoreTasks.map(t => t.id));
            const remainingOptimistic = optimisticTasks.filter(op => !confirmedIds.has(op.id));

            if (remainingOptimistic.length !== optimisticTasks.length) {
                console.log("[TaskManager] Cleaning up confirmed optimistic tasks");
                setOptimisticTasks(remainingOptimistic);
            }
        }
    }, [firestoreTasks, optimisticTasks]);

    // --- ACTIONS ---

    const handleCreateArea = async (e) => {
        e.preventDefault();
        if (!newAreaName.trim()) return;
        try {
            await taskService.addArea(newAreaName, user.uid);
            setNewAreaName('');
            setIsCreatingArea(false);
            toast.success("Área creada");
        } catch (error) {
            toast.error("Error al crear área");
        }
    };

    const handleCreateProject = async (e, areaId) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newProjectName.trim()) return;
        try {
            const res = await taskService.addProject(newProjectName, areaId, user.uid);
            setNewProjectName('');
            setCreatingProjectInArea(null);
            setActiveProjectId(res.id);
            if (areaId) setExpandedAreas(prev => ({ ...prev, [areaId]: true }));
            toast.success("Proyecto creado");
        } catch (error) {
            toast.error("Error al crear proyecto");
        }
    };

    const handleShareProject = async (projectId) => {
        const email = prompt("Ingrese el email del usuario a invitar:");
        if (!email) return;
        try {
            await taskService.shareProject(projectId, email);
            toast.success("Usuario invitado al proyecto");
        } catch (error) {
            toast.error(error.message || "Error al invitar");
        }
    };

    const handleInviteUsers = async (usersToInvite) => {
        if (!inviteModalProject) return;
        try {
            const isArea = inviteModalProject.isArea;
            const promises = usersToInvite.map(u =>
                isArea
                    ? taskService.shareArea(inviteModalProject.id, u.email)
                    : taskService.shareProject(inviteModalProject.id, u.email)
            );

            await Promise.all(promises);
            toast.success(`${usersToInvite.length} usuario(s) invitado(s) a ${isArea ? 'el Área' : 'el Proyecto'}`);
        } catch (error) {
            console.error("Invite Error:", error);
            toast.error(error.message || "Error al invitar usuarios");
        }
    };



    const handleDeleteProject = async (projectId) => {
        if (!confirm("¿Eliminar proyecto y tareas?")) return;
        try {
            await taskService.deleteProject(projectId);
            if (activeProjectId === projectId) setActiveProjectId(null);
            toast.success("Proyecto eliminado");
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const toggleArea = (areaId) => {
        setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim() || !activeProjectId) return;

        // ROBUST: Generate ID client-side to link Optimistic and Real task without gaps
        const newId = doc(collection(db, 'tasks')).id;

        const optimTask = {
            id: newId,
            text: newTaskText,
            projectId: activeProjectId,
            status: 'todo',
            createdAt: { seconds: Date.now() / 1000 },
            subtasks: [],
            isOptimistic: true, // Tag it
            dueDate: newTaskDate ? { seconds: new Date(newTaskDate).getTime() / 1000 } : null,
            assignedTo: newTaskAssignees
        };

        // 1. Optimistic Update (Immediate Feedback)
        setOptimisticTasks(prev => [optimTask, ...prev]);
        setNewTaskText('');
        setNewTaskDate('');
        setNewTaskAssignees([]);
        setIsQuickAddExpanded(false);

        try {
            // 2. Actual Server Call with PRE-GENERATED ID
            await taskService.addTask({
                text: optimTask.text,
                projectId: activeProjectId,
                status: 'todo',
                subtasks: [],
                customId: newId, // Force specific ID
                dueDate: newTaskDate ? new Date(newTaskDate) : null,
                assignedTo: newTaskAssignees
            }, user.uid);

            // 3. NO CLEANUP HERE.
            // We rely on the passive useEffect to remove this optimistic task 
            // ONLY when it appears in the firestoreTasks list.

        } catch (error) {
            console.error(error);
            toast.error("Error al crear tarea");
            // Rollback on error
            setOptimisticTasks(prev => prev.filter(t => t.id !== newId));
            setNewTaskText(optimTask.text);
        }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            // Find type of task
            const allTasks = [...optimisticTasks, ...tasks];
            const task = allTasks.find(t => t.id === taskId);

            // BLOCKING LOGIC (Integrity Check)
            if (task && newStatus === 'done') {
                const hasPendingSubtasks = task.subtasks?.some(s => !s.completed);
                if (hasPendingSubtasks) {
                    toast.error("Tarea bloqueada: Subtareas pendientes");
                    return; // Abort
                }

                // Check Dependencies
                if (task.dependencies?.length > 0) {
                    // We need to check against 'tasks' or 'firestoreTasks' to see if dep is done
                    // Since 'allTasks' has everything, use that.
                    const blockingDep = task.dependencies.some(depId => {
                        const depTask = allTasks.find(t => t.id === depId);
                        return depTask && depTask.status !== 'done';
                    });

                    if (blockingDep) {
                        toast.error("Tarea bloqueada por dependencia");
                        return; // Abort
                    }
                }
            }

            // 1. Optimistic Update (Visual)
            // Update the source buckets directly for instant feedback
            setFirestoreTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            setGoogleTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            setOptimisticTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

            if (!task) return;

            // 2. Route to correct service
            if (task.isOptimistic) {
                console.log("Skipping server update for optimistic task:", taskId);
                return;
            }

            if (task.type === 'google') {
                if (!googleTokenRef.current) throw new Error("Google Token Missing");
                // Google Tasks API 'status' is 'completed' or 'needsAction'
                const gStatus = newStatus === 'done' ? 'completed' : 'needsAction';
                await googleTasksService.updateTask(googleTokenRef.current, task.listId, task.id, { status: gStatus });
            } else {
                await taskService.updateTask(taskId, { status: newStatus });

                // RECURRENCE LOGIC (Only for Local/Firestore Tasks for safety)
                if (newStatus === 'done' && task.recurrence && task.recurrence !== 'none') {
                    try {
                        const baseDate = task.dueDate ? new Date(task.dueDate + 'T12:00:00') : new Date(); // Avoid timezone shifts on straight ISO
                        const nextDate = new Date(baseDate);

                        switch (task.recurrence) {
                            case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
                            case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
                            case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                            case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                        }

                        const nextDateStr = nextDate.toISOString().split('T')[0];

                        // Create Next Instance
                        await taskService.addTask({
                            text: task.text,
                            projectId: task.projectId,
                            status: 'todo',
                            dueDate: nextDateStr,
                            recurrence: task.recurrence, // Propagate recurrence
                            subtasks: [] // Reset subtasks
                        }, user.uid);

                        toast("Tarea recurrente programada 🔄", { duration: 3000 });
                    } catch (e) {
                        console.error("Recurrence Error:", e);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Error moviendo tarea");
        }
    };


    // --- MULTI-SELECT ---
    const toggleSelection = (taskId) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const quitMultiSelect = () => {
        setIsMultiSelectMode(false);
        setSelectedTaskIds(new Set());
    };

    const handleBulkComplete = async () => {
        const ids = Array.from(selectedTaskIds);
        try {
            await Promise.all(ids.map(id => taskService.updateTask(id, { status: 'done' })));

            // Sync Selected Task
            if (selectedTask && selectedTaskIds.has(selectedTask.id)) {
                setSelectedTask(prev => ({ ...prev, status: 'done' }));
            }

            toast.success(`${ids.length} tareas completadas`);
            quitMultiSelect();
        } catch (e) {
            toast.error("Error en acción masiva");
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`¿Eliminar ${selectedTaskIds.size} tareas? Este paso no se puede deshacer.`)) return;
        const ids = Array.from(selectedTaskIds);

        // Optimistic UI
        const originalFirestoreTasks = firestoreTasks;
        const originalGoogleTasks = googleTasks;
        setFirestoreTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));
        setGoogleTasks(prev => prev.filter(t => !selectedTaskIds.has(t.id)));

        // Sync Selected Task (Close if deleted)
        if (selectedTask && selectedTaskIds.has(selectedTask.id)) {
            setSelectedTask(null);
        }

        try {
            // Remove from DB
            await Promise.all(ids.map(id => taskService.deleteTask(id)));

            toast.success("Tareas eliminadas");
            quitMultiSelect();
        } catch (e) {
            toast.error("Error eliminando tareas");
            // Rollback optimistic update
            setFirestoreTasks(originalFirestoreTasks);
            setGoogleTasks(originalGoogleTasks);
        }
    };

    const handleBulkAssign = async (userId) => {
        const ids = Array.from(selectedTaskIds);
        // Optimistic
        const originalFirestoreTasks = firestoreTasks;
        setFirestoreTasks(prev => prev.map(t => selectedTaskIds.has(t.id) ? { ...t, assignedTo: [userId] } : t));

        // Sync Selected Task
        if (selectedTask && selectedTaskIds.has(selectedTask.id)) {
            setSelectedTask(prev => ({ ...prev, assignedTo: [userId] }));
        }

        try {
            // Server
            await Promise.all(ids.map(id => taskService.updateTask(id, { assignedTo: [userId] })));
            toast.success("Usuarios asignados");
            quitMultiSelect();
        } catch (e) {
            toast.error("Error al asignar usuarios");
            setFirestoreTasks(originalFirestoreTasks); // Rollback
        }
    };

    const handleBulkDueDate = async (date) => {
        const ids = Array.from(selectedTaskIds);
        // Optimistic
        const originalFirestoreTasks = firestoreTasks;
        setFirestoreTasks(prev => prev.map(t => selectedTaskIds.has(t.id) ? { ...t, dueDate: date } : t));

        // Sync Selected Task
        if (selectedTask && selectedTaskIds.has(selectedTask.id)) {
            setSelectedTask(prev => ({ ...prev, dueDate: date }));
        }

        try {
            // Server
            await Promise.all(ids.map(id => taskService.updateTask(id, { dueDate: date })));
            toast.success("Fecha actualizada");
            quitMultiSelect();
        } catch (e) {
            toast.error("Error al actualizar fecha");
            setFirestoreTasks(originalFirestoreTasks); // Rollback
        }
    };

    // --- DRAG & DROP ---
    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData('taskId', taskId);
    };
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e, status) => {
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) updateTaskStatus(taskId, status);
    };

    // Deep Linking Handling
    useEffect(() => {
        if (location.state?.openProjectId) {
            setActiveProjectId(location.state.openProjectId);
        }
        if (location.state?.openTaskId) {
            // Slight delay to ensure tasks are loaded/filtered
            setTimeout(() => {
                const task = tasks.find(t => t.id === location.state.openTaskId) || { id: location.state.openTaskId, _forceLoad: true };
                setSelectedTask(task);
            }, 600);

            // Clear state to avoid reopening on refresh (optional, but good practice)
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, tasks]);
    const activeProject = projects.find(p => p.id === activeProjectId);

    // Display Project (handles virtual "My Tasks" project)
    // Display Project (handles virtual "My Tasks" project and Areas)
    const activeArea = activeProjectId?.startsWith('AREA:') ? areas.find(a => a.id === activeProjectId.split(':')[1]) : null;

    const displayProject = activeProjectId === 'my-tasks'
        ? { id: 'my-tasks', name: 'Mis Tareas', areaId: null, color: 'blue', members: [user?.uid] }
        : (activeProject || (activeArea ? { ...activeArea, isArea: true, members: [] } : null));

    const getColumns = () => [
        { id: 'todo', title: 'Por Hacer', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-800/50' },
        { id: 'doing', title: 'En Curso', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-900/10' },
        { id: 'done', title: 'Listo', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/10' }
    ];

    const renderProjectItem = (project) => {
        const isSynced = isGoogleConnected && googleTaskLists.some(l => l.title.toLowerCase() === project.name.toLowerCase());

        return (
            <div
                key={project.id}
                className={clsx(
                    "group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all text-sm relative",
                    activeProjectId === project.id ? "bg-purple-500/10 text-purple-400 font-medium" : "text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"
                )}
                onContextMenu={(e) => handleContextMenu(e, project.id, 'project')}
                onClick={() => setActiveProjectId(project.id)}
            >
                <div className="flex items-center gap-2 truncate flex-1 leading-none">
                    <Hash className="w-3.5 h-3.5 opacity-70" />
                    <span className="truncate">{project.name}</span>
                    {isSynced && (
                        <span title="Sincronizado con Google Tasks" className="flex items-center justify-center bg-blue-500/20 rounded-full w-3 h-3">
                            <span className="block w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        </span>
                    )}
                </div>

                {/* Context Menu Button */}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuCoords({ x: rect.right, y: rect.bottom });
                            setActiveMenuProject(activeMenuProject?.id === project.id ? null : { id: project.id, type: 'project' });
                        }}
                        className={clsx(
                            "p-1 rounded hover:bg-gray-700 transition-all",
                            activeMenuProject?.id === project.id ? "opacity-100 text-white" : "opacity-0 group-hover:opacity-100 text-gray-500"
                        )}
                    >
                        <MoreVertical className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    };

    const renderMenu = () => {
        if (!activeMenuProject) return null;

        return createPortal(
            <>
                <div
                    className="fixed inset-0 z-[60]"
                    onClick={(e) => { e.stopPropagation(); setActiveMenuProject(null); }}
                ></div>
                <div
                    className="fixed z-[70] bg-gray-800 border border-gray-700 shadow-xl rounded-lg py-1 overflow-hidden w-40"
                    style={{
                        left: `${menuCoords.x}px`,
                        top: `${menuCoords.y}px`,
                        transform: 'translate(-100%, 0)' // Align right edge
                    }}
                >
                    {/* EDITAR */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Reconstruct item from ID/Type if needed, but Sidebar passes full details usually?
                            // Checking SidebarList... calls openMenu(e, { id, type, name, icon })
                            // So activeMenuProject IS the item with details.
                            setEditModalItem(activeMenuProject);
                            setActiveMenuProject(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                    >
                        <Settings className="w-3 h-3" /> Editar
                    </button>

                    {/* INVITAR (Only Projects) */}
                    {activeMenuProject.type === 'project' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                let target = projects.find(p => p.id === activeMenuProject.id);
                                setInviteModalProject({ ...target });
                                setActiveMenuProject(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex items-center gap-2"
                        >
                            <UserPlus className="w-3 h-3" /> Invitar
                        </button>
                    )}

                    {/* ELIMINAR */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Eliminar ${activeMenuProject.type === 'area' ? 'Área' : 'Proyecto'}?`)) {
                                if (activeMenuProject.type === 'area') taskService.deleteArea(activeMenuProject.id);
                                else handleDeleteProject(activeMenuProject.id);
                            }
                            setActiveMenuProject(null);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                    >
                        <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                </div>
            </>,
            document.body
        );
    };

    const handleSidebarMouseEnter = () => {
        if (!isLocalSidebarCollapsed) return;
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHoverExpanded(true);
        }, 800); // 0.8s Delay
    };

    const handleSidebarMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        // setIsHoverExpanded(false); // REMOVED: Only close on click outside
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-950">
            {/* SIDEBAR */}
            <aside
                ref={sidebarRef}
                onMouseEnter={handleSidebarMouseEnter}
                onMouseLeave={handleSidebarMouseLeave}
                onClick={() => {
                    // Mobile/Touch: Tap to open
                    if (isEffectiveCollapsed) setIsHoverExpanded(true);
                }}
                className={clsx(
                    "bg-gray-950/80 backdrop-blur-xl border-r border-gray-800 flex flex-col transition-all duration-300 shrink-0 relative z-20",
                    isEffectiveCollapsed ? "w-14" : "w-80",
                    isHoverExpanded && "absolute left-0 bottom-0 top-0 shadow-xl border-r-blue-500/30"
                )}
            >
                <div className={clsx("p-4 border-b border-gray-800 flex items-center justify-between", isEffectiveCollapsed && "flex-col gap-2 p-2")}>
                    {!isEffectiveCollapsed && (
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Layout className="w-4 h-4 text-blue-500" /> Espacios
                        </h2>
                    )}
                    {/* Only show collapse button if NOT hovering (to prevent confusion) or logic? */}

                </div>

                {/* Sidebar List */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <SidebarList
                        areas={areas}
                        projects={projects}
                        expandedAreas={expandedAreas}
                        toggleExpand={(id) => setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }))}
                        isCollapsed={isEffectiveCollapsed}
                        onReorderAreas={(ids) => {
                            // Optimistic update
                            const orderedAreas = ids.map(id => areas.find(a => a.id === id));
                            setAreas(orderedAreas);
                            taskService.reorderAreas(ids);
                        }}
                        onReorderProjects={(ids) => {
                            // We will rely on Firestore updates for the global list, 
                            // but we should technically sort local state too.
                            // But projects state contains ALL projects, we only have ID subset here.
                            // We will just call the service. Firestore listener handles the rest.
                            taskService.reorderProjects(ids);
                        }}
                        onAddProject={(areaId) => {
                            setCreatingProjectInArea(areaId);
                        }}
                        onProjectClick={setActiveProjectId}
                        activeProjectId={activeProjectId}
                        openMenu={(e, target) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuCoords({ x: rect.right, y: rect.bottom });
                            setActiveMenuProject(target);
                        }}
                        isGoogleConnected={isGoogleConnected}
                        googleLists={googleTaskLists}
                        // Creation Props
                        creatingProjectInArea={creatingProjectInArea}
                        newProjectName={newProjectName}
                        setNewProjectName={setNewProjectName}
                        onCreateProject={handleCreateProject}
                    />
                </div>

                {/* Sidebar Footer: Add Area + User & Notifications */}
                <div className="border-t border-gray-800/50 bg-gray-900/30">
                    <button
                        onClick={() => setIsCreatingArea(true)}
                        className={clsx(
                            "flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white transition-colors w-full py-4",
                            isEffectiveCollapsed ? "justify-center" : "px-4"
                        )}
                        title="Nueva Área"
                    >
                        <Plus className="w-4 h-4 bg-gray-800 rounded p-0.5" />
                        {!isEffectiveCollapsed && "Nueva Área"}
                    </button>


                </div>
            </aside >

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-950 relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                {
                    displayProject ? (
                        <>
                            <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-900/50 backdrop-blur-sm relative z-10">
                                <div className="flex items-center gap-4">


                                    <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg shadow-blue-900/20">
                                        <Layout className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                            {activeProjectId === 'my-tasks' ? (
                                                <div className="flex items-center gap-2 relative group cursor-pointer">
                                                    <span>Mis Tareas</span>
                                                    <span className="text-sm font-normal text-gray-400 flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-lg hover:bg-gray-700 transition-colors">
                                                        {(viewFilter.assignee === user.uid || !viewFilter.assignee) ? 'Mías' : (usersMap[viewFilter.assignee]?.displayName || 'Usuario')}
                                                        <ChevronDown className="w-4 h-4" />
                                                    </span>
                                                    <select
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        value={viewFilter.assignee || user.uid}
                                                        onChange={e => setViewFilter({ assignee: e.target.value })}
                                                    >
                                                        <option value={user.uid}>Mis Tareas</option>
                                                        {Object.values(usersMap).filter(u => u.id !== user.uid).map(u => (
                                                            <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                displayProject.name
                                            )}
                                            {displayProject.members?.length > 1 && (
                                                <button
                                                    onClick={() => setInviteModalProject(displayProject)}
                                                    className="bg-blue-900/50 text-blue-300 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1 hover:bg-blue-900/80 transition-colors cursor-pointer"
                                                >
                                                    <Users className="w-3 h-3" /> Compartido
                                                </button>
                                            )}
                                        </h1>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Briefcase className="w-3 h-3" />
                                            {areas.find(a => a.id === displayProject.areaId)?.name || 'Sin Área'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Nueva Tarea - Always Visible */}
                                    <button
                                        onClick={() => {
                                            setIsQuickAddExpanded(true);
                                            setTimeout(() => document.querySelector('input[placeholder="+ Nueva Tarea..."]')?.focus(), 100);
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="text-xs font-bold hidden sm:inline">Nueva Tarea</span>
                                    </button>

                                    {/* Invite Button - Project Context Only */}
                                    {(activeProjectId && !activeProjectId.startsWith('AREA:') && displayProject) && (
                                        <button
                                            onClick={() => setInviteModalProject(displayProject)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20"
                                            title="Gestionar Miembros"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            <span className="text-xs font-bold hidden sm:inline">Invitar</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => googleTasksService.syncAllProjects(projects)}
                                        disabled={isSyncingGoogle}
                                        className={clsx(
                                            "flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors border border-gray-700",
                                            isSyncingGoogle && "opacity-50 cursor-wait"
                                        )}
                                        title="Sincronizar con Google Tasks"
                                    >
                                        <RefreshCw className={clsx("w-4 h-4", isSyncingGoogle && "animate-spin")} />
                                        <span className="text-xs font-bold hidden sm:inline">Sync</span>
                                    </button>

                                    <div className="h-6 w-px bg-gray-700 mx-2"></div>
                                    <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                                        <button
                                            onClick={() => setViewMode('board')}
                                            className={clsx("p-2 rounded-md transition-all", viewMode === 'board' ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-gray-200")}
                                            title="Vista Tablero"
                                        >
                                            <Kanban className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('calendar')}
                                            className={clsx("p-2 rounded-md transition-all", viewMode === 'calendar' ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-gray-200")}
                                            title="Vista Calendario"
                                        >
                                            <CalendarIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('table')}
                                            className={clsx("p-2 rounded-md transition-all", viewMode === 'table' ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-gray-200")}
                                            title="Vista Tabla"
                                        >
                                            <Table className="w-4 h-4" />
                                        </button>
                                    </div>




                                </div>
                            </header>

                            <div className="flex-1 overflow-x-auto p-6 relative z-10 flex flex-col">
                                {activeProjectId?.startsWith('AREA:') ? (
                                    <AreaDashboard
                                        area={areas.find(a => a.id === activeProjectId.split(':')[1])}
                                        projects={projects.filter(p => p.areaId === activeProjectId.split(':')[1])}
                                        projectStats={projectStats}
                                    />
                                ) : (viewMode === 'calendar' && activeProjectId !== 'DEBUG_ALL') ? (
                                    <CalendarView tasks={tasks} onTaskClick={setSelectedTask} />
                                ) : viewMode === 'table' ? (
                                    <TableView tasks={tasks} onTaskClick={setSelectedTask} />
                                ) : viewMode === 'board' ? (
                                    <div className="flex h-full gap-6">
                                        {getColumns().map(col => {
                                            // Just filter the derived 'tasks' which already includes everything
                                            let colTasks = tasks.filter(t => (t.status || 'todo') === col.id);

                                            // SORT: Tickets First, then by Date
                                            colTasks.sort((a, b) => {
                                                const aIsTicket = a.text?.toLowerCase().includes('ticket #');
                                                const bIsTicket = b.text?.toLowerCase().includes('ticket #');

                                                if (aIsTicket && !bIsTicket) return -1;
                                                if (!aIsTicket && bIsTicket) return 1;

                                                // Secondary Sort: Created Desc (Newest First)
                                                // Handle Timestamp objects or raw dates
                                                const timeA = a.createdAt?.seconds || 0;
                                                const timeB = b.createdAt?.seconds || 0;
                                                return timeB - timeA;
                                            });

                                            return (
                                                <div
                                                    key={col.id}
                                                    className="w-80 flex-shrink-0 flex flex-col bg-gray-900/50 rounded-2xl border border-gray-800 backdrop-blur-sm"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <col.icon className={clsx("w-4 h-4", col.color)} />
                                                            <span className="font-bold text-gray-300 text-sm">{col.title}</span>
                                                            <span className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full font-mono">
                                                                {colTasks.length}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                                                        {isLoadingTasks ? (
                                                            <>
                                                                <TaskCardSkeleton />
                                                                <TaskCardSkeleton />
                                                                <TaskCardSkeleton />
                                                            </>
                                                        ) : (
                                                            <AnimatePresence mode='popLayout'>
                                                                {colTasks.length === 0 ? (
                                                                    <div className="h-full flex items-center justify-center min-h-[150px]">
                                                                        <EmptyState
                                                                            title="Sin tareas"
                                                                            description="Arrastra tareas aquí"
                                                                            className="opacity-70"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    colTasks.map(task => (
                                                                        <TaskCard
                                                                            key={task.id}
                                                                            task={task}
                                                                            onClick={setSelectedTask}
                                                                            onStatusChange={(status) => taskService.updateTask(task.id, { status })}
                                                                            onDragStart={handleDragStart}
                                                                            isMultiSelectMode={isMultiSelectMode}
                                                                            isSelected={selectedTaskIds.has(task.id)}
                                                                            onToggleSelection={toggleSelection}
                                                                            onManualLongPress={(id) => {
                                                                                setIsMultiSelectMode(true);
                                                                                toggleSelection(id);
                                                                            }}
                                                                            users={usersMap}
                                                                            isBlocked={task.dependencies?.some(depId => {
                                                                                const dep = firestoreTasks.find(t => t.id === depId);
                                                                                return dep && dep.status !== 'done';
                                                                            })}
                                                                            projectContext={activeProjectId === 'my-tasks' ? projects.find(p => p.id === task.projectId) : null}
                                                                        />
                                                                    ))
                                                                )}
                                                            </AnimatePresence>
                                                        )}
                                                        {col.id === 'todo' && (
                                                            <div className={clsx(
                                                                "mt-2 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden transition-all",
                                                                isQuickAddExpanded ? "shadow-lg ring-1 ring-blue-500/50" : "border-dashed bg-transparent"
                                                            )}>
                                                                <form onSubmit={handleAddTask}>
                                                                    <input
                                                                        className={clsx(
                                                                            "w-full bg-transparent px-4 py-3 text-sm text-gray-300 placeholder-gray-500 outline-none",
                                                                            !isQuickAddExpanded && "cursor-text"
                                                                        )}
                                                                        placeholder="+ Nueva Tarea..."
                                                                        value={newTaskText}
                                                                        onChange={e => setNewTaskText(e.target.value)}
                                                                        onFocus={() => setIsQuickAddExpanded(true)}
                                                                    />

                                                                    {/* Expanded Controls */}
                                                                    {isQuickAddExpanded && (
                                                                        <div className="px-4 pb-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200 border-t border-gray-800/50 pt-2">
                                                                            <div className="flex items-center gap-2">
                                                                                {/* Date Picker Trigger */}
                                                                                <div className="relative group flex items-center">
                                                                                    <input
                                                                                        type="date"
                                                                                        className="absolute inset-0 opacity-0 cursor-pointer w-8 z-10"
                                                                                        value={newTaskDate}
                                                                                        onChange={e => setNewTaskDate(e.target.value)}
                                                                                    />
                                                                                    <button type="button" className={clsx("p-1.5 rounded hover:bg-gray-800 transition-colors relative", newTaskDate ? "text-blue-400 bg-blue-400/10" : "text-gray-500")}>
                                                                                        <Calendar className="w-4 h-4" />
                                                                                    </button>
                                                                                    {newTaskDate && <span className="ml-1 text-[10px] text-blue-400 font-mono">{new Date(newTaskDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}</span>}
                                                                                </div>

                                                                                {/* Assignee Trigger (Simple Toggle Me) */}
                                                                                <div className="relative">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setNewTaskAssignees(prev =>
                                                                                                prev.includes(user.uid)
                                                                                                    ? prev.filter(id => id !== user.uid)
                                                                                                    : [...prev, user.uid]
                                                                                            );
                                                                                        }}
                                                                                        className={clsx("p-1.5 rounded hover:bg-gray-800 transition-colors flex items-center gap-1", newTaskAssignees.includes(user.uid) ? "text-green-400 bg-green-400/10" : "text-gray-500")}
                                                                                        title="Asignar a mí"
                                                                                    >
                                                                                        <Users className="w-4 h-4" />
                                                                                        {newTaskAssignees.length > 0 && <span className="text-xs font-bold">{newTaskAssignees.length}</span>}
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setIsQuickAddExpanded(false)}
                                                                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                                                                >
                                                                                    <X className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    type="submit"
                                                                                    disabled={!newTaskText.trim()}
                                                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    Crear
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </form>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="max-w-4xl mx-auto space-y-2">
                                        {tasks.map(task => (
                                            <div key={task.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                                                <div className="font-medium text-gray-200">{task.text}</div>
                                                <div className="text-xs text-gray-500 uppercase font-bold px-2 py-1 bg-gray-900 rounded">{task.status || 'todo'}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 p-8">
                            <div className="max-w-2xl w-full">
                                <h2 className="text-3xl font-bold text-white mb-8 text-center bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    ¿Cómo organizamos el trabajo?
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Step 1: Area */}
                                    <div
                                        onClick={() => {
                                            setIsCreatingArea(true);
                                            toast("✍️ Escribe el nombre de tu nueva área.", { icon: '🏢' });
                                        }}
                                        className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 hover:bg-gray-800/50 transition-all cursor-pointer transform hover:-translate-y-1"
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Briefcase className="w-16 h-16 text-blue-500" />
                                        </div>
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                            1. Crear Área
                                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                        </h3>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            Haz clic para crear tu primer departamento o unidad de negocio (ej. Taller).
                                        </p>
                                    </div>

                                    {/* Step 2: Project */}
                                    <div
                                        onClick={() => {
                                            if (areas.length > 0) {
                                                const firstArea = areas[0];
                                                setExpandedAreas(prev => ({ ...prev, [firstArea.id]: true }));
                                                setCreatingProjectInArea(firstArea.id);
                                                toast(`📂 Creando proyecto en: ${firstArea.name}`, { icon: '✨' });
                                            } else {
                                                toast("⚠️ Primero crea un Área (Paso 1).", { icon: '1️⃣' });
                                                setIsCreatingArea(true);
                                            }
                                        }}
                                        className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 hover:bg-gray-800/50 transition-all cursor-pointer transform hover:-translate-y-1"
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Layout className="w-16 h-16 text-purple-500" />
                                        </div>
                                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                                            <Hash className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                            2. Crear Proyecto
                                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                                        </h3>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            {areas.length > 0 ? "Haz clic para añadir un proyecto a tu primera área." : "Una carpeta de trabajo específica. Requiere un Área previa."}
                                        </p>
                                    </div>

                                    {/* Step 3: Task */}
                                    <div
                                        onClick={() => {
                                            if (projects.length > 0) {
                                                const firstProject = projects[0];
                                                setActiveProjectId(firstProject.id);
                                                toast(`🚀 Seleccionado: ${firstProject.name}`, { icon: '👋' });
                                            } else {
                                                if (areas.length > 0) {
                                                    toast("⚠️ Aún no tienes proyectos. Crea uno ahora.", { icon: '2️⃣' });
                                                    // Trigger step 2 logic
                                                    const firstArea = areas[0];
                                                    setExpandedAreas(prev => ({ ...prev, [firstArea.id]: true }));
                                                    setCreatingProjectInArea(firstArea.id);
                                                } else {
                                                    toast("⚠️ Comienza por el Paso 1: Crear Área.", { icon: '1️⃣' });
                                                    setIsCreatingArea(true);
                                                }
                                            }
                                        }}
                                        className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden group hover:border-green-500/50 hover:bg-gray-800/50 transition-all cursor-pointer transform hover:-translate-y-1"
                                    >
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <CheckCircle2 className="w-16 h-16 text-green-500" />
                                        </div>
                                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mb-4 text-green-400 group-hover:bg-green-500/20 transition-colors">
                                            <div className="font-bold">3</div>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                            3. Crear Tarea
                                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-green-400" />
                                        </h3>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            {projects.length > 0 ? "Haz clic para ir al tablero y crear tareas." : "La unidad de acción. Se crean dentro de un Proyecto."}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-12 text-center text-gray-500 text-sm">
                                    <p>👈 Selecciona o crea un <strong>Área</strong> en el menú lateral para comenzar.</p>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Bulk Actions Bar */}
                <AnimatePresence>
                    {isMultiSelectMode && (
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50"
                            data-bulk-bar="true"
                        >
                            <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded-full text-xs">
                                {selectedTaskIds.size}
                            </span>
                            <div className="h-4 w-px bg-gray-700"></div>
                            <button onClick={handleBulkComplete} className="flex items-center gap-2 hover:text-green-400 text-gray-300 transition-colors">
                                <CheckCircle2 className="w-4 h-4" /> Completar
                            </button>
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-400 text-gray-300 transition-colors">
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>

                            <div className="h-4 w-px bg-gray-700"></div>

                            {/* Assignee Picker */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsAssignMenuOpen(!isAssignMenuOpen)}
                                    className={clsx("flex items-center gap-2 hover:text-blue-400 text-gray-300 transition-colors", isAssignMenuOpen && "text-blue-400")}
                                >
                                    <UserPlus className="w-4 h-4" /> Asignar
                                </button>
                                {isAssignMenuOpen && (
                                    <>
                                        {/* Backdrop to close */}
                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsAssignMenuOpen(false)}></div>
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-1 min-w-[150px] z-[70]">
                                            {Object.values(usersMap)
                                                .filter(u => {
                                                    if (!activeProject) return true; // Fallback
                                                    const isMember = activeProject.members?.includes(u.id);
                                                    const isOwner = activeProject.ownerId === u.id;
                                                    const isSelf = u.id === user?.uid;
                                                    return isMember || isOwner || isSelf;
                                                })
                                                .map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => {
                                                            handleBulkAssign(u.id);
                                                            setIsAssignMenuOpen(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 rounded flex items-center gap-2"
                                                    >
                                                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400">
                                                            {(u.displayName || u.email || '?')[0].toUpperCase()}
                                                        </div>
                                                        <span className="truncate">{u.displayName || u.email}</span>
                                                    </button>
                                                ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Date Picker */}
                            <div className="relative">
                                <label className="flex items-center gap-2 hover:text-yellow-400 text-gray-300 transition-colors cursor-pointer">
                                    <Calendar className="w-4 h-4" /> Fecha
                                    <input
                                        type="date"
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                        onChange={(e) => handleBulkDueDate(e.target.value)}
                                    />
                                </label>
                            </div>

                            <div className="h-4 w-px bg-gray-700"></div>

                            <button onClick={quitMultiSelect} className="text-gray-500 hover:text-white">
                                <X className="w-4 h-4" /> Cancelar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main >






            {renderMenu()}

            < AnimatePresence >
                {inviteModalProject && (
                    <UserInviteModal
                        isOpen={!!inviteModalProject}
                        project={inviteModalProject}
                        onClose={() => setInviteModalProject(null)}
                        onInvite={handleInviteUsers}
                    />
                )}
            </AnimatePresence >

            <AnimatePresence>
                {editModalItem && (
                    <EditProjectModal
                        isOpen={!!editModalItem}
                        item={editModalItem}
                        type={editModalItem.type}
                        onClose={() => setEditModalItem(null)}
                        onSave={handleUpdateItem}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailPanel
                        task={selectedTask}
                        project={activeProject}
                        allTasks={firestoreTasks}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={(taskId, updates) => {
                            // Optimistic updates handled by type
                            if (selectedTask?.type === 'google') {
                                setGoogleTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
                            } else {
                                setFirestoreTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
                            }
                            setSelectedTask(prev => ({ ...prev, ...updates }));
                        }}
                        onDelete={(taskId) => {
                            // Robust Delete: Remove from ALL possible local states immediately
                            setOptimisticTasks(prev => prev.filter(t => t.id !== taskId));
                            setFirestoreTasks(prev => prev.filter(t => t.id !== taskId));
                            setGoogleTasks(prev => prev.filter(t => t.id !== taskId));
                            setSelectedTask(null);

                            // Then call service
                            taskService.deleteTask(taskId);
                        }}
                    />
                )}
            </AnimatePresence>



        </div >
    );
}
