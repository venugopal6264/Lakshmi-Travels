import { Search, X, Edit3, CheckCircle2, AlertTriangle, CalendarDays, User, CreditCard } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ApiPayment, ApiTicket } from '../services/api';
import EditTicketModal from './EditTicketModal';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    tickets: ApiTicket[];
    payments: ApiPayment[];
    onUpdateTicket: (id: string, ticketData: Partial<ApiTicket>) => Promise<void>;
    onProcessRefund: (id: string, refundData: { refund: number; refundDate: string; refundReason: string }) => Promise<void>;
    onDeleteTicket: (id: string) => Promise<void>;
};

export default function PnrSearchModal({ isOpen, onClose, tickets, payments, onUpdateTicket, onProcessRefund, onDeleteTicket }: Props) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<ApiTicket | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelected(null);
        }
    }, [isOpen]);

    const paidMap = useMemo(() => {
        const map = new Map<string, { paid: boolean; lastPaidDate?: string }>();
        payments.forEach(p => {
            (p.tickets || []).forEach(id => {
                const prev = map.get(id);
                const last = prev?.lastPaidDate ? new Date(prev.lastPaidDate) : undefined;
                const curr = new Date(p.date);
                if (!prev || (last && curr > last) || (!last)) {
                    map.set(id, { paid: true, lastPaidDate: p.date });
                }
            });
        });
        return map;
    }, [payments]);

    const results = useMemo(() => {
        const q = (query || '').trim().toLowerCase();
        if (!q) return [] as ApiTicket[];
        // Prefer exact match first, then contains
        const exact = tickets.filter(t => (t.pnr || '').toLowerCase() === q);
        if (exact.length > 0) return exact;
        return tickets.filter(t => (t.pnr || '').toLowerCase().includes(q)).slice(0, 10);
    }, [tickets, query]);

    if (!isOpen) return null;

    const existingAccounts = Array.from(new Set((tickets || []).map(t => t.account).filter(Boolean)));
    const existingServices = Array.from(new Set((tickets || []).map(t => t.service).filter(Boolean)));

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-3xl m-4 my-10 mx-auto">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-500 shadow-2xl">
                    <div className="bg-white rounded-2xl overflow-hidden max-h-[90vh]">
                        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <div className="inline-flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                <h3 className="text-lg sm:text-xl font-semibold">PNR Search</h3>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-400" />

                        <div className="p-4 sm:p-6 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(99,102,241,0.08),transparent_70%)] overflow-y-auto max-h-[70vh]">
                            <div className="relative mb-4">
                                <input
                                    autoFocus
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Enter PNR..."
                                    className="w-full pl-4 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>

                            {query && results.length === 0 && (
                                <div className="p-4 rounded-lg border bg-orange-50 text-orange-800 text-sm flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> No matching ticket found for PNR "{query}".
                                </div>
                            )}

                            {results.length > 0 && (
                                <div className="space-y-3">
                                    {results.map(t => {
                                        const paid = paidMap.get(t._id || '');
                                        const refunded = Number(t.refund || 0) > 0;
                                        return (
                                            <div key={t._id} className="rounded-lg border p-3 sm:p-4 bg-white shadow-sm">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-gray-900 font-semibold">
                                                            <CreditCard className="w-4 h-4" /> PNR: <span className="font-mono">{t.pnr}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-700 flex items-center gap-2">
                                                            <User className="w-4 h-4" /> {t.passengerName} · {t.account}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                                            <CalendarDays className="w-4 h-4" /> Booked: {new Date(t.bookingDate).toLocaleDateString()}
                                                            {t.createdAt && <span>· Created: {new Date(t.createdAt).toLocaleString()}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {paid?.paid ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Paid {paid.lastPaidDate ? `(${new Date(paid.lastPaidDate).toLocaleDateString()})` : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                                                Pending
                                                            </span>
                                                        )}
                                                        {refunded && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                                                                Refunded ₹{Math.round(Number(t.refund)).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-700">
                                                    <div><span className="text-gray-500">Type:</span> {t.type}</div>
                                                    <div><span className="text-gray-500">Service:</span> {t.service || '-'}</div>
                                                    <div><span className="text-gray-500">Ticket:</span> ₹{Math.round(Number(t.ticketAmount || 0)).toLocaleString()}</div>
                                                    <div><span className="text-gray-500">Booking:</span> ₹{Math.round(Number(t.bookingAmount || 0)).toLocaleString()}</div>
                                                </div>
                                                <div className="mt-3 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelected(t)}
                                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-emerald-600 text-white text-sm hover:from-indigo-500 hover:to-emerald-500"
                                                    >
                                                        <Edit3 className="w-4 h-4" /> Edit Ticket
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {selected && (
                <EditTicketModal
                    ticket={selected}
                    isOpen={true}
                    onClose={() => setSelected(null)}
                    onSave={(data) => onUpdateTicket(selected._id!, data)}
                    onRefund={(data) => onProcessRefund(selected._id!, data)}
                    onDelete={async () => { await onDeleteTicket(selected._id!); setSelected(null); onClose(); }}
                    existingAccounts={existingAccounts}
                    existingServices={existingServices}
                />
            )}
        </div>
    );
}
