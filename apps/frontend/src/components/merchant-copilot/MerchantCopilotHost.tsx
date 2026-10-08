import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Cpu, Minus, X, Maximize2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuthSimple';
import { shouldUseSuperAdminShell } from '../layout/layoutMode';
import { MerchantCopilotDrawer } from './MerchantCopilotDrawer';

export type CopilotTriggerMode = 'circular' | 'expanded' | 'minimized' | 'hidden';

export const COPILOT_TRIGGER_MODE_KEY = 'maxp_copilot_trigger_mode';

export const toggleMerchantCopilot = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toggle-merchant-copilot'));
  }
};

export const setMerchantCopilotTriggerMode = (mode: CopilotTriggerMode) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COPILOT_TRIGGER_MODE_KEY, mode);
    } catch {}
    window.dispatchEvent(
      new CustomEvent('set-merchant-copilot-trigger-mode', { detail: { mode } }),
    );
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

  // Persistent floating trigger mode: circular | hidden
  // Defaults to 'circular' so the trigger is a sleek circle that does not block dashboard tabs/cards.
  const [triggerMode, setTriggerMode] = useState<CopilotTriggerMode>(() => {
    if (typeof window === 'undefined') return 'circular';
    try {
      const stored = localStorage.getItem(COPILOT_TRIGGER_MODE_KEY);
      if (stored === 'hidden') return 'hidden';
      // Any other stored value or empty defaults to circular
      return 'circular';
    } catch (err) {
      console.warn('[MerchantCopilotHost] localStorage read error:', err);
    }
    return 'circular';
  });

  const updateTriggerMode = useCallback((newMode: CopilotTriggerMode) => {
    setTriggerMode(newMode);
    try {
      localStorage.setItem(COPILOT_TRIGGER_MODE_KEY, newMode);
    } catch (err) {
      console.warn('[MerchantCopilotHost] localStorage write error:', err);
    }
  }, []);

  // Near-bottom auto-avoidance: if user scrolls near table pagination / page bottom, gently elevate chip
  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || window.pageYOffset || 0;
          const viewportHeight = window.innerHeight || 0;
          const documentHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
          );
          setIsNearBottom(documentHeight - (scrollY + viewportHeight) < 130);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isSuperAdminRoute =
    user?.role === 'SUPER_ADMIN' ||
    location.pathname.startsWith('/super-admin') ||
    shouldUseSuperAdminShell(user?.role, location.pathname);

  // Reactive listener for deep links across route transitions and auth redirects
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      let isCopilotRequested =
        searchParams.get('copilot') === '1' ||
        searchParams.get('copilot') === 'true';
      let sessionParam = searchParams.get('session');

      if (!isCopilotRequested && !sessionParam && location.hash.includes('?')) {
        const hashQuery = location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        isCopilotRequested =
          hashParams.get('copilot') === '1' ||
          hashParams.get('copilot') === 'true';
        sessionParam = hashParams.get('session');
      }

      const storedOpen = sessionStorage.getItem('pending_copilot_open');
      const storedSession = sessionStorage.getItem('pending_copilot_session');

      if (isCopilotRequested || sessionParam || storedOpen === '1' || storedSession) {
        setIsOpen(true);
        const resolvedSession = sessionParam || storedSession;
        if (resolvedSession) {
          setInitialSessionId(resolvedSession);
        }
        if (storedOpen) sessionStorage.removeItem('pending_copilot_open');
        if (storedSession) sessionStorage.removeItem('pending_copilot_session');
      }
    } catch (err) {
      console.warn('[MerchantCopilotHost] Location update check error:', err);
    }
  }, [location.search, location.hash]);

  // Clean deep-link params from address bar safely after state is captured
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
  }, [location.pathname]);


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

    const handleSetMode = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode: CopilotTriggerMode }>;
      if (customEvent.detail?.mode) {
        setTriggerMode(customEvent.detail.mode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('toggle-merchant-copilot', handleCustomToggle);
    window.addEventListener('set-merchant-copilot-trigger-mode', handleSetMode);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('toggle-merchant-copilot', handleCustomToggle);
      window.removeEventListener('set-merchant-copilot-trigger-mode', handleSetMode);
    };
  }, [isSuperAdminRoute]);

  if (isSuperAdminRoute) {
    return null;
  }

  return (
    <>
      {/*
        Floating Trigger Container:
        1. pointer-events-none on transparent wrapper ensures clicks pass through to any background elements.
        2. In Arabic (RTL), placed on the RIGHT (rtl:right-4 rtl:sm:right-6 rtl:left-auto), keeping the entire
           LEFT side free for table pagination (Next/Previous/page numbers).
        3. In English (LTR), placed on the LEFT (ltr:left-4 ltr:sm:left-6 ltr:right-auto), keeping the RIGHT side free.
        4. When drawer is open (!isOpen check) or hidden by user, nothing renders in floating zone.
      */}
      {!isOpen && triggerMode !== 'hidden' && (
        <aside
          aria-label="المساعد التنفيذي للمتجر"
          data-slot="merchant-copilot-floating-container"
          className={`hidden sm:flex fixed z-40 pointer-events-none transition-all duration-200 ease-out sm:bottom-6 bottom-4 rtl:right-4 rtl:sm:right-6 rtl:left-auto ltr:left-4 ltr:sm:left-6 ltr:right-auto ${
            isNearBottom ? '-translate-y-4' : 'translate-y-0'
          }`}
        >
          <div className="pointer-events-auto relative group flex items-center">
            {/* Origin-aware floating tooltip pill on hover */}
            <div
              role="tooltip"
              className="pointer-events-none group-hover:pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out translate-y-1 group-hover:translate-y-0 absolute bottom-full mb-3 rtl:right-0 ltr:left-0 flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/95 dark:bg-slate-900/95 text-white text-xs font-medium shadow-xl shadow-slate-950/25 border border-slate-750/80 backdrop-blur-md whitespace-nowrap z-50"
            >
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              </span>

              <span className="font-bold text-slate-100 text-[11px] tracking-tight">
                المساعد التنفيذي
              </span>

              <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300 font-semibold">
                Ctrl+J
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateTriggerMode('hidden');
                }}
                className="ms-0.5 p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
                title="إخفاء الشيب العائم (يبقى متاحاً عبر الشريط العلوي أو Ctrl+J)"
                aria-label="إخفاء الشيب العائم"
              >
                <X className="h-3 w-3" />
              </button>

              {/* Triangle pointer indicator */}
              <span className="absolute -bottom-1 rtl:right-5 ltr:left-5 w-2 h-2 bg-slate-900/95 border-b border-e border-slate-750/80 rotate-45" />
            </div>

            {/* Circular FAB Button */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="relative flex items-center justify-center w-12 h-12 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/80 shadow-[0_8px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-xl hover:shadow-indigo-500/20 text-indigo-600 dark:text-indigo-400 active:scale-95 hover:scale-105 transition-all duration-160 cursor-pointer backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title="المساعد التنفيذي للمتجر (Ctrl + J)"
              aria-label="فتح المساعد التنفيذي للمتجر"
            >
              {/* Steady status micro-indicator with ambient pulse on ping */}
              <span className="absolute top-1.5 end-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </span>

              <Cpu className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
            </button>
          </div>
        </aside>
      )}

      <MerchantCopilotDrawer
        isOpen={isOpen}
        initialSessionId={initialSessionId}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

