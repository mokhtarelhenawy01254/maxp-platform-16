/**
 * Global Security Middleware
 * نظام حماية شامل لجميع routes في التطبيق
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getJwtSecret, isMissingAuthSecretError } = require('../utils/jwtSecret');
const tenantContext = require('../services/tenantContext');
const { hasStaticFileExtension } = require('../services/storefrontSeoService');

const LOG_FILE = 'e:/max_p_new/max_p_new/backend/debug_auth.log';

const debugLogToFile = (msg) => {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
  } catch (e) {
    // Silent fail if needed, but we want to see this
  }
};

// Security logging system
class SecurityLogger {
  constructor() {
    this.logs = new Map();
    this.alertThresholds = {
      'failed_auth': { count: 10, timeWindow: 300000 }, // 10 attempts in 5 minutes (increased from 5)
      'company_violation': { count: 5, timeWindow: 300000 }, // 5 violations in 5 minutes (increased from 3)
      'unauthorized_access': { count: 15, timeWindow: 600000 } // 15 attempts in 10 minutes (increased from 10)
    };
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
  }

  log(eventType, details) {
    const logEntry = {
      timestamp: new Date(),
      type: eventType,
      ...details
    };

    if (!this.logs.has(eventType)) {
      this.logs.set(eventType, []);
    }

    this.logs.get(eventType).push(logEntry);

    // Keep only last 1000 entries per event type
    if (this.logs.get(eventType).length > 1000) {
      this.logs.get(eventType).shift();
    }

    // Check for suspicious activity
    this.checkSuspiciousActivity(eventType, details);

    // Console logging with security level
    const securityLevel = this.getSecurityLevel(eventType);
    console.log(`🔒 [SECURITY-${securityLevel}] ${eventType}:`, details);

    // Write critical events to file
    if (securityLevel === 'CRITICAL') {
      this.writeToSecurityLog(logEntry);
    }
  }

  getSecurityLevel(eventType) {
    const criticalEvents = ['company_violation', 'unauthorized_database_access', 'token_tampering'];
    const highEvents = ['failed_auth', 'unauthorized_access', 'suspicious_activity'];
    const mediumEvents = ['company_access_denied', 'invalid_token'];

    if (criticalEvents.includes(eventType)) return 'CRITICAL';
    if (highEvents.includes(eventType)) return 'HIGH';
    if (mediumEvents.includes(eventType)) return 'MEDIUM';
    return 'LOW';
  }

  checkSuspiciousActivity(eventType, details) {
    const ip = details.ip;
    if (!ip) return;

    const threshold = this.alertThresholds[eventType];
    if (!threshold) return;

    const now = Date.now();
    const recentEvents = this.logs.get(eventType).filter(
      log => log.ip === ip && (now - log.timestamp.getTime()) < threshold.timeWindow
    );

    if (recentEvents.length >= threshold.count) {
      this.log('suspicious_activity', {
        ip,
        eventType,
        count: recentEvents.length,
        timeWindow: threshold.timeWindow,
        severity: 'HIGH'
      });

      this.suspiciousIPs.add(ip);

      // Block IP after repeated violations
      if (recentEvents.length >= threshold.count * 2) {
        this.blockedIPs.add(ip);
        this.log('ip_blocked', { ip, reason: `Exceeded ${eventType} threshold` });
      }
    }
  }

  writeToSecurityLog(logEntry) {
    try {
      const logDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'security.log');
      const logLine = `${logEntry.timestamp.toISOString()} [${logEntry.type}] ${JSON.stringify(logEntry)}\n`;

      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  isIPSuspicious(ip) {
    return this.suspiciousIPs.has(ip);
  }

  getSecurityReport() {
    const report = {
      totalEvents: 0,
      eventsByType: {},
      suspiciousIPs: Array.from(this.suspiciousIPs),
      blockedIPs: Array.from(this.blockedIPs),
      recentCriticalEvents: []
    };

    for (const [eventType, events] of this.logs.entries()) {
      report.totalEvents += events.length;
      report.eventsByType[eventType] = events.length;

      // Get recent critical events (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCritical = events.filter(
        event => event.timestamp > oneDayAgo && this.getSecurityLevel(eventType) === 'CRITICAL'
      );
      report.recentCriticalEvents.push(...recentCritical);
    }

    return report;
  }

  clearOldLogs() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const [eventType, events] of this.logs.entries()) {
      const filteredEvents = events.filter(event => event.timestamp > oneWeekAgo);
      this.logs.set(eventType, filteredEvents);
    }

    // Clear old blocked and suspicious IPs (reset after 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Reset blocked IPs older than 24 hours
    this.blockedIPs.clear();
    this.suspiciousIPs.clear();

    console.log('🧹 [SECURITY-CLEANUP] Old security logs and IP blocks cleared');
  }

  // Manual IP management functions
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    console.log(`🔓 [SECURITY] IP ${ip} has been unblocked`);
  }

  clearAllBlocks() {
    const blockedCount = this.blockedIPs.size;
    const suspiciousCount = this.suspiciousIPs.size;
    this.blockedIPs.clear();
    this.suspiciousIPs.clear();
    console.log(`🔓 [SECURITY] Cleared ${blockedCount} blocked IPs and ${suspiciousCount} suspicious IPs`);
  }
}

const securityLogger = new SecurityLogger();

// Clear old logs and IP blocks every hour
const securityCleanupInterval = setInterval(() => {
  securityLogger.clearOldLogs();
}, 60 * 60 * 1000); // Every hour instead of weekly

if (typeof securityCleanupInterval.unref === 'function') {
  securityCleanupInterval.unref();
}

// ============================================================================
// In-memory cache for user/company lookups in globalAuthentication
// ============================================================================
const userCompanyCache = new Map();
const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getAiServiceToken() {
  return process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
}

function getHeaderValue(req, name) {
  const value = req.headers?.[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveServiceCompanyId(req) {
  const headerCompanyId = getHeaderValue(req, 'x-company-id');
  const companyId = headerCompanyId || req.query?.companyId || req.body?.companyId || null;
  return typeof companyId === 'string' && companyId.trim() ? companyId.trim() : null;
}

function tokenMatchesServiceToken(token, serviceToken) {
  if (!token || !serviceToken) return false;

  const tokenBuffer = Buffer.from(String(token));
  const serviceTokenBuffer = Buffer.from(String(serviceToken));
  if (tokenBuffer.length !== serviceTokenBuffer.length) return false;

  return crypto.timingSafeEqual(tokenBuffer, serviceTokenBuffer);
}

function getCachedUserCompany(userId) {
  const entry = userCompanyCache.get(userId);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > USER_CACHE_TTL_MS) {
    userCompanyCache.delete(userId);
    return null;
  }

  return entry;
}

function setCachedUserCompany(userId, data) {
  userCompanyCache.set(userId, {
    ...data,
    timestamp: Date.now()
  });
}

/**
 * Invalidate user/company cache for a specific user or all users.
 * @param {string|null} userId - User ID to invalidate, or null/falsy to clear all.
 */
