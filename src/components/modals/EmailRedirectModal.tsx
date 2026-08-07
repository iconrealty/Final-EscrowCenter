import React, { useState, useEffect } from 'react';
import { X, Mail, Copy, Check, ExternalLink, ChevronDown, UserCheck } from 'lucide-react';

interface EmailRedirectModalProps {
  email: string;
  recipientName?: string;
  subject?: string;
  body?: string;
  onClose: () => void;
}

// Crisp Vector Logos
const GmailLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M20.25 4.5H18v9.75l3.75-2.812A1.5 1.5 0 0 0 22.5 10.2V6.75a2.25 2.25 0 0 0-2.25-2.25Z" />
    <path fill="#34A853" d="M3.75 4.5H6v9.75L2.25 11.438A1.5 1.5 0 0 1 1.5 10.2V6.75A2.25 2.25 0 0 1 3.75 4.5Z" />
    <path fill="#FBBC04" d="M18 14.25v5.25a1.5 1.5 0 0 1-1.5 1.5H15v-6.75l3 2.25Z" />
    <path fill="#EA4335" d="M6 14.25v5.25a1.5 1.5 0 0 0 1.5 1.5H9v-6.75l-3 2.25Z" />
    <path fill="#EA4335" d="M12 13.5 18 9V4.5l-6 4.5-6-4.5V9l6 4.5Z" />
  </svg>
);

const OutlookLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#0078D4" d="M1 17.5V6.5L11 2v20L1 17.5z" />
    <path fill="#0078D4" opacity="0.85" d="M11 4.5l12 2.5v10l-12 2.5V4.5z" />
    <path fill="#FFFFFF" d="M6 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm0 1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
  </svg>
);

const YahooLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <rect width="24" height="24" rx="5" fill="#6001D2" />
    <path fill="#FFFFFF" d="M6.5 6.5l3.8 5.7v5.3h2.4v-5.3l3.8-5.7h-2.6l-2.4 3.9-2.4-3.9H6.5z" />
  </svg>
);

const AppleMailLogo = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <rect width="24" height="24" rx="5" fill="#007AFF" />
    <path fill="#FFFFFF" d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9z" opacity="0.3" />
    <path stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" d="M4.5 7.5l7.5 5.5 7.5-5.5M4.5 16.5h15V7.5L12 13 4.5 7.5V16.5z" />
  </svg>
);

