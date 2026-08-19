import React, { useState, useEffect } from 'react';
import { Escrow, AnniversaryInteraction } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Phone, MessageSquare, Mail, Trash2, RotateCcw } from 'lucide-react';

interface AnniversaryWishModalProps {
  escrow: Escrow;
  yearsCount: number;
  anniversaryDateFormatted: string;
  wishType?: 'anniversary' | 'birthday';
  onClose: () => void;
  onUpdateEscrow?: (id: string, data: Partial<Escrow>) => void;
}

interface TemplateConfig {
  id: 'sms' | 'email';
  label: string;
  subject?: string;
  text: string;
}

const DEFAULT_ANNIVERSARY_TEMPLATES: TemplateConfig[] = [
  {
    id: 'sms',
    label: 'Text / SMS',
    text: `Hi [ClientFirstName]! Happy [YearsOrdinal] Homeownership Anniversary! 🎉 Hard to believe it's been [YearsText] since you closed on [Address]. I hope you're loving your home! Wishing you all the best. - [AgentName]`
  },
  {
    id: 'email',
    label: 'Email',
    subject: `Happy [AnniversaryTitle]! 🏠🎉`,
    text: `Subject: Happy [AnniversaryTitle]! 🏠🎉\n\nDear [ClientName],\n\nHappy [YearsOrdinal] Homeownership Anniversary! I was just reflecting on when you closed on [Address] on [AnniversaryDate].\n\nIt has been a true pleasure working with you, and I hope your home has brought you incredible memories and comfort over the past [YearsText].\n\nIf you ever need home value updates, contractor recommendations, or have any real estate questions, please don't hesitate to reach out!\n\nWarmest regards,\n[AgentName]`
  }
];

const DEFAULT_BIRTHDAY_TEMPLATES: TemplateConfig[] = [
  {
    id: 'sms',
    label: 'Text / SMS',
    text: `Hi [ClientFirstName]! Happy Birthday! 🎂🎉 I hope you have an amazing day celebrating. Wishing you a fantastic year ahead filled with joy and happiness! - [AgentName]`
  },
  {
    id: 'email',
    label: 'Email',
    subject: `Happy Birthday, [ClientFirstName]! 🎂🎉`,
    text: `Subject: Happy Birthday, [ClientFirstName]! 🎂🎉\n\nDear [ClientName],\n\nWishing you a very Happy Birthday! 🎂🎉\n\nI hope your special day is filled with happiness, great food, and wonderful memories with family and friends.\n\nThank you for being such a valued client and friend. If you ever need anything at all, please don't hesitate to get in touch!\n\nWarmest regards,\n[AgentName]`
  }
];

