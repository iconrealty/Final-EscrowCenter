import React from 'react';
import { differenceInDays, parseISO } from 'date-fns';

export function DaysPill({ coeDate, status }: { coeDate: string; status: string }) {
  if (status === 'Closed' || status === 'Cancelled') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-[#86868b]">
        {status}
      </span>
    );
  }

  const days = differenceInDays(parseISO(String(coeDate || new Date().toISOString())), new Date());
  
  let bg = '';
  let text = '';

  if (days >= 7) {
    bg = 'bg-[#1B3A5C]';
    text = 'text-white';
  } else if (days >= 1) {
    bg = 'bg-[#fef3c7]';
    text = 'text-[#b45309]';
  } else {
    bg = 'bg-[#fee2e2]';
    text = 'text-[#b91c1c]';
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bg} ${text}`}>
      {days} {Math.abs(days) === 1 ? 'Day' : 'Days'}
    </span>
  );
}
