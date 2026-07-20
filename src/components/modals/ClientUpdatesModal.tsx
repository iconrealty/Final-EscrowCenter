import React, { useState, useEffect, useRef } from 'react';
import { Escrow } from '../../types';
import { X, MessageSquare, Mail, Copy, Check, ChevronDown } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const TEMPLATES = [
  {
    id: 'opening',
    label: 'New Escrow Opened (Buyer)',
    subject: 'Escrow Opened: [Address]',
    text: 'Hi [ClientName], Escrow has officially been opened 🎉\nHere are the important contacts to keep in mind:\n\nESCROW:\n\nEscrow company: [Collaborator]\nEscrow officer: [EscrowOfficer]\nEscrow email: [EscrowEmail]\nEscrow phone number: [EscrowPhone]\n\nTransaction Coordinators\nBrittany Kauten\nbrittany@iconrealty.io\n\nKatya Abellar\ntc@iconrealty.io\n\nWHAT’S NEXT:\n\nEscrow will be sending you wire instructions shortly for the initial deposit (3%). Please follow the instructions carefully. If you have any questions at any time, I’m always available.\n\nInspection: I’m coordinating the inspection, tentatively for Wednesday afternoon. I’ll confirm availability and keep you posted.'
  },
  {
    id: 'opening_listing',
    label: 'New Escrow Opened (Listing)',
    subject: 'Escrow Opened: [Address]',
    text: 'Hi [ClientName], Escrow has officially been opened 🎉\nHere are the important contacts to keep in mind:\n\nESCROW:\n\nEscrow company: [Collaborator]\nEscrow officer: [EscrowOfficer]\nEscrow email: [EscrowEmail]\nEscrow phone number: [EscrowPhone]\n\nTransaction Coordinators\nBrittany Kauten\nbrittany@iconrealty.io\n\nKatya Abellar\ntc@iconrealty.io\n\nWHAT’S NEXT:\n\nWe will be coordinating the next steps with the buyer\'s side. If you have any questions at any time, I’m always available.'
  },
  {
    id: 'first_escrow_email',
    label: 'First Escrow Email',
    subject: 'First Escrow Email - [Address]',
    text: 'Hi [Esrow Officer],\n\nWhile my Transaction Coordinator uploads the remaining documents to our platform, below is the buyer and Transaction Coordinator information.\n\nBuyers\nName: [Buyer Name]\nEmail: [Buyer Email]\nPhone: [Buyer Phone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!'
  },
  {
    id: 'request_open_escrow_listing',
    label: 'Request to Open Escrow(Listing)',
    subject: 'Request to Open Escrow: [Address]',
    text: 'Hi [Esrow Officer],\n\nPlease open escrow for our new listing at [Address].\n\nSellers\nName: [ClientName]\nEmail: [Buyer Email]\nPhone: [Buyer Phone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!'
  },
  {
    id: 'emd',
    label: 'Earnest Money (EMD) Received',
    subject: 'EMD Received - [Address]',
    text: 'Hi [ClientName], this is to confirm that your Earnest Money Deposit (EMD) has been successfully received by [EscrowOfficer]. That is another major milestone complete! I will keep you posted on the next steps. - [AgentName]'
  },
  {
    id: 'insurance',
    label: 'Get Insurance',
    subject: 'Home Insurance Quotes - [Address]',
    text: 'Hi [ClientName],\n\nNow its time to get quotes on Home insurance, you can try first with your actual insurance company if you need any additional quotes please let me know. - [AgentName]'
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

export function ClientUpdatesModal({
  escrow,
  onClose
}: {
  escrow: Escrow;
  onClose: () => void;
}) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const { user } = useAuth();

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

  // Load centralized templates from Firestore when logged in
  useEffect(() => {
    if (!user) return;

    const loadCloudTemplates = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.customTemplates)) {
            const cloudTemplates = data.customTemplates;
            setTemplates(TEMPLATES.map(t => {
              const custom = cloudTemplates.find((p: any) => p.id === t.id);
              return custom ? { ...t, text: custom.text, subject: custom.subject || t.subject } : t;
            }));
          }
        }
      } catch (err) {
        console.error("Error loading centralized templates from Firestore:", err);
      }
    };

    loadCloudTemplates();
  }, [user]);

  const [selectedTemplateId, setSelectedTemplateId] = useState('opening');
  const isEscrowOfficerTemplate = selectedTemplateId === 'first_escrow_email' || selectedTemplateId === 'request_open_escrow_listing';
  const recipientName = isEscrowOfficerTemplate 
    ? (escrow.escrowOfficer || 'Escrow Officer') 
    : `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() + 
      ((escrow.client2FirstName?.trim() || escrow.client2LastName?.trim()) 
        ? ` & ${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim() 
        : '') || 'Client';
  const recipientPhone = isEscrowOfficerTemplate ? escrow.escrowPhone : escrow.clientPhone;
  const recipientEmail = isEscrowOfficerTemplate ? escrow.escrowEmail : escrow.clientEmail;

  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // States for Master Customization
  const [isEditingMaster, setIsEditingMaster] = useState(false);
  const [masterSubject, setMasterSubject] = useState('');
  const [masterText, setMasterText] = useState('');

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const textTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const getPopulatedText = (rawText: string) => {
    let text = rawText;
    const clientFullName = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() + 
      ((escrow.client2FirstName?.trim() || escrow.client2LastName?.trim()) 
        ? ` & ${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim() 
        : '');
    text = text.replace(/\[ClientName\]/g, clientFullName || 'Client');
    text = text.replace(/\[ClientFirstName\]/g, escrow.clientFirstName || 'Client');
    text = text.replace(/\[ClientLastName\]/g, escrow.clientLastName || '');
    text = text.replace(/\[Address\]/g, escrow.address || 'the property');
    text = text.replace(/\[COE\]/g, escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMMM d, yyyy') : 'the scheduled closing date');
    text = text.replace(/\[Price\]/g, formatCurrency(escrow.price));
    text = text.replace(/\[AgentName\]/g, escrow.agentName || 'your agent');
    text = text.replace(/\[EscrowOfficer\]/g, escrow.escrowOfficer || 'the escrow officer');
    text = text.replace(/\[Esrow Officer\]/g, escrow.escrowOfficer || 'the escrow officer');
    text = text.replace(/\[Escrow Officer\]/g, escrow.escrowOfficer || 'the escrow officer');
    text = text.replace(/\[Buyer Name\]/g, clientFullName || 'Buyer');
    text = text.replace(/\[Buyer Email\]/g, escrow.clientEmail || 'N/A');
    text = text.replace(/\[Buyer Phone\]/g, escrow.clientPhone || 'N/A');
    text = text.replace(/\[EscrowCompany\]/g, escrow.escrowCompany || 'the escrow company');
    text = text.replace(/\[Collaborator\]/g, escrow.escrowCompany || escrow.collaborator || 'the escrow company');
    text = text.replace(/\[EscrowEmail\]/g, escrow.escrowEmail || 'N/A');
    text = text.replace(/\[EscrowPhone\]/g, escrow.escrowPhone || 'N/A');

    // Commission placeholder
    const commissionStr = escrow.netCommission 
      ? (escrow.commissionPercent ? `${escrow.commissionPercent}% (${formatCurrency(escrow.netCommission)})` : formatCurrency(escrow.netCommission))
      : (escrow.commissionPercent ? `${escrow.commissionPercent}%` : 'N/A');
    text = text.replace(/\[Commission\]/g, commissionStr);
    text = text.replace(/\[commission\]/g, commissionStr);

    // Agent Phone placeholder
    text = text.replace(/\[AgentPhone\]/g, escrow.agentPhone || 'N/A');
    text = text.replace(/\[Agent Phone\]/g, escrow.agentPhone || 'N/A');
    text = text.replace(/\[Agent phone\]/g, escrow.agentPhone || 'N/A');

    // Agent Email placeholder
    text = text.replace(/\[AgentEmail\]/g, escrow.agentEmail || 'N/A');
    text = text.replace(/\[Agent Email\]/g, escrow.agentEmail || 'N/A');
    text = text.replace(/\[Agent email\]/g, escrow.agentEmail || 'N/A');

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

  const handleSaveMaster = async () => {
    const updated = templates.map(t => {
      if (t.id === selectedTemplateId) {
        return { ...t, subject: masterSubject, text: masterText };
      }
      return t;
    });
    setTemplates(updated);
    localStorage.setItem('escrow_custom_templates', JSON.stringify(updated));

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, { customTemplates: updated }, { merge: true });
      } catch (err) {
        console.error("Error saving centralized templates to Firestore:", err);
      }
    }

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
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart ?? masterSubject.length;
        const end = input.selectionEnd ?? masterSubject.length;
        const newText = masterSubject.substring(0, start) + tag + masterSubject.substring(end);
        setMasterSubject(newText);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      } else {
        setMasterSubject(prev => prev + tag);
      }
    } else {
      const textarea = textTextAreaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? masterText.length;
        const end = textarea.selectionEnd ?? masterText.length;
        const newText = masterText.substring(0, start) + tag + masterText.substring(end);
        setMasterText(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      } else {
        setMasterText(prev => prev + tag);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-3 pt-12 pb-6 sm:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh]"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#e5e5ea] flex justify-between items-start bg-slate-50 shrink-0">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1B3A5C]/60 block mb-0.5">Quick Client Updates</span>
            <h2 className="font-extrabold text-base sm:text-lg text-[#1B3A5C] truncate max-w-[220px] sm:max-w-none" title={escrow.address}>
              {escrow.address}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#e5e5ea] rounded-full transition-colors text-slate-500 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="flex justify-end items-center pb-2 border-b border-[#e5e5ea]">
            <button
              onClick={() => setIsEditingMaster(!isEditingMaster)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center transition-all ${
                isEditingMaster 
                  ? 'bg-[#1B3A5C] text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-[#334155]'
              }`}
            >
              {isEditingMaster ? 'Cancel Customizing' : 'Customize Templates'}
            </button>
          </div>

          {!isEditingMaster ? (
            <>
              {/* Template Selection Dropdown */}
              <div className="relative w-full z-30">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#1B3A5C]/60 block mb-1.5">
                  Select Update Milestone
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5ea] hover:border-[#1B3A5C]/30 rounded-2xl text-sm font-bold text-[#1B3A5C] shadow-sm transition-all cursor-pointer select-none active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {selectedTemplate.label}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <>
                      {/* Close dropdown on background click */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      
                      {/* Floating dropdown options */}
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#e5e5ea] rounded-2xl shadow-xl overflow-hidden z-20 max-h-60 overflow-y-auto py-1.5 animate-in fade-in-50 slide-in-from-top-1">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTemplateId(t.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3.5 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                              selectedTemplateId === t.id
                                ? 'bg-[#1B3A5C]/5 text-[#1B3A5C] font-extrabold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{t.label}</span>
                            {selectedTemplateId === t.id && (
                              <Check size={16} className="text-[#1B3A5C]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recipient Details & Workspace */}
              <div className="bg-slate-50 border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-3">
                {recipientPhone && (
                  <div className="flex justify-end items-center">
                    <span className="text-[10px] font-mono font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-2.5 py-0.5 rounded-lg">
                      Recipient: {recipientName} ({recipientPhone})
                    </span>
                  </div>
                )}

                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl p-3 text-sm focus:outline-none focus:border-[#1B3A5C] font-sans leading-relaxed shadow-inner h-28 sm:h-48 min-h-[100px]"
                />

                <div className="flex flex-col gap-3 pt-3 border-t border-[#e5e5ea] w-full">
                  <div className="flex flex-col gap-0.5">
                    {!recipientPhone && (
                      <span className="text-[10px] text-[#ef4444] font-bold">⚠️ No {isEscrowOfficerTemplate ? 'escrow officer' : 'client'} phone saved (add it in edit form)</span>
                    )}
                    {!recipientEmail && (
                      <span className="text-[10px] text-amber-600 font-bold">⚠️ No {isEscrowOfficerTemplate ? 'escrow officer' : 'client'} email saved</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                    <button
                      onClick={handleCopy}
                      className="px-4 py-3 sm:py-2 bg-white border border-[#e5e5ea] hover:bg-slate-50 text-[#334155] rounded-xl text-sm sm:text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer text-center w-full sm:w-auto"
                    >
                      {copied ? 'Copied to Clipboard!' : 'Copy Message'}
                    </button>

                    <a
                      href={`sms:${recipientPhone ? recipientPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                      className={`px-4 py-3 sm:py-2 text-white rounded-xl text-sm sm:text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                        recipientPhone ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                      }`}
                    >
                      <MessageSquare size={13} />
                      <span>Text {isEscrowOfficerTemplate ? 'Escrow Officer' : 'Client'}</span>
                    </a>

                    <a
                      href={`mailto:${recipientEmail || ''}?subject=${encodeURIComponent(getPopulatedSubject(selectedTemplate.subject))}&body=${encodeURIComponent(editedText)}`}
                      className={`px-4 py-3 sm:py-2 text-white rounded-xl text-sm sm:text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                        recipientEmail ? 'bg-[#1B3A5C] hover:bg-[#11253C] cursor-pointer' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                      }`}
                    >
                      <Mail size={13} />
                      <span>Email {isEscrowOfficerTemplate ? 'Escrow Officer' : 'Client'}</span>
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold text-[#1B3A5C]">
                  Editing template phrasing: <span className="text-slate-800 font-extrabold">{selectedTemplate.label}</span>
                </h4>
                <button
                  onClick={handleResetTemplate}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline font-bold cursor-pointer"
                >
                  Restore Defaults
                </button>
              </div>

              {/* Subject Field */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-extrabold text-[#334155] tracking-wider">Subject Template</label>
                  <button 
                    onClick={() => insertPlaceholder('[Address]', 'subject')}
                    className="text-[8px] bg-white border border-[#e5e5ea] rounded px-1.5 py-0.5 font-mono text-[#1B3A5C] hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    + [Address]
                  </button>
                </div>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={masterSubject}
                  onChange={(e) => setMasterSubject(e.target.value)}
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-bold text-[#1B3A5C] focus:outline-none focus:border-[#1B3A5C]"
                  placeholder="e.g. Escrow Opened - [Address]"
                />
              </div>

              {/* Text Body Field */}
              <div>
                <div className="flex flex-col gap-1.5 mb-2">
                  <label className="text-[10px] uppercase font-extrabold text-[#334155] tracking-wider">Message Body Template</label>
                  
                  {/* Placeholder Buttons */}
                  <div className="flex flex-wrap gap-1 bg-white p-2 rounded-xl border border-[#e5e5ea]">
                    <span className="text-[8px] font-bold text-[#86868b] uppercase tracking-wider self-center mr-1">Insert placeholders:</span>
                    {[
                      { tag: '[ClientName]', label: 'Client Full Name' },
                      { tag: '[ClientFirstName]', label: 'Client First Name' },
                      { tag: '[ClientLastName]', label: 'Client Last Name' },
                      { tag: '[Address]', label: 'Property Address' },
                      { tag: '[COE]', label: 'COE Date' },
                      { tag: '[Price]', label: 'Sale Price' },
                      { tag: '[AgentName]', label: 'Agent Name' },
                      { tag: '[EscrowOfficer]', label: 'Escrow Officer' },
                      { tag: '[Esrow Officer]', label: 'Escrow Officer (Alt)' },
                      { tag: '[Buyer Name]', label: 'Buyer Name' },
                      { tag: '[Buyer Email]', label: 'Buyer Email' },
                      { tag: '[Buyer Phone]', label: 'Buyer Phone' },
                      { tag: '[EscrowCompany]', label: 'Escrow Company' },
                      { tag: '[Collaborator]', label: 'Collaborator' },
                      { tag: '[EscrowEmail]', label: 'Escrow Email' },
                      { tag: '[EscrowPhone]', label: 'Escrow Phone' },
                      { tag: '[Commission]', label: 'Commission' },
                      { tag: '[AgentPhone]', label: 'Agent Phone' },
                      { tag: '[AgentEmail]', label: 'Agent Email' }
                    ].map(p => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => insertPlaceholder(p.tag, 'text')}
                        className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-[#e5e5ea] rounded-lg px-2 py-1 font-bold text-[#1B3A5C] active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
                        title={`Insert ${p.tag}`}
                      >
                        + <span className="font-mono">{p.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  ref={textTextAreaRef}
                  value={masterText}
                  onChange={(e) => setMasterText(e.target.value)}
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl p-3 text-sm focus:outline-none focus:border-[#1B3A5C] font-sans leading-relaxed h-24 sm:h-36 min-h-[80px]"
                  placeholder="Type your template body text here..."
                />
                <p className="text-[10px] text-[#86868b] mt-1.5 leading-normal">
                  <strong>Brackets Guide:</strong> When viewing an escrow, placeholders like <code>[ClientName]</code> or <code>[Address]</code> will automatically fill with real info.
                </p>
              </div>

              {/* Save & Cancel */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-[#e5e5ea] w-full">
                <button
                  onClick={() => setIsEditingMaster(false)}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-white border border-[#e5e5ea] hover:bg-slate-100 text-[#334155] rounded-xl text-sm sm:text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMaster}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-[#1B3A5C] hover:bg-[#11253C] text-white rounded-xl text-sm sm:text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer text-center"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
