import { MetricCard, BreakdownModal } from './DashboardHelpers';
import TicketDetailModal from '../components/TicketDetailModal';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { useAdvancedFinancials } from '../hooks/useAdvancedFinancials';
import { ticketService } from '../services/ticketService';
import { useFinancialsContext } from '../context/FinancialContext';
import SalesCommandCenter from '../components/SalesCommandCenter';

import { useNavigate } from 'react-router-dom';
import {
    DollarSign, TrendingUp, Calendar, Search, FileText, ChevronDown, Filter, ChevronUp, X,
    PieChart, Wallet, CreditCard, Activity, Tag, Eye, Package, ShieldCheck,
    AlertTriangle, BarChart3, Landmark, HelpCircle, Clock, User, Users, ArrowRightLeft, AlertCircle, Database, RotateCcw, Cpu, Sparkles, Siren, Truck, Check
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart as RePieChart, Pie, Cell, LabelList, LineChart, Line, AreaChart, Area, ComposedChart, Scatter, Label
} from 'recharts';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// XLSX IS NOW DYNAMICALLY IMPORTED
import { saveAs } from 'file-saver';



const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57'];

const PriceEditCell = React.memo(({ value, ticketId, onSave, isSold }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSave(ticketId, tempValue);
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setTempValue(value);
        }
    };

    const handleBlur = () => {
        onSave(ticketId, tempValue);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex justify-end">
                <input
                    autoFocus
                    type="number"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-24 bg-gray-900 border border-blue-500 text-right text-white text-xs rounded px-1 py-0.5 outline-none"
                />
            </div>
        );
    }

    // If SOLD, readonly mode
    if (isSold) {
        return (
            <div className="flex items-center justify-end gap-2 py-1 px-2 -mr-2 rounded bg-emerald-900/30 text-emerald-400 cursor-not-allowed border border-emerald-900/50" title="Vendido - Precio Bloqueado">
                <div className="font-bold font-mono text-emerald-400">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value || 0)}
                </div>
                <div className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">✓</div>
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="group/edit flex items-center justify-end gap-2 cursor-pointer py-1 px-2 -mr-2 rounded transition-all hover:bg-gray-700/50"
            title="Click para editar precio"
        >
            <div className="font-bold font-mono text-emerald-500">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value || 0)}
            </div>
            <div className="opacity-0 group-hover/edit:opacity-100 text-gray-500 text-[10px]">✎</div>
        </div>
    );
});

