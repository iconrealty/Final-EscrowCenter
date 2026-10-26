import React, { useEffect } from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, getApplicableContingencies, isContingencyUrgent, getContingencyDaysLeft, getContingencyDueDate, ALL_TASKS } from '../../types';
import { X, Search } from 'lucide-react';
import { MilestoneChip } from '../escrows/MilestoneChip';
import { ContingencyChip } from '../escrows/ContingencyChip';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

export function MilestonesContingenciesModal({ 
  escrow, 
  onClose, 
  onToggleTask,
  onUpdateTasks,
  initialFocusKey
}: { 
  escrow: Escrow; 
  onClose: () => void; 
  onToggleTask: (id: string, taskKey: string) => void;
  onUpdateTasks: (id: string, tasks: Record<string, boolean>) => void;
  initialFocusKey?: string;
}) {
  const isAppraisalFocus = initialFocusKey === 'APR' || initialFocusKey === 'L2' || initialFocusKey === 'appraisal';

  useEffect(() => {
    if (initialFocusKey) {
      const timer = setTimeout(() => {
        let el: HTMLElement | null = null;
        if (isAppraisalFocus) {
          if (!escrow.tasks['APR']) {
            el = document.getElementById('milestone-chip-apr');
          } else if (!escrow.tasks['L2']) {
            el = document.getElementById('contingency-chip-l2');
          } else {
            el = document.getElementById('milestone-chip-apr') || document.getElementById('contingency-chip-l2');
          }
        } else {
          const normKey = initialFocusKey.toLowerCase().replace(/[^a-z0-9]/g, '-');
          el = document.getElementById(`milestone-chip-${normKey}`) || document.getElementById(`contingency-chip-${normKey}`);
        }

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [initialFocusKey, isAppraisalFocus, escrow.id]);

  const daysToCoe = differenceInCalendarDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 2 && escrow.status === 'Open';

  const applicableContingencies = getApplicableContingencies(escrow);
  const totalTasksCount = MILESTONES.length + applicableContingencies.length;
  const completedTasks = MILESTONES.filter(t => escrow.tasks[t.key]).length + applicableContingencies.filter(t => escrow.tasks[t.key]).length;
  const completedMilestones = MILESTONES.filter(t => escrow.tasks[t.key]).length;
  const completedContingencies = applicableContingencies.filter(t => escrow.tasks[t.key]).length;

  const hasIncompleteMilestones = MILESTONES.some(m => !escrow.tasks[m.key]);
  const hasIncompleteContingencies = applicableContingencies.some(c => !escrow.tasks[c.key]);

  const handleCompleteAllMilestones = () => {
    const updatedTasks = { ...escrow.tasks };
    MILESTONES.forEach(m => {
      updatedTasks[m.key] = true;
    });
    onUpdateTasks(escrow.id, updatedTasks);
  };

  const handleCompleteAllContingencies = () => {
    const updatedTasks = { ...escrow.tasks };
    applicableContingencies.forEach(c => {
      updatedTasks[c.key] = true;
    });
    onUpdateTasks(escrow.id, updatedTasks);
  };

  return (
    <div id="tasks-modal-overlay" className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-3 pt-12 pb-6 sm:p-6 overflow-hidden">
      <div id="tasks-modal-container" className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div id="tasks-modal-header" className="px-4 sm:px-6 py-4 border-b border-[#e5e5ea] flex justify-between items-start bg-slate-50 shrink-0">
          <div>
            <h2 id="tasks-modal-title" className="font-bold text-base sm:text-lg text-[#1B3A5C] mb-0.5 truncate max-w-[280px] sm:max-w-none" title={escrow.address}>
              Update Milestones & Contingencies
            </h2>
            <p id="tasks-modal-subtitle" className="text-xs text-[#86868b] truncate max-w-[280px] sm:max-w-none">
              {escrow.address}
            </p>
          </div>
          <button 
            id="tasks-modal-close-btn"
            onClick={onClose} 
            className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div id="tasks-modal-content" className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          
          {/* Active Appraisal Banner when opened from timeline */}
          {isAppraisalFocus && (
            <div className="bg-blue-50 border border-blue-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#006AFF]"></span>
                </span>
                <div>
                  <h4 className="text-xs font-black text-[#1B3A5C] uppercase tracking-wide">
                    Active Appraisal Selected
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {escrow.tasks['APR'] && escrow.tasks['L2']
                      ? 'Both Property Appraisal milestone and Appraisal contingency are complete.'
                      : !escrow.tasks['APR']
                      ? 'Property Appraisal milestone is pending completion.'
                      : 'Appraisal contingency removal is currently pending.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('milestone-chip-apr');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="text-[11px] font-bold text-[#006AFF] bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  APR Milestone &darr;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('contingency-chip-l2');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="text-[11px] font-bold text-[#006AFF] bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  L2 Contingency &darr;
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar Display */}
          <div id="tasks-progress-summary" className="bg-slate-50 border border-[#e5e5ea] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-[#1B3A5C]">Overall Progress</span>
              <span className="text-xs font-black font-mono text-[#1B3A5C] bg-[#1B3A5C]/10 px-2 py-0.5 rounded">
                {completedTasks} / {totalTasksCount} Completed
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#1B3A5C] h-full transition-all duration-300 rounded-full"
                style={{ width: `${totalTasksCount > 0 ? (completedTasks / totalTasksCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Milestones Section */}
          <div id="tasks-milestones-section" className="border-2 border-slate-200 bg-slate-50/40 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="relative flex flex-col items-center justify-center mb-4 pb-3.5 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#1B3A5C] text-center">
                Milestones
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-0.5 rounded-full font-mono shadow-2xs">
                  {completedMilestones} of {MILESTONES.length} Completed
                </span>
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">(Click pill to toggle status)</span>
              </div>
              {hasIncompleteMilestones && (
                <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 mt-2.5 sm:mt-0">
                  <button 
                    id="mark-all-milestones-done-btn"
                    onClick={handleCompleteAllMilestones}
                    className="text-xs bg-white hover:bg-slate-100 text-[#1B3A5C] font-bold border border-slate-300 px-3 py-1.5 rounded-lg transition-all shadow-2xs hover:border-[#1B3A5C] cursor-pointer"
                  >
                    Mark All Done
                  </button>
                </div>
              )}
            </div>
            <div id="milestones-pills-list" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {MILESTONES.map(m => {
                const isHighlight = (isAppraisalFocus && m.key === 'APR') || (initialFocusKey === m.key);
                return (
                  <MilestoneChip 
                    key={m.key}
                    taskKey={m.key}
                    label={m.label}
                    isDone={escrow.tasks[m.key]}
                    isOverdue={!escrow.tasks[m.key] && isUrgent}
                    isHighlighted={isHighlight}
                    highlightBadgeText="Active Appraisal"
                    onClick={() => onToggleTask(escrow.id, m.key)}
                  />
                );
              })}
            </div>
          </div>

          {/* Section Divider */}
          <div className="flex items-center justify-center gap-3 my-1">
            <div className="h-px bg-slate-200/90 flex-1" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80">
              Escrow Conditions & Contingencies
            </span>
            <div className="h-px bg-slate-200/90 flex-1" />
          </div>

          {/* Contingencies Section */}
          <div id="tasks-contingencies-section" className="border-2 border-slate-200 bg-slate-50/40 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="relative flex flex-col items-center justify-center mb-4 pb-3.5 border-b border-slate-200">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#1B3A5C] text-center">
                Contingencies Status
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-0.5 rounded-full font-mono shadow-2xs">
                  {completedContingencies} of {applicableContingencies.length} Removed
                </span>
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">(Click pill to toggle status)</span>
              </div>
              {hasIncompleteContingencies && (
                <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 mt-2.5 sm:mt-0">
                  <button 
                    id="mark-all-contingencies-done-btn"
                    onClick={handleCompleteAllContingencies}
                    className="text-xs bg-white hover:bg-slate-100 text-[#1B3A5C] font-bold border border-slate-300 px-3 py-1.5 rounded-lg transition-all shadow-2xs hover:border-[#1B3A5C] cursor-pointer"
                  >
                    Mark All Done
                  </button>
                </div>
              )}
            </div>
            <div id="contingencies-pills-list" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {applicableContingencies.map(c => {
                const isHighlight = (isAppraisalFocus && c.key === 'L2') || (initialFocusKey === c.key);
                return (
                  <ContingencyChip 
                    key={c.key}
                    taskKey={c.key}
                    label={c.label}
                    isDone={escrow.tasks[c.key]}
                    isOverdue={isContingencyUrgent(escrow, c.key)}
                    daysLeft={getContingencyDaysLeft(escrow, c.key)}
                    dueDate={getContingencyDueDate(escrow, c.key)}
                    isHighlighted={isHighlight}
                    highlightBadgeText="Active Appraisal"
                    onClick={() => onToggleTask(escrow.id, c.key)}
                  />
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div id="tasks-modal-footer" className="px-4 sm:px-6 py-3.5 border-t border-[#e5e5ea] flex justify-end bg-slate-50 shrink-0">
          <button 
            id="tasks-modal-save-btn"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-[#1B3A5C] hover:bg-[#11253C] text-white rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
