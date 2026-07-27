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
  agentName: string;
  agentPhone?: string;
  agentEmail?: string;
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

export function isContingencyUrgent(escrow: Escrow, taskKey: string): boolean {
  if (escrow.status !== 'Open') return false;
  if (escrow.tasks[taskKey]) return false; // Already done
  
  const daysLeft = getContingencyDaysLeft(escrow, taskKey);
  if (daysLeft === null) return false;
  
  return daysLeft <= 2;
}

export function getContingencyDaysLeft(escrow: Escrow, taskKey: string): number | null {
  const days = escrow.contingencyDays?.[taskKey] ?? DEFAULT_CONTINGENCY_DAYS[taskKey] ?? 7;
  const startDateStr = escrow.contingencyStartDate || escrow.acceptanceDate || escrow.lastUpdated || escrow.coeDate;
  if (!startDateStr) {
    return days;
  }

  try {
    const startDate = parseISO(startDateStr);
    if (isNaN(startDate.getTime())) {
      return days;
    }
    const deadline = addDays(startDate, days);
    return differenceInCalendarDays(deadline, new Date());
  } catch (e) {
    return days;
  }
}
