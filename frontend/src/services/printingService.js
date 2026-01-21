const API_URL = 'http://localhost:3001';

export const printingService = {
    checkStatus: async () => {
        try {
            const response = await fetch(`${API_URL}/status`);
            return response.ok;
        } catch (error) {
            console.warn('Printing service not available:', error);
            return false;
        }
    },

    printTicket: async (ticket) => {
        try {
            const response = await fetch(`${API_URL}/print-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticket),
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Print request failed:', error);
            throw new Error('Could not connect to printing service');
        }
    }
};
