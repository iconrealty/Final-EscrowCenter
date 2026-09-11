import React from 'react';
import { Escrow, formatPropertyAddress } from '../../types';
import { parseISO, format } from 'date-fns';
import { ExternalLink, Pencil, Trash2, X } from 'lucide-react';
import { generateCognitoUrl } from '../../utils/cognitoUtils';
import { useAuth } from '../../context/AuthContext';
import { DocumentsSection } from './DocumentsSection';

interface DetailModalProps {
  escrow: Escrow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleTask?: (id: string, key: string) => void;
  onUpdateTasks?: (id: string, tasks: Record<string, boolean>) => void;
  onUpdateEscrow: (id: string, data: Partial<Escrow>) => void;
  onOpenContacts?: () => void;
}

/**
 * Clean read-only field with distinct label-value contrast:
 * - Labels: muted, tracked uppercase text (slate-500) so they don't blend with values
 * - Values: rich black, bold text for instant readability
 */
function InfoItem({
  label,
  value,
  hrefType,
  emailSubject,
  className = '',
  valueClassName = '',
}: {
  label: string;
  value?: string | number | null;
  hrefType?: 'tel' | 'mailto';
  emailSubject?: string;
  className?: string;
  valueClassName?: string;
}) {
  const strVal = value !== undefined && value !== null ? String(value).trim() : '';
  const hasValue = Boolean(strVal);

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      {/* Title / Label: Distinct muted uppercase */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 truncate">
        {label}
      </span>

      {/* Content / Value: Deep black, clear hierarchy */}
      {hasValue ? (
        hrefType === 'tel' ? (
          <a
            href={`tel:${strVal}`}
            className={`text-sm font-semibold text-black hover:underline truncate ${valueClassName}`}
            title={`Call ${strVal}`}
          >
            {strVal}
          </a>
        ) : hrefType === 'mailto' ? (
          <a
            href={`mailto:${strVal}${emailSubject ? `?subject=${encodeURIComponent(emailSubject)}` : ''}`}
            className={`text-sm font-semibold text-black hover:underline truncate ${valueClassName}`}
            title={`Email ${strVal}${emailSubject ? ` - Subject: ${emailSubject}` : ''}`}
          >
            {strVal}
          </a>
        ) : (
          <span className={`text-sm sm:text-base font-bold text-black truncate ${valueClassName}`} title={strVal}>
            {strVal}
          </span>
        )
      ) : (
        <span className="text-sm text-slate-300 select-none">—</span>
      )}
    </div>
  );
}

