import React from 'react';
import { Escrow, ALL_TASKS } from '../../types';
import { Trash2, Calendar, User, CheckCircle2, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { StatusBadge } from '../shared/StatusBadge';

interface ChecklistTableProps {
  escrows: Escrow[];
  onSelectEscrow: (escrow: Escrow) => void;
  onDeleteEscrow: (id: string) => void;
}

export function ChecklistTable({ escrows, onSelectEscrow, onDeleteEscrow }: ChecklistTableProps) {
  const sortedEscrows = [...escrows].sort(
    (a, b) => new Date(a.coeDate || 0).getTime() - new Date(b.coeDate || 0).getTime()
  );

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#e5e5ea] overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-[#f5f5f7] flex justify-between items-center">
        <div>
          <h2 className="font-bold text-[#1d1d1f] text-sm sm:text-base tracking-tight">Escrow List</h2>
          <p className="text-xs text-[#86868b] mt-0.5">Click any escrow to view details and update tasks</p>
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-2.5 py-1 rounded-full">
          {sortedEscrows.length} {sortedEscrows.length === 1 ? 'Escrow' : 'Escrows'}
        </span>
      </div>

      {sortedEscrows.length === 0 ? (
        <div className="p-12 text-center text-[#86868b] text-sm font-medium">
          No escrows found in this view.
        </div>
      ) : (
        <div className="divide-y divide-[#e5e5ea]">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-[#86868b] border-b border-[#e5e5ea]">
            <div className="col-span-4">Address / Escrow #</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2">COE Date</div>
            <div className="col-span-2">Task Progress</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* List of Escrows */}
          {sortedEscrows.map((escrow) => {
            const completed = ALL_TASKS.filter((t) => escrow.tasks[t.key]).length;
            const totalTasks = ALL_TASKS.length;
            const pct = Math.round((completed / totalTasks) * 100);
            
            const coeFormatted = escrow.coeDate
              ? format(parseISO(escrow.coeDate), 'MMM d, yyyy')
              : 'N/A';

            return (
              <div
                key={escrow.id}
                onClick={() => onSelectEscrow(escrow)}
                className="group p-4 sm:px-6 sm:py-4 hover:bg-slate-50/75 transition-all duration-150 cursor-pointer flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center relative"
              >
                {/* Mobile / Desktop Combined Address Area */}
                <div className="col-span-4 min-w-0 pr-6 md:pr-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1 md:mb-0.5">
                    {escrow.escrowNumber && (
                      <span className="font-mono text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        Escrow #{escrow.escrowNumber}
                      </span>
                    )}
                    <span className="md:hidden">
                      <StatusBadge status={escrow.status} />
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base md:text-[14px] text-[#1B3A5C] group-hover:text-[#1B3A5C]/80 transition-colors truncate" title={escrow.address}>
                    {escrow.address}
                  </h3>
                </div>

                {/* Client column */}
                <div className="col-span-2 mt-2 md:mt-0 flex items-center gap-1.5 text-xs text-[#334155] min-w-0">
                  <User size={13} className="text-[#86868b] shrink-0 md:hidden" />
                  <span className="truncate font-medium md:font-semibold">
                    {escrow.clientFirstName || escrow.clientLastName
                      ? `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim()
                      : 'Unknown Client'}
                  </span>
                </div>

                {/* COE Date Column */}
                <div className="col-span-2 mt-1 md:mt-0 flex items-center gap-1.5 text-xs text-[#334155]">
                  <Calendar size={13} className="text-[#86868b] shrink-0 md:hidden" />
                  <span className="font-mono">{coeFormatted}</span>
                </div>

                {/* Progress Bar Column */}
                <div className="col-span-2 mt-3 md:mt-0 flex flex-col gap-1 w-full max-w-md md:max-w-none">
                  <div className="flex justify-between text-[10px] font-bold text-[#86868b]">
                    <span className="md:hidden uppercase tracking-wider">Progress</span>
                    <span>{completed}/{totalTasks} Tasks ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#e5e5ea] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1B3A5C] h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Status Column (Desktop only) */}
                <div className="hidden md:flex col-span-1 justify-center">
                  <StatusBadge status={escrow.status} />
                </div>

                {/* Delete/Details Actions */}
                <div className="col-span-1 mt-3 md:mt-0 flex justify-end items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEscrow(escrow.id);
                    }}
                    className="p-2 text-[#86868b] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all inline-flex justify-center items-center active:scale-90"
                    title="Delete Escrow"
                  >
                    <Trash2 size={15} strokeWidth={2.2} />
                  </button>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all md:block hidden shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
