'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Briefcase, CheckCircle, Clock, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '../../../common-components/ui/button';
import { Combobox } from '../../../common-components/ui/combobox';
import { LocationAutocomplete } from '../../../common-components/location-autocomplete';
import { useDebouncedValue } from '../../../hooks/use-debounced-value';
import { usePublicPricing } from '../../../hooks/use-public-pricing';
import { applicationsApi, type Application } from '../../../lib/api/applications';
import { jobsApi, type Job } from '../../../lib/api/jobs';
import { useAuth } from '../../../lib/auth-context';
import { JobType, Role } from '../../../lib/shared/enums';
import { EXPERTISE_OPTIONS, DEPARTMENT_REQUIREMENTS_OPTIONS, formatLpa } from '../../../lib/shared/constants';

const EXPERTISE_FILTER_OPTIONS = [
  { value: '', label: 'All Specialties' },
  ...EXPERTISE_OPTIONS.map((e) => ({ value: e, label: e })),
];

const DEPARTMENT_FILTER_OPTIONS = [
  { value: '', label: 'All Departments' },
  ...DEPARTMENT_REQUIREMENTS_OPTIONS.map((d) => ({ value: d, label: d })),
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TypeBadge({ type: _type }: { type: JobType }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">
      <Briefcase className="w-2.5 h-2.5" /> Teaching
    </span>
  );
}

