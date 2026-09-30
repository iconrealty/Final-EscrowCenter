import React, { useState } from 'react';
import { Listing, Escrow } from '../../types';
import { Building2, Calendar, DollarSign, ExternalLink, ArrowRight, Copy, Check, RotateCcw, Clock, User, ShieldCheck } from 'lucide-react';
import { differenceInCalendarDays, parseISO, format } from 'date-fns';

interface InEscrowListingCardProps {
  key?: React.Key;
  listing: Listing;
  linkedEscrow?: Escrow;
  onViewEscrow?: (escrow: Escrow) => void;
  onReturnToActive?: (listing: Listing) => void;
  onEditListing?: (listing: Listing) => void;
  onViewDetails?: (listing: Listing) => void;
}

export function InEscrowListingCard({
  listing,
  linkedEscrow,
  onViewEscrow,
  onReturnToActive,
  onEditListing,
  onViewDetails,
}: InEscrowListingCardProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Helper to parse dates
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

  // Days on Market calculation (from goLiveDate, forSaleDate, or listingAgreementDate)
  const baseMarketDate = parseLocalDate(listing.goLiveDate) ||
    parseLocalDate(listing.forSaleDate) ||
    parseLocalDate(listing.listingAgreementDate) ||
    parseLocalDate(listing.createdAt);

  const rawDomDiff = baseMarketDate ? differenceInCalendarDays(new Date(), baseMarketDate) : 0;
  const daysOnMarket = isNaN(rawDomDiff) ? 0 : Math.max(0, rawDomDiff);

  // Days in Escrow calculation (from acceptanceDate)
  const acceptanceDateStr = linkedEscrow?.acceptanceDate;
  const acceptanceDateObj = acceptanceDateStr ? parseLocalDate(acceptanceDateStr) : null;
  const rawEscrowDays = acceptanceDateObj ? differenceInCalendarDays(new Date(), acceptanceDateObj) : null;
  const daysInEscrow = rawEscrowDays !== null && !isNaN(rawEscrowDays) ? Math.max(0, rawEscrowDays) : null;

  const fullAddress = [listing.address, listing.city, listing.zipCode].filter(Boolean).join(', ');

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullAddress || listing.address || '');
      } else {
        const el = document.createElement('textarea');
        el.value = fullAddress || listing.address || '';
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

  const sellerName = [listing.clientFirstName, listing.clientLastName].filter(Boolean).join(' ') || 'Seller';
  const seller2Name = [listing.client2FirstName, listing.client2LastName].filter(Boolean).join(' ');

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all flex flex-col justify-between overflow-hidden group">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Currently In Escrow
          </span>
          {linkedEscrow?.escrowNumber && (
            <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Escrow #{linkedEscrow.escrowNumber}
            </span>
          )}
        </div>
        {linkedEscrow && (
          <span className="text-[11px] font-semibold text-slate-300">
            Status: <span className="text-white font-bold">{linkedEscrow.status}</span>
          </span>
        )}
      </div>

      {/* Main Content Area: Focused on Address & Days on Market */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {/* Days on Market Big Box */}
          <div 
            className="w-[84px] sm:w-[94px] h-[84px] sm:h-[94px] shrink-0 border border-[#1B3A5C]/20 bg-[#1B3A5C]/5 rounded-2xl p-2 flex flex-col justify-center items-center text-center text-[#1B3A5C] shadow-2xs select-none"
            title={`Total Days on Market: ${daysOnMarket} days`}
          >
            <span className="text-[26px] sm:text-[30px] font-black tracking-tight leading-none text-[#1B3A5C]">
              {daysOnMarket}
            </span>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider opacity-85 mt-1 leading-tight text-[#1B3A5C]">
              {daysOnMarket === 1 ? 'Day' : 'Days'}
            </span>
            <span className="text-[7px] font-bold uppercase tracking-wider opacity-60 mt-0.5 text-slate-500">
              On Market
            </span>
          </div>

          {/* Address & Sellers */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1 flex items-center gap-1.5 truncate">
              <User size={12} className="text-slate-400" />
              <span>{sellerName}{seller2Name ? ` & ${seller2Name}` : ''}</span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <h3 
                className="font-bold text-base sm:text-lg text-[#1B3A5C] tracking-tight line-clamp-2 hover:text-blue-900 transition-colors cursor-pointer"
                onClick={() => onViewDetails?.(listing)}
                title={fullAddress}
              >
                {fullAddress || 'No address provided'}
              </h3>
              <button
                type="button"
                onClick={handleCopyAddress}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
                title={copiedAddress ? 'Copied!' : 'Copy full address'}
              >
                {copiedAddress ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Quick Pricing info */}
            <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
              <span className="text-slate-500">
                List: <strong className="text-slate-800">${(listing.listPrice || 0).toLocaleString()}</strong>
              </span>
              {linkedEscrow?.price && linkedEscrow.price !== listing.listPrice && (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Accepted: ${linkedEscrow.price.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Escrow Timeline Stats Pill Row */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Days in Escrow</span>
            <span className="font-extrabold text-[#1B3A5C] flex items-center gap-1">
              <Clock size={12} className="text-[#1B3A5C]" />
              {daysInEscrow !== null ? `${daysInEscrow} Days` : 'In Progress'}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Offer Acceptance</span>
            <span className="font-bold text-slate-700 truncate block">
              {acceptanceDateStr || 'Under contract'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Target Close (COE)</span>
            <span className="font-bold text-slate-700 truncate block">
              {linkedEscrow?.coeDate || 'Pending confirmation'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Navigation: One-click to Escrow Record or return to active */}
      <div className="px-4 py-3 bg-slate-100/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onReturnToActive?.(listing)}
            className="text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title="If the deal fell through, return this listing back to Active on MLS"
          >
            <RotateCcw size={12} />
            <span>Return to Active</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewDetails?.(listing)}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-black transition-colors cursor-pointer"
          >
            Listing Specs
          </button>
          {linkedEscrow ? (
            <button
              type="button"
              onClick={() => onViewEscrow?.(linkedEscrow)}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#1B3A5C] hover:bg-[#11253C] text-white rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>View Escrow Record</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onEditListing?.(listing)}
              className="px-3 py-1.5 text-xs font-bold bg-[#1d1d1f] text-white rounded-lg hover:bg-[#434344] transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