function invalidateUserCompanyCache(userId) {
  if (userId) {
    userCompanyCache.delete(userId);
    console.log(`[SECURITY-CACHE] Invalidated cache for user ${userId}`);
  } else {
    userCompanyCache.clear();
    console.log(`[SECURITY-CACHE] Invalidated entire user/company cache`);
  }
}

/**
 * IP Blocking Middleware
 */
const ipBlockingMiddleware = (req, res, next) => {
  // ✅ تم تعطيل حظر الوصول - يمرر كل الطلبات بدون حظر
  // Get IP from various sources (للأغراض التسجيل فقط)
  const ip = req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    'unknown';

  // Normalize IP address
  const normalizedIP = ip.replace(/^::ffff:/, ''); // Remove IPv6 prefix for IPv4 addresses

  // تسجيل فقط بدون حظر
  if (securityLogger.isIPSuspicious(normalizedIP)) {
    securityLogger.log('suspicious_ip_access', {
      ip: normalizedIP,
      path: req.path,
      method: req.method
    });
  }

  // تمرير كل الطلبات بدون حظر
  return next();
};

/**
 * Enhanced Request Logging Middleware
 */
const enhancedRequestLogging = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;

  // Log all requests for security monitoring
  securityLogger.log('request_received', {
    ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
    headers: {
      authorization: req.headers.authorization ? 'Bearer [REDACTED]' : 'None',
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });

  // Log security-relevant responses after response finishes
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    if (res.statusCode >= 400) {
      const logType = res.statusCode === 401 ? 'auth_failure' :
        res.statusCode === 403 ? 'access_denied' : 'error_response';

      securityLogger.log(logType, {
        ip,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        errorCode: res._responseBody?.code
      });
    }
  });

  next();
};
const PUBLIC_ROUTES = [
  // Authentication routes
  'GET /api/v1/auth/business-specialties',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/signup-coupon/validate',
  'POST /api/v1/auth/login',
  'POST /api/v1/super-admin/login',
  'GET /api/v1/auth/verify-email',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',
  'POST /api/v1/auth/send-verification',

  // Health and system routes
  'GET /health*',
  'GET /api/health*',
  'GET /api/v1/health*',
  'GET /api/v1/version',
  'GET /api/v1/app/version*',
  'GET /api/v1/companies/current',
  'POST /api/v1/errors/log',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/logout',
  'GET /',
  'OPTIONS *',

  // Internal deployment and cache purge routes (secured via x-deploy-secret header)
  'GET /api/v1/internal/*',
  'POST /api/v1/internal/*',

  // Public geolocation (used for language defaults / UX)
  'GET /api/geolocation/*',
  'GET /api/v1/geolocation/*',

  // Webhook routes (تحتاج مصادقة خاصة)
  'GET /webhook',
  'POST /webhook',
  'GET /webhook/*',
  'POST /webhook/*',
  'GET /api/v1/webhook',
  'POST /api/v1/webhook',
  'GET /api/v1/webhook/*',
  'POST /api/v1/webhook/*',
  'GET /api/v1/webhooks',
  'POST /api/v1/webhooks',
  'GET /api/v1/webhooks/*',
  'POST /api/v1/webhooks/*',
  'GET /api/v1/whatsapp/meta/webhook',
  'POST /api/v1/whatsapp/meta/webhook',
  'GET /api/v1/tiktok/messaging/webhook',
  'POST /api/v1/tiktok/messaging/webhook',
  'GET /api/v1/tiktok/messaging/webhook/*',
  'POST /api/v1/tiktok/messaging/webhook/*',
  'GET /api/v1/whatsapp-meta',
  'GET /api/v1/whatsapp-meta/*',
  'POST /api/v1/whatsapp-meta',
  'POST /api/v1/whatsapp-meta/*',
  'POST /api/v1/telegram/webhook/*',

  // Facebook OAuth callback routes (NO AUTHENTICATION - Facebook redirects here directly)
  'GET /api/v1/facebook-oauth/callback',
  'GET /api/v1/facebook-oauth/pixel-callback',
  'GET /api/v1/facebook-oauth/popup-close.js',

  // Image proxy routes (للصور الخارجية)
  'GET /api/proxy-image',
  'GET /api/v1/proxy-image',
  'HEAD /api/proxy-image',
  'HEAD /api/v1/proxy-image',
  'GET /api/v1/proxy',
  'HEAD /api/v1/proxy',

  // Uploads routes (للصور والملفات المرفوعة)
  'GET /uploads/*',
  'POST /uploads/*',

  // Public invitation routes
  'GET /api/v1/invitations/verify/*',
  'POST /api/v1/invitations/accept/*',
  'GET /api/v1/hr/employee-invitations/verify/*',
  'POST /api/v1/hr/employee-invitations/accept/*',

  // ❌ REMOVED: Pattern System routes - Pattern System removed

  // Development routes (في بيئة التطوير فقط)
  'POST /api/v1/dev/create-test-user',

  // Temporary: notifications routes for testing
  'GET /api/v1/notifications/test',
  'GET /api/v1/notifications/recent',
  'POST /api/v1/notifications/*/read',
  'DELETE /api/v1/notifications/*',
  'POST /api/v1/notifications/mark-all-read',
  'GET /api/v1/notifications/push/public-key',
  'GET /api/notifications/push/public-key',

  // Temporary: queue stats for debugging
  'GET /api/v1/queue-stats',
  'GET /api/v1/queue-stats/*',

  // Temporary: opportunities routes for testing
  'GET /api/v1/opportunities',
  'GET /api/v1/opportunities/*',
  'POST /api/v1/opportunities',
  'PUT /api/v1/opportunities/*',
  'DELETE /api/v1/opportunities/*',

  // Public storefront routes (no authentication required)
  'GET /api/v1/public/*',
  'POST /api/v1/public/*',
  'PUT /api/v1/public/*',
  'DELETE /api/v1/public/*',
  'PATCH /api/v1/public/*',

  // Public storefront analytics tracking events
  'POST /api/v1/analytics/track/*',

  // Public affiliate and merchant registration (no authentication required)
  'POST /api/v1/affiliates/register',
  'POST /api/v1/public/affiliates/register',
  'POST /api/v1/merchants',
  'POST /api/v1/public/merchants/register',

  // Public homepage routes (all methods for storefront)
  'GET /api/v1/homepage/*',
  'POST /api/v1/homepage/*',
  'PUT /api/v1/homepage/*',
  'DELETE /api/v1/homepage/*',

  // Public footer settings
  'GET /api/v1/public/footer-settings/*',
  'POST /api/v1/public/footer-settings/*',

  // Public storefront settings
  'GET /api/v1/public/storefront-settings/*',
  'POST /api/v1/public/storefront-settings/*',

  // Public coupons
  'GET /api/v1/public/coupons/*',
  'POST /api/v1/public/coupons/*',

  // Operator: admin funnel publisher (auth via x-admin-secret header, checked in route handler)
  'POST /api/v1/funnels/admin/publish-by-product',
  'POST /api/v1/funnels/admin/refresh',

  // Public service order and services (no authentication required)
  'GET /api/v1/services',
  'POST /api/v1/service-orders',

  // Public shipping quotes for storefront checkout
  'GET /api/v1/shipping-zones/public/*',
  'POST /api/v1/shipping-zones/public/*',

  // Public store pages (no authentication required)
  'GET /api/v1/store-pages/*/public',
  'POST /api/v1/store-pages/public',
  'GET /api/v1/store-pages/*/slug/*',
  'POST /api/v1/store-pages/*/newsletter-subscribe',

  // Public Application Form Routes (للمتقدمين على الوظائف)
  'GET /api/v1/hr/recruitment/forms/public/*',
  'POST /api/v1/hr/recruitment/forms/public/*',

  // Local WhatsApp Bridge endpoint (SMS Parity)
  'POST /api/v1/whatsapp/whatsapp',

  // Agent Inbox external API uses x-api-key/Bearer service-key auth in its own router.
  'GET /api/v1/agent-inbox/facebook/*',
  'POST /api/v1/agent-inbox/facebook/*',

  // Teacher Portal (public login endpoint)
  'POST /api/v1/education/teacher-portal/login',

  // Parent Portal (public login endpoint)
  'POST /api/v1/education/parent-portal/login',

  // Booking Doctor Portal (public login endpoint)
  'POST /api/v1/booking/doctor-portal/login',

  // Booking Patient Portal (public login endpoint)
  'POST /api/v1/booking/patient-portal/login',

  // Dental Lab Doctor Portal (public login endpoint)
  'POST /api/v1/dental-lab/portal/login',

  // Public Marketing Agency approvals portal
  'GET /api/v1/agency/public/*',
  'POST /api/v1/agency/public/*',
  'GET /api/v1/agency/public-approval/*',
  'POST /api/v1/agency/public-approval/*',
  'GET /api/agency/public/*',
  'POST /api/agency/public/*',
  'GET /api/agency/public-approval/*',
  'POST /api/agency/public-approval/*',

  // Public Support
  'GET /api/v1/support/faq',

  'GET /api/v1/support/faq/categories',
  'POST /api/v1/support/faq/*/rate',
  'GET /api/v1/faqs'
];

