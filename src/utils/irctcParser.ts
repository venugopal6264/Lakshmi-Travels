// ─── IRCTC ticket parser & PDF generator ─────────────────────────────────────

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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();   // 210 mm
    const ph = doc.internal.pageSize.getHeight();  // 297 mm
    const ml = 20;   // left margin mm
    const mr = 20;   // right margin mm
    const cw = pw - ml - mr;  // content width 200 mm
    const [logoDataUrl, electronicImgDataUrl, irctcImgDataUrl] = await Promise.all([
        loadImg('/LakshmiTravels.png'),
        loadImg('/Electronic-image.jpg'),
        loadImg('/Irctc-image.jpg'),
    ]);

    // ── Header bar: Electronic (left) | Lakshmi Travels (centre) | IRCTC (right) ──
    const hdrTop = 10;   // top padding before the header bar
    const hdrH = 28;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, hdrTop, pw, hdrH, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(0, hdrTop + hdrH, pw, hdrTop + hdrH);

    const imgW = 55;
    const imgH = 22;
    const imgTop = hdrTop + (hdrH - imgH) / 2;

    // Left — Electronic Reservation Slip
    if (electronicImgDataUrl) {
        try { doc.addImage(electronicImgDataUrl, 'JPEG', ml, imgTop, imgW, imgH); } catch { /* skip */ }
    }

    // Centre — logo + "Lakshmi Travels" + subtitle
    const cx = pw / 2;
    if (logoDataUrl) {
        try { doc.addImage(logoDataUrl, 'PNG', cx - 22, imgTop, imgH, imgH); } catch { /* skip */ }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 153, 255);
    doc.text('Lakshmi Travels', cx + 3, imgTop + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text('We Plan, You Decide', cx + 3, imgTop + 20);

    // Right — IRCTC e-Ticketing Service
    if (irctcImgDataUrl) {
        try { doc.addImage(irctcImgDataUrl, 'JPEG', pw - mr - imgW, imgTop, imgW, imgH); } catch { /* skip */ }
    }

    doc.setTextColor(0, 0, 0);

    let y = hdrTop + hdrH + 8;

    // ── ERS bullet rules ───────────────────────────────────────────────────────
    const rules = [
        'You can travel on e-ticket sent on SMS or take a Virtual Reservation Message (VRM) along with any one of the prescribed ID in original. Please do not print the ERS unless extremely necessary.',
        'This Ticket will be valid with an ID proof in original. Please carry original identity proof. If found traveling without original ID proof, passenger will be treated as without ticket and charged as per extent Railway Rules.',
        'E-Ticket cancellation is permitted through your respective agents only. The customer/passenger should share the Refund OTP with the agent who booked/cancelled the ticket, for getting the cancellation refund amount.',
        'Fully Waitlisted E-ticket is invalid for travel if it remains fully waitlisted after preparation of chart and the refund of the booking amount shall be credited to the account used for payment for booking of the ticket. Passengers travelling on a fully waitlisted e-ticket will be treated as Ticketless.',
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    const bulletX = ml + 2;
    const textX = ml + 6;          // indent for wrapped lines, after the bullet
    const maxW = cw - 6;           // wrap width measured from textX
    for (const rule of rules) {
        const lines = doc.splitTextToSize(rule, maxW);
        doc.text('\u2022', bulletX, y);          // bullet at left
        doc.text(lines[0], textX, y);            // first line after bullet
        for (let i = 1; i < lines.length; i++) {
            y += 3.8;
            doc.text(lines[i], textX, y);        // continuation lines, indented
        }
        y += 4.5;
    }

    // ── Agent Details ──────────────────────────────────────────────────────────
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 153, 255);
    doc.text('Agent Details:', ml + 2, y);
    y += 2;
    doc.setTextColor(0, 0, 0);

    const colW = cw / 4;
    autoTable(doc, {
        startY: y,
        body: [
            ['Principle Agent :', 'BIRDRES', 'Corporate Name:', 'LAKSHMI TRAVELS'],
            ['Agent Name:', 'SWARAJYA LAXMI RAYAPATI', 'Email-id:', 'KUCHIPUDILAXMI1@GMAIL.COM'],
            [
                { content: 'Address : 5-145, THIMMAKKAPALEM, LINGAPALEM MANADAL, WEST GODAVARI, ANDHRA PRADESH -534462', colSpan: 2 },
                'Contact Number',
                '+91-9441751394',
            ],
        ],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 30, 30] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: colW },
            1: { cellWidth: colW },
            2: { fontStyle: 'bold', cellWidth: colW },
            3: { cellWidth: colW },
        },
        margin: { left: ml, right: mr },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 1.5;

    // ── Must Read note ─────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(200, 0, 0);
    doc.text('Must Read: ', ml + 2, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text('Please don\'t print unless extremely necessary.', ml + 2 + doc.getTextWidth('Must Read: '), y + 3.5);

    y += 7;

    // ── Journey summary row: Train name | Date|Class|Quota (centre) | FROM-TO — all in 1 row ──
    doc.setFillColor(235, 245, 255);
    doc.rect(ml, y, cw, 10, 'F');

    const rowMid = y + 7;  // single baseline for all three columns

    // Left — train number + name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 153, 255);
    doc.text(`${parsed.trainNo}  ${parsed.trainName}`, ml + 3, rowMid);

    // Centre — Date | Class | Quota
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text(
        `${parsed.journeyDate}   |   ${normaliseClass(parsed.cls)}   |   ${parsed.quota}`,
        pw / 2,
        rowMid,
        { align: 'center' },
    );

    // Right — FROM - TO
    const fromCode = extractCode(parsed.from);
    const toCode = extractCode(parsed.to);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(`${fromCode}  -  ${toCode}`, pw - mr - 3, rowMid, { align: 'right' });

    y += 12;
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
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 36 },
            1: { textColor: [17, 24, 39], cellWidth: cw / 2 - 36 },
            2: { fontStyle: 'bold', textColor: [75, 85, 99], cellWidth: 36 },
            3: { textColor: [17, 24, 39] },
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: ml, right: mr },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

    // ── Passenger Details ──────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setFillColor(0, 153, 255);
    doc.setTextColor(255, 255, 255);
    doc.rect(ml, y, cw, 5.5, 'F');
    doc.text('Passenger Details', ml + 2, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 5.5;

    autoTable(doc, {
        startY: y,
        head: [['S.No', 'Passenger Name', 'Age', 'Gender', 'Status', 'Coach', 'Seat/Berth']],
        body: parsed.passengerRows.map(r => [r.sno, r.name, r.age, r.gender, r.status, r.coach, r.berth]),
        theme: 'grid',
        headStyles: { fillColor: [204, 235, 255], textColor: [0, 153, 255], fontSize: 7.5, fontStyle: 'bold', cellPadding: 1.5 },
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: ml, right: mr },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

    // ── Fare Details ───────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setFillColor(0, 153, 255);
    doc.setTextColor(255, 255, 255);
    doc.rect(ml, y, cw, 5.5, 'F');
    doc.text('Fare Details (Inclusive of GST)', ml + 2, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 5.5;

    const totalFareNum = parseFloat(parsed.totalFare) || 0;
    const convFee = parseFloat(parsed.convenienceFee) || 0;
    const insFee = parseFloat(parsed.insuranceFee) || 0;
    const adjTotal = totalFareNum + profit;
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
        headStyles: { fillColor: [204, 235, 255], textColor: [0, 153, 255], fontSize: 7.5, fontStyle: 'bold', cellPadding: 1.5 },
        styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
        margin: { left: ml, right: mr },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;

    // ── Footer ─────────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text('This is a computer-generated ticket. Lakshmi Travels – Powered by LT System.', pw / 2, ph - 5, { align: 'center' });

    // ── Save ───────────────────────────────────────────────────────────────────
    const firstName = parsed.passengerRows[0]?.name || parsed.passengerName.split(',')[0] || 'passenger';
    const safeName = firstName.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    const safePlace = parsed.place.trim().replace(/[^\w\s,:-]/g, '').replace(/\s+/g, '_');
    doc.save(`${safeName}-${safePlace}.pdf`);
}
