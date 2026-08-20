import React, { useState, useEffect } from 'react';
import { Escrow, CONTINGENCIES, adjustWeekendToMonday, parseAddressComponents } from '../../types';
import { X } from 'lucide-react';
import { addMonths, addDays, parseISO, format } from 'date-fns';

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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Representation</label>
                  <select value={formData.representation} onChange={e => setFormData({...formData, representation: e.target.value as any})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]">
                    <option value="Buyer">Representing Buyer</option>
                    <option value="Seller">Representing Seller</option>
                    <option value="Dual">Representing Dual</option>
                  </select>
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
                <h3 className="text-sm font-bold text-amber-950">Lender</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                  Lender
                </span>
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
                <h3 className="text-sm font-bold text-indigo-950">Escrow</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                  Escrow
                </span>
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
                <h3 className="text-sm font-bold text-cyan-950">Title</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 text-[10px] font-bold uppercase tracking-wider">
                  Title
                </span>
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