export function EmailRedirectModal({
  email,
  recipientName,
  subject = '',
  body = '',
  onClose
}: EmailRedirectModalProps) {
  const [copied, setCopied] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [showGmailAccounts, setShowGmailAccounts] = useState(false);
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

  const getGmailComposeUrl = (accountType: 'default' | 'choose' | 'account1' | 'account2') => {
    const encodedEmail = encodeURIComponent(email);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    
    const baseCompose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}${subject ? `&su=${encodedSubject}` : ''}${body ? `&body=${encodedBody}` : ''}`;

    if (accountType === 'choose') {
      // Google Account Chooser URL - prompts the user to select which Google account to use
      return `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(baseCompose)}`;
    } else if (accountType === 'account1') {
      return `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodedEmail}${subject ? `&su=${encodedSubject}` : ''}${body ? `&body=${encodedBody}` : ''}`;
    } else if (accountType === 'account2') {
      return `https://mail.google.com/mail/u/1/?view=cm&fs=1&to=${encodedEmail}${subject ? `&su=${encodedSubject}` : ''}${body ? `&body=${encodedBody}` : ''}`;
    }
    
    return baseCompose;
  };

  const handleOpenService = (serviceKey: 'gmail' | 'outlook' | 'yahoo' | 'mailto', gmailAccountType: 'default' | 'choose' | 'account1' | 'account2' = 'default') => {
    if (rememberChoice) {
      localStorage.setItem('preferredEmailService', serviceKey);
    }

    const encodedEmail = encodeURIComponent(email);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    let url = '';

    switch (serviceKey) {
      case 'gmail':
        url = getGmailComposeUrl(gmailAccountType);
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
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'email-redirect-overlay') {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm font-bold text-slate-900">
              Select Email Service
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {recipientName ? `${recipientName} (${email})` : email}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Options */}
        <div className="p-4 space-y-2">
          {/* Gmail Block with Account Switcher */}
          <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden transition-all">
            <div className="flex items-center justify-between p-2.5 hover:bg-slate-50">
              <button
                type="button"
                onClick={() => handleOpenService('gmail', 'default')}
                className="flex items-center gap-3 flex-1 text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100/80 flex items-center justify-center shrink-0">
                  <GmailLogo />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    Gmail
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Opens web compose
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShowGmailAccounts(!showGmailAccounts)}
                className="px-2 py-1 text-[11px] font-bold text-[#1B3A5C] bg-blue-50 hover:bg-blue-100 border border-blue-200/70 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-2"
                title="Choose Google Account"
              >
                <span>Select Account</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${showGmailAccounts ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Expandable Gmail Account Chooser Sub-menu */}
            {showGmailAccounts && (
              <div className="bg-slate-50 border-t border-slate-100 p-2 space-y-1 text-xs">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Which Google account to use?
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenService('gmail', 'choose')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 font-medium text-slate-800 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck size={13} className="text-blue-600" />
                    <span>Choose Account (Google Prompt)</span>
                  </div>
                  <ExternalLink size={12} className="text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenService('gmail', 'account1')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-700 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>Primary Account (#1)</span>
                  <span className="text-[10px] text-slate-400 font-mono">u/0</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenService('gmail', 'account2')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-700 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>Secondary / Work Account (#2)</span>
                  <span className="text-[10px] text-slate-400 font-mono">u/1</span>
                </button>
              </div>
            )}
          </div>

          {/* Outlook */}
          <button
            type="button"
            onClick={() => handleOpenService('outlook')}
            className="w-full p-2.5 rounded-xl border border-slate-200/90 hover:bg-slate-50 flex items-center justify-between transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100/80 flex items-center justify-center shrink-0">
                <OutlookLogo />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Outlook Web
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Office 365 / Outlook.com
                </span>
              </div>
            </div>
            <ExternalLink size={14} className="text-slate-400" />
          </button>

          {/* Yahoo */}
          <button
            type="button"
            onClick={() => handleOpenService('yahoo')}
            className="w-full p-2.5 rounded-xl border border-slate-200/90 hover:bg-slate-50 flex items-center justify-between transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100/80 flex items-center justify-center shrink-0">
                <YahooLogo />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Yahoo Mail
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Yahoo Webmail
                </span>
              </div>
            </div>
            <ExternalLink size={14} className="text-slate-400" />
          </button>

          {/* System Default Mail App */}
          <button
            type="button"
            onClick={() => handleOpenService('mailto')}
            className="w-full p-2.5 rounded-xl border border-slate-200/90 hover:bg-slate-50 flex items-center justify-between transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100/80 flex items-center justify-center shrink-0">
                <AppleMailLogo />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  Default Mail App
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Apple Mail, Outlook desktop, or system app
                </span>
              </div>
            </div>
            <ExternalLink size={14} className="text-slate-400" />
          </button>

          {/* Copy Email Action */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600 stroke-[2.5]" />
                  <span className="text-emerald-700">Email Address Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="stroke-[2.2]" />
                  <span>Copy Address ({email})</span>
                </>
              )}
            </button>
          </div>

          {/* Remember Preference */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#1B3A5C] focus:ring-[#1B3A5C] border-slate-300 cursor-pointer"
              />
              <span>Remember selection</span>
            </label>

            {savedPreference && (
              <button
                type="button"
                onClick={handleClearPreference}
                className="text-slate-400 hover:text-slate-700 underline font-medium cursor-pointer"
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
