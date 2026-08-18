import React, { useState, useEffect } from 'react';
import { X, Mail, Globe, Check, Settings, Sparkles, ExternalLink } from 'lucide-react';
import { useEmailPreference, EmailClientType } from '../../context/EmailPreferenceContext';
import { useAuth } from '../../context/AuthContext';

export function EmailChooserModal() {
  const { 
    isChooserOpen, 
    closeChooser, 
    emailPreference, 
    gmailAccount, 
    setEmailPreference, 
    pendingPayload 
  } = useEmailPreference();
  const { user } = useAuth();

  const [selectedClient, setSelectedClient] = useState<EmailClientType>('gmail');
  const [accountEmail, setAccountEmail] = useState('');
  const [rememberChoice, setRememberChoice] = useState(true);
  const [showAccountInput, setShowAccountInput] = useState(false);

  useEffect(() => {
    if (isChooserOpen) {
      if (emailPreference !== 'ask') {
        setSelectedClient(emailPreference);
      } else {
        setSelectedClient('gmail');
      }

      if (gmailAccount) {
        setAccountEmail(gmailAccount);
        setShowAccountInput(true);
      } else if (user?.email && user.email.includes('@')) {
        setAccountEmail(user.email);
      } else {
        setAccountEmail('');
      }
      setRememberChoice(true);
    }
  }, [isChooserOpen, emailPreference, gmailAccount, user]);

  if (!isChooserOpen) return null;

  const handleConfirm = async (clientType: EmailClientType) => {
    const prefToSave = rememberChoice ? clientType : 'ask';
    const accToSave = clientType === 'gmail' && accountEmail.trim() ? accountEmail.trim() : '';

    if (rememberChoice) {
      await setEmailPreference(prefToSave, accToSave);
    }

    if (pendingPayload) {
      if (clientType === 'gmail') {
        const to = encodeURIComponent(pendingPayload.to.trim());
        const subject = encodeURIComponent(pendingPayload.subject || '');
        const body = encodeURIComponent(pendingPayload.body || '');
        let url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
        if (accToSave) {
          url += `&authuser=${encodeURIComponent(accToSave)}`;
        }
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win) window.location.href = url;
      } else {
        const to = encodeURIComponent(pendingPayload.to.trim());
        const subject = encodeURIComponent(pendingPayload.subject || '');
        const body = encodeURIComponent(pendingPayload.body || '');
        const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
        
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }

    closeChooser();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
      onClick={closeChooser}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-200 cursor-default animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B3A5C]/10 text-[#1B3A5C] flex items-center justify-center shrink-0">
              <Mail size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Choose Email Client
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {pendingPayload ? 'Select how to open your message' : 'Configure your default email application'}
              </p>
            </div>
          </div>
          <button 
            onClick={closeChooser} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {pendingPayload && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-0.5">
                <span>To:</span>
                <span className="text-[#1B3A5C] truncate font-mono">{pendingPayload.to}</span>
              </div>
              {pendingPayload.subject && (
                <div className="truncate text-slate-500 font-medium">
                  <strong className="text-slate-700">Subject:</strong> {pendingPayload.subject}
                </div>
              )}
            </div>
          )}

          {/* Option 1: Gmail (Google Workspace) */}
          <div 
            onClick={() => setSelectedClient('gmail')}
            className={`border rounded-2xl p-4 transition-all cursor-pointer flex flex-col gap-3 relative ${
              selectedClient === 'gmail' 
                ? 'border-[#1B3A5C] bg-blue-50/40 shadow-xs ring-1 ring-[#1B3A5C]' 
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900">Gmail / Google Workspace</h4>
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                      Web Browser
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Opens composer directly in Gmail with recipient, subject, and text pre-filled.
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                selectedClient === 'gmail' 
                  ? 'border-[#1B3A5C] bg-[#1B3A5C] text-white' 
                  : 'border-slate-300 bg-white'
              }`}>
                {selectedClient === 'gmail' && <Check size={12} className="stroke-[3]" />}
              </div>
            </div>

            {/* Optional Gmail Account Input */}
            {selectedClient === 'gmail' && (
              <div className="pt-2 border-t border-blue-100/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Google Account (Optional)
                  </label>
                  {!showAccountInput && !accountEmail && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAccountInput(true);
                      }}
                      className="text-[10px] font-bold text-[#1B3A5C] hover:underline"
                    >
                      + Specify email address
                    </button>
                  )}
                </div>
                {(showAccountInput || accountEmail) && (
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="e.g. paulmuner@gmail.com"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1B3A5C]"
                  />
                )}
              </div>
            )}
          </div>

          {/* Option 2: Native Mail App */}
          <div 
            onClick={() => setSelectedClient('native')}
            className={`border rounded-2xl p-4 transition-all cursor-pointer flex items-start justify-between gap-3 ${
              selectedClient === 'native' 
                ? 'border-[#1B3A5C] bg-blue-50/40 shadow-xs ring-1 ring-[#1B3A5C]' 
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                <Mail size={20} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-slate-900">Default Mail App</h4>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    Native / mailto
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Opens Apple Mail, Microsoft Outlook, Windows Mail, or your phone's default email client.
                </p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
              selectedClient === 'native' 
                ? 'border-[#1B3A5C] bg-[#1B3A5C] text-white' 
                : 'border-slate-300 bg-white'
            }`}>
              {selectedClient === 'native' && <Check size={12} className="stroke-[3]" />}
            </div>
          </div>

          {/* Remember Choice Checkbox */}
          <label className="flex items-center gap-2.5 pt-1 px-1 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded text-[#1B3A5C] border-slate-300 focus:ring-[#1B3A5C] cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              Remember my preference and keep using this client automatically
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
          <button
            onClick={closeChooser}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          
          <button
            onClick={() => handleConfirm(selectedClient)}
            className="px-5 py-2.5 bg-[#1B3A5C] hover:bg-[#11253C] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span>{pendingPayload ? (selectedClient === 'gmail' ? 'Open in Gmail' : 'Open in Mail App') : 'Save Preference'}</span>
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
