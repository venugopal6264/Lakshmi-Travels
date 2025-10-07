import { RefreshCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ApiTicket } from '../services/api';
import TicketForm from './TicketForm';

interface EditTicketModalProps {
    ticket: ApiTicket;
    isOpen: boolean;
    onClose: () => void;
    onSave: (ticketData: Partial<ApiTicket>) => Promise<void>;
    onRefund: (refundData: { refund: number; refundDate: string; refundReason: string }) => Promise<void>;
    onDelete: () => Promise<void>;
    existingAccounts?: string[];
    existingServices?: string[];
}

export default function EditTicketModal({
    ticket,
    isOpen,
    onClose,
    onSave,
    onRefund,
    onDelete,
    existingAccounts = [],
    existingServices = []
}: EditTicketModalProps) {
    const [activeTab, setActiveTab] = useState<'edit' | 'refund'>('edit');
    const [loading, setLoading] = useState(false);

    const [refundData, setRefundData] = useState({
        refund: (ticket.refund ?? 0).toString(),
        refundDate: ticket.refundDate || new Date().toISOString().split('T')[0],
        refundReason: ticket.refundReason || ''
    });

    if (!isOpen) return null;

    const handleSave = async (data: Partial<ApiTicket>) => {
        try {
            setLoading(true);
            await onSave(data);
            onClose();
        } catch (error) {
            console.error('Failed to save ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async () => {
        try {
            setLoading(true);
            await onRefund({
                refund: parseFloat(refundData.refund),
                refundDate: refundData.refundDate,
                refundReason: refundData.refundReason
            });
            onClose();
        } catch (error) {
            console.error('Failed to process refund:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this ticket?')) {
            try {
                setLoading(true);
                await onDelete();
                onClose();
            } catch (error) {
                console.error('Failed to delete ticket:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="w-full max-w-2xl mx-4 my-6">
                {/* Colorful gradient border wrapper */}
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-500 shadow-2xl">
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh]">
                        {/* Gradient header */}
                        <div className="flex justify-between items-center px-6 py-4 sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm">
                            <h2 className="text-lg sm:text-xl font-semibold tracking-wide">
                                Manage Ticket - {ticket.pnr}
                            </h2>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-400" />

                        <div className="flex border-b">
                            <button
                                onClick={() => setActiveTab('edit')}
                                className={`px-6 py-3 font-medium ${activeTab === 'edit'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Edit Details
                            </button>
                            <button
                                onClick={() => setActiveTab('refund')}
                                className={`px-6 py-3 font-medium ${activeTab === 'refund'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Process Refund
                            </button>
                        </div>

                        <div className="p-6 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(99,102,241,0.08),transparent_70%)]">
                            {activeTab === 'edit' ? (
                                <div className="space-y-4">
                                    <TicketForm
                                        mode="edit"
                                        initial={ticket}
                                        onSave={handleSave}
                                        loading={loading}
                                        heading={`Edit Ticket - ${ticket.pnr}`}
                                        existingAccounts={existingAccounts}
                                        existingServices={existingServices}
                                    />
                                    <div className="flex justify-start">
                                        <button
                                            onClick={handleDelete}
                                            disabled={loading}
                                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Refund Amount *
                                            </label>
                                            <input
                                                type="number"
                                                value={refundData.refund}
                                                onChange={(e) => setRefundData(prev => ({ ...prev, refund: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Enter refund amount"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Refund Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={refundData.refundDate}
                                                onChange={(e) => setRefundData(prev => ({ ...prev, refundDate: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Refund Reason *
                                        </label>
                                        <textarea
                                            value={refundData.refundReason}
                                            onChange={(e) => setRefundData(prev => ({ ...prev, refundReason: e.target.value }))}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter reason for refund"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleRefund}
                                            disabled={loading || !refundData.refund || !refundData.refundReason}
                                            className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition duration-200 flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            {loading ? 'Processing...' : 'Process Refund'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>{/* end bg-white rounded-2xl */}
                </div>{/* end gradient border wrapper */}
            </div>{/* end container */}
        </div>
    );
}
