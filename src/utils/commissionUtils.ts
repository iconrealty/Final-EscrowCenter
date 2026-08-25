export interface CommissionCalculationResult {
  grossCommission: number;
  netCommission: number;
  formulaSummary: string;
  steps: string[];
}

/**
 * Calculates Net Commission based on Lead Source business rules:
 * 
 * 1. Zillow:
 *    - Gross Commission minus 40% (balance: 60%)
 *    - From that balance, 50% is taken (balance: 30% of Gross)
 *    - From that balance, $300 is taken
 *    - Net = (Gross * 0.60 * 0.50) - 300 = (Gross * 0.30) - 300
 * 
 * 2. Self or Other:
 *    - From Gross Commission 30% is taken (balance: 70% of Gross)
 *    - $300 is taken
 *    - Net = (Gross * 0.70) - 300
 * 
 * 3. Opcity:
 *    - From Gross Commission 30% is taken (balance: 70%)
 *    - From that balance, 50% is taken (balance: 35% of Gross)
 *    - $300 is taken
 *    - Net = (Gross * 0.70 * 0.50) - 300 = (Gross * 0.35) - 300
 * 
 * 4. Team Lead:
 *    - From Gross Commission 50% is taken (balance: 50% of Gross)
 *    - $300 is taken
 *    - Net = (Gross * 0.50) - 300
 */
export function calculateNetFromGross(grossCommission: number, leadSource: string): number {
  if (!grossCommission || grossCommission <= 0) return 0;
  
  const normalized = (leadSource || 'Zillow').trim().toLowerCase();

  let net = 0;
  if (normalized === 'zillow') {
    // (Gross * 0.60 * 0.50) - 300
    net = (grossCommission * 0.60 * 0.50) - 300;
  } else if (normalized === 'opcity') {
    // (Gross * 0.70 * 0.50) - 300
    net = (grossCommission * 0.70 * 0.50) - 300;
  } else if (normalized === 'team lead' || normalized === 'team') {
    // (Gross * 0.50) - 300
    net = (grossCommission * 0.50) - 300;
  } else {
    // Self or Other (default): (Gross * 0.70) - 300
    net = (grossCommission * 0.70) - 300;
  }

  return Math.max(0, Math.round(net));
}

export function calculateCommissionBreakdown(
  price: number,
  commissionPercent: number,
  leadSource: string
): CommissionCalculationResult {
  const grossCommission = Math.round((price * (commissionPercent || 0)) / 100);
  const normalized = (leadSource || 'Zillow').trim().toLowerCase();
  
  if (grossCommission <= 0) {
    return {
      grossCommission: 0,
      netCommission: 0,
      formulaSummary: getFormulaLabel(leadSource),
      steps: ['Gross Commission: $0']
    };
  }

  const steps: string[] = [`Gross Commission: $${grossCommission.toLocaleString()}`];
  let formulaSummary = '';
  let netCommission = 0;

  if (normalized === 'zillow') {
    const afterRef = grossCommission * 0.60;
    const afterSplit = afterRef * 0.50;
    netCommission = Math.max(0, Math.round(afterSplit - 300));
    steps.push(`Less 40% Zillow Referral: -$${Math.round(grossCommission * 0.40).toLocaleString()} (Bal: $${Math.round(afterRef).toLocaleString()})`);
    steps.push(`Less 50% Split: -$${Math.round(afterRef * 0.50).toLocaleString()} (Bal: $${Math.round(afterSplit).toLocaleString()})`);
    steps.push(`Less $300 Fee: -$300`);
    formulaSummary = `(Gross × 60% × 50%) - $300`;
  } else if (normalized === 'opcity') {
    const afterRef = grossCommission * 0.70;
    const afterSplit = afterRef * 0.50;
    netCommission = Math.max(0, Math.round(afterSplit - 300));
    steps.push(`Less 30% Opcity Referral: -$${Math.round(grossCommission * 0.30).toLocaleString()} (Bal: $${Math.round(afterRef).toLocaleString()})`);
    steps.push(`Less 50% Split: -$${Math.round(afterRef * 0.50).toLocaleString()} (Bal: $${Math.round(afterSplit).toLocaleString()})`);
    steps.push(`Less $300 Fee: -$300`);
    formulaSummary = `(Gross × 70% × 50%) - $300`;
  } else if (normalized === 'team lead' || normalized === 'team') {
    const afterSplit = grossCommission * 0.50;
    netCommission = Math.max(0, Math.round(afterSplit - 300));
    steps.push(`Less 50% Team Split: -$${Math.round(grossCommission * 0.50).toLocaleString()} (Bal: $${Math.round(afterSplit).toLocaleString()})`);
    steps.push(`Less $300 Fee: -$300`);
    formulaSummary = `(Gross × 50%) - $300`;
  } else {
    // Self or Other
    const afterSplit = grossCommission * 0.70;
    netCommission = Math.max(0, Math.round(afterSplit - 300));
    steps.push(`Less 30% Split: -$${Math.round(grossCommission * 0.30).toLocaleString()} (Bal: $${Math.round(afterSplit).toLocaleString()})`);
    steps.push(`Less $300 Fee: -$300`);
    formulaSummary = `(Gross × 70%) - $300`;
  }

  return {
    grossCommission,
    netCommission,
    formulaSummary,
    steps
  };
}

export function getFormulaLabel(leadSource: string): string {
  const normalized = (leadSource || 'Zillow').trim().toLowerCase();
  if (normalized === 'zillow') return 'Zillow: (Gross × 60% × 50%) - $300';
  if (normalized === 'opcity') return 'Opcity: (Gross × 70% × 50%) - $300';
  if (normalized === 'team lead' || normalized === 'team') return 'Team Lead: (Gross × 50%) - $300';
  return 'Self / Other: (Gross × 70%) - $300';
}
