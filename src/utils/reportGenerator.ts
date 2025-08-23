import { ApiTicket } from '../services/api';

export const generateCSVReport = (tickets: ApiTicket[]) => {
  const headers = [
    'Account',
    'Booking Date',
    'Type',
    'Names',
    'PNR',
    'Place',
    'Fare',
    'Refund',
    'Remarks'
  ];

  const rows = tickets.map(ticket => [
    ticket.account,
    ticket.bookingDate?.split('T')[0],
    ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1),
    ticket.passengerName,
    ticket.pnr,
    ticket.place,
    ticket.fare.toString(),
    ticket.refund.toString(),
    ticket.remarks || ''
  ]);

  // Totals
  const totalFare = tickets.reduce((sum, t) => sum + (Number(t.fare) || 0), 0);
  const totalRefund = tickets.reduce((sum, t) => sum + (Number(t.refund) || 0), 0);
  const totalDue = totalFare - totalRefund;

  // Summary rows aligned to headers: put values in Fare and Refund columns
  const blankRow = Array(headers.length).fill('');
  const totalsRow = [
    '',
    '',
    '',
    '',
    'Total',
    totalFare.toFixed(2), // Fare column
    '',
    totalRefund.toFixed(2), // Refund column
    ''
  ];

  const dueRow = [
    '',
    '',
    '',
    '',
    'Total Due',
    totalDue.toFixed(2), // Place due in Fare column for visibility
    '',
    '',
    ''
  ];

  const csvContent = [headers, ...rows, blankRow, totalsRow, dueRow]
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