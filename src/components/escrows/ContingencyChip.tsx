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

  let mainLabel = `${taskKey} - ${label}`;
  let parenText = '';

  if (isDone) {
    mainLabel = `DONE - ${taskKey} - ${label}`;
    if (expDateStr) {
      parenText = `(Exp: ${expDateStr})`;
    }
  } else if (daysLeft !== null && daysLeft !== undefined) {
    if (daysLeft > 1) {
      parenText = expDateStr ? `(${expDateStr} • ${daysLeft}d left)` : `(${daysLeft} days left)`;
    } else if (daysLeft === 1) {
      parenText = expDateStr ? `(${expDateStr} • 1d left)` : `(1 day left)`;
    } else if (daysLeft === 0) {
      parenText = expDateStr ? `(${expDateStr} • Due today)` : `(Due today)`;
    } else if (daysLeft === -1) {
      parenText = expDateStr ? `(${expDateStr} • 1d overdue)` : `(1 day overdue)`;
    } else {
      parenText = expDateStr ? `(${expDateStr} • ${Math.abs(daysLeft)}d overdue)` : `(${Math.abs(daysLeft)} days overdue)`;
    }
  } else if (expDateStr) {
    parenText = `(Exp: ${expDateStr})`;
  }

  // Parenthesis color logic:
  // - Green if time is ok (>= 6 days left)
  // - Orange if between 4-5 days remaining (3 to 5 days left)
  // - Red if expired (< 0) or expiring on less than 2 days (<= 2 days)
  let parenColorClass = '';
  if (isDone) {
    parenColorClass = 'text-emerald-300 font-extrabold';
  } else if (daysLeft !== null && daysLeft !== undefined) {
    if (daysLeft <= 2) {
      parenColorClass = 'text-rose-600 font-extrabold';
    } else if (daysLeft >= 3 && daysLeft <= 5) {
      parenColorClass = 'text-amber-600 font-extrabold';
    } else {
      parenColorClass = 'text-emerald-600 font-extrabold';
    }
  } else if (expDateStr) {
    parenColorClass = 'text-emerald-600 font-extrabold';
  }

  const tooltipTitle = dueDate ? `Due: ${format(dueDate, 'EEE, MMM d, yyyy')}` : undefined;

  const content = (
    <>
      <span className={dotClasses}></span>
      <span>{mainLabel}</span>
      {parenText && <span className={`ml-0.5 ${parenColorClass}`}>{parenText}</span>}
    </>
  );

  if (readOnly) {
    return (
      <div className={btnClasses} title={tooltipTitle}>
        {content}
      </div>
    );
  }

  return (
    <button onClick={onClick} className={`${btnClasses} cursor-pointer`} title={tooltipTitle}>
      {content}
    </button>
  );
}

