
/**
 * Performance Monitoring and Optimization Middleware
 */

const startTime = Date.now();
const responseTimeCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const patchedResponses = new WeakSet();

function isResponsePatched(res) {
  return patchedResponses.has(res);
}

function patchResponse(res, req) {
  if (patchedResponses.has(res)) return;
  patchedResponses.add(res);

  const requestStart = Date.now();
  const originalJson = res.json;

  // Intercept Content-Length to flag large responses without an extra JSON.stringify
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = function(name, value) {
    if (String(name).toLowerCase() === 'content-length') {
      const size = parseInt(value, 10);
      if (!isNaN(size) && size > 10000) {
        originalSetHeader('X-Large-Response', 'true');
      }
    }
    return originalSetHeader(name, value);
  };

  // Unified res.json wrapper: capture body, set timing headers, then call original
  res.json = function(data) {
    res._responseBody = data;

    const responseTime = Date.now() - requestStart;
    if (responseTime > 1000) {
      console.warn(`🐌 [PERF] Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
      if (responseTime > 3000) {
        console.error(`🔥 [PERF] CRITICAL: Very slow request: ${req.method} ${req.path} - ${responseTime}ms`);
      }
    }

    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.setHeader('X-Request-ID', req.requestId);

    return originalJson.call(this, data);
  };

  res._responseFinishCallbacks = [];
  res.on('finish', () => {
    for (const cb of res._responseFinishCallbacks) {
      try {
        cb();
      } catch (e) {
        // ignore callback errors
      }
    }
  });
}

/**
 * Response time monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  patchResponse(res, req);
  next();
};

/**
 * Simple memory cache for frequently accessed data
 */
class SimpleCache {
  constructor(defaultTTL = 300000, maxSize = 2000) { // 5 minutes default, 2000 entry cap
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;
    // Periodically purge expired entries so the Map never grows unbounded
    // (expired keys were previously only removed when re-accessed, leaking memory).
    this.sweepTimer = setInterval(() => this.sweep(), 60000);
    if (this.sweepTimer.unref) {
      this.sweepTimer.unref();
    }
  }

  sweep() {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  set(key, value, ttl = this.defaultTTL) {
    if (this.cache.size >= this.maxSize) {
      this.sweep();
      if (this.cache.size >= this.maxSize) {
        // Still over the cap: evict oldest entries (Map preserves insertion order)
        const overflow = this.cache.size - this.maxSize + 1;
        const keys = this.cache.keys();
        for (let i = 0; i < overflow; i += 1) {
          this.cache.delete(keys.next().value);
        }
      }
    }
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  deleteMatching(predicate) {
    let deletedCount = 0;

    for (const key of Array.from(this.cache.keys())) {
      if (!predicate(key)) continue;
      if (this.cache.delete(key)) {
        deletedCount += 1;
      }
    }

    return deletedCount;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new SimpleCache();

const invalidateCompanySettingsCache = (companyId) => {
  if (!companyId) return 0;

  const settingsRoutes = [
    '/api/v1/companies/current',
    '/api/v1/company-dashboard/settings'
  ];

  return globalCache.deleteMatching((key) =>
    settingsRoutes.some((route) => key.includes(route)) &&
    key.endsWith(`_${companyId}`)
  );
};

const invalidateCompanyDashboardCache = (companyId) => {
  if (!companyId) return 0;

  const dashboardRoutes = [
    '/api/v1/company-dashboard',
    '/api/v1/company/dashboard'
  ];

  return globalCache.deleteMatching((key) =>
    dashboardRoutes.some((route) => key.includes(route)) &&
    key.endsWith(`_${companyId}`)
  );
};

/**
 * Caching middleware for GET requests
 */
const cacheMiddleware = (ttl = 300000) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and user/company context
    const userId = req.user?.id || req.user?.userId || 'anonymous';
    const companyId =
      req.user?.companyId ||
      req.user?.effectiveCompanyId ||
      req.headers['x-company-id'] ||
      'no_company';
    const cacheKey = `${req.originalUrl}_${userId}_${companyId}`;

    // Check cache
    const cachedResponse = globalCache.get(cacheKey);
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Mark as miss and register a finish callback to cache the response
    res.setHeader('X-Cache', 'MISS');
    res._responseFinishCallbacks = res._responseFinishCallbacks || [];
    res._responseFinishCallbacks.push(() => {
      if (res.statusCode === 200 && res._responseBody && res._responseBody.success !== false) {
        globalCache.set(cacheKey, res._responseBody, ttl);
      }
    });

    next();
  };
};

/**
 * Database query optimization middleware
 */
const queryOptimizer = (req, res, next) => {
  // Add query hints to request
  req.queryHints = {
    // Suggest using indices
    useIndex: true,
    // Limit default page size
    defaultLimit: 50,
    // Enable query result caching
    enableCache: true
  };
  
  next();
};

/**
 * Compression middleware for large responses
 * Legacy: logic consolidated into unified patchResponse to avoid extra JSON.stringify.
 */
const responseCompression = (req, res, next) => {
  next();
};

module.exports = {
  performanceMonitor,
  cacheMiddleware,
  queryOptimizer,
  responseCompression,
  SimpleCache,
  globalCache,
  invalidateCompanySettingsCache,
  invalidateCompanyDashboardCache,
  isResponsePatched
};
