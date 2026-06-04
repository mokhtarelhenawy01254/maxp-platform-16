/**
 * 🔗 Correlation ID Generator
 * Generates and manages correlation IDs for distributed tracing
 */

const crypto = require('crypto');

/**
 * Generate a new correlation ID
 */
function generateCorrelationId() {
  return crypto.randomUUID();
}

/**
 * Format correlation ID for logging
 */
function formatCorrelationId(correlationId) {
  return `[corr:${correlationId.substring(0, 8)}]`;
}

/**
 * Store correlation ID in memory (simple approach)
 */
let currentCorrelationId = null;

/**
 * Get current correlation ID
 */
function getCurrentCorrelationId() {
  return currentCorrelationId;
}

/**
 * Set correlation ID
 */
function setCorrelationId(correlationId) {
  currentCorrelationId = correlationId;
}

/**
 * Clear correlation context
 */
function clearCorrelationContext() {
  currentCorrelationId = null;
}

/**
 * Run function with correlation ID
 */
function runWithCorrelationId(correlationId, fn) {
  const previousCorrelationId = currentCorrelationId;
  setCorrelationId(correlationId);

  try {
    return fn();
  } finally {
    currentCorrelationId = previousCorrelationId;
  }
}

/**
 * Async function wrapper with correlation ID
 */
async function asyncRunWithCorrelationId(correlationId, fn) {
  const previousCorrelationId = currentCorrelationId;
  setCorrelationId(correlationId);

  try {
    return await fn();
  } finally {
    currentCorrelationId = previousCorrelationId;
  }
}

/**
 * Log with correlation ID
 */
function logWithCorrelation(logger, correlationId, level, message, data) {
  const prefix = formatCorrelationId(correlationId);
  logger(prefix, `[${level}]`, message, data ? JSON.stringify(data) : '');
}

/**
 * Create request context middleware
 */
function createCorrelationMiddleware() {
  return (req, res, next) => {
    // Get or generate correlation ID
    const correlationId = req.headers['x-correlation-id'] ||
      req.headers['x-request-id'] ||
      generateCorrelationId();

    // Set in request
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    // Set in context
    setCorrelationId(correlationId);

    // Log request
    // console.log(formatCorrelationId(correlationId), '[REQUEST]', 
    //   `${req.method} ${req.path}`, 
    //   req.query ? JSON.stringify(req.query) : ''
    // );

    // Clear on response
    res.on('finish', () => {
      clearCorrelationContext();
      console.log(formatCorrelationId(correlationId), '[RESPONSE]',
        `Status: ${res.statusCode}`
      );
    });

    next();
  };
}

/**
 * Generate correlation ID for job
 */
function generateJobCorrelationId(companyId, jobType) {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(3).toString('hex');
  return `job_${companyId}_${jobType}_${timestamp}_${random}`;
}

/**
 * Parse correlation ID for display
 */
function parseCorrelationId(correlationId) {
  const parts = correlationId.split('_');

  if (parts[0] === 'job' && parts.length >= 5) {
    return {
      type: 'job',
      companyId: parts[1],
      jobType: parts[2],
      timestamp: parts[3],
      random: parts.slice(4).join('_')
    };
  }

  return { type: 'request', correlationId };
}

/**
 * Create logger with correlation ID support
 */
function createCorrelationLogger(defaultData = {}) {
  return {
    info: (message, data) => {
      const correlationId = getCurrentCorrelationId();
      logWithCorrelation(console.log, correlationId || 'N/A', 'INFO', message, { ...defaultData, ...data });
    },
    warn: (message, data) => {
      const correlationId = getCurrentCorrelationId();
      logWithCorrelation(console.warn, correlationId || 'N/A', 'WARN', message, { ...defaultData, ...data });
    },
    error: (message, data) => {
      const correlationId = getCurrentCorrelationId();
      logWithCorrelation(console.error, correlationId || 'N/A', 'ERROR', message, { ...defaultData, ...data });
    },
    debug: (message, data) => {
      if (process.env.NODE_ENV === 'development') {
        const correlationId = getCurrentCorrelationId();
        logWithCorrelation(console.debug, correlationId || 'N/A', 'DEBUG', message, { ...defaultData, ...data });
      }
    }
  };
}

module.exports = {
  generateCorrelationId,
  formatCorrelationId,
  getCurrentCorrelationId,
  setCorrelationId,
  clearCorrelationContext,
  runWithCorrelationId,
  asyncRunWithCorrelationId,
  logWithCorrelation,
  createCorrelationMiddleware,
  generateJobCorrelationId,
  parseCorrelationId,
  createCorrelationLogger
};
