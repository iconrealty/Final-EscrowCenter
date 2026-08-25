import { ParsedEscrowDoc } from '../services/geminiService';
import { adjustWeekendToMonday, parseAddressComponents } from '../types';
import { addDays, format, parseISO } from 'date-fns';
import { calculateNetFromGross } from './commissionUtils';

let pdfWorkerConfigured = false;

interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  page: number;
}

/**
 * Extracts raw and spatially reconstructed text lines from a PDF file
 */
export async function extractPdfPagesText(file: File): Promise<{
  fullText: string;
  pagesText: string[];
  lines: string[];
}> {
  const pdfjsLib = await import('pdfjs-dist');
  
  if (!pdfWorkerConfigured && typeof window !== 'undefined') {
    try {
      const pdfjsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
      }
    } catch {
      // Fallback
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
      }
    }
    pdfWorkerConfigured = true;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pagesText: string[] = [];
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    
    // Group text items by roughly the same Y coordinate (line reconstruction)
    const items: TextItemWithPos[] = [];
    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.trim()) {
        const transform = (item as any).transform;
        const x = transform ? transform[4] : 0;
        const y = transform ? transform[5] : 0;
        items.push({ str: item.str, x, y, page: pageNum });
      }
    }

    // Sort by Y (descending: top to bottom) then X (ascending: left to right)
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 6) { // on different lines if Y difference > 6pt
        return yDiff;
      }
      return a.x - b.x;
    });

    // Reconstruct lines
    const lineBuckets: string[] = [];
    let currentY: number | null = null;
    let currentLineParts: string[] = [];

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) <= 6) {
        currentLineParts.push(item.str);
        currentY = item.y;
      } else {
        if (currentLineParts.length > 0) {
          lineBuckets.push(currentLineParts.join(' ').trim());
        }
        currentLineParts = [item.str];
        currentY = item.y;
      }
    }
    if (currentLineParts.length > 0) {
      lineBuckets.push(currentLineParts.join(' ').trim());
    }

    const pageStr = lineBuckets.join('\n');
    pagesText.push(pageStr);
    allLines.push(...lineBuckets);
  }

  return {
    fullText: pagesText.join('\n\n--- PAGE BREAK ---\n\n'),
    pagesText,
    lines: allLines,
  };
}

/**
 * Intelligent Client-Side California RPA / MLS Parser (100% Free, Zero AI tokens)
 */
