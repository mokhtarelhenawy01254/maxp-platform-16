/**
 * ⏱️ External HR API Rate Limiter
 * Token-bucket rate limiter per API Key:
 * - Nominal limit: 120 req/min (refillRate = 2 tokens/sec) per worker process
 * - Burst capacity: 30 tokens per worker process
 * - Burst ceiling: 10 requests / 1 second window per worker process
 * - Public doc routes: 60 req/min per IP
 *
 * ⚠️ Cluster & Architectural Note:
 * These buckets are stored strictly in-memory per Node.js process (`keyBuckets` Map).
 * - State resets automatically upon worker restart or PM2 reload.
 * - In a multi-worker cluster (e.g. 2 PM2 workers behind reverse-proxy load balancer),
 *   each worker process independently manages its own token bucket. Therefore, effective
 *   cluster-wide capacity scales proportionally with the number of active workers.
 * - Distributed cross-worker rate limiting via shared Redis is deferred as a separate decision.
 */

class TokenBucket {
  constructor({ capacity = 30, refillRate = 2, maxPerSecond = 10 } = {}) {
    this.capacity = capacity;          // Max burst tokens (30 per worker)
    this.refillRate = refillRate;      // Tokens added per second (2/sec = 120/min per worker)
    this.maxPerSecond = maxPerSecond;  // Max requests in 1 second window (10/sec per worker)
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.secondWindow = [];            // Timestamps of requests in current 1-second window
  }

  tryConsume() {
    const now = Date.now();

    // 1. Rolling 1-second burst window check
    this.secondWindow = this.secondWindow.filter(t => now - t < 1000);
    if (this.secondWindow.length >= this.maxPerSecond) {
      const oldest = this.secondWindow[0];
      const waitMs = Math.max(100, 1000 - (now - oldest));
      return {
        allowed: false,
        retryAfter: Math.ceil(waitMs / 1000),
        remaining: 0,
        limit: this.capacity
      };
    }

    // 2. Token bucket refill
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + (elapsedSeconds * this.refillRate));
    this.lastRefill = now;

    if (this.tokens < 1) {
      const waitMs = Math.ceil(((1 - this.tokens) / this.refillRate) * 1000);
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil(waitMs / 1000)),
        remaining: 0,
        limit: this.capacity
      };
    }

    // Consume 1 token
    this.tokens -= 1;
    this.secondWindow.push(now);

    return {
      allowed: true,
      remaining: Math.max(0, Math.floor(this.tokens)),
      limit: this.capacity
    };
  }
}

// In-memory bucket stores
const keyBuckets = new Map();
const ipBuckets = new Map();

// Periodic cleanup every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of keyBuckets.entries()) {
    if (now - bucket.lastRefill > 300000 && bucket.tokens >= bucket.capacity) {
      keyBuckets.delete(key);
    }
  }
  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now - bucket.lastRefill > 300000 && bucket.tokens >= bucket.capacity) {
      ipBuckets.delete(ip);
    }
  }
}, 300000);
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Middleware: Rate limit by HR Credential ID (or key prefix)
 */
const externalApiRateLimiter = (req, res, next) => {
  // Key identifier: credential ID, or prefix, or fallback IP
  const keyId = req.hrCredential?.id || req.hrCredential?.keyPrefix || req.ip || 'anonymous';

  if (!keyBuckets.has(keyId)) {
    keyBuckets.set(keyId, new TokenBucket({ capacity: 30, refillRate: 2, maxPerSecond: 10 }));
  }

  const bucket = keyBuckets.get(keyId);
  const result = bucket.tryConsume();

  res.setHeader('X-RateLimit-Limit', 120);
  res.setHeader('X-RateLimit-Remaining', result.remaining);

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter);
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + result.retryAfter);
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Rate limit is 120 requests per minute with a burst limit of 30.',
        retryAfter: result.retryAfter
      }
    });
  }

  next();
};

/**
 * Middleware: Rate limit by Client IP on public doc routes
 */
const docRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!ipBuckets.has(ip)) {
    ipBuckets.set(ip, new TokenBucket({ capacity: 60, refillRate: 1, maxPerSecond: 20 }));
  }

  const bucket = ipBuckets.get(ip);
  const result = bucket.tryConsume();

  res.setHeader('X-RateLimit-Limit', 60);
  res.setHeader('X-RateLimit-Remaining', result.remaining);

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter);
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests on documentation endpoint. Please retry later.',
        retryAfter: result.retryAfter
      }
    });
  }

  next();
};

module.exports = {
  externalApiRateLimiter,
  docRateLimiter,
  TokenBucket,
  keyBuckets
};
