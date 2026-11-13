import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  FileText,
  Trash2,
  Eye,
  Wand2,
  ArrowRight
} from 'lucide-react';
import { contentAPI } from '../services/api';
import { StatusBadge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../context/ToastContext';

export const ContentHistoryPage = () => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadContents = async () => {
    try {
      const res = await contentAPI.list();
      setContents(res.data.contents);
    } catch (err) {
      showToast('Failed to load content history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContents();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this content record and its audit logs?')) return;
    try {
      await contentAPI.delete(id);
      showToast('Content deleted.', 'info');
      loadContents();
    } catch (err) {
      showToast('Failed to delete content.', 'error');
    }
  };

  const filteredContents = contents.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                          c.original_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading content history...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
          Content Governance History
        </h1>
        <p className="text-xs text-[#77718A] mt-1">
          Complete audit archive of all marketing copy, design assets, and publication clearance records.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#E8E3F2] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#77718A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F8F6FF] text-xs text-[#2E2459] pl-10 pr-4 py-2.5 rounded-xl border border-[#EDE9FE] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'UPLOADED', 'ANALYZED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-[#F8F6FF] text-[#77718A] hover:text-[#2E2459]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredContents.length === 0 ? (
        <EmptyState
          icon={History}
          title="No content matching filters"
          description="Try broadening your search term or upload new campaign content."
          actionLabel="Upload Content"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-[#E8E3F2] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E3F2] bg-[#F8F6FF]/60 text-[#77718A] font-semibold uppercase text-[10px]">
                  <th className="py-4 px-6">Asset Title</th>
                  <th className="py-4 px-6">Format</th>
                  <th className="py-4 px-6">Creator</th>
                  <th className="py-4 px-6">Governance Score</th>
                  <th className="py-4 px-6">Current Status</th>
                  <th className="py-4 px-6">Created</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3F2]">
                {filteredContents.map((c) => {
                  const score = c.latest_analysis?.compliance_score ?? null;
                  return (
                    <tr key={c.id} className="hover:bg-[#F8F6FF]/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-[#2E2459] text-sm">{c.title}</div>
                        <div className="text-[10px] text-[#77718A] truncate max-w-xs">{c.original_name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {c.file_type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[#77718A]">
                        {c.creator_name || 'Creator'}
                      </td>
                      <td className="py-4 px-6">
                        {score !== null ? (
                          <span className={`font-black text-sm ${
                            score >= 80 ? 'text-[#16A34A]' : score >= 60 ? 'text-[#F59E0B]' : 'text-[#DC2626]'
                          }`}>
                            {score}/100
                          </span>
                        ) : (
                          <span className="text-[#77718A] italic">Pending Audit</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-4 px-6 text-[#77718A]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.latest_analysis && (
                            <button
                              onClick={() => navigate(`/analysis/results/${c.latest_analysis.id}`)}
                              className="p-1.5 rounded-lg text-[#7C3AED] hover:bg-[#EDE9FE]"
                              title="Audit Results"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/suggestions/${c.id}`)}
                            className="p-1.5 rounded-lg text-[#7C3AED] hover:bg-[#EDE9FE]"
                            title="Correction Studio"
                          >
                            <Wand2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
