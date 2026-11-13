import React from 'react';
import { FolderSearch, Plus } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = FolderSearch,
  title = 'No items found',
  description = 'There are no records to display at this time.',
  actionLabel,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-dashed border-[#E8E3F2] my-4">
      <div className="w-16 h-16 rounded-2xl bg-[#F8F6FF] text-[#7C3AED] flex items-center justify-center mb-4 shadow-sm border border-[#EDE9FE]">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-[#2E2459] mb-1">{title}</h3>
      <p className="text-sm text-[#77718A] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
