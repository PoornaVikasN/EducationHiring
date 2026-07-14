'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  Globe,
  GraduationCap,
  MapPin,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  Video,
  Zap,
} from 'lucide-react';
import { SiteHeader } from '../common-components/site-header';
import { ScrollToTop } from '../common-components/scroll-to-top';
import { LandingReveal } from '../common-components/landing-reveal';
import { usePublicPricing, formatRupees } from '../hooks/use-public-pricing';

// ── Testimonial data ──────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { quote: "Found a Maths PGT role in Banjara Hills within a week. The location filter is exactly what every teacher portal was missing.", name: "Lakshmi Reddy", role: "PGT Mathematics", school: "Hyderabad CBSE", initials: "LR", color: '#3949ab' },
  { quote: "Posted our SGT vacancy on Monday, had 9 shortlisted applicants by Wednesday. Admin review builds real trust with candidates.", name: "Ravi Shankar", role: "Principal", school: "Visakhapatnam CBSE School", initials: "RS", color: '#0891b2' },
  { quote: "The intro video feature is a game changer. We assessed 4 Telugu medium teachers before even scheduling interviews.", name: "Sunitha Varma", role: "HR Head", school: "Secunderabad ICSE School", initials: "SV", color: '#7c3aed' },
  { quote: "Transferred from Vijayawada to Hyderabad and found a Primary role near Kondapur in 8 days. Location radius filter is perfect.", name: "Arjun Rao", role: "Primary Teacher", school: "Hyderabad", initials: "AR", color: '#3949ab' },
  { quote: "Being completely free for teachers is huge. I applied to 15 schools across Telangana without spending a rupee.", name: "Padmavathi Reddy", role: "Correspondent", school: "Nellore English Medium", initials: "PR", color: '#0891b2' },
  { quote: "The international section connected me with a CBSE school in Dubai. Now teaching in UAE thanks to SchoolTeacher.", name: "Annapurna Krishna", role: "PGT Science", school: "Dubai (ex-Hyderabad)", initials: "AK", color: '#7c3aed' },
];

// ── Steps data ────────────────────────────────────────────────────────────────
const TEACHER_STEPS = [
  { num: '01', title: 'Build your profile', desc: 'Add subjects, qualifications, intro video & location in 5 minutes.' },
  { num: '02', title: 'Browse & filter', desc: 'Filter by subject, role type, city radius, and board.' },
  { num: '03', title: 'One-click apply', desc: 'Express interest instantly. No forms, no cover letters.' },
  { num: '04', title: 'Chat & get hired', desc: 'Connect directly once a school shortlists you.' },
];

