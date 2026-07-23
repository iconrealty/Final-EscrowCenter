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
  daysSinceAnniversary: number; // 0 = today, > 0 = days passed since anniversary
  isToday: boolean;
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

  // Gather active anniversaries that have reached or passed their anniversary date and remain unresponded
  const upcomingAnniversaries = useMemo(() => {
    const list: AnniversaryItem[] = [];
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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

        // Calculate this year's anniversary date
        const thisYearAnniv = new Date(currentYear, coeMonth, coeDay);
        const yearsCount = currentYear - coeYear;

        if (yearsCount < 1) return; // 1st anniversary hasn't arrived yet (closed this year)

        // Days elapsed since this year's anniversary date:
        // 0 = TODAY (on the exact day of the event)
        // > 0 = Anniversary date passed X days ago
        // < 0 = Anniversary date is in the FUTURE (e.g. Oct 5 is in +74 days)
        const diffMs = todayStart.getTime() - thisYearAnniv.getTime();
        const daysSinceAnniversary = Math.round(diffMs / (1000 * 60 * 60 * 24));

        // STRICT RULE 1: ONLY show starting ON the day of the event (daysSinceAnniversary >= 0).
        // DO NOT show future anniversaries (daysSinceAnniversary < 0).
        // Also cap at recent past anniversaries (within 30 days) so past years/months prior to feature adoption don't flood the briefing.
        if (daysSinceAnniversary < 0 || daysSinceAnniversary > 30) return;

        // STRICT RULE 2: Check if the agent has logged a response for this anniversary.
        const dateStr = format(thisYearAnniv, 'yyyy-MM-dd');
        const hasResponded = escrow.anniversaryInteractions?.some(
          (item) => item.date === dateStr || item.yearCount === yearsCount || (item.date && item.date.startsWith(currentYear.toString()))
        ) || false;

        // Once responded, remove it from the Daily Morning Briefing!
        if (hasResponded) return;

        const dateFormatted = format(thisYearAnniv, 'MMM d');

        list.push({
          escrow,
          yearsCount,
          dateFormatted,
          daysSinceAnniversary,
          isToday: daysSinceAnniversary === 0,
        });
      });

    // Sort: Today first (0), then closest pending days
    list.sort((a, b) => a.daysSinceAnniversary - b.daysSinceAnniversary);

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
            You&apos;re all caught up! No active home closing anniversaries due today.
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
            {upcomingAnniversaries.map(({ escrow, yearsCount, dateFormatted, daysSinceAnniversary, isToday }) => {
              const clientName = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim();
              const phone = escrow.clientPhone || escrow.client2Phone;

              return (
                <div
                  key={`anniv-${escrow.id}`}
                  className={`p-3.5 rounded-xl border transition-all bg-white flex flex-col justify-between ${
                    isToday
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
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                            {daysSinceAnniversary} Day{daysSinceAnniversary > 1 ? 's' : ''} Pending ({dateFormatted})
                          </span>
                        )}
                        <span className="text-xs font-extrabold text-[#059669]">
                          {yearsCount} Year{yearsCount > 1 ? 's' : ''} Anniversary
                        </span>
                      </div>
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
                      className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 bg-[#059669] hover:bg-[#047857] text-white"
                    >
                      <Send size={12} />
                      <span>Send Wish / Log Call</span>
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
