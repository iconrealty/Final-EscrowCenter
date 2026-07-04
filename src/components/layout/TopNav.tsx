import React, { useRef } from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { downloadCsvTemplate, parseCsv } from '../../utils/csvUtils';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onNewEscrow: () => void;
  onImportEscrows: (data: any[]) => void;
}

export function TopNav({ activeTab, setActiveTab, onNewEscrow, onImportEscrows }: TopNavProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const csvText = evt.target?.result as string;
      if (csvText) {
        const parsedData = parseCsv(csvText);
        if (parsedData.length > 0) {
          onImportEscrows(parsedData);
          alert(`Successfully imported ${parsedData.length} escrows.`);
        } else {
          alert("No valid valid escrows found in the CSV. Please check the format.");
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
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
        <button
          onClick={downloadCsvTemplate}
          className="flex items-center justify-center bg-white hover:bg-slate-50 text-[#1B3A5C] hover:text-[#11253C] w-9 h-9 rounded-xl transition-all border border-[#e5e5ea] active:scale-95 shadow-sm"
          title="Download CSV Template"
        >
          <Download size={16} className="shrink-0" />
        </button>
 
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center bg-white hover:bg-slate-50 text-[#1B3A5C] hover:text-[#11253C] w-9 h-9 rounded-xl transition-all border border-[#e5e5ea] active:scale-95 shadow-sm"
          title="Import CSV"
        >
          <Upload size={16} className="shrink-0" />
        </button>
 
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
