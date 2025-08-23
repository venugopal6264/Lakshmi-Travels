import { Plus } from 'lucide-react';
import { ApiTicket } from '../services/api';
import TicketForm from './TicketForm';

interface CreateTicketPageProps {
    onAddTicket: (ticket: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    loading: boolean;
    tickets: ApiTicket[];
}

export default function CreateTicketPage({ onAddTicket, loading, tickets }: CreateTicketPageProps) {
    const existingAccounts = Array.from(new Set((tickets || []).map(t => t.account).filter(Boolean)));
    const existingServices = Array.from(new Set((tickets || []).map(t => t.service).filter(Boolean)));
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Plus className="w-7 h-7 text-blue-600" />
                    Create New Ticket
                </h2>
                <p className="text-gray-600 mt-2">
                    Add a new travel ticket manually or upload a PDF to auto-extract details
                </p>
            </div>

            <TicketForm
                onAddTicket={onAddTicket}
                loading={loading}
                existingAccounts={existingAccounts}
                existingServices={existingServices}
            />
        </div>
    );
}
