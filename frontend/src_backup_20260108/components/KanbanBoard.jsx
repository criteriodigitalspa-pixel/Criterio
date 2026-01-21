


import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom'; // NEW
import { useLocation } from 'react-router-dom';
import { useKanban } from '../hooks/useKanban';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import { emailService } from '../services/emailService';
import { wooCommerceService } from '../services/wooCommerceService';
import {
    Search, Monitor, Database, Layout,
    Trash2, Smartphone, FileText, XCircle,
    ArrowRightCircle, CheckSquare, ArrowRight, ArrowUpDown, Filter,
    Maximize2, AlertTriangle, Check, Copy, SlidersHorizontal, Printer, Tag, Truck, Layers, UploadCloud
} from 'lucide-react';


import toast from 'react-hot-toast';
import clsx from 'clsx';
import TicketCard from './TicketCard';
import BoardSkeleton from './BoardSkeleton';
import AdvancedFilterBar from './AdvancedFilterBar';

// Modals
import AdditionalInfoModal from './AdditionalInfoModal';
import QAChecklistModal from './QAChecklistModal';
import TransitionModal from './TransitionModal';
import ServiceHistoryModal from './ServiceHistoryModal';
import TicketDetailModal from './TicketDetailModal';
import SLADetailModal from './SLADetailModal';
import BulkQAModal from './BulkQAModal';
import BulkInfoModal from './BulkInfoModal';
import BulkPrintModal from './BulkPrintModal';
import BulkTagModal from './BulkTagModal';
import BulkBatchModal from './BulkBatchModal';
import BulkDispatchModal from './BulkDispatchModal'; // NEW
import DispatchModal from './DispatchModal';
import TrashBinModal from './modals/TrashBinModal'; // NEW
import TicketBudgetModal from './modals/TicketBudgetModal'; // NEW
import TagEditModal from './modals/TagEditModal'; // NEW

import { TRANSITION_RULES } from '../services/transitionRules';
import { getSLAStatus } from '../services/slaService';
import { PROCESSORS } from '../data/hardware-constants';
import { calculateReadiness } from '../utils/wooCommerceReadiness';

// We use useKanban hook for state, but keep Local AREAS for consistent UI mapping if needed.
// However, useKanban exports COLUMNS which match these IDs now.

