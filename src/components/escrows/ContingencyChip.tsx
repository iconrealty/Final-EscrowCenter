import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCircle2 } from 'lucide-react';

export function ContingencyChip({ 
  taskKey,
  label, 
  isDone, 
  isOverdue, 
  onClick,
  readOnly = false,
  daysLeft = null,
  dueDate = null
}: { 
  key?: string | number;
  taskKey: string;
  label: string; 
  isDone: boolean; 
  isOverdue: boolean; 
  onClick?: () => void;
  readOnly?: boolean;
  daysLeft?: number | null;
  dueDate?: Date | null;
}) {
  const expDateStr = dueDate ? format(dueDate, 'MMM d') : null;
  const isUrgent = isOverdue || (daysLeft !== null && daysLeft !== undefined && daysLeft <= 2);
  const isApproaching = !isUrgent && daysLeft !== null && daysLeft !== undefined && daysLeft >= 3 && daysLeft <= 5;

  let containerClasses = "w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all duration-150 select-none shadow-xs text-left ";
  let keyBadgeClasses = "text-xs font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ";
  let labelClasses = "text-xs sm:text-sm truncate min-w-0 flex-1 ";

  if (isDone) {
    containerClasses += "bg-[#1B3A5C] border-[#1B3A5C] text-white shadow-xs";
    if (!readOnly) {
      containerClasses += " hover:bg-[#152e4a] cursor-pointer active:scale-[0.99]";
    }
    keyBadgeClasses += "bg-white/20 text-white";
    labelClasses += "font-bold text-white";
  } else if (isUrgent) {
    containerClasses += "bg-rose-50 border-rose-200/90 text-slate-900 shadow-xs";
    if (!readOnly) {
      containerClasses += " hover:bg-rose-100/70 hover:border-rose-300 cursor-pointer active:scale-[0.99]";
    }
    keyBadgeClasses += "bg-rose-200/90 text-rose-900";
    labelClasses += "font-bold text-slate-900";
  } else if (isApproaching) {
    containerClasses += "bg-amber-50/70 border-amber-200 text-slate-900 shadow-xs";
    if (!readOnly) {
      containerClasses += " hover:bg-amber-100/60 hover:border-amber-300 cursor-pointer active:scale-[0.99]";
    }
    keyBadgeClasses += "bg-amber-200/90 text-amber-900";
    labelClasses += "font-bold text-slate-900";
  } else {
    containerClasses += "bg-white border-slate-200 text-slate-900 shadow-xs";
    if (!readOnly) {
      containerClasses += " hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer active:scale-[0.99]";
    }
    keyBadgeClasses += "bg-slate-100 text-slate-700";
    labelClasses += "font-semibold text-slate-800";
  }

  // Right-hand status badge text
  let statusBadgeContent: React.ReactNode = null;

  if (isDone) {
    statusBadgeContent = (
      <span className="text-xs font-bold bg-white/15 text-emerald-300 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <Check size={13} strokeWidth={3} className="text-emerald-300" />
        <span>Removed</span>
        {expDateStr && <span className="text-white/70 font-normal text-[11px]">({expDateStr})</span>}
      </span>
    );
  } else if (isUrgent) {
    let statusText = '';
    if (daysLeft !== null && daysLeft !== undefined) {
      if (daysLeft < 0) statusText = `${Math.abs(daysLeft)}d overdue`;
      else if (daysLeft === 0) statusText = 'Due today';
      else if (daysLeft === 1) statusText = '1d left';
      else statusText = `${daysLeft}d left`;
    } else {
      statusText = 'Urgent';
    }

    statusBadgeContent = (
      <span className="text-xs font-bold bg-white border border-rose-200 text-rose-700 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        {expDateStr && <span className="text-slate-700 font-semibold">{expDateStr}</span>}
        <span className="font-extrabold text-rose-600">({statusText})</span>
      </span>
    );
  } else if (isApproaching) {
    const statusText = `${daysLeft}d left`;
    statusBadgeContent = (
      <span className="text-xs font-bold bg-white border border-amber-200 text-amber-800 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        {expDateStr && <span className="text-slate-700 font-semibold">{expDateStr}</span>}
        <span className="font-extrabold text-amber-700">({statusText})</span>
      </span>
    );
  } else {
    statusBadgeContent = (
      <span className="text-xs font-bold bg-slate-100 border border-slate-200/70 text-slate-700 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 whitespace-nowrap">
        {expDateStr && <span className="text-slate-700 font-medium">{expDateStr}</span>}
        {daysLeft !== null && daysLeft !== undefined ? (
          <span className="font-bold text-emerald-700">({daysLeft}d left)</span>
        ) : !expDateStr ? (
          <span>Active</span>
        ) : null}
      </span>
    );
  }

  const tooltipTitle = dueDate 
    ? `${label} (${taskKey}) - Due: ${format(dueDate, 'EEE, MMM d, yyyy')}${daysLeft !== null && daysLeft !== undefined ? ` • ${daysLeft}d left` : ''}${isDone ? ' • Marked Removed' : ' • Click to mark removed'}`
    : `${label} (${taskKey})${isDone ? ' • Marked Removed' : ' • Click to mark removed'}`;

  const content = (
    <>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isDone ? (
          <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
        ) : isUrgent ? (
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
        ) : isApproaching ? (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
        )}
        <span className={keyBadgeClasses}>{taskKey}</span>
        <span className={labelClasses}>{label}</span>
      </div>
      {statusBadgeContent}
    </>
  );

  const elementId = `contingency-chip-${taskKey.toLowerCase()}`;

  if (readOnly) {
    return (
      <div id={elementId} className={containerClasses} title={tooltipTitle}>
        {content}
      </div>
    );
  }

  return (
    <button
      id={elementId}
      type="button"
      onClick={onClick}
      className={containerClasses}
      title={tooltipTitle}
    >
      {content}
    </button>
  );
}

