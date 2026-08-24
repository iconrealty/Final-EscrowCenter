export type PartnerCategory = 'lender' | 'escrow' | 'title' | 'tc';

export interface PreferredPartner {
  id: string;
  category: PartnerCategory;
  name: string; // Contact or Officer Name
  company: string; // Company / Bank / Branch
  phone: string;
  email: string;
  isDefault?: boolean; // If true, auto-selected on new listing escrows
  isSystemDefault?: boolean; // If true, protected built-in preset that cannot be deleted
}

export const DEFAULT_PARTNERS: PreferredPartner[] = [
  // Lenders
  {
    id: 'sys_lender_1',
    category: 'lender',
    name: 'Imelda Sanchez',
    company: 'Zillow Home Loans',
    phone: '949-776-1641',
    email: 'imeldas@zillowhomeloans.com',
    isDefault: true,
    isSystemDefault: true,
  },
  {
    id: 'sys_lender_2',
    category: 'lender',
    name: 'Thomas (Sciutto Team)',
    company: 'CrossCountry Mortgage',
    phone: '(619) 857-7064',
    email: 'sciuttoteam@ccm.com',
    isSystemDefault: true,
  },

  // Escrow
  {
    id: 'sys_escrow_1',
    category: 'escrow',
    name: 'Sarah Gifford',
    company: 'Pacific Horizon Escrow Group',
    phone: '(949) 209-8201',
    email: 'Sarah.Gifford@phegescrow.com',
    isDefault: true,
    isSystemDefault: true,
  },
  {
    id: 'sys_escrow_2',
    category: 'escrow',
    name: 'Christopher Arce-Dale',
    company: 'New Venture Escrow',
    phone: '949.800.8595',
    email: 'Christopher@NewVentureEscrow.com',
    isSystemDefault: true,
  },
  {
    id: 'sys_escrow_3',
    category: 'escrow',
    name: 'Sara Lualemaga',
    company: '321 Escrow',
    phone: '949-401-4772',
    email: 'SaraL@escrow321.com',
    isSystemDefault: true,
  },

  // Title
  {
    id: 'sys_title_1',
    category: 'title',
    name: 'Nicole Panattoni - Nastazio',
    company: 'Fidelity National Title',
    phone: '(760) 637-9870',
    email: 'NicoleandCory@ff.com',
    isDefault: true,
    isSystemDefault: true,
  },
  {
    id: 'sys_title_2',
    category: 'title',
    name: 'Jeff Gibson',
    company: 'First American Title',
    phone: '949.291.6682',
    email: 'gib4title@firstam.com',
    isSystemDefault: true,
  },
];