/**
 * قائمة Routes الإدارية التي تحتاج صلاحيات خاصة
 */
const ADMIN_ROUTES = [
  'GET /api/v1/admin/*',
  'POST /api/v1/admin/*',
  'PUT /api/v1/admin/*',
  'DELETE /api/v1/admin/*',
  'GET /api/v1/whatsapp/*',
  'POST /api/v1/whatsapp/*',
  'PUT /api/v1/whatsapp/*',
  'DELETE /api/v1/whatsapp/*',
  'GET /api/v1/hr/*',
  'POST /api/v1/hr/*',
  'PUT /api/v1/hr/*',
  'DELETE /api/v1/hr/*',
  'GET /api/v1/inventory/*',
  'POST /api/v1/inventory/*',
  'PUT /api/v1/inventory/*',
  'DELETE /api/v1/inventory/*',
  'GET /api/v1/analytics/*',
  'POST /api/v1/analytics/*'
];

/**
 * قائمة Routes التي تحتاج عزل شركات
 */
const COMPANY_ISOLATED_ROUTES = [
  '/api/v1/products/*',
  '/api/v1/customers/*',
  '/api/v1/conversations/*',
  '/api/v1/orders/*',
  '/api/v1/companies/*',
  '/api/v1/users/*',
  '/api/v1/ai/*',
  '/api/v1/integrations/*',
  '/api/v1/google-sheets/*',
  '/api/v1/settings/*',
  '/api/v1/whatsapp/*',
  '/api/v1/whatsapp/automation/*',
  '/api/v1/hr/*',
  '/api/v1/inventory/*',
  '/api/v1/analytics/*'
];

