import React from 'react';
import { Listing } from '../../types';
import { X, FileText } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { ListingDocumentsSection } from './ListingDocumentsSection';

interface ListingDocumentsModalProps {
  listing: Listing;
  onClose: () => void;
  onUpdateListing: (id: string, data: Partial<Listing>) => void;
}

export function ListingDocumentsModal({ listing, onClose, onUpdateListing }: ListingDocumentsModalProps) {
  const docCount = listing.documents?.length || 0;

  return (
    <div 
      id="listing-documents-modal-overlay" 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[90] overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'listing-documents-modal-overlay') {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
              <FileText size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Listing Documents & Contracts
                </span>
                {listing.mlsId && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded font-mono">
                    MLS #{listing.mlsId}
                  </span>
                )}
                <StatusBadge status={listing.status} />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">
                {listing.address || 'Untitled Property'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <ListingDocumentsSection 
            listing={listing}
            onUpdate={(data) => onUpdateListing(listing.id, data)}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            {docCount} document{docCount !== 1 ? 's' : ''} stored securely in cloud
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
