/**
 * Smart Signature & Contact Block Parser
 * Extracts Contact Name, Company/Brokerage, Phone, and Email from raw pasted email signatures,
 * business cards, or contact text blocks.
 */

export interface ParsedContact {
  name: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email: string;
  raw: string;
}

export type ContactRole = 'client' | 'agent' | 'lender' | 'escrow' | 'title' | 'general';

// Helper to format 10-digit US phone numbers nicely
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone.trim();
}

// Strip licensing, honorifics, and titles from a name line
function cleanNameString(rawName: string): string {
  let name = rawName.trim();
  
  // Remove "Name:", "Contact:", "Agent:", "Officer:", "Borrower:" prefix
  name = name.replace(/^(?:name|contact|agent|officer|lender|escrow officer|title officer|buyer|seller|borrower|client)\s*[:\-–]\s*/i, '');
  
  // Remove DRE, CalDRE, NMLS license numbers
  name = name.replace(/[,|\s\-(]*(?:CalDRE|DRE|BRE|NMLS|LIC|License|Lic#|NMLS#|NMLS ID|ID)?\s*#?\s*\d{5,10}\)?/gi, '');
  
  // Remove professional suffixes/titles
  name = name.replace(/[,|\s\-(]*(?:REALTOR®?|Realtor|Broker Associate|Broker|Agent|Sales Associate|Loan Officer|Senior Loan Officer|Mortgage Banker|Branch Manager|Escrow Officer|Senior Escrow Officer|Title Officer|Account Executive|Vice President|VP|SVP|EVP|Senior VP|President|CEO|Founder|Principal|MBA|GRI|CRS|ABR|SRES|e-PRO|Notary Public|Notary)\b/gi, '');
  
  // Clean up trailing/leading punctuation or extra whitespace
  name = name.replace(/^[\s,·|•\-_/\\:]+|[\s,·|•\-_/\\:]+$/g, '').trim();
  
  // Remove multiple internal spaces
  name = name.replace(/\s+/g, ' ');

  return name;
}

// Split full name into first and last name safely
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = cleanNameString(fullName);
  if (!cleaned) return { firstName: '', lastName: '' };

  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

export function parseContactSignature(rawText: string, role: ContactRole = 'general'): ParsedContact {
  const result: ParsedContact = {
    name: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: '',
    email: '',
    raw: rawText
  };

  if (!rawText || !rawText.trim()) return result;

  const text = rawText.trim();

  // 1. EXTRACT EMAIL
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    result.email = emailMatch[1].trim();
  }

  // 2. EXTRACT PHONE
  // Check for lines with explicit phone labels first (Cell, Direct, Mobile, Phone, Tel)
  const phoneLabelRegex = /(?:cell|mobile|direct|tel|phone|c|m|d|p|office|work|o)\s*[:\-–\.]\s*(\+?1?[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/i;
  const labeledPhoneMatch = text.match(phoneLabelRegex);
  if (labeledPhoneMatch) {
    result.phone = formatPhoneNumber(labeledPhoneMatch[1]);
  } else {
    // General phone match
    const generalPhoneMatch = text.match(/(\+?1?[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/);
    if (generalPhoneMatch) {
      result.phone = formatPhoneNumber(generalPhoneMatch[1]);
    }
  }

  // 3. BREAK INTO LINES FOR NAME & COMPANY EXTRACTION
  const rawLines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // If pasted as a single line with comma or pipe separators, split by separator
  let lines = rawLines;
  if (lines.length === 1 && (lines[0].includes('|') || lines[0].includes(' • ') || lines[0].includes(' - ') || lines[0].includes(','))) {
    const splitTokens = lines[0].split(/[|•]|(?:\s+-\s+)/).map(s => s.trim()).filter(Boolean);
    if (splitTokens.length > 1) {
      lines = splitTokens;
    }
  }

  // Keywords to detect companies based on role
  const escrowCompanyKeywords = /escrow|settlement|closing|pacific horizon|first american|chicago title|lawyers title|oakwood|heritage|wfg|glen oaks|corinthian/i;
  const titleCompanyKeywords = /title|first american|fidelity|chicago title|lawyers title|old republic|stewart|wfg|ticor|commonwealth/i;
  const lenderCompanyKeywords = /mortgage|lending|loans|bank|home loans|credit union|financial|funding|crosscountry|cross country|chase|wells fargo|bank of america|guaranteed rate|fairway|movement|guild|us bank|rocket|loandepot|citi|pnc|zillow home/i;
  const agentCompanyKeywords = /realty|real estate|brokerage|properties|compass|keller williams|coldwell|exp realty|exp|re\/max|remax|berkshire|sotheby|redfin|century 21|agency|first team|douglas elliman|corcoran|opendoor|homesmart|kw\b/i;
  const generalCompanyKeywords = /inc\.?|llc|corp\.?|corporation|group|company|co\.|team|partners|associates|holdings/i;

  let candidateName = '';
  let candidateCompany = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line has explicit labeled fields
    const nameLabelMatch = line.match(/^(?:name|contact|agent|officer|borrower|client|buyer|seller)\s*[:\-–]\s*(.+)$/i);
    if (nameLabelMatch && !candidateName) {
      candidateName = cleanNameString(nameLabelMatch[1]);
      continue;
    }

    const companyLabelMatch = line.match(/^(?:company|brokerage|broker|lender|escrow company|title company|bank|firm|agency)\s*[:\-–]\s*(.+)$/i);
    if (companyLabelMatch && !candidateCompany) {
      candidateCompany = companyLabelMatch[1].trim().replace(/^[\s,·|•\-_/\\:]+|[\s,·|•\-_/\\:]+$/g, '');
      continue;
    }

    // Skip lines that are just emails or URLs
    if (line.includes('@') && line.length < 50 && !line.includes(' ')) {
      continue;
    }
    if (/^(?:https?:\/\/|www\.)/i.test(line) || /^[\w-]+\.(?:com|org|net|io|co)\b/i.test(line)) {
      continue;
    }

    // Skip lines that are purely phone numbers or fax
    if (/^(?:fax|tel|phone|cell|mobile|direct|p|c|m|d|o)?[:\s\-.]*\+?1?[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}$/i.test(line)) {
      continue;
    }

    // Skip street addresses (e.g. 123 Main St, Suite 400, Irvine, CA 92618)
    if (/\b\d{1,5}\s+[A-Za-z0-9\s.,]+(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|lane|ln|way|pkwy|parkway|ste|suite|floor|fl|bldg|building|#\d+)\b/i.test(line)) {
      continue;
    }
    if (/\b[A-Za-z\s]+,\s*(?:CA|California|[A-Z]{2})\s+\d{5}\b/i.test(line)) {
      continue;
    }

    // Check if this line looks like a Company name
    let isCompanyLine = false;
    if (role === 'escrow' && escrowCompanyKeywords.test(line)) isCompanyLine = true;
    else if (role === 'title' && titleCompanyKeywords.test(line)) isCompanyLine = true;
    else if (role === 'lender' && lenderCompanyKeywords.test(line)) isCompanyLine = true;
    else if (role === 'agent' && agentCompanyKeywords.test(line)) isCompanyLine = true;
    else if (
      escrowCompanyKeywords.test(line) ||
      titleCompanyKeywords.test(line) ||
      lenderCompanyKeywords.test(line) ||
      agentCompanyKeywords.test(line) ||
      generalCompanyKeywords.test(line)
    ) {
      isCompanyLine = true;
    }

    if (isCompanyLine && !candidateCompany) {
      // Clean company line
      candidateCompany = line.replace(/[,|\s\-(]*(?:DRE|NMLS|LIC)\s*#?\s*\d+\)?/gi, '').trim();
      continue;
    }

    // Otherwise, if we don't have a name yet, check if this line looks like a Person Name
    if (!candidateName) {
      // Check if line contains a name + title/role (e.g. "Jane Doe | Senior Escrow Officer" or "John Doe, Realtor")
      let cleaned = cleanNameString(line);
      // Ensure the cleaned string is reasonable length for a name (2 to 45 chars, 1 to 5 words)
      const wordCount = cleaned.split(' ').filter(Boolean).length;
      if (cleaned.length >= 2 && cleaned.length <= 50 && wordCount >= 1 && wordCount <= 5 && !/\d/.test(cleaned)) {
        candidateName = cleaned;
      }
    }
  }

  // Fallback: If no candidate name was picked, check line 0
  if (!candidateName && lines.length > 0) {
    const firstLineClean = cleanNameString(lines[0]);
    if (firstLineClean && !firstLineClean.includes('@') && !/\d{5}/.test(firstLineClean)) {
      candidateName = firstLineClean;
    }
  }

  // Set name and first/last name
  if (candidateName) {
    result.name = candidateName;
    const split = splitFullName(candidateName);
    result.firstName = split.firstName;
    result.lastName = split.lastName;
  }

  if (candidateCompany) {
    result.company = candidateCompany;
  }

  return result;
}
