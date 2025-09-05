import { Bus, Plane, Train, TrendingUp } from 'lucide-react';
import { Ticket } from '../types/ticket';

interface ProfitSummaryProps {
  tickets: Ticket[];
  dateRange: { from: string; to: string };
  loading?: boolean;
}

export default function ProfitSummary({ tickets, dateRange, loading = false }: ProfitSummaryProps) {
  // Filter tickets by date range
  const filteredTickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.bookingDate);
    const fromDate = dateRange.from ? new Date(dateRange.from) : null;
    const toDate = dateRange.to ? new Date(dateRange.to) : null;

    if (fromDate && ticketDate < fromDate) return false;
    if (toDate && ticketDate > toDate) return false;
    return true;
  });

  // Calculate summary from filtered tickets
  const summary = filteredTickets.reduce((acc, ticket) => {
    acc[ticket.type] += ticket.profit;
    acc.total += ticket.profit;
    return acc;
  }, {
    train: 0,
    bus: 0,
    flight: 0,
    total: 0
  });

  const totalTickets = filteredTickets.length;

  const summaryCards = [
    {
      title: 'Train Profit',
      value: summary.train,
      icon: Train,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Bus Profit',
      value: summary.bus,
      icon: Bus,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Flight Profit',
      value: summary.flight,
      icon: Plane,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Profit',
      value: summary.total,
      icon: TrendingUp,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {summaryCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`${card.bgColor} p-6 rounded-lg shadow-sm border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">₹{Math.round(card.value).toLocaleString()}</p>
                {card.title === 'Total Profit' && (
                  <p className="text-sm text-gray-500 mt-1">
                    From {totalTickets} tickets
                  </p>
                )}
              </div>
              <div className={`${card.color} p-3 rounded-full`}>
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Icon className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
