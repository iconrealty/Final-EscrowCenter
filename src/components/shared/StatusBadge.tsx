import React from 'react';

export function StatusBadge({ status, onDark = false }: { status: string; onDark?: boolean }) {
  let bg = '';
  let text = '';

  if (onDark) {
    switch (status) {
      case 'Open':
        bg = 'bg-white/20 border border-white/30';
        text = 'text-white';
        break;
      case 'Closed':
        bg = 'bg-white/30 border border-white/40';
        text = 'text-white';
        break;
      case 'Cancelled':
        bg = 'bg-rose-500/30 border border-rose-400/40';
        text = 'text-rose-100';
        break;
      default:
        bg = 'bg-white/20 border border-white/25';
        text = 'text-white';
    }
  } else {
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
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${bg} ${text}`}>
      {status}
    </span>
  );
}