export function parseCaliforniaRpaText(
  fullText: string, 
  pagesText: string[], 
  lines: string[],
  userRole: 'Buyer' | 'Seller' | 'Dual' = 'Buyer'
): ParsedEscrowDoc {
  const result: ParsedEscrowDoc = {
    representation: userRole,
    status: 'Open',
    contingencyDays: {
      L1: 14,
      L2: 17,
      L3: 17,
      L4: 17,
      L5: 7,
      L6: 7,
      L7: 7,
      L8: 7,
      L9: 17,
    },
  };

  const textLower = fullText.toLowerCase();

  // 1. Extract Purchase Price (Paragraph 3A or General Price regex)
  // Look for: "$850,000" or "PURCHASE PRICE: $..." or "3A. PURCHASE PRICE ... $"
  const priceMatches = [
    /3A[.\s]+(?:purchase\s*price|allocation)?[^\$\d]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:purchase\s*price|purchase\s*amount|contract\s*price|sale\s*price)[\s:]*\$?\s*([\d,]{5,}(?:\.\d{2})?)/i,
    /\$\s*([\d,]{6,}(?:\.\d{2})?)/,
  ];

  for (const rx of priceMatches) {
    const m = fullText.match(rx);
    if (m && m[1]) {
      const cleanNum = parseFloat(m[1].replace(/,/g, ''));
      if (cleanNum >= 50000 && cleanNum <= 100000000) {
        result.price = cleanNum;
        break;
      }
    }
  }

  // 2. Extract Close of Escrow (COE) Date or Days (Paragraph 3B)
  // "3B. CLOSE OF ESCROW ... 30 days after acceptance" OR specific date
  const coeDaysMatch = fullText.match(/3B[.\s]+(?:close\s*of\s*escrow)?[^\d]*?(\d{1,3})\s*(?:calendar\s*)?days\s*(?:after\s*acceptance)?/i) ||
    /(?:close\s*of\s*escrow|coe)[^\d]*?(\d{1,3})\s*(?:calendar\s*)?days/i.exec(fullText);

  if (coeDaysMatch && coeDaysMatch[1]) {
    const days = parseInt(coeDaysMatch[1], 10);
    if (days >= 5 && days <= 180) {
      result.coeDays = days;
    }
  }

  const coeDateMatch = fullText.match(/3B[.\s]+(?:close\s*of\s*escrow)?[^\d]*?on\s*([0-1]?\d\/[0-3]?\d\/\d{4})/i) ||
    /(?:close\s*of\s*escrow|coe\s*date)[\s:]*([0-1]?\d\/[0-3]?\d\/\d{4})/i.exec(fullText);

  if (coeDateMatch && coeDateMatch[1]) {
    const [m, d, y] = coeDateMatch[1].split('/');
    result.coeDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // 3. Extract Acceptance Date
  const acceptanceMatches = [
    /(?:acceptance\s*date|date\s*of\s*acceptance|mutual\s*acceptance)[\s:]*([0-1]?\d\/[0-3]?\d\/\d{4})/i,
    /(?:date\s*of\s*acceptance)[\s:]*(\d{4}-\d{2}-\d{2})/i,
    /(?:seller\s*acceptance|buyer\s*acceptance)[^\d]*([0-1]?\d\/[0-3]?\d\/\d{4})/i,
    /date\s*prepared[\s:]*([0-1]?\d\/[0-3]?\d\/\d{4})/i,
  ];

  for (const rx of acceptanceMatches) {
    const m = fullText.match(rx);
    if (m && m[1]) {
      if (m[1].includes('/')) {
        const [mo, da, yr] = m[1].split('/');
        result.acceptanceDate = `${yr}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}`;
      } else {
        result.acceptanceDate = m[1];
      }
      break;
    }
  }

  // Calculate COE date if Acceptance Date + COE Days found
  if (result.acceptanceDate && result.coeDays && !result.coeDate) {
    try {
      const baseDate = parseISO(result.acceptanceDate);
      if (!isNaN(baseDate.getTime())) {
        const target = addDays(baseDate, result.coeDays);
        const adjusted = adjustWeekendToMonday(target);
        result.coeDate = format(adjusted, 'yyyy-MM-dd');
      }
    } catch {}
  }

  // 4. Extract APN (Assessor's Parcel Number)
  const apnMatches = [
    /(?:apn|assessor'?s\s*parcel\s*no\.?|parcel\s*id|apn\s*#)[\s:#]*([0-9A-Za-z\-_]{5,20})/i,
    /parcel\s*number[\s:#]*([0-9A-Za-z\-_]{5,20})/i,
  ];
  for (const rx of apnMatches) {
    const m = fullText.match(rx);
    if (m && m[1]) {
      const cleanApn = m[1].trim();
      if (!cleanApn.toLowerCase().includes('paragraph') && !cleanApn.toLowerCase().includes('form')) {
        result.apn = cleanApn;
        break;
      }
    }
  }

  // 5. Extract Property Address, City, Zip
  // Pattern: "Property Address: 123 Main St, Santa Ana, CA 92703" OR "123 Main St, City, Zip"
  const addressMatch = fullText.match(/(?:property\s*address|address|real\s*property)[\s:]+([0-9]+\s+[A-Za-z0-9\s.,#\-]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|circle|cir|place|pl|trail|trl|loop)[A-Za-z0-9\s.,#\-]*)/i) ||
    /([0-9]{1,5}\s+[A-Za-z0-9\s.,#\-]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|circle|cir|place|pl)[A-Za-z0-9\s.,#\-]*,\s*[A-Za-z\s]+,\s*(?:CA|California)\s*\d{5})/i.exec(fullText);

  if (addressMatch && addressMatch[1]) {
    const rawAddress = addressMatch[1].trim();
    const parts = parseAddressComponents(rawAddress);
    result.address = parts.address;
    if (parts.city) result.city = parts.city;
    if (parts.zipCode) result.zipCode = parts.zipCode;
  } else {
    // Search line by line for an address pattern
    for (const line of lines.slice(0, 40)) {
      if (/^[0-9]{1,5}\s+[A-Za-z0-9\s.,#-]+(?:st|ave|rd|dr|ln|ct|blvd|way|cir|pl)/i.test(line)) {
        const parts = parseAddressComponents(line);
        result.address = parts.address;
        if (parts.city) result.city = parts.city;
        if (parts.zipCode) result.zipCode = parts.zipCode;
        break;
      }
    }
  }

  // If zip code is still missing, find 5 digit California zip
  if (!result.zipCode) {
    const zipM = fullText.match(/\b(9[0-6]\d{3})\b/);
    if (zipM && zipM[1]) {
      result.zipCode = zipM[1];
    }
  }

  // 6. Extract Buyer & Seller Names
  const buyerMatch = fullText.match(/(?:buyer\(?s?\)?|buyer\s*name\(?s?\)?|buyer)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*(?:and|&|,)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+))?/i);
  if (buyerMatch && buyerMatch[1]) {
    const b1 = buyerMatch[1].trim();
    if (!b1.toLowerCase().includes('signature') && !b1.toLowerCase().includes('initial')) {
      result.buyer1Name = b1;
      const b1Parts = b1.split(' ');
      result.clientFirstName = b1Parts[0];
      result.clientLastName = b1Parts.slice(1).join(' ');
    }
    if (buyerMatch[2]) {
      const b2 = buyerMatch[2].trim();
      result.buyer2Name = b2;
      const b2Parts = b2.split(' ');
      result.client2FirstName = b2Parts[0];
      result.client2LastName = b2Parts.slice(1).join(' ');
    }
  }

  const sellerMatch = fullText.match(/(?:seller\(?s?\)?|seller\s*name\(?s?\)?|seller)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*(?:and|&|,)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+))?/i);
  if (sellerMatch && sellerMatch[1]) {
    const s1 = sellerMatch[1].trim();
    if (!s1.toLowerCase().includes('signature') && !s1.toLowerCase().includes('initial')) {
      result.seller1Name = s1;
      if (userRole === 'Seller') {
        const s1Parts = s1.split(' ');
        result.clientFirstName = s1Parts[0];
        result.clientLastName = s1Parts.slice(1).join(' ');
      }
    }
    if (sellerMatch[2]) {
      const s2 = sellerMatch[2].trim();
      result.seller2Name = s2;
      if (userRole === 'Seller') {
        const s2Parts = s2.split(' ');
        result.client2FirstName = s2Parts[0];
        result.client2LastName = s2Parts.slice(1).join(' ');
      }
    }
  }

  // 7. Extract Initial Deposit (EMD) and Loan (Paragraph 3D / 3E)
  const emdMatch = fullText.match(/3D\(1\)[^\$\d]*\$?\s*([\d,]+)/i) ||
    /(?:initial\s*deposit|earnest\s*money|emd)[\s:]*\$?\s*([\d,]+)/i.exec(fullText);
  if (emdMatch && emdMatch[1]) {
    result.initialDeposit = parseFloat(emdMatch[1].replace(/,/g, ''));
  }

  const loanMatch = fullText.match(/3E\(1\)[^\$\d]*\$?\s*([\d,]+)/i) ||
    /(?:first\s*loan|loan\s*amount)[\s:]*\$?\s*([\d,]+)/i.exec(fullText);
  if (loanMatch && loanMatch[1]) {
    result.loanAmount = parseFloat(loanMatch[1].replace(/,/g, ''));
  }

  // 8. Extract Contingencies (Paragraph 3L Grid)
  const l1Match = fullText.match(/3L\(1\)[^\d]*(\d{1,2})\s*days/i) || /loan\s*contingency[^\d]*(\d{1,2})\s*days/i.exec(fullText);
  if (l1Match && l1Match[1]) {
    result.contingencyDays!.L1 = parseInt(l1Match[1], 10);
  }

  const l2Match = fullText.match(/3L\(2\)[^\d]*(\d{1,2})\s*days/i) || /appraisal\s*contingency[^\d]*(\d{1,2})\s*days/i.exec(fullText);
  if (l2Match && l2Match[1]) {
    result.contingencyDays!.L2 = parseInt(l2Match[1], 10);
  }

  const l3Match = fullText.match(/3L\(3\)[^\d]*(\d{1,2})\s*days/i) || /(?:investigation\s*of\s*property|inspection)[^\d]*(\d{1,2})\s*days/i.exec(fullText);
  if (l3Match && l3Match[1]) {
    result.contingencyDays!.L3 = parseInt(l3Match[1], 10);
  }

  // 9. Extract Real Estate Broker & Escrow Holder Information
  const brokerPage = pagesText.slice(-3).join('\n'); // Search last 3 pages

  const escrowCoMatch = brokerPage.match(/(?:escrow\s*holder|escrow\s*company)[\s:]+([A-Za-z0-9\s.,&]+?(?:escrow|title|settlement)[A-Za-z0-9\s.,&]*)/i) ||
    fullText.match(/([A-Za-z0-9\s.,&]+?(?:escrow|title|settlement)\s*(?:services|inc|corp|company)?)/i);
  if (escrowCoMatch && escrowCoMatch[1]) {
    const escName = escrowCoMatch[1].trim();
    if (escName.length > 3 && escName.length < 50) {
      result.escrowCompany = escName;
    }
  }

  const escrowOfficerMatch = brokerPage.match(/(?:escrow\s*officer|officer)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  if (escrowOfficerMatch && escrowOfficerMatch[1]) {
    result.escrowOfficer = escrowOfficerMatch[1].trim();
  }

  const escrowNumMatch = fullText.match(/(?:escrow\s*#|escrow\s*number|file\s*#)[\s:]*([A-Za-z0-9\-_]{4,20})/i);
  if (escrowNumMatch && escrowNumMatch[1]) {
    result.escrowNumber = escrowNumMatch[1].trim();
  }

  // Buyer Agent / Listing Agent details
  const buyerAgentMatch = brokerPage.match(/(?:buyer'?s\s*agent|buyer'?s\s*brokerage)[\s:]+([A-Za-z0-9\s.,&]+)/i);
  if (buyerAgentMatch && buyerAgentMatch[1]) {
    result.buyerBrokerage = buyerAgentMatch[1].trim();
  }

  const listingAgentMatch = brokerPage.match(/(?:listing\s*agent|listing\s*brokerage)[\s:]+([A-Za-z0-9\s.,&]+)/i);
  if (listingAgentMatch && listingAgentMatch[1]) {
    result.listingBrokerage = listingAgentMatch[1].trim();
  }

  // Extract phone & email in broker section
  const emailMatch = brokerPage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && emailMatch[1]) {
    if (userRole === 'Seller') {
      result.agentEmail = emailMatch[1];
    } else {
      result.listingAgentEmail = emailMatch[1];
    }
  }

  const phoneMatch = brokerPage.match(/(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  if (phoneMatch && phoneMatch[0]) {
    if (userRole === 'Seller') {
      result.agentPhone = phoneMatch[0];
    } else {
      result.listingAgentPhone = phoneMatch[0];
    }
  }

  // 10. Commissions (Default 2.5% or extracted)
  result.commissionPercent = 2.5;
  const bacMatch = fullText.match(/(?:bac|commission|compensation)[\s:]*(\d(?:\.\d{1,2})?)\s*%/i);
  if (bacMatch && bacMatch[1]) {
    result.commissionPercent = parseFloat(bacMatch[1]);
  }

  if (result.price && result.commissionPercent) {
    const gross = Math.round(result.price * (result.commissionPercent / 100));
    result.netCommission = calculateNetFromGross(gross, result.leadSource || 'Zillow');
  }

  return result;
}
