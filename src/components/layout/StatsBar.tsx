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
    <div className="bg-[#f5f5f7] px-4 py-3 sm:px-6 sm:py-4 border-b border-[#e5e5ea]">
      {/* Phone Interface: Closed Comm & Pending Comm on top, other stats underneath */}
      <div className="sm:hidden flex flex-col gap-3">
        {/* Top row: Closed Comm & Pending Comm */}
        <div className="grid grid-cols-2 gap-3">
          {/* Closed Commission Card */}
          <div className="h-[76px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-4 flex flex-col justify-center min-w-0">
            <div className="text-[9px] uppercase tracking-[0.9px] text-[#1E3A8A] font-bold mb-1 truncate">Closed Comm</div>
            <div className="text-base font-bold font-mono text-[#FF7518] tracking-tight leading-none truncate">
              {formatCurrency(closedCommission)}
            </div>
          </div>

          {/* Pending Commission Card */}
          <div className="h-[76px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-4 flex flex-col justify-center min-w-0">
            <div className="text-[9px] uppercase tracking-[0.9px] text-[#1E3A8A] font-bold mb-1 truncate">Pending Comm</div>
            <div className="text-base font-bold font-mono text-[#FF7518] tracking-tight leading-none truncate">
              {formatCurrency(pendingCommission)}
            </div>
          </div>
        </div>

        {/* Bottom row: Open & Closed */}
        <div className="grid grid-cols-2 gap-3">
          {/* Open Escrows */}
          <div className="h-[64px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center min-w-0">
            <div className="text-[9px] uppercase tracking-[0.5px] text-[#1E3A8A] font-bold text-center leading-none">Open</div>
            <div className="text-lg font-bold font-mono text-[#FF7518] mt-1.5 leading-none">{openCount}</div>
          </div>

          {/* Closed */}
          <div className="h-[64px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center min-w-0">
            <div className="text-[9px] uppercase tracking-[0.5px] text-[#1E3A8A] font-bold text-center leading-none">Closed</div>
            <div className="text-lg font-bold font-mono text-[#FF7518] mt-1.5 leading-none">{closedYtd}</div>
          </div>
        </div>
      </div>

      {/* Tablet & Desktop Interface: Single horizontal row */}
      <div className="hidden sm:flex items-center justify-start gap-4 overflow-x-auto scrollbar-none">
        {/* Closed Commission Card */}
        <div className="h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-6 flex flex-col justify-center shrink-0">
          <div className="text-[9px] uppercase tracking-[0.9px] text-[#1E3A8A] font-bold mb-1 truncate">Closed Comm</div>
          <div className="text-xl xl:text-2xl font-bold font-mono text-[#FF7518] tracking-tight leading-none">
            {formatCurrency(closedCommission)}
          </div>
        </div>

        {/* Pending Commission Card */}
        <div className="h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl px-6 flex flex-col justify-center shrink-0">
          <div className="text-[9px] uppercase tracking-[0.9px] text-[#1E3A8A] font-bold mb-1 truncate">Pending Comm</div>
          <div className="text-xl xl:text-2xl font-bold font-mono text-[#FF7518] tracking-tight leading-none">
            {formatCurrency(pendingCommission)}
          </div>
        </div>
        
        {/* Open Escrows - Wider Badge/Tab */}
        <div className="w-[110px] h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center shrink-0">
          <div className="text-[9px] uppercase tracking-[0.5px] text-[#1E3A8A] font-bold text-center leading-none">Open</div>
          <div className="text-2xl font-bold font-mono text-[#FF7518] mt-2 leading-none">{openCount}</div>
        </div>

        {/* Closed - Wider Badge/Tab */}
        <div className="w-[110px] h-[84px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl flex flex-col items-center justify-center shrink-0">
          <div className="text-[9px] uppercase tracking-[0.5px] text-[#1E3A8A] font-bold text-center leading-none">Closed</div>
          <div className="text-2xl font-bold font-mono text-[#FF7518] mt-2 leading-none">{closedYtd}</div>
        </div>
      </div>
    </div>
  );
}

