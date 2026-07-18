import React, { useState, useMemo } from 'react';
import { Escrow } from '../../types';
import { TrendingUp, Calendar, DollarSign, ChevronDown, Building, Award, CheckCircle2, ChevronRight, BarChart3 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SalesSummaryProps {
  escrows: Escrow[];
  onSelectEscrow: (escrow: Escrow) => void;
}

export function SalesSummary({ escrows, onSelectEscrow }: SalesSummaryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'total' | 'monthly' | 'commission'>('total');
  const [commissionGroup, setCommissionGroup] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

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

  // Extract all unique months (YYYY-MM) from closed escrows
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    
    // Always ensure the current month is an option
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentYM);

    closedEscrows.forEach((escrow) => {
      if (escrow.coeDate && escrow.coeDate.length >= 7) {
        const ym = escrow.coeDate.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(ym)) {
          monthsSet.add(ym);
        }
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [closedEscrows]);

  // Selected year state for the Total Amount tab (defaults to actual current year)
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return new Date().getFullYear().toString();
  });

  // Extract all unique years (YYYY) from closed escrows
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    
    // Always ensure the actual current year is an option
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    yearsSet.add(currentYear);

    closedEscrows.forEach((escrow) => {
      if (escrow.coeDate && escrow.coeDate.length >= 4) {
        const yr = escrow.coeDate.substring(0, 4);
        if (/^\d{4}$/.test(yr)) {
          yearsSet.add(yr);
        }
      }
    });

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [closedEscrows]);

  // Filter closed escrows by selected year if not "all"
  const filteredClosedEscrows = useMemo(() => {
    if (selectedYear === 'all') {
      return closedEscrows;
    }
    return closedEscrows.filter((e) => e.coeDate && e.coeDate.startsWith(selectedYear));
  }, [closedEscrows, selectedYear]);

  // Selected month state for the standard monthly tab
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calculate Total Sales Stats based on filtered closed escrows
  const totalStats = useMemo(() => {
    const volume = filteredClosedEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
    const count = filteredClosedEscrows.length;
    const commission = filteredClosedEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);

    return { volume, count, commission };
  }, [filteredClosedEscrows]);

  // Calculate Monthly Sales Stats for standard monthly tab
  const monthlyEscrows = useMemo(() => {
    return closedEscrows.filter((e) => e.coeDate && e.coeDate.startsWith(selectedMonth));
  }, [closedEscrows, selectedMonth]);

  const monthlyStats = useMemo(() => {
    const volume = monthlyEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
    const count = monthlyEscrows.length;
    const commission = monthlyEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);

    return { volume, count, commission };
  }, [monthlyEscrows]);

  // Group Commissions by Month
  const commissionByMonth = useMemo(() => {
    const groups: { [key: string]: { key: string; label: string; amount: number; count: number; escrows: Escrow[] } } = {};
    
    closedEscrows.forEach((escrow) => {
      if (escrow.coeDate && escrow.coeDate.length >= 7) {
        const ym = escrow.coeDate.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(ym)) {
          if (!groups[ym]) {
            // Format month name
            let formattedLabel = ym;
            try {
              const [year, month] = ym.split('-');
              const date = new Date(Number(year), Number(month) - 1, 1);
              formattedLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            } catch {
              // fallback
            }
            groups[ym] = { key: ym, label: formattedLabel, amount: 0, count: 0, escrows: [] };
          }
          groups[ym].amount += escrow.netCommission || 0;
          groups[ym].count += 1;
          groups[ym].escrows.push(escrow);
        }
      }
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [closedEscrows]);

  // Group Commissions by Year
  const commissionByYear = useMemo(() => {
    const groups: { [key: string]: { key: string; label: string; amount: number; count: number; escrows: Escrow[] } } = {};
    
    closedEscrows.forEach((escrow) => {
      if (escrow.coeDate && escrow.coeDate.length >= 4) {
        const yr = escrow.coeDate.substring(0, 4);
        if (/^\d{4}$/.test(yr)) {
          if (!groups[yr]) {
            groups[yr] = { key: yr, label: `${yr} Year Total`, amount: 0, count: 0, escrows: [] };
          }
          groups[yr].amount += escrow.netCommission || 0;
          groups[yr].count += 1;
          groups[yr].escrows.push(escrow);
        }
      }
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [closedEscrows]);

  const commissionGroupsToRender = useMemo(() => {
    return commissionGroup === 'monthly' ? commissionByMonth : commissionByYear;
  }, [commissionGroup, commissionByMonth, commissionByYear]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatMonthName = (ym: string) => {
    try {
      const [year, month] = ym.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  const formatItemDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const handlePeriodToggle = (key: string) => {
    if (expandedPeriod === key) {
      setExpandedPeriod(null);
    } else {
      setExpandedPeriod(key);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden flex flex-col h-full shadow-sm">
      {/* Tesla / Apple-inspired Minimalist Header with Sub-tabs */}
      <div className="px-5 py-3 border-b border-[#e5e5ea] bg-slate-50 flex flex-row items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-bold text-[#1d1d1f] text-xs uppercase tracking-wider leading-none">Sales Summary</h2>
        </div>

        {/* Minimal Sub-tabs */}
        <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold shrink-0">
          <button
            onClick={() => {
              setActiveSubTab('total');
              setExpandedPeriod(null);
            }}
            className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${
              activeSubTab === 'total'
                ? 'bg-black text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Total Amount
          </button>
          <button
            onClick={() => {
              setActiveSubTab('monthly');
              setExpandedPeriod(null);
            }}
            className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${
              activeSubTab === 'monthly'
                ? 'bg-black text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => {
              setActiveSubTab('commission');
              setExpandedPeriod(null);
            }}
            className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${
              activeSubTab === 'commission'
                ? 'bg-black text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Commissions
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {activeSubTab === 'total' && (
          /* TOTAL SALES VIEW */
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
            {/* Year Selector dropdown */}
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Select Year</span>
              
              <div className="relative inline-flex items-center">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-[11px] font-bold px-3.5 py-1.5 pr-8 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all duration-200 shadow-sm"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 text-[#86868b] flex items-center">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Volume</span>
                <span className="text-sm sm:text-base font-extrabold text-[#1d1d1f] font-mono mt-0.5 truncate">
                  {formatCurrency(totalStats.volume)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Sales Count</span>
                <span className="text-sm sm:text-base font-extrabold text-[#1d1d1f] font-mono mt-0.5 truncate">
                  {totalStats.count}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Commissions</span>
                <span className="text-sm sm:text-base font-extrabold text-[#059669] font-mono mt-0.5 truncate">
                  {formatCurrency(totalStats.commission)}
                </span>
              </div>
            </div>

            {/* List Header */}
            <div className="flex items-center text-[10px] font-bold text-[#86868b] uppercase tracking-wider border-b border-slate-100 pb-1 shrink-0">
              <span className="flex-1">Properties Closed in {selectedYear === 'all' ? 'All Years' : selectedYear} ({filteredClosedEscrows.length})</span>
              <span className="w-24 text-right shrink-0">Price</span>
              <span className="w-24 text-right shrink-0 ml-4">Commission</span>
            </div>

            {/* Scrollable list of properties */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredClosedEscrows.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {filteredClosedEscrows.map((escrow) => (
                    <div
                      key={escrow.id}
                      onClick={() => onSelectEscrow(escrow)}
                      className="group flex items-center p-2.5 rounded-xl border border-transparent hover:border-[#e5e5ea] hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="text-xs font-bold text-[#1B3A5C] truncate group-hover:text-[#1B3A5C]/80">
                          {escrow.address}
                        </div>
                        <div className="text-[10px] text-[#86868b] mt-0.5 flex items-center gap-2">
                          <span className="font-semibold truncate">
                            {escrow.clientFirstName} {escrow.clientLastName}
                            {(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim()) && ` & ${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono">{formatItemDate(escrow.coeDate)}</span>
                        </div>
                      </div>
                      <div className="text-xs font-extrabold text-[#1d1d1f] font-mono shrink-0 w-24 text-right">
                        {formatCurrency(escrow.price || 0)}
                      </div>
                      <div className="text-xs font-bold text-[#059669] font-mono shrink-0 w-24 text-right ml-4">
                        {formatCurrency(escrow.netCommission || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#86868b] text-sm font-medium flex flex-col items-center gap-3 justify-center h-full">
                  <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 text-neutral-400 flex items-center justify-center shadow-sm">
                    <Building size={16} />
                  </div>
                  <div>
                    <p className="uppercase text-[9px] tracking-widest font-bold text-neutral-500">No sales recorded</p>
                    <p className="text-[10px] text-[#86868b] mt-1 normal-case">Change an escrow status to "Closed" to see records here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'monthly' && (
          /* MONTHLY SALES VIEW */
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
            {/* Month Selector dropdown */}
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Select Month</span>
              
              <div className="relative inline-flex items-center">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-[11px] font-bold px-3.5 py-1.5 pr-8 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all duration-200 shadow-sm"
                >
                  {availableMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatMonthName(ym)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 text-[#86868b] flex items-center">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Vol ({formatMonthName(selectedMonth).split(' ')[0].substring(0, 3)})</span>
                <span className="text-sm sm:text-base font-extrabold text-[#1d1d1f] font-mono mt-0.5 truncate">
                  {formatCurrency(monthlyStats.volume)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Sales Count</span>
                <span className="text-sm sm:text-base font-extrabold text-[#1d1d1f] font-mono mt-0.5 truncate">
                  {monthlyStats.count}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Commissions</span>
                <span className="text-sm sm:text-base font-extrabold text-[#059669] font-mono mt-0.5 truncate">
                  {formatCurrency(monthlyStats.commission)}
                </span>
              </div>
            </div>

            {/* List Header */}
            <div className="flex items-center text-[10px] font-bold text-[#86868b] uppercase tracking-wider border-b border-slate-100 pb-1 shrink-0">
              <span className="flex-1">Closed in {formatMonthName(selectedMonth)} ({monthlyEscrows.length})</span>
              <span className="w-24 text-right shrink-0">Price</span>
              <span className="w-24 text-right shrink-0 ml-4">Commission</span>
            </div>

            {/* Scrollable list of properties */}
            <div className="flex-1 overflow-y-auto pr-1">
              {monthlyEscrows.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {monthlyEscrows.map((escrow) => (
                    <div
                      key={escrow.id}
                      onClick={() => onSelectEscrow(escrow)}
                      className="group flex items-center p-2.5 rounded-xl border border-transparent hover:border-[#e5e5ea] hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="text-xs font-bold text-[#1B3A5C] truncate group-hover:text-[#1B3A5C]/80">
                          {escrow.address}
                        </div>
                        <div className="text-[10px] text-[#86868b] mt-0.5 flex items-center gap-2">
                          <span className="font-semibold truncate">
                            {escrow.clientFirstName} {escrow.clientLastName}
                            {(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim()) && ` & ${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono">{formatItemDate(escrow.coeDate)}</span>
                        </div>
                      </div>
                      <div className="text-xs font-extrabold text-[#1d1d1f] font-mono shrink-0 w-24 text-right">
                        {formatCurrency(escrow.price || 0)}
                      </div>
                      <div className="text-xs font-bold text-[#059669] font-mono shrink-0 w-24 text-right ml-4">
                        {formatCurrency(escrow.netCommission || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-[#86868b] text-sm font-medium flex flex-col items-center gap-3 justify-center h-full">
                  <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 text-neutral-400 flex items-center justify-center shadow-sm">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="uppercase text-[9px] tracking-widest font-bold text-neutral-500">No monthly sales</p>
                    <p className="text-[10px] text-[#86868b] mt-1 normal-case">There are no closed escrows registered for {formatMonthName(selectedMonth)}.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'commission' && (
          /* ONLY COMMISSION ANALYTICS VIEW */
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4 animate-fade-in">
            {/* Header with Monthly/Yearly filter */}
            <div className="flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Commission Revenue</span>
                <span className="text-[13px] font-bold text-[#059669] font-mono mt-0.5 block">
                  {formatCurrency(totalStats.commission)} Total
                </span>
              </div>
              
              {/* Selector for grouping: Monthly / Yearly */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => {
                    setCommissionGroup('monthly');
                    setExpandedPeriod(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                    commissionGroup === 'monthly'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  By Month
                </button>
                <button
                  onClick={() => {
                    setCommissionGroup('yearly');
                    setExpandedPeriod(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                    commissionGroup === 'yearly'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#86868b] hover:text-[#1d1d1f]'
                  }`}
                >
                  By Year
                </button>
              </div>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between text-[10px] font-bold text-[#86868b] uppercase tracking-wider border-b border-slate-100 pb-1 shrink-0">
              <span>Period</span>
              <span>Net Commission</span>
            </div>

            {/* Scrollable list of months/years */}
            <div className="flex-1 overflow-y-auto pr-1">
              {commissionGroupsToRender.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {commissionGroupsToRender.map((group) => {
                    const isExpanded = expandedPeriod === group.key;
                    return (
                      <div key={group.key} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        {/* Period summary button */}
                        <button
                          onClick={() => handlePeriodToggle(group.key)}
                          className="w-full flex items-center justify-between p-3 hover:bg-slate-100/50 transition-all duration-200 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChevronDown
                              size={14}
                              className={`text-[#86868b] transition-transform duration-200 shrink-0 ${
                                isExpanded ? 'transform rotate-0' : 'transform -rotate-90'
                              }`}
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[#1d1d1f] block truncate">
                                {group.label}
                              </span>
                              <span className="text-[10px] text-[#86868b]">
                                {group.count} {group.count === 1 ? 'sale' : 'sales'} closed
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-[#059669] font-mono shrink-0">
                            {formatCurrency(group.amount)}
                          </span>
                        </button>

                        {/* Collapsible list of escrows in that period */}
                        {isExpanded && (
                          <div className="bg-white border-t border-slate-100/60 p-2 flex flex-col gap-1.5 animate-slide-down">
                            {group.escrows.map((escrow) => (
                              <div
                                key={escrow.id}
                                onClick={() => onSelectEscrow(escrow)}
                                className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-all duration-150 cursor-pointer"
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <div className="text-[11px] font-semibold text-[#1B3A5C] truncate group-hover:text-[#1B3A5C]/80">
                                    {escrow.address}
                                  </div>
                                  <div className="text-[9px] text-[#86868b] mt-0.5">
                                    {escrow.clientFirstName} {escrow.clientLastName} • {formatItemDate(escrow.coeDate)}
                                  </div>
                                </div>
                                <div className="text-[11px] font-bold text-[#059669] font-mono shrink-0">
                                  {formatCurrency(escrow.netCommission || 0)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-[#86868b] text-sm font-medium flex flex-col items-center gap-3 justify-center h-full">
                  <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 text-neutral-400 flex items-center justify-center shadow-sm">
                    <BarChart3 size={16} />
                  </div>
                  <div>
                    <p className="uppercase text-[9px] tracking-widest font-bold text-neutral-500">No commissions yet</p>
                    <p className="text-[10px] text-[#86868b] mt-1 normal-case">Change an escrow status to "Closed" to calculate commissions.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
