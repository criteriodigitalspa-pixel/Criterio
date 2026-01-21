import { useMemo } from 'react';
import { calculateTicketFinancials } from '../utils/financialUtils';

/**
 * Hook PRO para cálculo de métricas financieras avanzadas.
 * Mastica la lista completa de tickets y devuelve los "Cubos de Datos" para el Dashboard.
 * 
 * @param {Array} tickets - Lista cruda de tickets de Firestore
 */
export const useAdvancedFinancials = (tickets = []) => {

    return useMemo(() => {
        // --- 1. CONFIGURACIÓN E INICIALIZACIÓN ---

        // buckets para agrupación de Capital (Stock) - MATCHING KANBAN COLUMNS
        const capitalByArea = {
            'Compras': 0,
            'Servicio Rapido': 0,
            'Servicio Dedicado': 0,
            'Caja Espera': 0,
            'Caja Publicidad': 0,
            'Caja Despacho': 0,
            'Caja Reciclaje': 0
        };

        const countByArea = {
            'Compras': 0, 'Servicio Rapido': 0, 'Servicio Dedicado': 0, 'Caja Espera': 0,
            'Caja Publicidad': 0, 'Caja Despacho': 0, 'Caja Reciclaje': 0
        };

        const potentialValueByArea = {
            'Compras': 0, 'Servicio Rapido': 0, 'Servicio Dedicado': 0, 'Caja Espera': 0,
            'Caja Publicidad': 0, 'Caja Despacho': 0, 'Caja Reciclaje': 0
        };

        // Métricas Globales
        let totalCapitalInvertido = 0; // Costo Total de equipos ACTIVOS (No vendidos)
        let totalVentaPotencial = 0;   // Cuánto sacaría si vendo todo hoy (Inventory Value)

        // Ventas REALIZADAS (Cerradas)
        let totalVentasBrutas = 0;
        let totalCostoVentas = 0;
        let totalUtilidadReal = 0;

        // Fiscal / Tributario
        let totalIvaDebito = 0;  // Debo al fisco (Ventas Formales)
        let totalIvaCredito = 0; // Fisco me debe (Compras Formales)
        let baseImponibleRenta = 0; // Para cálculo de Renta (25%)

        // Análisis de Formalización
        const analysis = {
            comprasFactura: { count: 0, monto: 0 },
            comprasInformal: { count: 0, monto: 0 },
            ventasFactura: { count: 0, monto: 0 },
            ventasBoleta: { count: 0, monto: 0 },
            ventasInformal: { count: 0, monto: 0 },

            // Cruces de Riesgo
            riskLostCredit: { count: 0, amount: 0 }, // Was formalBuy_InformalSell
            riskTaxHit: { count: 0, amount: 0 }      // Was informalBuy_FormalSell
        };

        const evolutionData = {}; // { "2025-12": { sales: 0, cost: 0, profit: 0 } }

        // Operational Metrics Buffers
        const operational = {
            globalCycleTime: { totalDays: 0, count: 0 },
            globalInventoryAge: { totalDays: 0, count: 0 },
            cycleTimes: {}, // { Area: { totalDays: X, count: Y } }
            inventoryAge: {}, // { Area: { totalDays: X, count: Y } }
            statusBreakdown: {}
        };

        // --- MISSING INITIALIZATIONS FIXED ---
        const brandStats = {};
        const typeStats = {};
        const dailyStats = {};

        const costComposition = { baseCost: 0, parts: 0, extra: 0, viatico: 0, publicidad: 0 };

        const taxDetails = {
            ivaDebito: 0,
            ivaCreditoTotal: 0,
            ivaCreditoUsed: 0,
            renta: 0,
            f29Payable: 0,
            taxHit: 0,
            lostCredit: 0
        };

        const operationalStats = {
            createdByUser: {},
            inflowByMonth: {},
            outflowByMonth: {},
            zombieStock: 0 // Count > 90 days
        };

        // --- 2. PROCESAMIENTO DE TICKETS ---

        tickets.forEach(ticket => {
            // Helpers
            const financials = ticket.financials || {};
            const status = ticket.status || 'Active';
            let area = ticket.currentArea || 'Compras';
            // Sanitize Area to match Kanban
            if (area === 'Ingreso' || area === 'Recepción') area = 'Compras';
            if (area === 'Diagnóstico') area = 'Servicio Rapido';

            const brand = (ticket.marca || ticket.deviceBrand || 'OTRO').toString().trim().toUpperCase();
            const type = (ticket.tipoEquipo || ticket.deviceType || 'OTRO').toString().trim().toUpperCase();
            const createdAt = ticket.createdAt?.seconds ? new Date(ticket.createdAt.seconds * 1000) : null;
            const closedAt = ticket.closedAt?.seconds ? new Date(ticket.closedAt.seconds * 1000) : null;
            const now = new Date();

            // Init Dynamic Stats
            if (!brandStats[brand]) brandStats[brand] = { name: brand, stockValue: 0, count: 0, sales: 0, profit: 0 };
            if (!typeStats[type]) typeStats[type] = { name: type, stockValue: 0, count: 0, sales: 0, profit: 0 };

            // Operational Inflow
            if (createdAt) {
                const monthKey = createdAt.toISOString().slice(0, 7);
                operationalStats.inflowByMonth[monthKey] = (operationalStats.inflowByMonth[monthKey] || 0) + 1;

                const user = ticket.createdBy || 'Sistema'; // Or technician field
                operationalStats.createdByUser[user] = (operationalStats.createdByUser[user] || 0) + 1;
            }

            // Costos Básicos
            const costoCompra = parseFloat(ticket.precioCompra) || 0;
            const repuestos = parseFloat(ticket.reparacion?.costoRepuestos) || 0;
            const extras = parseFloat(ticket.costosExtra) || 0;
            const viatico = financials.viaticoCost !== undefined ? parseFloat(financials.viaticoCost) : 2500;
            const publicidad = financials.publicidadCost !== undefined ? parseFloat(financials.publicidadCost) : 3500;

            const costoTotalCash = costoCompra + repuestos + extras + viatico + publicidad;

            // Flags Documentarios
            const isCompraFactura = !!(ticket.conFactura || financials.boughtWithInvoice);
            const tipoVenta = (financials.salesDocumentType || 'Otro').toUpperCase(); // Normalized
            const isVentaFormal = ['BOLETA', 'FACTURA'].includes(tipoVenta);

            // --- A. GLOBAL PURCHASES & FISCAL (All Tickets) ---
            if (status !== 'Deleted' && status !== 'Basura') {
                if (isCompraFactura) {
                    const neto = Math.round(costoCompra / 1.19);
                    const credit = costoCompra - neto;

                    totalIvaCredito += credit; // Accumulate global credit

                    analysis.comprasFactura.count++;
                    analysis.comprasFactura.monto += costoCompra;
                    // Cost Composition
                    costComposition.baseCost += costoCompra;
                    costComposition.parts += repuestos;
                    costComposition.extra += extras;
                    costComposition.viatico += viatico;
                    costComposition.publicidad += publicidad;

                    // Taxes
                    if (isCompraFactura) {
                        const credit = costoCompra - Math.round(costoCompra / 1.19);
                        taxDetails.ivaCreditoTotal += credit; // Global credit available

                        analysis.comprasFactura.count++;
                        analysis.comprasFactura.monto += costoCompra;
                    } else {
                        analysis.comprasInformal.count++;
                        analysis.comprasInformal.monto += costoCompra;
                    }
                }

                // --- C. STOCK Y CAPITAL (Active) ---
                if (area !== 'Ventas' && area !== 'Basura' && status !== 'Closed' && status !== 'Deleted') {
                    // Use Util for uniformity? Actually stock value logic is simple:
                    // But let's use the Util to get 'totalCostoCash' accurately including legacy fallback
                    const fCalc = calculateTicketFinancials(ticket);

                    // Estimación Venta
                    const precioEstimado = parseFloat(ticket.precioVenta) || (fCalc.totalCostoCash * 1.5);
                    totalVentaPotencial += precioEstimado;

                    if (capitalByArea[area] !== undefined) {
                        capitalByArea[area] += fCalc.totalCostoCash;
                        countByArea[area] += 1;
                        potentialValueByArea[area] += precioEstimado;
                    }

                    totalCapitalInvertido += fCalc.totalCostoCash;

                    // Dim Stats (Stock)
                    brandStats[brand].stockValue += fCalc.totalCostoCash;
                    typeStats[type].stockValue += fCalc.totalCostoCash;
                }

                // --- D. HISTÓRICO VENTAS (Closed) ---
                if (status === 'Closed' || area === 'Ventas') {
                    const fCalc = calculateTicketFinancials(ticket);

                    // Outflow
                    if (closedAt) {
                        const monthKey = closedAt.toISOString().slice(0, 7);
                        operationalStats.outflowByMonth[monthKey] = (operationalStats.outflowByMonth[monthKey] || 0) + 1;

                        const dayKey = closedAt.toISOString().slice(0, 10);
                        if (!dailyStats[dayKey]) dailyStats[dayKey] = { date: dayKey, sales: 0, count: 0 };
                        dailyStats[dayKey].sales += fCalc.precioVenta;
                        dailyStats[dayKey].count++;
                    }

                    // 1. Acumuladores Simples
                    totalVentasBrutas += fCalc.precioVenta;
                    totalCostoVentas += fCalc.totalCostoCash;

                    // 2. Cálculos Fiscales (IVA) - From Util
                    taxDetails.ivaDebito += fCalc.ivaDebito;

                    // Note: Use 'ivaCredito' from util for this specific sale? 
                    // No, Global Credit is accumulated in section A independently.
                    // But for Net Profit of this sale, the Util does calculate Specific Credit Effect.
                    // Let's stick to the Util's 'utilidadNetaReal' for profit which handles the net logic.

                    // However, we want to flag Risk Analysis here.
                    const isVentaFormal = fCalc.isVentaFormal;
                    const isCompraFactura = fCalc.isCompraFactura;

                    if (isVentaFormal) {
                        if (ticket.financials?.salesDocumentType === 'Factura') {
                            analysis.ventasFactura.count++;
                            analysis.ventasFactura.monto += fCalc.precioVenta;
                        } else {
                            analysis.ventasBoleta.count++;
                            analysis.ventasBoleta.monto += fCalc.precioVenta;
                        }
                    } else {
                        analysis.ventasInformal.count++;
                        analysis.ventasInformal.monto += fCalc.precioVenta;
                    }

                    // 3. Renta
                    taxDetails.renta += fCalc.rentaFiscal;
                    baseImponibleRenta += (isVentaFormal ? (fCalc.precioVenta / 1.19) : 0); // Approx base tracking

                    // 4. Utilidad Real
                    totalUtilidadReal += fCalc.utilidadNetaReal;

                    // Dimensional Aggregates (Sales)
                    brandStats[brand].count++;
                    brandStats[brand].sales += fCalc.precioVenta;
                    brandStats[brand].profit += fCalc.utilidadNetaReal;

                    typeStats[type].count++;
                    typeStats[type].sales += fCalc.precioVenta;
                    typeStats[type].profit += fCalc.utilidadNetaReal;

                    // 5. Análisis de Cruces
                    if (!isCompraFactura && isVentaFormal) {
                        analysis.riskTaxHit.count++;
                        // The hit is the extra tax paid due to lack of credit + full renta
                        // Util handles this in 'taxesPaidCash', but let's estimate specific 'Hit'
                        const hit = fCalc.ivaDebito + fCalc.rentaFiscal; // Rough estimate of pain
                        analysis.riskTaxHit.amount += hit;
                        taxDetails.taxHit += hit;
                    }

                    if (isCompraFactura && !isVentaFormal) {
                        analysis.riskLostCredit.count++;
                        analysis.riskLostCredit.amount += fCalc.ivaCredito; // We lost this credit usage
                        taxDetails.lostCredit += fCalc.ivaCredito;
                    }

                    // 6. Evolución
                    const dateRef = ticket.fechaSalida || (ticket.updatedAt?.seconds ? new Date(ticket.updatedAt.seconds * 1000).toISOString().split('T')[0] : 'Unknown');
                    const monthKey = dateRef.slice(0, 7);

                    if (!evolutionData[monthKey]) {
                        evolutionData[monthKey] = { month: monthKey, sales: 0, cost: 0, profit: 0, count: 0 };
                    }
                    evolutionData[monthKey].sales += fCalc.precioVenta;
                    evolutionData[monthKey].cost += fCalc.totalCostoCash;
                    evolutionData[monthKey].profit += fCalc.utilidadNetaReal;
                    evolutionData[monthKey].count += 1;
                }
            } // <--- ADDED CLOSING BRACE FOR A. GLOBAL PURCHASES

            // --- E. OPERATIONAL METRICS (Time) ---
            if (createdAt) {
                // ... same logic implies adding to global stats
                if (status === 'Closed' || status === 'Entregado' || closedAt) {
                    const cycleTime = Math.max(0, Math.floor(((closedAt || now) - createdAt) / (1000 * 60 * 60 * 24)));
                    if (!operational.cycleTimes[area]) operational.cycleTimes[area] = { totalDays: 0, count: 0 };
                    operational.cycleTimes[area].totalDays += cycleTime;
                    operational.cycleTimes[area].count++;
                    operational.globalCycleTime.totalDays += cycleTime;
                    operational.globalCycleTime.count++;
                }
                else if (status !== 'Deleted') {
                    const age = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));
                    if (!operational.inventoryAge[area]) operational.inventoryAge[area] = { totalDays: 0, count: 0 };
                    operational.inventoryAge[area].totalDays += age;
                    operational.inventoryAge[area].count++;
                    operational.globalInventoryAge.totalDays += age;
                    operational.globalInventoryAge.count++;

                    if (age > 90) operationalStats.zombieStock++;
                }
            }

            // Status Breakdown
            if (!operational.statusBreakdown[status]) operational.statusBreakdown[status] = 0;
            operational.statusBreakdown[status]++;

        });

        // --- 3. FINAL AGGREGATIONS ---

        // F29 Real Calculation
        const f29Pagar = Math.max(0, taxDetails.ivaDebito - taxDetails.ivaCreditoTotal);
        taxDetails.f29Payable = f29Pagar;

        // Arrays for Charts
        const capitalKeys = Object.keys(capitalByArea);
        const activeAreas = capitalKeys.filter(area => capitalByArea[area] > 0);
        const capitalChartData = activeAreas.map(area => ({
            name: area,
            value: capitalByArea[area],
            count: countByArea[area]
        }));

        const evolutionChartData = Object.values(evolutionData).sort((a, b) => a.month.localeCompare(b.month));

        // Brand/Type Arrays (Sorted by Sales)
        const brandChartData = Object.values(brandStats).sort((a, b) => b.sales - a.sales).slice(0, 10);
        const typeChartData = Object.values(typeStats).sort((a, b) => b.sales - a.sales);
        const dailyChartData = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
        const techChartData = Object.entries(operationalStats.createdByUser)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const avgGlobalCycle = operational.globalCycleTime.count > 0 ? Math.round(operational.globalCycleTime.totalDays / operational.globalCycleTime.count) : 0;
        const avgGlobalAge = operational.globalInventoryAge.count > 0 ? Math.round(operational.globalInventoryAge.totalDays / operational.globalInventoryAge.count) : 0;

        return {
            // HIGH LEVEL
            inventory: {
                totalCapital: totalCapitalInvertido,
                potentialValue: totalVentaPotencial,
                totalCount: capitalChartData.reduce((acc, curr) => acc + curr.count, 0)
            },
            sales: {
                totalGross: totalVentasBrutas,
                totalCost: totalCostoVentas,
                realProfit: totalUtilidadReal,
                marginPercent: totalVentasBrutas > 0 ? (totalUtilidadReal / totalVentasBrutas) * 100 : 0,
                avgTicket: totalVentasBrutas > 0 ? Math.round(totalVentasBrutas / (brandChartData.reduce((acc, b) => acc + b.count, 0) || 1)) : 0
            },
            taxes: taxDetails,

            // OPERATIONAL
            operational: {
                avgCycleTime: avgGlobalCycle,
                avgInventoryAge: avgGlobalAge,
                zombieStock: operationalStats.zombieStock,
                inflow: operationalStats.inflowByMonth,
                outflow: operationalStats.outflowByMonth,
                statusBreakdown: operational.statusBreakdown,
                cycleTimeByArea: operational.cycleTimes,
                inventoryAgeByArea: operational.inventoryAge
            },

            // ANALYSIS
            analysis,

            // CHART DATASETS
            charts: {
                capital: capitalChartData,
                evolution: evolutionChartData,
                brands: brandChartData,
                types: typeChartData,
                daily: dailyChartData,
                tech: techChartData,
                inventoryDistribution: Object.keys(countByArea).map(key => ({
                    name: key,
                    value: countByArea[key], // Count determines slice size
                    totalPrice: potentialValueByArea[key] // Tooltip info
                })).filter(item => item.value > 0), // Only active columns
                costComposition: [
                    { name: 'Equipos', value: costComposition.baseCost },
                    { name: 'Repuestos', value: costComposition.parts },
                    { name: 'Viáticos', value: costComposition.viatico },
                    { name: 'Publicidad', value: costComposition.publicidad },
                    { name: 'Extras', value: costComposition.extra },
                ],
                taxComposition: [
                    { name: 'IVA Débito', value: taxDetails.ivaDebito },
                    { name: 'IVA Crédito', value: taxDetails.ivaCreditoTotal },
                    { name: 'Renta', value: taxDetails.renta },
                    { name: 'A Pagar (F29)', value: f29Pagar }
                ]
            }
        };

    }, [tickets]);
};
