import React, { useState } from 'react';
import { Listing } from '../../types';
import { parseISO, format } from 'date-fns';
import { Pencil, Trash2, X, Building2, User, FileText, ArrowRight, AlertCircle, Phone, Mail, DollarSign, Calendar, ExternalLink } from 'lucide-react';
import { ListingDocumentsSection } from './ListingDocumentsSection';
import { StatusBadge } from '../shared/StatusBadge';
import { calculateNetFromGross } from '../../utils/commissionUtils';
import { getZillowUrl } from '../../utils/zillowUtils';

interface ListingDetailModalProps {
  listing: Listing;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateListing: (id: string, data: Partial<Listing>) => void;
  onConvertToEscrow: (listing: Listing) => void;
}

function DetailItem({
  label,
  value,
  hrefType,
  className = '',
  valueClassName = '',
}: {
  label: string;
  value?: string | number | null;
  hrefType?: 'tel' | 'mailto';
  className?: string;
  valueClassName?: string;
}) {
  const strVal = value !== undefined && value !== null ? String(value).trim() : '';
  const hasValue = Boolean(strVal);

  return (
    <div className={`flex flex-col min-w-0 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B3A5C] mb-1 truncate">
        {label}
      </span>
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
            href={`mailto:${strVal}`}
            className={`text-sm font-semibold text-black hover:underline truncate ${valueClassName}`}
            title={`Email ${strVal}`}
          >
            {strVal}
          </a>
        ) : (
          <span className={`text-sm font-semibold text-black leading-snug break-words ${valueClassName}`}>
            {strVal}
          </span>
        )
      ) : (
        <span className="text-sm text-slate-400 font-normal">—</span>
      )}
    </div>
  );
}

export function ListingDetailModal({
  listing,
  onClose,
  onEdit,
  onDelete,
  onUpdateListing,
  onConvertToEscrow,
}: ListingDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formattedPrice = listing.listPrice
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing.listPrice)
    : 'Price TBD';

  const commissionPercent = listing.commissionPercent ?? 2.5;
  const grossCommission = listing.listPrice ? Math.round((listing.listPrice * commissionPercent) / 100) : 0;
  const commissionAmount = listing.netCommission !== undefined && listing.netCommission !== null && !isNaN(Number(listing.netCommission))
    ? Number(listing.netCommission)
    : (grossCommission > 0 ? calculateNetFromGross(grossCommission, listing.leadSource || 'Self') : 0);
  const formattedCommission = commissionAmount > 0
    ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(commissionAmount)}${listing.commissionPercent ? ` (${listing.commissionPercent}%)` : ''}`
    : `${commissionPercent}%`;

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const str = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-').map(Number);
        return format(new Date(y, m - 1, d), 'MMM d, yyyy');
      }
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const [m, d, y] = str.split('/').map(Number);
        return format(new Date(y, m - 1, d), 'MMM d, yyyy');
      }
      return format(parseISO(str), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const seller1Name = `${listing.clientFirstName || ''} ${listing.clientLastName || ''}`.trim() || '—';
  const seller2Name = `${listing.client2FirstName || ''} ${listing.client2LastName || ''}`.trim();
  const fullAddress = [listing.address, listing.city, 'CA', listing.zipCode].filter(Boolean).join(', ') || listing.address || 'Untitled Property';

  return (
    <div
      id="listing-detail-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[85] overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'listing-detail-overlay') {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#f8f9fa] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Styled matching listing top blue tab */}
        <div className="px-5 py-3.5 bg-[#1B3A5C] border-b border-[#142c47] text-white flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="min-w-0">
            <a
              href={getZillowUrl(listing.address, listing.city, listing.zipCode)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base sm:text-lg font-bold text-white hover:text-blue-200 hover:underline transition-colors truncate tracking-tight inline-flex items-center gap-1.5 group/zillow cursor-pointer"
              title={`Open ${fullAddress} on Zillow`}
            >
              <span>{listing.address || 'Untitled Listing'}</span>
              <ExternalLink size={14} className="text-blue-200 group-hover/zillow:text-white shrink-0 opacity-80 group-hover/zillow:opacity-100 transition-all" />
            </a>
            <div className="flex items-center gap-2 text-xs text-blue-200 font-medium truncate">
              <span>{[listing.city, 'CA', listing.zipCode].filter(Boolean).join(', ')}</span>
              {listing.mlsId && <span className="text-blue-100">• MLS #{listing.mlsId}</span>}
              {listing.apn && <span className="text-blue-100">• APN: {listing.apn}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={listing.status} onDark={true} />
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Edit listing"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-rose-200 hover:text-white hover:bg-rose-600/40 rounded-lg transition-colors cursor-pointer"
              title="Delete listing"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Key Financials & Terms Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3A5C] pb-3 mb-4 border-b border-slate-200 flex items-center justify-between">
              <span>LISTING TERMS & PRICING</span>
              <span className="text-emerald-700 font-extrabold text-sm">{formattedPrice}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailItem label="LIST PRICE" value={formattedPrice} valueClassName="font-extrabold text-emerald-700" />
              <DetailItem label="COMMISSION" value={formattedCommission} valueClassName="font-bold text-emerald-700" />
              <DetailItem label="AGREEMENT DATE" value={formatDateDisplay(listing.listingAgreementDate)} />
              <DetailItem label="EXPIRATION DATE" value={formatDateDisplay(listing.expirationDate)} />
              <DetailItem label="FOR SALE DATE" value={formatDateDisplay(listing.forSaleDate)} />
              <DetailItem label="GO-LIVE DATE" value={formatDateDisplay(listing.goLiveDate)} />
              <DetailItem label="LEAD SOURCE" value={listing.leadSource || 'Self'} />
              <DetailItem label="STATUS" value={listing.status} valueClassName="font-bold" />
            </div>
          </div>

          {/* Property Specs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3A5C] pb-3 mb-4 border-b border-slate-200">
              PROPERTY SPECIFICATIONS
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <DetailItem label="PROPERTY TYPE" value={listing.propertyType || 'Residential'} />
              <DetailItem label="BEDROOMS" value={listing.bedrooms || '—'} />
              <DetailItem label="BATHROOMS" value={listing.bathrooms || '—'} />
              <DetailItem label="SQUARE FEET" value={listing.squareFeet ? `${Number(listing.squareFeet).toLocaleString()} sqft` : '—'} />
              <DetailItem label="YEAR BUILT" value={listing.yearBuilt || '—'} />
              <DetailItem label="APN / PARCEL #" value={listing.apn || '—'} />
              <DetailItem label="MLS NUMBER" value={listing.mlsId || '—'} />
              <DetailItem label="CITY & ZIP" value={`${listing.city || ''} ${listing.zipCode || ''}`.trim() || '—'} />
            </div>
          </div>

          {/* Sellers Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3A5C] pb-3 mb-4 border-b border-slate-200">
              SELLER CLIENT DETAILS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Seller 1</span>
                <div className="grid grid-cols-1 gap-2.5">
                  <DetailItem label="NAME" value={seller1Name} valueClassName="font-bold" />
                  <DetailItem label="PHONE" value={listing.clientPhone} hrefType="tel" />
                  <DetailItem label="EMAIL" value={listing.clientEmail} hrefType="mailto" />
                </div>
              </div>

              {(seller2Name || listing.client2Phone || listing.client2Email) ? (
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Seller 2</span>
                  <div className="grid grid-cols-1 gap-2.5">
                    <DetailItem label="NAME" value={seller2Name || '—'} valueClassName="font-bold" />
                    <DetailItem label="PHONE" value={listing.client2Phone} hrefType="tel" />
                    <DetailItem label="EMAIL" value={listing.client2Email} hrefType="mailto" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center text-xs text-slate-400 italic">
                  No second seller recorded for this property.
                </div>
              )}
            </div>
          </div>

          {/* Escrow & Title Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Escrow */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3A5C] pb-3 mb-4 border-b border-slate-200">
                PREFERRED ESCROW
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <DetailItem label="COMPANY" value={listing.escrowCompany} valueClassName="font-bold" />
                <DetailItem label="OFFICER" value={listing.escrowOfficer} />
                <DetailItem label="PHONE" value={listing.escrowPhone} hrefType="tel" />
                <DetailItem label="EMAIL" value={listing.escrowEmail} hrefType="mailto" />
              </div>
            </div>

            {/* Title */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3A5C] pb-3 mb-4 border-b border-slate-200">
                PREFERRED TITLE
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <DetailItem label="COMPANY" value={listing.titleCompany} valueClassName="font-bold" />
                <DetailItem label="OFFICER" value={listing.titleOfficer} />
                <DetailItem label="PHONE" value={listing.titlePhone} hrefType="tel" />
                <DetailItem label="EMAIL" value={listing.titleEmail} hrefType="mailto" />
              </div>
            </div>
          </div>

          {/* Notes */}
          {(listing.lockboxCode || listing.showingInstructions || listing.notes) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3A5C] pb-3 mb-4 border-b border-slate-200">
                NOTES
              </h3>
              <div className="space-y-4">
                {listing.lockboxCode && (
                  <DetailItem label="LOCKBOX CODE" value={listing.lockboxCode} valueClassName="font-mono font-bold" />
                )}
                {listing.showingInstructions && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B3A5C] block mb-1">
                      SHOWING INSTRUCTIONS
                    </span>
                    <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                      {listing.showingInstructions}
                    </p>
                  </div>
                )}
                {listing.notes && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B3A5C] block mb-1">
                      NOTES
                    </span>
                    <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                      {listing.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents Section with full upload, preview, and download as in Escrow */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1B3A5C] pb-3 mb-4 border-b border-slate-200">
              DOCUMENTS & ATTACHMENTS
            </h3>
            <ListingDocumentsSection
              listing={listing}
              onUpdate={(data) => onUpdateListing(listing.id, data)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onConvertToEscrow(listing);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#006AFF] hover:bg-[#0051C6] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <span>Offer Accepted / Open Escrow</span>
            <ArrowRight size={14} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-4 py-2 text-xs font-bold bg-[#1d1d1f] text-white rounded-xl hover:bg-[#434344] transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              Edit Listing
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <AlertCircle size={22} />
              <h4 className="font-bold text-slate-900 text-sm">Delete Listing?</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete this listing for <span className="font-semibold text-slate-800">{listing.address}</span>?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
