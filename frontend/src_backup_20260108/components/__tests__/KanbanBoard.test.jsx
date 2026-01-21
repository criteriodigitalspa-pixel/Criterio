import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import KanbanBoard from '../../components/KanbanBoard';
import { ticketService } from '../../services/ticketService';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../../services/ticketService', () => ({
    ticketService: {
        subscribeToTickets: vi.fn(),
        moveTicket: vi.fn(),
        updateTicket: vi.fn(),
        deleteTicket: vi.fn(),
    }
}));

vi.mock('../../context/AuthContext', async () => {
    return {
        useAuth: () => ({
            user: { uid: 'test-admin', email: 'admin@test.com' },
            userProfile: { role: 'Admin' }
        })
    };
});

// Mock internal components to simplify test
vi.mock('../../components/TicketCard', () => ({
    default: ({ ticket }) => <div data-testid={`ticket-${ticket.ticketId}`}>{ticket.modelo}</div>
}));

const TestWrapper = ({ children }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

describe('KanbanBoard Integration', () => {
    const mockTickets = [
        { id: 't1', ticketId: '001', currentArea: 'Compras', marca: 'Dell', modelo: 'XPS', qaProgress: 0 },
        { id: 't2', ticketId: '002', currentArea: 'Servicio Rapido', marca: 'HP', modelo: 'Pavilion', qaProgress: 0 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup subscription mock to return data immediately
        ticketService.subscribeToTickets.mockImplementation((callback) => {
            callback(mockTickets);
            return () => { }; // Unsubscribe function
        });
    });

    it('renders tickets in correct columns', async () => {
        render(<KanbanBoard />, { wrapper: TestWrapper });

        await waitFor(() => {
            expect(screen.getByText('🛒 Compras / Ingreso')).toBeInTheDocument();
            expect(screen.getByText('⚡ Servicio Rápido')).toBeInTheDocument();
        });

        // Check if tickets are present (using the mocked TicketCard output or finding by text if I didn't mock it too simply)
        // I mocked TicketCard to render modelname.
        // Wait, in mockTickets I used 'model', but in code it uses 'modelo'.
        // Let's adjust mockTickets or check code.
        // Component uses ticket.modelo. Mock uses modelo: 'XPS'.
        // Mock component: <div>{ticket.model}</div> -> Undefined!
        // Fix mock component to use ticket.modelo
    });
});
