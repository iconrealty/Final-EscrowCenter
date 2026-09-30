import React, { useState, useEffect } from 'react';
import { Listing } from '../../types';
import { X, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { calculateNetFromGross, calculateCommissionBreakdown, getFormulaLabel } from '../../utils/commissionUtils';

const parsePriceNum = (val: string | number | undefined) => {
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9.]/g, '');
  return Number(clean) || 0;
};

const formatPriceString = (val: string | number | undefined) => {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/[^0-9.]/g, '');
  if (!clean) return '';
  const parts = clean.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1].slice(0, 2) : '';
  const formattedInteger = integerPart ? Number(integerPart).toLocaleString('en-US') : '';
  return formattedInteger + decimalPart;
};

export interface OfferAcceptanceData {
  price: number;
  acceptanceDate: string;
  coeDate: string;
  coeDays: number;
  commissionPercent: number;
  netCommission: number;
  buyerName?: string;
  buyerAgentBrokerage?: string;
  escrowNumber?: string;
  notes?: string;
}

interface AcceptOfferModalProps {
  isOpen: boolean;
  listing: Listing | null;
  onClose: () => void;
  onConfirm: (listing: Listing, data: OfferAcceptanceData) => void;
}

export function AcceptOfferModal({
  isOpen,
  listing,
  onClose,
  onConfirm,
}: AcceptOfferModalProps) {
  const [priceStr, setPriceStr] = useState('');
  const [acceptanceDate, setAcceptanceDate] = useState('');
  const [coeDays, setCoeDays] = useState(30);
  const [coeDate, setCoeDate] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('2.5');
  const [netCommissionStr, setNetCommissionStr] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-fill when listing changes or modal opens
  useEffect(() => {
    if (listing && isOpen) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      setAcceptanceDate(todayStr);

      const targetCoe = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      setCoeDays(30);
      setCoeDate(targetCoe);

      const initPrice = listing.listPrice || 0;
      setPriceStr(initPrice > 0 ? formatPriceString(initPrice) : '');

      const initPct = listing.commissionPercent !== undefined ? String(listing.commissionPercent) : '2.5';
      setCommissionPercent(initPct);

      const numPct = parseFloat(initPct) || 2.5;
      const gross = initPrice > 0 && numPct > 0 ? Math.round((initPrice * numPct) / 100) : 0;
      const initialNet = listing.netCommission !== undefined && listing.netCommission !== null && Number(listing.netCommission) > 0
        ? Number(listing.netCommission)
        : (gross > 0 ? calculateNetFromGross(gross, listing.leadSource || 'Self') : 0);
      setNetCommissionStr(initialNet > 0 ? formatPriceString(initialNet) : '');

      setNotes(listing.notes ? `[Listing Notes]: ${listing.notes}` : '');
    }
  }, [listing, isOpen]);

  // Adjust COE Date when Acceptance Date or COE Days change
  const handleDaysPreset = (days: number) => {
    setCoeDays(days);
    if (acceptanceDate) {
      try {
        const start = parseISO(acceptanceDate);
        if (!isNaN(start.getTime())) {
          setCoeDate(format(addDays(start, days), 'yyyy-MM-dd'));
        }
      } catch {}
    }
  };

  const handleAcceptanceDateChange = (val: string) => {
    setAcceptanceDate(val);
    if (val && coeDays > 0) {
      try {
        const start = parseISO(val);
        if (!isNaN(start.getTime())) {
          setCoeDate(format(addDays(start, coeDays), 'yyyy-MM-dd'));
        }
      } catch {}
    }
  };

  const handleCoeDateChange = (val: string) => {
    setCoeDate(val);
    if (val && acceptanceDate) {
      try {
        const start = parseISO(acceptanceDate);
        const end = parseISO(val);
        const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) {
          setCoeDays(diff);
        }
      } catch {}
    }
  };

  // Commission calculations
  const numPrice = parsePriceNum(priceStr);
  const numPct = parseFloat(commissionPercent) || 0;
  const grossCommission = numPrice > 0 && numPct > 0 ? Math.round((numPrice * numPct) / 100) : 0;
  const breakdown = calculateCommissionBreakdown(numPrice, numPct, listing?.leadSource || 'Self');

  const handlePriceChange = (val: string) => {
    const formatted = formatPriceString(val);
    setPriceStr(formatted);
    const num = parsePriceNum(val);
    const pct = parseFloat(commissionPercent) || 2.5;
    const gross = Math.round((num * pct) / 100);
    if (gross > 0) {
      setNetCommissionStr(formatPriceString(calculateNetFromGross(gross, listing?.leadSource || 'Self')));
    }
  };

  const handleCommissionPercentChange = (val: string) => {
    setCommissionPercent(val);
    const num = parsePriceNum(priceStr);
    const pct = parseFloat(val) || 0;
    const gross = Math.round((num * pct) / 100);
    if (gross > 0) {
      setNetCommissionStr(formatPriceString(calculateNetFromGross(gross, listing?.leadSource || 'Self')));
    }
  };

  const handleNetCommissionChange = (val: string) => {
    setNetCommissionStr(formatPriceString(val));
  };

  const recalculateNet = () => {
    if (grossCommission > 0) {
      const net = calculateNetFromGross(grossCommission, listing?.leadSource || 'Self');
      setNetCommissionStr(formatPriceString(net));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    const finalNet = parsePriceNum(netCommissionStr) || breakdown.netCommission || grossCommission;

    onConfirm(listing, {
      price: numPrice > 0 ? numPrice : (listing.listPrice || 0),
      acceptanceDate: acceptanceDate || format(new Date(), 'yyyy-MM-dd'),
      coeDate: coeDate || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      coeDays: coeDays || 30,
      commissionPercent: numPct > 0 ? numPct : 2.5,
      netCommission: finalNet,
      notes: notes.trim() || undefined,
    });
  };

  if (!isOpen || !listing) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Standard App Modal Style */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#e5e5ea] flex items-center justify-between bg-slate-50 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#1d1d1f] tracking-tight">
              Accept Offer & Transfer to Escrow
            </h2>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {listing.address} {listing.city ? `• ${listing.city}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#86868b] hover:text-[#1d1d1f] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 ml-2"
            title="Cancel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {/* Source Listing Info Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Listing Source Summary</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">List Price</span>
                <span className="font-extrabold text-slate-800">
                  ${(listing.listPrice || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Seller(s)</span>
                <span className="font-bold text-slate-800 truncate block">
                  {listing.clientFirstName} {listing.clientLastName}
                  {listing.client2FirstName && ` & ${listing.client2FirstName}`}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Source</span>
                <span className="font-bold text-[#1B3A5C]">
                  {listing.leadSource || 'Self'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Escrow</span>
                <span className="font-bold text-slate-800 truncate block" title={listing.escrowCompany || 'None'}>
                  {listing.escrowCompany || 'To be assigned'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Offer Price */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#1B3A5C] uppercase tracking-wider pb-2 border-b border-slate-100">
              <span>Offer Price</span>
            </h3>

            <div className="flex flex-wrap items-start gap-4">
              {/* Accepted Purchase Price - formatted with thousands separation commas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Accepted Purchase Price *</label>
                <div className="relative w-56">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="e.g. 750,000"
                    value={priceStr}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]"
                  />
                </div>
              </div>

              {/* Gross Commission % - compact size for 2-3 digits like 2.5% */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-xs font-bold text-slate-700">Gross Comm. (%)</label>
                  {grossCommission > 0 && (
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      (${grossCommission.toLocaleString()})
                    </span>
                  )}
                </div>
                <div className="relative w-28">
                  <input
                    type="number"
                    step="0.01"
                    value={commissionPercent}
                    onChange={(e) => handleCommissionPercentChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-7 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* Net Commission - formatted with thousands separation commas */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-xs font-bold text-slate-700">Expected Net Comm. ($)</label>
                  <button
                    type="button"
                    onClick={recalculateNet}
                    className="text-[10px] text-[#1B3A5C] hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Auto-calculate from lead formula"
                  >
                    <RefreshCw size={10} />
                    <span>Auto-calc</span>
                  </button>
                </div>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#1B3A5C]">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={netCommissionStr}
                    onChange={(e) => handleNetCommissionChange(e.target.value)}
                    placeholder="e.g. 15,000"
                    className="w-full bg-blue-50/40 border border-blue-200 rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-extrabold text-[#1B3A5C] focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]"
                  />
                </div>
              </div>

              {/* Live Formula Card */}
              <div className="w-full bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-xl p-3 text-xs mt-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-slate-200/70">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span>Lead Source Formula ({listing.leadSource || 'Self'}):</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#1B3A5C]/10 text-[#1B3A5C] font-bold text-[11px]">
                      {getFormulaLabel(listing.leadSource || 'Self')}
                    </span>
                  </div>
                  {numPrice > 0 && numPct > 0 && (
                    <span className="text-[11px] font-bold text-[#1B3A5C] font-mono bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200/60">
                      Formula Net: ${breakdown.netCommission.toLocaleString()}
                    </span>
                  )}
                </div>
                {numPrice > 0 && numPct > 0 && (
                  <div className="pt-2 text-[11px] text-slate-600 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
                    {breakdown.steps.map((step, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1">
                        {idx > 0 && <span className="text-slate-400">→</span>}
                        <span className={idx === breakdown.steps.length - 1 ? 'font-bold text-[#1B3A5C] bg-blue-50 px-1 py-0.5 rounded border border-blue-200' : ''}>
                          {step}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Timeline & Dates */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#1B3A5C] uppercase tracking-wider pb-2 border-b border-slate-100">
              <span>Escrow Timeline</span>
            </h3>

            <div className="flex flex-wrap items-start gap-4">
              {/* Acceptance Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Offer Acceptance Date *</label>
                <input
                  type="date"
                  required
                  value={acceptanceDate}
                  onChange={(e) => handleAcceptanceDateChange(e.target.value)}
                  className="w-44 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]"
                />
              </div>

              {/* Escrow Days with Quick Presets - compact for 2-digit numbers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Days to Close</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={coeDays}
                    onChange={(e) => handleDaysPreset(parseInt(e.target.value) || 30)}
                    className="w-20 bg-white border border-slate-200 rounded-xl px-2 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] text-center"
                  />
                  <div className="flex items-center gap-1">
                    {[15, 21, 30, 45, 60].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDaysPreset(d)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                          coeDays === d
                            ? 'bg-[#1B3A5C] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target COE Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Close of Escrow *</label>
                <input
                  type="date"
                  required
                  value={coeDate}
                  onChange={(e) => handleCoeDateChange(e.target.value)}
                  className="w-44 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]"
                />
              </div>
            </div>
          </div>

          {/* Workflow Notice / Confirmation Callout */}
          <div className="bg-blue-50/70 border border-blue-200/90 rounded-xl p-3.5">
            <div className="text-xs text-[#11253C] leading-relaxed">
              <span className="font-bold text-[#1B3A5C]">What happens next:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[#1B3A5C]">
                <li>A new active Escrow record will be created under your Escrow tab with pre-filled seller, title, and escrow officer contacts.</li>
                <li>This listing will move to <span className="font-bold text-[#11253C]">"Under Contract"</span> and remain linked to the escrow.</li>
                <li>All attached listing documents will automatically carry over to the new escrow.</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#006AFF] hover:bg-[#0051C6] text-white font-bold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <CheckCircle2 size={15} />
              <span>Confirm & Transfer to Escrow</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
