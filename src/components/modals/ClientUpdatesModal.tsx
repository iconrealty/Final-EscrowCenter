import React, { useState, useEffect, useRef } from 'react';
import { Escrow, formatPropertyAddress } from '../../types';
import { X, MessageSquare, Mail, Copy, Check, ChevronDown } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const OLD_FIRST_ESCROW = 'Hi [Esrow Officer],\n\nWhile my Transaction Coordinator uploads the remaining documents to our platform, below is the buyer and Transaction Coordinator information.\n\nBuyers\nName: [Buyer Name]\nEmail: [Buyer Email]\nPhone: [Buyer Phone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const OLD_OPENING = 'Hi [ClientName], Escrow has officially been opened 🎉\nHere are the important contacts to keep in mind:\n\nESCROW:\n\nEscrow company: [Collaborator]\nEscrow officer: [EscrowOfficer]\nEscrow email: [EscrowEmail]\nEscrow phone number: [EscrowPhone]\n\nTransaction Coordinators\nBrittany Kauten\nbrittany@iconrealty.io\n\nKatya Abellar\ntc@iconrealty.io\n\nWHAT’S NEXT:\n\nEscrow will be sending you wire instructions shortly for the initial deposit (3%). Please follow the instructions carefully. If you have any questions at any time, I’m always available.\n\nInspection: I’m coordinating the inspection, tentatively for Wednesday afternoon. I’ll confirm availability and keep you posted.';

const OLD_LISTING_OPEN_V1 = 'Hi [Esrow Officer],\n\nPlease open escrow for our new listing at [Address].\n\nSellers\nName: [ClientName]\nEmail: [Buyer Email]\nPhone: [Buyer Phone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const OLD_LISTING_OPEN_V2 = 'Hi [Escrow Officer],\n\nPlease open escrow for our new listing at [Address].\n\nSellers\nName: [ClientFirstName] [ClientLastName]\nEmail: [ClientEmail]\nPhone: [ClientPhone][Client2Block]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!';

