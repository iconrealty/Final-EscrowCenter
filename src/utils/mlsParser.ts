import { parseAddressComponents } from '../types';
import { getCityFromZip } from './californiaZipDb';

export interface ParsedMlsData {
  address?: string;
  city?: string;
  zipCode?: string;
  apn?: string;
  price?: number;
  commissionPercent?: number;
  agentName?: string;
  agentPhone?: string;
  agentEmail?: string;
  cooperatingBrokerage?: string;
  notes?: string;
}

/**
 * Strips boundary keywords and noise from raw agent name candidate
 */
function cleanAgentName(raw: string): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim();
  
  // Cut off everything after any boundary keyword
  const cutoffRegexes = [
    /\bLA\s*STATE/i,
    /\bLA\s*LIC/i,
    /\bSTATE\s*LIC/i,
    /\bCalDRE/i,
    /\bDRE\b/i,
    /\bLIC\s*#/i,
    /\bLIC\b/i,
    /\bCoLA\b/i,
    /\bLO\s*:/i,
    /\bLO\b/i,
    /\bCoLO\b/i,
    /\b1\.\s*LA/i,
    /\b2\.\s*LA/i,
    /\bCELL\b/i,
    /\bPHONE\b/i,
    /\bEMAIL\b/i,
    /\bFAX\b/i,
    /\bOFFERS\b/i,
    /\bExt\b/i,
  ];

  for (const rx of cutoffRegexes) {
    const idx = s.search(rx);
    if (idx > 0) {
      s = s.substring(0, idx).trim();
    }
  }

  // Remove any surrounding punctuation or trailing symbols
  s = s.replace(/^[\s,.:;()\-]+/, '').replace(/[\s,.:;()\-]+$/, '').trim();

  // Validate length and eliminate non-names
  if (s.length >= 3 && !/^(la|cola|lo|colo|dre|state|lic|phone|cell|email|fax|none|pending|active|n\/a|primary|agent)$/i.test(s)) {
    return s;
  }
  return undefined;
}

/**
 * Strips boundary keywords and noise from raw brokerage name candidate
 */
function cleanBrokerageName(raw: string): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim();

  const cutoffRegexes = [
    /\bLO\s*STATE/i,
    /\bLO\s*PHONE/i,
    /\bLO\s*FAX/i,
    /\bSTATE\s*LIC/i,
    /\bCalDRE/i,
    /\bDRE\b/i,
    /\bLIC\s*#/i,
    /\bLIC\b/i,
    /\bCoLO\b/i,
    /\bCoLA\b/i,
    /\b1\.\s*LA/i,
    /\b2\.\s*LA/i,
    /\bLA\s*CELL/i,
    /\bLA\s*EMAIL/i,
    /\bCELL\b/i,
    /\bPHONE\b/i,
    /\bEMAIL\b/i,
    /\bFAX\b/i,
    /\bOFFERS\b/i,
    /\bExt\b/i,
  ];

  for (const rx of cutoffRegexes) {
    const idx = s.search(rx);
    if (idx > 0) {
      s = s.substring(0, idx).trim();
    }
  }

  s = s.replace(/^[\s,.:;()\-]+/, '').replace(/[\s,.:;()\-]+$/, '').trim();

  if (s.length >= 3 && !/^(lo|colo|la|cola|dre|state|lic|phone|cell|email|fax|none|pending|active|n\/a|brokerage|office)$/i.test(s)) {
    return s;
  }
  return undefined;
}

/**
 * 100% Client-Side MLS Sheet & CRMLS Matrix Parser
 * Zero external servers, zero API keys, zero token consumption.
 * Specially tuned for CRMLS Matrix "360 Property View", Agent Detail, and CAR Coversheets.
 */
