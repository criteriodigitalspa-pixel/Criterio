import { useState } from 'react';
import { Search, Monitor, ArrowRight, CheckCircle2, Clock, Wrench, Package } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Simple mapping of Internal Areas to Public Stages
const PUBLIC_STAGES = [
    { label: 'Recepción', icon: Clock, areas: ['Compras', 'Ingreso'] },
    { label: 'En Revisión', icon: Monitor, areas: ['Servicio Rapido', 'Servicio Dedicado'] },
    { label: 'Control Calidad', icon: CheckCircle2, areas: ['Caja Espera'] },
    { label: 'Listo para Retiro', icon: Package, areas: ['Caja Despacho', 'Caja Publicidad', 'Caja Reciclaje'] }
];

export default function ClientStatus() {
    const [ticketId, setTicketId] = useState('');
    const [loading, setLoading] = useState(false);
    const [ticket, setTicket] = useState(null);
    const [error, setError] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!ticketId.trim()) return;

        setLoading(true);
        setError(null);
        setTicket(null);

        try {
            const data = await ticketService.getTicketByDisplayId(ticketId.trim().toUpperCase());
            if (data) {
                setTicket(data);
            } else {
                setError("Ticket no encontrado. Verifique el ID.");
            }
        } catch (err) {
            setError("Error consultando el estado.");
        } finally {
            setLoading(false);
        }
    };

    const getStageIndex = (currentArea) => {
        const idx = PUBLIC_STAGES.findIndex(stage => stage.areas.includes(currentArea));
        return idx !== -1 ? idx : 0; // Default to start if unknown
    };

    const currentStageIndex = ticket ? getStageIndex(ticket.currentArea) : 0;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">

            {/* Header / Brand */}
            <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="inline-block p-4 bg-gray-800 rounded-full mb-4 shadow-xl border border-gray-700">
                    <Monitor className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">
                    Estado de <span className="text-blue-500">Reparación</span>
                </h1>
                <p className="text-gray-400">Consulte el progreso de su equipo en tiempo real.</p>
            </div>

            {/* Search Box */}
            <div className="w-full max-w-md mb-12 relative animate-in zoom-in-95 duration-500 delay-100">
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        placeholder="Ingrese N° de Ticket (ej: 2412-T-0001)"
                        value={ticketId}
                        onChange={(e) => setTicketId(e.target.value)}
                        className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-4 pl-6 pr-14 text-xl font-mono text-center text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all uppercase"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-3 top-3 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                        {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ArrowRight className="w-6 h-6" />}
                    </button>
                </form>
                {error && (
                    <div className="absolute top-full mt-4 w-full text-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-bold animate-in fade-in">
                        {error}
                    </div>
                )}
            </div>

            {/* Result Card */}
            {ticket && (
                <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">

                    {/* Public Info Header */}
                    <div className="text-center mb-8 pb-8 border-b border-gray-700/50">
                        <h2 className="text-2xl font-bold mb-2 text-white">{ticket.marca} {ticket.modelo}</h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-700/50 text-gray-300 font-mono text-sm">
                            Ticket: {ticket.ticketId}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="mb-10 relative">
                        {/* Progress Bar Background */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700 -translate-y-1/2 z-0 rounded-full"></div>

                        {/* Interactive Progress Line */}
                        <div
                            className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-green-500 -translate-y-1/2 z-0 rounded-full transition-all duration-1000"
                            style={{ width: `${(currentStageIndex / (PUBLIC_STAGES.length - 1)) * 100}%` }}
                        ></div>

                        {/* Steps */}
                        <div className="relative z-10 flex justify-between">
                            {PUBLIC_STAGES.map((stage, idx) => {
                                const isActive = idx <= currentStageIndex;
                                const isCurrent = idx === currentStageIndex;

                                return (
                                    <div key={idx} className="flex flex-col items-center group">
                                        <div
                                            className={clsx(
                                                "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 mb-3 bg-gray-900",
                                                isActive ? "border-blue-500 text-blue-400 scale-110" : "border-gray-700 text-gray-600",
                                                isCurrent && "shadow-[0_0_15px_rgba(59,130,246,0.5)] border-green-400 text-green-400"
                                            )}
                                        >
                                            <stage.icon className="w-5 h-5" />
                                        </div>
                                        <div className={clsx(
                                            "text-xs font-bold uppercase tracking-wider text-center transition-colors duration-300 w-24",
                                            isActive ? "text-gray-200" : "text-gray-600"
                                        )}>
                                            {stage.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Public Note (Safe Description) */}
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Mensaje del Taller</h4>
                        <p className="text-gray-300">
                            {ticket.currentArea.includes("Despacho")
                                ? "¡Su equipo está listo! Puede pasar a retirarlo en nuestro horario de atención."
                                : "Su equipo está siendo procesado por nuestros técnicos. Le notificaremos cualquier novedad."}
                        </p>
                    </div>

                    <div className="mt-6 text-center text-xs text-gray-500">
                        Gracias por confiar en Criterio Digital
                    </div>
                </div>
            )}

        </div>
    );
}
