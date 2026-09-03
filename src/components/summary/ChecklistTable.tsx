import React, { useState, useMemo } from 'react';
import { Escrow, ALL_TASKS } from '../../types';
import { getEscrowYear } from '../../utils/csvUtils';
import { Trash2, Calendar, User, CheckCircle2, ChevronRight, ChevronDown, Users, Filter, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '../shared/StatusBadge';
import { SummaryFilterContext } from './SalesSummary';

interface ChecklistTableProps {
  escrows: Escrow[];
  onSelectEscrow: (escrow: Escrow) => void;
  onDeleteEscrow: (id: string) => void;
  onOpenContacts?: (escrow: Escrow) => void;
  summaryFilter?: 'All' | 'Open' | 'Closed';
  onFilterChange?: (filter: 'All' | 'Open' | 'Closed') => void;
  activeFilterContext?: SummaryFilterContext;
  onSyncMonthChange?: (month: string) => void;
  onSyncYearChange?: (year: string) => void;
}

export function ChecklistTable({ 
  escrows, 
  onSelectEscrow, 
  onDeleteEscrow,
  onOpenContacts,
  summaryFilter = 'Open',
  onFilterChange,
  activeFilterContext,
  onSyncMonthChange,
  onSyncYearChange
}: ChecklistTableProps) {
  const [internalYear, setInternalYear] = useState<string>('all');
  const [internalMonth, setInternalMonth] = useState<string>('all');

  // Helper function to extract exact YYYY-MM from escrow
  const getEscrowMonth = (e: Escrow): string => {
    const dateStr = (e.coeDate || e.acceptanceDate || '').trim();
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}/.test(dateStr)) return dateStr.substring(0, 7);
    if (/^\d{4}\/\d{2}/.test(dateStr)) return dateStr.substring(0, 7).replace('/', '-');
    const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}`;
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${parsed.getFullYear()}-${m}`;
    }
    return '';
  };

  const formatMonthName = (ymStr?: string) => {
    if (!ymStr || ymStr === 'all') return 'All Time';
    try {
      const [year, month] = ymStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return format(date, 'MMMM yyyy');
    } catch {
      return ymStr;
    }
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

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    const currentYear = now.getFullYear();
    for (let m = 1; m <= 12; m++) {
      monthsSet.add(`${currentYear}-${String(m).padStart(2, '0')}`);
    }
    escrows.forEach((escrow) => {
      if (escrow.status === 'Cancelled') return;
      const ym = getEscrowMonth(escrow);
      if (ym && /^\d{4}-\d{2}$/.test(ym)) monthsSet.add(ym);
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [escrows]);

  // Determine current active filter mode & values
  const currentMode = activeFilterContext?.mode || 'monthly';
  const effectiveMonth = activeFilterContext?.selectedMonth ?? internalMonth;
  const effectiveYear = activeFilterContext?.selectedYear ?? internalYear;

  // Filter escrows based on active SalesSummary selection + summaryFilter (Open / Closed / All)
  const filteredEscrows = useMemo(() => {
    return escrows.filter((escrow) => {
      if (escrow.status === 'Cancelled') return false;

      // Status filter
      if (summaryFilter === 'Open' && escrow.status !== 'Open') return false;
      if (summaryFilter === 'Closed' && escrow.status !== 'Closed') return false;

      // Mode-based filters from SalesSummary
      if (currentMode === 'monthly') {
        if (effectiveMonth && effectiveMonth !== 'all') {
          const ym = getEscrowMonth(escrow);
          if (ym !== effectiveMonth) return false;
        }
      } else if (currentMode === 'total') {
        if (effectiveYear && effectiveYear !== 'all') {
          const yr = getEscrowYear(escrow);
          if (yr !== effectiveYear) return false;
        }
      } else if (currentMode === 'commission') {
        const commYear = activeFilterContext?.commissionYear || 'all';
        const commMonth = activeFilterContext?.commissionMonth || 'all';
        if (commYear !== 'all') {
          const yr = getEscrowYear(escrow);
          if (yr !== commYear) return false;
        }
        if (commMonth !== 'all') {
          const ym = getEscrowMonth(escrow);
          if (!ym || !ym.endsWith(`-${commMonth}`)) return false;
        }
      }

      return true;
    });
  }, [escrows, summaryFilter, currentMode, effectiveMonth, effectiveYear, activeFilterContext]);

  // Calculate counts within current period scope
  const scopeCounts = useMemo(() => {
    let open = 0;
    let closed = 0;
    let total = 0;

    escrows.forEach((escrow) => {
      if (escrow.status === 'Cancelled') return;

      if (currentMode === 'monthly') {
        if (effectiveMonth && effectiveMonth !== 'all') {
          const ym = getEscrowMonth(escrow);
          if (ym !== effectiveMonth) return;
        }
      } else if (currentMode === 'total') {
        if (effectiveYear && effectiveYear !== 'all') {
          const yr = getEscrowYear(escrow);
          if (yr !== effectiveYear) return;
        }
      } else if (currentMode === 'commission') {
        const commYear = activeFilterContext?.commissionYear || 'all';
        const commMonth = activeFilterContext?.commissionMonth || 'all';
        if (commYear !== 'all') {
          const yr = getEscrowYear(escrow);
          if (yr !== commYear) return;
        }
        if (commMonth !== 'all') {
          const ym = getEscrowMonth(escrow);
          if (!ym) return;
          const parts = ym.split('-');
          if (parts.length >= 2 && parts[1] !== commMonth) return;
        }
      }

      total++;
      if (escrow.status === 'Open') open++;
      if (escrow.status === 'Closed') closed++;
    });

    return { open, closed, total };
  }, [escrows, currentMode, effectiveMonth, effectiveYear, activeFilterContext]);

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
    return [...filteredEscrows].sort((a, b) => {
      return parseCoeTime(a.coeDate) - parseCoeTime(b.coeDate);
    });
  }, [filteredEscrows]);

  // Context title badge string
  const contextBadgeTitle = useMemo(() => {
    if (currentMode === 'monthly') {
      return effectiveMonth === 'all' ? 'All Months' : formatMonthName(effectiveMonth);
    }
    if (currentMode === 'total') {
      return effectiveYear === 'all' ? 'All Time' : `${effectiveYear}`;
    }
    if (currentMode === 'commission') {
      const cy = activeFilterContext?.commissionYear || 'All Years';
      const cm = activeFilterContext?.commissionMonth || 'all';
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mLabel = cm !== 'all' ? (monthNames[parseInt(cm, 10)] || cm) : '';
      return `${cy === 'all' ? 'All Years' : cy}${mLabel ? ` (${mLabel})` : ''}`;
    }
    return 'All Escrows';
  }, [currentMode, effectiveMonth, effectiveYear, activeFilterContext]);

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#e5e5ea] overflow-hidden shadow-sm">
      {/* Header with Title, Synchronized Scope, and Status Toggles */}
      <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold text-[#1d1d1f] text-sm sm:text-base tracking-tight">Escrow List</h2>
          <span className="text-slate-300 font-normal text-xs">•</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#1B3A5C] text-white text-[11px] font-bold uppercase shadow-2xs">
            {contextBadgeTitle}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            (Synced with Sales Summary {currentMode === 'monthly' ? 'Monthly' : currentMode === 'total' ? 'Annual' : currentMode === 'commission' ? 'Commissions' : 'Lead Source'})
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Status Quick Filter (Open / Closed / All) with Live Scope Counts */}
          {onFilterChange && (
            <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
              {(['Open', 'Closed', 'All'] as const).map((opt) => {
                const count = opt === 'Open' ? scopeCounts.open : opt === 'Closed' ? scopeCounts.closed : scopeCounts.total;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onFilterChange(opt)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      summaryFilter === opt
                        ? 'bg-[#1B3A5C] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                        summaryFilter === opt ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <span className="text-[10px] sm:text-xs font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-2.5 py-1 rounded-full shrink-0">
            {sortedEscrows.length} {sortedEscrows.length === 1 ? 'Escrow' : 'Escrows'}
          </span>
        </div>
      </div>

      {sortedEscrows.length === 0 ? (
        <div className="p-12 text-center text-[#86868b] text-sm font-medium flex flex-col items-center justify-center gap-3">
          <Clock size={28} className="text-slate-300" />
          {summaryFilter === 'Open' && scopeCounts.closed > 0 ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[#1d1d1f] font-bold text-base">No open escrows for {contextBadgeTitle}</p>
              <p className="text-xs text-slate-500 max-w-md">All {scopeCounts.closed} deals in this period have already successfully closed.</p>
              {onFilterChange && (
                <button
                  type="button"
                  onClick={() => onFilterChange('Closed')}
                  className="mt-1 px-4 py-2 bg-[#1B3A5C] hover:bg-[#152e4a] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  View {scopeCounts.closed} Closed Escrows
                </button>
              )}
            </div>
          ) : summaryFilter === 'Closed' && scopeCounts.open > 0 ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[#1d1d1f] font-bold text-base">No closed escrows yet for {contextBadgeTitle}</p>
              <p className="text-xs text-slate-500 max-w-md">There {scopeCounts.open === 1 ? 'is' : 'are'} {scopeCounts.open} pending escrow{scopeCounts.open === 1 ? '' : 's'} scheduled for this period.</p>
              {onFilterChange && (
                <button
                  type="button"
                  onClick={() => onFilterChange('Open')}
                  className="mt-1 px-4 py-2 bg-[#1B3A5C] hover:bg-[#152e4a] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  View {scopeCounts.open} Open Escrows
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p>No {summaryFilter.toLowerCase()} escrows found for <strong>{contextBadgeTitle}</strong>.</p>
              <p className="text-xs text-slate-400">Try changing the status toggle to 'All' or selecting another period in the Sales Summary above.</p>
            </div>
          )}
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
                <div className="col-span-2 mt-2 md:mt-0 flex items-center gap-1.5 text-xs text-[#334155] min-w-0 flex-wrap">
                  <User size={13} className="text-[#86868b] shrink-0 md:hidden" />
                  <span className="truncate font-medium md:font-semibold">
                    {escrow.clientFirstName || escrow.clientLastName
                      ? `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim()
                      : 'Unknown Client'}
                  </span>
                  {onOpenContacts && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenContacts(escrow);
                      }}
                      className="text-[10px] font-bold text-[#1B3A5C] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200/80 inline-flex items-center gap-0.5 cursor-pointer transition-colors shadow-2xs active:scale-95 shrink-0"
                      title="View Contacts"
                    >
                      <Users size={10} />
                      <span>Contacts</span>
                    </button>
                  )}
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
