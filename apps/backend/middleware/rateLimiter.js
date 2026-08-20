/**
 * 🚦 Rate Limiting Middleware
 * Adaptive rate limiting for API routes with Redis support
 */

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map();

/**
 * Rate limit configurations by endpoint type
 */
const RATE_LIMITS = {
  // Import endpoints
  IMPORT_START: { windowMs: 60000, maxRequests: 5 }, // 5 per minute
  IMPORT_STATUS: { windowMs: 10000, maxRequests: 30 }, // 30 per 10 seconds
  IMPORT_PAUSE: { windowMs: 10000, maxRequests: 10 }, // 10 per 10 seconds
  IMPORT_RESUME: { windowMs: 10000, maxRequests: 10 },
  IMPORT_CANCEL: { windowMs: 10000, maxRequests: 10 },

  // WooCommerce API endpoints
  WOO_ORDERS_FETCH: { windowMs: 60000, maxRequests: 30 }, // 30 per minute
  WOO_PRODUCTS_FETCH: { windowMs: 60000, maxRequests: 20 },
  WOO_COUNT: { windowMs: 60000, maxRequests: 10 },

  // General endpoints
  DEFAULT: { windowMs: 60000, maxRequests: 100 },
  AUTH: { windowMs: 60000, maxRequests: 10 },
  READ: { windowMs: 60000, maxRequests: 60 },
  STATS: { windowMs: 60000, maxRequests: 30 },
  AGENT_ACTIONS: { windowMs: 60000, maxRequests: 60 }, // 60 per minute per company (workspace actions)
};

/**
 * Get client identifier
 */
function getClientId(req) {
  // Try to get user ID first
  if (req.user?.companyId) {
    return `company_${req.user.companyId}`;
  }

  // Fall back to IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown';

  return `ip_${ip}`;
}

/**
 * Get rate limit configuration for endpoint
 */
function getRateLimitConfig(endpoint) {
  // Check specific endpoints
  if (endpoint.includes('/import-jobs/start')) {
    return RATE_LIMITS.IMPORT_START;
  }
  if (endpoint.includes('/import-jobs/status') || endpoint.includes('/import-jobs/list')) {
    return RATE_LIMITS.IMPORT_STATUS;
  }
  if (endpoint.includes('/import-jobs/pause')) {
    return RATE_LIMITS.IMPORT_PAUSE;
  }
  if (endpoint.includes('/import-jobs/resume')) {
    return RATE_LIMITS.IMPORT_RESUME;
  }
  if (endpoint.includes('/import-jobs/cancel')) {
    return RATE_LIMITS.IMPORT_CANCEL;
  }
  if (endpoint.includes('/woocommerce/orders/fetch')) {
    return RATE_LIMITS.WOO_ORDERS_FETCH;
  }
  if (endpoint.includes('/woocommerce/products')) {
    return RATE_LIMITS.WOO_PRODUCTS_FETCH;
  }
  if (endpoint.includes('/woocommerce/orders/count')) {
    return RATE_LIMITS.WOO_COUNT;
  }

  // Default
  return RATE_LIMITS.DEFAULT;
}

/**
 * Check rate limit
 */
function checkRateLimit(clientId, endpoint) {
  const now = Date.now();
  const config = getRateLimitConfig(endpoint);
  const windowMs = config.windowMs;
  const maxRequests = config.maxRequests;

  const key = `${clientId}:${endpoint}`;
  const windowStart = now - windowMs;

  // Get or create rate limit record
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      requests: [],
      count: 0
    });
  }

  const record = rateLimitStore.get(key);

  // Remove old requests outside the window
  record.requests = record.requests.filter(timestamp => timestamp > windowStart);
  record.count = record.requests.length;

  // Check if limit exceeded
  if (record.count >= maxRequests) {
    const oldestRequest = Math.min(...record.requests);
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime: oldestRequest + windowMs,
      retryAfter: Math.max(1, retryAfter)
    };
  }

  // Record this request
  record.requests.push(now);
  record.count++;

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: now + windowMs,
    retryAfter: 0
  };
}

/**
 * Clean up old rate limit entries periodically
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [key, record] of rateLimitStore) {
    if (record.requests.length === 0 ||
      Math.min(...record.requests) < now - maxAge) {
      rateLimitStore.delete(key);
    }
  }

  // Also enforce max size
  if (rateLimitStore.size > 10000) {
    const keysToDelete = Array.from(rateLimitStore.keys()).slice(0, 1000);
    keysToDelete.forEach(key => rateLimitStore.delete(key));
  }
}

// Run cleanup every minute
setInterval(cleanupRateLimitStore, 60000);

/**
 * Create rate limiting middleware
 */
function createRateLimiter(options = {}) {
  const {
    customKey = getClientId,
    onRateLimited = null
  } = options;

  return (req, res, next) => {
    const clientId = customKey(req);
    const endpoint = req.path || req.baseUrl + req.path;

    const result = checkRateLimit(clientId, endpoint);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.remaining === 0 ?
      getRateLimitConfig(endpoint).maxRequests : result.remaining);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);

      if (onRateLimited) {
        return onRateLimited(req, res, result);
      }

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'تجاوزت الحد المسموح للطلبات. يرجى المحاولة لاحقاً.',
          retryAfter: result.retryAfter
        }
      });
    }

    next();
  };
}

/**
 * Create adaptive rate limiter for WooCommerce API
 * Respects WooCommerce API rate limits from response headers
 */
function createAdaptiveRateLimiter() {
  let wooApiDelay = 500; // Start with 500ms delay

  return {
    /**
     * Update delay based on response headers
     */
    updateFromHeaders(headers) {
      // Check for WooCommerce API remaining requests
      const remaining = headers['x-wp-total'] || headers['x-wp-totalpages'];

      if (remaining === '0') {
        // Increase delay
        wooApiDelay = Math.min(wooApiDelay * 1.5, 2000);
        console.log(`⚠️ WooCommerce API rate limit approaching. Increasing delay to ${wooApiDelay}ms`);
      } else {
        // Gradually decrease delay
        wooApiDelay = Math.max(500, wooApiDelay * 0.95);
      }
    },

    /**
     * Get current delay
     */
    getDelay() {
      return wooApiDelay;
    },

    /**
     * Wait before making request
     */
    async wait() {
      await new Promise(resolve => setTimeout(resolve, wooApiDelay));
    }
  };
}

/**
 * Create endpoint-specific rate limiter
 */
function createEndpointRateLimiter(endpointType) {
  const config = RATE_LIMITS[endpointType] || RATE_LIMITS.DEFAULT;

  return createRateLimiter({
    customKey: (req) => {
      const baseId = getClientId(req);
      return `${baseId}:${endpointType}`;
    }
  });
}

/**
 * Get current rate limit status
 */
function getRateLimitStatus(clientId, endpoint) {
  const result = checkRateLimit(clientId, endpoint);
  const config = getRateLimitConfig(endpoint);

  return {
    clientId,
    endpoint,
    limit: config.maxRequests,
    remaining: result.remaining,
    resetTime: new Date(result.resetTime).toISOString(),
    retryAfter: result.retryAfter
  };
}

module.exports = {
  createRateLimiter,
  createAdaptiveRateLimiter,
  createEndpointRateLimiter,
  getRateLimitStatus,
  checkRateLimit,
  RATE_LIMITS
};