export function parseMlsText(rawText: string): ParsedMlsData {
  const result: ParsedMlsData = {};
  if (!rawText || !rawText.trim()) return result;

  // Clean raw text and create normalized representations
  const text = rawText.replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const flatText = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');

  // ==========================================
  // 1. APN / PARCEL #
  // ==========================================
  // CRMLS Matrix: "PARCEL #: 89223024" or "APN: 123-456-78"
  const parcelMatch = text.match(/(?:PARCEL\s*#|PARCEL\s*ID|PARCEL\s*NUMBER|APN\s*#|APN)[\s:#=-]*([0-9A-Za-z\-_/]{4,28})/i) ||
    flatText.match(/(?:PARCEL\s*#|PARCEL\s*ID|APN)[\s:#=-]*([0-9A-Za-z\-_/]{4,28})/i);
  if (parcelMatch && parcelMatch[1]) {
    const candidate = parcelMatch[1].trim();
    if (!/^(page|form|paragraph|ca|true|false|none|n\/a|pending)$/i.test(candidate)) {
      result.apn = candidate;
    }
  }

  // ==========================================
  // 2. LIST PRICE / PRICE
  // ==========================================
  const priceMatches = [
    /(?:LIST\s*PRICE|LP\b|SALE\s*PRICE|PURCHASE\s*PRICE|CONTRACT\s*PRICE)[\s:#$]*([\d,]{5,}(?:\.\d{2})?)/i,
    /\bLIST\s*PRICE[\s:#$]*([\d,]+)/i,
    /\$\s*([\d,]{5,}(?:\.\d{2})?)/,
  ];
  for (const rx of priceMatches) {
    const m = text.match(rx) || flatText.match(rx);
    if (m && m[1]) {
      const num = parseFloat(m[1].replace(/,/g, ''));
      if (num >= 40000 && num <= 150000000) {
        result.price = num;
        break;
      }
    }
  }

  // ==========================================
  // 3. PROPERTY ADDRESS, CITY, ZIP
  // ==========================================
  // Match standard address with city, state, zip
  const fullAddressMatch = text.match(/(?:Cross\s*Property\s*|360\s*Property\s*View\s*|Property\s*View\s*)?([0-9]{1,6}\s+[A-Za-z0-9\s.,#\-_/]+?),\s*([A-Za-z\s.'-]+?),\s*CA\s*([0-9]{5})/i) ||
    flatText.match(/(?:Cross\s*Property\s*|360\s*Property\s*View\s*|Property\s*View\s*)?([0-9]{1,6}\s+[A-Za-z0-9\s.,#\-_/]+?),\s*([A-Za-z\s.'-]+?),\s*CA\s*([0-9]{5})/i) ||
    text.match(/([0-9]{1,6}\s+[A-Za-z0-9\s.,#\-_/]+?),\s*([A-Za-z\s.'-]+?)\s+([0-9]{5})/i);

  if (fullAddressMatch) {
    result.address = fullAddressMatch[1].trim();
    result.city = fullAddressMatch[2].trim();
    result.zipCode = fullAddressMatch[3].trim();
  }

  // Fallback line search
  if (!result.address) {
    for (const line of lines.slice(0, 15)) {
      if (/^[0-9]{1,6}\s+[A-Za-z0-9\s.,#\-_/]+/i.test(line) && !/^(cross|property|listing|status|bed|sqft|parcel|price|rec|status)/i.test(line)) {
        const parsed = parseAddressComponents(line);
        if (parsed.address) {
          result.address = parsed.address;
          if (!result.city && parsed.city) result.city = parsed.city;
          if (!result.zipCode && parsed.zipCode) result.zipCode = parsed.zipCode;
          break;
        }
      }
    }
  }

  // Zip Code fallback
  if (!result.zipCode) {
    const zipMatch = text.match(/\b(9[0-6]\d{3})\b/);
    if (zipMatch && zipMatch[1]) {
      result.zipCode = zipMatch[1];
    }
  }

  // City lookup fallback from California Zip DB
  if (!result.city && result.zipCode) {
    const cityFromZip = getCityFromZip(result.zipCode);
    if (cityFromZip) {
      result.city = cityFromZip;
    }
  }

  // CLEANUP: Ensure address contains ONLY street number, street name, and unit
  if (result.address) {
    let s = result.address;
    // Strip header prefixes like "Cross Property", "360 Property View", etc.
    s = s.replace(/^(?:Cross\s*Property\s*)?(?:360\s*Property\s*View\s*|Property\s*View\s*|Listing\s*|Detail\s*Report\s*)+/i, '');
    s = s.replace(/^(?:Cross\s*Property|360\s*Property|Property\s*View)/i, '');
    s = s.replace(/^[\s,.-]+/, '');
    
    // Strip city from the end
    if (result.city) {
      const cityRegex = new RegExp(`[,\\s]+${result.city.trim()}\\b.*$`, 'i');
      s = s.replace(cityRegex, '');
    }
    // Strip state & zip from the end
    s = s.replace(/[,\\s]+(?:CA|California)?\s*[0-9]{5}(?:-[0-9]{4})?\s*$/i, '');
    s = s.replace(/[,\\s]+(?:CA|California)\s*$/i, '');
    result.address = s.trim().replace(/,\s*$/, '');
  }

  // ==========================================
  // 4. LISTING AGENT (LA) -> Other Agent Name
  // ==========================================
  // Handles:
  // "LA: (PFELDDAV) David Feldberg"
  // "LA:(PFELDDAV) David Feldberg LA STATE LIC: 01378475"
  // "LA: David Feldberg"
  // "List Agent: David Feldberg"

  // Strategy 1: Line-by-line inspection
  for (const line of lines) {
    // Match line starting with or containing LA:
    const m = line.match(/(?:^|\b)LA\s*:\s*(?:\([^\)]+\)\s*|\[[^\]]+\]\s*)?([A-Za-z][A-Za-z\s.'-]{2,50})/i);
    if (m && m[1]) {
      const cleaned = cleanAgentName(m[1]);
      if (cleaned) {
        result.agentName = cleaned;
        break;
      }
    }
  }

  // Strategy 2: Flat text search if not found in lines
  if (!result.agentName) {
    const flatLaMatches = [
      /(?:^|\s)LA\s*:\s*(?:\([^\)]+\)\s*|\[[^\]]+\]\s*)?([A-Za-z][A-Za-z\s.'-]{2,50})/i,
      /(?:List\s*Agent|Listing\s*Agent|LA\s*Name)[\s:#]+(?:\([^\)]+\)\s*)?([A-Za-z][A-Za-z\s.'-]{2,50})/i,
    ];
    for (const rx of flatLaMatches) {
      const m = flatText.match(rx);
      if (m && m[1]) {
        const cleaned = cleanAgentName(m[1]);
        if (cleaned) {
          result.agentName = cleaned;
          break;
        }
      }
    }
  }

  // ==========================================
  // 5. LISTING OFFICE / BROKERAGE (LO) -> Cooperating Brokerage
  // ==========================================
  // Handles:
  // "LO: (PB8701) Coastal Real Estate Group"
  // "LO:(PB8701) Coastal Real Estate Group LO STATE LIC: 01907983"
  // "LO: Coastal Real Estate Group"
  // "List Office: Coastal Real Estate Group"

  // Strategy 1: Line-by-line inspection
  for (const line of lines) {
    const m = line.match(/(?:^|\b)LO\s*:\s*(?:\([^\)]+\)\s*|\[[^\]]+\]\s*)?([A-Za-z0-9][A-Za-z0-9\s.,&'-]{2,60})/i);
    if (m && m[1]) {
      const cleaned = cleanBrokerageName(m[1]);
      if (cleaned) {
        result.cooperatingBrokerage = cleaned;
        break;
      }
    }
  }

  // Strategy 2: Flat text search if not found in lines
  if (!result.cooperatingBrokerage) {
    const flatLoMatches = [
      /(?:^|\s)LO\s*:\s*(?:\([^\)]+\)\s*|\[[^\]]+\]\s*)?([A-Za-z0-9][A-Za-z0-9\s.,&'-]{2,60})/i,
      /(?:List\s*Office|Listing\s*Office|Brokerage)[\s:#]+(?:\([^\)]+\)\s*)?([A-Za-z0-9][A-Za-z0-9\s.,&'-]{2,60})/i,
    ];
    for (const rx of flatLoMatches) {
      const m = flatText.match(rx);
      if (m && m[1]) {
        const cleaned = cleanBrokerageName(m[1]);
        if (cleaned) {
          result.cooperatingBrokerage = cleaned;
          break;
        }
      }
    }
  }

  // ==========================================
  // 6. LISTING AGENT CELL / PHONE (LA CELL)
  // ==========================================
  // CRMLS Matrix: "1.LA CELL: 949 439-6288" or "LA CELL: 949-439-6288" or "LO PHONE: 949-371-8006"
  const cellMatch = text.match(/(?:\d+\.)?\s*LA\s*CELL[\s:#]*([0-9\s().-]{10,20})/i) ||
    flatText.match(/(?:\d+\.)?\s*LA\s*CELL[\s:#]*([0-9\s().-]{10,20})/i) ||
    text.match(/(?:Agent\s*Cell|Agent\s*Phone|LA\s*Phone|Cell\s*Phone|Mobile)[\s:#]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i) ||
    flatText.match(/LO\s*PHONE[\s:#]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i);

  if (cellMatch && cellMatch[1]) {
    result.agentPhone = cellMatch[1].trim();
  }

  // ==========================================
  // 7. LISTING AGENT EMAIL (LA EMAIL)
  // ==========================================
  // CRMLS Matrix: "2.LA EMAIL: david@coastalgroupoc.com" or "OFFERS EMAIL: david@coastalgroupoc.com"
  const emailMatch = text.match(/(?:\d+\.)?\s*(?:LA\s*EMAIL|OFFERS\s*EMAIL|Agent\s*Email|Listing\s*Agent\s*Email)[\s:#]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
    flatText.match(/(?:\d+\.)?\s*(?:LA\s*EMAIL|OFFERS\s*EMAIL|Agent\s*Email)[\s:#]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
    text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);

  if (emailMatch && emailMatch[1]) {
    result.agentEmail = emailMatch[1].trim();
  }

  // ==========================================
  // 8. BUYER AGENT COMMISSION (BAC)
  // ==========================================
  const bacMatch = text.match(/(?:BAC|B\.A\.\s*COMPENSATION|Buyer\s*Agent\s*Comp)[\s:#=]*(\d(?:\.\d{1,2})?)\s*%/i) ||
    flatText.match(/(?:BAC|B\.A\.\s*COMPENSATION)[\s:#=]*(\d(?:\.\d{1,2})?)\s*%/i);
  if (bacMatch && bacMatch[1]) {
    const rate = parseFloat(bacMatch[1]);
    if (rate > 0 && rate <= 10) {
      result.commissionPercent = rate;
    }
  }

  return result;
}
