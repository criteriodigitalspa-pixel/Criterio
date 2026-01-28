import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Calendar, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const FREQUENCIES = [
    { value: 'daily', label: 'Día(s)' },
    { value: 'weekly', label: 'Semana(s)' },
    { value: 'monthly', label: 'Mes(es)' },
    { value: 'yearly', label: 'Año(s)' },
];

const DAYS = [
    { label: 'L', value: 1 },
    { label: 'M', value: 2 },
    { label: 'X', value: 3 },
    { label: 'J', value: 4 },
    { label: 'V', value: 5 },
    { label: 'S', value: 6 },
    { label: 'D', value: 0 },
];

export default function RecurrenceSelector({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Local state for editing before applying
    const [config, setConfig] = useState(value || { type: 'none', interval: 1, daysOfWeek: [] });

    // Sync when opening or external change
    useEffect(() => {
        if (value) setConfig(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleApply = (newConfig) => {
        onChange(newConfig);
        setConfig(newConfig);
        // Don't close immediately if interacting? Actually close on "Done" or outside click is better usually, 
        // but for "Polish", instant updates with a "Close" way or standard popover behavior is good.
    };

    const toggleDay = (dayVal) => {
        const currentDays = config.daysOfWeek || [];
        const newDays = currentDays.includes(dayVal)
            ? currentDays.filter(d => d !== dayVal)
            : [...currentDays, dayVal];

        handleApply({ ...config, daysOfWeek: newDays, type: 'weekly' }); // Force weekly if picking days
    };

    const getSummary = () => {
        if (!value || value.type === 'none' || !value.type) return 'No repetir';
        const intervalStr = value.interval > 1 ? `Cada ${value.interval} ` : 'Cada ';

        if (value.type === 'daily') return value.interval > 1 ? `${intervalStr} días` : 'Diariamente';
        if (value.type === 'weekly') {
            if (value.daysOfWeek?.length > 0) {
                const daysStr = value.daysOfWeek
                    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)) // Sort Mon-Sun (1-6, 0)
                    .map(d => DAYS.find(day => day.value === d)?.label).join(', ');
                return `${value.interval > 1 ? intervalStr + 'semanas' : 'Semanalmente'} (${daysStr})`;
            }
            return value.interval > 1 ? `${intervalStr} semanas` : 'Semanalmente';
        }
        if (value.type === 'monthly') return value.interval > 1 ? `${intervalStr} meses` : 'Mensualmente';
        if (value.type === 'yearly') return value.interval > 1 ? `${intervalStr} años` : 'Anualmente';
        return 'Personalizado';
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border transition-colors text-sm",
                    (value?.type && value.type !== 'none')
                        ? "text-blue-400 border-blue-500/50 bg-blue-500/10"
                        : "text-gray-300 border-gray-700 hover:border-gray-500"
                )}
            >
                <RefreshCw className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{getSummary()}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
                            <span className="text-xs font-bold text-gray-500 uppercase">Repetir</span>
                            <div className="flex items-center gap-2">
                                {config.type !== 'none' && (
                                    <button
                                        onClick={() => {
                                            handleApply({ type: 'none', interval: 1, daysOfWeek: [] });
                                            setIsOpen(false);
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Quitar
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Frequency Row */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">Cada</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    className="w-12 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-center text-white text-sm focus:border-blue-500 outline-none"
                                    value={config.interval || 1}
                                    onChange={(e) => handleApply({ ...config, interval: parseInt(e.target.value) || 1 })}
                                />
                                <div className="flex-1 relative">
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm focus:border-blue-500 outline-none appearance-none"
                                        value={config.type === 'none' ? 'weekly' : config.type} // Default to weekly if none for UI
                                        onChange={(e) => handleApply({ ...config, type: e.target.value })}
                                    >
                                        {FREQUENCIES.map(f => (
                                            <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Weekly / Monthly Advanced Config */}
                            {(config.type === 'weekly' || config.type === 'monthly') && (
                                <div className="space-y-4">

                                    {/* Monthly: Week Position */}
                                    {config.type === 'monthly' && (
                                        <div className="space-y-2">
                                            <span className="text-xs text-gray-500 font-medium">Semana del mes</span>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, -1].map((w) => {
                                                    const isSelected = config.weeksOfMonth?.includes(w);
                                                    const label = w === -1 ? 'Ult' : `${w}ª`;
                                                    return (
                                                        <button
                                                            key={w}
                                                            onClick={() => {
                                                                const current = config.weeksOfMonth || [];
                                                                const newWeeks = current.includes(w) ? current.filter(x => x !== w) : [...current, w];
                                                                handleApply({ ...config, weeksOfMonth: newWeeks });
                                                            }}
                                                            className={clsx(
                                                                "h-7 px-2 rounded text-xs font-bold transition-all border",
                                                                isSelected
                                                                    ? "bg-purple-500 text-white border-purple-400"
                                                                    : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                                                            )}
                                                        >
                                                            {label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Days of Week (For Weekly OR Monthly Advanced) */}
                                    {(config.type === 'weekly' || (config.type === 'monthly' && config.weeksOfMonth?.length > 0)) && (
                                        <div className="space-y-2">
                                            <span className="text-xs text-gray-500 font-medium">Días</span>
                                            <div className="flex justify-between gap-1">
                                                {DAYS.map((day) => {
                                                    const isSelected = config.daysOfWeek?.includes(day.value);
                                                    return (
                                                        <button
                                                            key={day.value}
                                                            onClick={() => toggleDay(day.value)}
                                                            className={clsx(
                                                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                                                isSelected
                                                                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400"
                                                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                                                            )}
                                                        >
                                                            {day.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Descriptive Summary Blob */}
                            <div className="p-3 bg-gray-950/30 rounded-lg text-xs text-gray-400 border border-gray-800/50">
                                <span className="block font-bold mb-1 text-gray-500">Resumen:</span>
                                {getSummary()}
                            </div>

                            {/* Done Button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm font-medium transition-colors border border-gray-700"
                            >
                                Listo
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
