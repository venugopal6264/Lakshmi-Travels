import { DollarSign, Plus } from 'lucide-react';
import { ApiTicket } from '../../services/api';
import TicketForm from '../TicketForm';

interface AccountDueInfo {
    ticketTotal: number;
    refundTotal: number;
    partialTotal: number;
    remainingDue: number;
}

interface PaymentData {
    date: string;
    amount: string;
    period: string;
    account: string;
    isPartial: boolean;
}

interface AddPaymentModalProps {
    paymentData: PaymentData;
    accountDueInfo: AccountDueInfo | null;
    openAccounts: string[];
    submitting: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
    onAccountChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPeriodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTogglePartial: () => void;
}

function partialDueLabel(isPartial: boolean): string {
    return isPartial
        ? 'Amount entered is less than Remaining Due. It will be saved as a partial payment.'
        : 'Amount matches Remaining Due. This will be saved as a full payment.';
}

function partialStatusBadgeClass(isPartial: boolean): string {
    return `px-2 py-1 rounded border text-xs font-semibold tracking-wide ${isPartial ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-emerald-500 bg-emerald-100 text-emerald-700'
        }`;
}

export default function AddPaymentModal({
    paymentData,
    accountDueInfo,
    openAccounts,
    submitting,
    onSubmit,
    onClose,
    onAccountChange,
    onDateChange,
    onAmountChange,
    onPeriodChange,
    onTogglePartial,
}: AddPaymentModalProps) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto p-2 flex items-center justify-center">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fadeIn max-h-[90vh]">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <DollarSign className="w-5 h-5" /> Add Payment
                        </h3>
                        <p className="text-emerald-50 text-xs mt-0.5">Record a full or partial payment for an account.</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition" aria-label="Close">✕</button>
                </div>

                <form onSubmit={onSubmit} className="px-6 py-5 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Account */}
                    <div className="flex flex-col gap-1 group">
                        <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">
                            Account (open tickets only)
                        </label>
                        <select
                            value={paymentData.account}
                            onChange={onAccountChange}
                            className="w-full px-2 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            required
                            disabled={openAccounts.length === 0}
                        >
                            <option value="" disabled>{openAccounts.length === 0 ? 'No open accounts' : 'Select account'}</option>
                            {openAccounts.map(account => (
                                <option key={account} value={account}>{account}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-1">Accounts fully paid are hidden.</p>
                    </div>

                    {/* Field Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <div className="flex flex-col gap-1 group">
                            <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">Payment Date</label>
                            <input
                                type="date"
                                value={paymentData.date}
                                onChange={onDateChange}
                                className="w-full px-2 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1 group">
                            <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">Amount (₹)</label>
                            <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={paymentData.amount}
                                onChange={onAmountChange}
                                placeholder="e.g. 1200"
                                className="w-full px-2 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2 group">
                            <label className="text-xs font-semibold tracking-wide text-gray-600 group-focus-within:text-emerald-600">Period</label>
                            <input
                                type="text"
                                value={paymentData.period}
                                onChange={onPeriodChange}
                                placeholder="e.g., Jan 1 - Jan 15 2025"
                                className="w-full px-2 py-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Partial Toggle */}
                    {!!paymentData.account && (
                        <div className="flex flex-col gap-2 group">
                            <label className="text-xs font-semibold tracking-wide text-gray-600">Partial Payment</label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onTogglePartial}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500 ${paymentData.isPartial ? 'bg-emerald-600' : 'bg-gray-300'}`}
                                    aria-pressed={paymentData.isPartial}
                                    disabled={!accountDueInfo || (accountDueInfo?.remainingDue ?? 0) === 0}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${paymentData.isPartial ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-xs text-gray-600">
                                    {paymentData.isPartial ? 'Marked as partial' : "Mark if amount doesn't settle all open tickets"}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Due Summary */}
                    <div className="grid gap-4">
                        {accountDueInfo && paymentData.account && (
                            <div className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-3">
                                <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                                    <div className="px-2 py-1 rounded bg-white/70 border border-emerald-200 text-emerald-700">Ticket Total: ₹{Math.round(accountDueInfo.ticketTotal).toLocaleString()}</div>
                                    <div className="px-2 py-1 rounded bg-white/70 border border-emerald-200 text-emerald-700">Refund Total: ₹{Math.round(accountDueInfo.refundTotal).toLocaleString()}</div>
                                    <div className="px-2 py-1 rounded bg-white/70 border border-amber-300 text-amber-700">Partial Paid: ₹{Math.round(accountDueInfo.partialTotal).toLocaleString()}</div>
                                    <div className="px-2 py-1 rounded bg-emerald-600 text-white border border-emerald-700 shadow-sm">Remaining Due: ₹{Math.round(accountDueInfo.remainingDue).toLocaleString()}</div>
                                    <div className={partialStatusBadgeClass(paymentData.isPartial)}>
                                        {paymentData.isPartial ? 'Partial Payment' : 'Full Payment'}
                                    </div>
                                </div>
                                <div className="text-[11px] text-emerald-800 leading-relaxed">
                                    {partialDueLabel(paymentData.isPartial)}
                                </div>
                            </div>
                        )}
                        <div className="rounded-md border border-dashed border-emerald-300 bg-emerald-50/60 p-3 text-[11px] leading-relaxed text-emerald-800 flex flex-col gap-1">
                            <div className="font-semibold text-emerald-700">Guidance</div>
                            <div>Use Partial Payment when the client pays less than the total outstanding ticket amount.</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
                        >Cancel</button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-md shadow hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 text-sm font-semibold"
                        >
                            {submitting && <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {submitting ? 'Saving...' : 'Add Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface CreateTicketModalProps {
    submitting: boolean;
    onClose: () => void;
    onAddTicket: (ticketData: Omit<ApiTicket, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function CreateTicketModal({ submitting, onClose, onAddTicket }: CreateTicketModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-5xl m-4 my-8">
                <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-indigo-600 via-purple-500 to-emerald-500 shadow-2xl">
                    <div className="bg-white rounded-2xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm">
                            <h3 className="text-lg sm:text-xl font-semibold tracking-wide">Create New Ticket</h3>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-emerald-400" />
                        <div className="px-4 sm:px-6 py-4 bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(99,102,241,0.08),transparent_70%)] flex-1 overflow-y-auto touch-pan-y [-webkit-overflow-scrolling:touch]">
                            <TicketForm onAddTicket={onAddTicket} loading={submitting} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
