'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ArrowLeft, Briefcase, Building, Calendar, CheckCircle, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '../../../../common-components/ui/button';
import { Textarea } from '../../../../common-components/ui/textarea';
import { applicationsApi } from '../../../../lib/api/applications';
import { jobsApi } from '../../../../lib/api/jobs';
import { useAuth } from '../../../../lib/auth-context';
import { formatLpa, APPLICATION_FEE_PAISE, JOB_STATUS_BADGE } from '../../../../lib/shared/constants';
import { usePublicPricing, formatRupees } from '../../../../hooks/use-public-pricing';
import { ApplicationState, JobStatus, Role } from '../../../../lib/shared/enums';

const APP_STATE_LABEL: Record<ApplicationState, string> = {
  [ApplicationState.INTERESTED]: 'Under review by school',
  [ApplicationState.SHORTLISTED]: 'Shortlisted — payment required',
  [ApplicationState.PAID]: 'Interview pending',
  [ApplicationState.WON]: 'Hired 🎉',
  [ApplicationState.CLOSED]: 'Application closed',
};

function StatusPill({ status }: { status: JobStatus }) {
  const { label, cls } = JOB_STATUS_BADGE[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

export default function JobDetailPage() {
  const { pricing } = usePublicPricing();
  const appFee = pricing.APPLICATION_FEE_PAISE ?? APPLICATION_FEE_PAISE;
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [coverNote, setCoverNote] = useState('');
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState('');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.getById(id).then((r) => r.data),
  });

  const applyMutation = useMutation({
    mutationFn: () => applicationsApi.apply(id, coverNote),
    onSuccess: () => {
      setApplied(true);
      qc.invalidateQueries({ queryKey: ['my-applications'] });
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        setApplyError(err.response?.data?.message ?? 'Failed to apply. Please try again.');
      }
    },
  });

  const isSeeker = user?.role === Role.JOB_SEEKER;


  const { data: myApplications } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications().then((r) => r.data),
    enabled: isSeeker,
  });
  const existingApplication = myApplications?.find((a) => a.jobId === id);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-bg-card rounded-xl" />
        <div className="h-56 bg-bg-card rounded-2xl" />
        <div className="h-40 bg-bg-card rounded-2xl" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <Briefcase className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-muted">Job not found or has been removed.</p>
        <Link href="/jobs" className="mt-4 inline-block text-sm text-brand-primary hover:underline">← Back to Jobs</Link>
      </div>
    );
  }

  const canApply = isSeeker && job.status === JobStatus.ACTIVE;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Jobs
      </Link>

      {/* Header card */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary font-bold text-xl shrink-0">
            {(job.hospital?.name ?? 'H')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{job.title}</h1>
              <StatusPill status={job.status} />
            </div>
            <p className="text-sm text-text-muted mt-1">
              {job.hospital?.verified ? job.hospital.name : 'Verified School'} · {job.department}
            </p>
            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs text-text-muted">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{job.city}, {job.state}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />Full-time</span>
              {job.expiresAt && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Expires {new Date(job.expiresAt).toLocaleDateString('en-IN')}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Posted {new Date(job.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-border-default">
          <div className="text-center">
            <p className="text-xs text-text-muted mb-0.5">Experience</p>
            <p className="text-sm font-semibold text-text-primary">{job.experienceMin}–{job.experienceMax} yrs</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted mb-0.5">Salary</p>
            <p className="text-sm font-semibold text-text-primary">
              {job.salaryMin ? formatLpa(job.salaryMin, job.salaryMax) : 'Not disclosed'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted mb-0.5">Role</p>
            <p className="text-sm font-semibold text-text-primary">{job.role}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted mb-0.5">Positions</p>
            <p className="text-sm font-semibold text-text-primary">{job.openPositions ?? 1}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-2">Job Description</h2>
          <p className="text-sm text-text-muted whitespace-pre-line leading-relaxed">{job.description}</p>
        </div>
        {job.requirements.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-2">Requirements</h2>
            <ul className="space-y-1.5">
              {job.requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                  <CheckCircle className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Hospital info */}
      {job.hospital && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Building className="w-4 h-4" /> About the School
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary font-bold shrink-0">
              {job.hospital.name[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{job.hospital.name}</p>
              <p className="text-xs text-text-muted">{job.hospital.city}, {job.hospital.state}</p>
            </div>
            {job.hospital.verified && (
              <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Verified
              </span>
            )}
          </div>
        </div>
      )}

      {/* Already applied — show status */}
      {isSeeker && existingApplication && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">You&apos;ve already applied</p>
              <p className="text-xs text-text-muted mt-0.5">{APP_STATE_LABEL[existingApplication.state]}</p>
            </div>
          </div>
          <Link href="/applications" className="mt-3 inline-block text-sm text-brand-primary hover:underline font-medium">
            Track in My Applications →
          </Link>
        </div>
      )}

      {/* Apply CTA — only if seeker hasn't applied yet */}
      {canApply && !applied && !existingApplication && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Express Interest</h2>
          <p className="text-xs text-text-muted mb-4">
            School contact details (phone, email, address) are revealed only after you&apos;re shortlisted and confirm payment of {formatRupees(appFee)}.
          </p>
          <Textarea
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
            placeholder="Optional: Add a short note about why you're a good fit…"
            rows={3}
          />
          {applyError && <p className="text-xs text-red-500 mt-2">{applyError}</p>}
          <Button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
            className="mt-3 w-full"
          >
            {applyMutation.isPending ? 'Submitting…' : "I'm Interested"}
          </Button>
        </div>
      )}

      {applied && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-700">Interest submitted!</p>
          <p className="text-xs text-green-600 mt-1">The school will review your profile and shortlist if you&apos;re a match.</p>
          <Link href="/applications" className="mt-3 inline-block text-sm text-brand-primary hover:underline">
            Track in My Applications →
          </Link>
        </div>
      )}

      {!user && (
        <div className="bg-bg-card border border-border-default rounded-2xl p-5 text-center">
          <p className="text-sm text-text-muted mb-3">Sign in to express interest in this job.</p>
          <Link href="/login" className="inline-block bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
