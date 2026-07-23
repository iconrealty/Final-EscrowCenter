import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { StatsBar } from './components/layout/StatsBar';
import { FilterBar } from './components/escrows/FilterBar';
import { EscrowCard } from './components/escrows/EscrowCard';
import { SalesSummary } from './components/summary/SalesSummary';
import { ChecklistTable } from './components/summary/ChecklistTable';
import { YearlyRepresentationSummary } from './components/summary/YearlyRepresentationSummary';
import { CalendarView } from './components/calendar/CalendarView';
import { AnniversaryTracker } from './components/anniversaries/AnniversaryTracker';
import { MorningBriefingWidget } from './components/dashboard/MorningBriefingWidget';
import { AnniversaryWishModal } from './components/anniversaries/AnniversaryWishModal';
import { AddEditModal } from './components/modals/AddEditModal';
import { DetailModal } from './components/modals/DetailModal';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { AuthModal } from './components/modals/AuthModal';
import { ClientUpdatesModal } from './components/modals/ClientUpdatesModal';
import { MilestonesContingenciesModal } from './components/modals/MilestonesContingenciesModal';

import { useEscrows } from './hooks/useEscrows';
import { Escrow } from './types';
import { differenceInCalendarDays, parseISO, getISOWeek, getISOWeekYear } from 'date-fns';
import { Home, LayoutDashboard, Calendar, Gift } from 'lucide-react';

