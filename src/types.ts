export interface AgentGoals {
  year: string;
  targetCommission: number;
  targetDeals: number;
}

export interface EscrowDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size?: number;
  type?: string;
}

export interface AnniversaryInteraction {
  id: string;
  date: string; // ISO string or YYYY-MM-DD
  yearCount: number;
  notes: string;
  method: 'Phone' | 'Text' | 'Email' | 'In Person' | 'Card/Gift';
  createdAt: string;
}

export interface Escrow {
  id: string;
  escrowNumber?: string;
  escrowCompany?: string;
  address: string;
  city?: string;
  zipCode?: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientBirthday?: string;
  client2FirstName?: string;
  client2LastName?: string;
  client2Phone?: string;
  client2Email?: string;
  client2Birthday?: string;
  collaborator: string;
  escrowOfficer: string;
  escrowPhone?: string;
  escrowEmail?: string;
  titleCompany?: string;
  titleOfficer?: string;
  titlePhone?: string;
  titleEmail?: string;
  agentName: string;
  agentPhone?: string;
  agentEmail?: string;
  cooperatingBrokerage?: string;
  lenderName?: string;
  lenderPhone?: string;
  lenderEmail?: string;
  price: number;
  netCommission: number;
  commissionPercent?: number;
  acceptanceDate?: string;
  coeDate: string;
  notes: string;
  status: 'Open' | 'Closed' | 'Cancelled';
  representation?: 'Buyer' | 'Seller' | 'Dual';
  leadSource?: 'Zillow' | 'Self' | 'Team Lead' | 'Opcity' | 'Other' | string;
  tasks: Record<string, boolean>;
  contingencyDays?: Record<string, number>;
  contingencyStartDate?: string;
  documents?: EscrowDocument[];
  anniversaryInteractions?: AnniversaryInteraction[];
  lastUpdated: string;
  createdAt?: string;
}

export const MILESTONES = [
  { key: 'BRBC', label: 'BRBC' },
  { key: 'EMD', label: 'EMD' },
  { key: 'INSP', label: 'Inspection' },
  { key: 'RR', label: 'RR' },
  { key: 'AVID', label: 'AVID' },
  { key: 'SDR', label: 'Seller Disclosures Received & Reviewed' },
  { key: 'APR', label: 'Appraisal' },
  { key: 'Insurance', label: 'Insurance' },
  { key: 'LFA', label: 'Loan Final Approval' },
  { key: 'SLD', label: 'Escrow / Loan Docs Signed' },
  { key: 'VP', label: 'VP' },
  { key: 'FWD', label: 'Final Wire Deposit' },
  { key: 'REC', label: 'Record / Close' },
];

export const CONTINGENCIES = [
  { key: 'L1', label: 'Loan' },
  { key: 'L2', label: 'Appraisal' },
  { key: 'L3', label: 'Investigation' },
  { key: 'L4', label: 'Insurance' },
  { key: 'L5', label: 'Seller Docs' },
  { key: 'L6', label: 'Title Report' },
  { key: 'L7', label: 'Common Int / HOA' },
  { key: 'L8', label: 'Leased Items' },
  { key: 'L9', label: 'COP' },
];

export const ALL_TASKS = [...MILESTONES, ...CONTINGENCIES];

import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

export const DEFAULT_CONTINGENCY_DAYS: Record<string, number> = {
  'L1': 14,
  'L2': 10,
  'L3': 7,
  'L4': 7,
  'L5': 7,
  'L6': 7,
  'L7': 7,
  'L8': 7,
  'L9': 7,
};

export function adjustWeekendToMonday(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 6) {
    return addDays(date, 2); // Saturday -> Monday
  } else if (day === 0) {
    return addDays(date, 1); // Sunday -> Monday
  }
  return date;
}

