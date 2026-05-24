'use client';
import { useEffect } from 'react';

export function LandingReveal() {
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll('.will-reveal, .will-reveal-left, .will-reveal-scale'),
    );

    // Elements already in viewport at load time reveal immediately (no stutter)
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
