import React from 'react';
import { Listing, Escrow } from '../../types';
import { AlertTriangle, ArrowRight, RotateCcw, X, Building2, CheckCircle2 } from 'lucide-react';

interface CancelEscrowListingPromptModalProps {
  isOpen: boolean;
  escrow: Escrow | null;
  linkedListing: Listing | null;
  onReturnToActive: (listing: Listing) => void;
  onKeepOffMarket: (listing: Listing) => void;
  onClose: () => void;
}

export function CancelEscrowListingPromptModal({
  isOpen,
  escrow,
  linkedListing,
  onReturnToActive,
  onKeepOffMarket,
  onClose,
}: CancelEscrowListingPromptModalProps) {
  if (!isOpen || !linkedListing) return null;

  const propertyAddress = linkedListing.address || escrow?.address || 'This property';

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-200/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Seller Escrow Cancelled
              </h3>
              <p className="text-xs text-slate-500">
                Action required for linked listing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
              Property
            </div>
            <div className="text-sm font-bold text-[#1B3A5C] flex items-center gap-1.5">
              <Building2 size={16} className="text-[#1B3A5C]" />
              <span>{propertyAddress}</span>
            </div>
            {linkedListing.clientFirstName && (
              <div className="text-xs text-slate-600 mt-1">
                Seller: {linkedListing.clientFirstName} {linkedListing.clientLastName}
              </div>
            )}
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">
            The seller escrow for this property has been marked as <span className="font-bold text-rose-600">Cancelled</span>. 
            Would you like to automatically return the listing back to <span className="font-bold text-blue-700">Active</span> on your listings page so you can continue marketing it, or keep it marked as Off Market?
          </p>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
            <RotateCcw size={16} className="text-[#1B3A5C] shrink-0 mt-0.5" />
            <span>
              Returning to <strong>Active</strong> preserves all original listing dates, photos, contacts, and accurate days on market calculation.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onKeepOffMarket(linkedListing)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer text-center"
          >
            Keep as Off Market
          </button>
          <button
            type="button"
            onClick={() => onReturnToActive(linkedListing)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1B3A5C] hover:bg-[#11253C] text-white font-bold text-xs transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <CheckCircle2 size={15} />
            <span>Return to Active Listing</span>
          </button>
        </div>
      </div>
    </div>
  );
}
