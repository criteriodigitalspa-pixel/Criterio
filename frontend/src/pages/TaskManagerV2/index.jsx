import React, { useState } from 'react';
import { useTaskBoard } from './useTaskBoard';
import SidebarList from '../../components/tasks/SidebarList';
import TableView from '../../components/tasks/TableView';
import TaskDetailPanel from '../../components/tasks/TaskDetailPanel';
import { Layout, Table, Kanban, Plus, Menu } from 'lucide-react';
import UserMenu from '../../components/layout/UserMenu';

export default function TaskManagerV2() {
    const {
        areas,
        projects,
        tasks,
        activeTypeId,
        activeProject,
        isLoading,
        viewMode,
        setActiveTypeId,
        setViewMode,
        createTask,
        updateTask,
        deleteTask
    } = useTaskBoard();

    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [newTaskText, setNewTaskText] = useState('');

    // UI State for Sidebar
    const [expandedAreas, setExpandedAreas] = useState({});

    const toggleExpand = (areaId) => {
        setExpandedAreas(prev => ({
            ...prev,
            [areaId]: !prev[areaId]
        }));
    };

    // --- QUICK ADD ---
    const handleQuickAdd = async (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        await createTask(newTaskText);
        setNewTaskText('');
    };

    return (
        <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">

            {/* SIDEBAR */}
            <aside className={`border-r border-gray-800 bg-gray-900/50 backdrop-blur-xl transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-16'} flex flex-col`}>
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    {isSidebarOpen && <span className="font-bold tracking-widest text-xs text-gray-500 uppercase">Espacios</span>}
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-gray-800 rounded">
                        <Menu className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <SidebarList
                        areas={areas}
                        projects={projects}
                        activeProjectId={activeTypeId}
                        onProjectClick={setActiveTypeId}
                        isCollapsed={!isSidebarOpen}

                        // Connected State
                        expandedAreas={expandedAreas}
                        toggleExpand={toggleExpand}

                        // Reordering & Actions (Future Implementation & Fixes)
                        onReorderAreas={() => { }}
                        onReorderProjects={() => { }}
                        onAddProject={() => { }}
                        openMenu={() => { }}
                        projectStats={{}}
                    />
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-w-0 relatives">
                {/* HEADER */}
                <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-${activeProject?.color || 'blue'}-600/20 text-${activeProject?.color || 'blue'}-400`}>
                            <Layout className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{activeProject?.name || 'Cargando...'}</h1>
                            <span className="text-xs text-gray-500">{tasks.length} tareas</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded ${viewMode === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Table className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-2 rounded ${viewMode === 'board' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Kanban className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="ml-4 pl-4 border-l border-gray-700">
                        <UserMenu />
                    </div>
                </header>

                {/* VIEW AREA */}
                <div className="flex-1 overflow-auto p-6 relative">
                    {/* INPUT BAR */}
                    <form onSubmit={handleQuickAdd} className="mb-6">
                        <div className="relative group">
                            <input
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="+ Nueva tarea"
                                className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 pl-12 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none group-hover:bg-gray-800/50"
                            />
                            <Plus className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        </div>
                    </form>

                    {/* CONTENT */}
                    {isLoading ? (
                        <div className="text-center py-20 text-gray-500 animate-pulse">Cargando datos...</div>
                    ) : viewMode === 'table' ? (
                        <TableView tasks={tasks} onTaskClick={setSelectedTask} />
                    ) : (
                        <div className="text-center py-20 text-gray-500">
                            Vista de Tablero (Kanban) en construcción para V2. Usar Tabla por ahora.
                        </div>
                    )}
                </div>
            </main>

            {/* DETAIL PANEL */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailPanel
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={updateTask}
                        onDelete={(id) => { deleteTask(id); setSelectedTask(null); }}
                        allTasks={tasks} // For dependencies
                    />
                )}
            </AnimatePresence>

        </div>
    );
}
