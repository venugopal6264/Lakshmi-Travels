import { Layers } from 'lucide-react';

interface AccountAgg {
    booking: number;
    ticket: number;
    profit: number;
    refund: number;
    paid: number;
    due: number;
    count: number;
}

interface BreakdownData {
    byAccount: Record<string, AccountAgg>;
    totals: AccountAgg;
}

interface AccountBreakdownProps {
    breakdowns: { all: BreakdownData; open: BreakdownData; paid: BreakdownData };
    breakdownScope: 'all' | 'open' | 'paid';
    onScopeAll: () => void;
    onScopeOpen: () => void;
    onScopePaid: () => void;
}

function scopeBtnClass(active: boolean, activeColor: string): string {
    return `px-3 py-1 rounded border text-xs ${active ? `${activeColor} text-white` : 'bg-white text-gray-700 border-gray-300'}`;
}

function dueCellClass(due: number): string {
    return `px-2 py-2 whitespace-nowrap ${due > 0 ? 'text-orange-700 font-semibold' : 'text-green-700 font-semibold'}`;
}

function ticketCountBadgeClass(): string {
    return 'ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white min-w-[20px]';
}

function accountSummaryCardClass(idx: number): string {
    const colors = [
        'border-indigo-400 bg-indigo-50',
        'border-blue-400 bg-blue-50',
        'border-emerald-400 bg-emerald-50',
        'border-purple-400 bg-purple-50',
        'border-amber-400 bg-amber-50',
        'border-rose-400 bg-rose-50',
        'border-teal-400 bg-teal-50',
        'border-orange-400 bg-orange-50',
    ];
    return `border-l-4 rounded-lg p-2 flex flex-col gap-0.5 ${colors[idx % colors.length]}`;
}

function accountSummaryCountClass(idx: number): string {
    const colors = [
        'text-indigo-700',
        'text-blue-700',
        'text-emerald-700',
        'text-purple-700',
        'text-amber-700',
        'text-rose-700',
        'text-teal-700',
        'text-orange-700',
    ];
    return `text-xl font-extrabold ${colors[idx % colors.length]}`;
}

export default function AccountBreakdown({
    breakdowns,
    breakdownScope,
    onScopeAll,
    onScopeOpen,
    onScopePaid,
}: AccountBreakdownProps) {
    const data = breakdowns[breakdownScope];
    const accountEntries = Object.entries(data.byAccount);
    return (
        <div className="bg-white rounded-lg shadow-md p-2 border-t-4 border-t-indigo-500 mt-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <h3 className="text-md font-semibold text-indigo-800 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Account Breakdown
                </h3>
                <div className="flex gap-2">
                    <button className={scopeBtnClass(breakdownScope === 'all', 'bg-gray-800 border-gray-800')} onClick={onScopeAll}>All</button>
                    <button className={scopeBtnClass(breakdownScope === 'open', 'bg-blue-700 border-blue-700')} onClick={onScopeOpen}>Open</button>
                    <button className={scopeBtnClass(breakdownScope === 'paid', 'bg-green-700 border-green-700')} onClick={onScopePaid}>Paid</button>
                </div>
            </div>

            {/* Booked Tickets by Account — summary cards */}
            {accountEntries.length > 0 && (
                <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Booked Tickets by Account</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {accountEntries.map(([account, v], idx) => (
                            <div key={account} className={accountSummaryCardClass(idx)}>
                                <span className="text-xs font-semibold text-gray-700 truncate" title={account}>{account}</span>
                                <span className={accountSummaryCountClass(idx)}>{v.count}</span>
                                <span className="text-[10px] text-gray-500">{v.count === 1 ? 'ticket' : 'tickets'}</span>
                            </div>
                        ))}
                        <div className="border-l-4 border-gray-400 bg-gray-50 rounded-lg p-2 flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-gray-500 truncate">Total</span>
                            <span className="text-xl font-extrabold text-gray-700">{data.totals.count}</span>
                            <span className="text-[10px] text-gray-400">tickets</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto max-h-[60vh] relative rounded-md">
                <table className="w-full table-auto">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <th className="px-2 py-2 text-left font-semibold uppercase">Account</th>
                            <th className="px-2 py-2 text-left font-semibold uppercase">Tickets</th>
                            <th className="px-2 py-2 text-left font-semibold uppercase">Booking Amount</th>
                            <th className="px-2 py-2 text-left font-semibold uppercase">Ticket Amount</th>
                            <th className="px-2 py-2 text-left font-semibold uppercase">Profit</th>
                            <th className="px-2 py-2 text-left font-semibold uppercase">Amount Paid</th>
                            <th className="px-2 py-2 text-left font-semibold uppercase">Due Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white text-xs">
                        {accountEntries.map(([account, v]) => (
                            <tr key={account} className="odd:bg-blue-50 even:bg-emerald-50 hover:brightness-95">
                                <td className="px-2 py-2 whitespace-nowrap font-semibold text-gray-800">
                                    {account}
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap">
                                    <span className={ticketCountBadgeClass()}>{v.count}</span>
                                </td>
                                <td className="px-2 py-2 whitespace-nowrap">₹{Math.round(v.booking).toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap">₹{Math.round(v.ticket).toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-purple-900">₹{Math.round(v.profit).toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-green-700 font-medium">₹{Math.round(v.paid).toLocaleString()}</td>
                                <td className={dueCellClass(v.due)}>₹{Math.round(Math.max(0, v.due)).toLocaleString()}</td>
                            </tr>
                        ))}
                        <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 font-semibold text-xs">
                            <td className="px-2 py-2">Totals</td>
                            <td className="px-2 py-2">
                                <span className={ticketCountBadgeClass()}>{data.totals.count}</span>
                            </td>
                            <td className="px-2 py-2">₹{Math.round(data.totals.booking).toLocaleString()}</td>
                            <td className="px-2 py-2">₹{Math.round(data.totals.ticket).toLocaleString()}</td>
                            <td className="px-2 py-2 text-purple-900">₹{Math.round(data.totals.profit).toLocaleString()}</td>
                            <td className="px-2 py-2 text-green-700">₹{Math.round(data.totals.paid).toLocaleString()}</td>
                            <td className="px-2 py-2">₹{Math.round(Math.max(0, data.totals.due)).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                {accountEntries.length === 0 && (
                    <div className="text-center py-6 text-gray-500">No accounts in range.</div>
                )}
            </div>
        </div>
    );
}