const DateEditCell = React.memo(({ value, ticketId, field, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState('');

    // Format value for input (YYYY-MM-DDTHH:mm)
    useEffect(() => {
        if (!value) {
            setTempValue('');
            return;
        }
        try {
            const date = (value.seconds) ? new Date(value.seconds * 1000) : new Date(value);
            // Adjust to local ISO string for input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setTempValue(`${year}-${month}-${day}T${hours}:${minutes}`);
        } catch (e) {
            setTempValue('');
        }
    }, [value]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSave(ticketId, field, tempValue);
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    const handleBlur = () => {
        onSave(ticketId, field, tempValue);
        setIsEditing(false);
    };

    const formatDateShort = (val) => {
        if (!val) return '-';
        const date = (val?.seconds) ? new Date(val.seconds * 1000) : new Date(val);
        if (isNaN(date.getTime())) return '-';
        // DD/MM/YYYY Format
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    };

    if (isEditing) {
        return (
            <div className="flex justify-start relative z-50">
                <input
                    autoFocus
                    type="datetime-local"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-32 bg-gray-900 border border-blue-500 text-white text-[10px] rounded px-1 py-0.5 outline-none shadow-xl"
                />
            </div>
        );
    }

    return (
        <div
            onDoubleClick={() => setIsEditing(true)}
            className="group/edit cursor-pointer hover:bg-gray-700/50 rounded px-1 -ml-1 transition-all select-none"
            title="Doble click para editar fecha"
        >
            <div className="text-[10px] text-gray-400 font-mono tracking-tight leading-3 mb-1 group-hover/edit:text-blue-400">
                {formatDateShort(value)}
            </div>
        </div>
    );
});

import { useDebounce } from '../hooks/useDebounce';

export default function SalesDashboard() {
    const { user } = useAuth();
    const { role, loading: roleLoading } = useRole();
    const { calculateFinancials, ramPrices } = useFinancialsContext();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMonth, setFilterMonth] = useState(''); // Default: All time
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce 300ms
    const [filterDocType, setFilterDocType] = useState('ALL'); // ALL, FACTURA, BOLETA, INFORMAL
    const [filterArea, setFilterArea] = useState('ALL'); // New: Area Filter (Interactive)
    const [activeTab, setActiveTab] = useState('STOCK'); // FINANCIAL, OPERATIONAL, DATA
    const [selectedMetric, setSelectedMetric] = useState(null); // Modal Logic

    // --- SECURITY CHECK (Admin Only) ---
    useEffect(() => {
        if (!roleLoading) {
            if (role !== 'Admin') {
                toast.error("Acceso restringido: Solo Administradores");
                navigate('/unauthorized');
            }
        }
    }, [role, roleLoading, navigate]);

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            try {
                // Fetch ALL tickets to feed the professional hook
                const allTickets = await ticketService.getAllTickets();
                setTickets(allTickets);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Error al cargar datos financieros");
            } finally {
                setLoading(false);
            }
        };

        if (role === 'Admin') {
            fetchSales();
        }
    }, [role]);

    // --- ADVANCED CALCULATIONS ---
    // This hook is the brain. It processes raw tickets into business intelligence.
    // Initialize Date Range to Current Month
    const [filterDateStart, setFilterDateStart] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    });
    const [filterDateEnd, setFilterDateEnd] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    });
    const [filterBrand, setFilterBrand] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');

    // Detail View State
    const [detailTicket, setDetailTicket] = useState(null);

    // Global Area Filter (Multi-select)
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false); // [FIX] Missing State


    // Initialize Areas (Default: All except 'Reciclaje')
    // Initialize Areas (Default: All except 'Reciclaje')
    const [areasInitialized, setAreasInitialized] = useState(false);

    useEffect(() => {
        if (tickets.length > 0 && !areasInitialized) {
            const allAreas = [...new Set(tickets.map(t => t.currentArea || 'Recepción'))];
            // Only exclude Reciclaje if it exists in the data, or just filter it out regardless (safe).
            setSelectedAreas(allAreas.filter(a => a !== 'Reciclaje'));
            setAreasInitialized(true);
        }
    }, [tickets, areasInitialized]);

    // New Status Filters (Request: Stock & Sold Checked by default, Deleted Unchecked)
    const [filterStockActual, setFilterStockActual] = useState(true);
    const [filterSold, setFilterSold] = useState(true);
    const [filterDeleted, setFilterDeleted] = useState(false);

    // --- TAB PRESETS (Auto-Filter Configuration) ---
    useEffect(() => {
        if (activeTab === 'STOCK') {
            // STOCK PRESET: All Time, Only Stock
            setFilterDateStart('');
            setFilterDateEnd('');
            setFilterStockActual(true);
            setFilterSold(false);
            setFilterDeleted(false);
        } else if (activeTab === 'SALES') {
            // SALES PRESET: Current Month, Only Sold
            const now = new Date();
            setFilterDateStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
            setFilterDateEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
            setFilterStockActual(false);
            setFilterSold(true);
            setFilterDeleted(false);
        } else if (activeTab === 'OPERATIONAL') {
            // OPERATIONAL PRESET: Current Month, Stock + Sold (To see WIP and Throughput)
            const now = new Date();
            setFilterDateStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
            setFilterDateEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
            setFilterStockActual(true);
            setFilterSold(true);
            setFilterDeleted(false);
        }
    }, [activeTab]);

    // Update Price Handler
    const handleUpdatePrice = async (ticketId, newPrice) => {
        const numPrice = parseFloat(newPrice);
        if (isNaN(numPrice)) return;

        // Optimistic Update
        const oldTickets = [...tickets];
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, precioVenta: numPrice } : t));

        try {
            await ticketService.updateTicket(ticketId, { precioVenta: numPrice }, { userId: user?.uid, reason: 'Dashboard Price Update' });
            toast.success('Precio actualizado', { duration: 2000, icon: '💰' });
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar precio');
            setTickets(oldTickets); // Revert on error
        }
    };

    // --- SLA HELPER ---
    // Calculates elapsed days excluding Sundays
    const getSLADaysDelta = (startStr, endStr) => {
        if (!startStr) return null;

        const start = startStr.seconds ? new Date(startStr.seconds * 1000) : new Date(startStr);
        const end = endStr ? (endStr.seconds ? new Date(endStr.seconds * 1000) : new Date(endStr)) : new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

        let elapsedMs = 0;
        let current = new Date(start);

        while (current < end) {
            const nextDay = new Date(current);
            nextDay.setDate(current.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);

            let endOfSegment = nextDay;
            if (endOfSegment > end) endOfSegment = end;

            if (current.getDay() !== 0) { // Exclude Sunday (0)
                elapsedMs += (endOfSegment - current);
            }
            current = endOfSegment;
        }

        const days = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
        return days;
    };

    // Generic Date Update Handler
    const handleUpdateTicketDate = async (ticketId, field, newDateString) => {
        // Allow deletion if string is empty
        const newDate = newDateString ? new Date(newDateString) : null;

        // Validate date validity only if provided
        if (newDateString && isNaN(newDate.getTime())) return;

        // Optimistic Update
        const oldTickets = [...tickets];
        setTickets(prev => prev.map(t => t.id === ticketId ? {
            ...t,
            [field]: newDate ? newDate.toISOString() : null,
            ...(field === 'soldAt' ? { fechaSalida: newDate ? newDate.toISOString() : null } : {}) // Sync logic
        } : t));

        try {
            const payload = {
                [field]: newDate ? newDate.toISOString() : null,
                updatedAt: new Date().toISOString()
            };
            if (field === 'soldAt') payload.fechaSalida = newDate ? newDate.toISOString() : null;

            await ticketService.updateTicket(ticketId, payload, { userId: user?.uid, reason: `Dashboard ${field} Update` });
            toast.success(newDate ? 'Fecha actualizada' : 'Fecha eliminada', { duration: 2000, icon: '📅' });
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar fecha');
            setTickets(oldTickets); // Revert
        }
    };

    // Update Date Handler
    const handleUpdateDate = async (ticketId, newDateString) => {
        if (!newDateString) return;

        const newDate = new Date(newDateString);
        if (isNaN(newDate.getTime())) return;

        // Optimistic Update
        const oldTickets = [...tickets];
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, soldAt: newDate.toISOString(), fechaSalida: newDate.toISOString() } : t));

        try {
            await ticketService.updateTicket(ticketId, {
                soldAt: newDate.toISOString(),
                fechaSalida: newDate.toISOString(),
                updatedAt: new Date().toISOString()
            }, { userId: user?.uid, reason: 'Dashboard Date Update' });
            toast.success('Fecha actualizada', { duration: 2000, icon: '📅' });
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar fecha');
            setTickets(oldTickets); // Revert
        }
    };

    // --- GLOBAL FILTERING ENGINE (The Core of "Dynamic") ---
    // We filter tickets BEFORE they hit the financial calculator.
    // This implies that ALL KPIs, Charts, and Tables update to reflect the selection.
    // --- GLOBAL FILTERING ENGINE (The Core of "Dynamic") ---
    // We filter tickets BEFORE they hit the financial calculator.
    // This implies that ALL KPIs, Charts, and Tables update to reflect the selection.
    const globalFilteredTickets = useMemo(() => {
        const filtered = tickets.filter(t => {
            // 1. Date Range Filter
            const refDate = t.fechaSalida || t.soldAt || (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toISOString() : null);

            if (filterDateStart && refDate && refDate < filterDateStart) return false;
            if (filterDateEnd && refDate && refDate > filterDateEnd) return false;

            // 2. Brand Filter
            const tBrand = t.marca || t.deviceBrand || 'Genérico';
            if (filterBrand !== 'ALL' && tBrand.toUpperCase() !== filterBrand) return false;

            // 3. Type Filter
            const tType = t.tipoEquipo || t.deviceType || 'Otros';
            if (filterType !== 'ALL' && tType !== filterType) return false;

            // 4. Status Filter (Checkboxes)
            const area = t.currentArea || 'Recepción';
            const status = t.status || 'Active';

            const isDeleted = status === 'Deleted' || status === 'Basura';

            // Priority 1: Deleted (Overrides everything else)
            if (isDeleted) {
                return filterDeleted;
            }

            // Priority 2: Sold
            if (status === 'Closed' || area === 'Ventas') {
                return filterSold;
            }

            // Priority 3: Active Stock
            if (!filterStockActual) return false;

            // 5. Global Area Filter (Multi-select)
            if (selectedAreas.length > 0) {
                if (!selectedAreas.includes(area)) return false;
            }

            return true;
        });

        return filtered;
    }, [tickets, filterDateStart, filterDateEnd, filterBrand, filterType, filterStockActual, filterSold, filterDeleted, selectedAreas]);

    // --- QUICK RANGE HELPER ---
    const applyQuickRange = (type) => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();

        if (type === 'ALL') {
            setFilterDateStart('');
            setFilterDateEnd('');
            return;
        }

        let start, end;

        if (type === 'CURRENT') {
            start = new Date(y, m, 1);
            end = new Date(y, m + 1, 0);
        } else if (type === 'LAST_3_INC') {
            start = new Date(y, m - 2, 1);
            end = new Date(y, m + 1, 0);
        } else if (type === 'LAST_3_EXC') {
            start = new Date(y, m - 3, 1);
            end = new Date(y, m, 0);
        } else if (type === 'LAST_6_INC') {
            start = new Date(y, m - 5, 1);
            end = new Date(y, m + 1, 0);
        } else if (type === 'LAST_6_EXC') {
            start = new Date(y, m - 6, 1);
            end = new Date(y, m, 0);
        }

        if (start && end) {
            setFilterDateStart(start.toISOString().split('T')[0]);
            setFilterDateEnd(end.toISOString().split('T')[0]);
        }
    };

    const resetFilters = () => {
        // Reset Dates to Current Month (Default)
        const now = new Date();
        setFilterDateStart(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
        setFilterDateEnd(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

        // Reset Selects
        setFilterBrand('ALL');
        setFilterType('ALL');

        // Reset Areas
        if (tickets.length > 0) {
            const allAreas = [...new Set(tickets.map(t => t.currentArea || 'Recepción'))];
            setSelectedAreas(allAreas.filter(a => a !== 'Reciclaje'));
        }

        // Reset Toggles
        setFilterStockActual(true);
        setFilterSold(true);
        setFilterDeleted(false);

        toast.success("Filtros restablecidos");
    };

    // --- ADVANCED CALCULATIONS (Dynamic) ---
    // Now the financials reflect exactly what we are looking at.
    const financials = useAdvancedFinancials(globalFilteredTickets);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'ticketId', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- TABLE SPECIFIC FILTERS (Search, Doc Type, Month, Area) ---
    const filteredData = useMemo(() => {
        let data = globalFilteredTickets.filter(t => {
            // 1. Month Filter
            let monthMatches = true;
            if (filterMonth) {
                const dateRaw = t.fechaSalida || t.soldAt || (t.updatedAt?.seconds ? new Date(t.updatedAt.seconds * 1000).toISOString() : '');
                if (dateRaw) {
                    let yyyy_mm = '';
                    if (dateRaw.match(/^\d{4}-\d{2}/)) yyyy_mm = dateRaw.slice(0, 7);
                    else if (dateRaw.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                        const parts = dateRaw.split('/');
                        yyyy_mm = `${parts[2]}-${parts[1]}`;
                    }
                    monthMatches = yyyy_mm === filterMonth;
                } else {
                    monthMatches = false;
                }
            }

            // 2. Search Filter
            const searchLower = debouncedSearchTerm.toLowerCase();
            const searchMatches =
                (t.ticketId || '').toLowerCase().includes(searchLower) ||
                (t.nombreCliente || '').toLowerCase().includes(searchLower) ||
                (t.marca || '').toLowerCase().includes(searchLower) ||
                (t.modelo || '').toLowerCase().includes(searchLower) ||
                (t.serial || '').toLowerCase().includes(searchLower) ||
                (t.additionalInfo?.serialNumber || '').toLowerCase().includes(searchLower);

            // 3. Doc Type Filter
            const f = t.financials || {};
            let typeMatches = true;
            if (filterDocType !== 'ALL') {
                const docType = f.salesDocumentType || 'Otro';
                if (filterDocType === 'FACTURA') typeMatches = docType === 'Factura'; // Case insensitive usually better but data has capitalized
                if (filterDocType === 'BOLETA') typeMatches = docType === 'Boleta';
                // If filter is Otro, match if explicit 'Otro' OR undefined/null (default)
                if (filterDocType === 'OTRO') typeMatches = docType === 'Otro' || !f.salesDocumentType;
            }



            // 4. Area Filter (from Chart Click)
            const areaMatches = filterArea === 'ALL' || t.currentArea === filterArea;

            return monthMatches && searchMatches && typeMatches && areaMatches;
        });

        // Apply Sorting
        if (sortConfig.key) {
            data.sort((a, b) => {
                const getValue = (item, key) => {
                    // Use Context Logic for Sorting too
                    const fin = calculateFinancials(item);

                    if (key === 'precioVenta') return fin.salePrice;
                    if (key === 'precioCompra') return fin.baseCost;
                    if (key === 'costosVarios') return fin.totalCost - fin.baseCost;
                    if (key === 'costoTotal') return fin.totalCost;
                    if (key === 'utilidad') return fin.grossMargin;
                    if (key === 'taxIva') return fin.taxIva;
                    if (key === 'ivaReal') return fin.ivaReal || 0;
                    if (key === 'taxRentaReal') return fin.rentaReal; // Shadow Renta
                    if (key === 'taxRentaFiscal') return fin.rentaFiscal;
                    if (key === 'gananciaInmediata') return fin.gananciaInmediata;
                    if (key === 'utilidadNeta') return fin.utilidadNetaReal;

                    // Specialized Date Handlers (Handle Timestamp Objects)
                    if (key === 'createdAt') {
                        return item.createdAt?.seconds || 0;
                    }
                    if (key === 'soldAt') {
                        const d = item.soldAt || item.fechaSalida;
                        if (!d) return 0;
                        if (d.seconds) return d.seconds; // Timestamp
                        return new Date(d).getTime(); // ISO String
                    }

                    if (key === 'date') { // Fallback legacy
                        const d = item.fechaSalida || item.soldAt;
                        if (!d) return item.createdAt?.seconds || 0; // Use CreatedAt for Stock
                        if (typeof d === 'string' && d.includes('/')) {
                            const [day, month, year] = d.split('/');
                            return new Date(`${year}-${month}-${day}`).getTime();
                        }
                        return new Date(d).getTime();
                    }
                    // Default
                    return item[key];
                };

                const valA = getValue(a, sortConfig.key);
                const valB = getValue(b, sortConfig.key);

                if (valA < valB) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return data;
    }, [globalFilteredTickets, debouncedSearchTerm, filterDocType, filterMonth, filterArea, sortConfig]);

    // --- TOTALS CALCULATION (Memoized) ---
    const tableTotals = useMemo(() => {
        let tVenta = 0;
        let tCompra = 0;
        let tVarios = 0;
        let tCostoTotal = 0;
        let tUtil = 0;
        let tImpIva = 0; // Fiscal
        let tImpIvaReal = 0; // Shadow
        let tImpRentaReal = 0;
        let tImpRentaFiscal = 0;
        let tGananciaInmediata = 0;
        let tFinal = 0;

        filteredData.forEach(ticket => {
            const fin = calculateFinancials(ticket);

            tVenta += fin.salePrice;
            tCompra += fin.baseCost;

            // Costos Varios = Total - Base
            const varios = fin.totalCost - fin.baseCost;
            tVarios += varios;

            tCostoTotal += fin.totalCost;
            tUtil += fin.grossMargin;

            tImpIva += fin.taxIva;
            tImpIvaReal += fin.ivaReal || 0;

            // Renta Real Shadow (25% of Gross)
            tImpRentaReal += fin.rentaReal;

            tImpRentaFiscal += fin.rentaFiscal;
            tGananciaInmediata += fin.gananciaInmediata;
            tFinal += fin.utilidadNetaReal;
        });

        return { tVenta, tCompra, tVarios, tCostoTotal, tUtil, tImpIva, tImpIvaReal, tImpRentaReal, tImpRentaFiscal, tGananciaInmediata, tFinal };
    }, [filteredData, calculateFinancials]);

    // Unique Brands/Types for Dropdowns
    const uniqueBrands = useMemo(() => [...new Set(tickets.map(t => (t.marca || t.deviceBrand || 'Genérico').toUpperCase()))].sort(), [tickets]);
    const uniqueTypes = useMemo(() => [...new Set(tickets.map(t => t.tipoEquipo || t.deviceType || 'Otros'))].sort(), [tickets]);
    const uniqueAreas = useMemo(() => [...new Set(tickets.map(t => t.currentArea || 'Recepción'))].sort(), [tickets]);

    const handleExport = async () => {
        const loadingToast = toast.loading('Generando Excel...');
        try {
            const XLSX = await import('xlsx');

            const exportData = filteredData.map(t => {
                const f = t.financials || {};
                // [MODIFIED] Use Central Context
                const fin = calculateFinancials(t);
                // Derived
                const costosVarios = fin.totalCost - fin.baseCost;

                return {
                    Fecha: t.fechaSalida || t.soldAt || (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString() : '-'),
                    Ticket: t.ticketId,
                    Cliente: t.nombreCliente === 'Stock / Compra' ? '' : t.nombreCliente,
                    Equipo: `${t.marca} ${t.modelo}`,
                    'Precio Venta': fin.salePrice,
                    'Costo Compra': fin.baseCost,
                    'Costos Varios': costosVarios,
                    'Costo Total': fin.totalCost,
                    'Utilidad Bruta': fin.grossMargin, // Note: Excel header is Bruta, context is grossMargin
                    'Tipo Doc Venta': f.salesDocumentType || 'Informal',
                    'Compra con Factura': fin.isCompraFactura ? 'SI' : 'NO',
                    'IVA (SII)': fin.taxIva,
                    'Renta Total Estimada': fin.rentaReal, // Use Context Logic
                    'Renta (SII)': fin.rentaFiscal,
                    'Ganancia Inmediata': fin.gananciaInmediata,
                    'Utilidad Bruta': fin.utilidadBruta,
                    'Utilidad Neta Real': fin.utilidadNetaReal
                };
            });

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            saveAs(data, `Reporte_Global_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success('Excel descargado', { id: loadingToast });
        } catch (error) {
            console.error("Export error:", error);
            toast.error('Error al exportar', { id: loadingToast });
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const formatDateShort = (val) => {
        if (!val) return '-';
        const date = (val?.seconds) ? new Date(val.seconds * 1000) : new Date(val);
        if (isNaN(date.getTime())) return '-';
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const [showFilters, setShowFilters] = useState(true);
    const [dateSortOpen, setDateSortOpen] = useState(false); // Popover State

    // --- REPAIR FUNCTION 25-0072 ---
    const handleRepairTicket = async () => {
        const tid = '25-0072';
        const t = toast.loading('Reparando 25-0072...');
        try {
            const ref = doc(db, 'tickets', tid);
            const snap = await getDoc(ref);
            if (!snap.exists()) throw new Error('Ticket no existe');

            const data = snap.data();
            const history = data.history || [];

            console.log("Original History Length:", history.length);

            // Filter out the BAD entries
            // 1. Dec 19 Sale (approx 20:17)
            // 2. Jan 10 Move (approx 22:16)
            // 3. Jan 10 Re-opening (approx 22:16)
            // 4. Jan 10 Dispatch Update (approx 22:18)

            const cleanHistory = history.filter(h => {
                const d = h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000) : new Date(h.timestamp);
                const dateStr = d.toISOString();

                // Dec 19 Bad Entry
                if (dateStr.includes('2025-12-19') && (h.area === 'Ventas' || h.action === 'UPDATE')) return false;

                // Jan 10 Bad Entries (Between 22:16 and 22:18)
                // Keep 22:19 (The final sale)
                if (dateStr.includes('2026-01-10')) {
                    const time = d.getHours() * 60 + d.getMinutes(); // minutes from midnight
                    // 22:16 = 22*60 + 16 = 1336
                    // 22:18 = 1338
                    // 22:19 = 1339 (Keep this)
                    if (time >= 1336 && time <= 1338) return false;
                }

                return true;
            });

            console.log("Clean History Length:", cleanHistory.length);

            if (cleanHistory.length === history.length) {
                toast.error("No se encontraron entradas para borrar", { id: t });
                return;
            }

            await updateDoc(ref, { history: cleanHistory });
            toast.success("Ticket Reparado!", { id: t });
            window.location.reload(); // Refresh to skip cache issues

        } catch (e) {
            console.error(e);
            toast.error('Error: ' + e.message, { id: t });
        }
    };


    if (roleLoading || loading) return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );

    const activeFilterCount = [
        filterDateStart, filterDateEnd,
        filterBrand !== 'ALL', filterType !== 'ALL',
        !filterStockActual, !filterSold, filterDeleted // Count deviations from default? or just active checks
    ].filter(Boolean).length;


    return (
        <div className="min-h-screen bg-[#0f172a] text-gray-100 p-4 md:px-8 md:pt-2 md:pb-32">

            {/* --- CUSTOM HEADER (Injected via Portal) --- */}
            {document.getElementById('dashboard-header-portal') && createPortal(
                <div className="w-full flex items-center justify-between pl-4 pr-0">
                    {/* Left: Title + Tabs */}
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                                <Landmark className="w-5 h-5 text-emerald-400" />
                                COMMAND CENTER
                            </h1>
                            <p className="text-gray-500 text-[8px] uppercase font-bold tracking-[0.2em] leading-none ml-7">Analytics</p>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
                            <button onClick={() => setActiveTab('STOCK')} className={clsx("px-3 py-1 rounded-md text-[10px] font-bold transition-all", activeTab === 'STOCK' ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" : "text-gray-400 hover:text-white hover:bg-white/5")}>STOCK ACTUAL</button>
                            <button onClick={() => setActiveTab('SALES')} className={clsx("px-3 py-1 rounded-md text-[10px] font-bold transition-all", activeTab === 'SALES' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-gray-400 hover:text-white hover:bg-white/5")}>VENTAS</button>
                            <button onClick={() => setActiveTab('OPERATIONAL')} className={clsx("px-3 py-1 rounded-md text-[10px] font-bold transition-all", activeTab === 'OPERATIONAL' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-gray-400 hover:text-white hover:bg-white/5")}>OPERATIVO</button>
                            <button onClick={() => setActiveTab('DATA')} className={clsx("px-3 py-1 rounded-md text-[10px] font-bold transition-all", activeTab === 'DATA' ? "bg-gray-600 text-white shadow-lg shadow-gray-500/20" : "text-gray-400 hover:text-white hover:bg-white/5")}>EXPLORADOR</button>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {activeTab === 'DATA' && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Search */}
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Buscar venta (Cliente, ID...)"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-gray-800 border-gray-700 text-gray-200 text-xs rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-blue-500 w-48 transition-all border hover:border-gray-600"
                                    />
                                </div>
                                {/* Export */}
                                <button
                                    onClick={handleExport}
                                    title="Exportar a Excel"
                                    className="flex items-center justify-center bg-gray-800 hover:bg-emerald-900/30 text-gray-400 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/50 w-8 h-8 rounded-lg transition-all"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                                {/* Repair Button */}
                                <button
                                    onClick={handleRepairTicket}
                                    className="flex items-center justify-center bg-red-900/20 hover:bg-red-900/50 text-red-500 border border-red-800/50 w-8 h-8 rounded-lg ml-2"
                                    title="Reparar 25-0072"
                                >
                                    <Siren className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold",
                                showFilters
                                    ? "bg-blue-600 border-blue-500 text-white"
                                    : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                            )}
                        >
                            <Filter className="w-3 h-3" />
                            Filtros
                            <div className={clsx("ml-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px]", showFilters ? "bg-white text-blue-600" : "bg-gray-700 text-gray-300")}>
                                {globalFilteredTickets.length}
                            </div>
                            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </div>
                </div>,
                document.getElementById('dashboard-header-portal')
            )}

            {/* --- VISIBLE FILTER PANEL --- */}
            {showFilters && (
                <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 p-4 -mx-4 md:-mx-8 md:px-8 mb-6 animate-in slide-in-from-top-2 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] text-gray-500 font-bold uppercase">Rango de Fecha</label>
                                {/* Custom Quick Range Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                                        className="text-[9px] text-blue-400 font-bold hover:text-blue-300 flex items-center gap-1 transition-colors outline-none"
                                    >
                                        ⚡ Rápido...
                                    </button>

                                    {isDateDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setIsDateDropdownOpen(false)}
                                            />
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                                <div className="py-1">
                                                    {[
                                                        { label: 'Todas las Fechas', value: 'ALL' },
                                                        { label: 'Mes Actual', value: 'CURRENT' },
                                                        { label: 'Ult 3 Meses (Inc)', value: 'LAST_3_INC' },
                                                        { label: 'Ult 3 Meses (Ant)', value: 'LAST_3_EXC' },
                                                        { label: 'Ult 6 Meses (Inc)', value: 'LAST_6_INC' },
                                                        { label: 'Ult 6 Meses (Ant)', value: 'LAST_6_EXC' }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => {
                                                                applyQuickRange(opt.value);
                                                                setIsDateDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-[10px] text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border-b border-gray-700/50 last:border-0"
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 items-center">
                                <div className="flex-1 flex gap-1">
                                    <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white text-[10px] rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 transition-colors" />
                                    <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white text-[10px] rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 transition-colors" />
                                </div>
                                <button
                                    onClick={resetFilters}
                                    title="Restablecer Todo"
                                    className="p-1.5 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 border border-gray-700 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Brand */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">Marca</label>
                            <div className="relative">
                                <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white text-[10px] rounded-lg pl-2 pr-6 py-1.5 outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer">
                                    <option value="ALL">Todas</option>
                                    {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-2 pointer-events-none" />
                            </div>
                        </div>

                        {/* Type */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 font-bold uppercase">Tipo</label>
                            <div className="relative">
                                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-gray-900 border border-gray-700 text-white text-[10px] rounded-lg pl-2 pr-6 py-1.5 outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer">
                                    <option value="ALL">Todos</option>
                                    {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-2 pointer-events-none" />
                            </div>
                        </div>

                        {/* REMOVED FIX HISTORY BUTTON FROM HERE */}
                    </div>

                    {/* Status & Areas (Consolidated Row) */}
                    <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
                        <label className="text-[10px] text-gray-500 font-bold uppercase flex justify-between">
                            <span>Filtros Rápidos</span>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedAreas(uniqueAreas)} className="text-[9px] text-indigo-400 hover:text-indigo-300">Todas las Areas</button>
                                <span className="text-gray-700">|</span>
                                <button onClick={() => setSelectedAreas([])} className="text-[9px] text-gray-500 hover:text-gray-400">Ninguna</button>
                            </div>
                        </label>
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Status Group */}
                            <div className="flex gap-1 pr-3 border-r border-gray-800">
                                <label className={clsx("cursor-pointer px-2 py-1 rounded-md border text-[10px] font-bold transition-all select-none flex items-center gap-1", filterStockActual ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-gray-900 border-gray-700 text-gray-600 hover:border-gray-500")}><input type="checkbox" checked={filterStockActual} onChange={e => setFilterStockActual(e.target.checked)} className="hidden" />Stock</label>
                                <label className={clsx("cursor-pointer px-2 py-1 rounded-md border text-[10px] font-bold transition-all select-none flex items-center gap-1", filterSold ? "bg-green-500/10 border-green-500/50 text-green-400" : "bg-gray-900 border-gray-700 text-gray-600 hover:border-gray-500")}><input type="checkbox" checked={filterSold} onChange={e => setFilterSold(e.target.checked)} className="hidden" />Vendidos</label>
                                <label className={clsx("cursor-pointer px-2 py-1 rounded-md border text-[10px] font-bold transition-all select-none flex items-center gap-1", filterDeleted ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-gray-900 border-gray-700 text-gray-600 hover:border-gray-500")}><input type="checkbox" checked={filterDeleted} onChange={e => setFilterDeleted(e.target.checked)} className="hidden" />Papelera</label>
                            </div>

                            {/* Areas Group */}
                            <div className="flex flex-wrap gap-1">
                                {uniqueAreas.map(area => (
                                    <button
                                        key={area}
                                        onClick={() => {
                                            setSelectedAreas(prev =>
                                                prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                                            );
                                        }}
                                        className={clsx(
                                            "px-2 py-1 rounded-md border text-[10px] font-bold transition-all select-none whitespace-nowrap",
                                            selectedAreas.includes(area)
                                                ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-300"
                                                : "bg-gray-900 border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
                                        )}
                                    >
                                        {area}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 min-w-0 relative">

                {/* --- MODAL FOR BREAKDOWN --- */}
                <BreakdownModal
                    isOpen={!!selectedMetric}
                    onClose={() => setSelectedMetric(null)}
                    title={selectedMetric?.title}
                    items={selectedMetric?.items || []}
                />


                {filterArea !== 'ALL' && (
                    <div className="mb-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm text-gray-400">Filtro Activo:</span>
                        <button
                            onClick={() => setFilterArea('ALL')}
                            className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold hover:bg-blue-500/30 transition-colors"
                        >
                            Ãrea: {filterArea} <div className="ml-1 text-blue-400">âœ•</div>
                        </button>
                    </div>
                )}

                {/* TAB 1: STOCK DASHBOARD */}
                {activeTab === 'STOCK' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
                        {/* --- ROW 1: HIGH LEVEL STOCK --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard
                                title="CAPITAL ACTIVO"
                                value={financials.inventory.totalCapital}
                                subtitle="Costo total compra"
                                color="text-gray-400"
                                icon={HelpCircle}
                                tooltip="Dinero invertido en equipos actualmente en el taller."
                            />
                            <MetricCard
                                title="VALOR POTENCIAL"
                                value={financials.inventory.potentialValue}
                                subtitle="Precio venta estimado"
                                color="text-emerald-400"
                                icon={HelpCircle}
                                tooltip="Cuánto dinero generaríamos si vendemos todo el stock a precio de lista."
                            />
                            <MetricCard
                                title="ÍTEMS EN STOCK"
                                value={financials.inventory.totalCount} // Count
                                subtitle="Dispositivos físicos"
                                format={(v) => v} // No currency
                                color="text-blue-400"
                                icon={HelpCircle}
                                tooltip="Cantidad total de equipos en inventario."
                            />
                            <MetricCard
                                title="MARGEN POTENCIAL"
                                value={financials.inventory.potentialValue - financials.inventory.totalCapital}
                                subtitle="Ganancia proyectada"
                                color="text-purple-400"
                                icon={HelpCircle}
                                tooltip="Utilidad bruta esperada (Venta Potencial - Costo)."
                            />
                        </div>

                        {/* --- ROW 2: DETAILED BREAKDOWN (NEW) --- */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <MetricCard
                                title="Inversión RAM"
                                value={financials.inventory.breakdown.ramInvest}
                                subtitle="Upgrades Memoria"
                                color="text-green-400"
                                icon={Cpu} // Need to import Cpu locally or just use HelpCircle if not avail
                                tooltip="Costo agregado por mejoras de RAM."
                            />
                            <MetricCard
                                title="Inversión Discos"
                                value={financials.inventory.breakdown.diskInvest}
                                subtitle="Upgrades Almacen."
                                color="text-orange-400"
                                icon={CreditCard}
                                tooltip="Costo agregado por mejoras de Disco."
                            />
                            <MetricCard
                                title="Viáticos Total"
                                value={financials.inventory.breakdown.viaticosInvest}
                                subtitle="Gastos logísticos"
                                color="text-indigo-400"
                                icon={HelpCircle}
                                tooltip="Total gastado en viáticos de retiro/entrega."
                            />
                            <MetricCard
                                title="Publicidad Total"
                                value={financials.inventory.breakdown.publicidadInvest}
                                subtitle="Ads / Mkt"
                                color="text-pink-400"
                                icon={HelpCircle}
                                tooltip="Costo asignado por adquisición (Ads)."
                            />
                            <MetricCard
                                title="Otros Costos"
                                value={financials.inventory.breakdown.othersInvest}
                                subtitle="Repuestos / Extras"
                                color="text-gray-400"
                                icon={HelpCircle}
                                tooltip="Suma de repuestos y costos extras varios."
                            />
                        </div>

                        {/* --- ROW 3: CHARTS & SLA --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Inventory Distribution (Donut) */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 h-96 flex flex-col lg:col-span-1">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    Distribución de Valor (Stock)
                                    <HelpCircle className="w-3 h-3 text-gray-600 cursor-help" title="Cómo se distribuye el dinero invertido/potencial." />
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={financials.charts.inventoryDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={4}
                                            dataKey="value" // Uses Money Value
                                            stroke="none"
                                        >
                                            {financials.charts.inventoryDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                            <Label
                                                value={formatMoney(financials.inventory.potentialValue)}
                                                position="center"
                                                fill="#ffffff"
                                                fontSize={20}
                                                fontWeight="bold"
                                            />
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const total = financials.inventory.potentialValue || 1;
                                                    const percent = ((data.value / total) * 100).toFixed(1);
                                                    return (
                                                        <div className="bg-gray-900 border border-gray-700 p-3 rounded-xl shadow-xl shadow-black/50 backdrop-blur-md z-50">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].fill }}></div>
                                                                <p className="text-sm font-bold text-white">{data.name}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs text-gray-300 flex justify-between gap-4">
                                                                    <span>Potencial:</span>
                                                                    <span className="font-bold text-green-400">{formatMoney(data.value)}</span>
                                                                </p>
                                                                <p className="text-xs text-gray-300 flex justify-between gap-4">
                                                                    <span>Cantidad:</span>
                                                                    <span className="font-bold text-white">{data.count} unds ({percent}%)</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Legend
                                            layout="horizontal"
                                            verticalAlign="bottom"
                                            align="center"
                                            wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }}
                                            formatter={(value, entry) => {
                                                const total = financials.inventory.potentialValue || 1;
                                                const item = financials.charts.inventoryDistribution.find(i => i.name === value);
                                                const percent = item ? ((item.value / total) * 100).toFixed(0) : 0;
                                                return <span className="text-gray-400 ml-1">{value} <span className="text-gray-600 text-[9px]">({percent}%)</span></span>;
                                            }}
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Capital & SLA (2/3 width) */}
                            <div className="flex flex-col gap-6 lg:col-span-2 h-96">
                                {/* Chart: Capital vs Potential */}
                                <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 flex-1 flex flex-col min-h-0">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                        Valor Invertido vs. Potencial por Área
                                        <HelpCircle className="w-3 h-3 text-gray-600 cursor-help" title="Comparativa Dinero Invertido (Costo) vs Dinero Esperado (Venta)" />
                                    </h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={financials.charts.capital} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                            <XAxis type="number" stroke="#9ca3af" fontSize={10} tickFormatter={(val) => `$${val / 1000}k`} />
                                            <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} fontSize={10} interval={0} />
                                            <Tooltip
                                                cursor={{ fill: '#374151', opacity: 0.2 }}
                                                formatter={(value) => formatMoney(value)}
                                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                                            <Bar dataKey="value" name="Costo Inv." fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={8} />
                                            <Bar dataKey="potential" name="Venta Potencial" fill="#10b981" radius={[0, 4, 4, 0]} barSize={8} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* SLA List (Expanded & Weighted) */}
                                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 flex-none overflow-x-auto">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        % Vencidos por Área (SLA)
                                    </h3>
                                    <div className="flex gap-4 pb-2">
                                        {Object.entries(financials.inventory.sla).map(([area, stats]) => {
                                            const percent = stats.total > 0 ? (stats.expired / stats.total) * 100 : 0;
                                            const isHigh = percent > 50;

                                            // Weighted Average Calculation
                                            // Formula: (Sum of Remaining Time / Sum of Limit Time) * 100
                                            // Represents how much "buffer" is left on average.
                                            let weightedAvg = 0;
                                            if (stats.totalLimit > 0) {
                                                weightedAvg = (stats.totalRemaining / stats.totalLimit) * 100;
                                            }

                                            return (
                                                <div key={area} className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex flex-col items-center text-center min-w-[140px] shadow-lg shadow-black/20 hover:bg-gray-800/80 transition-colors">
                                                    <div className="text-[10px] text-gray-400 uppercase font-bold truncate w-full mb-2" title={area}>{area}</div>

                                                    {/* Main Metric: % Expired */}
                                                    <div className={clsx("text-3xl font-black mt-1", isHigh ? "text-red-500" : "text-gray-200")}>
                                                        {percent.toFixed(0)}%
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-medium mb-3">
                                                        {stats.expired} de {stats.total} Vencidos
                                                    </div>

                                                    {/* Secondary Metric: Weighted Avg */}
                                                    <div className="w-full pt-2 border-t border-gray-700/50 mt-auto">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pr Pond</span>
                                                            <span className={clsx("text-sm font-bold", weightedAvg < 0 ? "text-red-400" : "text-emerald-400")}>
                                                                {weightedAvg.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: SALES DASHBOARD (COMMAND CENTER) */}
                {activeTab === 'SALES' && (
                    <SalesCommandCenter tickets={filteredData} />
                )}

                {/* TAB 2: OPERATIONAL DASHBOARD */}
                {activeTab === 'OPERATIONAL' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">

                        {/* --- ROW 1: OPERATIONAL KPIs --- */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Cycle Time */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm relative group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Promedio de dÃ­as desde Ingreso hasta Entrega/Cierre.">
                                    <HelpCircle className="w-4 h-4 text-blue-500" />
                                </div>
                                <div className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Velocidad de Cierre</div>
                                <div className="text-2xl font-black text-white">{financials.operational.avgCycleTime} <span className="text-sm font-normal text-gray-400">dÃ­as</span></div>
                                <div className="text-xs text-gray-500 mt-1">Tiempo de Ciclo Global</div>
                            </div>

                            {/* Inventory Age */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm relative group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Edad promedio de los equipos que estÃ¡n ACTUALMENTE en el taller.">
                                    <HelpCircle className="w-4 h-4 text-purple-500" />
                                </div>
                                <div className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">Edad Inventario</div>
                                <div className="text-2xl font-black text-white">{financials.operational.avgInventoryAge} <span className="text-sm font-normal text-gray-400">dÃ­as</span></div>
                                <div className="text-xs text-gray-500 mt-1">AntigÃ¼edad Stock Activo</div>
                            </div>

                            {/* Active Work In Process (WIP) */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm relative group">
                                <div className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Tickets Activos (WIP)</div>
                                <div className="text-2xl font-black text-white">{financials.inventory.totalCount}</div>
                                <div className="text-xs text-gray-500 mt-1">Equipos en proceso</div>
                            </div>

                            {/* Zombie Stock */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-red-900/30 backdrop-blur-sm relative group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" title="Equipos con mÃ¡s de 90 dÃ­as en el taller. Riesgo de abandono.">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Stock Crítico (&gt;90d)</div>
                                <div className="text-2xl font-black text-white">{financials.operational.zombieStock} <span className="text-sm font-normal text-gray-500">tickets</span></div>
                                <div className="text-xs text-red-500/80 mt-1">{((financials.operational.zombieStock / (financials.inventory.totalCount || 1)) * 100).toFixed(1)}% del inventario</div>
                            </div>
                        </div>

                        {/* --- ROW 2: VELOCITY & AGE BY AREA --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cycle Time by Area */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 h-80 flex flex-col">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    Velocidad por Ãrea (DÃ­as Promedio)
                                    <HelpCircle className="w-3 h-3 text-gray-600 cursor-help" title="CuÃ¡nto tarda un equipo en salir de cada Ã¡rea (datos histÃ³ricos)." />
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(financials.operational.cycleTimeByArea).map(([area, data]) => ({
                                            name: area,
                                            avg: data.count > 0 ? Math.round(data.totalDays / data.count) : 0
                                        }))}
                                        layout="vertical"
                                        margin={{ left: 20 }} // Space for labels
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                        <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} fontSize={11} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                                        <Bar dataKey="avg" fill="#3b82f6" radius={[0, 4, 4, 0]} name="DÃ­as" barSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Inventory Age by Area */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 h-80 flex flex-col">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    AntigÃ¼edad del Stock Actual por Ãrea
                                    <HelpCircle className="w-3 h-3 text-gray-600 cursor-help" title="Hace cuÃ¡nto tiempo llegaron los equipos que estÃ¡n HOY en cada Ã¡rea." />
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(financials.operational.inventoryAgeByArea).map(([area, data]) => ({
                                            name: area,
                                            avg: data.count > 0 ? Math.round(data.totalDays / data.count) : 0
                                        }))}
                                        layout="vertical"
                                        margin={{ left: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                        <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} fontSize={11} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                                        <Bar dataKey="avg" fill="#a855f7" radius={[0, 4, 4, 0]} name="DÃ­as Antiquedad" barSize={18} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* --- ROW 3: WORKLOAD & STATUS --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Status Breakdown (Donut/Pie is better here for distribution) or Bar */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 h-80 flex flex-col">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    Cuello de Botella (Status Distribution)
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={Object.entries(financials.operational.statusBreakdown).map(([k, v]) => ({ name: k, value: v }))}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {Object.keys(financials.operational.statusBreakdown).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.5)" />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px' }} />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Technician Workload (Vertical Bar) */}
                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 h-80 flex flex-col lg:col-span-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    Carga de Trabajo / Productividad (Tickets Creados)
                                    <HelpCircle className="w-3 h-3 text-gray-600 cursor-help" title="QuiÃ©n estÃ¡ ingresando mÃ¡s trabajos al sistema." />
                                </h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={financials.charts.tech} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                                        <YAxis stroke="#9ca3af" fontSize={11} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                                        <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Tickets" barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* --- ROW 4: FLOW ANALYSIS --- */}
                        <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700/50 h-80 flex flex-col">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                Flujo de Entrada vs Salida (Mensual)
                                <HelpCircle className="w-3 h-3 text-gray-600 cursor-help" title="Comparativa de volumen de trabajo que entra vs el que sale." />
                            </h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={(() => {
                                        const allMonths = new Set([...Object.keys(financials.operational.inflow), ...Object.keys(financials.operational.outflow)]);
                                        return Array.from(allMonths).sort().map(m => ({
                                            month: m,
                                            in: financials.operational.inflow[m] || 0,
                                            out: financials.operational.outflow[m] || 0
                                        }));
                                    })()}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickFormatter={v => v.slice(5)} />
                                    <YAxis stroke="#9ca3af" fontSize={11} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                                    <Area type="monotone" dataKey="in" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorIn)" name="Entrada (Input)" />
                                    <Area type="monotone" dataKey="out" stroke="#10b981" fillOpacity={1} fill="url(#colorOut)" name="Salida (Output)" />
                                    <Legend />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* TAB 3: DATA EXPLORER (Table Only) */}
                {activeTab === 'DATA' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">


                            <div className="overflow-auto max-h-[calc(100vh-250px)] border-t border-gray-700 relative scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                                <table className="w-full text-left border-collapse relative">
                                    <thead className="sticky top-0 z-30 shadow-lg">
                                        <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-bold rounded-tl-xl text-center border-b border-gray-800 bg-gray-900 sticky top-0 cursor-pointer hover:text-blue-400 transition-colors" onClick={() => handleSort('ticketId')}>
                                                <div className="flex items-center justify-center gap-1">
                                                    Acción
                                                    {sortConfig.key === 'ticketId' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 cursor-pointer hover:text-white transition-colors relative" onClick={() => setDateSortOpen(!dateSortOpen)}>
                                                <div className="flex items-center gap-1">
                                                    Fechas
                                                    <span className="text-[9px] text-gray-500 font-normal ml-1">
                                                        {sortConfig.key === 'createdAt' && '(Ing.)'}
                                                        {sortConfig.key === 'soldAt' && '(Vta.)'}
                                                    </span>
                                                    {(sortConfig.key === 'createdAt' || sortConfig.key === 'soldAt') && (
                                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />
                                                    )}
                                                </div>

                                                {/* Date Sort Popover */}
                                                {dateSortOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setDateSortOpen(false); }} />
                                                        <div className="absolute left-0 top-full mt-2 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                                            <div className="py-1 flex flex-col">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleSort('createdAt'); setDateSortOpen(false); }}
                                                                    className={clsx("px-3 py-2 text-left text-xs hover:bg-gray-700 flex items-center justify-between", sortConfig.key === 'createdAt' ? "text-blue-400 font-bold bg-blue-500/10" : "text-gray-300")}
                                                                >
                                                                    Ingreso
                                                                    {sortConfig.key === 'createdAt' && <Check className="w-3 h-3" />}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleSort('soldAt'); setDateSortOpen(false); }}
                                                                    className={clsx("px-3 py-2 text-left text-xs hover:bg-gray-700 flex items-center justify-between", sortConfig.key === 'soldAt' ? "text-blue-400 font-bold bg-blue-500/10" : "text-gray-300")}
                                                                >
                                                                    Venta
                                                                    {sortConfig.key === 'soldAt' && <Check className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-center">
                                                Tiempos
                                            </th>


                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('modelo')}>
                                                <div className="flex items-center gap-1">
                                                    Equipo
                                                    {sortConfig.key === 'modelo' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('currentArea')}>
                                                <div className="flex items-center gap-1">
                                                    Ubicación
                                                    {sortConfig.key === 'currentArea' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-purple-400 cursor-pointer hover:text-purple-300 transition-colors" title="Costo de Compra" onClick={() => handleSort('precioCompra')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Costo Equipo
                                                    {sortConfig.key === 'precioCompra' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-gray-400 cursor-pointer hover:text-gray-200 transition-colors" title="Costos Varios" onClick={() => handleSort('costosVarios')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Costos Var.
                                                    {sortConfig.key === 'costosVarios' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-red-400 cursor-pointer hover:text-red-300 transition-colors" title="Costo Total" onClick={() => handleSort('costoTotal')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Costo Total
                                                    {sortConfig.key === 'costoTotal' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors" title="Precio Venta" onClick={() => handleSort('precioVenta')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Precio Venta
                                                    {sortConfig.key === 'precioVenta' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-orange-400 cursor-pointer hover:text-orange-300 transition-colors" title="Simulación: EL 19% del valor total (Incluido en el precio). &#013;Muestra cuánto IVA genera esta venta teóricamente." onClick={() => handleSort('ivaReal')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    IVA Total Estimado
                                                    {sortConfig.key === 'ivaReal' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-orange-400 cursor-pointer hover:text-orange-300 transition-colors" title="Real a Pagar (SII): &#013;IVA Débito (Venta) - IVA Crédito (Compra). &#013;Si es negativo, es saldo a favor." onClick={() => handleSort('taxIva')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    IVA (SII)
                                                    {sortConfig.key === 'taxIva' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-yellow-500 cursor-pointer hover:text-yellow-400 transition-colors" title="Simulación Renta: &#013;Caso Ideal (Con Factura): 25% de la Utilidad. &#013;Peor Caso (Sin Factura): 25% de la Venta Total." onClick={() => handleSort('taxRentaReal')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Renta Total Estimada
                                                    {sortConfig.key === 'taxRentaReal' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right text-yellow-600 cursor-pointer hover:text-yellow-500 transition-colors" title="Real a Pagar (SII): &#013;Impuesto declarado en F29. &#013;Cero si la venta es informal." onClick={() => handleSort('taxRentaFiscal')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Renta (SII)
                                                    {sortConfig.key === 'taxRentaFiscal' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right cursor-pointer hover:text-white transition-colors" title="Margen de Caja: Precio Venta - Costos Totales (Sin considerar créditos ni impuestos)" onClick={() => handleSort('gananciaInmediata')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Ganancia Inmediata
                                                    {sortConfig.key === 'gananciaInmediata' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('utilidad')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Utilidad Bruta
                                                    {sortConfig.key === 'utilidad' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                            <th className="px-2 py-3 font-bold border-b border-gray-800 bg-gray-900 sticky top-0 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('utilidadNeta')}>
                                                <div className="flex items-center justify-end gap-1">
                                                    Utilidad Neta
                                                    {sortConfig.key === 'utilidadNeta' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-gray-700/50">
                                        {filteredData.length > 0 ? (
                                            filteredData.map((ticket) => {
                                                const f = ticket.financials || {};

                                                // --- USE CENTRALIZED FINANCIAL UTILS ---
                                                // [MODIFIED] Now using context's calculateFinancials directly
                                                const fin = calculateFinancials(ticket);

                                                // OLD: calculateTicketFinancials(ticket, ramPrices);
                                                // MAPPING:
                                                // fin.costoCompra -> fin.baseCost
                                                // fin.costosVarios -> (fin.totalCost - fin.baseCost)
                                                // fin.totalCostoCash -> fin.totalCost
                                                // fin.precioVenta -> fin.salePrice
                                                // fin.taxIva -> fin.taxIva
                                                // fin.rentaFiscal -> fin.rentaFiscal
                                                // fin.utilidadBruta -> fin.grossMargin
                                                // fin.utilidadNetaReal -> fin.utilidadNetaReal

                                                // Derived for display:
                                                const costosVarios = fin.totalCost - fin.baseCost;

                                                return (
                                                    <tr key={ticket.id} className="hover:bg-gray-700/30 transition-colors group">
                                                        <td className="px-2 py-3 text-center w-16 align-top">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <button
                                                                    onClick={() => setDetailTicket(ticket)}
                                                                    className="p-2 bg-blue-900/30 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors border border-blue-500/30"
                                                                    title="Ver Ficha Completa"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <div className="font-mono font-bold text-white text-[10px] break-all">{ticket.ticketId}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 h-16 max-h-16 overflow-visible">
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-1.5" title="Fecha Ingreso">
                                                                    <span className="text-[9px] text-gray-500 font-mono w-4">IN:</span>
                                                                    <DateEditCell
                                                                        value={ticket.createdAt}
                                                                        ticketId={ticket.id}
                                                                        field="createdAt"
                                                                        onSave={handleUpdateTicketDate}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1.5" title="Fecha Venta">
                                                                    <span className="text-[9px] text-emerald-500/70 font-mono w-4">VT:</span>
                                                                    <DateEditCell
                                                                        value={ticket.soldAt || ticket.fechaSalida}
                                                                        ticketId={ticket.id}
                                                                        field="soldAt"
                                                                        onSave={handleUpdateTicketDate}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-2 py-3 h-16 max-h-16 overflow-hidden">
                                                            {/* SLA Financial Metrics */}
                                                            {(ticket.createdAt) && (
                                                                <div className="flex flex-col gap-0.5 items-start justify-center h-full">
                                                                    {(() => {
                                                                        const entryDate = ticket.createdAt;
                                                                        const soldDate = ticket.soldAt; // Can be null
                                                                        const dispatchMov = ticket.history?.findLast(h => h.area === 'Caja Despacho');
                                                                        const dispatchDate = dispatchMov?.timestamp;

                                                                        // 1. Prep Time: Entry -> Dispatch (or Now if not yet dispatched)
                                                                        // If never Dispatched, Prep = Entry -> Now (Work in Progress)
                                                                        const prepEnd = dispatchDate || (soldDate ? null : new Date().toISOString());
                                                                        const prepDays = prepEnd ? getSLADaysDelta(entryDate, prepEnd) : null;

                                                                        // 2. Shelf Time: Dispatch -> Sell (or Now if not sold)
                                                                        // Only applicable if Dispatched
                                                                        const shelfEnd = soldDate || new Date().toISOString();
                                                                        const shelfDays = dispatchDate ? getSLADaysDelta(dispatchDate, shelfEnd) : null;

                                                                        // 3. Total Time: Entry -> Sell (or Now)
                                                                        const totalDays = getSLADaysDelta(entryDate, soldDate || new Date().toISOString());

                                                                        return (
                                                                            <>
                                                                                {/* Row 1: Prep & Shelf */}
                                                                                <div className="flex items-center gap-2">
                                                                                    {/* Prep */}
                                                                                    <div className="flex items-center gap-1 text-[9px]" title="Tiempo de Preparación (Ingreso -> Despacho)">
                                                                                        <span className="text-gray-500 font-mono">P:</span>
                                                                                        <span className={clsx("font-bold", prepDays > 7 ? "text-orange-400" : "text-gray-400")}>
                                                                                            {prepDays !== null ? `${prepDays}d` : '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-gray-700 text-[8px]">|</span>
                                                                                    {/* Shelf */}
                                                                                    <div className="flex items-center gap-1 text-[9px]" title="Tiempo en Vitrina (Despacho -> Venta)">
                                                                                        <Truck className="w-2.5 h-2.5 text-blue-500" />
                                                                                        <span className={clsx("font-bold", shelfDays > 15 ? "text-red-400" : "text-blue-300")}>
                                                                                            {shelfDays !== null ? `${shelfDays}d` : '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Row 2: Total */}
                                                                                <div className="flex items-center gap-1 text-[9px] border-t border-gray-800 pt-0.5 mt-0.5 w-full" title="Tiempo Total de Rotación (Ingreso -> Venta)">
                                                                                    <span className="text-gray-500 font-mono w-4">Tot:</span>
                                                                                    <span className={clsx("font-bold", totalDays > 30 ? "text-red-400" : "text-gray-300")}>
                                                                                        {totalDays}d
                                                                                    </span>
                                                                                </div>
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </td>



                                                        <td className="px-2 py-3 h-16 max-h-16 overflow-hidden max-w-[200px]">
                                                            <div className="flex flex-col">
                                                                <div className="text-xs font-bold text-white truncate" title={ticket.modelo}>{ticket.modelo || 'Desconocido'}</div>
                                                                {(ticket.additionalInfo?.cpuBrand || ticket.cpuBrand || ticket.specs?.cpu || ticket.originalSpecs?.cpu) && (
                                                                    <div className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                                                        <Cpu className="w-3 h-3" />
                                                                        {ticket.additionalInfo?.cpuBrand || ticket.cpuBrand || ticket.specs?.cpu || ticket.originalSpecs?.cpu}
                                                                        {(ticket.additionalInfo?.cpuGen || ticket.cpuGen || ticket.specs?.generation) && (
                                                                            <span className="text-gray-500">· {ticket.additionalInfo?.cpuGen || ticket.cpuGen || ticket.specs?.generation}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 h-16 max-h-16 overflow-visible relative group/status cursor-help">
                                                            <div className="flex flex-col">
                                                                <span className={clsx("font-bold text-[10px] px-2 py-0.5 rounded-full w-fit flex items-center gap-1",
                                                                    ticket.currentArea === 'Ventas' ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30' :
                                                                        ticket.status === 'Closed' ? 'bg-gray-700 text-gray-400' :
                                                                            'bg-blue-900/40 text-blue-400 border border-blue-500/30'
                                                                )}>
                                                                    {ticket.currentArea === 'Ventas' ? <Sparkles className="w-3 h-3" /> : ''}
                                                                    {(ticket.currentArea || 'N/A').replace('Caja ', '')}
                                                                </span>
                                                            </div>
                                                            {/* HISTORY TOOLTIP */}
                                                            <div className="absolute left-0 top-10 mt-2 w-72 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-3 z-50 opacity-0 group-hover/status:opacity-100 transition-opacity pointer-events-none select-none backdrop-blur-md">
                                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 border-b border-gray-700 pb-1 flex items-center gap-2">
                                                                    <Clock className="w-3 h-3" /> Historial Reciente
                                                                </h4>
                                                                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                                                                    {ticket.history?.length > 0 ? (
                                                                        [...ticket.history].reverse().slice(0, 5).map((h, i) => (
                                                                            <div key={i} className="text-[10px] text-gray-300 border-l-2 border-gray-700 pl-2 hover:border-blue-500 transition-colors">
                                                                                <div className="flex justify-between text-gray-500 text-[9px] mb-0.5">
                                                                                    <span>{h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleDateString() : new Date(h.timestamp).toLocaleDateString()}</span>
                                                                                    <span className="text-gray-600">{h.userId || 'System'}</span>
                                                                                </div>
                                                                                <div className="font-bold text-blue-300 flex items-center gap-1">
                                                                                    {h.action} <span className="text-gray-600">→</span> {h.area}
                                                                                </div>
                                                                                {h.note && <div className="text-gray-500 italic truncate max-w-[200px] text-[9px]">"{h.note}"</div>}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-gray-600 italic text-[10px] text-center">Sin historial disponible</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Costo Equipo */}
                                                        <td className="px-2 py-3 text-right">
                                                            <div className="text-purple-300 font-medium">-{formatMoney(fin.baseCost)}</div>
                                                        </td>

                                                        {/* Costos Varios */}
                                                        <td className="px-2 py-3 text-right">
                                                            <div className="text-gray-400 text-xs">-{formatMoney(costosVarios)}</div>
                                                        </td>

                                                        {/* Costo Total */}
                                                        <td className="px-2 py-3 text-right">
                                                            <div className="font-bold text-red-400">-{formatMoney(fin.totalCost)}</div>
                                                        </td>

                                                        {/* Precio Venta - Editable */}
                                                        <td className="px-2 py-3 h-16 max-h-16 overflow-hidden text-right">
                                                            <PriceEditCell
                                                                value={fin.salePrice}
                                                                ticketId={ticket.id}
                                                                onSave={handleUpdatePrice}
                                                                isSold={fin.isSold}
                                                            />
                                                        </td>

                                                        <td className="px-2 py-3 text-right">
                                                            {/* IVA Real (Shadow) */}
                                                            <div className="text-orange-400/50 font-mono text-xs">
                                                                {formatMoney(fin.ivaReal || 0)}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-right border-l border-gray-800">
                                                            <div className={clsx("font-mono text-xs font-bold", fin.taxIva > 0 ? "text-orange-400" : "text-emerald-400")}>
                                                                {formatMoney(fin.taxIva)}
                                                            </div>
                                                            <div className="text-[9px] text-gray-600">
                                                                {fin.isCompraFactura ? 'C. Formal' : 'C. Informal'}
                                                            </div>
                                                        </td>

                                                        <td className="px-2 py-3 text-right">
                                                            {/* Renta Real (Shadow/Theoretical) - 25% of Margin regardless of formal status */}
                                                            <div className="text-yellow-500/50 font-mono text-xs" title="Renta Teórica (Si todo fuera formal)">
                                                                {formatMoney(fin.rentaReal)}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-right border-l border-gray-800">
                                                            {/* Renta SII (Fiscal) - Actual Payable */}
                                                            <div className="text-yellow-500 font-mono text-xs font-bold">
                                                                {formatMoney(fin.rentaFiscal)}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-right border-l border-gray-800">
                                                            <div className={clsx("font-mono text-xs font-bold text-white")}>
                                                                {formatMoney(fin.gananciaInmediata)}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-right">
                                                            <div className={clsx("font-bold", fin.grossMargin >= 0 ? "text-green-400" : "text-red-400")}>
                                                                {formatMoney(fin.grossMargin)}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-3 text-right">
                                                            <div className={clsx("font-black text-sm", fin.utilidadNetaReal >= 0 ? "text-emerald-400" : "text-red-500")}>
                                                                {formatMoney(fin.utilidadNetaReal)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="p-12 text-center text-gray-500">
                                                    No hay registros que coincidan con los filtros.
                                                </td>
                                            </tr>
                                        )
                                        }
                                    </tbody>
                                    <tfoot>
                                        <tr className="text-sm font-black text-white bg-[#0f172a] shadow-[0_-5px_15px_rgba(0,0,0,0.5)] border-t border-indigo-500/50">
                                            <td colSpan="5" className="py-1 px-2 sticky bottom-0 z-40 bg-[#0f172a] text-indigo-400 uppercase tracking-wider text-[10px]">
                                                TOTALES
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a]">
                                                {/* Empty for purchase price if unified? No, this is purchase cost column */}
                                                <div className="text-purple-400 text-xs">-{formatMoney(tableTotals.tCompra)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a]">
                                                <div className="text-gray-400 text-xs">-{formatMoney(tableTotals.tVarios)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a]">
                                                <div className="text-red-400 text-xs">-{formatMoney(tableTotals.tCostoTotal)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a]">
                                                <div className="text-emerald-400 text-xs">{formatMoney(tableTotals.tVenta)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a]">
                                                <div className="text-orange-400/50 text-[10px]">{formatMoney(tableTotals.tImpIvaReal)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a] border-l border-gray-800">
                                                <div className="text-orange-400 font-bold text-[10px]">{formatMoney(tableTotals.tImpIva)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a]">
                                                <div className="text-yellow-400 text-[10px]">{formatMoney(tableTotals.tImpRentaReal)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a] border-l border-gray-800">
                                                <div className="text-yellow-600 text-[10px]">{formatMoney(tableTotals.tImpRentaFiscal)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a] border-l border-gray-800">
                                                <div className="text-white text-[10px] uppercase font-bold">{formatMoney(tableTotals.tGananciaInmediata)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a]">
                                                <div className="text-green-400 text-xs">{formatMoney(tableTotals.tUtil)}</div>
                                            </td>
                                            <td className="py-1 px-2 text-right sticky bottom-0 z-40 bg-[#0f172a] border-l border-gray-700">
                                                <div className="text-emerald-400 text-sm font-black">{formatMoney(tableTotals.tFinal)}</div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>




                        </div>
                    </div>
                )}

            </div>

            {/* DETAIL MODAL */}
            {
                detailTicket && (
                    <TicketDetailModal
                        ticket={detailTicket}
                        onClose={() => setDetailTicket(null)}
                    />
                )
            }
        </div >
    );
}
