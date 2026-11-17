import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Wand2,
  Check,
  X,
  Edit3,
  ArrowRight,
  ArrowLeft,
  CheckCheck,
  History,
  FileText,
  Send,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { contentAPI, correctionsAPI, reviewsAPI } from '../services/api';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';

export const SmartSuggestionsPage = () => {
  const { contentId } = useParams();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [customText, setCustomText] = useState('');

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadContent = async () => {
    try {
      const res = await contentAPI.get(contentId);
      setContent(res.data.content);
    } catch (err) {
      showToast('Failed to load content draft.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [contentId]);

  const handleAccept = async (suggId) => {
    try {
      await correctionsAPI.accept(suggId);
      showToast('Correction applied to working draft.', 'success');
      loadContent();
    } catch (err) {
      showToast('Failed to accept suggestion.', 'error');
    }
  };

  const handleReject = async (suggId) => {
    try {
      await correctionsAPI.reject(suggId);
      showToast('Suggestion dismissed.', 'info');
      loadContent();
    } catch (err) {
      showToast('Failed to reject suggestion.', 'error');
    }
  };

  const handleOpenEdit = (sugg) => {
    setActiveSuggestion(sugg);
    setCustomText(sugg.suggested_text || sugg.original_text);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!activeSuggestion) return;
    try {
      await correctionsAPI.edit(activeSuggestion.id, { custom_text: customText });
      showToast('Custom correction applied.', 'success');
      setEditModalOpen(false);
      loadContent();
    } catch (err) {
      showToast('Could not save edit.', 'error');
    }
  };

  const handleApplyAll = async () => {
    try {
      const res = await correctionsAPI.applyAll(contentId);
      showToast(`Batch applied ${res.data.applied_count} smart corrections!`, 'success');
      loadContent();
    } catch (err) {
      showToast('Failed to batch apply suggestions.', 'error');
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const res = await correctionsAPI.reanalyze(contentId);
      showToast(`Re-analysis complete! Recalculated Compliance Score: ${res.data.new_score}/100`, 'success');
      loadContent();
    } catch (err) {
      showToast(err.response?.data?.error || 'Re-analysis failed.', 'error');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      await reviewsAPI.submit({
        content_id: contentId,
        notes: 'Updated with smart corrections. Ready for final reviewer verification.'
      });
      showToast('Draft submitted to Brand Reviewer!', 'success');
      navigate('/reviews');
    } catch (err) {
      showToast('Could not submit for review.', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading Smart Correction Studio...</div>;
  }

  if (!content) {
    return <div className="text-center py-20 text-[#DC2626]">Content draft not found.</div>;
  }

  const latestAnalysis = content.latest_analysis;
  const issues = latestAnalysis?.issues || [];
  const suggestions = issues
    .map(i => i.correction_suggestion)
    .filter(Boolean);

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const currentScore = latestAnalysis?.compliance_score ?? 100;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(latestAnalysis ? `/analysis/results/${latestAnalysis.id}` : '/analysis')}
            className="p-2 rounded-xl border border-[#E8E3F2] bg-white text-[#77718A] hover:text-[#2E2459]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
                Smart Correction Studio
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                currentScore >= 80 ? 'bg-green-100 text-green-700' :
                currentScore >= 60 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                Score: {currentScore}/100
              </span>
            </div>
            <p className="text-xs text-[#77718A] mt-0.5">
              Review and apply AI-generated brand corrections side-by-side • {content.title}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pendingCount > 0 && (
            <button
              onClick={handleApplyAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white font-bold text-xs transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Apply All ({pendingCount})
            </button>
          )}

          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#7C3AED] text-[#7C3AED] hover:bg-[#F8F6FF] font-bold text-xs shadow-2xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin' : ''}`} />
            {reanalyzing ? 'Recalculating...' : 'Re-analyze & Recalculate'}
          </button>

          <button
            onClick={handleSubmitForReview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md shadow-[#7C3AED]/20 transition-all"
          >
            <Send className="w-4 h-4" />
            Submit Corrected Draft
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Original Uploaded Content (Read Only, Preserved) */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E3F2]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#77718A]" />
                <h3 className="text-sm font-bold text-[#2E2459]">Original Uploaded Copy</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718A] bg-gray-100 px-2.5 py-0.5 rounded-full">
                Preserved Original
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE] font-mono text-xs text-[#2E2459] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {content.extracted_text || 'No text extracted.'}
            </div>
          </div>
          <div className="mt-4 text-[11px] text-[#77718A] italic">
            Original uploaded file is immutable and strictly preserved for compliance audit trail.
          </div>
        </div>

        {/* Right Column: Working Revised Draft (Updated in Real Time) */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E3F2]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                <h3 className="text-sm font-bold text-[#2E2459]">Active Corrected Draft</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A] bg-green-100 px-2.5 py-0.5 rounded-full">
                Revision v{content.revisions?.length || 1}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F0FDF4]/30 border border-[#BBF7D0] font-mono text-xs text-[#15803D] leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {content.current_content || content.extracted_text}
            </div>
          </div>

          <div className="mt-4 text-[11px] text-[#16A34A] font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Contains applied smart replacements and validated brand parameters.
          </div>
        </div>
      </div>

      {/* Smart Suggestions Action Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#2E2459]">
            AI Correction Recommendations ({suggestions.length})
          </h3>
          <span className="text-xs text-[#77718A]">
            {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
          </span>
        </div>

        {suggestions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E3F2] text-xs text-[#77718A]">
            No correction suggestions required for this content.
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((sugg) => (
              <div
                key={sugg.id}
                className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718A] px-2 py-0.5 rounded bg-[#F8F6FF]">
                      {sugg.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      sugg.status === 'accepted' ? 'bg-green-100 text-green-700' :
                      sugg.status === 'rejected' ? 'bg-gray-100 text-gray-500 line-through' :
                      sugg.status === 'edited' ? 'bg-purple-100 text-purple-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {sugg.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-red-50/60 border border-red-100">
                      <div className="text-[10px] font-bold text-red-600 uppercase mb-0.5">Original Snippet</div>
                      <div className="text-red-950 font-mono">"{sugg.original_text}"</div>
                    </div>
                    <div className="p-3 rounded-xl bg-green-50/60 border border-green-100">
                      <div className="text-[10px] font-bold text-green-600 uppercase mb-0.5">Verified Correction</div>
                      <div className="text-green-950 font-mono">
                        "{sugg.user_edited_text || sugg.suggested_text}"
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {sugg.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleAccept(sugg.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleOpenEdit(sugg)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE] text-xs font-bold transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleReject(sugg.id)}
                        className="p-2 rounded-xl border border-[#E8E3F2] text-[#77718A] hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-[#77718A] italic">
                      Action Recorded ({sugg.status})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revision History Audit Log */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E8E3F2]">
          <History className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="text-sm font-bold text-[#2E2459]">Revision History Audit Trail</h3>
        </div>

        <div className="space-y-3">
          {content.revisions?.map((rev) => (
            <div key={rev.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded">
                  v{rev.version_num}
                </span>
                <span className="font-semibold text-[#2E2459]">{rev.change_summary}</span>
                <span className="text-[#77718A]">by {rev.modifier_name}</span>
              </div>
              <span className="text-[11px] text-[#77718A]">
                {new Date(rev.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Edit Suggestion Text */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Suggested Replacement">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Original Text</label>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-[#2E2459] font-mono">
              "{activeSuggestion?.original_text}"
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">Your Custom Replacement</label>
            <textarea
              rows={4}
              required
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-3 text-xs text-[#2E2459] font-mono focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#77718A] hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl"
            >
              Save & Apply
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
