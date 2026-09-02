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
  const incomeStatusText = isIncomeOnTrack ? 'On Track' : 'Off Track';

  // Units Status
  const isUnitsAchieved = closedYtd >= goalTargetUnits && goalTargetUnits > 0;
  const isUnitsOnTrack = isUnitsAchieved || closedYtd >= expectedUnitsPace || projectedTotalUnits >= expectedUnitsPace;
  const unitsStatusText = isUnitsOnTrack ? 'On Track' : 'Off Track';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 border-b border-[#e5e5ea] space-y-3">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Closed Commission Card */}
        <div className="h-[80px] sm:h-[88px] bg-white border border-[#e2e8f0] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] rounded-2xl px-4 py-2.5 flex flex-col justify-between min-w-0 transition-all hover:border-[#cbd5e1] group">
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.8px] text-[#64748b] truncate">
              Net Closed ({actualYear})
            </span>
            <span className="w-2 h-2 rounded-full bg-[#10b981] shrink-0" title="Closed Volume" />
          </div>
          <div className="text-lg sm:text-2xl xl:text-[26px] font-black text-[#0f172a] tracking-tight leading-none truncate">
            {formatCurrency(closedCommission)}
          </div>
        </div>

        {/* Pending Commission Card */}
        <div className="h-[80px] sm:h-[88px] bg-white border border-[#e2e8f0] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] rounded-2xl px-4 py-2.5 flex flex-col justify-between min-w-0 transition-all hover:border-[#cbd5e1] group">
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.8px] text-[#64748b] truncate">
              Net Pending
            </span>
            <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" title="Pending Volume" />
          </div>
          <div className="text-lg sm:text-2xl xl:text-[26px] font-black text-[#0f172a] tracking-tight leading-none truncate">
            {formatCurrency(pendingCommission)}
          </div>
        </div>

        {/* Open Escrows */}
        <div className="h-[80px] sm:h-[88px] bg-white border border-[#e2e8f0] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] rounded-2xl px-4 py-2.5 flex flex-col justify-between min-w-0 transition-all hover:border-[#cbd5e1] group">
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.8px] text-[#64748b] truncate">
              Open Escrows
            </span>
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0" title="Active Escrows" />
          </div>
          <div className="text-xl sm:text-2xl xl:text-[26px] font-black text-[#0f172a] tracking-tight leading-none">
            {openCount}
          </div>
        </div>

        {/* Closed Escrows */}
        <div className="h-[80px] sm:h-[88px] bg-white border border-[#e2e8f0] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] rounded-2xl px-4 py-2.5 flex flex-col justify-between min-w-0 transition-all hover:border-[#cbd5e1] group">
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.8px] text-[#64748b] truncate">
              Closed Escrows
            </span>
            <span className="w-2 h-2 rounded-full bg-[#8b5cf6] shrink-0" title="Closed Units" />
          </div>
          <div className="text-xl sm:text-2xl xl:text-[26px] font-black text-[#0f172a] tracking-tight leading-none">
            {closedYtd}
          </div>
        </div>
      </div>

      {/* Long Goals Bar Below the Cards */}
      <button
        onClick={onOpenGoals}
        className="w-full bg-white hover:bg-slate-100/80 border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-start gap-2.5 sm:gap-5 cursor-pointer group transition-all text-left"
        title="Click to view Goals & Performance Tracker"
      >
        <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
          <span className="text-xs font-black uppercase tracking-[1px] text-[#1B3A5C]">
            {actualYear}
          </span>
          <span className="text-[10px] text-slate-400 font-bold sm:hidden">Click to view</span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6 w-full sm:w-auto flex-wrap">
          {/* Units First */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Units:</span>
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md shadow-2xs ${
              isUnitsOnTrack ? 'bg-emerald-800 text-white' : 'bg-rose-800 text-white'
            }`}>
              {unitsStatusText}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-700">
              ({closedYtd}/{goalTargetUnits})
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Income Second */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Income:</span>
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md shadow-2xs ${
              isIncomeOnTrack ? 'bg-emerald-800 text-white' : 'bg-rose-800 text-white'
            }`}>
              {incomeStatusText}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-700">
              ({formatCurrency(closedCommission)} / {formatCurrency(goalTargetIncome)})
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}


