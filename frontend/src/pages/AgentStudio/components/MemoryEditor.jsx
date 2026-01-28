
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

export default function MemoryEditor({ memory, onSave, onCancel }) {
    const [formData, setFormData] = useState({ ...memory });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h3 className="text-white font-bold">Editar Memoria</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
                            <input
                                type="text"
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Sentimiento</label>
                            <select
                                name="sentiment"
                                value={formData.sentiment}
                                onChange={handleChange}
                                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                            >
                                <option value="Neutral">Neutral</option>
                                <option value="Positive">Positive</option>
                                <option value="Negative">Negative</option>
                                <option value="Conflict">Conflict</option>
                                <option value="Mixed">Mixed</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Evento</label>
                        <input
                            type="text"
                            name="event"
                            value={formData.event}
                            onChange={handleChange}
                            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white focus:border-blue-500 outline-none text-sm leading-relaxed"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-gray-400 hover:text-white mr-2"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 font-medium"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
