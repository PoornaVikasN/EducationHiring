'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4">
      <div
        className="max-w-3xl mx-auto rounded-2xl border border-border-default bg-bg-card shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
        role="dialog"
        aria-label="Cookie consent"
      >
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed flex-1">
          We use cookies and similar technologies (including sign-in, Google Maps, and reCAPTCHA)
          to run SchoolTeacher and keep it secure. By continuing to use the site, you agree to our{' '}
          <Link href="/privacy-policy" className="text-brand-primary hover:underline font-medium">
            Privacy Policy
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 w-full sm:w-auto text-sm font-bold text-white px-5 py-2.5 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
