'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</p>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Critical error
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
              The application encountered a fatal error. Please reload the page.
            </p>
            <button
              onClick={reset}
              style={{ background: '#0a6e4f', color: '#fff', border: 'none', borderRadius: 10, padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