export function DetailModal({ 
  escrow, 
  onClose, 
  onEdit, 
  onDelete,
  onUpdateEscrow,
}: DetailModalProps) {
  const { user } = useAuth();
  const fullAddress = formatPropertyAddress(escrow) || escrow.address || 'Untitled Property';

  const formatCurrency = (val?: number | string | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
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

  const priceNum = Number(escrow.price) || 0;
  const commPercentNum = Number(escrow.commissionPercent) || 0;
  const hasCommissionPercent = commPercentNum > 0;
  const grossCommission = hasCommissionPercent ? Math.round((priceNum * commPercentNum) / 100) : 0;

  const hasClient2 = !!(escrow.client2FirstName?.trim() || escrow.client2LastName?.trim());

  return (
    <div 
      id="detail-modal-overlay" 
      className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="detail-modal-container" 
        className="bg-white rounded-t-[2rem] sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh] border-t sm:border border-slate-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Simple Header: Address and basic text actions */}
        <div id="detail-modal-header" className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black truncate pr-4" title={fullAddress}>
            {fullAddress}
          </h2>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button 
              type="button"
              onClick={() => {
                const url = generateCognitoUrl(escrow, user);
                window.open(url, '_blank');
              }} 
              className="px-3 py-1.5 text-xs font-bold text-[#1B3A5C] bg-[#1B3A5C]/5 hover:bg-[#1B3A5C]/10 rounded-full transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              title="Open Cognito Form"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Cognito Form</span>
            </button>
            <button 
              type="button"
              onClick={onEdit} 
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer active:scale-95" 
              title="Edit Escrow"
            >
              <Pencil size={16} />
            </button>
            <button 
              type="button"
              onClick={onDelete} 
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all cursor-pointer active:scale-95" 
              title="Delete Escrow"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer active:scale-95"
              title="Close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Simple Modal Scrollable Body */}
        <div id="detail-modal-body" className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50 pb-24 sm:pb-28">
          
          {/* Key Summary Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-y-5 gap-x-6">
              
              {/* Status: Plain text font, no pill */}
              <div>
                <InfoItem 
                  label="STATUS" 
                  value={escrow.status || 'Open'} 
                  valueClassName="font-bold text-sm sm:text-base"
                />
              </div>

              {/* Sale Price */}
              <div>
                <InfoItem 
                  label="SALE PRICE" 
                  value={formatCurrency(escrow.price)} 
                  valueClassName="text-lg font-bold"
                />
              </div>

              {/* Gross Commission */}
              <div>
                <InfoItem 
                  label={`GROSS COMMISSION ${hasCommissionPercent ? `(${escrow.commissionPercent}%)` : ''}`}
                  value={hasCommissionPercent ? formatCurrency(grossCommission) : '—'} 
                  valueClassName="font-bold"
                />
              </div>

              {/* Net Commission */}
              <div>
                <InfoItem 
                  label="NET COMMISSION" 
                  value={formatCurrency(escrow.netCommission)} 
                  valueClassName="text-lg font-bold font-mono"
                />
              </div>

              {/* Lead Source in its own separate field */}
              <div>
                <InfoItem 
                  label="LEAD SOURCE" 
                  value={escrow.leadSource || 'Zillow'} 
                  valueClassName="font-bold"
                />
              </div>

              {/* Acceptance Date */}
              <div>
                <InfoItem 
                  label="ACCEPTANCE DATE" 
                  value={formatDateDisplay(escrow.acceptanceDate) || '—'} 
                />
              </div>

              {/* COE Date */}
              <div>
                <InfoItem 
                  label="COE DATE" 
                  value={formatDateDisplay(escrow.coeDate) || 'TBD'} 
                  valueClassName="font-bold"
                />
              </div>

            </div>
          </div>

          {/* Property & Escrow Terms */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
              PROPERTY & ESCROW TERMS
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6">
              <InfoItem label="ESCROW NUMBER" value={escrow.escrowNumber} />
              <InfoItem label="MLS ID" value={escrow.mlsId} />
              <InfoItem label="APN / PARCEL ID" value={escrow.apn} />
              <InfoItem label="REPRESENTATION" value={escrow.representation ? `Representing ${escrow.representation}` : 'Buyer'} />

              <div className="col-span-2">
                <InfoItem label="STREET ADDRESS" value={escrow.address} />
              </div>
              <InfoItem label="CITY" value={escrow.city} />
              <InfoItem label="ZIP CODE" value={escrow.zipCode} />

              <InfoItem label="ESCROW DAYS" value={escrow.coeDays ? `${escrow.coeDays} Days` : '30 Days'} />
            </div>
          </div>

          {/* Contacts Section: Clients & Service Providers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Primary Client (Client 1) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
                PRIMARY CLIENT
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <InfoItem 
                  label="NAME" 
                  value={`${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim()} 
                  valueClassName="font-bold"
                />
                <InfoItem 
                  label="BIRTHDAY" 
                  value={formatDateDisplay(escrow.clientBirthday)} 
                />
                <InfoItem 
                  label="PHONE" 
                  value={escrow.clientPhone} 
                  hrefType="tel" 
                />
                <InfoItem 
                  label="EMAIL" 
                  value={escrow.clientEmail} 
                  hrefType="mailto" 
                  emailSubject={fullAddress}
                />
              </div>
            </div>

            {/* Secondary Client (Client 2) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
                SECONDARY CLIENT
              </h3>

              {hasClient2 ? (
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <InfoItem 
                    label="NAME" 
                    value={`${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim()} 
                    valueClassName="font-bold"
                  />
                  <InfoItem 
                    label="BIRTHDAY" 
                    value={formatDateDisplay(escrow.client2Birthday)} 
                  />
                  <InfoItem 
                    label="PHONE" 
                    value={escrow.client2Phone} 
                    hrefType="tel" 
                  />
                  <InfoItem 
                    label="EMAIL" 
                    value={escrow.client2Email} 
                    hrefType="mailto" 
                    emailSubject={fullAddress}
                  />
                </div>
              ) : (
                <div className="text-sm text-slate-400 py-2">
                  None
                </div>
              )}
            </div>

            {/* Other Agent */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
                OTHER AGENT
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <InfoItem label="AGENT NAME" value={escrow.agentName} valueClassName="font-bold" />
                <InfoItem label="BROKERAGE" value={escrow.cooperatingBrokerage} />
                <InfoItem label="PHONE" value={escrow.agentPhone} hrefType="tel" />
                <InfoItem label="EMAIL" value={escrow.agentEmail} hrefType="mailto" emailSubject={fullAddress} />
              </div>
            </div>

            {/* Lender */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
                LENDER
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <InfoItem label="COMPANY" value={escrow.lenderCompany} valueClassName="font-bold" />
                <InfoItem label="LOAN OFFICER" value={escrow.lenderName} />
                <InfoItem label="PHONE" value={escrow.lenderPhone} hrefType="tel" />
                <InfoItem label="EMAIL" value={escrow.lenderEmail} hrefType="mailto" emailSubject={fullAddress} />
              </div>
            </div>

            {/* Escrow */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
                ESCROW
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <InfoItem label="ESCROW COMPANY" value={escrow.escrowCompany} valueClassName="font-bold" />
                <InfoItem label="OFFICER NAME" value={escrow.escrowOfficer} />
                <InfoItem label="PHONE" value={escrow.escrowPhone} hrefType="tel" />
                <InfoItem label="EMAIL" value={escrow.escrowEmail} hrefType="mailto" emailSubject={fullAddress} />
              </div>
            </div>

            {/* Title */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
                TITLE
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <InfoItem label="TITLE COMPANY" value={escrow.titleCompany} valueClassName="font-bold" />
                <InfoItem label="OFFICER NAME" value={escrow.titleOfficer} />
                <InfoItem label="PHONE" value={escrow.titlePhone} hrefType="tel" />
                <InfoItem label="EMAIL" value={escrow.titleEmail} hrefType="mailto" emailSubject={fullAddress} />
              </div>
            </div>

          </div>

          {/* Collaborator & Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
              COLLABORATOR & NOTES
            </h3>

            <div className="space-y-4">
              <InfoItem 
                label="COLLABORATOR / CO-AGENT" 
                value={escrow.collaborator} 
              />

              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                  TRANSACTION NOTES
                </span>
                {escrow.notes ? (
                  <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                    {escrow.notes}
                  </p>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black pb-3 mb-4 border-b border-slate-200">
              DOCUMENTS & ATTACHMENTS
            </h3>
            <DocumentsSection 
              escrow={escrow}
              onUpdate={(data) => onUpdateEscrow(escrow.id, data)}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
