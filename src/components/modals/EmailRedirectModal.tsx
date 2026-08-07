import React, { useState, useEffect } from 'react';
import { X, Mail, Copy, Check, ExternalLink, Globe, ArrowRight, Settings } from 'lucide-react';

interface EmailRedirectModalProps {
  email: string;
  recipientName?: string;
  subject?: string;
  body?: string;
  onClose: () => void;
}

export function EmailRedirectModal({
  email,
  recipientName,
  subject = '',
  body = '',
  onClose
}: EmailRedirectModalProps) {
  const [copied, setCopied] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [savedPreference, setSavedPreference] = useState<string | null>(null);

  useEffect(() => {
    const pref = localStorage.getItem('preferredEmailService');
    if (pref) {
      setSavedPreference(pref);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenService = (serviceKey: 'gmail' | 'outlook' | 'yahoo' | 'mailto') => {
    if (rememberChoice) {
      localStorage.setItem('preferredEmailService', serviceKey);
    }

    let url = '';
    const encodedEmail = encodeURIComponent(email);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    switch (serviceKey) {
      case 'gmail':
        url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}${subject ? `&su=${encodedSubject}` : ''}${body ? `&body=${encodedBody}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'outlook':
        url = `https://outlook.office.com/mail/deeplink/compose?to=${encodedEmail}${subject ? `&subject=${encodedSubject}` : ''}${body ? `&body=${encodedBody}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'yahoo':
        url = `https://compose.mail.yahoo.com/?to=${encodedEmail}${subject ? `&subject=${encodedSubject}` : ''}${body ? `&body=${encodedBody}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'mailto':
        let queryParams = [];
        if (subject) queryParams.push(`subject=${encodedSubject}`);
        if (body) queryParams.push(`body=${encodedBody}`);
        url = `mailto:${email}${queryParams.length > 0 ? `?${queryParams.join('&')}` : ''}`;
        window.location.href = url;
        break;
    }

    onClose();
  };

  const handleClearPreference = () => {
    localStorage.removeItem('preferredEmailService');
    setSavedPreference(null);
  };

  return (
    <div 
      id="email-redirect-overlay"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'email-redirect-overlay') {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
              <Mail size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Send Email
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[220px] sm:max-w-[280px]">
                {recipientName ? `To: ${recipientName} (${email})` : email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 font-medium">
            Select which email provider or app you would like to open:
          </p>

          {/* Options List */}
          <div className="space-y-2">
            {/* Gmail */}
            <button
              onClick={() => handleOpenService('gmail')}
              className="w-full p-3 bg-red-50/50 hover:bg-red-50 border border-red-200/70 hover:border-red-300 rounded-xl flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-red-100 flex items-center justify-center shrink-0">
                  <span className="font-black text-red-600 text-sm">G</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                      Gmail Web
                    </span>
                    <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-1.5 py-0.2 rounded uppercase tracking-wider">
                      Recommended
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block">
                    Opens compose in Gmail (mail.google.com)
                  </span>
                </div>
              </div>
              <ExternalLink size={16} className="text-slate-400 group-hover:text-red-600 transition-colors shrink-0 ml-2" />
            </button>

            {/* Outlook Web */}
            <button
              onClick={() => handleOpenService('outlook')}
              className="w-full p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-200/70 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-blue-100 flex items-center justify-center shrink-0">
                  <span className="font-black text-blue-600 text-sm">O</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors block">
                    Outlook Web
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Opens compose in Outlook Web app
                  </span>
                </div>
              </div>
              <ExternalLink size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2" />
            </button>

            {/* Yahoo Web */}
            <button
              onClick={() => handleOpenService('yahoo')}
              className="w-full p-3 bg-purple-50/50 hover:bg-purple-50 border border-purple-200/70 hover:border-purple-300 rounded-xl flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-purple-100 flex items-center justify-center shrink-0">
                  <span className="font-black text-purple-600 text-sm">Y!</span>
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors block">
                    Yahoo Mail
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Opens compose in Yahoo webmail
                  </span>
                </div>
              </div>
              <ExternalLink size={16} className="text-slate-400 group-hover:text-purple-600 transition-colors shrink-0 ml-2" />
            </button>

            {/* Default Mail App */}
            <button
              onClick={() => handleOpenService('mailto')}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-slate-700" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-slate-800 transition-colors block">
                    Default Mail App
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Apple Mail, Outlook Desktop, or system handler
                  </span>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 ml-2" />
            </button>
          </div>

          {/* Copy Email Button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleCopy}
              className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-700">Email Address Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Email Address ({email})</span>
                </>
              )}
            </button>
          </div>

          {/* Remember Choice Checkbox */}
          <div className="pt-1 flex items-center justify-between text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="w-4 h-4 rounded text-[#1B3A5C] focus:ring-[#1B3A5C] border-slate-300 cursor-pointer"
              />
              <span className="font-medium text-slate-700">Remember my choice for future emails</span>
            </label>

            {savedPreference && (
              <button
                type="button"
                onClick={handleClearPreference}
                className="text-[11px] text-slate-400 hover:text-slate-700 underline font-medium cursor-pointer"
                title="Reset saved default email service"
              >
                Reset Default
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
