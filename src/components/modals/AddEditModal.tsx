import React, { useState, useEffect } from 'react';
import { Escrow, CONTINGENCIES, adjustWeekendToMonday } from '../../types';
import { X, Sparkles } from 'lucide-react';
import { addMonths, addDays, parseISO, format } from 'date-fns';
import { parseSisuText } from '../../utils/csvUtils';

export function AddEditModal({ 
  escrow, 
  onClose, 
  onSave 
}: { 
  escrow?: Escrow | null; 
  onClose: () => void; 
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState(() => {
    return {
      escrowNumber: '',
      escrowCompany: '',
      address: '',
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

  const [showSisuPaste, setShowSisuPaste] = useState(false);
  const [sisuInputText, setSisuInputText] = useState('');
  const [sisuError, setSisuError] = useState('');

  const handleSisuParse = () => {
    setSisuError('');
    if (!sisuInputText.trim()) {
      setSisuError('Please paste some text first.');
      return;
    }
    const parsed = parseSisuText(sisuInputText);
    if (!parsed) {
      setSisuError('Could not parse any valid Sisu fields. Check that lines contain colons, e.g., "ID: 6535240".');
      return;
    }
    
    // Autofill the form!
    setFormData(prev => ({
      ...prev,
      escrowNumber: parsed.escrowNumber || prev.escrowNumber,
      escrowCompany: parsed.escrowCompany || prev.escrowCompany,
      address: parsed.address !== 'TBD' ? parsed.address : prev.address,
      clientFirstName: parsed.clientFirstName || prev.clientFirstName,
      clientLastName: parsed.clientLastName || prev.clientLastName,
      clientPhone: parsed.clientPhone || prev.clientPhone,
      clientEmail: parsed.clientEmail || prev.clientEmail,
      clientBirthday: parsed.clientBirthday || prev.clientBirthday,
      client2Birthday: parsed.client2Birthday || prev.client2Birthday,
      agentName: parsed.agentName || prev.agentName,
      agentEmail: parsed.agentEmail || prev.agentEmail,
      agentPhone: parsed.agentPhone || prev.agentPhone,
      cooperatingBrokerage: parsed.cooperatingBrokerage || prev.cooperatingBrokerage,
      lenderName: parsed.lenderName || prev.lenderName,
      lenderPhone: parsed.lenderPhone || prev.lenderPhone,
      lenderEmail: parsed.lenderEmail || prev.lenderEmail,
      escrowOfficer: parsed.escrowOfficer || prev.escrowOfficer,
      escrowPhone: parsed.escrowPhone || prev.escrowPhone,
      escrowEmail: parsed.escrowEmail || prev.escrowEmail,
      collaborator: parsed.collaborator || prev.collaborator,
      price: parsed.price ? parsed.price.toString() : prev.price,
      netCommission: parsed.netCommission ? parsed.netCommission.toString() : prev.netCommission,
      commissionPercent: parsed.commissionPercent ? parsed.commissionPercent.toString() : prev.commissionPercent,
      acceptanceDate: parsed.acceptanceDate || prev.acceptanceDate,
      contingencyStartDate: parsed.contingencyStartDate || parsed.acceptanceDate || prev.contingencyStartDate,
      coeDate: parsed.coeDate || prev.coeDate,
      status: parsed.status || prev.status,
      notes: parsed.notes ? (prev.notes ? `${prev.notes}\n\n${parsed.notes}` : parsed.notes) : prev.notes,
    }));
    
    setSisuInputText('');
    setShowSisuPaste(false);
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

      setFormData({
        escrowNumber: escrow.escrowNumber || '',
        escrowCompany: escrow.escrowCompany || '',
        address: escrow.address || '',
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
        escrowCompany: '',
        address: '',
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

    onSave({
      ...formData,
      price: Number(formData.price) || 0,
      netCommission: Number(formData.netCommission) || 0,
      commissionPercent: formData.commissionPercent ? Number(formData.commissionPercent) : undefined,
      contingencyDays: parsedDays
    });
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
          {/* Sisu Text Autofill section */}
          <div className="mb-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#1e293b]">Have Sisu Transaction Info?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSisuPaste(!showSisuPaste)}
                className="text-xs font-bold text-[#1B3A5C] hover:text-[#11253C] transition-colors focus:outline-none"
              >
                {showSisuPaste ? 'Cancel' : 'Paste Sisu Text to Autofill'}
              </button>
            </div>
            
            {showSisuPaste && (
              <div className="mt-3">
                <p className="text-[11px] text-[#64748b] mb-2 leading-relaxed">
                  Copy the full transaction details from Sisu.co
                </p>
                <textarea
                  rows={4}
                  value={sisuInputText}
                  onChange={e => setSisuInputText(e.target.value)}
                  placeholder="Paste transaction info here (e.g. ID: 6535240...)"
                  className="w-full border border-[#cbd5e1] bg-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#1B3A5C]"
                />
                {sisuError && (
                  <p className="text-[11px] text-red-500 font-bold mt-1">{sisuError}</p>
                )}
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSisuParse}
                    className="bg-[#1B3A5C] hover:bg-[#11253C] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Extract & Autofill</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow #</label>
              <input type="text" placeholder="e.g. 98453-PC" value={formData.escrowNumber} onChange={e => setFormData({...formData, escrowNumber: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Property Address *</label>
              <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Representation</label>
              <select value={formData.representation} onChange={e => setFormData({...formData, representation: e.target.value as any})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]">
                <option value="Buyer">Representing Buyer</option>
                <option value="Seller">Representing Seller</option>
                <option value="Dual">Representing Dual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]">
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Lead Source</label>
              <select value={formData.leadSource} onChange={e => setFormData({...formData, leadSource: e.target.value as any})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]">
                <option value="Zillow">Zillow</option>
                <option value="Self">Self</option>
                <option value="Team Lead">Team Lead</option>
                <option value="Opcity">Opcity</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Acceptance Date</label>
              <input type="date" value={formData.acceptanceDate || ''} onChange={e => handleAcceptanceDateChange(e.target.value)} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">COE Date</label>
              <input type="date" value={formData.coeDate || ''} onChange={e => setFormData({...formData, coeDate: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Sale Price ($)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Gross Commission (%)</label>
              <input type="number" step="0.01" value={formData.commissionPercent} onChange={e => setFormData({...formData, commissionPercent: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Net Commission ($)</label>
              <input type="number" value={formData.netCommission} onChange={e => setFormData({...formData, netCommission: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>
            
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Client Details</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client First Name *</label>
              <input required type="text" value={formData.clientFirstName} onChange={e => setFormData({...formData, clientFirstName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client Last Name *</label>
              <input required type="text" value={formData.clientLastName} onChange={e => setFormData({...formData, clientLastName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client Phone</label>
              <input type="tel" value={formData.clientPhone} placeholder="e.g. 310-555-0100" onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client Email</label>
              <input type="email" value={formData.clientEmail} placeholder="e.g. client@email.com" onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client Birthday</label>
              <input type="date" value={formData.clientBirthday || ''} onChange={e => setFormData({...formData, clientBirthday: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Client Number 2 Details (Optional)</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client 2 First Name</label>
              <input type="text" value={formData.client2FirstName} onChange={e => setFormData({...formData, client2FirstName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client 2 Last Name</label>
              <input type="text" value={formData.client2LastName} onChange={e => setFormData({...formData, client2LastName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client 2 Phone</label>
              <input type="tel" value={formData.client2Phone} placeholder="e.g. 310-555-0200" onChange={e => setFormData({...formData, client2Phone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client 2 Email</label>
              <input type="email" value={formData.client2Email} placeholder="e.g. client2@email.com" onChange={e => setFormData({...formData, client2Email: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client 2 Birthday</label>
              <input type="date" value={formData.client2Birthday || ''} onChange={e => setFormData({...formData, client2Birthday: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Other Agent Details</h3>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Other Agent Name</label>
              <input type="text" value={formData.agentName} onChange={e => setFormData({...formData, agentName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Other Agent Phone</label>
              <input type="tel" value={formData.agentPhone} placeholder="e.g. 310-555-0155" onChange={e => setFormData({...formData, agentPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Other Agent Email</label>
              <input type="email" value={formData.agentEmail} placeholder="e.g. agent@email.com" onChange={e => setFormData({...formData, agentEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Other Agent Brokerage</label>
              <input type="text" value={formData.cooperatingBrokerage} placeholder="e.g. Compass, Coldwell Banker" onChange={e => setFormData({...formData, cooperatingBrokerage: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Lender Details</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Lender Name</label>
              <input type="text" value={formData.lenderName} placeholder="e.g. Springfield Savings" onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Lender Phone</label>
              <input type="tel" value={formData.lenderPhone} placeholder="e.g. 555-0100" onChange={e => setFormData({...formData, lenderPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Lender Email</label>
              <input type="email" value={formData.lenderEmail} placeholder="e.g. mortgage@lender.com" onChange={e => setFormData({...formData, lenderEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Escrow & Transaction</h3>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Company</label>
              <input type="text" placeholder="e.g. Orange County Escrow" value={formData.escrowCompany} onChange={e => setFormData({...formData, escrowCompany: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Officer</label>
              <input type="text" value={formData.escrowOfficer} onChange={e => setFormData({...formData, escrowOfficer: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Phone</label>
              <input type="tel" value={formData.escrowPhone} onChange={e => setFormData({...formData, escrowPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Email</label>
              <input type="email" value={formData.escrowEmail} onChange={e => setFormData({...formData, escrowEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Collaborator</label>
              <input type="text" value={formData.collaborator} onChange={e => setFormData({...formData, collaborator: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
            </div>

            <div className="md:col-span-2 mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#86868b] mb-3 border-b border-[#e5e5ea] pb-1.5 flex items-center justify-between">
                <span>Contingency Days</span>
                <span className="text-[10px] text-slate-400 lowercase font-normal italic">click to edit days</span>
              </h3>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-[#334155] mb-1">Contingencies Start Date</label>
                <input 
                  type="date" 
                  value={formData.contingencyStartDate || ''} 
                  onChange={e => setFormData({...formData, contingencyStartDate: e.target.value})} 
                  className="w-full sm:w-1/2 border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" 
                />
                <p className="text-[10px] text-slate-500 mt-1">Leave empty or set to custom date. If empty, falls back to Acceptance Date when calculating milestones.</p>
              </div>

              <div className="flex flex-wrap gap-2">
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
                      <div className="flex items-center bg-white border border-[#e5e5ea] rounded-md px-1 py-0.5 ml-1 shadow-sm focus-within:border-[#1B3A5C]">
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

            <div className="md:col-span-2 mt-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Notes</label>
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C]" />
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
