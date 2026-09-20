import React from 'react';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface MetricComparison {
  diff: number;
  percent: number | null;
  hasLastYearData: boolean;
  lastYearVal: number;
}

interface StockMarketGoalsBarProps {
  onOpenGoals?: () => void;
  actualYear: string;
  isUnitsOnTrack: boolean;
  unitsStatusText: string;
  closedYtd: number;
  goalTargetUnits: number;
  isIncomeOnTrack: boolean;
  incomeStatusText: string;
  closedCommission: number;
  goalTargetIncome: number;
  remainingUnitsNeeded: number;
  remainingCommissionNeeded: number;
  monthlyUnitsNeeded: number;
  monthlyIncomeNeeded: number;
  avgPricePoint: number;
  daysRemaining: number;
  totalGci: number;
  closedVolume: number;
  volumeComparison?: MetricComparison;
  commissionComparison?: MetricComparison;
  unitsComparison?: MetricComparison;
  gciComparison?: MetricComparison;
  avgPriceComparison?: MetricComparison;
  formatCurrency: (val: number) => string;
}

export function StockMarketGoalsBar({
  onOpenGoals,
  actualYear,
  isUnitsOnTrack,
  unitsStatusText,
  closedYtd,
  goalTargetUnits,
  isIncomeOnTrack,
  incomeStatusText,
  closedCommission,
  goalTargetIncome,
  remainingUnitsNeeded,
  remainingCommissionNeeded,
  monthlyUnitsNeeded,
  monthlyIncomeNeeded,
  avgPricePoint,
  daysRemaining,
  totalGci,
  closedVolume,
  volumeComparison,
  commissionComparison,
  unitsComparison,
  gciComparison,
  avgPriceComparison,
  formatCurrency,
}: StockMarketGoalsBarProps) {
  // Helper to format stock market ticker comparison vs last year at this point (Arrows up/down and the %)
  const formatComparison = (
    comp: MetricComparison | undefined
  ): {
    isUp: boolean;
    isDown: boolean;
    isEqual: boolean;
    percentText: string;
  } | null => {
    if (!comp) return null;
    const { diff, percent } = comp;
    const isUp = diff > 0;
    const isDown = diff < 0;
    const isEqual = diff === 0;

    let pct = 0;
    if (percent !== null && !isNaN(percent)) {
      pct = percent;
    } else if (isUp) {
      pct = 100;
    } else if (isDown) {
      pct = -100;
    }

    const sign = pct > 0 ? '+' : '';
    const percentText = `${sign}${pct.toFixed(1)}%`;

    return {
      isUp,
      isDown,
      isEqual,
      percentText
    };
  };

  const compUnits = formatComparison(unitsComparison);
  const compVolume = formatComparison(volumeComparison);
  const compCommission = formatComparison(commissionComparison);
  const compGci = formatComparison(gciComparison);
  const compAvgPrice = formatComparison(avgPriceComparison);

  // Metrics list: running live ticker with Total Sales Volume and Last Year comparison
  const items = [
    // 1. Units Sold (On Track / Off Track + vs Last Year)
    {
      id: 'units-sold',
      label: 'UNITS SOLD:',
      badge: unitsStatusText,
      value: `(${closedYtd}/${goalTargetUnits})`,
      isStatus: true,
      isOnTrack: isUnitsOnTrack,
      comparison: compUnits,
    },
    // 2. Total Sales Volume (Requested by user + vs Last Year)
    {
      id: 'sales-volume',
      label: 'TOTAL SALES VOLUME:',
      value: formatCurrency(closedVolume),
      isStatus: false,
      comparison: compVolume,
    },
    // 3. Net Commission (On Track / Off Track + vs Last Year)
    {
      id: 'net-commission',
      label: 'NET COMMISSION:',
      badge: incomeStatusText,
      value: `(${formatCurrency(closedCommission)} / ${formatCurrency(goalTargetIncome)})`,
      isStatus: true,
      isOnTrack: isIncomeOnTrack,
      comparison: compCommission,
    },
    // 4. Total GCI (+ vs Last Year)
    {
      id: 'total-gci',
      label: 'TOTAL GCI:',
      value: formatCurrency(totalGci),
      isStatus: false,
      comparison: compGci,
    },
    // 5. Avg Price Point (+ vs Last Year)
    {
      id: 'avg-price-point',
      label: 'AVG PRICE POINT:',
      value: `${avgPricePoint > 0 ? formatCurrency(avgPricePoint) : '$0'} / unit`,
      isStatus: false,
      comparison: compAvgPrice,
    },
    // 6. Units Needed
    {
      id: 'units-needed',
      label: 'UNITS NEEDED:',
      value: `${remainingUnitsNeeded === 0 ? 'Goal Met' : `${remainingUnitsNeeded} needed`} (${monthlyUnitsNeeded > 0 ? (Math.round(monthlyUnitsNeeded * 10) / 10).toFixed(1) : 0}/mo)`,
      isStatus: false,
    },
    // 7. Net Income Needed
    {
      id: 'income-needed',
      label: 'INCOME NEEDED:',
      value: `${remainingCommissionNeeded === 0 ? 'Goal Met' : `${formatCurrency(remainingCommissionNeeded)} to go`} (${formatCurrency(monthlyIncomeNeeded)}/mo)`,
      isStatus: false,
    },
    // 8. Days Left
    {
      id: 'days-left',
      label: 'DAYS LEFT:',
      value: `${daysRemaining} days in ${actualYear}`,
      isStatus: false,
    },
  ];

  return (
    /* Matches the full width of the 2 wide tabs above and the escrow tab below */
    <div 
      className="w-full max-w-full min-w-0 bg-white hover:bg-slate-50 border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all flex items-center h-12 select-none group cursor-pointer relative"
      data-ticker="true"
      onClick={onOpenGoals}
      title="Hover to pause in place • Click to open Goals & Performance Tracker"
      style={{ width: '100%', maxWidth: '100%' }}
    >
      {/* Soft gradient edge masks */}
      <div className="absolute left-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      {/* Running Stock-Style Ticker Track (Full width without title taking up room) */}
      <div className="w-full max-w-full min-w-0 overflow-hidden flex items-center" style={{ width: '100%', maxWidth: '100%', contain: 'paint layout' }}>
        <div 
          className="flex items-center gap-7 whitespace-nowrap px-4 animate-marquee"
          style={{
            display: 'inline-flex',
            width: 'max-content',
            animationDuration: '52s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          {/* Repeated so ticker loops continuously without jumps */}
          {[...items, ...items].map((item, idx) => {
              const Icon = item.isStatus && item.isOnTrack ? TrendingUp : TrendingDown;

              return (
                <div 
                  key={`${item.id}-${idx}`} 
                  className="flex items-center gap-2 text-xs shrink-0 select-none py-0.5"
                >
                  {/* Stock Ticker Label */}
                  <span className="font-extrabold font-mono text-[#1B3A5C] text-xs sm:text-[11px] tracking-tight">
                    {item.label}
                  </span>

                  {/* Stock Ticker Badge ONLY for ON TRACK / OFF TRACK status */}
                  {item.isStatus && (
                    <span className={`inline-flex items-center gap-1 text-xs sm:text-[11px] font-black px-2 py-0.5 rounded tracking-wider ${
                      item.isOnTrack 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-rose-600 text-white'
                    }`}>
                      <Icon size={12} strokeWidth={2.5} />
                      <span>{item.badge}</span>
                    </span>
                  )}

                  {/* Highlighted Value Badge: large and clear on mobile UI */}
                  <span className="font-black text-slate-900 text-xs sm:text-[11px] font-mono bg-slate-100 border border-slate-200/90 px-2.5 sm:px-2 py-0.5 rounded-md shadow-2xs tracking-tight">
                    {item.value}
                  </span>

                  {/* Stock Market Up / Down Comparison Pill vs Last Year at this point */}
                  {item.comparison && (
                    <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-black px-1.5 py-0.5 rounded-md border shadow-2xs tracking-tight ${
                      item.comparison.isUp
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300/80'
                        : item.comparison.isDown
                          ? 'bg-rose-50 text-rose-700 border-rose-300/80'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {item.comparison.isUp && (
                        <ArrowUp size={12} strokeWidth={3} className="shrink-0 text-emerald-600" />
                      )}
                      {item.comparison.isDown && (
                        <ArrowDown size={12} strokeWidth={3} className="shrink-0 text-rose-600" />
                      )}
                      {item.comparison.isEqual && (
                        <span className="text-[9px] leading-none shrink-0 text-slate-400">■</span>
                      )}
                      <span>{item.comparison.percentText}</span>
                    </span>
                  )}

                  {/* Divider bullet */}
                  <span className="text-slate-300 font-bold ml-2">•</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
  );
}
