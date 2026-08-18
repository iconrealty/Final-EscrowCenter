import React, { useState, useMemo } from 'react';
import { X, Search, Edit3, Trash2, Calendar, Download, Building, Check } from 'lucide-react';
import { Escrow } from '../../types';
import { downloadEscrowsCsv } from '../../utils/csvUtils';

interface EscrowTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrows: Escrow[];
  onUpdateEscrow: (id: string, updates: Partial<Escrow>) => void;
  onEditEscrow: (escrow: Escrow) => void;
  onDeleteEscrow: (escrowId: string) => void;
}

export function EscrowTableModal({
  isOpen,
  onClose,
  escrows,
  onUpdateEscrow,
  onEditEscrow,
  onDeleteEscrow,
}: EscrowTableModalProps) {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed' | 'Cancelled'>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [cellText, setCellText] = useState<Record<string, string>>({});

  // Helper function to extract exact year from escrow (COE date or acceptance date)
  const getEscrowYear = (e: Escrow): string => {
    const dateStr = (e.coeDate || e.acceptanceDate || '').trim();
    if (!dateStr) return '';
    if (/^\d{4}/.test(dateStr)) return dateStr.substring(0, 4);
    const match = dateStr.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
    if (match) return match[1];
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed.getFullYear().toString();
    return '';
  };

  // Get available years list from all escrows
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYearStr = new Date().getFullYear().toString();
    yearsSet.add(currentYearStr);

    escrows.forEach((e) => {
      const yr = getEscrowYear(e);
      if (yr) yearsSet.add(yr);
    });

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [escrows]);

  // Filtered escrows list with stable sort (newest code / created date first)
  const filteredEscrows = useMemo(() => {
    const list = escrows.filter((e) => {
      // Year filter
      if (selectedYear !== 'All') {
        const yr = getEscrowYear(e);
        if (yr !== selectedYear) return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        if (e.status !== statusFilter) return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const address = (e.address || '').toLowerCase();
        const city = (e.city || '').toLowerCase();
        const zipCode = (e.zipCode || '').toLowerCase();
        const clientName = `${e.clientFirstName || ''} ${e.clientLastName || ''}`.toLowerCase();
        const escrowNum = (e.escrowNumber || '').toLowerCase();
        const agent = (e.agentName || '').toLowerCase();
        const lead = (e.leadSource || '').toLowerCase();

        return (
          address.includes(query) ||
          city.includes(query) ||
          zipCode.includes(query) ||
          clientName.includes(query) ||
          escrowNum.includes(query) ||
          agent.includes(query) ||
          lead.includes(query)
        );
      }

      return true;
    });

    // Default sort by COE Date descending (last/newest escrow at the top)
    return list.sort((a, b) => {
      const parseDate = (d?: string) => {
        if (!d) return 0;
        const ts = new Date(d).getTime();
        return isNaN(ts) ? 0 : ts;
      };

      const dateA = parseDate(a.coeDate);
      const dateB = parseDate(b.coeDate);
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // Secondary fallback: createdAt descending
      const createdA = parseDate(a.createdAt);
      const createdB = parseDate(b.createdAt);
      if (createdB !== createdA) {
        return createdB - createdA;
      }

      // Tertiary fallback: Escrow Number descending
      const numA = (a.escrowNumber || '').trim();
      const numB = (b.escrowNumber || '').trim();
      if (numA && numB) {
        const comp = numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
        if (comp !== 0) return comp;
      }

      return (b.id || '').localeCompare(a.id || '');
    });
  }, [escrows, selectedYear, statusFilter, search]);

  // Summary metrics for current view
  const metrics = useMemo(() => {
    const totalCount = filteredEscrows.length;
    const closedCount = filteredEscrows.filter((e) => e.status === 'Closed').length;
    const openCount = filteredEscrows.filter((e) => e.status === 'Open').length;
    const totalVolume = filteredEscrows.reduce((sum, e) => sum + (e.price || 0), 0);
    const totalCommission = filteredEscrows.reduce((sum, e) => sum + (e.netCommission || 0), 0);

    return { totalCount, closedCount, openCount, totalVolume, totalCommission };
  }, [filteredEscrows]);

  const handleFieldChange = (id: string, field: keyof Escrow, value: any) => {
    onUpdateEscrow(id, { [field]: value });
    setLastSavedId(id);
    setTimeout(() => setLastSavedId((prev) => (prev === id ? null : prev)), 1500);
  };

  const getCellText = (id: string, field: keyof Escrow, defaultValue: number | undefined | null) => {
    const key = `${id}_${String(field)}`;
    if (cellText[key] !== undefined) {
      return cellText[key];
    }
    if (defaultValue !== undefined && defaultValue !== null && defaultValue !== 0) {
      return String(defaultValue);
    }
    return '';
  };

  const handleCellTextChange = (id: string, field: keyof Escrow, rawValue: string) => {
    const key = `${id}_${String(field)}`;
    setCellText((prev) => ({ ...prev, [key]: rawValue }));

    if (rawValue.trim() === '') {
      onUpdateEscrow(id, { [field]: undefined });
    } else {
      const cleaned = rawValue.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      onUpdateEscrow(id, { [field]: isNaN(num) ? undefined : num });
    }
    setLastSavedId(id);
    setTimeout(() => setLastSavedId((prev) => (prev === id ? null : prev)), 1500);
  };

  const handleCellBlur = (id: string, field: keyof Escrow) => {
    const key = `${id}_${String(field)}`;
    setCellText((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const confirmDelete = (id: string) => {
    onDeleteEscrow(id);
    setDeletingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#e5e5ea] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-[#1d1d1f] tracking-tight">
                Live Escrow Spreadsheet
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                Live Editing
              </span>
            </div>
            <p className="text-xs text-[#86868b] mt-0.5">
              Edit any cell directly in the table — changes save automatically in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => downloadEscrowsCsv(filteredEscrows)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e5e5ea] text-xs font-bold text-[#1B3A5C] hover:bg-slate-100 shadow-2xs transition-all cursor-pointer"
              title="Export table to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
              title="Close table manager"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3.5 bg-white border-b border-[#e5e5ea] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Calendar size={14} className="text-[#1B3A5C] ml-1.5" />
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider hidden xs:inline">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#1d1d1f] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#1B3A5C] cursor-pointer"
              >
                <option value="All">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['All', 'Open', 'Closed', 'Cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#1B3A5C] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address, client, escrow #..."
              className="w-full bg-slate-50 border border-[#e5e5ea] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1B3A5C]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Quick Summary Bar */}
        <div className="px-4 py-2 bg-slate-50/80 border-b border-[#e5e5ea] flex flex-wrap items-center justify-between text-xs font-medium text-slate-600 gap-2">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-[#1d1d1f] font-bold">{metrics.totalCount}</strong> escrows
              {selectedYear !== 'All' && ` (${selectedYear})`}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-semibold">{metrics.closedCount} Closed</span>
            <span className="text-amber-700 font-semibold">{metrics.openCount} Open</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] font-bold text-slate-700">
            <span>Volume: <span className="text-[#1B3A5C]">${metrics.totalVolume.toLocaleString('en-US')}</span></span>
            <span className="text-slate-300">•</span>
            <span>Net Comm: <span className="text-emerald-700">${metrics.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          </div>
        </div>

        {/* Interactive Live Spreadsheet Table */}
        <div className="flex-1 overflow-auto">
          {filteredEscrows.length === 0 ? (
            <div className="py-16 text-center">
              <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold text-sm">No escrows found matching your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting search or year filter.</p>
              {(search || selectedYear !== 'All' || statusFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedYear('All');
                    setStatusFilter('All');
                  }}
                  className="mt-4 px-3 py-1.5 bg-[#1B3A5C] text-white rounded-xl text-xs font-bold shadow-2xs hover:bg-[#142d48] transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1120px]">
              <thead className="bg-slate-100/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-[200px]">Address</th>
                  <th className="py-2.5 px-3 w-[120px]">City</th>
                  <th className="py-2.5 px-3 w-[80px]">Zip</th>
                  <th className="py-2.5 px-3 w-[100px]">Escrow #</th>
                  <th className="py-2.5 px-3 w-[160px]">Client Name</th>
                  <th className="py-2.5 px-3 w-[110px]">Status</th>
                  <th className="py-2.5 px-3 w-[100px]">Side</th>
                  <th className="py-2.5 px-3 w-[110px]">Gross Comm. (%)</th>
                  <th className="py-2.5 px-3 w-[120px]">Net Comm ($)</th>
                  <th className="py-2.5 px-3 w-[125px]">COE Date</th>
                  <th className="py-2.5 px-3 w-[80px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEscrows.map((escrow) => {
                  const isDeletingThis = deletingId === escrow.id;
                  const isRecentlySaved = lastSavedId === escrow.id;

                  return (
                    <tr
                      key={escrow.id}
                      className={`transition-colors group hover:bg-slate-50/90 ${
                        isRecentlySaved ? 'bg-emerald-50/60' : ''
                      }`}
                    >
                      {/* Address */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={escrow.address || ''}
                          onChange={(e) => handleFieldChange(escrow.id, 'address', e.target.value)}
                          placeholder="Street Address"
                          className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] font-bold text-[#1d1d1f] text-xs transition-all outline-none"
                        />
                      </td>

                      {/* City */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={escrow.city || ''}
                          onChange={(e) => handleFieldChange(escrow.id, 'city', e.target.value)}
                          placeholder="City"
                          className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] text-slate-700 text-xs transition-all outline-none"
                        />
                      </td>

                      {/* Zip */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={escrow.zipCode || ''}
                          onChange={(e) => handleFieldChange(escrow.id, 'zipCode', e.target.value)}
                          placeholder="Zip"
                          className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] text-slate-700 text-xs transition-all outline-none"
                        />
                      </td>

                      {/* Escrow # */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={escrow.escrowNumber || ''}
                          onChange={(e) => handleFieldChange(escrow.id, 'escrowNumber', e.target.value)}
                          placeholder="Escrow #"
                          className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] font-mono text-slate-600 text-xs transition-all outline-none"
                        />
                      </td>

                      {/* Client Name (First & Last) */}
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={escrow.clientFirstName || ''}
                            onChange={(e) => handleFieldChange(escrow.id, 'clientFirstName', e.target.value)}
                            placeholder="First"
                            className="w-1/2 px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] font-medium text-slate-800 text-xs transition-all outline-none"
                          />
                          <input
                            type="text"
                            value={escrow.clientLastName || ''}
                            onChange={(e) => handleFieldChange(escrow.id, 'clientLastName', e.target.value)}
                            placeholder="Last"
                            className="w-1/2 px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] font-medium text-slate-800 text-xs transition-all outline-none"
                          />
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-1.5 px-2">
                        <select
                          value={escrow.status || 'Open'}
                          onChange={(e) => handleFieldChange(escrow.id, 'status', e.target.value)}
                          className={`w-full px-2 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer outline-none ${
                            escrow.status === 'Closed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:border-emerald-500'
                              : escrow.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 focus:border-rose-500'
                              : 'bg-amber-50 text-amber-800 border-amber-200 focus:border-amber-500'
                          }`}
                        >
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Representation Side */}
                      <td className="py-1.5 px-2">
                        <select
                          value={escrow.representation || 'Buyer'}
                          onChange={(e) => handleFieldChange(escrow.id, 'representation', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] text-slate-700 text-xs font-semibold transition-all cursor-pointer outline-none"
                        >
                          <option value="Buyer">Buyer</option>
                          <option value="Seller">Seller</option>
                          <option value="Dual Agent">Dual Agent</option>
                        </select>
                      </td>

                      {/* Gross Commission (%) */}
                      <td className="py-1.5 px-2">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getCellText(escrow.id, 'commissionPercent', escrow.commissionPercent)}
                            onChange={(e) => handleCellTextChange(escrow.id, 'commissionPercent', e.target.value)}
                            onBlur={() => handleCellBlur(escrow.id, 'commissionPercent')}
                            placeholder=""
                            className="w-full pr-6 pl-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] font-mono font-bold text-slate-900 text-xs transition-all outline-none"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">%</span>
                        </div>
                      </td>

                      {/* Net Commission ($) */}
                      <td className="py-1.5 px-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 font-mono text-xs">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getCellText(escrow.id, 'netCommission', escrow.netCommission)}
                            onChange={(e) => handleCellTextChange(escrow.id, 'netCommission', e.target.value)}
                            onBlur={() => handleCellBlur(escrow.id, 'netCommission')}
                            placeholder="0.00"
                            className="w-full pl-5 pr-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 font-mono font-bold text-emerald-700 text-xs transition-all outline-none"
                          />
                        </div>
                      </td>

                      {/* COE Date */}
                      <td className="py-1.5 px-2">
                        <input
                          type="date"
                          value={escrow.coeDate || ''}
                          onChange={(e) => handleFieldChange(escrow.id, 'coeDate', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-[#1B3A5C] focus:bg-white focus:ring-1 focus:ring-[#1B3A5C] font-mono text-slate-700 text-xs transition-all cursor-pointer outline-none"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-3 text-right">
                        {isDeletingThis ? (
                          <div className="flex items-center justify-end gap-1 animate-fade-in">
                            <button
                              onClick={() => confirmDelete(escrow.id)}
                              className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 cursor-pointer"
                              title="Confirm delete"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-1.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {isRecentlySaved && (
                              <span className="p-1 text-emerald-600 bg-emerald-100 rounded-full animate-pulse" title="Saved live">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                            <button
                              onClick={() => onEditEscrow(escrow)}
                              className="p-1.5 text-slate-400 hover:text-[#1B3A5C] hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                              title="Full Editor Modal"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingId(escrow.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Escrow"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-[#e5e5ea] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Changes made to cells auto-save in real-time.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1B3A5C] hover:bg-[#142d48] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
