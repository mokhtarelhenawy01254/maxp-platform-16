import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
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
          className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40 group flex items-center justify-center gap-2.5 h-11 px-3.5 sm:px-4 rounded-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-900/10 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-indigo-500/10 backdrop-blur-xl transition-all duration-160 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
          title="المساعد التنفيذي للمتجر (Ctrl + J)"
          aria-label="المساعد التنفيذي للمتجر"
        >
          {/* Steady status micro-indicator */}
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
          </span>

          <Cpu className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform" />

          <span className="text-xs font-bold tracking-tight hidden sm:inline text-slate-800 dark:text-slate-100">
            المساعد التنفيذي
          </span>

          <span className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
            Ctrl+J
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
