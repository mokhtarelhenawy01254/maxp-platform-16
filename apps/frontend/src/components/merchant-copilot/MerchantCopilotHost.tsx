import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Cpu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuthSimple';
import { shouldUseSuperAdminShell } from '../layout/layoutMode';
import { MerchantCopilotDrawer } from './MerchantCopilotDrawer';

export const toggleMerchantCopilot = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toggle-merchant-copilot'));
  }
};

export const MerchantCopilotHost: React.FC = () => {
  // Helper to extract deep link config synchronously on mount
  const [initialDeepLink] = useState(() => {
    if (typeof window === 'undefined') return { isOpen: false, sessionId: null as string | null };
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let isCopilotRequested =
        searchParams.get('copilot') === '1' ||
        searchParams.get('copilot') === 'true';
      let sessionParam = searchParams.get('session');

      if (!isCopilotRequested && !sessionParam && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        isCopilotRequested =
          hashParams.get('copilot') === '1' ||
          hashParams.get('copilot') === 'true';
        sessionParam = hashParams.get('session');
      }

      if (!isCopilotRequested && !sessionParam) {
        const storedOpen = sessionStorage.getItem('pending_copilot_open');
        const storedSession = sessionStorage.getItem('pending_copilot_session');
        if (storedOpen === '1' || storedSession) {
          isCopilotRequested = true;
          sessionParam = storedSession || null;
          sessionStorage.removeItem('pending_copilot_open');
          sessionStorage.removeItem('pending_copilot_session');
        }
      }

      return {
        isOpen: isCopilotRequested || Boolean(sessionParam),
        sessionId: sessionParam || null,
      };
    } catch (err) {
      console.warn('[MerchantCopilotHost] Deep link parsing error:', err);
      return { isOpen: false, sessionId: null as string | null };
    }
  });

  const [isOpen, setIsOpen] = useState(initialDeepLink.isOpen);
  const [initialSessionId, setInitialSessionId] = useState<string | null>(initialDeepLink.sessionId);
  const location = useLocation();
  const { user } = useAuth();

  const isSuperAdminRoute =
    user?.role === 'SUPER_ADMIN' ||
    location.pathname.startsWith('/super-admin') ||
    shouldUseSuperAdminShell(user?.role, location.pathname);

  // Clean deep-link params from address bar using history.replaceState once on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hasCopilotParam = searchParams.has('copilot');
      const hasSessionParam = searchParams.has('session');

      if (hasCopilotParam || hasSessionParam) {
        const url = new URL(window.location.href);
        url.searchParams.delete('copilot');
        url.searchParams.delete('session');
        const cleanQuery = url.searchParams.toString();
        const cleanUrl = url.pathname + (cleanQuery ? `?${cleanQuery}` : '') + url.hash;
        window.history.replaceState(window.history.state, '', cleanUrl);
      }
    } catch (err) {
      console.warn('[MerchantCopilotHost] URL cleanup error:', err);
    }
  }, []);

  // Suppress floating trigger on chat/inbox screens to prevent blocking the mobile composer and send button
  const isInboxOrChatRoute =
    /inbox|conversations|whatsapp|chat|facebook|instagram|tiktok|messages|comments/i.test(
      location.pathname,
    );

  useEffect(() => {
    if (isSuperAdminRoute) return;

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
  }, [isSuperAdminRoute]);

  if (isSuperAdminRoute) {
    return null;
  }

  return (
    <>
      {!isOpen && !isInboxOrChatRoute && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="hidden sm:flex fixed sm:bottom-6 sm:end-6 z-40 group items-center justify-center gap-2.5 h-11 px-3.5 sm:px-4 rounded-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-900/10 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-indigo-500/10 backdrop-blur-xl transition-all duration-160 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
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
        initialSessionId={initialSessionId}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
