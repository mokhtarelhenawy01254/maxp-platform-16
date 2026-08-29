import React, { useEffect, useState } from 'react';

/**
 * GracefulScrollTop — circular progress-ring back-to-top button
 * in the Soft Graceful (Texture) style: appears after scrolling,
 * ring fills with scroll progress, double-chevron up glyph.
 */
const GracefulScrollTop: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const value = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      setProgress(value);
      setVisible(window.scrollY > 420);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const circumference = 2 * Math.PI * 20;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#171717] shadow-[0_16px_36px_-16px_rgba(0,0,0,0.45)] transition-all duration-300 hover:scale-105 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2.5" />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="#171717"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.15s linear' }}
        />
      </svg>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 20 7-7 7 7" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
};

export default GracefulScrollTop;
