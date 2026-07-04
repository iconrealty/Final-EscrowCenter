import React from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, ALL_TASKS } from '../../types';
import { AlertCircle, AlertTriangle, Check } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface Alert {
  id: string;
  type: 'RED' | 'AMBER';
  address: string;
  description: string;
  tags: string[];
  escrow: Escrow;
}

export function NeedsAttention({ escrows, onSelectEscrow }: { escrows: Escrow[], onSelectEscrow: (escrow: Escrow) => void }) {
  const alerts: Alert[] = [];

  escrows.filter(e => e.status === 'Open').forEach(escrow => {
    const days = differenceInDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
    const pendingMilestones = MILESTONES.filter(m => !escrow.tasks[m.key]).map(m => m.key);
    const pendingContingencies = CONTINGENCIES.filter(c => !escrow.tasks[c.key]).map(c => c.key);
    
    const completed = ALL_TASKS.filter(t => escrow.tasks[t.key]).length;
    const pct = Math.round((completed / 21) * 100);

    if (days <= 5) {
      if (pendingMilestones.length > 0) {
        alerts.push({
          id: `${escrow.id}-m-red`,
          type: 'RED',
          address: escrow.address,
          description: 'Urgent milestones pending before close',
          tags: pendingMilestones,
          escrow
        });
      }
      if (pendingContingencies.length > 0) {
        alerts.push({
          id: `${escrow.id}-c-red`,
          type: 'RED',
          address: escrow.address,
          description: 'Urgent contingencies pending before close',
          tags: pendingContingencies,
          escrow
        });
      }
    } else if (days <= 15) {
      if (pendingMilestones.length > 0) {
        alerts.push({
          id: `${escrow.id}-m-amber`,
          type: 'AMBER',
          address: escrow.address,
          description: 'Milestones pending, closing soon',
          tags: pendingMilestones,
          escrow
        });
      }
      if (pendingContingencies.length > 0) {
        alerts.push({
          id: `${escrow.id}-c-amber`,
          type: 'AMBER',
          address: escrow.address,
          description: 'Contingencies pending, closing soon',
          tags: pendingContingencies,
          escrow
        });
      }
    } else if (pct < 30) {
      alerts.push({
        id: `${escrow.id}-low-prog`,
        type: 'AMBER',
        address: escrow.address,
        description: 'Low overall progress',
        tags: ['PROGRESS'],
        escrow
      });
    }
  });

  alerts.sort((a, b) => (a.type === 'RED' ? -1 : 1));

  return (
    <div className="bg-[#FFFFFF] rounded-2xl border border-[#e5e5ea] overflow-hidden flex flex-col h-full shadow-sm">
      <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-[#f5f5f7]">
        <h2 className="font-bold text-[#1d1d1f] text-sm tracking-tight">Needs Attention</h2>
        <p className="text-xs text-[#86868b] mt-0.5">Action required immediately (click card to view details)</p>
      </div>
      <div className="overflow-y-auto flex-1 p-4 sm:p-5">
        {alerts.map(alert => (
          <div 
            key={alert.id} 
            onClick={() => onSelectEscrow(alert.escrow)}
            className="group flex gap-3 sm:gap-4 mb-4 last:mb-0 p-3.5 sm:p-4 rounded-xl border border-transparent hover:border-[#e5e5ea] hover:bg-[#f5f5f7]/50 hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
              alert.type === 'RED' ? 'bg-red-500 border-red-500 text-white' : 'bg-[#EF9F27]/10 border-[#EF9F27]/30 text-[#EF9F27]'
            }`}>
              {alert.type === 'RED' ? <AlertCircle size={16} strokeWidth={2.5} /> : <AlertTriangle size={16} strokeWidth={2.5} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] text-[#1B3A5C] group-hover:text-[#1B3A5C]/80 transition-colors truncate" title={alert.address}>{alert.address}</div>
              <div className="text-[11px] text-[#86868b] mt-0.5 mb-2 font-medium break-words">{alert.description}</div>
              <div className="flex flex-wrap gap-1.5">
                {alert.tags.map(tag => {
                  const taskDef = ALL_TASKS.find(t => t.key === tag);
                  return (
                    <span 
                      key={tag} 
                      title={taskDef ? taskDef.label : tag}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                        alert.type === 'RED' ? 'bg-red-50 border-red-100 text-red-600 shadow-sm' : 'bg-amber-50 border-amber-100 text-[#EF9F27] shadow-sm'
                      }`}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="p-12 text-center text-[#86868b] text-sm font-medium flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1B3A5C]/10 border border-[#1B3A5C]/30 text-[#1B3A5C] flex items-center justify-center shadow-sm">
              <Check size={24} strokeWidth={2.5} />
            </div>
            <div>All clear! You're caught up.</div>
          </div>
        )}
      </div>
    </div>
  );
}
