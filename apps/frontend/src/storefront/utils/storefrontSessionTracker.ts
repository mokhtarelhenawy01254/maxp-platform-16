import { getOrderAttributionPayload } from './orderAttribution';

const VISITOR_STORAGE_KEY = 'storefront_visitor_v1';
const SESSION_STORAGE_KEY = 'storefront_session_v1';
const PAGES_JOURNEY_KEY = 'storefront_journey_v1';
const IP_GEO_CACHE_KEY = 'sf-ip-governorate';

const SESSION_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes
const MAX_PAGES_TRACKED = 30;

export interface StorefrontPageVisit {
  path: string;
  title?: string;
  timestamp: string;
}

export interface StorefrontSessionDetails {
  sessionId?: string;
  visitorId?: string;
  ip?: string;
  ipGovernorate?: string;
  ipCity?: string;
  trafficSource?: {
    platform?: string;
    source: string;
    medium?: string;
    campaignName?: string;
    campaignId?: string;
    adSetId?: string;
    adId?: string;
    referrer?: string;
    landingPath?: string;
  };
  pagesVisited: StorefrontPageVisit[];
  durationSeconds: number;
  sessionStartedAt: string;
  sessionCount: number;
  firstSeenAt: string;
}

interface StoredVisitor {
  visitorId: string;
  firstSeenAt: string;
  totalSessions: number;
}

interface StoredSession {
  sessionId: string;
  startedAt: number;
  expiresAt: number;
  sessionNumber: number;
}

const isBrowser = typeof window !== 'undefined';

const safeRead = (storage: Storage, key: string): string | null => {
  if (!isBrowser) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeWrite = (storage: Storage, key: string, value: string): void => {
  if (!isBrowser) return;
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage quota or restricted access errors
  }
};

const generateRandomId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

/**
 * Ensures or retrieves the permanent visitor ID and initial visit date.
 */
export const getOrCreateVisitor = (): StoredVisitor => {
  if (!isBrowser) {
    const nowIso = new Date().toISOString();
    return { visitorId: 'server_visitor', firstSeenAt: nowIso, totalSessions: 1 };
  }

  const raw = safeRead(window.localStorage, VISITOR_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredVisitor;
      if (parsed.visitorId && parsed.firstSeenAt) {
        return parsed;
      }
    } catch {
      // Fall through to re-init
    }
  }

  const newVisitor: StoredVisitor = {
    visitorId: generateRandomId('vis'),
    firstSeenAt: new Date().toISOString(),
    totalSessions: 1,
  };

  safeWrite(window.localStorage, VISITOR_STORAGE_KEY, JSON.stringify(newVisitor));
  return newVisitor;
};

/**
 * Manages the active session. If inactivity exceeds 30 minutes, starts a new session
 * and increments totalSessions.
 */
export const getOrCreateSession = (): StoredSession => {
  const now = Date.now();
  if (!isBrowser) {
    return {
      sessionId: 'server_session',
      startedAt: now,
      expiresAt: now + SESSION_EXPIRATION_MS,
      sessionNumber: 1,
    };
  }

  const rawSession = safeRead(window.localStorage, SESSION_STORAGE_KEY);
  const visitor = getOrCreateVisitor();

  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession) as StoredSession;
      if (parsed.sessionId && parsed.expiresAt > now) {
        // Active session: extend expiration
        const refreshed: StoredSession = {
          ...parsed,
          expiresAt: now + SESSION_EXPIRATION_MS,
        };
        safeWrite(window.localStorage, SESSION_STORAGE_KEY, JSON.stringify(refreshed));
        return refreshed;
      }
    } catch {
      // Fall through
    }
  }

  // New session
  const newSessionNumber = (visitor.totalSessions || 1) + (rawSession ? 1 : 0);
  const updatedVisitor: StoredVisitor = {
    ...visitor,
    totalSessions: newSessionNumber,
  };
  safeWrite(window.localStorage, VISITOR_STORAGE_KEY, JSON.stringify(updatedVisitor));

  const newSession: StoredSession = {
    sessionId: generateRandomId('sess'),
    startedAt: now,
    expiresAt: now + SESSION_EXPIRATION_MS,
    sessionNumber: newSessionNumber,
  };

  safeWrite(window.localStorage, SESSION_STORAGE_KEY, JSON.stringify(newSession));
  return newSession;
};

