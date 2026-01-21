import { useState } from 'react';
import { X, Tag, Trash2, Save } from 'lucide-react';
import clsx from 'clsx';
import { ticketService } from '../../services/ticketService';
import toast from 'react-hot-toast';

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

export default function TagEditModal({ ticket, tag, onClose, onUpdate }) {
    const [tagText, setTagText] = useState(tag.text);
    const [selectedColor, setSelectedColor] = useState(COLORS.find(c => c.value === tag.color) || COLORS[0]);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!tagText.trim()) return;
        setLoading(true);
        try {
            const updatedTag = {
                ...tag,
                text: tagText.trim(),
                color: selectedColor.value,
                textColor: selectedColor.text
            };

            const newTags = ticket.tags.map(t => (t.id === tag.id ? updatedTag : t));

            await ticketService.updateTicket(ticket.id, { tags: newTags });
            toast.success("Etiqueta actualizada");
            onUpdate({ ...ticket, tags: newTags });
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("¿Eliminar esta etiqueta?")) return;
        setLoading(true);
        try {
            const newTags = ticket.tags.filter(t => t.id !== tag.id);
            await ticketService.updateTicket(ticket.id, { tags: newTags });
            toast.success("Etiqueta eliminada");
            onUpdate({ ...ticket, tags: newTags });
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Tag className="text-pink-400" /> Editar Etiqueta
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto</label>
                        <input
                            type="text"
                            value={tagText}
                            onChange={(e) => setTagText(e.target.value)}
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
                    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 flex items-center justify-center mb-4">
                        <span className={clsx("px-2 py-0.5 rounded text-xs font-bold shadow-sm transition-all", selectedColor.value, selectedColor.text)}>
                            {tagText || "Vista Previa"}
                        </span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-red-900/30 text-red-400 font-bold border border-gray-700 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading || !tagText.trim()}
                            className="flex-[2] py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
