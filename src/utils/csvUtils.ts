import { Escrow, ALL_TASKS } from '../types';

export const CSV_HEADERS = [
  'Escrow #',
  'Status',
  'Representation',
  'Address',
  'Client Name',
  'Client First Name',
  'Client Last Name',
  'Client Phone',
  'Client Email',
  'Client 2 First Name',
  'Client 2 Last Name',
  'Client 2 Phone',
  'Client 2 Email',
  'Agent Name',
  'Agent Email',
  'Agent Phone',
  'Co-Agent Name',
  'Co-Agent Email',
  'Co-Agent Phone',
  'Lender Name',
  'Lender Email',
  'Lender Phone',
  'Escrow Officer Name',
  'Escrow Officer Email',
  'Escrow Officer Phone',
  'Escrow Company',
  'Acceptance Date',
  'Close of Escrow',
  'Sale Price',
  'Commission Percent',
  'Net Commission',
  'Notes'
];

function parseDateToIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const trimmed = dateStr.trim();
  // If YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(trimmed)) {
    return trimmed.replace(/\//g, '-');
  }
  // If MM/DD/YYYY or MM-DD-YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(/[-/]/);
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  // Try standard JS parsing
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
}

export function generateCsvTemplate(): string {
  const exampleRows = [
    [
      '"98453-PC"', // Escrow #
      '"Closed"', // Status
      '"Buyer"', // Representation
      '"1206 Louise St, Santa Ana, CA 92703"', // Address
      '"Patrick Curley"', // Client Name
      '"Patrick"', // Client First Name
      '"Curley"', // Client Last Name
      '""', // Client Phone
      '""', // Client Email
      '""', // Client 2 First Name
      '""', // Client 2 Last Name
      '""', // Client 2 Phone
      '""', // Client 2 Email
      '"Paul Muner"', // Agent Name
      '""', // Agent Email
      '""', // Agent Phone
      '""', // Co-Agent Name
      '""', // Co-Agent Email
      '""', // Co-Agent Phone
      '""', // Lender Name
      '""', // Lender Email
      '""', // Lender Phone
      '""', // Escrow Officer Name
      '""', // Escrow Officer Email
      '""', // Escrow Officer Phone
      '"Escrow Logix, Inc."', // Escrow Company
      '"05/05/2026"', // Acceptance Date
      '"06/05/2026"', // Close of Escrow
      '"$840,000.00"', // Sale Price
      '"3.0"', // Commission Percent
      '"$25,200.00"', // Net Commission
      '"Notes for Escrow Logix"' // Notes
    ],
    [
      '"47294-CC"',
      '"Open"',
      '"Seller"',
      '"12592 Montecito Rd #9, Seal Beach, CA 90740"',
      '"Carlos Campa"',
      '"Carlos"',
      '"Campa"',
      '""',
      '""',
      '"Maria"',
      '"Campa"',
      '""',
      '""',
      '"Paul Muner"',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '"Cloud Escrow"',
      '"06/01/2026"',
      '"07/15/2026"',
      '"$585,000.00"',
      '"2.5"',
      '"$14,625.00"',
      '""'
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
    
    // Format the values to escape commas and quotes
    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""'); // escape double quotes
      return `"${str}"`;
    };

    const row = [
      escapeCsv(e.escrowNumber || ''),
      escapeCsv(e.status || 'Open'),
      escapeCsv(e.representation || ''),
      escapeCsv(e.address || ''),
      escapeCsv(clientName),
      escapeCsv(e.clientFirstName || ''),
      escapeCsv(e.clientLastName || ''),
      escapeCsv(e.clientPhone || ''),
      escapeCsv(e.clientEmail || ''),
      escapeCsv(e.client2FirstName || ''),
      escapeCsv(e.client2LastName || ''),
      escapeCsv(e.client2Phone || ''),
      escapeCsv(e.client2Email || ''),
      escapeCsv(e.agentName || ''),
      escapeCsv(e.agentEmail || ''),
      escapeCsv(e.agentPhone || ''),
      escapeCsv(e.collaborator || ''), // Co-Agent Name
      escapeCsv(''), // Co-Agent Email
      escapeCsv(''), // Co-Agent Phone
      escapeCsv(e.lenderName || ''),
      escapeCsv(e.lenderEmail || ''),
      escapeCsv(e.lenderPhone || ''),
      escapeCsv(e.escrowOfficer || ''),
      escapeCsv(e.escrowEmail || ''), // Escrow Officer Email
      escapeCsv(e.escrowPhone || ''), // Escrow Officer Phone
      escapeCsv(e.escrowCompany || ''),
      escapeCsv(e.acceptanceDate || ''),
      escapeCsv(e.coeDate || ''),
      escapeCsv(e.price ? `$${e.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'),
      escapeCsv(e.commissionPercent !== undefined ? e.commissionPercent : ''),
      escapeCsv(e.netCommission ? `$${e.netCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'),
      escapeCsv(e.notes || '')
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

  const headers = rows[0].map(h => h.toLowerCase());
  const results: Partial<Escrow>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    const getVal = (possibleKeys: string[]) => {
      // Direct exact match first
      const exactMatch = headers.find(h => possibleKeys.some(pk => h === pk.toLowerCase()));
      if (exactMatch) return row[exactMatch];
      
      // Fuzzy match (includes)
      const match = headers.find(h => possibleKeys.some(pk => h.includes(pk.toLowerCase())));
      return match ? row[match] : '';
    };

    // Standardize status mapping
    const rawStatus = getVal(['status']);
    let parsedStatus: 'Open' | 'Closed' | 'Cancelled' = 'Open';
    if (rawStatus.toLowerCase().includes('closed')) {
      parsedStatus = 'Closed';
    } else if (rawStatus.toLowerCase().includes('cancel')) {
      parsedStatus = 'Cancelled';
    } else {
      parsedStatus = 'Open'; // Default or pending maps to Open
    }
    
    let address = getVal(['address', 'property', 'location']);
    if (!address) {
      // Check if we have any other non-empty field, otherwise skip fully blank row
      const hasAnyField = Object.values(row).some(val => val.trim().length > 0);
      if (!hasAnyField) continue;
      address = 'TBD';
    }

    const rawClientFirstName = getVal(['client first name', 'first name']);
    const rawClientLastName = getVal(['client last name', 'last name']);
    const legacyClientName = getVal(['client name', 'client']);
    
    let clientFirstName = rawClientFirstName;
    let clientLastName = rawClientLastName;
    
    if (!clientFirstName && !clientLastName && legacyClientName) {
      const parts = legacyClientName.trim().split(/\s+/);
      clientFirstName = parts[0] || '';
      clientLastName = parts.slice(1).join(' ') || '';
    }

    const escrowCompany = getVal(['escrow company']);
    let notes = getVal(['notes', 'description', 'comments', 'memo']);
    if (escrowCompany) {
      const prefix = `Escrow Company: ${escrowCompany}`;
      notes = notes ? `${prefix}\n\n${notes}` : prefix;
    }

    // Dates parsing
    const rawAcceptance = getVal(['acceptance date', 'acceptance']);
    const rawCoe = getVal(['close of escrow', 'coe', 'close date']);

    // Representation mapping
    const rawRep = getVal(['representation', 'rep']);
    let representation: 'Buyer' | 'Seller' | 'Dual' | undefined = undefined;
    if (rawRep.toLowerCase().includes('buyer')) representation = 'Buyer';
    else if (rawRep.toLowerCase().includes('seller')) representation = 'Seller';
    else if (rawRep.toLowerCase().includes('dual')) representation = 'Dual';

    // Map fields
    const escrow: Partial<Escrow> = {
      escrowNumber: getVal(['escrow #', 'escrow number', 'escrow no', 'escrowno', 'escrow_no', 'escrow_number']),
      escrowCompany: getVal(['escrow company', 'escrow_company', 'escrowcompany']) || escrowCompany || '',
      address,
      clientFirstName,
      clientLastName,
      clientPhone: getVal(['client phone']),
      clientEmail: getVal(['client email']),
      client2FirstName: getVal(['client 2 first name', 'client2 first name']),
      client2LastName: getVal(['client 2 last name', 'client2 last name']),
      client2Phone: getVal(['client 2 phone', 'client2 phone']),
      client2Email: getVal(['client 2 email', 'client2 email']),
      agentName: getVal(['agent name']),
      agentEmail: getVal(['agent email']),
      agentPhone: getVal(['agent phone']),
      lenderName: getVal(['lender name']),
      lenderPhone: getVal(['lender phone']),
      lenderEmail: getVal(['lender email']),
      escrowOfficer: getVal(['escrow officer name', 'escrow officer']),
      escrowPhone: getVal(['escrow officer phone', 'escrow phone']),
      escrowEmail: getVal(['escrow officer email', 'escrow email']),
      collaborator: getVal(['co-agent name', 'co-agent', 'collaborator']),
      price: Number(String(getVal(['sale price', 'price', 'amount']) || '').replace(/[^0-9.]/g, '')) || 0,
      commissionPercent: getVal(['commission percent', 'commission %', 'commission_percent']) ? Number(String(getVal(['commission percent', 'commission %', 'commission_percent'])).replace(/[^0-9.]/g, '')) : undefined,
      netCommission: Number(String(getVal(['net commission', 'commission']) || '').replace(/[^0-9.]/g, '')) || 0,
      acceptanceDate: rawAcceptance ? parseDateToIso(rawAcceptance) : new Date().toISOString().split('T')[0],
      coeDate: rawCoe ? parseDateToIso(rawCoe) : new Date().toISOString().split('T')[0],
      status: parsedStatus,
      representation,
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

  // Address
  let address = getVal(['address line 1', 'address', 'property address', 'property location', 'address line 2']);
  if (!address) {
    address = 'TBD';
  }

  // Client Name
  let clientFirstName = getVal(['first name', 'client first name', 'buyer first name', 'seller first name']);
  let clientLastName = getVal(['last name', 'client last name', 'buyer last name', 'seller last name']);
  const clientName = getVal(['client name', 'client', 'buyer name', 'seller name']);
  if (!clientFirstName && !clientLastName && clientName) {
    const parts = clientName.trim().split(/\s+/);
    clientFirstName = parts[0] || '';
    clientLastName = parts.slice(1).join(' ') || '';
  }

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
  const rawCoe = getVal(['closed (settlement) date', 'closed date', 'forecasted closed date', 'close of escrow', 'coe']);

  const acceptanceDate = rawAcceptance && rawAcceptance.toLowerCase() !== 'none' && rawAcceptance.toLowerCase() !== '--'
    ? parseDateToIso(rawAcceptance) 
    : new Date().toISOString().split('T')[0];
    
  const coeDate = rawCoe && rawCoe.toLowerCase() !== 'none' && rawCoe.toLowerCase() !== '--'
    ? parseDateToIso(rawCoe) 
    : new Date().toISOString().split('T')[0];

  // Price
  const rawPrice = getVal(['transaction amount', 'sale price', 'price', 'amount', 'purchase price']);
  const price = Number(String(rawPrice || '').replace(/[^0-9.]/g, '')) || 0;

  // GCI / Net Commission
  const rawGCI = getVal(['gci', 'net commission', 'commission', 'gross agent(s) paid income']);
  const netCommission = Number(String(rawGCI || '').replace(/[^0-9.]/g, '')) || 0;

  const commissionPercent = getVal(['commission percent', 'commission %', 'commission_percent']) ? Number(String(getVal(['commission percent', 'commission %', 'commission_percent'])).replace(/[^0-9.]/g, '')) : undefined;

  // Additional fields to include in Notes
  const noteLines: string[] = [];
  const sisuNotes = getVal(['notes', 'comments', 'description']);
  if (sisuNotes && sisuNotes.toLowerCase() !== 'none' && sisuNotes !== '--') {
    noteLines.push(`Sisu Notes: ${sisuNotes}`);
  }

  const additionalFields = [
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
    escrowCompany: getVal(['escrow company', 'escrow_company', 'escrowcompany']),
    address,
    clientFirstName: clientFirstName || '',
    clientLastName: clientLastName || '',
    clientPhone: getVal(['mobile phone number', 'client phone', 'phone', 'contact phone']),
    clientEmail: getVal(['contact email', 'client email', 'email']),
    agentName: agentName || '',
    agentEmail: getVal(['agent email', 'agent_email']),
    agentPhone: getVal(['agent phone', 'agent_phone']),
    lenderName: getVal(['mortgage company', 'lender name', 'lender', 'mortgage']),
    lenderPhone: getVal(['lender phone', 'lender_phone']),
    lenderEmail: getVal(['lender email', 'lender_email']),
    escrowOfficer: getVal(['escrow officer name', 'escrow officer', 'escrow_officer']),
    escrowPhone: getVal(['escrow officer phone', 'escrow phone', 'escrow_phone']),
    escrowEmail: getVal(['escrow officer email', 'escrow email', 'escrow_email']),
    collaborator: getVal(['co-agent name', 'co-agent', 'collaborator']),
    price,
    commissionPercent,
    netCommission,
    acceptanceDate,
    coeDate,
    status: parsedStatus,
    notes: noteLines.join('\n')
  };
}
