import React from 'react';
import { format } from 'date-fns';

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
  let btnClasses = "flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border transition-all duration-200 select-none ";
  let dotClasses = "w-1.5 h-1.5 rounded-full ";

  if (isDone) {
    btnClasses += "bg-[#1B3A5C] border-[#1B3A5C] text-white shadow-sm";
    dotClasses += "bg-white";
  } else if (isOverdue) {
    btnClasses += "bg-amber-50 border-amber-200 text-amber-700 shadow-sm";
    if (!readOnly) {
      btnClasses += " hover:border-amber-400 hover:text-amber-800 hover:bg-amber-100/50 cursor-pointer";
    }
    dotClasses += "bg-amber-500 animate-pulse";
  } else {
    btnClasses += "bg-white border-[#e5e5ea] text-[#86868b]";
    if (!readOnly) {
      btnClasses += " hover:border-slate-300 hover:text-[#1d1d1f] hover:bg-slate-50/50 cursor-pointer";
    }
    dotClasses += "bg-[#e5e5ea]";
  }

  const expDateStr = dueDate ? format(dueDate, 'MMM d') : null;

  let formattedLabel = `${taskKey} - ${label}`;
  if (isDone) {
    formattedLabel = `DONE - ${taskKey} - ${label}${expDateStr ? ` (Exp: ${expDateStr})` : ''}`;
  } else if (daysLeft !== null && daysLeft !== undefined) {
    if (daysLeft > 1) {
      formattedLabel += expDateStr ? ` (${expDateStr} • ${daysLeft}d left)` : ` (${daysLeft} days left)`;
    } else if (daysLeft === 1) {
      formattedLabel += expDateStr ? ` (${expDateStr} • 1d left)` : ` (1 day left)`;
    } else if (daysLeft === 0) {
      formattedLabel += expDateStr ? ` (${expDateStr} • Due today)` : ` (Due today)`;
    } else if (daysLeft === -1) {
      formattedLabel += expDateStr ? ` (${expDateStr} • 1d overdue)` : ` (1 day overdue)`;
    } else {
      formattedLabel += expDateStr ? ` (${expDateStr} • ${Math.abs(daysLeft)}d overdue)` : ` (${Math.abs(daysLeft)} days overdue)`;
    }
  } else if (expDateStr) {
    formattedLabel += ` (Exp: ${expDateStr})`;
  }

  const tooltipTitle = dueDate ? `Due: ${format(dueDate, 'EEE, MMM d, yyyy')}` : undefined;

  if (readOnly) {
    return (
      <div className={btnClasses} title={tooltipTitle}>
        <span className={dotClasses}></span>
        {formattedLabel}
      </div>
    );
  }

  return (
    <button onClick={onClick} className={`${btnClasses} cursor-pointer`} title={tooltipTitle}>
      <span className={dotClasses}></span>
      {formattedLabel}
    </button>
  );
}

