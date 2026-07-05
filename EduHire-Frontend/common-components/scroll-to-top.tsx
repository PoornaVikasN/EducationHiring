'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handle = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`scroll-top-btn fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center${visible ? ' visible' : ''}`}
      style={{
        background: 'linear-gradient(135deg, #3949ab, #f59e0b)',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(57,73,171,0.4)',
        border: 'none',
        cursor: 'pointer',
      }}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
