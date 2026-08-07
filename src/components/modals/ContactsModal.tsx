import React, { useState } from 'react';
import { Escrow } from '../../types';
import { X, Phone, Mail, MessageSquare, Copy, Check, Users, User, Shield, Building2, Landmark, Briefcase } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';

interface ContactsModalProps {
  escrow: Escrow;
  onClose: () => void;
}

interface ContactItem {
  id: string;
  role: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ElementType;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  extraInfo?: string;
}

export function ContactsModal({ escrow, onClose }: ContactsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const contactsList: ContactItem[] = [
    {
      id: 'client1',
      role: 'Client 1 (Primary)',
      badgeBg: 'bg-blue-50 text-[#1B3A5C] border-blue-200',
      badgeText: 'Client',
      icon: User,
      name: `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || 'Not specified',
      phone: escrow.clientPhone,
      email: escrow.clientEmail,
      extraInfo: escrow.clientBirthday ? `Birthday: ${escrow.clientBirthday}` : undefined,
    },
  ];

  if (hasClient2) {
    contactsList.push({
      id: 'client2',
      role: 'Client 2 (Co-Client)',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badgeText: 'Co-Client',
      icon: User,
      name: `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim() || 'Not specified',
      phone: escrow.client2Phone,
      email: escrow.client2Email,
      extraInfo: escrow.client2Birthday ? `Birthday: ${escrow.client2Birthday}` : undefined,
    });
  }

  contactsList.push(
    {
      id: 'agent',
      role: 'Real Estate Agent',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeText: 'Agent',
      icon: Briefcase,
      name: escrow.agentName || 'Not specified',
      company: escrow.collaborator ? `Collaborator: ${escrow.collaborator}` : undefined,
      phone: escrow.agentPhone,
      email: escrow.agentEmail,
    },
    {
      id: 'escrowOfficer',
      role: 'Escrow Officer & Company',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
      badgeText: 'Escrow',
      icon: Building2,
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
      icon: Landmark,
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
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1B3A5C]">
                  Transaction Contacts
                </span>
                {escrow.escrowNumber && (
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
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
              className="px-3 py-1.5 text-xs font-bold text-[#1B3A5C] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Copy Name, Phone & Email for all contacts"
            >
              {copiedField === 'all-contacts' ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span className="text-emerald-700">All Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
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
              const IconComp = contact.icon;
              const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
              
              return (
                <div 
                  key={contact.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    {/* Top Role Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <IconComp size={15} className="text-slate-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-600">
                          {contact.role}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${contact.badgeBg}`}>
                        {contact.badgeText}
                      </span>
                    </div>

                    {/* Contact Name & Company */}
                    <div className="mt-1">
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                        {contact.name}
                      </h3>
                      {contact.company && (
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {contact.company}
                        </p>
                      )}
                      {contact.extraInfo && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {contact.extraInfo}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contact details list & action buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    {/* Phone Number row */}
                    {contact.phone ? (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 font-mono truncate">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            title={`Call ${contact.name}`}
                          >
                            <Phone size={13} />
                          </a>
                          <a
                            href={`sms:${cleanPhone}`}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            title={`Text ${contact.name}`}
                          >
                            <MessageSquare size={13} />
                          </a>
                          <button
                            onClick={() => handleCopy(contact.phone!, `${contact.id}-phone`)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Copy Phone"
                          >
                            {copiedField === `${contact.id}-phone` ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <Phone size={13} className="shrink-0" />
                        <span>No phone provided</span>
                      </div>
                    )}

                    {/* Email row */}
                    {contact.email ? (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-700 font-mono truncate min-w-0">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate" title={contact.email}>{contact.email}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={`mailto:${contact.email}`}
                            className="p-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                            title={`Email ${contact.name}`}
                          >
                            <Mail size={13} />
                          </a>
                          <button
                            onClick={() => handleCopy(contact.email!, `${contact.id}-email`)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Copy Email"
                          >
                            {copiedField === `${contact.id}-email` ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                        <Mail size={13} className="shrink-0" />
                        <span>No email provided</span>
                      </div>
                    )}

                    {/* Copy Contact Info Button (Name, Phone, Email) */}
                    <button
                      type="button"
                      onClick={() => handleCopyContact(contact)}
                      className="w-full mt-1.5 py-1.5 px-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#1B3A5C] border border-slate-200/80 hover:border-blue-200/90 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                      title="Copy Name, Phone and Email for this contact"
                    >
                      {copiedField === `${contact.id}-full` ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span className="text-emerald-700">Contact Info Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
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
            className="px-4 py-2 bg-[#1B3A5C] hover:bg-[#11253C] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
