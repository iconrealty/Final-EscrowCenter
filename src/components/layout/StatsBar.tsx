import React from 'react';
import { Escrow } from '../../types';
import { useGoals } from '../../hooks/useGoals';
import { getEscrowYear } from '../../utils/csvUtils';
import { StockMarketGoalsBar } from './StockMarketGoalsBar';

interface StatsBarProps {
  escrows: Escrow[];
  onOpenGoals?: () => void;
}

export function StatsBar({ escrows, onOpenGoals }: StatsBarProps) {
  const actualYear = new Date().getFullYear().toString();
  const { getGoals } = useGoals();
  const storedGoals = getGoals(actualYear);

  const openEscrows = escrows.filter(e => e.status === 'Open');
  
  // Filter closed escrows to ONLY include those closed in the actual current year
  const actualYearClosedEscrows = escrows.filter(
    e => e.status === 'Closed' && getEscrowYear(e) === actualYear
  );

  const openCount = openEscrows.length;
  const closedCommission = actualYearClosedEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
  const pendingCommission = openEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
  const closedYtd = actualYearClosedEscrows.length;

  // Calculate Total GCI (Gross Commission Income) for closed escrows in the actual year
  const totalGci = actualYearClosedEscrows.reduce((sum, e) => {
    if (e.grossCommission !== undefined && e.grossCommission !== null) return sum + Number(e.grossCommission);
    if (e.price && e.commissionPercent) return sum + (Number(e.price) * Number(e.commissionPercent)) / 100;
    return sum + (Number(e.netCommission) || 0);
  }, 0);

  const goalTargetIncome = storedGoals.targetCommission || 150000;
  const goalTargetUnits = storedGoals.targetDeals || 12;

  // Compute On Track vs Off Track status for both Units and Income
  const now = new Date();
  const startOfYear = new Date(Number(actualYear), 0, 1);
  const diffTime = Math.max(0, now.getTime() - startOfYear.getTime());
  const daysPassed = Math.min(365, Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
  const yearElapsedPercent = Math.round((daysPassed / 365) * 100);

  const expectedIncomePace = goalTargetIncome * (yearElapsedPercent / 100);
  const expectedUnitsPace = goalTargetUnits * (yearElapsedPercent / 100);

  const projectedTotalCommission = closedCommission + pendingCommission;
  const projectedTotalUnits = closedYtd + openCount;

  // Income Status
  const isIncomeAchieved = closedCommission >= goalTargetIncome && goalTargetIncome > 0;
  const isIncomeOnTrack = isIncomeAchieved || closedCommission >= expectedIncomePace || projectedTotalCommission >= expectedIncomePace;
  const incomeStatusText = isIncomeOnTrack ? 'ON TRACK' : 'OFF TRACK';

  // Units Status
  const isUnitsAchieved = closedYtd >= goalTargetUnits && goalTargetUnits > 0;
  const isUnitsOnTrack = isUnitsAchieved || closedYtd >= expectedUnitsPace || projectedTotalUnits >= expectedUnitsPace;
  const unitsStatusText = isUnitsOnTrack ? 'ON TRACK' : 'OFF TRACK';

  // Agent Performance Analytics calculations:
  const remainingCommissionNeeded = Math.max(0, goalTargetIncome - closedCommission);
  const remainingUnitsNeeded = Math.max(0, goalTargetUnits - closedYtd);
  const daysRemaining = Math.max(0, 365 - daysPassed);

  const currentMonthIndex = now.getMonth();
  const monthsRemaining = Math.max(1, 12 - currentMonthIndex);
  const monthlyUnitsNeeded = remainingUnitsNeeded / monthsRemaining;
  const monthlyIncomeNeeded = remainingCommissionNeeded / monthsRemaining;

  // Average Price Point logic matching GoalsModal:
  const closedVolume = actualYearClosedEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
  const closedAvgPricePoint = closedYtd > 0 ? (closedVolume / closedYtd) : 0;
  const targetNetCommPerUnit = goalTargetUnits > 0 ? (goalTargetIncome / goalTargetUnits) : 0;

  const allEscrowsVolume = escrows.reduce((sum, e) => sum + (e.price || 0), 0);
  const allEscrowsCommission = escrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
  const effectiveCommRate = closedVolume > 0 && closedCommission > 0
    ? (closedCommission / closedVolume)
    : (allEscrowsVolume > 0 && allEscrowsCommission > 0 ? (allEscrowsCommission / allEscrowsVolume) : 0.025);

  const targetAvgPricePoint = effectiveCommRate > 0 && targetNetCommPerUnit > 0
    ? Math.round(targetNetCommPerUnit / effectiveCommRate)
    : 0;

  const avgPricePoint = targetAvgPricePoint > 0 ? targetAvgPricePoint : (closedAvgPricePoint > 0 ? closedAvgPricePoint : 0);

  // --- LAST YEAR YTD COMPARISON CALCULATIONS ---
  const lastYear = (Number(actualYear) - 1).toString();

  // Helper to parse closing date
  const parseClosingDate = (e: Partial<Escrow>): Date | null => {
    const str = (e.coeDate || e.acceptanceDate || '').trim();
    if (!str) return null;
    const mdyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const [, m, d, y] = mdyMatch;
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return isNaN(dt.getTime()) ? null : dt;
    }
    const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(str);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const getDayOfYear = (d: Date) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const currentDayOfYear = getDayOfYear(now);

  const lastYearAllClosed = escrows.filter(
    e => e.status === 'Closed' && getEscrowYear(e) === lastYear
  );
  const hasLastYearData = lastYearAllClosed.length > 0;

  // Filter closed escrows from last year that closed on or before the current day of year (apples-to-apples YTD)
  const lastYearClosedEscrowsYtd = lastYearAllClosed.filter(e => {
    const dt = parseClosingDate(e);
    if (!dt) return true;
    return getDayOfYear(dt) <= currentDayOfYear;
  });

  const lastYearUnits = lastYearClosedEscrowsYtd.length;
  const lastYearVolume = lastYearClosedEscrowsYtd.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
  const lastYearCommission = lastYearClosedEscrowsYtd.reduce((sum, e) => sum + (Number(e.netCommission) || 0), 0);
  const lastYearGci = lastYearClosedEscrowsYtd.reduce((sum, e) => {
    if (e.grossCommission !== undefined && e.grossCommission !== null) return sum + Number(e.grossCommission);
    if (e.price && e.commissionPercent) return sum + (Number(e.price) * Number(e.commissionPercent)) / 100;
    return sum + (Number(e.netCommission) || 0);
  }, 0);
  const lastYearAvgPricePoint = lastYearUnits > 0 ? Math.round(lastYearVolume / lastYearUnits) : 0;

  // Helper to calculate clean percentage change
  const calcPercent = (current: number, past: number, hasData: boolean): number => {
    if (!hasData) return current > 0 ? 100 : 0;
    if (past === 0) return current > 0 ? 100 : 0;
    return ((current - past) / past) * 100;
  };

  // Compute comparisons
  const volumeComparison = {
    diff: closedVolume - lastYearVolume,
    percent: calcPercent(closedVolume, lastYearVolume, hasLastYearData),
    hasLastYearData,
    lastYearVal: lastYearVolume
  };

  const commissionComparison = {
    diff: closedCommission - lastYearCommission,
    percent: calcPercent(closedCommission, lastYearCommission, hasLastYearData),
    hasLastYearData,
    lastYearVal: lastYearCommission
  };

  const unitsComparison = {
    diff: closedYtd - lastYearUnits,
    percent: calcPercent(closedYtd, lastYearUnits, hasLastYearData),
    hasLastYearData,
    lastYearVal: lastYearUnits
  };

  const gciComparison = {
    diff: totalGci - lastYearGci,
    percent: calcPercent(totalGci, lastYearGci, hasLastYearData),
    hasLastYearData,
    lastYearVal: lastYearGci
  };

  const avgPriceComparison = {
    diff: avgPricePoint - lastYearAvgPricePoint,
    percent: calcPercent(avgPricePoint, lastYearAvgPricePoint, hasLastYearData),
    hasLastYearData,
    lastYearVal: lastYearAvgPricePoint
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#e5e5ea] overflow-x-hidden w-full max-w-full min-w-0">
      <div className="max-w-7xl mx-auto space-y-3 min-w-0 w-full max-w-full overflow-hidden">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Closed Commission Card */}
          <div className="h-[74px] sm:h-[80px] bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] rounded-2xl px-3 sm:px-4 flex flex-col items-center justify-center min-w-0 text-center transition-all hover:border-[#cbd5e1]">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.8px] text-black mb-1 truncate w-full">
              Net Closed ({actualYear})
            </div>
            <div className="text-lg sm:text-2xl xl:text-[25px] font-black text-[#0f172a] tracking-tight leading-none truncate w-full">
              {formatCurrency(closedCommission)}
            </div>
          </div>

          {/* Pending Commission Card */}
          <div className="h-[74px] sm:h-[80px] bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] rounded-2xl px-3 sm:px-4 flex flex-col items-center justify-center min-w-0 text-center transition-all hover:border-[#cbd5e1]">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.8px] text-black mb-1 truncate w-full">
              Net Pending
            </div>
            <div className="text-lg sm:text-2xl xl:text-[25px] font-black text-[#0f172a] tracking-tight leading-none truncate w-full">
              {formatCurrency(pendingCommission)}
            </div>
          </div>

          {/* Open Escrows */}
          <div className="h-[74px] sm:h-[80px] bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] rounded-2xl px-3 sm:px-4 flex flex-col items-center justify-center min-w-0 text-center transition-all hover:border-[#cbd5e1]">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.8px] text-black mb-1 truncate w-full">
              Open Escrows
            </div>
            <div className="text-xl sm:text-2xl xl:text-[25px] font-black text-[#0f172a] tracking-tight leading-none">
              {openCount}
            </div>
          </div>

          {/* Closed Escrows */}
          <div className="h-[74px] sm:h-[80px] bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] rounded-2xl px-3 sm:px-4 flex flex-col items-center justify-center min-w-0 text-center transition-all hover:border-[#cbd5e1]">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.8px] text-black mb-1 truncate w-full">
              Closed Escrows
            </div>
            <div className="text-xl sm:text-2xl xl:text-[25px] font-black text-[#0f172a] tracking-tight leading-none">
              {closedYtd}
            </div>
          </div>
        </div>

        {/* Live Goals Bar */}
        <div className="w-full max-w-full min-w-0 overflow-hidden">
          <StockMarketGoalsBar 
            onOpenGoals={onOpenGoals}
            actualYear={actualYear}
            isUnitsOnTrack={isUnitsOnTrack}
            unitsStatusText={unitsStatusText}
            closedYtd={closedYtd}
            goalTargetUnits={goalTargetUnits}
            isIncomeOnTrack={isIncomeOnTrack}
            incomeStatusText={incomeStatusText}
            closedCommission={closedCommission}
            goalTargetIncome={goalTargetIncome}
            remainingUnitsNeeded={remainingUnitsNeeded}
            remainingCommissionNeeded={remainingCommissionNeeded}
            monthlyUnitsNeeded={monthlyUnitsNeeded}
            monthlyIncomeNeeded={monthlyIncomeNeeded}
            avgPricePoint={avgPricePoint}
            daysRemaining={daysRemaining}
            totalGci={totalGci}
            closedVolume={closedVolume}
            volumeComparison={volumeComparison}
            commissionComparison={commissionComparison}
            unitsComparison={unitsComparison}
            gciComparison={gciComparison}
            avgPriceComparison={avgPriceComparison}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
    </div>
  );
}


