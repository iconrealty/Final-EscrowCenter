import React from 'react';
import { LayoutDashboard, Calendar, Gift } from 'lucide-react';
import { motion } from 'motion/react';

interface MobileFloatingNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function MobileFloatingNav({ activeTab, setActiveTab }: MobileFloatingNavProps) {
  const navItems = [
    {
      id: 'active',
      isMonogram: true,
      label: 'Home',
    },
    {
      id: 'summary',
      icon: LayoutDashboard,
      label: 'Summary',
    },
    {
      id: 'calendar',
      icon: Calendar,
      label: 'Production',
    },
    {
      id: 'anniversaries',
      icon: Gift,
      label: 'Anniversaries',
    },
  ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-3 left-0 right-0 w-full px-3 sm:px-5 z-50 flex items-center justify-center pointer-events-none"
    >
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl sm:rounded-full py-1.5 px-2 flex items-center justify-around shadow-[0_12px_36px_-6px_rgba(27,58,92,0.2),0_4px_16px_rgba(0,0,0,0.06)] ring-1 ring-black/5 select-none pointer-events-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              title={item.label}
              className="relative flex-1 h-12 flex flex-col items-center justify-center transition-transform duration-150 cursor-pointer active:scale-95 bg-transparent border-0 outline-none"
            >
              {item.isMonogram ? (
                <span className={`font-black text-[22px] tracking-tight leading-none font-sans flex items-baseline transition-opacity ${
                  isActive ? 'text-[#1B3A5C] opacity-100 scale-105' : 'text-[#1B3A5C] opacity-50 hover:opacity-90'
                }`}>
                  S<span className="text-[#1B3A5C] text-2xl leading-none">.</span>
                </span>
              ) : (
                Icon && (
                  <Icon 
                    size={22} 
                    strokeWidth={2.5} 
                    className={`transition-all text-[#1B3A5C] ${
                      isActive ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-90'
                    }`} 
                  />
                )
              )}

              {/* Active indicator dot */}
              {isActive && (
                <motion.span 
                  layoutId="mobileNavActiveDot"
                  className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#1B3A5C]" 
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
