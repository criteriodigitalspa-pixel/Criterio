import { useState, useRef, useEffect } from 'react';
import { CheckSquare, Clock, Circle, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const STATUS_OPTIONS = [
    { value: 'todo', label: 'Por Hacer', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-700' },
    { value: 'in_progress', label: 'En Curso', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/50' },
    { value: 'done', label: 'Listo', icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/50' }
];

export default function StatusSelector({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const currentOption = STATUS_OPTIONS.find(opt => opt.value === value) || STATUS_OPTIONS[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all",
                    currentOption.color,
                    currentOption.bg,
                    currentOption.border
                )}
            >
                <currentOption.icon className="w-4 h-4" />
                <span>{currentOption.label}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-gray-800 transition-colors"
                            >
                                <option.icon className={clsx("w-4 h-4", option.color)} />
                                <span className={clsx("text-xs font-medium", option.value === value ? "text-white" : "text-gray-400")}>
                                    {option.label}
                                </span>
                                {option.value === value && <Check className="w-3 h-3 text-white ml-auto" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
