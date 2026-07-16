import React, { useState } from 'react';
import { Escrow } from '../../types';
import { X, Pencil, Trash2, MessageSquare, Mail, Phone } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
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
        <div id="detail-modal-header" className="px-6 py-5 border-b border-[#f5f5f7] flex justify-between items-center bg-white shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#86868b]">Escrow File Details</span>
              <span className="text-[#86868b] text-[10px]">•</span>
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                {escrow.clientFirstName} {escrow.clientLastName}
                {hasClient2 && ` & ${escrow.client2FirstName} ${escrow.client2LastName}`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#1d1d1f] mb-2 truncate max-w-[240px] sm:max-w-none" title={escrow.address}>
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
              onClick={onEdit} 
              className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full transition-all cursor-pointer active:scale-95" 
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
              className="p-2 text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full transition-all cursor-pointer active:scale-95"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Modal Scrollable Content */}
        <div id="detail-modal-body" className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-6 sm:space-y-8 bg-[#fafafa] pb-24 sm:pb-28">
          
          {/* Apple/Tesla-style Bento Grid Overview */}
          <section id="detail-overview">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Sale Price Card */}
              <div className="bg-white border border-[#e5e5ea] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300">
                <div className="mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#86868b]">Sale Price</span>
                </div>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#111827] tracking-tight">
                  {formatCurrency(escrow.price)}
                </span>
              </div>

              {/* Net Commission Card */}
              <div className="bg-white border border-[#e5e5ea] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300">
                <div className="mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#86868b]">Net Commission</span>
                </div>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#CC5E13] tracking-tight">
                  {formatCurrency(escrow.netCommission)}
                </span>
              </div>

              {/* Escrow Card */}
              <div className="bg-white border border-[#e5e5ea] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300">
                <div className="mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#86868b]">Escrow</span>
                </div>
                <span className="text-sm font-black text-[#1d1d1f] block truncate" title={escrow.escrowCompany || 'None Assigned'}>
                  {escrow.escrowCompany || 'None Assigned'}
                </span>
                {escrow.escrowNumber && (
                  <span className="text-xs font-mono font-medium text-slate-500 block mt-1">
                    File #{escrow.escrowNumber}
                  </span>
                )}
              </div>

              {/* Collaborator Card */}
              <div className="bg-white border border-[#e5e5ea] rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300">
                <div className="mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#86868b]">Collaborator</span>
                </div>
                <span className="text-sm font-black text-[#1d1d1f] block truncate" title={escrow.collaborator || 'Direct Transaction'}>
                  {escrow.collaborator || 'Direct Transaction'}
                </span>
              </div>

            </div>
          </section>

          {/* Key Contacts Section */}
          <section id="detail-contacts">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#86868b] mb-4 pb-2 border-b border-[#e5e5ea]">
              Key Contacts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {contacts.map((c) => (
                <div 
                  key={c.role} 
                  className="bg-white border border-[#e5e5ea] rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#86868b] block mb-1">
                      {c.role}
                    </span>
                    <h4 className="text-sm font-semibold text-[#1d1d1f] truncate" title={c.name}>
                      {c.name}
                    </h4>
                    <div className="mt-3 space-y-1">
                      {c.phone && c.phone.trim() !== '' && c.phone !== '-' ? (
                        <p className="text-xs text-[#0f2d59] hover:text-blue-600 font-normal truncate select-all" title={c.phone}>
                          {c.phone}
                        </p>
                      ) : (
                        <p className="text-xs text-[#86868b] font-medium truncate">
                          No Phone Number
                        </p>
                      )}
                      {c.email && c.email.trim() !== '' && c.email !== '-' ? (
                        <p className="text-xs text-[#0f2d59] hover:text-blue-600 font-normal truncate select-all" title={c.email}>
                          {c.email}
                        </p>
                      ) : (
                        <p className="text-xs text-[#86868b] font-medium truncate">
                          No Email Address
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-4 mt-5 pt-4 border-t border-[#f5f5f7]">
                    {c.phone && c.phone.trim() !== '' && c.phone !== '-' ? (
                      <>
                        <a
                          href={`tel:${c.phone.replace(/\D/g, '')}`}
                          className="w-10 h-10 rounded-full border border-orange-500 flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-all active:scale-[0.95]"
                          title={`Call ${c.role}`}
                        >
                          <Phone size={18} />
                        </a>
                        <a
                          href={`sms:${c.phone.replace(/\D/g, '')}`}
                          className="w-10 h-10 rounded-full border border-orange-500 flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-all active:scale-[0.95]"
                          title={`Text ${c.role}`}
                        >
                          <MessageSquare size={18} />
                        </a>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 cursor-not-allowed">
                          <Phone size={18} className="opacity-50" />
                        </div>
                        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 cursor-not-allowed">
                          <MessageSquare size={18} className="opacity-50" />
                        </div>
                      </>
                    )}

                    {c.email && c.email.trim() !== '' && c.email !== '-' ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="w-10 h-10 rounded-full border border-orange-500 flex items-center justify-center text-orange-500 hover:bg-orange-50 transition-all active:scale-[0.95]"
                        title={`Email ${c.role}`}
                      >
                        <Mail size={18} />
                      </a>
                    ) : (
                      <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 cursor-not-allowed">
                        <Mail size={18} className="opacity-50" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
