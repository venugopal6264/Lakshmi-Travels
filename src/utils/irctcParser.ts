// ─── IRCTC ticket parser & PDF generator ─────────────────────────────────────
import ersHeaderUrl from '../assets/images/Lakshmi Travels.jpg';

export const CLASS_MAP: Record<string, string> = {
    'THIRD AC': '3A',
    'SECOND AC': '2A',
    'FIRST AC': '1A',
    'THIRD AC ECONOMY': '3E',
    'SL': 'SL',
    'SLEEPER': 'SL',
    'CHAIR CAR': 'CC',
    'CC': 'CC',
    'EXECUTIVE': 'EC',
};

export function normaliseClass(raw: string): string {
    const upper = raw.trim().toUpperCase();
    return CLASS_MAP[upper] ?? upper;
}

// "13-Mar-2026 10:27:41 PM HRS" → "2026-03-13"
export function parseIRCTCDate(raw: string): string {
    const m = raw.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
    if (!m) return '';
    const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const mm = months[m[2]] ?? '01';
    return `${m[3]}-${mm}-${m[1].padStart(2, '0')}`;
}

// Extract value for a label in a flat key-value block (handles tabs, colons, multispace, trailing dots/asterisks)
export function extractField(text: string, label: string): string {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(String.raw`${escaped}[.*]?\s*[:\t]\s*(.+?)(?:\t|$|\n)`, 'im');
    const match = re.exec(text);
    return match ? match[1].trim() : '';
}

// Pull the text inside parentheses — e.g. "MANGALURU CNTL (MAQ)" → "MAQ"
export function extractCode(raw: string): string {
    const m = raw.match(/\(([^)]+)\)\s*$/);
    return m ? m[1].trim() : raw.trim();
}

