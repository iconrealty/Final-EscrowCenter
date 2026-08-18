import React, { useState } from 'react';
import { Escrow } from '../../types';
import { X, Phone, Mail, MessageSquare, Copy, Check, Users } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { useEmailPreference } from '../../context/EmailPreferenceContext';

interface ContactsModalProps {
  escrow: Escrow;
  onClose: () => void;
}

interface ContactItem {
  id: string;
  role: string;
  badgeBg: string;
  badgeText: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  extraInfo?: string;
}

export function ContactsModal({ escrow, onClose }: ContactsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { openEmail } = useEmailPreference();

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    // Normalize newlines to avoid platform-specific character corruptions
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    // Try standard navigator.clipboard API if available and secure
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(normalizedText);
        return true;
      } catch (err) {
        console.warn('navigator.clipboard failed, attempting fallback:', err);
      }
    }

    // Fallback for iOS Safari / Mobile webviews / Sandboxed iframe environments
    try {
      const textArea = document.createElement('textarea');
      textArea.value = normalizedText;
      // Position off-screen without scrolling page
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.fontSize = '16px'; // Prevent iOS zoom

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 999999); // Essential for iOS Safari selection

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  };

  const handleCopy = async (text: string, fieldId: string) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(fieldId);
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    }
  };

  const getContactFormattedString = (contact: ContactItem) => {
    const lines = [
      contact.role,
      `Name: ${contact.name}`,
      `Phone: ${contact.phone || 'N/A'}`,
      `Email: ${contact.email || 'N/A'}`
    ];
    if (contact.company) lines.push(contact.company);
    return lines.join('\n');
  };

  const handleCopyContact = (contact: ContactItem) => {
    const text = getContactFormattedString(contact);
    handleCopy(text, `${contact.id}-full`);
  };

  const handleCopyAllContacts = () => {
    const allText = contactsList.map(c => getContactFormattedString(c)).join('\n\n---\n\n');
    handleCopy(allText, 'all-contacts');
  };

  const hasClient2 = !!(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim());

  const sanitizeBday = (bday?: string, acceptance?: string, coe?: string) => {
    if (!bday || !bday.trim()) return undefined;
    const str = bday.trim();
    if (acceptance && str === acceptance.trim()) return undefined;
    if (coe && str === coe.trim()) return undefined;
    return str;
  };

  const bday1Clean = sanitizeBday(escrow.clientBirthday, escrow.acceptanceDate, escrow.coeDate);
  const bday2Clean = sanitizeBday(escrow.client2Birthday, escrow.acceptanceDate, escrow.coeDate);

  const contactsList: ContactItem[] = [
    {
      id: 'client1',
      role: 'Client 1 (Primary)',
      badgeBg: 'bg-blue-50 text-[#1B3A5C] border-blue-200',
      badgeText: 'Client',
      name: `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || 'Not specified',
      phone: escrow.clientPhone,
      email: escrow.clientEmail,
      extraInfo: bday1Clean ? `Birthday: ${bday1Clean}` : undefined,
    },
  ];

  if (hasClient2) {
    contactsList.push({
      id: 'client2',
      role: 'Client 2 (Co-Client)',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badgeText: 'Co-Client',
      name: `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim() || 'Not specified',
      phone: escrow.client2Phone,
      email: escrow.client2Email,
      extraInfo: bday2Clean ? `Birthday: ${bday2Clean}` : undefined,
    });
  }

  contactsList.push(
    {
      id: 'agent',
      role: 'Other Agent',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeText: 'Other Agent',
      name: escrow.agentName || 'Not specified',
      company: escrow.cooperatingBrokerage 
        ? `Brokerage: ${escrow.cooperatingBrokerage}` 
        : (escrow.collaborator ? `Collaborator: ${escrow.collaborator}` : undefined),
      phone: escrow.agentPhone,
      email: escrow.agentEmail,
    },
    {
      id: 'escrowOfficer',
      role: 'Escrow Officer & Company',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
      badgeText: 'Escrow',
      name: escrow.escrowOfficer || 'Not specified',
      company: escrow.escrowCompany ? `Company: ${escrow.escrowCompany}` : undefined,
      phone: escrow.escrowPhone,
      email: escrow.escrowEmail,
    },
    {
      id: 'lender',
      role: 'Lender / Loan Officer',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeText: 'Lender',
      name: escrow.lenderName || 'Not specified',
      phone: escrow.lenderPhone,
      email: escrow.lenderEmail,
    }
  );

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-[2rem] sm:rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh] border border-slate-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#1B3A5C]/10 text-[#1B3A5C] flex items-center justify-center shrink-0">
              <Users size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1B3A5C]">
                  Transaction Contacts
                </span>
                {escrow.escrowNumber && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                    #{escrow.escrowNumber}
                  </span>
                )}
                <StatusBadge status={escrow.status} />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
                {escrow.address}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={handleCopyAllContacts}
              className="px-3.5 py-2 text-xs font-bold text-[#1B3A5C] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Copy Name, Phone & Email for all contacts"
            >
              {copiedField === 'all-contacts' ? (
                <>
                  <Check size={16} className="text-emerald-600 stroke-[2.5]" />
                  <span className="text-emerald-700 font-extrabold">All Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} className="stroke-[2.2]" />
                  <span className="hidden sm:inline">Copy All Contacts</span>
                  <span className="sm:hidden">Copy All</span>
                </>
              )}
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactsList.map((contact) => {
              const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
              
              return (
                <div 
                  key={contact.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    {/* Top Role Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-slate-700 tracking-wide">
                        {contact.role}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${contact.badgeBg}`}>
                        {contact.badgeText}
                      </span>
                    </div>

                    {/* Contact Name & Company */}
                    <div className="mt-1.5">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        {contact.name}
                      </h3>
                      {contact.company && (
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {contact.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact details list & action buttons */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                    {/* Phone Number row */}
                    {contact.phone ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base truncate min-w-0">
                          <Phone size={18} className="text-emerald-600 shrink-0 stroke-[2.2]" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-2.5 sm:p-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center"
                            title={`Call ${contact.name}`}
                          >
                            <Phone size={18} className="stroke-[2.5]" />
                          </a>
                          <a
                            href={`sms:${cleanPhone}`}
                            className="p-2.5 sm:p-2 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center"
                            title={`Text ${contact.name}`}
                          >
                            <MessageSquare size={18} className="stroke-[2.5]" />
                          </a>
                          <button
                            onClick={() => handleCopy(contact.phone!, `${contact.id}-phone`)}
                            className="p-2.5 sm:p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                            title="Copy Phone"
                          >
                            {copiedField === `${contact.id}-phone` ? (
                              <Check size={18} className="text-emerald-600 stroke-[2.5]" />
                            ) : (
                              <Copy size={18} className="stroke-[2.2]" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <Phone size={16} className="shrink-0 stroke-[2]" />
                        <span>No phone provided</span>
                      </div>
                    )}

                    {/* Email row */}
                    {contact.email ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs sm:text-sm truncate min-w-0">
                          <Mail size={18} className="text-indigo-600 shrink-0 stroke-[2.2]" />
                          <span className="truncate" title={contact.email}>{contact.email}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEmail({ to: contact.email! })}
                            className="p-2.5 sm:p-2 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center"
                            title={`Email ${contact.name}`}
                          >
                            <Mail size={18} className="stroke-[2.5]" />
                          </button>
                          <button
                            onClick={() => handleCopy(contact.email!, `${contact.id}-email`)}
                            className="p-2.5 sm:p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                            title="Copy Email"
                          >
                            {copiedField === `${contact.id}-email` ? (
                              <Check size={18} className="text-emerald-600 stroke-[2.5]" />
                            ) : (
                              <Copy size={18} className="stroke-[2.2]" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <Mail size={16} className="shrink-0 stroke-[2]" />
                        <span>No email provided</span>
                      </div>
                    )}

                    {/* Copy Contact Info Button (Name, Phone, Email) */}
                    <button
                      type="button"
                      onClick={() => handleCopyContact(contact)}
                      className="w-full mt-1 py-2 px-3 bg-gradient-to-r from-slate-50 to-blue-50/60 hover:from-blue-50 hover:to-blue-100/70 text-[#1B3A5C] border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
                      title="Copy Name, Phone and Email for this contact"
                    >
                      {copiedField === `${contact.id}-full` ? (
                        <>
                          <Check size={16} className="text-emerald-600 stroke-[2.5]" />
                          <span className="text-emerald-700 font-extrabold">Contact Info Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={15} className="stroke-[2.2]" />
                          <span>Copy Contact (Name, Phone, Email)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100/80 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#1B3A5C] hover:bg-[#11253C] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}



