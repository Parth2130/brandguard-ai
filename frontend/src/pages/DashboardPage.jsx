import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Percent,
  UploadCloud,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { dashboardAPI } from '../services/api';
import { StatCard } from '../components/StatCard';
import { StatusBadge, SeverityBadge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, organization } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await dashboardAPI.getStats();
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#3B82F6', '#6366F1', '#10B981'];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-white rounded-2xl w-64 border border-[#E8E3F2]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-[#E8E3F2]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-[#E8E3F2] lg:col-span-2" />
          <div className="h-80 bg-white rounded-2xl border border-[#E8E3F2]" />
        </div>
      </div>
    );
  }

  const {
    total_analyzed = 0,
    approved_content = 0,
    pending_reviews = 0,
    detected_violations = 0,
    critical_issues = 0,
    brand_compliance_score = 100,
    issue_distribution = [],
    monthly_trend = [],
    recent_reviews = [],
    recent_activity = [],
    recent_contents = []
  } = stats || {};

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
            Governance Dashboard
          </h1>
          <p className="text-xs text-[#77718A] mt-1">
            Pre-publish brand integrity health for <span className="font-semibold text-[#7C3AED]">{organization?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-xs shadow-md shadow-[#7C3AED]/20 transition-all hover:scale-[1.02]"
          >
            <UploadCloud className="w-4 h-4" />
            Upload New Content
          </button>
        </div>
      </div>

      {/* 6 Core Computed Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Analyzed"
          value={total_analyzed}
          subtitle="All processed assets"
          icon={FileCheck2}
          color="purple"
        />
        <StatCard
          title="Approved Content"
          value={approved_content}
          subtitle="Passed governance"
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Pending Reviews"
          value={pending_reviews}
          subtitle="Awaiting sign-off"
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Detected Violations"
          value={detected_violations}
          subtitle="Total flagged issues"
          icon={AlertTriangle}
          color="blue"
        />
        <StatCard
          title="Critical Issues"
          value={critical_issues}
          subtitle="High risk blockers"
          icon={AlertOctagon}
          color="red"
        />
        <StatCard
          title="Compliance Score"
          value={`${brand_compliance_score}%`}
          subtitle="Organization average"
          icon={Percent}
          color={brand_compliance_score >= 80 ? 'green' : brand_compliance_score >= 60 ? 'orange' : 'red'}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-[#2E2459]">Monthly Analysis Volume</h3>
              <p className="text-xs text-[#77718A]">Content analyzed over the last 6 months</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#7C3AED] bg-[#EDE9FE] px-3 py-1 rounded-full">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real DB Metrics</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1EDFA" vertical={false} />
                <XAxis dataKey="month" stroke="#77718A" fontSize={11} tickLine={false} />
                <YAxis stroke="#77718A" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E3F2', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="analyzed" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#purpleGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Distribution by Category */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#2E2459]">Violations by Category</h3>
              <p className="text-xs text-[#77718A]">Distribution across brand rule domains</p>
            </div>
            <Layers className="w-4 h-4 text-[#77718A]" />
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {detected_violations > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issue_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1EDFA" vertical={false} />
                  <XAxis dataKey="category" stroke="#77718A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#77718A" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E3F2', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-[#77718A] text-center">
                No violations detected in current database.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tables & Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reviews (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#2E2459]">Recent Review Submissions</h3>
              <p className="text-xs text-[#77718A]">Content pending or recently cleared by brand reviewers</p>
            </div>
            <button
              onClick={() => navigate('/reviews')}
              className="text-xs font-semibold text-[#7C3AED] hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recent_reviews.length === 0 ? (
            <EmptyState
              title="No pending reviews"
              description="Upload and submit content to begin human brand verification."
              actionLabel="Upload Content"
              onAction={() => navigate('/upload')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E3F2] text-[#77718A] font-semibold uppercase text-[10px]">
                    <th className="pb-3">Content Asset</th>
                    <th className="pb-3">Submitter</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3F2]">
                  {recent_reviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-[#F8F6FF]/60 transition-colors">
                      <td className="py-3 font-semibold text-[#2E2459]">
                        <div className="truncate max-w-xs">{rev.content_title || 'Untitled Content'}</div>
                        <div className="text-[10px] text-[#77718A] uppercase">{rev.content_file_type}</div>
                      </td>
                      <td className="py-3 text-[#77718A]">{rev.requester_name}</td>
                      <td className="py-3">
                        <StatusBadge status={rev.status} />
                      </td>
                      <td className="py-3 text-[#77718A]">
                        {rev.submitted_at ? new Date(rev.submitted_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => navigate('/reviews')}
                          className="px-2.5 py-1 rounded-lg bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white transition-colors font-semibold text-[11px]"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Activity Feed (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#2E2459]">Audit Activity Feed</h3>
              <p className="text-xs text-[#77718A]">Real-time system events</p>
            </div>
            <Activity className="w-4 h-4 text-[#7C3AED]" />
          </div>

          <div className="space-y-3.5">
            {recent_activity.length === 0 ? (
              <p className="text-xs text-[#77718A] py-8 text-center">No recent activity recorded.</p>
            ) : (
              recent_activity.slice(0, 5).map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#7C3AED] mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-[#2E2459]">{act.details?.message || act.action}</div>
                    <div className="text-[10px] text-[#77718A] flex items-center justify-between mt-0.5">
                      <span>{act.user_name}</span>
                      <span>{act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
