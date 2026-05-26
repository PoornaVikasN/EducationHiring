'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
import { RECRUITER_MONTHLY_PAISE } from '../lib/shared/constants';

// ── Testimonial data ──────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { quote: "Found a Maths PGT role in Banjara Hills within a week. The location filter is exactly what every teacher portal was missing.", name: "Lakshmi Reddy", role: "PGT Mathematics", school: "Hyderabad CBSE", initials: "LR", color: '#3949ab' },
  { quote: "Posted our SGT vacancy on Monday, had 9 shortlisted applicants by Wednesday. Admin review builds real trust with candidates.", name: "Ravi Shankar", role: "Principal", school: "Visakhapatnam CBSE School", initials: "RS", color: '#0891b2' },
  { quote: "The intro video feature is a game changer. We assessed 4 Telugu medium teachers before even scheduling interviews.", name: "Sunitha Varma", role: "HR Head", school: "Secunderabad ICSE School", initials: "SV", color: '#7c3aed' },
  { quote: "Transferred from Vijayawada to Hyderabad and found a Primary role near Kondapur in 8 days. Location radius filter is perfect.", name: "Arjun Rao", role: "Primary Teacher", school: "Hyderabad", initials: "AR", color: '#3949ab' },
  { quote: "Being completely free for teachers is huge. I applied to 15 schools across Telangana without spending a rupee.", name: "Padmavathi Reddy", role: "Correspondent", school: "Nellore English Medium", initials: "PR", color: '#0891b2' },
  { quote: "The international section connected me with a CBSE school in Dubai. Now teaching in UAE thanks to EduHire.", name: "Annapurna Krishna", role: "PGT Science", school: "Dubai (ex-Hyderabad)", initials: "AK", color: '#7c3aed' },
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
  const recruitMonthly = pricing.RECRUITER_MONTHLY_PAISE ?? RECRUITER_MONTHLY_PAISE;
  const appFee = pricing.APPLICATION_FEE_PAISE ?? 9_900;

  const [heroMode, setHeroMode] = useState<'teacher' | 'school'>('teacher');
  const [audience, setAudience] = useState<'teacher' | 'school'>('teacher');
  const steps = audience === 'teacher' ? TEACHER_STEPS : SCHOOL_STEPS;

  // Typewriter effect for hero tagline
  const fullTagline = heroMode === 'teacher' ? 'is waiting.' : 'one post away.';
  const [typedTagline, setTypedTagline] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setTypedTagline('');
    let i = 0;
    const typing = setInterval(() => {
      i++;
      setTypedTagline(fullTagline.slice(0, i));
      if (i >= fullTagline.length) clearInterval(typing);
    }, 70);
    return () => clearInterval(typing);
  }, [heroMode, fullTagline]);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden bg-white">
      <LandingReveal />
      <SiteHeader barOpen={false} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden" style={{ background: '#ffffff', minHeight: '100svh' }}>
        {/* Centre radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(57,73,171,0.06) 0%, transparent 70%)' }} />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 flex flex-col items-center text-center" style={{ paddingTop: 'calc(80px + 4rem)', paddingBottom: '4rem' }}>

          {/* ── Audience toggle ── */}
          <div className="hero-anim hero-delay-0 inline-flex rounded-full p-1 mb-10" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
            <button onClick={() => setHeroMode('teacher')}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-200"
              style={heroMode === 'teacher'
                ? { background: '#3949ab', color: '#fff', boxShadow: '0 2px 10px rgba(57,73,171,0.40)' }
                : { color: '#64748b', background: 'transparent' }}>
              👩‍🏫 For Teachers
            </button>
            <button onClick={() => setHeroMode('school')}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-200"
              style={heroMode === 'school'
                ? { background: '#f59e0b', color: '#fff', boxShadow: '0 2px 10px rgba(245,158,11,0.40)' }
                : { color: '#64748b', background: 'transparent' }}>
              🏫 For Schools
            </button>
          </div>

          {/* ── Headline ── */}
          <h1 className="hero-anim hero-delay-1 font-black tracking-tight mb-5"
            style={{ fontSize: 'clamp(2.8rem, 6.5vw, 5.5rem)', lineHeight: 1.08, color: '#0f172a', maxWidth: 780 }}>
            {heroMode === 'teacher' ? (
              <>Your next classroom<br /></>
            ) : (
              <>The right teacher is<br /></>
            )}
            <span style={{ color: heroMode === 'teacher' ? '#3949ab' : '#d97706' }}>
              {typedTagline}
            </span>
            <span style={{
              color: heroMode === 'teacher' ? '#3949ab' : '#d97706',
              opacity: showCursor ? 1 : 0,
              transition: 'opacity 0.1s',
              fontWeight: 300,
            }}>|</span>
          </h1>

          {/* ── Sub-copy ── */}
          <p className="hero-anim hero-delay-2 mb-10" style={{ fontSize: '1.15rem', color: '#64748b', maxWidth: 540, lineHeight: 1.65 }}>
            {heroMode === 'teacher'
              ? 'Browse verified teaching roles across India. Apply instantly. Zero fees, forever.'
              : 'Post a job in minutes. Get verified teacher profiles straight to your dashboard. First 2 posts every month are free.'}
          </p>

          {/* ── CTAs ── */}
          <div className="hero-anim hero-delay-3 flex flex-wrap items-center justify-center gap-3 mb-4">
            <Link
              href={heroMode === 'teacher' ? '/register?role=JOB_SEEKER' : '/register?role=RECRUITER'}
              className="btn-glow inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white text-sm"
              style={{
                background: heroMode === 'teacher' ? 'linear-gradient(135deg, #3949ab, #5c6bc0)' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                boxShadow: heroMode === 'teacher' ? '0 4px 20px rgba(57,73,171,0.40)' : '0 4px 20px rgba(245,158,11,0.40)',
              }}>
              {heroMode === 'teacher' ? 'Browse Teaching Jobs' : 'Post a Job — Free'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href={heroMode === 'teacher' ? '/register?role=JOB_SEEKER' : '/login'}
              className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl text-sm transition-colors"
              style={{ border: '1.5px solid #e2e8f0', color: '#334155', background: '#fff' }}>
              {heroMode === 'teacher' ? 'Create Free Profile' : 'See How It Works'}
            </Link>
          </div>

          {/* ── Micro trust ── */}
          <p className="hero-anim hero-delay-4 text-xs mb-16" style={{ color: '#94a3b8' }}>
            {heroMode === 'teacher' ? 'No credit card · Free for teachers, forever' : '2 free job posts every month · No setup fee'}
          </p>

          {/* ── Product mockup ── */}
          <div className="hero-anim hero-delay-4 w-full" style={{ maxWidth: 860 }}>
            {heroMode === 'teacher' ? (
              /* Teacher mode — profile card + job card */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teacher profile card */}
                <div className="rounded-2xl p-6 text-left" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 8px 40px rgba(57,73,171,0.09), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #3949ab, #6366f1)' }}>PS</div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#0f172a' }}>Priya Sharma</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>PGT Mathematics · 5 yrs exp</p>
                      <p className="text-[11px]" style={{ color: '#94a3b8' }}>Hyderabad, Telangana</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5" style={{ fill: '#f59e0b', color: '#f59e0b' }} />)}
                    <span className="text-xs ml-1.5 font-medium" style={{ color: '#64748b' }}>5.0</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {['Maths', 'Statistics', 'CBSE', 'B.Ed', 'Immediate'].map(t => (
                      <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#e8eaf6', color: '#3949ab' }}>{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                    <span className="text-xs font-semibold" style={{ color: '#166534' }}>Video profile available ▶</span>
                  </div>
                </div>

                {/* Job listing card */}
                <div className="rounded-2xl p-6 text-left" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 8px 40px rgba(57,73,171,0.09), 0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e8eaf6' }}>
                        <Building2 className="w-5 h-5" style={{ color: '#3949ab' }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: '#0f172a' }}>Delhi Public School</p>
                        <p className="text-[11px]" style={{ color: '#94a3b8' }}>New Delhi · CBSE</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#dcfce7', color: '#166534' }}>Verified ✓</span>
                  </div>
                  <p className="font-black text-base mb-1" style={{ color: '#0f172a' }}>PGT Mathematics</p>
                  <p className="text-sm font-semibold mb-3" style={{ color: '#3949ab' }}>₹40,000 – ₹55,000 / month</p>
                  <div className="flex items-center gap-3 text-xs mb-4" style={{ color: '#94a3b8' }}>
                    <span>📍 New Delhi</span>
                    <span>·</span>
                    <span>47 applicants</span>
                    <span>·</span>
                    <span>2 days ago</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold" style={{ color: '#64748b' }}>Profile match</span>
                      <span className="text-[10px] font-bold" style={{ color: '#3949ab' }}>62%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: '#e2e8f0' }}>
                      <div className="h-1.5 rounded-full" style={{ width: '62%', background: 'linear-gradient(90deg, #3949ab, #6366f1)' }} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* School mode — applicant pipeline */
              <div className="rounded-2xl p-6 text-left" style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 8px 40px rgba(245,158,11,0.09), 0 1px 3px rgba(0,0,0,0.04)' }}>
                {/* Job header */}
                <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <p className="font-black text-base" style={{ color: '#0f172a' }}>PGT Mathematics</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Delhi Public School · Posted 2 days ago</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                    <span className="text-xs font-bold" style={{ color: '#166534' }}>Live</span>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { n: '47', l: 'Applicants', bg: '#e8eaf6', c: '#3949ab' },
                    { n: '12', l: 'Shortlisted', bg: '#fef9c3', c: '#854d0e' },
                    { n: '3',  l: 'In Chat',    bg: '#dcfce7', c: '#166534' },
                  ].map(s => (
                    <div key={s.l} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                      <p className="font-black text-2xl" style={{ color: s.c }}>{s.n}</p>
                      <p className="text-[10px] font-semibold mt-0.5" style={{ color: s.c }}>{s.l}</p>
                    </div>
                  ))}
                </div>
                {/* Top applicants */}
                <p className="text-xs font-bold mb-2" style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top matches</p>
                <div className="space-y-2">
                  {[
                    { init: 'PS', name: 'Priya Sharma',  role: 'PGT · 5 yrs · Hyderabad', match: 95, color: '#3949ab' },
                    { init: 'RK', name: 'Ravi Kumar',    role: 'PGT · 3 yrs · Delhi',     match: 88, color: '#0891b2' },
                    { init: 'SV', name: 'Sunita Verma',  role: 'PGT · 7 yrs · Noida',     match: 82, color: '#7c3aed' },
                  ].map(a => (
                    <div key={a.name} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ border: '1px solid #f1f5f9', background: '#fafafa' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: a.color }}>{a.init}</div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: '#0f172a' }}>{a.name}</p>
                          <p className="text-[10px]" style={{ color: '#94a3b8' }}>{a.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold" style={{ color: '#059669' }}>{a.match}% match</span>
                        <button className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: '#f59e0b' }}>Chat</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── TRUST MARQUEE STRIP ──────────────────────────────────────────────── */}
      <div style={{ background: '#0d1b2a', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 0' }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-6">
          <span className="text-xs font-bold uppercase tracking-widest flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Schools using EduHire:
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
      <section className="py-24 px-6" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Why EduHire</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#0f172a', lineHeight: 1.1 }}>
              Everything you need.
            </h2>
            <p className="text-base max-w-md mx-auto" style={{ color: '#64748b' }}>
              Purpose-built for how education hiring actually works.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Row 1 — Cell A: Chat (wide) */}
            <div className="will-reveal-scale lg:col-span-2 rounded-3xl p-8 relative overflow-hidden"
              style={{ background: '#0d1b2a', minHeight: 220 }}>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold mb-4"
                style={{ background: 'rgba(57,73,171,0.30)', color: '#9fa8da', border: '1px solid rgba(121,134,203,0.25)' }}>
                <MessageSquare className="w-3.5 h-3.5" />
                Real-time Chat
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Talk directly. No middlemen.</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8', maxWidth: 340 }}>
                School and teacher connect the moment there&apos;s a shortlist. One chat thread per application, no email chains.
              </p>
              {/* Chat bubble mockup */}
              <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end">
                <div className="rounded-2xl rounded-br-sm px-3 py-2 text-xs font-medium text-white"
                  style={{ background: '#3949ab', maxWidth: 160 }}>
                  Are you available to start next month?
                </div>
                <div className="rounded-2xl rounded-bl-sm px-3 py-2 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', maxWidth: 140 }}>
                  Yes, I can join June 1st ✓
                </div>
              </div>
            </div>

            {/* Row 1 — Cell B: Free (narrow) */}
            <div className="will-reveal-scale reveal-delay-1 rounded-3xl p-8 flex flex-col justify-between"
              style={{ background: '#f0f4ff', border: '2px solid #c5cae9', minHeight: 220 }}>
              <div>
                <p className="text-7xl font-black leading-none mb-1" style={{ color: '#3949ab' }}>₹0</p>
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
            <div className="will-reveal-scale reveal-delay-2 rounded-3xl p-7"
              style={{ background: '#ffffff', border: '1px solid #e8edf5', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(245,158,11,0.12)' }}>
                <Video className="w-6 h-6" style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: '#0f172a' }}>Intro video profiles</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>
                Teachers record a 60-second clip. Schools see the person before the interview.
              </p>
            </div>

            {/* Row 2 — Cell D: Verified (wide) */}
            <div className="will-reveal-scale reveal-delay-1 lg:col-span-2 rounded-3xl p-8 relative overflow-hidden"
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
              {/* Verified badge mockup */}
              <div className="absolute bottom-6 right-6 flex items-center gap-2 rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.35)' }}>
                <CheckCircle className="w-4 h-4" style={{ color: '#f59e0b' }} />
                <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>Verified School ✓</span>
              </div>
            </div>

            {/* Row 3 — 3 equal cells */}
            <div className="will-reveal-scale reveal-delay-1 rounded-3xl p-7"
              style={{ background: '#fff8e1', border: '1px solid #fde68a' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(245,158,11,0.15)' }}>
                <MapPin className="w-5 h-5" style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="font-bold text-sm mb-1.5" style={{ color: '#0f172a' }}>Location-smart matching</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>Filter by city, distance radius, or state. Find exactly what&apos;s near you.</p>
            </div>

            <div className="will-reveal-scale reveal-delay-2 rounded-3xl p-7"
              style={{ background: '#ffffff', border: '1px solid #e8edf5', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(57,73,171,0.10)' }}>
                <Zap className="w-5 h-5" style={{ color: '#3949ab' }} />
              </div>
              <h3 className="font-bold text-sm mb-1.5" style={{ color: '#0f172a' }}>One-click apply</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>No cover letters. No lengthy forms. Just your profile doing the work.</p>
            </div>

            <div className="will-reveal-scale reveal-delay-3 rounded-3xl p-7"
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
      <section id="how-it-works" className="py-24 px-6" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>How it works</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#0f172a', lineHeight: 1.15 }}>
              Two journeys. One platform.
            </h2>
            <p className="text-base max-w-md mx-auto" style={{ color: '#64748b' }}>
              Whether you&apos;re looking for a role or filling one — it&apos;s built for both.
            </p>
          </div>

          {/* Tab pills */}
          <div className="flex justify-center gap-2 mb-12 will-reveal">
            {(['teacher', 'school'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAudience(tab)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
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
              <Link href="/register?role=JOB_SEEKER"
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
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { stat: '₹0', label: 'Cost for teachers', accent: '#f59e0b' },
              { stat: '48h', label: 'Avg. shortlist response', accent: '#7986cb' },
              { stat: '100%', label: 'Verified school listings', accent: '#7986cb' },
              { stat: '2+', label: 'Free posts/month for schools', accent: '#f59e0b' },
            ].map(({ stat, label, accent }, idx) => (
              <div key={label} className={`will-reveal reveal-delay-${idx + 1} flex flex-col items-center text-center`}>
                <p className="font-black leading-none mb-3" style={{
                  fontSize: 'clamp(3.5rem, 7vw, 5.5rem)',
                  background: `linear-gradient(135deg, ${accent}, #ffffff)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {stat}
                </p>
                <div className="w-8 h-0.5 rounded-full mb-3" style={{ background: accent }} />
                <p className="text-sm leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS EXPLORER ────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Explore Roles</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', color: '#0f172a', lineHeight: 1.15 }}>
              Find your match.
            </h2>
            <p className="text-base" style={{ color: '#64748b' }}>Every subject. Every role. Every level.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 will-reveal">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
                  style={{ background: '#e8eaf6', color: '#3949ab' }}>Teaching Roles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['SGT', 'PGT', 'TGT', 'Head Master (HM)', 'Principal', 'Vice Principal',
                  'Pre-Primary Teacher', 'Special Educator', 'Librarian', 'Counselor'].map(role => (
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
            <Link href="/register?role=JOB_SEEKER"
              className="inline-flex items-center gap-2 text-sm font-bold"
              style={{ color: '#3949ab' }}>
              Browse all teaching jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── INTERNATIONAL ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: '#0d1b2a', borderTop: '1px solid rgba(121,134,203,0.15)' }}>
        <div className="max-w-5xl mx-auto will-reveal">
          <div className="flex flex-col lg:flex-row items-start gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold mb-5"
                style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Globe className="w-3.5 h-3.5" />
                International Placement Program
              </div>
              <h2 className="font-black mb-4 text-white" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', lineHeight: 1.2 }}>
                Teaching opportunities beyond India.
              </h2>
              <p className="text-base mb-8 max-w-lg" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Teachers from Telangana &amp; AP have been enquiring about opportunities in Gulf countries, South East Asia, and the UK.
                Register your interest and we&apos;ll reach out when matching roles go live.
              </p>
              <Link href="/register?role=JOB_SEEKER"
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
              <div className="space-y-2">
                {[
                  { flag: '🇦🇪', country: 'UAE / Dubai' },
                  { flag: '🇸🇦', country: 'Saudi Arabia' },
                  { flag: '🇶🇦', country: 'Qatar' },
                  { flag: '🇸🇬', country: 'Singapore' },
                  { flag: '🇲🇾', country: 'Malaysia' },
                  { flag: '🇬🇧', country: 'United Kingdom' },
                ].map(({ flag, country }) => (
                  <div key={country} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <span className="text-lg leading-none">{flag}</span>
                    <p className="text-sm font-semibold text-white">{country}</p>
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

      {/* ── TESTIMONIALS — STATIC GRID ───────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: '#f8fafc', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Testimonials</p>
            <h2 className="font-black" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', color: '#0f172a', lineHeight: 1.2 }}>
              Real stories.
            </h2>
            <p className="text-base mt-2" style={{ color: '#64748b' }}>From teachers who found their role and schools who found their hire.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, idx) => (
              <div key={t.name}
                className={`will-reveal-scale reveal-delay-${(idx % 3) + 1} rounded-2xl p-6 bg-white`}
                style={{ border: '1px solid #e8edf5', boxShadow: '0 2px 16px rgba(57,73,171,0.05)' }}>
                {/* Stars */}
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5" style={{ fill: '#f59e0b', color: '#f59e0b' }} />)}
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
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 will-reveal">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#3949ab' }}>Pricing</p>
            <h2 className="font-black mb-3" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', color: '#0f172a', lineHeight: 1.15 }}>
              Simple. Honest. Fair.
            </h2>
            <p className="text-base max-w-md mx-auto" style={{ color: '#64748b' }}>
              Teachers pay nothing, ever. Schools pay only when they need more than the free tier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Teachers */}
            <div className="will-reveal-left rounded-3xl p-10" style={{ background: '#f0f4ff', border: '2px solid #c5cae9' }}>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full mb-6"
                style={{ background: '#dcfce7', color: '#166534' }}>
                ✨ Always free
              </div>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-6xl font-black" style={{ color: '#3949ab' }}>₹0</span>
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
              <Link href="/register?role=JOB_SEEKER"
                className="btn-glow w-full inline-flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)' }}>
                Get Started — Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Schools */}
            <div className="will-reveal rounded-3xl p-10 relative" style={{ background: '#0d1b2a', border: '2px solid rgba(245,158,11,0.40)' }}>
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>For Schools</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-white">2 free posts</span>
                  <span className="text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>/month</span>
                </div>
                <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                  Or upgrade to <span className="text-white font-bold">{formatRupees(recruitMonthly)}/mo</span> for unlimited postings
                </p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  `${2} free active posts/month`,
                  'Unlimited posts on paid plan',
                  'Search & shortlist teachers',
                  'Direct chat with candidates',
                  'Admin-moderated listings',
                  `${formatRupees(appFee)} per confirmed hire (teacher pays)`,
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
      <section className="py-28 px-6 relative overflow-hidden" style={{ background: '#ffffff', borderTop: '1px solid #e8edf5' }}>
        {/* Blobs */}
        <div className="animate-blob absolute pointer-events-none"
          style={{ width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(57,73,171,0.09), transparent)', filter: 'blur(70px)', top: '-20%', left: '-8%' }} />
        <div className="animate-blob animation-delay-2000 absolute pointer-events-none"
          style={{ width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.09), transparent)', filter: 'blur(60px)', bottom: '-15%', right: '-5%' }} />
        <div className="animate-blob animation-delay-4000 absolute pointer-events-none"
          style={{ width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06), transparent)', filter: 'blur(50px)', top: '30%', right: '20%' }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center will-reveal">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold mb-6"
            style={{ background: '#e8eaf6', color: '#3949ab', border: '1px solid #c5cae9' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Join EduHire today
          </div>

          <h2 className="font-black mb-5" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', color: '#0f172a', lineHeight: 1.1 }}>
            Your next chapter<br />starts here.
          </h2>

          <p className="text-base mb-10 max-w-xl mx-auto" style={{ color: '#64748b' }}>
            Whether you&apos;re a teacher looking for the right role or a school that needs the right hire —
            EduHire is where it happens.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register?role=JOB_SEEKER"
              className="btn-glow inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 6px 24px rgba(57,73,171,0.35)' }}>
              Find Teaching Jobs
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/register?role=RECRUITER"
              className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-sm"
              style={{ background: 'transparent', border: '2px solid #0f172a', color: '#0f172a' }}>
              <Building2 className="w-4 h-4" />
              Hire a Teacher
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-0.5 mb-3">
                <span className="text-xl font-black" style={{ color: '#7986cb' }}>Edu</span>
                <span className="text-xl font-black text-white">Hire</span>
              </Link>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                Hyderabad-born teacher hiring platform serving Telangana, AP, and all of India.
              </p>
            </div>
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
