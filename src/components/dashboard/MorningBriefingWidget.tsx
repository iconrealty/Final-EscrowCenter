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
  onOpenWishModal: (escrow: Escrow, yearsCount: number, dateFormatted: string, wishType?: 'anniversary' | 'birthday') => void;
}

interface BriefingItem {
  id: string;
  escrow: Escrow;
  type: 'anniversary' | 'birthday';
  title: string;
  subtitle: string;
  yearsCount: number;
  dateFormatted: string;
  daysSinceEvent: number; // 0 = today, > 0 = days passed since event
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

  // Gather active anniversaries and client birthdays that are due/pending
  const upcomingBriefingItems = useMemo(() => {
    const list: BriefingItem[] = [];
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Process Closing Anniversaries
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

        const thisYearAnniv = new Date(currentYear, coeMonth, coeDay);
        const yearsCount = currentYear - coeYear;

        if (yearsCount < 1) return;

        const diffMs = todayStart.getTime() - thisYearAnniv.getTime();
        const daysSinceEvent = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (daysSinceEvent < 0 || daysSinceEvent > 30) return;

        const dateStr = format(thisYearAnniv, 'yyyy-MM-dd');
        const hasResponded = escrow.anniversaryInteractions?.some(
          (item) => item.date === dateStr || item.yearCount === yearsCount || (item.date && item.date.startsWith(currentYear.toString()))
        ) || false;

        if (hasResponded) return;

        const dateFormatted = format(thisYearAnniv, 'MMM d');
        const clientName = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || 'Valued Client';

        list.push({
          id: `anniv-${escrow.id}`,
          escrow,
          type: 'anniversary',
          title: clientName,
          subtitle: escrow.address || '',
          yearsCount,
          dateFormatted,
          daysSinceEvent,
          isToday: daysSinceEvent === 0,
        });
      });

    // 2. Process Client Birthdays
    escrows.forEach((escrow) => {
      const checkBirthday = (bdayStr?: string, isClient2 = false) => {
        if (!bdayStr || !bdayStr.trim()) return;
        let bMonth: number, bDay: number;
        const str = bdayStr.trim();
        if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
          const [m, d] = str.split('/');
          bMonth = Number(m) - 1;
          bDay = Number(d);
        } else {
          const parts = str.split('T')[0].split('-');
          if (parts.length >= 3) {
            bMonth = Number(parts[1]) - 1;
            bDay = Number(parts[2]);
          } else return;
        }

        if (isNaN(bMonth) || isNaN(bDay)) return;

        const thisYearBday = new Date(currentYear, bMonth, bDay);
        const diffMs = todayStart.getTime() - thisYearBday.getTime();
        const daysSinceEvent = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (daysSinceEvent < 0 || daysSinceEvent > 30) return;

        const dateStr = format(thisYearBday, 'yyyy-MM-dd');
        const hasResponded = escrow.anniversaryInteractions?.some(
          (item) => item.date === dateStr || (item.notes && item.notes.toLowerCase().includes('birthday'))
        );

        if (hasResponded) return;

        const dateFormatted = format(thisYearBday, 'MMM d');
        const name = isClient2
          ? `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim()
          : `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim();

        list.push({
          id: `bday-${escrow.id}-${isClient2 ? '2' : '1'}`,
          escrow,
          type: 'birthday',
          title: `${name || 'Client'} (Birthday)`,
          subtitle: escrow.address || 'Client',
          yearsCount: 0,
          dateFormatted,
          daysSinceEvent,
          isToday: daysSinceEvent === 0,
        });
      };

      checkBirthday(escrow.clientBirthday, false);
      checkBirthday(escrow.client2Birthday, true);
    });

    list.sort((a, b) => a.daysSinceEvent - b.daysSinceEvent);
    return list;
  }, [escrows, currentYear, now]);

  if (upcomingBriefingItems.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-sm text-[#1B3A5C] uppercase tracking-wider">
              Anniversaries & Birthdays
            </h2>
            <span className="text-xs text-slate-400">• {todayFormatted}</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            You&apos;re all caught up! No home closing anniversaries or client birthdays due today.
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
              Anniversaries & Birthdays
            </h2>
            <span className="bg-slate-200/80 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
              {todayFormatted}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {upcomingBriefingItems.length} Client {upcomingBriefingItems.length === 1 ? 'Anniversary or Birthday' : 'Anniversaries & Birthdays'}
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
            {upcomingBriefingItems.map(({ id, escrow, type, title, subtitle, yearsCount, dateFormatted, daysSinceEvent, isToday }) => {
              const phone = escrow.clientPhone || escrow.client2Phone;

              return (
                <div
                  key={id}
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
                            {daysSinceEvent} Day{daysSinceEvent > 1 ? 's' : ''} Pending ({dateFormatted})
                          </span>
                        )}
                        {type === 'birthday' ? (
                          <span className="text-xs font-extrabold text-amber-600 flex items-center gap-1">
                            <span>Client Birthday</span>
                          </span>
                        ) : (
                          <span className="text-xs font-extrabold text-[#059669]">
                            {yearsCount} Year{yearsCount > 1 ? 's' : ''} Anniversary
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-slate-900">{title}</h4>
                    <p 
                      className="text-xs font-medium text-[#1B3A5C] hover:underline cursor-pointer mt-0.5"
                      onClick={() => onSelectEscrow(escrow)}
                    >
                      {subtitle}
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
                      onClick={() => onOpenWishModal(escrow, yearsCount, dateFormatted, type)}
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
