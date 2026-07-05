import React from 'react';
import { Escrow } from '../../types';

export function StatsBar({ escrows }: { escrows: Escrow[] }) {
  const openEscrows = escrows.filter(e => e.status === 'Open');
  const closedEscrows = escrows.filter(e => e.status === 'Closed');
  
  const openCount = openEscrows.length;
  const closedCommission = closedEscrows.reduce((sum, e) => sum + e.netCommission, 0);
  const pendingCommission = openEscrows.reduce((sum, e) => sum + e.netCommission, 0);
  const closedYtd = closedEscrows.length;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-[#f5f5f7] px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-start gap-3 sm:gap-4 border-b border-[#e5e5ea] overflow-x-auto scrollbar-none">
      {/* Closed Commission Card */}
      <div className="h-[72px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-5 sm:px-6 flex flex-col justify-center shrink-0">
        <div className="text-[9px] uppercase tracking-[0.9px] text-[#1E3A8A] font-bold mb-1 truncate">Closed Commission</div>
        <div className="text-lg sm:text-xl xl:text-2xl font-bold font-mono text-[#FF7518] tracking-tight leading-none">
          {formatCurrency(closedCommission)}
        </div>
      </div>

      {/* Pending Commission Card */}
      <div className="h-[72px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-5 sm:px-6 flex flex-col justify-center shrink-0">
        <div className="text-[9px] uppercase tracking-[0.9px] text-[#1E3A8A] font-bold mb-1 truncate">Pending Commission</div>
        <div className="text-lg sm:text-xl xl:text-2xl font-bold font-mono text-[#FF7518] tracking-tight leading-none">
          {formatCurrency(pendingCommission)}
        </div>
      </div>
      
      {/* Open Escrows - Wider Badge/Tab */}
      <div className="w-[90px] h-[72px] sm:w-[110px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center shrink-0">
        <div className="text-[9px] uppercase tracking-[0.5px] text-[#1E3A8A] font-bold text-center leading-none">Open</div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-[#FF7518] mt-2 leading-none">{openCount}</div>
      </div>

      {/* Closed - Wider Badge/Tab */}
      <div className="w-[90px] h-[72px] sm:w-[110px] sm:h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center shrink-0">
        <div className="text-[9px] uppercase tracking-[0.5px] text-[#1E3A8A] font-bold text-center leading-none">Closed</div>
        <div className="text-xl sm:text-2xl font-bold font-mono text-[#FF7518] mt-2 leading-none">{closedYtd}</div>
      </div>
    </div>
  );
}

