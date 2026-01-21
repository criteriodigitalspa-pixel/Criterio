import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketService } from '../services/ticketService';
import { printingService } from '../services/printingService';
import TicketList from '../components/tickets/TicketList';
import TicketModal from '../components/tickets/TicketModal';

export default function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTicket, setEditingTicket] = useState(null);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await ticketService.getAllTickets();
            setTickets(data);
        } catch (error) {
            toast.error('Failed to load tickets');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.deviceType.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleSaveTicket = async (ticketData) => {
        try {
            if (editingTicket) {
                await ticketService.updateTicket(editingTicket.id, ticketData);
                toast.success('Ticket updated successfully');
            } else {
                await ticketService.addTicket(ticketData);
                toast.success('Ticket created successfully');
            }
            setIsModalOpen(false);
            setEditingTicket(null);
            fetchTickets();
        } catch (error) {
            toast.error('Failed to save ticket');
            console.error(error);
        }
    };

    const handlePrintTicket = async (ticket) => {
        const toastId = toast.loading('Sending to printer...');
        try {
            const isOnline = await printingService.checkStatus();
            if (!isOnline) {
                throw new Error('Printing service is offline. Please start the printing-service.');
            }

            const result = await printingService.printTicket(ticket);
            if (result.success) {
                toast.success(result.message || 'Printed successfully', { id: toastId });
            } else {
                throw new Error(result.error || 'Print failed');
            }
        } catch (error) {
            toast.error(error.message, { id: toastId });
            console.error(error);
        }
    };

    const openAddModal = () => {
        setEditingTicket(null);
        setIsModalOpen(true);
    };

    const openEditModal = (ticket) => {
        setEditingTicket(ticket);
        setIsModalOpen(true);
    };

    return (
        <div>
            <div className="mb-6 flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Ticket Management</h2>
                    <p className="text-gray-600">Track repairs and customer requests</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={fetchTickets}
                        className="flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Ticket
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tickets by customer, model, or type..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="block w-full rounded-lg border border-gray-300 pl-10 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Filter className="h-5 w-5 text-gray-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Ready">Ready</option>
                        <option value="Delivered">Delivered</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <TicketList
                    tickets={filteredTickets}
                    onEdit={openEditModal}
                    onDelete={() => { }}
                    onPrint={handlePrintTicket}
                />
            )}

            <TicketModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                checkTicket={editingTicket}
                onSave={handleSaveTicket}
            />
        </div>
    );
}
