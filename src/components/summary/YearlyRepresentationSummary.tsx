import React, { useState, useMemo } from 'react';
import { Escrow } from '../../types';
import { Calendar, Users, BarChart2, ChevronDown } from 'lucide-react';

interface YearlyRepresentationSummaryProps {
  escrows: Escrow[];
}

export function YearlyRepresentationSummary({ escrows }: YearlyRepresentationSummaryProps) {
  const currentYearStr = new Date().getFullYear().toString();

  // Extract all unique years present in escrows, ensuring the current year is included
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearStr); // Ensure current year is always available

    escrows.forEach((escrow) => {
      let year = '';
      if (escrow.coeDate && escrow.coeDate.length >= 4) {
        const parsedYear = escrow.coeDate.substring(0, 4);
        if (!isNaN(Number(parsedYear))) year = parsedYear;
      } else if (escrow.acceptanceDate && escrow.acceptanceDate.length >= 4) {
        const parsedYear = escrow.acceptanceDate.substring(0, 4);
        if (!isNaN(Number(parsedYear))) year = parsedYear;
      }
      if (year) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [escrows, currentYearStr]);

  // Default selected year is set to the present year
  const [selectedYear, setSelectedYear] = useState<string>(currentYearStr);

  // Filter escrows based on selection
  const filteredEscrows = useMemo(() => {
    return escrows.filter((escrow) => {
      let year = '';
      if (escrow.coeDate && escrow.coeDate.length >= 4) {
        year = escrow.coeDate.substring(0, 4);
      } else if (escrow.acceptanceDate && escrow.acceptanceDate.length >= 4) {
        year = escrow.acceptanceDate.substring(0, 4);
      }
      return year === selectedYear;
    });
  }, [escrows, selectedYear]);

  // Calculate statistics for the selected year
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

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden flex flex-col h-full shadow-sm">
      {/* Tesla / Apple Inspired Minimalist Header */}
      <div className="px-5 py-4 border-b border-[#e5e5ea] bg-slate-50 flex flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="font-bold text-[#1d1d1f] text-xs uppercase tracking-wider leading-none">Escrows</h2>
            <span className="text-[9px] text-[#86868b] uppercase tracking-widest block mt-1">Role Distribution</span>
          </div>
        </div>

        {/* Minimal Dropdown select control */}
        <div className="relative inline-flex items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-xs font-bold px-4 py-1.5 pr-9 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all duration-200 shadow-sm"
          >
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
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Yearly Volume</span>
                <span className="text-3xl font-extrabold text-[#1d1d1f] font-mono tracking-tight leading-none">
                  {stats.total}
                </span>
                <span className="text-xs text-[#86868b] ml-1.5 font-medium uppercase tracking-wide">
                  {stats.total === 1 ? 'Escrow' : 'Escrows'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Active Selection</span>
                <span className="text-sm font-bold text-orange-500 tracking-wide">{selectedYear}</span>
              </div>
            </div>

            {/* Pristine Minimalist Progress Tracks */}
            <div className="flex flex-col gap-4">
              {/* Buyer Track */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#059669]" />
                    <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase">Buyer Rep</span>
                  </div>
                  <div className="font-mono text-neutral-500 font-bold">
                    {stats.buyer} <span className="text-[10px] text-orange-500 font-semibold">({Math.round(stats.buyerPercent)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${stats.buyerPercent}%` }} 
                    className="bg-[#059669] h-full rounded-full transition-all duration-500" 
                  />
                </div>
              </div>

              {/* Seller Track */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase">Seller Rep</span>
                  </div>
                  <div className="font-mono text-neutral-500 font-bold">
                    {stats.seller} <span className="text-[10px] text-orange-500 font-semibold">({Math.round(stats.sellerPercent)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${stats.sellerPercent}%` }} 
                    className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                  />
                </div>
              </div>

              {/* Dual Track */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                    <span className="font-bold text-[#1d1d1f] tracking-wide text-[11px] uppercase">Dual Rep</span>
                  </div>
                  <div className="font-mono text-neutral-500 font-bold">
                    {stats.dual} <span className="text-[10px] text-orange-500 font-semibold">({Math.round(stats.dualPercent)}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${stats.dualPercent}%` }} 
                    className="bg-[#D97706] h-full rounded-full transition-all duration-500" 
                  />
                </div>
              </div>
            </div>
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
