'use client';

import { ExternalLink, Mail, Phone, ShieldCheck } from 'lucide-react';
import type { Application } from '../lib/api/applications';
import { ApplicationState, SalaryRange } from '../lib/shared/enums';
import { SALARY_RANGE_LABELS } from '../lib/shared/constants';
import { enumLabel } from '../lib/utils/enum-options';
import { usePublicSettings } from '../hooks/use-public-settings';
import { usePublicPricing, formatRupees } from '../hooks/use-public-pricing';

const AVAILABILITY_LABELS: Record<string, string> = {
  IMMEDIATE: 'Immediate',
  WITHIN_2_WEEKS: 'Within 2 weeks',
  WITHIN_1_MONTH: 'Within 1 month',
  READY_TO_SERVE_NOTICE: 'Ready to serve notice period',
  NOT_LOOKING: 'Not actively looking',
};

const TIMINGS_LABELS: Record<string, string> = {
  '24_7': '24/7',
  MORNING: 'Morning',
  '9_TO_5': '9 to 5',
  EVENING: 'Evening',
  NIGHT: 'Night',
};

const PRACTICE_LABELS: Record<string, string> = {
  FREELANCE: 'Freelance',
  REGULAR_JOB: 'Regular Job',
  PRIVATE: 'Private',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

function Chips({ items, color = 'brand' }: { items: string[]; color?: 'brand' | 'slate' | 'teal' }) {
  const cls = color === 'brand'
    ? 'bg-brand-primary-light text-brand-primary'
    : color === 'teal'
    ? 'bg-teal-50 text-teal-700'
    : 'bg-slate-100 text-slate-600';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{item}</span>
      ))}
    </div>
  );
}

