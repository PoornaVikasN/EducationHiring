'use client';

import { schoolsApi } from '@/lib/api/schools';
import { jobsApi } from '@/lib/api/jobs';
import { useAuth } from '@/lib/auth-context';
import { JobStatus, VerificationStatus } from '@/lib/shared/enums';
import { enumLabel } from '@/lib/utils/enum-options';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  Layers,
  Plus,
  Users,

} from 'lucide-react';
import Link from 'next/link';
import { usePublicPricing, formatRupees } from '@/hooks/use-public-pricing';
import { RECRUITER_MONTHLY_PAISE } from '@/lib/shared/constants';

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
      <div
        className="w-36 h-36 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-bg-card flex flex-col items-center justify-center shadow-sm">
          <span className="text-2xl font-bold text-text-primary leading-none">{total}</span>
          {centerLabel && <span className="text-[9px] text-text-muted mt-0.5 text-center leading-tight">{centerLabel}</span>}
        </div>
      </div>
    </div>
  );
}

function DonutLegend({ segments }: { segments: { hex: string; label: string; value: number }[] }) {
  return (
    <div className="space-y-2">
      {segments.filter((s) => s.value > 0).map((seg) => (
        <div key={seg.label} className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.hex }} />
          <span className="text-xs text-text-muted flex-1">{seg.label}</span>
          <span className="text-xs font-bold text-text-primary">{seg.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mini vacancy bar ──────────────────────────────────────────────────────────

function VacancyBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.round(((total - filled) / total) * 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-text-muted shrink-0">{total - filled}/{total}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecruiterDashboardPage() {
  const { pricing } = usePublicPricing();
  const subMo = pricing.RECRUITER_MONTHLY_PAISE ?? RECRUITER_MONTHLY_PAISE;
  const { user } = useAuth();
  const name =
    (user?.recruiterProfile as { fullName?: string } | null)?.fullName ??
    user?.email?.split('@')[0] ??
    'there';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const { data: myJobs } = useQuery({
    queryKey: ['recruiter-jobs-summary'],
    queryFn: () => jobsApi.myJobs({ limit: 50 }).then((r) => r.data),
  });

  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['my-school'],
    queryFn: () => schoolsApi.getMine().then((r) => r.data).catch(() => null),
  });

  const hasSchool = !schoolLoading && school != null;
  const jobs = myJobs?.data ?? [];

  // ── Stats ──────────────────────────────────────────────────────────────────

  const activeJobs = jobs.filter((j) => j.status === JobStatus.ACTIVE);
  const filledJobs = jobs.filter((j) => j.status === JobStatus.FILLED);
  const expiredJobs = jobs.filter((j) => j.status === JobStatus.EXPIRED || j.status === JobStatus.AUTO_DISABLED);
  const openVacancies = activeJobs.reduce(
    (sum, j) => sum + Math.max(0, (j.openPositions ?? 1) - (j.filledPositions ?? 0)),
    0,
  );

  // ── Donut segments ─────────────────────────────────────────────────────────

  const statusSegments = [
    { value: activeJobs.length, hex: '#22c55e', label: 'Active' },
    { value: filledJobs.length, hex: '#3b82f6', label: 'Filled' },
    { value: expiredJobs.length, hex: '#f59e0b', label: 'Expired' },
  ];
  const totalJobs = jobs.length;

  const recentJobs = jobs.slice(0, 3);
  const topActiveJobs = activeJobs.slice(0, 5);

  const stats = [
    { label: 'Active Jobs', value: activeJobs.length || '—', icon: Briefcase, bg: 'bg-teal-100', iconColor: 'text-teal-600' },
    { label: 'Open Vacancies', value: openVacancies || '—', icon: Layers, bg: 'bg-brand-primary-light', iconColor: 'text-brand-primary' },
    { label: 'Jobs Filled', value: filledJobs.length || '—', icon: CheckCircle, bg: 'bg-green-100', iconColor: 'text-green-600' },
    { label: 'Total Posted', value: myJobs?.meta.total ?? '—', icon: Users, bg: 'bg-blue-100', iconColor: 'text-blue-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand-header to-[#1a2f47] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-primary opacity-20 blur-3xl" />
          <div className="absolute -bottom-10 left-1/2 w-36 h-36 rounded-full bg-red-400 opacity-10 blur-3xl" />
        </div>
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold">{name} 👋</h1>
            <p className="text-slate-300 text-sm mt-1">
              {openVacancies > 0
                ? `You have ${openVacancies} open position${openVacancies > 1 ? 's' : ''} across ${activeJobs.length} active job${activeJobs.length > 1 ? 's' : ''}.`
                : 'Manage your job postings and find the right teachers.'}
            </p>
          </div>
          {hasSchool ? (
            <Link
              href="/recruiter/jobs/new"
              className="shrink-0 flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Post a Job
            </Link>
          ) : (
            <Link
              href="/recruiter/school"
              className="shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Building2 className="w-4 h-4" /> Set Up School
            </Link>
          )}
        </div>
      </div>

      {/* School status banners */}
      {!schoolLoading && !hasSchool && (
        <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Complete your school profile to post jobs</p>
            <p className="text-xs text-amber-700 mt-0.5">You need to set up your school details before you can post any job listings.</p>
          </div>
          <Link href="/recruiter/school" className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            Set Up Now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
      {!schoolLoading && school && !school.isVerified && school.verificationStatus !== VerificationStatus.REJECTED && (
        <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">School profile under review</p>
            <p className="text-xs text-amber-700 mt-0.5">Admin is reviewing your school. Job posting will be unlocked once verified — usually within 24 hours.</p>
          </div>
          <Link href="/recruiter/school" className="shrink-0 flex items-center gap-1.5 border border-amber-400 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
            View Profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
      {!schoolLoading && school && !school.isVerified && school.verificationStatus === VerificationStatus.REJECTED && (
        <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">School profile rejected</p>
            <p className="text-xs text-red-700 mt-0.5">Your profile was rejected by admin. Please update the details and resubmit for review.</p>
          </div>
          <Link href="/recruiter/school" className="shrink-0 flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            Update Profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
      {!schoolLoading && school && school.isVerified && (
        <div className="flex items-start gap-4 bg-green-50 border border-green-200 rounded-2xl p-4">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 font-medium">School verified — you can post jobs and view applicants.</p>
        </div>
      )}

      {/* 5 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, bg, iconColor }) => (
          <div key={label} className="bg-bg-card border border-border-default rounded-2xl p-5 hover:shadow-md transition-shadow duration-200">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Hiring Overview: Donut + Vacancy Breakdown */}
      {totalJobs > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Donut */}
          <div className="bg-bg-card border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-5">Jobs by Status</h2>
            <div className="flex items-center gap-6">
              <DonutChart segments={statusSegments} total={totalJobs} centerLabel="total" />
              <DonutLegend segments={statusSegments} />
            </div>
          </div>

          {/* Open positions per job */}
          <div className="bg-bg-card border border-border-default rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-1">Open Vacancies</h2>
            <p className="text-xs text-text-muted mb-4">
              {openVacancies} total position slot{openVacancies !== 1 ? 's' : ''} across active jobs
            </p>
            {topActiveJobs.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">No active jobs</p>
            ) : (
              <div className="space-y-4">
                {topActiveJobs.map((job) => {
                  const total = job.openPositions ?? 1;
                  const remaining = Math.max(0, total - (job.filledPositions ?? 0));
                  return (
                    <div key={job._id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Briefcase className="w-3 h-3 text-brand-primary shrink-0" />
                          <span className="text-xs font-medium text-text-primary truncate">{job.title}</span>
                        </div>
                        <span className="text-xs text-text-muted shrink-0 ml-2">{remaining}/{total} open</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: openVacancies > 0 ? `${((remaining / openVacancies) * 100).toFixed(1)}%` : '0%',
                            background: '#3949ab',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {activeJobs.length > 5 && (
                  <p className="text-xs text-text-muted">+{activeJobs.length - 5} more active jobs</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post job cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="group bg-bg-card border border-border-default rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary-light to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary">Post a Teaching Job</h2>
                <p className="text-xs text-brand-primary font-medium">2 free/month · {formatRupees(subMo)}/mo unlimited</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mb-4">30-day listing. Shortlist teachers freely and chat once shortlisted.</p>
            {hasSchool ? (
              <Link href="/recruiter/jobs/new" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-dark group/link">
                Post a Job <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <Link href="/recruiter/school" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700">
                Set up school profile first <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className="group bg-bg-card border border-border-default rounded-2xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary">Browse Teacher Profiles</h2>
                <p className="text-xs text-amber-600 font-medium">Search by subject, role & location</p>
              </div>
            </div>
            <p className="text-sm text-text-muted mb-4">Find qualified teachers proactively — filter by subject, city, and experience.</p>
            <Link href="/recruiter/applicants" className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 group/link">
              View Applicants <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-text-primary">Your Job Postings</h2>
          <Link href="/recruiter/jobs" className="text-xs text-brand-primary hover:underline font-medium">View all →</Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-bg-page flex items-center justify-center mb-4">
              <Briefcase className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm font-semibold text-text-primary mb-1">No jobs posted yet</p>
            <p className="text-xs text-text-muted max-w-xs">Post your first job to start receiving applications.</p>
            {hasSchool ? (
              <Link href="/recruiter/jobs/new" className="mt-4 inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                <Plus className="w-4 h-4" /> Post a Job
              </Link>
            ) : (
              <Link href="/recruiter/school" className="mt-4 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                <Building2 className="w-4 h-4" /> Set Up School Profile
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => {
              const positions = job.openPositions ?? 1;
              return (
                <div key={job._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-page transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-brand-primary-light">
                    <Briefcase className="w-4 h-4 text-brand-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{job.title}</p>
                    <p className="text-xs text-text-muted">{job.city} · {enumLabel(job.role)} · {positions} position{positions > 1 ? 's' : ''}</p>
                  </div>
                  <Link href={`/recruiter/applicants?jobId=${job._id}`} className="text-xs text-brand-primary hover:underline shrink-0">
                    View Applicants →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
