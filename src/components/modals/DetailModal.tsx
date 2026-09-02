import React, { useState } from 'react';
import { Escrow, CONTINGENCIES, getContingencyDaysLeft, getContingencyDueDate, formatPropertyAddress } from '../../types';
import { X, Pencil, Trash2, ExternalLink, Check, Calculator } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';
import { generateCognitoUrl } from '../../utils/cognitoUtils';
import { useAuth } from '../../context/AuthContext';
import { DocumentsSection } from './DocumentsSection';
import { getFormulaLabel } from '../../utils/commissionUtils';

export function DetailModal({ 
  escrow, 
  onClose, 
  onEdit,
  onDelete,
  onToggleTask,
  onUpdateTasks,
  onUpdateEscrow,
  onOpenContacts
}: { 
  escrow: Escrow; 
  onClose: () => void; 
  onEdit: () => void;
  onDelete: () => void;
  onToggleTask: (id: string, key: string) => void;
  onUpdateTasks: (id: string, tasks: Record<string, boolean>) => void;
  onUpdateEscrow: (id: string, data: Partial<Escrow>) => void;
  onOpenContacts?: () => void;
}) {
  const { user } = useAuth();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const daysToCoe = differenceInCalendarDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 5 && escrow.status === 'Open';

  const hasCommissionPercent = escrow.commissionPercent !== undefined && escrow.commissionPercent !== null && !isNaN(Number(escrow.commissionPercent));
  const grossCommission = hasCommissionPercent
    ? escrow.price * (Number(escrow.commissionPercent) / 100)
    : 0;

  const hasClient2 = !!(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim());

  return (
    <div 
      id="detail-modal-overlay" 
      className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div 
        id="detail-modal-container" 
        className="bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] border-t sm:border border-[#e5e5ea] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Apple-style Header */}
        <div id="detail-modal-header" className="px-6 py-5 border-b border-[#fafafa] flex justify-between items-center bg-white shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-semibold text-black uppercase tracking-wider">
                {escrow.clientFirstName} {escrow.clientLastName}
                {hasClient2 && ` & ${escrow.client2FirstName} ${escrow.client2LastName}`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-black mb-2 truncate max-w-[240px] sm:max-w-none" title={formatPropertyAddress(escrow)}>
              {formatPropertyAddress(escrow)}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <StatusBadge status={escrow.status} />
              {escrow.mlsId && (
                <span className="text-[10px] sm:text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  MLS: <strong className="text-black font-semibold">{escrow.mlsId}</strong>
                </span>
              )}
              {escrow.apn && (
                <span className="text-[10px] sm:text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  APN: <strong className="text-black font-semibold">{escrow.apn}</strong>
                </span>
              )}
              {escrow.acceptanceDate && (
                <span className="text-[10px] sm:text-xs text-[#86868b]">
                  Acceptance: <strong className="text-black font-semibold">{format(parseISO(escrow.acceptanceDate), 'MMM d, yyyy')}</strong>
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-[#86868b]">
                COE: <strong className="text-black font-semibold">{escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMM d, yyyy') : 'TBD'}</strong>
                {escrow.coeDays ? <span className="ml-1 text-[#1B3A5C] font-bold">({escrow.coeDays}d Escrow)</span> : null}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => {
                const url = generateCognitoUrl(escrow, user);
                window.open(url, '_blank');
              }} 
              className="px-3 py-1.5 text-xs font-bold text-[#1B3A5C] bg-[#1B3A5C]/5 hover:bg-[#1B3A5C]/10 rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 mr-2"
              title="Open Cognito Form"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Cognito Form</span>
            </button>
            <button 
              onClick={onEdit} 
              className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-slate-50 rounded-full transition-all cursor-pointer active:scale-95" 
              title="Edit Escrow"
            >
              <Pencil size={16} />
            </button>
            <button 
              onClick={onDelete} 
              className="p-2 text-[#86868b] hover:text-red-600 hover:bg-red-50 rounded-full transition-all cursor-pointer active:scale-95" 
              title="Delete Escrow"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-6 bg-[#e5e5ea] mx-1"></div>
            <button 
              onClick={onClose} 
              className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-slate-50 rounded-full transition-all cursor-pointer active:scale-95"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Modal Scrollable Content */}
        <div id="detail-modal-body" className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-6 sm:space-y-8 bg-slate-50 pb-24 sm:pb-28">
          
          {/* Apple/Tesla-style Minimalist Overview */}
          <section id="detail-overview" className="pb-6 border-b border-[#e5e5ea]">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 sm:gap-8">
              
              {/* Sale Price */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black mb-1">Sale Price</span>
                <span className="text-lg sm:text-xl font-normal text-[#1d1d1f]">
                  {formatCurrency(escrow.price)}
                </span>
              </div>

              {/* Gross Commission */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black mb-1">
                  Gross Commission {hasCommissionPercent ? `(${escrow.commissionPercent}%)` : ''}
                </span>
                <span className="text-lg sm:text-xl font-normal text-[#1d1d1f]">
                  {hasCommissionPercent ? formatCurrency(grossCommission) : '-'}
                </span>
              </div>

              {/* Net Commission */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black mb-1">Net Commission</span>
                <span className="text-lg sm:text-xl font-normal text-[#1d1d1f]">
                  {formatCurrency(escrow.netCommission)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5" title={getFormulaLabel(escrow.leadSource || 'Zillow')}>
                  {getFormulaLabel(escrow.leadSource || 'Zillow').split(':')[1] || getFormulaLabel(escrow.leadSource || 'Zillow')}
                </span>
              </div>

              {/* Lead Source */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black mb-1">Lead Source</span>
                <span className="text-sm sm:text-base font-normal text-[#1d1d1f] truncate" title={escrow.leadSource || 'Zillow'}>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#1B3A5C]/10 text-[#1B3A5C]">
                    {escrow.leadSource || 'Zillow'}
                  </span>
                </span>
              </div>

              {/* Escrow */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black mb-1">Escrow</span>
                <span className="text-sm sm:text-base font-normal text-[#1d1d1f] truncate" title={escrow.escrowCompany || 'None Assigned'}>
                  {escrow.escrowCompany || 'None Assigned'}
                </span>
                {escrow.escrowNumber && (
                  <span className="text-xs text-[#86868b] mt-0.5">
                    File #{escrow.escrowNumber}
                  </span>
                )}
              </div>

              {/* Title Company */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black mb-1">Title</span>
                <span className="text-sm sm:text-base font-normal text-[#1d1d1f] truncate" title={escrow.titleCompany || (escrow.titleOfficer ? escrow.titleOfficer : 'None')}>
                  {escrow.titleCompany || (escrow.titleOfficer ? escrow.titleOfficer : 'None')}
                </span>
                {escrow.titleOfficer && escrow.titleCompany && (
                  <span className="text-xs text-[#86868b] mt-0.5 truncate" title={escrow.titleOfficer}>
                    {escrow.titleOfficer}
                  </span>
                )}
              </div>

              {/* Collaborator */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black mb-1">Collaborator</span>
                <span className="text-sm sm:text-base font-normal text-[#1d1d1f] truncate" title={escrow.collaborator || 'Direct Transaction'}>
                  {escrow.collaborator || 'Direct Transaction'}
                </span>
              </div>

            </div>
          </section>

          {/* Contingencies Status Section */}
          <section id="detail-contingencies">
            {(() => {
              const completedContingenciesCount = CONTINGENCIES.filter(t => escrow.tasks[t.key]).length;
              const hasIncompleteContingencies = CONTINGENCIES.some(c => !escrow.tasks[c.key]);

              const handleCompleteAllContingencies = () => {
                const updatedTasks = { ...escrow.tasks };
                CONTINGENCIES.forEach(c => {
                  updatedTasks[c.key] = true;
                });
                onUpdateTasks(escrow.id, updatedTasks);
              };

              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-[#e5e5ea]">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-black">
                      Contingencies Status ({completedContingenciesCount}/{CONTINGENCIES.length})
                    </h3>
                    {hasIncompleteContingencies && (
                      <button 
                        type="button"
                        onClick={handleCompleteAllContingencies}
                        className="text-xs font-bold text-[#1B3A5C] hover:text-[#11253C] hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0"
                        title="Mark all contingencies as done"
                      >
                        Mark all Done
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {CONTINGENCIES.map((c) => {
                      const isCompleted = !!escrow.tasks[c.key];
                      const daysLeft = getContingencyDaysLeft(escrow, c.key);
                      const dueDate = getContingencyDueDate(escrow, c.key);
                      const expDateStr = dueDate ? format(dueDate, 'MMM d') : null;
                      const isOverdue = !isCompleted && daysLeft !== null && daysLeft < 0;
                      const isUrgent = !isCompleted && daysLeft !== null && daysLeft <= 2 && daysLeft >= 0;

                      let statusText = '';
                      let statusColorClass = '';
                      if (isCompleted) {
                        statusText = expDateStr ? `Done (${expDateStr})` : 'Completed';
                        statusColorClass = 'text-white bg-emerald-700 border-emerald-800 font-bold';
                      } else if (daysLeft !== null) {
                        if (daysLeft > 1) {
                          statusText = expDateStr ? `${expDateStr} • ${daysLeft}d left` : `${daysLeft} days left`;
                          statusColorClass = isUrgent ? 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse font-bold' : 'text-slate-600 bg-slate-100/50 border-slate-200';
                        } else if (daysLeft === 1) {
                          statusText = expDateStr ? `${expDateStr} • 1d left` : `1 day left`;
                          statusColorClass = 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse font-bold';
                        } else if (daysLeft === 0) {
                          statusText = expDateStr ? `${expDateStr} • Due today` : `Due today`;
                          statusColorClass = 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse font-bold';
                        } else if (daysLeft === -1) {
                          statusText = expDateStr ? `${expDateStr} • 1d overdue` : `1 day overdue`;
                          statusColorClass = 'text-rose-600 bg-rose-50 border-rose-100 font-bold animate-pulse';
                        } else {
                          statusText = expDateStr ? `${expDateStr} • ${Math.abs(daysLeft)}d overdue` : `${Math.abs(daysLeft)} days overdue`;
                          statusColorClass = 'text-rose-600 bg-rose-50 border-rose-100 font-bold animate-pulse';
                        }
                      } else {
                        statusText = expDateStr ? `Exp: ${expDateStr}` : 'Pending';
                        statusColorClass = 'text-slate-400 bg-slate-50 border-slate-100';
                      }

                      return (
                        <button
                          type="button"
                          key={c.key}
                          onClick={() => onToggleTask(escrow.id, c.key)}
                          className={`flex items-center justify-between p-3 border rounded-xl shadow-2xs transition-all text-left cursor-pointer group active:scale-[0.98] ${
                            isCompleted 
                              ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/80 hover:border-emerald-300' 
                              : 'bg-white border-[#e5e5ea] hover:border-slate-300 hover:bg-slate-50/80'
                          }`}
                          title={isCompleted ? `Click to mark ${c.label} as incomplete` : `Click to mark ${c.label} as complete`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              isCompleted 
                                ? 'bg-emerald-700 text-white shadow-2xs' 
                                : 'border-2 border-slate-300 group-hover:border-emerald-600 bg-white'
                            }`}>
                              {isCompleted && <Check size={13} strokeWidth={3} />}
                            </div>
                            <span className={`text-xs font-semibold truncate ${isCompleted ? 'text-emerald-950 opacity-90' : 'text-[#1d1d1f]'}`} title={`${c.key} - ${c.label}`}>
                              {c.key} - {c.label}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${statusColorClass} shrink-0`}>
                            {statusText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </section>

          {/* Notes Section */}
          {escrow.notes && (
            <section id="detail-notes">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-black mb-3 pb-2 border-b border-[#e5e5ea]">
                Escrow Notes
              </h3>
              <div className="bg-white border border-[#e5e5ea] p-5 rounded-2xl text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed shadow-sm">
                {escrow.notes}
              </div>
            </section>
          )}

          {/* Documents Section */}
          <DocumentsSection 
            escrow={escrow}
            onUpdate={(data) => onUpdateEscrow(escrow.id, data)}
          />

        </div>
      </div>
    </div>
  );
}
