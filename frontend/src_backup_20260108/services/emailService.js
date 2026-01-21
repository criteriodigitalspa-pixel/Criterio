
import emailjs from '@emailjs/browser';

// CONFIG (To be replaced with User's keys)
const SERVICE_ID = 'service_placeholder';
const TEMPLATE_ID = 'template_placeholder';
const PUBLIC_KEY = 'user_public_key';

export const emailService = {
    init: () => {
        emailjs.init(PUBLIC_KEY);
    },

    sendNotification: async (toEmail, details) => {
        if (!toEmail) return;

        try {
            const templateParams = {
                to_email: toEmail,
                client_name: details.clientName || 'Cliente',
                ticket_id: details.ticketId,
                model_name: details.modelName,
                status_message: details.message
            };

            await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
            console.log("Email sent successfully to", toEmail);
            return true;
        } catch (error) {
            console.error("EmailJS Error:", error);
            return false;
        }
    }
};
