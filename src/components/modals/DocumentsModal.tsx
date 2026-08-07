import React from 'react';
import { Escrow } from '../../types';
import { X, FileText } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { DocumentsSection } from './DocumentsSection';

interface DocumentsModalProps {
  escrow: Escrow;
  onClose: () => void;
  onUpdateEscrow: (id: string, data: Partial<Escrow>) => void;
}

export function DocumentsModal({ escrow, onClose, onUpdateEscrow }: DocumentsModalProps) {
  const docCount = escrow.documents?.length || 0;

  return (
    <div 
      id="documents-modal-overlay" 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[90] overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'documents-modal-overlay') {
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
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1B3A5C] flex items-center justify-center shrink-0 border border-blue-100">
              <FileText size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1B3A5C]">
                  Documents & Contracts
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

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white">
          <DocumentsSection 
            escrow={escrow} 
            onUpdate={(data) => onUpdateEscrow(escrow.id, data)} 
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100/80 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            {docCount === 1 ? '1 document saved' : `${docCount} documents saved`}
          </span>
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