const SCHOOL_STEPS = [
  { num: '01', title: 'Complete school profile', desc: 'Add details, logo and get verified by our admin team.' },
  { num: '02', title: 'Post a job (2 free/mo)', desc: 'List your opening in minutes. Admin reviews & approves.' },
  { num: '03', title: 'Search & shortlist', desc: 'Browse verified teacher profiles with intro videos.' },
  { num: '04', title: 'Shortlist & chat', desc: 'Connect directly with your shortlisted candidates.' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { pricing } = usePublicPricing();
  const recruitMonthly = pricing.RECRUITER_MONTHLY_PAISE;
  const appFee = pricing.APPLICATION_FEE_PAISE;

  const [heroMode, setHeroMode] = useState<'teacher' | 'school'>('teacher');
  const [audience, setAudience] = useState<'teacher' | 'school'>('teacher');
  const steps = audience === 'teacher' ? TEACHER_STEPS : SCHOOL_STEPS;

  const HERO_COPY = {
    teacher: {
      headlineLead: 'Find the teaching role',
      headlineHighlight: 'you were meant for.',
      gradient: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
      subtext: 'Verified schools, real classrooms, zero fees. Build your profile and get discovered.',
      ctaLabel: 'Create your free profile',
      ctaHref: '/register?role=TEACHER',
    },
    school: {
      headlineLead: 'Hire great teachers,',
      headlineHighlight: 'faster than ever.',
      gradient: 'linear-gradient(90deg, #818cf8, #6366f1)',
      subtext: 'Reach verified teachers across India and abroad. Post a role in minutes, shortlist with confidence.',
      ctaLabel: 'Post your first job',
      ctaHref: '/register?role=RECRUITER',
    },
  } as const;
  const hero = HERO_COPY[heroMode];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-white">
      <LandingReveal />
      <SiteHeader barOpen={false} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      {/* Hero height is intentionally shorter on mobile: this image is landscape-oriented, so
          object-fit:cover inside a full 100svh portrait viewport forces a very high scale factor
          (driven by the height side) and crops most of the frame's width away — a heavy "zoomed
          in" look. Shrinking min-height on narrow screens reduces that forced scale factor, which
          shows noticeably more of the photo (a "zoomed out" look) without needing a second image
          or a different crop — content still anchors to the bottom via items-end regardless. */}
      <section className="relative flex items-end overflow-hidden min-h-[78svh] sm:min-h-[88svh] md:min-h-[100svh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.pexels.com/photos/8617542/pexels-photo-8617542.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Teacher engaging with students in a classroom"
          className="absolute inset-0 w-full h-full object-cover object-[center_25%] sm:object-[center_30%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.18) 38%, rgba(0,0,0,0.72) 75%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-28 sm:pt-32 md:pt-40 pb-12 sm:pb-16 md:pb-24">
          <div style={{ maxWidth: 620 }}>
            {/* Audience toggle */}
            <div className="hero-anim hero-delay-0 inline-flex rounded-full p-1 mb-5 sm:mb-6"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', backdropFilter: 'blur(8px)' }}>
              <button onClick={() => setHeroMode('teacher')}
                className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200"
                style={heroMode === 'teacher'
                  ? { background: '#3949ab', color: '#fff', boxShadow: '0 2px 10px rgba(57,73,171,0.50)' }
                  : { color: 'rgba(255,255,255,0.65)', background: 'transparent' }}>
                For Teachers
              </button>
              <button onClick={() => setHeroMode('school')}
                className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200"
                style={heroMode === 'school'
                  ? { background: '#f59e0b', color: '#fff', boxShadow: '0 2px 10px rgba(245,158,11,0.50)' }
                  : { color: 'rgba(255,255,255,0.65)', background: 'transparent' }}>
                For Schools
              </button>
            </div>

            {/* Badge row */}
            <div className="hero-anim hero-delay-0 flex flex-wrap gap-2 mb-5 sm:mb-6">
              {['Verified Schools', 'Free for Teachers'].map((badge) => (
                <span key={badge} className="text-[10px] sm:text-[11px] font-semibold px-2.5 sm:px-3 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}>
                  {badge}
                </span>
              ))}
            </div>

            {/* Headline */}
            <h1 className="hero-anim hero-delay-1 font-black leading-tight tracking-tight mb-4 sm:mb-5 text-white"
              style={{ fontSize: 'clamp(2.1rem, 8vw, 4.4rem)' }}>
              {hero.headlineLead}{' '}
              <span key={heroMode} style={{
                background: hero.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
              }}>
                {hero.headlineHighlight}
              </span>
            </h1>

            {/* Sub-copy */}
            <p className="hero-anim hero-delay-2 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base"
              style={{ color: 'rgba(255,255,255,0.88)', maxWidth: 520 }}>
              {hero.subtext}
            </p>

            {/* CTAs */}
            <div className="hero-anim hero-delay-3 flex flex-wrap items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
              <Link
                key={heroMode}
                href={hero.ctaHref}
                className="btn-glow inline-flex items-center gap-2 font-bold px-6 py-3 sm:px-9 sm:py-4 rounded-xl text-white text-sm sm:text-base"
                style={{
                  background: heroMode === 'teacher' ? 'linear-gradient(135deg, #3949ab, #5c6bc0)' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                  boxShadow: heroMode === 'teacher' ? '0 4px 20px rgba(57,73,171,0.55)' : '0 4px 20px rgba(245,158,11,0.55)',
                }}>
                {hero.ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm transition-colors"
                style={{ border: '1.5px solid rgba(255,255,255,0.28)', color: '#ffffff', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)' }}>
                See how it works
              </a>
            </div>

            {/* Value pills */}
            <div className="hero-anim hero-delay-4 flex flex-wrap items-center gap-2">
              {[
                'Free for teachers, forever',
                'Admin-verified schools only',
                'Direct chat with schools',
              ].map((chip) => (
                <span
                  key={chip}
                  className="text-[10px] sm:text-[11px] font-semibold px-2.5 sm:px-3 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST MARQUEE STRIP ──────────────────────────────────────────────── */}
      <div style={{ background: '#0d1b2a', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4 sm:gap-6">
          <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Schools using SchoolTeacher:
          </span>
          <div className="marquee-track flex-1">
            <div className="animate-marquee-fast flex gap-8 items-center">
              {[...Array(2)].flatMap((_, copyIdx) =>
                ['CBSE Schools', 'ICSE Boards', 'IB World Schools', 'State Govt Schools',
                  'Private Ed-Tech', 'Coaching Institutes', 'International Schools',
                  'Colleges & Universities', 'Pre-Primary Schools'].map((name, i) => (
                  <span key={`${copyIdx}-${name}-${i}`} className="flex-shrink-0 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>
                    {name}
                    <span className="ml-8" style={{ color: '#f59e0b' }}>·</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BENTO GRID ───────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 md:py-24 px-4 sm:px-6" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Why School Teacher</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)', color: '#0f172a', lineHeight: 1.1 }}>
              Everything you need.
            </h2>
            <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: '#64748b' }}>
              Built for how hiring actually works — not a form dump.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Row 1 — Cell A: Chat (wide) */}
            <div className="will-reveal-scale lg:col-span-2 rounded-3xl p-6 sm:p-8 relative overflow-hidden"
              style={{ background: '#0d1b2a', minHeight: 220 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold mb-4"
                style={{ background: 'rgba(57,73,171,0.30)', color: '#9fa8da', border: '1px solid rgba(121,134,203,0.25)' }}>
                <MessageSquare className="w-3.5 h-3.5" />
                Real-time Chat
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Chat directly, no middlemen</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8', maxWidth: 340 }}>
                Once a school shortlists you, message them directly — no recruiters, no back-and-forth over email.
              </p>
            </div>

            {/* Row 1 — Cell B: Free (narrow) */}
            <div className="will-reveal-scale reveal-delay-1 rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
              style={{ background: '#f0f4ff', border: '2px solid #c5cae9', minHeight: 220 }}>
              <div>
                <p className="text-5xl sm:text-6xl md:text-7xl font-black leading-none mb-1" style={{ color: '#3949ab' }}>₹0</p>
                <p className="font-bold text-base mb-1" style={{ color: '#0f172a' }}>Cost for teachers</p>
                <p className="text-sm" style={{ color: '#64748b' }}>Forever free. No hidden fees.</p>
              </div>
              <ul className="space-y-1.5 mt-4">
                {['Unlimited applies', 'Full profile + video', 'Chat after match'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs font-medium" style={{ color: '#3949ab' }}>
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Row 2 — Cell C: Video (narrow) */}
            <div className="will-reveal-scale reveal-delay-2 rounded-3xl p-6 sm:p-7"
              style={{ background: '#ffffff', border: '1px solid #e8edf5', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Video className="w-6 h-6" style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: '#0f172a' }}>Intro video profiles</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                Record a 60-second intro so schools get a real sense of who you are before the first interview.
              </p>
            </div>

            {/* Row 2 — Cell D: Verified (wide) */}
            <div className="will-reveal-scale reveal-delay-1 lg:col-span-2 rounded-3xl p-6 sm:p-8 relative overflow-hidden"
              style={{ background: '#0d1b2a', minHeight: 200 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold mb-4"
                style={{ background: 'rgba(5,150,105,0.25)', color: '#6ee7b7', border: '1px solid rgba(6,78,59,0.3)' }}>
                <Shield className="w-3.5 h-3.5" />
                Admin-Verified
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Every school admin-verified.</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8', maxWidth: 360 }}>
                Our team reviews every school before they can post a job. Zero fake listings, zero spam — ever.
              </p>
              {/* Verified badge mockup — in normal flow on mobile (avoids overlapping the paragraph
                  above when it wraps to 3+ lines on narrow widths), absolutely pinned bottom-right on
                  larger screens where the fixed minHeight guarantees clearance */}
              <div className="mt-5 sm:mt-0 sm:absolute sm:bottom-6 sm:right-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.35)' }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>Verified School ✓</span>
              </div>
            </div>

            {/* Row 3 — 3 equal cells */}
            <div className="will-reveal-scale reveal-delay-1 rounded-3xl p-6 sm:p-7"
              style={{ background: '#fff8e1', border: '1px solid #fde68a' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(245,158,11,0.15)' }}>
                <MapPin className="w-5 h-5" style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="font-bold text-sm mb-1.5" style={{ color: '#0f172a' }}>Location-smart matching</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>Filter by city, distance radius, or state and country. Find exactly what&apos;s near you.</p>
            </div>

            <div className="will-reveal-scale reveal-delay-2 rounded-3xl p-6 sm:p-7"
              style={{ background: '#ffffff', border: '1px solid #e8edf5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(57,73,171,0.10)' }}>
                <Zap className="w-5 h-5" style={{ color: '#3949ab' }} />
              </div>
              <h3 className="font-bold text-sm mb-1.5" style={{ color: '#0f172a' }}>One-click apply</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>Express interest in one tap — no forms, no cover letters.</p>
            </div>

            <div className="will-reveal-scale reveal-delay-3 rounded-3xl p-6 sm:p-7"
              style={{ background: '#e8f5e9', border: '1px solid #a7f3d0' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(5,150,105,0.12)' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
              </div>
              <h3 className="font-bold text-sm mb-1.5" style={{ color: '#0f172a' }}>48h avg. shortlist</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>Most schools respond within 2 working days of receiving an application.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — TAB SWITCHER ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-14 sm:py-16 md:py-24 px-4 sm:px-6" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-10 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>How it works</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.8rem)', color: '#0f172a', lineHeight: 1.15 }}>
              Two journeys. One platform.
            </h2>
            <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: '#64748b' }}>
              Whether you&apos;re looking for a role or filling one — it&apos;s built for both.
            </p>
          </div>

          {/* Tab pills */}
          <div className="flex justify-center gap-2 mb-9 sm:mb-12 will-reveal">
            {(['teacher', 'school'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAudience(tab)}
                className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200"
                style={audience === tab
                  ? { background: '#3949ab', color: '#ffffff', boxShadow: '0 4px 16px rgba(57,73,171,0.30)' }
                  : { background: 'transparent', color: '#64748b', border: '1.5px solid #e2e8f0' }
                }
              >
                {tab === 'teacher' ? 'For Teachers' : 'For Schools'}
              </button>
            ))}
          </div>

          {/* Horizontal stepper */}
          <div className="will-reveal">
            {/* Desktop stepper */}
            <div className="hidden md:flex items-start gap-0">
              {steps.map((step, idx) => (
                <div key={step.num} className="flex-1 flex items-start">
                  <div className="flex-1 flex flex-col items-center text-center px-2">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black text-white mb-3 flex-shrink-0"
                      style={{ background: audience === 'teacher' ? 'linear-gradient(135deg, #3949ab, #5c6bc0)' : 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: audience === 'teacher' ? '0 4px 14px rgba(57,73,171,0.35)' : '0 4px 14px rgba(245,158,11,0.35)' }}>
                      {step.num}
                    </div>
                    <p className="text-sm font-bold mb-1.5" style={{ color: '#0f172a' }}>{step.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#64748b', maxWidth: 140 }}>{step.desc}</p>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="flex-shrink-0 mt-5 flex-1 max-w-[48px]"
                      style={{ borderTop: '2px dashed #e2e8f0', alignSelf: 'start' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile stepper */}
            <div className="md:hidden space-y-6 pl-2">
              {steps.map((step, idx) => (
                <div key={step.num} className="flex items-start gap-4 relative">
                  {idx < steps.length - 1 && (
                    <div className="absolute left-5 top-11 bottom-0 w-0.5" style={{ background: '#e2e8f0' }} />
                  )}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: audience === 'teacher' ? 'linear-gradient(135deg, #3949ab, #5c6bc0)' : 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                    {step.num}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-bold mb-0.5" style={{ color: '#0f172a' }}>{step.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audience-aware CTA */}
          <div className="mt-12 flex justify-center will-reveal">
            {audience === 'teacher' ? (
              <Link href="/register?role=TEACHER"
                className="btn-glow inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 4px 20px rgba(57,73,171,0.35)' }}>
                Join as Teacher — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link href="/register?role=RECRUITER"
                className="btn-glow inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}>
                Post Your First Job
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── STATS — GIANT NUMBERS ────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1a237e 60%, #0d1b2a 100%)', borderTop: '1px solid rgba(121,134,203,0.20)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-4">
            {[
              { stat: '₹0', label: 'Free for teachers', accent: '#f59e0b' },
              { stat: '48h', label: 'Avg. shortlist response', accent: '#7986cb' },
              { stat: '100%', label: 'Verified school listings', accent: '#7986cb' },
              { stat: '2+', label: 'Post Vacancies for free', accent: '#f59e0b' },
            ].map(({ stat, label, accent }, idx) => (
              <div key={label} className={`will-reveal reveal-delay-${idx + 1} flex flex-col items-center text-center`}>
                <p className="font-black leading-none mb-2 sm:mb-3" style={{
                  fontSize: 'clamp(2.25rem, 9vw, 5.5rem)',
                  background: `linear-gradient(135deg, ${accent}, #ffffff)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {stat}
                </p>
                <div className="w-8 h-0.5 rounded-full mb-2 sm:mb-3" style={{ background: accent }} />
                <p className="text-xs sm:text-sm leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS EXPLORER ────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 md:py-20 px-4 sm:px-6" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-9 sm:mb-12 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Explore Roles</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', color: '#0f172a', lineHeight: 1.15 }}>
              Find your match.
            </h2>
            <p className="text-sm sm:text-base" style={{ color: '#64748b' }}>Every subject. Every role. Every level.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 will-reveal">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
                  style={{ background: '#e8eaf6', color: '#3949ab' }}>Teaching Roles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['SGT', 'PGT', 'TGT', 'Head Master (HM)', 'Principal', 'Vice Principal',
                  'Pre-Primary Teacher', 'Special Educator', 'Librarian', 'Counselor',
                  'IIT/JEE Faculty', 'NEET Faculty'].map(role => (
                  <span key={role} className="px-3 py-1.5 rounded-full text-sm font-semibold cursor-default transition-all hover:-translate-y-0.5 duration-150"
                    style={{ background: '#e8eaf6', color: '#3949ab', border: '1px solid #c5cae9' }}>
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>Subjects</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Maths', 'Science', 'English', 'Telugu', 'Hindi', 'Social Studies',
                  'Computer Science', 'Physics', 'Chemistry', 'EVS', 'Physical Education', 'Art & Crafts'].map(subj => (
                  <span key={subj} className="px-3 py-1.5 rounded-full text-sm font-semibold cursor-default transition-all hover:-translate-y-0.5 duration-150"
                    style={{ background: 'rgba(245,158,11,0.10)', color: '#92400e', border: '1px solid rgba(245,158,11,0.25)' }}>
                    {subj}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-10 will-reveal">
            <Link href="/register?role=TEACHER"
              className="inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: '#3949ab' }}>
              Browse all teaching jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── INTERNATIONAL ────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 md:py-20 px-4 sm:px-6" style={{ background: '#0d1b2a', borderTop: '1px solid rgba(121,134,203,0.15)' }}>
        <div className="max-w-5xl mx-auto will-reveal">
          <div className="flex flex-col lg:flex-row items-start gap-8 sm:gap-10 lg:gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold mb-5"
                style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Globe className="w-3.5 h-3.5" />
                Global Teachers Hiring Platform (for free)
              </div>
              <h2 className="font-black mb-4 text-white" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', lineHeight: 1.2 }}>
                Teaching opportunities beyond India.
              </h2>
              <p className="text-sm sm:text-base mb-6 sm:mb-8 max-w-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Teachers from across India have been enquiring about opportunities in Europe, South East Asia, and beyond.
                Register your interest and we&apos;ll reach out when matching roles go live.
              </p>
              <Link href="/register?role=TEACHER"
                className="inline-flex items-center gap-2 font-bold px-7 py-3 rounded-xl text-sm"
                style={{ background: '#ffffff', color: '#1a237e', boxShadow: '0 4px 20px rgba(0,0,0,0.30)' }}>
                Register Interest — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex-shrink-0 w-full lg:w-auto">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Where teachers are heading
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" style={{ minWidth: 0 }}>
                {[
                  { code: 'FI', country: 'Finland' },
                  { code: 'SG', country: 'Singapore' },
                  { code: 'MY', country: 'Malaysia' },
                  { code: 'US', country: 'USA' },
                  { code: 'UK', country: 'United Kingdom' },
                  { code: 'DE', country: 'Germany' },
                  { code: 'SE', country: 'Sweden' },
                  { code: 'AU', country: 'Australia' },
                  { code: 'FR', country: 'France' },
                  { code: 'NL', country: 'Netherlands' },
                  { code: 'CH', country: 'Switzerland' },
                  { code: 'IE', country: 'Ireland' },
                ].map(({ code, country }) => (
                  <div key={country} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all hover:-translate-y-0.5 duration-150"
                    style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)' }}>
                    <span className="flex items-center justify-center flex-shrink-0 rounded-md text-[11px] font-black"
                      style={{ width: 30, height: 22, background: 'rgba(245,158,11,0.18)', color: '#fbbf24', letterSpacing: '0.02em' }}>
                      {code}
                    </span>
                    <p className="text-sm font-semibold text-white truncate">{country}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.30)' }}>
                Based on teacher enquiries received.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS — OPPOSITE-DIRECTION MARQUEE ────────────────────────── */}
      <section className="py-14 sm:py-16 md:py-24 overflow-hidden" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Testimonials</p>
            <h2 className="font-black" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', color: '#0f172a', lineHeight: 1.2 }}>
              Real stories.
            </h2>
            <p className="text-sm sm:text-base mt-2" style={{ color: '#64748b' }}>From teachers who found their role and schools who found their hire.</p>
          </div>
        </div>

        {[TESTIMONIALS.slice(0, 3), TESTIMONIALS.slice(3, 6)].map((row, rowIdx) => (
          <div key={rowIdx} className="marquee-track mb-4">
            <div className={rowIdx === 0 ? 'animate-marquee' : 'animate-marquee-reverse'}>
              {[...row, ...row].map((t, i) => (
                <div key={`${t.name}-${i}`}
                  className="shrink-0 w-72 md:w-80 rounded-2xl p-6 mx-3 bg-white"
                  style={{ border: '1px solid #e8edf5', boxShadow: '0 2px 16px rgba(57,73,171,0.05)' }}>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5" style={{ fill: '#f59e0b', color: '#f59e0b' }} />)}
                  </div>
                  {/* Quote */}
                  <p className="text-sm leading-relaxed mb-4" style={{ color: '#475569', fontStyle: 'italic' }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  {/* Divider */}
                  <div className="border-t mb-4" style={{ borderColor: '#f1f5f9' }} />
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: t.color }}>
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{t.name}</p>
                      <p className="text-xs" style={{ color: '#94a3b8' }}>{t.role} · {t.school}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-14 sm:py-16 md:py-24 px-4 sm:px-6" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Pricing</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.8rem)', color: '#0f172a', lineHeight: 1.15 }}>
              Simple. Honest. Fair.
            </h2>
            <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: '#64748b' }}>
              Teachers pay nothing, ever. Schools pay only when they need more than the free tier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teachers */}
            <div className="will-reveal-left rounded-3xl p-6 sm:p-8 md:p-10" style={{ background: '#f0f4ff', border: '2px solid #c5cae9' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(57,73,171,0.12)' }}>
                <GraduationCap className="w-5 h-5" style={{ color: '#3949ab' }} />
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-6"
                style={{ background: '#dcfce7', color: '#166534' }}>
                ✨ Always free
              </div>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl sm:text-6xl font-black" style={{ color: '#3949ab' }}>₹0</span>
                <span className="text-base font-medium mb-2" style={{ color: '#64748b' }}>/ forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited job applications', 'Full teacher profile', 'Upload intro video', 'Chat with schools after shortlist', 'Location-based job alerts', 'Resume & document upload'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#475569' }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#3949ab' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register?role=TEACHER"
                className="btn-glow w-full inline-flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)' }}>
                Get Started — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Schools */}
            <div className="will-reveal rounded-3xl p-6 sm:p-8 md:p-10 relative" style={{ background: '#0d1b2a', border: '2px solid rgba(245,158,11,0.40)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Building2 className="w-5 h-5" style={{ color: '#f59e0b' }} />
              </div>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>For Schools</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">2 free posts</span>
                  <span className="text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>/month</span>
                </div>
                {recruitMonthly != null && (
                  <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                    Or upgrade to <span className="text-white font-bold">{formatRupees(recruitMonthly)}/mo</span> for unlimited postings
                  </p>
                )}
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  `${2} free active posts/month`,
                  'Unlimited posts on paid plan',
                  'Search & shortlist teachers',
                  'Direct chat with candidates',
                  'Admin-moderated listings',
                  ...(appFee != null ? [`${formatRupees(appFee)} per confirmed hire (teacher pays)`] : []),
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register?role=RECRUITER"
                className="w-full inline-flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 20px rgba(245,158,11,0.40)' }}>
                Start Posting — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — BLOB ART ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 md:py-28 px-4 sm:px-6 relative overflow-hidden" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        {/* Blobs */}
        <div className="animate-blob absolute pointer-events-none"
          style={{ width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(57,73,171,0.09), transparent)', filter: 'blur(70px)', top: '-20%', left: '-8%' }} />
        <div className="animate-blob animation-delay-2000 absolute pointer-events-none"
          style={{ width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.09), transparent)', filter: 'blur(60px)', bottom: '-15%', right: '-5%' }} />
        <div className="animate-blob animation-delay-4000 absolute pointer-events-none"
          style={{ width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06), transparent)', filter: 'blur(50px)', top: '30%', right: '20%' }} />

        {/* Dotted texture overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center will-reveal">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-6"
            style={{ background: '#e8eaf6', color: '#3949ab', border: '1px solid #c5cae9' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Join SchoolTeacher today
          </div>

          <h2 className="font-black mb-5" style={{ fontSize: 'clamp(1.9rem, 7vw, 3.5rem)', color: '#0f172a', lineHeight: 1.1 }}>
            Your next chapter<br />starts here.
          </h2>

          <p className="text-sm sm:text-base mb-8 sm:mb-10 max-w-xl mx-auto" style={{ color: '#64748b' }}>
            Whether you&apos;re a teacher looking for the right role or a school that needs the right hire —
            SchoolTeacher is where it happens.
          </p>

          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <Link href="/register?role=TEACHER"
              className="btn-glow inline-flex items-center gap-2 font-bold px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 6px 24px rgba(57,73,171,0.35)' }}>
              Find Teaching Jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/register?role=RECRUITER"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 sm:px-8 sm:py-4 rounded-xl text-sm"
              style={{ background: 'transparent', border: '2px solid #0f172a', color: '#0f172a' }}>
              <Building2 className="w-4 h-4" />
              Hire a Teacher
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-10">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-0.5 mb-3">
                <span className="text-xl font-black" style={{ color: '#7986cb' }}>School</span>
                <span className="text-xl font-black text-white">Teacher</span>
              </Link>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                Global teacher hiring platform. Free for teachers, always.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Teachers</p>
              <ul className="space-y-2">
                {[
                  { label: 'Browse jobs', href: '/register?role=TEACHER' },
                  { label: 'Create profile', href: '/register?role=TEACHER' },
                  { label: 'Sign in', href: '/login' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-xs font-medium hover:text-white transition-colors" style={{ color: '#94a3b8' }}>{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Schools</p>
              <ul className="space-y-2">
                {[
                  { label: 'Post a job', href: '/register?role=RECRUITER' },
                  { label: 'Search teachers', href: '/register?role=RECRUITER' },
                  { label: 'Pricing', href: '#pricing' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-xs font-medium hover:text-white transition-colors" style={{ color: '#94a3b8' }}>{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Company</p>
              <ul className="space-y-2">
                {[
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Help', href: '/help' },
                  { label: 'Early access', href: '/early-access' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-xs font-medium hover:text-white transition-colors" style={{ color: '#94a3b8' }}>{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Legal</p>
              <ul className="space-y-2">
                {[
                  { label: 'Privacy Policy', href: '/privacy-policy' },
                  { label: 'Terms & Conditions', href: '/terms' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-xs font-medium hover:text-white transition-colors" style={{ color: '#94a3b8' }}>{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>© {new Date().getFullYear()} SchoolTeacher. All rights reserved.</p>
            <a href="https://bcognitrix.com/" target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.80)', textDecoration: 'none' }}>
              Made with ♡ by B-COGNITRIX
            </a>
            <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>Global Teachers Hiring Platform (for free)</p>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
