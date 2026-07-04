import React from 'react';

export function StatusBadge({ status }: { status: string }) {
  let bg = '';
  let text = '';

  switch (status) {
    case 'Open':
      bg = 'bg-[#1B3A5C]/10';
      text = 'text-[#1B3A5C]';
      break;
    case 'Closed':
      bg = 'bg-[#1B3A5C]';
      text = 'text-white';
      break;
    case 'Cancelled':
      bg = 'bg-[#fee2e2]';
      text = 'text-[#991b1b]';
      break;
    default:
      bg = 'bg-gray-100';
      text = 'text-gray-800';
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bg} ${text}`}>
      {status}
    </span>
  );
}
