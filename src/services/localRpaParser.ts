/**
 * Client-Side California Real Estate RPA & MLS Document Parser
 * Parses California Residential Purchase Agreements (C.A.R. Form RPA), Addenda, and MLS sheets
 * completely offline/locally without requiring ANY external API keys or server setup.
 */

export interface ParsedEscrowDoc {
  escrowNumber?: string;
  apn?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientBirthday?: string;
  client2FirstName?: string;
  client2LastName?: string;
  client2Phone?: string;
  client2Email?: string;
  seller1Name?: string;
  seller2Name?: string;
  buyer1Name?: string;
  buyer2Name?: string;
  collaborator?: string;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  cooperatingBrokerage?: string;
  listingAgentName?: string;
  listingAgentPhone?: string;
  listingAgentEmail?: string;
  listingBrokerage?: string;
  buyerAgentName?: string;
  buyerAgentPhone?: string;
  buyerAgentEmail?: string;
  buyerBrokerage?: string;
  lenderName?: string;
  lenderPhone?: string;
  lenderEmail?: string;
  loanType?: string;
  loanAmount?: number;
  initialDeposit?: number;
  escrowCompany?: string;
  escrowOfficer?: string;
  escrowPhone?: string;
  escrowEmail?: string;
  titleCompany?: string;
  titleOfficer?: string;
  titlePhone?: string;
  titleEmail?: string;
  price?: number;
  commissionPercent?: number;
  netCommission?: number;
  acceptanceDate?: string;
  coeDate?: string;
  coeDays?: number;
  contingencyStartDate?: string;
  loanContingencyDays?: number;
  appraisalContingencyDays?: number;
  inspectionContingencyDays?: number;
  sellerDisclosureDays?: number;
  titleReportDays?: number;
  hoaDocDays?: number;
  insuranceDays?: number;
  leasedItemsDays?: number;
  copDays?: number;
  representation?: 'Buyer' | 'Seller' | 'Dual';
  leadSource?: string;
  status?: string;
  notes?: string;
}

/**
 * Extracts raw ASCII & UTF-8 text streams from a PDF binary base64 string
 */
export function extractTextFromPdfBase64(base64Data: string): string {
  try {
    let clean = base64Data;
    if (clean.includes(',')) {
      clean = clean.split(',')[1];
    }
    clean = clean.replace(/\s/g, '');
    
    // Decode base64 to binary string
    const binary = atob(clean);
    
    // Extract text in PDF text blocks (Tj, TJ, text streams)
    const textPieces: string[] = [];
    
    // 1. Look for Tj operators: (text) Tj
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(binary)) !== null) {
      if (match[1]) textPieces.push(match[1]);
    }
    
    // 2. Look for TJ arrays: [(text) 12 (more)] TJ
    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/gi;
    while ((match = tjArrayRegex.exec(binary)) !== null) {
      const inner = match[1];
      const innerTjRegex = /\(([^)]+)\)/g;
      let innerMatch;
      while ((innerMatch = innerTjRegex.exec(inner)) !== null) {
        if (innerMatch[1]) textPieces.push(innerMatch[1]);
      }
    }
    
    // 3. Fallback: extract plain readable ASCII sequences (words > 2 chars)
    if (textPieces.length < 10) {
      const asciiRegex = /[A-Za-z0-9\s,.\-/$#@:;%&]{4,}/g;
      let asciiMatch;
      while ((asciiMatch = asciiRegex.exec(binary)) !== null) {
        textPieces.push(asciiMatch[0]);
      }
    }
    
    return textPieces.join(' ');
  } catch (e) {
    console.warn('PDF binary text extraction fallback:', e);
    return '';
  }
}

/**
 * Robust Regex and Pattern Parser for California RPA contracts
 */
