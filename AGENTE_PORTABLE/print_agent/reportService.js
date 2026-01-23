const admin = require('firebase-admin');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const winston = require('winston');

// Logger (reused or passed, but let's create a simple one or assume global)
// We'll trust the main index.js to handle top level logging, but for now console is fine or we attach to parents.
// Let's expect 'db' to be passed or require it if we separate init.
// For simplicity, we'll accept 'db' specific calls or re-init?
// Better: Export a setup function that takes the 'db' instance.

let dbInstance = null;
let logger = null;

// Helper: Format Money
const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0);
};

// Helper: Format Date
const formatDate = (dateVal) => {
    if (!dateVal) return '';
    try {
        const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return d.toLocaleString('es-CL');
    } catch (e) { return String(dateVal); }
};

const setup = (firestoreDb, winstonLogger) => {
    dbInstance = firestoreDb;
    logger = winstonLogger;
};

// 1. DATA FETCHING
const fetchAllTickets = async () => {
    const snapshot = await dbInstance.collection('tickets').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 2. EXCEL GENERATION
const generateExcel = async (tickets) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventario Diario');

    // Columns
    sheet.columns = [
        { header: 'ID', key: 'ticketId', width: 12 },
        { header: 'Fecha Ingreso', key: 'createdAt', width: 20 },
        { header: 'Estado', key: 'status', width: 15 }, // Status Logic: 'Deleted' ? 'ELIMINADO' : currentArea
        { header: 'Cliente', key: 'cliente', width: 25 },
        { header: 'Equipo', key: 'equipo', width: 30 }, // Marca + Modelo
        { header: 'Problema', key: 'problema', width: 30 },
        { header: 'Técnico', key: 'tech', width: 20 },
        { header: 'Precio Venta', key: 'price', width: 15 },
        { header: 'Costo Repuestos', key: 'cost', width: 15 },
        { header: 'Batch ID', key: 'batchId', width: 10 }
    ];

    // Style Header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCE5FF' }
    };

    // Add Rows
    tickets.forEach(t => {
        // Status Logic
        let statusDisplay = t.currentArea || 'Desconocido';
        if (t.status === 'Deleted') statusDisplay = 'ELIMINADO';
        else if (t.status === 'Closed') statusDisplay = 'Vendido/Cerrado';

        sheet.addRow({
            ticketId: t.ticketId,
            createdAt: formatDate(t.createdAt),
            status: statusDisplay,
            cliente: t.nombreCliente,
            equipo: `${t.marca || ''} ${t.modelo || ''}`.trim(),
            problema: t.description,
            tech: t.createdBy, // Ideally map User ID to Name, but ID is fine for report
            price: t.precioVenta || 0,
            cost: (t.reparacion?.costoRepuestos || 0),
            batchId: t.batchId
        });
    });

    // Write to Buffer
    return await workbook.xlsx.writeBuffer();
};

// 3. STATS SUMMARY
const generateSummary = (tickets) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTickets = tickets.length;

    // Filter today's tickets
    const todayTickets = tickets.filter(t => {
        if (!t.createdAt) return false;
        const d = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return d >= today;
    });

    const activeTickets = tickets.filter(t => t.status === 'Active' && t.currentArea !== 'Ventas' && t.currentArea !== 'Caja Despacho');
    const waitingTickets = tickets.filter(t => t.currentArea === 'Caja Espera');
    const readyTickets = tickets.filter(t => t.currentArea === 'Caja Despacho');
    const deletedCount = tickets.filter(t => t.status === 'Deleted').length;

    return `
    📊 **Resumen del Día (${new Date().toLocaleDateString('es-CL')})**
    
    - **Nuevos Ingresos Hoy:** ${todayTickets.length}
    - **Tickets en Proceso:** ${activeTickets.length}
    - **En Espera (Pendientes):** ${waitingTickets.length}
    - **Listos para Entrega/Venta:** ${readyTickets.length}
    - **Eliminados (Histórico):** ${deletedCount}
    
    Total en Base de Datos: ${totalTickets}
    `;
};

// 4. MAIN ROUTINE
const runDailyReport = async () => {
    logger.info("📅 Iniciando Reporte Diario...");

    try {
        // 1. Resolve Credentials (Env OR Firestore)
        let smtpConfig = {
            host: process.env.SMTP_HOST,
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE,
            to: process.env.REPORT_EMAIL_TO
        };

        if (!smtpConfig.host || !smtpConfig.user) {
            logger.info("🔍 Enviroment SMTP missing. Checking Firestore (system_config/smtp)...");
            try {
                const docSnap = await dbInstance.collection('system_config').doc('smtp').get();
                if (docSnap.exists) {
                    const dbData = docSnap.data();
                    smtpConfig = {
                        host: dbData.host || smtpConfig.host,
                        user: dbData.user || smtpConfig.user,
                        pass: dbData.pass || smtpConfig.pass,
                        port: dbData.port || smtpConfig.port,
                        secure: dbData.secure, // Boolean, don't fallback to undefined
                        to: dbData.to || smtpConfig.to
                    };
                    logger.info("✅ Credentials loaded from Firestore.");
                }
            } catch (dbErr) {
                logger.warn("⚠️ Failed to fetch SMTP from Firestore:", dbErr);
            }
        }

        if (!smtpConfig.host || !smtpConfig.user) {
            logger.warn("⚠️ No hay credenciales SMTP configuradas (Env ni Firestore). Saltando reporte.");
            return;
        }

        const tickets = await fetchAllTickets();
        const excelBuffer = await generateExcel(tickets);
        const summaryText = generateSummary(tickets);

        // Setup Transporter
        const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: parseInt(smtpConfig.port || '587'),
            secure: String(smtpConfig.secure) === 'true',
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            },
        });

        // Send
        const info = await transporter.sendMail({
            from: `"Sistema Criterio" <${smtpConfig.user}>`,
            to: smtpConfig.to || smtpConfig.user, // Default to self if not specified
            subject: `📊 Reporte Cierre - ${new Date().toLocaleDateString('es-CL')}`,
            text: summaryText, // Plain text body
            html: `<pre style="font-family: sans-serif; font-size: 14px;">${summaryText}</pre>`, // Simple HTML wrap
            attachments: [
                {
                    filename: `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`,
                    content: excelBuffer,
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            ]
        });

        logger.info(`✅ Reporte enviado: ${info.messageId}`);

    } catch (error) {
        logger.error(`❌ Error en Reporte Diario: ${error.message}`);
        console.error(error);
    }
};

module.exports = { setup, runDailyReport };
