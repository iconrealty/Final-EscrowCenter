import React, { useState } from 'react';
import { AlertTriangle, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

interface ClearAllModalProps {
  totalCount: number;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export function ClearAllModal({ totalCount, onConfirm, onCancel }: ClearAllModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typedText, setTypedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = typedText.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-red-100 transition-all animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-red-50/80 border-b border-red-100 flex items-start gap-3">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-red-600 uppercase bg-red-100/80 px-2 py-0.5 rounded-full inline-block mb-1">
              Step {step} of 2 • Danger Zone
            </span>
            <h2 className="font-extrabold text-lg text-slate-900">
              {step === 1 ? 'Clear All Escrows?' : 'Final Confirmation Required'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {step === 1 
                ? `You are about to permanently delete ${totalCount} escrow deal${totalCount === 1 ? '' : 's'}.` 
                : 'Please confirm again that you want to delete all escrow records.'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {step === 1 ? (
            <div className="space-y-3">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  ⚠️ This action cannot be reversed
                </p>
                <p>
                  Clearing your database will remove all client details, documents, milestone dates, and active escrow records associated with this account.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Click <strong className="text-slate-800">Proceed to Second Confirmation</strong> to continue to the final confirmation window.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 font-medium">
                Please confirm if you want to delete all escrows. To prevent accidental deletion, type <strong className="font-extrabold text-red-700 underline">DELETE</strong> in the box below.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Type <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-red-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Type DELETE here..."
                  className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all uppercase placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Proceed to Second Confirmation</span>
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCancel}
                  disabled={isDeleting}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!isConfirmed || isDeleting}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    isConfirmed && !isDeleting
                      ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={14} />
                  <span>{isDeleting ? 'Deleting All...' : 'Permanently Delete All Escrows'}</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
