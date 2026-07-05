import React, { useRef, useState } from 'react';
import { Plus, Download, Upload, Cloud, CloudOff, LogOut, User, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { downloadCsvTemplate, parseCsv, downloadEscrowsCsv } from '../../utils/csvUtils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Escrow } from '../../types';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onNewEscrow: () => void;
  onImportEscrows: (data: any[]) => Promise<any>;
  onOpenAuth: () => void;
  escrows: Escrow[];
}

export function TopNav({ activeTab, setActiveTab, onNewEscrow, onImportEscrows, onOpenAuth, escrows }: TopNavProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, signOut } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning } = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCsvDropdown, setShowCsvDropdown] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const csvText = evt.target?.result as string;
      if (csvText) {
        const parsedData = parseCsv(csvText);
        if (parsedData.length > 0) {
          try {
            const res = await onImportEscrows(parsedData);
            if (res && res.success === false) {
              showError(`Failed to import escrows: ${res.error || 'Unknown error occurred.'}`);
            } else {
              const count = res && typeof res.count === 'number' ? res.count : parsedData.length;
              showSuccess(`Successfully imported ${count} escrows.`);
            }
          } catch (err: any) {
            showError(`Error during import: ${err.message || String(err)}`);
          }
        } else {
          showWarning("No valid escrows found in the CSV. Please check the format.");
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Extract initials for the user profile circle
  const getUserInitials = () => {
    if (!user) return '?';
    if (user.displayName) {
      return user.displayName.split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email ? user.email[0].toUpperCase() : 'U';
  };

  return (
    <div className="h-[56px] bg-white border-b border-[#e5e5ea] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4 sm:gap-8 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-[#1B3A5C] text-xs sm:text-sm tracking-wide truncate max-w-[160px] xs:max-w-none flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-black tracking-tight">MuNR</span>
            <span className="font-bold">Escrow Center</span>
          </h1>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('active')}
            className={`text-sm font-medium transition-colors ${activeTab === 'active' ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
          >
            Active Escrows
          </button>
          <button 
            onClick={() => setActiveTab('summary')}
            className={`text-sm font-medium transition-colors ${activeTab === 'summary' ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
          >
            Summary
          </button>
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'text-[#1d1d1f]' : 'text-[#86868b] hover:text-[#1d1d1f]'}`}
          >
            Calendar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5 relative shrink-0">
        {/* Firebase Cloud Sync Status */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer text-emerald-800"
              title="Cloud Connected & Active Syncing"
            >
              <Cloud size={16} className="text-emerald-600 animate-pulse" />
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                {getUserInitials()}
              </div>
              <span className="text-xs font-bold hidden sm:inline truncate max-w-[80px]">
                {user.displayName || 'Synced'}
              </span>
            </button>
            
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e5e5ea] rounded-2xl shadow-lg py-2.5 z-50 animate-scale-up">
                  <div className="px-4 py-2 border-b border-[#e5e5ea] mb-1.5">
                    <p className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider">Signed In As</p>
                    <p className="text-xs font-bold text-[#1d1d1f] truncate mt-0.5">{user.displayName || 'User'}</p>
                    <p className="text-[11px] text-[#86868b] truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      signOut();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 bg-[#1B3A5C]/10 hover:bg-[#1B3A5C]/15 border border-[#1B3A5C]/20 text-[#1B3A5C] px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
            title="Sign In to Sync"
          >
            <CloudOff size={15} className="text-slate-500" />
            <span className="hidden sm:inline">Cloud Sync Off</span>
            <span className="sm:hidden">Sync</span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 hidden xs:block" />

        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />

        <div className="relative">
          <button
            onClick={() => setShowCsvDropdown(!showCsvDropdown)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-[#1B3A5C] px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-[#e5e5ea] active:scale-95 shadow-sm cursor-pointer h-9"
            title="CSV Tools"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden xs:inline">CSV</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${showCsvDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showCsvDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowCsvDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e5e5ea] rounded-2xl shadow-lg py-2 z-50 animate-scale-up">
                <button
                  onClick={() => {
                    setShowCsvDropdown(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload size={14} className="text-[#1B3A5C]" />
                  <span>Import CSV File</span>
                </button>
                <button
                  onClick={() => {
                    setShowCsvDropdown(false);
                    if (escrows.length === 0) {
                      showWarning("No escrows available to export.");
                    } else {
                      downloadEscrowsCsv(escrows);
                    }
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download size={14} className="text-[#1B3A5C]" />
                  <span>Export Escrows (CSV)</span>
                </button>
                <div className="h-px bg-slate-100 my-1.5" />
                <button
                  onClick={() => {
                    setShowCsvDropdown(false);
                    downloadCsvTemplate();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-slate-400" />
                  <span>Get Blank Template</span>
                </button>
              </div>
            </>
          )}
        </div>
 
        <button
          onClick={onNewEscrow}
          className="flex items-center justify-center bg-[#1B3A5C] hover:bg-[#11253C] text-[#FFFFFF] w-9 h-9 rounded-xl font-bold transition-all active:scale-95 ml-0.5"
          title="New Escrow"
        >
          <Plus size={20} strokeWidth={3} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}

