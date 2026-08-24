import React, { useState, useEffect, useRef } from 'react';
import { Escrow, EscrowDocument, CONTINGENCIES, adjustWeekendToMonday, parseAddressComponents } from '../../types';
import { X, Sparkles, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { addMonths, addDays, parseISO, format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { usePreferredPartners } from '../../hooks/usePreferredPartners';
import { PartnerDropdown } from '../common/PartnerDropdown';
import { PreferredPartner } from '../../types/partners';
import { parseFullEscrowRPA } from '../../services/geminiService';

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

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    lastFileRef.current = file;
    setIsScanning(true);
    setScanError('');
    setScanSuccess('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;

          let data: any = null;

          // Step 1: Call backend /api/scan-rpa endpoint
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);

            const res = await fetch('/api/scan-rpa', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                fileData: result,
                mimeType: file.type || 'application/pdf',
                fileName: file.name,
                userRole: formData.representation,
              }),
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const json = await res.json();
              if (json && json.success && json.data) {
                data = json.data;
              }
            }
          } catch (serverErr) {
            console.warn('Backend /api/scan-rpa route unreachable, attempting fallback:', serverErr);
          }

          // Step 2: Fallback to direct Gemini extraction if backend didn't return data
          if (!data || (!data.address && !data.price && !data.clientLastName)) {
            data = await parseFullEscrowRPA(
              result,
              file.type || 'application/pdf',
              file.name
            );
          }

          if (!data || (!data.address && !data.price && !data.clientLastName && !data.escrowNumber)) {
            throw new Error('Unable to extract transaction details from this document. Please check the document or fill the fields directly.');
          }

          // Automatically prepare the scanned file as an attached document
          const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          let fileDownloadUrl = '';

          if (user) {
            try {
              const storageRef = ref(storage, `users/${user.uid}/uploads/${docId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
              await uploadBytes(storageRef, file);
              fileDownloadUrl = await getDownloadURL(storageRef);
            } catch (storageErr) {
              console.warn('Storage upload error for scanned RPA:', storageErr);
            }
          }

          // Fallback: If not logged in, or storage fails, only store base64 if small (< 64KB), otherwise use '#'
          const docUrl = fileDownloadUrl || (result.length < 65000 ? result : '#');

          const newDoc: EscrowDocument = {
            id: docId,
            name: file.name || 'Purchase Agreement (RPA)',
            type: 'Purchase Agreement',
            url: docUrl,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          };
          setPendingDoc(newDoc);

          // Helper to safely parse and format ISO dates without throwing
          const safeIsoDate = (val?: string): string => {
            if (!val || typeof val !== 'string') return '';
            const t = val.trim();
            if (!t || t === 'N/A' || t === 'TBD' || t === 'null' || t === 'undefined') return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) {
              const [m, d, y] = t.split('/');
              return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            try {
              const parsed = new Date(t);
              if (!isNaN(parsed.getTime())) {
                return format(parsed, 'yyyy-MM-dd');
              }
            } catch {}
            return '';
          };

          // Smart Role Mapping (Buyer vs Seller vs Dual)
          const isRepresentingSeller = formData.representation === 'Seller' || data.representation === 'Seller';

          let clientFirst = data.clientFirstName || '';
          let clientLast = data.clientLastName || '';
          let client2First = data.client2FirstName || '';
          let client2Last = data.client2LastName || '';

          if (isRepresentingSeller && data.seller1Name) {
            const sellerParts = (data.seller1Name || '').trim().split(' ');
            clientFirst = sellerParts[0] || '';
            clientLast = sellerParts.slice(1).join(' ') || '';
            if (data.seller2Name) {
              const s2Parts = (data.seller2Name || '').trim().split(' ');
              client2First = s2Parts[0] || '';
              client2Last = s2Parts.slice(1).join(' ') || '';
            }
          } else if (!isRepresentingSeller && data.buyer1Name && !clientFirst) {
            const buyerParts = (data.buyer1Name || '').trim().split(' ');
            clientFirst = buyerParts[0] || '';
            clientLast = buyerParts.slice(1).join(' ') || '';
            if (data.buyer2Name) {
              const b2Parts = (data.buyer2Name || '').trim().split(' ');
              client2First = b2Parts[0] || '';
              client2Last = b2Parts.slice(1).join(' ') || '';
            }
          }

          // Identify the Cooperating (Other Side) Agent
          let coopAgentName = data.agentName || '';
          let coopAgentPhone = data.agentPhone || '';
          let coopAgentEmail = data.agentEmail || '';
          let coopBrokerage = data.cooperatingBrokerage || '';

          if (isRepresentingSeller) {
            if (data.buyerAgentName) coopAgentName = data.buyerAgentName;
            if (data.buyerAgentPhone) coopAgentPhone = data.buyerAgentPhone;
            if (data.buyerAgentEmail) coopAgentEmail = data.buyerAgentEmail;
            if (data.buyerBrokerage) coopBrokerage = data.buyerBrokerage;
          } else {
            if (data.listingAgentName) coopAgentName = data.listingAgentName;
            if (data.listingAgentPhone) coopAgentPhone = data.listingAgentPhone;
            if (data.listingAgentEmail) coopAgentEmail = data.listingAgentEmail;
            if (data.listingBrokerage) coopBrokerage = data.listingBrokerage;
          }

          // Calculate or adjust COE date based on 3B days & weekend rule
          let computedCoeDate = safeIsoDate(data.coeDate);
          const parsedAcceptanceDate = safeIsoDate(data.acceptanceDate);
          const baseAcceptanceDate = parsedAcceptanceDate || safeIsoDate(data.contingencyStartDate) || formData.acceptanceDate || format(new Date(), 'yyyy-MM-dd');

          if (data.coeDays && baseAcceptanceDate) {
            try {
              const baseDateObj = parseISO(baseAcceptanceDate);
              if (!isNaN(baseDateObj.getTime())) {
                const rawDate = addDays(baseDateObj, Number(data.coeDays));
                const adjustedDate = adjustWeekendToMonday(rawDate);
                computedCoeDate = format(adjustedDate, 'yyyy-MM-dd');
              }
            } catch (err) {
              console.warn('Error calculating COE date from days:', err);
            }
          } else if (computedCoeDate) {
            try {
              const parsed = parseISO(computedCoeDate);
              if (!isNaN(parsed.getTime())) {
                const dayOfWeek = parsed.getDay();
                if (dayOfWeek === 6 || dayOfWeek === 0) {
                  const adjusted = adjustWeekendToMonday(parsed);
                  computedCoeDate = format(adjusted, 'yyyy-MM-dd');
                }
              }
            } catch (err) {
              // keep as is
            }
          }

          setFormData((prev) => ({
            ...prev,
            escrowNumber: data.escrowNumber || prev.escrowNumber,
            apn: data.apn || prev.apn,
            escrowCompany: data.escrowCompany || prev.escrowCompany,
            address: data.address || prev.address,
            city: data.city || prev.city,
            zipCode: data.zipCode || prev.zipCode,
            clientFirstName: clientFirst || data.clientFirstName || prev.clientFirstName,
            clientLastName: clientLast || data.clientLastName || prev.clientLastName,
            clientPhone: data.clientPhone || prev.clientPhone,
            clientEmail: data.clientEmail || prev.clientEmail,
            clientBirthday: safeIsoDate(data.clientBirthday) || prev.clientBirthday,
            client2FirstName: client2First || data.client2FirstName || prev.client2FirstName,
            client2LastName: client2Last || data.client2LastName || prev.client2LastName,
            client2Phone: data.client2Phone || prev.client2Phone,
            client2Email: data.client2Email || prev.client2Email,
            collaborator: data.collaborator || prev.collaborator,
            agentName: coopAgentName || prev.agentName,
            agentPhone: coopAgentPhone || prev.agentPhone,
            agentEmail: coopAgentEmail || prev.agentEmail,
            cooperatingBrokerage: coopBrokerage || prev.cooperatingBrokerage,
            escrowOfficer: data.escrowOfficer || prev.escrowOfficer,
            escrowPhone: data.escrowPhone || prev.escrowPhone,
            escrowEmail: data.escrowEmail || prev.escrowEmail,
            titleCompany: data.titleCompany || prev.titleCompany,
            titleOfficer: data.titleOfficer || prev.titleOfficer,
            titlePhone: data.titlePhone || prev.titlePhone,
            titleEmail: data.titleEmail || prev.titleEmail,
            lenderName: data.lenderName || prev.lenderName,
            lenderPhone: data.lenderPhone || prev.lenderPhone,
            lenderEmail: data.lenderEmail || prev.lenderEmail,
            price: data.price ? data.price.toString() : prev.price,
            commissionPercent: data.commissionPercent ? data.commissionPercent.toString() : prev.commissionPercent,
            netCommission: data.netCommission ? data.netCommission.toString() : prev.netCommission,
            acceptanceDate: parsedAcceptanceDate || prev.acceptanceDate,
            coeDate: computedCoeDate || safeIsoDate(data.coeDate) || prev.coeDate,
            contingencyStartDate: safeIsoDate(data.contingencyStartDate) || parsedAcceptanceDate || prev.contingencyStartDate,
            representation: (data.representation as any) || prev.representation,
            leadSource: (data.leadSource as any) || prev.leadSource,
            status: (data.status as any) || prev.status,
            notes: data.notes ? (prev.notes ? `${prev.notes}\n\n${data.notes}` : data.notes) : prev.notes,
            contingencyDays: data.contingencyDays
              ? {
                  ...prev.contingencyDays,
                  ...Object.fromEntries(
                    Object.entries(data.contingencyDays)
                      .filter(([_, v]) => v !== undefined && v !== null)
                      .map(([k, v]) => [k, String(v)])
                  ),
                }
              : prev.contingencyDays,
          }));

          setScanSuccess('Document has been extracted.');
        } catch (err: any) {
          setScanError(err.message || 'Failed to scan document.');
        } finally {
          setIsScanning(false);
        }
      };
      reader.onerror = () => {
        setScanError('Failed to read selected file.');
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setScanError(err.message || 'Failed to process file.');
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
    } else {
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

  const contingencyList = CONTINGENCIES.filter(c => ['L1','L2','L3','L4','L5','L6','L7','L8','L9'].includes(c.key));

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-3 pt-12 pb-6 sm:p-6 overflow-hidden">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80dvh] sm:max-h-[88vh]">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e5e5ea] flex items-center justify-between bg-slate-50 shrink-0">
          <h2 className="font-bold text-base sm:text-lg text-[#1d1d1f]">{escrow ? 'Edit Escrow' : 'New Escrow'}</h2>
          <button type="button" onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f] p-1 cursor-pointer"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* AI Contract / MLS Document Scanner Banner */}
          <div className="mb-5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-200/60 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-3 border-b border-blue-100">
              <div className="flex items-center gap-2.5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Document Scanner</h4>
                </div>
              </div>

              {/* Explicit Representation Selector for Scanner Guidance */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300/80 p-1 rounded-xl shadow-xs self-start sm:self-auto">
                <span className="text-[11px] font-bold text-slate-600 px-2">I am representing:</span>
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
              accept=".pdf,image/png,image/jpeg,image/webp" 
              className="hidden" 
            />

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                isDragging 
                  ? 'border-[#1B3A5C] bg-[#1B3A5C]/5 scale-[0.99]' 
                  : 'border-slate-300 hover:border-[#1B3A5C]/60 bg-white/70 hover:bg-white'
              }`}
            >
              {isScanning ? (
                <div className="py-2 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-[#1B3A5C]" size={24} />
                  <span className="text-xs font-bold text-slate-800">Analyzing California RPA & Broker Confirmation pages...</span>
                  <span className="text-[10px] text-slate-500">Extracting Paragraph 3 Grid (Price, COE, Contingencies, APN) and Contact info</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                    <UploadCloud size={20} />
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="text-xs font-bold text-slate-800">
                      Drop signed California RPA (or MLS Sheet) PDF here, or <span className="text-[#1B3A5C] underline">browse</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {scanSuccess && (
              <div className="mt-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2">
                <span>{scanSuccess}</span>
              </div>
            )}

            {scanError && (
              <div className="mt-2.5 flex items-center justify-between gap-2 text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                  <span>{scanError}</span>
                </div>
                {lastFileRef.current && (
                  <button
                    type="button"
                    onClick={() => lastFileRef.current && handleProcessFile(lastFileRef.current)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    <RefreshCw size={12} />
                    <span>Retry Scan</span>
                  </button>
                )}
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
                  <input type="text" placeholder="e.g. 98453-PC" value={formData.escrowNumber} onChange={e => setFormData({...formData, escrowNumber: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
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
                  <input type="text" placeholder="e.g. 402-192-14" value={formData.apn} onChange={e => setFormData({...formData, apn: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Property Address (Street) *</label>
                  <input required type="text" placeholder="e.g. 1206 Louise St" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input type="text" placeholder="e.g. Santa Ana" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zip Code</label>
                  <input type="text" placeholder="e.g. 92703" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lead Source</label>
                  <select value={formData.leadSource} onChange={e => setFormData({...formData, leadSource: e.target.value as any})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]">
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
                  <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 750000" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gross Commission (%)</label>
                  <input type="number" step="0.01" value={formData.commissionPercent} onChange={e => setFormData({...formData, commissionPercent: e.target.value})} placeholder="e.g. 2.5" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Net Commission ($)</label>
                  <input type="number" value={formData.netCommission} onChange={e => setFormData({...formData, netCommission: e.target.value})} placeholder="e.g. 18750" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>
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
                  <input required type="text" placeholder="First name" value={formData.clientFirstName} onChange={e => setFormData({...formData, clientFirstName: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Last Name *</label>
                  <input required type="text" placeholder="Last name" value={formData.clientLastName} onChange={e => setFormData({...formData, clientLastName: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Phone</label>
                  <input type="tel" value={formData.clientPhone} placeholder="e.g. 310-555-0100" onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Email</label>
                  <input type="email" value={formData.clientEmail} placeholder="e.g. client@email.com" onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
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
                  <input type="text" placeholder="First name" value={formData.client2FirstName} onChange={e => setFormData({...formData, client2FirstName: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Last Name</label>
                  <input type="text" placeholder="Last name" value={formData.client2LastName} onChange={e => setFormData({...formData, client2LastName: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Phone</label>
                  <input type="tel" value={formData.client2Phone} placeholder="e.g. 310-555-0200" onChange={e => setFormData({...formData, client2Phone: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Email</label>
                  <input type="email" value={formData.client2Email} placeholder="e.g. client2@email.com" onChange={e => setFormData({...formData, client2Email: e.target.value})} className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
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
                  <input type="text" placeholder="e.g. John Doe" value={formData.agentName} onChange={e => setFormData({...formData, agentName: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Cooperating Brokerage</label>
                  <input type="text" value={formData.cooperatingBrokerage} placeholder="e.g. Compass, Coldwell Banker" onChange={e => setFormData({...formData, cooperatingBrokerage: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Other Agent Phone</label>
                  <input type="tel" value={formData.agentPhone} placeholder="e.g. 310-555-0155" onChange={e => setFormData({...formData, agentPhone: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">Other Agent Email</label>
                  <input type="email" value={formData.agentEmail} placeholder="e.g. agent@brokerage.com" onChange={e => setFormData({...formData, agentEmail: e.target.value})} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
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
                  <input type="text" value={formData.lenderName} placeholder="e.g. Chase Mortgage, LoanDepot" onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender Phone</label>
                  <input type="tel" value={formData.lenderPhone} placeholder="e.g. 555-0100" onChange={e => setFormData({...formData, lenderPhone: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender Email</label>
                  <input type="email" value={formData.lenderEmail} placeholder="e.g. loan.officer@lender.com" onChange={e => setFormData({...formData, lenderEmail: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
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
                  <input type="text" placeholder="e.g. Orange County Escrow, First Class Escrow" value={formData.escrowCompany} onChange={e => setFormData({...formData, escrowCompany: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Officer Name</label>
                  <input type="text" placeholder="e.g. Sarah Jenkins" value={formData.escrowOfficer} onChange={e => setFormData({...formData, escrowOfficer: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Phone</label>
                  <input type="tel" placeholder="e.g. 714-555-0144" value={formData.escrowPhone} onChange={e => setFormData({...formData, escrowPhone: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Officer Email</label>
                  <input type="email" placeholder="e.g. escrow@ocescrow.com" value={formData.escrowEmail} onChange={e => setFormData({...formData, escrowEmail: e.target.value})} className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
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
                  <input type="text" placeholder="e.g. First American Title, Lawyers Title" value={formData.titleCompany} onChange={e => setFormData({...formData, titleCompany: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-950 mb-1">Title Officer / Contact Name</label>
                  <input type="text" placeholder="e.g. Jane Doe" value={formData.titleOfficer} onChange={e => setFormData({...formData, titleOfficer: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-950 mb-1">Title Phone</label>
                  <input type="tel" placeholder="e.g. 714-555-0199" value={formData.titlePhone} onChange={e => setFormData({...formData, titlePhone: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-cyan-950 mb-1">Title Email</label>
                  <input type="email" placeholder="e.g. title@company.com" value={formData.titleEmail} onChange={e => setFormData({...formData, titleEmail: e.target.value})} className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
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
                  <input type="text" placeholder="e.g. Team Partner Name" value={formData.collaborator} onChange={e => setFormData({...formData, collaborator: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Notes</label>
                  <textarea rows={3} placeholder="Enter any internal notes or instructions..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>
              </div>
            </div>

            {/* Section 9: Contingency Days Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">Contingency Milestones</h3>
                <span className="text-[11px] text-slate-400 font-normal italic">
                  click days to edit
                </span>
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

              <div className="flex flex-wrap gap-2 pt-1">
                {contingencyList.map(c => {
                  const isLoan = c.key === 'L1';
                  const isAppraisal = c.key === 'L2';
                  const dotColor = isLoan ? 'bg-[#1B3A5C]' : isAppraisal ? 'bg-indigo-500' : 'bg-amber-500';
                  
                  const daysNum = Number(formData.contingencyDays[c.key]) || 0;
                  const startDateStr = formData.contingencyStartDate || formData.acceptanceDate;
                  let expDateStr = '';
                  if (startDateStr) {
                    try {
                      const sDate = parseISO(startDateStr);
                      if (!isNaN(sDate.getTime())) {
                        const rawEnd = addDays(sDate, daysNum);
                        const adjustedEnd = adjustWeekendToMonday(rawEnd);
                        expDateStr = format(adjustedEnd, 'MMM d');
                      }
                    } catch (e) {}
                  }

                  return (
                    <div 
                      key={c.key} 
                      className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-full pl-3 pr-2 py-1 transition-all"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="text-xs font-medium text-[#48484a]">{c.key} - {c.label}</span>
                      {expDateStr && (
                        <span className="text-[10px] font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-1.5 py-0.5 rounded-md">
                          {expDateStr}
                        </span>
                      )}
                      <div className="flex items-center bg-white border border-[#e5e5ea] rounded-md px-1 py-0.5 ml-1 shadow-xs focus-within:border-[#1B3A5C]">
                        <input 
                          type="number" 
                          value={formData.contingencyDays[c.key] || ''} 
                          onChange={e => handleDayChange(c.key, e.target.value)} 
                          className="w-10 text-center font-bold text-xs text-[#1d1d1f] focus:outline-none bg-transparent" 
                          placeholder="0"
                          min="0"
                        />
                        <span className="text-[10px] text-slate-400 pr-1 select-none">d</span>
                      </div>
                    </div>
                  );
                })}
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
