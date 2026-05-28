'use client';

import Link from 'next/link';
import { ArrowRight, Briefcase, CheckCircle, Infinity } from 'lucide-react';
import { usePublicPricing, formatRupees } from '../../hooks/use-public-pricing';
import {
  RECRUITER_MONTHLY_PAISE,
  APPLICATION_FEE_PAISE,
  FREE_TIER_JOB_LIMIT,
} from '../../lib/shared/constants';

export default function PricingPage() {
  const { pricing } = usePublicPricing();
  const subMo = pricing.RECRUITER_MONTHLY_PAISE ?? RECRUITER_MONTHLY_PAISE;
  const appFee = pricing.APPLICATION_FEE_PAISE ?? APPLICATION_FEE_PAISE;
  const freeLimit = pricing.FREE_TIER_JOB_LIMIT ?? FREE_TIER_JOB_LIMIT;

  return (
    <div className="flex flex-col min-h-screen">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-brand-header/95 backdrop-blur-md text-white px-6 h-16 flex items-center border-b border-white/5 shadow-lg">
        <Link href="/" className="flex items-center gap-1 flex-1">
          <span className="text-xl font-bold" style={{ color: '#7986cb' }}>School</span>
          <span className="text-xl font-bold">Teacher</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 mr-6">
          <Link href="/jobs" className="text-sm text-slate-300 hover:text-white transition-colors">Browse Jobs</Link>
          <Link href="/pricing" className="text-sm text-white font-medium transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">Sign in</Link>
          <Link href="/register" className="text-sm bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg transition-colors font-medium">
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-brand-header text-white py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="font-semibold text-sm uppercase tracking-widest mb-3" style={{ color: '#7986cb' }}>Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto mb-8">
            No hidden fees. No commissions. Free for teachers, flat rates for schools.
          </p>
          <div className="inline-flex items-center gap-3 rounded-2xl px-6 py-4 text-left"
               style={{ background: 'rgba(57,73,171,0.25)', border: '1px solid rgba(121,134,203,0.4)' }}>
            <CheckCircle className="w-5 h-5 shrink-0" style={{ color: '#7986cb' }} />
            <div>
              <p className="text-sm font-black text-white">Teachers always apply for free</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>No subscription needed — just build your profile and apply</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Teachers */}
      <section className="py-20 px-6 bg-bg-page">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary mb-2">For Teachers</h2>
          <p className="text-text-muted mb-10">Free to join. Pay only when you&apos;re shortlisted and choose to proceed.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free tier */}
            <div className="bg-bg-card border border-border-default rounded-2xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-text-primary">Free</h3>
                <span className="text-3xl font-bold text-text-primary">₹0</span>
              </div>
              <p className="text-text-muted text-sm mb-6">Everything you need to land your next teaching role</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Create your profile & upload resume',
                  'Browse all teaching job listings',
                  'Apply to unlimited teaching jobs',
                  'Set job alerts by location & subject',
                  'Upload certifications & intro video',
                  'Track applications dashboard',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-text-muted">
                    <CheckCircle className="w-4 h-4 text-brand-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=JOB_SEEKER"
                className="block w-full text-center bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Get started free
              </Link>
            </div>

            {/* Shortlist fee */}
            <div className="bg-brand-primary-light border border-brand-primary/20 rounded-2xl p-8">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-5 h-5 text-brand-primary" />
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-2">Pay only after shortlist</h3>
              <p className="text-text-muted text-sm leading-relaxed mb-4">
                When a school shortlists you, you&apos;ll be notified.
                You choose whether to proceed — and only then pay the small confirmation fee.
              </p>
              <div className="bg-white rounded-xl p-4 mb-4">
                <p className="text-2xl font-bold text-text-primary">{formatRupees(appFee)} <span className="text-sm font-normal text-text-muted">per application</span></p>
                <p className="text-xs text-text-muted mt-0.5">Charged only after school shortlists you</p>
              </div>
              <ul className="space-y-2 text-sm text-text-muted">
                {[
                  'Unlocks school contact details (phone, email, address)',
                  'Confirms your interest to the school',
                  '48-hour window to decide — no pressure',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* For Schools */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary mb-2">For Schools</h2>
          <p className="text-text-muted mb-10">Start free. Scale when you need to hire more.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free tier */}
            <div className="bg-bg-card border border-border-default rounded-2xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center mb-4">
                <Briefcase className="w-5 h-5 text-brand-primary" />
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-1">Free Tier</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-text-primary">₹0</span>
              </div>
              <p className="text-xs text-text-muted mb-6">{freeLimit} free job postings per month</p>
              <ul className="space-y-2.5 mb-8">
                {[
                  `Post up to ${freeLimit} teaching jobs per month`,
                  'Admin-verified school badge',
                  'Teacher applications in your dashboard',
                  'Shortlist, chat & mark hired',
                  'School profile with logo & photos',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=RECRUITER"
                className="block w-full text-center bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Start free
              </Link>
            </div>

            {/* Unlimited */}
            <div className="relative bg-bg-card border-2 border-brand-primary/30 rounded-2xl p-8 shadow-md">
              <div className="absolute -top-3 left-6">
                <span className="bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center mb-4 mt-2">
                <Infinity className="w-5 h-5 text-brand-primary" />
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-1">Unlimited Plan</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-text-primary">{formatRupees(subMo)}</span>
                <span className="text-text-muted text-sm">/month</span>
              </div>
              <p className="text-xs text-text-muted mb-6">Unlimited job postings for 30 days</p>
              <ul className="space-y-2.5 mb-8">
                {[
                  'Unlimited teaching job postings',
                  'Priority listing in teacher search',
                  'All roles: SGT, PGT, TGT, HM, Principal',
                  'Direct chat with shortlisted teachers',
                  'Admin-verified school badge',
                  'Cancel anytime',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register?role=RECRUITER"
                className="block w-full text-center bg-brand-primary hover:bg-brand-primary-dark text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Subscribe now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-bg-page">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Is SchoolTeacher really free for teachers?',
                a: 'Yes — completely free to create a profile, browse all listings, and apply to unlimited jobs. You only pay a small confirmation fee after a school shortlists you and you choose to proceed.',
              },
              {
                q: 'When exactly do I pay the confirmation fee as a teacher?',
                a: `Only after a school shortlists you. You receive a notification, review the opportunity, and choose whether to pay ${formatRupees(appFee)} within 48 hours to confirm your interest and unlock the school's contact details. If you don't pay in 48 hours, the application auto-closes.`,
              },
              {
                q: 'What are the free job posting limits for schools?',
                a: `Schools get ${freeLimit} free job postings per month. After that, subscribe to the Unlimited Plan at ${formatRupees(subMo)}/month for unlimited postings.`,
              },
              {
                q: 'What job roles can schools post?',
                a: 'All teaching roles: SGT, TGT, PGT, Pre-Primary Teacher, Head Master, Principal, Vice Principal, Special Educator, Lab Assistant, Librarian, Counselor, and more.',
              },
              {
                q: 'Is payment processed securely?',
                a: "All payments are processed via Razorpay — India's leading payment gateway. We support UPI, cards, and netbanking. We never store card details.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-bg-card border border-border-default rounded-xl p-6">
                <h3 className="font-semibold text-text-primary mb-2 text-sm">{q}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-brand-primary text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
        <p className="text-blue-100 mb-8 max-w-md mx-auto text-sm">
          Free for teachers. {freeLimit} free posts for schools. No hidden fees.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register?role=JOB_SEEKER"
            className="inline-flex items-center gap-2 justify-center bg-white text-brand-primary font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Find teaching jobs — free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register?role=RECRUITER"
            className="inline-flex items-center gap-2 justify-center bg-brand-primary-dark text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-colors border border-brand-primary/50"
          >
            Hire teachers <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-[#080f18] text-slate-500 py-6 px-6 text-center text-xs">
        © {new Date().getFullYear()} SchoolTeacher · Teacher Hiring Platform · India
      </footer>
    </div>
  );
}
