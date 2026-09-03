import React from 'react';
import { Check, CheckCircle2, AlertCircle } from 'lucide-react';

export const MILESTONE_DESCRIPTIONS: Record<string, string> = {
  'BRBC': 'Buyer Representation Agreement',
  'EMD': 'Earnest Money Deposit',
  'INSP': 'Property Inspection',
  'RR': 'Request for Repairs (RR)',
  'AVID': 'Agent Visual Inspection Disclosure',
  'SDR': 'Seller Disclosures Reviewed',
  'APR': 'Property Appraisal Completed',
  'Insurance': 'Homeowners Insurance Secured',
  'LFA': 'Loan Final Approval (Clear to Close)',
  'SLD': 'Escrow / Loan Docs Signed',
  'VP': 'Verification of Property Condition',
  'FWD': 'Final Wire Deposit Confirmed',
  'REC': 'Record / Close of Escrow',
};

export function MilestoneChip({ 
  taskKey,
  label, 
  description,
  isDone, 
  isOverdue, 
  onClick,
  readOnly = false
}: { 
  key?: string | number;
  taskKey?: string;
  label: string; 
  description?: string;
  isDone: boolean; 
  isOverdue: boolean; 
  onClick?: () => void;
  readOnly?: boolean;
}) {
  const displayKey = taskKey || label;
  const displayTitle = description || (taskKey ? MILESTONE_DESCRIPTIONS[taskKey] : null) || label;

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
  } else if (isOverdue) {
    containerClasses += "bg-rose-50 border-rose-200/90 text-slate-900 shadow-xs";
    if (!readOnly) {
      containerClasses += " hover:bg-rose-100/70 hover:border-rose-300 cursor-pointer active:scale-[0.99]";
    }
    keyBadgeClasses += "bg-rose-200/90 text-rose-900";
    labelClasses += "font-bold text-slate-900";
  } else {
    containerClasses += "bg-white border-slate-200 text-slate-900 shadow-xs";
    if (!readOnly) {
      containerClasses += " hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer active:scale-[0.99]";
    }
    keyBadgeClasses += "bg-slate-100 text-slate-700";
    labelClasses += "font-semibold text-slate-800";
  }

  let statusBadgeContent: React.ReactNode = null;

  if (isDone) {
    statusBadgeContent = (
      <span className="text-xs font-bold bg-white/15 text-emerald-300 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <Check size={13} strokeWidth={3} className="text-emerald-300" />
        <span>Completed</span>
      </span>
    );
  } else if (isOverdue) {
    statusBadgeContent = (
      <span className="text-xs font-bold bg-white border border-rose-200 text-rose-700 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
        <AlertCircle size={13} className="text-rose-600 shrink-0" />
        <span className="font-extrabold text-rose-600">Pending</span>
      </span>
    );
  } else {
    statusBadgeContent = (
      <span className="text-xs font-bold bg-slate-100 border border-slate-200/70 text-slate-600 px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1.5 whitespace-nowrap">
        <span>Pending</span>
      </span>
    );
  }

  const tooltipTitle = `${displayTitle} (${displayKey}) - ${isDone ? 'Marked Completed • Click to toggle' : 'Pending • Click to mark completed'}`;

  const content = (
    <>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isDone ? (
          <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
        ) : isOverdue ? (
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
        )}
        <span className={keyBadgeClasses}>{displayKey}</span>
        <span className={labelClasses} title={displayTitle}>{displayTitle}</span>
      </div>
      {statusBadgeContent}
    </>
  );

  const elementId = `milestone-chip-${displayKey.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

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

