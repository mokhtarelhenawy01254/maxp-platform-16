/**
 * Database Error Handler Middleware
 * 
 * Handles database connection errors gracefully, especially connection limit errors
 */

const { executeWithRetry } = require('../services/sharedDatabase');

/**
 * Middleware to wrap database operations with retry logic
 */
function withDatabaseRetry(operation) {
  return async (req, res, next) => {
    try {
      await executeWithRetry(async () => {
        await operation(req, res, next);
      });
    } catch (error) {
      handleDatabaseError(error, req, res, next);
    }
  };
}

/**
 * Global database error handler
 */
function handleDatabaseError(error, req, res, next) {
  // Check for connection limit error
  if (error.message.includes('max_connections_per_hour') ||
    error.message.includes('ERROR 42000 (1226)')) {

    console.error(`🚨 [DB-ERROR] Connection limit exceeded on ${req.method} ${req.path}`);

    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable due to connection limits',
      error: 'CONNECTION_LIMIT_EXCEEDED',
      retryAfter: error.retryAfter || 60, // 1 minute default
      details: {
        message: 'The database connection limit has been exceeded. Please try again later.',
        arabic: 'تم تجاوز حد الاتصالات بقاعدة البيانات. يرجى المحاولة مرة أخرى لاحقاً.',
        suggestion: 'This is usually temporary and will resolve automatically within an hour.'
      }
    });
  }

  // Check for general connection errors
  if (error.message.includes('Connection') ||
    error.message.includes('timeout') ||
    error.code === 'P1001' ||
    error.code === 'P1008' ||
    error.message.includes('ECONNREFUSED')) {

    console.error(`⚠️ [DB-ERROR] Connection error on ${req.method} ${req.path}:`, error.message);

    return res.status(503).json({
      success: false,
      message: 'Database connection error',
      error: 'CONNECTION_ERROR',
      details: {
        message: 'Unable to connect to database. Please try again.',
        arabic: 'فشل الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.',
        suggestion: 'This issue is usually temporary. Please retry your request.'
      }
    });
  }

  // Check for Prisma-specific errors
  if (error.code && error.code.startsWith('P')) {
    console.error(`🔍 [DB-ERROR] Prisma error ${error.code} on ${req.method} ${req.path}:`, error.message);

    return res.status(500).json({
      success: false,
      message: 'Database operation error',
      error: 'DATABASE_ERROR',
      code: error.code,
      details: {
        message: 'A database operation failed. Please try again.',
        arabic: 'فشل في عملية قاعدة البيانات. يرجى المحاولة مرة أخرى.'
      }
    });
  }

  // Log unexpected errors
  console.error(`❌ [DB-ERROR] Unexpected database error on ${req.method} ${req.path}:`, error);

  // Pass to next error handler for unexpected errors
  next(error);
}

/**
 * Express error handler middleware for database errors
 */
function databaseErrorMiddleware(error, req, res, next) {
  // Only handle database-related errors
  if (error.message.includes('Prisma') ||
    error.message.includes('Database') ||
    error.message.includes('Connection') ||
    error.code?.startsWith('P')) {

    handleDatabaseError(error, req, res, next);
  } else {
    // Pass non-database errors to next handler
    next(error);
  }
}

/**
 * Wrapper for database operations in route handlers
 */
async function safeDbOperation(operation, req, res, options = {}) {
  const { maxRetries = 3, fallbackResponse = null } = options;

  try {
    return await executeWithRetry(operation, maxRetries);
  } catch (error) {
    // If fallback response is provided, use it instead of throwing
    if (fallbackResponse && error.message.includes('max_connections_per_hour')) {
      //console.log(`🔄 [DB-SAFE] Using fallback response for ${req.method} ${req.path}`);
      return fallbackResponse;
    }

    // Let the error handler middleware deal with it
    throw error;
  }
}

/**
 * Health check endpoint that reports database status
 */
async function databaseHealthCheck(req, res) {
  try {
    const { healthCheck } = require('../services/sharedDatabase');
    const health = await healthCheck();

    const statusCode = health.status === 'healthy' ? 200 :
      health.status === 'connection_limit' ? 503 : 500;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      database: health,
      timestamp: new Date().toISOString(),
      message: health.status === 'healthy' ? 'Database is healthy' :
        health.status === 'connection_limit' ? 'Database connection limit exceeded' :
          'Database error detected'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      database: { status: 'error', error: error.message },
      timestamp: new Date().toISOString(),
      message: 'Health check failed'
    });
  }
}

module.exports = {
  withDatabaseRetry,
  handleDatabaseError,
  databaseErrorMiddleware,
  safeDbOperation,
  databaseHealthCheck
};
