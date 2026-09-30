import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Cpu, Minus, X, Maximize2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuthSimple';
import { shouldUseSuperAdminShell } from '../layout/layoutMode';
import { MerchantCopilotDrawer } from './MerchantCopilotDrawer';

export type CopilotTriggerMode = 'expanded' | 'minimized' | 'hidden';

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

  // Persistent floating trigger mode: expanded | minimized | hidden
  const [triggerMode, setTriggerMode] = useState<CopilotTriggerMode>(() => {
    if (typeof window === 'undefined') return 'expanded';
    try {
      const stored = localStorage.getItem(COPILOT_TRIGGER_MODE_KEY);
      if (stored === 'expanded' || stored === 'minimized' || stored === 'hidden') {
        return stored;
      }
    } catch (err) {
      console.warn('[MerchantCopilotHost] localStorage read error:', err);
    }
    return 'expanded';
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
          {triggerMode === 'expanded' ? (
            <div className="pointer-events-auto flex items-center shadow-xl shadow-slate-900/10 dark:shadow-black/50 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl transition-all duration-160 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-indigo-500/15 group">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2.5 h-11 px-3.5 sm:px-4 rounded-full text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-[0.97] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title="المساعد التنفيذي للمتجر (Ctrl + J)"
                aria-label="فتح المساعد التنفيذي للمتجر"
              >
                {/* Steady status micro-indicator */}
                <span className="relative flex h-2 w-2 items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                </span>

                <Cpu className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform" />

                <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  المساعد التنفيذي
                </span>

                <span className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                  Ctrl+J
                </span>
              </button>

              {/* Sub-action controls: Minimize and Hide */}
              <div className="flex items-center pe-2 ps-0.5 border-s border-slate-200/70 dark:border-slate-800/80 gap-0.5 text-slate-400 dark:text-slate-500">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTriggerMode('minimized');
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                  title="تصغير إلى أيقونة مدمجة"
                  aria-label="تصغير المساعد التنفيذي"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTriggerMode('hidden');
                  }}
                  className="p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors active:scale-95 cursor-pointer"
                  title="إخفاء الشيب العائم (يبقى متاحاً عبر الشريط العلوي أو Ctrl+J)"
                  aria-label="إخفاء الشيب العائم"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            /* Minimized Mode: Compact 38px micro-pill with hover controls */
            <div className="pointer-events-auto relative group flex items-center">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="h-10 w-10 sm:h-9 sm:w-9 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-lg shadow-slate-900/10 dark:shadow-black/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all duration-160 active:scale-95 cursor-pointer backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title="المساعد التنفيذي للمتجر (Ctrl + J)"
                aria-label="المساعد التنفيذي للمتجر (مُصغّر)"
              >
                <Cpu className="h-4 w-4" />
                <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </button>

              {/* Quick actions popup on hover in minimized mode */}
              <div className="hidden group-hover:flex items-center gap-1 absolute bottom-full mb-1.5 start-0 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 shadow-md backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTriggerMode('expanded');
                  }}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="تكبير الشيب"
                  aria-label="تكبير الشيب"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateTriggerMode('hidden');
                  }}
                  className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                  title="إخفاء الشيب"
                  aria-label="إخفاء الشيب"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
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

