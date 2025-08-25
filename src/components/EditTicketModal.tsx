import { RefreshCw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ApiTicket } from '../services/api';
import TicketForm from './TicketForm';

interface EditTicketModalProps {
    ticket: ApiTicket;
    isOpen: boolean;
    onClose: () => void;
    onSave: (ticketData: Partial<ApiTicket>) => Promise<void>;
    onRefund: (refundData: { refundAmount: number; refundDate: string; refundReason: string }) => Promise<void>;
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
        refundAmount: ticket.refundAmount?.toString() || '',
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
                refundAmount: parseFloat(refundData.refundAmount),
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Manage Ticket - {ticket.pnr}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

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

                <div className="p-6">
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
                                        value={refundData.refundAmount}
                                        onChange={(e) => setRefundData(prev => ({ ...prev, refundAmount: e.target.value }))}
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
                                    disabled={loading || !refundData.refundAmount || !refundData.refundReason}
                                    className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition duration-200 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    {loading ? 'Processing...' : 'Process Refund'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
