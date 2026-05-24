'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award, Briefcase, Building2, CheckCircle, Clock, Globe, Mail, MapPin,
  Phone, XCircle, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { applicationsApi, type Application } from '../../../lib/api/applications';
import { Button } from '../../../common-components/ui/button';
import { ApplicationState, PaymentKind } from '../../../lib/shared/enums';
import { useRazorpay } from '../../../hooks/use-razorpay';
import { useToast } from '../../../hooks/use-toast';
import { usePublicPricing, formatRupees } from '../../../hooks/use-public-pricing';
import { APPLICATION_FEE_PAISE } from '../../../lib/shared/constants';

// ── Progress steps ─────────────────────────────────────────────────────────────

const STEPS = [
  { key: ApplicationState.INTERESTED, label: 'Applied' },
  { key: ApplicationState.SHORTLISTED, label: 'Shortlisted' },
  { key: ApplicationState.PAID, label: 'Paid' },
  { key: ApplicationState.WON, label: 'Hired' },
];

const STATE_ORDER: Record<ApplicationState, number> = {
  [ApplicationState.INTERESTED]: 0,
  [ApplicationState.SHORTLISTED]: 1,
  [ApplicationState.PAID]: 2,
  [ApplicationState.WON]: 3,
  [ApplicationState.CLOSED]: -1,
};

