import React, { useState, useEffect } from 'react';
import { Escrow, getApplicableContingencies, getContingencyDaysLeft, getContingencyDueDate, isContingencyUrgent } from '../../types';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export function ActiveContingenciesTicker({
  escrow,
  onUpdateTasks,
}: {
  escrow: Escrow;
  onUpdateTasks?: () => void;
}) {
  const applicableContingencies = getApplicableContingencies(escrow);
  const activeContingencies = applicableContingencies.filter(c => !escrow.tasks[c.key]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [animateKey, setAnimateKey] = useState(0);

  // Keep index within range if tasks change
  useEffect(() => {
    if (currentIndex >= activeContingencies.length && activeContingencies.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeContingencies.length, currentIndex]);

  // 3 second cycle through active contingencies
  useEffect(() => {
    if (activeContingencies.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeContingencies.length);
      setAnimateKey(k => k + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeContingencies.length, isPaused]);

  if (activeContingencies.length === 0) {
    return (
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span 
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-emerald-600 text-white font-mono text-xs font-black leading-none"
              title="0 active contingencies"
            >
              0
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-[#1B3A5C] uppercase tracking-wider">
              Active Contingencies
            </span>
          </div>
        </div>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onUpdateTasks?.();
          }}
          className="w-full flex items-center justify-between bg-emerald-600 text-white border border-emerald-700/80 p-2.5 rounded-xl shadow-xs hover:bg-emerald-700 transition-all cursor-pointer select-none gap-2"
          title="All contingencies removed! Click to view details."
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CheckCircle2 size={16} className="text-white shrink-0" />
            <span className="text-xs font-bold text-white truncate">
              All {applicableContingencies.length} Contingencies Removed / Cleared
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md shrink-0 shadow-2xs whitespace-nowrap">
            {applicableContingencies.length} / {applicableContingencies.length} Done
          </span>
        </div>
      </div>
    );
  }

  const currentItem = activeContingencies[currentIndex];
  const daysLeft = currentItem ? getContingencyDaysLeft(escrow, currentItem.key) : null;
  const dueDate = currentItem ? getContingencyDueDate(escrow, currentItem.key) : null;
  const isUrgent = currentItem ? isContingencyUrgent(escrow, currentItem.key) : false;
  const hasAnyUrgent = activeContingencies.some(c => isContingencyUrgent(escrow, c.key));

  const renderDaysText = () => {
    const expDateStr = dueDate ? format(dueDate, 'MMM d') : null;
    if (daysLeft === null || daysLeft === undefined) {
      return expDateStr ? `Exp: ${expDateStr}` : 'Active';
    }

    let parenColor = 'text-emerald-700';
    if (daysLeft <= 2) {
      parenColor = 'text-rose-600';
    } else if (daysLeft >= 3 && daysLeft <= 5) {
      parenColor = 'text-amber-600';
    }

    let statusMsg = '';
    if (daysLeft < 0) statusMsg = `${Math.abs(daysLeft)}d overdue`;
    else if (daysLeft === 0) statusMsg = 'Due today';
    else if (daysLeft === 1) statusMsg = '1d left';
    else statusMsg = `${daysLeft}d left`;

    if (expDateStr) {
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-slate-700 font-semibold">{expDateStr}</span>
          <span className={`font-extrabold ${parenColor}`}>({statusMsg})</span>
        </span>
      );
    }
    return <span className={`font-extrabold ${parenColor} whitespace-nowrap`}>{statusMsg}</span>;
  };

  // Color styles matching Next Step box formatting
  const boxBgClass = isUrgent
    ? 'bg-rose-600 hover:bg-rose-700 border-rose-700/80'
    : daysLeft !== null && daysLeft <= 2
    ? 'bg-[#D97706] hover:bg-[#B45309] border-amber-700/80'
    : 'bg-[#F59E0B] hover:bg-[#D97706] border-amber-600/80';

  const badgeTextClass = isUrgent
    ? 'text-rose-700'
    : daysLeft !== null && daysLeft <= 2
    ? 'text-amber-800'
    : 'text-[#D97706]';

  return (
    <div 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full flex flex-col gap-1.5"
    >
      {/* Title Header with active count in front */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span 
            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded text-white font-mono text-xs font-black leading-none ${
              hasAnyUrgent ? 'bg-rose-600' : 'bg-[#D97706]'
            }`}
            title={`${activeContingencies.length} active contingencies remaining`}
          >
            {activeContingencies.length}
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#1B3A5C] uppercase tracking-wider">
            Active Contingencies
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdateTasks?.();
          }}
          className="text-[10px] sm:text-[11px] font-bold text-[#3B82F6] hover:underline cursor-pointer"
        >
          {currentIndex + 1} of {activeContingencies.length} Active &rarr;
        </button>
      </div>

      {/* Main Box matching Next Step layout */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onUpdateTasks?.();
        }}
        className={`w-full flex items-center justify-between gap-2.5 text-white border p-2.5 rounded-xl shadow-xs transition-all cursor-pointer group/step select-none overflow-hidden ${boxBgClass}`}
        title={dueDate ? `${currentItem?.label} - Due: ${format(dueDate, 'EEE, MMM d, yyyy')} (${daysLeft}d left). Click to manage tasks.` : 'Active contingency. Click to manage tasks.'}
      >
        <div key={animateKey} className="flex items-center gap-2 min-w-0 flex-1 animate-fadeIn overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-2xs animate-pulse" />
          <span className="text-[10px] font-mono font-bold bg-white/20 text-white px-1.5 py-0.5 rounded shrink-0">
            {currentItem?.key}
          </span>
          <span className="text-xs font-bold text-white truncate min-w-0">
            {currentItem?.label}
          </span>
        </div>

        <span className={`text-[10px] font-bold bg-white px-2.5 py-1 rounded-md shrink-0 shadow-2xs whitespace-nowrap flex items-center gap-1 ${badgeTextClass}`}>
          {renderDaysText()}
        </span>
      </div>
    </div>
  );
}