function App() {
  const { escrows, addEscrow, editEscrow, deleteEscrow, toggleTask, importEscrows } = useEscrows();
  
  const [activeTab, setActiveTab] = useState('active');
  const [filter, setFilter] = useState('Open');
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [summaryFilter, setSummaryFilter] = useState<'All' | 'Open' | 'Closed'>('Open');

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEscrow, setEditingEscrow] = useState<Escrow | null>(null);
  
  const [detailEscrow, setDetailEscrow] = useState<Escrow | null>(null);
  const [clientUpdateEscrow, setClientUpdateEscrow] = useState<Escrow | null>(null);
  const [updateTasksEscrow, setUpdateTasksEscrow] = useState<Escrow | null>(null);
  const [wishModalEscrow, setWishModalEscrow] = useState<{ escrow: Escrow; years: number; dateFormatted: string } | null>(null);

  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const filteredEscrows = useMemo(() => {
    const list = escrows.filter(e => {
      if (filter === 'All') {
        if (e.status === 'Cancelled') return false;
      } else if (e.status !== filter) {
        return false;
      }
      
      if (selectedYear !== 'All') {
        if (!e.coeDate || !e.coeDate.startsWith(selectedYear)) return false;
      }

      if (search) {
        const s = search.toLowerCase();
        const address = e.address || '';
        const clientName = `${e.clientFirstName || ''} ${e.clientLastName || ''}`.trim();
        return address.toLowerCase().includes(s) || clientName.toLowerCase().includes(s);
      }
      return true;
    });

    // Organize escrows by COE date (January first)
    const parseCoeTime = (coeDate?: string): number => {
      if (!coeDate) return 0;
      const str = coeDate.trim();
      if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
        const [m, d, y] = str.split('/');
        return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
      }
      const t = new Date(str).getTime();
      return isNaN(t) ? 0 : t;
    };

    list.sort((a, b) => parseCoeTime(a.coeDate) - parseCoeTime(b.coeDate));

    return list;
  }, [escrows, filter, search, selectedYear]);

  const handleSaveEscrow = (data: any) => {
    console.log("Saving escrow with data:", data);
    if (editingEscrow) {
      editEscrow(editingEscrow.id, data);
    } else {
      addEscrow(data);
    }
    setIsAddEditOpen(false);
    setEditingEscrow(null);
  };

  const handleDelete = () => {
    if (confirmDeleteId) {
      deleteEscrow(confirmDeleteId);
      setConfirmDeleteId(null);
      if (detailEscrow?.id === confirmDeleteId) {
        setDetailEscrow(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 md:ml-[60px] flex flex-col min-h-screen pb-16 md:pb-0">
        <TopNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onNewEscrow={() => {
            setEditingEscrow(null);
            setIsAddEditOpen(true);
          }} 
          onImportEscrows={importEscrows}
          onOpenAuth={() => setIsAuthOpen(true)}
          escrows={escrows}
        />
        
        <StatsBar escrows={escrows} />

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {activeTab === 'active' && (
            <div className="max-w-7xl mx-auto">
              <MorningBriefingWidget 
                escrows={escrows}
                onSelectEscrow={(escrow) => setDetailEscrow(escrow)}
                onOpenWishModal={(escrow, years, dateFormatted) => setWishModalEscrow({ escrow, years, dateFormatted })}
              />

              <FilterBar 
                filter={filter} setFilter={setFilter}
                search={search} setSearch={setSearch}
                selectedYear={selectedYear} setSelectedYear={setSelectedYear}
              />
              
              {filteredEscrows.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredEscrows.map((escrow, index) => (
                    <EscrowCard 
                      key={escrow.id} 
                      escrow={escrow}
                      index={index}
                      onToggleTask={toggleTask}
                      onEdit={() => {
                        setEditingEscrow(escrow);
                        setIsAddEditOpen(true);
                      }}
                      onViewDetails={() => setDetailEscrow(escrow)}
                      onSendUpdate={() => setClientUpdateEscrow(escrow)}
                      onUpdateTasks={() => setUpdateTasksEscrow(escrow)}
                    />

                  ))}
                </div>
              ) : (
                <div className="bg-white border border-[#e5e5ea] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl p-12 text-center">
                  <h3 className="text-[#1d1d1f] font-bold text-lg mb-2">No escrows found</h3>
                  <p className="text-[#86868b] mb-6">Create a new escrow to get started.</p>
                  <button
                    onClick={() => {
                      setEditingEscrow(null);
                      setIsAddEditOpen(true);
                    }}
                    className="bg-[#1B3A5C] hover:bg-[#11253C] text-[#FFFFFF] px-6 py-2 rounded-xl font-bold transition-colors"
                  >
                    New Escrow
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[400px] h-auto">
                <SalesSummary escrows={escrows} onSelectEscrow={(escrow) => setDetailEscrow(escrow)} />
                <YearlyRepresentationSummary escrows={escrows} />
              </div>
              
              <div className="w-full">
                <ChecklistTable 
                  escrows={
                    summaryFilter === 'All' 
                      ? escrows.filter(e => e.status !== 'Cancelled')
                      : summaryFilter === 'Open' 
                      ? escrows.filter(e => e.status === 'Open') 
                      : escrows.filter(e => e.status === 'Closed')
                  } 
                  onSelectEscrow={(escrow) => setDetailEscrow(escrow)} 
                  onDeleteEscrow={(id) => setConfirmDeleteId(id)}
                  summaryFilter={summaryFilter}
                  onFilterChange={setSummaryFilter}
                />
              </div>
            </div>
          )}
          
          {activeTab === 'calendar' && (
            <div className="max-w-7xl mx-auto h-full">
              <CalendarView 
                escrows={escrows} 
                onSelectEscrow={(escrow) => setDetailEscrow(escrow)} 
              />
            </div>
          )}

          {activeTab === 'anniversaries' && (
            <div className="max-w-7xl mx-auto h-full">
              <AnniversaryTracker 
                escrows={escrows} 
                onSelectEscrow={(escrow) => setDetailEscrow(escrow)} 
                onUpdateEscrow={(id, data) => editEscrow(id, data)}
              />
            </div>
          )}
        </main>
      </div>

      {isAddEditOpen && (
        <AddEditModal 
          escrow={editingEscrow} 
          onClose={() => {
            setIsAddEditOpen(false);
            setEditingEscrow(null);
          }} 
          onSave={handleSaveEscrow} 
        />
      )}

      {detailEscrow && (
        <DetailModal 
          escrow={escrows.find(e => e.id === detailEscrow.id) || detailEscrow} 
          onClose={() => setDetailEscrow(null)}
          onEdit={() => {
            setEditingEscrow(detailEscrow);
            setIsAddEditOpen(true);
            setDetailEscrow(null);
          }}
          onDelete={() => setConfirmDeleteId(detailEscrow.id)}
          onToggleTask={toggleTask}
          onUpdateTasks={(id, tasks) => editEscrow(id, { tasks })}
          onUpdateEscrow={(id, data) => editEscrow(id, data)}
        />
      )}

      {clientUpdateEscrow && (
        <ClientUpdatesModal 
          escrow={escrows.find(e => e.id === clientUpdateEscrow.id) || clientUpdateEscrow} 
          onClose={() => setClientUpdateEscrow(null)}
        />
      )}

      {updateTasksEscrow && (
        <MilestonesContingenciesModal 
          escrow={escrows.find(e => e.id === updateTasksEscrow.id) || updateTasksEscrow} 
          onClose={() => setUpdateTasksEscrow(null)}
          onToggleTask={toggleTask}
          onUpdateTasks={(id, tasks) => editEscrow(id, { tasks })}
        />
      )}


      {wishModalEscrow && (
        <AnniversaryWishModal 
          escrow={escrows.find(e => e.id === wishModalEscrow.escrow.id) || wishModalEscrow.escrow}
          yearsCount={wishModalEscrow.years}
          anniversaryDateFormatted={wishModalEscrow.dateFormatted}
          onClose={() => setWishModalEscrow(null)}
          onUpdateEscrow={(id, data) => editEscrow(id, data)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmModal 
          title="Delete Escrow"
          message="Are you sure you want to delete this escrow? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {isAuthOpen && (
        <AuthModal onClose={() => setIsAuthOpen(false)} />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#e5e5ea] flex justify-around items-center z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe">
        {[
          { id: 'active', icon: Home, label: 'Home' },
          { id: 'summary', icon: LayoutDashboard, label: 'Summary' },
          { id: 'calendar', icon: Calendar, label: 'Calendar' },
          { id: 'anniversaries', icon: Gift, label: 'Anniv.' },
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center gap-1 flex-1 max-w-[72px] sm:max-w-[80px] h-full transition-colors relative"
            >
              <Icon size={20} className={isActive ? "text-[#1B3A5C]" : "text-[#86868b]"} />
              <span className={`text-[10px] font-bold ${isActive ? "text-[#1B3A5C]" : "text-[#86868b]"}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-[#1B3A5C] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default App;
