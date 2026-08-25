import React, { useState, useEffect, useRef } from 'react';
import { Escrow, EscrowDocument, CONTINGENCIES, adjustWeekendToMonday, parseAddressComponents } from '../../types';
import { X, FileText, CheckCircle2, Calculator, Sparkles, RefreshCw, Info } from 'lucide-react';
import { addMonths, addDays, parseISO, format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { usePreferredPartners } from '../../hooks/usePreferredPartners';
import { PartnerDropdown } from '../common/PartnerDropdown';
import { PreferredPartner } from '../../types/partners';
import { parseMlsText } from '../../utils/mlsParser';
import { extractPdfPagesText } from '../../utils/clientRpaParser';
import { parseFullEscrowRPA } from '../../services/geminiService';
import { getCityFromZip } from '../../utils/californiaZipDb';
import { calculateNetFromGross, calculateCommissionBreakdown, getFormulaLabel } from '../../utils/commissionUtils';

export function AddEditModal({ 
  escrow, 
  onClose, 
  onSave 
}: { 
  escrow?: Escrow | null; 
  onClose: () => void; 
  onSave: (data: any) => void;
}) {
  const { user } = useAuth();
  const { partners, addPartner, deletePartner, getDefaultPartner } = usePreferredPartners();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState('');
  const [scanError, setScanError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<EscrowDocument | null>(null);
  const [l9Enabled, setL9Enabled] = useState(() => Boolean(escrow?.contingencyDays?.['L9'] && Number(escrow?.contingencyDays?.['L9']) > 0));

  const [formData, setFormData] = useState(() => {
    return {
      escrowNumber: '',
      apn: '',
      escrowCompany: '',
      address: '',
      city: '',
      zipCode: '',
      clientFirstName: '',
      clientLastName: '',
      clientPhone: '',
      clientEmail: '',
      clientBirthday: '',
      client2FirstName: '',
      client2LastName: '',
      client2Phone: '',
      client2Email: '',
      client2Birthday: '',
      collaborator: '',
      escrowOfficer: '',
      escrowPhone: '',
      escrowEmail: '',
      titleCompany: '',
      titleOfficer: '',
      titlePhone: '',
      titleEmail: '',
      agentName: '',
      agentPhone: '',
      agentEmail: '',
      cooperatingBrokerage: '',
      lenderName: '',
      lenderPhone: '',
      lenderEmail: '',
      price: '',
      netCommission: '',
      commissionPercent: '',
      acceptanceDate: '',
      coeDate: '',
      contingencyStartDate: '',
      status: 'Open',
      representation: 'Buyer' as 'Buyer' | 'Seller' | 'Dual',
      leadSource: 'Zillow' as 'Zillow' | 'Self' | 'Other',
      notes: '',
      contingencyDays: {
        'L1': '14', 'L2': '10', 'L3': '7', 'L4': '7', 'L5': '7', 'L6': '7', 'L7': '7', 'L8': '7', 'L9': '7'
      } as Record<string, string>
    };
  });

  // Address auto-fill helper: when pasting full address like "123 Main St, Santa Ana, CA 92701"
  const handleAddressInputChange = (rawVal: string) => {
    const parsed = parseAddressComponents(rawVal);
    
    // Check if zip was in the address string and can resolve city
    let derivedCity = parsed.city;
    if (!derivedCity && parsed.zipCode) {
      const cityLookup = getCityFromZip(parsed.zipCode);
      if (cityLookup) derivedCity = cityLookup;
    }

    setFormData(prev => ({
      ...prev,
      address: parsed.address || rawVal,
      city: derivedCity ? derivedCity : prev.city,
      zipCode: parsed.zipCode ? parsed.zipCode : prev.zipCode,
    }));
  };

  // Zip Code auto-fill helper: when typing a 5-digit California zip (e.g. 92703 -> Santa Ana, 92618 -> Irvine)
  const handleZipInputChange = (rawZip: string) => {
    const cleanZip = rawZip.trim().substring(0, 5);
    const lookupCity = getCityFromZip(cleanZip);

    setFormData(prev => ({
      ...prev,
      zipCode: rawZip,
      // Auto-fill city if empty or if zip matches a known California city
      city: lookupCity ? lookupCity : prev.city,
    }));
  };

  const applyExtractedMlsData = (data: ReturnType<typeof parseMlsText>, sourceLabel: string) => {
    if (!data.address && !data.price && !data.apn && !data.agentName) {
      setScanError('Could not find listing details in the provided PDF. You can enter them manually below.');
      return;
    }

    setFormData((prev) => {
      const priceVal = data.price ? String(data.price) : prev.price;
      const compRate = data.commissionPercent || (prev.commissionPercent ? Number(prev.commissionPercent) : 2.5);
      const gross = priceVal ? Math.round(Number(priceVal) * (compRate / 100)) : 0;
      const computedNet = gross ? calculateNetFromGross(gross, prev.leadSource) : (prev.netCommission ? Number(prev.netCommission) : 0);

      return {
        ...prev,
        address: data.address || prev.address,
        city: data.city || prev.city,
        zipCode: data.zipCode || prev.zipCode,
        apn: data.apn || prev.apn,
        price: priceVal,
        commissionPercent: String(compRate),
        netCommission: computedNet ? String(computedNet) : prev.netCommission,
        agentName: data.agentName || prev.agentName,
        agentPhone: data.agentPhone || prev.agentPhone,
        agentEmail: data.agentEmail || prev.agentEmail,
        cooperatingBrokerage: data.cooperatingBrokerage || prev.cooperatingBrokerage,
      };
    });

    setScanSuccess(`Listing details extracted successfully from ${sourceLabel}!`);
    setScanError('');
  };

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    lastFileRef.current = file;
    setIsScanning(true);
    setScanError('');
    setScanSuccess('');

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        let fullText = '';
        try {
          const res = await extractPdfPagesText(file);
          fullText = res.fullText;
        } catch (clientPdfErr: any) {
          console.warn('Client-side PDF extraction encountered error:', clientPdfErr);
        }

        if (fullText && fullText.trim().length > 20) {
          const parsed = parseMlsText(fullText);
          applyExtractedMlsData(parsed, file.name);
        } else {
          // If client-side text was empty or failed (e.g. scanned image PDF), attempt server scanner fallback
          try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
            });
            reader.readAsDataURL(file);
            const dataUrl = await base64Promise;
            const doc = await parseFullEscrowRPA(dataUrl, file.type || 'application/pdf', file.name, formData.representation);
            if (doc && (doc.address || doc.price || doc.agentName || doc.listingAgentName || doc.apn)) {
              applyExtractedMlsData({
                address: doc.address,
                city: doc.city,
                zipCode: doc.zipCode,
                apn: doc.apn,
                price: doc.price,
                commissionPercent: doc.commissionPercent,
                agentName: doc.agentName || doc.listingAgentName || doc.buyerAgentName,
                agentPhone: doc.agentPhone || doc.listingAgentPhone || doc.buyerAgentPhone,
                agentEmail: doc.agentEmail || doc.listingAgentEmail || doc.buyerAgentEmail,
                cooperatingBrokerage: doc.cooperatingBrokerage || doc.listingBrokerage || doc.buyerBrokerage,
              }, file.name);
              return;
            }
          } catch (serverErr) {
            console.warn('Server fallback scan error:', serverErr);
          }
          throw new Error('PDF appears empty or contains non-selectable images.');
        }
      } else {
        // Plain text or CSV file
        const text = await file.text();
        const parsed = parseMlsText(text);
        applyExtractedMlsData(parsed, file.name);
      }
    } catch (err: any) {
      setScanError(err.message || 'Failed to read MLS sheet.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  useEffect(() => {
    if (escrow) {
      const stringifiedDays: Record<string, string> = {};
      if (escrow.contingencyDays) {
        Object.keys(escrow.contingencyDays).forEach(k => {
          stringifiedDays[k] = escrow.contingencyDays![k].toString();
        });
      }

      const sanitizeBday = (bday?: string, acceptance?: string, coe?: string) => {
        if (!bday || typeof bday !== 'string') return '';
        const str = bday.trim();
        if (!str) return '';
        if (acceptance && typeof acceptance === 'string' && str === acceptance.trim()) return '';
        if (coe && typeof coe === 'string' && str === coe.trim()) return '';
        return str;
      };

      const cleanBday1 = sanitizeBday(escrow.clientBirthday, escrow.acceptanceDate, escrow.coeDate);
      const cleanBday2 = sanitizeBday(escrow.client2Birthday, escrow.acceptanceDate, escrow.coeDate);

      let initAddress = escrow.address || '';
      let initCity = escrow.city || '';
      let initZip = escrow.zipCode || '';

      // Auto-extract city and zip if missing on legacy single-string address
      if ((!initCity || !initZip) && initAddress) {
        const parsed = parseAddressComponents(initAddress);
        if (!initCity && parsed.city) initCity = parsed.city;
        if (!initZip && parsed.zipCode) initZip = parsed.zipCode;
        if (parsed.address && (parsed.city || parsed.zipCode)) {
          initAddress = parsed.address;
        }
      }

      setFormData({
        escrowNumber: escrow.escrowNumber || '',
        apn: escrow.apn || '',
        escrowCompany: escrow.escrowCompany || '',
        address: initAddress,
        city: initCity,
        zipCode: initZip,
        clientFirstName: escrow.clientFirstName || '',
        clientLastName: escrow.clientLastName || '',
        clientPhone: escrow.clientPhone || '',
        clientEmail: escrow.clientEmail || '',
        clientBirthday: cleanBday1,
        client2FirstName: escrow.client2FirstName || '',
        client2LastName: escrow.client2LastName || '',
        client2Phone: escrow.client2Phone || '',
        client2Email: escrow.client2Email || '',
        client2Birthday: cleanBday2,
        collaborator: escrow.collaborator || '',
        escrowOfficer: escrow.escrowOfficer || '',
        escrowPhone: escrow.escrowPhone || '',
        escrowEmail: escrow.escrowEmail || '',
        titleCompany: escrow.titleCompany || '',
        titleOfficer: escrow.titleOfficer || '',
        titlePhone: escrow.titlePhone || '',
        titleEmail: escrow.titleEmail || '',
        agentName: escrow.agentName || '',
        agentPhone: escrow.agentPhone || '',
        agentEmail: escrow.agentEmail || '',
        cooperatingBrokerage: escrow.cooperatingBrokerage || '',
        lenderName: escrow.lenderName || '',
        lenderPhone: escrow.lenderPhone || '',
        lenderEmail: escrow.lenderEmail || '',
        price: escrow.price ? escrow.price.toString() : '',
        netCommission: escrow.netCommission ? escrow.netCommission.toString() : '',
        commissionPercent: escrow.commissionPercent?.toString() || '',
        acceptanceDate: escrow.acceptanceDate || '',
        contingencyStartDate: escrow.contingencyStartDate || '',
        coeDate: escrow.coeDate || '',
        status: escrow.status || 'Open',
        representation: escrow.representation || 'Buyer',
        leadSource: (escrow.leadSource as any) || 'Zillow',
        notes: escrow.notes || '',
        contingencyDays: stringifiedDays
      });
      setL9Enabled(Boolean(escrow.contingencyDays?.['L9'] && Number(escrow.contingencyDays?.['L9']) > 0));
    } else {
      setL9Enabled(false);
      setFormData({
        escrowNumber: '',
        apn: '',
        escrowCompany: '',
        address: '',
        city: '',
        zipCode: '',
        clientFirstName: '',
        clientLastName: '',
        clientPhone: '',
        clientEmail: '',
        clientBirthday: '',
        client2FirstName: '',
        client2LastName: '',
        client2Phone: '',
        client2Email: '',
        client2Birthday: '',
        collaborator: '',
        escrowOfficer: '',
        escrowPhone: '',
        escrowEmail: '',
        titleCompany: '',
        titleOfficer: '',
        titlePhone: '',
        titleEmail: '',
        agentName: '',
        agentPhone: '',
        agentEmail: '',
        cooperatingBrokerage: '',
        lenderName: '',
        lenderPhone: '',
        lenderEmail: '',
        price: '',
        netCommission: '',
        commissionPercent: '',
        acceptanceDate: '',
        coeDate: '',
        contingencyStartDate: '',
        status: 'Open',
        representation: 'Buyer',
        leadSource: 'Zillow',
        notes: '',
        contingencyDays: {
          'L1': '14', 'L2': '10', 'L3': '7', 'L4': '7', 'L5': '7', 'L6': '7', 'L7': '7', 'L8': '7', 'L9': '7'
        }
      });
    }
  }, [escrow]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedDays: Record<string, number> = {};
    Object.keys(formData.contingencyDays).forEach(k => {
      if (k === 'L9' && !l9Enabled) {
        return; // Omit L9 when deactivated
      }
      if (formData.contingencyDays[k]) {
        parsedDays[k] = Number(formData.contingencyDays[k]);
      }
    });

    const cleanedData: any = {
      ...formData,
      price: Number(formData.price) || 0,
      netCommission: Number(formData.netCommission) || 0,
      commissionPercent: formData.commissionPercent ? Number(formData.commissionPercent) : undefined,
      contingencyDays: parsedDays
    };

    if (pendingDoc) {
      const existingDocs = escrow?.documents || [];
      cleanedData.documents = [pendingDoc, ...existingDocs];
    }

    onSave(cleanedData);
  };

  const handlePriceChange = (val: string) => {
    const numPrice = Number(val) || 0;
    const numCommPercent = formData.commissionPercent ? Number(formData.commissionPercent) : 2.5;
    const gross = Math.round((numPrice * numCommPercent) / 100);
    const calculatedNet = calculateNetFromGross(gross, formData.leadSource);

    setFormData(prev => ({
      ...prev,
      price: val,
      netCommission: val && numPrice > 0 ? String(calculatedNet) : (val === '' ? '' : prev.netCommission)
    }));
  };

  const handleCommissionPercentChange = (val: string) => {
    const numPrice = Number(formData.price) || 0;
    const numCommPercent = Number(val) || 0;
    const gross = Math.round((numPrice * numCommPercent) / 100);
    const calculatedNet = calculateNetFromGross(gross, formData.leadSource);

    setFormData(prev => ({
      ...prev,
      commissionPercent: val,
      netCommission: numPrice > 0 && val ? String(calculatedNet) : prev.netCommission
    }));
  };

  const handleLeadSourceChange = (newSource: string) => {
    const numPrice = Number(formData.price) || 0;
    const numCommPercent = formData.commissionPercent ? Number(formData.commissionPercent) : 2.5;
    const gross = Math.round((numPrice * numCommPercent) / 100);
    const calculatedNet = calculateNetFromGross(gross, newSource);

    setFormData(prev => ({
      ...prev,
      leadSource: newSource as any,
      netCommission: numPrice > 0 ? String(calculatedNet) : prev.netCommission
    }));
  };

  const handleRecalculateNet = () => {
    const numPrice = Number(formData.price) || 0;
    const numCommPercent = formData.commissionPercent ? Number(formData.commissionPercent) : 2.5;
    const gross = Math.round((numPrice * numCommPercent) / 100);
    const calculatedNet = calculateNetFromGross(gross, formData.leadSource);
    setFormData(prev => ({
      ...prev,
      netCommission: String(calculatedNet)
    }));
  };

  const handleAcceptanceDateChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      acceptanceDate: val,
    }));
  };

  const handleDayChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contingencyDays: {
        ...prev.contingencyDays,
        [key]: value
      }
    }));
  };

  const handleBatchL3ToL8 = (daysVal: string) => {
    setFormData(prev => {
      const updated = { ...prev.contingencyDays };
      ['L3', 'L4', 'L5', 'L6', 'L7', 'L8'].forEach(k => {
        updated[k] = daysVal;
      });
      return {
        ...prev,
        contingencyDays: updated
      };
    });
  };

  const getContingencyExpDate = (daysVal?: string | number) => {
    const daysNum = Number(daysVal) || 0;
    const startDateStr = formData.contingencyStartDate || formData.acceptanceDate;
    if (!startDateStr) return null;
    try {
      const sDate = parseISO(startDateStr);
      if (!isNaN(sDate.getTime())) {
        const rawEnd = addDays(sDate, daysNum);
        const adjustedEnd = adjustWeekendToMonday(rawEnd);
        return format(adjustedEnd, 'MMM d');
      }
    } catch (e) {}
    return null;
  };

  const l3ToL8Keys = ['L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
  const firstL3Val = formData.contingencyDays['L3'] || '';
  const isL3ToL8Synced = l3ToL8Keys.every(k => (formData.contingencyDays[k] || '') === firstL3Val);
  const commonL3ToL8Val = isL3ToL8Synced ? firstL3Val : '';

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-3 pt-12 pb-6 sm:p-6 overflow-hidden">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80dvh] sm:max-h-[88vh]">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e5e5ea] flex items-center justify-between bg-slate-50 shrink-0">
          <h2 className="font-bold text-base sm:text-lg text-[#1d1d1f]">{escrow ? 'Edit Escrow' : 'New Escrow'}</h2>
          <button type="button" onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f] p-1 cursor-pointer"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* MLS Quick-Importer & Auto-Fill Banner */}
          <div className="mb-5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-200/60 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1B3A5C] flex items-center justify-center text-white shrink-0">
                  <FileText size={16} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">MLS Quick-Fill</h4>
              </div>

              {/* Representation Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300/80 p-1 rounded-xl shadow-xs self-start sm:self-auto">
                <span className="text-[11px] font-bold text-slate-600 px-2">Representing:</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, representation: 'Buyer' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.representation === 'Buyer'
                      ? 'bg-[#1B3A5C] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, representation: 'Seller' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.representation === 'Seller'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  Seller
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, representation: 'Dual' }))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.representation === 'Dual'
                      ? 'bg-[#11253C] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Dual
                </button>
              </div>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={e => e.target.files?.[0] && handleProcessFile(e.target.files[0])} 
              accept=".pdf,.txt,.csv" 
              className="hidden" 
            />

            {/* Drop MLS PDF */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all duration-200 ${
                isDragging 
                  ? 'border-[#1B3A5C] bg-[#1B3A5C]/5 scale-[0.99]' 
                  : 'border-slate-300 hover:border-[#1B3A5C]/60 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText size={18} className="text-[#1B3A5C]" />
                <span className="text-xs font-bold text-slate-800">
                  Drop MLS PDF Sheet <span className="text-[#1B3A5C] underline font-normal">(or browse)</span>
                </span>
              </div>
            </div>

            {scanSuccess && (
              <div className="mt-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{scanSuccess}</span>
              </div>
            )}

            {scanError && (
              <div className="mt-2.5 text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <span>{scanError}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Section 1: Property & Financial Terms */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">Property & Transaction Terms</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                  Core Info
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Escrow #</label>
                  <input type="text" value={formData.escrowNumber} onChange={e => setFormData({...formData, escrowNumber: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]">
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">APN # (Parcel ID)</label>
                  <input type="text" value={formData.apn} onChange={e => setFormData({...formData, apn: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Representation</label>
                  <select value={formData.representation} onChange={e => setFormData({...formData, representation: e.target.value as any})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]">
                    <option value="Buyer">Representing Buyer</option>
                    <option value="Seller">Representing Seller</option>
                    <option value="Dual">Representing Dual</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Property Address (Street) *</label>
                    <span className="text-[10px] text-slate-500">Pasting full address auto-fills City & Zip</span>
                  </div>
                  <input 
                    required 
                    type="text" 
                    value={formData.address} 
                    onChange={e => handleAddressInputChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input 
                    type="text" 
                    value={formData.city} 
                    onChange={e => setFormData({...formData, city: e.target.value})} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Zip Code</label>
                    <span className="text-[10px] text-slate-500">Auto-finds CA City</span>
                  </div>
                  <input 
                    type="text" 
                    value={formData.zipCode} 
                    onChange={e => handleZipInputChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
                  <select 
                    value={formData.leadSource} 
                    onChange={e => handleLeadSourceChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                  >
                    <option value="Zillow">Zillow</option>
                    <option value="Self">Self</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Opcity">Opcity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Acceptance Date</label>
                  <input type="date" value={formData.acceptanceDate || ''} onChange={e => handleAcceptanceDateChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">COE Date</label>
                  <input type="date" value={formData.coeDate || ''} onChange={e => setFormData({...formData, coeDate: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sale Price ($)</label>
                  <input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => handlePriceChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Gross Commission (%)</label>
                    {Boolean(formData.price && formData.commissionPercent && Number(formData.price) > 0) && (
                      <span className="text-[10px] font-bold text-slate-500 font-mono">
                        Gross: ${Math.round((Number(formData.price) * Number(formData.commissionPercent)) / 100).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formData.commissionPercent} 
                    onChange={e => handleCommissionPercentChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Net Commission ($)</label>
                    <button
                      type="button"
                      onClick={handleRecalculateNet}
                      className="text-[11px] text-[#1B3A5C] hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-md hover:bg-slate-100"
                      title="Recalculate from formula"
                    >
                      <RefreshCw size={11} />
                      <span>Auto-Calculate</span>
                    </button>
                  </div>
                  <input 
                    type="number" 
                    value={formData.netCommission} 
                    onChange={e => setFormData({...formData, netCommission: e.target.value})} 
                    className="w-full bg-emerald-50/30 border border-emerald-300 text-emerald-950 font-mono font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600" 
                  />
                </div>

                {/* Live Formula & Calculation Breakdown Card */}
                {(() => {
                  const commBreakdown = calculateCommissionBreakdown(
                    Number(formData.price) || 0,
                    Number(formData.commissionPercent) || 0,
                    formData.leadSource
                  );
                  return (
                    <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-xl p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200/70">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Calculator size={13} className="text-[#1B3A5C]" />
                          <span>Lead Source Formula:</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#1B3A5C]/10 text-[#1B3A5C] font-bold text-[11px]">
                            {getFormulaLabel(formData.leadSource)}
                          </span>
                        </div>
                        {Number(formData.price) > 0 && Number(formData.commissionPercent) > 0 && (
                          <span className="text-[11px] font-bold text-emerald-700 font-mono bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            Calculated Net: ${commBreakdown.netCommission.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {Number(formData.price) > 0 && Number(formData.commissionPercent) > 0 ? (
                        <div className="pt-2 text-[11px] text-slate-600 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
                          {commBreakdown.steps.map((step, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1">
                              {idx > 0 && <span className="text-slate-400">→</span>}
                              <span className={idx === commBreakdown.steps.length - 1 ? 'font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200' : ''}>
                                {step}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="pt-1.5 text-[11px] text-slate-500 italic">
                          Enter Sale Price and Gross Commission % to see instant automated breakdown.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Section 2: Primary Client (Client 1) */}
            <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/70">
                <div>
                  <h3 className="text-sm font-bold text-blue-950">Client 1 (Primary)</h3>
                  <p className="text-[11px] text-blue-700/80">Main buyer or seller contact</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                  Primary Client
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 First Name *</label>
                  <input required type="text" value={formData.clientFirstName} onChange={e => setFormData({...formData, clientFirstName: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Last Name *</label>
                  <input required type="text" value={formData.clientLastName} onChange={e => setFormData({...formData, clientLastName: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Phone</label>
                  <input type="tel" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Email</label>
                  <input type="email" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Birthday</label>
                  <input type="date" value={formData.clientBirthday || ''} onChange={e => setFormData({...formData, clientBirthday: e.target.value})} className="w-full md:w-1/2 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Section 3: Client Number 2 (Optional) */}
            <div className="bg-purple-50/40 border border-purple-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200/70">
                <div>
                  <h3 className="text-sm font-bold text-purple-950">Client 2 (Optional)</h3>
                  <p className="text-[11px] text-purple-700/80">Co-buyer, spouse, or secondary signer</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold uppercase tracking-wider">
                  Secondary Client
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 First Name</label>
                  <input type="text" value={formData.client2FirstName} onChange={e => setFormData({...formData, client2FirstName: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Last Name</label>
                  <input type="text" value={formData.client2LastName} onChange={e => setFormData({...formData, client2LastName: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Phone</label>
                  <input type="tel" value={formData.client2Phone} onChange={e => setFormData({...formData, client2Phone: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Email</label>
                  <input type="email" value={formData.client2Email} onChange={e => setFormData({...formData, client2Email: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Birthday</label>
                  <input type="date" value={formData.client2Birthday || ''} onChange={e => setFormData({...formData, client2Birthday: e.target.value})} className="w-full md:w-1/2 bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
              </div>
            </div>

            {/* Section 4: Other Agent & Cooperating Brokerage */}
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">Other Agent & Cooperating Brokerage</h3>
                  <p className="text-[11px] text-emerald-700/80">Cross agent on the other side of transaction</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                  Other Agent
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Other Agent Name</label>
                  <input type="text" value={formData.agentName} onChange={e => setFormData({...formData, agentName: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Cooperating Brokerage</label>
                  <input type="text" value={formData.cooperatingBrokerage} onChange={e => setFormData({...formData, cooperatingBrokerage: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Other Agent Phone</label>
                  <input type="tel" value={formData.agentPhone} onChange={e => setFormData({...formData, agentPhone: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Other Agent Email</label>
                  <input type="email" value={formData.agentEmail} onChange={e => setFormData({...formData, agentEmail: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>
              </div>
            </div>

            {/* Section 5: Lender Details */}
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">Lender</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                    Lender
                  </span>
                </div>
                <PartnerDropdown
                  category="lender"
                  categoryLabel="Lender"
                  partners={partners}
                  onAddNew={addPartner}
                  onDelete={deletePartner}
                  onSelect={(p: PreferredPartner) => {
                    setFormData(prev => ({
                      ...prev,
                      lenderName: p.company || p.name,
                      lenderPhone: p.phone,
                      lenderEmail: p.email,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender / Bank Name</label>
                  <input type="text" value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender Phone</label>
                  <input type="tel" value={formData.lenderPhone} onChange={e => setFormData({...formData, lenderPhone: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender Email</label>
                  <input type="email" value={formData.lenderEmail} onChange={e => setFormData({...formData, lenderEmail: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>
            </div>

            {/* Section 6: Escrow Company & Officer */}
            <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-indigo-950">Escrow</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                    Escrow
                  </span>
                </div>
                <PartnerDropdown
                  category="escrow"
                  categoryLabel="Escrow"
                  partners={partners}
                  onAddNew={addPartner}
                  onDelete={deletePartner}
                  onSelect={(p: PreferredPartner) => {
                    setFormData(prev => ({
                      ...prev,
                      escrowCompany: p.company,
                      escrowOfficer: p.name,
                      escrowPhone: p.phone,
                      escrowEmail: p.email,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Company Name</label>
                  <input type="text" value={formData.escrowCompany} onChange={e => setFormData({...formData, escrowCompany: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Officer Name</label>
                  <input type="text" value={formData.escrowOfficer} onChange={e => setFormData({...formData, escrowOfficer: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Phone</label>
                  <input type="tel" value={formData.escrowPhone} onChange={e => setFormData({...formData, escrowPhone: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Officer Email</label>
                  <input type="email" value={formData.escrowEmail} onChange={e => setFormData({...formData, escrowEmail: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            {/* Section 7: Title Company Details */}
            <div className="bg-cyan-50/40 border border-cyan-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-200/70">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-cyan-950">Title</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 text-[10px] font-bold uppercase tracking-wider">
                    Title
                  </span>
                </div>
                <PartnerDropdown
                  category="title"
                  categoryLabel="Title"
                  partners={partners}
                  onAddNew={addPartner}
                  onDelete={deletePartner}
                  onSelect={(p: PreferredPartner) => {
                    setFormData(prev => ({
                      ...prev,
                      titleCompany: p.company,
                      titleOfficer: p.name,
                      titlePhone: p.phone,
                      titleEmail: p.email,
                    }));
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-cyan-950 mb-1">Title Company Name</label>
                  <input type="text" value={formData.titleCompany} onChange={e => setFormData({...formData, titleCompany: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-950 mb-1">Title Officer / Contact Name</label>
                  <input type="text" value={formData.titleOfficer} onChange={e => setFormData({...formData, titleOfficer: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-950 mb-1">Title Phone</label>
                  <input type="tel" value={formData.titlePhone} onChange={e => setFormData({...formData, titlePhone: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-cyan-950 mb-1">Title Email</label>
                  <input type="email" value={formData.titleEmail} onChange={e => setFormData({...formData, titleEmail: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>
              </div>
            </div>

            {/* Section 8: Collaborator & Notes */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">Collaborator & Notes</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                  Internal
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Collaborator / Co-Agent</label>
                  <input type="text" value={formData.collaborator} onChange={e => setFormData({...formData, collaborator: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Notes</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>
              </div>
            </div>

            {/* Section 9: Contingency Days Timeline */}
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Contingency Milestones</h3>
                  <p className="text-[11px] text-slate-500">Timeline days automatically calculate weekend-adjusted due dates</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Saturday / Sunday rollover to Monday</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contingencies Start Date</label>
                <input 
                  type="date" 
                  value={formData.contingencyStartDate || ''} 
                  onChange={e => setFormData({...formData, contingencyStartDate: e.target.value})} 
                  className="w-full sm:w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave empty to default to Acceptance Date.</p>
              </div>

              {/* Financing Contingencies: L1 (Loan) & L2 (Appraisal) */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* L1 Loan */}
                  {(() => {
                    const c = CONTINGENCIES.find(item => item.key === 'L1') || { key: 'L1', label: 'Loan' };
                    const exp = getContingencyExpDate(formData.contingencyDays['L1']);
                    const currentVal = formData.contingencyDays['L1'] || '';
                    return (
                      <div className="bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 space-y-2 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-[#1B3A5C] shrink-0" />
                            <span className="text-xs font-bold text-slate-900">{c.key} - {c.label}</span>
                          </div>
                          {exp && (
                            <span className="text-[10px] font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-2 py-0.5 rounded-md">
                              {exp}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-0.5">
                          <div className="flex items-center gap-1">
                            {['14', '17', '21'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleDayChange('L1', p)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  currentVal === p 
                                    ? 'bg-[#1B3A5C] text-white' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {p}d
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-1.5 py-0.5 shadow-2xs focus-within:border-[#1B3A5C]">
                            <input 
                              type="number"
                              value={currentVal}
                              onChange={e => handleDayChange('L1', e.target.value)}
                              className="w-8 text-center font-bold text-xs text-slate-900 bg-transparent focus:outline-none"
                              min="0"
                            />
                            <span className="text-[10px] text-slate-400 select-none">d</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* L2 Appraisal */}
                  {(() => {
                    const c = CONTINGENCIES.find(item => item.key === 'L2') || { key: 'L2', label: 'Appraisal' };
                    const exp = getContingencyExpDate(formData.contingencyDays['L2']);
                    const currentVal = formData.contingencyDays['L2'] || '';
                    return (
                      <div className="bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 space-y-2 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-900">{c.key} - {c.label}</span>
                          </div>
                          {exp && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              {exp}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-0.5">
                          <div className="flex items-center gap-1">
                            {['10', '14', '17'].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => handleDayChange('L2', p)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  currentVal === p 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {p}d
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-1.5 py-0.5 shadow-2xs focus-within:border-indigo-500">
                            <input 
                              type="number"
                              value={currentVal}
                              onChange={e => handleDayChange('L2', e.target.value)}
                              className="w-8 text-center font-bold text-xs text-slate-900 bg-transparent focus:outline-none"
                              min="0"
                            />
                            <span className="text-[10px] text-slate-400 select-none">d</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Contingencies (L3–L8) with Minimalist Quick Batch Setter */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">
                    Contingencies (L3 – L8)
                  </div>
                  
                  {/* Minimalist Batch Setter */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600">Set all L3–L8:</span>
                    <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-0.5 shadow-2xs focus-within:border-[#1B3A5C] focus-within:bg-white">
                      <input 
                        type="number"
                        value={commonL3ToL8Val}
                        placeholder={isL3ToL8Synced ? '' : 'Mix'}
                        onChange={e => handleBatchL3ToL8(e.target.value)}
                        className="w-9 text-center font-bold text-xs text-[#1B3A5C] bg-transparent focus:outline-none"
                        min="0"
                      />
                      <span className="text-[10px] text-slate-400 pr-0.5 select-none">d</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {['7', '10', '14', '17'].map(preset => {
                        const isActive = isL3ToL8Synced && commonL3ToL8Val === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleBatchL3ToL8(preset)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-[#1B3A5C] text-white shadow-2xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/60'
                            }`}
                          >
                            {preset}d
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Individual L3-L8 items with direct editable inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {['L3', 'L4', 'L5', 'L6', 'L7', 'L8'].map(key => {
                    const c = CONTINGENCIES.find(item => item.key === key) || { key, label: key };
                    const exp = getContingencyExpDate(formData.contingencyDays[key]);
                    const currentVal = formData.contingencyDays[key] ?? '';

                    return (
                      <div 
                        key={key} 
                        className="flex items-center justify-between gap-1.5 bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 transition-all"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 truncate" title={`${c.key} - ${c.label}`}>
                            <span className="font-bold text-slate-900">{c.key}</span> {c.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {exp && (
                            <span className="text-[10px] font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-1.5 py-0.5 rounded-md">
                              {exp}
                            </span>
                          )}
                          <div className="flex items-center bg-white border border-slate-300 rounded-md px-1 py-0.5 shadow-2xs focus-within:border-[#1B3A5C]">
                            <input 
                              type="number" 
                              value={currentVal} 
                              onChange={e => handleDayChange(key, e.target.value)} 
                              className="w-7 text-center font-bold text-xs text-slate-900 focus:outline-none bg-transparent" 
                              min="0"
                            />
                            <span className="text-[9px] text-slate-400 select-none">d</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optional: L9 (COP - Contingency of Sale) with Active Toggle (Off by default) */}
              <div className={`border rounded-xl p-3 transition-all ${
                l9Enabled 
                  ? 'bg-white border-purple-200 shadow-2xs' 
                  : 'bg-slate-50/80 border-dashed border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={l9Enabled}
                      onClick={() => {
                        const nextVal = !l9Enabled;
                        setL9Enabled(nextVal);
                        if (nextVal && !formData.contingencyDays['L9']) {
                          handleDayChange('L9', '7');
                        }
                      }}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                        l9Enabled ? 'bg-purple-600' : 'bg-slate-300 hover:bg-slate-400'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        l9Enabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`w-1.5 h-1.5 rounded-full ${l9Enabled ? 'bg-purple-500' : 'bg-slate-400'}`} />
                      <span className={`text-xs font-bold ${l9Enabled ? 'text-slate-900' : 'text-slate-600'}`}>
                        L9 - COP
                      </span>
                      <span className="text-[11px] text-slate-400">(Contingency of Sale)</span>
                      {!l9Enabled && (
                        <span className="text-[10px] text-slate-400 font-medium italic ml-0.5">
                          — Off by default (click toggle to activate)
                        </span>
                      )}
                    </div>
                  </div>

                  {l9Enabled && (
                    <div className="flex items-center gap-2 flex-wrap pl-11 sm:pl-0">
                      {(() => {
                        const exp = getContingencyExpDate(formData.contingencyDays['L9']);
                        return exp ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            {exp}
                          </span>
                        ) : null;
                      })()}
                      
                      <div className="flex items-center gap-1">
                        {['7', '10', '14', '17'].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handleDayChange('L9', p)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              formData.contingencyDays['L9'] === p 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {p}d
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center bg-white border border-purple-300 rounded-lg px-1.5 py-0.5 shadow-2xs focus-within:border-purple-600 focus-within:ring-1 focus-within:ring-purple-600">
                        <input 
                          type="number"
                          value={formData.contingencyDays['L9'] ?? '7'}
                          onChange={e => handleDayChange('L9', e.target.value)}
                          className="w-8 text-center font-bold text-xs text-purple-900 bg-transparent focus:outline-none"
                          min="0"
                        />
                        <span className="text-[10px] text-purple-400 select-none">d</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e5e5ea] bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold border border-[#e5e5ea] text-[#86868b] hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold bg-[#1B3A5C] hover:bg-[#11253C] text-white active:scale-95 shadow-sm transition-all">
            Save Escrow
          </button>
        </div>
      </form>
    </div>
  );
}
