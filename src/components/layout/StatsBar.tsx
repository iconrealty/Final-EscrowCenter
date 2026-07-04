import React from 'react';
import { Escrow } from '../../types';
import { differenceInDays, parseISO } from 'date-fns';

export function StatsBar({ escrows }: { escrows: Escrow[] }) {
  const openEscrows = escrows.filter(e => e.status === 'Open');
  const closedEscrows = escrows.filter(e => e.status === 'Closed');
  
  const expectedSales = openEscrows.reduce((sum, e) => sum + e.price, 0);
  const expectedCommission = openEscrows.reduce((sum, e) => sum + e.netCommission, 0);
  const openCount = openEscrows.length;
  
  const closedSales = closedEscrows.reduce((sum, e) => sum + e.price, 0);
  const closedCommission = closedEscrows.reduce((sum, e) => sum + e.netCommission, 0);
  
  const closedYtd = closedEscrows.length;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const stats = [
    { label: 'Closed Commission', value: formatCurrency(closedCommission) },
    { label: 'Open', value: openCount },
    { label: 'Closed YTD', value: closedYtd },
  ];

  return (
    <div className="bg-[#f5f5f7] px-4 py-3 sm:px-6 sm:py-4 flex gap-3 sm:gap-4 overflow-x-auto border-b border-[#e5e5ea] scrollbar-none">
      {stats.map((stat, i) => (
        <div key={i} className="flex-1 min-w-[130px] sm:min-w-[140px] bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl p-2.5 sm:p-4 flex flex-col justify-center shrink-0">
          <div className="text-[9px] uppercase tracking-[0.9px] text-[#334155] font-bold mb-1 truncate" title={stat.label}>{stat.label}</div>
          <div className="text-lg sm:text-xl lg:text-2xl xl:text-[32px] font-bold font-mono text-[#FF7518] tracking-tight truncate" title={String(stat.value)}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
