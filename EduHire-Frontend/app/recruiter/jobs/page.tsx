'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Edit, Plus, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '../../../common-components/ui/button';
import { ConfirmDialog } from '../../../common-components/ui/confirm-dialog';
import { jobsApi, type Job } from '../../../lib/api/jobs';
import { useToast } from '../../../hooks/use-toast';
import { JobStatus } from '../../../lib/shared/enums';
import { useRazorpay } from '../../../hooks/use-razorpay';
import { usePublicPricing, formatRupees } from '../../../hooks/use-public-pricing';
import { JOB_STATUS_BADGE } from '../../../lib/shared/constants';
import { PaymentKind } from '../../../lib/shared/enums';
import { enumLabel } from '../../../lib/utils/enum-options';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_BADGE = JOB_STATUS_BADGE;

function JobRow({ job, onDelete, onBoost, boostLabel }: {
  job: Job;
  onDelete: (id: string) => void;
  onBoost: (job: Job) => void;
  boostLabel: string;
}) {
  const badge = STATUS_BADGE[job.status];
  return (
    <div className="flex items-center gap-4 p-4 bg-bg-card border border-border-default rounded-2xl hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-semibold text-text-primary truncate">{job.title}</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary">Teaching Role</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          {job.isBoosted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">Boosted</span>}
        </div>
        <p className="text-xs text-text-muted">
          {job.city}, {job.state} · {enumLabel(job.role)} · {enumLabel(job.department)} · {job.openPositions ?? 1} position{(job.openPositions ?? 1) > 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/recruiter/applicants?jobId=${job._id}`}>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <Users className="w-3.5 h-3.5" /> Applicants
          </Button>
        </Link>

        {job.status === JobStatus.EXPIRED && boostLabel !== '₹0' && (
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onBoost(job)}>
            Boost {boostLabel}
          </Button>
        )}

        {job.status !== JobStatus.FILLED && (
          <Link href={`/recruiter/jobs/${job._id}/edit`}>
            <Button variant="ghost" size="icon">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => onDelete(job._id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function RecruiterJobsPage() {
  const { pricing } = usePublicPricing();
  const boost = pricing.BOOST_PAISE ?? 0;
  const { toast } = useToast();
  const { pay } = useRazorpay();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter-jobs', page],
    queryFn: () => jobsApi.myJobs({ page, limit: 10 }).then((r) => r.data),
  });

  const totalPages = data?.meta.totalPages ?? 1;
  const pageNumbers: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Job deleted' });
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['recruiter-jobs'] });
    },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const handleBoost = (job: Job) => {
    pay(
      PaymentKind.BOOST,
      job._id,
      'Job boost — re-activate for 30 days',
      () => {
        toast({ title: 'Job boosted!', description: 'Your job is live again for 30 days.' });
        qc.invalidateQueries({ queryKey: ['recruiter-jobs'] });
      },
      () => toast({ title: 'Payment failed', variant: 'destructive' }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">My Job Postings</h1>
          <p className="text-sm text-text-muted mt-0.5">{data?.meta.total ?? 0} total jobs</p>
        </div>
        <Link href="/recruiter/jobs/new">
          <Button>
            <Plus className="w-4 h-4" /> Post a Job
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-card border border-border-default rounded-2xl animate-pulse" />)}
        </div>
      ) : !data?.data.length ? (
        <div className="bg-bg-card border border-border-default rounded-2xl p-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary-light flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-7 h-7 text-brand-primary" />
          </div>
          <p className="text-sm font-semibold text-text-primary mb-1">No jobs posted yet</p>
          <p className="text-xs text-text-muted mb-4">Post your first job to start receiving applications.</p>
          <Link href="/recruiter/jobs/new"><Button>Post a Job</Button></Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.data.map((job) => (
              <JobRow
                key={job._id}
                job={job}
                onDelete={(id) => setDeleteTarget(data.data.find((j) => j._id === id) ?? null)}
                onBoost={handleBoost}
                boostLabel={formatRupees(boost)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-8 px-3">← Prev</Button>
              {start > 1 && (
                <>
                  <button onClick={() => setPage(1)} className="w-8 h-8 rounded-lg text-xs font-medium text-text-muted hover:bg-bg-page transition-colors">1</button>
                  {start > 2 && <span className="text-text-muted text-xs px-1">…</span>}
                </>
              )}
              {pageNumbers.map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-brand-primary text-white' : 'text-text-muted hover:bg-bg-page'}`}>{p}</button>
              ))}
              {end < totalPages && (
                <>
                  {end < totalPages - 1 && <span className="text-text-muted text-xs px-1">…</span>}
                  <button onClick={() => setPage(totalPages)} className="w-8 h-8 rounded-lg text-xs font-medium text-text-muted hover:bg-bg-page transition-colors">{totalPages}</button>
                </>
              )}
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 px-3">Next →</Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Job"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete Job"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget._id); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
