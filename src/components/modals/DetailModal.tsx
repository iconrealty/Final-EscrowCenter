import React, { useState } from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, isContingencyUrgent } from '../../types';
import { X, Pencil, Trash2, MessageSquare, Mail, Copy, Check, MessageCircle, Phone } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { MilestoneChip } from '../escrows/MilestoneChip';
import { ContingencyChip } from '../escrows/ContingencyChip';
import { differenceInDays, parseISO, format } from 'date-fns';

export function DetailModal({ 
  escrow, 
  onClose, 
  onEdit,
  onDelete,
  onToggleTask,
  onUpdateTasks
}: { 
  escrow: Escrow; 
  onClose: () => void; 
  onEdit: () => void;
  onDelete: () => void;
  onToggleTask: (id: string, key: string) => void;
  onUpdateTasks: (id: string, tasks: Record<string, boolean>) => void;
}) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const daysToCoe = differenceInDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 5 && escrow.status === 'Open';

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
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-3 pt-12 pb-6 sm:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80dvh] sm:max-h-[88vh]">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e5e5ea] flex justify-between items-start bg-[#fafafa] shrink-0">
          <div>
            <h2 className="font-bold text-base sm:text-xl text-[#1B3A5C] mb-1 truncate max-w-[180px] sm:max-w-none" title={escrow.address}>{escrow.address}</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <StatusBadge status={escrow.status} />
              {escrow.escrowNumber && (
                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  Escrow #{escrow.escrowNumber}
                </span>
              )}
              <span className="text-[10px] sm:text-xs text-[#86868b]">COE: <strong className="text-[#1d1d1f]">{escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMM d, yyyy') : ''}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button onClick={onEdit} className="p-1.5 sm:p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-gray-100 rounded-xl transition-colors" title="Edit">
              <Pencil size={16} />
            </button>
            <button onClick={onDelete} className="p-1.5 sm:p-2 text-[#86868b] hover:text-[#ef4444] hover:bg-red-50 rounded-xl transition-colors" title="Delete">
              <Trash2 size={16} />
            </button>
            <div className="w-px h-5 sm:h-6 bg-[#e5e5ea] mx-0.5 sm:mx-1"></div>
            <button onClick={onClose} className="p-1.5 sm:p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-gray-100 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* contacts array mapping inside render */}
          {(() => {
            const contacts = [
              {
                role: 'Client',
                name: `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || '-',
                phone: escrow.clientPhone,
                email: escrow.clientEmail,
              },
              {
                role: 'Agent',
                name: escrow.agentName || '-',
                phone: escrow.agentPhone,
                email: escrow.agentEmail,
              },
              {
                role: 'Lender',
                name: escrow.lenderName || '-',
                phone: escrow.lenderPhone,
                email: escrow.lenderEmail,
              },
              {
                role: 'Escrow Officer',
                name: escrow.escrowOfficer || '-',
                phone: escrow.escrowPhone,
                email: escrow.escrowEmail,
              },
            ];

            return (
              <>
                {/* Tesla/Apple-style Key Details Panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-2xl p-4 shadow-sm hover:bg-slate-50/50 transition-colors">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">Sale Price</span>
                    <span className="text-base sm:text-lg font-bold font-mono text-[#16a34a]">{formatCurrency(escrow.price)}</span>
                  </div>

                  <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-2xl p-4 shadow-sm hover:bg-slate-50/50 transition-colors">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">Net Commission</span>
                    <span className="text-base sm:text-lg font-bold font-mono text-[#FF7518]">{formatCurrency(escrow.netCommission)}</span>
                  </div>

                  <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-2xl p-4 shadow-sm hover:bg-slate-50/50 transition-colors">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">Escrow Company</span>
                    <span className="text-xs sm:text-sm font-bold text-[#1d1d1f] line-clamp-1" title={escrow.escrowCompany}>{escrow.escrowCompany || '-'}</span>
                  </div>

                  <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-2xl p-4 shadow-sm hover:bg-slate-50/50 transition-colors">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#86868b] block mb-1">Collaborator</span>
                    <span className="text-xs sm:text-sm font-bold text-[#1d1d1f] line-clamp-1" title={escrow.collaborator}>{escrow.collaborator || '-'}</span>
                  </div>
                </div>

                {/* Key Contacts Section */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#86868b] mb-3 pb-1 border-b border-[#e5e5ea]">Key Contacts</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {contacts.map((c) => {
                      return (
                        <div key={c.role} className="bg-white border border-[#e5e5ea] rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1B3A5C]/60 block mb-0.5">{c.role}</span>
                            <h4 className="text-xs font-extrabold text-[#1B3A5C] truncate" title={c.name}>{c.name}</h4>
                            <p className="text-[11px] text-[#1B3A5C] font-medium mt-1.5 truncate select-all" title={c.phone || undefined}>{c.phone || 'No phone'}</p>
                            <p className="text-[11px] text-[#1B3A5C] font-medium truncate select-all" title={c.email || undefined}>{c.email || 'No email'}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-[#f5f5f7]">
                            {c.phone && c.phone.trim() !== '' && c.phone !== '-' ? (
                              <>
                                <a
                                  href={`tel:${c.phone.replace(/\D/g, '')}`}
                                  className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 bg-[#f5f5f7] hover:bg-[#1B3A5C] hover:text-white text-[#1B3A5C] rounded-xl text-[10px] font-bold transition-all border border-transparent hover:scale-[1.03] active:scale-[0.97]"
                                  title={`Call ${c.role}`}
                                >
                                  <Phone size={12} />
                                  <span className="text-[9px]">Call</span>
                                </a>
                                <a
                                  href={`sms:${c.phone.replace(/\D/g, '')}`}
                                  className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 bg-[#f5f5f7] hover:bg-[#1B3A5C] hover:text-white text-[#1B3A5C] rounded-xl text-[10px] font-bold transition-all border border-transparent hover:scale-[1.03] active:scale-[0.97]"
                                  title={`Text ${c.role}`}
                                >
                                  <MessageSquare size={12} />
                                  <span className="text-[9px]">Text</span>
                                </a>
                              </>
                            ) : (
                              <>
                                <div className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 bg-[#f5f5f7]/40 text-gray-300 rounded-xl text-[10px] font-bold cursor-not-allowed">
                                  <Phone size={12} className="opacity-40" />
                                  <span className="text-[9px] opacity-40">Call</span>
                                </div>
                                <div className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 bg-[#f5f5f7]/40 text-gray-300 rounded-xl text-[10px] font-bold cursor-not-allowed">
                                  <MessageSquare size={12} className="opacity-40" />
                                  <span className="text-[9px] opacity-40">Text</span>
                                </div>
                              </>
                            )}

                            {c.email && c.email.trim() !== '' && c.email !== '-' ? (
                              <a
                                href={`mailto:${c.email}`}
                                className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 bg-[#f5f5f7] hover:bg-[#1B3A5C] hover:text-white text-[#1B3A5C] rounded-xl text-[10px] font-bold transition-all border border-transparent hover:scale-[1.03] active:scale-[0.97]"
                                title={`Email ${c.role}`}
                              >
                                <Mail size={12} />
                                <span className="text-[9px]">Email</span>
                              </a>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 py-1.5 px-1 bg-[#f5f5f7]/40 text-gray-300 rounded-xl text-[10px] font-bold cursor-not-allowed">
                                <Mail size={12} className="opacity-40" />
                                <span className="text-[9px] opacity-40">Email</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 border-b border-[#e5e5ea] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155]">Milestones</h3>
              <span className="text-xs text-[#86868b] font-medium italic">View Only</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MILESTONES.map(m => (
                <MilestoneChip 
                  key={m.key}
                  label={m.key}
                  isDone={escrow.tasks[m.key]}
                  isOverdue={!escrow.tasks[m.key] && isUrgent}
                  readOnly={true}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 border-b border-[#e5e5ea] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155]">Contingencies Removed</h3>
              <span className="text-xs text-[#86868b] font-medium italic">View Only</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONTINGENCIES.map(c => (
                <ContingencyChip 
                  key={c.key}
                  taskKey={c.key}
                  label={c.label}
                  isDone={escrow.tasks[c.key]}
                  isOverdue={isContingencyUrgent(escrow, c.key)}
                  readOnly={true}
                />
              ))}
            </div>
          </div>

          {escrow.notes && (
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">Notes</h3>
              <div className="bg-[#f5f5f7] p-4 rounded-xl text-sm text-[#1d1d1f] whitespace-pre-wrap border border-[#e5e5ea]">
                {escrow.notes}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