/**
 * فحص ما إذا كان route عام
 */
function isPublicRoute(method, path) {
  if (!path) return false;

  // 1. الأساسيات: إزالة Query Params وتوحيد السلاش
  let cleanPath = path.split('?')[0];

  // 2. معالجة الروابط الكاملة (في حال وجود بروتوكول ونطاق)
  if (cleanPath.includes('://')) {
    try {
      cleanPath = new URL(cleanPath).pathname;
    } catch (e) {
      cleanPath = cleanPath.substring(cleanPath.indexOf('/', cleanPath.indexOf('://') + 3));
    }
  }

  // 3. توحيد السلاشات المتكررة وإزالة السلاش الأخير
  cleanPath = cleanPath.replace(/\/+/g, '/');
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }

  // 4. توحيد بادئة api/v1 لتسهيل المطابقة (مهم جداً لأن Nginx قد يحذف بادئة /api)
  let normalizedPath = cleanPath;
  if (!normalizedPath.startsWith('/api/v1/')) {
    if (normalizedPath.startsWith('/api/')) {
      normalizedPath = '/api/v1/' + normalizedPath.slice(5);
    } else if (normalizedPath.startsWith('/v1/')) {
      normalizedPath = '/api' + normalizedPath;
    } else {
      // إذا كان المسار لا يبدأ بـ api، قد يكون مساراً عاماً أساسياً مثل /health
      if (normalizedPath === '/health') normalizedPath = '/api/v1/health';
    }
  }

  const upperMethod = method?.toUpperCase() || 'GET';

  return PUBLIC_ROUTES.some(route => {
    const [routeMethod, routePath] = route.split(' ');

    // توحيد نمط الـ route
    let cleanRoutePath = routePath.replace(/\/+/g, '/');
    if (cleanRoutePath.length > 1 && cleanRoutePath.endsWith('/')) {
      cleanRoutePath = cleanRoutePath.slice(0, -1);
    }

    if (routeMethod === '*' || routeMethod.toUpperCase() === upperMethod) {
      if (cleanRoutePath === '*') return true;

      // Handle wildcard at the end (only if there is no other wildcard in the middle)
      if (cleanRoutePath.endsWith('*') && !cleanRoutePath.slice(0, -1).includes('*')) {
        const prefix = cleanRoutePath.slice(0, -1);
        return normalizedPath.startsWith(prefix) || (normalizedPath + '/').startsWith(prefix);
      }

      // Handle wildcard in the middle (e.g., /api/v1/store-pages/*/public)
      if (cleanRoutePath.includes('*')) {
        const regexPattern = cleanRoutePath
          .replace(/\*/g, '[^/]+')
          .replace(/\//g, '\\/');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(normalizedPath);
      }

      return cleanRoutePath === normalizedPath;
    }

    return false;
  });
}

