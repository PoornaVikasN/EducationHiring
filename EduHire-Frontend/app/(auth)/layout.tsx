import Link from 'next/link';

const VALUE_PROPS = [
  'Free for teachers, forever',
  'Admin-verified schools only',
  'Direct chat at shortlist stage',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      {/* Top brand band */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(120deg, #1a2151 0%, #3949ab 60%, #2c3a9c 100%)' }}
      >
        <div className="bg-grid-white absolute inset-0 pointer-events-none" style={{ opacity: 0.08 }} />
        <div className="relative z-10 max-w-md mx-auto px-6 pt-10 pb-16 flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-0.5 mb-4">
            <span className="text-2xl font-black" style={{ color: '#a5b4fc' }}>School</span>
            <span className="text-2xl font-black text-white">Teacher</span>
          </Link>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.80)' }}>
            Verified schools. Zero fees for teachers. Hire or get hired, faster.
          </p>
        </div>
      </div>

      {/* Card, overlapping the band */}
      <div className="flex-1 flex flex-col items-center px-6" style={{ marginTop: '-2.75rem' }}>
        <div className="relative z-10 w-full max-w-md bg-bg-card rounded-2xl shadow-lg border border-border-default p-8">
          {children}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 max-w-md">
          {VALUE_PROPS.map((line) => (
            <span key={line} className="text-xs text-text-muted">✓ {line}</span>
          ))}
        </div>

        <p className="mt-6 mb-10 text-xs text-text-muted">
          © {new Date().getFullYear()} SchoolTeacher. All rights reserved.
        </p>
      </div>
    </div>
  );
}
