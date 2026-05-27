'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Briefcase, Building2, CreditCard, TrendingUp, Users } from 'lucide-react';
import { adminApi } from '../../../lib/api/admin';
import { jobsApi } from '../../../lib/api/jobs';

function StatCard({ label, value, icon: Icon, bg, iconColor, sub }: {
  label: string;
  value?: number | string;
  icon: React.ElementType;
  bg: string;
  iconColor: string;
  sub?: string;
}) {
  return (
    <div className="bg-bg-card rounded-2xl border border-border-default p-5">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
      </div>
      {value === undefined
        ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse mb-1" />
        : <p className="text-2xl font-bold text-text-primary">{value}</p>}
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
      {sub && <p className="text-xs text-brand-primary font-medium mt-1">{sub}</p>}
    </div>
  );
}

function SimpleBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-muted w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-bg-page rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-text-primary w-8 text-right">{value}</span>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-bg-card border border-border-default rounded-xl p-4 text-center">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats().then((r) => r.data),
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['admin-jobs-analytics'],
    queryFn: () => jobsApi.adminList({ page: 1, limit: 100 }).then((r) => r.data),
  });

  const totalRevenuePaise = stats?.totalRevenuePaise ?? 0;
  const monthlyRevenuePaise = stats?.monthlyRevenuePaise ?? 0;
  const totalSeekers = stats?.totalSeekers ?? 0;
  const totalRecruiters = stats?.totalRecruiters ?? 0;
  const totalUsers = stats?.totalUsers ?? 0;
  const sosActive = stats?.sosActiveJobs ?? 0;
  const ftActive = stats?.fullTimeActiveJobs ?? 0;
  const filled = stats?.filledJobs ?? 0;
  const active = stats?.activeJobs ?? 0;
  const fillRate = (active + filled) > 0 ? Math.round((filled / (active + filled)) * 100) : 0;
  const seekerPct = totalUsers > 0 ? Math.round((totalSeekers / totalUsers) * 100) : 0;
  const recruiterPct = totalUsers > 0 ? Math.round((totalRecruiters / totalUsers) * 100) : 0;

  const jobsByStatus = jobs?.data?.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  const maxJobStatus = Math.max(...Object.values(jobsByStatus), 1);

  const jobStatusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500',
    FILLED: 'bg-blue-500',
    EXPIRED: 'bg-amber-500',
    PENDING_PAYMENT: 'bg-slate-400',
    AUTO_DISABLED: 'bg-red-400',
    DISABLED_BY_ADMIN: 'bg-red-600',
    PENDING_SUBSCRIPTION: 'bg-purple-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <p className="text-text-muted text-sm mt-1">Platform-wide statistics and trends.</p>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="All-time Revenue"
          value={totalRevenuePaise > 0 ? `₹${(totalRevenuePaise / 100).toLocaleString('en-IN')}` : '₹0'}
          icon={CreditCard} bg="bg-rose-100" iconColor="text-rose-600"
        />
        <StatCard
          label="Monthly Revenue"
          value={monthlyRevenuePaise > 0 ? `₹${(monthlyRevenuePaise / 100).toLocaleString('en-IN')}` : '₹0'}
          icon={TrendingUp} bg="bg-emerald-100" iconColor="text-emerald-600"
          sub={totalRevenuePaise > 0 ? `${Math.round((monthlyRevenuePaise / totalRevenuePaise) * 100)}% of all-time` : undefined}
        />
        <StatCard label="Active Jobs" value={stats?.activeJobs} icon={Briefcase} bg="bg-green-100" iconColor="text-green-600" />
        <StatCard label="Positions Filled" value={stats?.filledJobs} icon={Briefcase} bg="bg-blue-100" iconColor="text-blue-600" />
      </div>

      {/* User + Job breakdowns */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Breakdown */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="font-bold text-text-primary">User Breakdown</h2>
          </div>
          {statsLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <KpiCard label="Total" value={totalUsers} color="text-blue-600" />
                <KpiCard label="Teachers" value={totalSeekers} color="text-sky-600" />
                <KpiCard label="Schools" value={totalRecruiters} color="text-indigo-600" />
              </div>
              <SimpleBar label="Teachers" value={seekerPct} max={100} color="bg-sky-500" />
              <SimpleBar label="Schools" value={recruiterPct} max={100} color="bg-indigo-500" />
              <p className="text-[11px] text-text-muted">% of total user base</p>
            </div>
          )}
        </div>

        {/* Job Type Split */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="font-bold text-text-primary">Active Jobs by Type</h2>
          </div>
          {statsLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <KpiCard label="Active" value={ftActive + sosActive} color="text-green-600" />
                <KpiCard label="Filled" value={filled} color="text-blue-600" />
                <KpiCard label="Fill Rate" value={`${fillRate}%`} color="text-brand-primary" />
              </div>
              <SimpleBar label="Teaching Jobs" value={ftActive} max={Math.max(ftActive, 1)} color="bg-green-500" />
              <p className="text-[11px] text-text-muted">Fill rate = Filled / (Active + Filled)</p>
            </div>
          )}
        </div>
      </div>

      {/* Jobs by Status */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="font-bold text-text-primary">Jobs by Status</h2>
        </div>
        {jobsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : Object.keys(jobsByStatus).length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No job data available</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(jobsByStatus)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <SimpleBar
                  key={status}
                  label={status.replace(/_/g, ' ')}
                  value={count}
                  max={maxJobStatus}
                  color={jobStatusColors[status] ?? 'bg-slate-400'}
                />
              ))}
          </div>
        )}
      </div>

      {/* Pending actions summary */}
      <div className="bg-bg-card rounded-2xl border border-border-default p-6">
        <h2 className="font-bold text-text-primary mb-4">Pending Actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Schools awaiting verification', value: stats?.pendingHospitals ?? '—', color: 'text-amber-600', href: '/admin/hospitals' },
            { label: 'Open disputes', value: '—', color: 'text-red-600', href: '/admin/disputes' },
            { label: 'Suspended users', value: '—', color: 'text-text-muted', href: '/admin/users' },
          ].map(({ label, value, color, href }) => (
            <a key={label} href={href} className="bg-bg-page rounded-xl p-4 border border-border-default hover:border-brand-primary transition-colors block">
              <div className={`text-2xl font-extrabold ${color} mb-1`}>{statsLoading ? '—' : value}</div>
              <div className="text-xs text-text-muted">{label}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
