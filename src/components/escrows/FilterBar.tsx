import React, { useState } from 'react';
import { Search, ChevronDown, CalendarDays, Filter } from 'lucide-react';

export function FilterBar({ 
  filter, setFilter, 
  search, setSearch, 
  urgentOnly, setUrgentOnly,
  urgentCount,
  timeFilterType, setTimeFilterType,
  timeFilterValue, setTimeFilterValue
}: { 
  filter: string, setFilter: (f: string) => void,
  search: string, setSearch: (s: string) => void,
  urgentOnly: boolean, setUrgentOnly: (u: boolean) => void,
  urgentCount: number,
  timeFilterType: 'Year' | 'Month' | 'Week' | 'All Time', setTimeFilterType: (t: 'Year' | 'Month' | 'Week' | 'All Time') => void,
  timeFilterValue: string, setTimeFilterValue: (v: string) => void
}) {
  const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const handleTimeTypeChange = (type: 'Year' | 'Month' | 'Week' | 'All Time') => {
    setTimeFilterType(type);
    const now = new Date();
    if (type === 'Year') setTimeFilterValue(now.getFullYear().toString());
    if (type === 'Month') {
      const month = String(now.getMonth() + 1).padStart(2, '0');
      setTimeFilterValue(`${now.getFullYear()}-${month}`);
    }
    if (type === 'Week') {
      const start = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
      setTimeFilterValue(`${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Tabs */}
        <div className="flex bg-white border border-[#e5e5ea] rounded-xl p-1 shadow-sm">
          {['All', 'Open', 'Closed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`relative px-3.5 sm:px-5 py-1.5 text-xs font-bold transition-all rounded-lg ${
                filter === f 
                ? 'text-[#FF7518]' 
                : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              {filter === f && (
                <div 
                  className="absolute inset-0 bg-[#FFF5EE] rounded-lg -z-10"
                />
              )}
              {f}
            </button>
          ))}
        </div>
        
        {/* Urgent Toggle */}
        <button
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
            urgentOnly 
              ? 'bg-[#fef3c7] border-[#fde68a] text-[#92400e] shadow-sm' 
              : 'bg-white border-[#e5e5ea] text-[#86868b] hover:border-[#fde68a] hover:text-[#92400e] shadow-sm'
          }`}
        >
          <Filter size={14} className={urgentOnly ? 'fill-[#92400e]' : ''} />
          Urgent
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${urgentOnly ? 'bg-[#92400e]/10' : 'bg-gray-100'}`}>
            {urgentCount}
          </span>
        </button>

        {/* Time Filter - Modern Custom Control */}
        <div className="relative">
          <button 
            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
            className="flex items-center gap-2 bg-white border border-[#e5e5ea] rounded-xl px-4 py-2 shadow-sm hover:border-[#FF7518]/30 transition-all text-xs font-bold text-[#334155]"
          >
            <CalendarDays size={14} className="text-[#86868b]" />
            <span className="text-[#86868b] font-medium">Viewing:</span>
            <span className="text-[#1d1d1f]">{timeFilterType}</span>
            <ChevronDown size={14} className={`text-[#86868b] transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isTimeDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTimeDropdownOpen(false)} />
              <div 
                className="absolute top-full left-0 mt-2 w-48 bg-white border border-[#e5e5ea] rounded-2xl shadow-xl z-50 overflow-hidden py-2"
              >
                {['All Time', 'Year', 'Month', 'Week'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      handleTimeTypeChange(type as any);
                      setIsTimeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                      timeFilterType === type ? 'text-[#FF7518] bg-[#FFF5EE]' : 'text-[#86868b] hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Dynamic Value Selector */}
        {timeFilterType !== 'All Time' && (
          <div className="relative">
            {timeFilterType === 'Year' ? (
              <button 
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                className="flex items-center gap-2 bg-white border border-[#e5e5ea] rounded-xl px-4 py-2 shadow-sm hover:border-[#FF7518]/30 transition-all text-xs font-bold text-[#1d1d1f]"
              >
                {timeFilterValue}
                <ChevronDown size={14} className={`text-[#86868b] transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : timeFilterType === 'Month' ? (
              <input 
                type="month" 
                value={timeFilterValue} 
                onChange={e => setTimeFilterValue(e.target.value)}
                className="bg-white border border-[#e5e5ea] rounded-xl px-4 py-2 shadow-sm text-xs text-[#1d1d1f] font-bold focus:outline-none focus:border-[#FF7518]/30 cursor-pointer"
              />
            ) : (
              <input 
                type="week" 
                value={timeFilterValue} 
                onChange={e => setTimeFilterValue(e.target.value)}
                className="bg-white border border-[#e5e5ea] rounded-xl px-4 py-2 shadow-sm text-xs text-[#1d1d1f] font-bold focus:outline-none focus:border-[#FF7518]/30 cursor-pointer"
              />
            )}

            {isYearDropdownOpen && timeFilterType === 'Year' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)} />
                <div 
                  className="absolute top-full left-0 mt-2 w-32 bg-white border border-[#e5e5ea] rounded-2xl shadow-xl z-50 overflow-hidden py-2 max-h-48 overflow-y-auto"
                >
                  {years.map(y => (
                    <button
                      key={y}
                      onClick={() => {
                        setTimeFilterValue(y.toString());
                        setIsYearDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                        timeFilterValue === y.toString() ? 'text-[#FF7518] bg-[#FFF5EE]' : 'text-[#86868b] hover:bg-gray-50'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" size={16} />
        <input
          type="text"
          placeholder="Search address or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-[#e5e5ea] shadow-sm rounded-2xl pl-11 pr-4 py-2.5 text-sm text-[#1d1d1f] placeholder-[#86868b]/70 focus:outline-none focus:border-[#FF7518] focus:ring-1 focus:ring-[#FF7518] transition-all"
        />
      </div>
    </div>
  );
}
