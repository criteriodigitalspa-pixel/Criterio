import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TicketCard from '../TicketCard';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ user: { uid: 'u1' } })
}));

const TestWrapper = ({ children }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

const mockTicket = {
    id: 't1',
    ticketId: '001',
    modelo: 'Laptop',
    marca: 'Dell',
    status: 'Pendiente',
    qaProgress: 50,
    createdAt: new Date('2023-01-01').toISOString(),
    additionalInfoComplete: true
};

describe('TicketCard Snapshots', () => {
    it('matches snapshot for standard ticket', () => {
        const { asFragment } = render(
            <TicketCard ticket={mockTicket} selectionMode={false} isSelected={false} />,
            { wrapper: TestWrapper }
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it('matches snapshot for urgent ticket', () => {
        // Simulated urgent state derived from SLA or priority? 
        // TicketCard logic might use elapsed time.
        // Let's just render a modified ticket.
        const urgentTicket = { ...mockTicket, priority: 'High', slaLimit: 100, slaElapsed: 90 };
        const { asFragment } = render(
            <TicketCard ticket={urgentTicket} selectionMode={false} isSelected={false} />,
            { wrapper: TestWrapper }
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
