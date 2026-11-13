import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#2E2459]/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div className={`relative bg-white rounded-2xl shadow-2xl border border-[#E8E3F2] w-full ${maxWidth} z-10 overflow-hidden transform transition-all animate-in zoom-in-95`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E3F2] bg-[#F8F6FF]/60">
          <h3 className="text-base font-bold text-[#2E2459]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#77718A] hover:text-[#2E2459] p-1.5 rounded-lg hover:bg-[#EDE9FE]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
