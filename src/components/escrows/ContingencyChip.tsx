import React from 'react';
import { Check } from 'lucide-react';

export function ContingencyChip({ 
  taskKey,
  label, 
  isDone, 
  isOverdue, 
  onClick 
}: { 
  key?: string | number;
  taskKey: string;
  label: string; 
  isDone: boolean; 
  isOverdue: boolean; 
  onClick: () => void;
}) {
  let btnClasses = "flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border transition-all duration-200 select-none cursor-pointer ";
  let dotClasses = "w-1.5 h-1.5 rounded-full ";

  if (isDone) {
    btnClasses += "bg-[#1B3A5C] border-[#1B3A5C] text-white shadow-sm";
    dotClasses += "bg-white";
  } else {
    btnClasses += "bg-white border-[#e5e5ea] text-[#86868b] hover:border-slate-300 hover:text-[#1d1d1f] hover:bg-slate-50/50";
    dotClasses += "bg-[#e5e5ea]";
  }

  return (
    <button onClick={onClick} className={btnClasses}>
      <span className={dotClasses}></span>
      {taskKey} - {label}
    </button>
  );
}

