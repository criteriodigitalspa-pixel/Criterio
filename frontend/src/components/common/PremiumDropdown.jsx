import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, Smartphone, Laptop, Monitor } from 'lucide-react';
import clsx from 'clsx';

// Simple Icon Mapper for Brands
const getBrandIcon = (brandName) => {
    const lower = brandName.toLowerCase();
    if (lower.includes('apple') || lower.includes('mac')) return <Laptop className="w-4 h-4 text-gray-300" />; // Or specific icon if available
    if (lower.includes('samsung') || lower.includes('huawei')) return <Smartphone className="w-4 h-4 text-gray-300" />;
    return <Monitor className="w-4 h-4 text-gray-300" />; // Generic Tech
};

export default function PremiumDropdown({
    options = [],
    value,
    onChange,
    placeholder = "Seleccionar...",
    label = "Marca",
    icon: Icon
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Filter options
    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt) => {
        onChange({ target: { name: 'marca', value: opt } }); // Mock event to match existing form handlers if needed, or just pass value
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative group" ref={dropdownRef}>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">
                {label}
            </label>

            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center justify-between w-full p-4 rounded-xl cursor-pointer transition-all duration-300 border",
                    isOpen
                        ? "bg-gray-800 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                        : "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={clsx(
                        "p-2 rounded-lg transition-colors",
                        isOpen ? "bg-blue-500/20 text-blue-400" : "bg-gray-700/50 text-gray-400"
                    )}>
                        {Icon ? <Icon className="w-5 h-5" /> : getBrandIcon(value || '')}
                    </div>
                    <div>
                        <span className={clsx("block text-sm font-bold", value ? "text-white" : "text-gray-500")}>
                            {value || placeholder}
                        </span>
                    </div>
                </div>

                <ChevronDown className={clsx(
                    "w-5 h-5 text-gray-500 transition-transform duration-300",
                    isOpen && "rotate-180 text-blue-400"
                )} />
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5"
                    >
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-800 text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-gray-600"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent p-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <motion.button
                                        key={opt}
                                        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', x: 4 }}
                                        onClick={() => handleSelect(opt)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-all text-left mb-0.5",
                                            value === opt ? "bg-blue-600 text-white" : "text-gray-300 hover:text-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {getBrandIcon(opt)}
                                            <span className="font-medium">{opt}</span>
                                        </div>
                                        {value === opt && <Check className="w-4 h-4" />}
                                    </motion.button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-500 text-xs">
                                    No se encontraron resultados
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
