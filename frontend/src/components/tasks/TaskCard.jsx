import { useState, useRef } from 'react';
import { Check, List as ListIcon, Clock, CheckSquare, AlertCircle, Link, Ticket } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function TaskCard({
    task,
    onClick,
    onStatusChange,
    onDragStart,
    // Multi-Select Props
    isMultiSelectMode,
    isSelected,
    onToggleSelection,
    onManualLongPress,
    users = {}, // Default to empty object
    isBlocked = false, // NEW
    projectContext = null // NEW: For My Tasks view
}) {
    const pressTimer = useRef(null);
    const [isShaking, setIsShaking] = useState(false);

    const handlePointerDown = (e) => {
        if (e.button !== 0) return;
        pressTimer.current = setTimeout(() => {
            if (onManualLongPress) onManualLongPress(task.id);
        }, 600);
    };

    const handlePointerUp = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    };

    const hasPendingSubtasks = task.subtasks?.some(st => !st.completed);

    const handleAttemptComplete = (e) => {
        e.stopPropagation();

        if (task.status !== 'done') {
            if (isBlocked) {
                // BLOCK COMPLETION (Dependencies)
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500);
                toast.error("Tarea bloqueada por dependencias", {
                    icon: <Link className="w-5 h-5 text-red-500" />
                });
                return;
            }

            if (hasPendingSubtasks) {
                // BLOCK COMPLETION (Subtasks)
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 500);
                toast.error("Completa las sub-tareas pendientes primero", {
                    icon: <AlertCircle className="w-5 h-5 text-red-500" />
                });
                // Open details to show them
                onClick(task);
                return;
            }
        }

        onStatusChange(task.status === 'done' ? 'todo' : 'done');
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={isShaking ? { x: [-5, 5, -5, 5, 0] } : { x: 0, opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.2 }}
            draggable={!isMultiSelectMode}
            onDragStart={(e) => !isMultiSelectMode && onDragStart(e, task.id)}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={(e) => {
                if (isMultiSelectMode) {
                    onToggleSelection(task.id);
                } else {
                    onClick(task);
                }
            }}
            onContextMenu={(e) => {
                // e.preventDefault(); 
            }}
            className={clsx(
                "bg-gray-800 p-4 rounded-xl border transition-all shadow-lg active:scale-95 touch-manipulation relative",
                isMultiSelectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing hover:-translate-y-1",
                isSelected
                    ? "border-blue-500 ring-1 ring-blue-500 bg-blue-900/10"
                    : (isShaking ? "border-red-500 ring-1 ring-red-500" : "border-gray-700 hover:border-blue-500/50"),
                task.status === 'done' && !isSelected && "opacity-60 grayscale bg-gray-900 border-gray-800"
            )}
            data-task-card="true"
        >
            {/* Project Context Badge (My Tasks View) */}
            {projectContext && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-900/50 border border-gray-700/50 text-[10px] text-gray-400 font-medium">
                    <span className="truncate max-w-[80px]">{projectContext.name}</span>
                </div>
            )}

            {/* Selection Checkbox Overlay */}
            {isMultiSelectMode && (
                <div className="absolute top-2 right-2 z-10">
                    <div className={clsx(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        isSelected ? "bg-blue-500 border-blue-500" : "bg-gray-800 border-gray-500"
                    )}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                </div>
            )}

            <div className="flex items-start gap-3">
                {!isMultiSelectMode && (
                    <div
                        onClick={handleAttemptComplete}
                        className={clsx(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all mt-0.5 shrink-0",
                            task.status === 'done'
                                ? "bg-green-500 border-green-500 text-white"
                                : (hasPendingSubtasks && isShaking ? "border-red-500 bg-red-500/10" : "border-gray-600 hover:border-blue-500 hover:bg-blue-500/10")
                        )}
                    >
                        {task.status === 'done' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                )}

                <div className={clsx("text-sm font-medium text-gray-200 mb-2 leading-relaxed flex-1", task.status === 'done' && "line-through text-gray-500")}>
                    {task.text}

                    {/* Ticket Badge */}
                    {task.text?.includes('Ticket #') && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 ml-2 rounded bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30 font-mono">
                            <Ticket className="w-3 h-3" /> Ticket
                        </span>
                    )}

                    {/* Tags */}
                    {task.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-300 text-[10px] rounded border border-blue-500/20">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
                <div className="flex items-center gap-3">
                    {/* Blocked Indicator */}
                    {isBlocked && (
                        <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold animate-pulse" title="Bloqueada por otra tarea">
                            <Link className="w-3 h-3" />
                        </div>
                    )}
                    {/* Subtasks Count */}
                    {(task.subtasks?.length > 0) && (
                        <div className="flex flex-col gap-1">
                            <div className={clsx(
                                "flex items-center gap-1 text-[10px]",
                                (hasPendingSubtasks && isShaking) ? "text-red-400 font-bold" : "text-gray-500"
                            )}>
                                <ListIcon className="w-3 h-3" />
                                {task.subtasks.filter(t => t.completed).length}/{task.subtasks.length}
                            </div>
                            {/* Tiny Progress Bar */}
                            <div className="h-0.5 w-12 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${(task.subtasks.filter(t => t.completed).length / task.subtasks.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {/* Date */}
                    <div className={clsx("flex items-center gap-1 text-[10px]", isShaking ? "text-red-400" : "text-gray-500")}>
                        <Clock className="w-3 h-3" />
                        {task.createdAt?.seconds ? new Date(task.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Hoy'}
                    </div>
                </div>

                {/* AVATARS & PRIORITY */}
                <div className="flex items-center gap-2">
                    {/* Priority Badge */}
                    {task.priority && (
                        <span className={clsx(
                            "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border",
                            task.priority === 'High' ? "bg-red-900/30 text-red-400 border-red-800" :
                                task.priority === 'Medium' ? "bg-yellow-900/30 text-yellow-400 border-yellow-800" :
                                    "bg-blue-900/30 text-blue-400 border-blue-800"
                        )}>
                            {task.priority === 'Medium' ? 'Med' : task.priority}
                        </span>
                    )}

                    {/* Assigned Users Avatars */}
                    {task.assignedTo && task.assignedTo.length > 0 && (
                        <div className="flex -space-x-2">
                            {task.assignedTo.map(uid => {
                                const user = users[uid];
                                if (!user) return null; // Or placeholder
                                return (
                                    <div key={uid} className="relative group/avatar">
                                        {user.photoURL ? (
                                            <img
                                                src={user.photoURL}
                                                alt={user.displayName}
                                                className="w-5 h-5 rounded-full border border-gray-800 object-cover"
                                            />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border border-gray-800 bg-gray-700 flex items-center justify-center text-[8px] text-white">
                                                {user.displayName?.charAt(0) || '?'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Time Range Badge (New) */}
            {(task.startTime || task.endTime) && (
                <div className="bg-gray-700/50 rounded px-2 py-1 mt-2 text-[10px] text-gray-400 font-mono inline-block">
                    {task.startTime || '?'} - {task.endTime || '?'}
                </div>
            )}
        </motion.div>
    );
}
