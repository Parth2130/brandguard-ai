import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'purple', trend }) => {
  const colorMap = {
    purple: {
      bg: 'bg-[#EDE9FE]',
      icon: 'text-[#7C3AED]',
      border: 'border-[#E8E3F2]'
    },
    green: {
      bg: 'bg-[#DCFCE7]',
      icon: 'text-[#16A34A]',
      border: 'border-[#E8E3F2]'
    },
    orange: {
      bg: 'bg-[#FEF3C7]',
      icon: 'text-[#F59E0B]',
      border: 'border-[#E8E3F2]'
    },
    red: {
      bg: 'bg-[#FEE2E2]',
      icon: 'text-[#DC2626]',
      border: 'border-[#E8E3F2]'
    },
    blue: {
      bg: 'bg-[#EFF6FF]',
      icon: 'text-[#2563EB]',
      border: 'border-[#E8E3F2]'
    }
  };

  const scheme = colorMap[color] || colorMap.purple;

  return (
    <div className={`bg-white rounded-2xl p-6 border ${scheme.border} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#77718A]">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${scheme.bg} ${scheme.icon}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-extrabold text-[#2E2459] tracking-tight">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#77718A]">
            {trend && (
              <span className={`font-semibold ${trend > 0 ? 'text-[#16A34A]' : trend < 0 ? 'text-[#DC2626]' : 'text-gray-500'}`}>
                {trend > 0 ? `+${trend}%` : `${trend}%`}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