/**
 * فحص ما إذا كان route إداري
 */
function isAdminRoute(method, path) {
  return ADMIN_ROUTES.some(route => {
    const [routeMethod, routePath] = route.split(' ');

    if (routeMethod === '*' || routeMethod === method) {
      if (routePath.endsWith('*')) {
        return path.startsWith(routePath.slice(0, -1));
      }
      return routePath === path;
    }

    return false;
  });
}

/**
 * فحص ما إذا كان route يحتاج عزل شركات
 */
function needsCompanyIsolation(path) {
  // Exclude specific endpoints that should not require company isolation
  const excludedPaths = [
    '/api/v1/companies/current',
    '/api/v1/companies/usage-safe',
    '/api/v1/companies/plans',
    '/api/v1/whatsapp/whatsapp', // Local WhatsApp Bridge endpoint (SMS Parity)
    '/api/v1/whatsapp/meta/webhook',
    '/api/v1/whatsapp-meta',
    '/api/v1/hr/recruitment/forms/public'
  ];

  if (excludedPaths.some(excluded => path === excluded || path.startsWith(excluded + '?') || path.startsWith(excluded + '/'))) {
    return false;
  }

  return COMPANY_ISOLATED_ROUTES.some(route => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return route === path;
  });
}

function isExpectedPublicCompanyFallbackRequest(req) {
  const method = String(req?.method || '').toUpperCase();
  const originalUrl = String(req?.originalUrl || req?.path || '');

  if (method !== 'POST') {
    return false;
  }

  return /\/analytics\/track\/(store-visit|product-view|conversion)(?:\?|$)/.test(originalUrl);
}

const normalizeStorefrontHost = (value) =>
  String(value || '').split(':')[0].trim().toLowerCase();

const isLocalStorefrontHost = (hostname) =>
  !hostname ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '0.0.0.0' ||
  hostname.endsWith('.localhost') ||
  hostname.endsWith('.lvh.me') ||
  hostname.endsWith('.local') ||
  /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

