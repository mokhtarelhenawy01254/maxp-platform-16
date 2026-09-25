import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { MerchantCopilotDrawer } from './MerchantCopilotDrawer';

export const toggleMerchantCopilot = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toggle-merchant-copilot'));
  }
};

export const MerchantCopilotHost: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    const handleCustomToggle = () => {
      setIsOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-merchant-copilot', handleCustomToggle);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-merchant-copilot', handleCustomToggle);
    };
  }, []);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40 flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full bg-zinc-900/95 dark:bg-zinc-800/95 text-white shadow-2xl border border-white/10 hover:border-emerald-500/40 hover:bg-zinc-800 active:scale-95 transition-all duration-150 backdrop-blur-md group"
          title="مساعد المتجر التنفيذي (Ctrl + J)"
          aria-label="مساعد المتجر التنفيذي"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Sparkles className="h-4 w-4 text-emerald-400 group-hover:rotate-12 transition-transform duration-200" />
          <span className="text-xs font-medium tracking-wide hidden sm:inline">
            المساعد الذكي
          </span>
        </button>
      )}

      <MerchantCopilotDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
