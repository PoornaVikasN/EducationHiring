'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowRight, Briefcase, CheckCircle, FileText, MapPin, Search, Star, UserCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { applicationsApi } from '../../../lib/api/applications';
import { jobsApi } from '../../../lib/api/jobs';
import { ApplicationState } from '../../../lib/shared/enums';

// ── Donut Chart (CSS conic-gradient, no library) ─────────────────────────────

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

// ── Pipeline step ─────────────────────────────────────────────────────────────

function PipelineStep({
  label,
  value,
  total,
  hex,
  cls,
}: {
  label: string;
  value: number;
  total: number;
  hex: string;
  cls: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: hex }} />
          <span className="text-xs text-text-muted">{label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct.toFixed(1)}%`, background: hex }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SeekerDashboardPage() {
  const { user } = useAuth();
  const name =
    (user?.seekerProfile as { fullName?: string } | null)?.fullName ??
    user?.email?.split('@')[0] ??
    'there';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: applications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications().then((r) => r.data),
  });

  const { data: jobsMeta } = useQuery({
    queryKey: ['jobs-meta'],
    queryFn: () => jobsApi.list({ limit: 1 }).then((r) => r.data.meta),
  });

  const profile = user?.seekerProfile as Record<string, unknown> | null;
  const profileIncomplete = !profile?.headline || !(profile?.expertise as string[] | undefined)?.length;

  // ── Application pipeline breakdown ─────────────────────────────────────────
  const total = applications?.length ?? 0;
  const underReview = applications?.filter((a) => a.state === ApplicationState.INTERESTED).length ?? 0;
  const shortlisted = applications?.filter((a) => a.state === ApplicationState.SHORTLISTED || a.state === ApplicationState.PAID).length ?? 0;
  const hired = applications?.filter((a) => a.state === ApplicationState.WON).length ?? 0;
  const closed = applications?.filter((a) => a.state === ApplicationState.CLOSED).length ?? 0;

  const pipelineSegments = [
    { value: underReview, hex: '#3b82f6', label: 'Under Review' },
    { value: shortlisted, hex: '#f59e0b', label: 'Shortlisted / Paid' },
    { value: hired, hex: '#22c55e', label: 'Hired' },
    { value: closed, hex: '#94a3b8', label: 'Closed' },
  ];

  const recentApps = applications?.slice(0, 3) ?? [];

  const stateBadgeCls: Record<ApplicationState, string> = {
    [ApplicationState.INTERESTED]: 'bg-blue-100 text-blue-700',
    [ApplicationState.SHORTLISTED]: 'bg-amber-100 text-amber-700',
    [ApplicationState.PAID]: 'bg-purple-100 text-purple-700',
    [ApplicationState.WON]: 'bg-green-100 text-green-700',
    [ApplicationState.CLOSED]: 'bg-slate-100 text-slate-500',
  };

  const stateLabel: Record<ApplicationState, string> = {
    [ApplicationState.INTERESTED]: 'Under Review',
    [ApplicationState.SHORTLISTED]: 'Shortlisted',
    [ApplicationState.PAID]: 'Paid',
    [ApplicationState.WON]: 'Hired 🎉',
    [ApplicationState.CLOSED]: 'Closed',
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand-header to-[#1a2f47] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-primary opacity-20 blur-3xl" />
          <div className="absolute -bottom-10 left-1/3 w-36 h-36 rounded-full bg-teal-400 opacity-10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <p className="text-slate-400 text-sm mb-1">{greeting}</p>
          <h1 className="text-2xl font-bold">{name} 👋</h1>
          <p className="text-slate-300 text-sm mt-1">
            {jobsMeta?.total
              ? `${jobsMeta.total} verified teaching jobs waiting for you.`
              : 'Find teaching jobs near you — regional and national opportunities.'}
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" /> Browse Jobs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Profile incomplete */}
      {profileIncomplete && (
        <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <UserCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Complete your profile to get better matches</p>
            <p className="text-xs text-amber-700 mt-0.5">Add your headline, subjects, and resume so schools can find you faster.</p>
          </div>
          <Link
            href="/profile"
            className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Complete Now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Applied', value: total || '—', icon: FileText, bg: 'bg-blue-100', iconColor: 'text-blue-600' },
          { label: 'Jobs Available', value: jobsMeta?.total ?? '—', icon: MapPin, bg: 'bg-teal-100', iconColor: 'text-teal-600' },
          { label: 'Shortlisted', value: shortlisted || '—', icon: Star, bg: 'bg-amber-100', iconColor: 'text-amber-600' },
          { label: 'Hired', value: hired || '—', icon: CheckCircle, bg: 'bg-green-100', iconColor: 'text-green-600' },
        ].map(({ label, value, icon: Icon, bg, iconColor }) => (
          <div key={label} className="bg-bg-card border border-border-default rounded-2xl p-5 hover:shadow-md transition-shadow duration-200">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Application pipeline — shown only when there are apps */}
      {total > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Donut */}
          <div className="bg-bg-card border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-5">Application Breakdown</h2>
            <div className="flex items-center gap-6">
              <DonutChart segments={pipelineSegments} total={total} centerLabel="applied" />
              <div className="flex-1 space-y-2">
                {pipelineSegments.filter((s) => s.value > 0).map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.hex }} />
                    <span className="text-xs text-text-muted flex-1">{seg.label}</span>
                    <span className="text-xs font-bold text-text-primary">{seg.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline funnel */}
          <div className="bg-bg-card border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-1">Application Funnel</h2>
            <p className="text-xs text-text-muted mb-4">Your progress through the hiring stages</p>
            <div className="space-y-3">
              <PipelineStep label="Applied" value={total} total={total} hex="#6366f1" cls="bg-indigo-100 text-indigo-700" />
              <PipelineStep label="Shortlisted / Paid" value={shortlisted} total={total} hex="#f59e0b" cls="bg-amber-100 text-amber-700" />
              <PipelineStep label="Hired" value={hired} total={total} hex="#22c55e" cls="bg-green-100 text-green-700" />
            </div>
            {hired > 0 && total > 0 && (
              <p className="text-xs text-green-600 font-medium mt-4">
                {Math.round((hired / total) * 100)}% hire rate — great work! 🎉
              </p>
            )}
          </div>
        </div>
      )}


      {/* Quick actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: '/jobs', icon: Search, title: 'Browse Jobs', desc: 'Explore verified roles near you', bg: 'bg-brand-primary-light', iconColor: 'text-brand-primary' },
          { href: '/profile', icon: FileText, title: 'Complete Profile', desc: 'Upload resume & certifications', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
          { href: '/applications', icon: Briefcase, title: 'My Applications', desc: 'Track your application status', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
        ].map(({ href, icon: Icon, title, desc, bg, iconColor }) => (
          <Link key={href} href={href} className="group flex items-center gap-4 p-4 bg-bg-card border border-border-default rounded-2xl hover:border-brand-primary hover:shadow-md transition-all duration-200">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">{title}</p>
              <p className="text-xs text-text-muted">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-text-primary">Recent Applications</h2>
          <Link href="/applications" className="text-xs text-brand-primary hover:underline font-medium">View all →</Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-bg-page flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm font-semibold text-text-primary mb-1">No applications yet</p>
            <p className="text-xs text-text-muted max-w-xs">Browse jobs and tap &ldquo;I&apos;m Interested&rdquo; to apply.</p>
            <Link href="/jobs" className="mt-4 inline-flex items-center gap-2 text-sm text-brand-primary hover:underline font-medium">
              Browse Jobs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentApps.map((app) => (
              <Link key={app._id} href="/applications" className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-page transition-colors">
                <div className="w-9 h-9 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary font-bold text-sm shrink-0">
                  {(app.school?.name ?? 'H')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{app.job?.title ?? 'Job'}</p>
                  <p className="text-xs text-text-muted">{app.school?.name ?? 'School'}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${stateBadgeCls[app.state]}`}>
                  {stateLabel[app.state]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
