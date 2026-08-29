/**
 * 📈 Web Vitals RUM — real-user performance monitoring (zero dependencies).
 *
 * Collects LCP / CLS / INP / TTFB with native PerformanceObserver and ships
 * them once per page lifecycle to the analytics beacon endpoint. Purpose:
 * measure the actual visitor impact of the 2026-08-29 storefront bundle
 * fix (see backend/docs/storefront/bundle-chunking-entry-purity-2026-08-29.md)
 * and catch regressions from real users, not synthetic tests.
 *
 * INP here is an approximation: the worst interaction duration seen during
 * the page lifetime (the real metric is a 98th-percentile over interactions).
 */

type VitalMetric = {
  name: 'LCP' | 'CLS' | 'INP' | 'TTFB';
  value: number;
  rating?: string;
  id?: string;
};

const BEACON_ENDPOINT = "/api/v1/analytics/track/web-vitals";
let initialized = false;

// Same fallback chain as analyticsService.getCompanyId — sendBeacon cannot
// set custom headers, so the company rides on the query string instead of
// the x-company-id header.
const resolveCompanyId = (): string | null => {
  try {
    return (
      new URLSearchParams(window.location.search).get("companyId") ||
      localStorage.getItem("storefront_companyId") ||
      sessionStorage.getItem("currentCompanyId") ||
      null
    );
  } catch {
    return null;
  }
};

const sendBeacon = (endpoint: string, payload: Record<string, unknown>): void => {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
    void fetch(endpoint, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => {});
  } catch {
    // Monitoring must never break the page.
  }
};

const ratingFor = (name: VitalMetric['name'], value: number): string => {
  const thresholds: Record<VitalMetric['name'], [number, number]> = {
    LCP: [2500, 4000],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
};

export const initWebVitals = (): void => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const metrics = new Map<string, VitalMetric>();
  const record = (metric: VitalMetric): void => {
    metrics.set(metric.name, { ...metric, rating: ratingFor(metric.name, metric.value) });
  };

  // TTFB
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      record({ name: 'TTFB', value: nav.responseStart, id: 'nav' });
    }
  } catch {
    /* ignore */
  }

  // LCP — keep the latest candidate; finalizes on first input / page hide.
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        record({
          name: 'LCP',
          value: last.startTime,
          id: (last as PerformanceEntry & { id?: string }).id,
        });
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit);
  } catch {
    /* unsupported browser */
  }

  // CLS — running sum of layout shifts without recent input, 5s window.
  try {
    let clsValue = 0;
    let firstShiftAt = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value: number;
          startTime: number;
        };
        if (shift.hadRecentInput) continue;
        if (!firstShiftAt) firstShiftAt = shift.startTime;
        if (shift.startTime - firstShiftAt > 5000) continue;
        clsValue += shift.value;
      }
      // ×1000 keeps integers in the beacon (CLS thresholds scale accordingly).
      record({ name: 'CLS', value: clsValue * 1000, id: 'cls' });
    });
    observer.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit);
  } catch {
    /* unsupported browser */
  }

  // INP approximation — worst interaction duration (event timing buffer).
  try {
    let worstDuration = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > worstDuration) worstDuration = entry.duration;
      }
      if (worstDuration > 0) {
        record({ name: 'INP', value: worstDuration, id: 'inp' });
      }
    });
    observer.observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);
  } catch {
    /* unsupported browser */
  }

  let sent = false;
  const flush = (): void => {
    if (sent || metrics.size === 0) return;
    sent = true;
    const companyId = resolveCompanyId();
    const endpoint = companyId
      ? `${BEACON_ENDPOINT}?companyId=${encodeURIComponent(companyId)}`
      : BEACON_ENDPOINT;
    sendBeacon(endpoint, { path: window.location.pathname, metrics: [...metrics.values()] });
  };

  // Send once the page is being left (fires reliably even on mobile).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush, { once: true });
};
