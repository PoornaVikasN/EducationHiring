import Link from 'next/link';
import { FileText } from 'lucide-react';
import { SiteHeader } from '../../common-components/site-header';

export const metadata = { title: 'Terms & Conditions — SchoolTeacher' };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

interface LegalSection {
  heading: string;
  body: string;
}

interface LegalPage {
  title: string;
  lastUpdatedLabel: string;
  sections: LegalSection[];
}

async function getLegalPage(key: string): Promise<LegalPage | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/legal/${key}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TermsPage() {
  const page = await getLegalPage('terms');

  return (
    <div className="min-h-screen bg-bg-page">
      <SiteHeader forceSolid />
      <div className="h-16" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#2563eb' }} />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black" style={{ color: '#0d1b2a' }}>{page?.title ?? 'Terms & Conditions'}</h1>
        </div>
        <p className="text-sm mb-8 sm:mb-12" style={{ color: '#64748b' }}>{page?.lastUpdatedLabel ?? 'Last updated: July 2026'}</p>

        {page ? (
          <div className="space-y-8 sm:space-y-10" style={{ color: '#334155', lineHeight: 1.8, fontSize: '0.9375rem' }}>
            {page.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-base sm:text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>{s.heading}</h2>
                <div className="legal-body" dangerouslySetInnerHTML={{ __html: s.body }} />
              </section>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#64748b' }}>Unable to load this page right now. Please try again shortly.</p>
        )}

        <div className="mt-12 sm:mt-16 pt-8 flex flex-wrap gap-4 sm:gap-6" style={{ borderTop: '1px solid #e8edf5' }}>
          <Link href="/privacy-policy" className="text-sm font-medium" style={{ color: '#3949ab' }}>Privacy Policy →</Link>
          <Link href="/" className="text-sm" style={{ color: '#64748b' }}>← Back to Home</Link>
        </div>
      </div>

      <style>{`
        .legal-body p { margin-bottom: 0.75rem; }
        .legal-body ul { list-style: disc; padding-left: 1.25rem; }
        .legal-body li { margin-bottom: 0.5rem; }
        .legal-body a { color: #3949ab; }
      `}</style>
    </div>
  );
}
