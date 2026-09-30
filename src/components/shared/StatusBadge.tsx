import React from 'react';

export function StatusBadge({ status, onDark = false }: { status: string; onDark?: boolean }) {
  let styleClasses = '';
  const normalized = status?.trim() || '';

  if (onDark) {
    switch (normalized) {
      case 'Active':
      case 'Open':
        styleClasses = 'bg-emerald-400 text-emerald-950 border-emerald-300';
        break;
      case 'Off Market':
        styleClasses = 'bg-amber-400 text-amber-950 border-amber-300';
        break;
      case 'Pre-Listing':
        styleClasses = 'bg-sky-300 text-sky-950 border-sky-200';
        break;
      case 'Pending Offer':
      case 'Under Contract':
        styleClasses = 'bg-indigo-300 text-indigo-950 border-indigo-200';
        break;
      case 'Closed':
        styleClasses = 'bg-slate-200 text-slate-900 border-slate-300';
        break;
      case 'Cancelled':
        styleClasses = 'bg-rose-400 text-rose-950 border-rose-300';
        break;
      default:
        styleClasses = 'bg-white/20 text-white border-white/30';
    }
  } else {
    switch (normalized) {
      case 'Active':
      case 'Open':
        styleClasses = 'bg-emerald-100 text-emerald-900 border-emerald-300';
        break;
      case 'Off Market':
        styleClasses = 'bg-amber-100 text-amber-900 border-amber-300';
        break;
      case 'Pre-Listing':
        styleClasses = 'bg-sky-100 text-sky-900 border-sky-300';
        break;
      case 'Pending Offer':
      case 'Under Contract':
        styleClasses = 'bg-indigo-100 text-indigo-900 border-indigo-300';
        break;
      case 'Closed':
        styleClasses = 'bg-slate-100 text-slate-800 border-slate-300';
        break;
      case 'Cancelled':
        styleClasses = 'bg-rose-100 text-rose-800 border-rose-300';
        break;
      default:
        styleClasses = 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs shrink-0 select-none ${styleClasses}`}>
      {status}
    </span>
  );
}
