import React, { useState } from 'react';
import { Escrow } from '../../types';
import { X, Pencil, Trash2, MessageSquare, Mail, Phone, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { differenceInDays, parseISO, format } from 'date-fns';
import { generateCognitoUrl } from '../../utils/cognitoUtils';
import { useAuth } from '../../context/AuthContext';

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
  const { user } = useAuth();

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const daysToCoe = differenceInDays(parseISO(String(escrow.coeDate || new Date().toISOString())), new Date());
  const isUrgent = daysToCoe <= 5 && escrow.status === 'Open';

  const hasCommissionPercent = escrow.commissionPercent !== undefined && escrow.commissionPercent !== null && !isNaN(Number(escrow.commissionPercent));
  const grossCommission = hasCommissionPercent
    ? escrow.price * (Number(escrow.commissionPercent) / 100)
    : 0;

  const hasClient2 = !!(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim());

  const contacts = [
    {
      role: 'Client 1',
      name: `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || '-',
      phone: escrow.clientPhone,
      email: escrow.clientEmail,
    },
    {
      role: 'Client 2',
      name: `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim() || '-',
      phone: escrow.client2Phone,
      email: escrow.client2Email,
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

  const activeContacts = contacts.filter(c => {
    if (c.role === 'Client 2' && !hasClient2) return false;
    return true;
  });

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
              <span className="text-[10px] font-bold text-[#11253C] uppercase tracking-wider">
                {escrow.clientFirstName} {escrow.clientLastName}
                {hasClient2 && ` & ${escrow.client2FirstName} ${escrow.client2LastName}`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-[#1d1d1f] mb-2 truncate max-w-[240px] sm:max-w-none" title={escrow.address}>
              {escrow.address}
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <StatusBadge status={escrow.status} />
              <span className="text-[10px] sm:text-xs text-[#86868b]">
                COE: <strong className="text-[#1d1d1f]">{escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMM d, yyyy') : 'TBD'}</strong>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
              
              {/* Sale Price */}
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-widest text-[#86868b] mb-1">Sale Price</span>
                <span className="text-lg sm:text-xl font-normal text-[#1d1d1f]">
                  {formatCurrency(escrow.price)}
                </span>
              </div>

              {/* Gross Commission */}
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-widest text-[#86868b] mb-1">
                  Gross Commission {hasCommissionPercent ? `(${escrow.commissionPercent}%)` : ''}
                </span>
                <span className="text-lg sm:text-xl font-normal text-[#1d1d1f]">
                  {hasCommissionPercent ? formatCurrency(grossCommission) : '-'}
                </span>
              </div>

              {/* Net Commission */}
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-widest text-[#86868b] mb-1">Net Commission</span>
                <span className="text-lg sm:text-xl font-normal text-[#1d1d1f]">
                  {formatCurrency(escrow.netCommission)}
                </span>
              </div>

              {/* Escrow */}
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-widest text-[#86868b] mb-1">Escrow</span>
                <span className="text-sm sm:text-base font-normal text-[#1d1d1f] truncate" title={escrow.escrowCompany || 'None Assigned'}>
                  {escrow.escrowCompany || 'None Assigned'}
                </span>
                {escrow.escrowNumber && (
                  <span className="text-xs text-[#86868b] mt-0.5">
                    File #{escrow.escrowNumber}
                  </span>
                )}
              </div>

              {/* Collaborator */}
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-widest text-[#86868b] mb-1">Collaborator</span>
                <span className="text-sm sm:text-base font-normal text-[#1d1d1f] truncate" title={escrow.collaborator || 'Direct Transaction'}>
                  {escrow.collaborator || 'Direct Transaction'}
                </span>
              </div>

            </div>
          </section>

          {/* Key Contacts Section */}
          <section id="detail-contacts">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[#86868b] mb-4 pb-2 border-b border-[#e5e5ea]">
              Key Contacts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {activeContacts.map((c) => {
                const hasPhone = c.phone && c.phone.trim() !== '' && c.phone !== '-';
                const hasEmail = c.email && c.email.trim() !== '' && c.email !== '-';
                return (
                  <div 
                    key={c.role} 
                    className="flex items-start justify-between py-3 border-b border-[#fafafa] bg-white sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none shadow-sm sm:shadow-none border sm:border-0 border-[#e5e5ea]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-[#86868b] block mb-0.5">
                        {c.role}
                      </span>
                      <h4 className="text-sm font-medium text-[#1d1d1f] truncate" title={c.name}>
                        {c.name}
                      </h4>
                      <div className="mt-1 space-y-0.5">
                        {hasPhone ? (
                          <p className="text-xs text-[#515154] font-normal select-all">
                            {c.phone}
                          </p>
                        ) : (
                          <p className="text-xs text-[#c1c1c4] italic font-normal">
                            No Phone Number
                          </p>
                        )}
                        {hasEmail ? (
                          <p className="text-xs text-[#515154] font-normal select-all truncate" title={c.email}>
                            {c.email}
                          </p>
                        ) : (
                          <p className="text-xs text-[#c1c1c4] italic font-normal">
                            No Email Address
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-center">
                      {hasPhone ? (
                        <>
                          <a
                            href={`tel:${c.phone!.replace(/\D/g, '')}`}
                            className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-white sm:hover:bg-slate-100 rounded-full transition-all active:scale-[0.95]"
                            title={`Call ${c.role}`}
                          >
                            <Phone size={14} />
                          </a>
                          <a
                            href={`sms:${c.phone!.replace(/\D/g, '')}`}
                            className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-white sm:hover:bg-slate-100 rounded-full transition-all active:scale-[0.95]"
                            title={`Text ${c.role}`}
                          >
                            <MessageSquare size={14} />
                          </a>
                        </>
                      ) : null}

                      {hasEmail ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-white sm:hover:bg-slate-100 rounded-full transition-all active:scale-[0.95]"
                          title={`Email ${c.role}`}
                        >
                          <Mail size={14} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notes Section */}
          {escrow.notes && (
            <section id="detail-notes">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#86868b] mb-3 pb-2 border-b border-[#e5e5ea]">
                Escrow Notes
              </h3>
              <div className="bg-white border border-[#e5e5ea] p-5 rounded-2xl text-sm text-[#1d1d1f] whitespace-pre-wrap leading-relaxed shadow-sm">
                {escrow.notes}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