const TEMPLATES = [
  {
    id: 'opening',
    label: 'Escrow Opened (Buyer)',
    subject: 'Escrow Opened: [Address]',
    text: 'Hi [ClientName], Escrow has officially been opened 🎉\nHere are the important contacts to keep in mind:\n\nESCROW:\n\nEscrow company: [Collaborator]\nEscrow officer: [EscrowOfficer]\nEscrow email: [EscrowEmail]\nEscrow phone number: [EscrowPhone]\n\nLENDER:\n\nLender: [LenderName]\nLender email: [LenderEmail]\nLender phone number: [LenderPhone]\n\nTransaction Coordinators\nBrittany Kauten\nbrittany@iconrealty.io\n\nKatya Abellar\ntc@iconrealty.io\n\nWHAT’S NEXT:\n\nEscrow will be sending you wire instructions shortly for the initial deposit (3%). Please follow the instructions carefully. If you have any questions at any time, I’m always available.\n\nInspection: I’m coordinating the inspection, tentatively for Wednesday afternoon. I’ll confirm availability and keep you posted.'
  },
  {
    id: 'opening_listing',
    label: 'Escrow Opened (Listing)',
    subject: 'Escrow Opened: [Address]',
    text: 'Hi [ClientName], Escrow has officially been opened 🎉\nHere are the important contacts to keep in mind:\n\nESCROW:\n\nEscrow company: [Collaborator]\nEscrow officer: [EscrowOfficer]\nEscrow email: [EscrowEmail]\nEscrow phone number: [EscrowPhone]\n\nTransaction Coordinators\nBrittany Kauten\nbrittany@iconrealty.io\n\nKatya Abellar\ntc@iconrealty.io\n\nWHAT’S NEXT:\n\nWe will be coordinating the next steps with the buyer\'s side. If you have any questions at any time, I’m always available.'
  },
  {
    id: 'first_escrow_email',
    label: 'First Escrow Email / Request to Open (Buyer)',
    subject: 'First Escrow Email - [Address]',
    text: 'Hi [Escrow Officer],\n\nWhile my Transaction Coordinator uploads the remaining documents to our platform, below is the buyer, lender, and Transaction Coordinator information.\n\nBuyers\nName: [ClientFirstName] [ClientLastName]\nEmail: [ClientEmail]\nPhone: [ClientPhone][Buyer2Block]\n\nLender Information\nLender: [LenderName]\nEmail: [LenderEmail]\nPhone: [LenderPhone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!'
  },
  {
    id: 'inspection_day',
    label: 'Schedule Inspection',
    subject: 'Schedule Inspection - [Address]',
    text: 'Hi [ClientFirstName],\n\nThe inspection usually takes about 1.5 hours, and I recommend that you be present for at least the last 30 minutes so the inspector can walk you through the main findings. \nAt the same time, we’ll be conducting our initial visual home inspection.'
  },
  {
    id: 'request_open_escrow_listing',
    label: 'Request to Open Escrow (Listing side)',
    subject: 'Request to Open Escrow: [Address]',
    text: 'Hi [Escrow Officer],\n\nPlease open escrow for our new listing at [Address].\n\nSellers\nName: [ClientFirstName] [ClientLastName]\nEmail: [ClientEmail]\nPhone: [ClientPhone][Seller2Block]\n\nLender Information\nLender: [LenderName]\nEmail: [LenderEmail]\nPhone: [LenderPhone]\n\nTransaction Coordinators\nBrittany Kauten\nEmail: brittany@iconrealty.io\n\nKatya Abellar\nEmail: tc@iconrealty.io\n\nPlease include both Brittany and Katya on all escrow-related communications moving forward.\n\nThank you!'
  },
  {
    id: 'emd',
    label: 'EMD Received by Escrow',
    subject: 'EMD Received - [Address]',
    text: 'Hi [ClientName], this is to confirm that your Earnest Money Deposit (EMD) has been successfully received by [EscrowOfficer]. That is another major milestone complete! I will keep you posted on the next steps. - [AgentName]'
  },
  {
    id: 'insurance',
    label: 'Get Insurance (Buyer)',
    subject: 'Home Insurance Quotes - [Address]',
    text: 'Hi [ClientName],\n\nNow its time to get quotes on Home insurance, you can try first with your actual insurance company if you need any additional quotes please let me know. - [AgentName]'
  },
  {
    id: 'appraisal',
    label: 'Appraisal Completed',
    subject: 'Appraisal Completed - [Address]',
    text: 'Hi [ClientName], fantastic news! The property appraisal for [Address] has been completed and it came in at value! We are in great shape to move forward. - [AgentName]'
  },
  {
    id: 'disclosures',
    label: 'Disclosures Reviewed (Buyer)',
    subject: 'Disclosures Completed - [Address]',
    text: 'Hi [ClientName], we have successfully completed the review and signature of all seller disclosures for [Address]. Thank you for your prompt responses! - [AgentName]'
  },
  {
    id: 'loan_approval',
    label: 'Signing Appointment',
    subject: 'Signing Appointment - [Address]',
    text: 'Hi [ClientName], congratulations! Your lender ([LenderName]) has issued the Final Loan Approval! This is a major milestone and means we are almost at the finish line. Next up will be signing our final loan documents. - [AgentName]'
  },
  {
    id: 'contingencies',
    label: 'Contingencies Removal',
    subject: 'Contingencies Removal - [Address]',
    text: 'Hi [ClientName], we have officially removed the contingencies for your escrow on [Address]! This is a huge milestone that secures our position and brings us one step closer to closing on [COE]. - [AgentName]'
  },
  {
    id: 'signing',
    label: 'Signed Docs sent to lender',
    subject: 'Signed Docs Sent to Lender - [Address]',
    text: 'Hi [ClientName], great job signing the final escrow and loan documents today! We are now waiting on the final lender review, funding, and recording. - [AgentName]'
  },
  {
    id: 'funds',
    label: 'Final Funds Wired',
    subject: 'Final Wire Received - [Address]',
    text: 'Hi [ClientName], the escrow company has confirmed receipt of your final wire deposit. Everything is set on your side for recording. - [AgentName]'
  },
  {
    id: 'closing',
    label: 'Transaction Closed',
    subject: 'Congratulations! Escrow Closed - [Address]',
    text: 'Hi [ClientName], IT IS OFFICIAL! Our transaction has recorded and escrow is officially CLOSED on [Address]! Congratulations on your home! It has been an absolute pleasure working with you. - [AgentName]'
  }
];

