'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, CheckCircle, ChevronDown, ChevronUp, User, Users, XCircle } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { applicationsApi, type Application } from '../../../lib/api/applications';
import { jobsApi } from '../../../lib/api/jobs';
import { Button } from '../../../common-components/ui/button';
import { ConfirmDialog } from '../../../common-components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../common-components/ui/dialog';
import { SeekerProfileView } from '../../../common-components/seeker-profile-view';
import { useToast } from '../../../hooks/use-toast';
import { ApplicationState } from '../../../lib/shared/enums';

const STATE_BADGE: Record<ApplicationState, { label: string; cls: string }> = {
  [ApplicationState.INTERESTED]: { label: 'Interested', cls: 'bg-blue-100 text-blue-700' },
  [ApplicationState.SHORTLISTED]: { label: 'Shortlisted', cls: 'bg-amber-100 text-amber-700' },
  [ApplicationState.PAID]: { label: 'Paid ✓', cls: 'bg-purple-100 text-purple-700' },
  [ApplicationState.WON]: { label: 'Hired', cls: 'bg-green-100 text-green-700' },
  [ApplicationState.CLOSED]: { label: 'Closed', cls: 'bg-slate-100 text-slate-500' },
};

function ApplicantCard({ app, onShortlist, onWon, onClose }: {
  app: Application;
  onShortlist: (app: Application) => void;
  onWon: (app: Application) => void;
  onClose: (app: Application) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const badge = STATE_BADGE[app.state];
  const seeker = app.seeker?.seekerProfile;
  const name = seeker?.fullName ?? app.seeker?.email ?? 'Candidate';

  return (
    <>
      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        <div
          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-bg-page transition-colors"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="w-9 h-9 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary font-bold shrink-0">
            {name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{name}</p>
            <p className="text-xs text-text-muted">
              {seeker?.headline ? `${seeker.headline} · ` : ''}Applied {new Date(app.createdAt).toLocaleDateString('en-IN')}
            </p>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
          <Button
            size="sm"
            variant="outline"
            className="text-xs shrink-0"
            onClick={(e) => { e.stopPropagation(); setProfileOpen(true); }}
          >
            <User className="w-3.5 h-3.5 mr-1" /> Profile
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />}
        </div>

        {expanded && (
          <div className="px-4 pb-4 border-t border-border-default pt-3 space-y-3">
            {app.coverNote && (
              <div className="bg-bg-page rounded-xl p-3">
                <p className="text-xs font-semibold text-text-muted mb-1">Cover Note</p>
                <p className="text-xs text-text-primary">{app.coverNote}</p>
              </div>
            )}

            {/* Expertise preview */}
            {(seeker?.expertise?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {seeker!.expertise!.slice(0, 4).map((e) => (
                  <span key={e} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary font-medium">{e}</span>
                ))}
                {(seeker!.expertise!.length > 4) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">+{seeker!.expertise!.length - 4} more</span>
                )}
              </div>
            )}

            {/* Status line for shortlisted — waiting for teacher payment */}
            {app.state === ApplicationState.SHORTLISTED && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⏳ Awaiting ₹99 confirmation from the teacher — contact details unlock once they pay.
              </div>
            )}

            {/* Actions based on state */}
            <div className="flex flex-wrap gap-2">
              {app.state === ApplicationState.INTERESTED && (
                <Button size="sm" onClick={() => onShortlist(app)}>
                  Shortlist
                </Button>
              )}
              {app.state === ApplicationState.PAID && (
                <Button size="sm" onClick={() => onWon(app)}>
                  <CheckCircle className="w-3.5 h-3.5" /> Mark Hired
                </Button>
              )}
              {[ApplicationState.INTERESTED, ApplicationState.SHORTLISTED, ApplicationState.PAID].includes(app.state) && (
                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => onClose(app)}>
                  <XCircle className="w-3.5 h-3.5" /> Decline
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full profile modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Candidate Profile</DialogTitle>
          </DialogHeader>
          <SeekerProfileView app={app} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApplicantsContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const preselectedJobId = searchParams.get('jobId') ?? undefined;
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(preselectedJobId);
  const [declineTarget, setDeclineTarget] = useState<Application | null>(null);

  const { data: jobs } = useQuery({
    queryKey: ['recruiter-jobs-list'],
    queryFn: () => jobsApi.myJobs({ limit: 200 }).then((r) => r.data),
  });

  useEffect(() => {
    if (jobs?.data?.length && !selectedJobId) {
      setSelectedJobId(jobs.data[0]._id);
    }
  }, [jobs?.data]);

  const { data: applicants, isLoading } = useQuery({
    queryKey: ['job-applicants', selectedJobId],
    queryFn: () => applicationsApi.jobApplicants(selectedJobId!).then((r) => r.data),
    enabled: !!selectedJobId,
  });

  const selectedJob = jobs?.data.find((j) => j._id === selectedJobId);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['job-applicants', selectedJobId] });
    qc.invalidateQueries({ queryKey: ['recruiter-jobs'] });
    qc.invalidateQueries({ queryKey: ['recruiter-jobs-list'] });
    qc.invalidateQueries({ queryKey: ['recruiter-jobs-summary'] });
  };

  const shortlistMutation = useMutation({
    mutationFn: (app: Application) => applicationsApi.shortlist(app.jobId, app._id),
    onSuccess: () => {
      toast({ title: 'Applicant shortlisted!' });
      invalidateAll();
    },
    onError: () => toast({ title: 'Shortlist failed', variant: 'destructive' }),
  });

  const wonMutation = useMutation({
    mutationFn: (app: Application) => applicationsApi.markWon(app.jobId, app._id),
    onSuccess: () => {
      toast({ title: 'Marked as hired! 🎉', description: 'The candidate has been confirmed. Other positions may still be open.' });
      invalidateAll();
    },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });

  const closeMutation = useMutation({
    mutationFn: (app: Application) => applicationsApi.markClosed(app.jobId, app._id),
    onSuccess: () => {
      toast({ title: 'Application declined' });
      setDeclineTarget(null);
      invalidateAll();
    },
    onError: () => toast({ title: 'Action failed', variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Applicants</h1>
        <p className="text-sm text-text-muted mt-0.5">Review and manage applicants for your jobs</p>
      </div>

      {/* Job selector */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Select Job</p>
        {!jobs?.data.length ? (
          <p className="text-sm text-text-muted">No jobs posted yet. <Link href="/recruiter/jobs/new" className="text-brand-primary hover:underline">Post one →</Link></p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {jobs.data.map((job) => (
              <Button
                key={job._id}
                size="sm"
                variant={selectedJobId === job._id ? 'default' : 'outline'}
                onClick={() => setSelectedJobId(job._id)}
                className="text-xs flex items-center gap-1"
              >
                <Briefcase className="w-3 h-3" />
                {job.title}
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedJobId ? (
        isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-bg-card border border-border-default rounded-2xl animate-pulse" />)}
          </div>
        ) : !applicants?.length ? (
          <div className="bg-bg-card border border-border-default rounded-2xl p-10 text-center">
            <Users className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted">No applicants yet for this job.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <p className="text-sm text-text-muted"><span className="font-semibold text-text-primary">{applicants.length}</span> applicants for &ldquo;{selectedJob?.title}&rdquo;</p>
              {selectedJob?.openPositions != null && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-brand-primary-light text-brand-primary font-medium">
                  {Math.max(0, (selectedJob.openPositions) - (selectedJob.filledPositions ?? 0))} of {selectedJob.openPositions} position{selectedJob.openPositions !== 1 ? 's' : ''} remaining
                </span>
              )}
            </div>
            <div className="space-y-3">
              {applicants.map((app) => (
                <ApplicantCard
                  key={app._id}
                  app={app}
                  onShortlist={(a) => shortlistMutation.mutate(a)}
                  onWon={(a) => wonMutation.mutate(a)}
                  onClose={(a) => setDeclineTarget(a)}
                />
              ))}
            </div>
          </div>
        )
      ) : (
        <div className="bg-bg-card border border-border-default rounded-2xl p-10 text-center">
          <Briefcase className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-muted">Select a job above to view its applicants.</p>
        </div>
      )}

      <ConfirmDialog
        open={!!declineTarget}
        onOpenChange={(open) => { if (!open) setDeclineTarget(null); }}
        title="Decline Applicant"
        description="Are you sure you want to decline this applicant? This cannot be undone."
        confirmLabel="Decline"
        onConfirm={() => { if (declineTarget) closeMutation.mutate(declineTarget); }}
        loading={closeMutation.isPending}
      />
    </div>
  );
}

export default function RecruiterApplicantsPage() {
  return (
    <Suspense>
      <ApplicantsContent />
    </Suspense>
  );
}
