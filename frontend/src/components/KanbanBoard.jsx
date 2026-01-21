


import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom'; // NEW
import { useLocation } from 'react-router-dom';
import { useKanban } from '../hooks/useKanban';
import SavedViewsMenu from './SavedViewsMenu';
import { useAuth } from '../context/AuthContext';
import { ticketService } from '../services/ticketService';
import { emailService } from '../services/emailService';
import { wooCommerceService } from '../services/wooCommerceService';
import {
    Search, Monitor, Database, Layout,
    Trash2, Smartphone, FileText, XCircle,
    ArrowRightCircle, CheckSquare, ArrowRight, ArrowUpDown, Filter,
    Maximize2, AlertTriangle, Check, Copy, SlidersHorizontal, Printer, Tag, Truck, Layers, UploadCloud, Calculator,
    LayoutTemplate, Columns, Minimize2
} from 'lucide-react';


import toast from 'react-hot-toast';
import clsx from 'clsx';
import TicketCard from './TicketCard';
import BoardSkeleton from './BoardSkeleton';
import AdvancedFilterBar from './AdvancedFilterBar';

// Modals (Lazy Loaded for Performance)
const AdditionalInfoModal = lazy(() => import('./AdditionalInfoModal'));
const QAChecklistModal = lazy(() => import('./QAChecklistModal'));
const TransitionModal = lazy(() => import('./TransitionModal'));
const ServiceHistoryModal = lazy(() => import('./ServiceHistoryModal'));
const TicketDetailModal = lazy(() => import('./TicketDetailModal'));
const SLADetailModal = lazy(() => import('./SLADetailModal'));
const BulkQAModal = lazy(() => import('./BulkQAModal'));
const BulkInfoModal = lazy(() => import('./BulkInfoModal'));
const BulkPrintModal = lazy(() => import('./BulkPrintModal'));
const BulkTagModal = lazy(() => import('./BulkTagModal'));
const BulkBatchModal = lazy(() => import('./BulkBatchModal'));
const BulkDispatchModal = lazy(() => import('./BulkDispatchModal')); // NEW
const DispatchModal = lazy(() => import('./DispatchModal'));
const TrashBinModal = lazy(() => import('./modals/TrashBinModal')); // NEW
const TicketBudgetModal = lazy(() => import('./modals/TicketBudgetModal')); // NEW
const TagEditModal = lazy(() => import('./modals/TagEditModal')); // NEW
const BulkBudgetModal = lazy(() => import('./BulkBudgetModal')); // NEW

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
        sort, // Destructure sort separately
        actions: { handleDragStart: hookDragStart, updateTicketStatus, updateLocalTicket }
    } = useKanban();

    const {
        searchTerm, setSearchTerm, filterDate, setFilterDate,
        hardwareFilters, setHardwareFilters,
        batchIdFilter, setBatchIdFilter
    } = filters;

    const { sortConfig, setSortConfig } = sort;

    // NEW: Search Effect for external links (e.g. from SalesDashboard)
    useEffect(() => {
        if (location.state?.search) {
            setSearchTerm(location.state.search);
        }
    }, [location.state, setSearchTerm]);

    // Local UI State (Modals, Selection, UI flags)
    // Persist Hidden Areas
    const [hiddenAreas, setHiddenAreas] = useState(() => {
        try {
            const saved = localStorage.getItem('kanbanHiddenAreas');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    // Persist Wide Areas (New)
    const [wideAreas, setWideAreas] = useState(() => {
        try {
            const saved = localStorage.getItem('kanbanWideAreas');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });
    // Persist Compact Areas (New)
    const [compactAreas, setCompactAreas] = useState(() => {
        try {
            const saved = localStorage.getItem('kanbanCompactAreas');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });
    useEffect(() => {
        localStorage.setItem('kanbanHiddenAreas', JSON.stringify(hiddenAreas));
    }, [hiddenAreas]);
    useEffect(() => {
        localStorage.setItem('kanbanWideAreas', JSON.stringify(Array.from(wideAreas)));
    }, [wideAreas]);
    useEffect(() => {
        localStorage.setItem('kanbanCompactAreas', JSON.stringify(Array.from(compactAreas)));
    }, [compactAreas]);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [expandedAreaId, setExpandedAreaId] = useState(null);
    const [activeHeaderMenu, setActiveHeaderMenu] = useState(null); // Tracks which column header menu is open

    const [showSortMenu, setShowSortMenu] = useState(false);
    const [showAreaFilter, setShowAreaFilter] = useState(false);

    // Filter UI Local State
    const [hideEmpty, setHideEmpty] = useState(true);
    const [columnSort, setColumnSort] = useState('workflow'); // 'workflow', 'count_desc', 'count_asc'
    const [qaFilter, setQaFilter] = useState('all');


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
    const [bulkBudgetTickets, setBulkBudgetTickets] = useState(null); // NEW
    const [dispatchTicket, setDispatchTicket] = useState(null);
    const [budgetTicket, setBudgetTicket] = useState(null); // NEW
    const [showTrash, setShowTrash] = useState(false); // NEW
    const [showFacturaOnly, setShowFacturaOnly] = useState(false); // NEW INVOICE FILTER

    // --- SAVED VIEWS LOGIC ---
    const handleLoadView = (config) => {
        if (!config) return;
        // Filters
        if (config.searchTerm !== undefined) setSearchTerm(config.searchTerm);
        if (config.hardwareFilters) setHardwareFilters(config.hardwareFilters);
        if (config.batchIdFilter !== undefined) setBatchIdFilter(config.batchIdFilter);
        if (config.showFacturaOnly !== undefined) setShowFacturaOnly(config.showFacturaOnly);

        // Layout
        if (config.hideEmpty !== undefined) setHideEmpty(config.hideEmpty);
        if (config.compactAreas) setCompactAreas(new Set(config.compactAreas));
        if (config.wideAreas) setWideAreas(new Set(config.wideAreas));
        if (config.hiddenAreas) setHiddenAreas(config.hiddenAreas);
    };

    // Load Default View on Mount
    useEffect(() => {
        const stored = localStorage.getItem('kanban_saved_views');
        if (stored) {
            try {
                const views = JSON.parse(stored);
                // Wait for hook to be ready? Hook state is set directly.
                const defaultView = views.find(v => v.isDefault);
                if (defaultView) {
                    console.log("Loading Default View:", defaultView.name);
                    handleLoadView(defaultView.config);
                }
            } catch (e) { console.error(e); }
        }
    }, [setSearchTerm, setHardwareFilters, setBatchIdFilter, setShowFacturaOnly]);

    const currentViewConfig = {
        searchTerm,
        hardwareFilters,
        batchIdFilter,
        showFacturaOnly,
        hideEmpty,
        compactAreas: Array.from(compactAreas),
        wideAreas: Array.from(wideAreas),
        hiddenAreas
    };

    // --- ESCAPE KEY HANDLER ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                // 1. Close Modals (Priority)
                if (qaTicket || infoTicket || detailTicket || slaDetailTicket || transitionData || historyTicket || destinationSelectorTicket || bulkQaTickets || bulkInfoTickets || bulkPrintTickets || bulkTagTickets || bulkBatchTickets || bulkDispatchTickets || bulkBudgetTickets || dispatchTicket || budgetTicket || tagEditData) {
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
                    setBulkBudgetTickets(null);
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
    }, [qaTicket, infoTicket, detailTicket, slaDetailTicket, transitionData, historyTicket, destinationSelectorTicket, bulkQaTickets, bulkInfoTickets, bulkPrintTickets, bulkTagTickets, bulkBatchTickets, bulkDispatchTickets, bulkBudgetTickets, dispatchTicket, budgetTicket, tagEditData, expandedAreaId, selectionMode]);

    // --- SELECTION & BULK ACTIONS ---
    const toggleSelection = useCallback((ticketId) => {
        setSelectionMode(true); // Ensure UI enters selection mode
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

    // --- CLICK OUTSIDE TO CLEAR SELECTION ---
    useEffect(() => {
        if (!selectionMode) return;

        const handleGlobalClick = (e) => {
            // If click is inside FilterBar (Toolbar), ignore
            if (e.target.closest('#advanced-filter-bar')) return;

            // If click is inside a Modal, ignore (safety check, though modals usually block)
            if (e.target.closest('[role="dialog"]')) return;

            // If we reached here, it's a click on the "background" or non-interactive area
            // Ticket clicks stop propagation, so they won't reach here.
            setSelectionMode(false);
            setSelectedIds(new Set());
        };

        // Delay attachment to avoid immediate trigger from the event that turned it on
        // (Only matters if that event bubbled to window, but we rely on stopProp anyway)
        const timer = setTimeout(() => {
            window.addEventListener('click', handleGlobalClick);
        }, 100);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, [selectionMode]);

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



    const handleBulkBudget = () => {
        if (selectedIds.size === 0) return;
        const selectedTickets = tickets.filter(t => selectedIds.has(t.id));
        setBulkBudgetTickets(selectedTickets);
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
        const invalidTickets = selectedTickets.filter(t => !(t.currentArea || '').includes('Despacho'));
        if (invalidTickets.length > 0) {
            toast.error("⚠️ Acción denegada: Todos los tickets seleccionados deben estar en 'Caja Despacho'.", { icon: '🚫' });
            return;
        }

        setBulkDispatchTickets(selectedTickets);
    };

    const initiateMove = (ticketId, ticketDocId, currentArea, targetArea, fullTicket) => {
        // 0. FREE PASS RULE (Between Publicidad and Despacho only)
        const safeArea = currentArea || '';
        const isPublicidad = safeArea.includes('Publicidad');
        const isDespacho = safeArea.includes('Despacho');

        const toPublicidad = (targetArea || '').includes('Publicidad');
        const toDespacho = (targetArea || '').includes('Despacho');

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

        // OPTIMISTIC UPDATE SUPPORT
        // If we received an updated object, it means a child component saved data.
        // While the Firestore subscription handles the main sync, we can use this hook 
        // to verify data flow or trigger side effects if needed.
        if (updatedTicket) {
            // Optimistic Update: Update local state immediately without waiting for subscription
            updateLocalTicket(updatedTicket);
            // toast.success("Progreso Actualizado (Optimista)", { icon: '🚀', duration: 2000 });
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
            <div className="min-h-full p-2 pb-20 grid grid-cols-2 lg:flex lg:flex-row w-fit gap-2 lg:gap-5 items-start">
                {displayAreas.map(areaKey => {
                    const area = COLUMNS[areaKey];
                    if (hiddenAreas.includes(area.id)) return null;
                    const areaTickets = processedTickets[area.id] || [];

                    if (hideEmpty && areaTickets.length === 0) return null;

                    // FILTER LOGIC - INVOICE
                    let filteredTickets = areaTickets;
                    if (showFacturaOnly) {
                        filteredTickets = areaTickets.filter(t =>
                            t.conFactura || t.factura || t.invoiceNumber || t.tipoCompra === 'FACTURA'
                        );
                    }

                    const isFiltered = showFacturaOnly;
                    const isWide = wideAreas.has(area.id);
                    const isCompact = compactAreas.has(area.id);

                    return (
                        <div
                            key={area.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, area.id)}
                            className={clsx(
                                "flex-shrink-0 w-full rounded-xl flex flex-col border shadow-md transition-all duration-300 h-auto self-start min-h-[100px]",
                                isWide ? "lg:w-[680px]" : (isCompact ? "lg:w-52" : "lg:w-80"),
                                area.color,
                                area.id === 'Compras' && "border-white",
                                (area.id || '').includes('Despacho') && "border-green-500 shadow-green-900/20",
                                isFiltered && filteredTickets.length === 0 && "opacity-50"
                            )}
                        >
                            <div className="p-2 lg:p-4 border-b border-gray-700/50 font-bold text-gray-200 flex justify-between items-center bg-[#0f172a] rounded-t-xl transition-colors shrink-0 relative">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2">
                                    <span className={clsx("text-[10px] lg:text-sm tracking-wide uppercase font-black text-gray-100/90 shadow-sm flex items-center gap-2 truncate max-w-[100px]", isCompact ? "lg:max-w-[120px]" : "lg:max-w-none")}> {area.title} </span>
                                    <span className={clsx("px-1.5 py-0.5 rounded-full text-[10px] lg:text-xs font-mono font-bold shadow-inner w-fit", isFiltered ? "bg-purple-900/50 text-purple-300 border border-purple-500/50" : "bg-gray-700 text-gray-300")}>
                                        {filteredTickets.length}
                                        {isFiltered && <span className="opacity-50 text-[10px]">/{areaTickets.length}</span>}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    {area.id === 'Caja Despacho' && (
                                        <button
                                            onClick={() => handleBulkSync(areaTickets)}
                                            className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/50 rounded-lg transition-colors"
                                            title="Sincronizar Stock con WooCommerce"
                                        >
                                            <UploadCloud className="w-4 h-4" />
                                        </button>
                                    )}

                                    {/* Multiview Menu Trigger */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveHeaderMenu(activeHeaderMenu === area.id ? null : area.id)}
                                            className={clsx("hidden lg:block p-1.5 rounded-lg transition-colors", activeHeaderMenu === area.id ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700")}
                                            title="Opciones de Visualización"
                                        >
                                            <LayoutTemplate className="w-4 h-4" />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeHeaderMenu === area.id && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setActiveHeaderMenu(null)}></div>
                                                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-1 flex flex-col gap-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-200">
                                                    <button
                                                        onClick={() => {
                                                            setExpandedAreaId(area.id);
                                                            setActiveHeaderMenu(null);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gray-700 hover:text-white rounded text-left transition-colors"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5" /> Expandir Vista
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setWideAreas(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(area.id)) next.delete(area.id);
                                                                else next.add(area.id);
                                                                return next;
                                                            });
                                                            setActiveHeaderMenu(null);
                                                        }}
                                                        className={clsx("flex items-center gap-2 px-3 py-2 text-xs font-bold rounded text-left transition-colors", isWide ? "bg-cyan-900/30 text-cyan-400" : "text-gray-300 hover:bg-gray-700 hover:text-white")}
                                                    >
                                                        <Columns className="w-3.5 h-3.5" /> Vista Doble
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCompactAreas(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(area.id)) next.delete(area.id);
                                                                else next.add(area.id);
                                                                return next;
                                                            });
                                                            setActiveHeaderMenu(null);
                                                        }}
                                                        className={clsx("flex items-center gap-2 px-3 py-2 text-xs font-bold rounded text-left transition-colors", compactAreas.has(area.id) ? "bg-purple-900/30 text-purple-400" : "text-gray-300 hover:bg-gray-700 hover:text-white")}
                                                    >
                                                        <Minimize2 className="w-3.5 h-3.5" /> Vista Compacta
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={clsx("flex-1 p-1 lg:p-3", isWide ? "grid grid-cols-2 gap-2 content-start" : "flex flex-col gap-2")}>
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
                                        onBudget={setBudgetTicket}
                                        onSLA={setSlaDetailTicket}
                                        onMove={setDestinationSelectorTicket}
                                        onTagClick={(ticket, tag) => setTagEditData({ ticket, tag })}
                                        isCompact={compactAreas.has(area.id)}
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
            {/* Floating Bulk Actions Toolbar - PORTALIZED for safe fixed positioning */}
            {selectedIds.size > 0 && createPortal(
                <div className="fixed right-6 top-1/2 transform -translate-y-1/2 bg-gray-900/60 text-white p-3 rounded-2xl shadow-2xl shadow-blue-900/20 border border-white/10 z-[9999] flex flex-col items-center gap-4 animate-in slide-in-from-right-10 backdrop-blur-xl">
                    <div className="font-bold text-xs text-center border-b border-blue-500/30 pb-2 w-full text-blue-300">
                        {selectedIds.size} <br /><span className="text-[10px] text-gray-400 font-normal">items</span>
                    </div>

                    <button onClick={handleBulkTag} className="flex flex-col items-center gap-1 hover:text-pink-400 transition-colors group relative" title="Etiquetar">
                        <div className="p-2 rounded-lg group-hover:bg-pink-500/10 transition-colors">
                            <Tag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        {/* Tooltip on left */}
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">Etiquetar</span>
                    </button>

                    <button onClick={handleBulkQA} className="flex flex-col items-center gap-1 hover:text-green-400 transition-colors group relative" title="QA Masivo">
                        <div className="p-2 rounded-lg group-hover:bg-green-500/10 transition-colors">
                            <CheckSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">QA Masivo</span>
                    </button>

                    <button onClick={handleBulkInfo} className="flex flex-col items-center gap-1 hover:text-blue-400 transition-colors group relative" title="Info Masiva">
                        <div className="p-2 rounded-lg group-hover:bg-blue-500/10 transition-colors">
                            <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">Info Técnica</span>
                    </button>

                    <button onClick={handleBulkPrint} className="flex flex-col items-center gap-1 hover:text-purple-400 transition-colors group relative" title="Imprimir Etiquetas">
                        <div className="p-2 rounded-lg group-hover:bg-purple-500/10 transition-colors">
                            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">Imprimir</span>
                    </button>

                    <div className="w-8 h-px bg-blue-500/30"></div>

                    <button onClick={handleBulkBudget} className="flex flex-col items-center gap-1 hover:text-emerald-400 transition-colors group relative" title="Presupuesto Masivo">
                        <div className="p-2 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                            <Calculator className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">Cotizar</span>
                    </button>

                    <button onClick={handleBulkBatch} className="flex flex-col items-center gap-1 hover:text-cyan-400 transition-colors group relative" title="Cambiar Lote">
                        <div className="p-2 rounded-lg group-hover:bg-cyan-500/10 transition-colors">
                            <Layers className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">Cambiar Lote</span>
                    </button>

                    <button onClick={handleBulkDispatch} className="flex flex-col items-center gap-1 hover:text-orange-400 transition-colors group relative" title="Despacho Masivo">
                        <div className="p-2 rounded-lg group-hover:bg-orange-500/10 transition-colors">
                            <Truck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">Despacho</span>
                    </button>

                    <div className="w-8 h-px bg-blue-500/30"></div>

                    <button onClick={() => setDestinationSelectorTicket({ bulk: true })} className="flex flex-col items-center gap-1 hover:text-yellow-400 transition-colors group relative" title="Mover Masivo">
                        <div className="p-2 rounded-lg group-hover:bg-yellow-500/10 transition-colors">
                            <ArrowRightCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="absolute right-full mr-2 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-700 pointer-events-none transition-opacity">Mover</span>
                    </button>

                    {/* Clear Selection Button (New) */}
                    <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} className="mt-2 text-gray-500 hover:text-white transition-colors" title="Cancelar Selección">
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>,
                document.body
            )}


            {/* PORTALIZED TOP BAR - Moves Filter to Dashboard Header */}
            {document.getElementById('dashboard-header-portal') && createPortal(
                <div className="w-full -ml-4"> {/* Negative margin to offset padding if needed */}
                    <AdvancedFilterBar
                        filters={{
                            ...filters,
                            showFacturaOnly,
                            setShowFacturaOnly
                        }}
                        totalTickets={tickets.length}
                        visibleTickets={visibleTicketsCount}
                        allTickets={tickets}
                        savedViews={
                            <SavedViewsMenu
                                currentConfig={currentViewConfig}
                                onLoad={(cfg) => handleLoadView(cfg)}
                            />
                        }
                        viewActions={
                            <div className="flex items-center gap-2">

                                {/* Selection Toggle */}
                                <button
                                    onClick={() => {
                                        setSelectionMode(!selectionMode);
                                        if (selectionMode) setSelectedIds(new Set());
                                    }}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                                        selectionMode ? "bg-blue-900/40 text-blue-400 border-blue-500/50" : "bg-gray-800 text-gray-300 border-gray-700 hover:text-white hover:bg-gray-700"
                                    )}
                                >
                                    {selectionMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {selectionMode ? 'Cancelar' : 'Selección'}
                                </button>

                                <div className="w-px h-4 bg-gray-700 mx-1"></div>

                                {/* Trash */}
                                <button
                                    onClick={() => setShowTrash(true)}
                                    className="p-1.5 rounded-lg border border-transparent hover:bg-red-900/10 hover:border-red-500/30 text-gray-600 hover:text-red-500 transition-colors"
                                    title="Papelera de Reciclaje"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <button onClick={() => setShowAreaFilter(true)} className="p-1.5 rounded-lg border border-transparent hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Gestionar Columnas">
                                    <Layout className="w-4 h-4" />
                                </button>

                                <button onClick={handleExportBackup} className="p-1.5 rounded-lg border border-transparent hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Descargar Respaldo">
                                    <Database className="w-4 h-4" />
                                </button>

                                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors ml-2" title="Ocultar Columnas Vacías">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Vacías</span>
                                    <div onClick={(e) => { e.preventDefault(); setHideEmpty(!hideEmpty); }} className={clsx("w-6 h-3 rounded-full relative transition-colors border border-transparent", hideEmpty ? "bg-blue-600 border-blue-500" : "bg-gray-700 border-gray-600")}>
                                        <div className={clsx("absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all shadow-sm", hideEmpty ? "left-3.5" : "left-0.5")} />
                                    </div>
                                </label>
                            </div>
                        }
                    />
                </div>,
                document.getElementById('dashboard-header-portal')
            )}

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

            {/* --- LAZY LOADED MODALS (Suspense Wrapper) --- */}
            <Suspense fallback={null}>
                {qaTicket && <QAChecklistModal isOpen={!!qaTicket} onClose={() => handleModalClose(setQaTicket)} ticket={qaTicket} onUpdate={handleTicketUpdate} />}
                {infoTicket && <AdditionalInfoModal isOpen={!!infoTicket} onClose={() => handleModalClose(setInfoTicket)} ticket={infoTicket} onUpdate={handleTicketUpdate} />}
                {detailTicket && <TicketDetailModal isOpen={!!detailTicket} onClose={() => handleModalClose(setDetailTicket)} ticket={detailTicket} onDelete={handleTicketDelete} />}
                {slaDetailTicket && <SLADetailModal isOpen={!!slaDetailTicket} onClose={() => handleModalClose(setSlaDetailTicket)} ticket={slaDetailTicket} />}
                {transitionData && <TransitionModal isOpen={!!transitionData} onClose={() => handleModalClose(setTransitionData)} ticket={transitionData.ticketData} fromArea={transitionData.fromArea} toArea={transitionData.toArea} onConfirm={confirmTransition} />}
                {historyTicket && <ServiceHistoryModal isOpen={!!historyTicket} onClose={() => handleModalClose(setHistoryTicket)} ticketId={historyTicket.id} />}
                {tagEditData && <TagEditModal isOpen={!!tagEditData} onClose={() => setTagEditData(null)} ticket={tagEditData.ticket} tag={tagEditData.tag} />}

                {/* Expand View Modal (Inline) */}
                {expandedAreaId && (() => {
                    const areaRawTickets = tickets.filter(t => t.currentArea === expandedAreaId);
                    const areaVisibleTickets = processedTickets[expandedAreaId] || [];

                    return (
                        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-200">
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
                                        <button onClick={() => setExpandedAreaId(null)} className="p-2 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-full transition-colors border border-gray-700 hover:border-red-500/50">
                                            <XCircle className="w-8 h-8" />
                                        </button>
                                    </div>
                                }
                            />
                            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-gray-700">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 max-w-[2400px] mx-auto">
                                    <div key={ticket.id} className="transform hover:scale-[1.02] transition-transform duration-200">
                                        <TicketCard ticket={ticket} selectionMode={selectionMode} isSelected={selectedIds.has(ticket.id)} onToggleSelection={toggleSelection} onDragStart={handleDragStart} onDetail={setDetailTicket} onQA={setQaTicket} onInfo={setInfoTicket} onDispatch={setDispatchTicket} onSLA={setSlaDetailTicket} onMove={setDestinationSelectorTicket} onTagClick={(ticket, tag) => setTagEditData({ ticket, tag })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {destinationSelectorTicket && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-[#1e293b] rounded-xl border border-gray-700 shadow-2xl p-6  w-auto max-w-sm relative">
                            <button onClick={() => setDestinationSelectorTicket(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
                            <h3 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2"><ArrowRightCircle className="w-5 h-5 text-blue-500" /> Mover a...</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.values(COLUMNS).map(col => (
                                    <button
                                        key={col.id}
                                        onClick={() => handleDestinationSelect(col.id)}
                                        className={clsx(
                                            "w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 group relative overflow-hidden",
                                            destinationSelectorTicket?.currentArea === col.id ? "border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed" : "border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10"
                                        )}
                                        disabled={destinationSelectorTicket?.currentArea === col.id}
                                    >
                                        <div className={clsx("w-1 h-full absolute left-0 top-0", col.color.split(' ')[2])}></div>
                                        <span className="text-xs font-bold text-gray-300 group-hover:text-white pl-2">{col.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {bulkQaTickets && <BulkQAModal isOpen={!!bulkQaTickets} onClose={() => setBulkQaTickets(null)} tickets={bulkQaTickets} />}
                {bulkInfoTickets && <BulkInfoModal isOpen={!!bulkInfoTickets} onClose={() => setBulkInfoTickets(null)} tickets={bulkInfoTickets} />}
                {bulkPrintTickets && <BulkPrintModal isOpen={!!bulkPrintTickets} onClose={() => setBulkPrintTickets(null)} tickets={bulkPrintTickets} />}
                {bulkTagTickets && <BulkTagModal isOpen={!!bulkTagTickets} onClose={() => setBulkTagTickets(null)} tickets={bulkTagTickets} />}
                {bulkBatchTickets && <BulkBatchModal isOpen={!!bulkBatchTickets} onClose={() => setBulkBatchTickets(null)} tickets={bulkBatchTickets} />}
                {bulkDispatchTickets && <BulkDispatchModal isOpen={!!bulkDispatchTickets} onClose={() => setBulkDispatchTickets(null)} tickets={bulkDispatchTickets} />}
                {bulkBudgetTickets && <BulkBudgetModal tickets={bulkBudgetTickets} onClose={() => setBulkBudgetTickets(null)} />}
                {dispatchTicket && <DispatchModal isOpen={!!dispatchTicket} onClose={() => setDispatchTicket(null)} ticket={dispatchTicket} />}
                {budgetTicket && <TicketBudgetModal isOpen={!!budgetTicket} onClose={() => setBudgetTicket(null)} ticket={budgetTicket} />}

                {showTrash && <TrashBinModal isOpen={showTrash} onClose={() => setShowTrash(false)} />}
            </Suspense>

            <style>{`
                .scrollbar-thin::-webkit-scrollbar { width: 8px; height: 8px; }
                .scrollbar-thin::-webkit-scrollbar-track { bg: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background-color: #374151; border-radius: 4px; }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover { background-color: #4b5563; }
            `}</style>
        </div>
    );
}
