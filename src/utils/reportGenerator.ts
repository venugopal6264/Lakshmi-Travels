import { ApiTicket } from '../services/api';

// Format a booking date string (ISO) as DD MMM (e.g., 05 Nov) using local date without TZ shift
const formatExportDate = (iso?: string): string => {
  if (!iso) return '';
  const ymd = iso.split('T')[0] || '';
  const parts = ymd.split('-').map(Number);
  if (parts.length < 3) return '';
  const [y, m, d] = parts as [number, number, number];
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  const day = String(d).padStart(2, '0');
  const mon = dt.toLocaleString('en-US', { month: 'short' }); // e.g., Nov
  return `${day}-${mon}`;
};

// Helper to get sortable YYYY-MM-DD key without TZ shifts
const ymdKey = (iso?: string): string => (iso ? (iso.split('T')[0] || '') : '');

// Remove all whitespace from place strings for export
const sanitizePlace = (s?: string): string => (s ? s.replace(/\s+/g, '') : '');

export const generateCSVReport = (tickets: ApiTicket[]) => {
  const headers = [
    'Account',
    'Date',
    'Type',
    'Names',
    'PNR',
    'Place',
    'Amount',
    'Refund',
    'Remarks'
  ];

  // Sort by booking date ascending for CSV as well
  const csvSorted = [...tickets].sort((a, b) => ymdKey(a.bookingDate).localeCompare(ymdKey(b.bookingDate)));

  const rows = csvSorted.map(ticket => [
    ticket.account,
    formatExportDate(ticket.bookingDate),
    ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1),
    ticket.passengerName,
    ticket.pnr,
    sanitizePlace(ticket.place),
    ticket.bookingAmount.toString(),
    (Number(ticket.refund) || 0).toString(),
    ticket.remarks || ''
  ]);

  // Totals
  const totalBooking = tickets.reduce((sum, t) => sum + (Number(t.bookingAmount) || 0), 0);
  const totalRefund = tickets.reduce((sum, t) => sum + (Number(t.refund) || 0), 0);
  const totalDue = totalBooking - totalRefund;

  // Summary rows aligned to headers: put values in Fare and Refund columns
  const blankRow = Array(headers.length).fill('');
  const totalsRow = [
    '',
    '',
    '',
    '',
    '',
    'Total',
    Math.round(totalBooking).toString(), // Booking Amount column
    Math.round(totalRefund).toString(), // Refund column
    ''
  ];

  const dueRow = [
    '',
    '',
    '',
    '',
    '',
    'Total Due',
    Math.round(totalDue).toString(), // Place due in Booking Amount column for visibility
    '',
    ''
  ];

  const csvContent = [headers, ...rows, blankRow, totalsRow, dueRow]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

// Load an image URL (from public/) as a data URL for embedding in PDF
const loadImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Logo load failed, continuing without logo:', e);
    return null;
  }
};

