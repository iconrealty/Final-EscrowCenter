import React from 'react';
import { Phone, MessageSquare, Mail, User } from 'lucide-react';

export interface ContactFastBarProps {
  role: string;
  title: string;
  subTitle?: string;
  phone?: string;
  email?: string;
  avatarBg?: string;
  icon?: React.ReactNode;
  subject?: string;
  onEdit?: () => void;
}

export function ContactFastBar({
  role,
  title,
  subTitle,
  phone,
  email,
  avatarBg,
  icon,
  subject,
  onEdit,
}: ContactFastBarProps) {
  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, '') : '';
  const hasPhone = !!cleanPhone;
  const hasEmail = !!email;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="px-3 py-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-xl shadow-2xs transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Identity & Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${avatarBg || 'bg-[#1B3A5C]'} border border-black/10 flex items-center justify-center text-white shrink-0 font-bold text-xs shadow-xs`}>
            {icon || (title ? title.charAt(0).toUpperCase() : <User size={13} />)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-600 uppercase tracking-wider leading-none">
                {role}
              </span>
              {subTitle && (
                <span className="text-[10px] text-slate-500 font-medium truncate" title={subTitle}>
                  • {subTitle}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5" title={title}>
              {title}
            </div>
          </div>
        </div>

        {/* Fast Action Buttons: Call (Soft Green), Text (Blue), Email (Red) in Circular Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Call Action - Soft Green Circle */}
          {hasPhone ? (
            <a
              href={`tel:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-emerald-600/40"
              title={`Call ${role}: ${phone}`}
              aria-label={`Call ${role}`}
            >
              <Phone size={13} className="text-white" />
            </a>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-300/80"
              title={`No phone recorded for ${role}. Click to edit.`}
              aria-label="No phone number"
            >
              <Phone size={13} />
            </button>
          )}

          {/* Text / SMS Action - Blue Circle */}
          {hasPhone ? (
            <a
              href={`sms:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-blue-700/60"
              title={`Text ${role}: ${phone}`}
              aria-label={`Text ${role}`}
            >
              <MessageSquare size={13} className="text-white" />
            </a>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-300/80"
              title={`No phone recorded for ${role}. Click to edit.`}
              aria-label="No phone number"
            >
              <MessageSquare size={13} />
            </button>
          )}

          {/* Email Action - Red Circle */}
          {hasEmail ? (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(subject || 'Inquiry')}`}
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer border border-red-700/60"
              title={`Email ${role}: ${email}`}
              aria-label={`Email ${role}`}
            >
              <Mail size={13} className="text-white" />
            </a>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-300/80"
              title={`No email recorded for ${role}. Click to edit.`}
              aria-label="No email address"
            >
              <Mail size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
