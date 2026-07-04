import React from 'react';
import { LayoutDashboard, Home, Calendar } from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const icons = [
    { id: 'active', icon: Home, label: 'Active Escrows' },
    { id: 'summary', icon: LayoutDashboard, label: 'Summary' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
  ];

  return (
    <div className="hidden md:flex fixed left-0 top-0 h-full w-[60px] bg-white border-r border-[#e5e5ea] flex-col items-center py-6 gap-8 z-50">
      {icons.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`p-3 rounded-xl transition-colors ${
              isActive ? 'bg-[#1B3A5C]/10 text-[#1B3A5C]' : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
            title={item.label}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
          </button>
        );
      })}
    </div>
  );
}