export function getContingencyDueDate(escrow: Escrow, taskKey: string): Date | null {
  const days = escrow.contingencyDays?.[taskKey] ?? DEFAULT_CONTINGENCY_DAYS[taskKey] ?? 7;
  const startDateStr = escrow.contingencyStartDate || escrow.acceptanceDate || escrow.lastUpdated || escrow.coeDate;
  if (!startDateStr) {
    return null;
  }

  try {
    const startDate = parseISO(startDateStr);
    if (isNaN(startDate.getTime())) {
      return null;
    }
    const initialDeadline = addDays(startDate, days);
    return adjustWeekendToMonday(initialDeadline);
  } catch (e) {
    return null;
  }
}

export function isContingencyUrgent(escrow: Escrow, taskKey: string): boolean {
  if (escrow.status !== 'Open') return false;
  if (escrow.tasks[taskKey]) return false; // Already done
  
  const daysLeft = getContingencyDaysLeft(escrow, taskKey);
  if (daysLeft === null) return false;
  
  return daysLeft <= 2;
}

export function getContingencyDaysLeft(escrow: Escrow, taskKey: string): number | null {
  const dueDate = getContingencyDueDate(escrow, taskKey);
  if (!dueDate) {
    const days = escrow.contingencyDays?.[taskKey] ?? DEFAULT_CONTINGENCY_DAYS[taskKey] ?? 7;
    return days;
  }
  return differenceInCalendarDays(dueDate, new Date());
}

export function formatPropertyAddress(escrow?: { address?: string; city?: string; zipCode?: string } | null): string {
  if (!escrow) return '';
  const street = (escrow.address || '').trim();
  const city = (escrow.city || '').trim();
  const zip = (escrow.zipCode || '').trim();

  if (!city && !zip) return street;

  // If the street field already contains city and zip, don't duplicate
  if (city && street.toLowerCase().includes(city.toLowerCase()) && zip && street.includes(zip)) {
    return street;
  }

  const parts: string[] = [];
  if (street) parts.push(street);
  if (city && zip) {
    parts.push(`${city}, ${zip}`);
  } else if (city) {
    parts.push(city);
  } else if (zip) {
    parts.push(zip);
  }
  return parts.join(', ');
}

export function parseAddressComponents(rawAddress?: string): { address: string; city: string; zipCode: string } {
  if (!rawAddress || !rawAddress.trim()) {
    return { address: '', city: '', zipCode: '' };
  }
  const clean = rawAddress.trim();

  // Try parsing: "123 Main St, City, State Zip" or "123 Main St, City, Zip"
  const commaParts = clean.split(',').map(p => p.trim()).filter(Boolean);

  if (commaParts.length >= 3) {
    const street = commaParts[0];
    const city = commaParts[1];
    const lastPart = commaParts.slice(2).join(' ');
    const zipMatch = lastPart.match(/\b\d{5}(?:-\d{4})?\b/);
    const zipCode = zipMatch ? zipMatch[0] : '';
    return {
      address: street,
      city: city,
      zipCode: zipCode
    };
  } else if (commaParts.length === 2) {
    const street = commaParts[0];
    const secondPart = commaParts[1];
    const zipMatch = secondPart.match(/\b\d{5}(?:-\d{4})?\b/);
    const zipCode = zipMatch ? zipMatch[0] : '';
    const city = secondPart.replace(/\b[A-Z]{2}\b/g, '').replace(/\b\d{5}(?:-\d{4})?\b/g, '').trim();
    return {
      address: street,
      city: city || secondPart,
      zipCode: zipCode
    };
  } else {
    const zipMatch = clean.match(/\b\d{5}(?:-\d{4})?\b$/);
    if (zipMatch) {
      const zipCode = zipMatch[0];
      const rest = clean.substring(0, clean.length - zipCode.length).trim();
      return {
        address: rest,
        city: '',
        zipCode: zipCode
      };
    }
    return {
      address: clean,
      city: '',
      zipCode: ''
    };
  }
}

