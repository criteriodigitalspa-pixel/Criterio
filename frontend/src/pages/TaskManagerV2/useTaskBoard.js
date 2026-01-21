import { useState, useEffect, useMemo, useCallback } from 'react';
import taskServiceV2 from '../../services/taskServiceV2';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export function useTaskBoard() {
    const { user } = useAuth();

    // --- STATE ---
    const [areas, setAreas] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Selection
    const [activeTypeId, setActiveTypeId] = useState('my-tasks'); // 'my-tasks' | projectId
    const [activeProject, setActiveProject] = useState(null);

    // Metadata
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('table'); // Default to Table as requested

    // --- SUBSCRIPTIONS ---

    // 1. Load Structure (Areas & Projects)
    useEffect(() => {
        if (!user?.uid) return;

        const unsubAreas = taskServiceV2.subscribeToAreas(user.uid, setAreas);
        const unsubProjects = taskServiceV2.subscribeToProjects(user.uid, setProjects);
        return () => { unsubAreas(); unsubProjects(); };
    }, [user?.uid]);

    // 2. Load Tasks (Based on Selection)
    useEffect(() => {
        setTasks([]); // CLEAR TABLE INSTANTLY ON SWITCH
        setIsLoading(true);

        let unsub = () => { };

        if (activeTypeId === 'my-tasks' && user?.uid) {
            unsub = taskServiceV2.subscribeToUserTasks(user.uid, (data) => {
                setTasks(data);
                setIsLoading(false);
            });
            setActiveProject({ id: 'my-tasks', name: 'Mis Tareas', color: 'blue' });
        } else if (activeTypeId) {
            // It's a project ID
            unsub = taskServiceV2.subscribeToProjectTasks(activeTypeId, user?.uid, (data) => {
                setTasks(data);
                setIsLoading(false);
            });

            // Find project metadata for UI
            const proj = projects.find(p => String(p.id) === String(activeTypeId));
            setActiveProject(proj || { id: activeTypeId, name: 'Proyecto', color: 'gray' });
        } else {
            setIsLoading(false);
        }

        return () => unsub();
    }, [activeTypeId, user?.uid, projects]); // Depend on projects to update metadata if loaded late

    // --- ACTIONS ---

    const handleCreateTask = async (text, details = {}) => {
        if (!text.trim()) return;
        if (!activeTypeId && activeTypeId !== 'my-tasks') return;

        const taskData = {
            text,
            projectId: activeTypeId === 'my-tasks' ? null : activeTypeId,
            assignedTo: activeTypeId === 'my-tasks' ? [user.uid] : [],
            status: 'todo',
            ...details
        };

        // Optimistic UI (Optional, maybe skip for V2 safety first?)
        // Let's rely on fast Firestore for now to avoid "Ghost" bugs.
        await taskServiceV2.createTask(taskData);
    };

    const handleUpdateTask = async (taskId, updates) => {
        // Optimistic
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        await taskServiceV2.updateTask(taskId, updates);
    };

    const handleDeleteTask = async (taskId) => {
        // Optimistic
        setTasks(prev => prev.filter(t => t.id !== taskId));
        await taskServiceV2.deleteTask(taskId);
    };

    const handleMoveTask = (taskId, newStatus, newIndex) => {
        // Complex Kanban logic will go here
        // For now, basic status update
        handleUpdateTask(taskId, { status: newStatus });
    };

    // --- EXPORTS ---
    return {
        // Data
        areas,
        projects,
        tasks,
        activeTypeId,
        activeProject,
        isLoading,
        viewMode,

        // State Setters
        setActiveTypeId,
        setViewMode,

        // Actions
        createTask: handleCreateTask,
        updateTask: handleUpdateTask,
        deleteTask: handleDeleteTask,
        moveTask: handleMoveTask
    };
}
