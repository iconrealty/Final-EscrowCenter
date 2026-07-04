import React from 'react';

export function ConfirmModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="font-bold text-lg text-[#1d1d1f] mb-2">{title}</h2>
          <p className="text-sm text-[#86868b]">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-[#e5e5ea] bg-[#fafafa] flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold border border-[#e5e5ea] text-[#86868b] hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold bg-[#ef4444] text-white hover:bg-[#dc2626]">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
