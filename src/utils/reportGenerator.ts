import { ApiTicket } from '../services/api';

export const generateCSVReport = (tickets: ApiTicket[]) => {
  const headers = [
    'Date',
    'Type',
    'Passenger',
    'PNR',
    'Place',
    'Amount',
    'Profit',
    'Fare',
    'Service',
    'Account',
    'Refund',
    'Remarks'
  ];

  const rows = tickets.map(ticket => [
    ticket.bookingDate,
    ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1),
    ticket.passengerName,
    ticket.pnr,
    ticket.place,
    ticket.amount.toString(),
    ticket.profit.toString(),
    ticket.fare.toString(),
    ticket.service,
    ticket.account,
    ticket.refund.toString(),
    ticket.remarks || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};