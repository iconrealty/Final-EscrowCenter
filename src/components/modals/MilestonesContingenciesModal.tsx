import React from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, isContingencyUrgent, ALL_TASKS } from '../../types';
import { X, Check } from 'lucide-react';
import { MilestoneChip } from '../escrows/MilestoneChip';
import { ContingencyChip } from '../escrows/ContingencyChip';
import { differenceInDays, parseISO, format } from 'date-fns';

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
  const daysToCoe = differenceInDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 5 && escrow.status === 'Open';

  const completedTasks = ALL_TASKS.filter(t => escrow.tasks[t.key]).length;
  const completedMilestones = MILESTONES.filter(t => escrow.tasks[t.key]).length;
  const completedContingencies = CONTINGENCIES.filter(t => escrow.tasks[t.key]).length;

  const hasIncompleteMilestones = MILESTONES.some(m => !escrow.tasks[m.key]);
  const hasIncompleteContingencies = CONTINGENCIES.some(c => !escrow.tasks[c.key]);

  const handleCompleteAllMilestones = () => {
    const updatedTasks = { ...escrow.tasks };
    MILESTONES.forEach(m => {
      updatedTasks[m.key] = true;
    });
    onUpdateTasks(escrow.id, updatedTasks);
  };

  const handleCompleteAllContingencies = () => {
    const updatedTasks = { ...escrow.tasks };
    CONTINGENCIES.forEach(c => {
      updatedTasks[c.key] = true;
    });
    onUpdateTasks(escrow.id, updatedTasks);
  };

  return (
    <div id="tasks-modal-overlay" className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-3 pt-12 pb-6 sm:p-6 overflow-hidden">
      <div id="tasks-modal-container" className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
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
                {completedTasks} / {ALL_TASKS.length} Completed
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#1B3A5C] h-full transition-all duration-300 rounded-full"
                style={{ width: `${(completedTasks / ALL_TASKS.length) * 100}%` }}
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
                  {completedContingencies} / {CONTINGENCIES.length}
                </div>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div id="tasks-milestones-section" className="border border-[#e5e5ea] rounded-xl p-4">
            <div className="flex justify-between items-center mb-3.5 pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1B3A5C]">
                Milestones ({completedMilestones}/{MILESTONES.length})
              </h3>
              {hasIncompleteMilestones && (
                <button 
                  onClick={handleCompleteAllMilestones}
                  className="text-xs text-[#1B3A5C] hover:text-[#11253C] font-bold hover:underline transition-all cursor-pointer"
                >
                  Mark All Done
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {MILESTONES.map(m => (
                <MilestoneChip 
                  key={m.key}
                  label={m.label}
                  isDone={escrow.tasks[m.key]}
                  isOverdue={!escrow.tasks[m.key] && isUrgent}
                  onClick={() => onToggleTask(escrow.id, m.key)}
                />
              ))}
            </div>
          </div>

          {/* Contingencies Section */}
          <div id="tasks-contingencies-section" className="border border-[#e5e5ea] rounded-xl p-4">
            <div className="flex justify-between items-center mb-3.5 pb-1.5 border-b border-slate-100">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1B3A5C]">
                Contingencies Removed ({completedContingencies}/{CONTINGENCIES.length})
              </h3>
              {hasIncompleteContingencies && (
                <button 
                  onClick={handleCompleteAllContingencies}
                  className="text-xs text-[#1B3A5C] hover:text-[#11253C] font-bold hover:underline transition-all cursor-pointer"
                >
                  Mark All Done
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {CONTINGENCIES.map(c => (
                <ContingencyChip 
                  key={c.key}
                  taskKey={c.key}
                  label={c.label}
                  isDone={escrow.tasks[c.key]}
                  isOverdue={isContingencyUrgent(escrow, c.key)}
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
