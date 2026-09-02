import React from 'react';
import { Escrow } from '../../types';
import { useGoals } from '../../hooks/useGoals';
import { getEscrowYear } from '../../utils/csvUtils';

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

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#e5e5ea] space-y-3">
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

      {/* Long Goals Bar Below the Cards */}
      <button
        onClick={onOpenGoals}
        className="w-full bg-white hover:bg-slate-100/80 border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-4 py-3 cursor-pointer group transition-all text-left"
        title="Click to view Goals & Performance Tracker"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-start gap-2.5 sm:gap-5 w-full">
          {/* Year header */}
          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
            <span className="text-xs font-black uppercase tracking-[1px] text-[#1B3A5C]">
              {actualYear}
            </span>
            <span className="text-[10px] text-slate-400 font-bold sm:hidden">Click to view</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Goals Pills & Info - Side-by-side on mobile, horizontal row on desktop */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-7 w-full sm:w-auto">
            {/* Units Column / Group */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left">
              <span className="text-xs sm:text-[13px] font-black text-black uppercase tracking-wider hidden sm:inline">
                UNITS:
              </span>
              <span className={`text-xs sm:text-[13px] font-black px-3.5 py-1 rounded-lg tracking-wider shadow-xs transition-all w-full sm:w-auto text-center ${
                isUnitsOnTrack 
                  ? 'bg-[#15803d] text-white border border-[#166534]' 
                  : 'bg-[#b91c1c] text-white border border-[#991b1b]'
              }`}>
                {unitsStatusText}
              </span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[11px] font-black text-black uppercase tracking-wider sm:hidden">
                  UNITS
                </span>
                <span className="text-[11px] sm:text-[13px] font-bold text-slate-800">
                  ({closedYtd}/{goalTargetUnits})
                </span>
              </div>
            </div>

            <div className="h-5 w-px bg-slate-300 hidden sm:block shrink-0" />

            {/* Income Column / Group */}
            <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-center sm:text-left">
              <span className="text-xs sm:text-[13px] font-black text-black uppercase tracking-wider hidden sm:inline">
                INCOME:
              </span>
              <span className={`text-xs sm:text-[13px] font-black px-3.5 py-1 rounded-lg tracking-wider shadow-xs transition-all w-full sm:w-auto text-center ${
                isIncomeOnTrack 
                  ? 'bg-[#15803d] text-white border border-[#166534]' 
                  : 'bg-[#b91c1c] text-white border border-[#991b1b]'
              }`}>
                {incomeStatusText}
              </span>
              <div className="flex items-center justify-center gap-1 max-w-full">
                <span className="text-[11px] font-black text-black uppercase tracking-wider sm:hidden">
                  INCOME
                </span>
                <span className="text-[11px] sm:text-[13px] font-bold text-slate-800 truncate">
                  ({formatCurrency(closedCommission)} / {formatCurrency(goalTargetIncome)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}


