import React from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, ALL_TASKS } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { AppleFitnessRings } from '../shared/AppleFitnessRings';
import { differenceInDays, parseISO, formatDistanceToNow, format } from 'date-fns';

export function EscrowCard({ 
  escrow, 
  index,
  onToggleTask,
  onEdit,
  onViewDetails,
  onSendUpdate,
  onUpdateTasks
}: { 
  key?: string | number;
  escrow: Escrow; 
  index?: number;
  onToggleTask: (id: string, taskKey: string) => void;
  onEdit: () => void;
  onViewDetails: () => void;
  onSendUpdate: () => void;
  onUpdateTasks: () => void;
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
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            escrow.representation === 'Seller'
              ? 'bg-[#1B3A5C] text-white'
              : escrow.representation === 'Dual'
              ? 'bg-[#11253C] text-white'
              : 'bg-[#059669] text-white'
          }`}>
            {escrow.representation || 'Buyer'}
          </span>
          <StatusBadge status={escrow.status} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Address & Client Name with Days to Closing Box */}
        <div onClick={onViewDetails} className="cursor-pointer group/address flex items-center gap-3.5">
          {/* Days to Closing Big Number Box */}
          <div 
            className={`w-[70px] sm:w-[78px] h-[70px] sm:h-[78px] shrink-0 border rounded-2xl p-2 flex flex-col justify-center items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] select-none hover:scale-[1.02] hover:shadow-md transition-all active:scale-[0.98] ${
              escrow.status === 'Closed'
                ? 'bg-[#16a34a]/5 border-[#16a34a]/20 text-[#16a34a]'
                : escrow.status === 'Cancelled'
                ? 'bg-rose-50/50 border-rose-100 text-rose-500'
                : daysToCoe < 0
                ? 'bg-rose-50/50 border-rose-100 text-rose-600'
                : daysToCoe <= 5
                ? 'bg-red-100/60 border-red-200 text-red-700 animate-pulse'
                : daysToCoe <= 14
                ? 'bg-red-50/60 border-red-100 text-red-600'
                : 'bg-[#1B3A5C]/5 border-[#1B3A5C]/15 text-[#1B3A5C]'
            }`}
            title="Days remaining to closing"
          >
            {escrow.status === 'Closed' ? (
              <>
                <span className="text-[18px] sm:text-[20px] font-black leading-none mb-0.5">✓</span>
                <span className="text-[8px] font-extrabold uppercase tracking-wider opacity-80 leading-none">Closed</span>
              </>
            ) : escrow.status === 'Cancelled' ? (
              <>
                <span className="text-[18px] sm:text-[20px] font-black leading-none mb-0.5">✕</span>
                <span className="text-[8px] font-extrabold uppercase tracking-wider opacity-80 leading-none">Canceled</span>
              </>
            ) : (
              <>
                <span className="text-[20px] sm:text-[24px] font-black font-mono tracking-tight leading-none">
                  {daysToCoe}
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-extrabold uppercase tracking-wider opacity-80 mt-0.5 leading-tight">
                  {Math.abs(daysToCoe) === 1 ? 'Day' : 'Days'} Left
                </span>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[#86868b] font-bold mb-1 group-hover/address:text-[#1B3A5C] transition-colors" title="Client Name">
              {escrow.clientFirstName || ''} {escrow.clientLastName || ''}
              {(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim()) && ` & ${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`}
            </div>
            <h3 className="font-bold text-base text-[#1B3A5C] group-hover/address:text-[#11253C]/80 tracking-tight line-clamp-2 transition-colors" title={escrow.address}>
              {escrow.address}
            </h3>
          </div>
        </div>

        {/* Pricing, Code (COE), Commission Grid */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-[#e5e5ea]">
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
            <div className="font-mono text-xs sm:text-sm md:text-base font-bold text-[#1B3A5C]">{formatCurrency(escrow.netCommission)}</div>
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

        {/* Quick Access Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSendUpdate();
            }}
            className="w-full py-2.5 bg-slate-50 hover:bg-[#1B3A5C]/5 border border-[#e5e5ea] hover:border-[#1B3A5C]/20 rounded-xl text-xs font-bold text-[#1B3A5C] flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Client Updates</span>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdateTasks();
            }}
            className="w-full py-2.5 bg-slate-50 hover:bg-[#1B3A5C]/5 border border-[#e5e5ea] hover:border-[#1B3A5C]/20 rounded-xl text-xs font-bold text-[#1B3A5C] flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Tasks Update</span>
          </button>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 flex justify-between items-center bg-slate-50 border-t border-[#e5e5ea]">
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
