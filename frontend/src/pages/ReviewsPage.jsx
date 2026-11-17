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
  ShieldCheck,
  CornerDownRight,
  Reply,
  ShieldAlert,
  ArrowRight,
  Filter
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
  const [reviewComments, setReviewComments] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionNotes, setActionNotes] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { id, author }
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewersList, setReviewersList] = useState([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');

  const { isReviewer, isAdmin, user } = useAuth();
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

  const loadReviewers = async () => {
    try {
      const res = await reviewsAPI.getReviewers();
      setReviewersList(res.data.reviewers || []);
    } catch (e) {
      // ignore
    }
  };

  const loadComments = async (reviewId) => {
    try {
      const res = await reviewsAPI.getComments(reviewId);
      setReviewComments(res.data.comments || []);
    } catch (e) {
      // fallback to review.comments
      if (selectedReview?.comments) setReviewComments(selectedReview.comments);
    }
  };

  useEffect(() => {
    loadReviews();
    loadReviewers();
  }, []);

  const openReviewDetail = async (rev) => {
    setSelectedReview(rev);
    setActionNotes('');
    setCommentInput('');
    setReplyingTo(null);
    await loadComments(rev.id);
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await reviewsAPI.approve(id, { notes: actionNotes || 'Approved. Complies with brand identity.' });
      showToast('Content approved for publication clearance!', 'success');
      setSelectedReview(null);
      setActionNotes('');
      loadReviews();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Approval failed.';
      showToast(errorMsg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!actionNotes.trim()) {
      showToast('Please specify a rejection reason for the submitter.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await reviewsAPI.reject(id, { notes: actionNotes });
      showToast('Content review marked as REJECTED.', 'info');
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
    if (!actionNotes.trim()) {
      showToast('Please describe the required changes for the creator.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await reviewsAPI.requestChanges(id, { notes: actionNotes });
      showToast('Changes requested from creator.', 'info');
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
      await reviewsAPI.addComment(selectedReview.id, {
        comment: commentInput,
        parent_comment_id: replyingTo ? replyingTo.id : null
      });
      showToast(replyingTo ? 'Reply posted.' : 'Comment posted.', 'success');
      setCommentInput('');
      setReplyingTo(null);
      await loadComments(selectedReview.id);
      loadReviews();
    } catch (err) {
      showToast('Could not post comment.', 'error');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'CHANGES_REQUESTED') {
      return r.status === 'CHANGES_REQUESTED' || r.status === 'REVISION_REQUESTED';
    }
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
            Review & Governance Workflow
          </h1>
          <p className="text-xs text-[#77718A] mt-1">
            Tri-State approval lifecycle (Approve, Reject, Request Changes) with threaded reviewer comments and tamper-evident audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isReviewer && !isAdmin && (
            <span className="text-[11px] text-[#77718A] bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
              Creator Mode: Submit drafts, reply to reviewer feedback, and resubmit revisions.
            </span>
          )}
          {(isReviewer || isAdmin) && (
            <span className="text-[11px] text-[#15803D] bg-green-50 border border-green-200 px-3 py-1 rounded-xl font-semibold">
              Authorized Reviewer Mode: Decision authority enabled.
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8E3F2] pb-2">
        {['ALL', 'PENDING_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'].map((tab) => {
          const count = reviews.filter(r => {
            if (tab === 'ALL') return true;
            if (tab === 'CHANGES_REQUESTED') return r.status === 'CHANGES_REQUESTED' || r.status === 'REVISION_REQUESTED';
            return r.status === tab;
          }).length;
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
                  <th className="py-4 px-6">Governance Status</th>
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
                      {rev.reviewer_name || <span className="italic">Unassigned / Any Reviewer</span>}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={rev.status} />
                    </td>
                    <td className="py-4 px-6 text-[#77718A]">
                      {new Date(rev.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => openReviewDetail(rev)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white font-bold text-xs transition-colors"
                      >
                        Inspect & Collaborate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal Dialog with Threaded Comments */}
      <Modal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title={`Review Request #${selectedReview?.id} – ${selectedReview?.content_title}`}
        maxWidth="max-w-4xl"
      >
        {selectedReview && (
          <div className="space-y-6">
            {/* Status & Submitter Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE] gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#77718A] uppercase">Submitter</span>
                <div className="text-xs font-bold text-[#2E2459]">{selectedReview.requester_name}</div>
                <div className="text-[10px] text-[#77718A]">
                  Submitted {new Date(selectedReview.submitted_at).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedReview.reviewer_name && (
                  <div className="text-right text-xs">
                    <span className="text-[10px] font-bold text-[#77718A] uppercase block">Assigned Reviewer</span>
                    <span className="font-semibold text-[#2E2459]">{selectedReview.reviewer_name}</span>
                  </div>
                )}
                <StatusBadge status={selectedReview.status} />
              </div>
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

            {/* Quick Actions for Creator & Reviewer */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#EDE9FE]/40 border border-[#DDD6FE]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/suggestions/${selectedReview.content_id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white text-xs font-bold hover:bg-[#6D28D9] transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Open Smart Correction Studio
                </button>
              </div>

              {/* If Changes were requested, creator can resubmit */}
              {(selectedReview.status === 'CHANGES_REQUESTED' || selectedReview.status === 'REVISION_REQUESTED') && (
                <button
                  type="button"
                  onClick={() => navigate(`/suggestions/${selectedReview.content_id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D]"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Revise & Resubmit Content
                </button>
              )}
            </div>

            {/* Decision Notes & Reviewer Buttons (Authorized Reviewers) */}
            {(isReviewer || isAdmin) && (
              <div className="p-5 rounded-2xl bg-white border border-[#E8E3F2] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#2E2459] uppercase tracking-wider">
                    Formal Tri-State Decision & Recorded Feedback
                  </label>
                  <span className="text-[10px] font-bold text-[#7C3AED] uppercase">
                    Tamper-Evident SHA-256 Chained
                  </span>
                </div>

                <textarea
                  rows={3}
                  placeholder="Provide explicit feedback for the creator before deciding: APPROVE, REJECT, or REQUEST CHANGES..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-3 text-xs text-[#2E2459] focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
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

            {/* THREADED COMMENTS SECTION */}
            <div className="space-y-4 pt-4 border-t border-[#E8E3F2]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#2E2459] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#7C3AED]" />
                  Threaded Creator-Reviewer Discussion
                </h4>
                <span className="text-[11px] text-[#77718A]">
                  Persistent DB Records • Available across sessions
                </span>
              </div>

              {/* Comment Threads */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {reviewComments.length === 0 ? (
                  <div className="p-4 text-center bg-[#F8F6FF] rounded-2xl text-xs text-[#77718A]">
                    No comments in this thread yet. Use the box below to ask questions or give feedback.
                  </div>
                ) : (
                  reviewComments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      {/* Top level comment */}
                      <div className="p-3.5 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE] text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#2E2459]">{comment.user_name}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EDE9FE] text-[#7C3AED]">
                              {comment.user_role || 'User'}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#77718A]">
                            {new Date(comment.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-[#2E2459] leading-relaxed whitespace-pre-wrap">{comment.comment_text}</p>

                        <div className="mt-2 pt-2 border-t border-[#E8E3F2] flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo({ id: comment.id, author: comment.user_name });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7C3AED] hover:underline"
                          >
                            <Reply className="w-3 h-3" /> Reply
                          </button>
                        </div>
                      </div>

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="pl-6 space-y-2 border-l-2 border-[#DDD6FE]">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="p-3 rounded-xl bg-white border border-[#EDE9FE] text-xs shadow-2xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <CornerDownRight className="w-3 h-3 text-[#7C3AED]" />
                                  <span className="font-bold text-[#2E2459]">{reply.user_name}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-[#7C3AED]">
                                    {reply.user_role}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#77718A]">
                                  {new Date(reply.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                              <p className="text-[#2E2459] leading-relaxed pl-4">{reply.comment_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add comment or reply */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-2">
                {replyingTo && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#EDE9FE] text-xs text-[#7C3AED] font-semibold">
                    <span>Replying to <strong>{replyingTo.author}</strong></span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-xs hover:underline"
                    >
                      Cancel reply
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={replyingTo ? `Write reply to ${replyingTo.author}...` : 'Write a comment or question for the reviewer...'}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 bg-[#F8F6FF] text-xs text-[#2E2459] border border-[#EDE9FE] rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-[#7C3AED]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> {replyingTo ? 'Reply' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
