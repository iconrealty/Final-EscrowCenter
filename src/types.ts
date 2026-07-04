export interface Escrow {
  id: string;
  escrowNumber?: string;
  escrowCompany?: string;
  address: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone?: string;
  clientEmail?: string;
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
  acceptanceDate?: string;
  coeDate: string;
  notes: string;
  status: 'Open' | 'Closed' | 'Cancelled';
  tasks: Record<string, boolean>;
  contingencyDays?: Record<string, number>;
  lastUpdated: string;
}

export const MILESTONES = [
  { key: 'BRBC', label: 'Client Representation' },
  { key: 'EMD', label: 'Earnest Money Deposit' },
  { key: 'INSP', label: 'Inspection' },
  { key: 'RR', label: 'Request for Repair' },
  { key: 'AVID', label: 'Agent Visual Inspection Disclosure' },
  { key: 'APR', label: 'Appraisal' },
  { key: 'INS', label: 'Get Insurance' },
  { key: 'LFA', label: 'Loan Final Approval' },
  { key: 'SLD', label: 'Escrow / Loan Docs Signed' },
  { key: 'VP', label: 'Verification of Property' },
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

import { addDays, differenceInDays, parseISO } from 'date-fns';

export function isContingencyUrgent(escrow: Escrow, taskKey: string): boolean {
  if (escrow.status !== 'Open') return false;
  if (escrow.tasks[taskKey]) return false; // Already done
  
  const daysLeft = getContingencyDaysLeft(escrow, taskKey);
  if (daysLeft === null) return false;
  
  return daysLeft <= 2;
}

export function getContingencyDaysLeft(escrow: Escrow, taskKey: string): number | null {
  const days = escrow.contingencyDays?.[taskKey];
  if (days === undefined || !escrow.acceptanceDate) return null;

  const deadline = addDays(parseISO(escrow.acceptanceDate), days);
  return differenceInDays(deadline, new Date());
}
