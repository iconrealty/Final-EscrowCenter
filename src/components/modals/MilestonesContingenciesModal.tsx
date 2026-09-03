import React from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, getApplicableContingencies, isContingencyUrgent, getContingencyDaysLeft, getContingencyDueDate, ALL_TASKS } from '../../types';
import { X, Check } from 'lucide-react';
import { MilestoneChip } from '../escrows/MilestoneChip';
import { ContingencyChip } from '../escrows/ContingencyChip';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

export function MilestonesContingenciesModal({ 
  escrow, 
  onClose, 
  onToggleTask,
  onUpdateTasks
}: { 
  escrow: Escrow; 
  onClose: () => void; 
  onToggleTask: (id: string, taskKey: string) => void;
  onUpdateTasks: (id: string, tasks: Record<string, boolean>) => void;
}) {
  const daysToCoe = differenceInCalendarDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 5 && escrow.status === 'Open';

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
            
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200/60">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Milestones</div>
                <div className="text-sm font-extrabold text-[#1B3A5C] font-mono mt-0.5">
                  {completedMilestones} / {MILESTONES.length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Contingencies</div>
                <div className="text-sm font-extrabold text-[#1B3A5C] font-mono mt-0.5">
                  {completedContingencies} / {applicableContingencies.length}
                </div>
              </div>
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
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">• Click pill to toggle status</span>
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
              {MILESTONES.map(m => (
                <MilestoneChip 
                  key={m.key}
                  taskKey={m.key}
                  label={m.label}
                  isDone={escrow.tasks[m.key]}
                  isOverdue={!escrow.tasks[m.key] && isUrgent}
                  onClick={() => onToggleTask(escrow.id, m.key)}
                />
              ))}
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
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">• Click pill to toggle status</span>
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
              {applicableContingencies.map(c => (
                <ContingencyChip 
                  key={c.key}
                  taskKey={c.key}
                  label={c.label}
                  isDone={escrow.tasks[c.key]}
                  isOverdue={isContingencyUrgent(escrow, c.key)}
                  daysLeft={getContingencyDaysLeft(escrow, c.key)}
                  dueDate={getContingencyDueDate(escrow, c.key)}
                  onClick={() => onToggleTask(escrow.id, c.key)}
                />
              ))}
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
