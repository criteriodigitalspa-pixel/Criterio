import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export const AUTOMATION_TRIGGERS = {
    NEW_ENTRY: 'NEW_ENTRY',
    TO_SERVICE: 'TO_SERVICE',
    TO_ADVERTISING: 'TO_ADVERTISING',
    SLA_50: 'SLA_50',
    SLA_EXPIRED: 'SLA_EXPIRED'
};

const TASKS_COLLECTION = 'tasks';

/**
 * Creates a task automatically based on a generic trigger.
 * @param {Object} ticket - The ticket object
 * @param {String} trigger - One of AUTOMATION_TRIGGERS
 * @param {Object} user - The user creating the action (optional)
 */
export const createAutomatedTask = async (ticket, trigger, user = null) => {
    try {
        let taskData = {
            status: 'todo',
            createdAt: serverTimestamp(),
            createdBy: user?.email || 'system',
            relatedTicketId: ticket.id, // Link to ticket
            ticketId: ticket.ticketId, // Human ID
            isAutomated: true,
            triggerType: trigger
        };

        const modelInfo = `${ticket.marca} ${ticket.modelo} [${ticket.ticketId}]`;

        switch (trigger) {
            case AUTOMATION_TRIGGERS.NEW_ENTRY:
                taskData.text = `Ingreso Equipo: ${modelInfo}`;
                taskData.description = `Revisar ingreso de equipo nuevo. Cliente: ${ticket.nombreCliente || 'N/A'}.`;
                taskData.priority = 'Normal';
                break;

            case AUTOMATION_TRIGGERS.TO_SERVICE:
                taskData.text = `Servicio Técnico: ${modelInfo}`;
                taskData.description = `Equipo ingresó a área técnica. Diagnosticar/Reparar.`;
                taskData.priority = 'High';
                break;

            case AUTOMATION_TRIGGERS.TO_ADVERTISING:
                taskData.text = `Publicidad: ${modelInfo}`;
                taskData.description = `Preparar material para venta/publicación.`;
                taskData.priority = 'Normal';
                break;

            case AUTOMATION_TRIGGERS.SLA_50:
                taskData.text = `⚠️ SLA 50%: ${modelInfo}`;
                taskData.description = `El tiempo de SLA ha consumido el 50%. Acelerar proceso.`;
                taskData.priority = 'High';
                taskData.tags = ['SLA Risk'];
                break;

            case AUTOMATION_TRIGGERS.SLA_EXPIRED:
                taskData.text = `🚨 SLA VENCIDO: ${modelInfo}`;
                taskData.description = `El ticket ha excedido el tiempo límite. Acción Inmediata.`;
                taskData.priority = 'Urgent';
                taskData.tags = ['SLA Breach', 'Urgent'];
                break;

            default:
                console.warn("Unknown Trigger", trigger);
                return;
        }

        // DUPLICATE CHECK (Simple)
        // Check if an automated task for this trigger and ticket already exists and is NOT done?
        // Actually, for SLA we only want ONE ever.
        // For 'Service', maybe we moved it back and forth? Let's check if there is an active one.

        const q = query(
            collection(db, TASKS_COLLECTION),
            where('relatedTicketId', '==', ticket.id),
            where('triggerType', '==', trigger)
        );
        const snapshot = await getDocs(q);

        // If exists and is not 'done', don't create another?
        // Or if it's SLA, never create another even if done (usually).
        const exists = !snapshot.empty;
        if (exists) {
            // For SLA, only 1 per lifecycle ideally.
            if (trigger === AUTOMATION_TRIGGERS.SLA_50 || trigger === AUTOMATION_TRIGGERS.SLA_EXPIRED) {
                console.log(`Skipping duplicate SLA task for ${ticket.ticketId}`);
                return;
            }
            // For others, if there is a PENDING one, avoid dupe.
            const hasPending = snapshot.docs.some(d => d.data().status !== 'done');
            if (hasPending) {
                console.log(`Skipping duplicate pending task for ${ticket.ticketId} (${trigger})`);
                return;
            }
        }

        await addDoc(collection(db, TASKS_COLLECTION), taskData);
        console.log(`✅ Automated Task Created: ${taskData.text}`);

    } catch (error) {
        console.error("Error creating automated task:", error);
    }
};

// Legacy Placeholder (kept for compatibility if imported elsewhere)
export const checkAndProcessRecurringTasks = async (userId) => {
    return 0;
};
