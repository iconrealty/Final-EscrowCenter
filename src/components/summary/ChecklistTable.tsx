import React, { useState, useMemo } from 'react';
import { Escrow, ALL_TASKS } from '../../types';
import { Trash2, Calendar, User, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { StatusBadge } from '../shared/StatusBadge';

interface ChecklistTableProps {
  escrows: Escrow[];
  onSelectEscrow: (escrow: Escrow) => void;
  onDeleteEscrow: (id: string) => void;
  summaryFilter?: 'All' | 'Open' | 'Closed';
  onFilterChange?: (filter: 'All' | 'Open' | 'Closed') => void;
}

export function ChecklistTable({ 
  escrows, 
  onSelectEscrow, 
  onDeleteEscrow,
  summaryFilter,
  onFilterChange 
}: ChecklistTableProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const getEscrowYear = (escrow: Escrow): string => {
    if (escrow.coeDate) {
      const trimmed = escrow.coeDate.trim();
      if (/^\d{4}/.test(trimmed)) {
        return trimmed.substring(0, 4);
      }
      if (/\d{1,2}\/\d{1,2}\/(\d{4})/.test(trimmed)) {
        const match = trimmed.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
        if (match) return match[1];
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.getFullYear().toString();
      }
    }
    if (escrow.lastUpdated) {
      const d = new Date(escrow.lastUpdated);
      if (!isNaN(d.getTime())) {
        return d.getFullYear().toString();
      }
    }
    return '';
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    escrows.forEach((e) => {
      const y = getEscrowYear(e);
      if (y) yearsSet.add(y);
    });
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [escrows]);

  const yearFilteredEscrows = useMemo(() => {
    const validEscrows = escrows.filter((e) => e.status !== 'Cancelled');
    if (selectedYear === 'all') return validEscrows;
    return validEscrows.filter((e) => getEscrowYear(e) === selectedYear);
  }, [escrows, selectedYear]);

  const parseCoeTime = (coeDate?: string): number => {
    if (!coeDate) return 0;
    const str = coeDate.trim();
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
      const [m, d, y] = str.split('/');
      return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    }
    const t = new Date(str).getTime();
    return isNaN(t) ? 0 : t;
  };

  const sortedEscrows = useMemo(() => {
    return [...yearFilteredEscrows].sort((a, b) => {
      return parseCoeTime(a.coeDate) - parseCoeTime(b.coeDate);
    });
  }, [yearFilteredEscrows]);

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#e5e5ea] overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#1d1d1f] text-sm sm:text-base tracking-tight">Escrow List</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Year Filter Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-xs font-bold px-3.5 py-1.5 pr-8 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all duration-200 shadow-sm"
            >
              <option value="all">All Time</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868b] pointer-events-none" />
          </div>

          {summaryFilter && onFilterChange && (
            <div className="inline-flex bg-neutral-200/50 p-0.5 rounded-full border border-neutral-200/40">
              {(['Open', 'Closed', 'All'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onFilterChange(opt)}
                  className={`px-3.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider transition-all duration-200 cursor-pointer ${
                    summaryFilter === opt
                      ? 'bg-black text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          <span className="text-[10px] sm:text-xs font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-2.5 py-1 rounded-full shrink-0">
            {sortedEscrows.length} {sortedEscrows.length === 1 ? 'Escrow' : 'Escrows'}
          </span>
        </div>
      </div>

      {sortedEscrows.length === 0 ? (
        <div className="p-12 text-center text-[#86868b] text-sm font-medium">
          No escrows found in this view.
        </div>
      ) : (
        <div className="divide-y divide-[#e5e5ea]">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3.5 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-[#86868b] border-b border-[#e5e5ea]">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-3">Address / Escrow #</div>
            <div className="col-span-2">Client</div>
            <div className="col-span-2">COE Date</div>
            <div className="col-span-2">Task Progress</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* List of Escrows */}
          {sortedEscrows.map((escrow, index) => {
            const completed = ALL_TASKS.filter((t) => escrow.tasks[t.key]).length;
            const totalTasks = ALL_TASKS.length;
            const pct = Math.round((completed / totalTasks) * 100);
            
            const formatItemDate = (dateStr?: string) => {
              if (!dateStr) return 'N/A';
              const trimmed = dateStr.trim();
              if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
                const [m, d, y] = trimmed.split('/');
                const date = new Date(Number(y), Number(m) - 1, Number(d));
                return format(date, 'MMM d, yyyy');
              }
              try {
                return format(parseISO(trimmed), 'MMM d, yyyy');
              } catch {
                return trimmed;
              }
            };

            const coeFormatted = formatItemDate(escrow.coeDate);

            return (
              <div
                key={escrow.id}
                onClick={() => onSelectEscrow(escrow)}
                className="group p-4 sm:px-6 sm:py-4 hover:bg-slate-50/75 transition-all duration-150 cursor-pointer flex flex-col md:grid md:grid-cols-12 md:gap-3 md:items-center relative"
              >
                {/* Index # Column */}
                <div className="col-span-1 flex items-center gap-2 mb-1.5 md:mb-0 md:justify-center">
                  <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-md bg-[#1B3A5C] text-white text-xs font-mono font-bold shadow-xs">
                    #{index + 1}
                  </span>
                </div>

                {/* Mobile / Desktop Combined Address Area */}
                <div className="col-span-3 min-w-0 pr-6 md:pr-0">
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
