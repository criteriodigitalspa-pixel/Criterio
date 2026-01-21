import { Clock, CheckCircle, AlertCircle, PlayCircle, Package, Printer } from 'lucide-react';
import clsx from 'clsx';

export default function TicketList({ tickets, onEdit, onDelete, onPrint }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Diagnosing': return 'bg-indigo-100 text-indigo-800';
            case 'Ready': return 'bg-green-100 text-green-800';
            case 'Delivered': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'Urgent': return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'High': return <AlertCircle className="h-4 w-4 text-orange-500" />;
            case 'Normal': return <Clock className="h-4 w-4 text-gray-400" />;
            default: return <Clock className="h-4 w-4 text-gray-300" />;
        }
    };

    return (
        <div className="space-y-4">
            {tickets.map((ticket) => (
                <div
                    key={ticket.id}
                    className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center"
                >
                    <div className="flex-1">
                        <div className="flex items-center space-x-3">
                            <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", getStatusColor(ticket.status))}>
                                {ticket.status}
                            </span>
                            <span className="flex items-center space-x-1 text-xs font-medium text-gray-500">
                                {getPriorityIcon(ticket.priority)}
                                <span>{ticket.priority} Priority</span>
                            </span>
                            <span className="text-xs text-gray-400">
                                Created: {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        <h3 className="mt-2 text-lg font-semibold text-gray-900">
                            {ticket.deviceType} - {ticket.deviceModel}
                            <span className="ml-2 text-sm font-normal text-gray-500">({ticket.customerName})</span>
                        </h3>

                        <p className="mt-1 text-sm text-gray-600 line-clamp-2 md:line-clamp-1">
                            {ticket.description}
                        </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-4 md:ml-6 md:mt-0 md:border-0 md:pt-0">
                        <div className="flex flex-col items-end mr-6">
                            <span className="text-xs text-gray-500">Estimated Cost</span>
                            <span className="text-lg font-bold text-gray-900">${ticket.estimatedCost || 0}</span>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => onPrint(ticket)}
                                className="flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                title="Print Ticket Receipt"
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                Print
                            </button>
                            <button
                                onClick={() => onEdit(ticket)}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12">
                    <Package className="h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No tickets found.</p>
                    <p className="text-xs text-gray-400">Create a new ticket to get started.</p>
                </div>
            )}
        </div>
    );
}
