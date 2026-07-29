import React from 'react';
import { Escrow } from '../../types';
import { useGoals } from '../../hooks/useGoals';

interface StatsBarProps {
  escrows: Escrow[];
  onOpenGoals?: () => void;
}

export function StatsBar({ escrows, onOpenGoals }: StatsBarProps) {
  const actualYear = new Date().getFullYear().toString();
  const { getGoals } = useGoals();
  const storedGoals = getGoals(actualYear);

  const getEscrowYear = (escrow: Escrow): string => {
    if (escrow.coeDate) {
      const trimmed = escrow.coeDate.trim();
      if (/^\d{4}/.test(trimmed)) {
        return trimmed.substring(0, 4);
      }
      if (/\d{1,2}\/\d{1,2}\/(\d{4})/.test(trimmed)) {
        const match = trimmed.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
        if (match) return match[1];
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.getFullYear().toString();
      }
    }
    if (escrow.lastUpdated) {
      const d = new Date(escrow.lastUpdated);
      if (!isNaN(d.getTime())) {
        return d.getFullYear().toString();
      }
    }
    return actualYear;
  };

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
        <div className="h-[76px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-4 sm:px-5 flex flex-col justify-center min-w-0">
          <div className="text-[9px] uppercase tracking-[0.9px] text-black mb-1 truncate">
            Closed Comm ({actualYear})
          </div>
          <div className="text-base sm:text-xl xl:text-2xl font-mono text-black tracking-tight leading-none truncate">
            {formatCurrency(closedCommission)}
          </div>
        </div>

        {/* Pending Commission Card */}
        <div className="h-[76px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-4 sm:px-5 flex flex-col justify-center min-w-0">
          <div className="text-[9px] uppercase tracking-[0.9px] text-black mb-1 truncate">
            Pending Comm
          </div>
          <div className="text-base sm:text-xl xl:text-2xl font-mono text-black tracking-tight leading-none truncate">
            {formatCurrency(pendingCommission)}
          </div>
        </div>

        {/* Open Escrows */}
        <div className="h-[76px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center min-w-0">
          <div className="text-[9px] uppercase tracking-[0.5px] text-black text-center leading-none">
            Open
          </div>
          <div className="text-lg sm:text-2xl font-mono text-black mt-1.5 sm:mt-2 leading-none">
            {openCount}
          </div>
        </div>

        {/* Closed Escrows */}
        <div className="h-[76px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center min-w-0">
          <div className="text-[9px] uppercase tracking-[0.5px] text-black text-center leading-none">
            Closed ({actualYear})
          </div>
          <div className="text-lg sm:text-2xl font-mono text-black mt-1.5 sm:mt-2 leading-none">
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


