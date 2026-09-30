import React, { useState } from 'react';
import { Listing } from '../../types';
import { Building2, User, Phone, Mail, MapPin, DollarSign, Calendar, Edit3, Trash2, Send, CheckCircle2, Paperclip, MessageSquare, Copy, Check, ExternalLink } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays, formatDistanceToNow } from 'date-fns';
import { StatusBadge } from '../shared/StatusBadge';
import { calculateNetFromGross } from '../../utils/commissionUtils';
import { getZillowUrl } from '../../utils/zillowUtils';

interface ContactFastBarProps {
  role: string;
  title: string;
  subTitle?: string;
  phone?: string;
  email?: string;
  avatarBg?: string;
  icon?: React.ReactNode;
  subject?: string;
  onEdit?: () => void;
}

function ContactFastBar({
  role,
  title,
  subTitle,
  phone,
  email,
  avatarBg,
  icon,
  subject,
  onEdit,
}: ContactFastBarProps) {
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';
  const hasPhone = !!cleanPhone;
  const hasEmail = !!email;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="px-3 py-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl shadow-2xs transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Identity & Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${avatarBg || 'bg-[#1B3A5C]'} border border-black/10 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-xs`}>
            {icon || (title ? title.charAt(0).toUpperCase() : <User size={13} />)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-600 uppercase tracking-wider leading-none">
                {role}
              </span>
              {subTitle && (
                <span className="text-[10px] text-slate-500 font-medium truncate" title={subTitle}>
                  • {subTitle}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5" title={title}>
              {title}
            </div>
          </div>
        </div>

        {/* Fast Action Buttons: Call (Soft Green), Text (Blue), Email (Red) in Circular Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Call Action - Soft Green Circle */}
          {hasPhone ? (
            <a
              href={`tel:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-emerald-600/40"
              title={`Call ${role}: ${phone}`}
              aria-label={`Call ${role}`}
            >
              <Phone size={13} className="text-white" />
            </a>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-300/80"
              title={`No phone recorded for ${role}. Click to edit.`}
              aria-label="No phone number"
            >
              <Phone size={13} />
            </button>
          )}

          {/* Text / SMS Action - Blue Circle */}
          {hasPhone ? (
            <a
              href={`sms:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-blue-700/60"
              title={`Text ${role}: ${phone}`}
              aria-label={`Text ${role}`}
            >
              <MessageSquare size={13} className="text-white" />
            </a>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-300/80"
              title={`No phone recorded for ${role}. Click to edit.`}
              aria-label="No phone number"
            >
              <MessageSquare size={13} />
            </button>
          )}

          {/* Email Action - Red Circle */}
          {hasEmail ? (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(subject || 'Listing Inquiry')}`}
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-red-700/60"
              title={`Email ${role}: ${email}`}
              aria-label={`Email ${role}`}
            >
              <Mail size={13} className="text-white" />
            </a>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-300/80"
              title={`No email recorded for ${role}. Click to edit.`}
              aria-label="No email address"
            >
              <Mail size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ListingCardProps {
  key?: React.Key;
  listing: Listing;
  index?: number;
  onEdit: (listing: Listing) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (listing: Listing) => void;
  onOpenDocuments?: (listing: Listing) => void;
  onConvertToEscrow: (listing: Listing) => void;
  onOpenCognitoIntake: (listing: Listing) => void;
}

export function ListingCard({
  listing,
  index,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenDocuments,
  onConvertToEscrow,
  onOpenCognitoIntake,
}: ListingCardProps) {
  const formattedPrice = listing.listPrice 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing.listPrice)
    : 'Price TBD';

  const commissionPercent = listing.commissionPercent ?? 2.5;
  const grossCommission = listing.listPrice ? Math.round((listing.listPrice * commissionPercent) / 100) : 0;
  const commissionAmount = listing.netCommission !== undefined && listing.netCommission !== null && !isNaN(Number(listing.netCommission))
    ? Number(listing.netCommission)
    : (grossCommission > 0 ? calculateNetFromGross(grossCommission, listing.leadSource || 'Self') : 0);
  const formattedCommission = commissionAmount > 0
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(commissionAmount)
    : `${commissionPercent}%`;

  const seller1Name = `${listing.clientFirstName || ''} ${listing.clientLastName || ''}`.trim() || 'Seller Unspecified';
  const seller2Name = `${listing.client2FirstName || ''} ${listing.client2LastName || ''}`.trim();

  const [copiedAddress, setCopiedAddress] = useState(false);
  const fullAddress = [listing.address, listing.city, 'CA', listing.zipCode].filter(Boolean).join(', ') || listing.address || '';

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fullAddress) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(fullAddress);
      } else {
        const el = document.createElement('textarea');
        el.value = fullAddress;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  // Robust helper to parse dates without UTC midnight timezone offset or invalid Date issues
  const parseLocalDate = (dateStr?: string | null): Date | null => {
    if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return null;
    const str = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      return isNaN(dObj.getTime()) ? null : dObj;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
      const [m, d, y] = str.split('/').map(Number);
      const dObj = new Date(y, m - 1, d);
      return isNaN(dObj.getTime()) ? null : dObj;
    }
    try {
      const nativeParsed = new Date(str);
      if (!isNaN(nativeParsed.getTime())) return nativeParsed;
      const isoParsed = parseISO(str);
      if (!isNaN(isoParsed.getTime())) return isoParsed;
      return null;
    } catch {
      return null;
    }
  };

  // When status is "Active" (Active on MLS), the number of days is based on the Go-Live Date.
  // Otherwise, the number of days is based on the For Sale Date.
  const isActiveOnMls = listing.status === 'Active';

  const baseDateObj = isActiveOnMls
    ? (parseLocalDate(listing.goLiveDate) || parseLocalDate(listing.forSaleDate) || parseLocalDate(listing.listingAgreementDate) || parseLocalDate(listing.createdAt))
    : (parseLocalDate(listing.forSaleDate) || parseLocalDate(listing.listingAgreementDate) || parseLocalDate(listing.goLiveDate) || parseLocalDate(listing.createdAt));

  const rawDaysDiff = baseDateObj ? differenceInCalendarDays(new Date(), baseDateObj) : 0;
  const daysOnMarket = isNaN(rawDaysDiff) ? 0 : Math.max(0, rawDaysDiff);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parsed = parseLocalDate(dateStr);
      if (parsed) {
        return format(parsed, 'MMM d, yyyy');
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const isClosedOrContract = listing.status === 'Under Contract';
  const isOffMarketOrCancelled = listing.status === 'Off Market' || listing.status === 'Cancelled';
  const zillowUrl = getZillowUrl(listing.address, listing.city, listing.zipCode);

  // Status styling
  const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
    'Pre-Listing': { bg: 'bg-amber-50 text-amber-800', border: 'border-amber-200', text: 'Pre-Listing / Coming Soon' },
    'Active': { bg: 'bg-blue-50 text-[#1B3A5C]', border: 'border-blue-200', text: 'Active on MLS' },
    'Off Market': { bg: 'bg-amber-50 text-amber-900', border: 'border-amber-200', text: 'Off Market' },
    'Pending Offer': { bg: 'bg-purple-50 text-purple-800', border: 'border-purple-200', text: 'Pending Offer' },
    'Under Contract': { bg: 'bg-emerald-50 text-emerald-800', border: 'border-emerald-200', text: 'Under Contract (In Escrow)' },
    'Cancelled': { bg: 'bg-slate-100 text-slate-600', border: 'border-slate-200', text: 'Cancelled' },
  };

  const statusConfig = statusStyles[listing.status] || statusStyles['Active'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Top Header Bar - Clean Blue Option (distinguishes Listings from Escrows) */}
      <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#1B3A5C] border-b border-[#142c47] text-white flex flex-wrap justify-between items-center gap-2 min-w-0 max-w-full">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          {typeof index === 'number' && (
            <span className="font-mono text-xs font-black bg-blue-100 text-[#1B3A5C] border border-blue-200/60 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg shadow-xs shrink-0 tracking-wide">
              #{index + 1}
            </span>
          )}
          {listing.mlsId && (
            <span className="font-mono text-[11px] sm:text-xs font-bold bg-white/15 border border-white/25 text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shrink-0 shadow-2xs" title={`MLS #${listing.mlsId}`}>
              MLS #{listing.mlsId}
            </span>
          )}
          {listing.apn && (
            <span className="font-mono text-[10px] sm:text-xs text-blue-200 hidden sm:inline" title={`APN ${listing.apn}`}>
              APN: {listing.apn}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
          {listing.leadSource && (
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white">
              {listing.leadSource}
            </span>
          )}
          <StatusBadge status={listing.status} onDark={true} />
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between gap-3.5 sm:gap-4">
        {/* Address & Client Name with Days Active Box - Same style and position as Escrow tab */}
        <div className="flex items-center gap-3.5">
          {/* Days Big Number Box */}
          <div 
            className={`w-[70px] sm:w-[78px] h-[70px] sm:h-[78px] shrink-0 border rounded-2xl p-2 flex flex-col justify-center items-center text-center shadow-[0_2px_8px_rgba(0,0,0,0.02)] select-none ${
              isClosedOrContract
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : listing.status === 'Cancelled'
                ? 'bg-rose-50/50 border-rose-100 text-rose-500'
                : 'bg-[#1B3A5C]/5 border-[#1B3A5C]/15 text-[#1B3A5C]'
            }`}
            title={
              isActiveOnMls
                ? (listing.goLiveDate ? `Go-Live Date: ${formatDateDisplay(listing.goLiveDate)} (${daysOnMarket} days on MLS)` : `Active on MLS (${daysOnMarket} days)`)
                : (listing.forSaleDate ? `For Sale Date: ${formatDateDisplay(listing.forSaleDate)} (${daysOnMarket} days)` : `Listing active for ${daysOnMarket} days`)
            }
          >
            {listing.status === 'Cancelled' ? (
              <>
                <span className="text-[18px] sm:text-[20px] font-black leading-none mb-0.5">✕</span>
                <span className="text-[7.5px] sm:text-[8px] font-extrabold uppercase tracking-wider opacity-80 leading-none truncate w-full">Cancelled</span>
              </>
            ) : (
              <>
                <span className="text-[20px] sm:text-[24px] font-black tracking-tight leading-none">
                  {daysOnMarket}
                </span>
                <span className="text-[7.5px] sm:text-[8px] font-extrabold uppercase tracking-wider opacity-80 mt-0.5 leading-tight">
                  {daysOnMarket === 1 ? 'Day' : 'Days'}
                </span>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-[#86868b] font-bold mb-1" title="Client / Seller Name">
              {seller1Name}
              {seller2Name && <span className="font-normal text-slate-500"> & {seller2Name}</span>}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <a
                href={zillowUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-bold text-base text-[#1B3A5C] hover:text-[#006AFF] hover:underline transition-colors tracking-tight line-clamp-2 inline-flex items-center gap-1.5 group/zillow cursor-pointer"
                title={`Open ${fullAddress} on Zillow`}
              >
                <span>{fullAddress}</span>
                <ExternalLink size={14} className="text-slate-400 group-hover/zillow:text-[#006AFF] shrink-0 opacity-70 group-hover/zillow:opacity-100 transition-all" />
              </a>
              <button
                type="button"
                onClick={handleCopyAddress}
                className={`p-1 rounded-md transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                  copiedAddress 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs' 
                    : 'text-slate-400 hover:text-[#1B3A5C] hover:bg-slate-100'
                }`}
                title={copiedAddress ? 'Address copied to clipboard!' : 'Copy address'}
                aria-label="Copy address"
              >
                {copiedAddress ? (
                  <Check size={14} className="text-emerald-600 stroke-[2.5]" />
                ) : (
                  <Copy size={14} className="stroke-[2.2]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pricing, Agreement Date, Expiration, Commission Grid - Exact same structure & style as Escrow tab */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-slate-50/90 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          <div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#1B3A5C] font-black mb-1">Price</div>
            <div className="text-sm sm:text-base font-black text-[#16a34a] tracking-tight leading-none">{formattedPrice}</div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#1B3A5C] font-black mb-1" title="Agreement Date">Agreement Date</div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
              {formatDateDisplay(listing.listingAgreementDate || listing.createdAt)}
            </div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#1B3A5C] font-black mb-1" title="Listing Expiration Date">Expires</div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight truncate">
              {formatDateDisplay(listing.expirationDate)}
            </div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#1B3A5C] font-black mb-1">Commission</div>
            <div className="text-sm sm:text-base font-black text-[#16a34a] tracking-tight leading-none">{formattedCommission}</div>
          </div>
        </div>

        {/* Property Specs (Property Type, Beds, Baths, Sqft, Documents) */}
        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
          {listing.propertyType && (
            <span className="font-bold text-[#1B3A5C] bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
              {listing.propertyType}
            </span>
          )}
          {(listing.bedrooms || listing.bathrooms) && (
            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              {listing.bedrooms || '-'} Beds • {listing.bathrooms || '-'} Baths
            </span>
          )}
          {listing.squareFeet && (
            <span className="text-slate-500 font-medium">
              {Number(listing.squareFeet).toLocaleString()} sqft
            </span>
          )}
          {listing.documents && listing.documents.length > 0 && (
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ml-auto">
              <Paperclip size={11} />
              {listing.documents.length} doc{listing.documents.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Contacts Section: Seller, Escrow, Title styled like EscrowCard Agent Info */}
        <div className="flex flex-col gap-2">
          {/* Seller Contact Bar */}
          <ContactFastBar
            role="Seller"
            title={seller1Name}
            subTitle={seller2Name ? `& ${seller2Name}` : undefined}
            phone={listing.clientPhone}
            email={listing.clientEmail}
            avatarBg="bg-[#1B3A5C]"
            icon={<User size={14} />}
            subject={listing.address || 'Property Listing'}
            onEdit={() => onEdit(listing)}
          />

          {/* Escrow Contact Bar */}
          <ContactFastBar
            role="Escrow"
            title={listing.escrowCompany || 'Escrow Not Assigned'}
            subTitle={listing.escrowOfficer ? `Officer: ${listing.escrowOfficer}` : undefined}
            phone={listing.escrowPhone}
            email={listing.escrowEmail}
            avatarBg="bg-indigo-900"
            icon={<Building2 size={14} />}
            subject={`Escrow - ${listing.address || 'Listing'}`}
            onEdit={() => onEdit(listing)}
          />

          {/* Title Contact Bar */}
          <ContactFastBar
            role="Title"
            title={listing.titleCompany || 'Title Not Assigned'}
            subTitle={listing.titleOfficer ? `Officer: ${listing.titleOfficer}` : undefined}
            phone={listing.titlePhone}
            email={listing.titleEmail}
            avatarBg="bg-teal-800"
            icon={<Building2 size={14} />}
            subject={`Title - ${listing.address || 'Listing'}`}
            onEdit={() => onEdit(listing)}
          />
        </div>

        {/* Action Buttons: Cognito + Documents Button + Offer Accepted */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 min-w-0">
          {/* Cognito Button */}
          <button
            type="button"
            onClick={() => onOpenCognitoIntake(listing)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs transition-colors cursor-pointer shrink-0"
            title="Open Cognito Form pre-filled for this listing"
          >
            <Send size={13} className="text-[#1B3A5C]" />
            <span className="hidden sm:inline">Cognito</span>
          </button>

          {/* Documents Button - Same color feature as Escrow: green if docs, pulsating rose if no docs */}
          {(() => {
            const docCount = listing.documents?.length || 0;
            const hasDocs = docCount > 0;
            return (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenDocuments) {
                    onOpenDocuments(listing);
                  } else if (onViewDetails) {
                    onViewDetails(listing);
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shrink-0 ${
                  hasDocs
                    ? 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 animate-pulse'
                }`}
                title={hasDocs ? `${docCount} document(s) attached` : 'No documents attached - click to upload'}
              >
                <Paperclip size={13} className={hasDocs ? 'text-emerald-700' : 'text-rose-500'} />
                <span>{hasDocs ? `Documents (${docCount})` : 'No Documents'}</span>
              </button>
            );
          })()}

          {/* Primary Action: Offer Accepted / Open Escrow - Zillow Blue */}
          <button
            type="button"
            onClick={() => onConvertToEscrow(listing)}
            className="flex-1 min-w-0 flex items-center justify-center px-3 sm:px-4 py-2 rounded-xl bg-[#006AFF] hover:bg-[#0051C6] text-white font-bold text-xs transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95 text-center truncate"
            title="Convert this listing directly into an open escrow with pre-filled escrow & title companies"
          >
            <span className="truncate">Offer Accepted / Open Escrow</span>
          </button>
        </div>
      </div>

      {/* Footer Actions - Identical to EscrowCard */}
      <div className="px-4 py-3 flex justify-between items-center bg-slate-100/70 border-t border-slate-200/90">
        <div className="text-[10px] italic text-[#86868b] flex items-center gap-2">
          <span>Last updated: {listing.lastUpdated ? formatDistanceToNow(parseISO(String(listing.lastUpdated)), { addSuffix: true }) : 'Recently'}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(listing.id);
            }}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-200/70 rounded transition-colors cursor-pointer"
            title="Delete listing"
          >
            <Trash2 size={13} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.(listing);
            }}
            className="px-3 py-1.5 text-xs font-bold text-black hover:text-slate-700 transition-colors cursor-pointer"
          >
            Details
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(listing);
            }}
            className="px-3 py-1.5 text-xs font-bold bg-[#1d1d1f] text-white rounded-md hover:bg-[#434344] transition-colors cursor-pointer"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
