import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function FilterBar({ 
  filter, setFilter, 
  search, setSearch, 
  selectedYear, setSelectedYear
}: { 
  filter: string, setFilter: (f: string) => void,
  search: string, setSearch: (s: string) => void,
  selectedYear: string, setSelectedYear: (y: string) => void
}) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  // Generate options from 2022 to current year + 1 (e.g. 2027, 2026, 2025, 2024, 2023, 2022)
  const years = ['All', ...Array.from({ length: 6 }, (_, i) => (currentYear + 1 - i).toString())];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Sleek Integrated Status Dropdown */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => {
              setIsStatusDropdownOpen(!isStatusDropdownOpen);
              setIsYearDropdownOpen(false);
            }}
            className="flex items-center gap-2 bg-white border border-[#e5e5ea] rounded-xl px-4 py-2 shadow-sm hover:border-[#1B3A5C]/40 transition-all text-xs font-bold text-[#1d1d1f] active:scale-98 cursor-pointer"
          >
            <span className="text-[#86868b] font-medium">Status:</span>
            <span>{filter === 'All' ? 'All Escrows' : filter === 'Open' ? 'Open Escrows' : filter === 'Closed' ? 'Closed Escrows' : 'Canceled Escrows'}</span>
            <ChevronDown size={14} className={`text-[#86868b] transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isStatusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95, transition: { duration: 0.1 } }}
                  className="absolute top-full left-0 mt-2 w-44 bg-white border border-[#e5e5ea] rounded-2xl shadow-xl z-50 overflow-hidden py-1.5"
                >
                  {[
                    { key: 'All', label: 'All Escrows' },
                    { key: 'Open', label: 'Open Escrows' },
                    { key: 'Closed', label: 'Closed Escrows' },
                    { key: 'Cancelled', label: 'Canceled Escrows' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setFilter(opt.key);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        filter === opt.key ? 'text-[#1B3A5C] bg-[#f1f5f9]' : 'text-[#86868b] hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Sleek Integrated Year Dropdown - identical look & feel to Status Dropdown */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => {
              setIsYearDropdownOpen(!isYearDropdownOpen);
              setIsStatusDropdownOpen(false);
            }}
            className="flex items-center gap-2 bg-white border border-[#e5e5ea] rounded-xl px-4 py-2 shadow-sm hover:border-[#1B3A5C]/40 transition-all text-xs font-bold text-[#1d1d1f] active:scale-98 cursor-pointer"
          >
            <span className="text-[#86868b] font-medium">Year:</span>
            <span>{selectedYear === 'All' ? 'All Years' : selectedYear}</span>
            <ChevronDown size={14} className={`text-[#86868b] transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isYearDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsYearDropdownOpen(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95, transition: { duration: 0.1 } }}
                  className="absolute top-full left-0 mt-2 w-36 bg-white border border-[#e5e5ea] rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 max-h-56 overflow-y-auto"
                >
                  {years.map(y => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setSelectedYear(y);
                        setIsYearDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                        selectedYear === y ? 'text-[#1B3A5C] bg-[#f1f5f9]' : 'text-[#86868b] hover:bg-slate-50'
                      }`}
                    >
                      {y === 'All' ? 'All Years' : y}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Elegant Search Bar */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" size={15} />
        <input
          type="text"
          placeholder="Search address or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-[#e5e5ea] shadow-sm rounded-xl pl-10 pr-4 py-2 text-xs text-[#1d1d1f] placeholder-[#86868b]/70 focus:outline-none focus:border-[#1B3A5C]/40 focus:ring-1 focus:ring-[#1B3A5C]/30 transition-all"
        />
      </div>
    </div>
  );
}
