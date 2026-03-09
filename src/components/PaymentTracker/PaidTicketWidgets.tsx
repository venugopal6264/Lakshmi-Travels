interface TotalsPaid {
    booking: number;
    ticket: number;
    profit: number;
    refund: number;
    count: number;
    refundedCount: number;
}

interface TypeProfit {
    train: number;
    bus: number;
    flight: number;
}

interface PaidTicketWidgetsProps {
    totalsPaid: TotalsPaid;
    paidTypeProfit: TypeProfit;
}

export default function PaidTicketWidgets({ totalsPaid, paidTypeProfit }: PaidTicketWidgetsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 lg:gap-8 mb-2">
            <div className="bg-indigo-50 p-2 rounded-lg border-t-4 border-indigo-500">
                <h3 className="text-sm font-medium text-indigo-600">Total Booking Amount</h3>
                <p className="text-xl font-bold text-indigo-900">₹{Math.round(totalsPaid.booking).toLocaleString()}</p>
                <p className="text-[10px] text-indigo-600">{totalsPaid.count} paid tickets</p>
            </div>
            <div className="bg-purple-50 p-2 rounded-lg border-t-4 border-purple-500">
                <h3 className="text-sm font-medium text-purple-600">Total Ticket Amount</h3>
                <p className="text-xl font-bold text-purple-900">₹{Math.round(totalsPaid.ticket).toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-2 rounded-lg border-t-4 border-green-500">
                <h3 className="text-sm font-medium text-green-600">Total Profit</h3>
                <p className="text-xl font-bold text-green-900">₹{Math.round(totalsPaid.profit).toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-2 rounded-lg border-t-4 border-red-500">
                <h3 className="text-sm font-medium text-red-600">Total Refund</h3>
                <p className="text-xl font-bold text-red-900">₹{Math.round(totalsPaid.refund).toLocaleString()}</p>
                <p className="text-xs text-red-600">{totalsPaid.refundedCount} refunded</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 via-emerald-50 to-purple-50 p-2 rounded-lg border-t-4 border-blue-500">
                <div className="flex justify-between">
                    <span className="text-blue-700">Train Profit:</span>
                    <span className="font-semibold text-blue-900">₹{Math.round(paidTypeProfit.train).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-green-700">Bus Profit:</span>
                    <span className="font-semibold text-green-900">₹{Math.round(paidTypeProfit.bus).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-purple-700">Flight Profit:</span>
                    <span className="font-semibold text-purple-900">₹{Math.round(paidTypeProfit.flight).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
