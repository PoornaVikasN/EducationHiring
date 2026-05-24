'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SiteHeaderProps {
  barOpen?: boolean;
}

export function SiteHeader({ barOpen = false }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 80);
    handle();
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  const topOffset = barOpen ? 36 : 0;

  return (
    <header
      className="fixed left-0 right-0 z-50 h-16"
      style={{
        top: `${topOffset}px`,
        width: '100%',
        background: scrolled ? 'rgba(13,27,42,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.3)' : 'none',
        transition: 'top 0.25s ease, background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, backdrop-filter 0.35s ease',
      }}
    >
      <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%', height: '100%', display: 'flex', alignItems: 'center', padding: '0 1.5rem' }}>
        {/* Logo */}
        <div className="flex items-center gap-1 flex-1">
          <Link href="/" className="flex items-center gap-0.5">
            <span className="text-xl font-black" style={{ color: '#7986cb' }}>Edu</span>
            <span className="text-xl font-black text-white">Hire</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-7 mr-8">
          {[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Pricing',      href: '#pricing' },
            { label: 'For Schools',  href: '#for-schools' },
          ].map(({ label, href }) => (
            href.startsWith('#')
              ? <a key={label} href={href} className="text-sm font-medium"
                   style={{ color: 'rgba(255,255,255,0.75)', transition: 'color 0.15s ease' }}
                   onMouseEnter={e => (e.currentTarget.style.color = '#7986cb')}
                   onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}>{label}</a>
              : <Link key={label} href={href} className="text-sm font-medium"
                      style={{ color: 'rgba(255,255,255,0.75)', transition: 'color 0.15s ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#7986cb'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'}>{label}</Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-white"
                style={{ opacity: 0.8, transition: 'opacity 0.15s ease' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}>
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-bold text-white px-5 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #3949ab, #5c6bc0)', boxShadow: '0 4px 12px rgba(57,73,171,0.35)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(57,73,171,0.50)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(57,73,171,0.35)'; }}
          >
            Join free →
          </Link>
        </div>
      </div>
    </header>
  );
}
