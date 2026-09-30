import React, { useState } from 'react';
import { Listing, ListingDocument, ListingStatus } from '../../types';
import { X, Building2, Paperclip, Trash2, Calculator, RefreshCw } from 'lucide-react';
import { usePreferredPartners } from '../../hooks/usePreferredPartners';
import { PartnerDropdown } from '../common/PartnerDropdown';
import { QuickPasteContact } from '../common/QuickPasteContact';
import { cleanEmail } from '../../utils/contactParser';
import { getCityFromZip } from '../../utils/californiaZipDb';
import { useAuth } from '../../context/AuthContext';
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

interface AddEditListingModalProps {
  listing?: Listing | null;
  onClose: () => void;
  onSave: (data: Omit<Listing, 'id' | 'createdAt' | 'lastUpdated'> & { id?: string }) => void;
}

export function AddEditListingModal({
  listing,
  onClose,
  onSave,
}: AddEditListingModalProps) {
  const { user } = useAuth();
  const { partners, addPartner, deletePartner } = usePreferredPartners();

  const [formData, setFormData] = useState({
    address: listing?.address || '',
    city: listing?.city || '',
    zipCode: listing?.zipCode || '',
    apn: listing?.apn || '',
    mlsId: listing?.mlsId || '',
    listPrice: listing?.listPrice ? formatPriceString(listing.listPrice) : '',
    propertyType: listing?.propertyType || 'Single Family',
    bedrooms: listing?.bedrooms ? String(listing.bedrooms) : '',
    bathrooms: listing?.bathrooms ? String(listing.bathrooms) : '',
    squareFeet: listing?.squareFeet ? String(listing.squareFeet) : '',
    yearBuilt: listing?.yearBuilt ? String(listing.yearBuilt) : '',
    
    // Sellers
    clientFirstName: listing?.clientFirstName || '',
    clientLastName: listing?.clientLastName || '',
    clientPhone: listing?.clientPhone || '',
    clientEmail: listing?.clientEmail || '',
    client2FirstName: listing?.client2FirstName || '',
    client2LastName: listing?.client2LastName || '',
    client2Phone: listing?.client2Phone || '',
    client2Email: listing?.client2Email || '',

    // Assigned Escrow & Title
    escrowCompany: listing?.escrowCompany || '',
    escrowOfficer: listing?.escrowOfficer || '',
    escrowPhone: listing?.escrowPhone || '',
    escrowEmail: listing?.escrowEmail || '',
    titleCompany: listing?.titleCompany || '',
    titleOfficer: listing?.titleOfficer || '',
    titlePhone: listing?.titlePhone || '',
    titleEmail: listing?.titleEmail || '',

    // Listing Details (automatically populated from current logged in user)
    agentName: listing?.agentName || user?.displayName || 'Paul Muner',
    agentPhone: listing?.agentPhone || user?.phoneNumber || '',
    agentEmail: listing?.agentEmail || user?.email || 'paulmuner@gmail.com',
    coListingAgent: listing?.coListingAgent || '',
    commissionPercent: listing?.commissionPercent ? String(listing.commissionPercent) : '2.5',
    netCommission: listing?.netCommission !== undefined && listing?.netCommission !== null
      ? formatPriceString(listing.netCommission)
      : (listing?.listPrice && listing?.commissionPercent
          ? formatPriceString(calculateNetFromGross(Math.round((listing.listPrice * listing.commissionPercent) / 100), listing?.leadSource || 'Self'))
          : ''),
    forSaleDate: listing?.forSaleDate || '',
    listingAgreementDate: listing?.listingAgreementDate || new Date().toISOString().split('T')[0],
    expirationDate: listing?.expirationDate || '',
    goLiveDate: listing?.goLiveDate || ((listing?.status || 'Active') === 'Active' ? new Date().toISOString().split('T')[0] : ''),
    lockboxCode: listing?.lockboxCode || '',
    showingInstructions: listing?.showingInstructions || '',
    notes: listing?.notes || '',
    leadSource: (listing?.leadSource || 'Self') as string,
    status: (listing?.status || 'Active') as ListingStatus,
  });

  const [documents, setDocuments] = useState<ListingDocument[]>(() => listing?.documents || []);

  const handleZipChange = (zip: string) => {
    setFormData(prev => {
      const updated = { ...prev, zipCode: zip };
      if (zip.length === 5) {
        const detectedCity = getCityFromZip(zip);
        if (detectedCity && !prev.city) {
          updated.city = detectedCity;
        }
      }
      return updated;
    });
  };

  const handlePriceChange = (val: string) => {
    const formattedVal = formatPriceString(val);
    const numP = parsePriceNum(val);
    setFormData(prev => {
      const numPct = parseFloat(prev.commissionPercent) || 2.5;
      const gross = numP > 0 && numPct > 0 ? Math.round((numP * numPct) / 100) : 0;
      return {
        ...prev,
        listPrice: formattedVal,
        netCommission: gross > 0 ? formatPriceString(calculateNetFromGross(gross, prev.leadSource)) : prev.netCommission,
      };
    });
  };

  const handleCommissionPercentChange = (val: string) => {
    setFormData(prev => {
      const numP = parsePriceNum(prev.listPrice);
      const numPct = parseFloat(val) || 0;
      const gross = numP > 0 && numPct > 0 ? Math.round((numP * numPct) / 100) : 0;
      return {
        ...prev,
        commissionPercent: val,
        netCommission: gross > 0 ? formatPriceString(calculateNetFromGross(gross, prev.leadSource)) : prev.netCommission,
      };
    });
  };

  const handleNetCommissionChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      netCommission: formatPriceString(val),
    }));
  };

  const handleLeadSourceChange = (newSource: string) => {
    setFormData(prev => {
      const numP = parsePriceNum(prev.listPrice);
      const numPct = parseFloat(prev.commissionPercent) || 2.5;
      const gross = numP > 0 && numPct > 0 ? Math.round((numP * numPct) / 100) : 0;
      return {
        ...prev,
        leadSource: newSource,
        netCommission: gross > 0 ? formatPriceString(calculateNetFromGross(gross, newSource)) : prev.netCommission,
      };
    });
  };

  const handleRecalculateNet = () => {
    const numP = parsePriceNum(formData.listPrice);
    const numPct = parseFloat(formData.commissionPercent) || 2.5;
    const gross = Math.round((numP * numPct) / 100);
    const calculatedNet = calculateNetFromGross(gross, formData.leadSource);
    setFormData(prev => ({ ...prev, netCommission: formatPriceString(calculatedNet) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.address.trim()) {
      alert('Please enter a property address.');
      return;
    }

    onSave({
      ...(listing?.id ? { id: listing.id } : {}),
      address: formData.address.trim(),
      city: formData.city.trim(),
      zipCode: formData.zipCode.trim(),
      apn: formData.apn.trim(),
      mlsId: formData.mlsId.trim(),
      listPrice: parsePriceNum(formData.listPrice),
      propertyType: formData.propertyType,
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
      squareFeet: formData.squareFeet ? Number(formData.squareFeet) : undefined,
      yearBuilt: formData.yearBuilt ? Number(formData.yearBuilt) : undefined,
      clientFirstName: formData.clientFirstName.trim(),
      clientLastName: formData.clientLastName.trim(),
      clientPhone: formData.clientPhone.trim(),
      clientEmail: cleanEmail(formData.clientEmail.trim()),
      client2FirstName: formData.client2FirstName.trim(),
      client2LastName: formData.client2LastName.trim(),
      client2Phone: formData.client2Phone.trim(),
      client2Email: cleanEmail(formData.client2Email.trim()),
      escrowCompany: formData.escrowCompany.trim(),
      escrowOfficer: formData.escrowOfficer.trim(),
      escrowPhone: formData.escrowPhone.trim(),
      escrowEmail: cleanEmail(formData.escrowEmail.trim()),
      titleCompany: formData.titleCompany.trim(),
      titleOfficer: formData.titleOfficer.trim(),
      titlePhone: formData.titlePhone.trim(),
      titleEmail: cleanEmail(formData.titleEmail.trim()),
      agentName: (formData.agentName || user?.displayName || 'Paul Muner').trim(),
      agentPhone: (formData.agentPhone || user?.phoneNumber || '').trim(),
      agentEmail: cleanEmail(formData.agentEmail || user?.email || 'paulmuner@gmail.com'),
      coListingAgent: formData.coListingAgent.trim(),
      commissionPercent: formData.commissionPercent ? parseFloat(formData.commissionPercent) : undefined,
      netCommission: formData.netCommission ? parsePriceNum(formData.netCommission) : (
        parsePriceNum(formData.listPrice) && formData.commissionPercent ? Math.round((parsePriceNum(formData.listPrice) * parseFloat(formData.commissionPercent)) / 100) : undefined
      ),
      forSaleDate: formData.forSaleDate,
      listingAgreementDate: formData.listingAgreementDate,
      expirationDate: formData.expirationDate,
      goLiveDate: formData.goLiveDate,
      lockboxCode: formData.lockboxCode.trim(),
      showingInstructions: formData.showingInstructions.trim(),
      notes: formData.notes.trim(),
      leadSource: formData.leadSource || 'Self',
      status: formData.status,
      documents,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1B3A5C] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-[#1d1d1f]">
                {listing ? 'Edit Listing' : 'New Listing'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Section 1: Property Identification */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase tracking-wider text-[#1B3A5C]">
                PROPERTY LOCATION & IDENTIFICATION
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">APN / Parcel #</label>
                <input 
                  type="text" 
                  placeholder="e.g. 456-123-08"
                  value={formData.apn} 
                  onChange={e => setFormData({ ...formData, apn: e.target.value })} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Property Address (Street) *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="e.g. 1234 Ocean Ave"
                  value={formData.address} 
                  onChange={e => setFormData({ ...formData, address: e.target.value })} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                <input 
                  type="text" 
                  placeholder="e.g. Newport Beach"
                  value={formData.city} 
                  onChange={e => setFormData({ ...formData, city: e.target.value })} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Zip Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. 92660"
                  value={formData.zipCode} 
                  onChange={e => handleZipChange(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Listing Terms */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase tracking-wider text-[#1B3A5C]">
                PRICE AND LISTING TERMS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* List Price */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">List Price ($)</label>
                  {Boolean(parsePriceNum(formData.listPrice) > 0) && (
                    <span className="text-[11px] font-bold text-[#1B3A5C] font-mono bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/80">
                      ${parsePriceNum(formData.listPrice).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="e.g. 1,250,000"
                    value={formData.listPrice} 
                    onChange={e => handlePriceChange(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C]" 
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Listing Status</label>
                <select
                  value={formData.status}
                  onChange={e => {
                    const newStatus = e.target.value as ListingStatus;
                    setFormData(prev => ({
                      ...prev,
                      status: newStatus,
                      goLiveDate: (newStatus === 'Active' && !prev.goLiveDate)
                        ? new Date().toISOString().split('T')[0]
                        : prev.goLiveDate,
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                >
                  <option value="Active">Active on MLS</option>
                  <option value="Off Market">Off Market</option>
                  <option value="Pending Offer">Pending Offer</option>
                  <option value="Under Contract">Under Contract (In Escrow)</option>
                  <option value="Cancelled">Cancelled / Withdrawn</option>
                </select>
              </div>

              {/* Lead Source */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Source of Lead</label>
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
                  {formData.leadSource && !['Zillow', 'Self', 'Team Lead', 'Opcity', 'Other'].includes(formData.leadSource) && (
                    <option value={formData.leadSource}>{formData.leadSource}</option>
                  )}
                </select>
              </div>

              {/* MLS # */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">MLS #</label>
                <input
                  type="text"
                  placeholder="e.g. OC240123"
                  value={formData.mlsId}
                  onChange={e => setFormData({ ...formData, mlsId: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>

              {/* Commission % */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Gross Commission (%)</label>
                  {Boolean(parsePriceNum(formData.listPrice) > 0 && parseFloat(formData.commissionPercent) > 0) && (
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      Gross: ${Math.round(((parsePriceNum(formData.listPrice) || 0) * (parseFloat(formData.commissionPercent) || 0)) / 100).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2.5"
                    value={formData.commissionPercent}
                    onChange={e => handleCommissionPercentChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* Net Commission ($) - Manually Editable with Thousands Separators */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Net Commission ($)</label>
                  <button
                    type="button"
                    onClick={handleRecalculateNet}
                    className="text-[11px] text-[#1B3A5C] hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer transition-colors px-2 py-0.5 rounded-md hover:bg-slate-100"
                    title="Auto-calculate from lead source formula"
                  >
                    <RefreshCw size={11} />
                    <span>Auto-Calculate</span>
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 25,000"
                    value={formData.netCommission}
                    onChange={e => handleNetCommissionChange(e.target.value)}
                    className="w-full bg-emerald-50/30 border border-emerald-300 text-emerald-950 font-mono font-bold rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Live Formula & Calculation Breakdown Card - Matching Escrow Structure */}
              {(() => {
                const numP = parsePriceNum(formData.listPrice);
                const numPct = parseFloat(formData.commissionPercent) || 0;
                const commBreakdown = calculateCommissionBreakdown(
                  numP,
                  numPct,
                  formData.leadSource
                );
                return (
                  <div className="sm:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-xl p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-slate-200/70">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Calculator size={13} className="text-[#1B3A5C]" />
                        <span>Lead Source Formula:</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#1B3A5C]/10 text-[#1B3A5C] font-bold text-[11px]">
                          {getFormulaLabel(formData.leadSource)}
                        </span>
                      </div>
                      {numP > 0 && numPct > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 font-mono bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          Formula Net: ${commBreakdown.netCommission.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {numP > 0 && numPct > 0 ? (
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
                        Enter List Price and Gross Commission % to view the automated breakdown for {formData.leadSource || 'Self'}.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* For Sale Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">For Sale Date</label>
                <input
                  type="date"
                  value={formData.forSaleDate}
                  onChange={e => setFormData({ ...formData, forSaleDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>

              {/* Go-Live Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Go-Live Date</label>
                <input
                  type="date"
                  value={formData.goLiveDate}
                  onChange={e => setFormData({ ...formData, goLiveDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>

              {/* Agreement Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Agreement Date</label>
                <input
                  type="date"
                  value={formData.listingAgreementDate}
                  onChange={e => setFormData({ ...formData, listingAgreementDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={e => setFormData({ ...formData, expirationDate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Property Specs */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase tracking-wider text-[#1B3A5C]">
                PROPERTY SPECS & DETAILS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Property Type</label>
                <select
                  value={formData.propertyType}
                  onChange={e => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                >
                  <option value="Single Family">Single Family</option>
                  <option value="Condo">Condo</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Duplex / Triplex">Duplex / Triplex</option>
                  <option value="Fourplex">Fourplex</option>
                  <option value="Mobile Home">Mobile Home</option>
                  <option value="Vacant Land">Vacant Land</option>
                  {formData.propertyType && ![
                    'Single Family',
                    'Condo',
                    'Townhouse',
                    'Duplex / Triplex',
                    'Fourplex',
                    'Mobile Home',
                    'Vacant Land'
                  ].includes(formData.propertyType) && (
                    <option value={formData.propertyType}>{formData.propertyType}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Beds / Baths</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Beds"
                    value={formData.bedrooms}
                    onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Baths"
                    value={formData.bathrooms}
                    onChange={e => setFormData({ ...formData, bathrooms: e.target.value })}
                    className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Square Feet</label>
                <input
                  type="text"
                  placeholder="e.g. 2400"
                  value={formData.squareFeet}
                  onChange={e => setFormData({ ...formData, squareFeet: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Year Built</label>
                <input
                  type="text"
                  placeholder="e.g. 1998"
                  value={formData.yearBuilt}
                  onChange={e => setFormData({ ...formData, yearBuilt: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Seller 1 (Primary) */}
          <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/70">
              <h3 className="text-sm font-bold text-blue-950 uppercase tracking-wider">SELLER 1 (PRIMARY)</h3>
              <div className="flex items-center gap-2">
                <QuickPasteContact
                  role="client"
                  roleLabel="Seller 1"
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
                <label className="block text-xs font-bold text-blue-950 mb-1">Seller 1 First Name *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="First name"
                  value={formData.clientFirstName} 
                  onChange={e => setFormData({ ...formData, clientFirstName: e.target.value })} 
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">Seller 1 Last Name *</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Last name"
                  value={formData.clientLastName} 
                  onChange={e => setFormData({ ...formData, clientLastName: e.target.value })} 
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">Seller 1 Phone</label>
                <input 
                  type="tel" 
                  placeholder="(555) 000-0000"
                  value={formData.clientPhone} 
                  onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} 
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">Seller 1 Email</label>
                <input 
                  type="email" 
                  placeholder="seller@example.com"
                  value={formData.clientEmail} 
                  onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} 
                  className="w-full bg-white border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 5: Seller 2 (Secondary) */}
          <div className="bg-purple-50/40 border border-purple-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-200/70">
              <h3 className="text-sm font-bold text-purple-950 uppercase tracking-wider">SELLER 2 (SECONDARY)</h3>
              <div className="flex items-center gap-2">
                <QuickPasteContact
                  role="client"
                  roleLabel="Seller 2"
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
                <label className="block text-xs font-bold text-purple-950 mb-1">Seller 2 First Name</label>
                <input 
                  type="text" 
                  placeholder="First name (optional)"
                  value={formData.client2FirstName} 
                  onChange={e => setFormData({ ...formData, client2FirstName: e.target.value })} 
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1">Seller 2 Last Name</label>
                <input 
                  type="text" 
                  placeholder="Last name (optional)"
                  value={formData.client2LastName} 
                  onChange={e => setFormData({ ...formData, client2LastName: e.target.value })} 
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1">Seller 2 Phone</label>
                <input 
                  type="tel" 
                  placeholder="(555) 000-0000"
                  value={formData.client2Phone} 
                  onChange={e => setFormData({ ...formData, client2Phone: e.target.value })} 
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-950 mb-1">Seller 2 Email</label>
                <input 
                  type="email" 
                  placeholder="seller2@example.com"
                  value={formData.client2Email} 
                  onChange={e => setFormData({ ...formData, client2Email: e.target.value })} 
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-semibold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 6: Pre-Assigned Escrow Company & Officer */}
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
                  onSelect={(p) => {
                    setFormData(prev => ({
                      ...prev,
                      escrowCompany: p.company || prev.escrowCompany,
                      escrowOfficer: p.name || prev.escrowOfficer,
                      escrowPhone: p.phone || prev.escrowPhone,
                      escrowEmail: cleanEmail(p.email) || prev.escrowEmail,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Company Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. First American Escrow"
                  value={formData.escrowCompany} 
                  onChange={e => setFormData({ ...formData, escrowCompany: e.target.value })} 
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Officer Name</label>
                <input 
                  type="text" 
                  placeholder="Officer name"
                  value={formData.escrowOfficer} 
                  onChange={e => setFormData({ ...formData, escrowOfficer: e.target.value })} 
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Phone</label>
                <input 
                  type="tel" 
                  placeholder="Phone"
                  value={formData.escrowPhone} 
                  onChange={e => setFormData({ ...formData, escrowPhone: e.target.value })} 
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-indigo-950 mb-1">Escrow Officer Email</label>
                <input 
                  type="email" 
                  placeholder="officer@escrow.com"
                  value={formData.escrowEmail} 
                  onChange={e => setFormData({ ...formData, escrowEmail: e.target.value })} 
                  className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 7: Pre-Assigned Title Company & Officer */}
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
                  onSelect={(p) => {
                    setFormData(prev => ({
                      ...prev,
                      titleCompany: p.company || prev.titleCompany,
                      titleOfficer: p.name || prev.titleOfficer,
                      titlePhone: p.phone || prev.titlePhone,
                      titleEmail: cleanEmail(p.email) || prev.titleEmail,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-cyan-950 mb-1">Title Company Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Lawyers Title"
                  value={formData.titleCompany} 
                  onChange={e => setFormData({ ...formData, titleCompany: e.target.value })} 
                  className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-cyan-950 mb-1">Title Officer Name</label>
                <input 
                  type="text" 
                  placeholder="Officer name"
                  value={formData.titleOfficer} 
                  onChange={e => setFormData({ ...formData, titleOfficer: e.target.value })} 
                  className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-cyan-950 mb-1">Title Phone</label>
                <input 
                  type="tel" 
                  placeholder="Phone"
                  value={formData.titlePhone} 
                  onChange={e => setFormData({ ...formData, titlePhone: e.target.value })} 
                  className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-800" 
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-cyan-950 mb-1">Title Officer Email</label>
                <input 
                  type="email" 
                  placeholder="officer@title.com"
                  value={formData.titleEmail} 
                  onChange={e => setFormData({ ...formData, titleEmail: e.target.value })} 
                  className="w-full bg-white border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-800" 
                />
              </div>
            </div>
          </div>

          {/* Section 8: Notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black uppercase tracking-wider text-[#1B3A5C]">
                NOTES
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Co-Listing Agent (if any)</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe (or leave blank if none)"
                  value={formData.coListingAgent}
                  onChange={e => setFormData({ ...formData, coListingAgent: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Listing Notes</label>
                <textarea
                  rows={3}
                  placeholder="Additional notes about the listing, sellers, escrow, or team instructions..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:border-[#1B3A5C] focus:ring-1 focus:ring-[#1B3A5C] text-slate-800"
                />
              </div>
            </div>

            {/* Attached Documents List */}
            {documents.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-xs font-bold text-slate-700 block mb-2">Attached Documents ({documents.length}):</span>
                <div className="space-y-1.5">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200/80">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip size={13} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 truncate text-xs">{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocuments(docs => docs.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-[#1B3A5C] hover:bg-[#11253C] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {listing ? 'Save Changes' : 'Create Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
