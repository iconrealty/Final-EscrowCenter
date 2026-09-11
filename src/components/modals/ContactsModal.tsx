import React, { useState } from 'react';
import { Escrow, formatPropertyAddress, parseAddressComponents } from '../../types';
import { X, Copy, Check, Phone, MessageSquare, Mail } from 'lucide-react';
import { parseISO, format } from 'date-fns';

interface ContactsModalProps {
  escrow: Escrow;
  onClose: () => void;
}

interface ContactCardProps {
  roleTitle: string;
  name?: string;
  company?: string;
  companyLabel?: string;
  phone?: string;
  email?: string;
  extraInfo?: { label: string; value?: string };
  fieldPrefix: string;
  copiedKey: string | null;
  onCopy: (val: string, key: string) => void;
  onCopySection: () => void;
  emptyStateText?: string;
}

/**
 * Clean & Space-Efficient Contact Card:
 * 1. Title: Role header
 * 2. Name: Prominent bold contact name
 * 3. Company: Subtitle with company / brokerage
 * 4. Below: Phone row with Call, Text, and Copy options
 * 5. Below: Email row with Email and Copy options
 * 6. Card Bottom: Action to copy contact details
 */
function ContactCard({
  roleTitle,
  name,
  company,
  companyLabel,
  phone,
  email,
  extraInfo,
  fieldPrefix,
  copiedKey,
  onCopy,
  onCopySection,
  emptyStateText,
}: ContactCardProps) {
  const hasInfo = Boolean(name?.trim() || phone?.trim() || email?.trim() || company?.trim());
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';
  const isSectionCopied = copiedKey === fieldPrefix;

  if (!hasInfo && emptyStateText) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-center shadow-xs min-h-[110px]">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            {roleTitle}
          </span>
          <p className="text-xs sm:text-sm text-slate-400 py-1">{emptyStateText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors">
      <div>
        {/* 1. Title */}
        <div className="flex items-center justify-between mb-0.5 sm:mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {roleTitle}
          </span>
          {extraInfo?.value && (
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {extraInfo.label}: {extraInfo.value}
            </span>
          )}
        </div>

        {/* 2. Then the Name */}
        <h3 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
          {name?.trim() || '—'}
        </h3>

        {/* 3. Then the Company */}
        {company?.trim() ? (
          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5 mb-2 sm:mb-2.5 flex items-center gap-1.5 truncate">
            {companyLabel && <span className="text-slate-400 font-medium">{companyLabel}:</span>}
            <span className="truncate">{company.trim()}</span>
          </p>
        ) : (
          <div className="mb-1.5 sm:mb-2" />
        )}

        {/* 4. Below: Phone & Email */}
        <div className="space-y-1.5 sm:space-y-2 pt-2 sm:pt-2.5 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <Phone size={13} />
              </div>
              <div className="min-w-0 flex-1">
                {phone?.trim() ? (
                  <a
                    href={`tel:${cleanPhone}`}
                    className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline truncate block leading-snug"
                    title={`Call ${phone}`}
                  >
                    {phone.trim()}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 select-none">—</span>
                )}
              </div>
            </div>

            {phone?.trim() && (
              <div className="flex items-center gap-1 shrink-0 text-slate-600">
                <a
                  href={`tel:${cleanPhone}`}
                  className="p-1.5 sm:p-2 hover:text-slate-950 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Call"
                  aria-label="Call"
                >
                  <Phone size={18} />
                </a>
                <a
                  href={`sms:${cleanPhone}`}
                  className="p-1.5 sm:p-2 hover:text-slate-950 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Text"
                  aria-label="Text"
                >
                  <MessageSquare size={18} />
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(phone.trim(), `${fieldPrefix}-phone`);
                  }}
                  className="p-1.5 sm:p-2 hover:text-slate-950 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Copy Phone"
                  aria-label="Copy Phone"
                >
                  {copiedKey === `${fieldPrefix}-phone` ? (
                    <Check size={18} className="text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <Mail size={13} />
              </div>
              <div className="min-w-0 flex-1">
                {email?.trim() ? (
                  <a
                    href={`mailto:${email.trim()}`}
                    className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline truncate block leading-snug"
                    title={`Email ${email}`}
                  >
                    {email.trim()}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 select-none">—</span>
                )}
              </div>
            </div>

            {email?.trim() && (
              <div className="flex items-center gap-1 shrink-0 text-slate-600">
                <a
                  href={`mailto:${email.trim()}`}
                  className="p-1.5 sm:p-2 hover:text-slate-950 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Email"
                  aria-label="Email"
                >
                  <Mail size={18} />
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(email.trim(), `${fieldPrefix}-email`);
                  }}
                  className="p-1.5 sm:p-2 hover:text-slate-950 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Copy Email"
                  aria-label="Copy Email"
                >
                  {copiedKey === `${fieldPrefix}-email` ? (
                    <Check size={18} className="text-emerald-600 stroke-[2.5]" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Card bottom: Copy Contact Information action */}
      <div className="mt-3 sm:mt-3.5 pt-2 sm:pt-2.5 border-t border-slate-100 flex items-center justify-end">
        <button
          type="button"
          onClick={onCopySection}
          className={`w-full sm:w-auto px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer ${
            isSectionCopied
              ? 'bg-emerald-600 text-white'
              : 'bg-[#1B3A5C] hover:bg-[#152e4a] text-white'
          }`}
          title={`Copy ${roleTitle} Information`}
        >
          {isSectionCopied ? (
            <>
              <Check size={13} className="text-white stroke-[2.5]" />
              <span>Copied Contact</span>
            </>
          ) : (
            <>
              <Copy size={12} className="sm:hidden" />
              <Copy size={13} className="hidden sm:block" />
              <span>Copy Contact</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function ContactsModal({ escrow, onClose }: ContactsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Split property into Street (Line 1) and City, Zip (Line 2)
  const addressParts = (() => {
    const rawStreet = (escrow.address || '').trim();
    const directCity = (escrow.city || '').trim();
    const directZip = (escrow.zipCode || '').trim();

    if (directCity || directZip) {
      const parsed = parseAddressComponents(rawStreet);
      const street = parsed.address || rawStreet || 'Untitled Property';
      const cityZip = [directCity || parsed.city, directZip || parsed.zipCode].filter(Boolean).join(', ');
      return { street, cityZip };
    }

    const parsed = parseAddressComponents(rawStreet);
    const street = parsed.address || rawStreet || 'Untitled Property';
    const cityZip = [parsed.city, parsed.zipCode].filter(Boolean).join(', ');
    return { street, cityZip };
  })();

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(normalizedText);
        return true;
      } catch (err) {
        console.warn('navigator.clipboard failed, using fallback:', err);
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = normalizedText;
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
      textArea.style.fontSize = '16px';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 999999);

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

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = parseISO(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const hasClient2 = !!(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim() || escrow.client2Phone?.trim() || escrow.client2Email?.trim());

  const handleCopySection = (role: string, name?: string, phone?: string, email?: string, company?: string, extra?: string) => {
    const lines = [role];
    if (name) lines.push(`Name: ${name}`);
    if (company) lines.push(`Company: ${company}`);
    if (extra) lines.push(extra);
    if (phone) lines.push(`Phone: ${phone}`);
    if (email) lines.push(`Email: ${email}`);
    handleCopy(lines.join('\n'), role);
  };

  const handleCopyAllContacts = () => {
    const fullAddress = formatPropertyAddress(escrow) || escrow.address || 'Untitled Property';
    const sections: string[] = [];

    if (fullAddress) {
      sections.push(`PROPERTY: ${fullAddress}`);
    }

    const c1Name = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim();
    if (c1Name || escrow.clientPhone || escrow.clientEmail) {
      const l = ['PRIMARY CLIENT'];
      if (c1Name) l.push(`Name: ${c1Name}`);
      if (escrow.clientBirthday) l.push(`Birthday: ${formatDateDisplay(escrow.clientBirthday)}`);
      if (escrow.clientPhone) l.push(`Phone: ${escrow.clientPhone}`);
      if (escrow.clientEmail) l.push(`Email: ${escrow.clientEmail}`);
      sections.push(l.join('\n'));
    }

    if (hasClient2) {
      const c2Name = `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim();
      const l = ['SECONDARY CLIENT'];
      if (c2Name) l.push(`Name: ${c2Name}`);
      if (escrow.client2Birthday) l.push(`Birthday: ${formatDateDisplay(escrow.client2Birthday)}`);
      if (escrow.client2Phone) l.push(`Phone: ${escrow.client2Phone}`);
      if (escrow.client2Email) l.push(`Email: ${escrow.client2Email}`);
      sections.push(l.join('\n'));
    }

    if (escrow.agentName || escrow.agentPhone || escrow.agentEmail || escrow.cooperatingBrokerage) {
      const l = ['OTHER AGENT'];
      if (escrow.agentName) l.push(`Name: ${escrow.agentName}`);
      if (escrow.cooperatingBrokerage) l.push(`Brokerage: ${escrow.cooperatingBrokerage}`);
      if (escrow.agentPhone) l.push(`Phone: ${escrow.agentPhone}`);
      if (escrow.agentEmail) l.push(`Email: ${escrow.agentEmail}`);
      sections.push(l.join('\n'));
    }

    if (escrow.lenderName || escrow.lenderCompany || escrow.lenderPhone || escrow.lenderEmail) {
      const l = ['LENDER'];
      if (escrow.lenderName) l.push(`Loan Officer: ${escrow.lenderName}`);
      if (escrow.lenderCompany) l.push(`Company: ${escrow.lenderCompany}`);
      if (escrow.lenderPhone) l.push(`Phone: ${escrow.lenderPhone}`);
      if (escrow.lenderEmail) l.push(`Email: ${escrow.lenderEmail}`);
      sections.push(l.join('\n'));
    }

    if (escrow.escrowCompany || escrow.escrowOfficer || escrow.escrowPhone || escrow.escrowEmail) {
      const l = ['ESCROW'];
      if (escrow.escrowOfficer) l.push(`Officer: ${escrow.escrowOfficer}`);
      if (escrow.escrowCompany) l.push(`Company: ${escrow.escrowCompany}`);
      if (escrow.escrowPhone) l.push(`Phone: ${escrow.escrowPhone}`);
      if (escrow.escrowEmail) l.push(`Email: ${escrow.escrowEmail}`);
      sections.push(l.join('\n'));
    }

    if (escrow.titleCompany || escrow.titleOfficer || escrow.titlePhone || escrow.titleEmail) {
      const l = ['TITLE'];
      if (escrow.titleOfficer) l.push(`Officer: ${escrow.titleOfficer}`);
      if (escrow.titleCompany) l.push(`Company: ${escrow.titleCompany}`);
      if (escrow.titlePhone) l.push(`Phone: ${escrow.titlePhone}`);
      if (escrow.titleEmail) l.push(`Email: ${escrow.titleEmail}`);
      sections.push(l.join('\n'));
    }

    handleCopy(sections.join('\n\n---\n\n'), 'all-contacts');
  };

  const primaryClientCard = (
    <ContactCard
      roleTitle="PRIMARY CLIENT"
      name={`${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim()}
      company={escrow.clientBirthday ? `Birthday: ${formatDateDisplay(escrow.clientBirthday)}` : undefined}
      phone={escrow.clientPhone}
      email={escrow.clientEmail}
      fieldPrefix="c1"
      copiedKey={copiedField}
      onCopy={handleCopy}
      onCopySection={() => handleCopySection(
        'PRIMARY CLIENT',
        `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim(),
        escrow.clientPhone,
        escrow.clientEmail,
        undefined,
        escrow.clientBirthday ? `Birthday: ${formatDateDisplay(escrow.clientBirthday)}` : undefined
      )}
    />
  );

  const secondaryClientCard = (
    <ContactCard
      roleTitle="SECONDARY CLIENT"
      name={`${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim()}
      company={escrow.client2Birthday ? `Birthday: ${formatDateDisplay(escrow.client2Birthday)}` : undefined}
      phone={escrow.client2Phone}
      email={escrow.client2Email}
      fieldPrefix="c2"
      copiedKey={copiedField}
      onCopy={handleCopy}
      onCopySection={() => handleCopySection(
        'SECONDARY CLIENT',
        `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim(),
        escrow.client2Phone,
        escrow.client2Email,
        undefined,
        escrow.client2Birthday ? `Birthday: ${formatDateDisplay(escrow.client2Birthday)}` : undefined
      )}
      emptyStateText="No secondary client assigned."
    />
  );

  const agentCard = (
    <ContactCard
      roleTitle="OTHER AGENT"
      name={escrow.agentName}
      company={escrow.cooperatingBrokerage}
      companyLabel="Brokerage"
      phone={escrow.agentPhone}
      email={escrow.agentEmail}
      fieldPrefix="agent"
      copiedKey={copiedField}
      onCopy={handleCopy}
      onCopySection={() => handleCopySection(
        'OTHER AGENT',
        escrow.agentName,
        escrow.agentPhone,
        escrow.agentEmail,
        escrow.cooperatingBrokerage
      )}
      emptyStateText="No agent contact details provided."
    />
  );

  const lenderCard = (
    <ContactCard
      roleTitle="LENDER"
      name={escrow.lenderName}
      company={escrow.lenderCompany}
      companyLabel="Company"
      phone={escrow.lenderPhone}
      email={escrow.lenderEmail}
      fieldPrefix="lender"
      copiedKey={copiedField}
      onCopy={handleCopy}
      onCopySection={() => handleCopySection(
        'LENDER',
        escrow.lenderName,
        escrow.lenderPhone,
        escrow.lenderEmail,
        escrow.lenderCompany
      )}
      emptyStateText="No lender contact details provided."
    />
  );

  const escrowCard = (
    <ContactCard
      roleTitle="ESCROW"
      name={escrow.escrowOfficer}
      company={escrow.escrowCompany}
      companyLabel="Escrow Co"
      phone={escrow.escrowPhone}
      email={escrow.escrowEmail}
      fieldPrefix="escrow"
      copiedKey={copiedField}
      onCopy={handleCopy}
      onCopySection={() => handleCopySection(
        'ESCROW',
        escrow.escrowOfficer,
        escrow.escrowPhone,
        escrow.escrowEmail,
        escrow.escrowCompany
      )}
      emptyStateText="No escrow contact details provided."
    />
  );

  const titleCard = (
    <ContactCard
      roleTitle="TITLE"
      name={escrow.titleOfficer}
      company={escrow.titleCompany}
      companyLabel="Title Co"
      phone={escrow.titlePhone}
      email={escrow.titleEmail}
      fieldPrefix="title"
      copiedKey={copiedField}
      onCopy={handleCopy}
      onCopySection={() => handleCopySection(
        'TITLE',
        escrow.titleOfficer,
        escrow.titlePhone,
        escrow.titleEmail,
        escrow.titleCompany
      )}
      emptyStateText="No title contact details provided."
    />
  );

  const isAllCopied = copiedField === 'all-contacts';

  return (
    <div 
      id="contacts-modal-overlay" 
      className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="contacts-modal-container" 
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg md:max-w-3xl lg:max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[78vh] sm:h-[84vh] max-h-[760px] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header with 2-line Address and Quick Copy */}
        <div id="contacts-modal-header" className="px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div className="min-w-0 pr-2 sm:pr-3">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-black block mb-0.5">
              Transaction Contacts
            </span>
            <h2 className="text-sm sm:text-lg font-bold tracking-tight text-black leading-tight truncate max-w-[170px] xs:max-w-[240px] sm:max-w-none" title={addressParts.street}>
              {addressParts.street}
            </h2>
            {addressParts.cityZip ? (
              <p className="text-[11px] sm:text-sm font-medium text-slate-600 leading-tight mt-0.5 truncate max-w-[170px] xs:max-w-[240px] sm:max-w-none" title={addressParts.cityZip}>
                {addressParts.cityZip}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleCopyAllContacts}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold rounded-full transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                isAllCopied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#1B3A5C] hover:bg-[#152e4a] text-white'
              }`}
              title="Copy All Contacts"
            >
              {isAllCopied ? (
                <>
                  <Check size={13} className="text-white stroke-[2.5]" />
                  <span>Copied All</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy All</span>
                </>
              )}
            </button>
            <div className="w-px h-5 sm:h-6 bg-slate-200 mx-0.5"></div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer active:scale-95"
              title="Close"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>
        </div>
        
        {/* Scrollable Body: Space-efficient grid without tab menu */}
        <div id="contacts-modal-body" className="p-3 sm:p-5 overflow-y-auto flex-1 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {primaryClientCard}
            {hasClient2 ? secondaryClientCard : null}
            {agentCard}
            {lenderCard}
            {escrowCard}
            {titleCard}
          </div>
        </div>
      </div>
    </div>
  );
}

