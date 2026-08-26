import { Escrow, ALL_TASKS, parseAddressComponents } from '../types.ts';

export const CSV_HEADERS = [
  'Escrow #',
  'MLS ID',
  'APN',
  'Status',
  'Representation',
  'Lead Source',
  'Address',
  'City',
  'Zip Code',
  'Client Name',
  'Client First Name',
  'Client Last Name',
  'Client Phone',
  'Client Email',
  'Client Birthday',
  'Client 2 First Name',
  'Client 2 Last Name',
  'Client 2 Phone',
  'Client 2 Email',
  'Client 2 Birthday',
  'Agent Name',
  'Agent Email',
  'Agent Phone',
  'Co-Agent Name',
  'Co-Agent Email',
  'Co-Agent Phone',
  'Cooperating Brokerage',
  'Lender Name',
  'Lender Email',
  'Lender Phone',
  'Escrow Company',
  'Escrow Officer Name',
  'Escrow Officer Email',
  'Escrow Officer Phone',
  'Title Company',
  'Title Officer Name',
  'Title Officer Email',
  'Title Officer Phone',
  'Acceptance Date',
  'Contingency Start Date',
  'Close of Escrow',
  'Sale Price',
  'Commission Percent',
  'Net Commission',
  'Contingency Days',
  'Completed Tasks',
  'Notes',
  'Last Updated'
];

export function parseDateToIso(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  let trimmed = dateStr.trim();
  
  // Ignore placeholder/empty date tokens
  const lower = trimmed.toLowerCase();
  if (lower === 'none' || lower === '--' || lower === 'n/a' || lower === 'tbd' || lower === 'null' || lower === 'undefined') {
    return '';
  }

  // Strip time components like " 00:00:00" or " 12:00:00 AM" or "T00:00:00.000Z"
  if (trimmed.includes(' ')) {
    trimmed = trimmed.split(' ')[0];
  }
  if (trimmed.includes('T')) {
    trimmed = trimmed.split('T')[0];
  }

  // If YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If MM/DD/YYYY or MM-DD-YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  // If MM/DD/YY or MM-DD-YY (2-digit year)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    let rawYr = parseInt(parts[2], 10);
    const year = rawYr >= 70 ? `19${parts[2]}` : `20${parts[2].padStart(2, '0')}`;
    return `${year}-${month}-${day}`;
  }

  // If YY-MM-DD or YY/MM/DD (2-digit year first)
  if (/^\d{2}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    let rawYr = parseInt(parts[0], 10);
    const year = rawYr >= 70 ? `19${parts[0]}` : `20${parts[0].padStart(2, '0')}`;
    const month = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard JS parsing as fallback
  try {
    const d = new Date(dateStr.trim());
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}
  return '';
}

/**
 * Extracts the 4-digit year for an escrow record.
 * Uses Acceptance Date first, then Close of Escrow (COE) Date.
 */
export function getEscrowYear(escrow: Partial<Escrow>): string {
  const dateStr = (escrow.acceptanceDate || escrow.coeDate || '').trim();
  if (!dateStr) return '';
  if (/^\d{4}/.test(dateStr)) return dateStr.substring(0, 4);
  const match = dateStr.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
  if (match) return match[1];
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed.getFullYear().toString();
  return '';
}

export function generateCsvTemplate(): string {
  const exampleRows = [
    [
      '"98453-PC"', // Escrow #
      '"DW26038810"', // MLS ID
      '"123-456-78"', // APN
      '"Closed"', // Status
      '"Buyer"', // Representation
      '"Zillow"', // Lead Source
      '"1206 Louise St"', // Address
      '"Santa Ana"', // City
      '"92703"', // Zip Code
      '"Patrick Curley"', // Client Name
      '"Patrick"', // Client First Name
      '"Curley"', // Client Last Name
      '"(714) 555-0101"', // Client Phone
      '"pcurley@example.com"', // Client Email
      '""', // Client Birthday
      '""', // Client 2 First Name
      '""', // Client 2 Last Name
      '""', // Client 2 Phone
      '""', // Client 2 Email
      '""', // Client 2 Birthday
      '"Paul Muner"', // Agent Name
      '"paul@example.com"', // Agent Email
      '"(949) 555-0199"', // Agent Phone
      '""', // Co-Agent Name
      '""', // Co-Agent Email
      '""', // Co-Agent Phone
      '"Icon Realty Partners"', // Cooperating Brokerage
      '"CMG Financial"', // Lender Name
      '"lender@cmg.com"', // Lender Email
      '"(949) 555-0188"', // Lender Phone
      '"Escrow Logix, Inc."', // Escrow Company
      '"Sarah Jenkins"', // Escrow Officer Name
      '"sarah@escrowlogix.com"', // Escrow Officer Email
      '"(714) 555-0144"', // Escrow Officer Phone
      '"First American Title"', // Title Company
      '"Jane Doe"', // Title Officer Name
      '"jdoe@firstam.com"', // Title Officer Email
      '"714-555-0199"', // Title Officer Phone
      '"05/05/2026"', // Acceptance Date
      '"05/05/2026"', // Contingency Start Date
      '"06/05/2026"', // Close of Escrow
      '"$840,000.00"', // Sale Price
      '"3.0"', // Commission Percent
      '"$25,200.00"', // Net Commission
      '"L1: 14, L2: 10, L3: 7, L4: 7, L5: 7, L6: 7, L7: 7, L8: 7"', // Contingency Days
      '"Deposit, Disclosures, Inspection"', // Completed Tasks
      '"Notes for Escrow Logix"', // Notes
      '"2026-05-05T12:00:00.000Z"' // Last Updated
    ]
  ];
  return CSV_HEADERS.join(',') + '\n' + exampleRows.map(row => row.join(',')).join('\n') + '\n';
}

