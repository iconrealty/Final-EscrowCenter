import React, { useState, useMemo } from 'react';
import { 
  PartyPopper, 
  Search, 
  Clock, 
  Award, 
  Home, 
  Send, 
  ChevronRight,
  Gift,
  CheckCircle2,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { Escrow } from '../../types';
import { AnniversaryWishModal } from './AnniversaryWishModal';

interface AnniversaryTrackerProps {
  escrows: Escrow[];
  onSelectEscrow: (escrow: Escrow) => void;
  onUpdateEscrow?: (id: string, data: Partial<Escrow>) => void;
}

interface ProcessedAnniversary {
  id: string;
  escrow: Escrow;
  eventType: 'anniversary' | 'birthday';
  coeDateObj: Date;
  coeYear: number;
  coeMonth: number; // 0-11
  coeDay: number; // 1-31
  yearsThisYear: number;
  yearsAtNext: number;
  daysDiffThisYear: number;
  daysUntilNext: number;
  isToday: boolean;
  isPassedThisYear: boolean;
  isThisMonth: boolean;
  isWithin30Days: boolean;
  isMilestone: boolean;
  hasResponded: boolean;
  formattedAnniversaryDate: string;
  birthdayClientName?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function AnniversaryTracker({ escrows, onSelectEscrow, onUpdateEscrow }: AnniversaryTrackerProps) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'upcoming30' | 'thisMonth' | 'birthdays' | 'anniversaries' | 'byMonth' | 'milestones' | 'responded' | 'all'>('thisMonth');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [wishModalEscrow, setWishModalEscrow] = useState<{ escrow: Escrow; years: number; dateFormatted: string; wishType?: 'anniversary' | 'birthday' } | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Process and extract both closed escrow anniversaries AND client birthdays
  const processedAnniversaries: ProcessedAnniversary[] = useMemo(() => {
    const list: ProcessedAnniversary[] = [];
    const todayStart = new Date(currentYear, currentMonth, currentDay);

    // 1. Process Closing Anniversaries (Closed Escrows)
    const closedList = escrows.filter(e => e.status === 'Closed' && e.coeDate && e.coeDate.trim() !== '');

    closedList.forEach(escrow => {
      const parts = escrow.coeDate.split('-');
      let coeYear = parseInt(parts[0], 10);
      let coeMonth = parseInt(parts[1], 10) - 1; // 0-indexed
      let coeDay = parseInt(parts[2], 10);

      if (isNaN(coeYear) || isNaN(coeMonth) || isNaN(coeDay)) {
        const d = new Date(escrow.coeDate);
        coeYear = d.getFullYear();
        coeMonth = d.getMonth();
        coeDay = d.getDate();
      }

      if (isNaN(coeYear) || isNaN(coeMonth) || isNaN(coeDay)) return;

      const coeDateObj = new Date(coeYear, coeMonth, coeDay);
      const thisYearAnniversary = new Date(currentYear, coeMonth, coeDay);
      const diffMs = thisYearAnniversary.getTime() - todayStart.getTime();
      const daysDiffThisYear = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const yearsThisYear = Math.max(1, currentYear - coeYear);

      let nextAnniversaryDate = thisYearAnniversary;
      let daysUntilNext = daysDiffThisYear;
      let yearsAtNext = yearsThisYear;

      if (daysDiffThisYear < 0) {
        nextAnniversaryDate = new Date(currentYear + 1, coeMonth, coeDay);
        const nextDiffMs = nextAnniversaryDate.getTime() - todayStart.getTime();
        daysUntilNext = Math.round(nextDiffMs / (1000 * 60 * 60 * 24));
        yearsAtNext = yearsThisYear + 1;
      }

      const isToday = daysDiffThisYear === 0;
      const isPassedThisYear = daysDiffThisYear < 0;
      const isThisMonth = coeMonth === currentMonth;
      const isWithin30Days = daysDiffThisYear >= 0 && daysDiffThisYear <= 30;
      const isMilestone = yearsThisYear === 1 || yearsThisYear === 3 || yearsThisYear === 5 || yearsThisYear === 10 || (yearsThisYear > 0 && yearsThisYear % 5 === 0);

      const hasResponded = Boolean(
        escrow.anniversaryInteractions &&
        escrow.anniversaryInteractions.length > 0 &&
        escrow.anniversaryInteractions.some(i => 
          i.yearCount === yearsThisYear || 
          i.yearCount === yearsAtNext || 
          (i.date && i.date.startsWith(currentYear.toString()))
        )
      );

      const formattedAnniversaryDate = `${MONTH_NAMES[coeMonth]} ${coeDay}`;

      list.push({
        id: `anniv-${escrow.id}`,
        escrow,
        eventType: 'anniversary',
        coeDateObj,
        coeYear,
        coeMonth,
        coeDay,
        yearsThisYear,
        yearsAtNext,
        daysDiffThisYear,
        daysUntilNext,
        isToday,
        isPassedThisYear,
        isThisMonth,
        isWithin30Days,
        isMilestone,
        hasResponded,
        formattedAnniversaryDate,
      });
    });

    // 2. Process Client Birthdays (All Escrows)
    escrows.forEach(escrow => {
      const processBday = (bdayStr?: string, isClient2 = false) => {
        if (!bdayStr || !bdayStr.trim()) return;
        const str = bdayStr.trim();
        let bYear = currentYear;
        let bMonth = -1;
        let bDay = -1;

        if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
          const [m, d, y] = str.split('/');
          bMonth = parseInt(m, 10) - 1;
          bDay = parseInt(d, 10);
          bYear = parseInt(y, 10);
        } else {
          const parts = str.split('T')[0].split('-');
          if (parts.length >= 3) {
            bYear = parseInt(parts[0], 10);
            bMonth = parseInt(parts[1], 10) - 1;
            bDay = parseInt(parts[2], 10);
          }
        }

        if (isNaN(bMonth) || isNaN(bDay) || bMonth < 0 || bDay < 1) return;

        const thisYearBday = new Date(currentYear, bMonth, bDay);
        const diffMs = thisYearBday.getTime() - todayStart.getTime();
        const daysDiffThisYear = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let daysUntilNext = daysDiffThisYear;
        if (daysDiffThisYear < 0) {
          const nextBday = new Date(currentYear + 1, bMonth, bDay);
          const nextDiffMs = nextBday.getTime() - todayStart.getTime();
          daysUntilNext = Math.round(nextDiffMs / (1000 * 60 * 60 * 24));
        }

        const isToday = daysDiffThisYear === 0;
        const isPassedThisYear = daysDiffThisYear < 0;
        const isThisMonth = bMonth === currentMonth;
        const isWithin30Days = daysDiffThisYear >= 0 && daysDiffThisYear <= 30;

        const dateStr = `${currentYear}-${(bMonth + 1).toString().padStart(2, '0')}-${bDay.toString().padStart(2, '0')}`;
        const hasResponded = Boolean(
          escrow.anniversaryInteractions &&
          escrow.anniversaryInteractions.some(i => i.date === dateStr || (i.notes && i.notes.toLowerCase().includes('birthday')))
        );

        const formattedAnniversaryDate = `${MONTH_NAMES[bMonth]} ${bDay}`;
        const name = isClient2
          ? `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim()
          : `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim();

        list.push({
          id: `bday-${escrow.id}-${isClient2 ? '2' : '1'}`,
          escrow,
          eventType: 'birthday',
          coeDateObj: thisYearBday,
          coeYear: bYear,
          coeMonth: bMonth,
          coeDay: bDay,
          yearsThisYear: 0,
          yearsAtNext: 0,
          daysDiffThisYear,
          daysUntilNext,
          isToday,
          isPassedThisYear,
          isThisMonth,
          isWithin30Days,
          isMilestone: false,
          hasResponded,
          formattedAnniversaryDate,
          birthdayClientName: name || 'Valued Client',
        });
      };

      const sanitizeBday = (bday?: string, acceptance?: string, coe?: string) => {
        if (!bday || !bday.trim()) return undefined;
        const str = bday.trim();
        if (acceptance && str === acceptance.trim()) return undefined;
        if (coe && str === coe.trim()) return undefined;
        return str;
      };

      processBday(sanitizeBday(escrow.clientBirthday, escrow.acceptanceDate, escrow.coeDate), false);
      processBday(sanitizeBday(escrow.client2Birthday, escrow.acceptanceDate, escrow.coeDate), true);
    });

    return list;
  }, [escrows, currentYear, currentMonth, currentDay]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalClients = processedAnniversaries.length;
    const thisMonthCount = processedAnniversaries.filter(a => a.coeMonth === currentMonth).length;
    const upcoming30Count = processedAnniversaries.filter(a => a.isWithin30Days).length;
    const milestonesCount = processedAnniversaries.filter(a => a.isMilestone && a.isWithin30Days).length;
    const respondedCount = processedAnniversaries.filter(a => a.hasResponded).length;
    const birthdaysCount = processedAnniversaries.filter(a => a.eventType === 'birthday').length;

    return {
      totalClients,
      thisMonthCount,
      upcoming30Count,
      milestonesCount,
      respondedCount,
      birthdaysCount,
    };
  }, [processedAnniversaries, currentMonth]);

  // Filter and sort items based on selected mode & search
  const filteredList = useMemo(() => {
    let list = processedAnniversaries;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(item => {
        const clientName = `${item.escrow.clientFirstName || ''} ${item.escrow.clientLastName || ''} ${item.escrow.client2FirstName || ''} ${item.escrow.client2LastName || ''}`.toLowerCase();
        const address = (item.escrow.address || '').toLowerCase();
        const agent = (item.escrow.agentName || '').toLowerCase();
        return clientName.includes(q) || address.includes(q) || agent.includes(q);
      });
    }

    if (filterMode === 'upcoming30') {
      list = list.filter(item => item.isWithin30Days);
      return list.sort((a, b) => a.daysDiffThisYear - b.daysDiffThisYear);
    } else if (filterMode === 'thisMonth') {
      list = list.filter(item => item.coeMonth === currentMonth);
      return list.sort((a, b) => a.coeDay - b.coeDay);
    } else if (filterMode === 'birthdays') {
      list = list.filter(item => item.eventType === 'birthday');
      return list.sort((a, b) => a.daysUntilNext - b.daysUntilNext);
    } else if (filterMode === 'anniversaries') {
      list = list.filter(item => item.eventType === 'anniversary');
      return list.sort((a, b) => a.daysUntilNext - b.daysUntilNext);
    } else if (filterMode === 'byMonth') {
      list = list.filter(item => item.coeMonth === selectedMonth);
      return list.sort((a, b) => a.coeDay - b.coeDay);
    } else if (filterMode === 'milestones') {
      list = list.filter(item => item.isMilestone);
      return list.sort((a, b) => a.daysUntilNext - b.daysUntilNext);
    } else if (filterMode === 'responded') {
      list = list.filter(item => item.hasResponded);
      return list.sort((a, b) => a.daysUntilNext - b.daysUntilNext);
    }

    return list.sort((a, b) => a.daysUntilNext - b.daysUntilNext);
  }, [processedAnniversaries, filterMode, selectedMonth, search, currentMonth]);

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-5 pb-12">
      {/* Top Header Card in white theme matching app */}
      <div className="bg-white border border-[#e5e5ea] rounded-2xl p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] tracking-tight">
            Anniversaries
          </h2>
        </div>

        {/* Mini stat pills */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 sm:px-5 py-3 text-center min-w-[100px]">
            <p className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight leading-none">{stats.birthdaysCount}</p>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mt-1">Birthdays</p>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 sm:px-5 py-3 text-center min-w-[100px]">
            <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">{stats.thisMonthCount}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{MONTH_NAMES[currentMonth]}</p>
          </div>
          <div className="bg-[#059669]/10 border border-transparent rounded-xl px-4 sm:px-5 py-3 text-center min-w-[100px]">
            <p className="text-2xl sm:text-3xl font-black text-[#059669] tracking-tight leading-none">{stats.respondedCount}</p>
            <p className="text-[10px] font-bold text-[#059669] uppercase tracking-wider mt-1">Responded</p>
          </div>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="bg-white border border-[#e5e5ea] rounded-2xl p-3.5 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        {/* Mobile Dropdown Selector (visible on very small screens for quick clear selection) */}
        <div className="sm:hidden flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
            >
              <option value="thisMonth">This Month ({MONTH_NAMES[currentMonth]})</option>
              <option value="upcoming30">Next 30 Days ({stats.upcoming30Count})</option>
              <option value="birthdays">Birthdays ({stats.birthdaysCount})</option>
              <option value="anniversaries">Anniversaries</option>
              <option value="responded">Responded ({stats.respondedCount})</option>
              <option value="byMonth">By Month</option>
              <option value="milestones">Milestones</option>
              <option value="all">All ({stats.totalClients})</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">▼</div>
          </div>

          {filterMode === 'byMonth' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filter Pills - Horizontal Scrollable Row (Hidden on mobile dropdown or scrollable smoothly) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 max-w-full">
          <button
            onClick={() => setFilterMode('thisMonth')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterMode === 'thisMonth'
                ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setFilterMode('upcoming30')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterMode === 'upcoming30'
                ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Next 30 Days
          </button>
          <button
            onClick={() => setFilterMode('birthdays')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'birthdays'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>Birthdays ({stats.birthdaysCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('anniversaries')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterMode === 'anniversaries'
                ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Anniversaries
          </button>
          <button
            onClick={() => setFilterMode('responded')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'responded'
                ? 'bg-[#059669] text-white border-transparent shadow-sm'
                : 'bg-[#059669]/10 text-[#059669] border-transparent hover:bg-[#059669]/20'
            }`}
          >
            <span>Responded ({stats.respondedCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('byMonth')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterMode === 'byMonth'
                ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            By Month
          </button>
          <button
            onClick={() => setFilterMode('milestones')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterMode === 'milestones'
                ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Milestones
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterMode === 'all'
                ? 'bg-[#1B3A5C] text-white border-[#1B3A5C] shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All ({stats.totalClients})
          </button>
        </div>

        {/* Right side: Search & Month Selector (Desktop) */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {filterMode === 'byMonth' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="hidden sm:block bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-56 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search client or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
            />
          </div>
        </div>
      </div>

      {/* Main List Grid */}
      {filteredList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredList.map((item) => {
            const {
              id,
              escrow,
              eventType,
              yearsThisYear,
              daysDiffThisYear,
              daysUntilNext,
              isToday,
              isPassedThisYear,
              isThisMonth,
              isMilestone,
              hasResponded,
              formattedAnniversaryDate,
              coeYear,
              birthdayClientName,
            } = item;

            const isBirthday = eventType === 'birthday';

            const clientFullName = isBirthday
              ? (birthdayClientName || 'Valued Client')
              : (escrow.clientFirstName ? `${escrow.clientFirstName} ${escrow.clientLastName || ''}` : 'Valued Client');

            const secondClientName = !isBirthday && escrow.client2FirstName
              ? `${escrow.client2FirstName} ${escrow.client2LastName || ''}`
              : null;

            let relativeTimeText = '';
            if (isToday) {
              relativeTimeText = 'Today';
            } else if (daysDiffThisYear > 0) {
              relativeTimeText = daysDiffThisYear === 1 ? 'In 1 day' : `In ${daysDiffThisYear} days`;
            } else if (filterMode === 'thisMonth' || isThisMonth) {
              const passedDays = Math.abs(daysDiffThisYear);
              relativeTimeText = passedDays === 1 ? 'Passed 1 day ago' : `Passed ${passedDays} days ago`;
            } else {
              relativeTimeText = daysUntilNext === 1 ? 'In 1 day' : `In ${daysUntilNext} days`;
            }

            return (
              <div
                key={id}
                className={`bg-white border rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between transition-all duration-300 hover:shadow-lg relative overflow-hidden group ${
                  hasResponded
                    ? 'border-slate-200'
                    : isToday
                    ? 'border-amber-400 ring-2 ring-amber-400/30'
                    : 'border-[#e5e5ea]'
                }`}
              >
                {/* Top Badge Banner */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {hasResponded ? (
                    <span className="inline-flex items-center gap-1.5 bg-[#059669] text-white px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-sm">
                      <span>RESPONDED & LOGGED</span>
                    </span>
                  ) : isToday ? (
                    <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-sm animate-pulse">
                      <PartyPopper size={14} />
                      <span>{isBirthday ? 'TODAY IS THEIR BIRTHDAY!' : 'TODAY IS THE ANNIVERSARY!'}</span>
                    </span>
                  ) : isBirthday ? (
                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <span>Client Birthday</span>
                    </span>
                  ) : isPassedThisYear && (filterMode === 'thisMonth' || isThisMonth) ? (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <span>{getOrdinal(yearsThisYear)} Anniversary (Passed)</span>
                    </span>
                  ) : isMilestone ? (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <span>{getOrdinal(yearsThisYear)} Year Milestone</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                      <span>{getOrdinal(yearsThisYear)} Anniversary</span>
                    </span>
                  )}

                  <span className={`text-xs font-bold shrink-0 ${hasResponded ? 'text-[#059669] font-extrabold' : isPassedThisYear && (filterMode === 'thisMonth' || isThisMonth) ? 'text-slate-400' : 'text-slate-500'}`}>
                    {hasResponded ? 'Completed' : relativeTimeText}
                  </span>
                </div>

                {/* Client & Address Body */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-base text-[#1d1d1f] group-hover:text-[#1B3A5C] transition-colors line-clamp-1">
                        {clientFullName}
                      </h4>
                      {secondClientName && (
                        <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                          & {secondClientName}
                        </p>
                      )}
                    </div>

                    {escrow.representation && (
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${
                        escrow.representation === 'Seller'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : escrow.representation === 'Dual'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {escrow.representation}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-600 mt-2 flex items-center gap-1.5">
                    <Home size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{escrow.address}</span>
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    {isBirthday ? (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Birthday Date</p>
                          <p className="font-bold text-slate-700 mt-0.5">
                            {formattedAnniversaryDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</p>
                          <p className="font-bold text-slate-700 mt-0.5 truncate">
                            {escrow.clientPhone || escrow.client2Phone || 'N/A'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Closing</p>
                          <p className="font-bold text-slate-700 mt-0.5">
                            {formattedAnniversaryDate}, {coeYear}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase Price</p>
                          <p className="font-bold text-slate-700 mt-0.5">
                            {escrow.price ? `$${escrow.price.toLocaleString()}` : 'N/A'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Logged interaction preview */}
                  {escrow.anniversaryInteractions && escrow.anniversaryInteractions.length > 0 && (
                    <div className="mt-3 bg-[#059669]/10 border border-slate-200/80 rounded-xl p-2.5 text-xs shadow-xs">
                      <div className="overflow-hidden flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#059669]">
                          <span>Contacted ({escrow.anniversaryInteractions[0].date})</span>
                          <span className="text-[#059669] font-semibold">• {escrow.anniversaryInteractions[0].method}</span>
                        </div>
                        {onUpdateEscrow && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = (escrow.anniversaryInteractions || []).slice(1);
                              onUpdateEscrow(escrow.id, { anniversaryInteractions: updated });
                            }}
                            className="text-slate-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                            title="Remove log (revert status to uncompleted)"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-800 text-xs font-medium mt-0.5 line-clamp-2 leading-relaxed">
                        "{escrow.anniversaryInteractions[0].notes}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() =>
                      setWishModalEscrow({
                        escrow,
                        years: yearsThisYear,
                        dateFormatted: formattedAnniversaryDate,
                        wishType: eventType,
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                      hasResponded
                        ? 'bg-[#059669] hover:bg-[#047857] text-white'
                        : 'bg-[#1B3A5C] hover:bg-[#11253C] text-white'
                    }`}
                  >
                    {!hasResponded && <Send size={13} />}
                    <span>{hasResponded ? 'Responded (View/Log)' : 'Send Wish / Log Call'}</span>
                  </button>

                  <button
                    onClick={() => onSelectEscrow(escrow)}
                    className="flex items-center justify-center bg-slate-100 hover:bg-slate-200/80 text-slate-700 p-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="View Property Details"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#e5e5ea] rounded-2xl p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Gift size={28} />
          </div>
          <h3 className="text-lg font-bold text-[#1d1d1f]">No closing anniversaries found</h3>
          <p className="text-xs text-[#86868b] mt-1 max-w-md mx-auto leading-relaxed">
            {search
              ? 'No closed clients match your search query.'
              : 'There are no closed escrows matching this anniversary time filter. Make sure your closed escrows have Close of Escrow (COE) dates recorded.'}
          </p>
        </div>
      )}

      {/* Wish Modal */}
      {wishModalEscrow && (
        <AnniversaryWishModal
          escrow={wishModalEscrow.escrow}
          yearsCount={wishModalEscrow.years}
          anniversaryDateFormatted={wishModalEscrow.dateFormatted}
          wishType={wishModalEscrow.wishType}
          onClose={() => setWishModalEscrow(null)}
          onUpdateEscrow={onUpdateEscrow}
        />
      )}
    </div>
  );
}
