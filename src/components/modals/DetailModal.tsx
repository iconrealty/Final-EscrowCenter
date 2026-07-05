import React, { useState, useEffect } from 'react';
import { Escrow, MILESTONES, CONTINGENCIES, isContingencyUrgent } from '../../types';
import { X, Pencil, Trash2, MessageSquare, Mail, Copy, Check, MessageCircle } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { MilestoneChip } from '../escrows/MilestoneChip';
import { ContingencyChip } from '../escrows/ContingencyChip';
import { differenceInDays, parseISO, format } from 'date-fns';

const TEMPLATES = [
  {
    id: 'opening',
    label: 'New Escrow Opened',
    subject: 'Escrow Opened: [Address]',
    text: 'Hi [ClientName], Escrow has officially been opened 🎉\nHere are the important contacts to keep in mind:\n\nESCROW:\n\nEscrow company: [Collaborator]\nEscrow officer: [EscrowOfficer]\nEscrow email: [EscrowEmail]\nEscrow phone number: [EscrowPhone]\n\nTransaction Coordinators\nBrittany Kauten\nbrittany@iconrealty.io\n\nKatya Abellar\ntc@iconrealty.io\n\nWHAT’S NEXT:\n\nEscrow will be sending you wire instructions shortly for the initial deposit (3%). Please follow the instructions carefully. If you have any questions at any time, I’m always available.\n\nInspection: I’m coordinating the inspection, tentatively for Wednesday afternoon. I’ll confirm availability and keep you posted.'
  },
  {
    id: 'emd',
    label: 'Earnest Money (EMD) Received',
    subject: 'EMD Received - [Address]',
    text: 'Hi [ClientName], this is to confirm that your Earnest Money Deposit (EMD) has been successfully received by [EscrowOfficer]. That is another major milestone complete! I will keep you posted on the next steps. - [AgentName]'
  },
  {
    id: 'inspection',
    label: 'Home Inspection',
    subject: 'Home Inspection Update - [Address]',
    text: 'Hi [ClientName], our home inspection for [Address] is now complete. I will review the report in detail so we can decide on any Request for Repairs (RR) if necessary. I will call you shortly to discuss. - [AgentName]'
  },
  {
    id: 'appraisal',
    label: 'Appraisal Completed',
    subject: 'Appraisal Completed - [Address]',
    text: 'Hi [ClientName], fantastic news! The property appraisal for [Address] has been completed and it came in at value! We are in great shape to move forward. - [AgentName]'
  },
  {
    id: 'disclosures',
    label: 'Disclosures Reviewed',
    subject: 'Disclosures Completed - [Address]',
    text: 'Hi [ClientName], we have successfully completed the review and signature of all seller disclosures for [Address]. Thank you for your prompt responses! - [AgentName]'
  },
  {
    id: 'loan_approval',
    label: 'Loan Final Approval Secured',
    subject: 'Loan Final Approval Secured - [Address]',
    text: 'Hi [ClientName], congratulations! Your lender has issued the Final Loan Approval! This is a major milestone and means we are almost at the finish line. Next up will be signing our final loan documents. - [AgentName]'
  },
  {
    id: 'contingencies',
    label: 'Contingencies Removed',
    subject: 'Contingencies Removed - [Address]',
    text: 'Hi [ClientName], we have officially removed the contingencies for your escrow on [Address]! This is a huge milestone that secures our position and brings us one step closer to closing on [COE]. - [AgentName]'
  },
  {
    id: 'signing',
    label: 'Docs Signed',
    subject: 'Signing Complete - [Address]',
    text: 'Hi [ClientName], great job signing the final escrow and loan documents today! We are now waiting on the final lender review, funding, and recording. - [AgentName]'
  },
  {
    id: 'funds',
    label: 'Final Funds Wired',
    subject: 'Final Wire Received - [Address]',
    text: 'Hi [ClientName], the escrow company has confirmed receipt of your final wire deposit. Everything is set on your side for recording. - [AgentName]'
  },
  {
    id: 'closing',
    label: 'Transaction Closed',
    subject: 'Congratulations! Escrow Closed - [Address]',
    text: 'Hi [ClientName], IT IS OFFICIAL! Our transaction has recorded and escrow is officially CLOSED on [Address]! Congratulations on your home! It has been an absolute pleasure working with you. - [AgentName]'
  }
];

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

  const [templates, setTemplates] = useState<typeof TEMPLATES>(() => {
    const saved = localStorage.getItem('escrow_custom_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return TEMPLATES.map(t => {
          const custom = parsed.find((p: any) => p.id === t.id);
          return custom ? { ...t, text: custom.text, subject: custom.subject || t.subject } : t;
        });
      } catch (e) {
        return TEMPLATES;
      }
    }
    return TEMPLATES;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState('opening');
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);

  // States for Master Customization
  const [isEditingMaster, setIsEditingMaster] = useState(false);
  const [masterSubject, setMasterSubject] = useState('');
  const [masterText, setMasterText] = useState('');

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const getPopulatedText = (rawText: string) => {
    let text = rawText;
    const clientFullName = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim();
    text = text.replace(/\[ClientName\]/g, clientFullName || 'Client');
    text = text.replace(/\[ClientFirstName\]/g, escrow.clientFirstName || 'Client');
    text = text.replace(/\[ClientLastName\]/g, escrow.clientLastName || '');
    text = text.replace(/\[Address\]/g, escrow.address || 'the property');
    text = text.replace(/\[COE\]/g, escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMMM d, yyyy') : 'the scheduled closing date');
    text = text.replace(/\[Price\]/g, formatCurrency(escrow.price));
    text = text.replace(/\[AgentName\]/g, escrow.agentName || 'your agent');
    text = text.replace(/\[EscrowOfficer\]/g, escrow.escrowOfficer || 'the escrow officer');
    text = text.replace(/\[EscrowCompany\]/g, escrow.escrowCompany || 'the escrow company');
    text = text.replace(/\[Collaborator\]/g, escrow.escrowCompany || escrow.collaborator || 'the escrow company');
    text = text.replace(/\[EscrowEmail\]/g, escrow.escrowEmail || 'N/A');
    text = text.replace(/\[EscrowPhone\]/g, escrow.escrowPhone || 'N/A');
    return text;
  };

  const getPopulatedSubject = (rawSubject: string) => {
    let subject = rawSubject;
    subject = subject.replace(/\[Address\]/g, escrow.address || 'the property');
    return subject;
  };

  useEffect(() => {
    if (selectedTemplate) {
      setEditedText(getPopulatedText(selectedTemplate.text));
      setMasterSubject(selectedTemplate.subject);
      setMasterText(selectedTemplate.text);
    }
  }, [selectedTemplateId, templates, escrow]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMaster = () => {
    const updated = templates.map(t => {
      if (t.id === selectedTemplateId) {
        return { ...t, subject: masterSubject, text: masterText };
      }
      return t;
    });
    setTemplates(updated);
    localStorage.setItem('escrow_custom_templates', JSON.stringify(updated));
    setIsEditingMaster(false);
  };

  const handleResetTemplate = () => {
    const original = TEMPLATES.find(t => t.id === selectedTemplateId);
    if (original) {
      setMasterSubject(original.subject);
      setMasterText(original.text);
    }
  };

  const insertPlaceholder = (tag: string, field: 'subject' | 'text') => {
    if (field === 'subject') {
      setMasterSubject(prev => prev + tag);
    } else {
      setMasterText(prev => prev + tag);
    }
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Client</div>
              <div className="text-sm font-bold text-[#1d1d1f]">
                {`${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || '-'}
              </div>
              {(escrow.clientPhone || escrow.clientEmail) && (
                <div className="text-[10px] text-[#86868b] mt-1 space-y-0.5">
                  {escrow.clientPhone && <div>Phone: {escrow.clientPhone}</div>}
                  {escrow.clientEmail && <div className="truncate" title={escrow.clientEmail}>Email: {escrow.clientEmail}</div>}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Agent</div>
              <div className="text-sm font-bold text-[#1d1d1f]">{escrow.agentName || '-'}</div>
              {(escrow.agentPhone || escrow.agentEmail) && (
                <div className="text-[10px] text-[#86868b] mt-1 space-y-0.5">
                  {escrow.agentPhone && <div>Phone: {escrow.agentPhone}</div>}
                  {escrow.agentEmail && <div className="truncate" title={escrow.agentEmail}>Email: {escrow.agentEmail}</div>}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Lender</div>
              <div className="text-sm font-bold text-[#1d1d1f]">{escrow.lenderName || '-'}</div>
              {(escrow.lenderPhone || escrow.lenderEmail) && (
                <div className="text-[10px] text-[#86868b] mt-1 space-y-0.5">
                  {escrow.lenderPhone && <div>Phone: {escrow.lenderPhone}</div>}
                  {escrow.lenderEmail && <div className="truncate" title={escrow.lenderEmail}>Email: {escrow.lenderEmail}</div>}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Escrow Company</div>
              <div className="text-sm font-bold text-[#1d1d1f]">{escrow.escrowCompany || '-'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Escrow Officer</div>
              <div className="text-sm font-bold text-[#1d1d1f]">{escrow.escrowOfficer || '-'}</div>
              {(escrow.escrowPhone || escrow.escrowEmail) && (
                <div className="text-[10px] text-[#86868b] mt-1 space-y-0.5">
                  {escrow.escrowPhone && <div>Phone: {escrow.escrowPhone}</div>}
                  {escrow.escrowEmail && <div className="truncate" title={escrow.escrowEmail}>Email: {escrow.escrowEmail}</div>}
                </div>
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Collaborator</div>
              <div className="text-sm font-bold text-[#1d1d1f]">{escrow.collaborator || '-'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Sale Price</div>
              <div className="text-base font-bold font-mono text-[#16a34a]">{formatCurrency(escrow.price)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#334155] font-bold mb-1">Net Commission</div>
              <div className="text-base font-bold font-mono text-[#FF7518]">{formatCurrency(escrow.netCommission)}</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 border-b border-[#e5e5ea] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155]">Milestones</h3>
              {hasIncompleteMilestones && (
                <button 
                  onClick={handleCompleteAllMilestones}
                  className="text-xs text-[#1B3A5C] hover:text-[#11253C] font-bold hover:underline transition-all flex items-center gap-1 cursor-pointer"
                >
                  Mark All Done
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {MILESTONES.map(m => (
                <MilestoneChip 
                  key={m.key}
                  label={m.key}
                  isDone={escrow.tasks[m.key]}
                  isOverdue={!escrow.tasks[m.key] && isUrgent}
                  onClick={() => onToggleTask(escrow.id, m.key)}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-3 border-b border-[#e5e5ea] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155]">Contingencies Removed</h3>
              {hasIncompleteContingencies && (
                <button 
                  onClick={handleCompleteAllContingencies}
                  className="text-xs text-[#1B3A5C] hover:text-[#11253C] font-bold hover:underline transition-all flex items-center gap-1 cursor-pointer"
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

          {escrow.notes && (
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155] mb-2">Notes</h3>
              <div className="bg-[#f5f5f7] p-4 rounded-xl text-sm text-[#1d1d1f] whitespace-pre-wrap border border-[#e5e5ea]">
                {escrow.notes}
              </div>
            </div>
          )}

          {/* Client Updates Section */}
          <div className="mt-8 border-t border-[#e5e5ea] pt-6 pb-2">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155]">Client Updates</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingMaster(!isEditingMaster)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center transition-all ${
                    isEditingMaster 
                      ? 'bg-[#FF7518] text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-[#334155]'
                  }`}
                >
                  {isEditingMaster ? 'Cancel Customize' : 'Customize Phrasing'}
                </button>
              </div>
            </div>

            {!isEditingMaster ? (
              <>
                <p className="text-xs text-[#86868b] mb-4 leading-relaxed">
                  Select a milestone below to generate a personalized text/email with the client's details. You can review and edit it before copying or sending.
                </p>

                {/* Template Selector Horizontal scroll list */}
                <div className="flex gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                        selectedTemplateId === t.id
                          ? 'bg-[#1B3A5C] border-[#1B3A5C] text-white shadow-sm'
                          : 'bg-white border-[#e5e5ea] text-[#334155] hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Template Workspace Box */}
                <div className="bg-slate-50 border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">
                      Populated Message Preview (Editable)
                    </span>
                    {escrow.clientPhone && (
                      <span className="text-[10px] font-mono font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-2 py-0.5 rounded">
                        Recipient: {`${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || 'Client'} ({escrow.clientPhone})
                      </span>
                    )}
                  </div>

                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-[#e5e5ea] rounded-xl p-3 text-sm focus:outline-none focus:border-[#1B3A5C] font-sans leading-relaxed"
                  />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#e5e5ea]">
                    <div className="flex flex-col">
                      {!escrow.clientPhone && (
                        <span className="text-[10px] text-[#ef4444] font-bold">No client phone saved (add in edit form)</span>
                      )}
                      {!escrow.clientEmail && (
                        <span className="text-[10px] text-[#86868b] font-medium">No client email saved</span>
                      )}
                    </div>

                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 bg-white border border-[#e5e5ea] hover:bg-gray-50 text-[#334155] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                        title="Copy message to clipboard"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>

                      <a
                        href={`sms:${escrow.clientPhone ? escrow.clientPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                        className={`px-3 py-1.5 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                          escrow.clientPhone ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                        }`}
                        title={escrow.clientPhone ? "Open in SMS/iMessage app" : "Save client phone number first"}
                      >
                        Text
                      </a>

                      <a
                        href={`mailto:${escrow.clientEmail || ''}?subject=${encodeURIComponent(getPopulatedSubject(selectedTemplate.subject))}&body=${encodeURIComponent(editedText)}`}
                        className={`px-3 py-1.5 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                          escrow.clientEmail ? 'bg-[#FF7518] hover:bg-[#CC5E13]' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                        }`}
                        title={escrow.clientEmail ? "Open in default Mail app" : "Save client email address first"}
                      >
                        Email
                      </a>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-[#FF7518]">
                    Editing Master Phrasing: <span className="text-slate-700">{selectedTemplate.label}</span>
                  </h4>
                  <button
                    onClick={handleResetTemplate}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline font-bold"
                  >
                    Restore Original Phrasing
                  </button>
                </div>

                {/* Subject Field */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-[#334155]">Master Subject</label>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => insertPlaceholder('[Address]', 'subject')}
                        className="text-[8px] bg-white border border-[#e5e5ea] rounded px-1.5 py-0.5 font-mono text-[#1B3A5C] hover:bg-slate-100 font-bold"
                      >
                        + [Address]
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={masterSubject}
                    onChange={(e) => setMasterSubject(e.target.value)}
                    className="w-full bg-white border border-[#e5e5ea] rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-[#1B3A5C]"
                    placeholder="e.g. Escrow Opened - [Address]"
                  />
                </div>

                {/* Text Body Field */}
                <div>
                  <div className="flex flex-col gap-1.5 mb-2">
                    <label className="text-[10px] uppercase font-bold text-[#334155]">Master Message Text Body</label>
                    
                    {/* Placeholder Helper Buttons */}
                    <div className="flex flex-wrap gap-1 bg-white p-2 rounded-xl border border-[#e5e5ea]">
                      <span className="text-[8px] font-bold text-[#86868b] uppercase tracking-wider self-center mr-1">Insert secure placeholders:</span>
                      {[
                        { tag: '[ClientName]', label: 'Client Full Name' },
                        { tag: '[ClientFirstName]', label: 'Client First Name' },
                        { tag: '[ClientLastName]', label: 'Client Last Name' },
                        { tag: '[Address]', label: 'Property Address' },
                        { tag: '[COE]', label: 'COE Date' },
                        { tag: '[Price]', label: 'Sale Price' },
                        { tag: '[AgentName]', label: 'Agent Name' },
                        { tag: '[EscrowOfficer]', label: 'Escrow Officer' },
                        { tag: '[EscrowCompany]', label: 'Escrow Company' },
                        { tag: '[Collaborator]', label: 'Collaborator' },
                        { tag: '[EscrowEmail]', label: 'Escrow Email' },
                        { tag: '[EscrowPhone]', label: 'Escrow Phone' }
                      ].map(p => (
                        <button
                          key={p.tag}
                          type="button"
                          onClick={() => insertPlaceholder(p.tag, 'text')}
                          className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-[#e5e5ea] rounded-lg px-2 py-1 font-bold text-[#1B3A5C] active:scale-95 transition-all flex items-center gap-0.5"
                          title={`Insert ${p.tag}`}
                        >
                          + <span className="font-mono">{p.tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={masterText}
                    onChange={(e) => setMasterText(e.target.value)}
                    rows={5}
                    className="w-full bg-white border border-[#e5e5ea] rounded-xl p-3 text-sm focus:outline-none focus:border-[#1B3A5C] font-sans leading-relaxed"
                    placeholder="Type your message text here..."
                  />
                  <p className="text-[10px] text-[#86868b] mt-1.5 leading-normal">
                    <strong>Tips:</strong> Keep the brackets intact! When you view any escrow, the system will automatically swap out <code>[ClientName]</code> with the actual client name, <code>[Address]</code> with the actual address, etc.
                  </p>
                </div>

                {/* Save & Cancel Controls */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[#e5e5ea]">
                  <button
                    onClick={() => setIsEditingMaster(false)}
                    className="px-3 py-1.5 bg-white border border-[#e5e5ea] hover:bg-slate-100 text-[#334155] rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMaster}
                    className="px-4 py-1.5 bg-[#1B3A5C] hover:bg-[#11253C] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    Save Phrasing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
