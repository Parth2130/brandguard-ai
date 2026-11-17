import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  ArrowLeft,
  Filter,
  Sparkles,
  Layers,
  Wand2,
  Send,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileText,
  Palette,
  Download,
  Eye,
  RefreshCw,
  Sliders,
  Check,
  HelpCircle,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { analysisAPI, reviewsAPI, visualAuditAPI, claimsAPI } from '../services/api';
import { SeverityBadge, CategoryBadge, StatusBadge } from '../components/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';

export const AnalysisResultsPage = () => {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [visualAudit, setVisualAudit] = useState(null);
  const [classifiedClaims, setClassifiedClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedIssueIds, setExpandedIssueIds] = useState(new Set());

  // Visual Recolor Studio state
  const [recoloring, setRecoloring] = useState(false);
  const [targetHex, setTargetHex] = useState('');
  const [replacementHex, setReplacementHex] = useState('#7C3AED');
  const [tolerance, setTolerance] = useState(45);

  // Claim override state
  const [overrideClaimId, setOverrideClaimId] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  const { showToast } = useToast();
  const { user, isAdmin, isReviewer } = useAuth();
  const navigate = useNavigate();

  const fetchAnalysis = async () => {
    try {
      const res = await analysisAPI.get(id);
      const ana = res.data.analysis;
      setAnalysis(ana);

      if (ana.issues?.length > 0) {
        setExpandedIssueIds(new Set([ana.issues[0].id]));
      }

      if (ana.visual_audit) {
        setVisualAudit(ana.visual_audit);
        if (ana.visual_audit.unapproved_colors?.length > 0) {
          setTargetHex(ana.visual_audit.unapproved_colors[0].detected_hex);
          if (ana.visual_audit.unapproved_colors[0].closest_approved_hex) {
            setReplacementHex(ana.visual_audit.unapproved_colors[0].closest_approved_hex);
          }
        }
      } else if (ana.content_id) {
        // Fallback fetch visual audit
        try {
          const vRes = await visualAuditAPI.get(ana.content_id);
          if (vRes.data?.visual_audit) {
            setVisualAudit(vRes.data.visual_audit);
            if (vRes.data.visual_audit.unapproved_colors?.length > 0) {
              setTargetHex(vRes.data.visual_audit.unapproved_colors[0].detected_hex);
              if (vRes.data.visual_audit.unapproved_colors[0].closest_approved_hex) {
                setReplacementHex(vRes.data.visual_audit.unapproved_colors[0].closest_approved_hex);
              }
            }
          }
        } catch (e) {
          // not an image or no visual audit
        }
      }

      if (ana.classified_claims && ana.classified_claims.length > 0) {
        setClassifiedClaims(ana.classified_claims);
      } else if (ana.content_id) {
        try {
          const cRes = await claimsAPI.getContentClaims(ana.content_id);
          if (cRes.data?.claims) setClassifiedClaims(cRes.data.claims);
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      showToast('Failed to load analysis report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const toggleExpand = (issueId) => {
    setExpandedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  const handleRouteToReview = async () => {
    if (!analysis) return;
    try {
      await reviewsAPI.submit({
        content_id: analysis.content_id,
        notes: `Automated analysis completed with score ${analysis.compliance_score}/100. Routed for brand review.`
      });
      showToast('Asset routed to human Brand Reviewer!', 'success');
      navigate('/reviews');
    } catch (err) {
      showToast('Could not route to reviewer.', 'error');
    }
  };

  const handleRecolor = async () => {
    if (!targetHex || !replacementHex) {
      showToast('Please specify both detected and replacement HEX colors.', 'error');
      return;
    }
    setRecoloring(true);
    try {
      const res = await visualAuditAPI.recolor(analysis.content_id, {
        target_hex: targetHex,
        replacement_hex: replacementHex,
        tolerance: parseInt(tolerance, 10)
      });
      showToast('Smart visual correction applied!', 'success');
      setVisualAudit(res.data.visual_audit);
    } catch (err) {
      showToast(err.response?.data?.error || 'Recoloring failed.', 'error');
    } finally {
      setRecoloring(false);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      showToast('A recorded justification is required to override false claim blocking.', 'error');
      return;
    }
    try {
      await claimsAPI.override(overrideClaimId, { reason: overrideReason });
      showToast('Contradicted claim override recorded with audit trail.', 'success');
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      fetchAnalysis();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to override claim.', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading compliance results...</div>;
  }

  if (!analysis) {
    return <div className="text-center py-20 text-[#DC2626]">Analysis report not found.</div>;
  }

  const { compliance_score = 100, overall_status, summary, issues = [] } = analysis;

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  const hasContradictedClaims = classifiedClaims.some(c => c.classification === 'CONTRADICTED' && !c.is_overridden);

  const filteredIssues = issues.filter(i => {
    const matchesSev = severityFilter === 'all' || i.severity === severityFilter;
    const matchesCat = categoryFilter === 'all' || i.category === categoryFilter;
    return matchesSev && matchesCat;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Bar with Back and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analysis')}
            className="p-2 rounded-xl border border-[#E8E3F2] bg-white text-[#77718A] hover:text-[#2E2459] hover:bg-[#F8F6FF]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
                Brand Audit Results
              </h1>
              <StatusBadge status={overall_status} />
            </div>
            <p className="text-xs text-[#77718A] mt-0.5">
              Automated Pre-Publish Verification Report • Audit #{analysis.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/suggestions/${analysis.content_id}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white font-bold text-xs transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            Smart Correction Studio
          </button>
          <button
            onClick={handleRouteToReview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs shadow-md shadow-[#7C3AED]/20 transition-all"
          >
            <Send className="w-4 h-4" />
            Submit for Human Review
          </button>
        </div>
      </div>

      {/* Hero Compliance Score Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E3F2] shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Score Dial */}
        <div className="flex items-center gap-5 md:col-span-1 border-b md:border-b-0 md:border-r border-[#E8E3F2] pb-6 md:pb-0 md:pr-6">
          <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 ${
            compliance_score >= 80 ? 'border-[#16A34A] bg-[#DCFCE7]/30 text-[#15803D]' :
            compliance_score >= 60 ? 'border-[#F59E0B] bg-[#FEF3C7]/30 text-[#B45309]' :
            'border-[#DC2626] bg-[#FEE2E2]/30 text-[#B91C1C]'
          }`}>
            <span className="text-3xl font-black">{compliance_score}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider">Score</span>
          </div>
          <div>
            <div className="text-xs font-bold text-[#77718A] uppercase">Overall Health</div>
            <div className="text-base font-extrabold text-[#2E2459] capitalize">
              {overall_status?.replace('_', ' ')}
            </div>
            <div className="text-[11px] text-[#77718A] mt-0.5">
              {issues.length} detected violation{issues.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Severity Count Pills */}
        <div className="md:col-span-3 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-[#FEE2E2]/50 border border-[#FECACA] text-center">
              <span className="text-lg font-black text-[#DC2626]">{criticalCount}</span>
              <div className="text-[10px] font-bold uppercase text-[#991B1B]">Critical</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#FFEDD5]/50 border border-[#FED7AA] text-center">
              <span className="text-lg font-black text-[#EA580C]">{highCount}</span>
              <div className="text-[10px] font-bold uppercase text-[#9A3412]">High</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#FEF9C3]/50 border border-[#FEF08A] text-center">
              <span className="text-lg font-black text-[#CA8A04]">{mediumCount}</span>
              <div className="text-[10px] font-bold uppercase text-[#854D0E]">Medium</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#EFF6FF]/50 border border-[#DBEAFE] text-center">
              <span className="text-lg font-black text-[#2563EB]">{lowCount}</span>
              <div className="text-[10px] font-bold uppercase text-[#1E40AF]">Low</div>
            </div>
          </div>

          <p className="text-xs text-[#2E2459] font-medium bg-[#F8F6FF] p-3 rounded-xl border border-[#EDE9FE] leading-relaxed">
            {summary}
          </p>
        </div>
      </div>

      {/* FALSE CLAIM BLOCKING ALERT BANNER */}
      {hasContradictedClaims && (
        <div className="p-5 rounded-3xl bg-[#FEF2F2] border-2 border-[#F87171] flex items-start gap-4 shadow-sm">
          <div className="p-2.5 rounded-2xl bg-[#DC2626] text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#991B1B]">
                PUBLICATION CLEARANCE BLOCKED: Contradicted False Claim Detected
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#DC2626] text-white">
                High Severity Lock
              </span>
            </div>
            <p className="text-xs text-[#B91C1C] mt-1 leading-relaxed">
              This content contains promotional assertions that directly conflict with official benchmarks registered in the Product Knowledge Base. Automatic publication clearance is blocked until the creator applies approved corrections or an authorized Brand Reviewer overrides with a logged justification.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PART 2: AUTOMATED ANTI-HALLUCINATION & FALSE CLAIM BLOCKER SECTION         */}
      {/* ========================================================================= */}
      {classifiedClaims.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E8E3F2] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="text-base font-bold text-[#2E2459]">
                  Product & Claim Verification Engine
                </h3>
              </div>
              <p className="text-xs text-[#77718A] mt-0.5">
                Claims cross-referenced against official specs, benchmarks, and SLA promises in the Knowledge Base.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
              {classifiedClaims.length} Checked Claim{classifiedClaims.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {classifiedClaims.map((claim, idx) => {
              const isContradicted = claim.classification === 'CONTRADICTED';
              const isVerified = claim.classification === 'VERIFIED';
              const isUnsupported = claim.classification === 'UNSUPPORTED';
              const isOverridden = claim.is_overridden;

              return (
                <div
                  key={claim.id || idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isContradicted
                      ? isOverridden
                        ? 'bg-[#FFFBEB] border-[#FDE68A]'
                        : 'bg-[#FEF2F2] border-[#FECACA]'
                      : isVerified
                      ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                      : 'bg-[#F8F6FF] border-[#EDE9FE]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isContradicted
                          ? isOverridden
                            ? 'bg-[#F59E0B] text-white'
                            : 'bg-[#DC2626] text-white'
                          : isVerified
                          ? 'bg-[#16A34A] text-white'
                          : isUnsupported
                          ? 'bg-[#D97706] text-white'
                          : 'bg-[#6B7280] text-white'
                      }`}>
                        {isOverridden ? 'CONTRADICTED (OVERRIDDEN)' : claim.classification}
                      </span>
                      {claim.product_name && (
                        <span className="text-xs font-bold text-[#2E2459]">
                          Target: {claim.product_name}
                        </span>
                      )}
                    </div>

                    {(isAdmin || isReviewer) && isContradicted && !isOverridden && (
                      <button
                        onClick={() => {
                          setOverrideClaimId(claim.id);
                          setIsOverrideModalOpen(true);
                        }}
                        className="px-3 py-1 bg-white border border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626] hover:text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Override with Justification
                      </button>
                    )}
                  </div>

                  {/* Claim Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#77718A] mb-1">
                        Promotional Statement in Content
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-black/5 font-mono text-[#2E2459]">
                        "{claim.claim_text}"
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#77718A] mb-1">
                        Verified Benchmark / Knowledge Base Record
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-black/5 font-semibold text-[#2E2459]">
                        {claim.verified_benchmark || 'No corresponding verified specification found in KB.'}
                      </div>
                    </div>
                  </div>

                  {/* Explanation & Suggestion */}
                  <div className="mt-3 pt-3 border-t border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <p className="text-[#2E2459] leading-relaxed">
                      <strong>Analysis:</strong> {claim.explanation}
                    </p>
                    {claim.suggested_correction && (
                      <div className="shrink-0 font-semibold text-[#16A34A] bg-white px-3 py-1.5 rounded-xl border border-[#BBF7D0]">
                        Recommended: "{claim.suggested_correction}"
                      </div>
                    )}
                  </div>

                  {/* Source Reference & Override Note */}
                  <div className="mt-2 text-[11px] text-[#77718A] flex flex-wrap items-center justify-between gap-2">
                    <span>Source: {claim.source_reference || 'Internal Product DB'}</span>
                    {isOverridden && (
                      <span className="text-[#B45309] font-medium">
                        Override reason: {claim.override_reason}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PART 1: MULTIMODAL VISUAL & PALETTE EXTRACTION ENGINE                     */}
      {/* ========================================================================= */}
      {visualAudit && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E3F2] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E3F2] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="text-base font-bold text-[#2E2459]">
                  Multimodal Visual & Palette Extraction Engine
                </h3>
              </div>
              <p className="text-xs text-[#77718A] mt-0.5">
                Pillow-extracted dominant colors compared against approved brand palette using CIE L*a*b* ΔE perceptual distance & WCAG 2.1 AA contrast ratio.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#EDE9FE] text-[#7C3AED]">
              Visual Governance Studio
            </span>
          </div>

          {/* Palette Swatches & Unapproved Color Warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Dominant Colors */}
            <div className="p-5 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE] space-y-3">
              <h4 className="text-xs font-bold text-[#2E2459] uppercase tracking-wider">
                Extracted Dominant Palette
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {visualAudit.dominant_colors?.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setTargetHex(c.hex)}
                    className="cursor-pointer group flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-[#E8E3F2] hover:border-[#7C3AED] shadow-2xs transition-all"
                  >
                    <span
                      className="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-inner"
                      style={{ backgroundColor: c.hex }}
                    />
                    <div className="text-left">
                      <div className="text-[11px] font-mono font-bold text-[#2E2459]">{c.hex}</div>
                      <div className="text-[10px] text-[#77718A]">{c.percent}%</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#77718A]">Click any swatch to select it for smart replacement.</p>
            </div>

            {/* 2. Unapproved Colors & Perceptual Distance (Delta-E) */}
            <div className="p-5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#991B1B] uppercase tracking-wider">
                  Unapproved Brand Colors
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#DC2626] text-white">
                  ΔE &gt; 5.0
                </span>
              </div>

              {visualAudit.unapproved_colors?.length === 0 ? (
                <div className="text-xs text-[#166534] bg-[#DCFCE7] p-3 rounded-xl border border-[#BBF7D0]">
                  ✓ All detected tones comply with approved brand color rules.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visualAudit.unapproved_colors?.map((u, i) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-[#FECACA] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-md border border-black/10"
                            style={{ backgroundColor: u.detected_hex }}
                          />
                          <span className="font-mono font-bold text-[#DC2626]">{u.detected_hex}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#991B1B]">
                          Dist: ΔE {u.perceptual_distance}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#77718A]">
                        Closest approved: <strong className="font-mono text-[#7C3AED]">{u.closest_approved_hex}</strong>
                      </div>
                      <div className="text-[11px] text-[#166534]">
                        Recommendation: Replace {u.detected_hex} with {u.closest_approved_hex}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. WCAG Contrast Accessibility Warnings */}
            <div className="p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#92400E] uppercase tracking-wider">
                  WCAG 2.1 AA Contrast Checks
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D97706] text-white">
                  Accessibility
                </span>
              </div>

              {visualAudit.contrast_warnings?.length === 0 ? (
                <div className="text-xs text-[#166534] bg-[#DCFCE7] p-3 rounded-xl border border-[#BBF7D0]">
                  ✓ All color combinations meet WCAG 4.5:1 minimum contrast standards.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visualAudit.contrast_warnings?.map((w, i) => (
                    <div key={i} className="p-3 bg-white rounded-xl border border-[#FDE68A] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded border border-black/10"
                            style={{ backgroundColor: w.foreground }}
                          />
                          <span className="font-mono font-bold">{w.foreground}</span>
                          <span className="text-[#77718A]">vs</span>
                          <span
                            className="w-3.5 h-3.5 rounded border border-black/10"
                            style={{ backgroundColor: w.background }}
                          />
                          <span className="font-mono font-bold">{w.background}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#DC2626]">
                          {w.ratio}:1
                        </span>
                      </div>
                      <p className="text-[11px] text-[#B45309]">{w.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SMART VISUAL RECOLORING STUDIO */}
          <div className="p-6 rounded-3xl bg-[#F8F6FF] border border-[#EDE9FE] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-[#2E2459]">
                  Smart Visual Recoloring & Correction
                </h4>
                <p className="text-xs text-[#77718A] mt-0.5">
                  Replaces an unapproved color across image pixels using vectorized RGB Euclidean tolerance, preserving the original file.
                </p>
              </div>
            </div>

            {/* Recolor Controls Form */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#77718A] mb-1">
                  Target Color to Replace
                </label>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E8E3F2]">
                  <input
                    type="color"
                    value={targetHex || '#FF0000'}
                    onChange={(e) => setTargetHex(e.target.value.toUpperCase())}
                    className="w-6 h-6 rounded border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={targetHex}
                    onChange={(e) => setTargetHex(e.target.value)}
                    placeholder="#FF0000"
                    className="font-mono text-xs font-bold text-[#2E2459] w-full bg-transparent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#77718A] mb-1">
                  Approved Replacement Color
                </label>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#E8E3F2]">
                  <input
                    type="color"
                    value={replacementHex || '#7C3AED'}
                    onChange={(e) => setReplacementHex(e.target.value.toUpperCase())}
                    className="w-6 h-6 rounded border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={replacementHex}
                    onChange={(e) => setReplacementHex(e.target.value)}
                    placeholder="#7C3AED"
                    className="font-mono text-xs font-bold text-[#2E2459] w-full bg-transparent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#77718A] mb-1">
                  Color Tolerance (0-100): {tolerance}
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                  className="w-full accent-[#7C3AED]"
                />
              </div>

              <div>
                <button
                  onClick={handleRecolor}
                  disabled={recoloring}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-gray-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${recoloring ? 'animate-spin' : ''}`} />
                  {recoloring ? 'Recoloring Image...' : 'Apply Smart Recoloring'}
                </button>
              </div>
            </div>

            {/* Before and After Image Previews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#EDE9FE]">
              <div className="space-y-2 text-center">
                <span className="text-xs font-bold text-[#77718A] uppercase">
                  Original Asset (Preserved)
                </span>
                <div className="h-64 rounded-2xl border border-[#E8E3F2] bg-white flex items-center justify-center p-3 overflow-hidden shadow-inner">
                  {visualAudit.image_url ? (
                    <img
                      src={visualAudit.image_url}
                      alt="Original Content"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  ) : (
                    <span className="text-xs text-[#77718A]">No image file preview available</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-center">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[#166534] uppercase">
                    Corrected Asset (Approved Palette)
                  </span>
                  {visualAudit.corrected_image_url && (
                    <a
                      href={visualAudit.corrected_image_url}
                      download={`brandguard_corrected_${analysis.content_id}.png`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#7C3AED] hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Corrected Copy
                    </a>
                  )}
                </div>
                <div className="h-64 rounded-2xl border border-[#BBF7D0] bg-white flex items-center justify-center p-3 overflow-hidden shadow-inner">
                  {visualAudit.corrected_image_url ? (
                    <img
                      src={visualAudit.corrected_image_url}
                      alt="Corrected Content"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-xs text-[#77718A] p-6">
                      Click "Apply Smart Recoloring" above to generate an audited and corrected version with approved brand colors.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs for Violations */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#E8E3F2]">
        {/* Severity Filter Pills */}
        <div className="flex items-center gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                severityFilter === sev
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-white text-[#77718A] hover:bg-[#F8F6FF] border border-[#E8E3F2]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-[#77718A]" />
          {['all', 'claim', 'color', 'visual', 'tone', 'terminology', 'accessibility'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#EDE9FE] text-[#7C3AED] font-bold'
                  : 'text-[#77718A] hover:text-[#2E2459]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#E8E3F2]">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-[#2E2459]">No issues match the selected filter.</h4>
            <p className="text-xs text-[#77718A] mt-1">Try switching severity or category filters.</p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isExpanded = expandedIssueIds.has(issue.id);
            return (
              <div
                key={issue.id}
                className="bg-white rounded-3xl border border-[#E8E3F2] shadow-sm overflow-hidden transition-all"
              >
                {/* Issue Header */}
                <div
                  onClick={() => toggleExpand(issue.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#F8F6FF]/60 select-none"
                >
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={issue.severity} />
                    <CategoryBadge category={issue.category} />
                    <h3 className="text-sm font-bold text-[#2E2459]">{issue.title}</h3>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-[#77718A] hidden sm:inline">
                      Confidence: {Math.round((issue.confidence || 0.9) * 100)}%
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#77718A]" /> : <ChevronDown className="w-4 h-4 text-[#77718A]" />}
                  </div>
                </div>

                {/* Expanded Inspection Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-[#E8E3F2] bg-[#F8F6FF]/30 space-y-4 text-xs">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#77718A] mb-1">
                        Explanation & Brand Rule Impact
                      </div>
                      <p className="text-xs text-[#2E2459] leading-relaxed">
                        {issue.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Detected Evidence */}
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E8E3F2]">
                        <div className="text-[10px] font-bold uppercase text-[#DC2626] mb-1">
                          Detected Evidence
                        </div>
                        <div className="font-mono text-xs text-[#2E2459] break-words">
                          {issue.evidence}
                        </div>
                      </div>

                      {/* Official Guideline Citation */}
                      <div className="p-3.5 rounded-2xl bg-white border border-[#E8E3F2]">
                        <div className="text-[10px] font-bold uppercase text-[#7C3AED] mb-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Guideline Reference
                        </div>
                        <div className="text-xs font-semibold text-[#2E2459]">
                          {issue.guideline_reference || 'Corporate Brand Guidelines'}
                        </div>
                      </div>
                    </div>

                    {/* Suggested Correction */}
                    <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-[#166534] mb-0.5">
                          Suggested Smart Correction
                        </div>
                        <div className="text-xs font-semibold text-[#15803D]">
                          "{issue.suggestion}"
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/suggestions/${analysis.content_id}`)}
                        className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-xs transition-colors whitespace-nowrap"
                      >
                        Apply in Correction Studio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* OVERRIDE JUSTIFICATION MODAL */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title="Reviewer Override: False Claim Blocker"
      >
        <form onSubmit={handleOverrideSubmit} className="space-y-4">
          <p className="text-xs text-[#77718A]">
            Overriding a contradicted claim allows the asset to proceed in the governance workflow despite conflicting with the Product Knowledge Base. Your user ID, timestamp, and justification will be cryptographically logged in the tamper-evident audit trail.
          </p>

          <div>
            <label className="block text-xs font-bold text-[#77718A] uppercase mb-1">
              Justification Reason
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Authorized special exemption approved by VP of Product for beta campaign."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full bg-[#F8F6FF] border border-[#EDE9FE] rounded-xl p-2.5 text-xs text-[#2E2459]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#77718A] hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl"
            >
              Confirm Override
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
