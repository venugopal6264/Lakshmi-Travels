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

export default function AccountBreakdown({
    breakdowns,
    breakdownScope,
    onScopeAll,
    onScopeOpen,
    onScopePaid,
}: AccountBreakdownProps) {
    const data = breakdowns[breakdownScope];
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
                        {Object.entries(data.byAccount).map(([account, v]) => (
                            <tr key={account} className="odd:bg-blue-50 even:bg-emerald-50 hover:brightness-95">
                                <td className="px-2 py-2 whitespace-nowrap font-semibold text-gray-800">{account}</td>
                                <td className="px-2 py-2 whitespace-nowrap">{v.count}</td>
                                <td className="px-2 py-2 whitespace-nowrap">₹{Math.round(v.booking).toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap">₹{Math.round(v.ticket).toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-purple-900">₹{Math.round(v.profit).toLocaleString()}</td>
                                <td className="px-2 py-2 whitespace-nowrap text-green-700 font-medium">₹{Math.round(v.paid).toLocaleString()}</td>
                                <td className={dueCellClass(v.due)}>₹{Math.round(Math.max(0, v.due)).toLocaleString()}</td>
                            </tr>
                        ))}
                        <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 font-semibold text-xs">
                            <td className="px-2 py-2">Totals</td>
                            <td className="px-2 py-2">{data.totals.count}</td>
                            <td className="px-2 py-2">₹{Math.round(data.totals.booking).toLocaleString()}</td>
                            <td className="px-2 py-2">₹{Math.round(data.totals.ticket).toLocaleString()}</td>
                            <td className="px-2 py-2 text-purple-900">₹{Math.round(data.totals.profit).toLocaleString()}</td>
                            <td className="px-2 py-2 text-green-700">₹{Math.round(data.totals.paid).toLocaleString()}</td>
                            <td className="px-2 py-2">₹{Math.round(Math.max(0, data.totals.due)).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
                {Object.keys(data.byAccount).length === 0 && (
                    <div className="text-center py-6 text-gray-500">No accounts in range.</div>
                )}
            </div>
        </div>
    );
}
