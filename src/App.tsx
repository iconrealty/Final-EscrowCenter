import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { StatsBar } from './components/layout/StatsBar';
import { FilterBar } from './components/escrows/FilterBar';
import { EscrowCard } from './components/escrows/EscrowCard';
import { NeedsAttention } from './components/summary/NeedsAttention';
import { ChecklistTable } from './components/summary/ChecklistTable';
import { CalendarView } from './components/calendar/CalendarView';
import { AddEditModal } from './components/modals/AddEditModal';
import { DetailModal } from './components/modals/DetailModal';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { useEscrows } from './hooks/useEscrows';
import { Escrow } from './types';
import { differenceInDays, parseISO, getISOWeek, getISOWeekYear } from 'date-fns';
import { Home, LayoutDashboard, Calendar } from 'lucide-react';

function App() {
  const { escrows, addEscrow, editEscrow, deleteEscrow, toggleTask, importEscrows } = useEscrows();
  
  const [activeTab, setActiveTab] = useState('active');
  const [filter, setFilter] = useState('Open');
  const [search, setSearch] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [timeFilterType, setTimeFilterType] = useState<'Year' | 'Month' | 'Week' | 'All Time'>('Year');
  const [timeFilterValue, setTimeFilterValue] = useState<string>(new Date().getFullYear().toString());
  const [showClosedInSummary, setShowClosedInSummary] = useState(false);

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingEscrow, setEditingEscrow] = useState<Escrow | null>(null);
  
  const [detailEscrow, setDetailEscrow] = useState<Escrow | null>(null);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const urgentCount = escrows.filter(e => e.status === 'Open' && differenceInDays(parseISO(String(e.coeDate || new Date().toISOString())), new Date()) <= 5).length;

  const filteredEscrows = useMemo(() => {
    return escrows.filter(e => {
      if (filter !== 'All' && e.status !== filter) return false;
      if (urgentOnly && (e.status !== 'Open' || differenceInDays(parseISO(String(e.coeDate || new Date().toISOString())), new Date()) > 5)) return false;
      
      if (timeFilterType !== 'All Time' && e.coeDate) {
        if (timeFilterType === 'Year' && !e.coeDate.startsWith(timeFilterValue)) return false;
        if (timeFilterType === 'Month' && !e.coeDate.startsWith(timeFilterValue)) return false;
        if (timeFilterType === 'Week' && timeFilterValue) {
          const date = parseISO(e.coeDate);
          const week = getISOWeek(date);
          const year = getISOWeekYear(date);
          const weekStr = `${year}-W${String(week).padStart(2, '0')}`;
          if (weekStr !== timeFilterValue) return false;
        }
      }

      if (search) {
        const s = search.toLowerCase();
        const address = e.address || '';
        const clientName = `${e.clientFirstName || ''} ${e.clientLastName || ''}`.trim();
        return address.toLowerCase().includes(s) || clientName.toLowerCase().includes(s);
      }
      return true;
    });
  }, [escrows, filter, search, urgentOnly, timeFilterType, timeFilterValue]);

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
        />
        
        <StatsBar escrows={escrows} />

        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {activeTab === 'active' && (
            <div className="max-w-7xl mx-auto">
              <FilterBar 
                filter={filter} setFilter={setFilter}
                search={search} setSearch={setSearch}
                urgentOnly={urgentOnly} setUrgentOnly={setUrgentOnly}
                urgentCount={urgentCount}
                timeFilterType={timeFilterType} setTimeFilterType={setTimeFilterType}
                timeFilterValue={timeFilterValue} setTimeFilterValue={setTimeFilterValue}
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
              <div className="flex justify-end">
                <label className="flex items-center gap-2 text-sm font-medium text-[#86868b] cursor-pointer hover:text-[#1d1d1f] transition-colors">
                  <input 
                    type="checkbox" 
                    checked={showClosedInSummary}
                    onChange={(e) => setShowClosedInSummary(e.target.checked)}
                    className="w-4 h-4 rounded border-[#e5e5ea] text-[#1B3A5C] focus:ring-[#1B3A5C] cursor-pointer"
                  />
                  Show Only Closed Escrows
                </label>
              </div>
              <div className="w-full lg:h-[400px] h-auto">
                <NeedsAttention escrows={escrows} onSelectEscrow={(escrow) => setDetailEscrow(escrow)} />
              </div>
              
              <div className="w-full">
                <ChecklistTable 
                  escrows={showClosedInSummary ? escrows.filter(e => e.status === 'Closed') : escrows.filter(e => e.status === 'Open')} 
                  onSelectEscrow={(escrow) => setDetailEscrow(escrow)} 
                  onDeleteEscrow={(id) => setConfirmDeleteId(id)}
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

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#e5e5ea] flex justify-around items-center z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-safe">
        {[
          { id: 'active', icon: Home, label: 'Active' },
          { id: 'summary', icon: LayoutDashboard, label: 'Summary' },
          { id: 'calendar', icon: Calendar, label: 'Calendar' },
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
