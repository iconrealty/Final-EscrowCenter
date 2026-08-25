import React, { useState } from 'react';
import { PreferredPartner, PartnerCategory } from '../../types/partners';
import { Plus, ChevronDown, Building2, User, Phone, Mail, X, Trash2 } from 'lucide-react';

interface PartnerDropdownProps {
  category: PartnerCategory;
  categoryLabel: string;
  partners: PreferredPartner[];
  onSelect: (partner: PreferredPartner) => void;
  onAddNew?: (partner: Omit<PreferredPartner, 'id'>) => void;
  onDelete?: (id: string) => void;
}

export function PartnerDropdown({
  category,
  categoryLabel,
  partners,
  onSelect,
  onAddNew,
  onDelete,
}: PartnerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const filtered = partners.filter(p => p.category === category);

  const handleSelect = (partner: PreferredPartner) => {
    onSelect(partner);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  const [formError, setFormError] = useState('');

  const handleAddSubmit = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!newCompany.trim() && !newName.trim()) {
      setFormError('Please provide a company or contact name.');
      return;
    }
    setFormError('');
    if (onAddNew) {
      onAddNew({
        category,
        company: newCompany.trim(),
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        isSystemDefault: false,
      });
      // auto-select it
      onSelect({
        id: 'temp',
        category,
        company: newCompany.trim(),
        name: newName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        isSystemDefault: false,
      });
    }
    setNewCompany('');
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setShowAddModal(false);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-all active:scale-98"
      >
        <span className="font-semibold text-slate-900">Select Preferred {categoryLabel}</span>
        <ChevronDown size={13} className={`text-slate-600 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-1 w-84 sm:w-92 bg-white rounded-xl shadow-2xl border border-slate-300 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                Saved {categoryLabel}s
              </span>
              {onAddNew && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 hover:underline"
                >
                  <Plus size={13} />
                  Add Custom
                </button>
              )}
            </div>

            {/* List with distinct minimalistic dividers between each partner */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No saved {categoryLabel.toLowerCase()}s found.
                </div>
              ) : (
                filtered.map((partner) => {
                  const isProtectedDefault = partner.isSystemDefault || partner.id.startsWith('sys_');

                  return (
                    <div
                      key={partner.id}
                      onClick={() => handleSelect(partner)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 transition-colors flex items-start justify-between group cursor-pointer"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                        {/* Company Name in high-contrast bold black */}
                        <div className="text-[13px] font-bold text-black flex items-center gap-1.5 truncate">
                          <Building2 size={13} className="text-slate-600 shrink-0" />
                          <span className="truncate">{partner.company}</span>
                        </div>

                        {/* Officer Name in clear black/dark text */}
                        {partner.name && (
                          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                            <User size={12} className="text-slate-500 shrink-0" />
                            <span className="truncate">{partner.name}</span>
                          </div>
                        )}

                        {/* Contact details in clear readable black/dark text */}
                        <div className="text-[11px] text-slate-900 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5 font-medium">
                          {partner.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-slate-500 shrink-0" />
                              <span className="text-black font-semibold">{partner.phone}</span>
                            </span>
                          )}
                          {partner.email && (
                            <span className="flex items-center gap-1 truncate max-w-[170px]">
                              <Mail size={11} className="text-slate-500 shrink-0" />
                              <span className="truncate text-black font-semibold">{partner.email}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                        <span className="opacity-0 group-hover:opacity-100 text-blue-700 text-xs font-bold transition-opacity bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                          Select
                        </span>

                        {/* Delete button only for non-default/custom entries */}
                        {!isProtectedDefault && onDelete && (
                          <button
                            type="button"
                            title="Delete custom partner"
                            onClick={(e) => handleDelete(e, partner.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Add New Custom Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Add Preferred {categoryLabel}
                </h4>
                <p className="text-[11px] text-slate-500 font-normal">
                  Saved to your personal profile for all future escrows.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div 
              className="space-y-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubmit(e);
                }
              }}
            >
              {formError && (
                <div className="text-[11px] font-semibold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Company / Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${category === 'lender' ? 'Wells Fargo Mortgage' : category === 'escrow' ? 'West Coast Escrow' : 'Ticor Title'}`}
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Officer / Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. (555) 123-4567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. contact@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSubmit}
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Save to Profile & Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
