import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Escrow, formatPropertyAddress, adjustWeekendToMonday } from '../../types';
import { X, MessageSquare, Mail, Check, ChevronDown, Globe, CheckCheck, Copy } from 'lucide-react';
import { parseISO, format, addDays, differenceInCalendarDays } from 'date-fns';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEFAULT_TEMPLATES, EmailTemplate, TemplateSide } from '../../data/defaultTemplates';
import { formatUtilitiesForAddress } from '../../utils/utilityLookup';

export type { TemplateSide, EmailTemplate };

const OLD_FIRST_ESCROW_V1 = 'Hi [Esrow Officer],\n\nWhile my Transaction Coordinator uploads the remaining documents to our platform, below is the buyer and Transaction Coordinator information.\n\nBuyers\nName: [Buyer Name]\nEmail: [Buyer Email]\nPhone: [Buyer Phone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const OLD_FIRST_ESCROW_V2 = 'Hi [Escrow Officer],\n\nWhile my Transaction Coordinator uploads the remaining documents to our platform, below is the buyer, lender, and Transaction Coordinator information.\n\nBuyers\nName: [ClientFirstName] [ClientLastName]\nEmail: [ClientEmail]\nPhone: [ClientPhone][Buyer2Block]\n\nLender Information\nLender: [LenderName]\nEmail: [LenderEmail]\nPhone: [LenderPhone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const OLD_OPENING = 'Hi [ClientName], Escrow has officially been opened 🎉\nHere are the important contacts to keep in mind:\n\nESCROW:\n\nEscrow company: [Collaborator]\nEscrow officer: [EscrowOfficer]\nEscrow email: [EscrowEmail]\nEscrow phone number: [EscrowPhone]\n\nTransaction Coordinators\nBrittany Kauten\nbrittany@iconrealty.io\n\nKatya Abellar\ntc@iconrealty.io\n\nWHAT’S NEXT:\n\nEscrow will be sending you wire instructions shortly for the initial deposit (3%). Please follow the instructions carefully. If you have any questions at any time, I’m always available.\n\nInspection: I’m coordinating the inspection, tentatively for Wednesday afternoon. I’ll confirm availability and keep you posted.';

const OLD_LISTING_OPEN_V1 = 'Hi [Esrow Officer],\n\nPlease open escrow for our new listing at [Address].\n\nSellers\nName: [ClientName]\nEmail: [Buyer Email]\nPhone: [Buyer Phone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const OLD_LISTING_OPEN_V2 = 'Hi [Escrow Officer],\n\nPlease open escrow for our new listing at [Address].\n\nSellers\nName: [ClientFirstName] [ClientLastName]\nEmail: [ClientEmail]\nPhone: [ClientPhone][Client2Block]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const OLD_LISTING_OPEN_V3 = 'Hi [Escrow Officer],\n\nPlease open escrow for our new listing at [Address].\n\nSellers\nName: [ClientFirstName] [ClientLastName]\nEmail: [ClientEmail]\nPhone: [ClientPhone][Seller2Block]\n\nLender Information\nLender: [LenderName]\nEmail: [LenderEmail]\nPhone: [LenderPhone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const TEMPLATES: EmailTemplate[] = DEFAULT_TEMPLATES;

const upgradeTemplateIfNeeded = (t: EmailTemplate, custom?: { id: string; text?: string; subject?: string; label?: string }): EmailTemplate => {
  if (!custom || !custom.text) return t;

  // Upgrade 'request_open_escrow_listing' if it doesn't contain Lender or Seller 2 details or EscrowDays
  if (t.id === 'request_open_escrow_listing') {
    const textLower = custom.text.toLowerCase();
    const hasLender = textLower.includes('lender');
    const hasSeller2 = custom.text.includes('Seller2Block') || custom.text.includes('Seller 2') || custom.text.includes('Client2Block') || custom.text.includes('Seller2');
    if (!hasLender || !hasSeller2 || custom.text === OLD_LISTING_OPEN_V1 || custom.text === OLD_LISTING_OPEN_V2 || custom.text === OLD_LISTING_OPEN_V3) {
      return t;
    }
  }

  // Upgrade 'first_escrow_email' if it doesn't contain Lender or Buyer 2 details or EscrowDays
  if (t.id === 'first_escrow_email') {
    const textLower = custom.text.toLowerCase();
    const hasLender = textLower.includes('lender');
    const hasBuyer2 = custom.text.includes('Buyer2Block') || custom.text.includes('Buyer 2') || custom.text.includes('Client2Block') || custom.text.includes('Buyer2');
    if (!hasLender || !hasBuyer2 || custom.text === OLD_FIRST_ESCROW_V1 || custom.text === OLD_FIRST_ESCROW_V2) {
      return t;
    }
  }

  // Upgrade 'opening' if it doesn't contain Lender
  if (t.id === 'opening') {
    const textLower = custom.text.toLowerCase();
    const hasLender = textLower.includes('lender');
    if (!hasLender || custom.text === OLD_OPENING) {
      return t;
    }
  }

  // Upgrade 'utilities_buyer' if saved custom contains old '3Rd applicant', old 'Utilities for:', old 'Company:/phone:/website:', or does not contain utilities placeholder
  if (t.id === 'utilities_buyer') {
    if (
      !custom ||
      custom.text.includes('3Rd applicant') ||
      custom.text.includes('Utilities for:') ||
      custom.text.includes('Utilities for :') ||
      custom.text.includes('Company:') ||
      custom.text.includes('phone:') ||
      custom.text.includes('website:') ||
      custom.label !== t.label ||
      (!custom.text.includes('Utilities') && !custom.text.includes('Utility') && !custom.text.includes('utilities'))
    ) {
      return t;
    }
  }

  return { ...t, text: custom.text, subject: custom.subject || t.subject };
};

export function ClientUpdatesModal({
  escrow,
  onClose,
  onUpdateEscrow
}: {
  escrow: Escrow;
  onClose: () => void;
  onUpdateEscrow?: (id: string, updates: Partial<Escrow>) => void;
}) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const { user } = useAuth();
  const isAdminOrOwner = !user?.email || user?.email === 'paulmuner@gmail.com';
  
  const [baseDefaults, setBaseDefaults] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  // Initialize templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    const saved = localStorage.getItem('escrow_custom_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return DEFAULT_TEMPLATES.map(t => {
            const custom = parsed.find((p: any) => p.id === t.id);
            return upgradeTemplateIfNeeded(t, custom);
          });
        }
      } catch (e) {
        console.error("Failed to parse local templates", e);
      }
    }
    return DEFAULT_TEMPLATES;
  });

  // Fetch latest global defaults from server on mount
  useEffect(() => {
    fetch('/api/templates/defaults')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
          setBaseDefaults(data.templates);
          const saved = localStorage.getItem('escrow_custom_templates');
          if (!saved) {
            setTemplates(data.templates);
          } else {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                const merged = data.templates.map((t: EmailTemplate) => {
                  const custom = parsed.find((p: any) => p.id === t.id);
                  return upgradeTemplateIfNeeded(t, custom);
                });
                setTemplates(merged);
              }
            } catch {}
          }
        }
      })
      .catch(err => console.warn('Could not fetch server template defaults:', err));
  }, []);

  // Load centralized templates from Firestore
  useEffect(() => {
    if (!user) return;

    const loadCloudTemplates = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().customTemplates) {
          const cloudTemplates = docSnap.data().customTemplates;
          if (Array.isArray(cloudTemplates) && cloudTemplates.length > 0) {
            const merged = baseDefaults.map(t => {
              const custom = cloudTemplates.find((p: any) => p.id === t.id);
              return upgradeTemplateIfNeeded(t, custom);
            });
            setTemplates(merged);
            localStorage.setItem('escrow_custom_templates', JSON.stringify(merged));

            // If this is paulmuner@gmail.com, automatically sync their custom templates to server defaults
            if (user.email === 'paulmuner@gmail.com') {
              fetch('/api/templates/defaults', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templates: merged, userEmail: user.email })
              }).catch(e => console.warn('Auto-sync defaults error:', e));
            }
          }
        }
      } catch (err) {
        console.error("Error loading centralized templates from Firestore:", err);
      }
    };

    loadCloudTemplates();
  }, [user, baseDefaults]);

  // Initial template: default to 'first_escrow_email' (Buyer)
  const defaultTemplateId = 'first_escrow_email';
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const isEscrowOfficerTemplate = selectedTemplateId === 'first_escrow_email' || selectedTemplateId === 'request_open_escrow_listing';
  
  // Representation-aware filter tab: pre-select 'buyer' by default
  const [sideFilter, setSideFilter] = useState<'buyer' | 'seller' | 'all'>('buyer');

  // Filtered templates list based on sideFilter
  const filteredTemplates = useMemo(() => {
    if (sideFilter === 'all') return templates;
    return templates.filter(t => t.side === sideFilter || t.side === 'both');
  }, [templates, sideFilter]);

  const handleSideFilterChange = (newSide: 'buyer' | 'seller' | 'all') => {
    setSideFilter(newSide);
    const nextTemplates = newSide === 'all' 
      ? templates 
      : templates.filter(t => t.side === newSide || t.side === 'both');
    
    const isCurrentStillVisible = nextTemplates.some(t => t.id === selectedTemplateId);
    if (!isCurrentStillVisible && nextTemplates.length > 0) {
      setSelectedTemplateId(nextTemplates[0].id);
    }
  };

  // Escrow Days & Start Date State
  const initialStartDate = useMemo(() => {
    if (escrow.acceptanceDate) return escrow.acceptanceDate;
    if (escrow.contingencyStartDate) return escrow.contingencyStartDate;
    return format(new Date(), 'yyyy-MM-dd');
  }, [escrow.acceptanceDate, escrow.contingencyStartDate]);

  const [startDate, setStartDate] = useState<string>(initialStartDate);

  const initialEscrowDays = useMemo(() => {
    if (escrow.coeDays && Number(escrow.coeDays) > 0) {
      return Number(escrow.coeDays);
    }
    if (escrow.coeDate && (escrow.acceptanceDate || escrow.contingencyStartDate)) {
      try {
        const s = parseISO(escrow.acceptanceDate || escrow.contingencyStartDate || '');
        const c = parseISO(escrow.coeDate);
        const diff = differenceInCalendarDays(c, s);
        if (diff > 0 && diff <= 180) return diff;
      } catch {}
    }
    return 30;
  }, [escrow.coeDays, escrow.coeDate, escrow.acceptanceDate, escrow.contingencyStartDate]);

  const [escrowDays, setEscrowDays] = useState<number | string>(initialEscrowDays);

  // Weekend-aware Closing Date (COE) Calculation
  // Calculates startDate + escrowDays. If the result lands on Saturday or Sunday, moves to the next Monday.
  const closingCalculation = useMemo(() => {
    const daysNum = typeof escrowDays === 'string' ? parseInt(escrowDays, 10) : escrowDays;
    if (!startDate || isNaN(daysNum) || daysNum <= 0) {
      return {
        calculatedDate: null,
        rawDate: null,
        formattedFull: escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMMM d, yyyy') : 'the scheduled closing date',
        formattedShort: escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMM d, yyyy') : 'TBD',
        formattedWithDay: escrow.coeDate ? format(parseISO(escrow.coeDate), 'EEEE, MMMM d, yyyy') : 'TBD',
        isoString: escrow.coeDate || '',
        wasWeekendAdjusted: false,
        originalDayName: '',
      };
    }

    try {
      const baseDate = parseISO(startDate);
      if (isNaN(baseDate.getTime())) {
        return {
          calculatedDate: null,
          rawDate: null,
          formattedFull: escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMMM d, yyyy') : 'the scheduled closing date',
          formattedShort: escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMM d, yyyy') : 'TBD',
          formattedWithDay: escrow.coeDate ? format(parseISO(escrow.coeDate), 'EEEE, MMMM d, yyyy') : 'TBD',
          isoString: escrow.coeDate || '',
          wasWeekendAdjusted: false,
          originalDayName: '',
        };
      }

      const rawTarget = addDays(baseDate, daysNum);
      const dayOfWeek = rawTarget.getDay(); // 0 = Sunday, 6 = Saturday
      const wasWeekendAdjusted = dayOfWeek === 0 || dayOfWeek === 6;
      const originalDayName = dayOfWeek === 6 ? 'Saturday' : dayOfWeek === 0 ? 'Sunday' : '';
      const adjusted = adjustWeekendToMonday(rawTarget);

      return {
        calculatedDate: adjusted,
        rawDate: rawTarget,
        formattedFull: format(adjusted, 'MMMM d, yyyy'),
        formattedShort: format(adjusted, 'MMM d, yyyy'),
        formattedWithDay: format(adjusted, 'EEEE, MMMM d, yyyy'),
        isoString: format(adjusted, 'yyyy-MM-dd'),
        wasWeekendAdjusted,
        originalDayName,
      };
    } catch {
      return {
        calculatedDate: null,
        rawDate: null,
        formattedFull: escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMMM d, yyyy') : 'the scheduled closing date',
        formattedShort: escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMM d, yyyy') : 'TBD',
        formattedWithDay: escrow.coeDate ? format(parseISO(escrow.coeDate), 'EEEE, MMMM d, yyyy') : 'TBD',
        isoString: escrow.coeDate || '',
        wasWeekendAdjusted: false,
        originalDayName: '',
      };
    }
  }, [startDate, escrowDays, escrow.coeDate]);

  const client1FullName = `${escrow.clientFirstName || ''} ${escrow.clientLastName || ''}`.trim();
  const client2FullName = `${escrow.client2FirstName || ''} ${escrow.client2LastName || ''}`.trim();
  const hasClient2 = Boolean(
    client2FullName || 
    (escrow.client2Phone && escrow.client2Phone.trim()) || 
    (escrow.client2Email && escrow.client2Email.trim())
  );

  const recipientName = isEscrowOfficerTemplate 
    ? (escrow.escrowOfficer || 'Escrow Officer') 
    : (client1FullName + (hasClient2 ? ` & ${client2FullName || 'Client 2'}` : '')) || 'Client';

  const recipientPhone = isEscrowOfficerTemplate ? escrow.escrowPhone : escrow.clientPhone;
  const recipientEmail = isEscrowOfficerTemplate 
    ? escrow.escrowEmail 
    : [escrow.clientEmail, escrow.client2Email].filter(Boolean).join(',');

  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // States for Master Customization
  const [isEditingMaster, setIsEditingMaster] = useState(false);
  const [masterSubject, setMasterSubject] = useState('');
  const [masterText, setMasterText] = useState('');

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const textTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const getPopulatedText = (rawText: string) => {
    let text = rawText;
    const clientCombinedName = (client1FullName || 'Client') + (hasClient2 ? ` & ${client2FullName || 'Client 2'}` : '');

    text = text.replace(/\[ClientName\]/g, clientCombinedName || 'Client');
    text = text.replace(/\[ClientFirstName\]/g, escrow.clientFirstName || 'Client');
    text = text.replace(/\[ClientLastName\]/g, escrow.clientLastName || '');
    text = text.replace(/\[Client1Name\]/g, client1FullName || 'Client');
    text = text.replace(/\[Client1FirstName\]/g, escrow.clientFirstName || 'Client');
    text = text.replace(/\[Client1LastName\]/g, escrow.clientLastName || '');
    text = text.replace(/\[Client1Phone\]/g, escrow.clientPhone || 'N/A');
    text = text.replace(/\[Client1Email\]/g, escrow.clientEmail || 'N/A');
    text = text.replace(/\[ClientPhone\]/g, escrow.clientPhone || 'N/A');
    text = text.replace(/\[Client Phone\]/g, escrow.clientPhone || 'N/A');
    text = text.replace(/\[ClientEmail\]/g, escrow.clientEmail || 'N/A');
    text = text.replace(/\[Client Email\]/g, escrow.clientEmail || 'N/A');

    // Client 2 individual placeholders
    text = text.replace(/\[Client2Name\]/g, client2FullName || (hasClient2 ? 'Client 2' : ''));
    text = text.replace(/\[Client 2 Name\]/g, client2FullName || (hasClient2 ? 'Client 2' : ''));
    text = text.replace(/\[Client2FirstName\]/g, escrow.client2FirstName || '');
    text = text.replace(/\[Client 2 First Name\]/g, escrow.client2FirstName || '');
    text = text.replace(/\[Client2LastName\]/g, escrow.client2LastName || '');
    text = text.replace(/\[Client 2 Last Name\]/g, escrow.client2LastName || '');
    text = text.replace(/\[Client2Phone\]/g, escrow.client2Phone || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Client 2 Phone\]/g, escrow.client2Phone || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Client2Email\]/g, escrow.client2Email || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Client 2 Email\]/g, escrow.client2Email || (hasClient2 ? 'N/A' : ''));

    // Buyer & Seller aliases
    text = text.replace(/\[Buyer Name\]/g, client1FullName || 'Buyer');
    text = text.replace(/\[Buyer Email\]/g, escrow.clientEmail || 'N/A');
    text = text.replace(/\[Buyer Phone\]/g, escrow.clientPhone || 'N/A');
    text = text.replace(/\[Buyer 2 Name\]/g, client2FullName || (hasClient2 ? 'Buyer 2' : ''));
    text = text.replace(/\[Buyer 2 Email\]/g, escrow.client2Email || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Buyer 2 Phone\]/g, escrow.client2Phone || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Buyer2Name\]/g, client2FullName || (hasClient2 ? 'Buyer 2' : ''));
    text = text.replace(/\[Buyer2Email\]/g, escrow.client2Email || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Buyer2Phone\]/g, escrow.client2Phone || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Seller 2 Name\]/g, client2FullName || (hasClient2 ? 'Seller 2' : ''));
    text = text.replace(/\[Seller 2 Email\]/g, escrow.client2Email || (hasClient2 ? 'N/A' : ''));
    text = text.replace(/\[Seller 2 Phone\]/g, escrow.client2Phone || (hasClient2 ? 'N/A' : ''));

    // Dynamic Client 2 Blocks (inserts formatted second client details only if client 2 exists)
    const client2BuyerBlock = hasClient2 
      ? `\n\nBuyer 2\nName: ${client2FullName || 'Buyer 2'}\nEmail: ${escrow.client2Email || 'N/A'}\nPhone: ${escrow.client2Phone || 'N/A'}`
      : '';
    const client2SellerBlock = hasClient2 
      ? `\n\nSeller 2\nName: ${client2FullName || 'Seller 2'}\nEmail: ${escrow.client2Email || 'N/A'}\nPhone: ${escrow.client2Phone || 'N/A'}`
      : '';
    const client2GenericBlock = hasClient2 
      ? `\n\nClient 2\nName: ${client2FullName || 'Client 2'}\nEmail: ${escrow.client2Email || 'N/A'}\nPhone: ${escrow.client2Phone || 'N/A'}`
      : '';
    
    text = text.replace(/\[Buyer2Block\]/g, client2BuyerBlock);
    text = text.replace(/\[Buyer 2 Block\]/g, client2BuyerBlock);
    text = text.replace(/\[Seller2Block\]/g, client2SellerBlock);
    text = text.replace(/\[Seller 2 Block\]/g, client2SellerBlock);
    text = text.replace(/\[Client2Block\]/g, client2GenericBlock);
    text = text.replace(/\[Client 2 Block\]/g, client2GenericBlock);
    text = text.replace(/\[Client2Info\]/g, client2GenericBlock);
    text = text.replace(/\[Client 2 Info\]/g, client2GenericBlock);
    text = text.replace(/\[Client 2 Information\]/g, client2GenericBlock);

    // Lender placeholders
    text = text.replace(/\[LenderName\]/g, escrow.lenderName || 'the lender');
    text = text.replace(/\[Lender Name\]/g, escrow.lenderName || 'the lender');
    text = text.replace(/\[Lender\]/g, escrow.lenderName || 'the lender');
    text = text.replace(/\[LenderEmail\]/g, escrow.lenderEmail || 'N/A');
    text = text.replace(/\[Lender Email\]/g, escrow.lenderEmail || 'N/A');
    text = text.replace(/\[LenderPhone\]/g, escrow.lenderPhone || 'N/A');
    text = text.replace(/\[Lender Phone\]/g, escrow.lenderPhone || 'N/A');
    text = text.replace(/\[Lender phone\]/g, escrow.lenderPhone || 'N/A');
    text = text.replace(/\[LenderPhoneNumber\]/g, escrow.lenderPhone || 'N/A');

    const hasLender = Boolean(
      (escrow.lenderName && escrow.lenderName.trim()) || 
      (escrow.lenderEmail && escrow.lenderEmail.trim()) || 
      (escrow.lenderPhone && escrow.lenderPhone.trim())
    );
    const lenderBlock = hasLender
      ? `\n\nLender Information\nLender: ${escrow.lenderName || 'N/A'}\nEmail: ${escrow.lenderEmail || 'N/A'}\nPhone: ${escrow.lenderPhone || 'N/A'}`
      : '';
    text = text.replace(/\[LenderBlock\]/g, lenderBlock);
    text = text.replace(/\[Lender Info\]/g, lenderBlock);
    text = text.replace(/\[Lender Information\]/g, lenderBlock);

    // Property & Escrow details
    const fullPropertyAddress = formatPropertyAddress(escrow);
    text = text.replace(/\[Address\]/g, fullPropertyAddress || 'the property');
    text = text.replace(/\[FullAddress\]/g, fullPropertyAddress || 'the property');
    text = text.replace(/\[Full Address\]/g, fullPropertyAddress || 'the property');
    text = text.replace(/\[StreetAddress\]/g, escrow.address || 'the property');
    text = text.replace(/\[Street Address\]/g, escrow.address || 'the property');
    text = text.replace(/\[City\]/g, escrow.city || '');
    text = text.replace(/\[Zip\]/g, escrow.zipCode || '');
    text = text.replace(/\[ZipCode\]/g, escrow.zipCode || '');
    text = text.replace(/\[Zip Code\]/g, escrow.zipCode || '');

    // Calculated Closing Date & Escrow Days Placeholders
    const currentDaysStr = escrowDays ? `${escrowDays}` : '30';
    const effectiveClosingFormatted = closingCalculation.formattedFull;

    text = text.replace(/\[COE\]/g, effectiveClosingFormatted);
    text = text.replace(/\[ClosingDate\]/g, effectiveClosingFormatted);
    text = text.replace(/\[Closing Date\]/g, effectiveClosingFormatted);
    text = text.replace(/\[CloseOfEscrow\]/g, effectiveClosingFormatted);
    text = text.replace(/\[Close of Escrow\]/g, effectiveClosingFormatted);
    text = text.replace(/\[TargetCOE\]/g, effectiveClosingFormatted);

    text = text.replace(/\[EscrowDays\]/g, currentDaysStr);
    text = text.replace(/\[Escrow Days\]/g, currentDaysStr);
    text = text.replace(/\[EscrowPeriod\]/g, `${currentDaysStr} days`);
    text = text.replace(/\[Escrow Period\]/g, `${currentDaysStr} days`);
    text = text.replace(/\[AcceptanceDate\]/g, startDate ? format(parseISO(startDate), 'MMMM d, yyyy') : 'Acceptance Date');
    text = text.replace(/\[Acceptance Date\]/g, startDate ? format(parseISO(startDate), 'MMMM d, yyyy') : 'Acceptance Date');

    text = text.replace(/\[Price\]/g, formatCurrency(escrow.price));
    text = text.replace(/\[AgentName\]/g, escrow.agentName || 'your agent');
    text = text.replace(/\[EscrowOfficer\]/g, escrow.escrowOfficer || 'the escrow officer');
    text = text.replace(/\[Esrow Officer\]/g, escrow.escrowOfficer || 'the escrow officer');
    text = text.replace(/\[Escrow Officer\]/g, escrow.escrowOfficer || 'the escrow officer');
    text = text.replace(/\[EscrowCompany\]/g, escrow.escrowCompany || 'the escrow company');
    text = text.replace(/\[Collaborator\]/g, escrow.escrowCompany || escrow.collaborator || 'the escrow company');
    text = text.replace(/\[EscrowEmail\]/g, escrow.escrowEmail || 'N/A');
    text = text.replace(/\[EscrowPhone\]/g, escrow.escrowPhone || 'N/A');

    // Commission placeholder
    const commissionStr = escrow.netCommission 
      ? (escrow.commissionPercent ? `${escrow.commissionPercent}% (${formatCurrency(escrow.netCommission)})` : formatCurrency(escrow.netCommission))
      : (escrow.commissionPercent ? `${escrow.commissionPercent}%` : 'N/A');
    text = text.replace(/\[Commission\]/g, commissionStr);
    text = text.replace(/\[commission\]/g, commissionStr);

    // Agent Phone & Email
    text = text.replace(/\[AgentPhone\]/g, escrow.agentPhone || 'N/A');
    text = text.replace(/\[Agent Phone\]/g, escrow.agentPhone || 'N/A');
    text = text.replace(/\[Agent phone\]/g, escrow.agentPhone || 'N/A');
    text = text.replace(/\[AgentEmail\]/g, escrow.agentEmail || 'N/A');
    text = text.replace(/\[Agent Email\]/g, escrow.agentEmail || 'N/A');
    text = text.replace(/\[Agent email\]/g, escrow.agentEmail || 'N/A');

    // Utilities placeholders
    const utilitiesFormatted = formatUtilitiesForAddress(escrow);
    text = text.replace(/\[UtilitiesList\]/g, utilitiesFormatted);
    text = text.replace(/\[Utilities List\]/g, utilitiesFormatted);
    text = text.replace(/\[Utilities\]/g, utilitiesFormatted);
    text = text.replace(/\[UtilityList\]/g, utilitiesFormatted);
    text = text.replace(/\[Utility List\]/g, utilitiesFormatted);
    text = text.replace(/\[UtilitiesBlock\]/g, utilitiesFormatted);

    // Replace any legacy '3Rd applicant' or 'Utilities for:' if still lingering in customized text
    text = text.replace(/3Rd applicant:?\s*/gi, `Here are the utilities for\n${fullPropertyAddress || 'the property'}\n\n`);
    text = text.replace(/Utilities for:\s*(\[Address\])?/gi, `Here are the utilities for\n${fullPropertyAddress || 'the property'}`);

    return text;
  };

  const getPopulatedSubject = (rawSubject: string) => {
    let subject = rawSubject;
    const fullPropertyAddress = formatPropertyAddress(escrow);
    subject = subject.replace(/\[Address\]/g, fullPropertyAddress || 'the property');
    subject = subject.replace(/\[FullAddress\]/g, fullPropertyAddress || 'the property');
    subject = subject.replace(/\[Full Address\]/g, fullPropertyAddress || 'the property');
    subject = subject.replace(/\[StreetAddress\]/g, escrow.address || 'the property');
    subject = subject.replace(/\[Street Address\]/g, escrow.address || 'the property');
    subject = subject.replace(/\[City\]/g, escrow.city || '');
    subject = subject.replace(/\[Zip\]/g, escrow.zipCode || '');
    subject = subject.replace(/\[COE\]/g, closingCalculation.formattedShort);
    subject = subject.replace(/\[EscrowDays\]/g, escrowDays ? `${escrowDays}` : '30');
    return subject;
  };

  // Re-populate text when template, dates, or escrow change
  useEffect(() => {
    if (selectedTemplate) {
      setEditedText(getPopulatedText(selectedTemplate.text));
      setMasterSubject(selectedTemplate.subject);
      setMasterText(selectedTemplate.text);
    }
  }, [selectedTemplateId, templates, escrow, startDate, escrowDays, closingCalculation.formattedFull]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveMaster = async () => {
    const updated = templates.map(t => {
      if (t.id === selectedTemplateId) {
        return { ...t, subject: masterSubject, text: masterText };
      }
      return t;
    });
    setTemplates(updated);
    localStorage.setItem('escrow_custom_templates', JSON.stringify(updated));

    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        await setDoc(docRef, { customTemplates: updated }, { merge: true });
      } catch (err) {
        console.error("Error saving centralized templates to Firestore:", err);
      }

      // If paulmuner@gmail.com, automatically propagate as company defaults for all agents
      if (user.email === 'paulmuner@gmail.com') {
        try {
          await fetch('/api/templates/defaults', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templates: updated, userEmail: user.email })
          });
          setBaseDefaults(updated);
        } catch (e) {
          console.warn('Error saving global defaults:', e);
        }
      }
    }

    setIsEditingMaster(false);
  };

  const handlePublishAsCompanyDefaults = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch('/api/templates/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates, userEmail: user?.email || 'paulmuner@gmail.com' })
      });
      const data = await res.json();
      if (data.success) {
        setBaseDefaults(templates);
        setPublishSuccess('All your customized messages are now set as the company default for all agents!');
        setTimeout(() => setPublishSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Failed to set company defaults:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResetTemplate = async () => {
    const original = baseDefaults.find(t => t.id === selectedTemplateId) || DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (original) {
      setMasterSubject(original.subject);
      setMasterText(original.text);
      const updated = templates.map(t => t.id === selectedTemplateId ? { ...original } : t);
      setTemplates(updated);
      localStorage.setItem('escrow_custom_templates', JSON.stringify(updated));
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          await setDoc(docRef, { customTemplates: updated }, { merge: true });
        } catch (err) {
          console.error("Error updating centralized templates:", err);
        }
      }
      setEditedText(getPopulatedText(original.text));
    }
  };

  const insertPlaceholder = (tag: string, field: 'subject' | 'text') => {
    if (field === 'subject') {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart ?? masterSubject.length;
        const end = input.selectionEnd ?? masterSubject.length;
        const newText = masterSubject.substring(0, start) + tag + masterSubject.substring(end);
        setMasterSubject(newText);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      } else {
        setMasterSubject(prev => prev + tag);
      }
    } else {
      const textarea = textTextAreaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? masterText.length;
        const end = textarea.selectionEnd ?? masterText.length;
        const newText = masterText.substring(0, start) + tag + masterText.substring(end);
        setMasterText(newText);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      } else {
        setMasterText(prev => prev + tag);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[120] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg md:max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden flex flex-col h-[78vh] sm:h-[84vh] max-h-[760px]"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-[#e5e5ea] flex justify-between items-center bg-slate-50 shrink-0">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">Notifications</span>
            <h2 className="font-extrabold text-xs sm:text-base text-slate-900 truncate max-w-[170px] sm:max-w-none" title={escrow.address}>
              {escrow.address}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdminOrOwner && (
              <button
                onClick={handlePublishAsCompanyDefaults}
                disabled={isPublishing}
                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center shrink-0"
                title="Publish all your customized messages as the system default for all agents"
                aria-label="Publish all messages as company default"
              >
                <Globe size={15} className={isPublishing ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              onClick={() => setIsEditingMaster(!isEditingMaster)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center transition-all cursor-pointer ${
                isEditingMaster 
                  ? 'bg-[#1B3A5C] text-white' 
                  : 'bg-white border border-[#e5e5ea] hover:bg-slate-100 text-[#334155]'
              }`}
            >
              {isEditingMaster ? 'Done' : 'Customize'}
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-[#e5e5ea] rounded-full transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-5 overflow-hidden flex-1 flex flex-col gap-2.5 min-h-0">
          {publishSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs shrink-0">
              <CheckCheck size={18} className="text-emerald-600 shrink-0" />
              <span>{publishSuccess}</span>
            </div>
          )}
          {!isEditingMaster ? (
            <>
              {/* Template Selection Dropdown */}
              <div className="relative w-full z-30 shrink-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Select Template
                  </label>

                  {/* Minimalist Segmented Pill: Buyer / Seller / All */}
                  <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSideFilterChange('buyer')}
                      className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                        sideFilter === 'buyer'
                          ? 'bg-[#1B3A5C] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Buyer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSideFilterChange('seller')}
                      className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                        sideFilter === 'seller'
                          ? 'bg-[#1B3A5C] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Seller
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSideFilterChange('all')}
                      className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                        sideFilter === 'all'
                          ? 'bg-[#1B3A5C] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 shadow-xs transition-all cursor-pointer select-none active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="truncate">{selectedTemplate.label}</span>
                      {selectedTemplate.side === 'seller' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
                          Seller
                        </span>
                      )}
                      {selectedTemplate.side === 'buyer' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200/60 shrink-0">
                          Buyer
                        </span>
                      )}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <>
                      {/* Close dropdown on background click */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      
                      {/* Floating dropdown options */}
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20 max-h-56 overflow-y-auto py-1 animate-in fade-in-50 slide-in-from-top-1">
                        {filteredTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTemplateId(t.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                              selectedTemplateId === t.id
                                ? 'bg-slate-100 text-slate-900 font-extrabold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="truncate">{t.label}</span>
                              {t.side === 'seller' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
                                  Seller
                                </span>
                              )}
                              {t.side === 'buyer' && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200/60 shrink-0">
                                  Buyer
                                </span>
                              )}
                            </div>
                            {selectedTemplateId === t.id && (
                              <Check size={15} className="text-slate-900 shrink-0" />
                            )}
                          </button>
                        ))}
                        {filteredTemplates.length === 0 && (
                          <div className="px-3.5 py-2 text-xs text-slate-400 italic">
                            No templates in this category
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Workspace - expands to fill the entire remaining vertical space */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex-1 flex flex-col gap-2 min-h-0 shadow-xs">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Message Body</span>
                    <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">(Live preview & edit)</span>
                  </span>
                  {hasClient2 && !isEscrowOfficerTemplate && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                      2 Clients
                    </span>
                  )}
                </div>

                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full flex-1 min-h-[110px] sm:min-h-[220px] bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1B3A5C] focus:ring-2 focus:ring-[#1B3A5C]/10 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-none font-sans leading-relaxed resize-none overflow-y-auto"
                  placeholder="Review or edit your message here..."
                />

                {/* Missing Contact Warning - compact one liner */}
                {((!escrow.clientPhone && !escrow.client2Phone && !isEscrowOfficerTemplate) ||
                  (!escrow.clientEmail && !escrow.client2Email && !isEscrowOfficerTemplate) ||
                  (!escrow.escrowPhone && isEscrowOfficerTemplate) ||
                  (!escrow.escrowEmail && isEscrowOfficerTemplate)) && (
                  <div className="text-[10px] text-amber-700 font-medium px-2 py-1 bg-amber-50/80 border border-amber-200/60 rounded-lg shrink-0 flex items-center gap-1.5">
                    <span>⚠️ Missing phone or email for direct send — use <strong>Copy</strong> to paste anywhere.</span>
                  </div>
                )}

                {/* Sleek, Compact Action Bar (Uniform height, single row on mobile, refined aesthetics) */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 h-9 px-3 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    title="Copy message to clipboard"
                  >
                    {copied ? <Check size={14} className="text-emerald-600 shrink-0" /> : <Copy size={14} className="text-slate-500 shrink-0" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  {/* Text Buttons */}
                  {isEscrowOfficerTemplate ? (
                    <a
                      href={`sms:${escrow.escrowPhone ? escrow.escrowPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                      className={`flex-1 h-9 px-3 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 text-white ${
                        escrow.escrowPhone ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-slate-200 text-slate-400 pointer-events-none'
                      }`}
                      title={escrow.escrowPhone ? `Text Officer (${escrow.escrowPhone})` : 'No escrow officer phone saved'}
                    >
                      <MessageSquare size={13} className="shrink-0" />
                      <span>Text</span>
                    </a>
                  ) : (
                    <>
                      {hasClient2 && escrow.client2Phone ? (
                        <div className="flex-1 flex items-center gap-1.5">
                          <a
                            href={`sms:${escrow.clientPhone ? escrow.clientPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                            className={`flex-1 h-9 px-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1 text-white ${
                              escrow.clientPhone ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-slate-200 text-slate-400 pointer-events-none'
                            }`}
                            title={escrow.clientPhone ? `Text ${escrow.clientFirstName || 'Client 1'}` : 'No phone'}
                          >
                            <MessageSquare size={12} className="shrink-0" />
                            <span className="truncate">Text {escrow.clientFirstName ? escrow.clientFirstName.split(' ')[0] : '1'}</span>
                          </a>
                          <a
                            href={`sms:${escrow.client2Phone.replace(/\D/g, '')}?body=${encodeURIComponent(editedText)}`}
                            className="flex-1 h-9 px-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                            title={`Text ${escrow.client2FirstName || 'Client 2'}`}
                          >
                            <MessageSquare size={12} className="shrink-0" />
                            <span className="truncate">Text {escrow.client2FirstName ? escrow.client2FirstName.split(' ')[0] : '2'}</span>
                          </a>
                        </div>
                      ) : (
                        <a
                          href={`sms:${escrow.clientPhone ? escrow.clientPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                          className={`flex-1 h-9 px-3 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 text-white ${
                            escrow.clientPhone ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-slate-200 text-slate-400 pointer-events-none'
                          }`}
                          title={escrow.clientPhone ? `Text Client (${escrow.clientPhone})` : 'No client phone saved'}
                        >
                          <MessageSquare size={13} className="shrink-0" />
                          <span>Text</span>
                        </a>
                      )}
                    </>
                  )}

                  {/* Email Button */}
                  <a
                    href={`mailto:${recipientEmail || ''}?subject=${encodeURIComponent(getPopulatedSubject(selectedTemplate.subject))}&body=${encodeURIComponent(editedText)}`}
                    className={`flex-1 h-9 px-3 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 text-white ${
                      recipientEmail ? 'bg-[#1B3A5C] hover:bg-[#11253C] cursor-pointer' : 'bg-slate-200 text-slate-400 pointer-events-none'
                    }`}
                    title={recipientEmail ? `Email ${recipientName}` : 'No email address saved'}
                  >
                    <Mail size={13} className="shrink-0" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex-1 flex flex-col gap-2.5 min-h-0 shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 shrink-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    Editing: <span className="text-[#1B3A5C] font-extrabold">{selectedTemplate.label}</span>
                  </h4>
                  {selectedTemplate.side === 'seller' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 shrink-0">
                      Seller
                    </span>
                  )}
                  {selectedTemplate.side === 'buyer' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200/60 shrink-0">
                      Buyer
                    </span>
                  )}
                </div>
                <button
                  onClick={handleResetTemplate}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline font-bold cursor-pointer shrink-0"
                >
                  Restore Defaults
                </button>
              </div>

              {/* Subject Field */}
              <div className="shrink-0">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">Subject Line</label>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => insertPlaceholder('[Address]', 'subject')}
                      className="text-[9px] bg-white border border-slate-200 hover:border-slate-300 rounded px-1.5 py-0.5 font-mono text-[#1B3A5C] hover:bg-slate-50 font-bold cursor-pointer"
                    >
                      + [Address]
                    </button>
                    <button 
                      onClick={() => insertPlaceholder('[COE]', 'subject')}
                      className="text-[9px] bg-white border border-slate-200 hover:border-slate-300 rounded px-1.5 py-0.5 font-mono text-[#1B3A5C] hover:bg-slate-50 font-bold cursor-pointer"
                    >
                      + [COE]
                    </button>
                  </div>
                </div>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={masterSubject}
                  onChange={(e) => setMasterSubject(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-[#1B3A5C] focus:outline-none focus:border-[#1B3A5C]"
                  placeholder="Escrow Opened - [Address]"
                />
              </div>

              {/* Text Body Field - Expands vertically */}
              <div className="flex-1 flex flex-col min-h-0 gap-1.5">
                <div className="flex flex-col gap-1 shrink-0">
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">Message Template Body</label>
                  
                  {/* Horizontally scrollable chip bar so it doesn't crowd out the editor on mobile */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1 px-1.5 bg-white border border-slate-200 rounded-xl max-w-full">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">Insert:</span>
                    {[
                      { tag: '[EscrowDays]', label: 'Days' },
                      { tag: '[COE]', label: 'COE' },
                      { tag: '[AcceptanceDate]', label: 'Acceptance' },
                      { tag: '[ClientName]', label: 'Client Name' },
                      { tag: '[ClientFirstName]', label: 'First Name' },
                      { tag: '[ClientLastName]', label: 'Last Name' },
                      { tag: '[ClientPhone]', label: 'Phone' },
                      { tag: '[ClientEmail]', label: 'Email' },
                      { tag: '[Client2Name]', label: 'Client 2 Name' },
                      { tag: '[Client2Phone]', label: 'Client 2 Phone' },
                      { tag: '[Client2Email]', label: 'Client 2 Email' },
                      { tag: '[Buyer2Block]', label: 'Buyer 2' },
                      { tag: '[Seller2Block]', label: 'Seller 2' },
                      { tag: '[Client2Block]', label: 'Client 2 Block' },
                      { tag: '[LenderName]', label: 'Lender' },
                      { tag: '[LenderPhone]', label: 'Lender Phone' },
                      { tag: '[LenderEmail]', label: 'Lender Email' },
                      { tag: '[LenderBlock]', label: 'Lender Block' },
                      { tag: '[Address]', label: 'Address' },
                      { tag: '[Price]', label: 'Price' },
                      { tag: '[AgentName]', label: 'Agent' },
                      { tag: '[EscrowOfficer]', label: 'Escrow Officer' },
                      { tag: '[EscrowCompany]', label: 'Escrow Co' },
                      { tag: '[Collaborator]', label: 'Collaborator' },
                      { tag: '[EscrowEmail]', label: 'Escrow Email' },
                      { tag: '[EscrowPhone]', label: 'Escrow Phone' },
                      { tag: '[Commission]', label: 'Commission' },
                      { tag: '[AgentPhone]', label: 'Agent Phone' },
                      { tag: '[AgentEmail]', label: 'Agent Email' },
                      { tag: '[UtilitiesList]', label: 'Utilities List' }
                    ].map(p => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => insertPlaceholder(p.tag, 'text')}
                        className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 font-bold text-[#1B3A5C] active:scale-95 transition-all shrink-0 cursor-pointer"
                        title={`Insert ${p.tag}`}
                      >
                        + <span className="font-mono">{p.tag}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  ref={textTextAreaRef}
                  value={masterText}
                  onChange={(e) => setMasterText(e.target.value)}
                  className="w-full flex-1 min-h-[110px] sm:min-h-[180px] bg-white border border-slate-200 rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:border-[#1B3A5C] font-sans leading-relaxed resize-none overflow-y-auto"
                  placeholder="Type your template body text here..."
                />
              </div>

              {/* Save & Cancel Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 shrink-0 w-full">
                <div>
                  {isAdminOrOwner && (
                    <button
                      type="button"
                      onClick={handlePublishAsCompanyDefaults}
                      disabled={isPublishing}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50"
                      title="Publish all your customized messages as the system default for all agents"
                      aria-label="Publish all messages as company default"
                    >
                      <Globe size={15} className={isPublishing ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingMaster(false)}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMaster}
                    className="px-4 py-1.5 bg-[#1B3A5C] hover:bg-[#11253C] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