function ProgressBar({ state }: { state: ApplicationState }) {
  if (state === ApplicationState.CLOSED) return null;
  const current = STATE_ORDER[state];
  return (
    <div className="flex items-center gap-0 mt-4 mb-1">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={step.key} className="flex-1 flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${done || active ? 'bg-brand-primary text-white' : 'bg-bg-page border-2 border-border-default text-text-muted'}`}>
                {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] whitespace-nowrap font-medium ${active ? 'text-brand-primary' : done ? 'text-text-muted' : 'text-text-muted/50'}`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-colors ${done ? 'bg-brand-primary' : 'bg-border-default'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function StateBadge({ state, appFee }: { state: ApplicationState; appFee: number }) {
  const configs: Record<ApplicationState, { label: string; cls: string; icon: React.ElementType }> = {
    [ApplicationState.INTERESTED]: { label: 'Under Review', cls: 'bg-blue-100 text-blue-700', icon: Clock },
    [ApplicationState.SHORTLISTED]: { label: `Shortlisted — Pay ${formatRupees(appFee)}`, cls: 'bg-amber-100 text-amber-700', icon: Clock },
    [ApplicationState.PAID]: { label: 'Paid — Awaiting Interview', cls: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    [ApplicationState.WON]: { label: 'Hired! 🎉', cls: 'bg-green-100 text-green-700', icon: Award },
    [ApplicationState.CLOSED]: { label: 'Closed', cls: 'bg-slate-100 text-slate-500', icon: XCircle },
  };
  const { label, cls, icon: Icon } = configs[state];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Closed reason ─────────────────────────────────────────────────────────────

function ClosedReasonBanner({ reason }: { reason?: string }) {
  const map: Record<string, string> = {
    JOB_FILLED: 'All positions were filled by other candidates.',
    PAY_WINDOW_EXPIRED: 'The 48-hour payment window expired.',
    DECLINED: 'This application was declined by the school.',
  };
  const text = reason ? (map[reason] ?? null) : null;
  if (!text) return null;
  return (
    <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mt-3">
      <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}

// ── Hospital reveal card ───────────────────────────────────────────────────────

function HospitalRevealCard({ hospital }: { hospital: NonNullable<Application['hospital']> }) {
  return (
    <div className="border border-brand-primary/25 rounded-2xl overflow-hidden mt-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-primary/10 to-teal-50 px-4 py-3 flex items-center gap-3 border-b border-brand-primary/15">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {hospital.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">{hospital.name}</span>
            {hospital.isVerified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                <CheckCircle className="w-2.5 h-2.5" /> Verified
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            <MapPin className="w-3 h-3 inline mr-0.5" />
            {hospital.city}, {hospital.state}{hospital.pincode ? ` — ${hospital.pincode}` : ''}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3 text-xs">
        {/* Description */}
        {hospital.description && (
          <p className="text-text-muted leading-relaxed">{hospital.description}</p>
        )}

        {/* School stats */}
        {(hospital.noOfOperationTheatres != null || hospital.noOfCabinsAndBeds != null) && (
          <div className="grid grid-cols-2 gap-2">
            {hospital.noOfOperationTheatres != null && (
              <div className="bg-bg-page rounded-xl px-2.5 py-2 text-center">
                <p className="text-[10px] text-text-muted mb-0.5">Classrooms</p>
                <p className="font-semibold text-text-primary">{hospital.noOfOperationTheatres}</p>
              </div>
            )}
            {hospital.noOfCabinsAndBeds != null && (
              <div className="bg-bg-page rounded-xl px-2.5 py-2 text-center">
                <p className="text-[10px] text-text-muted mb-0.5">Labs</p>
                <p className="font-semibold text-text-primary">{hospital.noOfCabinsAndBeds}</p>
              </div>
            )}
          </div>
        )}

        {/* Address */}
        {hospital.address && (
          <div className="flex items-start gap-1.5 text-text-muted">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{hospital.address}</span>
          </div>
        )}

        {/* Contact */}
        {(hospital.phone || hospital.email || hospital.website) && (
          <div className="border-t border-border-default pt-3 space-y-2">
            <p className="text-[11px] font-semibold text-text-primary uppercase tracking-wide">Contact</p>
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`} className="flex items-center gap-2 text-brand-primary hover:underline font-medium">
                <Phone className="w-3.5 h-3.5 shrink-0" /> {hospital.phone}
              </a>
            )}
            {hospital.email && (
              <a href={`mailto:${hospital.email}`} className="flex items-center gap-2 text-brand-primary hover:underline font-medium">
                <Mail className="w-3.5 h-3.5 shrink-0" /> {hospital.email}
              </a>
            )}
            {hospital.website && (
              <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-primary hover:underline font-medium">
                <Globe className="w-3.5 h-3.5 shrink-0" /> {hospital.website}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Application card ───────────────────────────────────────────────────────────

function ApplicationCard({ app, onPay }: { app: Application; onPay: (app: Application) => void }) {
  const { pricing } = usePublicPricing();
  const appFee = pricing.APPLICATION_FEE_PAISE ?? APPLICATION_FEE_PAISE;
  const isClosed = app.state === ApplicationState.CLOSED;
  const isWon = app.state === ApplicationState.WON;

  const paymentDue = app.state === ApplicationState.SHORTLISTED && app.paymentDueBy
    ? new Date(app.paymentDueBy) : null;
  const hoursLeft = paymentDue
    ? Math.max(0, Math.floor((paymentDue.getTime() - Date.now()) / 3_600_000)) : null;
  const minsLeft = paymentDue
    ? Math.max(0, Math.floor((paymentDue.getTime() - Date.now()) / 60_000) % 60) : null;

  return (
    <div className={`bg-bg-card border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md ${isWon ? 'border-green-200' : isClosed ? 'border-slate-200 opacity-80' : 'border-border-default'}`}>
      {/* Won banner */}
      {isWon && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 flex items-center gap-2">
          <Award className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white">Congratulations — You&apos;re hired!</span>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <Link
              href={`/jobs/${app.job?._id}`}
              className="text-sm font-bold text-text-primary hover:text-brand-primary transition-colors leading-snug inline-flex items-center gap-1 group"
            >
              {app.job?.title ?? 'Job'}
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3 shrink-0" />
              {app.hospital?.name ?? 'School'} · <MapPin className="w-3 h-3 shrink-0" />{app.job?.city}, {app.job?.state}
            </p>
          </div>
          <StateBadge state={app.state} appFee={appFee} />
        </div>

        {/* Job meta tags */}
        <div className="flex flex-wrap gap-1.5 mt-2.5 mb-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            <Briefcase className="w-2.5 h-2.5" />
            Teaching
          </span>
          {app.job?.department && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-page border border-border-default text-text-muted">
              {app.job.department}
            </span>
          )}
          {app.job?.role && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-page border border-border-default text-text-muted">
              {app.job.role}
            </span>
          )}
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-bg-page border border-border-default text-text-muted">
            Applied {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Progress bar (active apps only) */}
        {!isClosed && <ProgressBar state={app.state} />}

        {/* Closed reason */}
        {isClosed && <ClosedReasonBanner reason={app.decisionReason} />}

        {/* Shortlisted payment CTA */}
        {app.state === ApplicationState.SHORTLISTED && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800 mb-1">
                  Payment Required — {formatRupees(appFee)}
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  You&apos;ve been shortlisted! Pay to confirm your interview slot. School contact details (phone, email, address) will be revealed immediately after payment.
                </p>
                {hoursLeft !== null && (
                  <p className="text-xs font-semibold text-amber-800 mt-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {hoursLeft}h {minsLeft}m remaining — window closes in 48h
                  </p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onPay(app)}
              className="bg-amber-600 hover:bg-amber-700 text-white mt-3 w-full sm:w-auto"
            >
              Pay {formatRupees(appFee)} to Confirm →
            </Button>
          </div>
        )}

        {/* Paid state info */}
        {app.state === ApplicationState.PAID && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 mt-3">
            <p className="text-xs text-purple-700 font-medium">
              ✓ Payment confirmed — the school will reach out to schedule your interview.
            </p>
          </div>
        )}

        {/* Hospital reveal (PAID or WON) */}
        {(app.state === ApplicationState.PAID || app.state === ApplicationState.WON) &&
          app.hospitalRevealed && app.hospital && (
          <HospitalRevealCard hospital={app.hospital} />
        )}
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color === 'text-text-primary' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
      <div className="flex-1 h-px bg-border-default" />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const { pay } = useRazorpay();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { pricing } = usePublicPricing();
  const appFee = pricing.APPLICATION_FEE_PAISE ?? APPLICATION_FEE_PAISE;

  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications().then((r) => r.data),
  });

  const handlePay = (app: Application) => {
    pay(
      PaymentKind.APPLICATION,
      app._id,
      'Application fee — confirm your interview',
      () => {
        toast({ title: 'Payment successful!', description: 'School contact details are now revealed.' });
        qc.invalidateQueries({ queryKey: ['my-applications'] });
      },
      () => {
        toast({ title: 'Payment failed', description: 'Please try again.', variant: 'destructive' });
      },
    );
  };

  const active = applications?.filter((a) => ![ApplicationState.CLOSED, ApplicationState.WON].includes(a.state)) ?? [];
  const won = applications?.filter((a) => a.state === ApplicationState.WON) ?? [];
  const closed = applications?.filter((a) => a.state === ApplicationState.CLOSED) ?? [];
  const shortlisted = active.filter((a) => a.state === ApplicationState.SHORTLISTED);
  const total = applications?.length ?? 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Briefcase className="w-5 h-5" /> My Applications
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Track every application and payment in one place</p>
      </div>

      {/* Stats bar */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: total, cls: 'bg-bg-card border-border-default', val: 'text-text-primary' },
            { label: 'Active', value: active.length, cls: 'bg-blue-50 border-blue-200', val: 'text-blue-700' },
            { label: 'Action needed', value: shortlisted.length, cls: shortlisted.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-bg-card border-border-default', val: shortlisted.length > 0 ? 'text-amber-700' : 'text-text-muted' },
            { label: 'Hired', value: won.length, cls: 'bg-green-50 border-green-200', val: 'text-green-700' },
          ].map(({ label, value, cls, val }) => (
            <div key={label} className={`bg-bg-card border rounded-xl p-3 text-center ${cls}`}>
              <p className={`text-xl font-bold ${val}`}>{value}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-bg-card border border-border-default rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !total ? (
        <div className="bg-bg-card border border-border-default rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary-light flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-brand-primary" />
          </div>
          <p className="text-base font-semibold text-text-primary mb-2">No applications yet</p>
          <p className="text-sm text-text-muted max-w-xs mx-auto mb-5">
            Browse jobs and tap &ldquo;I&apos;m Interested&rdquo; to start applying.
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Browse Jobs →
          </Link>
        </div>
      ) : (
        <>
          {/* Active applications */}
          {active.length > 0 && (
            <div>
              <SectionHeader label="Active" count={active.length} color="text-text-primary" />
              <div className="space-y-3">
                {active.map((app) => <ApplicationCard key={app._id} app={app} onPay={handlePay} />)}
              </div>
            </div>
          )}

          {/* Hired */}
          {won.length > 0 && (
            <div>
              <SectionHeader label="Hired 🎉" count={won.length} color="text-green-600" />
              <div className="space-y-3">
                {won.map((app) => <ApplicationCard key={app._id} app={app} onPay={handlePay} />)}
              </div>
            </div>
          )}

          {/* Closed */}
          {closed.length > 0 && (
            <div>
              <SectionHeader label="Closed" count={closed.length} color="text-slate-400" />
              <div className="space-y-3">
                {closed.map((app) => <ApplicationCard key={app._id} app={app} onPay={handlePay} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
