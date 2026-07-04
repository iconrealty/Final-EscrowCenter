import { Escrow, ALL_TASKS } from '../types';

export const CSV_HEADERS = [
  'Escrow #',
  'Status',
  'Address',
  'Client Name',
  'Client First Name',
  'Client Last Name',
  'Client Phone',
  'Client Email',
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
  'Sale Price'
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
      '"98453-PC"',
      '"Closed"',
      '"1206 Louise St, Santa Ana, CA 92703"',
      '"Patrick Curley"',
      '"Patrick"',
      '"Curley"',
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
      '"Escrow Logix, Inc."',
      '""',
      '"06/05/2026"',
      '"$840,000.00"'
    ],
    [
      '"47294-CC"',
      '"Pending"',
      '"12592 Montecito Rd #9, Seal Beach, CA 90740"',
      '"Carlos Campa"',
      '"Carlos"',
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
      '""',
      '""',
      '"$585,000.00"'
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

export function parseCsv(csvText: string): Partial<Escrow>[] {
  const lines = csvText.split('\n').filter(l => {
    const trimmed = l.trim();
    if (trimmed.length === 0) return false;
    // Skip lines that have no letters or numbers (like lines with only commas, quotes, or dashes)
    return /[a-zA-Z0-9]/.test(trimmed);
  });
  if (lines.length <= 1) return []; // Only headers or empty

  const headers = lines[0]
    .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    .map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const results: Partial<Escrow>[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Regex to split by comma except inside quotes
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
    
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
    
    const address = getVal(['address', 'property', 'location']);
    if (!address) continue;

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

    // Map fields
    const escrow: Partial<Escrow> = {
      escrowNumber: getVal(['escrow #', 'escrow number', 'escrow no', 'escrowno', 'escrow_no', 'escrow_number']),
      escrowCompany: getVal(['escrow company', 'escrow_company', 'escrowcompany']) || escrowCompany || '',
      address,
      clientFirstName,
      clientLastName,
      clientPhone: getVal(['client phone']),
      clientEmail: getVal(['client email']),
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
      price: Number(getVal(['sale price', 'price', 'amount']).replace(/[^0-9.]/g, '')) || 0,
      netCommission: Number(getVal(['net commission', 'commission']).replace(/[^0-9.]/g, '')) || 0,
      acceptanceDate: rawAcceptance ? parseDateToIso(rawAcceptance) : new Date().toISOString().split('T')[0],
      coeDate: rawCoe ? parseDateToIso(rawCoe) : new Date().toISOString().split('T')[0],
      status: parsedStatus,
      notes
    };
    
    results.push(escrow);
  }

  return results;
}
