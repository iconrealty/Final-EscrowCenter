import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
  formatCurrency,
}: StockMarketGoalsBarProps) {
  // Metrics list: ONLY Units Sold and Net Commission have colored status badges.
  // The values are highlighted with crisp, high-contrast badges.
  const items = [
    // 1. Units Sold (On Track / Off Track)
    {
      id: 'units-sold',
      label: 'UNITS SOLD:',
      badge: unitsStatusText,
      value: `(${closedYtd}/${goalTargetUnits})`,
      isStatus: true,
      isOnTrack: isUnitsOnTrack,
    },
    // 2. Net Commission (On Track / Off Track)
    {
      id: 'net-commission',
      label: 'NET COMMISSION:',
      badge: incomeStatusText,
      value: `(${formatCurrency(closedCommission)} / ${formatCurrency(goalTargetIncome)})`,
      isStatus: true,
      isOnTrack: isIncomeOnTrack,
    },
    // 3. Total GCI
    {
      id: 'total-gci',
      label: 'TOTAL GCI:',
      value: formatCurrency(totalGci),
      isStatus: false,
    },
    // 4. Units Needed
    {
      id: 'units-needed',
      label: 'UNITS NEEDED:',
      value: `${remainingUnitsNeeded === 0 ? 'Goal Met' : `${remainingUnitsNeeded} needed`} (${monthlyUnitsNeeded > 0 ? (Math.round(monthlyUnitsNeeded * 10) / 10).toFixed(1) : 0}/mo)`,
      isStatus: false,
    },
    // 5. Net Income Needed
    {
      id: 'income-needed',
      label: 'INCOME NEEDED:',
      value: `${remainingCommissionNeeded === 0 ? 'Goal Met' : `${formatCurrency(remainingCommissionNeeded)} to go`} (${formatCurrency(monthlyIncomeNeeded)}/mo)`,
      isStatus: false,
    },
    // 6. Avg Price Point
    {
      id: 'avg-price-point',
      label: 'AVG PRICE POINT:',
      value: `${avgPricePoint > 0 ? formatCurrency(avgPricePoint) : '$0'} / unit`,
      isStatus: false,
    },
    // 7. Days Left
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
      className="w-full max-w-full min-w-0 bg-white hover:bg-slate-50 border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl overflow-hidden transition-all flex items-center h-12 select-none group cursor-pointer relative shrink-0"
      data-ticker="true"
      onClick={onOpenGoals}
      title="Hover to pause in place • Click to open Goals & Performance Tracker"
    >
      {/* Soft gradient edge masks */}
      <div className="absolute left-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-3 sm:w-4 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      {/* Running Stock-Style Ticker Track (Full width without title taking up room) */}
      <div className="w-full min-w-0 overflow-hidden flex items-center" style={{ contain: 'paint layout' }}>
        <div 
          className="flex items-center gap-7 whitespace-nowrap px-4 animate-marquee"
          style={{
            display: 'inline-flex',
            width: 'max-content',
            animationDuration: '44s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          {/* Repeated so ticker loops continuously without jumps */}
          {[...items, ...items, ...items].map((item, idx) => {
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
                  <span className="font-black text-slate-900 text-sm sm:text-xs font-mono bg-slate-100 border border-slate-200/90 px-2.5 sm:px-2 py-0.5 rounded-md shadow-2xs tracking-tight">
                    {item.value}
                  </span>

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