const isTenantStorefrontHost = (hostname, configuredMainDomain) => {
  const normalizedHostname = normalizeStorefrontHost(hostname);
  const mainDomain = normalizeStorefrontHost(configuredMainDomain);

  if (!normalizedHostname || normalizedHostname.startsWith('www.')) {
    return false;
  }

  if (mainDomain) {
    if (
      normalizedHostname === mainDomain ||
      normalizedHostname === `www.${mainDomain}`
    ) {
      return false;
    }

    if (normalizedHostname.endsWith(`.${mainDomain}`)) {
      return true;
    }
  }

  return (
    normalizedHostname.split('.').length >= 3 &&
    !isLocalStorefrontHost(normalizedHostname)
  );
};

function isPublicStorefrontShellRequest(req) {
  const method = (req.method || 'GET').toUpperCase();
  const rawPath = req.originalUrl?.split('?')[0] || req.path || '/';

  if (method !== 'GET' && method !== 'HEAD') {
    return false;
  }

  if (
    rawPath.startsWith('/api') ||
    rawPath.startsWith('/uploads') ||
    rawPath.startsWith('/socket.io') ||
    rawPath.startsWith('/webhook')
  ) {
    return false;
  }

  if (hasStaticFileExtension(rawPath)) {
    return false;
  }

  const forwardedHost = normalizeStorefrontHost(req.headers['x-subdomain']);
  const hostHeader = normalizeStorefrontHost(req.headers.host);
  const mainDomain = process.env.MAIN_DOMAIN || 'mokhtarelhenawy.online';

  return isTenantStorefrontHost(forwardedHost || hostHeader, mainDomain);
}

/**
 * Middleware المصادقة العامة (Enhanced with security logging)
 */
