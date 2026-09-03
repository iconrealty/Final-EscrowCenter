import React, { useState, useEffect, useRef } from 'react';
import { parseContactSignature, ParsedContact, ContactRole, cleanEmail } from '../../utils/contactParser';

interface QuickPasteContactProps {
  role: ContactRole;
  roleLabel: string;
  onApply: (parsed: ParsedContact) => void;
  className?: string;
}

export function QuickPasteContact({
  role,
  roleLabel,
  onApply,
  className = ''
}: QuickPasteContactProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedContact | null>(null);
  const [justApplied, setJustApplied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (rawText.trim()) {
      const result = parseContactSignature(rawText, role);
      if (result.email) {
        result.email = cleanEmail(result.email);
      }
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [rawText, role]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleApply = () => {
    if (!parsed) return;
    const sanitizedParsed: ParsedContact = {
      ...parsed,
      email: cleanEmail(parsed.email)
    };
    onApply(sanitizedParsed);
    setJustApplied(true);
    setTimeout(() => {
      setJustApplied(false);
      setIsOpen(false);
      setRawText('');
      setParsed(null);
    }, 300);
  };

  const hasExtractedAnything = Boolean(
    parsed && (parsed.name || parsed.company || parsed.phone || parsed.email)
  );

  return (
    <div className={`relative inline-block ${className}`}>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            justApplied
              ? 'bg-[#34c759] text-white'
              : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]'
          }`}
          title={`Paste info for ${roleLabel}`}
        >
          {justApplied ? 'Filled' : 'Paste info'}
        </button>
      ) : (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            setIsOpen(false);
            setRawText('');
            setParsed(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-[#e5e5ea] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[#f2f2f7] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1d1d1f] tracking-tight">
                Paste full information
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setRawText('');
                  setParsed(null);
                }}
                className="text-[#86868b] hover:text-[#1d1d1f] p-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <textarea
                ref={textareaRef}
                rows={5}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Paste contact details, signature, or text here..."
                className="w-full bg-[#f5f5f7] border border-transparent focus:border-[#d2d2d7] focus:bg-white rounded-xl p-3.5 text-xs text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none transition-all resize-none leading-relaxed font-sans"
              />

              {/* Real-time Extracted Fields Preview */}
              {hasExtractedAnything && (
                <div className="pt-3 border-t border-[#f2f2f7] space-y-2">
                  <div className="text-[10px] font-semibold text-[#86868b] uppercase tracking-wider">
                    Extracted Details
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {parsed?.name && (
                      <div className="bg-[#f5f5f7] rounded-lg p-2.5">
                        <span className="text-[9px] text-[#86868b] uppercase tracking-wider block font-semibold">Name</span>
                        <span className="font-medium text-[#1d1d1f] truncate block">{parsed.name}</span>
                      </div>
                    )}

                    {parsed?.company && role !== 'client' && (
                      <div className="bg-[#f5f5f7] rounded-lg p-2.5">
                        <span className="text-[9px] text-[#86868b] uppercase tracking-wider block font-semibold">Company</span>
                        <span className="font-medium text-[#1d1d1f] truncate block">{parsed.company}</span>
                      </div>
                    )}

                    {parsed?.phone && (
                      <div className="bg-[#f5f5f7] rounded-lg p-2.5">
                        <span className="text-[9px] text-[#86868b] uppercase tracking-wider block font-semibold">Phone</span>
                        <span className="font-medium text-[#1d1d1f] truncate block">{parsed.phone}</span>
                      </div>
                    )}

                    {parsed?.email && (
                      <div className="bg-[#f5f5f7] rounded-lg p-2.5">
                        <span className="text-[9px] text-[#86868b] uppercase tracking-wider block font-semibold">Email</span>
                        <span className="font-medium text-[#1d1d1f] truncate block">{parsed.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#f2f2f7] bg-[#fbfbfd] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setRawText('');
                  setParsed(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!hasExtractedAnything}
                onClick={handleApply}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  hasExtractedAnything
                    ? 'bg-[#1d1d1f] text-white hover:bg-black cursor-pointer active:scale-98'
                    : 'bg-[#e5e5ea] text-[#86868b] cursor-not-allowed'
                }`}
              >
                Fill Fields
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
