import { useState, useEffect, useMemo, useCallback } from 'react';
import { ticketService } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import toast from 'react-hot-toast';
import { getSLAStatus } from '../services/slaService';

export const useKanban = () => {
    const { user } = useAuth();
    const { role } = useRole();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'fechaIngreso', direction: 'desc' });

    // Columns Configuration (MATCHING KanbanBoard.jsx EXACTLY)
    const COLUMNS = {
        'Compras': { id: 'Compras', title: '🛒 Compras / Ingreso', color: 'border-l-4 border-emerald-500 bg-gray-800/40' },
        'Servicio Rapido': { id: 'Servicio Rapido', title: '⚡ Servicio Rápido', color: 'border-l-4 border-blue-500 bg-gray-800/40' },
        'Servicio Dedicado': { id: 'Servicio Dedicado', title: '🛠️ Servicio Dedicado', color: 'border-l-4 border-cyan-500 bg-gray-800/40' },
        'Caja Publicidad': { id: 'Caja Publicidad', title: '📸 Caja Publicidad', color: 'border-l-4 border-pink-500 bg-gray-800/40' },
        'Caja Despacho': { id: 'Caja Despacho', title: '📦 Caja Despacho', color: 'border-l-4 border-purple-500 bg-gray-800/40' },
        'Caja Espera': { id: 'Caja Espera', title: '⏳ Caja Espera', color: 'border-l-4 border-gray-600 bg-gray-900/40 opacity-75' },
        'Caja Reciclaje': { id: 'Caja Reciclaje', title: '♻️ Caja Reciclaje', color: 'border-l-4 border-slate-700 bg-gray-900/40 opacity-75' }
    };

    // --- 1. Real-time Subscription ---
    useEffect(() => {
        const unsubscribe = ticketService.subscribeToTickets(
            (data) => {
                // Sanitize Areas (Legacy Handling)
                const sanitized = data.map(t => {
                    let area = t.currentArea === 'Ingreso' ? 'Compras' : (t.currentArea || 'Compras');
                    // RECOVERY FIX: Map 'Diagnóstico' (from TrashBin undo) to 'Servicio Rapido' so they appear on board
                    if (area === 'Diagnóstico') area = 'Servicio Rapido';
                    return { ...t, currentArea: area };
                });
                setTickets(sanitized);
                setLoading(false);
            },
            (error) => {
                console.error("Subscription Error:", error);
                setLoading(false);
                toast.error(`Error de conexión: ${error.code || 'Desconocido'}`);
            }
        );
        return () => unsubscribe();
    }, []);

    // --- 2. Filtering & Sorting ---
    const [quickFilters, setQuickFilters] = useState([]); // Array of strings: 'urgent', 'today', etc.
    const [activeTags, setActiveTags] = useState([]); // Array of strings
    const [hardwareFilters, setHardwareFilters] = useState({ cpu: '', ram: '', disk: '', brand: '', cpuGen: '', integrated: '' }); // NEW: Hardware Facets
    const [batchIdFilter, setBatchIdFilter] = useState(''); // NEW: Batch ID Filter

    const processedTickets = useMemo(() => {
        // FILTER: Show active tickets. 
        // RECOVERY CHANGE: Allow 'Closed' tickets to appear if they are NOT in 'Ventas' (e.g. tickets moved back for correction but still marked closed)
        let filtered = tickets.filter(t => t.status !== 'Deleted' && (t.status !== 'Closed' || t.currentArea !== 'Ventas'));

        // NEW: Batch ID Filter
        if (batchIdFilter) {
            filtered = filtered.filter(t => (t.batchId || '').toLowerCase().includes(batchIdFilter.toLowerCase()));
        }

        // 1. Hardware Facet Filters (The "Command Center" Logic)
        if (hardwareFilters.cpu || hardwareFilters.ram || hardwareFilters.disk || hardwareFilters.brand || hardwareFilters.cpuGen || hardwareFilters.integrated) {
            filtered = filtered.filter(t => {
                const info = t.additionalInfo || {};
                const tRam = t.ram || {};
                const tDisk = t.disco || {};

                // CPU Check (e.g., "i5", "Ryzen 5")
                const cpuMatch = !hardwareFilters.cpu ||
                    (info.cpuBrand || '').toLowerCase().includes(hardwareFilters.cpu.toLowerCase()) ||
                    (info.cpuModel || '').toLowerCase().includes(hardwareFilters.cpu.toLowerCase()) ||
                    (info.cpuGen || '').toLowerCase().includes(hardwareFilters.cpu.toLowerCase());

                // CPU Gen Check (Specific)
                const cpuGenMatch = !hardwareFilters.cpuGen ||
                    (info.cpuGen || '').toLowerCase() === hardwareFilters.cpuGen.toLowerCase();

                // Integrated Graphics Check (Si/No)
                // Logic: "Si" = No dedicated card keywords. "No" = Has dedicated card keywords.
                let integratedMatch = true;
                if (hardwareFilters.integrated) {
                    const gpu = (info.gpuModel || t.specs?.gpu || '').toLowerCase();
                    const dedicatedKeywords = ['nvidia', 'geforce', 'rtx', 'gtx', 'radeon rx', 'dedicada', 'discrete'];
                    const hasDedicated = dedicatedKeywords.some(k => gpu.includes(k));

                    if (hardwareFilters.integrated === 'Si') {
                        // User asking: "Does it have integrated?" -> Generally machines with NO dedicated card.
                        integratedMatch = !hasDedicated;
                    } else if (hardwareFilters.integrated === 'No') {
                        // User asking: "Does it NOT have integrated?" -> Using it as proxy for "Has Dedicated".
                        integratedMatch = hasDedicated;
                    }
                }

                // RAM Check (e.g., "16GB")
                // Allow fuzzy matching on total or details
                const ramFilter = hardwareFilters.ram.toLowerCase();
                const ramDetails = Array.isArray(tRam.detalles) ? tRam.detalles.join(' ').toLowerCase() : '';
                const ramTotal = (tRam.total || '').toString().toLowerCase();
                const ramMatch = !hardwareFilters.ram ||
                    ramDetails.includes(ramFilter) ||
                    ramTotal.includes(ramFilter) ||
                    (ramFilter.replace('gb', '').trim() === ramTotal.replace('gb', '').trim());

                // Disk Check (e.g., "SSD", "512")
                const diskFilter = hardwareFilters.disk.toLowerCase();
                const diskDetails = Array.isArray(tDisk.detalles) ? tDisk.detalles.join(' ').toLowerCase() : '';
                const diskMatch = !hardwareFilters.disk || diskDetails.includes(diskFilter);

                // Brand Check (e.g., "Lenovo")
                const brandMatch = !hardwareFilters.brand ||
                    (t.marca || '').toLowerCase().includes(hardwareFilters.brand.toLowerCase());

                return cpuMatch && cpuGenMatch && integratedMatch && ramMatch && diskMatch && brandMatch;
            });
        }

        // 2. Search Query
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(ticket => {
                const info = ticket.additionalInfo || {};
                const tRam = ticket.ram || {};
                const tDisk = ticket.disco || {};

                return (
                    (ticket.nombreCliente || '').toLowerCase().includes(lowerTerm) ||
                    (ticket.modelo || '').toLowerCase().includes(lowerTerm) ||
                    (ticket.ticketId || '').toString().toLowerCase().includes(lowerTerm) ||
                    (ticket.batchId || '').toString().toLowerCase().includes(lowerTerm) ||
                    (ticket.id || '').toLowerCase().includes(lowerTerm) ||
                    (ticket.marca || '').toLowerCase().includes(lowerTerm) ||
                    // Deep Search
                    (info.cpuBrand || '').toLowerCase().includes(lowerTerm) ||
                    (info.cpuGen || '').toLowerCase().includes(lowerTerm) ||
                    (info.gpuModel || '').toLowerCase().includes(lowerTerm) ||
                    (tRam.detalles?.join(' ') || '').toLowerCase().includes(lowerTerm) ||
                    (tDisk.detalles?.join(' ') || '').toLowerCase().includes(lowerTerm)
                );
            });
        }

        // 3. Date Filter (Legacy explicit date) - could match 'today' logic if needed
        if (filterDate) {
            filtered = filtered.filter(ticket =>
                new Date(ticket.createdAt?.seconds * 1000 || ticket.createdAt).toISOString().split('T')[0] === filterDate
            );
        }

        // 4. Quick Filters (Semantic)
        if (quickFilters.length > 0) {
            const now = new Date();
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));

            filtered = filtered.filter(t => {
                return quickFilters.every(filterKey => {
                    if (filterKey === 'urgent') {
                        // Simple check if we don't import SLA service yet
                        // Just placeholder or if logic exists elsewhere. 
                        // For now, let's keep it robust.
                        const slaMock = t.slaStatus || 'ok';
                        return slaMock === 'warning';
                    }
                    if (filterKey === 'qa_pending') return (t.qaProgress || 0) < 100;
                    if (filterKey === 'no_info') return !t.additionalInfoComplete;
                    if (filterKey === 'today') {
                        const d = new Date(t.createdAt?.seconds * 1000 || t.createdAt);
                        return d >= startOfDay;
                    }
                    if (filterKey === 'gaming') {
                        return (t.additionalInfo?.gpuModel || '').length > 0;
                    }
                    return true;
                });
            });
        }

        // 5. Tags
        if (activeTags.length > 0) {
            filtered = filtered.filter(t =>
                t.tags && activeTags.every(tag => t.tags.some(tt => tt.text === tag))
            );
        }

        // Sorting (Basic built-in)
        // Group by Area
        const grouped = {};
        Object.keys(COLUMNS).forEach(key => grouped[key] = []);

        filtered.forEach(ticket => {
            const area = ticket.currentArea || 'Compras';
            if (grouped[area]) {
                grouped[area].push(ticket);
            } else {
                if (!grouped['Compras']) grouped['Compras'] = [];
                grouped['Compras'].push(ticket);
            }
        });

        // FORCE SORT: Reserved tickets always at the bottom
        Object.keys(grouped).forEach(area => {
            grouped[area].sort((a, b) => {
                // 1. Primary: Reserved Status (Unreserved (0) -> Reserved (1))
                const aRes = a.isReserved ? 1 : 0;
                const bRes = b.isReserved ? 1 : 0;
                if (aRes !== bRes) return aRes - bRes;

                // 2. Secondary: Respect existing Sort Config (Default: Newest First)
                // We reuse the native sort behavior here implicitly or explicit date sort
                const dateA = new Date(a.createdAt?.seconds * 1000 || a.createdAt || 0);
                const dateB = new Date(b.createdAt?.seconds * 1000 || b.createdAt || 0);
                return dateB - dateA; // Descending Date by default
            });
        });

        return grouped;
    }, [tickets, searchTerm, filterDate, sortConfig, quickFilters, activeTags, hardwareFilters, batchIdFilter]);

    // --- 3. Actions ---
    // Simple drag start
    const handleDragStart = (e, ticketId) => {
        e.dataTransfer.setData('text/plain', ticketId);
    };

    // Simple drop (can be used by UI or overridden)
    const handleDrop = async (e, outputColumnId) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData('text/plain');
        if (!ticketId) return;
        // Logic handled by UI usually for complex moves
    };

    const updateTicketStatus = useCallback(async (ticketId, newStatus) => {
        try {
            await ticketService.updateTicketStatus(ticketId, newStatus);
            toast.success("Estado actualizado");
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar estado");
        }
    }, []);

    return {
        tickets,
        processedTickets,
        columns: COLUMNS,
        loading,
        filters: {
            searchTerm, setSearchTerm,
            filterDate, setFilterDate,
            quickFilters, setQuickFilters,
            activeTags, setActiveTags,
            hardwareFilters, setHardwareFilters,
            batchIdFilter, setBatchIdFilter
        },
        sort: {
            sortConfig, setSortConfig
        },
        actions: {
            handleDragStart,
            handleDrop,
            updateTicketStatus
        }
    };
};
