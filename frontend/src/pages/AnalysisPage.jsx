import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  FileText,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';
import { contentAPI, analysisAPI } from '../services/api';
import { StatusBadge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../context/ToastContext';

export const AnalysisPage = () => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadContents = async () => {
    try {
      const res = await contentAPI.list();
      setContents(res.data.contents);
    } catch (err) {
      showToast('Failed to load content list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContents();
  }, []);

  const handleRunAnalysis = async (contentId) => {
    setAnalyzingId(contentId);
    try {
      const res = await analysisAPI.run(contentId);
      showToast('AI analysis completed!', 'success');
      navigate(`/analysis/results/${res.data.analysis.id}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Analysis failed.', 'error');
    } finally {
      setAnalyzingId(null);
      loadContents();
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Loading analysis studio...</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
            AI Brand Governance Studio
          </h1>
          <p className="text-xs text-[#77718A] mt-1">
            Execute real-time multi-dimensional compliance audits across all uploaded campaign collateral.
          </p>
        </div>

        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          Upload & Audit
        </button>
      </div>

      {contents.length === 0 ? (
        <EmptyState
          title="No uploaded content"
          description="Upload collateral to execute the AI brand compliance analysis."
          actionLabel="Upload Content"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((item) => {
            const hasAnalysis = !!item.latest_analysis;
            const score = item.latest_analysis?.compliance_score ?? null;
            const isAnalyzing = analyzingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#77718A] px-2 py-0.5 rounded bg-[#F8F6FF] border border-[#EDE9FE]">
                      {item.file_type.toUpperCase()}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>

                  <h3 className="text-base font-bold text-[#2E2459] mb-1 truncate" title={item.title}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#77718A] truncate mb-4">
                    {item.original_name}
                  </p>

                  {/* Compliance Score Gauge */}
                  {hasAnalysis ? (
                    <div className="p-3.5 rounded-2xl bg-[#F8F6FF] border border-[#EDE9FE] mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-[#77718A] uppercase">Compliance Score</div>
                        <div className={`text-xl font-black ${
                          score >= 80 ? 'text-[#16A34A]' : score >= 60 ? 'text-[#F59E0B]' : 'text-[#DC2626]'
                        }`}>
                          {score}/100
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-[#77718A] uppercase">Detected Issues</div>
                        <div className="text-sm font-bold text-[#2E2459]">
                          {item.latest_analysis.issues?.length || 0}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] mb-4 text-xs text-[#92400E] flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      Not yet analyzed against Brand Knowledge Base
                    </div>
                  )}

                  {/* Text snippet preview */}
                  {item.extracted_text && (
                    <div className="text-xs text-[#77718A] bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-20 overflow-hidden text-ellipsis line-clamp-3 mb-4 font-mono">
                      "{item.extracted_text}"
                    </div>
                  )}
                </div>

                {/* Card CTA Actions */}
                <div className="pt-4 border-t border-[#E8E3F2] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleRunAnalysis(item.id)}
                    disabled={isAnalyzing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Auditing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>{hasAnalysis ? 'Re-Run Audit' : 'Run AI Audit'}</span>
                      </>
                    )}
                  </button>

                  {hasAnalysis && (
                    <button
                      onClick={() => navigate(`/analysis/results/${item.latest_analysis.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#2E2459] hover:text-[#7C3AED] hover:underline"
                    >
                      <span>View Results</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