const upgradeTemplateIfNeeded = (t: typeof TEMPLATES[number], custom?: { id: string; text?: string; subject?: string }) => {
  if (!custom || !custom.text) return t;

  // Upgrade 'request_open_escrow_listing' if it doesn't contain Lender or Seller 2 details
  if (t.id === 'request_open_escrow_listing') {
    const textLower = custom.text.toLowerCase();
    const hasLender = textLower.includes('lender');
    const hasSeller2 = custom.text.includes('Seller2Block') || custom.text.includes('Seller 2') || custom.text.includes('Client2Block') || custom.text.includes('Seller2');
    if (!hasLender || !hasSeller2 || custom.text === OLD_LISTING_OPEN_V1 || custom.text === OLD_LISTING_OPEN_V2) {
      return t;
    }
  }

  // Upgrade 'first_escrow_email' if it doesn't contain Lender or Buyer 2 details
  if (t.id === 'first_escrow_email') {
    const textLower = custom.text.toLowerCase();
    const hasLender = textLower.includes('lender');
    const hasBuyer2 = custom.text.includes('Buyer2Block') || custom.text.includes('Buyer 2') || custom.text.includes('Client2Block') || custom.text.includes('Buyer2');
    if (!hasLender || !hasBuyer2 || custom.text === OLD_FIRST_ESCROW) {
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

  return { ...t, text: custom.text, subject: custom.subject || t.subject };
};

export function ClientUpdatesModal({
  escrow,
  onClose
}: {
  escrow: Escrow;
  onClose: () => void;
}) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const { user } = useAuth();

  const [templates, setTemplates] = useState<typeof TEMPLATES>(() => {
    const saved = localStorage.getItem('escrow_custom_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const upgraded = TEMPLATES.map(t => {
          const custom = parsed.find((p: any) => p.id === t.id);
          return upgradeTemplateIfNeeded(t, custom);
        });
        localStorage.setItem('escrow_custom_templates', JSON.stringify(upgraded));
        return upgraded;
      } catch (e) {
        return TEMPLATES;
      }
    }
    return TEMPLATES;
  });

  // Load centralized templates from Firestore when logged in
  useEffect(() => {
    if (!user) return;

    const loadCloudTemplates = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.customTemplates)) {
            const cloudTemplates = data.customTemplates;
            const upgraded = TEMPLATES.map(t => {
              const custom = cloudTemplates.find((p: any) => p.id === t.id);
              return upgradeTemplateIfNeeded(t, custom);
            });
            setTemplates(upgraded);
            localStorage.setItem('escrow_custom_templates', JSON.stringify(upgraded));
            await setDoc(docRef, { customTemplates: upgraded }, { merge: true });
          }
        }
      } catch (err) {
        console.error("Error loading centralized templates from Firestore:", err);
      }
    };

    loadCloudTemplates();
  }, [user]);

  const [selectedTemplateId, setSelectedTemplateId] = useState('opening');
  const isEscrowOfficerTemplate = selectedTemplateId === 'first_escrow_email' || selectedTemplateId === 'request_open_escrow_listing';
  
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
    text = text.replace(/\[COE\]/g, escrow.coeDate ? format(parseISO(escrow.coeDate), 'MMMM d, yyyy') : 'the scheduled closing date');
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
    return subject;
  };

  useEffect(() => {
    if (selectedTemplate) {
      setEditedText(getPopulatedText(selectedTemplate.text));
      setMasterSubject(selectedTemplate.subject);
      setMasterText(selectedTemplate.text);
    }
  }, [selectedTemplateId, templates, escrow]);

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
    }

    setIsEditingMaster(false);
  };

  const handleResetTemplate = async () => {
    const original = TEMPLATES.find(t => t.id === selectedTemplateId);
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

  const handleResetCurrentToDefault = async () => {
    const original = TEMPLATES.find(t => t.id === selectedTemplateId);
    if (original) {
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
    <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-3 pt-12 pb-6 sm:p-6 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh]"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#e5e5ea] flex justify-between items-start bg-slate-50 shrink-0">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1B3A5C]/60 block mb-0.5">Quick Client Updates</span>
            <h2 className="font-extrabold text-base sm:text-lg text-[#1B3A5C] truncate max-w-[220px] sm:max-w-none" title={escrow.address}>
              {escrow.address}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#e5e5ea] rounded-full transition-colors text-slate-500 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          <div className="flex justify-end items-center pb-2 border-b border-[#e5e5ea]">
            <button
              onClick={() => setIsEditingMaster(!isEditingMaster)}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold flex items-center transition-all ${
                isEditingMaster 
                  ? 'bg-[#1B3A5C] text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-[#334155]'
              }`}
            >
              {isEditingMaster ? 'Cancel Customizing' : 'Customize Templates'}
            </button>
          </div>

          {!isEditingMaster ? (
            <>
              {/* Template Selection Dropdown */}
              <div className="relative w-full z-30">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#1B3A5C]/60 block mb-1.5">
                  Select Update Milestone
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#e5e5ea] hover:border-[#1B3A5C]/30 rounded-2xl text-sm font-bold text-[#1B3A5C] shadow-sm transition-all cursor-pointer select-none active:scale-[0.99]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {selectedTemplate.label}
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <>
                      {/* Close dropdown on background click */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      
                      {/* Floating dropdown options */}
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#e5e5ea] rounded-2xl shadow-xl overflow-hidden z-20 max-h-60 overflow-y-auto py-1.5 animate-in fade-in-50 slide-in-from-top-1">
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setSelectedTemplateId(t.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3.5 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                              selectedTemplateId === t.id
                                ? 'bg-[#1B3A5C]/5 text-[#1B3A5C] font-extrabold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{t.label}</span>
                            {selectedTemplateId === t.id && (
                              <Check size={16} className="text-[#1B3A5C]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recipient Details & Workspace */}
              <div className="bg-slate-50 border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#1B3A5C] bg-[#1B3A5C]/10 px-2.5 py-0.5 rounded-lg truncate max-w-full">
                    Recipient: {recipientName} {recipientPhone && !hasClient2 ? `(${recipientPhone})` : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasClient2 && !isEscrowOfficerTemplate && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-lg">
                        2 Clients on File
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleResetCurrentToDefault}
                      title="Reset this milestone message to latest default"
                      className="text-[10px] font-bold text-slate-500 hover:text-[#1B3A5C] underline cursor-pointer"
                    >
                      Reset to default
                    </button>
                  </div>
                </div>

                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl p-3 text-sm focus:outline-none focus:border-[#1B3A5C] font-sans leading-relaxed shadow-inner h-28 sm:h-48 min-h-[100px]"
                />

                <div className="flex flex-col gap-3 pt-3 border-t border-[#e5e5ea] w-full">
                  <div className="flex flex-col gap-0.5">
                    {!isEscrowOfficerTemplate ? (
                      <>
                        {!escrow.clientPhone && !escrow.client2Phone && (
                          <span className="text-[10px] text-[#ef4444] font-bold">⚠️ No client phone saved (add it in edit form)</span>
                        )}
                        {!escrow.clientEmail && !escrow.client2Email && (
                          <span className="text-[10px] text-amber-600 font-bold">⚠️ No client email saved</span>
                        )}
                      </>
                    ) : (
                      <>
                        {!escrow.escrowPhone && (
                          <span className="text-[10px] text-[#ef4444] font-bold">⚠️ No escrow officer phone saved</span>
                        )}
                        {!escrow.escrowEmail && (
                          <span className="text-[10px] text-amber-600 font-bold">⚠️ No escrow officer email saved</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                    <button
                      onClick={handleCopy}
                      className="px-3.5 py-2.5 sm:py-2 bg-white border border-[#e5e5ea] hover:bg-slate-50 text-[#334155] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer text-center flex-1 sm:flex-initial"
                    >
                      {copied ? 'Copied to Clipboard!' : 'Copy Message'}
                    </button>

                    {/* Text Buttons */}
                    {isEscrowOfficerTemplate ? (
                      <a
                        href={`sms:${escrow.escrowPhone ? escrow.escrowPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                        className={`px-3.5 py-2.5 sm:py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                          escrow.escrowPhone ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                        }`}
                      >
                        <MessageSquare size={13} />
                        <span>Text Officer</span>
                      </a>
                    ) : (
                      <>
                        {hasClient2 && escrow.client2Phone ? (
                          <>
                            <a
                              href={`sms:${escrow.clientPhone ? escrow.clientPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                              className={`px-3 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 flex-1 sm:flex-initial ${
                                escrow.clientPhone ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                              }`}
                              title={escrow.clientPhone ? `Text ${escrow.clientFirstName || 'Client 1'} (${escrow.clientPhone})` : 'No phone'}
                            >
                              <MessageSquare size={12} />
                              <span>Text {escrow.clientFirstName || 'Client 1'}</span>
                            </a>
                            <a
                              href={`sms:${escrow.client2Phone.replace(/\D/g, '')}?body=${encodeURIComponent(editedText)}`}
                              className="px-3 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 cursor-pointer flex-1 sm:flex-initial"
                              title={`Text ${escrow.client2FirstName || 'Client 2'} (${escrow.client2Phone})`}
                            >
                              <MessageSquare size={12} />
                              <span>Text {escrow.client2FirstName || 'Client 2'}</span>
                            </a>
                          </>
                        ) : (
                          <a
                            href={`sms:${escrow.clientPhone ? escrow.clientPhone.replace(/\D/g, '') : ''}?body=${encodeURIComponent(editedText)}`}
                            className={`px-3.5 py-2.5 sm:py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                              escrow.clientPhone ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                            }`}
                          >
                            <MessageSquare size={13} />
                            <span>Text Client</span>
                          </a>
                        )}
                      </>
                    )}

                    {/* Email Button */}
                    <a
                      href={`mailto:${recipientEmail || ''}?subject=${encodeURIComponent(getPopulatedSubject(selectedTemplate.subject))}&body=${encodeURIComponent(editedText)}`}
                      className={`px-3.5 py-2.5 sm:py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial ${
                        recipientEmail ? 'bg-[#1B3A5C] hover:bg-[#11253C] cursor-pointer' : 'bg-gray-200 pointer-events-none opacity-50 cursor-not-allowed text-[#86868b]'
                      }`}
                      title={recipientEmail ? `Email ${recipientName}` : 'No email saved'}
                    >
                      <Mail size={13} />
                      <span>{isEscrowOfficerTemplate ? 'Email Officer' : (hasClient2 ? 'Email Both Clients' : 'Email Client')}</span>
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-[#e5e5ea] rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold text-[#1B3A5C]">
                  Editing template phrasing: <span className="text-slate-800 font-extrabold">{selectedTemplate.label}</span>
                </h4>
                <button
                  onClick={handleResetTemplate}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline font-bold cursor-pointer"
                >
                  Restore Defaults
                </button>
              </div>

              {/* Subject Field */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] uppercase font-extrabold text-[#334155] tracking-wider">Subject Template</label>
                  <button 
                    onClick={() => insertPlaceholder('[Address]', 'subject')}
                    className="text-[8px] bg-white border border-[#e5e5ea] rounded px-1.5 py-0.5 font-mono text-[#1B3A5C] hover:bg-slate-100 font-bold cursor-pointer"
                  >
                    + [Address]
                  </button>
                </div>
                <input
                  ref={subjectInputRef}
                  type="text"
                  value={masterSubject}
                  onChange={(e) => setMasterSubject(e.target.value)}
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl px-3 py-2 text-xs font-bold text-[#1B3A5C] focus:outline-none focus:border-[#1B3A5C]"
                  placeholder="e.g. Escrow Opened - [Address]"
                />
              </div>

              {/* Text Body Field */}
              <div>
                <div className="flex flex-col gap-1.5 mb-2">
                  <label className="text-[10px] uppercase font-extrabold text-[#334155] tracking-wider">Message Body Template</label>
                  
                  {/* Placeholder Buttons */}
                  <div className="flex flex-wrap gap-1 bg-white p-2 rounded-xl border border-[#e5e5ea]">
                    <span className="text-[8px] font-bold text-[#86868b] uppercase tracking-wider self-center mr-1">Insert placeholders:</span>
                    {[
                      { tag: '[ClientName]', label: 'Client(s) Full Name' },
                      { tag: '[ClientFirstName]', label: 'Client 1 First Name' },
                      { tag: '[ClientLastName]', label: 'Client 1 Last Name' },
                      { tag: '[ClientPhone]', label: 'Client 1 Phone' },
                      { tag: '[ClientEmail]', label: 'Client 1 Email' },
                      { tag: '[Client2Name]', label: 'Client 2 Name' },
                      { tag: '[Client2Phone]', label: 'Client 2 Phone' },
                      { tag: '[Client2Email]', label: 'Client 2 Email' },
                      { tag: '[Buyer2Block]', label: 'Buyer 2 Block' },
                      { tag: '[Seller2Block]', label: 'Seller 2 Block' },
                      { tag: '[Client2Block]', label: 'Client 2 Details Block' },
                      { tag: '[LenderName]', label: 'Lender Name' },
                      { tag: '[LenderPhone]', label: 'Lender Phone' },
                      { tag: '[LenderEmail]', label: 'Lender Email' },
                      { tag: '[LenderBlock]', label: 'Lender Details Block' },
                      { tag: '[Address]', label: 'Property Address' },
                      { tag: '[COE]', label: 'COE Date' },
                      { tag: '[Price]', label: 'Sale Price' },
                      { tag: '[AgentName]', label: 'Agent Name' },
                      { tag: '[EscrowOfficer]', label: 'Escrow Officer' },
                      { tag: '[EscrowCompany]', label: 'Escrow Company' },
                      { tag: '[Collaborator]', label: 'Collaborator' },
                      { tag: '[EscrowEmail]', label: 'Escrow Email' },
                      { tag: '[EscrowPhone]', label: 'Escrow Phone' },
                      { tag: '[Commission]', label: 'Commission' },
                      { tag: '[AgentPhone]', label: 'Agent Phone' },
                      { tag: '[AgentEmail]', label: 'Agent Email' }
                    ].map(p => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => insertPlaceholder(p.tag, 'text')}
                        className="text-[9px] bg-slate-50 hover:bg-slate-100 border border-[#e5e5ea] rounded-lg px-2 py-1 font-bold text-[#1B3A5C] active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
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
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl p-3 text-sm focus:outline-none focus:border-[#1B3A5C] font-sans leading-relaxed h-24 sm:h-36 min-h-[80px]"
                  placeholder="Type your template body text here..."
                />
                <p className="text-[10px] text-[#86868b] mt-1.5 leading-normal">
                  <strong>Brackets Guide:</strong> When viewing an escrow, placeholders like <code>[ClientName]</code>, <code>[Client2Block]</code>, <code>[LenderName]</code>, or <code>[Address]</code> will automatically fill with real info.
                </p>
              </div>

              {/* Save & Cancel */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-[#e5e5ea] w-full">
                <button
                  onClick={() => setIsEditingMaster(false)}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-white border border-[#e5e5ea] hover:bg-slate-100 text-[#334155] rounded-xl text-sm sm:text-xs font-bold transition-all shadow-sm cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMaster}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-[#1B3A5C] hover:bg-[#11253C] text-white rounded-xl text-sm sm:text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer text-center"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