const globalAuthentication = async (req, res, next) => {
  try {
    const method = req.method;
    const path = req.originalUrl?.split('?')[0] || req.path;
    const ip = req.ip || req.connection.remoteAddress;

    // Safety net: refresh endpoint must stay public to avoid forced logout loops.
    const normalizedPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
    const isRefreshEndpoint =
      method === 'POST' &&
      (
        normalizedPath === '/api/v1/auth/refresh' ||
        normalizedPath === '/api/auth/refresh' ||
        normalizedPath === '/auth/refresh'
      );
    if (isRefreshEndpoint) {
      return next();
    }

    const isPublic = isPublicRoute(method, path);
    const isPublicStorefrontShell = isPublicStorefrontShellRequest(req);
    const logMsg = `[SECURITY] ${method} ${path} | Public: ${isPublic} | StorefrontShell: ${isPublicStorefrontShell} | Auth: ${req.headers.authorization ? 'YES' : 'NO'}`;
    console.log(logMsg);
    debugLogToFile(logMsg);

    if (isPublic) {
      debugLogToFile(`[PUBLIC] Skipping auth for: ${path}`);
      return next();
    }

    if (isPublicStorefrontShell) {
      debugLogToFile(`[PUBLIC-STOREFRONT] Skipping auth for storefront shell: ${path}`);
      return next();
    }

    // 1. Extract Token
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.substring(7)
      : req.cookies?.token ||
        // model-viewer fetches /dental-lab/files/<name> and thermal waybills open in new tabs without an Authorization
        // header, so allow the access token via query param for these specific routes.
        (path.startsWith('/api/v1/dental-lab/files/') || path.includes('/waybill') || path.includes('/qp-express/waybill') || path.includes('/bosta/waybill')
          ? (req.query?.token || null)
          : null);

    // 2. Storefront Guest Access
    const isIsolated = COMPANY_ISOLATED_ROUTES.some(ir => path.includes(ir.replace('*', '')));
    if (!token && req.company && method === 'GET' && !isAdminRoute(method, path) && !isIsolated) {
      const sensitivePaths = ['/cart', '/profile', '/orders', '/wallet', '/settings', '/whatsapp', '/hr', '/inventory', '/analytics'];
      const isSensitive = sensitivePaths.some(sp => path.includes(sp));

      if (!isSensitive) {
        return next();
      }
    }

    if (!token) {
      debugLogToFile(`❌ REJECTED 401 (No Token): ${method} ${path}`);
      securityLogger.log('failed_auth', {
        ip,
        method,
        path,
        reason: 'No token provided'
      });
      return res.status(401).json({
        success: false,
        message: 'مطلوب تسجيل الدخول للوصول لهذا المورد',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const serviceToken = getAiServiceToken();
    if (tokenMatchesServiceToken(token, serviceToken)) {
      const companyId = resolveServiceCompanyId(req);
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'companyId is required for service access',
          code: 'SERVICE_COMPANY_ID_REQUIRED'
        });
      }

      req.user = {
        id: 'ai-service',
        firstName: 'AI',
        lastName: 'Service',
        email: 'ai-service@maxp.local',
        role: 'AI_SERVICE',
        companyId,
        effectiveCompanyId: companyId,
        service: true
      };
      req.companyId = companyId;

      console.log(`✅ [SECURITY] AI Service Auth Success on ${path}`);
      return tenantContext.run(companyId, () => next());
    }

    // 3. Verify Token
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (error) {
      if (isMissingAuthSecretError(error)) {
        debugLogToFile(`❌ AUTH CONFIG ERROR: ${error.message} on ${path}`);
        return res.status(500).json({
          success: false,
          message: 'إعدادات المصادقة غير مكتملة',
          code: 'AUTH_CONFIGURATION_ERROR'
        });
      }

      debugLogToFile(`❌ JWT ERROR: ${error.message} on ${path}`);

      return res.status(401).json({
        success: false,
        message: 'رمز المصادقة غير صحيح',
        code: 'INVALID_TOKEN'
      });
    }

    // 4. Set User Info
    const userId = decoded.userId || decoded.id;

    // 🛡️ PRODUCTION-FIX (tenant-isolation-2026-08-23):
    // الـ base companyId دايماً من الـ JWT. كان من قبل بياخد override من
    // `X-Company-Id` header لكل user، وده كان بيسمح لـ attacker يعمل
    // cross-tenant attacks (مثل `POST /api/v1/order-status-rules` بـ
    // `X-Company-Id: <otherCompany>` عشان يعمل rule على شركة تانية).
    //
    // الـ impersonation الشرعية للـ SUPER_ADMIN موجودة في `requireCompanyAccess`
    // middleware (verifyToken.js:458-462) باستخدام URL param — مش header.
    // service-to-service flow بيستخدم `resolveServiceCompanyId` (L222) مع
    // `x-service-token` — flow منفصل تماماً عن الـ JWT path.
    //
    // بنسمح فقط للـ SUPER_ADMIN بـ override عبر header (مع audit log) عشان
    // الـ admin tools الموجودة تقدر تشتغل على routes مفيهاش requireCompanyAccess.
    let activeCompanyId = decoded.companyId;
    const isSuperAdmin = decoded.role === 'SUPER_ADMIN';
    const headerCompanyId = req.headers['x-company-id'] || req.headers['X-Company-Id'];

    if (isSuperAdmin && headerCompanyId && headerCompanyId !== decoded.companyId) {
      activeCompanyId = headerCompanyId;
      // 🔒 Audit log — كل SUPER_ADMIN impersonation لازم يتسجل للمراجعة.
      // ده هيظهر في أي log aggregator (CloudWatch, Datadog, Sentry).
      console.log(
        `🔐 [ADMIN-IMPERSONATION] ${decoded.email} ` +
        `(userId=${userId}) impersonating company=${headerCompanyId} ` +
        `on ${req.method} ${path} at ${new Date().toISOString()}`
      );
    }

    if (!activeCompanyId && userId) {
      try {
        const cached = getCachedUserCompany(userId);
        if (cached && cached.user) {
          console.log(`[SECURITY-CACHE] Cache hit for user ${userId}`);
          if (cached.user.companyId) activeCompanyId = cached.user.companyId;
        } else {
          const { getSharedPrismaClient } = require('../services/sharedDatabase');
          const user = await getSharedPrismaClient().user.findUnique({
            where: { id: userId },
            select: { companyId: true }
          });
          if (user?.companyId) {
            activeCompanyId = user.companyId;
            setCachedUserCompany(userId, { user, company: null });
          }
        }
      } catch (e) { }
    }

    req.user = {
      ...decoded,
      id: userId,
      companyId: activeCompanyId
    };

    console.log(`✅ [SECURITY] Auth Success: ${decoded.email} on ${path}`);
    next();

  } catch (error) {
    console.error('🔥 [SECURITY] Global Auth Error:', error);
    debugLogToFile(`🔥 CRITICAL ERROR: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من المصادقة',
      code: 'AUTHENTICATION_ERROR'
    });
  }
};

/**
 * Middleware عزل الشركات العام (Enhanced with security logging)
 */
const globalCompanyIsolation = async (req, res, next) => {
  try {
    const path = req.path;
    const ip = req.ip || req.connection.remoteAddress;

    // تطبيق عزل الشركات فقط على routes المحددة
    if (!needsCompanyIsolation(path)) {
      return next();
    }

    const fallbackCompanyId = req.headers['x-company-id'] || req.query?.companyId || req.body?.companyId || req.companyId;
    const isExpectedPublicFallback = isExpectedPublicCompanyFallbackRequest(req);

    // التأكد من وجود معلومات المستخدم
    if (!req.user || !req.user.companyId) {
      if (isExpectedPublicFallback && fallbackCompanyId) {
        if (!req.user) req.user = {};
        req.user.companyId = fallbackCompanyId;
        req.companyId = fallbackCompanyId;
      } else {
        console.log('🚨 [GLOBAL-SEC-DEBUG] Missing user or companyId in globalCompanyIsolation');
        console.log('UserData:', req.user ? JSON.stringify(req.user) : 'No User');
        console.log('Headers:', JSON.stringify(req.headers['x-company-id']));
        console.log('Query:', JSON.stringify(req.query));
        console.log('Fallback derived:', fallbackCompanyId);

        securityLogger.log('company_isolation_failure', {
          ip,
          method: req.method,
          path,
          userId: req.user?.id,
          reason: 'No company ID in user token'
        });
      }
    }

    if (!req.user || (!req.user.companyId && req.user.role !== 'SUPER_ADMIN')) {
      if (fallbackCompanyId) {
        if (!isExpectedPublicFallback) {
          console.log('✅ [GLOBAL-SEC-DEBUG] Recovered companyId from fallback:', fallbackCompanyId);
        }
        if (!req.user) req.user = {};
        req.user.companyId = fallbackCompanyId;
        req.companyId = fallbackCompanyId;
      } else if (req.user?.role !== 'SUPER_ADMIN') {
        console.log('❌ [GLOBAL-SEC-DEBUG] Failed to recover companyId. Returning 403.');
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب للوصول لهذا المورد',
          code: 'COMPANY_ID_REQUIRED'
        });
      }
    }

    // إضافة companyId للطلب
    req.companyId = req.user.companyId;

    // التحقق من محاولة الوصول لشركة أخرى
    const requestedCompanyId = req.params.companyId || req.body?.companyId || req.query?.companyId;

    if (requestedCompanyId && req.user.role !== 'SUPER_ADMIN') {
      // ⚡ FIX: Instead of strict check, allow if they are in the decoded active company
      // This supports the x-company-id header logic
      if (requestedCompanyId !== req.user.companyId) {
        // If it still doesn't match, they might be attempting a violation
        // OR the frontend provided a mismatching companyId in body vs header
        securityLogger.log('company_violation', {
          ip,
          userId: req.user.id,
          userEmail: req.user.email,
          userCompanyId: req.user.companyId,
          requestedCompanyId,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          severity: 'CRITICAL'
        });

        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لبيانات هذه الشركة',
          code: 'COMPANY_ACCESS_DENIED',
          context: `User active company: ${req.user.companyId}, requested: ${requestedCompanyId}`
        });
      }
    }

    // Log successful company access
    securityLogger.log('company_access_granted', {
      ip,
      userId: req.user.id,
      companyId: req.user.companyId,
      method: req.method,
      path,
      requestedCompanyId
    });

    next();

  } catch (error) {
    securityLogger.log('company_isolation_error', {
      ip: req.ip,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من صلاحية الوصول للشركة',
      code: 'COMPANY_ISOLATION_ERROR'
    });
  }
};

/**
 * Security Monitoring Dashboard Route
 */
const securityDashboard = (req, res) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required for security dashboard'
      });
    }

    const securityReport = securityLogger.getSecurityReport();

    res.json({
      success: true,
      data: securityReport
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate security report',
      error: error.message
    });
  }
};

/**
 * Clear All IP Blocks Route (Emergency)
 */
const clearIPBlocks = (req, res) => {
  try {
    // Allow any authenticated user to clear blocks in emergency
    securityLogger.clearAllBlocks();

    res.json({
      success: true,
      message: 'All IP blocks have been cleared successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to clear IP blocks',
      error: error.message
    });
  }
};

/**
 * Middleware الأمان الشامل (Enhanced)
 */
const globalSecurity = [
  ipBlockingMiddleware,
  enhancedRequestLogging,
  globalAuthentication,
  globalCompanyIsolation
];

module.exports = {
  globalSecurity,
  globalAuthentication,
  globalCompanyIsolation,
  ipBlockingMiddleware,
  enhancedRequestLogging,
  securityDashboard,
  clearIPBlocks,
  securityLogger,
  isPublicRoute,
  isPublicStorefrontShellRequest,
  isAdminRoute,
  needsCompanyIsolation,
  isExpectedPublicCompanyFallbackRequest,
  invalidateUserCompanyCache
};