export function downloadCsvTemplate() {
  const blob = new Blob([generateCsvTemplate()], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'escrow_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function downloadEscrowsCsv(escrows: Escrow[]) {
  if (!escrows || escrows.length === 0) {
    return;
  }

  // Header row
  const csvRows = [CSV_HEADERS.join(',')];

  // Map each escrow to CSV columns matching CSV_HEADERS
  escrows.forEach(e => {
    const clientName = `${e.clientFirstName || ''} ${e.clientLastName || ''}`.trim();
    
    // Format contingency days into readable string
    let contingencyDaysStr = '';
    if (e.contingencyDays && typeof e.contingencyDays === 'object') {
      contingencyDaysStr = Object.entries(e.contingencyDays)
        .map(([k, v]) => `${k}: ${v}d`)
        .join(', ');
    }

    // Format completed tasks into readable string
    let completedTasksStr = '';
    if (e.tasks && typeof e.tasks === 'object') {
      const completedList = Object.entries(e.tasks)
        .filter(([_, done]) => Boolean(done))
        .map(([taskKey]) => {
          const taskDef = ALL_TASKS.find(t => t.key === taskKey);
          return taskDef ? taskDef.label : taskKey;
        });
      completedTasksStr = completedList.join('; ');
    }

    // Format the values to escape commas and quotes
    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""'); // escape double quotes
      return `"${str}"`;
    };

    const row = [
      escapeCsv(e.escrowNumber || ''),
      escapeCsv(e.mlsId || ''),
      escapeCsv(e.apn || ''),
      escapeCsv(e.status || 'Open'),
      escapeCsv(e.representation || ''),
      escapeCsv(e.leadSource || 'Zillow'),
      escapeCsv(e.address || ''),
      escapeCsv(e.city || ''),
      escapeCsv(e.zipCode || ''),
      escapeCsv(clientName),
      escapeCsv(e.clientFirstName || ''),
      escapeCsv(e.clientLastName || ''),
      escapeCsv(e.clientPhone || ''),
      escapeCsv(e.clientEmail || ''),
      escapeCsv(e.clientBirthday || ''),
      escapeCsv(e.client2FirstName || ''),
      escapeCsv(e.client2LastName || ''),
      escapeCsv(e.client2Phone || ''),
      escapeCsv(e.client2Email || ''),
      escapeCsv(e.client2Birthday || ''),
      escapeCsv(e.agentName || ''),
      escapeCsv(e.agentEmail || ''),
      escapeCsv(e.agentPhone || ''),
      escapeCsv(e.collaborator || ''), // Co-Agent Name
      escapeCsv(''), // Co-Agent Email
      escapeCsv(''), // Co-Agent Phone
      escapeCsv(e.cooperatingBrokerage || ''),
      escapeCsv(e.lenderName || ''),
      escapeCsv(e.lenderEmail || ''),
      escapeCsv(e.lenderPhone || ''),
      escapeCsv(e.escrowCompany || ''),
      escapeCsv(e.escrowOfficer || ''),
      escapeCsv(e.escrowEmail || ''), // Escrow Officer Email
      escapeCsv(e.escrowPhone || ''), // Escrow Officer Phone
      escapeCsv(e.titleCompany || ''),
      escapeCsv(e.titleOfficer || ''),
      escapeCsv(e.titleEmail || ''),
      escapeCsv(e.titlePhone || ''),
      escapeCsv(e.acceptanceDate || ''),
      escapeCsv(e.contingencyStartDate || ''),
      escapeCsv(e.coeDate || ''),
      escapeCsv(e.price ? `$${e.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'),
      escapeCsv(e.commissionPercent !== undefined ? e.commissionPercent : ''),
      escapeCsv(e.netCommission ? `$${e.netCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'),
      escapeCsv(contingencyDaysStr),
      escapeCsv(completedTasksStr),
      escapeCsv(e.notes || ''),
      escapeCsv(e.lastUpdated || '')
    ];

    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'escrows_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function parseCsvData(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;
  
  // Strip UTF-8 Byte Order Mark (BOM) if present
  let cleanCsv = csvText;
  if (cleanCsv.startsWith('\ufeff')) {
    cleanCsv = cleanCsv.slice(1);
  }
  // Replace non-breaking spaces and special unicode spaces
  cleanCsv = cleanCsv.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, ' ');

  for (let i = 0; i < cleanCsv.length; i++) {
    const char = cleanCsv[i];
    const nextChar = cleanCsv[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(v => /[a-zA-Z0-9]/.test(v))) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  currentRow.push(currentVal.trim());
  if (currentRow.some(v => /[a-zA-Z0-9]/.test(v))) {
    rows.push(currentRow);
  }
  
  return rows;
}

export function parseCsv(csvText: string): Partial<Escrow>[] {
  const rows = parseCsvData(csvText);
  if (rows.length <= 1) return []; // Only headers or empty

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const cleanAlpha = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanHeaders = headers.map(h => cleanAlpha(h));
  const results: Partial<Escrow>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    
    const getVal = (possibleKeys: string[], excludeSubstrings: string[] = []) => {
      const normKeys = possibleKeys.map(k => k.trim().toLowerCase());
      const cleanKeys = normKeys.map(k => cleanAlpha(k)).filter(Boolean);

      // 1. Direct exact match
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        const cH = cleanHeaders[j];
        if (!h) continue;

        if (excludeSubstrings.some(ex => h.includes(ex) || cH.includes(cleanAlpha(ex)))) {
          continue;
        }

        if (normKeys.includes(h) || cleanKeys.includes(cH)) {
          if (values[j] !== undefined && values[j].trim() !== '') {
            return values[j].trim();
          }
        }
      }

      // 2. Controlled substring match: only when header starts with or contains the specific phrase
      for (let j = 0; j < headers.length; j++) {
        const h = headers[j];
        const cH = cleanHeaders[j];
        if (!h) continue;

        if (excludeSubstrings.some(ex => h.includes(ex) || cH.includes(cleanAlpha(ex)))) {
          continue;
        }

        for (const pk of normKeys) {
          if (pk.length >= 4 && (h === pk || h.startsWith(pk) || h.endsWith(pk))) {
            if (values[j] !== undefined && values[j].trim() !== '') {
              return values[j].trim();
            }
          }
        }
      }

      return '';
    };

    // Skip invalid / footer summary lines from Sisu or other CSV exports
    const firstCell = (values[0] || '').trim().toLowerCase();
    if (
      firstCell.startsWith('below are transactions') ||
      firstCell.startsWith('total split') ||
      firstCell.startsWith('total raw') ||
      firstCell.startsWith('total rentals') ||
      firstCell.startsWith('total volume') ||
      firstCell.startsWith('---')
    ) {
      continue;
    }

    // Standardize status mapping
    const rawStatus = getVal(['status', 'transaction status', 'escrow status', 'stage', 'state', 'deal status']);
    let parsedStatus: 'Open' | 'Closed' | 'Cancelled' = 'Open';
    if (rawStatus.toLowerCase().includes('closed') || rawStatus.toLowerCase().includes('close')) {
      parsedStatus = 'Closed';
    } else if (rawStatus.toLowerCase().includes('cancel')) {
      parsedStatus = 'Cancelled';
    } else {
      parsedStatus = 'Open';
    }
    
    // Address, City, Zip
    let address = getVal(['address', 'street address', 'street', 'property address', 'property', 'location', 'address line 1', 'line 1', 'address line']);
    let city = getVal(['city', 'property city', 'town', 'municipality']);
    let zipCode = getVal(['zip code', 'zip', 'postal code', 'zipcode', 'property zip', 'property zip code', 'postal']);

    // Clean non-breaking spaces
    address = address ? address.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ').trim() : '';
    city = city ? city.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ').trim() : '';
    zipCode = zipCode ? zipCode.replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000\ufeff]/g, ' ').trim() : '';

    if (address && address !== 'TBD') {
      const parsedAddr = parseAddressComponents(address);
      if (!city && parsedAddr.city) city = parsedAddr.city;
      if (!zipCode && parsedAddr.zipCode) zipCode = parsedAddr.zipCode;
      if (parsedAddr.address && (city || zipCode || parsedAddr.city || parsedAddr.zipCode)) {
        address = parsedAddr.address;
      }
    }

    if (!address) {
      const hasAnyField = values.some(val => val.trim().length > 0);
      if (!hasAnyField) continue;
      address = 'TBD';
    }

    // Client 1 Name (EXCLUDE headers with '2', 'second', '2nd', 'co-')
    const excludeClient2 = ['2 client', 'client 2', 'client2', 'second contact', 'second client', '2nd client', '2nd contact', 'buyer 2', 'seller 2', 'co-buyer', 'co-seller', 'co-agent'];
    const rawClientFirstName = getVal(['client first name', 'first name', 'buyer first name', 'seller first name', 'client 1 first name', 'buyer 1 first name', 'seller 1 first name', 'primary contact first name'], excludeClient2);
    const rawClientLastName = getVal(['client last name', 'last name', 'buyer last name', 'seller last name', 'client 1 last name', 'buyer 1 last name', 'seller 1 last name', 'primary contact last name'], excludeClient2);
    const legacyClientName = getVal(['client name', 'client', 'buyer name', 'seller name', 'contact name', 'primary contact', 'client 1', 'buyer 1', 'seller 1'], excludeClient2);
    
    let clientFirstName = rawClientFirstName;
    let clientLastName = rawClientLastName;
    
    if (!clientFirstName && !clientLastName && legacyClientName) {
      const parts = legacyClientName.trim().split(/\s+/);
      clientFirstName = parts[0] || '';
      clientLastName = parts.slice(1).join(' ') || '';
    }

    // Client 2 Name (MUST match 2 / second / co-buyer headers)
    const rawClient2Name = getVal(['2 client name', 'second client name', 'client 2 name', 'client2 name', 'client 2', 'client2', 'second contact name', 'second contact', 'co-buyer', 'co-seller', 'buyer 2', 'seller 2', 'buyer 2 name', 'seller 2 name', '2nd client', '2nd contact']);
    let client2FirstName = getVal(['client 2 first name', 'client2 first name', '2 client first name', 'second contact first name', 'buyer 2 first name', 'seller 2 first name', '2nd client first name']);
    let client2LastName = getVal(['client 2 last name', 'client2 last name', '2 client last name', 'second contact last name', 'buyer 2 last name', 'seller 2 last name', '2nd client last name']);

    if (!client2FirstName && !client2LastName && rawClient2Name) {
      const p2 = rawClient2Name.trim().split(/\s+/);
      client2FirstName = p2[0] || '';
      client2LastName = p2.slice(1).join(' ') || '';
    }

    const client2Phone = getVal(['second contact phone', '2 client phone', 'client 2 phone', 'client2 phone', 'second phone', 'buyer 2 phone', 'seller 2 phone', '2nd contact phone', '2nd client phone']);
    const client2Email = getVal(['2 client email', 'client 2 email', 'client2 email', 'second contact email', 'second email', 'buyer 2 email', 'seller 2 email', '2nd contact email', '2nd client email']);
    const client2Birthday = parseDateToIso(getVal(['client 2 birthday', 'client 2 birthdate', 'client 2 dob', 'client2 birthday', 'client2 birthdate', 'client2 dob', '2 client birthday', 'second contact birthday']));

    // Check if Client 2 is identical to Client 1 (avoid false duplication)
    if (client2FirstName && client2FirstName.toLowerCase() === clientFirstName.toLowerCase() &&
        client2LastName && client2LastName.toLowerCase() === clientLastName.toLowerCase()) {
      client2FirstName = '';
      client2LastName = '';
    }

    const clientPhone = getVal(['client phone', 'phone', 'contact phone', 'client cell', 'mobile phone number', 'mobile', 'cell', 'primary phone'], excludeClient2);
    const clientEmail = getVal(['client email', 'contact email', 'email', 'primary email', 'buyer email', 'seller email'], excludeClient2);
    const clientBirthday = parseDateToIso(getVal(['client birthday', 'client birthdate', 'birthday', 'dob', 'client dob', 'birth date'], excludeClient2));

    const escrowCompany = getVal(['escrow company', 'escrow_company', 'escrowcompany', 'escrow']);
    let notes = getVal(['notes', 'description', 'comments', 'memo']);
    if (escrowCompany && !notes?.includes(escrowCompany)) {
      const prefix = `Escrow Company: ${escrowCompany}`;
      notes = notes ? `${prefix}\n\n${notes}` : prefix;
    }

    // Capture additional Sisu fields into notes if present
    const sisuExtraFields = [
      { label: 'Lead Source', keys: ['lead source', 'source'] },
      { label: 'Financing Type', keys: ['financing type'] },
      { label: 'NHD Company', keys: ['nhd company select', 'nhd company'] },
      { label: 'Home Inspection Company', keys: ['home inspection company'] },
      { label: 'Home Warranty Company', keys: ['home warranty company'] },
      { label: 'Home Warranty Amount', keys: ['home warranty amount'] },
      { label: 'Property Type', keys: ['property type'] },
      { label: 'Earnest Money Amount', keys: ['earnest money amount'] },
      { label: 'Appt Set By (ISA)', keys: ['appt set by (isa)'] },
      { label: 'Appraisal CR Due Date', keys: ['appraisal cr due date'] },
      { label: 'Loan CR Due Date', keys: ['loan cr due date'] },
      { label: 'Inspection CR Due Date', keys: ['inspection cr due date'] },
      { label: 'Possession Date', keys: ['possession date'] },
    ];
    for (const item of sisuExtraFields) {
      const val = getVal(item.keys);
      if (val && val !== 'None' && val !== '--' && val !== '0' && val !== '$0' && val !== '$0.00') {
        const itemLine = `${item.label}: ${val}`;
        if (!notes.includes(item.label)) {
          notes = notes ? `${notes}\n${itemLine}` : itemLine;
        }
      }
    }

    // Dates parsing
    const rawAcceptance = getVal(['acceptance date', 'acceptance', 'under contract date', 'contract date', 'accepted date', 'signed date']);
    const rawContingencyStart = getVal(['contingency start date', 'contingency start', 'contingency_start_date']);
    const rawCoe = getVal(['closed of escrow', 'close of escrow', 'closed date', 'close date', 'closed (settlement) date', 'coe', 'coe date', 'forecasted closed date', 'closing date', 'settlement date', 'closing', 'target close']);
    const cooperatingBrokerage = getVal(['cooperating brokerage', 'cooperating_brokerage', 'co-brokerage', 'other agent brokerage', 'other brokerage', 'agent brokerage', 'selling brokerage', 'listing brokerage']);

    // Representation / Transaction Type mapping
    const rawRep = getVal(['representation', 'rep', 'transaction type', 'trans type', 'type', 'side', 'role']);
    let representation: 'Buyer' | 'Seller' | 'Dual' | undefined = undefined;
    if (rawRep.toLowerCase().includes('buyer')) representation = 'Buyer';
    else if (rawRep.toLowerCase().includes('seller')) representation = 'Seller';
    else if (rawRep.toLowerCase().includes('dual')) representation = 'Dual';

    // Lead Source mapping
    const rawSource = getVal(['lead source', 'source', 'lead_source', 'lead type']);
    let leadSource: 'Zillow' | 'Self' | 'Team Lead' | 'Opcity' | 'Other' = 'Zillow';
    if (rawSource.toLowerCase().includes('zillow')) leadSource = 'Zillow';
    else if (rawSource.toLowerCase().includes('self') || rawSource.toLowerCase().includes('soi') || rawSource.toLowerCase().includes('referral') || rawSource.toLowerCase().includes('past client')) leadSource = 'Self';
    else if (rawSource.toLowerCase().includes('team')) leadSource = 'Team Lead';
    else if (rawSource.toLowerCase().includes('opcity')) leadSource = 'Opcity';
    else if (rawSource) leadSource = 'Other';

    // Price
    const rawPrice = getVal(['sale price', 'price', 'purchase price', 'amount', 'transaction amount']);
    const price = Number(String(rawPrice || '').replace(/[^0-9.]/g, '')) || 0;

    // Net Commission & Gross Commission
    const rawNetComm = getVal(['net commission', 'net gci', 'net income', 'agent net', 'net', 'gross agent(s) paid income']);
    const rawGrossComm = getVal(['gross commission', 'gci', 'gross gci', 'gross commission amount', 'total commission']);
    let netCommission = 0;
    if (rawNetComm) {
      netCommission = Number(String(rawNetComm).replace(/[^0-9.]/g, '')) || 0;
    } else if (rawGrossComm) {
      netCommission = Number(String(rawGrossComm).replace(/[^0-9.]/g, '')) || 0;
    } else {
      const genericComm = getVal(['commission']);
      if (genericComm) {
        netCommission = Number(String(genericComm).replace(/[^0-9.]/g, '')) || 0;
      }
    }

    // Commission Percent
    const rawCommPercent = getVal(['commission percent', 'commission %', 'commission_percent', 'comm %', 'comm percent', 'commission rate', 'commission percentage', 'comm rate']);
    let commissionPercent: number | undefined = undefined;
    if (rawCommPercent) {
      const num = Number(String(rawCommPercent).replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        commissionPercent = num <= 0.2 ? num * 100 : num;
      }
    } else if (price > 0 && netCommission > 0) {
      // Calculate derived commission percentage if not provided directly
      const derived = Math.round((netCommission / price) * 1000) / 10;
      if (derived >= 0.5 && derived <= 15) {
        commissionPercent = derived;
      }
    }

    // MLS ID
    const mlsId = getVal(['mls id', 'mls #', 'mls number', 'mlsno', 'mls_id', 'listing id', 'listing #', 'listing number', 'mls']);

    // Dates parsing (Crucial: User requires Acceptance Date or Close of Escrow Date)
    const parsedAcceptanceDate = (rawAcceptance && parseDateToIso(rawAcceptance)) || '';
    const parsedContingencyStartDate = (rawContingencyStart && parseDateToIso(rawContingencyStart)) || parsedAcceptanceDate || '';
    const parsedCoeDate = (rawCoe && parseDateToIso(rawCoe)) || '';

    // Requirement: If there is neither an Acceptance Date NOR a Close of Escrow Date, do not import this line to prevent garbage imports.
    if (!parsedAcceptanceDate && !parsedCoeDate) {
      continue;
    }

    // Map fields
    const escrow: Partial<Escrow> = {
      escrowNumber: getVal(['escrow #', 'escrow number', 'escrow no', 'escrowno', 'escrow_no', 'escrow_number', 'id', 'deal id', 'sisu id', 'file #', 'file number', 'transaction id']),
      mlsId: mlsId || undefined,
      apn: getVal(['apn', 'apn #', 'parcel', 'parcel id', 'parcel number', 'apn number', 'assessor parcel number']),
      escrowCompany: escrowCompany || '',
      address,
      city,
      zipCode,
      clientFirstName,
      clientLastName,
      clientPhone,
      clientEmail,
      clientBirthday,
      client2FirstName,
      client2LastName,
      client2Phone,
      client2Email,
      client2Birthday,
      agentName: getVal(['agent name', 'agent', 'primary agent']),
      agentEmail: getVal(['agent email', 'agent_email']),
      agentPhone: getVal(['agent phone', 'agent_phone']),
      cooperatingBrokerage,
      lenderName: getVal(['lender', 'lender name', 'mortgage company', 'mortgage', 'loan officer', 'lender company']),
      lenderPhone: getVal(['lender phone', 'lender phone number', 'mortgage phone']),
      lenderEmail: getVal(['lender email', 'mortgage email']),
      escrowOfficer: getVal(['escrow officer name', 'escrow officer', 'officer', 'escrow contact']),
      escrowPhone: getVal(['escrow officer phone', 'escrow phone', 'escrow contact phone']),
      escrowEmail: getVal(['escrow officer email', 'escrow email', 'escrow contact email']),
      titleCompany: getVal(['title company', 'title_company', 'titlecompany', 'title']),
      titleOfficer: getVal(['title officer name', 'title officer', 'title contact', 'title person', 'title name', 'title rep', 'title representative']),
      titlePhone: getVal(['title officer phone', 'title phone', 'title contact phone', 'title person phone']),
      titleEmail: getVal(['title officer email', 'title email', 'title contact email', 'title person email']),
      collaborator: getVal(['co-agent name', 'co-agent', 'collaborator']),
      price,
      commissionPercent,
      netCommission,
      acceptanceDate: parsedAcceptanceDate,
      contingencyStartDate: parsedContingencyStartDate,
      coeDate: parsedCoeDate,
      status: parsedStatus,
      representation,
      leadSource,
      notes
    };
    
    results.push(escrow);
  }

  return results;
}

