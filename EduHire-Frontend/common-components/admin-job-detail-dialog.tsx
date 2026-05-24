'use client';

import { Briefcase, Building2, ExternalLink } from 'lucide-react';
import type { Job } from '../lib/api/jobs';
import { JOB_STATUS_BADGE } from '../lib/shared/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

const STATUS_BADGE = JOB_STATUS_BADGE;

function to12hr(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h % 12) || 12).toString().padStart(2, '0');
  return `${h12}:${(m ?? 0).toString().padStart(2, '0')} ${suffix}`;
}

function formatLpa(minRupees: number, maxRupees: number) {
  const lo = (minRupees * 12) / 100_000;
  const hi = (maxRupees * 12) / 100_000;
  return `₹${lo.toFixed(1)}–${hi.toFixed(1)} LPA`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-text-muted w-36 shrink-0">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}

interface Props {
  job: Job | null;
  onOpenChange: (open: boolean) => void;
}

export function AdminJobDetailDialog({ job, onOpenChange }: Props) {
  if (!job) return null;

  const badge = STATUS_BADGE[job.status];
  const timingStart = to12hr(job.jobTimingStart);
  const timingEnd = to12hr(job.jobTimingEnd);

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-bg-card border border-border-default">
        <DialogHeader>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <DialogTitle className="text-base font-bold text-text-primary">{job.title}</DialogTitle>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-primary-light text-brand-primary">
                  Teaching
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
              </div>
              {job.hospital && (
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{job.hospital.name}</span>
                  {job.hospital.verified && (
                    <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Verified</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Key details grid */}
          <div className="bg-bg-page border border-border-default rounded-xl p-3 space-y-2">
            <Row label="Location" value={`${job.city}, ${job.state}`} />
            <Row label="Department" value={job.department} />
            <Row label="Role" value={job.role} />
            <Row label="Experience" value={`${job.experienceMin}–${job.experienceMax} yrs`} />
            <Row label="Salary" value={formatLpa(job.salaryMin, job.salaryMax)} />
            <Row label="Open positions" value={job.openPositions ?? 1} />
            {timingStart && timingEnd && (
              <Row label="Shift timing" value={`${timingStart} – ${timingEnd}`} />
            )}
            {job.noOfCasesPerMonth != null && (
              <Row label="Cases / month" value={job.noOfCasesPerMonth} />
            )}
            <Row label="Posted on" value={new Date(job.createdAt).toLocaleDateString('en-IN')} />
            {job.expiresAt && (
              <Row label="Expires on" value={new Date(job.expiresAt).toLocaleDateString('en-IN')} />
            )}
          </div>

          {/* Description */}
          {job.description && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Description</p>
              <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>
          )}

          {/* Requirements */}
          {(job.requirements?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Requirements</p>
              <ul className="space-y-1">
                {job.requirements.map((r, i) => (
                  <li key={i} className="text-xs text-text-muted flex gap-2">
                    <span className="text-brand-primary mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Department requirements */}
          {(job.departmentRequirements?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Department Requirements</p>
              <div className="flex flex-wrap gap-1.5">
                {job.departmentRequirements!.map((r) => (
                  <span key={r} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Specializations */}
          {(job.specializations?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Specializations Required</p>
              <div className="flex flex-wrap gap-1.5">
                {job.specializations!.map((s) => (
                  <span key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Required Degree */}
          {job.requiredDegree && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Required Degree</p>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{job.requiredDegree}</span>
            </div>
          )}

          {/* Document link */}
          {job.jobDocumentUrl && (
            <a
              href={job.jobDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View attached document
            </a>
          )}

          {/* Boosted */}
          {job.isBoosted && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium">
              ⚡ This job is boosted
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
