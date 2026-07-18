import React, { useState } from 'react';
import { Escrow } from '../../types';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';

type CalendarViewType = 'month' | 'quarter' | 'year';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function CalendarView({ escrows, onSelectEscrow }: { escrows: Escrow[], onSelectEscrow: (escrow: Escrow) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewType>('year');

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'quarter') {
      setCurrentDate(addMonths(currentDate, 3));
    } else {
      setCurrentDate(addMonths(currentDate, 12));
    }
  };

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'quarter') {
      setCurrentDate(subMonths(currentDate, 3));
    } else {
      setCurrentDate(subMonths(currentDate, 12));
    }
  };

  const getEscrowsForMonth = (year: number, monthIndex: number) => {
    return escrows.filter(e => {
      if (!e.coeDate) return false;
      const date = parseISO(e.coeDate);
      return date.getFullYear() === year && date.getMonth() === monthIndex;
    });
  };

  // Month view helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Quarter view helpers
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const qIndex = Math.floor(currentMonth / 3); // 0 to 3
  const monthsInQuarter = [qIndex * 3, qIndex * 3 + 1, qIndex * 3 + 2];

  return (
    <div className="w-full bg-white rounded-3xl border border-[#e5e5ea] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col min-h-[500px]">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-8 py-4 sm:py-6 border-b border-[#e5e5ea] bg-white">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <h2 className="text-lg sm:text-2xl font-bold text-[#1d1d1f] tracking-tight min-w-[130px]">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
            {viewMode === 'quarter' && `Q${qIndex + 1} ${currentYear}`}
            {viewMode === 'year' && format(currentDate, 'yyyy')}
          </h2>
          
          {/* Mobile switcher */}
          <div className="sm:hidden">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {(['month', 'quarter', 'year'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all duration-150 ${
                    viewMode === mode
                      ? 'bg-white text-[#1B3A5C] shadow-sm'
                      : 'text-slate-500 hover:text-[#1B3A5C]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
          {/* Desktop switcher */}
          <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {(['month', 'quarter', 'year'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-150 ${
                  viewMode === mode
                    ? 'bg-white text-[#1B3A5C] shadow-sm'
                    : 'text-slate-500 hover:text-[#1B3A5C]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={prevPeriod} className="p-1.5 sm:p-2 rounded-full hover:bg-slate-50 text-[#1d1d1f] transition-all border border-transparent hover:border-slate-100 active:scale-95">
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold hover:bg-slate-50 text-[#1d1d1f] border border-[#e5e5ea] transition-all active:scale-95"
            >
              Today
            </button>
            <button onClick={nextPeriod} className="p-1.5 sm:p-2 rounded-full hover:bg-slate-50 text-[#1d1d1f] transition-all border border-transparent hover:border-slate-100 active:scale-95">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content body based on current View Mode */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
        {/* Month View */}
        {viewMode === 'month' && (
          <div className="flex flex-col h-full">
            <div className="grid grid-cols-7 border-b border-[#e5e5ea] bg-slate-50">
              {weekDays.map(day => (
                <div key={day} className="py-2.5 sm:py-3 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#86868b]">
                  <span className="hidden xs:inline">{day}</span>
                  <span className="xs:hidden">{day[0]}</span>
                </div>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-7 auto-rows-fr">
              {days.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                
                const dayEscrows = escrows.filter(e => {
                  if (!e.coeDate) return false;
                  return isSameDay(parseISO(e.coeDate), day);
                });

                return (
                  <div 
                    key={day.toString()} 
                    className={`min-h-[80px] sm:min-h-[110px] border-b border-r border-[#e5e5ea] p-1 sm:p-2 transition-colors overflow-y-auto ${
                      !isCurrentMonth ? 'bg-slate-50 text-[#86868b]' : 'bg-white text-[#1d1d1f]'
                    } ${i % 7 === 6 ? 'border-r-0' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1 sm:mb-1.5">
                      <span className={`text-xs sm:text-sm font-semibold w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-[#1B3A5C] text-white font-bold' : ''
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap sm:flex-col gap-1 sm:gap-1.5 justify-center sm:justify-start">
                      {dayEscrows.map(escrow => (
                        <div 
                          key={escrow.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEscrow(escrow);
                          }}
                          className={`cursor-pointer transition-all hover:scale-110 sm:hover:scale-[1.02] shrink-0 w-full ${
                            escrow.status === 'Closed' 
                              ? 'bg-[#f1f5f9] text-[#64748b] sm:border sm:border-[#e2e8f0] rounded-full sm:rounded-lg' 
                              : escrow.status === 'Cancelled'
                              ? 'bg-[#fef2f2] text-[#ef4444] sm:border sm:border-[#fecaca] rounded-full sm:rounded-lg'
                              : 'bg-[#fff7ed] text-[#c2410c] sm:border sm:border-[#ffedd5] font-medium shadow-sm rounded-full sm:rounded-lg'
                          } p-1 sm:px-2 sm:py-1`}
                          title={`${escrow.address} - ${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim()}
                        >
                          {/* Desktop/Tablet text */}
                          <div className="hidden sm:block text-[11px] truncate text-left font-semibold">
                            {escrow.address}
                          </div>
                          {/* Mobile circular status badge */}
                          <div className={`sm:hidden w-2 h-2 rounded-full mx-auto ${
                            escrow.status === 'Closed'
                              ? 'bg-slate-400'
                              : escrow.status === 'Cancelled'
                              ? 'bg-red-500'
                              : 'bg-[#1B3A5C]'
                          }`} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quarter View */}
        {viewMode === 'quarter' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 sm:p-6 overflow-y-auto flex-1 h-full max-h-[650px]">
            {monthsInQuarter.map((mIdx) => {
              const monthEscrows = getEscrowsForMonth(currentYear, mIdx).sort(
                (a, b) => new Date(a.coeDate || 0).getTime() - new Date(b.coeDate || 0).getTime()
              );

              return (
                <div 
                  key={mIdx}
                  className="bg-white rounded-2xl border border-[#e5e5ea] shadow-sm p-4 sm:p-5 flex flex-col h-full min-h-[380px]"
                >
                  {/* Clickable Header */}
                  <button 
                    onClick={() => {
                      setCurrentDate(new Date(currentYear, mIdx, 1));
                      setViewMode('month');
                    }}
                    className="flex items-center justify-between w-full pb-3 mb-4 border-b border-[#e5e5ea] hover:text-[#1B3A5C] text-[#1B3A5C] transition-colors group/hdr"
                    title={`View ${monthNames[mIdx]} in full Month grid`}
                  >
                    <span className="font-bold text-base sm:text-lg tracking-tight">{monthNames[mIdx]}</span>
                    <span className="text-[11px] font-bold bg-[#1B3A5C]/10 text-[#1B3A5C] group-hover/hdr:bg-[#1B3A5C]/10 group-hover/hdr:text-[#1B3A5C] px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors">
                      {monthEscrows.length} {monthEscrows.length === 1 ? 'Closing' : 'Closings'}
                      <ChevronRight size={12} strokeWidth={2.5} />
                    </span>
                  </button>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                    {monthEscrows.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                        <CalendarRange className="w-8 h-8 text-slate-200 mb-2" />
                        <span className="text-xs font-semibold">No scheduled closings</span>
                      </div>
                    ) : (
                      monthEscrows.map((escrow) => (
                        <div 
                          key={escrow.id}
                          onClick={() => onSelectEscrow(escrow)}
                          className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-[#e5e5ea] hover:border-[#1B3A5C]/20 rounded-xl transition-all duration-150 cursor-pointer flex flex-col gap-1.5"
                        >
                          <div className="flex justify-between items-center gap-2">
                            {escrow.escrowNumber ? (
                              <span className="font-mono text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/80">
                                #{escrow.escrowNumber}
                              </span>
                            ) : (
                              <span className="font-mono text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                #{escrow.id.slice(0, 5).toUpperCase()}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-600 bg-[#1B3A5C]/5 px-2 py-0.5 rounded">
                              {format(parseISO(escrow.coeDate!), 'MMM d')}
                            </span>
                          </div>
                          
                          <div className="font-bold text-xs text-[#1B3A5C] truncate pr-1" title={escrow.address}>
                            {escrow.address}
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500 min-w-0">
                            <span className="truncate pr-2 font-medium">
                              Client: {`${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || 'Unknown'}
                            </span>
                            <StatusBadge status={escrow.status} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Year View */}
        {viewMode === 'year' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 sm:p-6 overflow-y-auto flex-1 h-full max-h-[650px]">
            {monthNames.map((mName, mIdx) => {
              const monthEscrows = getEscrowsForMonth(currentYear, mIdx).sort(
                (a, b) => new Date(a.coeDate || 0).getTime() - new Date(b.coeDate || 0).getTime()
              );
              const displayedEscrows = monthEscrows.slice(0, 3);
              const hasMore = monthEscrows.length > 3;

              return (
                <div 
                  key={mName}
                  onClick={() => {
                    setCurrentDate(new Date(currentYear, mIdx, 1));
                    setViewMode('month');
                  }}
                  className="bg-white rounded-2xl border border-[#e5e5ea] hover:border-[#1B3A5C]/30 hover:shadow-md p-4 transition-all duration-200 cursor-pointer flex flex-col h-full min-h-[170px] group/yearcard"
                  title={`Click to view details for ${mName}`}
                >
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#fafafa]">
                    <span className="font-bold text-sm text-[#1B3A5C] group-hover/yearcard:text-[#1B3A5C] transition-colors">
                      {mName}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      monthEscrows.length > 0 
                        ? 'bg-[#1B3A5C] text-white' 
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {monthEscrows.length}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    {monthEscrows.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 italic py-5">
                        No closings
                      </div>
                    ) : (
                      <div className="space-y-1.5 flex-1">
                        {displayedEscrows.map((escrow) => (
                          <div 
                            key={escrow.id}
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid triggering card's general click
                              onSelectEscrow(escrow);
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-[#1B3A5C]/5 rounded-lg text-[10px] flex justify-between items-center gap-1.5 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                            title={`${escrow.address} (COE: ${escrow.coeDate})`}
                          >
                            <span className="font-bold text-slate-700 truncate flex-1">
                              {escrow.address}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">
                              {format(parseISO(escrow.coeDate!), 'd')}
                            </span>
                          </div>
                        ))}
                        {hasMore && (
                          <div className="text-[9px] text-[#1B3A5C] font-bold mt-1 text-center group-hover/yearcard:underline">
                            + {monthEscrows.length - 3} more closings
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