export function AnniversaryWishModal({
  escrow,
  yearsCount,
  anniversaryDateFormatted,
  wishType = 'anniversary',
  onClose,
  onUpdateEscrow,
}: AnniversaryWishModalProps) {
  const isBirthday = wishType === 'birthday';
  const { success: showSuccess } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const defaultTemplates = isBirthday ? DEFAULT_BIRTHDAY_TEMPLATES : DEFAULT_ANNIVERSARY_TEMPLATES;
  const storageKey = isBirthday ? 'birthday_custom_templates' : 'anniversary_custom_templates';

  // Master templates state
  const [templates, setTemplates] = useState<TemplateConfig[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return defaultTemplates.map(t => {
          const custom = parsed.find((p: any) => p.id === t.id);
          return custom ? { ...t, text: custom.text, subject: custom.subject || t.subject } : t;
        });
      } catch (e) {
        return defaultTemplates;
      }
    }
    return defaultTemplates;
  });

  // Client message text state
  const [message, setMessage] = useState('');

  // Conversation Notes State
  const [isLoggingConversation, setIsLoggingConversation] = useState(false);
  const [contactMethod, setContactMethod] = useState<'Phone' | 'Text' | 'Email' | 'In Person' | 'Card/Gift'>('Phone');
  const [logNotes, setLogNotes] = useState('');

  // Load templates from Firestore if user is logged in
  useEffect(() => {
    if (!user) return;

    const loadCloudTemplates = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const cloudField = isBirthday ? 'birthdayTemplates' : 'anniversaryTemplates';
          if (data && Array.isArray(data[cloudField])) {
            const cloudTemplates = data[cloudField];
            setTemplates(defaultTemplates.map(t => {
              const custom = cloudTemplates.find((p: any) => p.id === t.id);
              return custom ? { ...t, text: custom.text, subject: custom.subject || t.subject } : t;
            }));
          }
        }
      } catch (err) {
        console.error("Error loading templates from Firestore:", err);
      }
    };

    loadCloudTemplates();
  }, [user, isBirthday]);

  const yearsOrdinalStr = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const clientName = escrow.clientFirstName 
    ? `${escrow.clientFirstName}${escrow.client2FirstName ? ` & ${escrow.client2FirstName}` : ''}`
    : 'Client';

  const agentName = escrow.agentName || 'Your Real Estate Advisor';
  const propertyAddress = escrow.address || 'your home';
  const yearsText = yearsCount === 1 ? '1 year' : `${yearsCount} years`;
  const yearsOrdinalVal = yearsOrdinalStr(yearsCount);
  const anniversaryTitle = `${yearsOrdinalVal} Homeownership Anniversary`;

  // Function to replace placeholders with client data
  const populateTemplate = (rawText: string) => {
    let text = rawText;
    text = text.replace(/\[ClientFirstName\]/g, escrow.clientFirstName || 'there');
    text = text.replace(/\[ClientLastName\]/g, escrow.clientLastName || '');
    text = text.replace(/\[ClientName\]/g, clientName);
    text = text.replace(/\[Address\]/g, propertyAddress);
    text = text.replace(/\[YearsOrdinal\]/g, yearsOrdinalVal);
    text = text.replace(/\[YearsText\]/g, yearsText);
    text = text.replace(/\[AnniversaryTitle\]/g, anniversaryTitle);
    text = text.replace(/\[AnniversaryDate\]/g, anniversaryDateFormatted);
    text = text.replace(/\[AgentName\]/g, agentName);
    return text;
  };

  const activeTemplate = templates.find(t => t.id === 'sms') || templates[0];
  const emailTemplate = templates.find(t => t.id === 'email') || templates[1] || templates[0];

  useEffect(() => {
    if (activeTemplate) {
      setMessage(populateTemplate(activeTemplate.text));
    }
  }, [templates, escrow, yearsCount, anniversaryDateFormatted]);

  const logQuickContact = (method: 'Text' | 'Email' | 'Phone' | 'In Person' | 'Card/Gift', customNotes?: string) => {
    if (!onUpdateEscrow) return;
    const existingLog = (escrow.anniversaryInteractions || []).some(
      i => i.yearCount === yearsCount || (i.date && i.date.startsWith(new Date().toISOString().split('T')[0]))
    );
    if (!existingLog) {
      const newInteraction: AnniversaryInteraction = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString().split('T')[0],
        yearCount: yearsCount,
        notes: customNotes || `Sent ${method} ${isBirthday ? 'birthday' : 'anniversary'} wish to client.`,
        method: method,
        createdAt: new Date().toISOString()
      };
      onUpdateEscrow(escrow.id, {
        anniversaryInteractions: [newInteraction, ...(escrow.anniversaryInteractions || [])]
      });
    }
  };

  const handleDeleteInteraction = (logId: string) => {
    if (!onUpdateEscrow) return;
    const updated = (escrow.anniversaryInteractions || []).filter(i => i.id !== logId);
    onUpdateEscrow(escrow.id, {
      anniversaryInteractions: updated
    });
    showSuccess('Log deleted — status reset to uncompleted');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    logQuickContact('Text');
    showSuccess('Copied to clipboard & marked as responded!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleEmailLaunch = () => {
    if (!escrow.clientEmail) return;
    logQuickContact('Email');
    const subjectText = isBirthday ? `Happy Birthday, ${clientName}!` : `Happy ${anniversaryTitle}! 🏠🎉`;
    const emailMsg = populateTemplate(emailTemplate.text);
    const cleanBody = emailMsg.replace(/Subject:.*\n\n/, '');
    window.location.href = `mailto:${escrow.clientEmail}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(cleanBody)}`;
  };

  const handleSmsLaunch = () => {
    const phone = escrow.clientPhone || escrow.client2Phone;
    logQuickContact('Text');
    navigator.clipboard.writeText(message);
    if (phone) {
      showSuccess('Opening SMS app & copied text to clipboard!');
      window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
    } else {
      showSuccess('Copied text to clipboard!');
    }
  };

  const handleSaveInteractionLog = () => {
    if (!logNotes.trim()) return;

    const newInteraction: AnniversaryInteraction = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString().split('T')[0],
      yearCount: yearsCount,
      notes: logNotes.trim(),
      method: contactMethod,
      createdAt: new Date().toISOString()
    };

    const updatedInteractions = [newInteraction, ...(escrow.anniversaryInteractions || [])];

    if (onUpdateEscrow) {
      onUpdateEscrow(escrow.id, {
        anniversaryInteractions: updatedInteractions
      });
    }

    setLogNotes('');
    setIsLoggingConversation(false);
    showSuccess('Conversation & notes logged successfully!');
  };

  const interactions = escrow.anniversaryInteractions || [];

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-[#e5e5ea] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - White background matching app style */}
        <div className="bg-white border-b border-[#e5e5ea] px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-lg text-[#1d1d1f] tracking-tight">
              {isBirthday ? 'Send Birthday Wish' : 'Send Anniversary Wish'}
            </h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              {clientName} • {isBirthday ? `Birthday (${anniversaryDateFormatted})` : `${yearsOrdinalVal} Anniversary (${anniversaryDateFormatted})`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-[#86868b] hover:text-[#1d1d1f] flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Area with Scroll */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 flex-1">
          {/* Recipient Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div>
              <span className="font-bold text-[#1d1d1f] block sm:inline">Client Contact: </span>
              <span className="text-[#86868b]">
                {escrow.clientPhone || escrow.client2Phone || 'No phone'} {escrow.clientEmail ? `• ${escrow.clientEmail}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(escrow.clientPhone || escrow.client2Phone) && (
                <>
                  <a
                    href={`tel:${escrow.clientPhone || escrow.client2Phone}`}
                    onClick={() => logQuickContact('Phone', 'Called client')}
                    title="Call Client"
                    className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 p-2.5 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center justify-center shadow-2xs"
                  >
                    <Phone size={16} />
                  </a>
                  <button
                    onClick={handleSmsLaunch}
                    title="Send Text (SMS)"
                    className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-2.5 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center justify-center shadow-2xs"
                  >
                    <MessageSquare size={16} />
                  </button>
                </>
              )}
              {escrow.clientEmail && (
                <button
                  onClick={handleEmailLaunch}
                  title="Open Email App"
                  className="text-xs font-bold text-[#1B3A5C] bg-sky-50 hover:bg-sky-100 border border-sky-200 p-2.5 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center justify-center shadow-2xs"
                >
                  <Mail size={16} />
                </button>
              )}
            </div>
          </div>

          {/* SECTION: Log Client Conversation & Notes */}
          <div className="border-t border-slate-200/80 pt-4 mt-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-extrabold text-xs text-[#1d1d1f] uppercase tracking-wider">
                  <span>Interaction Log & Call Notes</span>
                </h4>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  Record when you spoke with {escrow.clientFirstName || 'the client'} and add notes for future reference.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {interactions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateEscrow) {
                        onUpdateEscrow(escrow.id, { anniversaryInteractions: [] });
                        showSuccess('Status reset to uncompleted');
                      }
                    }}
                    className="px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                    title="Remove all logs and reset status to uncompleted"
                  >
                    <RotateCcw size={12} />
                    <span>Set Uncompleted</span>
                  </button>
                )}
                {!isLoggingConversation && (
                  <button
                    onClick={() => setIsLoggingConversation(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1B3A5C] text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    + Log Contact
                  </button>
                )}
              </div>
            </div>

            {/* Input Form for logging conversation */}
            {isLoggingConversation && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Contact Method
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['Phone', 'Text', 'Email', 'In Person', 'Card/Gift'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setContactMethod(method)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          contactMethod === method
                            ? 'bg-[#1B3A5C] text-white border-[#1B3A5C]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Conversation Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder={`e.g., Spoke on phone. Loved the ${yearsOrdinalVal} anniversary note! Planning to remodel kitchen this summer.`}
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    className="w-full text-xs font-medium text-[#1d1d1f] bg-white border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsLoggingConversation(false);
                      setLogNotes('');
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInteractionLog}
                    disabled={!logNotes.trim()}
                    className="bg-[#1B3A5C] hover:bg-[#11253C] disabled:opacity-50 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Save Log & Notes
                  </button>
                </div>
              </div>
            )}

            {/* Past Interactions List */}
            {interactions.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {interactions.map((item) => {
                  const isItemBday = isBirthday || (item.notes && item.notes.toLowerCase().includes('birthday'));
                  return (
                    <div key={item.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[#86868b]">
                        <span className="font-bold text-[#1d1d1f]">
                          <span>Contacted via {item.method} ({isItemBday ? 'Birthday' : item.yearCount ? `${yearsOrdinalStr(item.yearCount)} Anniv.` : 'Anniversary'})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold">{item.date}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteInteraction(item.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Delete log (revert status to uncompleted)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed">{item.notes}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              !isLoggingConversation && (
                <p className="text-xs text-slate-400 italic bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
                  No client conversation logged yet for this anniversary. Click "+ Log Contact" above when you speak with them!
                </p>
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/50 border-t border-[#e5e5ea] px-6 py-4 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-[#86868b] hover:text-[#1d1d1f] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              logQuickContact('Phone', 'Responded / Contacted client for anniversary');
              showSuccess('Marked anniversary as responded!');
            }}
            className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>Mark as Responded</span>
          </button>
          <button
            onClick={handleCopy}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {copied ? 'Copied & Marked!' : 'Copy Message'}
          </button>
          {(escrow.clientPhone || escrow.client2Phone) && (
            <>
              <a
                href={`tel:${escrow.clientPhone || escrow.client2Phone}`}
                onClick={() => logQuickContact('Phone', 'Called client')}
                title="Call Client"
                className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
              >
                <Phone size={16} />
              </a>
              <button
                onClick={handleSmsLaunch}
                title="Send Text (SMS)"
                className="bg-[#059669] hover:bg-[#047857] text-white p-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
              >
                <MessageSquare size={16} />
              </button>
            </>
          )}
          {escrow.clientEmail && (
            <button
              onClick={handleEmailLaunch}
              title="Send Email"
              className="bg-[#1B3A5C] hover:bg-[#11253C] text-white p-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center"
            >
              <Mail size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
