import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Users,
  RefreshCw,
  Calendar
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
  LineChart,
  Line
} from 'recharts';
import { analyticsAPI } from '../services/api';
import { SeverityBadge, CategoryBadge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { useToast } from '../context/ToastContext';

export const AnalyticsPage = () => {
  const [overview, setOverview] = useState(null);
  const [violations, setViolations] = useState(null);
  const [trends, setTrends] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oRes, vRes, tRes] = await Promise.all([
          analyticsAPI.getOverview(),
          analyticsAPI.getViolations(),
          analyticsAPI.getTrends()
        ]);
        setOverview(oRes.data);
        setViolations(vRes.data);
        setTrends(tRes.data.trend_points || []);
        setMonthlyTrends(tRes.data.monthly_trends || []);
      } catch (err) {
        showToast('Failed to load intelligence metrics.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportCSV = () => {
    window.open(analyticsAPI.exportUrl, '_blank');
    showToast('Exporting Brand Governance CSV Report...', 'info');
  };

  const COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#3B82F6', '#10B981', '#6366F1'];

  if (loading) {
    return <div className="text-center py-20 text-[#77718A] animate-pulse">Computing brand intelligence metrics...</div>;
  }

  const {
    total_uploads = 0,
    total_analyzed = 0,
    approved_count = 0,
    rejected_count = 0,
    changes_requested_count = 0,
    pending_count = 0,
    approval_rate = 100,
    rejection_rate = 0,
    changes_requested_rate = 0,
    average_compliance_score = 100,
    reviewer_activity = []
  } = overview || {};

  const topViolations = violations?.top_violations || [];
  const categoryBreakdown = violations?.category_breakdown || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2E2459] tracking-tight">
            Brand Intelligence Analytics
          </h1>
          <p className="text-xs text-[#77718A] mt-1">
            Aggregated brand compliance telemetry, recurring violation trends, reviewer activity, and governance velocity.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F8F6FF] text-[#7C3AED] border border-[#DDD6FE] font-bold text-xs shadow-xs transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Governance Report (CSV)
        </button>
      </div>

      {/* High-level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Average Compliance"
          value={`${average_compliance_score}%`}
          subtitle="Enterprise average score"
          icon={ShieldCheck}
          color={average_compliance_score >= 80 ? 'green' : 'orange'}
        />
        <StatCard
          title="Approval Rate"
          value={`${approval_rate}%`}
          subtitle={`${approved_count} cleared assets`}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title="Changes Requested"
          value={`${changes_requested_count}`}
          subtitle={`${changes_requested_rate}% revision rate`}
          icon={RefreshCw}
          color="orange"
        />
        <StatCard
          title="Rejection Rate"
          value={`${rejection_rate}%`}
          subtitle={`${rejected_count} rejected assets`}
          icon={XCircle}
          color={rejected_count > 0 ? 'red' : 'purple'}
        />
        <StatCard
          title="Pending Queue"
          value={pending_count}
          subtitle="Active review workflows"
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Trend & Category Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score Trend */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-[#2E2459]">Compliance Score Velocity</h3>
              <p className="text-xs text-[#77718A]">Audited scores across historical content scans</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
          </div>

          <div className="h-64 w-full">
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1EDFA" vertical={false} />
                  <XAxis dataKey="date" stroke="#77718A" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#77718A" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E3F2', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={3} dot={{ fill: '#7C3AED', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#77718A]">
                No historical trend data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Violations by Category Pie */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#2E2459]">Category Breakdown</h3>
              <p className="text-xs text-[#77718A]">Violations grouped by domain</p>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E8E3F2', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-[#77718A]">Zero violations recorded</div>
            )}
          </div>

          {/* Category Legend */}
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {categoryBreakdown.map((cat, i) => (
              <span key={cat.name} className="flex items-center gap-1.5 text-[10px] text-[#77718A]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{cat.name} ({cat.value})</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Reviewer Activity Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7C3AED]" />
              <h3 className="text-sm font-bold text-[#2E2459]">Reviewer Activity & Decision Telemetry</h3>
            </div>
            <p className="text-xs text-[#77718A] mt-0.5">
              Reviewer performance breakdown extracted from real database review logs.
            </p>
          </div>
        </div>

        {reviewer_activity.length === 0 ? (
          <p className="text-xs text-[#77718A] py-6 text-center">No reviewer activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E3F2] text-[#77718A] font-semibold uppercase text-[10px]">
                  <th className="pb-3">Reviewer Name</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3 text-center">Total Reviewed</th>
                  <th className="pb-3 text-center">Approved</th>
                  <th className="pb-3 text-center">Changes Requested</th>
                  <th className="pb-3 text-center">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3F2]">
                {reviewer_activity.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F8F6FF]/60 transition-colors">
                    <td className="py-3 font-bold text-[#2E2459]">{r.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EDE9FE] text-[#7C3AED]">
                        {r.role}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold text-[#2E2459]">{r.total_reviewed}</td>
                    <td className="py-3 text-center font-bold text-[#16A34A]">{r.approved}</td>
                    <td className="py-3 text-center font-bold text-[#D97706]">{r.changes_requested}</td>
                    <td className="py-3 text-center font-bold text-[#DC2626]">{r.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Recurring Violations Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8E3F2] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#2E2459]">Most Common Brand Violations</h3>
            <p className="text-xs text-[#77718A]">Identify systemic training gaps or recurring design errors across teams</p>
          </div>
        </div>

        {topViolations.length === 0 ? (
          <p className="text-xs text-[#77718A] py-8 text-center">No recurring violations recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E3F2] text-[#77718A] font-semibold uppercase text-[10px]">
                  <th className="pb-3">Violation Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3 text-right">Times Flagged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3F2]">
                {topViolations.map((v, i) => (
                  <tr key={i} className="hover:bg-[#F8F6FF]/60 transition-colors">
                    <td className="py-3 font-bold text-[#2E2459]">{v.title}</td>
                    <td className="py-3">
                      <CategoryBadge category={v.category} />
                    </td>
                    <td className="py-3">
                      <SeverityBadge severity={v.severity} />
                    </td>
                    <td className="py-3 text-right font-black text-[#7C3AED]">
                      {v.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
