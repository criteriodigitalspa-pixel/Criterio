import { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

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
    const [tagText, setTagText] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [loading, setLoading] = useState(false);

    const handleApply = async () => {
        if (!tagText.trim()) {
            toast.error("Escribe un texto para la etiqueta");
            return;
        }

        setLoading(true);
        const toastId = toast.loading(`Etiquetando ${tickets.length} tickets...`);

        try {
            const newTag = {
                text: tagText.trim(),
                color: selectedColor.value,
                textColor: selectedColor.text,
                id: Date.now().toString()
            };

            const promises = tickets.map(ticket => {
                const currentTags = ticket.tags || [];
                // Avoid duplicates by text? or allow? Let's allow duplicates for now, user might want "Urgent" Red and "Urgent" Blue (weird but okay).
                // Actually, duplicate text with same color is bad.
                const exists = currentTags.some(t => t.text.toLowerCase() === newTag.text.toLowerCase() && t.color === newTag.color);
                if (exists) return Promise.resolve(); // Skip if exact duplicate

                const updatedTags = [...currentTags, newTag];
                return ticketService.updateTicket(ticket.id, { tags: updatedTags });
            });

            await Promise.all(promises);

            toast.success("Etiquetas aplicadas", { id: toastId });
            onComplete();
        } catch (error) {
            console.error(error);
            toast.error("Error al etiquetar", { id: toastId });
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl relative">
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

                    <button
                        onClick={handleApply}
                        disabled={loading || !tagText.trim()}
                        className="w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Aplicando..." : "Aplicar Etiqueta"}
                    </button>
                </div>
            </div>
        </div>
    );
}
