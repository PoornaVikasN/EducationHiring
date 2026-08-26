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

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-bg-card border border-border-default rounded-xl p-4 text-center">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}

// A labeled count with a color dot — used instead of a bar chart for small sets of
// discrete categories (job statuses). A relative-width bar only reads clearly when
// the values actually vary a lot; with a handful of low counts, ties are common and
// every bar ends up the same length, which conveys nothing. A tile you can read at a
// glance without comparing lengths works regardless of how the numbers fall.
function StatusTile({ label, value, dot, text }: { label: string; value: number; dot: string; text: string }) {
  return (
    <div className="bg-bg-page border border-border-default rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
        <span className="text-[11px] text-text-muted truncate">{label}</span>
      </div>
      <p className={`text-xl font-extrabold ${text}`}>{value}</p>
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
  const filled = stats?.filledJobs ?? 0;
  const active = stats?.activeJobs ?? 0;
  const fillRate = (active + filled) > 0 ? Math.round((filled / (active + filled)) * 100) : 0;

  const jobsByStatus = jobs?.data?.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  // Same hue per status for both the dot and the count — order here also sets the
  // fixed display order below (severity-ish: healthy states first, problem states last).
  const jobStatusStyle: Record<string, { dot: string; text: string }> = {
    ACTIVE: { dot: 'bg-green-500', text: 'text-green-600' },
    FILLED: { dot: 'bg-blue-500', text: 'text-blue-600' },
    EXPIRED: { dot: 'bg-amber-500', text: 'text-amber-600' },
    AUTO_DISABLED: { dot: 'bg-red-400', text: 'text-red-500' },
    DISABLED_BY_ADMIN: { dot: 'bg-red-600', text: 'text-red-700' },
  };
  const statusOrder = ['ACTIVE', 'FILLED', 'EXPIRED', 'AUTO_DISABLED', 'DISABLED_BY_ADMIN'];

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
            <div className="grid grid-cols-3 gap-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Total" value={totalUsers} color="text-blue-600" />
              <KpiCard label="Teachers" value={totalSeekers} color="text-sky-600" />
              <KpiCard label="Schools" value={totalRecruiters} color="text-indigo-600" />
            </div>
          )}
        </div>

        {/* Job Fill Progress — this product has exactly one posting type (no
            urgent/substitute mode), so there's no "type" dimension to break down;
            this panel tracks how the current job pool is progressing instead. */}
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="font-bold text-text-primary">Job Fill Progress</h2>
          </div>
          {statsLoading ? (
            <div className="grid grid-cols-3 gap-3">{[1,2,3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <KpiCard label="Active" value={active} color="text-green-600" />
                <KpiCard label="Filled" value={filled} color="text-blue-600" />
                <KpiCard label="Fill Rate" value={`${fillRate}%`} color="text-brand-primary" />
              </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : Object.keys(jobsByStatus).length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No job data available</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {statusOrder
              .filter((status) => jobsByStatus[status] !== undefined)
              .map((status) => (
                <StatusTile
                  key={status}
                  label={status.replace(/_/g, ' ')}
                  value={jobsByStatus[status]}
                  dot={jobStatusStyle[status]?.dot ?? 'bg-slate-400'}
                  text={jobStatusStyle[status]?.text ?? 'text-slate-500'}
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
            { label: 'Schools awaiting verification', value: stats?.pendingSchools ?? '—', color: 'text-amber-600', href: '/admin/schools' },
            { label: 'Open disputes', value: stats?.openDisputes ?? '—', color: 'text-red-600', href: '/admin/disputes' },
            { label: 'Suspended users', value: stats?.suspendedUsers ?? '—', color: 'text-text-muted', href: '/admin/users' },
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
