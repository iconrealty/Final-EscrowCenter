import React from 'react';
import { Escrow, ALL_TASKS, MILESTONES, CONTINGENCIES } from '../../types';
import { Avatar } from '../shared/Avatar';
import { differenceInDays, parseISO } from 'date-fns';

export function COETimeline({ escrows, onSelectEscrow }: { escrows: Escrow[], onSelectEscrow: (escrow: Escrow) => void }) {
  const sorted = [...escrows].sort((a, b) => {
    if (a.status !== 'Open' && b.status === 'Open') return 1;
    if (a.status === 'Open' && b.status !== 'Open') return -1;
    return new Date(a.coeDate || 0).getTime() - new Date(b.coeDate || 0).getTime();
  });

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#e5e5ea] overflow-hidden flex flex-col h-full shadow-sm">
      <div className="p-5 border-b border-[#e5e5ea] bg-slate-50">
        <h2 className="font-bold text-[#1d1d1f] text-sm tracking-tight">Closing Timeline</h2>
        <p className="text-xs text-[#86868b] mt-0.5">Prioritized by urgency & completion</p>
      </div>
      <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
        {sorted.map(escrow => {
          const days = differenceInDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
          const isUrgent = days <= 5 && escrow.status === 'Open';
          const isClosed = escrow.status !== 'Open';
          const completed = ALL_TASKS.filter(t => escrow.tasks[t.key]).length;
          const pct = Math.round((completed / 21) * 100);
          
          const completedMilestones = MILESTONES.filter(t => escrow.tasks[t.key]).length;
          const pctMilestones = Math.round((completedMilestones / 12) * 100);
          
          const completedContingencies = CONTINGENCIES.filter(t => escrow.tasks[t.key]).length;
          const pctContingencies = Math.round((completedContingencies / 9) * 100);

          let daysPill = (
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-50 text-[#86868b] border border-[#e5e5ea]">
              {days}d
            </div>
          );
          
          if (isClosed) {
            daysPill = (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-500 border border-orange-500/30">
                Closed
              </div>
            );
          } else if (days <= 1) {
            daysPill = (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#EF9F27] text-[#FFFFFF] border border-[#EF9F27] shadow-sm">
                {days < 0 ? 'Overdue' : 'Due'}
              </div>
            );
          } else if (days <= 5) {
            daysPill = (
              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#EF9F27]/10 text-[#EF9F27] border border-[#EF9F27]/30 shadow-sm">
                {days}d
              </div>
            );
          }

          return (
            <div 
              key={escrow.id} 
              onClick={() => onSelectEscrow(escrow)}
              className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                isUrgent ? 'bg-[#FFFFFF] shadow-sm hover:shadow-md border-[#EF9F27]/50 hover:border-[#EF9F27] relative overflow-hidden' : 'bg-[#FFFFFF] border-[#e5e5ea] shadow-sm hover:shadow-md hover:border-orange-500/50'
              } ${isClosed ? 'opacity-60 hover:opacity-100' : ''}`}
            >
              <div className="flex items-center gap-3.5">
                <Avatar name={`${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || 'Client'} />
                <div>
                  <div className="font-bold text-[13px] text-orange-500 group-hover:text-orange-500/80 transition-colors">{escrow.address}</div>
                  <div className="text-[11px] text-[#86868b] mt-0.5 font-medium">{`${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || '-'}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center justify-center">
                  {/* Mini Apple Fitness concentric progress rings */}
                  <div 
                    className="w-9 h-9 relative flex items-center justify-center bg-[#f8fafc] border border-[#e2e8f0] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] shrink-0 overflow-visible" 
                    title={`Overall: ${pct}% | Milestones: ${pctMilestones}% | Contingencies: ${pctContingencies}%`}
                  >
                    <svg className="w-8 h-8 transform -rotate-90 select-none overflow-visible">
                      {/* Track Backgrounds */}
                      <circle cx="16" cy="16" r="13" stroke="#1B3A5C" strokeWidth="2.2" fill="transparent" className="opacity-15" />
                      <circle cx="16" cy="16" r="10" stroke="#3B82F6" strokeWidth="2.2" fill="transparent" className="opacity-15" />
                      <circle cx="16" cy="16" r="7" stroke="#EF9F27" strokeWidth="2.2" fill="transparent" className="opacity-15" />

                      {/* Outer Ring - Overall (Dark Navy Blue) */}
                      <circle 
                        cx="16" 
                        cy="16" 
                        r="13" 
                        stroke="#1B3A5C" 
                        strokeWidth="2.2" 
                        fill="transparent" 
                        strokeDasharray="81.68" 
                        strokeDashoffset={81.68 - (Math.min(100, Math.max(0, pct)) / 100) * 81.68} 
                        strokeLinecap="round" 
                      />
                      
                      {/* Middle Ring - Milestones (Azure Blue) */}
                      <circle 
                        cx="16" 
                        cy="16" 
                        r="10" 
                        stroke="#3B82F6" 
                        strokeWidth="2.2" 
                        fill="transparent" 
                        strokeDasharray="62.83" 
                        strokeDashoffset={62.83 - (Math.min(100, Math.max(0, pctMilestones)) / 100) * 62.83} 
                        strokeLinecap="round" 
                      />

                      {/* Inner Ring - Contingencies (Amber Yellow) */}
                      <circle 
                        cx="16" 
                        cy="16" 
                        r="7" 
                        stroke="#EF9F27" 
                        strokeWidth="2.2" 
                        fill="transparent" 
                        strokeDasharray="43.98" 
                        strokeDashoffset={43.98 - (Math.min(100, Math.max(0, pctContingencies)) / 100) * 43.98} 
                        strokeLinecap="round" 
                      />
                    </svg>
                  </div>
                </div>
                <div className="w-[60px] text-right">
                  {daysPill}
                </div>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="p-8 text-center text-[#86868b] text-sm font-medium">Pipeline clear.</div>
        )}
      </div>
    </div>
  );
}
