import React, { useState, useMemo } from 'react';
import { Escrow } from '../../types';
import { getEscrowYear } from '../../utils/csvUtils';
import { Calendar, DollarSign, ChevronDown, Building, Award, CheckCircle2, ChevronRight, BarChart3, Clock, Layers } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface SummaryFilterContext {
  mode: 'monthly' | 'total' | 'commission';
  selectedYear: string;
  selectedMonth: string;
  commissionYear?: string;
  commissionMonth?: string;
  suggestedStatus?: 'All' | 'Open' | 'Closed';
}

interface SalesSummaryProps {
  escrows: Escrow[];
  onSelectEscrow?: (escrow: Escrow) => void;
  filterContext?: SummaryFilterContext;
  onFilterChange?: (filter: SummaryFilterContext) => void;
  statusFilter?: 'All' | 'Open' | 'Closed';
  onStatusFilterChange?: (status: 'All' | 'Open' | 'Closed') => void;
}

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function SalesSummary({ 
  escrows, 
  onSelectEscrow, 
  filterContext, 
  onFilterChange,
  statusFilter,
  onStatusFilterChange
}: SalesSummaryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'total' | 'monthly' | 'commission'>(
    filterContext?.mode || 'monthly'
  );
  const [commissionGroup, setCommissionGroup] = useState<'monthly' | 'yearly'>('monthly');

  // Dedicated filters for Net Commission tab
  const [commissionSelectedYear, setCommissionSelectedYear] = useState<string>(
    filterContext?.commissionYear || new Date().getFullYear().toString()
  );
  const [commissionSelectedMonth, setCommissionSelectedMonth] = useState<string>(
    filterContext?.commissionMonth || 'all'
  );

  // Selected year state for the Total Amount tab (defaults to actual current year)
  const [selectedYear, setSelectedYear] = useState<string>(
    filterContext?.selectedYear || new Date().getFullYear().toString()
  );

  // Selected month state for the standard monthly tab
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (filterContext?.selectedMonth) return filterContext.selectedMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calculate smart status based on selected period
  const getSmartStatus = (mode: 'total' | 'monthly' | 'commission', year: string, month: string): 'All' | 'Open' | 'Closed' => {
    if (mode === 'total') {
      return 'Closed';
    }
    if (mode === 'commission') {
      return 'Closed';
    }
    // Monthly mode
    let openCount = 0;
    let closedCount = 0;
    escrows.forEach((e) => {
      if (e.status === 'Cancelled') return;
      if (month !== 'all' && getEscrowMonth(e) !== month) return;
      if (e.status === 'Open') openCount++;
      if (e.status === 'Closed') closedCount++;
    });

    if (openCount === 0 && closedCount > 0) return 'Closed';
    if (openCount > 0 && closedCount === 0) return 'Open';
    return statusFilter || 'Open';
  };

  const handleSubTabSwitch = (newTab: 'total' | 'monthly' | 'commission') => {
    setActiveSubTab(newTab);
    const suggested = getSmartStatus(newTab, selectedYear, selectedMonth);
    onStatusFilterChange?.(suggested);
    onFilterChange?.({
      mode: newTab,
      selectedYear,
      selectedMonth,
      commissionYear: commissionSelectedYear,
      commissionMonth: commissionSelectedMonth,
      suggestedStatus: suggested,
    });
  };

  const handleYearChange = (newYear: string) => {
    setSelectedYear(newYear);
    const suggested = getSmartStatus('total', newYear, selectedMonth);
    onStatusFilterChange?.(suggested);
    onFilterChange?.({
      mode: activeSubTab,
      selectedYear: newYear,
      selectedMonth,
      commissionYear: commissionSelectedYear,
      commissionMonth: commissionSelectedMonth,
      suggestedStatus: suggested,
    });
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    const suggested = getSmartStatus('monthly', selectedYear, newMonth);
    onStatusFilterChange?.(suggested);
    onFilterChange?.({
      mode: activeSubTab,
      selectedYear,
      selectedMonth: newMonth,
      commissionYear: commissionSelectedYear,
      commissionMonth: commissionSelectedMonth,
      suggestedStatus: suggested,
    });
  };

  const handleCommissionYearChange = (newYear: string) => {
    setCommissionSelectedYear(newYear);
    onStatusFilterChange?.('Closed');
    onFilterChange?.({
      mode: activeSubTab,
      selectedYear,
      selectedMonth,
      commissionYear: newYear,
      commissionMonth: commissionSelectedMonth,
      suggestedStatus: 'Closed',
    });
  };

  const handleCommissionMonthChange = (newMonth: string) => {
    setCommissionSelectedMonth(newMonth);
    onStatusFilterChange?.('Closed');
    onFilterChange?.({
      mode: activeSubTab,
      selectedYear,
      selectedMonth,
      commissionYear: commissionSelectedYear,
      commissionMonth: newMonth,
      suggestedStatus: 'Closed',
    });
  };

  // Helper function to extract exact YYYY-MM from escrow (Close of Escrow / COE date first, then Acceptance date)
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

  // Filter to closed escrows and sort by last date of closing (descending)
  const closedEscrows = useMemo(() => {
    return escrows
      .filter((e) => e.status === 'Closed')
      .sort((a, b) => {
        const dateA = a.coeDate || '';
        const dateB = b.coeDate || '';
        return dateB.localeCompare(dateA);
      });
  }, [escrows]);

  // Extract all unique months (YYYY-MM) from all non-cancelled escrows (both Open and Closed)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always include all 12 months for the current active year
    const now = new Date();
    const currentYear = now.getFullYear();
    for (let m = 1; m <= 12; m++) {
      monthsSet.add(`${currentYear}-${String(m).padStart(2, '0')}`);
    }

    escrows.forEach((escrow) => {
      if (escrow.status === 'Cancelled') return;
      const ym = getEscrowMonth(escrow);
      if (ym && /^\d{4}-\d{2}$/.test(ym)) {
        monthsSet.add(ym);
      }
      if (escrow.coeDate) {
        const coeYM = getEscrowMonth({ ...escrow, acceptanceDate: '' });
        if (coeYM && /^\d{4}-\d{2}$/.test(coeYM)) {
          monthsSet.add(coeYM);
        }
      }
      if (escrow.acceptanceDate) {
        const accYM = getEscrowMonth({ ...escrow, coeDate: '' });
        if (accYM && /^\d{4}-\d{2}$/.test(accYM)) {
          monthsSet.add(accYM);
        }
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [escrows]);

  // Extract all unique years (YYYY) from all escrows (excluding Cancelled)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    
    // Always ensure the active current year is an option
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    yearsSet.add(currentYear);

    escrows.forEach((escrow) => {
      if (escrow.status === 'Cancelled') return;
      const yr = getEscrowYear(escrow);
      if (yr && /^\d{4}$/.test(yr)) {
        yearsSet.add(yr);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [escrows]);

  // Parse COE date to timestamp for sorting
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

  const filteredClosedEscrows = useMemo(() => {
    let list = selectedYear === 'all'
      ? closedEscrows
      : closedEscrows.filter((e) => getEscrowYear(e) === selectedYear);

    return [...list].sort((a, b) => parseCoeTime(a.coeDate) - parseCoeTime(b.coeDate));
  }, [closedEscrows, selectedYear]);

  // Calculate Total Sales Stats based on filtered closed escrows
  const totalStats = useMemo(() => {
    const volume = filteredClosedEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
    const count = filteredClosedEscrows.length;
    const commission = filteredClosedEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
    const grossCommission = filteredClosedEscrows.reduce((sum, e) => {
      if (e.grossCommission !== undefined && e.grossCommission !== null) return sum + e.grossCommission;
      if (e.price && e.commissionPercent) return sum + (e.price * e.commissionPercent) / 100;
      return sum;
    }, 0);

    return { volume, count, commission, grossCommission };
  }, [filteredClosedEscrows]);

  // Open escrows scheduled to close in the selected month (Pending COE)
  const pendingMonthlyEscrows = useMemo(() => {
    let list = selectedMonth === 'all'
      ? escrows.filter(e => e.status === 'Open')
      : escrows.filter(e => e.status === 'Open' && getEscrowMonth(e) === selectedMonth);
    return [...list].sort((a, b) => parseCoeTime(a.coeDate) - parseCoeTime(b.coeDate));
  }, [escrows, selectedMonth]);

  // Closed escrows for the selected month
  const closedMonthlyEscrows = useMemo(() => {
    let list = selectedMonth === 'all'
      ? closedEscrows
      : closedEscrows.filter((e) => getEscrowMonth(e) === selectedMonth);
    return [...list].sort((a, b) => parseCoeTime(a.coeDate) - parseCoeTime(b.coeDate));
  }, [closedEscrows, selectedMonth]);

  // Calculate Monthly Sales Stats (Expected vs Closed)
  const monthlyStats = useMemo(() => {
    const expectedCommission = pendingMonthlyEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
    const expectedGrossCommission = pendingMonthlyEscrows.reduce((sum, e) => {
      if (e.grossCommission !== undefined && e.grossCommission !== null) return sum + e.grossCommission;
      if (e.price && e.commissionPercent) return sum + (e.price * e.commissionPercent) / 100;
      return sum;
    }, 0);
    const expectedVolume = pendingMonthlyEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
    const expectedCount = pendingMonthlyEscrows.length;

    const closedCommission = closedMonthlyEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
    const closedGrossCommission = closedMonthlyEscrows.reduce((sum, e) => {
      if (e.grossCommission !== undefined && e.grossCommission !== null) return sum + e.grossCommission;
      if (e.price && e.commissionPercent) return sum + (e.price * e.commissionPercent) / 100;
      return sum;
    }, 0);
    const closedVolume = closedMonthlyEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
    const closedCount = closedMonthlyEscrows.length;

    const totalProjectedCommission = closedCommission + expectedCommission;
    const totalProjectedGrossCommission = closedGrossCommission + expectedGrossCommission;
    const totalProjectedVolume = closedVolume + expectedVolume;
    const totalCount = closedCount + expectedCount;

    return {
      expectedCommission,
      expectedGrossCommission,
      expectedVolume,
      expectedCount,
      closedCommission,
      closedGrossCommission,
      closedVolume,
      closedCount,
      totalProjectedCommission,
      totalProjectedGrossCommission,
      totalProjectedVolume,
      totalCount,
    };
  }, [pendingMonthlyEscrows, closedMonthlyEscrows]);

  // Filtered closed escrows for the Net Commission tab based on commissionSelectedYear and commissionSelectedMonth
  const filteredCommissionEscrows = useMemo(() => {
    return closedEscrows.filter((escrow) => {
      if (commissionSelectedYear !== 'all') {
        const yr = getEscrowYear(escrow);
        if (yr !== commissionSelectedYear) return false;
      }
      if (commissionSelectedMonth !== 'all') {
        const ym = getEscrowMonth(escrow);
        if (!ym) return false;
        const parts = ym.split('-');
        if (parts.length >= 2 && parts[1] !== commissionSelectedMonth) return false;
      }
      return true;
    });
  }, [closedEscrows, commissionSelectedYear, commissionSelectedMonth]);

  // Total stats for Net Commission tab based on selected year & month
  const commissionStats = useMemo(() => {
    const net = filteredCommissionEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);
    const gross = filteredCommissionEscrows.reduce((sum, e) => {
      if (e.grossCommission !== undefined && e.grossCommission !== null) return sum + e.grossCommission;
      if (e.price && e.commissionPercent) return sum + (e.price * e.commissionPercent) / 100;
      return sum;
    }, 0);
    return {
      net,
      gross,
      count: filteredCommissionEscrows.length,
    };
  }, [filteredCommissionEscrows]);

  // Grouped breakdown for Net Commission tab (monthly / yearly)
  const commissionGroupsToRender = useMemo(() => {
    if (commissionGroup === 'yearly' && commissionSelectedMonth === 'all') {
      const yearMap = new Map<string, { label: string; amount: number; grossAmount: number; count: number }>();
      filteredCommissionEscrows.forEach((escrow) => {
        const yr = getEscrowYear(escrow) || 'Unknown';
        const net = escrow.netCommission || 0;
        const gross = escrow.grossCommission ?? (escrow.price && escrow.commissionPercent ? (escrow.price * escrow.commissionPercent) / 100 : 0);
        if (!yearMap.has(yr)) {
          yearMap.set(yr, { label: `${yr}`, amount: 0, grossAmount: 0, count: 0 });
        }
        const g = yearMap.get(yr)!;
        g.amount += net;
        g.grossAmount += gross;
        g.count += 1;
      });
      return Array.from(yearMap.entries())
        .map(([key, data]) => ({ key, ...data }))
        .sort((a, b) => b.key.localeCompare(a.key));
    }

    // Monthly grouping
    const monthMap = new Map<string, { label: string; amount: number; grossAmount: number; count: number }>();
    filteredCommissionEscrows.forEach((escrow) => {
      const ym = getEscrowMonth(escrow);
      const key = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : 'Unknown';
      let label = key;
      if (key !== 'Unknown') {
        try {
          const [y, m] = key.split('-');
          const d = new Date(Number(y), Number(m) - 1, 1);
          label = format(d, 'MMMM yyyy');
        } catch {
          label = key;
        }
      }
      const net = escrow.netCommission || 0;
      const gross = escrow.grossCommission ?? (escrow.price && escrow.commissionPercent ? (escrow.price * escrow.commissionPercent) / 100 : 0);

      if (!monthMap.has(key)) {
        monthMap.set(key, { label, amount: 0, grossAmount: 0, count: 0 });
      }
      const g = monthMap.get(key)!;
      g.amount += net;
      g.grossAmount += gross;
      g.count += 1;
    });

    return Array.from(monthMap.entries())
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredCommissionEscrows, commissionGroup, commissionSelectedMonth]);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatMonthName = (ymStr: string) => {
    if (ymStr === 'all') return 'All Time';
    try {
      const [year, month] = ymStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return format(date, 'MMMM yyyy');
    } catch {
      return ymStr;
    }
  };

  const monthlyCollectionPercent = monthlyStats.totalProjectedCommission > 0
    ? Math.min(100, Math.round((monthlyStats.closedCommission / monthlyStats.totalProjectedCommission) * 100))
    : 0;

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#e5e5ea] overflow-hidden shadow-sm flex flex-col h-full">
      {/* Top Header with Navigation Tabs */}
      <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-bold text-black text-sm sm:text-base tracking-tight">Sales Summary</h2>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => handleSubTabSwitch('monthly')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
              activeSubTab === 'monthly'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-black hover:text-black font-semibold'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => handleSubTabSwitch('total')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
              activeSubTab === 'total'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-black hover:text-black font-semibold'
            }`}
          >
            Total Sales
          </button>
          <button
            onClick={() => handleSubTabSwitch('commission')}
            className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
              activeSubTab === 'commission'
                ? 'bg-[#1B3A5C] text-white shadow-xs'
                : 'text-black hover:text-black font-semibold'
            }`}
          >
            Net Commissions
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-5 overflow-y-auto bg-white justify-between gap-4">
        {activeSubTab === 'monthly' && (
          /* MONTHLY SALES OVERVIEW */
          <div className="flex-1 flex flex-col gap-4 animate-fade-in justify-between">
            {/* Top Bar: Month Selector & Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {/* Already Received */}
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider block">
                    Already Received
                  </span>
                  <div className="mt-0.5">
                    <span className="text-lg sm:text-2xl xl:text-[25px] font-bold text-[#1d1d1f] tracking-tight leading-none">
                      {formatCurrency(monthlyStats.closedCommission)}
                    </span>
                  </div>
                </div>

                {/* Expected to Receive */}
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider block">
                    Expected ({formatMonthName(selectedMonth)})
                  </span>
                  <div className="mt-0.5">
                    <span className="text-lg sm:text-2xl xl:text-[25px] font-bold text-[#059669] tracking-tight leading-none">
                      {formatCurrency(monthlyStats.expectedCommission)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Month Selector dropdown */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="text-[11px] font-bold text-black whitespace-nowrap">Month:</span>
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-xs font-bold px-3.5 py-1.5 pr-8 rounded-xl border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Time</option>
                    {availableMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthName(ym)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 text-[#86868b] flex items-center">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider">
                  Total Projected
                </span>
                <div className="mt-1 text-base sm:text-lg font-bold text-[#1B3A5C] tracking-tight leading-none">
                  {formatCurrency(monthlyStats.totalProjectedCommission)}
                </div>
                <div className="mt-1 text-[10px] font-medium text-slate-500">
                  {monthlyStats.totalCount} total deal{monthlyStats.totalCount === 1 ? '' : 's'} in month
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider">
                  Pending / Open Volume
                </span>
                <div className="mt-1 text-base sm:text-lg font-bold text-emerald-900 tracking-tight leading-none">
                  {formatCurrency(monthlyStats.expectedVolume)}
                </div>
                <div className="mt-1 text-[10px] font-medium text-emerald-700">
                  {monthlyStats.expectedCount} pending escrow{monthlyStats.expectedCount === 1 ? '' : 's'}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider">
                  Closed Volume
                </span>
                <div className="mt-1 text-base sm:text-lg font-bold text-[#1d1d1f] tracking-tight leading-none">
                  {formatCurrency(monthlyStats.closedVolume)}
                </div>
                <div className="mt-1 text-[10px] font-medium text-slate-500">
                  {monthlyStats.closedCount} closed escrow{monthlyStats.closedCount === 1 ? '' : 's'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'total' && (
          /* TOTAL SALES VIEW */
          <div className="flex-1 flex flex-col gap-4 animate-fade-in justify-between">
            {/* Year Selector Bar */}
            <div className="flex items-center justify-between shrink-0 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 px-4">
              <span className="text-xs font-bold text-black">Annual Sales Performance</span>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-black">Year:</span>
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-xs font-bold px-3.5 py-1.5 pr-8 rounded-xl border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Time</option>
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2.5 text-[#86868b] flex items-center">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Primary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-black uppercase tracking-wider">Total Volume</span>
                <span className="text-sm sm:text-base font-bold text-[#1d1d1f] tracking-tight leading-none mt-1 truncate">
                  {formatCurrency(totalStats.volume)}
                </span>
              </div>
              <div className="bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-black uppercase tracking-wider">Closed Deals</span>
                <span className="text-sm sm:text-base font-bold text-[#1d1d1f] tracking-tight leading-none mt-1 truncate">
                  {totalStats.count}
                </span>
              </div>
              <div className="bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-black uppercase tracking-wider">Net Commissions</span>
                <span className="text-sm sm:text-base font-bold text-[#059669] tracking-tight leading-none mt-1 truncate">
                  {formatCurrency(totalStats.commission)}
                </span>
              </div>
              <div className="bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-black uppercase tracking-wider">Gross Commissions</span>
                <span className="text-sm sm:text-base font-bold text-[#1B3A5C] tracking-tight leading-none mt-1 truncate">
                  {formatCurrency(totalStats.grossCommission)}
                </span>
              </div>
            </div>

            {/* Averages & Key Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider">Avg Sale Price</span>
                <span className="text-sm sm:text-base font-bold text-[#1d1d1f] tracking-tight leading-none mt-1.5">
                  {formatCurrency(totalStats.count > 0 ? totalStats.volume / totalStats.count : 0)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-black uppercase tracking-wider">Avg Net Commission</span>
                <span className="text-sm sm:text-base font-bold text-[#059669] tracking-tight leading-none mt-1.5">
                  {formatCurrency(totalStats.count > 0 ? totalStats.commission / totalStats.count : 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'commission' && (
          /* ONLY COMMISSION ANALYTICS VIEW */
          <div className="flex-1 flex flex-col gap-3 animate-fade-in justify-between">
            {/* Top Bar with Year/Month selectors & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 px-4">
              <div>
                <span className="text-[10px] font-bold text-black uppercase tracking-wider block">
                  Net Commission Revenue
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-[#059669] tracking-tight leading-none">
                    Net: {formatCurrency(commissionStats.net)}
                  </span>
                  <span className="text-slate-300 font-normal text-xs">•</span>
                  <span className="text-xs sm:text-sm font-bold text-[#1B3A5C] tracking-tight leading-none">
                    Gross: {formatCurrency(commissionStats.gross)}
                  </span>
                </div>
              </div>
              
              {/* Year, Month Selectors and Grouping Mode */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Year Selector */}
                <div className="relative inline-flex items-center">
                  <select
                    value={commissionSelectedYear}
                    onChange={(e) => handleCommissionYearChange(e.target.value)}
                    className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-[11px] font-bold px-3 py-1.5 pr-7 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all duration-200 shadow-2xs"
                  >
                    <option value="all">All Years</option>
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2 text-[#86868b] flex items-center">
                    <ChevronDown size={11} />
                  </div>
                </div>

                {/* Month Selector */}
                <div className="relative inline-flex items-center">
                  <select
                    value={commissionSelectedMonth}
                    onChange={(e) => handleCommissionMonthChange(e.target.value)}
                    className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-[11px] font-bold px-3 py-1.5 pr-7 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all duration-200 shadow-2xs"
                  >
                    <option value="all">All Months</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-2 text-[#86868b] flex items-center">
                    <ChevronDown size={11} />
                  </div>
                </div>

                {/* Grouping Mode Toggle */}
                {commissionSelectedMonth === 'all' && (
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold">
                    <button
                      onClick={() => setCommissionGroup('monthly')}
                      className={`px-2 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                        commissionGroup === 'monthly'
                          ? 'bg-[#1B3A5C] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setCommissionGroup('yearly')}
                      className={`px-2 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                        commissionGroup === 'yearly'
                          ? 'bg-[#1B3A5C] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Yearly
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Concise Period Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
              {commissionGroupsToRender.length > 0 ? (
                commissionGroupsToRender.map((group) => (
                  <div key={group.key} className="border border-slate-200/70 rounded-xl p-2.5 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-black block truncate">{group.label}</span>
                      <span className="text-[10px] text-[#86868b] font-medium">{group.count} {group.count === 1 ? 'sale' : 'sales'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#059669] tracking-tight leading-none">Net: {formatCurrency(group.amount)}</div>
                      <div className="text-[10px] font-bold text-[#1B3A5C] tracking-tight leading-none mt-0.5">Gross: {formatCurrency(group.grossAmount)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-6 text-xs text-[#86868b]">No commission records match this filter.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