export function SeekerProfileView({ app, jobType: _jobType }: { app: Application; jobType?: unknown }) {
  const p = app.seeker?.seekerProfile;
  const canSeeContact = app.state === ApplicationState.PAID || app.state === ApplicationState.WON;
  const { settings } = usePublicSettings();
  const teacherPaidEnabled = settings.TEACHER_PAID_ENABLED === 1;
  const { pricing } = usePublicPricing();
  const appFee = pricing.APPLICATION_FEE_PAISE;

  if (!p) {
    return <p className="text-sm text-text-muted text-center py-8">Profile data not available.</p>;
  }

  const name = p.fullName ?? app.seeker?.email ?? 'Candidate';
  const initial = name[0].toUpperCase();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-primary-light flex items-center justify-center text-brand-primary font-bold text-xl shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-text-primary">{name}</h3>
          {p.headline && <p className="text-sm text-text-muted mt-0.5">{p.headline}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-text-muted">
            {(p.city || p.state) && <span>📍 {[p.city, p.state].filter(Boolean).join(', ')}</span>}
            {p.experienceYears != null && <span>📚 {p.experienceYears} yr{p.experienceYears !== 1 ? 's' : ''} exp</span>}
            {p.age && <span>Age {p.age}</span>}
            {p.gender && <span>{p.gender.charAt(0) + p.gender.slice(1).toLowerCase()}</span>}
          </div>
        </div>
        {p.resumeUrl && (
          <a
            href={p.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 text-xs text-brand-primary hover:underline"
          >
            Resume <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Contact — only after payment */}
      {canSeeContact && (
        <div className="bg-brand-primary-light border border-brand-primary/20 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-semibold text-brand-primary mb-2">Contact Details</p>
          {p.whatsappNumber && (
            <a href={`https://wa.me/${p.whatsappNumber.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
              <Phone className="w-3.5 h-3.5 text-brand-primary" /> {p.whatsappNumber} <span className="text-text-muted">(WhatsApp)</span>
            </a>
          )}
          {app.seeker?.phone && (
            <a href={`tel:${app.seeker.phone}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
              <Phone className="w-3.5 h-3.5 text-brand-primary" /> {app.seeker.phone}
            </a>
          )}
          {app.seeker?.email && (
            <a href={`mailto:${app.seeker.email}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
              <Mail className="w-3.5 h-3.5 text-brand-primary" /> {app.seeker.email}
            </a>
          )}
        </div>
      )}

      {!canSeeContact && teacherPaidEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          {app.state === ApplicationState.SHORTLISTED
            ? `Awaiting ${appFee != null ? `${formatRupees(appFee)} ` : ''}confirmation from the candidate. Contact details will be unlocked once they pay.`
            : `Shortlist this candidate to invite them. Contact details unlock after they confirm${appFee != null ? ` with a ${formatRupees(appFee)} deposit` : ''}.`}
        </div>
      )}

      {/* Expertise */}
      {(p.expertise?.length ?? 0) > 0 && (
        <Section title="Expertise / Specialisation">
          <Chips items={p.expertise!.map((s) => enumLabel(s))} color="brand" />
        </Section>
      )}

      {/* Degrees */}
      {(p.degrees?.length ?? 0) > 0 && (
        <Section title="Qualifications">
          <Chips items={p.degrees!} color="teal" />
        </Section>
      )}

      {/* Professional details */}
      <Section title="Professional Details">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {p.employmentType && (
            <div>
              <span className="text-text-muted">Employment: </span>
              <span className="font-medium text-text-primary">{PRACTICE_LABELS[p.employmentType] ?? p.employmentType}</span>
            </div>
          )}
          {p.currentSchool && (
            <div>
              <span className="text-text-muted">Current School: </span>
              <span className="font-medium text-text-primary">{p.currentSchool}</span>
            </div>
          )}
          {p.academics && (
            <div>
              <span className="text-text-muted">Current Post: </span>
              <span className="font-medium text-text-primary">{enumLabel(p.academics)}</span>
            </div>
          )}
          {p.salaryRange && (
            <div>
              <span className="text-text-muted">Salary Range: </span>
              <span className="font-medium text-text-primary">{SALARY_RANGE_LABELS[p.salaryRange as SalaryRange] ?? p.salaryRange}</span>
            </div>
          )}
          {p.availability && (
            <div>
              <span className="text-text-muted">Availability: </span>
              <span className="font-medium text-text-primary">{AVAILABILITY_LABELS[p.availability] ?? p.availability}</span>
            </div>
          )}
          {p.maritalStatus && (
            <div>
              <span className="text-text-muted">Marital status: </span>
              <span className="font-medium text-text-primary">{p.maritalStatus.charAt(0) + p.maritalStatus.slice(1).toLowerCase().replace('_', ' ')}</span>
            </div>
          )}
          {p.pincode && (
            <div>
              <span className="text-text-muted">Pincode: </span>
              <span className="font-medium text-text-primary">{p.pincode}</span>
            </div>
          )}
          <div>
            <span className="text-text-muted">Teaching Council Reg: </span>
            <span className="font-medium text-text-primary">
              {p.isRegisteredWithBoard === true ? 'Yes' : p.isRegisteredWithBoard === false ? 'No' : '—'}
            </span>
          </div>
          {p.isRegisteredWithBoard && p.boardRegistrationName && (
            <div className="col-span-2">
              <span className="text-text-muted">Council / Board: </span>
              <span className="font-medium text-text-primary">{p.boardRegistrationName}</span>
            </div>
          )}
        </div>
      </Section>

      {(p.desiredCities?.length ?? 0) > 0 && (
        <Section title="Preferred Locations">
          <Chips items={p.desiredCities!} color="teal" />
        </Section>
      )}

      {/* Timings */}
      {(p.availableTimings?.length ?? 0) > 0 && (
        <Section title="Available Timings">
          <Chips items={p.availableTimings!.map((t) => TIMINGS_LABELS[t] ?? t)} color="slate" />
        </Section>
      )}

      {/* Interested to Cover */}
      {(p.interestedToCover?.length ?? 0) > 0 && (
        <Section title="Subjects Willing to Cover">
          <Chips items={p.interestedToCover!.map((s) => enumLabel(s))} color="slate" />
        </Section>
      )}

      {/* Skills */}
      {(p.skills?.length ?? 0) > 0 && (
        <Section title="Skills">
          <Chips items={p.skills!} color="slate" />
        </Section>
      )}

      {/* Bio */}
      {p.bio && (
        <Section title="Bio">
          <p className="text-xs text-text-muted leading-relaxed">{p.bio}</p>
        </Section>
      )}

      {p.indemnityInsurance === true && (
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span className="text-green-700 font-medium">Has professional liability coverage</span>
        </div>
      )}
    </div>
  );
}
