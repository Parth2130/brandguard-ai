import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Overlay Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md pointer-events-none">
        {toasts.map((toast) => {
          let bg = 'bg-white text-[#2E2459] border-[#E8E3F2]';
          let Icon = Info;
          let iconColor = 'text-[#2563EB]';

          if (toast.type === 'success') {
            bg = 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
            Icon = CheckCircle2;
            iconColor = 'text-[#16A34A]';
          } else if (toast.type === 'error') {
            bg = 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]';
            Icon = AlertCircle;
            iconColor = 'text-[#DC2626]';
          } else if (toast.type === 'warning') {
            bg = 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
            Icon = AlertTriangle;
            iconColor = 'text-[#F59E0B]';
          } else if (toast.type === 'info') {
            bg = 'bg-[#F8F6FF] text-[#2E2459] border-[#EDE9FE]';
            Icon = Info;
            iconColor = 'text-[#7C3AED]';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 animate-in slide-in-from-bottom-5 ${bg}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 leading-snug">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