// Build the Place string from parsed parts
export function buildPlace(trainNo: string, journeyDate: string, cls: string, from: string, to: string): string {
    const num = trainNo.trim();
    const jDate = parseIRCTCDate(journeyDate);
    const formattedJDate = jDate
        ? (() => {
            const [y, mo, d] = jDate.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${d}-${months[parseInt(mo, 10) - 1]}-${y}`;
        })()
        : journeyDate.trim();
    const fromCode = extractCode(from);
    const toCode = extractCode(to);
    const normCls = normaliseClass(cls);
    return `Train:${num},${formattedJDate},${normCls},${fromCode}-${toCode}`;
}

// Parse passenger table rows — returns "NAME Age/Coach/Berth, ..." string
export function parsePassengers(text: string): string {
    const sectionMatch = text.match(/Passenger Details[\s\S]*?(?=Fare Details|$)/i);
    if (!sectionMatch) return '';
    const section = sectionMatch[0];
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    const passengers: string[] = [];
    for (const line of lines) {
        const cols = line.split(/\t+/).map(c => c.trim());
        if (cols.length < 7) continue;
        const [rowNum, name, age, , , status, coach, berth] = cols;
        if (!rowNum || !/^\d+$/.test(rowNum)) continue;
        const wlTag = (status || '').toUpperCase().startsWith('WL') ? `/${status}` : '';
        const berthClean = (berth ?? '').trim();
        const coachClean = (coach ?? '').trim();
        passengers.push(`${name} ${age}/${coachClean}/${berthClean}${wlTag}`);
    }
    return passengers.join(', ');
}

// Extract total fare number from "Rs. 1766.30 *" or "1766.30"
export function extractTotalFare(text: string): string {
    // Try: "Total Fare" label with Rs. value on same or next line
    const m = text.match(/Total Fare[\s\S]{0,120}?Rs\.\s*([\d,]+\.?\d*)/i);
    if (m) return m[1].replace(/,/g, '');
    // Fallback: last starred Rs. amount in the text (e.g. "Rs. 1766.30 *")
    const allStarred = [...text.matchAll(/Rs\.\s*([\d,]+\.?\d*)\s*\*/gi)];
    if (allStarred.length > 0) return allStarred[allStarred.length - 1][1].replace(/,/g, '');
    return '';
}

// Split "Train No. / Name" field like "16586 / MRDW SMVB EXP"
export function splitTrainNoName(raw: string): { no: string; name: string } {
    const parts = raw.split('/');
    return { no: (parts[0] ?? '').trim(), name: (parts[1] ?? '').trim() };
}

export interface ParsedTicket {
    pnr: string;
    bookingDate: string;
    trainNo: string;
    trainName: string;
    cls: string;
    quota: string;
    transactionId: string;
    bookingDateRaw: string;
    from: string;
    to: string;
    boardingAt: string;
    journeyDate: string;
    scheduledDeparture: string;
    scheduledArrival: string;
    distance: string;
    totalFare: string;
    ticketFare: string;
    convenienceFee: string;
    insuranceFee: string;
    passengerName: string;
    place: string;
    passengerRows: Array<{ sno: string; name: string; age: string; gender: string; status: string; coach: string; berth: string }>;
}

export function parsePassengerRows(text: string): Array<{ sno: string; name: string; age: string; gender: string; status: string; coach: string; berth: string }> {
    const sectionMatch = text.match(/Passenger Details[\s\S]*?(?=Fare Details|$)/i);
    if (!sectionMatch) return [];
    const section = sectionMatch[0];
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    const rows: Array<{ sno: string; name: string; age: string; gender: string; status: string; coach: string; berth: string }> = [];
    for (const line of lines) {
        const cols = line.split(/\t+/).map(c => c.trim());
        if (cols.length < 7) continue;
        const [rowNum, name, age, gender, , status, coach, berth] = cols;
        if (!rowNum || !/^\d+$/.test(rowNum)) continue;
        rows.push({ sno: rowNum, name: name ?? '', age: age ?? '', gender: gender ?? '', status: status ?? '', coach: coach ?? '', berth: berth ?? '' });
    }
    return rows;
}

// Extract individual fare components
export function extractFareComponents(text: string): { ticketFare: string; convenienceFee: string; insuranceFee: string; totalFare: string } {
    const fareSection = text.match(/Ticket Fare\s+Convenience Fee\s+Travel Insurance Premium\s+Total Fare[\s\S]{0,300}/i);
    if (!fareSection) return { ticketFare: '', convenienceFee: '', insuranceFee: '', totalFare: '' };
    const nums = [...fareSection[0].matchAll(/Rs\.\s*([\d,]+\.?\d*)/gi)].map(m => m[1].replace(/,/g, ''));
    return { ticketFare: nums[0] ?? '', convenienceFee: nums[1] ?? '', insuranceFee: nums[2] ?? '', totalFare: nums[3] ?? '' };
}

export function parseIRCTCTicket(raw: string): ParsedTicket | null {
    if (!raw.trim()) return null;
    let pnr = extractField(raw, 'PNR No');
    if (!pnr) {
        const pnrMatch = raw.match(/PNR\s*(?:No\.?)?\s*[:\t]\s*(\d{10})/i);
        if (pnrMatch) pnr = pnrMatch[1];
    }
    const bookingDateRaw = extractField(raw, 'Date & Time of Booking');
    const trainRaw = extractField(raw, 'Train No. / Name');
    const clsRaw = extractField(raw, 'Class');
    const quota = extractField(raw, 'Quota');
    const transactionId = extractField(raw, 'Transaction ID');
    const fromRaw = extractField(raw, 'From');
    const journeyDateRaw = extractField(raw, 'Date of Journey');
    const toRaw = extractField(raw, 'To');
    const boardingAt = extractField(raw, 'Boarding At');
    const scheduledDeparture = extractField(raw, 'Scheduled Departure');
    const scheduledArrival = extractField(raw, 'Scheduled Arrival');
    const distance = extractField(raw, 'Distance');

    const bookingDate = parseIRCTCDate(bookingDateRaw);
    const { no: trainNo, name: trainName } = splitTrainNoName(trainRaw);
    const { ticketFare, convenienceFee, insuranceFee, totalFare: fareTotal } = extractFareComponents(raw);
    // Fallback: use standalone extractTotalFare if fare section regex missed
    const totalFare = fareTotal || extractTotalFare(raw);
    const passengerName = parsePassengers(raw);
    const passengerRows = parsePassengerRows(raw);
    const place = buildPlace(trainNo, journeyDateRaw, clsRaw, fromRaw, toRaw);

    if (!pnr && !trainNo) return null;

    return {
        pnr, bookingDate, trainNo, trainName, cls: clsRaw, quota, transactionId,
        bookingDateRaw, from: fromRaw, to: toRaw, boardingAt, journeyDate: journeyDateRaw,
        scheduledDeparture, scheduledArrival, distance, totalFare, ticketFare,
        convenienceFee, insuranceFee, passengerName, passengerRows, place,
    };
}

// ─── IRCTC PDF Generator ─────────────────────────────────────────────────────

async function loadImg(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, { cache: 'no-cache' });
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

export async function generateIRCTCPdf(parsed: ParsedTicket, profit: number): Promise<void> {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const [logoDataUrl, ersImgDataUrl] = await Promise.all([
        loadImg('/LakshmiTravels.png'),
        loadImg(ersHeaderUrl),
    ]);

    // ── Header bar ─────────────────────────────────────────────────────────────
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pw, 48, 'F');

    if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, 'PNG', 10, 6, 36, 36); } catch { /* skip */ }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Lakshmi Travels', 54, 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Train Ticket – Booking Confirmation', 54, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`PNR: ${parsed.pnr}`, pw - 16, 22, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Booked: ${parsed.bookingDateRaw}`, pw - 16, 36, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // ── ERS banner image ───────────────────────────────────────────────────────
    // Increased height — use /1.8 ratio for a taller render
    let y = 54;
    const ersImgH = Math.round((pw - 20) / 1.8);
    if (ersImgDataUrl) {
        try { doc.addImage(ersImgDataUrl, 'JPEG', 10, y, pw - 20, ersImgH); } catch { /* skip */ }
    }
    y += ersImgH + 4;
    doc.setTextColor(0, 0, 0);

    // ── Journey summary row ────────────────────────────────────────────────────
    doc.setFillColor(239, 246, 255);
    doc.rect(10, y, pw - 20, 46, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text(`${parsed.trainNo}  ${parsed.trainName}`, pw / 2, y + 11, { align: 'center' });

    const fromCode = extractCode(parsed.from);
    const toCode = extractCode(parsed.to);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(`${fromCode}  -  ${toCode}`, pw / 2, y + 27, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`${parsed.journeyDate}   |   ${normaliseClass(parsed.cls)}   |   ${parsed.quota}`, pw / 2, y + 39, { align: 'center' });

    y += 48;
    doc.setTextColor(0, 0, 0);

    // ── Info grid ──────────────────────────────────────────────────────────────
    const infoRows: Array<[string, string, string, string]> = [
        ['PNR No.', parsed.pnr, 'Transaction ID', parsed.transactionId],
        ['Class', `${parsed.cls} (${normaliseClass(parsed.cls)})`, 'Quota', parsed.quota],
        ['Boarding At', parsed.boardingAt, 'Date of Journey', parsed.journeyDate],
        ['From', parsed.from, 'To', parsed.to],
        ['Scheduled Departure', parsed.scheduledDeparture, 'Scheduled Arrival', parsed.scheduledArrival],
        ['Distance', parsed.distance, 'Booked On', parsed.bookingDateRaw],
    ];

    autoTable(doc, {
        startY: y,
        body: infoRows.map(([k1, v1, k2, v2]) => [k1, v1, k2, v2]),
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 100 },
            1: { textColor: [17, 24, 39], cellWidth: pw / 2 - 110 },
            2: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 100 },
            3: { textColor: [17, 24, 39] },
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 10, right: 10 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // ── Passenger Details ──────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(30, 64, 175);
    doc.setTextColor(255, 255, 255);
    doc.rect(10, y, pw - 20, 14, 'F');
    doc.text('Passenger Details', 16, y + 10);
    doc.setTextColor(0, 0, 0);
    y += 14;

    autoTable(doc, {
        startY: y,
        head: [['S.No', 'Passenger Name', 'Age', 'Gender', 'Status', 'Coach', 'Seat/Berth']],
        body: parsed.passengerRows.map(r => [r.sno, r.name, r.age, r.gender, r.status, r.coach, r.berth]),
        theme: 'grid',
        headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
        styles: { fontSize: 8, cellPadding: 3 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 10, right: 10 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // ── Fare Details ───────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(30, 64, 175);
    doc.setTextColor(255, 255, 255);
    doc.rect(10, y, pw - 20, 14, 'F');
    doc.text('Fare Details (Inclusive of GST)', 16, y + 10);
    doc.setTextColor(0, 0, 0);
    y += 14;

    const totalFareNum = parseFloat(parsed.totalFare) || 0;
    const convFee = parseFloat(parsed.convenienceFee) || 0;
    const insFee = parseFloat(parsed.insuranceFee) || 0;
    // Total Fare = Booking Amount (ticket fare parsed) + Profit
    const adjTotal = totalFareNum + profit;
    // Ticket Fare = Total Fare − Convenience Fee − Travel Insurance Premium
    const adjTicketFare = adjTotal - convFee - insFee;

    autoTable(doc, {
        startY: y,
        head: [['Ticket Fare', 'Convenience Fee', 'Travel Insurance Premium', 'Total Fare']],
        body: [[
            `Rs. ${adjTicketFare.toFixed(2)}`,
            `Rs. ${convFee.toFixed(2)}`,
            `Rs. ${insFee.toFixed(2)}`,
            `Rs. ${adjTotal.toFixed(2)} *`,
        ]],
        theme: 'grid',
        headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
        styles: { fontSize: 9, cellPadding: 4, halign: 'center' },
        margin: { left: 10, right: 10 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;


    // ── Footer ─────────────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('This is a computer-generated ticket. Lakshmi Travels – Powered by LT System.', pw / 2, pageH - 12, { align: 'center' });

    // ── Save ───────────────────────────────────────────────────────────────────
    const firstName = parsed.passengerRows[0]?.name || parsed.passengerName.split(',')[0] || 'passenger';
    const safeName = firstName.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const safePlace = parsed.place.trim().replace(/[^\w\s,:-]/g, '').replace(/\s+/g, '_');
    doc.save(`${safeName}-${safePlace}.pdf`);
}
