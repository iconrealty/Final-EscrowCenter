import React, { useState } from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, ALL_TASKS, getApplicableContingencies, formatPropertyAddress } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { differenceInCalendarDays, parseISO, formatDistanceToNow, format } from 'date-fns';
import { ActiveContingenciesTicker } from './ActiveContingenciesTicker';
import { CheckCircle2, Users, Phone, MessageSquare, Mail, User, Copy, Check } from 'lucide-react';

export function EscrowCard({ 
  escrow, 
  index,
  onToggleTask,
  onEdit,
  onViewDetails,
  onSendUpdate,
  onUpdateTasks,
  onOpenContacts,
  onOpenDocuments
}: { 
  key?: string | number;
  escrow: Escrow; 
  index?: number;
  onToggleTask: (id: string, taskKey: string) => void;
  onEdit: () => void;
  onViewDetails: () => void;
  onSendUpdate: () => void;
  onUpdateTasks: () => void;
  onOpenContacts?: () => void;
  onOpenDocuments?: () => void;
}) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const fullAddress = formatPropertyAddress(escrow) || escrow.address || '';

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fullAddress) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(fullAddress);
      } else {
        const el = document.createElement('textarea');
        el.value = fullAddress;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const daysToCoe = differenceInCalendarDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 5 && escrow.status === 'Open';
  
  const applicableContingencies = getApplicableContingencies(escrow);
  const totalTasksCount = MILESTONES.length + applicableContingencies.length;
  const completedMilestones = MILESTONES.filter(t => escrow.tasks[t.key]).length;
  const milestonePct = Math.round((completedMilestones / MILESTONES.length) * 100);
  const completedContingencies = applicableContingencies.filter(t => escrow.tasks[t.key]).length;
  const completedTasks = completedMilestones + completedContingencies;

  // Find next pending milestone
  const nextMilestone = MILESTONES.find(m => !escrow.tasks[m.key]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const str = dateStr.trim();
      if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const [m, d, y] = str.split('/');
        return format(new Date(Number(y), Number(m) - 1, Number(d)), 'MMM d, yyyy');
      }
      return format(parseISO(str), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const rawRep = escrow.representation || 'Buyer';
  const normalizedRep = rawRep.toLowerCase();
  const isSeller = normalizedRep.includes('seller');
  const isDual = normalizedRep.includes('dual');

  // Soft, refined pastel top header backgrounds:
  // Buyer: Soft sky blue tone
  // Seller: Soft mint/sage green tone
  // Dual: Soft warm peach/apricot tone
  const headerStyle = isSeller
    ? {
        bg: 'bg-emerald-50/75 border-b border-emerald-100',
        indexBadge: 'bg-emerald-700 text-white',
        repBadge: 'bg-emerald-600 text-white',
        escrowNumBadge: 'bg-white border-emerald-200 text-emerald-900',
      }
    : isDual
    ? {
        bg: 'bg-orange-50/75 border-b border-orange-100',
        indexBadge: 'bg-orange-600 text-white',
        repBadge: 'bg-orange-500 text-white',
        escrowNumBadge: 'bg-white border-orange-200 text-orange-900',
      }
    : {
        bg: 'bg-blue-50/75 border-b border-blue-100',
        indexBadge: 'bg-[#1B3A5C] text-white',
        repBadge: 'bg-[#1B3A5C] text-white',
        escrowNumBadge: 'bg-white border-blue-200 text-blue-900',
      };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col relative overflow-hidden group/card">
      {/* Top Part Inside Tab: Escrow Number, Representation Badge, Status */}
      <div className={`px-3.5 sm:px-4 py-2.5 sm:py-3 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 ${headerStyle.bg}`}>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          {typeof index === 'number' && (
            <span className={`font-mono text-xs font-black ${headerStyle.indexBadge} px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-xs shrink-0 tracking-wide`}>
              #{index + 1}
            </span>
          )}
          {escrow.escrowNumber && (
            <span className={`font-mono text-[11px] sm:text-xs font-bold ${headerStyle.escrowNumBadge} border px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shrink-0 shadow-2xs`} title={`Escrow #${escrow.escrowNumber}`}>
              Escrow #{escrow.escrowNumber}
            </span>
          )}
          {escrow.mlsId && (
            <span className={`font-mono text-[11px] sm:text-xs font-bold ${headerStyle.escrowNumBadge} border px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shrink-0 shadow-2xs`} title={`MLS #${escrow.mlsId}`}>
              MLS #{escrow.mlsId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap shrink-0">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
            {escrow.leadSource || 'Zillow'}
          </span>
          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${headerStyle.repBadge}`}>
            {rawRep}
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
                <span className="text-[20px] sm:text-[24px] font-black tracking-tight leading-none">
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
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-bold text-base text-[#1B3A5C] group-hover/address:text-[#11253C] tracking-tight line-clamp-2 transition-colors" title={fullAddress}>
                {fullAddress}
              </h3>
              <button
                type="button"
                onClick={handleCopyAddress}
                className={`p-1 rounded-md transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                  copiedAddress 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs' 
                    : 'text-slate-400 hover:text-[#1B3A5C] hover:bg-slate-100'
                }`}
                title={copiedAddress ? 'Address copied to clipboard!' : 'Copy address'}
                aria-label="Copy address"
              >
                {copiedAddress ? (
                  <Check size={14} className="text-emerald-600 stroke-[2.5]" />
                ) : (
                  <Copy size={14} className="stroke-[2.2]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pricing, Acceptance Date, COE, Commission Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3 rounded-xl border border-[#e5e5ea]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#55697a] font-bold mb-0.5">Price</div>
            <div className="text-xs sm:text-sm font-black text-[#16a34a] tracking-tight leading-none">{formatCurrency(escrow.price)}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#55697a] font-bold mb-0.5" title="Acceptance Date">Accepted</div>
            <div className="text-xs sm:text-sm font-bold text-[#1d1d1f] tracking-tight truncate">
              {formatDateDisplay(escrow.acceptanceDate)}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#55697a] font-bold mb-0.5" title="Close of Escrow (COE)">COE</div>
            <div className="text-xs sm:text-sm font-bold text-[#1d1d1f] tracking-tight truncate">
              {formatDateDisplay(escrow.coeDate)}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#55697a] font-bold mb-0.5">Net Commission</div>
            <div className="text-xs sm:text-sm font-black text-[#1B3A5C] tracking-tight leading-none">{formatCurrency(escrow.netCommission)}</div>
          </div>
        </div>

        {/* Linear Multi-Segment Escrow Progress Pipeline */}
        <div 
          onClick={onViewDetails} 
          className="mt-1 p-3 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-all group/progress"
          title="Click to view full escrow tasks details"
        >
          {/* Next Step Section */}
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#1B3A5C] uppercase tracking-wider">
                Next Step
              </span>
              {nextMilestone && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTasks();
                  }}
                  className="text-[10px] font-bold text-[#3B82F6] hover:underline cursor-pointer"
                >
                  Update Tasks &rarr;
                </button>
              )}
            </div>

            {nextMilestone ? (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateTasks();
                }}
                className="relative overflow-hidden bg-slate-100 border border-slate-300 hover:border-slate-400 rounded-xl transition-all cursor-pointer group/step select-none"
                title={`Click to update milestone (${completedMilestones}/${MILESTONES.length} completed)`}
              >
                {/* Base Layer: Unfilled area with dark text */}
                <div className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[#1B3A5C] shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {nextMilestone.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                      {completedMilestones}/{MILESTONES.length} ({milestonePct}%)
                    </span>
                  </div>
                </div>

                {/* Filling Rich Blue Progress Bar Layer (clipped to milestone progress) */}
                <div 
                  className="absolute inset-0 bg-[#3B82F6] flex items-center justify-between p-2.5 transition-all duration-500 ease-out pointer-events-none"
                  style={{ clipPath: `inset(0 ${Math.max(0, 100 - milestonePct)}% 0 0)` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {nextMilestone.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-xs sm:text-sm font-black text-white font-mono">
                      {completedMilestones}/{MILESTONES.length} ({milestonePct}%)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateTasks();
                }}
                className="flex items-center justify-between bg-emerald-600 text-white border border-emerald-700 p-2.5 rounded-xl hover:bg-emerald-700 transition-all cursor-pointer select-none"
                title={`All ${MILESTONES.length} milestones completed! Click to view details.`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-white shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    All {MILESTONES.length} Milestones Completed / COE Ready
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-black text-white shrink-0">
                  {completedMilestones}/{MILESTONES.length} (100%)
                </span>
              </div>
            )}
          </div>

          {/* Active Contingencies Ticker */}
          <div className="mb-3">
            <ActiveContingenciesTicker escrow={escrow} onUpdateTasks={onUpdateTasks} />
          </div>

          {/* Progress Bars Section */}
          <div className="pt-2.5 border-t border-slate-200/80">
            {/* Overall Completion Header */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1B3A5C]" />
                <span className="text-xs font-bold text-[#1B3A5C] uppercase tracking-wider">Escrow Completion</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs sm:text-sm">
                <span className="font-black text-slate-900">{completedTasks}/{totalTasksCount} Tasks</span>
                <span className="font-black text-slate-900">
                  ({Math.round((completedTasks / (totalTasksCount || 1)) * 100)}%)
                </span>
              </div>
            </div>

            {/* Primary Horizontal Progress Bar */}
            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#1B3A5C] to-[#2B5A8C] rounded-full transition-all duration-500"
                style={{ width: `${Math.round((completedTasks / (totalTasksCount || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Agent Fast Contact Bar */}
        {(() => {
          const agentName = escrow.agentName?.trim();
          const agentPhone = escrow.agentPhone?.trim();
          const agentEmail = escrow.agentEmail?.trim();
          const cleanPhone = agentPhone ? agentPhone.replace(/[^0-9+]/g, '') : '';
          const hasPhone = !!cleanPhone;
          const hasEmail = !!agentEmail;
          const emailSubject = formatPropertyAddress(escrow) || escrow.address || 'Property';

          return (
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="mt-3 px-3 py-2 bg-slate-100 hover:bg-slate-100/90 border border-slate-300 rounded-xl shadow-xs transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                {/* Agent Identity & Info */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1B3A5C] border border-[#11253C] flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-xs">
                    {agentName ? agentName.charAt(0).toUpperCase() : <User size={13} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] sm:text-[10px] font-extrabold text-slate-600 uppercase tracking-wider leading-none mb-0.5">
                      Agent
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={agentName || 'Agent Not Assigned'}>
                      {agentName || 'Agent Not Assigned'}
                    </div>
                  </div>
                </div>

                {/* Fast Action Buttons: Call (Soft Green), Text (Blue), Email (Red) in Circular Badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Call Action - Soft Green Circle */}
                  {hasPhone ? (
                    <a
                      href={`tel:${cleanPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-emerald-600/40"
                      title={`Call ${agentName || 'Agent'}: ${agentPhone}`}
                      aria-label={`Call ${agentName || 'Agent'}`}
                    >
                      <Phone size={14} className="text-white" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-300"
                      title="No phone number recorded. Click to edit."
                      aria-label="No phone number"
                    >
                      <Phone size={14} />
                    </button>
                  )}

                  {/* Text / SMS Action - Blue Circle */}
                  {hasPhone ? (
                    <a
                      href={`sms:${cleanPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-blue-700/60"
                      title={`Text ${agentName || 'Agent'}: ${agentPhone}`}
                      aria-label={`Text ${agentName || 'Agent'}`}
                    >
                      <MessageSquare size={14} className="text-white" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-300"
                      title="No phone number recorded. Click to edit."
                      aria-label="No phone number"
                    >
                      <MessageSquare size={14} />
                    </button>
                  )}

                  {/* Email Action - Red Circle */}
                  {hasEmail ? (
                    <a
                      href={`mailto:${agentEmail}?subject=${encodeURIComponent(emailSubject)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-red-700/60"
                      title={`Email ${agentName || 'Agent'}: ${agentEmail}`}
                      aria-label={`Email ${agentName || 'Agent'}`}
                    >
                      <Mail size={14} className="text-white" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer border border-slate-300"
                      title="No email address recorded. Click to edit."
                      aria-label="No email address"
                    >
                      <Mail size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quick Access Buttons */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            id={`escrow-card-updates-btn-${escrow.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onUpdateTasks();
            }}
            className="w-full py-2.5 bg-slate-50 hover:bg-[#1B3A5C]/5 border border-[#e5e5ea] hover:border-[#1B3A5C]/20 rounded-xl text-xs font-bold text-[#1B3A5C] flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Updates</span>
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenContacts?.();
            }}
            className="w-full py-2.5 bg-slate-50 hover:bg-[#1B3A5C]/5 border border-[#e5e5ea] hover:border-[#1B3A5C]/20 rounded-xl text-xs font-bold text-[#1B3A5C] flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Contacts</span>
          </button>
          {(() => {
            const docCount = escrow.documents?.length || 0;
            const hasDocs = docCount > 0;
            return (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDocuments?.();
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer ${
                  hasDocs
                    ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 animate-pulse'
                }`}
                title={hasDocs ? `${docCount} document(s) attached` : 'No documents attached'}
              >
                <span>{hasDocs ? `Documents (${docCount})` : 'No Documents'}</span>
              </button>
            );
          })()}
        </div>

      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 flex justify-between items-center bg-slate-100/70 border-t border-slate-200/90">
        <div className="text-[10px] italic text-[#86868b]">
          Last updated: {escrow.lastUpdated ? formatDistanceToNow(parseISO(String(escrow.lastUpdated)), { addSuffix: true }) : 'Unknown'}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onViewDetails}
            className="px-3 py-1.5 text-xs font-bold text-black hover:text-slate-700 transition-colors cursor-pointer"
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
