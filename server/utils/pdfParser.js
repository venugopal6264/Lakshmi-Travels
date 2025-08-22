import pdf from 'pdf-parse';

// Common patterns for extracting ticket information
const patterns = {
  pnr: [
    /PNR[:\s]*([A-Z0-9]{10})/i,
    /Booking\s*Reference[:\s]*([A-Z0-9]{6,})/i,
    /Ticket\s*Number[:\s]*([A-Z0-9]{6,})/i,
    /Reference[:\s]*([A-Z0-9]{6,})/i
  ],
  passengerName: [
    /Passenger[:\s]*([A-Z\s]{2,})/i,
    /Name[:\s]*([A-Z\s]{2,})/i,
    /Traveller[:\s]*([A-Z\s]{2,})/i
  ],
  fare: [
    /Fare[:\s]*₹?([0-9,]+)/i,
    /Amount[:\s]*₹?([0-9,]+)/i,
    /Total[:\s]*₹?([0-9,]+)/i,
    /Price[:\s]*₹?([0-9,]+)/i
  ],
  bookingDate: [
    /Booking\s*Date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /Date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    /Booked\s*on[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i
  ],
  route: [
    /From[:\s]*([A-Z\s]+)\s*To[:\s]*([A-Z\s]+)/i,
    /([A-Z\s]+)\s*-\s*([A-Z\s]+)/i,
    /Route[:\s]*([A-Z\s]+-[A-Z\s]+)/i
  ],
  trainNumber: [
    /Train[:\s]*(\d{4,5})/i,
    /Train\s*No[:\s]*(\d{4,5})/i
  ],
  flightNumber: [
    /Flight[:\s]*([A-Z0-9]{2,})/i,
    /Flight\s*No[:\s]*([A-Z0-9]{2,})/i
  ]
};

function extractValue(text, patternArray) {
  for (const pattern of patternArray) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function determineTicketType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('train') || lowerText.includes('railway') || lowerText.includes('irctc')) {
    return 'train';
  }
  if (lowerText.includes('flight') || lowerText.includes('airline') || lowerText.includes('airways')) {
    return 'flight';
  }
  if (lowerText.includes('bus') || lowerText.includes('travels')) {
    return 'bus';
  }
  
  return 'train'; // default
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle various date formats
    const cleanDate = dateStr.replace(/[^\d\/\-]/g, '');
    const parts = cleanDate.split(/[-\/]/);
    
    if (parts.length === 3) {
      // Assume DD/MM/YYYY or DD-MM-YYYY
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      if (year.length === 2) {
        year = '20' + year;
      }
      
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Date formatting error:', error);
  }
  
  return null;
}

function extractTicketData(text) {
  const extractedData = {};
  
  // Extract PNR
  const pnr = extractValue(text, patterns.pnr);
  if (pnr) extractedData.pnr = pnr;
  
  // Extract passenger name
  const passengerName = extractValue(text, patterns.passengerName);
  if (passengerName) extractedData.passengerName = passengerName;
  
  // Extract fare
  const fareStr = extractValue(text, patterns.fare);
  if (fareStr) {
    const fare = parseFloat(fareStr.replace(/[,₹]/g, ''));
    if (!isNaN(fare)) extractedData.fare = fare;
  }
  
  // Extract booking date
  const bookingDateStr = extractValue(text, patterns.bookingDate);
  const formattedDate = formatDate(bookingDateStr);
  if (formattedDate) extractedData.bookingDate = formattedDate;
  
  // Extract route
  const routeMatch = extractValue(text, patterns.route);
  if (routeMatch) extractedData.place = routeMatch;
  
  // Determine ticket type
  extractedData.type = determineTicketType(text);
  
  // Extract train/flight number for service field
  let serviceNumber = null;
  if (extractedData.type === 'train') {
    serviceNumber = extractValue(text, patterns.trainNumber);
  } else if (extractedData.type === 'flight') {
    serviceNumber = extractValue(text, patterns.flightNumber);
  }
  
  if (serviceNumber) {
    extractedData.service = serviceNumber;
  }
  
  // Set default values
  extractedData.account = 'Uploaded PDF';
  extractedData.refund = 0;
  extractedData.remarks = 'Auto-extracted from PDF';
  
  return extractedData;
}

export async function parsePdfAndExtractData(buffer) {
    if(!!buffer) {
      return {
        success: false,
        data: {}   ,
        rawText: "No PDF buffer provided"
      };
    }
  try {
    const data = await pdf(buffer);
    const text = data.text;
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in PDF');
    }
    
    const extractedData = extractTicketData(text);
    
    return {
      success: true,
      data: extractedData,
      rawText: text
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