export default function KanbanBoard() {
    const { user } = useAuth();
    const location = useLocation();

    // Hook State
    const {
        tickets, // Raw tickets if needed
        processedTickets, // Grouped by Area ID
        columns: COLUMNS,
        loading,
        filters,
        actions: { handleDragStart: hookDragStart, updateTicketStatus }
    } = useKanban();

    const { searchTerm, setSearchTerm, filterDate, setFilterDate, sortConfig, setSortConfig } = filters;

    // NEW: Search Effect for external links (e.g. from SalesDashboard)
    useEffect(() => {
        if (location.state?.search) {
            setSearchTerm(location.state.search);
        }
    }, [location.state, setSearchTerm]);

    // Local UI State (Modals, Selection, UI flags)
    // Persist Hidden Areas
    const [hiddenAreas, setHiddenAreas] = useState(() => {
        const saved = localStorage.getItem('kanbanHiddenAreas');
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem('kanbanHiddenAreas', JSON.stringify(hiddenAreas));
    }, [hiddenAreas]);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedAreaId, setExpandedAreaId] = useState(null);
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showAreaFilter, setShowAreaFilter] = useState(false);

    // Filter UI Local State
    const [hideEmpty, setHideEmpty] = useState(true);
    const [columnSort, setColumnSort] = useState('workflow'); // 'workflow', 'count_desc', 'count_asc'
    const [qaFilter, setQaFilter] = useState('all');
    // Hardware Filters
    const [hardwareFilters, setHardwareFilters] = useState({ cpuBrand: '', cpuGen: '', ram: '', gpu: '' });

    // Modal State
    const [qaTicket, setQaTicket] = useState(null);
    const [infoTicket, setInfoTicket] = useState(null);
    const [detailTicket, setDetailTicket] = useState(null);
    const [slaDetailTicket, setSlaDetailTicket] = useState(null);
    const [transitionData, setTransitionData] = useState(null);
    const [historyTicket, setHistoryTicket] = useState(null);
    const [tagEditData, setTagEditData] = useState(null); // { ticket, tag }
    const [destinationSelectorTicket, setDestinationSelectorTicket] = useState(null);

    const [bulkQaTickets, setBulkQaTickets] = useState(null);
    const [bulkInfoTickets, setBulkInfoTickets] = useState(null);
    const [bulkPrintTickets, setBulkPrintTickets] = useState(null);
    const [bulkTagTickets, setBulkTagTickets] = useState(null);
    const [bulkBatchTickets, setBulkBatchTickets] = useState(null); // NEW
    const [bulkDispatchTickets, setBulkDispatchTickets] = useState(null); // NEW
    const [dispatchTicket, setDispatchTicket] = useState(null);
    const [budgetTicket, setBudgetTicket] = useState(null); // NEW
    const [showTrash, setShowTrash] = useState(false); // NEW
    const [showFacturaOnly, setShowFacturaOnly] = useState(false); // NEW INVOICE FILTER

    // --- ESCAPE KEY HANDLER ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                // 1. Close Modals (Priority)
                if (qaTicket || infoTicket || detailTicket || slaDetailTicket || transitionData || historyTicket || destinationSelectorTicket || bulkQaTickets || bulkInfoTickets || bulkPrintTickets || bulkTagTickets || bulkBatchTickets || bulkDispatchTickets || dispatchTicket || budgetTicket || tagEditData) {
                    setQaTicket(null);
                    setInfoTicket(null);
                    setDetailTicket(null);
                    setSlaDetailTicket(null);
                    setTransitionData(null);
                    setHistoryTicket(null);
                    setDestinationSelectorTicket(null);
                    setBulkQaTickets(null);
                    setBulkInfoTickets(null);
                    setBulkPrintTickets(null);
                    setBulkTagTickets(null);
                    setBulkBatchTickets(null);
                    setBulkDispatchTickets(null);
                    setDispatchTicket(null);
                    setBudgetTicket(null);
                    setTagEditData(null); // NEW
                    return; // Stop here, don't clear selection yet if we just closed a modal
                }

                // 2. Collapse Expanded Area
                if (expandedAreaId) {
                    setExpandedAreaId(null);
                    return;
                }

                // 3. Clear Selection
                if (selectionMode) {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [qaTicket, infoTicket, detailTicket, slaDetailTicket, transitionData, historyTicket, destinationSelectorTicket, bulkQaTickets, bulkInfoTickets, bulkPrintTickets, bulkTagTickets, bulkBatchTickets, bulkDispatchTickets, dispatchTicket, budgetTicket, tagEditData, expandedAreaId, selectionMode]);

    // --- SELECTION & BULK ACTIONS ---
    const toggleSelection = useCallback((ticketId) => {
        setSelectedIds(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(ticketId)) {
                newSelected.delete(ticketId);
            } else {
                newSelected.add(ticketId);
            }
            return newSelected;
        });
    }, []);

    // --- MANUAL REFRESH (Wrapper for legacy calls) ---
    const loadTickets = () => {
        // Handled by hook subscription automatically
        console.log("loadTickets called - handled by useKanban hook");
    };

    // --- BULK HANDLERS ---
    const handleBulkMove = (targetArea) => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`¿Mover ${selectedIds.size} tickets a ${targetArea}?`)) return;

        const ticketsToMove = tickets.filter(t => selectedIds.has(t.id));

        toast.promise(
            Promise.all(ticketsToMove.map(t =>
                ticketService.moveTicket(t.id, targetArea, user.uid, {
                    eventId: `bulk_${Date.now()}`,
                    agent: 'bulk_action'
                })
            )),
            {
                loading: 'Moviendo tickets...',
                success: () => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                    return 'Movimiento masivo completado';
                },
                error: 'Error en movimiento masivo'
            }
        );
    };

    const handleBulkQA = () => {
        if (selectedIds.size === 0) return;
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));

        const hasProgress = selectedTickets.some(t => (t.qaProgress || 0) > 0);
        if (hasProgress) {
            if (!window.confirm("⚠️ Algunos tickets tienen avance en QA.\n\nSi continúa, gestionará todos simultáneamente y podría sobrescribir datos individuales.\n\n¿Desea continuar?")) {
                return;
            }
        }
        setBulkQaTickets(selectedTickets);
    };

    const handleBulkInfo = () => {
        if (selectedIds.size === 0) return;
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));
        setBulkInfoTickets(selectedTickets);
    };

    const handleBulkPrint = () => {
        if (selectedIds.size === 0) return;
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));
        setBulkPrintTickets(selectedTickets);
    };

    const handleBulkTag = () => {
        if (selectedIds.size === 0) return;
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));
        setBulkTagTickets(selectedTickets);
    };


    const handleBulkSync = async (ticketsToSync) => {
        // 1. Filter by Readiness
        const readinessAnalysis = ticketsToSync.map(t => ({
            ticket: t,
            ...calculateReadiness(t, t.images) // Pass images if available
        }));

        const readyTickets = readinessAnalysis.filter(r => r.isReady).map(r => r.ticket);
        const skippedCount = ticketsToSync.length - readyTickets.length;

        // 2. User Confirmation
        if (readyTickets.length === 0) {
            toast.error("⚠️ Ningún ticket cumple con el 100% de requisitos para Web.\n(Revise fotos, marca/modelo, precio y factura).", { duration: 4000 });
            return;
        }

        const confirmMsg = `¿Sincronizar inventario DESPACHO con WooCommerce?
        
✅ Listos para Web: ${readyTickets.length} tickets
⚠️ Ignorados (Incompletos): ${skippedCount} tickets

El sistema agrupará equipos idénticos (mismo Modelo + Specs) en un único producto web y sumará el stock.`;

        if (!window.confirm(confirmMsg)) return;

        const toastId = toast.loading("Analizando inventario...");

        try {
            // Use the new Batch Service with ONLY ready tickets
            const results = await wooCommerceService.syncUniqueBatch(
                readyTickets,
                (msg) => toast.loading(msg, { id: toastId })
            );

            toast.success(`Sincronización Completa:
✅ ${results.success} Productos Actualizados/Creados
❌ ${results.failed} Errores`, {
                id: toastId,
                duration: 5000
            });

        } catch (error) {
            console.error("Bulk Sync Fatal Error", error);
            toast.error("Error crítico en sincronización", { id: toastId });
        }
    };

    // --- DND LOGIC (UI Specific) ---
    const [pendingMove, setPendingMove] = useState(null);

    const handleDragStart = useCallback((e, ticket) => {
        hookDragStart(e, ticket.id);
        e.dataTransfer.effectAllowed = 'move';
    }, [hookDragStart]);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetAreaId) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData('text/plain');
        const ticket = tickets.find(t => t.id === ticketId);

        if (targetAreaId === 'Compras') {
            toast.error("⛔ No se puede mover ticket a Compras manualmente");
            return;
        }

        if (ticket && ticket.currentArea !== targetAreaId) {
            initiateMove(ticket.ticketId, ticket.id, ticket.currentArea, targetAreaId, ticket);
        }
    };

    const handleBulkBatch = async () => {
        if (!selectedIds.size) return;
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));
        setBulkBatchTickets(selectedTickets);
    };

    const handleBulkDispatch = async () => {
        if (!selectedIds.size) return;
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));

        // Validate: All must be in 'Caja Despacho' (or contain Despacho)
        const invalidTickets = selectedTickets.filter(t => !t.currentArea.includes('Despacho'));
        if (invalidTickets.length > 0) {
            toast.error("⚠️ Acción denegada: Todos los tickets seleccionados deben estar en 'Caja Despacho'.", { icon: '🚫' });
            return;
        }

        setBulkDispatchTickets(selectedTickets);
    };

    const initiateMove = (ticketId, ticketDocId, currentArea, targetArea, fullTicket) => {
        // 0. FREE PASS RULE (Between Publicidad and Despacho only)
        const isPublicidad = currentArea.includes('Publicidad');
        const isDespacho = currentArea.includes('Despacho');

        const toPublicidad = targetArea.includes('Publicidad');
        const toDespacho = targetArea.includes('Despacho');

        if (
            (isPublicidad && toDespacho) ||
            (isDespacho && toPublicidad)
        ) {
            executeMove(ticketId, ticketDocId, targetArea, {}, {});
            return;
        }

        // 1. Mandatory Info
        if (targetArea === 'Caja Publicidad' || targetArea === 'Caja Despacho') {
            if (!fullTicket.additionalInfoComplete) {
                toast("⚠️ Falta información técnica. Complétala para avanzar.", { icon: '📝' });
                setInfoTicket(fullTicket);
                setPendingMove({ ticketId: fullTicket.ticketId, targetArea, step: 'INFO' });
                return;
            }
        }

        // 2. QA Check
        if (targetArea === 'Caja Despacho' || targetArea === 'Caja Publicidad') {
            if ((fullTicket.qaProgress || 0) < 100) {
                toast("⚠️ Se requiere QA al 100%.", { icon: '🛡️' });
                setQaTicket(fullTicket);
                setPendingMove({ ticketId: fullTicket.ticketId, targetArea, step: 'QA' });
                return;
            }
        }

        // 4. Transition Form
        const ruleKey = `${currentArea}->${targetArea}`;
        if (TRANSITION_RULES[ruleKey]) {
            setTransitionData({
                ticketId,
                ticketDocId,
                fromArea: currentArea,
                toArea: targetArea,
                ticketData: fullTicket,
                extraUpdate: null
            });
            setPendingMove(null);
        } else {
            executeMove(ticketId, ticketDocId, targetArea, null, null);
            setPendingMove(null);
        }
    };

    const confirmTransition = async (formData) => {
        if (!transitionData) return;
        const { ticketId, ticketDocId, toArea, ticketData, extraUpdate } = transitionData;

        const auditDetails = {
            eventId: `evt_${Date.now()}`,
            formId: 'transition_form',
            inputData: formData,
            snapshot: { previousArea: transitionData.fromArea, ticketState: ticketData },
            metadata: { timestamp: new Date().toISOString(), user: user.email, agent: 'web_client' }
        };

        await executeMove(ticketId, ticketDocId, toArea, auditDetails, extraUpdate);
        setTransitionData(null);
    };

    const executeMove = async (ticketId, ticketDocId, targetArea, auditDetails, extraUpdate) => {
        const toastId = toast.loading(`Moviendo ${ticketId}...`);
        try {
            await ticketService.moveTicket(ticketDocId, targetArea, user.uid, auditDetails);
            if (extraUpdate) await ticketService.updateTicket(ticketDocId, extraUpdate);

            // EMAIL TRIGGER
            if (targetArea === 'Caja Despacho') {
                const ticket = tickets.find(t => t.id === ticketDocId);
                if (ticket && ticket.clientEmail) {
                    toast.promise(
                        emailService.sendNotification(ticket.clientEmail, {
                            ticketId: ticket.ticketId,
                            modelName: `${ticket.marca} ${ticket.modelo}`,
                            message: 'Su equipo está listo para retiro.'
                        }),
                        {
                            loading: 'Enviando correo...',
                            success: 'Correo enviado',
                            error: 'No se pudo enviar el correo'
                        }
                    );
                }
            }
            toast.success("Movimiento exitoso", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Error al mover", { id: toastId });
        }
    };

    // --- UPDATES & CHAIN RESUME ---
    const handleTicketUpdate = (updatedTicket) => {
        // Wait, tickets state is in Hook. Hook updates automatically via subscription.
        // But if we need to resume a chain, we need to know.
        // We can just check pendingMove on next render if ticket state changed?
        // Or better, we trust the hook's subscription will trigger re-render with new ticket data.
        // We need to find the updated ticket in the 'tickets' array from hook.

        // Resume Chain Logic
        if (pendingMove && pendingMove.ticketId === updatedTicket.ticketId) {
            setTimeout(() => {
                initiateMove(updatedTicket.ticketId, updatedTicket.id, updatedTicket.currentArea, pendingMove.targetArea, updatedTicket);
            }, 300);
        }
    };

    const handleModalClose = (setter) => {
        setter(null);
        if (pendingMove) {
            setPendingMove(null);
            toast.error("Movimiento cancelado");
        }
    };

    const handleDestinationSelect = (targetArea) => {
        if (!destinationSelectorTicket) return;
        const t = destinationSelectorTicket;
        setDestinationSelectorTicket(null);

        if (t.bulk) {
            handleBulkMove(targetArea);
            return;
        }

        initiateMove(t.ticketId, t.id, t.currentArea, targetArea, t);
    };

    const handleTicketDelete = async (ticketId) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este ticket permanentemente?")) return;
        const toastId = toast.loading("Eliminando...");
        try {
            await ticketService.deleteTicket(ticketId);
            toast.success("Ticket eliminado", { id: toastId });
            setDetailTicket(null);
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar", { id: toastId });
        }
    };

    // UTILS (Seed/Clear) - Restored for dev cleanliness
    const generateSeedData = async () => {
        // Implement if needed or import from a utility. Keeping empty/simple for now to save space.
        toast("Seed Data disabled in refactor.");
    };
    const handleClearAll = async () => {
        if (!window.confirm("Borrar TODO?")) return;
        await ticketService.clearAllTickets();
        toast.success("Limpieza completa");
    };

    const handleExportBackup = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `backup_tickets_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success("Respaldo descargado");
    };

    // --- RENDER HELPERS ---
    // Prepare display areas based on hook's COLUMNS + Sorting

    // We filter tickets for the EXPANDED VIEW manually because 'processedTickets' is grouped.
    // For expanded view, we want a flat list filtered by Area.
    // We can just use processedTickets[expandedAreaId]

    // COLUMN SORTING
    // We sort the KEYS of COLUMNS
    const displayAreas = Object.keys(COLUMNS).sort((a, b) => {
        if (columnSort === 'workflow') return 0; // Insertion order usually preserves
        const countA = (processedTickets[a] || []).length;
        const countB = (processedTickets[b] || []).length;
        return columnSort === 'count_desc' ? countB - countA : countA - countB;
    });

    // --- VIEW LOGIC ---
    // Panning
    const boardScrollRef = useRef(null);
    const isPanning = useRef(false);
    const startCoords = useRef({ x: 0, y: 0 });
    const scrollStart = useRef({ left: 0, top: 0 });
    const animationFrameId = useRef(null);

    const handleMouseDown = (e) => {
        if (e.button === 2) {
            isPanning.current = true;
            startCoords.current = { x: e.clientX, y: e.clientY };
            if (boardScrollRef.current) {
                scrollStart.current = {
                    left: boardScrollRef.current.scrollLeft,
                    top: boardScrollRef.current.scrollTop
                };
                boardScrollRef.current.style.cursor = 'grabbing';
            }
        }
    };

    const handleMouseMove = (e) => {
        if (!isPanning.current || !boardScrollRef.current) return;
        e.preventDefault();
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = requestAnimationFrame(() => {
            const dx = e.clientX - startCoords.current.x;
            const dy = e.clientY - startCoords.current.y;
            if (boardScrollRef.current) {
                boardScrollRef.current.scrollLeft = scrollStart.current.left - dx;
                boardScrollRef.current.scrollTop = scrollStart.current.top - dy;
            }
        });
    };

    const handleMouseUp = () => {
        isPanning.current = false;
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (boardScrollRef.current) boardScrollRef.current.style.cursor = 'default';
    };

    const handleContextMenu = (e) => e.preventDefault();

    const renderBoardView = () => (
        <div
            ref={boardScrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onContextMenu={handleContextMenu}
            className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 cursor-grab active:cursor-grabbing will-change-scroll"
            style={{ maxHeight: 'calc(100vh - 4rem)', transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
        >
            <div className="min-h-full p-2 pb-20 grid grid-cols-2 lg:flex lg:flex-row lg:min-w-[2600px] gap-2 lg:gap-5 items-start">
                {displayAreas.map(areaKey => {
                    const area = COLUMNS[areaKey];
                    if (hiddenAreas.includes(area.id)) return null;
                    const areaTickets = processedTickets[area.id] || [];

                    if (hideEmpty && areaTickets.length === 0) return null;

                    if (hideEmpty && areaTickets.length === 0) return null;

                    // FILTER LOGIC - INVOICE
                    let filteredTickets = areaTickets;
                    if (showFacturaOnly) {
                        filteredTickets = areaTickets.filter(t =>
                            t.conFactura || t.factura || t.invoiceNumber || t.tipoCompra === 'FACTURA'
                        );
                    }

                    const isFiltered = showFacturaOnly; // logic moved to FilterBar summary

                    return (
                        <div
                            key={area.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, area.id)}
                            className={clsx(
                                "flex-shrink-0 w-full lg:w-80 rounded-xl flex flex-col border shadow-md transition-colors duration-300 h-auto self-start min-h-[100px]",
                                area.color,
                                area.id === 'Compras' && "border-white",
                                area.id.includes('Despacho') && "border-green-500 shadow-green-900/20",
                                isFiltered && filteredTickets.length === 0 && "opacity-50" // Dim empty columns when filtered
                            )}
                        >
                            <div className="p-2 lg:p-4 border-b border-gray-700/50 font-bold text-gray-200 flex justify-between items-center bg-[#0f172a] rounded-t-xl transition-colors shrink-0">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                                    <span className="text-[10px] lg:text-sm tracking-wide uppercase font-black text-gray-100/90 shadow-sm flex items-center gap-2 truncate max-w-[100px] lg:max-w-none"> {area.title} </span>
                                    <span className={clsx("px-1.5 py-0.5 rounded-full text-[10px] lg:text-xs font-mono font-bold shadow-inner w-fit", isFiltered ? "bg-purple-900/50 text-purple-300 border border-purple-500/50" : "bg-gray-700 text-gray-300")}>
                                        {filteredTickets.length}
                                        {isFiltered && <span className="opacity-50 text-[10px]">/{areaTickets.length}</span>}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setExpandedAreaId(area.id)}
                                    className="hidden lg:block p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Expandir Vista (Grid 5x10)"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                {area.id === 'Caja Despacho' && (
                                    <button
                                        onClick={() => handleBulkSync(areaTickets)}
                                        className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/50 rounded-lg transition-colors ml-1"
                                        title="Sincronizar Stock con WooCommerce"
                                    >
                                        <UploadCloud className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 p-1 lg:p-3 flex flex-col gap-2">
                                {filteredTickets.map(t => (
                                    <TicketCard
                                        key={t.id}
                                        ticket={t}
                                        selectionMode={selectionMode}
                                        isSelected={selectedIds.has(t.id)}
                                        onToggleSelection={toggleSelection}
                                        onDragStart={handleDragStart}
                                        onDetail={setDetailTicket}
                                        onQA={setQaTicket}
                                        onInfo={setInfoTicket}
                                        onDispatch={setDispatchTicket}
                                        onBudget={setBudgetTicket} // NEW
                                        onSLA={setSlaDetailTicket}
                                        onMove={setDestinationSelectorTicket}
                                        onTagClick={(ticket, tag) => setTagEditData({ ticket, tag })} // NEW
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Calculate Counts for FilterBar
    const totalTicketsCount = tickets.length;
    const visibleTicketsCount = Object.values(processedTickets).reduce((acc, curr) => acc + curr.length, 0);

    return (
        <div className="flex flex-col min-h-full bg-[#0f172a] text-gray-100 relative overflow-hidden">
            {/* Global Watermark Removed as requested */}

            {/* Floating Bulk Actions Toolbar - PORTALIZED for safe fixed positioning */}
            {selectedIds.size > 0 && createPortal(
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-900/90 text-white px-6 py-3 rounded-2xl shadow-2xl border border-blue-500/30 z-[9999] flex items-center gap-4 animate-in slide-in-from-bottom-5 backdrop-blur-md">
                    <div className="font-bold text-sm border-r border-blue-500/30 pr-4 mr-1">
                        {selectedIds.size} <span className="text-blue-300 font-normal">seleccionados</span>
                    </div>

                    <button onClick={handleBulkTag} className="flex flex-col items-center gap-1 hover:text-pink-400 transition-colors group" title="Etiquetar">
                        <Tag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Etiqueta</span>
                    </button>

                    <div className="w-px h-8 bg-blue-500/30"></div>

                    <button onClick={handleBulkQA} className="flex flex-col items-center gap-1 hover:text-green-400 transition-colors group" title="QA Masivo">
                        <CheckSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">QA</span>
                    </button>

                    <button onClick={handleBulkInfo} className="flex flex-col items-center gap-1 hover:text-blue-400 transition-colors group" title="Info Masiva">
                        <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Info</span>
                    </button>

                    <button onClick={handleBulkPrint} className="flex flex-col items-center gap-1 hover:text-purple-400 transition-colors group" title="Imprimir Etiquetas">
                        <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Print</span>
                    </button>

                    <div className="w-px h-8 bg-blue-500/30"></div>

                    <button onClick={handleBulkBatch} className="flex flex-col items-center gap-1 hover:text-cyan-400 transition-colors group" title="Cambiar Lote">
                        <Layers className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Lote</span>
                    </button>

                    {/* Dispatch Removed as requested */}

                    <div className="w-px h-8 bg-blue-500/30"></div>

                    <button onClick={handleBulkDispatch} className="flex flex-col items-center gap-1 hover:text-orange-400 transition-colors group" title="Despacho Masivo">
                        <Truck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Despacho</span>
                    </button>

                    <div className="w-px h-8 bg-blue-500/30"></div>

                    <button onClick={() => setDestinationSelectorTicket({ bulk: true })} className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors group" title="Mover Masivo">
                        <ArrowRightCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Mover</span>
                    </button>
                </div>,
                document.body
            )}


            {/* UNIFIED TOP BAR */}
            <AdvancedFilterBar
                filters={{
                    ...filters,
                    showFacturaOnly,
                    setShowFacturaOnly
                }}
                totalTickets={tickets.length}
                visibleTickets={visibleTicketsCount}
                allTickets={tickets}
                title={
                    <h1 className="text-xl font-black text-white flex items-center gap-2">
                        <Monitor className="text-blue-500 w-5 h-5 md:w-6 md:h-6" />
                        <span className="hidden md:inline font-sans tracking-tight">TALLER</span>
                    </h1>
                }
                selectionActions={
                    <button
                        onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) setSelectedIds(new Set()); }}
                        className={clsx(
                            "p-1.5 rounded-lg border transition-all font-bold text-xs flex items-center gap-1.5",
                            selectionMode ? "bg-blue-600 text-white border-blue-500" : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white"
                        )}
                        title="Selección Múltiple"
                    >
                        {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span className="hidden xl:inline">{selectionMode ? 'Cancelar' : 'Selección'}</span>
                    </button>
                }
                viewActions={
                    <div className="relative flex items-center gap-2">
                        {/* MOVED: Trash Bin Button (Disimulado) */}
                        <button
                            onClick={() => setShowTrash(true)}
                            className="p-1.5 rounded-lg border border-transparent hover:bg-red-900/10 hover:border-red-500/30 text-gray-600 hover:text-red-500 transition-colors"
                            title="Papelera de Reciclaje"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="w-px h-4 bg-gray-700 mx-1"></div>

                        <button
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            className={clsx(
                                "p-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                                showSortMenu ? "bg-blue-600/20 text-blue-400 border-blue-500/50" : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white"
                            )}
                            title="Ajustes de Vista"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="text-xs font-bold hidden xl:inline">Vista</span>
                        </button>

                        {/* Sort Menu Popover (Preserved logic) */}
                        {showSortMenu && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-[#1e293b] border border-gray-700 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 ring-1 ring-black/50">
                                <div className="space-y-2">
                                    <button onClick={() => setShowAreaFilter(true)} className="w-full flex items-center justify-between text-xs font-medium text-gray-300 hover:text-white p-2 hover:bg-gray-700/50 rounded-lg group transition-colors">
                                        <span className="flex items-center gap-2"><Layout className="w-3.5 h-3.5" /> Gestionar Columnas</span>
                                        <ArrowRight className="w-3 h-3 text-gray-500 group-hover:text-blue-400" />
                                    </button>
                                    <div className="border-t border-gray-700/50 my-1"></div>
                                    <button onClick={handleExportBackup} className="w-full flex items-center justify-between text-xs font-medium text-gray-300 hover:text-white p-2 hover:bg-gray-700/50 rounded-lg group transition-colors">
                                        <span className="flex items-center gap-2"><Database className="w-3.5 h-3.5" /> Descargar Respaldo (JSON)</span>
                                    </button>
                                    <label className="flex items-center justify-between text-xs text-gray-300 cursor-pointer p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                                        <span className="flex items-center gap-2 text-gray-400">Ocultar Vacías</span>
                                        <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} className="rounded border-gray-600 text-blue-500 bg-gray-800 focus:ring-0 w-3.5 h-3.5" />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                }
            />

            {/* Area Filter Popover */}
            {
                showAreaFilter && (
                    <div className="absolute top-16 right-4 bg-[#1e293b] border border-gray-700 rounded-xl shadow-2xl p-3 z-50 w-64 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                            <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Columnas Visibles</h4>
                            <button onClick={() => setShowAreaFilter(false)}><XCircle className="w-4 h-4 text-gray-400 hover:text-white" /></button>
                        </div>
                        <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar mb-4">
                            {Object.values(COLUMNS).map(area => (
                                <label key={area.id} className="flex items-center gap-2 text-xs text-gray-300 hover:bg-gray-700/50 p-2 rounded cursor-pointer transition-colors">
                                    <input type="checkbox" checked={!hiddenAreas.includes(area.id)} onChange={() => setHiddenAreas(prev => prev.includes(area.id) ? prev.filter(id => id !== area.id) : [...prev, area.id])} className="rounded border-gray-600 text-blue-500 bg-gray-800 focus:ring-0 w-4 h-4" />
                                    <span className={clsx("flex-1", hiddenAreas.includes(area.id) && "opacity-50 decoration-line-through")}>{area.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Main Content */}
            <div className="flex-1 relative">
                {loading ? <BoardSkeleton /> : renderBoardView()}
            </div>

            {/* Modals */}
            {
                destinationSelectorTicket && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDestinationSelectorTicket(null)}>
                        <div className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-2xl border border-gray-700 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setDestinationSelectorTicket(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"> <XCircle className="w-6 h-6" /> </button>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"> <ArrowRightCircle className="text-blue-400" /> Mover Ticket: <span className="text-blue-300 font-mono">{destinationSelectorTicket.ticketId}</span> </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.values(COLUMNS).map(area => (
                                    <button key={area.id} onClick={() => handleDestinationSelect(area.id)} disabled={destinationSelectorTicket.currentArea === area.id || area.id === 'Compras'} className={clsx("p-4 rounded-xl border border-gray-700 flex flex-col items-center gap-2 hover:bg-blue-600/20 hover:border-blue-500 transition-all", (destinationSelectorTicket.currentArea === area.id || area.id === 'Compras') && "opacity-50 cursor-not-allowed")}>
                                        <div className={clsx("w-3 h-3 rounded-full", area.id === 'Compras' ? 'bg-emerald-400' : 'bg-gray-500')}></div>
                                        <span className="font-bold text-sm text-gray-300">{area.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                expandedAreaId && (() => {
                    const areaRawTickets = tickets.filter(t => t.currentArea === expandedAreaId);
                    const areaVisibleTickets = processedTickets[expandedAreaId] || [];

                    return (
                        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-200">
                            {/* UNIFIED HEADER FOR EXPANDED VIEW */}
                            <AdvancedFilterBar
                                filters={filters}
                                totalTickets={areaRawTickets.length}
                                visibleTickets={areaVisibleTickets.length}
                                allTickets={areaRawTickets}
                                title={
                                    <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
                                        <Layout className="text-blue-500 w-6 h-6" /> {COLUMNS[expandedAreaId]?.title}
                                    </h2>
                                }
                                actions={
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) setSelectedIds(new Set()); }}
                                            className={clsx(
                                                "p-2 rounded-lg border transition-all font-bold text-sm flex items-center gap-2",
                                                selectionMode ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/50" : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700"
                                            )}
                                        >
                                            {selectionMode ? <CheckSquare className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                            <span>{selectionMode ? 'Cancelar Selección' : 'Selección Múltiple'}</span>
                                        </button>

                                        <div className="w-px h-8 bg-gray-700 mx-1"></div>

                                        <button
                                            onClick={() => setExpandedAreaId(null)}
                                            className="p-2 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-full transition-colors border border-gray-700 hover:border-red-500/50"
                                            title="Cerrar Vista Expandida"
                                        >
                                            <XCircle className="w-8 h-8" />
                                        </button>
                                    </div>
                                }
                            />

                            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-gray-700">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 max-w-[2400px] mx-auto">
                                    {areaVisibleTickets.map(ticket => (
                                        <div key={ticket.id} className="transform hover:scale-[1.02] transition-transform duration-200">
                                            <TicketCard ticket={ticket} selectionMode={selectionMode} isSelected={selectedIds.has(ticket.id)} onToggleSelection={toggleSelection} onDragStart={handleDragStart} onDetail={setDetailTicket} onQA={setQaTicket} onInfo={setInfoTicket} onDispatch={setDispatchTicket} onSLA={setSlaDetailTicket} onMove={setDestinationSelectorTicket} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {bulkQaTickets && <BulkQAModal tickets={bulkQaTickets} onClose={() => setBulkQaTickets(null)} onComplete={() => { setSelectionMode(false); setSelectedIds(new Set()); }} />}
            {bulkInfoTickets && <BulkInfoModal tickets={bulkInfoTickets} onClose={() => setBulkInfoTickets(null)} onComplete={() => { setSelectionMode(false); setSelectedIds(new Set()); setBulkInfoTickets(null); }} />}
            {bulkPrintTickets && <BulkPrintModal tickets={bulkPrintTickets} onClose={() => setBulkPrintTickets(null)} onComplete={() => { setSelectionMode(false); setSelectedIds(new Set()); setBulkPrintTickets(null); }} />}
            {bulkTagTickets && <BulkTagModal tickets={bulkTagTickets} onClose={() => setBulkTagTickets(null)} onComplete={() => { setSelectionMode(false); setSelectedIds(new Set()); setBulkTagTickets(null); }} />}
            {bulkBatchTickets && <BulkBatchModal tickets={bulkBatchTickets} onClose={() => setBulkBatchTickets(null)} onComplete={() => { setBulkBatchTickets(null); setSelectionMode(false); setSelectedIds(new Set()); }} />}
            {bulkDispatchTickets && <BulkDispatchModal tickets={bulkDispatchTickets} onClose={() => setBulkDispatchTickets(null)} onComplete={() => { setBulkDispatchTickets(null); setSelectionMode(false); setSelectedIds(new Set()); }} />}

            {infoTicket && <AdditionalInfoModal ticket={infoTicket} onClose={() => handleModalClose(setInfoTicket)} onUpdate={handleTicketUpdate} />}
            {dispatchTicket && <DispatchModal ticket={dispatchTicket} onClose={() => handleModalClose(setDispatchTicket)} onUpdate={handleTicketUpdate} />}
            {budgetTicket && <TicketBudgetModal ticket={budgetTicket} onClose={() => handleModalClose(setBudgetTicket)} />}
            {qaTicket && <QAChecklistModal ticket={qaTicket} onClose={() => handleModalClose(setQaTicket)} onUpdate={handleTicketUpdate} />}
            {transitionData && <TransitionModal ticket={transitionData.ticketData} fromArea={transitionData.fromArea} toArea={transitionData.toArea} isDespachoVerification={transitionData.isDespachoVerification} onCancel={() => handleModalClose(setTransitionData)} onConfirm={confirmTransition} />}
            {historyTicket && <ServiceHistoryModal ticket={historyTicket} onClose={() => setHistoryTicket(null)} />}
            {slaDetailTicket && <SLADetailModal ticket={slaDetailTicket} onClose={() => setSlaDetailTicket(null)} />}
            {detailTicket && <TicketDetailModal ticket={detailTicket} onClose={() => setDetailTicket(null)} onDelete={handleTicketDelete} />}
            {showTrash && <TrashBinModal onClose={() => setShowTrash(false)} />}

            {tagEditData && (
                <TagEditModal
                    ticket={tagEditData.ticket}
                    tag={tagEditData.tag}
                    onClose={() => setTagEditData(null)}
                />
            )}

        </div >
    );
}
