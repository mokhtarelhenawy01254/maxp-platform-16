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
          className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40 group flex items-center justify-center gap-2.5 h-10 px-3 sm:px-3.5 rounded-full bg-[#09090b]/92 hover:bg-[#121215] text-zinc-100 shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] border border-white/[0.12] hover:border-white/[0.22] backdrop-blur-xl transition-all duration-160 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          title="المساعد التنفيذي للمتجر (Ctrl + J)"
          aria-label="المساعد التنفيذي للمتجر"
        >
          {/* Steady status micro-indicator */}
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/25" />
          </span>

          <Cpu className="h-3.5 w-3.5 text-zinc-300 group-hover:text-emerald-400 transition-colors" />

          <span className="text-xs font-medium tracking-tight hidden sm:inline text-zinc-200">
            المساعد التنفيذي
          </span>

          <span className="hidden sm:inline-flex items-center gap-0.5 rounded border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
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
