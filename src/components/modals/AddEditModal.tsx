import React, { useState, useEffect } from 'react';
import { Escrow, CONTINGENCIES } from '../../types';
import { X, Sparkles } from 'lucide-react';
import { addMonths, format } from 'date-fns';
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
    const today = new Date();
    const oneMonthLater = addMonths(today, 1);
    
    return {
      escrowNumber: '',
      escrowCompany: '',
      address: '',
      clientFirstName: '',
      clientLastName: '',
      clientPhone: '',
      clientEmail: '',
      collaborator: '',
      escrowOfficer: '',
      escrowPhone: '',
      escrowEmail: '',
      agentName: '',
      agentPhone: '',
      agentEmail: '',
      lenderName: '',
      lenderPhone: '',
      lenderEmail: '',
      price: '',
      netCommission: '',
      acceptanceDate: format(today, 'yyyy-MM-dd'),
      coeDate: format(oneMonthLater, 'yyyy-MM-dd'),
      status: 'Open',
      representation: 'Buyer' as 'Buyer' | 'Seller' | 'Dual',
      notes: '',
      contingencyDays: {
        'L1': '7', 'L2': '7', 'L3': '7', 'L4': '7', 'L5': '7', 'L6': '7', 'L7': '7', 'L8': '7', 'L9': '7'
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
      agentName: parsed.agentName || prev.agentName,
      agentEmail: parsed.agentEmail || prev.agentEmail,
      agentPhone: parsed.agentPhone || prev.agentPhone,
      lenderName: parsed.lenderName || prev.lenderName,
      lenderPhone: parsed.lenderPhone || prev.lenderPhone,
      lenderEmail: parsed.lenderEmail || prev.lenderEmail,
      escrowOfficer: parsed.escrowOfficer || prev.escrowOfficer,
      escrowPhone: parsed.escrowPhone || prev.escrowPhone,
      escrowEmail: parsed.escrowEmail || prev.escrowEmail,
      collaborator: parsed.collaborator || prev.collaborator,
      price: parsed.price ? parsed.price.toString() : prev.price,
      netCommission: parsed.netCommission ? parsed.netCommission.toString() : prev.netCommission,
      acceptanceDate: parsed.acceptanceDate || prev.acceptanceDate,
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

      setFormData({
        escrowNumber: escrow.escrowNumber || '',
        escrowCompany: escrow.escrowCompany || '',
        address: escrow.address,
        clientFirstName: escrow.clientFirstName || '',
        clientLastName: escrow.clientLastName || '',
        clientPhone: escrow.clientPhone || '',
        clientEmail: escrow.clientEmail || '',
        collaborator: escrow.collaborator,
        escrowOfficer: escrow.escrowOfficer,
        escrowPhone: escrow.escrowPhone || '',
        escrowEmail: escrow.escrowEmail || '',
        agentName: escrow.agentName,
        agentPhone: escrow.agentPhone || '',
        agentEmail: escrow.agentEmail || '',
        lenderName: escrow.lenderName || '',
        lenderPhone: escrow.lenderPhone || '',
        lenderEmail: escrow.lenderEmail || '',
        price: escrow.price.toString(),
        netCommission: escrow.netCommission.toString(),
        acceptanceDate: escrow.acceptanceDate || new Date().toISOString().split('T')[0],
        coeDate: escrow.coeDate,
        status: escrow.status,
        representation: escrow.representation || 'Buyer',
        notes: escrow.notes,
        contingencyDays: stringifiedDays
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
      contingencyDays: parsedDays
    });
  };

  const handleAcceptanceDateChange = (val: string) => {
    setFormData(prev => {
      const newAcceptance = val;
      let newCoe = prev.coeDate;
      
      try {
        if (newAcceptance) {
          const date = new Date(newAcceptance + 'T00:00:00');
          if (!isNaN(date.getTime())) {
            newCoe = format(addMonths(date, 1), 'yyyy-MM-dd');
          }
        }
      } catch (e) {
        console.error("Failed to calculate COE date", e);
      }

      return {
        ...prev,
        acceptanceDate: newAcceptance,
        coeDate: newCoe
      };
    });
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
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#e5e5ea] flex items-center justify-between bg-[#fafafa] shrink-0">
          <h2 className="font-bold text-base sm:text-lg text-[#1d1d1f]">{escrow ? 'Edit Escrow' : 'New Escrow'}</h2>
          <button type="button" onClick={onClose} className="text-[#86868b] hover:text-[#1d1d1f] p-1 cursor-pointer"><X size={20} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* Sisu Text Autofill section */}
          <div className="mb-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#FF7518]" />
                <span className="text-xs font-bold text-[#1e293b]">Have Sisu Transaction Info?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSisuPaste(!showSisuPaste)}
                className="text-xs font-bold text-[#FF7518] hover:text-[#CC5E13] transition-colors focus:outline-none"
              >
                {showSisuPaste ? 'Cancel' : '📋 Paste Sisu Text to Autofill'}
              </button>
            </div>
            
            {showSisuPaste && (
              <div className="mt-3">
                <p className="text-[11px] text-[#64748b] mb-2 leading-relaxed">
                  Copy the full transaction details from Sisu.co on your phone or browser, paste it below, and we'll instantly extract and fill all the matching fields.
                </p>
                <textarea
                  rows={4}
                  value={sisuInputText}
                  onChange={e => setSisuInputText(e.target.value)}
                  placeholder="Paste transaction info here (e.g. ID: 6535240...)"
                  className="w-full border border-[#cbd5e1] bg-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#FF7518]"
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
                    <Sparkles size={13} />
                    <span>Extract & Autofill</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow #</label>
              <input type="text" placeholder="e.g. 98453-PC" value={formData.escrowNumber} onChange={e => setFormData({...formData, escrowNumber: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Property Address *</label>
              <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>
            
            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Client Details</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client First Name *</label>
              <input required type="text" value={formData.clientFirstName} onChange={e => setFormData({...formData, clientFirstName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client Last Name *</label>
              <input required type="text" value={formData.clientLastName} onChange={e => setFormData({...formData, clientLastName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client Phone</label>
              <input type="tel" value={formData.clientPhone} placeholder="e.g. 310-555-0100" onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Client Email</label>
              <input type="email" value={formData.clientEmail} placeholder="e.g. client@email.com" onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Agent Details</h3>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Agent Name</label>
              <input type="text" value={formData.agentName} onChange={e => setFormData({...formData, agentName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Agent Phone</label>
              <input type="tel" value={formData.agentPhone} placeholder="e.g. 310-555-0155" onChange={e => setFormData({...formData, agentPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Agent Email</label>
              <input type="email" value={formData.agentEmail} placeholder="e.g. agent@email.com" onChange={e => setFormData({...formData, agentEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Lender Details</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Lender Name</label>
              <input type="text" value={formData.lenderName} placeholder="e.g. Springfield Savings" onChange={e => setFormData({...formData, lenderName: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Lender Phone</label>
              <input type="tel" value={formData.lenderPhone} placeholder="e.g. 555-0100" onChange={e => setFormData({...formData, lenderPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Lender Email</label>
              <input type="email" value={formData.lenderEmail} placeholder="e.g. mortgage@lender.com" onChange={e => setFormData({...formData, lenderEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div className="md:col-span-2 mt-2">
              <h3 className="text-sm font-bold text-[#1d1d1f] border-b border-[#e5e5ea] pb-1.5 mb-1">Escrow & Transaction</h3>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Company</label>
              <input type="text" placeholder="e.g. Orange County Escrow" value={formData.escrowCompany} onChange={e => setFormData({...formData, escrowCompany: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Officer</label>
              <input type="text" value={formData.escrowOfficer} onChange={e => setFormData({...formData, escrowOfficer: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Phone</label>
              <input type="tel" value={formData.escrowPhone} onChange={e => setFormData({...formData, escrowPhone: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Escrow Email</label>
              <input type="email" value={formData.escrowEmail} onChange={e => setFormData({...formData, escrowEmail: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Collaborator</label>
              <input type="text" value={formData.collaborator} onChange={e => setFormData({...formData, collaborator: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Sale Price ($)</label>
              <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Net Commission ($)</label>
              <input type="number" value={formData.netCommission} onChange={e => setFormData({...formData, netCommission: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Acceptance Date *</label>
              <input required type="date" value={formData.acceptanceDate} onChange={e => handleAcceptanceDateChange(e.target.value)} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">COE Date *</label>
              <input required type="date" value={formData.coeDate} onChange={e => setFormData({...formData, coeDate: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]">
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Representation</label>
              <select value={formData.representation} onChange={e => setFormData({...formData, representation: e.target.value as any})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]">
                <option value="Buyer">Representing Buyer</option>
                <option value="Seller">Representing Seller</option>
                <option value="Dual">Representing Dual</option>
              </select>
            </div>

            <div className="md:col-span-2 mt-4">
              <h3 className="text-sm font-bold text-[#1d1d1f] mb-3 border-b border-[#e5e5ea] pb-2">Contingency Days</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {contingencyList.map(c => (
                  <div key={c.key}>
                    <label className="block text-[10px] font-bold text-[#334155] mb-1 uppercase tracking-wider" title={c.label}>
                      {c.key} - {c.label} Days
                    </label>
                    <input 
                      type="number" 
                      placeholder="e.g. 7"
                      value={formData.contingencyDays[c.key] || ''} 
                      onChange={e => handleDayChange(c.key, e.target.value)} 
                      className="w-full border border-[#e5e5ea] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#FF7518]" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 mt-2">
              <label className="block text-xs font-bold text-[#334155] mb-1">Notes</label>
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-[#e5e5ea] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF7518]" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#e5e5ea] bg-[#fafafa] flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold border border-[#e5e5ea] text-[#86868b] hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold bg-[#FF7518] hover:bg-[#CC5E13] text-white active:scale-95 shadow-sm transition-all">
            Save Escrow
          </button>
        </div>
      </form>
    </div>
  );
}
