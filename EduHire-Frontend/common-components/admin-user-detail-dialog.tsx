'use client';

import { ExternalLink, Mail, Phone, ShieldCheck } from 'lucide-react';
import type { AdminUser } from '../lib/api/admin';
import { SalaryRange, Role } from '../lib/shared/enums';
import { SALARY_RANGE_LABELS } from '../lib/shared/constants';
import { enumLabel } from '../lib/utils/enum-options';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

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

function roleLabel(role: string) {
  if (role === 'TEACHER') return 'Teacher';
  if (role === 'RECRUITER') return 'School';
  return 'Admin';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

function Chips({ items, color = 'brand' }: { items: string[]; color?: 'brand' | 'slate' | 'teal' }) {
  const cls =
    color === 'brand'
      ? 'bg-brand-primary-light text-brand-primary'
      : color === 'teal'
      ? 'bg-teal-50 text-teal-700'
      : 'bg-slate-100 text-slate-600';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function SeekerView({ user }: { user: AdminUser }) {
  const p = user.seekerProfile;
  if (!p) return <p className="text-sm text-text-muted text-center py-6">No seeker profile yet.</p>;

  const name = p.fullName ?? user.email ?? 'Candidate';
  const initial = name[0].toUpperCase();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-primary-light flex items-center justify-center text-brand-primary font-bold text-lg shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-text-primary">{name}</h3>
          {p.headline && <p className="text-sm text-text-muted mt-0.5">{p.headline}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-text-muted">
            {(p.city || p.state) && <span>📍 {[p.city, p.state].filter(Boolean).join(', ')}</span>}
            {p.experienceYears != null && <span>🧑‍⚕️ {p.experienceYears} yr{p.experienceYears !== 1 ? 's' : ''} exp</span>}
            {p.age && <span>Age {p.age}</span>}
            {p.gender && <span>{p.gender.charAt(0) + p.gender.slice(1).toLowerCase()}</span>}
          </div>
        </div>
        {p.resumeUrl && (
          <a href={p.resumeUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 text-xs text-brand-primary hover:underline">
            Resume <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Contact — always visible to admin */}
      <div className="bg-brand-primary-light border border-brand-primary/20 rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-semibold text-brand-primary mb-1.5">Contact Details</p>
        {p.whatsappNumber && (
          <a href={`https://wa.me/${p.whatsappNumber.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
            <Phone className="w-3.5 h-3.5 text-brand-primary" /> {p.whatsappNumber} <span className="text-text-muted">(WhatsApp)</span>
          </a>
        )}
        {user.phone && (
          <a href={`tel:${user.phone}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
            <Phone className="w-3.5 h-3.5 text-brand-primary" /> {user.phone}
          </a>
        )}
        {user.email && (
          <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
            <Mail className="w-3.5 h-3.5 text-brand-primary" /> {user.email}
          </a>
        )}
      </div>

      {(p.expertise?.length ?? 0) > 0 && (
        <Section title="Expertise / Specialisation"><Chips items={p.expertise!.map((s) => enumLabel(s))} color="brand" /></Section>
      )}
      {(p.degrees?.length ?? 0) > 0 && (
        <Section title="Qualifications"><Chips items={p.degrees!} color="teal" /></Section>
      )}

      <Section title="Professional Details">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {p.employmentType && (
            <div><span className="text-text-muted">Employment: </span><span className="font-medium text-text-primary">{PRACTICE_LABELS[p.employmentType] ?? p.employmentType}</span></div>
          )}
          {p.currentSchool && (
            <div><span className="text-text-muted">Current School: </span><span className="font-medium text-text-primary">{p.currentSchool}</span></div>
          )}
          {p.academics && (
            <div><span className="text-text-muted">Current Post: </span><span className="font-medium text-text-primary">{enumLabel(p.academics)}</span></div>
          )}
          {p.salaryRange && (
            <div><span className="text-text-muted">Salary Range: </span><span className="font-medium text-text-primary">{SALARY_RANGE_LABELS[p.salaryRange as SalaryRange] ?? p.salaryRange}</span></div>
          )}
          {p.availability && (
            <div><span className="text-text-muted">Availability: </span><span className="font-medium text-text-primary">{AVAILABILITY_LABELS[p.availability] ?? p.availability}</span></div>
          )}
          {p.maritalStatus && (
            <div><span className="text-text-muted">Marital: </span><span className="font-medium text-text-primary">{p.maritalStatus.charAt(0) + p.maritalStatus.slice(1).toLowerCase().replace('_', ' ')}</span></div>
          )}
          {p.pincode && (
            <div><span className="text-text-muted">Pincode: </span><span className="font-medium text-text-primary">{p.pincode}</span></div>
          )}
          <div>
            <span className="text-text-muted">Board Registration: </span>
            <span className="font-medium text-text-primary">
              {p.isRegisteredWithBoard === true ? 'Yes' : p.isRegisteredWithBoard === false ? 'No' : '—'}
            </span>
          </div>
          {p.isRegisteredWithBoard && p.boardRegistrationName && (
            <div className="col-span-2"><span className="text-text-muted">Board Name: </span><span className="font-medium text-text-primary">{p.boardRegistrationName}</span></div>
          )}
        </div>
      </Section>

      {(p.desiredCities?.length ?? 0) > 0 && (
        <Section title="Preferred Locations"><Chips items={p.desiredCities!} color="teal" /></Section>
      )}

      {(p.availableTimings?.length ?? 0) > 0 && (
        <Section title="Available Timings"><Chips items={p.availableTimings!.map((t) => TIMINGS_LABELS[t] ?? t)} color="slate" /></Section>
      )}
      {(p.interestedToCover?.length ?? 0) > 0 && (
        <Section title="Subjects Willing to Cover"><Chips items={p.interestedToCover!.map((s) => enumLabel(s))} color="slate" /></Section>
      )}
      {(p.skills?.length ?? 0) > 0 && (
        <Section title="Skills"><Chips items={p.skills!} color="slate" /></Section>
      )}
      {p.bio && (
        <Section title="Bio"><p className="text-xs text-text-muted leading-relaxed">{p.bio}</p></Section>
      )}
      {p.indemnityInsurance === true && (
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <span className="text-green-700 font-medium">Has professional liability coverage</span>
        </div>
      )}

      {((p.certUrls?.length ?? 0) > 0 || p.resumeUrl) && (
        <Section title="Documents">
          <div className="space-y-1.5">
            {p.resumeUrl && (
              <a href={p.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Resume
              </a>
            )}
            {p.certUrls?.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Certificate {i + 1}
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function RecruiterView({ user }: { user: AdminUser }) {
  const p = user.recruiterProfile;
  const name = p?.fullName ?? user.email ?? 'Recruiter';
  const initial = name[0].toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
          {initial}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-text-primary">{name}</h3>
          <p className="text-xs text-text-muted mt-0.5">Recruiter</p>
        </div>
      </div>

      <div className="bg-bg-page border border-border-default rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-semibold text-text-muted mb-1.5">Contact Details</p>
        {user.phone && (
          <a href={`tel:${user.phone}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
            <Phone className="w-3.5 h-3.5 text-text-muted" /> {user.phone}
          </a>
        )}
        {user.email && (
          <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-xs text-text-primary hover:text-brand-primary">
            <Mail className="w-3.5 h-3.5 text-text-muted" /> {user.email}
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-bg-page border border-border-default rounded-lg p-3">
          <p className="text-text-muted mb-0.5">Email verified</p>
          <p className="font-medium text-text-primary">{user.emailVerified ? 'Yes' : 'No'}</p>
        </div>
        <div className="bg-bg-page border border-border-default rounded-lg p-3">
          <p className="text-text-muted mb-0.5">School</p>
          <p className="font-medium text-text-primary truncate">
            {p?.schoolName ?? (p?.schoolId ? 'Linked (name unavailable)' : 'Not linked')}
          </p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
}

export function AdminUserDetailDialog({ user, onOpenChange }: Props) {
  if (!user) return null;

  const isSeeker = user.role === Role.TEACHER;
  const title = isSeeker
    ? (user.seekerProfile?.fullName ?? user.email ?? 'Teacher Profile')
    : (user.recruiterProfile?.fullName ?? user.email ?? 'School Profile');

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-bg-card border border-border-default">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-text-primary">{title}</DialogTitle>
        </DialogHeader>

        {/* Account Info */}
        <div className="bg-bg-page border border-border-default rounded-xl p-4 mb-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Account Info</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {user.email && <div><span className="text-text-muted">Email: </span><span className="font-medium text-text-primary">{user.email}</span></div>}
            {user.phone && <div><span className="text-text-muted">Phone: </span><span className="font-medium text-text-primary">{user.phone}</span></div>}
            <div>
              <span className="text-text-muted">Role: </span>
              <span className={`font-medium px-1.5 py-0.5 rounded-full text-[11px] ${
                user.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
                user.role === Role.RECRUITER ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
              }`}>{roleLabel(user.role)}</span>
            </div>
            <div>
              <span className="text-text-muted">Status: </span>
              <span className={`font-medium ${user.isActive === false ? 'text-red-500' : 'text-green-600'}`}>
                {user.isActive === false ? 'Suspended' : 'Active'}
              </span>
            </div>
            <div><span className="text-text-muted">Email verified: </span><span className="font-medium text-text-primary">{user.emailVerified ? 'Yes' : 'No'}</span></div>
            <div><span className="text-text-muted">Joined: </span><span className="font-medium text-text-primary">{new Date(user.createdAt).toLocaleDateString('en-IN')}</span></div>
          </div>
        </div>

        {isSeeker ? <SeekerView user={user} /> : <RecruiterView user={user} />}
      </DialogContent>
    </Dialog>
  );
}
