import React from 'react';

export const SeverityBadge = ({ severity }) => {
  const sev = (severity || 'medium').toLowerCase();
  
  const styles = {
    critical: 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]',
    high: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
    medium: 'bg-[#FEF9C3] text-[#A16207] border-[#FEF08A]',
    low: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]'
  };

  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[sev] || styles.medium}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        sev === 'critical' ? 'bg-[#DC2626]' :
        sev === 'high' ? 'bg-[#EA580C]' :
        sev === 'medium' ? 'bg-[#CA8A04]' : 'bg-[#2563EB]'
      }`} />
      {labels[sev] || severity}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const st = (status || 'UPLOADED').toUpperCase();

  const styles = {
    APPROVED: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    COMPLIANT: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
    PENDING_REVIEW: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]',
    NEEDS_REVIEW: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]',
    REVISION_REQUESTED: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]',
    ANALYZING: 'bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]',
    ANALYZED: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]',
    REJECTED: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
    HIGH_RISK: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
    UPLOADED: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
  };

  const labels = {
    APPROVED: 'Approved',
    COMPLIANT: 'Compliant',
    PENDING_REVIEW: 'Pending Review',
    NEEDS_REVIEW: 'Needs Review',
    REVISION_REQUESTED: 'Revision Requested',
    ANALYZING: 'Analyzing...',
    ANALYZED: 'Analyzed',
    REJECTED: 'Rejected',
    HIGH_RISK: 'High Risk',
    UPLOADED: 'Uploaded'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[st] || styles.UPLOADED}`}>
      {labels[st] || status}
    </span>
  );
};

export const CategoryBadge = ({ category }) => {
  const cat = (category || 'general').toLowerCase();
  
  const colors = {
    visual: 'bg-purple-50 text-purple-700 border-purple-200',
    color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    claim: 'bg-amber-50 text-amber-700 border-amber-200',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    terminology: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accessibility: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${colors[cat] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {cat}
    </span>
  );
};
