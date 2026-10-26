import React, { useRef, useEffect, useState } from 'react';
import { Escrow, MILESTONES } from '../../types';
import { Check, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface MilestonesTimelineSliderProps {
  escrow: Escrow;
  onUpdateTasks: (targetKey?: string) => void;
  onToggleTask?: (escrowId: string, taskKey: string) => void;
}

const SHORT_LABELS: Record<string, string> = {
  'BRBC': 'BRBC',
  'EMD': 'EMD',
  'INSP': 'Insp',
  'RR': 'RR',
  'AVID': 'AVID',
  'SDR': 'Discl',
  'APR': 'Appr',
  'Insurance': 'Insur',
  'LFA': 'Loan',
  'SLD': 'Docs',
  'VP': 'VP',
  'FWD': 'Wire',
  'REC': 'Close',
};

export function MilestonesTimelineSlider({
  escrow,
  onUpdateTasks,
}: MilestonesTimelineSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeNodeRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const completedCount = MILESTONES.filter(m => escrow.tasks[m.key]).length;
  const nextMilestoneIndex = MILESTONES.findIndex(m => !escrow.tasks[m.key]);
  const nextMilestone = nextMilestoneIndex >= 0 ? MILESTONES[nextMilestoneIndex] : null;
  const isAllCompleted = completedCount === MILESTONES.length;
  const milestonePct = Math.round((completedCount / MILESTONES.length) * 100);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkScroll();
    // Auto-scroll to current active milestone circle on mount
    if (activeNodeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const target = activeNodeRef.current;
      const targetLeft = target.offsetLeft - container.clientWidth / 2 + target.clientWidth / 2;
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
    }
  }, [escrow.id, nextMilestoneIndex]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -140 : 140,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div 
      className="flex flex-col gap-1.5 mb-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Info Line */}
      <div className="flex items-center justify-between text-xs min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
          <span className="text-[10px] font-bold text-[#1B3A5C] uppercase tracking-wider shrink-0">
            Next Step:
          </span>
          {nextMilestone ? (
            <span 
              onClick={() => onUpdateTasks('APR')}
              className="font-bold text-slate-900 truncate hover:text-[#006AFF] hover:underline cursor-pointer"
              title={`${nextMilestone.label} - Click to open active appraisal`}
            >
              {nextMilestone.label}
            </span>
          ) : (
            <span className="font-bold text-emerald-700 flex items-center gap-1 shrink-0">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span>COE Ready (All Milestones Done)</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/90 px-2 py-0.5 rounded-md">
            {completedCount}/{MILESTONES.length} <span className="text-slate-400">({milestonePct}%)</span>
          </span>
          <button
            type="button"
            onClick={() => onUpdateTasks('APR')}
            className="text-[10px] font-bold text-[#006AFF] hover:underline cursor-pointer hidden sm:inline"
            title="Open milestones modal on active appraisal"
          >
            Update &rarr;
          </button>
        </div>
      </div>

      {/* Interactive Horizontal Timeline Slider Container */}
      <div 
        onClick={() => onUpdateTasks('APR')}
        className="relative bg-slate-100/80 hover:bg-slate-100 border border-slate-200 hover:border-blue-400 rounded-xl p-2 transition-all group/timeline select-none cursor-pointer"
        title="Click timeline bar to open active appraisal in milestones modal"
      >
        {/* Left Slide Arrow Button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleScroll('left');
            }}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-slate-700 border border-slate-300 shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Slide left to see previous milestones"
            aria-label="Previous milestones"
          >
            <ChevronLeft size={14} className="stroke-[2.5]" />
          </button>
        )}

        {/* Right Slide Arrow Button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleScroll('right');
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white/95 hover:bg-white text-slate-700 border border-slate-300 shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Slide right to see next milestones"
            aria-label="Next milestones"
          >
            <ChevronRight size={14} className="stroke-[2.5]" />
          </button>
        )}

        {/* Scrollable Timeline Track */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="overflow-x-auto scrollbar-none flex items-center px-1.5 py-0.5 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex items-center min-w-max py-0.5">
            {MILESTONES.map((m, idx) => {
              const isCompleted = !!escrow.tasks[m.key];
              const isCurrentNext = idx === nextMilestoneIndex;
              const isPast = nextMilestoneIndex === -1 ? true : idx < nextMilestoneIndex;
              const shortLabel = SHORT_LABELS[m.key] || m.key;

              return (
                <React.Fragment key={m.key}>
                  {/* Connecting Line from Previous Node */}
                  {idx > 0 && (
                    <div 
                      className={`h-0.5 w-5 sm:w-6 shrink-0 transition-colors ${
                        isPast 
                          ? 'bg-emerald-500' 
                          : isCurrentNext 
                          ? 'bg-gradient-to-r from-emerald-500 to-blue-400' 
                          : 'bg-slate-300/80'
                      }`}
                    />
                  )}

                  {/* Milestone Node */}
                  <div
                    ref={isCurrentNext ? activeNodeRef : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTasks('APR');
                    }}
                    className="flex flex-col items-center shrink-0 cursor-pointer group/node px-0.5"
                    title={`${idx + 1}. ${m.label} (${isCompleted ? 'Completed' : isCurrentNext ? 'Next Milestone' : 'Upcoming'}) • Click to open active appraisal`}
                  >
                    {/* Circle Node Indicator */}
                    {isCompleted ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shadow-xs group-hover/node:scale-110 transition-transform">
                        <Check size={11} className="stroke-[3]" />
                      </div>
                    ) : isCurrentNext ? (
                      <div className="w-6 h-6 -my-0.5 rounded-full bg-[#006AFF] text-white flex items-center justify-center font-black text-[11px] ring-3 ring-blue-200 border border-blue-600 shadow-xs group-hover/node:scale-110 transition-transform animate-pulse">
                        <span>{idx + 1}</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-slate-200/90 text-slate-500 border border-slate-300 flex items-center justify-center font-bold text-[9.5px] group-hover/node:scale-110 group-hover/node:bg-slate-300 group-hover/node:text-slate-800 transition-all">
                        <span>{idx + 1}</span>
                      </div>
                    )}

                    {/* Milestone Short Tag Label */}
                    <span 
                      className={`text-[9px] font-bold text-center mt-1 leading-none tracking-tight truncate max-w-[44px] ${
                        isCompleted 
                          ? 'text-emerald-700' 
                          : isCurrentNext 
                          ? 'text-[#006AFF] font-black' 
                          : 'text-slate-400 group-hover/node:text-slate-600'
                      }`}
                    >
                      {shortLabel}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
