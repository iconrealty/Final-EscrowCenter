import React from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, ALL_TASKS } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { DaysPill } from '../shared/DaysPill';
import { AppleFitnessRings } from '../shared/AppleFitnessRings';
import { differenceInDays, parseISO, formatDistanceToNow, format } from 'date-fns';

export function EscrowCard({ 
  escrow, 
  index,
  onToggleTask,
  onEdit,
  onViewDetails
}: { 
  key?: string | number;
  escrow: Escrow; 
  index?: number;
  onToggleTask: (id: string, taskKey: string) => void;
  onEdit: () => void;
  onViewDetails: () => void;
}) {
  const daysToCoe = differenceInDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 5 && escrow.status === 'Open';
  
  const completedTasks = ALL_TASKS.filter(t => escrow.tasks[t.key]).length;
  const completedMilestones = MILESTONES.filter(t => escrow.tasks[t.key]).length;
  const completedContingencies = CONTINGENCIES.filter(t => escrow.tasks[t.key]).length;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5ea] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col">
      {/* Upper Area: Escrow Number, Days Left and Actions */}
      <div className="px-4 py-3.5 flex justify-between items-center bg-slate-50/50 border-b border-[#e5e5ea]">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
            Escrow #{escrow.escrowNumber || (typeof index === 'number' ? index + 1 : escrow.id.slice(0, 8).toUpperCase())}
          </span>
          <DaysPill coeDate={escrow.coeDate} status={escrow.status} />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={escrow.status} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Address */}
        <div onClick={onViewDetails} className="cursor-pointer group/address">
          <div className="text-[10px] uppercase tracking-wider text-[#86868b] font-bold mb-1 group-hover/address:text-[#1B3A5C] transition-colors">Address</div>
          <h3 className="font-bold text-base text-[#1B3A5C] group-hover/address:text-[#1B3A5C]/80 tracking-tight line-clamp-1 transition-colors" title={escrow.address}>{escrow.address}</h3>
        </div>

        {/* Pricing, Code (COE), Commission Grid */}
        <div className="grid grid-cols-3 gap-3 bg-[#fafafa] p-3 rounded-xl border border-[#e5e5ea]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#55697a] font-bold mb-0.5">Price</div>
            <div className="font-mono text-xs sm:text-sm md:text-base font-bold text-[#16a34a]">{formatCurrency(escrow.price)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#55697a] font-bold mb-0.5" title="Close of Escrow / Code">Code (COE)</div>
            <div className="font-mono text-xs sm:text-sm font-bold text-[#1d1d1f] truncate">
              {escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMM d, yyyy') : '-'}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#55697a] font-bold mb-0.5">Commission</div>
            <div className="font-mono text-xs sm:text-sm md:text-base font-bold text-[#FF7518]">{formatCurrency(escrow.netCommission)}</div>
          </div>
        </div>

        {/* Unified Apple Fitness progress rings */}
        <div 
          onClick={onViewDetails} 
          className="mt-1.5 cursor-pointer hover:opacity-95 transition-opacity"
          title="Click to view progress details"
        >
          <AppleFitnessRings 
            rings={[
              {
                label: "Overall Progress",
                progress: (completedTasks / 21) * 100,
                color: "#1B3A5C", // Professional Dark Navy Blue
                bgColor: "#1B3A5C",
                valueText: `${completedTasks}/21`
              },
              {
                label: "Milestones Done",
                progress: (completedMilestones / 12) * 100,
                color: "#3B82F6", // Professional Azure Blue
                bgColor: "#3B82F6",
                valueText: `${completedMilestones}/12`
              },
              {
                label: "Contingencies Cleared",
                progress: (completedContingencies / 9) * 100,
                color: "#EF9F27", // Professional Amber Yellow
                bgColor: "#EF9F27",
                valueText: `${completedContingencies}/9`
              }
            ]}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 flex justify-between items-center bg-[#fafafa] border-t border-[#e5e5ea]">
        <div className="text-[10px] italic text-[#86868b]">
          Last updated: {escrow.lastUpdated ? formatDistanceToNow(parseISO(String(escrow.lastUpdated)), { addSuffix: true }) : 'Unknown'}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onViewDetails}
            className="px-3 py-1.5 text-xs font-semibold text-[#86868b] hover:text-[#1d1d1f] transition-colors"
          >
            Details
          </button>
          <button 
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-bold bg-[#1d1d1f] text-white rounded-md hover:bg-[#434344] transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
