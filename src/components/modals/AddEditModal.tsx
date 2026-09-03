import React, { useState, useEffect, useRef } from 'react';
import { Escrow, EscrowDocument, CONTINGENCIES, adjustWeekendToMonday, parseAddressComponents } from '../../types';
import { X, FileText, CheckCircle2, Calculator, Sparkles, RefreshCw, Info, Paperclip } from 'lucide-react';
import { addMonths, addDays, parseISO, format, differenceInCalendarDays } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { usePreferredPartners } from '../../hooks/usePreferredPartners';
import { PartnerDropdown } from '../common/PartnerDropdown';
import { QuickPasteContact } from '../common/QuickPasteContact';
import { cleanEmail } from '../../utils/contactParser';
import { PreferredPartner } from '../../types/partners';
import { parseMlsText } from '../../utils/mlsParser';
import { extractPdfPagesText, parseCaliforniaRpaText } from '../../utils/clientRpaParser';
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
  const [pendingDocs, setPendingDocs] = useState<EscrowDocument[]>([]);
  const [l9Enabled, setL9Enabled] = useState(() => Boolean(escrow?.contingencyDays?.['L9'] && Number(escrow?.contingencyDays?.['L9']) > 0));

  const [formData, setFormData] = useState(() => {
    return {
      escrowNumber: '',
      mlsId: '',
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
      lenderCompany: '',
      lenderPhone: '',
      lenderEmail: '',
      price: '',
      netCommission: '',
      commissionPercent: '',
      acceptanceDate: '',
      coeDate: '',
      coeDays: '30',
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
    // Check if this looks like a pasted multi-component address (has comma, or California zip code with CA)
    const hasComma = rawVal.includes(',');
    const hasFullPastedFormat = hasComma || /\b(?:CA|California)\s+\d{5}\b/i.test(rawVal);

    if (hasFullPastedFormat) {
      const parsed = parseAddressComponents(rawVal);
      
      // Check if zip was in the address string and can resolve city
      let derivedCity = parsed.city;
      if (!derivedCity && parsed.zipCode) {
        const cityLookup = getCityFromZip(parsed.zipCode);
        if (cityLookup) derivedCity = cityLookup;
      }

      if (parsed.city || parsed.zipCode) {
        setFormData(prev => ({
          ...prev,
          address: parsed.address || rawVal,
          city: derivedCity ? derivedCity : prev.city,
          zipCode: parsed.zipCode ? parsed.zipCode : prev.zipCode,
        }));
        return;
      }
    }

    // Normal typing: keep rawVal exactly as typed so spaces, numbers, and words are fully preserved
    setFormData(prev => ({
      ...prev,
      address: rawVal,
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

  // Email auto-clean helper: cleans "email:", "mailto:", etc. when typing, pasting, or leaving email inputs
  const handleEmailInputChange = (fieldName: 'agentEmail' | 'lenderEmail' | 'escrowEmail' | 'titleEmail' | 'clientEmail' | 'client2Email', rawVal: string) => {
    let cleaned = rawVal;
    if (/^\s*(?:(?:other\s+agent|agent|escrow|escrow\s+officer|title|title\s+officer|lender|loan\s+officer|mortgage|client|buyer|seller)\s*)?(?:e-?mail|mail|mailto)\s*[:\-–]\s*/i.test(cleaned)) {
      cleaned = cleanEmail(cleaned);
    }
    setFormData(prev => ({
      ...prev,
      [fieldName]: cleaned,
    }));
  };

  const handleEmailInputPaste = (fieldName: 'agentEmail' | 'lenderEmail' | 'escrowEmail' | 'titleEmail' | 'clientEmail' | 'client2Email') => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && (/^(?:(?:other\s+agent|agent|escrow|escrow\s+officer|title|title\s+officer|lender|loan\s+officer|mortgage|client|buyer|seller)\s*)?(?:e-?mail|mail|mailto)\s*[:\-–]/i.test(pasted.trim()) || pasted.includes('@'))) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        [fieldName]: cleanEmail(pasted),
      }));
    }
  };

  const handleEmailInputBlur = (fieldName: 'agentEmail' | 'lenderEmail' | 'escrowEmail' | 'titleEmail' | 'clientEmail' | 'client2Email') => () => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: cleanEmail(prev[fieldName] as string),
    }));
  };

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

  const applyExtractedDocumentData = (data: any, sourceLabel: string) => {
    if (!data) {
      setScanError('Could not find listing details in the provided file. You can enter them manually below.');
      return;
    }

    const hasAnyField = Boolean(
      data.address || data.price || data.apn || data.agentName || 
      data.listingAgentName || data.buyerAgentName || data.clientFirstName || 
      data.clientLastName || data.escrowNumber || data.city || data.zipCode
    );

    if (!hasAnyField) {
      setScanError('Could not find readable listing details in the provided file. You can enter them manually below.');
      return;
    }

    setFormData((prev) => {
      const rawPrice = data.price ? String(data.price) : prev.price;
      const priceVal = formatPriceString(rawPrice);
      const numPrice = parsePriceNum(priceVal);
      const compRate = data.commissionPercent || (prev.commissionPercent ? Number(prev.commissionPercent) : 2.5);
      const gross = numPrice ? Math.round(numPrice * (compRate / 100)) : 0;
      const activeLeadSource = (data.leadSource as any) || prev.leadSource || 'Self';
      const computedNet = gross > 0 ? calculateNetFromGross(gross, activeLeadSource) : (data.netCommission || (prev.netCommission ? Number(prev.netCommission) : 0));

      const updatedContingencyDays = { ...prev.contingencyDays };
      if (data.contingencyDays && typeof data.contingencyDays === 'object') {
        Object.entries(data.contingencyDays).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            updatedContingencyDays[k] = String(v);
          }
        });
      }

      return {
        ...prev,
        escrowNumber: data.escrowNumber || prev.escrowNumber,
        mlsId: data.mlsId || prev.mlsId,
        address: data.address || prev.address,
        city: data.city || prev.city,
        zipCode: data.zipCode || prev.zipCode,
        apn: data.apn || prev.apn,
        price: priceVal,
        commissionPercent: String(compRate),
        netCommission: computedNet ? String(computedNet) : prev.netCommission,
        agentName: data.agentName || data.listingAgentName || data.buyerAgentName || prev.agentName,
        agentPhone: data.agentPhone || data.listingAgentPhone || data.buyerAgentPhone || prev.agentPhone,
        agentEmail: cleanEmail(data.agentEmail || data.listingAgentEmail || data.buyerAgentEmail) || prev.agentEmail,
        cooperatingBrokerage: data.cooperatingBrokerage || data.listingBrokerage || data.buyerBrokerage || prev.cooperatingBrokerage,
        clientFirstName: data.clientFirstName || prev.clientFirstName,
        clientLastName: data.clientLastName || prev.clientLastName,
        clientPhone: data.clientPhone || prev.clientPhone,
        clientEmail: cleanEmail(data.clientEmail) || prev.clientEmail,
        client2FirstName: data.client2FirstName || prev.client2FirstName,
        client2LastName: data.client2LastName || prev.client2LastName,
        client2Phone: data.client2Phone || prev.client2Phone,
        client2Email: cleanEmail(data.client2Email) || prev.client2Email,
        escrowCompany: data.escrowCompany || prev.escrowCompany,
        escrowOfficer: data.escrowOfficer || prev.escrowOfficer,
        escrowPhone: data.escrowPhone || prev.escrowPhone,
        escrowEmail: cleanEmail(data.escrowEmail) || prev.escrowEmail,
        titleCompany: data.titleCompany || prev.titleCompany,
        titleOfficer: data.titleOfficer || prev.titleOfficer,
        titlePhone: data.titlePhone || prev.titlePhone,
        titleEmail: cleanEmail(data.titleEmail) || prev.titleEmail,
        lenderName: data.lenderName || prev.lenderName,
        lenderCompany: data.lenderCompany || prev.lenderCompany,
        lenderPhone: data.lenderPhone || prev.lenderPhone,
        lenderEmail: cleanEmail(data.lenderEmail) || prev.lenderEmail,
        acceptanceDate: data.acceptanceDate || prev.acceptanceDate,
        coeDate: data.coeDate || prev.coeDate,
        coeDays: data.coeDays ? String(data.coeDays) : (data.coeDate && data.acceptanceDate ? String(differenceInCalendarDays(parseISO(data.coeDate), parseISO(data.acceptanceDate))) : prev.coeDays),
        contingencyStartDate: data.contingencyStartDate || prev.contingencyStartDate,
        contingencyDays: updatedContingencyDays,
      };
    });

    setScanSuccess(`Details extracted successfully from ${sourceLabel}!`);
    setScanError('');
  };

  const attachFileToDocuments = async (fileToAttach: File) => {
    const docId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    let downloadURL = '';

    if (user) {
      try {
        const folderId = escrow?.id || `new_${Date.now()}`;
        const storageRef = ref(storage, `users/${user.uid}/escrows/${folderId}/documents/${docId}_${fileToAttach.name}`);
        const snap = await uploadBytes(storageRef, fileToAttach);
        downloadURL = await getDownloadURL(snap.ref);
      } catch (storageErr) {
        console.warn('Storage upload notice for dropped MLS doc:', storageErr);
      }
    }

    if (!downloadURL) {
      try {
        downloadURL = URL.createObjectURL(fileToAttach);
      } catch {
        downloadURL = '#';
      }
    }

    const newDoc: EscrowDocument = {
      id: docId,
      name: fileToAttach.name,
      url: downloadURL,
      uploadedAt: new Date().toISOString(),
      size: fileToAttach.size,
      type: fileToAttach.type || (fileToAttach.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
    };

    setPendingDocs(prev => {
      const exists = prev.some(d => d.name === newDoc.name && d.size === newDoc.size);
      if (exists) return prev;
      return [...prev, newDoc];
    });
  };

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    lastFileRef.current = file;
    setIsScanning(true);
    setScanError('');
    setScanSuccess('');

    try {
      // Attach dropped MLS file to pending escrow documents
      await attachFileToDocuments(file);

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        let extractedData: any = null;

        // Step 1: Client-Side instant extraction (100% in-browser, no token cost)
        try {
          const res = await extractPdfPagesText(file);
          if (res && res.fullText && res.fullText.trim().length > 10) {
            // Check MLS patterns
            const mls = parseMlsText(res.fullText);
            // Check RPA / contract patterns
            const rpa = parseCaliforniaRpaText(res.fullText, res.pagesText, res.lines, formData.representation);
            
            // Merge both intelligently
            extractedData = {
              ...rpa,
              ...mls,
              address: mls.address || rpa.address,
              city: mls.city || rpa.city,
              zipCode: mls.zipCode || rpa.zipCode,
              apn: mls.apn || rpa.apn,
              price: mls.price || rpa.price,
              commissionPercent: mls.commissionPercent || rpa.commissionPercent,
              agentName: mls.agentName || rpa.agentName || rpa.listingAgentName || rpa.buyerAgentName,
              agentPhone: mls.agentPhone || rpa.agentPhone || rpa.listingAgentPhone || rpa.buyerAgentPhone,
              agentEmail: mls.agentEmail || rpa.agentEmail || rpa.listingAgentEmail || rpa.buyerAgentEmail,
              cooperatingBrokerage: mls.cooperatingBrokerage || rpa.cooperatingBrokerage || rpa.listingBrokerage,
            };
          }
        } catch (clientErr) {
          console.warn('Client-side PDF extraction notice:', clientErr);
        }

        const hasValidClientData = extractedData && (
          extractedData.address || extractedData.price || extractedData.apn || extractedData.mlsId || extractedData.agentName || extractedData.listingAgentName || extractedData.clientFirstName || extractedData.clientLastName
        );

        if (hasValidClientData) {
          applyExtractedDocumentData(extractedData, file.name);
          return;
        }

        // Step 2: Server-Side AI Vision / OCR fallback for image-only PDFs
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          const dataUrl = await base64Promise;
          const serverDoc = await parseFullEscrowRPA(dataUrl, file.type || 'application/pdf', file.name, formData.representation);
          if (serverDoc && (serverDoc.address || serverDoc.price || serverDoc.agentName || serverDoc.apn || serverDoc.clientLastName)) {
            applyExtractedDocumentData(serverDoc, file.name);
            return;
          }
        } catch (serverErr: any) {
          console.warn('Server fallback scan notice:', serverErr);
        }

        if (extractedData && (extractedData.address || extractedData.price || extractedData.apn || extractedData.mlsId || extractedData.agentName)) {
          applyExtractedDocumentData(extractedData, file.name);
          return;
        }

        setScanError(`"${file.name}" was attached to documents, but no standard MLS/RPA text fields could be recognized.`);
      } else {
        // Plain text or CSV file
        const text = await file.text();
        const parsed = parseMlsText(text);
        if (parsed && (parsed.address || parsed.price || parsed.apn || parsed.mlsId || parsed.agentName)) {
          applyExtractedDocumentData(parsed, file.name);
        } else {
          setScanError(`"${file.name}" was attached, but no MLS fields could be recognized in the text.`);
        }
      }
    } catch (err: any) {
      setScanError(err.message || 'Failed to read document.');
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

      let initCoeDays = '30';
      if (escrow.coeDays && Number(escrow.coeDays) > 0) {
        initCoeDays = String(escrow.coeDays);
      } else if (escrow.coeDate && escrow.acceptanceDate) {
        try {
          const s = parseISO(escrow.acceptanceDate);
          const c = parseISO(escrow.coeDate);
          const diff = differenceInCalendarDays(c, s);
          if (diff > 0 && diff <= 365) initCoeDays = String(diff);
        } catch {}
      }

      setFormData({
        escrowNumber: escrow.escrowNumber || '',
        mlsId: escrow.mlsId || '',
        apn: escrow.apn || '',
        escrowCompany: escrow.escrowCompany || '',
        address: initAddress,
        city: initCity,
        zipCode: initZip,
        clientFirstName: escrow.clientFirstName || '',
        clientLastName: escrow.clientLastName || '',
        clientPhone: escrow.clientPhone || '',
        clientEmail: cleanEmail(escrow.clientEmail || ''),
        clientBirthday: cleanBday1,
        client2FirstName: escrow.client2FirstName || '',
        client2LastName: escrow.client2LastName || '',
        client2Phone: escrow.client2Phone || '',
        client2Email: cleanEmail(escrow.client2Email || ''),
        client2Birthday: cleanBday2,
        collaborator: escrow.collaborator || '',
        escrowOfficer: escrow.escrowOfficer || '',
        escrowPhone: escrow.escrowPhone || '',
        escrowEmail: cleanEmail(escrow.escrowEmail || ''),
        titleCompany: escrow.titleCompany || '',
        titleOfficer: escrow.titleOfficer || '',
        titlePhone: escrow.titlePhone || '',
        titleEmail: cleanEmail(escrow.titleEmail || ''),
        agentName: escrow.agentName || '',
        agentPhone: escrow.agentPhone || '',
        agentEmail: cleanEmail(escrow.agentEmail || ''),
        cooperatingBrokerage: escrow.cooperatingBrokerage || '',
        lenderName: escrow.lenderName || '',
        lenderCompany: escrow.lenderCompany || '',
        lenderPhone: escrow.lenderPhone || '',
        lenderEmail: cleanEmail(escrow.lenderEmail || ''),
        price: escrow.price ? formatPriceString(escrow.price) : '',
        netCommission: escrow.netCommission ? escrow.netCommission.toString() : '',
        commissionPercent: escrow.commissionPercent?.toString() || '',
        acceptanceDate: escrow.acceptanceDate || '',
        contingencyStartDate: escrow.contingencyStartDate || '',
        coeDate: escrow.coeDate || '',
        coeDays: initCoeDays,
        status: escrow.status || 'Open',
        representation: escrow.representation || 'Buyer',
        leadSource: (escrow.leadSource as any) || 'Zillow',
        notes: escrow.notes || '',
        contingencyDays: stringifiedDays
      });
      setL9Enabled(Boolean(escrow.contingencyDays?.['L9'] && Number(escrow.contingencyDays?.['L9']) > 0));
      setPendingDocs([]);
    } else {
      setL9Enabled(false);
      setPendingDocs([]);
      setFormData({
        escrowNumber: '',
        mlsId: '',
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
        lenderCompany: '',
        lenderPhone: '',
        lenderEmail: '',
        price: '',
        netCommission: '',
        commissionPercent: '',
        acceptanceDate: '',
        coeDate: '',
        coeDays: '30',
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

  const calculateWeekendAdjustedCoe = (startDateStr: string, daysNum: number): { dateStr: string; wasAdjusted: boolean } => {
    if (!startDateStr || isNaN(daysNum) || daysNum <= 0) return { dateStr: '', wasAdjusted: false };
    try {
      const sDate = parseISO(startDateStr);
      if (isNaN(sDate.getTime())) return { dateStr: '', wasAdjusted: false };
      const rawTarget = addDays(sDate, daysNum);
      const dayOfWeek = rawTarget.getDay(); // 0 = Sunday, 6 = Saturday
      const wasAdjusted = dayOfWeek === 0 || dayOfWeek === 6;
      const adjusted = adjustWeekendToMonday(rawTarget);
      return { dateStr: format(adjusted, 'yyyy-MM-dd'), wasAdjusted };
    } catch {
      return { dateStr: '', wasAdjusted: false };
    }
  };

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
      clientEmail: cleanEmail(formData.clientEmail),
      client2Email: cleanEmail(formData.client2Email),
      agentEmail: cleanEmail(formData.agentEmail),
      lenderEmail: cleanEmail(formData.lenderEmail),
      escrowEmail: cleanEmail(formData.escrowEmail),
      titleEmail: cleanEmail(formData.titleEmail),
      price: parsePriceNum(formData.price),
      netCommission: Number(formData.netCommission) || 0,
      commissionPercent: formData.commissionPercent ? Number(formData.commissionPercent) : undefined,
      coeDays: formData.coeDays ? Number(formData.coeDays) : undefined,
      contingencyDays: parsedDays
    };

    const existingDocs = escrow?.documents || [];
    const allDocs = [...pendingDocs, ...existingDocs];
    const uniqueDocs = allDocs.filter((doc, idx, self) => 
      idx === self.findIndex(d => d.id === doc.id || (d.name === doc.name && d.size === doc.size))
    );
    if (uniqueDocs.length > 0) {
      cleanedData.documents = uniqueDocs;
    }

    onSave(cleanedData);
  };

  const handlePriceChange = (val: string) => {
    const formattedVal = formatPriceString(val);
    const numPrice = parsePriceNum(val);
    setFormData(prev => {
      const numCommPercent = prev.commissionPercent ? Number(prev.commissionPercent) : 2.5;
      let newNet = prev.netCommission;
      if (numPrice > 0 && numCommPercent > 0) {
        const gross = Math.round((numPrice * numCommPercent) / 100);
        newNet = String(calculateNetFromGross(gross, prev.leadSource));
      }
      return {
        ...prev,
        price: formattedVal,
        netCommission: newNet
      };
    });
  };

  const handleCommissionPercentChange = (val: string) => {
    setFormData(prev => {
      const numPrice = parsePriceNum(prev.price);
      const numCommPercent = Number(val) || 0;
      let newNet = prev.netCommission;
      if (numPrice > 0 && numCommPercent > 0) {
        const gross = Math.round((numPrice * numCommPercent) / 100);
        newNet = String(calculateNetFromGross(gross, prev.leadSource));
      }
      return {
        ...prev,
        commissionPercent: val,
        netCommission: newNet
      };
    });
  };

  const handleLeadSourceChange = (newSource: string) => {
    setFormData(prev => {
      const numPrice = parsePriceNum(prev.price);
      const numCommPercent = prev.commissionPercent ? Number(prev.commissionPercent) : 2.5;
      let newNet = prev.netCommission;
      if (numPrice > 0 && numCommPercent > 0) {
        const gross = Math.round((numPrice * numCommPercent) / 100);
        newNet = String(calculateNetFromGross(gross, newSource));
      }
      return {
        ...prev,
        leadSource: newSource as any,
        netCommission: newNet
      };
    });
  };

  const handleRecalculateNet = () => {
    const numPrice = parsePriceNum(formData.price);
    const numCommPercent = formData.commissionPercent ? Number(formData.commissionPercent) : 2.5;
    const gross = Math.round((numPrice * numCommPercent) / 100);
    const calculatedNet = calculateNetFromGross(gross, formData.leadSource);
    setFormData(prev => ({
      ...prev,
      netCommission: String(calculatedNet)
    }));
  };

  const handleAcceptanceDateChange = (val: string) => {
    const daysNum = Number(formData.coeDays);
    let newCoe = formData.coeDate;
    if (val && !isNaN(daysNum) && daysNum > 0) {
      const calc = calculateWeekendAdjustedCoe(val, daysNum);
      if (calc.dateStr) newCoe = calc.dateStr;
    }
    setFormData(prev => ({
      ...prev,
      acceptanceDate: val,
      coeDate: newCoe,
    }));
  };

  const handleEscrowDaysChange = (val: string) => {
    const daysNum = Number(val);
    let newCoe = formData.coeDate;
    if (formData.acceptanceDate && !isNaN(daysNum) && daysNum > 0) {
      const calc = calculateWeekendAdjustedCoe(formData.acceptanceDate, daysNum);
      if (calc.dateStr) newCoe = calc.dateStr;
    }
    setFormData(prev => ({
      ...prev,
      coeDays: val,
      coeDate: newCoe,
    }));
  };

  const handleCoeDateChange = (val: string) => {
    let derivedDays = formData.coeDays;
    if (val && formData.acceptanceDate) {
      try {
        const s = parseISO(formData.acceptanceDate);
        const c = parseISO(val);
        const diff = differenceInCalendarDays(c, s);
        if (diff > 0 && diff <= 365) {
          derivedDays = String(diff);
        }
      } catch {}
    }
    setFormData(prev => ({
      ...prev,
      coeDate: val,
      coeDays: derivedDays,
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
              {/* Representation Selector - Placed on the Left for High Visibility */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 p-1 rounded-xl shadow-xs self-start sm:self-auto">
                <span className="text-xs font-bold text-slate-800 px-2">Representing:</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, representation: 'Buyer' }))}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    formData.representation === 'Dual'
                      ? 'bg-[#11253C] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Dual
                </button>
              </div>

              {/* MLS Quick-Fill Label on the Right */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1B3A5C] flex items-center justify-center text-white shrink-0">
                  <FileText size={14} />
                </div>
                <h4 className="text-xs font-bold text-slate-800 leading-tight">MLS Quick-Fill</h4>
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

            {pendingDocs.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {pendingDocs.map(doc => (
                  <div key={doc.id} className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-900 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-2xs">
                    <Paperclip size={13} className="text-[#1B3A5C] shrink-0" />
                    <span className="truncate max-w-[220px]" title={doc.name}>{doc.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono font-normal">
                      {doc.size ? `${Math.round(doc.size / 1024)} KB` : 'Attached'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingDocs(prev => prev.filter(d => d.id !== doc.id))}
                      className="ml-1 text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                      title="Remove attached document"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
            {/* Section 1: Property Information */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">PROPERTY INFORMATION</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Escrow #</label>
                  <input type="text" value={formData.escrowNumber} onChange={e => setFormData({...formData, escrowNumber: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">MLS ID / Listing #</label>
                  <input type="text" placeholder="e.g. DW26038810" value={formData.mlsId} onChange={e => setFormData({...formData, mlsId: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" />
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

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Property Address (Street) *</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zip Code</label>
                  <input 
                    type="text" 
                    value={formData.zipCode} 
                    onChange={e => handleZipInputChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                  />
                </div>

                {/* Escrow Terms */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-[#1B3A5C]">
                      ESCROW TERMS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Acceptance Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Acceptance Date
                      </label>
                      <input 
                        type="date" 
                        value={formData.acceptanceDate || ''} 
                        onChange={e => handleAcceptanceDateChange(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] shadow-xs" 
                      />
                    </div>

                    {/* Escrow Days with Presets */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Escrow Days
                        </label>
                        <span className="text-[11px] font-black text-[#1B3A5C]">
                          {formData.coeDays || 30} Days
                        </span>
                      </div>
                      <input 
                        type="number"
                        min="1"
                        max="365"
                        placeholder="30"
                        value={formData.coeDays} 
                        onChange={e => handleEscrowDaysChange(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] shadow-xs" 
                      />
                      
                      {/* Presets */}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                        {[15, 21, 30].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleEscrowDaysChange(String(d))}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              Number(formData.coeDays) === d
                                ? 'bg-[#1B3A5C] text-white shadow-2xs'
                                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* COE Date */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          COE Date
                        </label>
                        {(() => {
                          if (!formData.acceptanceDate || !formData.coeDays) return null;
                          const calc = calculateWeekendAdjustedCoe(formData.acceptanceDate, Number(formData.coeDays));
                          if (calc.wasAdjusted) {
                            return (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded" title="Target date landed on weekend, adjusted to next Monday">
                                Mon Adjusted
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <input 
                        type="date" 
                        value={formData.coeDate || ''} 
                        onChange={e => handleCoeDateChange(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] shadow-xs" 
                      />
                    </div>
                  </div>
                </div>

                {/* Price and Commission */}
                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200">
                    <span className="text-xs font-black uppercase tracking-wider text-[#1B3A5C]">
                      PRICE AND COMMISSION
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Representation */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Representation</label>
                      <select 
                        value={formData.representation} 
                        onChange={e => setFormData({...formData, representation: e.target.value as any})} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                      >
                        <option value="Buyer">Representing Buyer</option>
                        <option value="Seller">Representing Seller</option>
                        <option value="Dual">Representing Dual</option>
                      </select>
                    </div>

                    {/* Lead Source */}
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

                    {/* Sale Price */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">Sale Price ($)</label>
                        {Boolean(parsePriceNum(formData.price) > 0) && (
                          <span className="text-[11px] font-bold text-[#1B3A5C] font-mono bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/80">
                            ${parsePriceNum(formData.price).toLocaleString('en-US')}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="e.g. 620,000"
                          value={formData.price} 
                          onChange={e => handlePriceChange(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                        />
                      </div>
                    </div>

                    {/* Gross Commission */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">Gross Commission (%)</label>
                        {Boolean(parsePriceNum(formData.price) > 0 && formData.commissionPercent && Number(formData.commissionPercent) > 0) && (
                          <span className="text-sm font-black text-black font-mono tracking-tight">
                            Gross: ${Math.round((parsePriceNum(formData.price) * Number(formData.commissionPercent)) / 100).toLocaleString('en-US')}
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

                    {/* Net Commission */}
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
                        parsePriceNum(formData.price),
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
                            {parsePriceNum(formData.price) > 0 && Number(formData.commissionPercent) > 0 && (
                              <span className="text-[11px] font-bold text-emerald-700 font-mono bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                Calculated Net: ${commBreakdown.netCommission.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {parsePriceNum(formData.price) > 0 && Number(formData.commissionPercent) > 0 ? (
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
              </div>
            </div>

            {/* Section 2: Primary Client (Client 1) */}
            <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/70">
                <div>
                  <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider">CLIENT 1 (PRIMARY)</h3>
                  <p className="text-[11px] text-blue-700/80">Main buyer or seller contact</p>
                </div>
                <div className="flex items-center gap-2">
                  <QuickPasteContact
                    role="client"
                    roleLabel="Client 1"
                    onApply={(p) => {
                      setFormData(prev => ({
                        ...prev,
                        clientFirstName: p.firstName || prev.clientFirstName,
                        clientLastName: p.lastName || prev.clientLastName,
                        clientPhone: p.phone || prev.clientPhone,
                        clientEmail: cleanEmail(p.email) || prev.clientEmail,
                      }));
                    }}
                  />
                </div>
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
                  <input 
                    type="email" 
                    value={formData.clientEmail} 
                    onChange={e => handleEmailInputChange('clientEmail', e.target.value)} 
                    onPaste={handleEmailInputPaste('clientEmail')}
                    onBlur={handleEmailInputBlur('clientEmail')}
                    className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-blue-950 mb-1">Client 1 Birthday</label>
                  <input type="date" value={formData.clientBirthday || ''} onChange={e => setFormData({...formData, clientBirthday: e.target.value})} className="w-full md:w-1/2 bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Section 3: Client Number 2 */}
            <div className="bg-purple-50/40 border border-purple-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200/70">
                <div>
                  <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider">CLIENT 2</h3>
                  <p className="text-[11px] text-purple-700/80">Co-buyer, spouse, or secondary signer</p>
                </div>
                <div className="flex items-center gap-2">
                  <QuickPasteContact
                    role="client"
                    roleLabel="Client 2"
                    onApply={(p) => {
                      setFormData(prev => ({
                        ...prev,
                        client2FirstName: p.firstName || prev.client2FirstName,
                        client2LastName: p.lastName || prev.client2LastName,
                        client2Phone: p.phone || prev.client2Phone,
                        client2Email: cleanEmail(p.email) || prev.client2Email,
                      }));
                    }}
                  />
                </div>
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
                  <input 
                    type="email" 
                    value={formData.client2Email} 
                    onChange={e => handleEmailInputChange('client2Email', e.target.value)} 
                    onPaste={handleEmailInputPaste('client2Email')}
                    onBlur={handleEmailInputBlur('client2Email')}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" 
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-purple-950 mb-1">Client 2 Birthday</label>
                  <input type="date" value={formData.client2Birthday || ''} onChange={e => setFormData({...formData, client2Birthday: e.target.value})} className="w-full md:w-1/2 bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
              </div>
            </div>

            {/* Section 4: Other Agent */}
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/70">
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">OTHER AGENT</h3>
                  <p className="text-[11px] text-emerald-700/80">Cross agent on the other side of transaction</p>
                </div>
                <div className="flex items-center gap-2">
                  <QuickPasteContact
                    role="agent"
                    roleLabel="Other Agent"
                    onApply={(p) => {
                      setFormData(prev => ({
                        ...prev,
                        agentName: p.name || prev.agentName,
                        cooperatingBrokerage: p.company || prev.cooperatingBrokerage,
                        agentPhone: p.phone || prev.agentPhone,
                        agentEmail: cleanEmail(p.email) || prev.agentEmail,
                      }));
                    }}
                  />
                </div>
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
                  <input 
                    type="email" 
                    value={formData.agentEmail} 
                    onChange={e => handleEmailInputChange('agentEmail', e.target.value)} 
                    onPaste={handleEmailInputPaste('agentEmail')}
                    onBlur={handleEmailInputBlur('agentEmail')}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Lender Details */}
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
                <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wider">LENDER</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <QuickPasteContact
                    role="lender"
                    roleLabel="Lender"
                    onApply={(p) => {
                      setFormData(prev => ({
                        ...prev,
                        lenderName: p.name || prev.lenderName,
                        lenderCompany: p.company || prev.lenderCompany,
                        lenderPhone: p.phone || prev.lenderPhone,
                        lenderEmail: cleanEmail(p.email) || prev.lenderEmail,
                      }));
                    }}
                  />
                  <PartnerDropdown
                    category="lender"
                    categoryLabel="Lender"
                    partners={partners}
                    onAddNew={addPartner}
                    onDelete={deletePartner}
                    onSelect={(p: PreferredPartner) => {
                      setFormData(prev => ({
                        ...prev,
                        lenderName: p.name || p.company,
                        lenderCompany: p.company || '',
                        lenderPhone: p.phone,
                        lenderEmail: cleanEmail(p.email),
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender Company / Institution</label>
                  <input type="text" placeholder="e.g. CrossCountry Mortgage, Chase, Zillow Home Loans" value={formData.lenderCompany} onChange={e => setFormData({...formData, lenderCompany: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Loan Officer / Contact Name</label>
                  <input type="text" placeholder="e.g. Thomas Sciutto" value={formData.lenderName} onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender Phone</label>
                  <input type="tel" value={formData.lenderPhone} onChange={e => setFormData({...formData, lenderPhone: e.target.value})} className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-950 mb-1">Lender Email</label>
                  <input 
                    type="email" 
                    value={formData.lenderEmail} 
                    onChange={e => handleEmailInputChange('lenderEmail', e.target.value)} 
                    onPaste={handleEmailInputPaste('lenderEmail')}
                    onBlur={handleEmailInputBlur('lenderEmail')}
                    className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                  />
                </div>
              </div>
            </div>

            {/* Section 6: Escrow Company & Officer */}
            <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/70">
                <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">ESCROW</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <QuickPasteContact
                    role="escrow"
                    roleLabel="Escrow"
                    onApply={(p) => {
                      setFormData(prev => ({
                        ...prev,
                        escrowOfficer: p.name || prev.escrowOfficer,
                        escrowCompany: p.company || prev.escrowCompany,
                        escrowPhone: p.phone || prev.escrowPhone,
                        escrowEmail: cleanEmail(p.email) || prev.escrowEmail,
                      }));
                    }}
                  />
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
                        escrowEmail: cleanEmail(p.email),
                      }));
                    }}
                  />
                </div>
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
                  <input 
                    type="email" 
                    value={formData.escrowEmail} 
                    onChange={e => handleEmailInputChange('escrowEmail', e.target.value)} 
                    onPaste={handleEmailInputPaste('escrowEmail')}
                    onBlur={handleEmailInputBlur('escrowEmail')}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                  />
                </div>
              </div>
            </div>

            {/* Section 7: Title Company Details */}
            <div className="bg-cyan-50/40 border border-cyan-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-cyan-200/70">
                <h3 className="text-sm font-bold text-cyan-950 uppercase tracking-wider">TITLE</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <QuickPasteContact
                    role="title"
                    roleLabel="Title"
                    onApply={(p) => {
                      setFormData(prev => ({
                        ...prev,
                        titleOfficer: p.name || prev.titleOfficer,
                        titleCompany: p.company || prev.titleCompany,
                        titlePhone: p.phone || prev.titlePhone,
                        titleEmail: cleanEmail(p.email) || prev.titleEmail,
                      }));
                    }}
                  />
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
                        titleEmail: cleanEmail(p.email),
                      }));
                    }}
                  />
                </div>
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
                  <input 
                    type="email" 
                    value={formData.titleEmail} 
                    onChange={e => handleEmailInputChange('titleEmail', e.target.value)} 
                    onPaste={handleEmailInputPaste('titleEmail')}
                    onBlur={handleEmailInputBlur('titleEmail')}
                    className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" 
                  />
                </div>
              </div>
            </div>

            {/* Section 8: Collaborator & Notes */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">COLLABORATOR & NOTES</h3>
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
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">CONTINGENCIES</h3>
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

              {/* Contingencies (L3–L8) with Compact Batch Setter */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
                {/* Compact Set All Controller */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Set all L3 – L8:
                  </span>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 shadow-2xs focus-within:border-[#1B3A5C] focus-within:bg-white">
                      <input 
                        type="number"
                        min="0"
                        max="365"
                        value={commonL3ToL8Val}
                        placeholder={isL3ToL8Synced ? '17' : 'Mix'}
                        onChange={e => handleBatchL3ToL8(e.target.value)}
                        className="w-10 text-center font-bold text-xs text-[#1B3A5C] bg-transparent focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 select-none pr-0.5">d</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {['7', '10', '14', '17', '21'].map(preset => {
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

                {/* Individual L3-L8 items */}
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
