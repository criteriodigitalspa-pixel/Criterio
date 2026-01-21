import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    ChevronRight, Briefcase, Plus, Hash, MoreVertical, UserPlus, Trash2, CheckSquare, Users, Folder, Layout, BarChart2
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { getIconComponent } from '../projects/EditProjectModal';

// --- SORTABLE ITEMS ---

function SortableProjectItem({ project, isActive, isCollapsed, onClick, isGoogleConnected, googleLists, openMenu, stats }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: project.id, data: { type: 'project', project } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const isSynced = isGoogleConnected && googleLists.some(l => l.title.toLowerCase() === project.name.toLowerCase());

    // Stats Logic
    const hasStats = stats && stats.total > 0;
    // console.log(`[Sidebar] Project ${project.name} stats:`, stats);
    const progress = hasStats ? (stats.completed / stats.total) * 100 : 0;

    // Dynamic Icon
    const ProjectIcon = getIconComponent(project.icon || 'hash');

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={clsx(
                "cursor-pointer rounded-lg transition-all relative group touch-none border border-transparent",
                isActive
                    ? "bg-gray-800/80 text-white shadow-lg border-gray-700/50"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30",
                isCollapsed ? "w-10 h-10 flex items-center justify-center my-1 mx-auto" : "p-2.5 mx-2 mb-1"
            )}
            title={project.name}
        >
            <div className={clsx("flex items-center gap-3", isCollapsed && "justify-center")}>
                <ProjectIcon className={clsx("shrink-0 transition-colors",
                    isActive ? "text-blue-400" : "text-gray-600 group-hover:text-gray-400",
                    isCollapsed ? "w-5 h-5" : "w-4 h-4"
                )} />

                {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className={clsx("truncate font-medium text-sm leading-none", isActive ? "text-gray-100" : "text-gray-400")}>
                                    {project.name}
                                </span>
                                {project.members && project.members.length > 1 && (
                                    <Users className="w-3 h-3 text-purple-400 shrink-0 opacity-70" aria-label="Compartido" />
                                )}
                            </div>
                        </div>

                        {/* Stats Row */}
                        {hasStats && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <div className="h-1 flex-1 bg-gray-700/50 rounded-full overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full transition-all duration-500",
                                            progress === 100 ? "bg-green-500" : "bg-blue-500"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className={clsx("text-[10px] font-mono", progress === 100 ? "text-green-400" : "text-gray-500")}>
                                    {stats.completed}/{stats.total}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Menu Trigger */}
            {!isCollapsed && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openMenu(e, { id: project.id, type: 'project', name: project.name, icon: project.icon });
                        }}
                        className="p-1 hover:bg-gray-700 rounded text-gray-500 hover:text-white"
                    >
                        <MoreVertical className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Synced Dot (Corner) */}
            {isSynced && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm ring-1 ring-gray-900" />
            )}
        </div>
    );
}

