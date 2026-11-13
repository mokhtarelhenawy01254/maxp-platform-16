/**
 * 📊 Storefront Analytics Controller (AN-1)
 *
 * Implements:
 * 1. POST /api/v1/storefront-analytics/event (Public, in-memory rate-limited, privacy-first: ZERO IP / personal data stored)
 * 2. GET /api/v1/storefront-analytics/summary?days=7 (Authenticated + requireCompanyAccess)
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwtSecret');

// In-memory rate limiting: <= 60 events/minute/IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_PER_MINUTE = 60;
const ipRateLimitMap = new Map(); // ip -> { count: number, resetAt: number }

// Cleanup expired rate limit entries every 5 minutes to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRateLimitMap.entries()) {
    if (now > entry.resetAt) {
      ipRateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Checks in-memory rate limit for a client IP.
 * @param {string} ip
 * @returns {boolean} true if allowed, false if rate limited
 */
function checkRateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const entry = ipRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_PER_MINUTE) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Resets the in-memory rate limit map (useful for test isolation).
 */
function resetRateLimits() {
  ipRateLimitMap.clear();
}

/**
 * Extract client IP from request for rate limiting only.
 * NEVER stored in database.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

/**
 * POST /api/v1/storefront-analytics/event
 * Records a storefront view or click event.
 */
async function recordEvent(req, res) {
  try {
    const clientIp = getClientIp(req);

    // 1. In-memory rate limit check (<= 60 events/minute/IP)
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded (max 60 events/minute)',
      });
    }

    const { companySlug, companyId, pageKey, sectionType, eventType, sessionId, path, errorMessage, sectionKey } = req.body || {};

    const cleanSlug = companySlug && typeof companySlug === 'string' ? companySlug.trim().toLowerCase() : '';
    const cleanCompanyId = companyId && typeof companyId === 'string' ? companyId.trim() : '';

    // 2. Validate companySlug / companyId
    if (!cleanSlug && !cleanCompanyId) {
      return res.status(400).json({
        success: false,
        message: 'companySlug is required',
      });
    }

    // 3. Validate eventType (includes product & error telemetry PERF-1)
    const ALLOWED_EVENT_TYPES = [
      'view',
      'click',
      'studio_open',
      'studio_publish',
      'studio_template_apply',
      'studio_ai_open',
      'studio_error',
    ];

    if (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: "eventType must be 'view' or 'click'",
      });
    }

    const STUDIO_EVENT_TYPES = [
      'studio_open',
      'studio_publish',
      'studio_template_apply',
      'studio_ai_open',
      'studio_error',
    ];

    if (STUDIO_EVENT_TYPES.includes(eventType) || String(eventType).startsWith('studio_')) {
      let isAuthenticated = Boolean(req.user?.id || req.user?.userId);
      if (!isAuthenticated) {
        const authHeader = req.headers?.authorization;
        if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          const token = authHeader.slice(7).trim();
          if (token) {
            try {
              const decoded = jwt.verify(token, process.env.JWT_SECRET || getJwtSecret());
              isAuthenticated = Boolean(decoded && (decoded.userId || decoded.id));
            } catch (_) {
              isAuthenticated = false;
            }
          }
        }
      }
      if (!isAuthenticated) {
        return res.status(202).json({ success: true, ignored: true });
      }
    }

    // 4. Validate pageKey
    if (!pageKey || typeof pageKey !== 'string' || pageKey.trim().length === 0 || pageKey.trim().length > 64) {
      return res.status(400).json({
        success: false,
        message: 'pageKey is required and must be 1-64 characters',
      });
    }

    const prisma = getSharedPrismaClient();

    // 5. Look up company by slug or companyId
    let company = null;
    if (cleanSlug) {
      company = await prisma.company.findUnique({
        where: { slug: cleanSlug },
        select: { id: true, isActive: true },
      });
    } else if (cleanCompanyId) {
      company = await prisma.company.findUnique({
        where: { id: cleanCompanyId },
        select: { id: true, isActive: true },
      });
    }

    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Storefront company not found',
      });
    }

    // 6. Persist event — ZERO IP and ZERO personal data
    const resolvedSectionType = sectionType || sectionKey || (errorMessage ? String(errorMessage).slice(0, 64) : null);

    await prisma.storefrontAnalyticsEvent.create({
      data: {
        companyId: company.id,
        pageKey: pageKey.trim().slice(0, 64),
        sectionType: resolvedSectionType ? String(resolvedSectionType).trim().slice(0, 64) : null,
        eventType,
        sessionId: sessionId ? String(sessionId).trim().slice(0, 64) : null,
        path: path ? String(path).trim().slice(0, 255) : null,
      },
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('❌ [STOREFRONT-ANALYTICS] Error recording event:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to record analytics event',
    });
  }
}

/**
 * GET /api/v1/storefront-analytics/summary?days=7
 * Returns totals, pages, and sections breakdown for the authenticated merchant company.
 */
async function getSummary(req, res) {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId || req.query?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الشركة مطلوب',
      });
    }

    const rawDays = parseInt(req.query?.days, 10);
    const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 90) : 7;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const prisma = getSharedPrismaClient();

    // Query events within the specified time window
    const events = await prisma.storefrontAnalyticsEvent.findMany({
      where: {
        companyId,
        createdAt: { gte: cutoffDate },
      },
      select: {
        pageKey: true,
        sectionType: true,
        eventType: true,
      },
      take: 50000,
    });

    let totalViews = 0;
    let totalClicks = 0;
    const pagesMap = new Map();
    const sectionsMap = new Map();

    for (const ev of events) {
      const isView = ev.eventType === 'view';
      const isClick = ev.eventType === 'click';

      if (isView) totalViews += 1;
      if (isClick) totalClicks += 1;

      // Group by pageKey
      const pk = ev.pageKey || 'home';
      if (!pagesMap.has(pk)) {
        pagesMap.set(pk, { pageKey: pk, views: 0, clicks: 0 });
      }
      const pageEntry = pagesMap.get(pk);
      if (isView) pageEntry.views += 1;
      if (isClick) pageEntry.clicks += 1;

      // Group by sectionType
      if (ev.sectionType) {
        const st = ev.sectionType;
        if (!sectionsMap.has(st)) {
          sectionsMap.set(st, { sectionType: st, views: 0, clicks: 0 });
        }
        const sectionEntry = sectionsMap.get(st);
        if (isView) sectionEntry.views += 1;
        if (isClick) sectionEntry.clicks += 1;
      }
    }

    const pages = Array.from(pagesMap.values()).sort(
      (a, b) => b.views - a.views || b.clicks - a.clicks
    );

    const sections = Array.from(sectionsMap.values()).sort(
      (a, b) => b.views - a.views || b.clicks - a.clicks
    );

    const ctr = totalViews > 0 ? Number((totalClicks / totalViews).toFixed(4)) : 0;

    return res.json({
      totals: {
        views: totalViews,
        clicks: totalClicks,
        ctr,
      },
      pages,
      sections,
    });
  } catch (error) {
    console.error('❌ [STOREFRONT-ANALYTICS] Error fetching summary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics summary',
    });
  }
}

module.exports = {
  recordEvent,
  getSummary,
  checkRateLimit,
  resetRateLimits,
};
