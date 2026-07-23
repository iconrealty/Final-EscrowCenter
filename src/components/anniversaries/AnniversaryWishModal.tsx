import React, { useState, useEffect, useRef } from 'react';
import { Escrow, AnniversaryInteraction } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Phone, MessageSquare, Mail, UserCheck, Gift, Calendar, CheckCircle2 } from 'lucide-react';

interface AnniversaryWishModalProps {
  escrow: Escrow;
  yearsCount: number;
  anniversaryDateFormatted: string;
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

export function AnniversaryWishModal({
  escrow,
  yearsCount,
  anniversaryDateFormatted,
  onClose,
  onUpdateEscrow,
}: AnniversaryWishModalProps) {
  const { success: showSuccess } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [templateType, setTemplateType] = useState<'sms' | 'email'>('sms');

  // Master templates state
  const [templates, setTemplates] = useState<TemplateConfig[]>(() => {
    const saved = localStorage.getItem('anniversary_custom_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return DEFAULT_ANNIVERSARY_TEMPLATES.map(t => {
          const custom = parsed.find((p: any) => p.id === t.id);
          return custom ? { ...t, text: custom.text, subject: custom.subject || t.subject } : t;
        });
      } catch (e) {
        return DEFAULT_ANNIVERSARY_TEMPLATES;
      }
    }
    return DEFAULT_ANNIVERSARY_TEMPLATES;
  });

  // Master Edit Mode State
  const [isEditingMaster, setIsEditingMaster] = useState(false);
  const [masterText, setMasterText] = useState('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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
          if (data && Array.isArray(data.anniversaryTemplates)) {
            const cloudTemplates = data.anniversaryTemplates;
            setTemplates(DEFAULT_ANNIVERSARY_TEMPLATES.map(t => {
              const custom = cloudTemplates.find((p: any) => p.id === t.id);
              return custom ? { ...t, text: custom.text, subject: custom.subject || t.subject } : t;
            }));
          }
        }
      } catch (err) {
        console.error("Error loading anniversary templates from Firestore:", err);
      }
    };

    loadCloudTemplates();
  }, [user]);

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

  const activeTemplate = templates.find(t => t.id === templateType) || templates[0];

  // Update client message or master text when template type changes or master edit mode toggles
  useEffect(() => {
    if (activeTemplate) {
      setMessage(populateTemplate(activeTemplate.text));
      setMasterText(activeTemplate.text);
    }
  }, [templateType, templates, escrow, yearsCount, anniversaryDateFormatted]);

  const handleTemplateChange = (type: 'sms' | 'email') => {
    setTemplateType(type);
    setIsEditingMaster(false);
  };

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
        notes: customNotes || `Sent ${method} anniversary wish to client.`,
        method: method,
        createdAt: new Date().toISOString()
      };
      onUpdateEscrow(escrow.id, {
        anniversaryInteractions: [newInteraction, ...(escrow.anniversaryInteractions || [])]
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    logQuickContact(templateType === 'sms' ? 'Text' : 'Email');
    showSuccess('Copied to clipboard & marked as responded!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleEmailLaunch = () => {
    if (!escrow.clientEmail) return;
    logQuickContact('Email');
    const subject = encodeURIComponent(`Happy ${anniversaryTitle}! 🏠🎉`);
    const body = encodeURIComponent(message.replace(/Subject:.*\n\n/, ''));
    window.location.href = `mailto:${escrow.clientEmail}?subject=${subject}&body=${body}`;
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

  const handleSaveMaster = async () => {
    const updated = templates.map(t => {
      if (t.id === templateType) {
        return { ...t, text: masterText };
      }
      return t;
    });

    setTemplates(updated);
    localStorage.setItem('anniversary_custom_templates', JSON.stringify(updated));

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, { anniversaryTemplates: updated }, { merge: true });
      } catch (e) {
        console.error("Error saving anniversary templates to Firestore:", e);
      }
    }

    setMessage(populateTemplate(masterText));
    setIsEditingMaster(false);
    showSuccess(`Master ${templateType.toUpperCase()} template saved successfully!`);
  };

  const handleResetDefault = () => {
    const defaultT = DEFAULT_ANNIVERSARY_TEMPLATES.find(t => t.id === templateType);
    if (defaultT) {
      setMasterText(defaultT.text);
    }
  };

  const insertPlaceholder = (tag: string) => {
    if (!textAreaRef.current) return;
    const el = textAreaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = masterText.substring(0, start) + tag + masterText.substring(end);
    setMasterText(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
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

  const placeholders = [
    { label: 'Client First Name', tag: '[ClientFirstName]' },
    { label: 'Full Client Name', tag: '[ClientName]' },
    { label: 'Address', tag: '[Address]' },
    { label: 'Years Ordinal (e.g. 1st)', tag: '[YearsOrdinal]' },
    { label: 'Years Text (e.g. 1 year)', tag: '[YearsText]' },
    { label: 'Anniversary Date', tag: '[AnniversaryDate]' },
    { label: 'Agent Name', tag: '[AgentName]' },
  ];

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
            <h3 className="font-bold text-lg text-[#1d1d1f] tracking-tight">Send Anniversary Wish</h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              {clientName} • {yearsOrdinalVal} Anniversary ({anniversaryDateFormatted})
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
          {/* Format selector & Global Template edit button */}
          <div className="flex items-center justify-between gap-2">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <button
                onClick={() => handleTemplateChange('sms')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  templateType === 'sms'
                    ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Text / SMS
              </button>
              <button
                onClick={() => handleTemplateChange('email')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  templateType === 'email'
                    ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Email
              </button>
            </div>

            <button
              onClick={() => setIsEditingMaster(!isEditingMaster)}
              className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                isEditingMaster
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {isEditingMaster ? 'Cancel Customization' : 'Edit Global Template'}
            </button>
          </div>

          {/* Master Edit Mode View */}
          {isEditingMaster ? (
            <div className="flex flex-col gap-3 bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider">
                    Edit Global {templateType.toUpperCase()} Template
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Changes saved here will apply to all future anniversary wishes.
                  </p>
                </div>
                <button
                  onClick={handleResetDefault}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>

              {/* Placeholder tags */}
              <div>
                <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wider block mb-1.5">
                  Insert Placeholder Tags:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {placeholders.map(p => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => insertPlaceholder(p.tag)}
                      className="text-[11px] font-bold bg-white text-amber-900 border border-amber-200 hover:bg-amber-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                ref={textAreaRef}
                rows={6}
                value={masterText}
                onChange={(e) => setMasterText(e.target.value)}
                className="w-full text-xs sm:text-sm font-medium text-[#1d1d1f] bg-white border border-amber-300 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed resize-none transition-all"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsEditingMaster(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMaster}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Save Global Template
                </button>
              </div>
            </div>
          ) : (
            /* Standard Personalized Message View */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#86868b] uppercase tracking-wider">
                  Personalized Message
                </label>
                <span className="text-[11px] text-[#86868b]">Editable for this client</span>
              </div>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-xs sm:text-sm font-medium text-[#1d1d1f] bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] focus:bg-white leading-relaxed resize-none transition-all"
              />
            </div>
          )}

          {/* Recipient Details */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-[#1d1d1f]">Client Contact: </span>
              <span className="text-[#86868b]">
                {escrow.clientPhone || escrow.client2Phone || 'No phone'} {escrow.clientEmail ? `• ${escrow.clientEmail}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(escrow.clientPhone || escrow.client2Phone) && (
                <button
                  onClick={handleSmsLaunch}
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare size={13} />
                  <span>Send Text (SMS)</span>
                </button>
              )}
              {escrow.clientEmail && (
                <button
                  onClick={handleEmailLaunch}
                  className="text-xs font-bold text-[#1B3A5C] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Mail size={13} />
                  <span>Open Email App</span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION: Log Client Conversation & Notes */}
          <div className="border-t border-slate-200/80 pt-4 mt-1">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-extrabold text-xs text-[#1d1d1f] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} className="text-[#1B3A5C]" />
                  <span>Interaction Log & Call Notes</span>
                </h4>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  Record when you spoke with {escrow.clientFirstName || 'the client'} and add notes for future reference.
                </p>
              </div>

              {!isLoggingConversation && (
                <button
                  onClick={() => setIsLoggingConversation(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1B3A5C] text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  + Log Contact
                </button>
              )}
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
                {interactions.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[#86868b]">
                      <span className="font-bold text-[#1d1d1f] flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-[#059669]" />
                        <span>Contacted via {item.method} ({item.yearCount ? `${yearsOrdinalStr(item.yearCount)} Anniv.` : 'Anniversary'})</span>
                      </span>
                      <span className="text-[10px] font-semibold">{item.date}</span>
                    </div>
                    <p className="text-slate-700 font-medium pl-5 leading-relaxed">{item.notes}</p>
                  </div>
                ))}
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
          {templateType === 'sms' ? (
            <button
              onClick={handleSmsLaunch}
              className="bg-[#059669] hover:bg-[#047857] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare size={14} />
              <span>Send Text (SMS)</span>
            </button>
          ) : (
            <button
              onClick={handleEmailLaunch}
              className="bg-[#1B3A5C] hover:bg-[#11253C] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Mail size={14} />
              <span>Send Email</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