export async function downloadPDFReport(tickets: ApiTicket[], options: { accountLabel?: string; startLabel?: string; endLabel?: string; filename?: string; partialTotal?: number; partialPayments?: Array<{ date: string; amount: number; account: string }>; }) {
  if (!tickets || tickets.length === 0) return;
  // Dynamically import heavy libs to keep initial bundle small
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const headers = [
    'Date',
    'Type',
    'Names',
    'PNR',
    'Place',
    'Amount',
    'Refund',
  ];

  // Sort tickets by booking date ascending for export, but move cancelled (refund) tickets to the end
  const sorted = [...tickets].sort((a, b) => ymdKey(a.bookingDate).localeCompare(ymdKey(b.bookingDate)));
  const nonCancelled = sorted.filter(t => (Number(t.refund) || 0) === 0);
  const cancelled = sorted.filter(t => (Number(t.refund) || 0) > 0);
  const ordered = [...nonCancelled, ...cancelled];

  const rows = ordered.map(t => [
    formatExportDate(t.bookingDate),
    t.type.charAt(0).toUpperCase() + t.type.slice(1),
    t.passengerName,
    t.pnr,
    sanitizePlace(t.place),
    Math.round(Number(t.ticketAmount) || 0).toString(),
    Math.round(Number(t.refund) || 0).toString(),
  ]);

  const totalTicketAmount = ordered.reduce((sum, t) => sum + (Number(t.ticketAmount) || 0), 0);
  const totalRefund = ordered.reduce((sum, t) => sum + (Number(t.refund) || 0), 0);
  const partialTotal = Number(options?.partialTotal || 0);
  const totalDue = totalTicketAmount - totalRefund - partialTotal;
  const hasRefundFlags = ordered.map(t => (Number(t.refund) || 0) > 0);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // Header with logo and title (repeat per page)
  const logoDataUrl = await loadImageAsDataUrl('/LakshmiTravels.png');
  const title = 'Lakshmi Travels';
  const subtitle = 'Tickets Report';
  const account = options?.accountLabel || 'All Accounts';
  const period = `${options?.startLabel || 'ALL'} to ${options?.endLabel || 'ALL'}`;

  const drawHeader = () => {
    const startX = 24;
    const y = 24;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', startX, y, 36, 36, undefined, 'FAST');
      } catch (e) {
        // Ignore image errors and continue
        console.warn('Failed to draw logo:', e);
      }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, startX + 44, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(subtitle, startX + 44, y + 30);
    doc.setFontSize(10);
    doc.text(`Account: ${account}`, startX + 260, y + 14, { align: 'left' });
    doc.text(`Period: ${period}`, startX + 260, y + 28, { align: 'left' });
  };

  const drawFooter = (page: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.text(`Page ${page}`, pageWidth - 40, pageHeight - 20, { align: 'right' });
  };

  // Use didDrawPage to repeat header/footer
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 70,
    styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9, cellPadding: 2 }, // blue header
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell: (data: unknown) => {
      const d = data as { section: 'head' | 'body' | 'foot'; row: { index: number }; cell: { styles: { textColor?: unknown } } };
      // Color entire row red when refund > 0
      if (d.section === 'body') {
        const rowIdx = d.row.index;
        if (hasRefundFlags[rowIdx]) {
          (d.cell.styles as { textColor?: unknown }).textColor = [220, 38, 38] as unknown; // red-600
        }
      }
    },
    didDrawPage: (data: { pageNumber: number }) => {
      const currentPage = data.pageNumber || 1;
      if (currentPage === 1) {
        drawHeader();
      }
      // Always draw footer page number
      drawFooter(currentPage);
    },
    margin: { top: 10, left: 16, right: 16, bottom: 10 },
    theme: 'grid',
  });

  // Sections: Partial Payments (left) and Totals (right), side by side
  const afterTicketsY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
    ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    : 90;
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 16;
  const tableWidth = 220; // approximate fixed width for small tables
  const gap = 24;
  const rightMarginLeft = leftMargin + tableWidth + gap;

  // Partial Payments table (Date, Partial)
  if (options.partialPayments && options.partialPayments.length > 0) {
    const entries = options.partialPayments;
    const ppRows = entries.map(e => [
      formatExportDate(e.date),
      Math.round(Number(e.amount || 0)).toString(),
    ]);
    autoTable(doc, {
      head: [['Date', 'Partial Amount']],
      body: ppRows,
      startY: afterTicketsY,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontSize: 8, cellPadding: 2 }, // emerald header
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: 'grid',
      margin: { left: leftMargin, right: Math.max(10, pageWidth - (leftMargin + tableWidth)) },
      tableWidth,
    });
  }

  // Totals table (no header): Label | amount
  const totalsRows = [
    ['Total Amount', Math.round(totalTicketAmount).toString()],
    ['Refund Amount', (-Math.round(totalRefund)).toString()],
    ['Partial Amount', (-Math.round(partialTotal)).toString()],
    ['Remaining Due', Math.round(totalDue).toString()],
  ];
  autoTable(doc, {
    body: totalsRows,
    startY: afterTicketsY,
    styles: { fontSize: 9, cellPadding: 3 },
    theme: 'grid',
    margin: { left: rightMarginLeft, right: 20 },
    tableWidth,
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
    didParseCell: (data: unknown) => {
      const d = data as { section: 'head' | 'body' | 'foot'; row: { index: number }; cell: { styles: { fillColor?: unknown; textColor?: unknown; fontStyle?: unknown } } };
      if (d.section === 'body' && d.row.index === 3) {
        // Highlight Remaining Due row
        d.cell.styles.fillColor = [254, 243, 199] as unknown; // amber-200
        d.cell.styles.textColor = [22, 101, 52] as unknown; // green-700
        d.cell.styles.fontStyle = 'bold' as unknown;
      }
    },
  });

  const filename = options.filename || 'tickets-report.pdf';
  doc.save(filename);
}