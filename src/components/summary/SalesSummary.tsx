import React, { useState, useMemo } from 'react';
import { Escrow } from '../../types';
import { TrendingUp, Calendar, DollarSign, ChevronDown, Building, Award, CheckCircle2, ChevronRight, BarChart3, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface SalesSummaryProps {
  escrows: Escrow[];
  onSelectEscrow: (escrow: Escrow) => void;
}

export function SalesSummary({ escrows, onSelectEscrow }: SalesSummaryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'total' | 'monthly' | 'commission' | 'source'>('monthly');
  const [commissionGroup, setCommissionGroup] = useState<'monthly' | 'yearly'>('monthly');
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  // Helper function to extract exact year from escrow (prioritizing COE date, then acceptance date)
  const getEscrowYear = (e: Escrow): string => {
    const dateStr = (e.coeDate || e.acceptanceDate || '').trim();
    if (!dateStr) return '';
    if (/^\d{4}/.test(dateStr)) return dateStr.substring(0, 4);
    const match = dateStr.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
    if (match) return match[1];
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed.getFullYear().toString();
    return '';
  };

  // Helper function to extract exact YYYY-MM from escrow COE date (or acceptance date fallback)
  const getEscrowMonth = (e: Escrow): string => {
    const dateStr = (e.coeDate || e.acceptanceDate || '').trim();
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}/.test(dateStr)) return dateStr.substring(0, 7);
    const match = dateStr.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})/);
    if (match) {
      const month = match[1].padStart(2, '0');
      const year = match[2];
      return `${year}-${month}`;
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
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
    
    // Always ensure the current month is an option
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentYM);

    escrows.forEach((escrow) => {
      if (escrow.status === 'Cancelled') return;
      const ym = getEscrowMonth(escrow);
      if (ym && /^\d{4}-\d{2}$/.test(ym)) {
        monthsSet.add(ym);
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [escrows]);

  // Selected year state for the Total Amount tab (defaults to actual current year)
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return new Date().getFullYear().toString();
  });

  // Extract all unique years (YYYY) from all escrows (excluding Cancelled)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    
    // Always ensure the actual current year is an option
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

  // Combined escrows for the monthly view
  const allMonthlyEscrows = useMemo(() => {
    return [...pendingMonthlyEscrows, ...closedMonthlyEscrows].sort(
      (a, b) => parseCoeTime(a.coeDate) - parseCoeTime(b.coeDate)
    );
  }, [pendingMonthlyEscrows, closedMonthlyEscrows]);

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

  // Group Commissions by Month (filtered by selectedYear)
  const commissionByMonth = useMemo(() => {
    const groups: { [key: string]: { key: string; label: string; amount: number; grossAmount: number; count: number; escrows: Escrow[] } } = {};
    const escrowsToUse = selectedYear === 'all' ? closedEscrows : closedEscrows.filter(e => getEscrowYear(e) === selectedYear);
    
    escrowsToUse.forEach((escrow) => {
      const ym = getEscrowMonth(escrow);
      if (ym && /^\d{4}-\d{2}$/.test(ym)) {
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
          groups[ym] = { key: ym, label: formattedLabel, amount: 0, grossAmount: 0, count: 0, escrows: [] };
        }
        groups[ym].amount += escrow.netCommission || 0;
        groups[ym].grossAmount += (escrow.grossCommission ?? (escrow.price && escrow.commissionPercent ? (escrow.price * escrow.commissionPercent) / 100 : 0));
        groups[ym].count += 1;
        groups[ym].escrows.push(escrow);
      }
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [closedEscrows, selectedYear]);

  // Group Commissions by Year
  const commissionByYear = useMemo(() => {
    const groups: { [key: string]: { key: string; label: string; amount: number; grossAmount: number; count: number; escrows: Escrow[] } } = {};
    const escrowsToUse = selectedYear === 'all' ? closedEscrows : closedEscrows.filter(e => getEscrowYear(e) === selectedYear);
    
    escrowsToUse.forEach((escrow) => {
      const yr = getEscrowYear(escrow);
      if (yr && /^\d{4}$/.test(yr)) {
        if (!groups[yr]) {
          groups[yr] = { key: yr, label: `${yr} Year Total`, amount: 0, grossAmount: 0, count: 0, escrows: [] };
        }
        groups[yr].amount += escrow.netCommission || 0;
        groups[yr].grossAmount += (escrow.grossCommission ?? (escrow.price && escrow.commissionPercent ? (escrow.price * escrow.commissionPercent) / 100 : 0));
        groups[yr].count += 1;
        groups[yr].escrows.push(escrow);
      }
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [closedEscrows, selectedYear]);

  const commissionGroupsToRender = useMemo(() => {
    return commissionGroup === 'monthly' ? commissionByMonth : commissionByYear;
  }, [commissionGroup, commissionByMonth, commissionByYear]);

  // Group Escrows by Lead Source
  const leadSourceStats = useMemo(() => {
    const nonCancelled = escrows.filter(e => e.status !== 'Cancelled');
    const filtered = selectedYear === 'all'
      ? nonCancelled
      : nonCancelled.filter(e => getEscrowYear(e) === selectedYear);

    const totalCount = filtered.length;
    const sourcesMap: Record<string, { key: string; label: string; count: number; volume: number; commission: number; escrows: Escrow[] }> = {
      'Zillow': { key: 'Zillow', label: 'Zillow', count: 0, volume: 0, commission: 0, escrows: [] },
      'Self': { key: 'Self', label: 'Self', count: 0, volume: 0, commission: 0, escrows: [] },
      'Team Lead': { key: 'Team Lead', label: 'Team Lead', count: 0, volume: 0, commission: 0, escrows: [] },
      'Opcity': { key: 'Opcity', label: 'Opcity', count: 0, volume: 0, commission: 0, escrows: [] },
      'Other': { key: 'Other', label: 'Other', count: 0, volume: 0, commission: 0, escrows: [] },
    };

    filtered.forEach((e) => {
      const src = e.leadSource || 'Zillow';
      const key = (src === 'Zillow' || src === 'Self' || src === 'Team Lead' || src === 'Opcity') ? src : 'Other';
      sourcesMap[key].count += 1;
      sourcesMap[key].volume += e.price || 0;
      sourcesMap[key].commission += e.netCommission || 0;
      sourcesMap[key].escrows.push(e);
    });

    return {
      totalCount,
      sources: Object.values(sourcesMap).map(s => ({
        ...s,
        percent: totalCount > 0 ? (s.count / totalCount) * 100 : 0
      }))
    };
  }, [escrows, selectedYear]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatMonthName = (ym: string) => {
    if (ym === 'all') return 'All Time';
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

  const activeYearLabel = useMemo(() => {
    if (activeSubTab === 'monthly') {
      if (selectedMonth === 'all') return 'All Time';
      return formatMonthName(selectedMonth);
    }
    return selectedYear === 'all' ? 'All Time' : selectedYear;
  }, [activeSubTab, selectedMonth, selectedYear]);

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden flex flex-col h-full shadow-sm">
      {/* Tesla / Apple-inspired Minimalist Header with Sub-tabs */}
      <div className="px-4 sm:px-5 py-3 border-b border-[#e5e5ea] bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-bold text-[#1d1d1f] text-xs uppercase tracking-wider leading-none">
            Sales Summary
          </h2>
          <span className="text-slate-300 font-normal text-xs">•</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#1B3A5C] text-white text-[10px] font-mono font-bold tracking-wide uppercase shadow-2xs">
            {activeYearLabel}
          </span>
        </div>

        {/* Minimal Sub-tabs */}
        <div className="flex bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-bold overflow-x-auto max-w-full scrollbar-none whitespace-nowrap shrink-0 w-full sm:w-auto">
          <button
            onClick={() => {
              setActiveSubTab('total');
              setExpandedPeriod(null);
            }}
            className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
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
            className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
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
            className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
              activeSubTab === 'commission'
                ? 'bg-black text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Net Commissions
          </button>
          <button
            onClick={() => {
              setActiveSubTab('source');
              setExpandedPeriod(null);
            }}
            className={`px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer shrink-0 ${
              activeSubTab === 'source'
                ? 'bg-black text-white shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Lead Source
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
                  <option value="all">All Time</option>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Net Commissions</span>
                <span className="text-sm sm:text-base font-extrabold text-[#059669] font-mono mt-0.5 truncate">
                  {formatCurrency(totalStats.commission)}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-[#86868b] uppercase tracking-wider">Gross Commissions</span>
                <span className="text-sm sm:text-base font-extrabold text-[#1B3A5C] font-mono mt-0.5 truncate">
                  {formatCurrency(totalStats.grossCommission)}
                </span>
              </div>
            </div>

            {/* List Header */}
            <div className="flex items-center text-[10px] font-bold text-[#86868b] uppercase tracking-wider border-b border-slate-100 pb-1 shrink-0">
              <span className="w-8 text-center shrink-0">#</span>
              <span className="flex-1">Properties Closed in {selectedYear === 'all' ? 'All Time' : selectedYear} ({filteredClosedEscrows.length})</span>
              <span className="w-20 text-right shrink-0">Price</span>
              <span className="w-20 text-right shrink-0 ml-2">Net Comm</span>
              <span className="w-20 text-right shrink-0 ml-2">Gross Comm</span>
            </div>

            {/* Scrollable list of properties */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredClosedEscrows.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {filteredClosedEscrows.map((escrow, index) => {
                    const grossVal = escrow.grossCommission ?? (escrow.price && escrow.commissionPercent ? (escrow.price * escrow.commissionPercent) / 100 : 0);
                    return (
                      <div
                        key={escrow.id}
                        onClick={() => onSelectEscrow(escrow)}
                        className="group flex items-center p-2.5 rounded-xl border border-transparent hover:border-[#e5e5ea] hover:bg-slate-50 transition-all duration-200 cursor-pointer"
                      >
                        <div className="w-8 text-center shrink-0 mr-1">
                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded bg-[#1B3A5C] text-white text-[10px] font-mono font-bold">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
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
                        <div className="text-xs font-extrabold text-[#1d1d1f] font-mono shrink-0 w-20 text-right">
                          {formatCurrency(escrow.price || 0)}
                        </div>
                        <div className="text-xs font-bold text-[#059669] font-mono shrink-0 w-20 text-right ml-2">
                          {formatCurrency(escrow.netCommission || 0)}
                        </div>
                        <div className="text-xs font-bold text-[#1B3A5C] font-mono shrink-0 w-20 text-right ml-2">
                          {formatCurrency(grossVal)}
                        </div>
                      </div>
                    );
                  })}
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
          /* SIMPLE MONTHLY SALES VIEW - EXPECTED MONEY & MONTH */
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4 animate-fade-in">
            {/* Top Bar: Month Selector & Expected Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div>
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">
                  Expected to Receive ({formatMonthName(selectedMonth)})
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-[#059669] tracking-tight">
                    {formatCurrency(monthlyStats.expectedCommission)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({monthlyStats.expectedCount} pending {monthlyStats.expectedCount === 1 ? 'deal' : 'deals'} based on COE)
                  </span>
                </div>
              </div>

              {/* Month Selector dropdown */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="text-[11px] font-bold text-[#86868b] whitespace-nowrap">Month:</span>
                <div className="relative inline-flex items-center">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                    }}
                    className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-xs font-bold px-4 py-2 pr-8 rounded-xl border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]/20 transition-all duration-200 shadow-sm"
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

            {/* List Header */}
            <div className="flex items-center text-[10px] font-bold text-[#86868b] uppercase tracking-wider border-b border-slate-100 pb-2 shrink-0">
              <span className="w-8 text-center shrink-0">#</span>
              <span className="flex-1">Properties Closing in {formatMonthName(selectedMonth)} ({allMonthlyEscrows.length})</span>
              <span className="w-20 text-right shrink-0">Price</span>
              <span className="w-24 text-right shrink-0 ml-2">Net Comm</span>
            </div>

            {/* Scrollable list of properties */}
            <div className="flex-1 overflow-y-auto pr-1">
              {allMonthlyEscrows.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {allMonthlyEscrows.map((escrow, index) => {
                    const isPending = escrow.status === 'Open';
                    return (
                      <div
                        key={escrow.id}
                        onClick={() => onSelectEscrow(escrow)}
                        className={`group flex items-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isPending
                            ? 'border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/70'
                            : 'border-slate-100 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-8 text-center shrink-0 mr-1">
                          <span className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded text-[10px] font-mono font-bold ${
                            isPending ? 'bg-emerald-600 text-white' : 'bg-[#1B3A5C] text-white'
                          }`}>
                            #{index + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1B3A5C] truncate group-hover:text-[#1B3A5C]/80">
                              {escrow.address}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wide shrink-0 ${
                              isPending
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {isPending ? 'Expected' : 'Closed'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#86868b] mt-0.5 flex items-center gap-2">
                            <span className="font-semibold truncate">
                              {escrow.clientFirstName} {escrow.clientLastName}
                              {(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim()) && ` & ${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-slate-600">COE: {formatItemDate(escrow.coeDate)}</span>
                          </div>
                        </div>
                        <div className="text-xs font-extrabold text-[#1d1d1f] font-mono shrink-0 w-20 text-right">
                          {formatCurrency(escrow.price || 0)}
                        </div>
                        <div className="text-xs font-bold text-[#059669] font-mono shrink-0 w-24 text-right ml-2">
                          {formatCurrency(escrow.netCommission || 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-[#86868b] text-sm font-medium flex flex-col items-center gap-3 justify-center h-full">
                  <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 text-neutral-400 flex items-center justify-center shadow-sm">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="uppercase text-[9px] tracking-widest font-bold text-neutral-500">No escrows for {formatMonthName(selectedMonth)}</p>
                    <p className="text-[10px] text-[#86868b] mt-1 normal-case">No pending or closed escrows found for this month.</p>
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
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Net Commission Revenue</span>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-[12px] font-bold text-[#059669] font-mono block">
                    Net: {formatCurrency(totalStats.commission)}
                  </span>
                  <span className="text-slate-300 font-normal text-xs">•</span>
                  <span className="text-[12px] font-bold text-[#1B3A5C] font-mono block">
                    Gross: {formatCurrency(totalStats.grossCommission)}
                  </span>
                </div>
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
              <span>Net / Gross Commission</span>
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
                          <div className="text-right font-mono shrink-0">
                            <div className="text-xs font-extrabold text-[#059669]">
                              Net: {formatCurrency(group.amount)}
                            </div>
                            <div className="text-[10px] font-bold text-[#1B3A5C]">
                              Gross: {formatCurrency(group.grossAmount)}
                            </div>
                          </div>
                        </button>

                        {/* Collapsible list of escrows in that period */}
                        {isExpanded && (
                          <div className="bg-white border-t border-slate-100/60 p-2 flex flex-col gap-1.5 animate-slide-down">
                            {group.escrows.map((escrow) => {
                              const grossVal = escrow.grossCommission ?? (escrow.price && escrow.commissionPercent ? (escrow.price * escrow.commissionPercent) / 100 : 0);
                              return (
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
                                   <div className="text-right font-mono shrink-0">
                                     <div className="text-[11px] font-bold text-[#059669]">
                                       Net: {formatCurrency(escrow.netCommission || 0)}
                                     </div>
                                     <div className="text-[9px] font-semibold text-[#1B3A5C]">
                                       Gross: {formatCurrency(grossVal)}
                                     </div>
                                   </div>
                                 </div>
                              );
                            })}
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

        {activeSubTab === 'source' && (
          /* LEAD SOURCE ANALYTICS VIEW */
          <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4 animate-fade-in">
            {/* Header with Year filter */}
            <div className="flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Escrows by Lead Source</span>
                <span className="text-[13px] font-bold text-[#1B3A5C] font-mono mt-0.5 block">
                  {leadSourceStats.totalCount} Total Escrow{leadSourceStats.totalCount === 1 ? '' : 's'}
                </span>
              </div>
              
              {/* Year Selector */}
              <div className="relative inline-flex items-center">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="appearance-none bg-white hover:bg-neutral-50 text-[#1d1d1f] text-[11px] font-bold px-3.5 py-1.5 pr-8 rounded-full border border-[#e5e5ea] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all duration-200 shadow-sm"
                >
                  <option value="all">All Time</option>
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

            {/* Source Cards Grid */}
            {leadSourceStats.sources.filter(s => s.count > 0).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {leadSourceStats.sources.filter(s => s.count > 0).map((source) => (
                  <div key={source.key} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#1B3A5C] uppercase tracking-wider">{source.label}</span>
                        <span className="text-[10px] font-mono font-bold text-[#86868b]">{Math.round(source.percent)}%</span>
                      </div>
                      <div className="text-lg font-extrabold text-[#1d1d1f] font-mono mt-1">
                        {source.count} <span className="text-[10px] text-[#86868b] font-normal uppercase">escrows</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-col text-[10px] font-mono">
                      <span className="text-[#86868b]">Vol: <strong className="text-[#1d1d1f]">{formatCurrency(source.volume)}</strong></span>
                      <span className="text-[#86868b]">Comm: <strong className="text-[#059669]">{formatCurrency(source.commission)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List Header */}
            <div className="flex items-center justify-between text-[10px] font-bold text-[#86868b] uppercase tracking-wider border-b border-slate-100 pb-1 shrink-0">
              <span>Source Category</span>
              <span>Escrows & Commission</span>
            </div>

            {/* Scrollable list of sources & escrows */}
            <div className="flex-1 overflow-y-auto pr-1">
              {leadSourceStats.sources.filter(s => s.count > 0).length > 0 ? (
                <div className="flex flex-col gap-2">
                  {leadSourceStats.sources.filter(s => s.count > 0).map((source) => {
                    const isExpanded = expandedPeriod === source.key;
                    return (
                      <div key={source.key} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        {/* Source Summary row */}
                        <button
                          onClick={() => handlePeriodToggle(source.key)}
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
                                {source.label} Source
                              </span>
                              <span className="text-[10px] text-[#86868b]">
                                {source.count} {source.count === 1 ? 'escrow' : 'escrows'} ({Math.round(source.percent)}%)
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-extrabold text-[#1B3A5C] font-mono block">
                              {formatCurrency(source.volume)}
                            </span>
                            <span className="text-[10px] font-bold text-[#059669] font-mono block">
                              {formatCurrency(source.commission)} comm.
                            </span>
                          </div>
                        </button>

                        {/* Collapsible list of escrows */}
                        {isExpanded && (
                          <div className="bg-white border-t border-slate-100/60 p-2 flex flex-col gap-1.5 animate-slide-down">
                            {source.escrows.length > 0 ? (
                              source.escrows.map((escrow) => (
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
                                      {escrow.clientFirstName} {escrow.clientLastName} • {escrow.status}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-[11px] font-bold text-[#1d1d1f] font-mono">
                                      {formatCurrency(escrow.price || 0)}
                                    </div>
                                    <div className="text-[9px] font-bold text-[#059669] font-mono">
                                      {formatCurrency(escrow.netCommission || 0)}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-[11px] text-[#86868b]">No escrows registered under {source.label}</div>
                            )}
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
                    <p className="uppercase text-[9px] tracking-widest font-bold text-neutral-500">No Lead Source Data</p>
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