function SortableAreaItem({
    area,
    projects,
    isExpanded,
    toggleExpand,
    isActive,
    isCollapsed,
    onAddProject,
    onProjectClick,
    activeProjectId,
    isGoogleConnected,
    googleLists,
    openMenu,
    // Creation Props
    creatingProjectInArea,
    onCreateProject,
    setCreatingProjectInArea,
    projectStats = {}
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: area.id, data: { type: 'area', area } });

    const [newProjectName, setNewProjectName] = useState('');

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    // Filter projects for this area
    const areaProjects = projects.filter(p => p.areaId === area.id);

    // Dynamic Area Icon
    const AreaIcon = getIconComponent(area.icon || 'briefcase');

    return (
        <div ref={setNodeRef} style={style} className="touch-none mb-1">
            {/* AREA HEADER */}
            <div
                className={clsx(
                    "flex items-center cursor-pointer px-2 py-1.5 rounded-lg hover:bg-gray-900 transition-colors group/area relative",
                    isCollapsed && "justify-center"
                )}
                {...attributes}
                {...listeners}
                onClick={() => toggleExpand(area.id)}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onProjectClick(`AREA:${area.id}`);
                }}
            >
                {isCollapsed ? (
                    <AreaIcon className="w-5 h-5 text-blue-400/80" />
                ) : (
                    <>
                        <div className="flex items-center gap-2 text-gray-300 font-medium text-sm flex-1 truncate">
                            <div className={clsx("transition-transform duration-200", isExpanded ? "rotate-90" : "")}>
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            </div>
                            <AreaIcon className="w-4 h-4 text-blue-400/80" />
                            <span className="truncate">{area.name}</span>
                        </div>

                        {/* Menu Trigger */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onProjectClick(`AREA:${area.id}`);
                                }}
                                className="p-1 hover:bg-gray-700 rounded text-gray-500 hover:text-blue-400 opacity-70 hover:opacity-100 transition-opacity"
                                title="Ver Dashboard de Área"
                            >
                                <BarChart2 className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openMenu(e, { id: area.id, type: 'area', name: area.name, icon: area.icon });
                                }}
                                className="p-1 hover:bg-gray-800 rounded text-gray-500"
                            >
                                <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddProject(area.id);
                                }}
                                className="p-1 hover:bg-gray-800 rounded text-gray-500 ml-1"
                                title="Nuevo Proyecto"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Create Project Input */}
            <AnimatePresence>
                {creatingProjectInArea === area.id && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-2 mb-2 ml-6"
                    >
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            onCreateProject(e, area.id, newProjectName, setNewProjectName);
                        }}>
                            <input
                                autoFocus
                                className="w-full bg-gray-900 border border-blue-500 rounded px-2 py-1 text-xs text-white outline-none"
                                placeholder="Nombre del proyecto..."
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                            // If we blur without name, maybe cancel? Parent handles logic usually.
                            // onBlur={() => !newProjectName && onCancelCreate()}
                            />
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PROJECTS LIST (NESTED SORTABLE) */}
            <AnimatePresence>
                {(isExpanded || isCollapsed || creatingProjectInArea === area.id) && ( // Keep open if creating
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={clsx(
                            "space-y-0.5",
                            !isCollapsed && "ml-3 pl-2 border-l border-gray-800",
                            isCollapsed && "flex flex-col items-center"
                        )}
                    >
                        <SortableContext
                            items={areaProjects.map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {areaProjects.map(p => (
                                <SortableProjectItem
                                    key={p.id}
                                    project={p}
                                    isActive={activeProjectId === p.id}
                                    isCollapsed={isCollapsed}
                                    onClick={() => onProjectClick(p.id)}
                                    isGoogleConnected={isGoogleConnected}
                                    googleLists={googleLists}
                                    openMenu={openMenu}
                                    onCreateProject={onCreateProject}
                                    setCreatingProjectInArea={setCreatingProjectInArea}
                                    stats={projectStats[p.id] || { total: 0, completed: 0 }}
                                />
                            ))}
                        </SortableContext>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- MAIN SIDEBAR COMPONENT ---

export default function SidebarList({
    areas,
    projects,
    expandedAreas,
    toggleExpand,
    isCollapsed,
    // Actions
    onReorderAreas,
    onReorderProjects,
    onAddProject,
    onProjectClick,
    activeProjectId,
    openMenu,
    // External State
    isGoogleConnected,
    googleLists,
    // Creation Props
    creatingProjectInArea,
    onCreateProject,
    setCreatingProjectInArea,
    projectStats
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [activeDragItem, setActiveDragItem] = useState(null);

    const handleDragStart = (event) => {
        const { active } = event;
        // active.data.current contains the data passed to useSortable
        setActiveDragItem(active.data.current);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;
        if (active.id === over.id) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type; // Might be undefined if dropping on container

        // REORDER AREAS
        if (activeType === 'area') {
            const oldIndex = areas.findIndex(a => a.id === active.id);
            const newIndex = areas.findIndex(a => a.id === over.id);
            if (newIndex !== -1) {
                const newOrder = arrayMove(areas, oldIndex, newIndex);
                onReorderAreas(newOrder.map(a => a.id));
            }
        }

        // REORDER PROJECTS
        if (activeType === 'project') {
            // Ensure we are in the same area or check logic
            // Assuming flat list of projects? No, projects are filtered by Area in rendering.
            // DndKit with multiple containers (SortableContexts) automatically handles this if IDs are unique.
            // We need to find the full list of projects to reorder.

            // Note: If dragging between areas is disallowed, we only reorder within same area.
            // Current Implementation: 'projects' prop contains ALL projects.

            // Find parent Area for both
            const activeProject = projects.find(p => p.id === active.id);
            const overProject = projects.find(p => p.id === over.id);

            if (activeProject && overProject && activeProject.areaId === overProject.areaId) {
                // Same Area Reorder
                const areaProjects = projects.filter(p => p.areaId === activeProject.areaId);
                const oldIndex = areaProjects.findIndex(p => p.id === active.id);
                const newIndex = areaProjects.findIndex(p => p.id === over.id);

                // Construct new FULL list
                // We need to simulate the move on the subset, then map back to global list?
                // Easier: Just pass the new ordered IDs of THAT area to the handler
                // Handler should handle "updating these specific projects' orders"

                const newAreaOrder = arrayMove(areaProjects, oldIndex, newIndex);
                onReorderProjects(newAreaOrder.map(p => p.id));
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* PERSONAL WORKSPACE SECTION */}
            <div className="mb-6">
                {!isCollapsed && (
                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">
                        Espacio Personal
                    </h3>
                )}

                <div
                    onClick={() => onProjectClick('my-tasks')}
                    className={clsx(
                        "cursor-pointer transition-all group relative mx-2 mb-1",
                        isCollapsed ? "w-10 h-10 flex items-center justify-center rounded-xl mx-auto" : "p-3 rounded-xl flex items-center gap-3",
                        activeProjectId === 'my-tasks'
                            ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-900/20"
                            : "bg-gray-800/30 text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent hover:border-gray-700"
                    )}
                >
                    <div className={clsx("p-1.5 rounded-lg transition-colors",
                        activeProjectId === 'my-tasks' ? "bg-blue-500 text-white shadow-sm" : "bg-gray-700/50 text-gray-400 group-hover:text-white"
                    )}>
                        <CheckSquare className="w-4 h-4" />
                    </div>

                    {!isCollapsed && (
                        <div className="flex-1">
                            <span className="text-sm font-bold block leading-none mb-0.5">Mis Tareas</span>
                            <span className="text-[10px] text-gray-500 opacity-80 group-hover:opacity-100 transition-opacity">
                                Dashboard Personal
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* BUSINESS AREAS SECTION */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!isCollapsed && (
                    <div className="flex items-center justify-between px-4 mb-2 sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10 py-1">
                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Espacios de Trabajo
                        </h3>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openMenu(e, { type: 'create_area' }); // Trigger a menu or a callback? 
                                // Actually, let's just use a callback if available or open the creation modal
                                // Since we don't have 'onCreateArea' prop explicitly mapped to a modal here,
                                // we might need to assume Parent handles 'create_area' in the menu or passed a prop.
                                // Let's check props. checking... 'onCreateArea' is NOT passed.
                                // But 'openMenu' is passed.
                                // Alternatively, simply emit a custom event or use an unused prop?
                                // Let's use a new prop 'onCreateArea' which we will add to TaskManager.
                            }}
                            // Wait, simpler: TaskManager uses `setIsCreatingArea(true)`.
                            // I should add `onCreateArea` to the props of SidebarList.
                            className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white transition-colors"
                            title="Crear Nueva Área"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                <SortableContext
                    items={areas.map(a => a.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {areas.map(area => (
                        <SortableAreaItem
                            key={area.id}
                            area={area}
                            projects={projects}
                            isExpanded={expandedAreas[area.id]}
                            toggleExpand={toggleExpand}
                            isCollapsed={isCollapsed}
                            onAddProject={onAddProject}
                            onProjectClick={onProjectClick}
                            activeProjectId={activeProjectId}
                            isActive={false} // Areas not active themselves usually
                            isGoogleConnected={isGoogleConnected}
                            googleLists={googleLists}
                            openMenu={openMenu}
                            creatingProjectInArea={creatingProjectInArea}
                            onCreateProject={onCreateProject}
                            setCreatingProjectInArea={setCreatingProjectInArea}
                            projectStats={projectStats}
                        />
                    ))}
                </SortableContext>
            </div>

            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                {activeDragItem?.type === 'area' && (
                    <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 shadow-xl opacity-90 cursor-grabbing flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-200 font-bold">{activeDragItem.area.name}</span>
                    </div>
                )}
                {activeDragItem?.type === 'project' && (
                    <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 shadow-xl opacity-90 cursor-grabbing flex items-center gap-2">
                        <Hash className="w-4 h-4 text-purple-400" />
                        <span className="text-gray-200">{activeDragItem.project.name}</span>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
