import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Escrow, AgentGoals } from '../../types';
import { useGoals, getStoredGoalsLocal, saveStoredGoalsLocal } from '../../hooks/useGoals';

// Backwards compatibility re-exports
export type { AgentGoals };
export const STORAGE_KEY_GOALS = 'munr_agent_goals';
export const getStoredGoals = getStoredGoalsLocal;
export const saveStoredGoals = saveStoredGoalsLocal;

interface GoalsModalProps {
  escrows: Escrow[];
  onClose: () => void;
}

export function GoalsModal({ escrows, onClose }: GoalsModalProps) {
  const { getGoals, updateGoals } = useGoals();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [isEditing, setIsEditing] = useState(false);

  const goals = getGoals(selectedYear);

  // Temporary edit values
  const [editCommission, setEditCommission] = useState(goals.targetCommission.toString());
  const [editDeals, setEditDeals] = useState(goals.targetDeals.toString());

  useEffect(() => {
    const loaded = getGoals(selectedYear);
    setEditCommission(loaded.targetCommission.toString());
    setEditDeals(loaded.targetDeals.toString());
    setIsEditing(false);
  }, [selectedYear, goals.targetCommission, goals.targetDeals]);

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AgentGoals = {
      year: selectedYear,
      targetCommission: Math.max(0, Number(editCommission) || 0),
      targetDeals: Math.max(0, Number(editDeals) || 0),
    };
    await updateGoals(updated);
    setIsEditing(false);
  };

  // Helper to determine escrow year
  const getEscrowYear = (escrow: Escrow): string => {
    if (escrow.coeDate) {
      const trimmed = escrow.coeDate.trim();
      if (/^\d{4}/.test(trimmed)) return trimmed.substring(0, 4);
      if (/\d{1,2}\/\d{1,2}\/(\d{4})/.test(trimmed)) {
        const match = trimmed.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
        if (match) return match[1];
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.getFullYear().toString();
    }
    if (escrow.lastUpdated) {
      const d = new Date(escrow.lastUpdated);
      if (!isNaN(d.getTime())) return d.getFullYear().toString();
    }
    return currentYear;
  };

  // Calculations for selected year
  const closedEscrows = escrows.filter(e => e.status === 'Closed' && getEscrowYear(e) === selectedYear);
  const openEscrows = escrows.filter(e => e.status === 'Open');

  const closedCommission = closedEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
  const pendingCommission = openEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
  const projectedTotalCommission = closedCommission + pendingCommission;

  const closedDeals = closedEscrows.length;
  const pendingDeals = openEscrows.length;

  const avgCommission = closedDeals > 0 ? closedCommission / closedDeals : 0;

  const closedVolume = closedEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
  const closedAvgPricePoint = closedDeals > 0 ? (closedVolume / closedDeals) : 0;

  const targetNetCommPerUnit = goals.targetDeals > 0 ? (goals.targetCommission / goals.targetDeals) : 0;

  // Effective commission rate based on actual closed volume or total escrows volume (default 2.5%)
  const allEscrowsVolume = escrows.reduce((sum, e) => sum + (e.price || 0), 0);
  const allEscrowsCommission = escrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
  const effectiveCommRate = closedVolume > 0 && closedCommission > 0
    ? (closedCommission / closedVolume)
    : (allEscrowsVolume > 0 && allEscrowsCommission > 0 ? (allEscrowsCommission / allEscrowsVolume) : 0.025);

  const targetAvgPricePoint = effectiveCommRate > 0 && targetNetCommPerUnit > 0
    ? Math.round(targetNetCommPerUnit / effectiveCommRate)
    : 0;

  // Percentage calculations
  const commPercent = goals.targetCommission > 0 ? Math.min(100, Math.round((closedCommission / goals.targetCommission) * 100)) : 0;
  const projectedCommPercent = goals.targetCommission > 0 ? Math.min(100, Math.round((projectedTotalCommission / goals.targetCommission) * 100)) : 0;

  const dealsPercent = goals.targetDeals > 0 ? Math.min(100, Math.round((closedDeals / goals.targetDeals) * 100)) : 0;
  const projectedDealsPercent = goals.targetDeals > 0 ? Math.min(100, Math.round(((closedDeals + pendingDeals) / goals.targetDeals) * 100)) : 0;

  const remainingCommissionNeeded = Math.max(0, goals.targetCommission - closedCommission);
  const remainingUnitsNeeded = Math.max(0, goals.targetDeals - closedDeals);
  const dealsNeeded = avgCommission > 0 ? Math.ceil(remainingCommissionNeeded / avgCommission) : remainingUnitsNeeded;

  // Time & Pace logic
  const now = new Date();
  const isCurrentYearSelected = selectedYear === currentYear;
  const startOfYear = new Date(Number(selectedYear), 0, 1);

  let daysPassed = 365;
  if (isCurrentYearSelected) {
    const diffTime = Math.max(0, now.getTime() - startOfYear.getTime());
    daysPassed = Math.min(365, Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
  } else if (Number(selectedYear) > Number(currentYear)) {
    daysPassed = 0;
  }

  // Monthly remaining pace calculations
  const currentMonthIndex = now.getMonth(); // 0-11
  let monthsRemaining = 12;
  if (isCurrentYearSelected) {
    monthsRemaining = Math.max(1, 12 - currentMonthIndex);
  } else if (Number(selectedYear) < Number(currentYear)) {
    monthsRemaining = 0;
  } else {
    monthsRemaining = 12;
  }

  const monthlyUnitsNeeded = monthsRemaining > 0 ? (remainingUnitsNeeded / monthsRemaining) : 0;
  const monthlyIncomeNeeded = monthsRemaining > 0 ? (remainingCommissionNeeded / monthsRemaining) : 0;

  const targetMonthlyUnits = goals.targetDeals > 0 ? (goals.targetDeals / 12) : 0;
  const targetMonthlyIncome = goals.targetCommission > 0 ? (goals.targetCommission / 12) : 0;

  const yearElapsedPercent = isCurrentYearSelected
    ? Math.round((daysPassed / 365) * 100)
    : (Number(selectedYear) < Number(currentYear) ? 100 : 0);

  const expectedCommissionPace = goals.targetCommission * (yearElapsedPercent / 100);
  const isGoalAchieved = closedCommission >= goals.targetCommission && goals.targetCommission > 0;

  let paceStatus: 'achieved' | 'on_track' | 'on_track_pipeline' | 'off_track' = 'on_track';
  if (isGoalAchieved) {
    paceStatus = 'achieved';
  } else if (closedCommission >= expectedCommissionPace) {
    paceStatus = 'on_track';
  } else if (projectedTotalCommission >= expectedCommissionPace) {
    paceStatus = 'on_track_pipeline';
  } else {
    paceStatus = 'off_track';
  }

  // Units Pace logic
  const expectedUnitsPace = goals.targetDeals * (yearElapsedPercent / 100);
  const isUnitsGoalAchieved = closedDeals >= goals.targetDeals && goals.targetDeals > 0;

  let unitsPaceStatus: 'achieved' | 'on_track' | 'on_track_pipeline' | 'off_track' = 'on_track';
  if (isUnitsGoalAchieved) {
    unitsPaceStatus = 'achieved';
  } else if (closedDeals >= expectedUnitsPace) {
    unitsPaceStatus = 'on_track';
  } else if ((closedDeals + pendingDeals) >= expectedUnitsPace) {
    unitsPaceStatus = 'on_track_pipeline';
  } else {
    unitsPaceStatus = 'off_track';
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#e5e5ea] shadow-2xl rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-scale-up">
        {/* Header - Clean Slate-50 background */}
        <div className="bg-slate-50 text-slate-900 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight leading-tight text-slate-900">Annual Goals & Performance</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer shadow-2xs"
            >
              {[currentYear, (Number(currentYear) - 1).toString(), (Number(currentYear) + 1).toString()].map(y => (
                <option key={y} value={y} className="text-slate-900 font-bold">{y} Goals</option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
          
          {/* Goals Settings / Display Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                {selectedYear} Annual Targets
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-bold text-[#1B3A5C] hover:bg-slate-200/70 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                {isEditing ? 'Cancel' : 'Edit Targets'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveGoals} className="mt-4 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Target Net Income ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={editCommission}
                      onChange={(e) => setEditCommission(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl pl-7 pr-3 py-2 text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
                      placeholder="150000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Units to Close (Deals)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editDeals}
                    onChange={(e) => setEditDeals(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
                    placeholder="12"
                    required
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 mt-1">
                  <button
                    type="submit"
                    className="bg-[#1B3A5C] hover:bg-[#11253C] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Save Targets
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Net Income</div>
                  <div className="text-lg font-medium text-[#1B3A5C] mt-0.5">
                    {formatCurrency(goals.targetCommission)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200/80 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Units to Close Goal</div>
                  <div className="text-lg font-medium text-[#1B3A5C] mt-0.5">
                    {goals.targetDeals} {goals.targetDeals === 1 ? 'unit' : 'units'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Net Income Progress Card */}
          <div className="bg-white border border-[#e5e5ea] shadow-sm rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Net Income Closed ({selectedYear})
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-semibold text-emerald-700">
                    {formatCurrency(closedCommission)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    of {formatCurrency(goals.targetCommission)} goal
                  </span>
                </div>
              </div>

              {/* Pace & Status Text Labels */}
              <div className="sm:text-right flex flex-col sm:items-end">
                {paceStatus === 'achieved' && (
                  <span className="text-xs sm:text-sm font-semibold text-emerald-600">
                    Goal Achieved!
                  </span>
                )}
                {paceStatus === 'on_track' && (
                  <span className="text-xs sm:text-sm font-semibold text-emerald-600">
                    On Track ({commPercent}%)
                  </span>
                )}
                {paceStatus === 'on_track_pipeline' && (
                  <span className="text-xs sm:text-sm font-semibold text-blue-600">
                    On Track with Pipeline ({projectedCommPercent}%)
                  </span>
                )}
                {paceStatus === 'off_track' && (
                  <span className="text-xs sm:text-sm font-semibold text-rose-600">
                    Off Track ({commPercent}% vs {yearElapsedPercent}% pace)
                  </span>
                )}
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 flex relative">
                {/* Closed progress fill */}
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, commPercent)}%` }}
                />
                {/* Pending progress fill extension */}
                {pendingCommission > 0 && goals.targetCommission > 0 && (
                  <div
                    className="h-full bg-blue-500 opacity-80 transition-all duration-500"
                    style={{
                      width: `${Math.min(100 - commPercent, Math.round((pendingCommission / goals.targetCommission) * 100))}%`
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>$0</span>
                <span>{formatCurrency(goals.targetCommission)}</span>
              </div>
            </div>

            {/* Pipeline breakdown banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Closed Income Earned</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formatCurrency(closedCommission)}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">In Escrow (Pending)</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formatCurrency(pendingCommission)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Units Closed Card */}
          <div className="bg-white border border-[#e5e5ea] shadow-sm rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Units Closed ({selectedYear})
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-semibold text-[#1B3A5C]">
                    {closedDeals}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    of {goals.targetDeals} {goals.targetDeals === 1 ? 'unit' : 'units'} goal
                  </span>
                </div>
              </div>

              {/* Pace & Status Text Labels for Units */}
              <div className="sm:text-right flex flex-col sm:items-end">
                {unitsPaceStatus === 'achieved' && (
                  <span className="text-xs sm:text-sm font-semibold text-emerald-600">
                    Goal Achieved!
                  </span>
                )}
                {unitsPaceStatus === 'on_track' && (
                  <span className="text-xs sm:text-sm font-semibold text-emerald-600">
                    On Track ({dealsPercent}%)
                  </span>
                )}
                {unitsPaceStatus === 'on_track_pipeline' && (
                  <span className="text-xs sm:text-sm font-semibold text-blue-600">
                    On Track with Pipeline ({projectedDealsPercent}%)
                  </span>
                )}
                {unitsPaceStatus === 'off_track' && (
                  <span className="text-xs sm:text-sm font-semibold text-rose-600">
                    Off Track ({dealsPercent}% vs {yearElapsedPercent}% pace)
                  </span>
                )}
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 flex relative">
                {/* Closed progress fill */}
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, dealsPercent)}%` }}
                />
                {/* Pending progress fill extension */}
                {pendingDeals > 0 && goals.targetDeals > 0 && (
                  <div
                    className="h-full bg-blue-500 opacity-80 transition-all duration-500"
                    style={{
                      width: `${Math.min(100 - dealsPercent, Math.round((pendingDeals / goals.targetDeals) * 100))}%`
                    }}
                  />
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>0 units</span>
                <span>{goals.targetDeals} {goals.targetDeals === 1 ? 'unit' : 'units'}</span>
              </div>
            </div>
          </div>

          {/* Performance Summary Box */}
          <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Agent Performance Analysis</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Units Needed / Month */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Units Needed / Month</div>
                  <div className="text-base font-semibold text-emerald-800 mt-1">
                    {monthlyUnitsNeeded > 0
                      ? `${(Math.round(monthlyUnitsNeeded * 10) / 10).toFixed(1)} / mo`
                      : 'Goal Met!'}
                  </div>
                </div>
                <div className="text-[10px] font-medium text-[#1B3A5C] mt-2">
                  {remainingUnitsNeeded > 0
                    ? `${remainingUnitsNeeded} ${remainingUnitsNeeded === 1 ? 'unit' : 'units'} left (${monthsRemaining} ${monthsRemaining === 1 ? 'month' : 'months'} remaining)`
                    : 'Target closed units reached'}
                </div>
              </div>

              {/* Net Income Needed / Month */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Net Income Needed / Month</div>
                  <div className="text-base font-semibold text-blue-700 mt-1">
                    {monthlyIncomeNeeded > 0
                      ? `${formatCurrency(monthlyIncomeNeeded)} / mo`
                      : 'Goal Met!'}
                  </div>
                </div>
                <div className="text-[10px] font-medium text-[#1B3A5C] mt-2">
                  {remainingCommissionNeeded > 0
                    ? `${formatCurrency(remainingCommissionNeeded)} left (${monthsRemaining} ${monthsRemaining === 1 ? 'month' : 'months'} remaining)`
                    : 'Target net income reached'}
                </div>
              </div>

              {/* Average Price Point */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Avg. Price Point / Unit</div>
                  <div className="text-base font-semibold text-indigo-700 mt-1">
                    {targetAvgPricePoint > 0 
                      ? formatCurrency(targetAvgPricePoint) 
                      : (closedAvgPricePoint > 0 ? formatCurrency(closedAvgPricePoint) : '$0')}
                  </div>
                </div>
                <div className="text-[10px] font-medium text-[#1B3A5C] mt-2">
                  {targetNetCommPerUnit > 0
                    ? `${formatCurrency(targetNetCommPerUnit)} avg net comm / unit (${goals.targetDeals} ${goals.targetDeals === 1 ? 'unit' : 'units'})`
                    : (closedAvgPricePoint > 0 ? `Based on ${closedDeals} closed ${closedDeals === 1 ? 'unit' : 'units'}` : 'Set annual goals to calculate')}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-[#e5e5ea] px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] font-medium text-slate-500">
            Net income is calculated directly from your closed and open escrows.
          </div>
          <button
            onClick={onClose}
            className="bg-[#1B3A5C] hover:bg-[#11253C] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
