import React, { useState, useMemo } from 'react';
import { Escrow } from '../../types';
import { getEscrowYear } from '../../utils/csvUtils';
import { Calendar, Users, BarChart2, ChevronDown } from 'lucide-react';

interface YearlyRepresentationSummaryProps {
  escrows: Escrow[];
}

export function YearlyRepresentationSummary({ escrows }: YearlyRepresentationSummaryProps) {
  const currentYearStr = new Date().getFullYear().toString();
  const [viewMode, setViewMode] = useState<'rep' | 'source'>('rep');

  // Extract all unique years present in escrows, ensuring the current year is included
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr); // Ensure current year is always available

    escrows.forEach((escrow) => {
      if (escrow.status === 'Cancelled') return;
      const year = getEscrowYear(escrow);
      if (year && /^\d{4}$/.test(year)) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [escrows, currentYearStr]);

  // Default selected year is set to the present year
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  // Filter escrows based on selection (excluding Cancelled)
  const filteredEscrows = useMemo(() => {
    const nonCancelled = escrows.filter((e) => e.status !== 'Cancelled');
    if (selectedYear === 'all') return nonCancelled;
    return nonCancelled.filter((escrow) => getEscrowYear(escrow) === selectedYear);
  }, [escrows, selectedYear]);

  // Calculate statistics for the selected year (Representation)
  const stats = useMemo(() => {
    let buyer = 0;
    let seller = 0;
    let dual = 0;

    filteredEscrows.forEach((escrow) => {
      const rep = escrow.representation || 'Buyer';
      if (rep === 'Seller') {
        seller += 1;
      } else if (rep === 'Dual') {
        dual += 1;
      } else {
        buyer += 1;
      }
    });

    const total = buyer + seller + dual;

    return {
      total,
      buyer,
      seller,
      dual,
      buyerPercent: total > 0 ? (buyer / total) * 100 : 0,
      sellerPercent: total > 0 ? (seller / total) * 100 : 0,
      dualPercent: total > 0 ? (dual / total) * 100 : 0,
    };
  }, [filteredEscrows]);

  // Calculate statistics for Lead Source
  const sourceStats = useMemo(() => {
    let zillow = 0;
    let self = 0;
    let teamLead = 0;
    let opcity = 0;
    let other = 0;

    filteredEscrows.forEach((escrow) => {
      const src = escrow.leadSource || 'Zillow';
      if (src === 'Zillow') zillow += 1;
      else if (src === 'Self') self += 1;
      else if (src === 'Team Lead') teamLead += 1;
      else if (src === 'Opcity') opcity += 1;
      else other += 1;
    });

    const total = zillow + self + teamLead + opcity + other;

    return {
      total,
      zillow,
      self,
      teamLead,
      opcity,
      other,
      zillowPercent: total > 0 ? (zillow / total) * 100 : 0,
      selfPercent: total > 0 ? (self / total) * 100 : 0,
      teamLeadPercent: total > 0 ? (teamLead / total) * 100 : 0,
      opcityPercent: total > 0 ? (opcity / total) * 100 : 0,
      otherPercent: total > 0 ? (other / total) * 100 : 0,
    };
  }, [filteredEscrows]);

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden flex flex-col h-full shadow-sm">
      {/* Tesla / Apple Inspired Minimalist Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-[#e5e5ea] bg-slate-50 flex flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 max-w-full overflow-hidden">
          {/* Sub-tabs for Representation vs Lead Source */}
          <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
            <button
              onClick={() => setViewMode('rep')}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
                viewMode === 'rep'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Representation
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
                viewMode === 'source'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Lead Source
            </button>
          </div>
        </div>

        {/* Minimal Dropdown select control */}
        <div className="relative inline-flex items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-xs font-bold px-4 py-1.5 pr-9 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all duration-200 shadow-sm"
          >
            <option value="all">All Time</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 text-[#86868b] flex items-center">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 flex flex-col justify-center bg-white">
        {stats.total > 0 ? (
          <div className="flex flex-col gap-6">
            {/* Elegant Hero Stats Bar */}
            <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">
                  {selectedYear === 'all' ? 'All Time Volume' : 'Yearly Volume'}
                </span>
                <span className="text-3xl font-extrabold text-[#1d1d1f] font-mono tracking-tight leading-none">
                  {stats.total}
                </span>
                <span className="text-xs text-[#86868b] ml-1.5 font-medium uppercase tracking-wide">
                  {stats.total === 1 ? 'Escrow' : 'Escrows'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Category</span>
                <span className="text-sm font-bold text-[#1B3A5C] tracking-wide">
                  {viewMode === 'rep' ? 'Representation' : 'Lead Sources'}
                </span>
              </div>
            </div>

            {/* Pristine Minimalist Progress Tracks */}
            {viewMode === 'rep' ? (
              <div className="flex flex-col gap-4">
                {/* Buyer Track */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#1B3A5C]" />
                      <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase">Buyer Rep</span>
                    </div>
                    <div className="font-mono text-neutral-500 font-bold">
                      {stats.buyer} <span className="text-[10px] text-[#1B3A5C] font-semibold">({Math.round(stats.buyerPercent)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${stats.buyerPercent}%` }} 
                      className="bg-[#1B3A5C] h-full rounded-full transition-all duration-500" 
                    />
                  </div>
                </div>

                {/* Seller Track */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#059669]" />
                      <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase">Seller Rep</span>
                    </div>
                    <div className="font-mono text-neutral-500 font-bold">
                      {stats.seller} <span className="text-[10px] text-[#059669] font-semibold">({Math.round(stats.sellerPercent)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${stats.sellerPercent}%` }} 
                      className="bg-[#059669] h-full rounded-full transition-all duration-500" 
                    />
                  </div>
                </div>

                {/* Dual Track */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#11253C]" />
                      <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase">Dual Rep</span>
                    </div>
                    <div className="font-mono text-neutral-500 font-bold">
                      {stats.dual} <span className="text-[10px] text-[#1B3A5C] font-semibold">({Math.round(stats.dualPercent)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${stats.dualPercent}%` }} 
                      className="bg-[#11253C] h-full rounded-full transition-all duration-500" 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[
                  { key: 'Zillow', label: 'Zillow', count: sourceStats.zillow, percent: sourceStats.zillowPercent, color: '#006AFF' },
                  { key: 'Self', label: 'Self', count: sourceStats.self, percent: sourceStats.selfPercent, color: '#059669' },
                  { key: 'Team Lead', label: 'Team Lead', count: sourceStats.teamLead, percent: sourceStats.teamLeadPercent, color: '#8B5CF6' },
                  { key: 'Opcity', label: 'Opcity', count: sourceStats.opcity, percent: sourceStats.opcityPercent, color: '#F59E0B' },
                  { key: 'Other', label: 'Other', count: sourceStats.other, percent: sourceStats.otherPercent, color: '#1B3A5C' },
                ].filter(s => s.count > 0).length > 0 ? (
                  [
                    { key: 'Zillow', label: 'Zillow', count: sourceStats.zillow, percent: sourceStats.zillowPercent, color: '#006AFF' },
                    { key: 'Self', label: 'Self', count: sourceStats.self, percent: sourceStats.selfPercent, color: '#059669' },
                    { key: 'Team Lead', label: 'Team Lead', count: sourceStats.teamLead, percent: sourceStats.teamLeadPercent, color: '#8B5CF6' },
                    { key: 'Opcity', label: 'Opcity', count: sourceStats.opcity, percent: sourceStats.opcityPercent, color: '#F59E0B' },
                    { key: 'Other', label: 'Other', count: sourceStats.other, percent: sourceStats.otherPercent, color: '#1B3A5C' },
                  ]
                    .filter(s => s.count > 0)
                    .map((item) => (
                      <div key={item.key} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase">{item.label}</span>
                          </div>
                          <div className="font-mono text-neutral-500 font-bold">
                            {item.count} <span className="text-[10px] text-[#1B3A5C] font-semibold">({Math.round(item.percent)}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                            className="h-full rounded-full transition-all duration-500" 
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-6 text-center text-[#86868b] text-xs font-medium">
                    No lead sources found for this selection
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-[#86868b] text-sm font-medium flex flex-col items-center gap-3 h-full justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 text-neutral-400 flex items-center justify-center shadow-sm">
              <Users size={18} />
            </div>
            <div>
              <p className="uppercase text-[10px] tracking-widest font-bold text-neutral-500">No active escrows</p>
              <p className="text-[11px] text-[#86868b] mt-1 normal-case">There are no escrow records registered for {selectedYear}.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
