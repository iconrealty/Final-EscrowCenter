import React, { useState, useMemo } from 'react';
import { X, Search, Edit3, Trash2, Calendar, Download, Building, CheckCircle2, Clock, XCircle, ChevronDown, Filter, RefreshCw } from 'lucide-react';
import { Escrow } from '../../types';
import { downloadEscrowsCsv } from '../../utils/csvUtils';

interface EscrowTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrows: Escrow[];
  onEditEscrow: (escrow: Escrow) => void;
  onDeleteEscrow: (escrowId: string) => void;
}

export function EscrowTableModal({
  isOpen,
  onClose,
  escrows,
  onEditEscrow,
  onDeleteEscrow,
}: EscrowTableModalProps) {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed' | 'Cancelled'>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Filtered escrows list
  const filteredEscrows = useMemo(() => {
    return escrows.filter((e) => {
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
        const clientName = `${e.clientFirstName || ''} ${e.clientLastName || ''}`.toLowerCase();
        const escrowNum = (e.escrowNumber || '').toLowerCase();
        const agent = (e.agentName || '').toLowerCase();
        const lead = (e.leadSource || '').toLowerCase();

        return (
          address.includes(query) ||
          clientName.includes(query) ||
          escrowNum.includes(query) ||
          agent.includes(query) ||
          lead.includes(query)
        );
      }

      return true;
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

  const confirmDelete = (id: string) => {
    onDeleteEscrow(id);
    setDeletingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl border border-[#e5e5ea] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#e5e5ea] bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#1B3A5C] text-white shadow-xs">
                <Building size={18} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1d1d1f] tracking-tight">
                  Escrows Table Manager
                </h2>
                <p className="text-xs text-[#86868b]">
                  View, filter by year, edit, and manage all your escrow records.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => downloadEscrowsCsv(filteredEscrows)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e5e5ea] text-xs font-bold text-[#1B3A5C] hover:bg-slate-100 shadow-2xs transition-all cursor-pointer"
              title="Export filtered table to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-white border-b border-[#e5e5ea] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
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

        {/* Quick Summary Pill Bar */}
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

        {/* Table Content */}
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
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-100/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Address / Escrow #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Net Comm.</th>
                  <th className="py-3 px-4">COE Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEscrows.map((escrow) => {
                  const clientName = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim() || '—';
                  const isDeletingThis = deletingId === escrow.id;

                  return (
                    <tr
                      key={escrow.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Address & Escrow # */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1d1d1f] group-hover:text-[#1B3A5C] transition-colors">
                          {escrow.address || 'Untitled Property'}
                        </div>
                        {escrow.escrowNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            #{escrow.escrowNumber}
                          </div>
                        )}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{clientName}</div>
                        {escrow.clientPhone && (
                          <div className="text-[10px] text-slate-400">{escrow.clientPhone}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            escrow.status === 'Closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : escrow.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {escrow.status === 'Closed' && <CheckCircle2 size={11} />}
                          {escrow.status === 'Open' && <Clock size={11} />}
                          {escrow.status === 'Cancelled' && <XCircle size={11} />}
                          {escrow.status || 'Open'}
                        </span>
                      </td>

                      {/* Side */}
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {escrow.representation || 'Buyer'}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {escrow.price ? `$${escrow.price.toLocaleString('en-US')}` : '$0'}
                      </td>

                      {/* Net Commission */}
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {escrow.netCommission ? `$${escrow.netCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                      </td>

                      {/* COE Date */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {escrow.coeDate || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isDeletingThis ? (
                          <div className="flex items-center justify-end gap-1.5 animate-fade-in">
                            <span className="text-[11px] font-bold text-rose-600 mr-1">Delete?</span>
                            <button
                              onClick={() => confirmDelete(escrow.id)}
                              className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-300 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditEscrow(escrow)}
                              className="p-1.5 text-slate-500 hover:text-[#1B3A5C] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Escrow details"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingId(escrow.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Escrow"
                            >
                              <Trash2 size={15} />
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
        <div className="p-4 bg-slate-50 border-t border-[#e5e5ea] flex items-center justify-between text-xs text-slate-500">
          <span>Click <strong className="text-slate-700">Edit</strong> on any row to open the full editor.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
