import React, { useState, useMemo } from 'react';
import { Escrow } from '../../types';
import { getEscrowYear } from '../../utils/csvUtils';
import { Users, ChevronDown } from 'lucide-react';

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

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Calculate statistics for the selected year (Representation)
  const stats = useMemo(() => {
    let buyerCount = 0;
    let buyerVolume = 0;
    let buyerCommission = 0;

    let sellerCount = 0;
    let sellerVolume = 0;
    let sellerCommission = 0;

    let dualCount = 0;
    let dualVolume = 0;
    let dualCommission = 0;

    filteredEscrows.forEach((escrow) => {
      const rep = escrow.representation || 'Buyer';
      const vol = escrow.price || 0;
      const comm = escrow.netCommission || 0;

      if (rep === 'Seller') {
        sellerCount += 1;
        sellerVolume += vol;
        sellerCommission += comm;
      } else if (rep === 'Dual') {
        dualCount += 1;
        dualVolume += vol;
        dualCommission += comm;
      } else {
        buyerCount += 1;
        buyerVolume += vol;
        buyerCommission += comm;
      }
    });

    const total = buyerCount + sellerCount + dualCount;
    const totalVolume = buyerVolume + sellerVolume + dualVolume;
    const totalCommission = buyerCommission + sellerCommission + dualCommission;

    return {
      total,
      totalVolume,
      totalCommission,
      buyer: {
        count: buyerCount,
        volume: buyerVolume,
        commission: buyerCommission,
        percent: total > 0 ? (buyerCount / total) * 100 : 0,
      },
      seller: {
        count: sellerCount,
        volume: sellerVolume,
        commission: sellerCommission,
        percent: total > 0 ? (sellerCount / total) * 100 : 0,
      },
      dual: {
        count: dualCount,
        volume: dualVolume,
        commission: dualCommission,
        percent: total > 0 ? (dualCount / total) * 100 : 0,
      },
    };
  }, [filteredEscrows]);

  // Calculate statistics for Lead Source
  const sourceStats = useMemo(() => {
    const sourceBuckets: { [key: string]: { label: string; count: number; volume: number; commission: number; color: string } } = {
      Zillow: { label: 'Zillow', count: 0, volume: 0, commission: 0, color: '#006AFF' },
      Self: { label: 'Self', count: 0, volume: 0, commission: 0, color: '#059669' },
      'Team Lead': { label: 'Team Lead', count: 0, volume: 0, commission: 0, color: '#8B5CF6' },
      Opcity: { label: 'Opcity', count: 0, volume: 0, commission: 0, color: '#F59E0B' },
      Other: { label: 'Other', count: 0, volume: 0, commission: 0, color: '#1B3A5C' },
    };

    filteredEscrows.forEach((escrow) => {
      const src = escrow.leadSource || 'Zillow';
      const vol = escrow.price || 0;
      const comm = escrow.netCommission || 0;

      if (sourceBuckets[src]) {
        sourceBuckets[src].count += 1;
        sourceBuckets[src].volume += vol;
        sourceBuckets[src].commission += comm;
      } else {
        sourceBuckets['Other'].count += 1;
        sourceBuckets['Other'].volume += vol;
        sourceBuckets['Other'].commission += comm;
      }
    });

    const total = Object.values(sourceBuckets).reduce((acc, curr) => acc + curr.count, 0);
    const totalVolume = Object.values(sourceBuckets).reduce((acc, curr) => acc + curr.volume, 0);
    const totalCommission = Object.values(sourceBuckets).reduce((acc, curr) => acc + curr.commission, 0);

    const sources = Object.entries(sourceBuckets).map(([key, data]) => ({
      key,
      ...data,
      percent: total > 0 ? (data.count / total) * 100 : 0,
    }));

    return {
      total,
      totalVolume,
      totalCommission,
      sources,
    };
  }, [filteredEscrows]);

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden flex flex-col h-full shadow-sm">
      {/* Top Header with Navigation Tabs & Year Selector */}
      <div className="px-4 sm:px-5 py-3 border-b border-[#e5e5ea] bg-slate-50 flex flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 max-w-full overflow-hidden">
          {/* Sub-tabs for Representation vs Lead Source */}
          <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
            <button
              onClick={() => setViewMode('rep')}
              className={`px-3 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
                viewMode === 'rep'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              Representation
            </button>
            <button
              onClick={() => setViewMode('source')}
              className={`px-3 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
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
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between bg-white overflow-y-auto">
        {stats.total > 0 ? (
          <div className="flex flex-col gap-4 sm:gap-5 justify-between h-full">
            {/* Elegant Hero Stats Bar */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">
                  {selectedYear === 'all' ? 'All Time Volume' : `${selectedYear} Volume`}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-[#1d1d1f] tracking-tight leading-none">
                    {stats.total}
                  </span>
                  <span className="text-xs text-[#86868b] font-bold uppercase tracking-wide">
                    {stats.total === 1 ? 'Escrow' : 'Escrows'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs sm:text-sm font-black text-[#1d1d1f] tracking-tight leading-none">
                  Vol: {formatCurrency(viewMode === 'rep' ? stats.totalVolume : sourceStats.totalVolume)}
                </div>
                <div className="text-[11px] sm:text-xs font-black text-[#059669] tracking-tight leading-none mt-1">
                  Comm: {formatCurrency(viewMode === 'rep' ? stats.totalCommission : sourceStats.totalCommission)}
                </div>
              </div>
            </div>

            {/* Pristine Minimalist Progress Tracks */}
            {viewMode === 'rep' ? (
              <div className="flex flex-col gap-3.5 my-auto">
                {/* Buyer Track */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#1B3A5C] shrink-0" />
                      <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-black tracking-tight leading-none shrink-0">
                        {stats.buyer.count}
                      </span>
                      <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase truncate">
                        Buyer Rep
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
                      <span className="text-[#1d1d1f] font-black tracking-tight">
                        {formatCurrency(stats.buyer.volume)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[#059669] font-black tracking-tight">
                        {formatCurrency(stats.buyer.commission)}
                      </span>
                      <span className="text-[10px] text-[#1B3A5C] font-black tracking-tight">
                        ({Math.round(stats.buyer.percent)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${stats.buyer.percent}%` }} 
                      className="bg-[#1B3A5C] h-full rounded-full transition-all duration-500" 
                    />
                  </div>
                </div>

                {/* Seller Track */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#059669] shrink-0" />
                      <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-black tracking-tight leading-none shrink-0">
                        {stats.seller.count}
                      </span>
                      <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase truncate">
                        Seller Rep
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
                      <span className="text-[#1d1d1f] font-black tracking-tight">
                        {formatCurrency(stats.seller.volume)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[#059669] font-black tracking-tight">
                        {formatCurrency(stats.seller.commission)}
                      </span>
                      <span className="text-[10px] text-[#059669] font-black tracking-tight">
                        ({Math.round(stats.seller.percent)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${stats.seller.percent}%` }} 
                      className="bg-[#059669] h-full rounded-full transition-all duration-500" 
                    />
                  </div>
                </div>

                {/* Dual Track */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#11253C] shrink-0" />
                      <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-black tracking-tight leading-none shrink-0">
                        {stats.dual.count}
                      </span>
                      <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase truncate">
                        Dual Rep
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
                      <span className="text-[#1d1d1f] font-black tracking-tight">
                        {formatCurrency(stats.dual.volume)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[#059669] font-black tracking-tight">
                        {formatCurrency(stats.dual.commission)}
                      </span>
                      <span className="text-[10px] text-[#1B3A5C] font-black tracking-tight">
                        ({Math.round(stats.dual.percent)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${stats.dualPercent || stats.dual.percent}%` }} 
                      className="bg-[#11253C] h-full rounded-full transition-all duration-500" 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 my-auto max-h-[190px] overflow-y-auto pr-1">
                {sourceStats.sources.filter((s) => s.count > 0).length > 0 ? (
                  sourceStats.sources
                    .filter((s) => s.count > 0)
                    .map((item) => (
                      <div key={item.key} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-black tracking-tight leading-none shrink-0">
                              {item.count}
                            </span>
                            <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
                            <span className="text-[#1d1d1f] font-black tracking-tight">
                              {formatCurrency(item.volume)}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[#059669] font-black tracking-tight">
                              {formatCurrency(item.commission)}
                            </span>
                            <span className="text-[10px] text-[#1B3A5C] font-black tracking-tight">
                              ({Math.round(item.percent)}%)
                            </span>
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

            {/* Bottom Subtle Note */}
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between border-t border-slate-100 pt-2 shrink-0">
              <span>Counts, total volume, and net commission</span>
              <span>Updated live</span>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-[#86868b] text-sm font-medium flex flex-col items-center gap-3 h-full justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 text-neutral-400 flex items-center justify-center shadow-sm">
              <Users size={18} />
            </div>
            <div>
              <p className="uppercase text-[10px] tracking-widest font-bold text-neutral-500">No active escrows</p>
              <p className="text-[11px] text-[#86868b] mt-1 normal-case">There are no escrow records registered for {selectedYear === 'all' ? 'All Time' : selectedYear}.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