function JobCard({ job, onApply, isApplied }: { job: Job; onApply: (job: Job) => void; isApplied?: boolean }) {
  const salary = job.salaryMin && job.salaryMax ? formatLpa(job.salaryMin, job.salaryMax) : null;
  const positions = job.openPositions ?? 1;
  const filled = job.filledPositions ?? 0;
  const remaining = positions - filled;

  return (
    <Link
      href={`/jobs/${job._id}`}
      className="group block bg-bg-card border border-border-default rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-brand-primary border-l-4 border-l-brand-primary"
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white bg-gradient-to-br from-brand-primary to-teal-500">
            {(job.hospital?.name ?? 'H')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors leading-snug line-clamp-1">
                {job.title}
              </h3>
              <TypeBadge type={job.type} />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-xs text-text-muted truncate">
                {job.hospital?.name ?? 'School'}
              </p>
              {job.hospital?.verified && (
                <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />{job.city}, {job.state}
          </span>
          <span>·</span>
          <span>{job.experienceMin}–{job.experienceMax} yrs exp</span>
          {salary && <><span>·</span><span className="font-medium text-text-primary">{salary}</span></>}
        </div>

        {/* Tags row */}
        <div className="flex items-center flex-wrap gap-1.5 mb-3">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-page border border-border-default text-text-muted">
            {job.department}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-page border border-border-default text-text-muted">
            {job.role}
          </span>
          {remaining > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 font-medium">
              {remaining} position{remaining > 1 ? 's' : ''} open
            </span>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between border-t border-border-default pt-2.5 mt-1">
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" /> {timeAgo(job.createdAt)}
          </span>
          {isApplied ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
              <CheckCircle className="w-3.5 h-3.5" /> Applied
            </span>
          ) : (
            <button
              className="text-xs font-semibold text-brand-primary hover:text-brand-primary group-hover:underline transition-colors"
              onClick={(e) => { e.preventDefault(); onApply(job); }}
            >
              I&apos;m Interested →
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function JobsPage() {
  const { pricing: _pricing } = usePublicPricing();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState<JobType | ''>(
    (searchParams.get('type') as JobType) || ''
  );
  const [expertise, setExpertise] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 400);
  const debouncedCity = useDebouncedValue(city, 400);

  const isSeeker = user?.role === Role.JOB_SEEKER;
  const { data: myApplications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications().then((r) => r.data),
    enabled: isSeeker,
  });
  const appliedJobIds = new Set((myApplications as Application[] | undefined)?.map((a) => a.jobId) ?? []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', debouncedSearch, debouncedCity, type, expertise, department, page],
    queryFn: () => jobsApi.list({
      search: debouncedSearch || undefined,
      city: debouncedCity || undefined,
      type: type || undefined,
      expertise: expertise || undefined,
      department: department || undefined,
      page,
      limit: 12,
    }).then((r) => r.data),
  });

  const handleApply = (job: Job) => {
    if (!user) { router.push('/login'); return; }
    router.push(`/jobs/${job._id}`);
  };

  const activeFilterCount = [type, expertise, department, debouncedCity].filter(Boolean).length;

  const clearAll = () => {
    setType('');
    setExpertise('');
    setDepartment('');
    setCity('');
    setPage(1);
  };

  // Page number display logic
  const totalPages = data?.meta.totalPages ?? 1;
  const pageNumbers: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="space-y-0">
      {/* ── Hero search section ─────────────────────────────── */}
      <div className="-mx-6 -mt-6 relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-header to-[#1a2f47]" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-primary opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-32 rounded-full bg-teal-400 opacity-10 blur-3xl pointer-events-none" />
        <div className="relative py-10 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-white mb-1">Find your next teaching role</h1>
            <p className="text-slate-300 text-sm mb-6">Browse verified jobs from trusted schools across India</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none z-10" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Job title, role, or keyword…"
                  className="w-full h-11 pl-9 pr-4 rounded-xl bg-white/15 border border-white/25 text-white placeholder:text-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
                />
              </div>
              <div className="w-full sm:w-52">
                <LocationAutocomplete
                  defaultValue={city}
                  placeholder="City or area…"
                  onSelect={({ city: c }) => { setCity(c); setPage(1); }}
                  onClear={() => { setCity(''); setPage(1); }}
                  inputClassName="h-11 bg-white/15 border-white/25 text-white placeholder:text-white/60 focus:ring-white/40"
                />
              </div>
            </div>
            {/* Type quick-filter chips */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
              {([['', 'All Jobs'], [JobType.FULL_TIME, '💼 Full-time']] as [string, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setType(val as JobType | ''); setPage(1); }}
                  className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-150 ${type === val ? 'bg-white text-brand-header shadow' : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar filters ─────────────────────────────────── */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="bg-bg-card border border-border-default rounded-2xl p-5 space-y-5 sticky top-24">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <SlidersHorizontal className="w-4 h-4" /> Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-primary text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-xs text-text-muted hover:text-red-500 transition-colors flex items-center gap-0.5">
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Specialty */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Specialty</p>
              <Combobox
                options={EXPERTISE_FILTER_OPTIONS}
                value={expertise}
                onValueChange={(v) => { setExpertise(v); setPage(1); }}
                placeholder="All Specialties"
                searchPlaceholder="Search specialty…"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Department</p>
              <Combobox
                options={DEPARTMENT_FILTER_OPTIONS}
                value={department}
                onValueChange={(v) => { setDepartment(v); setPage(1); }}
                placeholder="All Departments"
                searchPlaceholder="Search department…"
              />
            </div>

            {/* Job type */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Job Type</p>
              <div className="flex flex-col gap-1.5">
                {([['', 'All Types'], [JobType.FULL_TIME, 'Full-time']] as [string, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setType(val as JobType | ''); setPage(1); }}
                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border text-left transition-all ${type === val ? 'border-brand-primary bg-brand-primary/5 text-brand-primary font-semibold' : 'border-border-default text-text-muted hover:border-brand-primary/40 hover:text-text-primary'}`}
                  >
                    {val === JobType.FULL_TIME ? <Briefcase className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Results area ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Active filter chips row */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs text-text-muted">Active filters:</span>
              {type && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                  Full-time
                  <button onClick={() => { setType(''); setPage(1); }} className="ml-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              )}
              {expertise && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                  {expertise}
                  <button onClick={() => { setExpertise(''); setPage(1); }} className="ml-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              )}
              {department && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                  {department}
                  <button onClick={() => { setDepartment(''); setPage(1); }} className="ml-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              )}
              {debouncedCity && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                  <MapPin className="w-3 h-3" />{debouncedCity}
                  <button onClick={() => { setCity(''); setPage(1); }} className="ml-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-text-muted">
              <span className="font-bold text-text-primary">{data?.meta.total ?? 0}</span> job{(data?.meta.total ?? 0) !== 1 ? 's' : ''} found
            </p>
            {data && data.meta.total > 0 && (
              <p className="text-xs text-text-muted">
                Page {page} of {totalPages}
              </p>
            )}
          </div>

          {/* Loading skeletons */}
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 bg-bg-card border border-border-default rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-bg-card border border-border-default rounded-2xl p-12 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-primary mb-1">Failed to load jobs</p>
              <p className="text-xs text-text-muted">Check your connection and try again.</p>
            </div>
          ) : data?.data.length === 0 ? (
            <div className="bg-bg-card border border-border-default rounded-2xl p-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary-light flex items-center justify-center mx-auto mb-5">
                <Briefcase className="w-8 h-8 text-brand-primary" />
              </div>
              <h2 className="text-base font-semibold text-text-primary mb-2">No jobs match your filters</h2>
              <p className="text-text-muted text-sm max-w-xs mx-auto mb-4">Try removing a filter or broadening your search.</p>
              {activeFilterCount > 0 && (
                <button onClick={clearAll} className="text-sm text-brand-primary hover:underline font-medium">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                {data?.data.map((job) => (
                  <JobCard key={job._id} job={job} onApply={handleApply} isApplied={appliedJobIds.has(job._id)} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-8">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3">
                    ← Prev
                  </Button>
                  {start > 1 && (
                    <>
                      <button onClick={() => setPage(1)} className="w-8 h-8 rounded-lg text-xs font-medium text-text-muted hover:bg-bg-page transition-colors">1</button>
                      {start > 2 && <span className="text-text-muted text-xs px-1">…</span>}
                    </>
                  )}
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-brand-primary text-white' : 'text-text-muted hover:bg-bg-page'}`}
                    >
                      {p}
                    </button>
                  ))}
                  {end < totalPages && (
                    <>
                      {end < totalPages - 1 && <span className="text-text-muted text-xs px-1">…</span>}
                      <button onClick={() => setPage(totalPages)} className="w-8 h-8 rounded-lg text-xs font-medium text-text-muted hover:bg-bg-page transition-colors">{totalPages}</button>
                    </>
                  )}
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3">
                    Next →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
