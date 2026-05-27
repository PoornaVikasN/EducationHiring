import Link from 'next/link';
import { CheckCircle, Globe, BookOpen } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-shrink-0 flex-col relative bg-brand-header text-white overflow-hidden">
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="animate-blob absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-primary opacity-25 blur-[80px]" />
          <div className="animate-blob animation-delay-2000 absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-15 blur-[80px]" style={{ background: '#7986cb' }} />
          <div className="bg-grid-white absolute inset-0" />
        </div>

        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0.5 mb-auto">
            <span className="text-2xl font-black" style={{ color: '#7986cb' }}>School</span>
            <span className="text-2xl font-black text-white">Teacher</span>
          </Link>

          {/* Main copy */}
          <div className="py-10">
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Telangana &amp; AP&apos;s teacher<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300">
                hiring platform.
              </span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-10">
              Born in Hyderabad. Connect with verified CBSE, ICSE and Telugu-medium schools across Telangana, AP, and beyond.
            </p>

            <ul className="space-y-4">
              {[
                { icon: Globe,       text: 'Regional, national & international opportunities' },
                { icon: BookOpen,    text: 'SGT · PGT · HM · Principal & more' },
                { icon: CheckCircle, text: 'Free for teachers, always' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(57,73,171,0.30)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: '#7986cb' }} />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom trust signals */}
          <div className="mt-auto pt-8 border-t border-white/10 flex flex-col gap-2">
            {[
              '✓ Admin-verified schools only',
              '✓ Direct chat at shortlist stage',
              '✓ Intro-video profiles supported',
            ].map((line) => (
              <p key={line} className="text-xs text-slate-400">{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-page px-6 py-12 min-h-screen">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-8 flex items-center gap-0.5">
          <span className="text-2xl font-black" style={{ color: '#7986cb' }}>School</span>
          <span className="text-2xl font-black text-text-primary">Teacher</span>
        </Link>

        <div className="w-full max-w-md bg-bg-card rounded-2xl shadow-lg border border-border-default p-8">
          {children}
        </div>

        <p className="mt-6 text-xs text-text-muted">
          © {new Date().getFullYear()} SchoolTeacher. All rights reserved.
        </p>
      </div>

    </div>
  );
}
