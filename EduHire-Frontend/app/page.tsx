'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  FileText,
  Globe,
  GraduationCap,
  MapPin,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { SiteHeader } from '../common-components/site-header';
import { ScrollToTop } from '../common-components/scroll-to-top';
import { LandingReveal } from '../common-components/landing-reveal';
import { usePublicPricing, formatRupees } from '../hooks/use-public-pricing';
import { RECRUITER_MONTHLY_PAISE } from '../lib/shared/constants';

// ── Testimonial card ─────────────────────────────────────────────────────────
interface Testimonial { quote: string; name: string; role: string; initials: string; color: string; }

function TestimonialCard({ quote, name, role, initials, color }: Testimonial) {
  return (
    <div className="shrink-0 w-72 md:w-[320px] rounded-2xl p-5 mx-3"
         style={{ background: '#ffffff', border: '1px solid #e8edf5', boxShadow: '0 2px 16px rgba(57,73,171,0.07)' }}>
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5" style={{ fill: '#f59e0b', color: '#f59e0b' }} />
        ))}
      </div>
      <p className="text-sm leading-relaxed mb-4" style={{ color: '#475569' }}>&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
             style={{ background: color }}>{initials}</div>
        <div>
          <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{name}</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>{role}</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { pricing } = usePublicPricing();
  const recruitMonthly = pricing.RECRUITER_MONTHLY_PAISE ?? RECRUITER_MONTHLY_PAISE;
  const freeTierLimit  = 2;

  const teacherSteps = [
    { num: '01', icon: FileText,      title: 'Build your profile',      desc: 'Add subjects, qualifications, preferred location & an intro video in under 5 minutes.' },
    { num: '02', icon: Search,        title: 'Browse & filter jobs',    desc: 'Filter by subject, post type (SGT/PGT/HM), location radius, salary range and board.' },
    { num: '03', icon: Bell,          title: 'Apply in one click',      desc: 'Express interest instantly — no cover letters, no lengthy forms.' },
    { num: '04', icon: MessageSquare, title: 'Chat & get hired',        desc: 'Unlock direct chat the moment a school shortlists you. Close the deal fast.' },
  ];

  const schoolSteps = [
    { num: '01', icon: Briefcase,     title: 'Post a job',              desc: `${freeTierLimit} free posts/month. Upgrade to ${formatRupees(recruitMonthly)}/mo for unlimited postings.` },
    { num: '02', icon: CheckCircle,   title: 'Admin-approved & live',   desc: 'Every post reviewed by our team before going live — zero spam, zero fake listings.' },
    { num: '03', icon: Users,         title: 'Browse & shortlist',      desc: 'Search verified teacher profiles with intro videos. Shortlist freely at no extra charge.' },
    { num: '04', icon: MessageSquare, title: 'Chat & hire directly',    desc: 'Connect instantly with shortlisted candidates. No recruiter middleman, ever.' },
  ];

  const features = [
    { icon: MessageSquare, headline: 'Real-time chat',          body: 'Direct school-teacher messaging at shortlist stage. No email chains, no delay.', accent: '#3949ab' },
    { icon: Shield,        headline: 'Verified schools only',   body: 'Every school admin-verified before posting. Zero fake listings.', accent: '#0891b2' },
    { icon: Video,         headline: 'Intro-video profiles',    body: 'Teachers upload a short video — schools see the person, not just a resume.', accent: '#7c3aed' },
    { icon: Globe,         headline: 'Regional to global',      body: 'Regional, national, and international placements — your next role could be anywhere.', accent: '#f59e0b' },
    { icon: Zap,           headline: 'Instant apply',           body: 'One-click applications mean more time teaching, less time form-filling.', accent: '#dc2626' },
    { icon: TrendingUp,    headline: 'Smart matching',          body: 'Get notified about jobs that match your subject, location, and experience level.', accent: '#059669' },
  ];

  const testimonialsRow1: Testimonial[] = [
    { quote: "Found a Maths PGT role in Banjara Hills within a week. The location filter is exactly what every teacher portal was missing.", name: "Lakshmi Reddy", role: "PGT Mathematics · Hyderabad", initials: "LR", color: '#3949ab' },
    { quote: "Posted our SGT vacancy on Monday, had 9 shortlisted applicants by Wednesday. Admin review builds real trust with candidates.", name: "Ravi Shankar", role: "Principal · Visakhapatnam CBSE", initials: "RS", color: '#0891b2' },
    { quote: "The intro video feature is a game changer. We assessed 4 Telugu medium teachers before even scheduling interviews.", name: "Sunitha Varma", role: "HR Head · Secunderabad ICSE", initials: "SV", color: '#7c3aed' },
    { quote: "Transferred from Vijayawada to Hyderabad and found a Primary role near Kondapur in 8 days. Location radius filter is perfect.", name: "Arjun Rao", role: "Primary Teacher · Hyderabad", initials: "AR", color: '#3949ab' },
    { quote: "Being completely free for teachers is huge. I applied to 15 schools across Telangana without spending a rupee.", name: "Meena Pullaiah", role: "B.Ed Graduate · Warangal", initials: "MP", color: '#0891b2' },
    { quote: "Chat at shortlist stage saves tremendous back-and-forth. Confirmed fit in one conversation before calling the candidate in.", name: "Venkateswara Rao", role: "Academic Director · Hyderabad", initials: "VR", color: '#7c3aed' },
  ];

  const testimonialsRow2: Testimonial[] = [
    { quote: "Shifted all our hiring to EduHire. The verified school badge makes candidates far more confident about applying.", name: "Padmavathi Reddy", role: "Correspondent · Nellore English Medium", initials: "PR", color: '#3949ab' },
    { quote: "Applied for a CS HM role in Karimnagar, shortlisted by two schools within 48 hours. Response time is incredible.", name: "Srinivas Murthy", role: "CS HM · Karimnagar", initials: "SM", color: '#0891b2' },
    { quote: "Admin approval before listing means zero fake posts. Every candidate who applies has seen a real, verified vacancy.", name: "Kavitha Chodavarapu", role: "Principal · Guntur ICSE", initials: "KC", color: '#7c3aed' },
    { quote: `${formatRupees(recruitMonthly)}/mo unlimited posts is genuinely affordable. We filled 6 positions this term alone.`, name: "Dr. Narasimha Rao", role: "Director · Hyderabad International School", initials: "NR", color: '#3949ab' },
    { quote: "Finally a portal that knows SGT and PGT are different roles with different pay scales. Telugu medium schools need this.", name: "Saraswathi Devi", role: "Senior SGT · Tirupati", initials: "SD", color: '#0891b2' },
    { quote: "The international section connected me with a CBSE school in Dubai. Now teaching in UAE thanks to EduHire.", name: "Annapurna Krishna", role: "PGT Science · Dubai (ex-Hyderabad)", initials: "AK", color: '#7c3aed' },
  ];

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <LandingReveal />
      <SiteHeader barOpen={false} />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }} className="flex items-end">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.pexels.com/photos/3231358/pexels-photo-3231358.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Indian school classroom"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
        />
        {/* Multi-layer overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.92) 0%, rgba(26,35,126,0.70) 50%, rgba(13,27,42,0.85) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.0) 30%, rgba(13,27,42,0.80) 75%, rgba(13,27,42,0.97) 100%)' }} />

        {/* Decorative floating orbs */}
        <div style={{ position: 'absolute', top: '20%', right: '8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(57,73,171,0.30) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', right: '20%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.20) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pb-20 md:pb-32 pt-36">
          <div style={{ maxWidth: 680 }}>

            {/* Badges */}
            <div className="hero-anim hero-delay-0 flex flex-wrap gap-2 mb-7">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white"
                   style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 4px 16px rgba(57,73,171,0.45)' }}>
                <GraduationCap className="w-3.5 h-3.5" />
                Telangana &amp; AP&apos;s Teacher Hiring Platform
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white"
                   style={{ background: 'rgba(245,158,11,0.90)', border: '1px solid rgba(253,230,138,0.4)' }}>
                <Sparkles className="w-3 h-3" />
                Free for teachers
              </div>
            </div>

            {/* H1 */}
            <h1 className="hero-anim hero-delay-1 font-black tracking-tight mb-6 text-white"
                style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.6rem)', lineHeight: 1.08 }}>
              Find the teaching role<br />
              you were{' '}
              <span style={{
                background: 'linear-gradient(90deg, #7986cb 0%, #9fa8da 50%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
              }}>
                meant for.
              </span>
            </h1>

            {/* Sub */}
            <p className="hero-anim hero-delay-2 mb-9 leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)', fontSize: '1.12rem', maxWidth: 540 }}>
              Born in Hyderabad. Built for Telugu-medium and English-medium schools across Telangana &amp; Andhra Pradesh — and expanding to every corner of India and beyond.
            </p>

            {/* CTAs */}
            <div className="hero-anim hero-delay-3 flex flex-wrap gap-3 mb-10">
              <Link href="/register?role=JOB_SEEKER"
                    className="btn-glow inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 6px 24px rgba(57,73,171,0.50)' }}>
                Find Teaching Jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/register?role=RECRUITER"
                    className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white text-sm"
                    style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.30)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                <Building2 className="w-4 h-4" />
                Post a Job — Free
              </Link>
            </div>

            {/* Trust pills */}
            <div className="hero-anim hero-delay-4 flex flex-wrap gap-2">
              {[
                { icon: Shield,   label: 'Verified Schools' },
                { icon: MapPin,   label: 'Hyderabad · AP · Telangana' },
                { icon: Award,    label: 'Free for Teachers' },
                { icon: Globe,    label: 'Pan-India + Gulf & International' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)' }}>
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Floating proof card */}
        <div className="absolute bottom-8 right-6 md:right-14 z-20 flex flex-col gap-3 items-end hero-anim hero-delay-4">
          <div className="rounded-xl px-4 py-3 flex items-center gap-2.5"
               style={{ background: 'rgba(57,73,171,0.92)', border: '1px solid rgba(121,134,203,0.50)', backdropFilter: 'blur(14px)', boxShadow: '0 0 32px rgba(57,73,171,0.40)' }}>
            <BookOpen className="w-4 h-4 text-white" />
            <div>
              <p className="text-sm font-black text-white leading-tight">Teacher hired in 3 days</p>
              <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>PGT Mathematics · Hyderabad</p>
            </div>
          </div>
          <div className="rounded-xl px-3 py-2 flex items-center gap-2"
               style={{ background: 'rgba(13,27,42,0.88)', border: '1px solid rgba(245,158,11,0.40)', backdropFilter: 'blur(14px)' }}>
            <CheckCircle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-bold text-white">Admin-Verified School</span>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ──────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(90deg, #0d1b2a 0%, #1a237e 50%, #0d1b2a 100%)', borderBottom: '1px solid rgba(121,134,203,0.20)' }}>
        <div className="max-w-5xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/10">
          {[
            { stat: '100%', label: 'Free for teachers', icon: Award },
            { stat: '0', label: 'Commission fees', icon: Shield },
            { stat: '2+', label: 'Free job posts/month for schools', icon: Briefcase },
            { stat: '48h', label: 'Average shortlist response', icon: Zap },
          ].map(({ stat, label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center text-center px-4 py-1 gap-1">
              <Icon className="w-4 h-4 mb-1" style={{ color: '#7986cb' }} />
              <span className="text-2xl font-black text-white">{stat}</span>
              <span className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SUBJECTS / POST TYPES STRIP ─────────────────────────────────────── */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e8edf5', padding: '18px 0' }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest mr-2" style={{ color: '#94a3b8' }}>Popular roles:</span>
          {['SGT', 'PGT', 'HM', 'Principal', 'Vice Principal', 'TGT', 'Maths', 'Science', 'English', 'Telugu', 'Hindi', 'Computer Science', 'Social Studies', 'Primary Teacher', 'Pre-Primary'].map((tag) => (
            <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold cursor-default transition-all duration-150 hover:-translate-y-0.5"
                  style={{ background: '#e8eaf6', color: '#3949ab', border: '1px solid #c5cae9' }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6" style={{ background: '#ffffff' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>How it works</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0d1b2a', lineHeight: 1.15 }}>
              From signup to hired.
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: '#64748b' }}>
              Two journeys, one platform — built for both sides of education hiring.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teachers */}
            <div className="will-reveal-left rounded-3xl p-8 md:p-10" style={{ background: '#f0f4ff', border: '2px solid #c5cae9' }}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 4px 14px rgba(57,73,171,0.35)' }}>
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-base" style={{ color: '#0d1b2a' }}>For Teachers</p>
                  <p className="text-xs font-medium" style={{ color: '#3949ab' }}>100% free · always</p>
                </div>
              </div>
              <div className="space-y-6">
                {teacherSteps.map(({ num, title, desc }, idx) => (
                  <div key={num} className={`will-reveal reveal-delay-${idx + 1} flex items-start gap-4 group`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 transition-transform group-hover:scale-110"
                         style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)' }}>
                      {num}
                    </div>
                    <div>
                      <p className="font-bold text-sm mb-1" style={{ color: '#0d1b2a' }}>{title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid #c5cae9' }}>
                <Link href="/register?role=JOB_SEEKER"
                      className="btn-glow inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)' }}>
                  Join as Teacher — Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Schools */}
            <div id="for-schools" className="will-reveal rounded-3xl p-8 md:p-10"
                 style={{ background: '#0d1b2a', border: '2px solid rgba(245,158,11,0.30)' }}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-base text-white">For Schools</p>
                  <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>{freeTierLimit} free posts/mo · {formatRupees(recruitMonthly)}/mo unlimited</p>
                </div>
              </div>
              <div className="space-y-6">
                {schoolSteps.map(({ num, title, desc }, idx) => (
                  <div key={num} className={`will-reveal reveal-delay-${idx + 1} flex items-start gap-4 group`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 transition-transform group-hover:scale-110"
                         style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                      {num}
                    </div>
                    <div>
                      <p className="font-bold text-sm mb-1 text-white">{title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                <Link href="/register?role=RECRUITER"
                      className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 16px rgba(245,158,11,0.40)' }}>
                  Post Your First Job
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY EDUHIRE — 6-FEATURE GRID ────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Why EduHire</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0d1b2a', lineHeight: 1.15 }}>
              Built differently.<br />For education.
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: '#64748b' }}>
              Most job boards are built for tech or healthcare. EduHire is purpose-built for how schools hire and how teachers look for roles.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, headline, body, accent }, idx) => (
              <div key={headline} className={`will-reveal reveal-delay-${(idx % 3) + 1} group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1`}
                   style={{ background: '#ffffff', border: '1px solid #e8edf5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', cursor: 'default' }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                     style={{ background: `${accent}18` }}>
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#0d1b2a' }}>{headline}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERNATIONAL BANNER ────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #283593 100%)' }}>
        <div className="max-w-5xl mx-auto will-reveal">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            {/* Left copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white mb-5"
                   style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                <Globe className="w-3.5 h-3.5" />
                International Placement Program
              </div>
              <h2 className="font-black mb-4 text-white" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', lineHeight: 1.2 }}>
                Take your teaching<br />career global.
              </h2>
              <p className="text-base mb-8 max-w-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Many teachers from Telangana &amp; AP have enquired about opportunities in Gulf countries, South East Asia, and the UK. We&apos;re building this out — register your interest now and we&apos;ll reach out when matching roles go live.
              </p>
              <Link href="/register?role=JOB_SEEKER"
                    className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-indigo-900 text-sm"
                    style={{ background: '#ffffff', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                Register Your Interest — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Right — destinations teachers enquire about */}
            <div className="flex-shrink-0 w-full lg:w-auto">
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Where our teachers are heading
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { flag: '🇦🇪', country: 'UAE / Dubai' },
                  { flag: '🇸🇦', country: 'Saudi Arabia' },
                  { flag: '🇶🇦', country: 'Qatar' },
                  { flag: '🇸🇬', country: 'Singapore' },
                  { flag: '🇲🇾', country: 'Malaysia' },
                  { flag: '🇬🇧', country: 'United Kingdom' },
                ].map(({ flag, country }) => (
                  <div key={country} className="flex items-center gap-3 rounded-xl px-4 py-3"
                       style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                    <span className="text-xl leading-none">{flag}</span>
                    <p className="text-sm font-semibold text-white">{country}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Based on teacher enquiries received. Listings go live as schools onboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Pricing</p>
            <h2 className="font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0d1b2a', lineHeight: 1.15 }}>
              Simple. Honest. Fair.
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: '#64748b' }}>
              Teachers pay nothing, ever. Schools pay only when they need more than the free tier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teachers */}
            <div className="will-reveal-left rounded-3xl p-8" style={{ background: '#f0f4ff', border: '2px solid #c5cae9' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)' }}>
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <p className="font-black text-lg" style={{ color: '#0d1b2a' }}>For Teachers</p>
              </div>
              <div className="mb-6">
                <span className="text-5xl font-black" style={{ color: '#3949ab' }}>₹0</span>
                <span className="text-base font-medium ml-2" style={{ color: '#64748b' }}>forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited job applications', 'Build a full teacher profile', 'Upload intro video', 'Chat with schools after shortlist', 'Location-based job matching', 'Job alert notifications'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#475569' }}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#3949ab' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register?role=JOB_SEEKER"
                    className="btn-glow w-full inline-flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)' }}>
                Get Started — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Schools */}
            <div className="will-reveal rounded-3xl p-8 relative overflow-hidden"
                 style={{ background: '#0d1b2a', border: '2px solid rgba(245,158,11,0.50)' }}>
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
                   style={{ background: 'rgba(245,158,11,0.20)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.30)' }}>
                Most Popular
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <p className="font-black text-lg text-white">For Schools</p>
              </div>
              <div className="mb-2">
                <span className="text-5xl font-black text-white">{formatRupees(recruitMonthly)}</span>
                <span className="text-base font-medium ml-2" style={{ color: '#94a3b8' }}>/month</span>
              </div>
              <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>Or start with {freeTierLimit} free posts/month</p>
              <ul className="space-y-3 mb-8">
                {[`${freeTierLimit} free active job posts/month`, 'Unlimited posts on paid plan', 'Search & shortlist teachers freely', 'Direct chat with shortlisted candidates', 'Admin-moderated job listings', 'Recruitment dashboard & analytics'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register?role=RECRUITER"
                    className="w-full inline-flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 16px rgba(245,158,11,0.40)' }}>
                Start Posting — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section className="py-24 overflow-hidden" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-6xl mx-auto px-6 text-center mb-12 will-reveal">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Testimonials</p>
          <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', color: '#0d1b2a', lineHeight: 1.2 }}>
            Teachers and schools love EduHire.
          </h2>
        </div>
        {/* Row 1 — scroll left */}
        <div className="marquee-track will-reveal">
          <div className="animate-marquee">
            {[...testimonialsRow1, ...testimonialsRow1].map((t, i) => <TestimonialCard key={i} {...t} />)}
          </div>
        </div>
        {/* Row 2 — scroll right */}
        <div className="marquee-track mt-4 will-reveal">
          <div className="animate-marquee-reverse">
            {[...testimonialsRow2, ...testimonialsRow2].map((t, i) => <TestimonialCard key={i} {...t} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BAND ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #1a237e 50%, #0d1b2a 100%)' }}>
        <div className="max-w-3xl mx-auto text-center will-reveal">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white mb-6"
               style={{ background: 'rgba(57,73,171,0.40)', border: '1px solid rgba(121,134,203,0.40)' }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#7986cb' }} />
            Join EduHire today
          </div>
          <h2 className="font-black mb-5 text-white" style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', lineHeight: 1.15 }}>
            Your next chapter starts here.
          </h2>
          <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>
            Whether you&apos;re a teacher looking for the perfect role or a school that needs the right hire — EduHire is where it happens.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register?role=JOB_SEEKER"
                  className="btn-glow inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 6px 24px rgba(57,73,171,0.50)' }}>
              Find Teaching Jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/register?role=RECRUITER"
                  className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1.5px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)' }}>
              <Building2 className="w-4 h-4" />
              Hire a Teacher
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-0.5 mb-3">
                <span className="text-xl font-black" style={{ color: '#7986cb' }}>Edu</span>
                <span className="text-xl font-black text-white">Hire</span>
              </Link>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                Hyderabad-born teacher hiring platform serving Telangana, AP, and India.
              </p>
            </div>
            {/* Teachers */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Teachers</p>
              <ul className="space-y-2">
                {[
                  { label: 'Browse jobs', href: '/register?role=JOB_SEEKER' },
                  { label: 'Create profile', href: '/register?role=JOB_SEEKER' },
                  { label: 'Sign in', href: '/login' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-xs hover:text-white transition-colors" style={{ color: '#64748b' }}>{label}</Link></li>
                ))}
              </ul>
            </div>
            {/* Schools */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Schools</p>
              <ul className="space-y-2">
                {[
                  { label: 'Post a job', href: '/register?role=RECRUITER' },
                  { label: 'Search teachers', href: '/register?role=RECRUITER' },
                  { label: 'Pricing', href: '#pricing' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-xs hover:text-white transition-colors" style={{ color: '#64748b' }}>{label}</Link></li>
                ))}
              </ul>
            </div>
            {/* Company */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-3">Company</p>
              <ul className="space-y-2">
                {[
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Help', href: '/help' },
                  { label: 'Early access', href: '/early-access' },
                ].map(({ label, href }) => (
                  <li key={label}><Link href={href} className="text-xs hover:text-white transition-colors" style={{ color: '#64748b' }}>{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#475569' }}>© {new Date().getFullYear()} EduHire. All rights reserved.</p>
            <p className="text-xs" style={{ color: '#475569' }}>Born in Hyderabad. Built for India &amp; beyond.</p>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
