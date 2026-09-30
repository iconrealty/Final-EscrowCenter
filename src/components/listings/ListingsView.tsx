import React, { useState, useMemo } from 'react';
import { Listing, Escrow } from '../../types';
import { ListingCard } from './ListingCard';
import { Plus, Search, Building2, X, ChevronDown, ChevronUp, ArrowRight, RotateCcw } from 'lucide-react';
import { calculateNetFromGross } from '../../utils/commissionUtils';
import { differenceInCalendarDays, parseISO } from 'date-fns';

interface ListingsViewProps {
  listings: Listing[];
  escrows?: Escrow[];
  onNewListing: () => void;
  onEditListing: (listing: Listing) => void;
  onDeleteListing: (id: string) => void;
  onViewDetailsListing?: (listing: Listing) => void;
  onOpenDocumentsListing?: (listing: Listing) => void;
  onConvertToEscrow: (listing: Listing) => void;
  onOpenCognitoModal: (listing?: Listing) => void;
  onViewEscrow?: (escrow: Escrow) => void;
  onReturnToActive?: (listing: Listing) => void;
}

export function ListingsView({
  listings,
  escrows = [],
  onNewListing,
  onEditListing,
  onDeleteListing,
  onViewDetailsListing,
  onOpenDocumentsListing,
  onConvertToEscrow,
  onOpenCognitoModal,
  onViewEscrow,
  onReturnToActive,
}: ListingsViewProps) {
  const [search, setSearch] = useState('');
  const [isEscrowTabExpanded, setIsEscrowTabExpanded] = useState(true);
  const [confirmReturnListing, setConfirmReturnListing] = useState<Listing | null>(null);

  // Helper to find linked escrow for a listing
  const findLinkedEscrow = (listing: Listing): Escrow | undefined => {
    return escrows.find(
      (e) =>
        e.listingId === listing.id ||
        e.sourceListingId === listing.id ||
        listing.convertedEscrowId === e.id ||
        (Boolean(listing.address) &&
          Boolean(e.address) &&
          listing.address.trim().toLowerCase() === e.address.trim().toLowerCase())
    );
  };

  // Check if a listing's transaction is closed (either listing is closed or its linked escrow is closed)
  const isEscrowClosedForListing = (listing: Listing): boolean => {
    if (listing.status === 'Closed') return true;
    const linked = findLinkedEscrow(listing);
    return linked?.status === 'Closed';
  };

  // Only non-closed listings are shown on the listing page
  const openListings = useMemo(() => {
    return listings.filter((l) => !isEscrowClosedForListing(l));
  }, [listings, escrows]);

  const filteredListings = useMemo(() => {
    return openListings.filter((l) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const address = (l.address || '').toLowerCase();
        const city = (l.city || '').toLowerCase();
        const client1 = `${l.clientFirstName || ''} ${l.clientLastName || ''}`.toLowerCase();
        const client2 = `${l.client2FirstName || ''} ${l.client2LastName || ''}`.toLowerCase();
        const mls = (l.mlsId || '').toLowerCase();
        const apn = (l.apn || '').toLowerCase();
        const escrow = (l.escrowCompany || '').toLowerCase();
        const title = (l.titleCompany || '').toLowerCase();

        return (
          address.includes(s) ||
          city.includes(s) ||
          client1.includes(s) ||
          client2.includes(s) ||
          mls.includes(s) ||
          apn.includes(s) ||
          escrow.includes(s) ||
          title.includes(s)
        );
      }
      return true;
    });
  }, [openListings, search]);

  // Separate active listings from in-escrow properties
  const activeListings = useMemo(() => {
    return filteredListings.filter((l) => l.status !== 'Under Contract' && l.status !== 'Pending Offer');
  }, [filteredListings]);

  const inEscrowListings = useMemo(() => {
    return filteredListings.filter((l) => l.status === 'Under Contract' || l.status === 'Pending Offer');
  }, [filteredListings]);

  // Key metrics (calculated only from open/active listings, excluding closed escrows)
  const totalVolume = openListings.reduce((sum, l) => sum + (l.listPrice || 0), 0);
  const totalNetCommission = openListings.reduce((sum, l) => {
    if (l.netCommission !== undefined && l.netCommission !== null && !isNaN(Number(l.netCommission))) {
      return sum + Number(l.netCommission);
    }
    const price = l.listPrice || 0;
    const pct = l.commissionPercent !== undefined ? l.commissionPercent : 2.5;
    const gross = (price * pct) / 100;
    return sum + calculateNetFromGross(gross, l.leadSource || 'Self');
  }, 0);

  const formattedVolume = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(totalVolume);

  const formattedNetCommission = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(totalNetCommission);

  // Helper to calculate days on market
  const calculateDaysOnMarket = (l: Listing): number => {
    const rawDate = l.goLiveDate || l.forSaleDate || l.listingAgreementDate || l.createdAt;
    if (!rawDate) return 0;
    try {
      let d: Date | null = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
        const [y, m, day] = rawDate.trim().split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = parseISO(rawDate);
      }
      if (d && !isNaN(d.getTime())) {
        return Math.max(0, differenceInCalendarDays(new Date(), d));
      }
      return 0;
    } catch {
      return 0;
    }
  };

  // Helper to calculate days in escrow
  const calculateDaysInEscrow = (e?: Escrow): number | null => {
    if (!e?.acceptanceDate) return null;
    try {
      let d: Date | null = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(e.acceptanceDate.trim())) {
        const [y, m, day] = e.acceptanceDate.trim().split('-').map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = parseISO(e.acceptanceDate);
      }
      if (d && !isNaN(d.getTime())) {
        return Math.max(0, differenceInCalendarDays(new Date(), d));
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Listings Card */}
        <div className="h-[74px] sm:h-[80px] bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] rounded-2xl px-3 sm:px-4 flex flex-col items-center justify-center min-w-0 text-center transition-all hover:border-[#cbd5e1]">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.8px] text-black mb-1 truncate w-full">
            Active Listings
          </div>
          <div className="text-xl sm:text-2xl xl:text-[25px] font-black text-[#0f172a] tracking-tight leading-none">
            {activeListings.length}
          </div>
        </div>

        {/* Total Listing Volume Card */}
        <div className="h-[74px] sm:h-[80px] bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] rounded-2xl px-3 sm:px-4 flex flex-col items-center justify-center min-w-0 text-center transition-all hover:border-[#cbd5e1]">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.8px] text-black mb-1 truncate w-full">
            Total Listing Volume
          </div>
          <div className="text-lg sm:text-2xl xl:text-[25px] font-black text-[#0f172a] tracking-tight leading-none truncate w-full">
            {formattedVolume}
          </div>
        </div>

        {/* Net Commission Card */}
        <div className="h-[74px] sm:h-[80px] bg-white border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.07)] rounded-2xl px-3 sm:px-4 flex flex-col items-center justify-center min-w-0 text-center transition-all hover:border-[#cbd5e1]">
          <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.8px] text-black mb-1 truncate w-full">
            Net Commission
          </div>
          <div className="text-lg sm:text-2xl xl:text-[25px] font-black text-[#0f172a] tracking-tight leading-none truncate w-full">
            {formattedNetCommission}
          </div>
        </div>
      </div>

      {/* Toolbar / Search & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
          <input
            type="text"
            placeholder="Search address, client, APN, escrow, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-[#e5e5ea] shadow-xs rounded-xl pl-10 pr-8 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b]/70 focus:outline-none focus:border-[#1B3A5C]/40 focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNewListing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B3A5C] hover:bg-[#11253C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>New Listing</span>
          </button>
        </div>
      </div>

      {/* CONTRACTED TAB: In-Escrow Properties (Only shown when properties are in escrow) */}
      {inEscrowListings.length > 0 && (
        <div className="bg-slate-200/70 border border-slate-300 rounded-2xl shadow-xs overflow-hidden transition-all">
          {/* Contracted Header Bar - Clickable to toggle */}
          <button
            type="button"
            onClick={() => setIsEscrowTabExpanded(!isEscrowTabExpanded)}
            className="w-full px-4 py-3 bg-slate-300/80 hover:bg-slate-300 transition-colors flex items-center justify-between gap-3 text-left cursor-pointer border-b border-slate-300"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                In Escrow
              </span>
              <span className="text-sm font-extrabold text-[#1B3A5C]">
                ({inEscrowListings.length})
              </span>
              <span className="text-xs text-slate-600 hidden md:inline truncate">
                • Properties transferred to escrow & currently in closing process
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
              <span className="text-[11px] text-slate-600 hidden sm:inline">
                {isEscrowTabExpanded ? 'Contract' : 'Expand'}
              </span>
              {isEscrowTabExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {/* Expanded List: Just the address and key days-on-market in clean contracted rows */}
          {isEscrowTabExpanded ? (
            <div className="divide-y divide-slate-300/80 bg-slate-200/40">
              {inEscrowListings.map((listing, index) => {
                const linkedEscrow = findLinkedEscrow(listing);
                const dom = calculateDaysOnMarket(listing);
                const die = calculateDaysInEscrow(linkedEscrow);
                const addressStr = [listing.address, listing.city].filter(Boolean).join(', ');

                return (
                  <div
                    key={listing.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-300/50 transition-colors"
                  >
                    {/* Left: Number + Property Address (Click to open Edit modal) */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-black text-[#1B3A5C] bg-blue-50 border border-blue-200/80 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs select-none">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <span 
                          onClick={() => onEditListing(listing)}
                          className="font-bold text-sm text-[#1B3A5C] hover:text-blue-700 transition-colors cursor-pointer truncate block"
                          title={`${addressStr || 'No address provided'} (Click to edit)`}
                        >
                          {addressStr || 'No address provided'}
                        </span>
                        {listing.clientFirstName && (
                          <span className="text-[11px] text-slate-500 block truncate">
                            Seller: {listing.clientFirstName} {listing.clientLastName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: Days on Market & Days in Escrow in dark blue */}
                    <div className="flex items-center gap-2.5 text-xs shrink-0 pl-1 sm:pl-0">
                      <div className="font-bold text-[#1B3A5C] bg-blue-50/70 border border-blue-200/60 px-2.5 py-1 rounded-lg">
                        <span>{dom} Days on Market</span>
                      </div>
                      {die !== null && (
                        <div className="font-bold text-[#1B3A5C] bg-blue-50/70 border border-blue-200/60 px-2.5 py-1 rounded-lg hidden sm:inline-block">
                          <span>Day {die} in Escrow</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Quick actions with Confirmation on Return to Active */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setConfirmReturnListing(listing)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white bg-white/70 transition-colors cursor-pointer border border-slate-300 shadow-2xs"
                        title="Return listing back to Active if escrow fell through"
                      >
                        <RotateCcw size={12} />
                        <span>Return to Active</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Contracted Single-line preview */
            <div className="px-4 py-2.5 text-xs text-slate-700 flex items-center justify-between gap-2 bg-slate-200/70">
              <span className="truncate">
                {inEscrowListings.map((l, idx) => `${idx + 1}. ${l.address}`).filter(Boolean).join(' • ')}
              </span>
              <button
                type="button"
                onClick={() => setIsEscrowTabExpanded(true)}
                className="text-[11px] font-bold text-[#1B3A5C] hover:underline shrink-0 cursor-pointer"
              >
                Show addresses ({inEscrowListings.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal: Return Listing to Active */}
      {confirmReturnListing && (
        <div 
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setConfirmReturnListing(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#e5e5ea] flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-[#1d1d1f]">Return Listing to Active</h3>
              <button 
                type="button" 
                onClick={() => setConfirmReturnListing(null)}
                className="text-[#86868b] hover:text-[#1d1d1f] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Cancel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                Are you sure you want to return <strong className="text-slate-900">{confirmReturnListing.address}</strong> back to <strong className="text-slate-900">Active Listings</strong>?
              </p>
              <div className="bg-blue-50/70 border border-blue-200/90 rounded-xl p-3 text-xs text-[#11253C]">
                This will move the property back into your active market inventory so it displays again in the listings grid.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmReturnListing(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetListing = confirmReturnListing;
                  setConfirmReturnListing(null);
                  onReturnToActive?.(targetListing);
                }}
                className="px-4 py-2 rounded-xl bg-[#1B3A5C] hover:bg-[#11253C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <RotateCcw size={13} />
                <span>Confirm & Return to Active</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Listings Grid (ONLY Active Listings, not in escrow!) */}
      {activeListings.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
          {activeListings.map((listing, index) => (
            <ListingCard
              key={listing.id}
              index={index}
              listing={listing}
              onEdit={onEditListing}
              onDelete={onDeleteListing}
              onViewDetails={onViewDetailsListing}
              onOpenDocuments={onOpenDocumentsListing}
              onConvertToEscrow={onConvertToEscrow}
              onOpenCognitoIntake={(l) => onOpenCognitoModal(l)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 shadow-2xs rounded-2xl p-10 sm:p-14 text-center w-full">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1B3A5C] flex items-center justify-center mx-auto mb-3.5">
            <Building2 size={28} />
          </div>
          <h3 className="text-slate-800 font-bold text-lg mb-1">
            {listings.length === 0 ? 'No listings created yet' : 'No active listings currently on market'}
          </h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mb-5 leading-relaxed">
            {listings.length === 0
              ? 'Add your current listings here to pre-assign your Escrow & Title companies, attach documents, and submit to the Cognito form.'
              : inEscrowListings.length > 0
              ? `All ${inEscrowListings.length} listing(s) are currently in escrow above.`
              : 'Try clearing your search query to see other listings.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onNewListing}
              className="bg-[#1B3A5C] hover:bg-[#11253C] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              + Create First Listing
            </button>
            <button
              type="button"
              onClick={() => onOpenCognitoModal()}
              className="bg-slate-100 hover:bg-slate-200/90 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cognito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
