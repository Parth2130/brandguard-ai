import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  FileText,
  User,
  Clock,
  Send,
  Eye,
  Wand2,
  ShieldCheck
} from 'lucide-react';
import { reviewsAPI } from '../services/api';
import { StatusBadge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export const ReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionNotes, setActionNotes] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { isReviewer, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadReviews = async () => {
    try {
      const res = await reviewsAPI.list();
      setReviews(res.data.reviews);
    } catch (err) {
      showToast('Failed to load review requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await reviewsAPI.approve(id, { notes: actionNotes || 'Approved. Complies with brand identity.' });
      showToast('Content approved for publication clearance!', 'success');
      setSelectedReview(null);
      setActionNotes('');
      loadReviews();
    } catch (err) {
      showToast(err.response?.data?.error || 'Approval failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!actionNotes) {
      showToast('Please specify a rejection reason for the submitter.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await reviewsAPI.reject(id, { notes: actionNotes });
      showToast('Content review rejected.', 'info');
      setSelectedReview(null);
      setActionNotes('');
      loadReviews();
    } catch (err) {
      showToast(err.response?.data?.error || 'Rejection failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async (id) => {
    if (!actionNotes) {
      showToast('Please describe the required changes.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await reviewsAPI.requestChanges(id, { notes: actionNotes });
      showToast('Revision requested from creator.', 'info');
      setSelectedReview(null);
      setActionNotes('');
      loadReviews();
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedReview) return;
    try {
      await reviewsAPI.addComment(selectedReview.id, { comment: commentInput });
      showToast('Comment posted.', 'success');
      setCommentInput('');
      // Reload review details
      const updated = await reviewsAPI.get(selectedReview.id);
      setSelectedReview(updated.data.review);
      loadReviews();
    } catch (err) {
      showToast('Could not post comment.', 'error');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.status === activeTab;
  });

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading review requests...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
            Review & Approval Workflow
          </h1>
          <p className="text-xs text-[#77718A] mt-1">
            Human brand reviewer sign-off gate before external publish or distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isReviewer && (
            <span className="text-[11px] text-[#77718A] bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
              Viewing as Creator (Approval actions restricted to Brand Reviewers & Admins)
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E3F2] pb-2">
        {['ALL', 'PENDING_REVIEW', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED'].map((tab) => {
          const count = reviews.filter(r => tab === 'ALL' || r.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-[#7C3AED] text-white shadow-xs'
                  : 'bg-white text-[#77718A] hover:bg-[#F8F6FF] border border-[#E8E3F2]'
              }`}
            >
              {tab.replace('_', ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Reviews Table */}
      {filteredReviews.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No review requests found"
          description="Submit content from the AI Analysis studio to initiate human verification."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-[#E8E3F2] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E3F2] bg-[#F8F6FF]/60 text-[#77718A] font-semibold uppercase text-[10px]">
                  <th className="py-4 px-6">Content Asset</th>
                  <th className="py-4 px-6">Submitter</th>
                  <th className="py-4 px-6">Assigned Reviewer</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Submitted</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3F2]">
                {filteredReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-[#F8F6FF]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-[#2E2459] text-sm">{rev.content_title}</div>
                      <div className="text-[10px] text-[#77718A] uppercase">{rev.content_file_type}</div>
                    </td>
                    <td className="py-4 px-6 text-[#2E2459] font-medium">
                      {rev.requester_name}
                    </td>
                    <td className="py-4 px-6 text-[#77718A]">
                      {rev.reviewer_name || <span className="italic">Unassigned</span>}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={rev.status} />
                    </td>
                    <td className="py-4 px-6 text-[#77718A]">
                      {new Date(rev.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedReview(rev)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white font-bold text-xs transition-colors"
                      >
                        Inspect & Decide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal Dialog */}
      <Modal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title={`Review Request #${selectedReview?.id} – ${selectedReview?.content_title}`}
        maxWidth="max-w-3xl"
      >
        {selectedReview && (
          <div className="space-y-6">
            {/* Status & Submitter Info */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE]">
              <div>
                <span className="text-[10px] font-bold text-[#77718A] uppercase">Submitter</span>
                <div className="text-xs font-bold text-[#2E2459]">{selectedReview.requester_name}</div>
                <div className="text-[10px] text-[#77718A]">
                  Submitted {new Date(selectedReview.submitted_at).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={selectedReview.status} />
            </div>

            {/* Submitter Notes */}
            {selectedReview.reviewer_notes && (
              <div>
                <label className="block text-[10px] font-bold text-[#77718A] uppercase mb-1">
                  Submission Notes & Context
                </label>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-[#2E2459]">
                  "{selectedReview.reviewer_notes}"
                </div>
              </div>
            )}

            {/* Quick Actions to view studio */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(`/suggestions/${selectedReview.content_id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#7C3AED] text-xs font-bold hover:bg-[#DDD6FE]"
              >
                <Wand2 className="w-3.5 h-3.5" /> Open Smart Correction Studio
              </button>
            </div>

            {/* Decision Notes & Reviewer Buttons (if user is reviewer or admin) */}
            {isReviewer && selectedReview.status === 'PENDING_REVIEW' && (
              <div className="p-5 rounded-2xl bg-white border border-[#E8E3F2] shadow-xs space-y-4">
                <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider">
                  Reviewer Decision & Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide explicit feedback for the creator before approving or requesting changes..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-3 text-xs text-[#2E2459] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleReject(selectedReview.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleRequestChanges(selectedReview.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-bold transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" /> Request Changes
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleApprove(selectedReview.id)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve for Publish
                  </button>
                </div>
              </div>
            )}

            {/* Comments Thread */}
            <div className="space-y-3 pt-4 border-t border-[#E8E3F2]">
              <h4 className="text-xs font-bold text-[#2E2459] uppercase tracking-wider">
                Review Discussion & Feedback ({selectedReview.comments?.length || 0})
              </h4>

              <div className="space-y-2.5 max-h-48 overflow-y-auto">
                {selectedReview.comments?.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[#F8F6FF] border border-[#EDE9FE] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#2E2459]">{c.user_name} ({c.user_role})</span>
                      <span className="text-[10px] text-[#77718A]">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#2E2459] leading-relaxed">{c.comment_text}</p>
                  </div>
                ))}
              </div>

              {/* Add comment */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment or compliance question..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 bg-[#F8F6FF] text-xs text-[#2E2459] border border-[#EDE9FE] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