export function parseRpaText(rawText: string, fileName?: string): ParsedEscrowDoc {
  const result: ParsedEscrowDoc = {
    representation: 'Buyer',
    leadSource: 'Zillow',
    status: 'Active',
    loanContingencyDays: 14,
    appraisalContingencyDays: 17,
    inspectionContingencyDays: 17,
    sellerDisclosureDays: 7,
    titleReportDays: 7,
    hoaDocDays: 7,
    insuranceDays: 17,
    leasedItemsDays: 7,
    coeDays: 30,
    commissionPercent: 2.5,
  };

  const text = rawText || '';

  // 1. Escrow Number
  const escrowNumMatch = text.match(/(?:Escrow|File|Order|Ref)\s*(?:#|No\.?|Number)?\s*[:.\-]?\s*([A-Za-z0-9\-]{4,18})/i)
    || text.match(/([0-9]{4,10}-[0-9]{1,6})/);
  if (escrowNumMatch && escrowNumMatch[1]) {
    result.escrowNumber = escrowNumMatch[1].trim();
  }

  // 2. APN (Assessor's Parcel Number)
  const apnMatch = text.match(/(?:APN|Parcel\s*(?:#|ID|No\.?|Number)?)\s*[:.\-]?\s*([0-9A-Za-z\-]{7,16})/i);
  if (apnMatch && apnMatch[1]) {
    result.apn = apnMatch[1].trim();
  }

  // 3. Purchase Price (e.g. $850,000 or 3A ... $1,250,000)
  const priceMatch = text.match(/(?:Purchase\s*Price|Price|3A\.?|Total\s*Price)\s*[:.\-]?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)/i)
    || text.match(/\$\s*([0-9]{1,3}(?:,[0-9]{3}){1,2})/);
  if (priceMatch && priceMatch[1]) {
    const cleanPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (cleanPrice > 10000) {
      result.price = cleanPrice;
      result.netCommission = Math.round(cleanPrice * 0.025);
    }
  }

  // 4. Initial Deposit (EMD)
  const emdMatch = text.match(/(?:Initial\s*Deposit|EMD|Earnest\s*Money|3D\(1\))\s*[:.\-]?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)/i);
  if (emdMatch && emdMatch[1]) {
    result.initialDeposit = parseFloat(emdMatch[1].replace(/,/g, ''));
  }

  // 5. Loan Amount
  const loanMatch = text.match(/(?:Loan\s*Amount|First\s*Loan|3E\(1\)|New\s*First\s*Loan)\s*[:.\-]?\s*\$?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)/i);
  if (loanMatch && loanMatch[1]) {
    result.loanAmount = parseFloat(loanMatch[1].replace(/,/g, ''));
  }

  // 6. Dates: Acceptance & COE Date
  const dateRegex = /\b(202[4-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01]))\b/g;
  const standardDateRegex = /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](202[4-9]|2[4-9])\b/g;
  
  const foundDates: string[] = [];
  let dMatch;
  while ((dMatch = dateRegex.exec(text)) !== null) {
    foundDates.push(dMatch[1]);
  }
  while ((dMatch = standardDateRegex.exec(text)) !== null) {
    const month = dMatch[1].padStart(2, '0');
    const day = dMatch[2].padStart(2, '0');
    let year = dMatch[3];
    if (year.length === 2) year = '20' + year;
    foundDates.push(`${year}-${month}-${day}`);
  }

  // Acceptance Date match
  const acceptMatch = text.match(/(?:Acceptance\s*Date|Date\s*of\s*Acceptance|Mutual\s*Acceptance)\s*[:.\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|202[4-9]-[0-9]{2}-[0-9]{2})/i);
  if (acceptMatch && acceptMatch[1]) {
    const rawD = acceptMatch[1];
    if (rawD.includes('/')) {
      const [m, d, y] = rawD.split('/');
      result.acceptanceDate = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      result.acceptanceDate = rawD;
    }
  } else if (foundDates.length > 0) {
    result.acceptanceDate = foundDates[0];
  } else {
    // Default to today
    const now = new Date();
    result.acceptanceDate = now.toISOString().split('T')[0];
  }

  // COE Date match
  const coeMatch = text.match(/(?:Close\s*of\s*Escrow|COE\s*Date|3B\.?|Closing\s*Date)\s*[:.\-]?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|202[4-9]-[0-9]{2}-[0-9]{2})/i);
  if (coeMatch && coeMatch[1]) {
    const rawD = coeMatch[1];
    if (rawD.includes('/')) {
      const [m, d, y] = rawD.split('/');
      result.coeDate = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      result.coeDate = rawD;
    }
  } else if (foundDates.length > 1) {
    result.coeDate = foundDates[foundDates.length - 1];
  } else if (result.acceptanceDate) {
    // Default 30 days out from acceptance
    const acceptD = new Date(result.acceptanceDate);
    if (!isNaN(acceptD.getTime())) {
      acceptD.setDate(acceptD.getDate() + 30);
      result.coeDate = acceptD.toISOString().split('T')[0];
    }
  }

  // 7. Contingency Days
  const loanDaysMatch = text.match(/(?:Loan\s*Contingency|3L\(1\))\s*[:.\-]?\s*([0-9]{1,2})\s*days/i);
  if (loanDaysMatch) result.loanContingencyDays = parseInt(loanDaysMatch[1], 10);

  const appraisalDaysMatch = text.match(/(?:Appraisal\s*Contingency|3L\(2\))\s*[:.\-]?\s*([0-9]{1,2})\s*days/i);
  if (appraisalDaysMatch) result.appraisalContingencyDays = parseInt(appraisalDaysMatch[1], 10);

  const inspDaysMatch = text.match(/(?:Investigation|Inspection|Physical\s*Inspection|3L\(3\))\s*[:.\-]?\s*([0-9]{1,2})\s*days/i);
  if (inspDaysMatch) result.inspectionContingencyDays = parseInt(inspDaysMatch[1], 10);

  // 8. Property Address
  const addressMatch = text.match(/(?:Property\s*Address|Address|Property|Premises)\s*[:.\-]?\s*([0-9]{1,6}\s+[A-Za-z0-9\s.,#\-]+?(?:Street|St|Avenue|Ave|Drive|Dr|Road|Rd|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Terrace|Ter|Parkway|Pkwy))/i)
    || text.match(/([0-9]{2,6}\s+[A-Z][a-zA-Z0-9\s.,#\-]{3,35}(?:St|Ave|Dr|Rd|Blvd|Ln|Way|Ct|Cir|Pl|Ter)\b)/);
  if (addressMatch && addressMatch[1]) {
    result.address = addressMatch[1].trim().replace(/,\s*$/, '');
  }

  // City & Zip Code
  const cityZipMatch = text.match(/(?:City|Location)\s*[:.\-]?\s*([A-Za-z\s]{3,25}),?\s*(?:CA|California)?\s*([0-9]{5})/i)
    || text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*(?:CA|California)\s*([0-9]{5})/);
  if (cityZipMatch) {
    if (cityZipMatch[1]) result.city = cityZipMatch[1].trim();
    if (cityZipMatch[2]) result.zipCode = cityZipMatch[2].trim();
  }

  // 9. Buyer & Seller Names
  const buyerMatch = text.match(/(?:Buyer|Buyer\(s\)|1A\.?|Client)\s*[:.\-]?\s*([A-Z][a-zA-Z\s.,&]+?)(?:\s*(?:and|&)\s*([A-Z][a-zA-Z\s.,]+))?(?=\s*(?:Seller|Broker|Agent|\(Buyer|Property|$))/i);
  if (buyerMatch && buyerMatch[1]) {
    const rawBuyer1 = buyerMatch[1].replace(/,\s*$/, '').trim();
    const parts = rawBuyer1.split(/\s+/);
    if (parts.length >= 2) {
      result.clientFirstName = parts[0];
      result.clientLastName = parts.slice(1).join(' ');
      result.buyer1Name = rawBuyer1;
    } else if (parts.length === 1 && parts[0].length > 1) {
      result.clientFirstName = parts[0];
      result.buyer1Name = parts[0];
    }
    if (buyerMatch[2]) {
      const rawBuyer2 = buyerMatch[2].replace(/,\s*$/, '').trim();
      const parts2 = rawBuyer2.split(/\s+/);
      if (parts2.length >= 2) {
        result.client2FirstName = parts2[0];
        result.client2LastName = parts2.slice(1).join(' ');
        result.buyer2Name = rawBuyer2;
      }
    }
  }

  const sellerMatch = text.match(/(?:Seller|Seller\(s\)|1B\.?)\s*[:.\-]?\s*([A-Z][a-zA-Z\s.,&]+?)(?:\s*(?:and|&)\s*([A-Z][a-zA-Z\s.,]+))?(?=\s*(?:Buyer|Broker|Agent|\(Seller|Property|$))/i);
  if (sellerMatch && sellerMatch[1]) {
    result.seller1Name = sellerMatch[1].replace(/,\s*$/, '').trim();
    if (sellerMatch[2]) {
      result.seller2Name = sellerMatch[2].replace(/,\s*$/, '').trim();
    }
  }

  // 10. Escrow Company & Escrow Officer
  const escrowCompanyMatch = text.match(/(?:Escrow\s*Company|Escrow\s*Holder|Escrow)\s*[:.\-]?\s*([A-Za-z0-9\s.,&]{4,35}(?:Escrow|Title|Services))/i);
  if (escrowCompanyMatch && escrowCompanyMatch[1]) {
    result.escrowCompany = escrowCompanyMatch[1].trim();
  }

  const escrowOfficerMatch = text.match(/(?:Escrow\s*Officer|Officer|Contact)\s*[:.\-]?\s*([A-Z][a-zA-Z\s]{3,25})/i);
  if (escrowOfficerMatch && escrowOfficerMatch[1]) {
    result.escrowOfficer = escrowOfficerMatch[1].trim();
  }

  // 11. Emails & Phone Numbers
  const emailRegex = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  const foundEmails: string[] = [];
  let eMatch;
  while ((eMatch = emailRegex.exec(text)) !== null) {
    if (!foundEmails.includes(eMatch[1])) {
      foundEmails.push(eMatch[1]);
    }
  }

  const phoneRegex = /(?:\+?1\s*[-.]?)?\(?([0-9]{3})\)?[-.\s]*([0-9]{3})[-.\s]*([0-9]{4})/g;
  const foundPhones: string[] = [];
  let pMatch;
  while ((pMatch = phoneRegex.exec(text)) !== null) {
    const formatted = `(${pMatch[1]}) ${pMatch[2]}-${pMatch[3]}`;
    if (!foundPhones.includes(formatted)) {
      foundPhones.push(formatted);
    }
  }

  // Assign emails and phones smartly
  if (foundEmails.length > 0) result.clientEmail = foundEmails[0];
  if (foundEmails.length > 1) result.agentEmail = foundEmails[1];
  if (foundEmails.length > 2) result.escrowEmail = foundEmails[2];

  if (foundPhones.length > 0) result.clientPhone = foundPhones[0];
  if (foundPhones.length > 1) result.agentPhone = foundPhones[1];
  if (foundPhones.length > 2) result.escrowPhone = foundPhones[2];

  // 12. Fallback filename analysis if fields missing
  if (fileName && (!result.address || result.address.length < 3)) {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');
    const addressInFileName = nameWithoutExt.match(/([0-9]{2,6}\s+[A-Za-z0-9\s]+)/);
    if (addressInFileName) {
      result.address = addressInFileName[1].trim();
    }
  }

  return result;
}
