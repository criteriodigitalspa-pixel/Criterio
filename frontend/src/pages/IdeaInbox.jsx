import { useState, useEffect } from 'react';
import { ideaService } from '../services/ideaService';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Trash2, ArrowRightCircle, CheckCircle2, Search, Filter } from 'lucide-react';
import Masonry from 'react-masonry-css';
import clsx from 'clsx';
import TaskDetailPanel from '../components/tasks/TaskDetailPanel';

export default function IdeaInbox({ activeProjectId }) {
    const [ideas, setIdeas] = useState([]);
    const [filter, setFilter] = useState('');

    // For converting to task
    const [convertingIdea, setConvertingIdea] = useState(null);

    useEffect(() => {
        const unsubscribe = ideaService.subscribeIDEAS(setIdeas);
        return () => unsubscribe();
    }, []);

    const filteredIdeas = ideas.filter(idea =>
        !idea.converted && // Hide converted ones by default? Or show them? Let's hide active inbox.
        (idea.title?.toLowerCase().includes(filter.toLowerCase()) ||
            idea.summary?.toLowerCase().includes(filter.toLowerCase()))
    );

    const handleDelete = async (id) => {
        if (confirm('¿Eliminar idea?')) {
            await ideaService.deleteIdea(id);
        }
    };

    const handleConvertStart = (idea) => {
        // Create a "Draft" task object from the idea
        const draftTask = {
            id: 'new',
            text: idea.title,
            description: `**Resumen:** ${idea.summary}\n\n**Acción Sugerida:** ${idea.action}\n\n> [Origen: Idea Bot]\n${idea.raw_text || ''}`,
            status: 'todo',
            // If we had dates, we could parse them.
            projectId: activeProjectId || 'my-tasks'
        };
        setConvertingIdea({ idea, task: draftTask });
    };

    const handleTaskCreated = async (taskId, fullTask) => {
        if (convertingIdea) {
            // Mark idea as converted
            await ideaService.markConverted(convertingIdea.idea.id, taskId);
            setConvertingIdea(null);
        }
    };

    // Masonry Breakpoints
    const breakpointColumnsObj = {
        default: 3,
        1100: 2,
        700: 1
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Lightbulb className="w-8 h-8 text-yellow-500" />
                        Inbox de Ideas
                    </h1>
                    <p className="text-gray-400 mt-1">Capturadas por tu Segundo Cerebro (WhatsApp)</p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-blue-500 w-64"
                        placeholder="Buscar ideas..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <Masonry
                    breakpointCols={breakpointColumnsObj}
                    className="flex w-auto -ml-4"
                    columnClassName="pl-4 bg-clip-padding"
                >
                    {filteredIdeas.map(idea => (
                        <motion.div
                            key={idea.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-800 border border-gray-700 rounded-2xl p-5 mb-4 hover:border-gray-600 transition-colors group relative overflow-hidden"
                        >
                            {/* Category Badge */}
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-1 rounded bg-gray-700/50 text-xs font-mono text-blue-300 uppercase tracking-wider">
                                    {idea.category || 'General'}
                                </span>
                                <span className="text-xs text-gray-600">
                                    {new Date(idea.timestamp?.seconds * 1000).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Content */}
                            <h3 className="text-lg font-bold text-gray-100 mb-2">{idea.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                {idea.summary}
                            </p>

                            {/* Action Hint */}
                            {idea.action && (
                                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 mb-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-yellow-500 mb-1">
                                        <ArrowRightCircle className="w-3 h-3" />
                                        ACCIÓN SUGERIDA
                                    </div>
                                    <p className="text-gray-300 text-xs">{idea.action}</p>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/50">
                                <button
                                    onClick={() => handleDelete(idea.id)}
                                    className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-700 transition"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleConvertStart(idea)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Convertir a Tarea
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </Masonry>

                {filteredIdeas.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p>No hay ideas pendientes.</p>
                        <p className="text-sm mt-2">Envía un mensaje a tu bot de WhatsApp para capturar algo.</p>
                    </div>
                )}
            </div>

            {/* Task Conversion Modal */}
            <AnimatePresence>
                {convertingIdea && (
                    <div className="fixed inset-0 z-50 flex items-start justify-end">
                        {/* We reuse TaskDetailPanel but passing 'new' task */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConvertingIdea(null)} />
                        <TaskDetailPanel
                            task={convertingIdea.task}
                            onClose={() => setConvertingIdea(null)}
                            onUpdate={handleTaskCreated}
                            activeProjectId={activeProjectId}
                        // ... pass other props as needed, e.g. project members 
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
