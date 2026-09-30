import React, { useState } from 'react';
import { Listing } from '../../types';
import { X, ExternalLink, Copy, Check, Eye, FileText, Send, Building2, User, Phone, Mail, MapPin, DollarSign, Sparkles } from 'lucide-react';
import { COGNITO_NEW_LISTING_FORM_URL, buildCognitoFormPrefillUrl, formatListingForTeamIntake } from '../../utils/cognitoIntakeUtils';
import { useAuth } from '../../context/AuthContext';

interface CognitoIntakeModalProps {
  listing?: Listing | null;
  allListings?: Listing[];
  onClose: () => void;
  onSelectListing?: (listing: Listing) => void;
}

export function CognitoIntakeModal({
  listing: initialListing,
  allListings = [],
  onClose,
  onSelectListing,
}: CognitoIntakeModalProps) {
  const { user } = useAuth();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(() => {
    return initialListing || (allListings.length > 0 ? allListings[0] : null);
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [embedMode, setEmbedMode] = useState(false);

  const agentName = (selectedListing?.agentName || user?.displayName || 'Paul Muner').trim();
  const agentEmail = (selectedListing?.agentEmail || user?.email || 'paulmuner@gmail.com').trim();
  const agentPhone = (selectedListing?.agentPhone || user?.phoneNumber || '').trim();

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = () => {
    if (!selectedListing) return;
    const formatted = formatListingForTeamIntake(selectedListing, user);
    handleCopy(formatted, 'all');
  };

  const prefillUrl = selectedListing 
    ? buildCognitoFormPrefillUrl(selectedListing, user) 
    : COGNITO_NEW_LISTING_FORM_URL;

  const quickFields = selectedListing ? [
    { label: 'Property Address', value: [selectedListing.address, selectedListing.city, selectedListing.zipCode].filter(Boolean).join(', '), key: 'address' },
    { label: 'APN / Parcel #', value: selectedListing.apn || '', key: 'apn' },
    { label: 'MLS #', value: selectedListing.mlsId || '', key: 'mls' },
    ...(selectedListing.forSaleDate ? [{ label: 'For Sale Date', value: selectedListing.forSaleDate, key: 'forSaleDate' }] : []),
    { label: 'List Price', value: selectedListing.listPrice ? `$${selectedListing.listPrice.toLocaleString()}` : '', key: 'price' },
    { label: 'Seller 1 Name', value: `${selectedListing.clientFirstName || ''} ${selectedListing.clientLastName || ''}`.trim(), key: 'seller1Name' },
    { label: 'Seller 1 Phone', value: selectedListing.clientPhone || '', key: 'seller1Phone' },
    { label: 'Seller 1 Email', value: selectedListing.clientEmail || '', key: 'seller1Email' },
    { label: 'Seller 2 Name', value: `${selectedListing.client2FirstName || ''} ${selectedListing.client2LastName || ''}`.trim(), key: 'seller2Name' },
    { label: 'Seller 2 Phone', value: selectedListing.client2Phone || '', key: 'seller2Phone' },
    { label: 'Seller 2 Email', value: selectedListing.client2Email || '', key: 'seller2Email' },
    { label: 'Escrow Company', value: selectedListing.escrowCompany || '', key: 'escrowCompany' },
    { label: 'Escrow Officer', value: selectedListing.escrowOfficer || '', key: 'escrowOfficer' },
    { label: 'Escrow Email', value: selectedListing.escrowEmail || '', key: 'escrowEmail' },
    { label: 'Escrow Phone', value: selectedListing.escrowPhone || '', key: 'escrowPhone' },
    { label: 'Title Company', value: selectedListing.titleCompany || '', key: 'titleCompany' },
    { label: 'Title Officer', value: selectedListing.titleOfficer || '', key: 'titleOfficer' },
    { label: 'Title Email', value: selectedListing.titleEmail || '', key: 'titleEmail' },
    { label: 'Title Phone', value: selectedListing.titlePhone || '', key: 'titlePhone' },
    { label: 'Listing Agent', value: agentName, key: 'agentName' },
    ...(selectedListing.coListingAgent ? [{ label: 'Co-Listing Agent', value: selectedListing.coListingAgent, key: 'coListingAgent' }] : []),
    ...(agentEmail ? [{ label: 'Agent Email', value: agentEmail, key: 'agentEmail' }] : []),
    ...(agentPhone ? [{ label: 'Agent Phone', value: agentPhone, key: 'agentPhone' }] : []),
  ].filter(f => Boolean(f.value)) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className={`relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden z-10 transition-all duration-300 w-full ${
        embedMode ? 'max-w-6xl h-[92vh]' : 'max-w-3xl max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1B3A5C] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Send size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base sm:text-lg text-[#1d1d1f] truncate flex items-center gap-2">
                Cognito Listing Intake
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                  Cognito Form
                </span>
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Icon Realty Partners New Listing Intake Form Integration
              </p>
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

        {/* Top Controls Bar */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Listing Picker */}
          {allListings.length > 0 && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-slate-600 shrink-0">Listing:</span>
              <select
                value={selectedListing?.id || ''}
                onChange={(e) => {
                  const found = allListings.find(l => l.id === e.target.value);
                  if (found) {
                    setSelectedListing(found);
                    if (onSelectListing) onSelectListing(found);
                  }
                }}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1B3A5C] max-w-[280px] truncate"
              >
                {allListings.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.address || 'Untitled Listing'} ({l.listPrice ? `$${l.listPrice.toLocaleString()}` : 'No price'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyAll}
              disabled={!selectedListing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Copy all listing details to clipboard"
            >
              {copiedKey === 'all' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedKey === 'all' ? 'Copied All!' : 'Copy All Details'}</span>
            </button>

            <button
              type="button"
              onClick={() => setEmbedMode(!embedMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors shadow-2xs cursor-pointer ${
                embedMode 
                  ? 'bg-[#1B3A5C] text-white' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle embedded form inside SimpL"
            >
              <Eye size={14} />
              <span>{embedMode ? 'Hide Embedded Form' : 'Embed Form Here'}</span>
            </button>

            <a
              href={prefillUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>Open in Cognito Forms</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Quick Copy Helper Side Drawer */}
          <div className={`overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 border-r border-slate-200 ${
            embedMode ? 'w-full md:w-80 shrink-0 bg-slate-50/60 max-h-[40vh] md:max-h-full' : 'w-full'
          }`}>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                <span>1-Click Copy Field Helper</span>
                <span className="text-[10px] font-normal normal-case text-slate-400">Click to copy field</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any row below to copy that specific value to your clipboard so you can paste it directly into the Cognito form.
              </p>
            </div>

            {selectedListing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {quickFields.map((field) => {
                  const isCopied = copiedKey === field.key;
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => handleCopy(field.value, field.key)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isCopied
                          ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                          {field.label}
                        </span>
                        <span className="font-semibold text-slate-800 block truncate" title={field.value}>
                          {field.value}
                        </span>
                      </div>
                      <div className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
                        {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                No listing selected. Select or create a listing to see quick-copy fields.
              </div>
            )}

            {/* Escrow & Title Readiness Callout */}
            {selectedListing && (
              <div className="mt-2 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3">
                <Sparkles size={18} className="text-[#1B3A5C] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-[#1B3A5C] block">
                    Escrow & Title Ready for Accepted Offers
                  </span>
                  <span className="text-slate-600 leading-relaxed block mt-0.5">
                    Your assigned Escrow Company ({selectedListing.escrowCompany || 'Not set'}) and Title Company ({selectedListing.titleCompany || 'Not set'}) are logged and will automatically carry over when you convert this listing to an open escrow.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Embedded Cognito Form Iframe (when toggled on) */}
          {embedMode && (
            <div className="flex-1 h-full min-h-[450px] bg-slate-100 flex flex-col relative">
              <iframe
                src={COGNITO_NEW_LISTING_FORM_URL}
                title="Icon Realty Partners New Listing Intake Form"
                className="w-full h-full border-0 rounded-b-2xl md:rounded-bl-none"
                allow="clipboard-write"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
