'use client';

import { useQuery } from '@tanstack/react-query';
import { Briefcase, Building2, CheckCircle, ClipboardList, CreditCard, ShieldCheck, Trophy, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { adminApi } from '../../lib/api/admin';
import { jobsApi } from '../../lib/api/jobs';
import { useAuth } from '@/lib/auth-context';

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({
  segments,
  total,
  centerLabel,
}: {
  segments: { value: number; hex: string; label: string }[];
  total: number;
  centerLabel?: string;
}) {
  const nonZero = segments.filter((s) => s.value > 0);
  if (total === 0 || nonZero.length === 0) {
    return (
      <div className="w-36 h-36 rounded-full bg-slate-100 mx-auto flex items-center justify-center">
        <span className="text-xs text-text-muted">No data</span>
      </div>
    );
  }
  let cumDeg = 0;
  const gradient = nonZero
    .map((seg) => {
      const start = cumDeg;
      cumDeg += (seg.value / total) * 360;
      return `${seg.hex} ${start.toFixed(2)}deg ${cumDeg.toFixed(2)}deg`;
    })
    .join(', ');

  return (
    <div className="relative w-36 h-36 mx-auto">
      <div className="w-36 h-36 rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-bg-card flex flex-col items-center justify-center shadow-sm">
          <span className="text-2xl font-bold text-text-primary leading-none">{total}</span>
          {centerLabel && <span className="text-[9px] text-text-muted mt-0.5 text-center leading-tight">{centerLabel}</span>}
        </div>
      </div>
    </div>
  );
}

function SimpleBar({ label, value, max, hex }: { label: string; value: number; max: number; hex: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-muted w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-bg-page rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: hex }} />
      </div>
      <span className="text-xs font-semibold text-text-primary w-8 text-right">{value}</span>
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_COLORS: Record<string, string> = {
  PRICE_UPDATED: 'bg-blue-100 text-blue-700',
  API_KEY_SET: 'bg-purple-100 text-purple-700',
  USER_SUSPENDED: 'bg-red-100 text-red-700',
  USER_ACTIVATED: 'bg-green-100 text-green-700',
  USER_CREATED: 'bg-teal-100 text-teal-700',
  SCHOOL_VERIFIED: 'bg-green-100 text-green-700',
  SCHOOL_REJECTED: 'bg-red-100 text-red-700',
  JOB_DISABLED: 'bg-orange-100 text-orange-700',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then((r) => r.data),
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['admin-jobs-dash'],
    queryFn: () => jobsApi.adminList({ page: 1, limit: 100 }).then((r) => r.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin-audit-dash'],
    queryFn: () => adminApi.listAuditLogs(1, 8).then((r) => r.data),
  });

  const totalRevenue = stats?.totalRevenuePaise
    ? `₹${(stats.totalRevenuePaise / 100).toLocaleString('en-IN')}`
    : '₹0';

  const monthlyRevenue = stats?.monthlyRevenuePaise
    ? `₹${(stats.monthlyRevenuePaise / 100).toLocaleString('en-IN')}`
    : '₹0';

  // ── Jobs breakdown ─────────────────────────────────────────────────────────
  const jobsByStatus = jobs?.data?.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const totalJobsForChart = jobs?.data?.length ?? 0;
  const jobStatusConfig: Record<string, { hex: string; label: string }> = {
    ACTIVE: { hex: '#22c55e', label: 'Active' },
    FILLED: { hex: '#3b82f6', label: 'Filled' },
    EXPIRED: { hex: '#f59e0b', label: 'Expired' },
    AUTO_DISABLED: { hex: '#f87171', label: 'Closed' },
    DISABLED_BY_ADMIN: { hex: '#dc2626', label: 'Disabled' },
  };

  const donutSegments = Object.entries(jobsByStatus).map(([status, count]) => ({
    value: count,
    hex: jobStatusConfig[status]?.hex ?? '#94a3b8',
    label: jobStatusConfig[status]?.label ?? status,
  }));

  // ── Revenue breakdown bars ─────────────────────────────────────────────────
  const allTimeR = stats?.totalRevenuePaise ?? 0;
  const monthlyR = stats?.monthlyRevenuePaise ?? 0;
  const fillRate = (stats?.activeJobs ?? 0) + (stats?.filledJobs ?? 0) > 0
    ? Math.round((stats!.filledJobs / ((stats!.activeJobs ?? 0) + (stats!.filledJobs ?? 0))) * 100)
    : 0;

  const revenueBarMax = Math.max(allTimeR, 1);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand-header to-[#1a2f47] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-primary opacity-20 blur-3xl" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-primary/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Admin Panel</p>
              <h1 className="text-2xl font-bold">SchoolTeacher Administration</h1>
              <p className="text-slate-300 text-sm mt-0.5">{user?.email}</p>
            </div>
          </div>
          <Link
            href="/admin/analytics"
            className="shrink-0 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-white/20"
          >
            <TrendingUp className="w-4 h-4" /> Analytics
          </Link>
        </div>
      </div>

      {/* Stats — 3×3 grid (9 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Users', value: stats?.totalUsers, icon: Users, bg: 'bg-blue-100', iconColor: 'text-blue-600', href: '/admin/users' },
          { label: 'Teachers', value: stats?.totalSeekers, icon: Users, bg: 'bg-sky-100', iconColor: 'text-sky-600', href: '/admin/users' },
          { label: 'Schools', value: stats?.totalRecruiters, icon: Users, bg: 'bg-indigo-100', iconColor: 'text-indigo-600', href: '/admin/users' },
          { label: 'Active Jobs', value: stats?.activeJobs, icon: Briefcase, bg: 'bg-green-100', iconColor: 'text-green-600', href: '/admin/jobs' },
          { label: 'Positions Filled', value: stats?.filledJobs, icon: Trophy, bg: 'bg-purple-100', iconColor: 'text-purple-600', href: '/admin/jobs' },
          { label: 'Pending School Verify', value: stats?.pendingSchools, icon: CheckCircle, bg: 'bg-amber-100', iconColor: 'text-amber-600', href: '/admin/schools' },
          { label: 'Schools', value: stats?.totalSchools, icon: Building2, bg: 'bg-teal-100', iconColor: 'text-teal-600', href: '/admin/schools' },
          { label: 'Monthly Revenue', value: monthlyRevenue, icon: CreditCard, bg: 'bg-emerald-100', iconColor: 'text-emerald-600', href: '/admin/payments' },
          { label: 'All-time Revenue', value: totalRevenue, icon: CreditCard, bg: 'bg-rose-100', iconColor: 'text-rose-600', href: '/admin/payments' },
        ].map(({ label, value, icon: Icon, bg, iconColor, href }) => (
          <Link key={label} href={href} className="bg-bg-card border border-border-default rounded-2xl p-5 hover:border-brand-primary hover:shadow-md transition-all duration-200">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
            </div>
            {isLoading && !['Monthly Revenue', 'All-time Revenue'].includes(label)
              ? <div className="h-7 w-14 bg-slate-100 rounded animate-pulse mb-1" />
              : <p className="text-2xl font-bold text-text-primary">{value ?? '—'}</p>}
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Jobs by Status donut */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-5">Jobs by Status</h2>
          {jobsLoading ? (
            <div className="h-36 bg-bg-page rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-6">
              <DonutChart segments={donutSegments} total={totalJobsForChart} centerLabel="total" />
              <div className="flex-1 space-y-2">
                {donutSegments.sort((a, b) => b.value - a.value).map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.hex }} />
                    <span className="text-xs text-text-muted flex-1">{seg.label}</span>
                    <span className="text-xs font-bold text-text-primary">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Revenue breakdown */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-2">Revenue Overview</h2>
          <p className="text-xs text-text-muted mb-5">All-time vs Last 30 days · PAID only</p>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-6 bg-bg-page rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <SimpleBar label="All-time" value={Math.round(allTimeR / 100)} max={Math.round(revenueBarMax / 100)} hex="#3b82f6" />
              <SimpleBar label="This month" value={Math.round(monthlyR / 100)} max={Math.round(revenueBarMax / 100)} hex="#22c55e" />
              <div className="pt-3 border-t border-border-default">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-muted">Teaching Jobs Active</span>
                  <span className="text-sm font-bold text-text-primary">{stats?.activeJobs ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-text-muted">Fill Rate</span>
                  <span className="text-sm font-bold text-text-primary">{fillRate}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Pending Actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/admin/schools?filter=pending" className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:border-amber-400 transition-colors">
            <Building2 className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">{stats?.pendingSchools ?? 0} schools</p>
              <p className="text-xs text-amber-600">awaiting verification</p>
            </div>
          </Link>
          <Link href="/admin/users?filter=suspended" className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl hover:border-red-400 transition-colors">
            <Users className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Suspended Users</p>
              <p className="text-xs text-red-600">review and activate</p>
            </div>
          </Link>
          <Link href="/admin/audit" className="flex items-center gap-3 p-4 bg-bg-page border border-border-default rounded-xl hover:border-brand-primary transition-colors">
            <ClipboardList className="w-5 h-5 text-text-muted shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Audit Log</p>
              <p className="text-xs text-text-muted">view all admin actions</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Audit Activity */}
      {(auditData?.data?.length ?? 0) > 0 && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Recent Audit Activity</h2>
            <Link href="/admin/audit" className="text-xs text-brand-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {auditData!.data.map((log) => (
              <div key={log._id} className="flex items-start gap-3 py-2 border-b border-border-default last:border-0">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                  {log.action.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{log.entityLabel ?? log.entityId ?? '—'}</p>
                  <p className="text-[11px] text-text-muted">{log.adminEmail}</p>
                </div>
                <span className="text-[11px] text-text-muted shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/admin/users', icon: Users, label: 'Manage Users', desc: 'View, suspend, or activate accounts' },
          { href: '/admin/schools', icon: Building2, label: 'Verify Schools', desc: 'Approve or reject school profiles' },
          { href: '/admin/jobs', icon: Briefcase, label: 'Manage Jobs', desc: 'Monitor and disable job listings' },
          { href: '/admin/payments', icon: CreditCard, label: 'Payments', desc: 'Audit all payment transactions' },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href} className="group flex flex-col gap-3 p-5 bg-bg-card border border-border-default rounded-2xl hover:border-brand-primary hover:shadow-md transition-all duration-200">
            <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icon className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">{label}</p>
              <p className="text-xs text-text-muted mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
