import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IngresoTicket from '../IngresoTicket';
import { ticketService } from '../../services/ticketService';
import { AuthProvider } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock TicketService
vi.mock('../../services/ticketService', () => ({
    ticketService: {
        addTicket: vi.fn(),
        getNextTicketId: vi.fn(),
    }
}));

// Mock AuthContext
const mockLoginAsDev = vi.fn();
const mockUser = { uid: 'test-uid-123', email: 'test@admin.com', role: 'Admin' };

vi.mock('../../context/AuthContext', async () => {
    const actual = await vi.importActual('../../context/AuthContext');
    return {
        ...actual,
        useAuth: () => ({
            user: mockUser,
            userProfile: { role: 'Admin' },
            loginAsDev: mockLoginAsDev,
            loading: false
        })
    };
});

// Mock ProcessingContext
const mockRunTask = vi.fn((name, fn) => fn(vi.fn())); // Immediate execute
const mockPrintTask = vi.fn();

vi.mock('../../context/ProcessingContext', async () => {
    return {
        ProcessingProvider: ({ children }) => <div>{children}</div>,
        useProcessing: () => ({
            runBackgroundTask: mockRunTask,
            printTask: mockPrintTask
        })
    };
});

// Wrapper for Providers
const TestWrapper = ({ children }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

describe('IngresoTicket Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default ID mock
        ticketService.getNextTicketId.mockResolvedValue('2512-0001');
    });

    it('renders the form correctly', async () => {
        render(<IngresoTicket />, { wrapper: TestWrapper });

        expect(screen.getByText(/Nuevo/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Lenovo/i)).toBeInTheDocument(); // Marca matches placeholder
        expect(screen.getByPlaceholderText(/ThinkPad/i)).toBeInTheDocument(); // Modelo matches placeholder
    });

    it('submits the ticket when required fields are filled', async () => {
        ticketService.addTicket.mockResolvedValue({ id: 'db-id-123', ticketId: '2512-0001' });

        render(<IngresoTicket />, { wrapper: TestWrapper });

        // Fill Form
        fireEvent.change(screen.getByPlaceholderText(/Lenovo/i), { target: { value: 'Dell' } });
        fireEvent.change(screen.getByPlaceholderText(/ThinkPad/i), { target: { value: 'Inspiron' } });

        // Price placeholder is "0"
        fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: '500000' } });

        // Submit
        const submitBtn = screen.getByRole('button', { name: /Guardar Ticket/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(ticketService.addTicket).toHaveBeenCalled();
        });

        // Check payload
        expect(ticketService.addTicket).toHaveBeenCalledWith(expect.objectContaining({
            marca: 'Dell',
            modelo: 'Inspiron',
            precioCompra: '500000',
            nombreCliente: 'Stock / Compra' // Correct default value
        }), expect.anything());
    });
});