const resolveFriendlyPageTitle = (path: string): string => {
  const cleanPath = path.split('?')[0].toLowerCase();
  if (cleanPath === '' || cleanPath === '/') return 'الصفحة الرئيسية';
  if (cleanPath.startsWith('/product/') || cleanPath.startsWith('/p/')) {
    const docTitle = isBrowser ? document.title?.trim() : '';
    if (docTitle && !docTitle.toLowerCase().includes('maxp')) {
      return docTitle.split(/[-|–]/)[0].trim();
    }
    return 'صفحة تفاصيل المنتج';
  }
  if (cleanPath === '/cart') return 'سلة المشتريات';
  if (cleanPath === '/checkout') return 'صفحة إتمام الطلب';
  if (cleanPath === '/shop' || cleanPath === '/catalog') return 'كتالوج المنتجات';
  if (cleanPath.startsWith('/collection') || cleanPath.startsWith('/category')) return 'قسم التصنيفات';
  if (cleanPath.startsWith('/order-confirmed') || cleanPath.startsWith('/thank-you')) return 'تأكيد الطلب';
  if (cleanPath.startsWith('/track')) return 'تتبع الشحنة';

  if (isBrowser && document.title) {
    const t = document.title.split(/[-|–]/)[0].trim();
    if (t) return t;
  }
  return cleanPath;
};

/**
 * Records a page visit into the current session's journey history.
 */
export const recordPageVisit = (path: string, customTitle?: string): void => {
  if (!isBrowser || !path) return;

  // Refresh or initiate session
  getOrCreateSession();

  let journey: StorefrontPageVisit[] = [];
  const rawJourney = safeRead(window.sessionStorage, PAGES_JOURNEY_KEY);
  if (rawJourney) {
    try {
      const parsed = JSON.parse(rawJourney);
      if (Array.isArray(parsed)) {
        journey = parsed;
      }
    } catch {
      journey = [];
    }
  }

  const title = customTitle || resolveFriendlyPageTitle(path);
  const nowIso = new Date().toISOString();

  // Deduplicate consecutive identical visits within 3 seconds
  const lastVisit = journey[journey.length - 1];
  if (lastVisit && lastVisit.path === path) {
    const lastTime = new Date(lastVisit.timestamp).getTime();
    if (Date.now() - lastTime < 3000) {
      return;
    }
  }

  journey.push({
    path,
    title,
    timestamp: nowIso,
  });

  if (journey.length > MAX_PAGES_TRACKED) {
    journey = journey.slice(-MAX_PAGES_TRACKED);
  }

  safeWrite(window.sessionStorage, PAGES_JOURNEY_KEY, JSON.stringify(journey));
};

/**
 * Returns the array of visited pages in the current session.
 */
export const getVisitedPages = (): StorefrontPageVisit[] => {
  if (!isBrowser) return [];
  const rawJourney = safeRead(window.sessionStorage, PAGES_JOURNEY_KEY);
  if (!rawJourney) return [];
  try {
    const parsed = JSON.parse(rawJourney);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Reads cached IP and governorate/city from local storage if previously resolved.
 */
const getCachedIpGeo = (): { ip?: string; governorate?: string; city?: string } => {
  if (!isBrowser) return {};
  try {
    const raw = safeRead(window.localStorage, IP_GEO_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      ip: parsed?.ip || undefined,
      governorate: parsed?.result?.governorate || undefined,
      city: parsed?.result?.city || undefined,
    };
  } catch {
    return {};
  }
};

/**
 * Builds the complete Session Details snapshot to send with checkout drafts and completed orders.
 */
export const getStorefrontSessionDetails = (
  companyId?: string | null,
): StorefrontSessionDetails => {
  const visitor = getOrCreateVisitor();
  const session = getOrCreateSession();
  const attribution = getOrderAttributionPayload(companyId);
  const pagesVisited = getVisitedPages();
  const ipGeo = getCachedIpGeo();

  const now = Date.now();
  const durationSeconds = Math.max(0, Math.round((now - session.startedAt) / 1000));

  return {
    sessionId: session.sessionId,
    visitorId: visitor.visitorId,
    ip: ipGeo.ip,
    ipGovernorate: ipGeo.governorate,
    ipCity: ipGeo.city,
    trafficSource: attribution
      ? {
          platform: attribution.platform,
          source: attribution.source,
          medium: attribution.medium,
          campaignName: attribution.campaignName,
          campaignId: attribution.campaignId,
          adSetId: attribution.adSetId,
          adId: attribution.adId,
          referrer: attribution.referrer,
          landingPath: attribution.landingPath,
        }
      : undefined,
    pagesVisited,
    durationSeconds,
    sessionStartedAt: new Date(session.startedAt).toISOString(),
    sessionCount: visitor.totalSessions || 1,
    firstSeenAt: visitor.firstSeenAt,
  };
};

export default getStorefrontSessionDetails;
