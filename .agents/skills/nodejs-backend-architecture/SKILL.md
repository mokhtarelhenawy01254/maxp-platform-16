---
name: nodejs-backend-architecture
description: Production Node.js & Express backend architecture, robust REST API design, modular route controllers, PM2 cluster orchestration, Redis caching & pub/sub, async worker queues (BullMQ), rate limiting, memory leak prevention, structured logging (Pino/Winston), and zero-downtime hot reloading. Use whenever writing backend endpoints, controllers, middleware, workers, or debugging Node.js server performance.
---

# Node.js & Express Backend Architecture Standards

## Core Principles

### 1. Modular Controller & Service Separation
- **Separation of Concerns:**
  - Routes (`routes/`): Define URL endpoints, HTTP methods, and middleware chain (auth, validation, rate limiting).
  - Controllers (`controllers/`): Extract params/body, invoke service layer, and return HTTP status and structured JSON.
  - Services (`services/`): Pure business logic, third-party API integration, database queries, and transactions.
- **Contract Immutability (Zero Blast-Radius):**
  - Never remove or alter existing response field shapes consumed by frontend, desktop apps, or mobile extensions.
  - Add new fields optionally without breaking existing client deserialization.

### 2. High-Performance Error Handling Pipeline
- Use an asynchronous error wrapper to avoid unhandled promise rejections:
  ```javascript
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  ```
- Centralized Error Handler:
  ```javascript
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    logger.error({ err, path: req.path, method: req.method }, 'Request error');
    res.status(statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.isOperational ? err.message : 'An unexpected error occurred',
      },
    });
  });
  ```

### 3. Redis Caching & Cache-Aside Pattern
- **Prefix Keys with Namespace & Tenant:**
  ```javascript
  const cacheKey = `company:${companyId}:products:${productId}`;
  ```
- **Set Explicit TTL:** Never store keys without expiration unless deliberate:
  ```javascript
  await redis.setex(cacheKey, 300, JSON.stringify(data)); // 5 minutes TTL
  ```
- **Invalidation Strategy:** Invalidate cache on mutations (create, update, delete) rather than waiting for TTL expiry.

### 4. Background Workers & Job Queues
- Offload long-running tasks (video generation, WhatsApp bulk broadcasts, Meta sync, PDF invoice generation) from HTTP request threads to asynchronous background queues (BullMQ / Redis).
- Expose polling endpoints (`/api/v1/jobs/status/:jobId`) or SSE/WebSockets for live client progress updates.

### 5. Production PM2 & Zero-Downtime Reloading
- Run in cluster mode to utilize all available CPU cores:
  ```javascript
  // ecosystem.config.js
  module.exports = {
    apps: [{
      name: 'maxp-backend',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      kill_timeout: 5000,
    }],
  };
  ```
- Reload without dropping requests:
  ```bash
  pm2 reload maxp-backend --update-env
  ```
