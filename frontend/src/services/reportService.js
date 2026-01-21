import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { ticketService } from './ticketService'; // Reuse existing logic
import * as XLSX from 'xlsx';
import { emailService } from './emailService';

const COLLECTION = 'report_configs';

export const reportService = {
    // --- CRUD ---

    async getAllConfigs() {
        const q = query(collection(db, COLLECTION));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async saveConfig(config) {
        if (config.id) {
            const ref = doc(db, COLLECTION, config.id);
            const { id, ...data } = config; // Remove ID from data
            await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
            return config.id;
        } else {
            const ref = await addDoc(collection(db, COLLECTION), {
                ...config,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            return ref.id;
        }
    },

    async deleteConfig(id) {
        await deleteDoc(doc(db, COLLECTION, id));
    },

    // --- GENERATION ENGINE ---

    /**
     * Runs the report logic and returns the structured data (Rows).
     */
    async generateData(config) {
        // 1. Determine Date Range
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();

        if (config.filters.dateRange === 'last_7_days') {
            startDate.setDate(now.getDate() - 7);
        } else if (config.filters.dateRange === 'this_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (config.filters.dateRange === 'custom') {
            startDate = new Date(config.filters.customStart);
            endDate = new Date(config.filters.customEnd);
        } else if (config.filters.dateRange === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        console.log(`[Report] Generating '${config.name}' from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // 2. Fetch Data Source
        let rawTickets = [];
        // We'll use ticketService subscription logic or a direct query?
        // Direct query is better for reports.
        // For now, we fetch ALL tickets and filter in memory since we don't have complex indexes yet.
        // Optimization: In real prod, use compound queries.

        // Use a helper from ticketService if available, or raw firestore
        // Let's assume we fetch all for now or optimize later.
        const allDocs = await getDocs(collection(db, 'tickets'));
        rawTickets = allDocs.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Apply Filters
        const filtered = rawTickets.filter(t => {
            const tDate = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date(t.createdAt);

            // Date Filter
            if (tDate < startDate || tDate > endDate) return false;

            // Source/Status Filter
            if (config.dataSource === 'sales') {
                if (t.currentArea !== 'Ventas' && t.status !== 'Closed') return false;
                // Checks if it was actually SOLD? 
                // Usually "Closed" = Delivered/Sold. "Ventas" = In Stock for Sale.
                // We might need a stricter check like "has salePrice".
                if (!t.precioVenta) return false;
            }

            if (config.filters.states && config.filters.states.length > 0) {
                // Check if status matches or Area matches
                // Simplified:
                if (!config.filters.states.includes(t.status) && !config.filters.states.includes(t.currentArea)) return false;
            }

            return true;
        });

        // 4. Map to Columns (Excel friendly)
        const rows = filtered.map(t => {
            // Flatten Data
            return {
                Ticket: t.ticketId || t.id,
                Fecha: new Date(t.createdAt?.seconds * 1000 || t.createdAt).toLocaleDateString(),
                Cliente: t.nombreCliente || '-',
                Equipo: `${t.marca} ${t.modelo}`,
                Estado: t.status,
                Area: t.currentArea,
                PrecioVenta: t.precioVenta || 0,
                CostoBase: t.costoCompra || 0,
                // Add more calculated fields...
            };
        });

        return rows;
    },

    async generateExcelBlob(data, reportName) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
        // Generate buffer
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    },

    // --- EXECUTION ---

    async runAndSend(config) {
        try {
            const data = await this.generateData(config);

            if (data.length === 0) {
                console.warn("Report generated 0 rows. Skipping email?");
                // dependent on preference
            }

            // Generate Excel
            // We can't attach Blob directly to EmailJS easily in client-side JS without a backend proxy or base64.
            // EmailJS supports attachments only via some providers or base64.
            // We will assume we send the DATA summary in HTML, or we need a Cloud Function for the Excel.

            // USER UPDATE: User has a 24/7 Server. 
            // The Server (Node script) CAN create the file and email it using `nodemailer` (not EmailJS client).
            // BUT for this frontend-first approach:

            // Workaround: We will send an email with the "Summary Table" (HTML) for now.
            // Full Excel requires backend.

            // Wait, if we use the "Print Agent" approach, the local agent can generate the Excel and email it!
            // Yes!

            // For now, let's just trigger the "data generation" to prove it works.

            return { success: true, count: data.length, preview: data.slice(0, 5) };

        } catch (e) {
            console.error("Report Run Error:", e);
            throw e;
        }
    }
};
