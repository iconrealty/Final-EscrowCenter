import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Send,
  Phone,
  MessageSquare
} from 'lucide-react';
import { Escrow } from '../../types';
import { format, parseISO } from 'date-fns';

interface MorningBriefingWidgetProps {
  escrows: Escrow[];
  onSelectEscrow: (escrow: Escrow) => void;
  onOpenWishModal: (escrow: Escrow, yearsCount: number, dateFormatted: string) => void;
}

interface AnniversaryItem {
  escrow: Escrow;
  yearsCount: number;
  dateFormatted: string;
  daysLeft: number; // 0 = today, > 0 = upcoming in X days
  isToday: boolean;
  hasResponded: boolean;
}

export function MorningBriefingWidget({
  escrows,
  onSelectEscrow,
  onOpenWishModal,
}: MorningBriefingWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayFormatted = format(now, 'EEEE, MMMM d, yyyy');

  // Gather anniversaries happening TODAY or within next 14 days
  const upcomingAnniversaries = useMemo(() => {
    const list: AnniversaryItem[] = [];

    escrows
      .filter((e) => e.status === 'Closed' && e.coeDate && e.coeDate.trim() !== '')
      .forEach((escrow) => {
        let coeDateObj: Date;
        const str = escrow.coeDate.trim();
        if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
          const [m, d, y] = str.split('/');
          coeDateObj = new Date(Number(y), Number(m) - 1, Number(d));
        } else {
          coeDateObj = parseISO(str);
        }

        if (isNaN(coeDateObj.getTime())) return;

        const coeMonth = coeDateObj.getMonth();
        const coeDay = coeDateObj.getDate();
        const coeYear = coeDateObj.getFullYear();

        // Calculate anniversary date for this year
        const thisYearAnniv = new Date(currentYear, coeMonth, coeDay);
        
        // Difference in calendar days from today
        const diffMs = thisYearAnniv.getTime() - new Date(currentYear, now.getMonth(), now.getDate()).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // We care about today and upcoming within 14 days
        if (diffDays >= 0 && diffDays <= 14) {
          const yearsCount = Math.max(1, currentYear - coeYear);
          
          // Check if responded
          const dateStr = format(thisYearAnniv, 'yyyy-MM-dd');
          const hasResponded = escrow.anniversaryInteractions?.some(
            (item) => item.date === dateStr || item.yearCount === yearsCount
          ) || false;

          // Only include pending (unresponded) anniversaries in the Daily Morning Briefing
          if (!hasResponded) {
            const dateFormatted = format(thisYearAnniv, 'MMM d');

            list.push({
              escrow,
              yearsCount,
              dateFormatted,
              daysLeft: diffDays,
              isToday: diffDays === 0,
              hasResponded,
            });
          }
        }
      });

    // Sort: Today first, then closest upcoming
    list.sort((a, b) => {
      if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
      return a.daysLeft - b.daysLeft;
    });

    return list;
  }, [escrows, currentYear, now]);

  if (upcomingAnniversaries.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-sm text-[#1B3A5C] uppercase tracking-wider">
              Daily Morning Briefing
            </h2>
            <span className="text-xs text-slate-400">• {todayFormatted}</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            You&apos;re all caught up! No upcoming home closing anniversaries in the next 14 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs mb-6 overflow-hidden transition-all">
      {/* Clean Header - Matching App Theme */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-extrabold text-sm text-[#1B3A5C] uppercase tracking-wider">
              Daily Morning Briefing
            </h2>
            <span className="bg-slate-200/80 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
              {todayFormatted}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {upcomingAnniversaries.length} Client Home Closing {upcomingAnniversaries.length === 1 ? 'Anniversary' : 'Anniversaries'}
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-slate-200/70 text-slate-600 rounded-xl transition-colors cursor-pointer"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Widget Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingAnniversaries.map(({ escrow, yearsCount, dateFormatted, daysLeft, isToday, hasResponded }) => {
              const clientName = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim();
              const phone = escrow.clientPhone || escrow.client2Phone;

              return (
                <div
                  key={`anniv-${escrow.id}`}
                  className={`p-3.5 rounded-xl border transition-all bg-white flex flex-col justify-between ${
                    hasResponded
                      ? 'border-slate-200 bg-slate-50/50 opacity-80'
                      : isToday
                      ? 'border-slate-200 bg-amber-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {isToday ? (
                          <span className="bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                            TODAY
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                            In {daysLeft} Days ({dateFormatted})
                          </span>
                        )}
                        <span className="text-xs font-extrabold text-[#059669]">
                          {yearsCount} Year{yearsCount > 1 ? 's' : ''} Anniversary
                        </span>
                      </div>

                      {hasResponded && (
                        <span className="bg-[#059669] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          RESPONDED & LOGGED
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-black text-slate-900">{clientName}</h4>
                    <p 
                      className="text-xs font-medium text-[#1B3A5C] hover:underline cursor-pointer mt-0.5"
                      onClick={() => onSelectEscrow(escrow)}
                    >
                      {escrow.address}
                    </p>
                  </div>

                  {/* Contact & Log Actions */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {phone ? (
                        <>
                          <a
                            href={`tel:${phone}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title={`Call ${phone}`}
                          >
                            <Phone size={13} />
                          </a>
                          <a
                            href={`sms:${phone}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title={`SMS ${phone}`}
                          >
                            <MessageSquare size={13} />
                          </a>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No phone listed</span>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenWishModal(escrow, yearsCount, dateFormatted)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                        hasResponded
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          : 'bg-[#059669] hover:bg-[#047857] text-white'
                      }`}
                    >
                      <Send size={12} />
                      <span>{hasResponded ? 'View Log' : 'Send Wish / Log Call'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
