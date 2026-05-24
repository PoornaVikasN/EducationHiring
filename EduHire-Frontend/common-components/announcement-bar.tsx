'use client';

import Link from 'next/link';
import { X } from 'lucide-react';

interface AnnouncementBarProps {
  onDismiss: () => void;
}

export function AnnouncementBar({ onDismiss }: AnnouncementBarProps) {
  const handleDismiss = () => {
    sessionStorage.setItem('eduhire_bar_dismissed', '1');
    onDismiss();
  };

  return (
    <div
      className="fixed left-0 right-0 z-[60] flex items-center justify-center px-4"
      style={{
        top: 0,
        height: '36px',
        background: 'linear-gradient(90deg, #1a237e 0%, #3949ab 50%, #1a237e 100%)',
        borderBottom: '1px solid rgba(121,134,203,0.2)',
      }}
    >
      {/* Centered message */}
      <p className="text-[12px] font-semibold text-white text-center flex items-center gap-2 flex-1 justify-center">
        <span className="inline-block animate-pulse">📚</span>
        Telangana &amp; AP&apos;s Teacher Hiring Platform — Free for Teachers.
        <Link
          href="/register?role=RECRUITER"
          className="ml-2 text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', transition: 'background 0.15s ease' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.32)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)'}
        >
          Hire Teachers →
        </Link>
      </p>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-4 flex items-center justify-center w-5 h-5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