export function parseSisuText(text: string): Partial<Escrow> | null {
  if (!text || !text.trim()) return null;

  const lines = text.split(/\r?\n/);
  const data: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.substring(0, colonIndex).trim().toLowerCase();
    const val = line.substring(colonIndex + 1).trim();
    if (key) {
      data[key] = val;
    }
  }

  // Check if we have at least some parsed attributes
  if (Object.keys(data).length < 2) {
    return null;
  }

  const getVal = (possibleKeys: string[]) => {
    for (const pk of possibleKeys) {
      const normalizedPk = pk.toLowerCase();
      if (data[normalizedPk] !== undefined) {
        return data[normalizedPk];
      }
    }
    return '';
  };

  // Status mapping
  const rawStatus = getVal(['status', 'transaction status']);
  let parsedStatus: 'Open' | 'Closed' | 'Cancelled' = 'Open';
  if (rawStatus.toLowerCase().includes('closed')) {
    parsedStatus = 'Closed';
  } else if (rawStatus.toLowerCase().includes('cancel')) {
    parsedStatus = 'Cancelled';
  } else {
    parsedStatus = 'Open';
  }

  // Address, City, Zip
  let address = getVal(['address line 1', 'street address', 'address', 'property address', 'property location', 'address line 2']);
  let city = getVal(['city', 'property city', 'town']);
  let zipCode = getVal(['zip', 'zip code', 'postal code', 'property zip']);

  if ((!city || !zipCode) && address && address !== 'TBD') {
    const parsedAddr = parseAddressComponents(address);
    if (!city && parsedAddr.city) city = parsedAddr.city;
    if (!zipCode && parsedAddr.zipCode) zipCode = parsedAddr.zipCode;
    if (parsedAddr.address && (parsedAddr.city || parsedAddr.zipCode)) {
      address = parsedAddr.address;
    }
  }

  if (!address) {
    address = 'TBD';
  }

  // Client 1 Name
  let clientFirstName = getVal(['first name', 'client first name', 'buyer first name', 'seller first name']);
  let clientLastName = getVal(['last name', 'client last name', 'buyer last name', 'seller last name']);
  const clientName = getVal(['client name', 'client', 'buyer name', 'seller name']);
  if (!clientFirstName && !clientLastName && clientName) {
    const parts = clientName.trim().split(/\s+/);
    clientFirstName = parts[0] || '';
    clientLastName = parts.slice(1).join(' ') || '';
  }

  // Client 2 Name
  const rawClient2Name = getVal(['2 client name', 'second client name', 'client 2 name', 'client2 name', 'client 2', 'client2', 'second contact name', 'second contact', 'co-buyer', 'co-seller', 'buyer 2', 'seller 2', 'buyer 2 name', 'seller 2 name']);
  let client2FirstName = getVal(['client 2 first name', 'client2 first name', '2 client first name', 'second contact first name', 'buyer 2 first name', 'seller 2 first name']);
  let client2LastName = getVal(['client 2 last name', 'client2 last name', '2 client last name', 'second contact last name', 'buyer 2 last name', 'seller 2 last name']);

  if (!client2FirstName && !client2LastName && rawClient2Name) {
    const p2 = rawClient2Name.trim().split(/\s+/);
    client2FirstName = p2[0] || '';
    client2LastName = p2.slice(1).join(' ') || '';
  }

  // Check if Client 2 is identical to Client 1 (avoid false duplication)
  if (client2FirstName && client2FirstName.toLowerCase() === clientFirstName.toLowerCase() &&
      client2LastName && client2LastName.toLowerCase() === clientLastName.toLowerCase()) {
    client2FirstName = '';
    client2LastName = '';
  }

  const client2Phone = getVal(['second contact phone', '2 client phone', 'client 2 phone', 'client2 phone', 'buyer 2 phone', 'seller 2 phone']);
  const client2Email = getVal(['2 client email', 'client 2 email', 'client2 email', 'second contact email', 'buyer 2 email', 'seller 2 email']);

  // Agent Name
  let agentName = getVal(['agent', 'agent name', 'primary agent']);
  if (agentName.includes(',')) {
    const parts = agentName.split(',').map(p => p.trim());
    if (parts.length === 2) {
      agentName = `${parts[1]} ${parts[0]}`;
    }
  }

  // Dates
  const rawAcceptance = getVal(['under contract date', 'signed date', 'acceptance date', 'acceptance']);
  const rawCoe = getVal(['closed (settlement) date', 'closed date', 'closed of escrow', 'forecasted closed date', 'close of escrow', 'coe']);

  const acceptanceDate = rawAcceptance && rawAcceptance.toLowerCase() !== 'none' && rawAcceptance.toLowerCase() !== '--'
    ? parseDateToIso(rawAcceptance) 
    : '';
    
  const coeDate = rawCoe && rawCoe.toLowerCase() !== 'none' && rawCoe.toLowerCase() !== '--'
    ? parseDateToIso(rawCoe) 
    : '';

  // Requirement: Do not parse text blocks that lack both acceptance and closing dates
  if (!acceptanceDate && !coeDate) {
    return null;
  }

  // Price
  const rawPrice = getVal(['transaction amount', 'sale price', 'price', 'amount', 'purchase price']);
  const price = Number(String(rawPrice || '').replace(/[^0-9.]/g, '')) || 0;

  // GCI / Net Commission
  const rawGCI = getVal(['gci', 'net commission', 'commission', 'gross agent(s) paid income']);
  const netCommission = Number(String(rawGCI || '').replace(/[^0-9.]/g, '')) || 0;

  const rawCommPercent = getVal(['commission percent', 'commission %', 'commission_percent']);
  let commissionPercent: number | undefined = undefined;
  if (rawCommPercent) {
    const num = Number(String(rawCommPercent).replace(/[^0-9.]/g, ''));
    if (!isNaN(num) && num > 0) {
      commissionPercent = num <= 0.2 ? num * 100 : num;
    }
  } else if (price > 0 && netCommission > 0) {
    const derived = Math.round((netCommission / price) * 1000) / 10;
    if (derived >= 0.5 && derived <= 15) {
      commissionPercent = derived;
    }
  }

  // Representation / Transaction Type mapping
  const rawRep = getVal(['representation', 'rep', 'transaction type', 'trans type', 'type', 'side']);
  let representation: 'Buyer' | 'Seller' | 'Dual' | undefined = undefined;
  if (rawRep.toLowerCase().includes('buyer')) representation = 'Buyer';
  else if (rawRep.toLowerCase().includes('seller')) representation = 'Seller';
  else if (rawRep.toLowerCase().includes('dual')) representation = 'Dual';

  // Lead Source mapping
  const rawSource = getVal(['lead source', 'source']);
  let leadSource: 'Zillow' | 'Self' | 'Team Lead' | 'Opcity' | 'Other' | undefined = undefined;
  if (rawSource) {
    if (rawSource.toLowerCase().includes('zillow')) leadSource = 'Zillow';
    else if (rawSource.toLowerCase().includes('self') || rawSource.toLowerCase().includes('soi') || rawSource.toLowerCase().includes('referral')) leadSource = 'Self';
    else if (rawSource.toLowerCase().includes('team')) leadSource = 'Team Lead';
    else if (rawSource.toLowerCase().includes('opcity')) leadSource = 'Opcity';
    else leadSource = 'Other';
  }

  // Additional fields to include in Notes
  const noteLines: string[] = [];
  const sisuNotes = getVal(['notes', 'comments', 'description']);
  if (sisuNotes && sisuNotes.toLowerCase() !== 'none' && sisuNotes !== '--') {
    noteLines.push(`Sisu Notes: ${sisuNotes}`);
  }

  const additionalFields = [
    { label: 'MLS ID', keys: ['mls id', 'mls #', 'mls number', 'listing id'] },
    { label: 'Lead Source', keys: ['lead source'] },
    { label: 'Financing Type', keys: ['financing type'] },
    { label: 'Title Company', keys: ['title company'] },
    { label: 'NHD Company Select', keys: ['nhd company select'] },
    { label: 'Home Inspection Company', keys: ['home inspection company'] },
    { label: 'Home Warranty Company', keys: ['home warranty company'] },
    { label: 'Home Warranty Amount', keys: ['home warranty amount'] },
    { label: 'Property Type', keys: ['property type'] },
    { label: 'Earnest Money Amount', keys: ['earnest money amount'] },
    { label: 'Appt Set By (ISA)', keys: ['appt set by (isa)'] },
    { label: 'Appraisal CR Due Date', keys: ['appraisal cr due date'] },
    { label: 'Loan CR Due Date', keys: ['loan cr due date'] },
    { label: 'Possession Date', keys: ['possession date'] },
  ];

  for (const item of additionalFields) {
    const val = getVal(item.keys);
    if (val && val !== 'None' && val !== '--' && val !== '0' && val !== '$0' && val !== '$0.00') {
      noteLines.push(`${item.label}: ${val}`);
    }
  }

  return {
    escrowNumber: getVal(['id', 'escrow #', 'escrow number', 'escrow no']),
    mlsId: getVal(['mls id', 'mls #', 'mls number', 'listing id', 'listing #', 'mls']) || undefined,
    escrowCompany: getVal(['escrow company', 'escrow_company', 'escrowcompany']),
    address,
    city,
    zipCode,
    clientFirstName: clientFirstName || '',
    clientLastName: clientLastName || '',
    clientPhone: getVal(['mobile phone number', 'client phone', 'phone', 'contact phone']),
    clientEmail: getVal(['contact email', 'client email', 'email']),
    clientBirthday: parseDateToIso(getVal(['client birthday', 'client birthdate', 'client dob', 'birthday', 'dob'])),
    client2FirstName,
    client2LastName,
    client2Phone,
    client2Email,
    client2Birthday: parseDateToIso(getVal(['client 2 birthday', 'client 2 birthdate', 'client 2 dob', 'client2 birthday', 'client2 birthdate', 'client2 dob'])),
    agentName: agentName || '',
    agentEmail: getVal(['agent email', 'agent_email']),
    agentPhone: getVal(['agent phone', 'agent_phone']),
    cooperatingBrokerage: getVal(['cooperating brokerage', 'other agent brokerage', 'other brokerage', 'agent brokerage', 'co-brokerage']),
    lenderName: getVal(['mortgage company', 'lender name', 'lender', 'mortgage']),
    lenderPhone: getVal(['lender phone', 'lender_phone']),
    lenderEmail: getVal(['lender email', 'lender_email']),
    escrowOfficer: getVal(['escrow officer name', 'escrow officer', 'escrow_officer']),
    escrowPhone: getVal(['escrow officer phone', 'escrow phone', 'escrow_phone']),
    escrowEmail: getVal(['escrow officer email', 'escrow email', 'escrow_email']),
    titleCompany: getVal(['title company', 'title_company', 'titlecompany', 'title']),
    titleOfficer: getVal(['title officer name', 'title officer', 'title person', 'title rep', 'title contact']),
    titlePhone: getVal(['title officer phone', 'title phone', 'title_phone']),
    titleEmail: getVal(['title officer email', 'title email', 'title_email']),
    collaborator: getVal(['co-agent name', 'co-agent', 'collaborator']),
    price,
    commissionPercent,
    netCommission,
    acceptanceDate,
    coeDate,
    status: parsedStatus,
    representation,
    leadSource,
    notes: noteLines.join('\n')
  };
}
