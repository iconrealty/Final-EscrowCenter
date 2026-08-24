import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  info: (message: string, action?: ToastAction) => void;
  warning: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, action }]);

    // Auto remove after 6 seconds if it has an action, otherwise 4 seconds
    const duration = action ? 7000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const success = (message: string, action?: ToastAction) => showToast(message, 'success', action);
  const error = (message: string, action?: ToastAction) => showToast(message, 'error', action);
  const info = (message: string, action?: ToastAction) => showToast(message, 'info', action);
  const warning = (message: string, action?: ToastAction) => showToast(message, 'warning', action);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => {
            let icon = <Info size={18} className="text-[#1B3A5C]" />;
            let bgColor = 'bg-white border-blue-100';
            let textColor = 'text-slate-800';
            let shadowColor = 'shadow-blue-100/50';

            if (toast.type === 'success') {
              icon = <CheckCircle2 size={18} className="text-emerald-500" />;
              bgColor = 'bg-white border-emerald-100';
              shadowColor = 'shadow-emerald-100/50';
            } else if (toast.type === 'error') {
              icon = <AlertCircle size={18} className="text-rose-500" />;
              bgColor = 'bg-white border-rose-100';
              shadowColor = 'shadow-rose-100/50';
            } else if (toast.type === 'warning') {
              icon = <AlertTriangle size={18} className="text-amber-500" />;
              bgColor = 'bg-white border-amber-100';
              shadowColor = 'shadow-amber-100/50';
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`pointer-events-auto flex items-start gap-3 border rounded-xl p-3.5 shadow-lg ${bgColor} ${textColor} ${shadowColor}`}
              >
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 text-xs font-semibold leading-relaxed break-words">
                  {toast.message}
                </div>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      removeToast(toast.id);
                    }}
                    className="shrink-0 px-2.5 py-1 bg-[#1B3A5C] text-white hover:bg-[#11253C] rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    {toast.action.label}
                  </button>
                )}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
