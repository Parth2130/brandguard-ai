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
  FileText
} from 'lucide-react';
import { analysisAPI, reviewsAPI } from '../services/api';
import { SeverityBadge, CategoryBadge, StatusBadge } from '../components/Badge';
import { useToast } from '../context/ToastContext';

export const AnalysisResultsPage = () => {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedIssueIds, setExpandedIssueIds] = useState(new Set());

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await analysisAPI.get(id);
        setAnalysis(res.data.analysis);
        // Expand first issue by default if exists
        if (res.data.analysis.issues?.length > 0) {
          setExpandedIssueIds(new Set([res.data.analysis.issues[0].id]));
        }
      } catch (err) {
        showToast('Failed to load analysis report.', 'error');
      } finally {
        setLoading(false);
      }
    };
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

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading compliance results...</div>;
  }

  if (!analysis) {
    return <div className="text-center py-20 text-[#DC2626]">Analysis report not found.</div>;
  }

  const { compliance_score = 100, overall_status, summary, issues = [], recommendations = [] } = analysis;

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

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

      {/* Filter Tabs */}
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
                {/* Issue Header Header */}
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
    </div>
  );
};
