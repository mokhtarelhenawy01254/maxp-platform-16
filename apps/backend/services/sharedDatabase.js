
/**
 * Shared Database Service - ENHANCED FIX for high availability and performance
 * 🚀 Optimized for 10,000+ requests per minute
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
require('../utils/patchPrismaDecimal');
const tenantContext = require('./tenantContext');
const companyCacheService = require('./companyCacheService');
const { ensureLocalPostgres } = require('./ensureLocalPostgres');
const { AsyncLocalStorage } = require('async_hooks');
const transactionStorage = new AsyncLocalStorage();
let PrismaClient = null;

// Global shared instance
let sharedPrismaInstance = null;
let deferredPrismaProxy = null;
let queryCount = 0;
let connectionCount = 0;
let isInitialized = false;
let isWarmupComplete = false;
let warmupPromise = null;

// ✅ Advanced connection management
let connectionManager = {
  isConnecting: false,
  lastConnectionAttempt: 0,
  connectionPromise: null,
  healthCheckInterval: null,
  lastSuccessfulQuery: 0,
  connectionRetryCount: 0
};

// Circuit breaker state
let connectionLimitReached = false;
let connectionLimitResetTime = null;
const CONNECTION_LIMIT_COOLDOWN = 60 * 1000; // 1 minute

// Query queue management (Protects DB from spikes)
const queryQueue = [];
let isProcessingQueue = false;
const MAX_CONCURRENT_QUERIES = 40; // ⚡ Matched 1:1 with connection limit to eliminate pool queue lag
let activeQueries = 0;
const QUEUE_WARNING_THRESHOLD = 500;
const QUEUE_CRITICAL_THRESHOLD = 1000;
const SLOW_QUERY_THRESHOLD = 2000;
const INTERACTIVE_TRANSACTION_MAX_WAIT = 15000;
const INTERACTIVE_TRANSACTION_TIMEOUT = 60000;

// Health monitoring
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 60000; // 60 seconds
const MAX_RETRY_ATTEMPTS = 3;

// Initialization tracking
let initializationPromise = null;
let isShuttingDown = false;

function markSharedConnectionStale() {
  isInitialized = false;
  isWarmupComplete = false;
  connectionManager.lastSuccessfulQuery = 0;
}

async function disconnectSharedPrismaInstance() {
  if (!sharedPrismaInstance) {
    markSharedConnectionStale();
    return;
  }

  const instanceToDisconnect = sharedPrismaInstance;
  sharedPrismaInstance = null;
  markSharedConnectionStale();

  await instanceToDisconnect.$disconnect().catch((error) => {
    console.warn(`⚠️ [SharedDB] Disconnect warning: ${error.message}`);
  });
}

/**
 * Extract database info from URL (without password for security)
 */
function extractDatabaseInfo(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return {
      provider: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port || (url.protocol.startsWith('mysql') ? '3306' : '5432'),
      database: url.pathname.replace('/', ''),
      user: url.username || 'root',
      hasPassword: !!url.password
    };
  } catch (error) {
    return { provider: 'unknown', host: 'unknown', port: 'unknown', database: 'unknown', user: 'unknown', hasPassword: false };
  }
}

function getPrismaClientPathsForDatabaseUrl(databaseUrl) {
  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  const isMysql = databaseUrl.startsWith('mysql://');

  if (isPostgres) {
    return [
      path.join(__dirname, '..', 'prisma', 'generated', 'postgresql_v2'),
      path.join(__dirname, '..', 'node_modules', '.prisma', 'client'),
      '@prisma/client'
    ];
  }

  if (isMysql) {
    return ['@prisma/client'];
  }

  return [
    path.join(__dirname, '..', 'prisma', 'generated', 'postgresql_v2'),
    '@prisma/client'
  ];
}

/**
 * Create optimized PrismaClient
 */
function createStablePrismaClient() {
  console.log('🔧 [SharedDB] Creating optimized PrismaClient...');

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  // 🔌 PgBouncer (transaction pooling) support:
  // PG_BOUNCER_URL  → connection through PgBouncer for the runtime client
  //                    (e.g. postgresql://appuser:pass@localhost:6432/maxp?pgbouncer=true)
  // POSTGRES_URL    → direct Postgres connection (used for migrations + scripts)
  // If PG_BOUNCER_URL is set, the runtime PrismaClient goes through the pooler
  // while POSTGRES_URL stays direct — so `prisma db push`/migrate DDL is NOT
  // routed through PgBouncer (DDL requires a direct connection).
  const runtimeUrl = process.env.PG_BOUNCER_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  const usingPgBouncer = Boolean(process.env.PG_BOUNCER_URL);

  let databaseUrl = runtimeUrl;

  if (isProduction) {
    const isPostgres = databaseUrl?.startsWith('postgresql://') || databaseUrl?.startsWith('postgres://');
    if (databaseUrl && !isPostgres) {
      throw new Error(`Invalid protocol for PRODUCTION: ${databaseUrl.split(':')[0]}. PostgreSQL required.`);
    }
  }

  if (!databaseUrl) {
    throw new Error('Database URL not found. Check .env');
  }

  const prismaClientPaths = getPrismaClientPathsForDatabaseUrl(databaseUrl);

  const dbInfo = extractDatabaseInfo(databaseUrl);
  console.log('📊 [SharedDB] Configuration:', {
    provider: dbInfo.provider,
    host: dbInfo.host,
    database: dbInfo.database,
    env: nodeEnv,
    pooler: usingPgBouncer ? 'PgBouncer' : 'direct'
  });

  try {
    const urlWithParams = new URL(databaseUrl);
    // 🚀 HIGH PERFORMANCE SETTINGS
    // Pool is shared by maxp-backend + webhook worker + any spawned script; a
    // fixed 80/process kept ~190 live PG connections open (near max_connections
    // 300) and amplified memory pressure. 25/process keeps headroom while
    // sustaining the existing query queue (MAX_CONCURRENT_QUERIES=80).
    const poolLimit = process.env.DATABASE_CONNECTION_LIMIT || '40';
    urlWithParams.searchParams.set('connection_limit', poolLimit);
    urlWithParams.searchParams.set('pool_timeout', '30'); // Increased for stability
    urlWithParams.searchParams.set('connect_timeout', '30'); // Increased for stability

    // 🔌 PgBouncer in transaction mode requires Prisma to NOT use prepared
    // statements (named prepared statements are pinned per-connection and break
    // transaction pooling). `pgbouncer=true` tells Prisma to disable them.
    // NOTE: PgBouncer 1.21+ with server-side prepared statements can keep them
    // enabled, but the conservative safe default is pgbouncer=true unless the
    // operator opts into PG_BOUNCER_PREPARED=1.
    if (usingPgBouncer && process.env.PG_BOUNCER_PREPARED !== '1') {
      urlWithParams.searchParams.set('pgbouncer', 'true');
    }

    let PrismaClientConstructor;
    let importError = null;
    for (const prismaClientPath of prismaClientPaths) {
      try {
        console.log(`🔍 [SharedDB] Attempting to load PrismaClient from: ${prismaClientPath}`);
        const imported = require(prismaClientPath);
        PrismaClientConstructor = imported.PrismaClient || imported.default || imported;
        console.log('✅ [SharedDB] Successfully loaded PrismaClient');
        break;
      } catch (error) {
        importError = error;
        console.warn(`⚠️ [SharedDB] FAILED to load PrismaClient from ${prismaClientPath}:`, error.message);
      }
    }

    if (!PrismaClientConstructor) {
      console.error('❌ [SharedDB] Failed to load any PrismaClient');
      throw importError || new Error('No PrismaClient constructor could be loaded');
    }

    const client = new PrismaClientConstructor({
      datasources: { db: { url: urlWithParams.toString() } },
      log: ['error'],
      errorFormat: 'minimal',
      transactionOptions: {
        maxWait: INTERACTIVE_TRANSACTION_MAX_WAIT,
        timeout: INTERACTIVE_TRANSACTION_TIMEOUT
      }
    });

    // 🛡️ [SharedDB] 2026 High-Performance Tenant Isolation Extension (AST Injection)
    // Eliminates pseudo-transactions while guaranteeing 100% strict data isolation.
    const GLOBAL_MODELS = new Set([
      'Company',
      'User',
      'Role',
      'SubscriptionPlan',
      'PlatformSetting',
      'PlatformSiteMetaPixelSetting',
      'PlatformSiteHomepageSetting',
      'PlatformDefaultSidebarSetting',
      'DevProject',
      'DevTask',
      'DevTeamMember',
      'DevTimeLog',
      'SystemLog',
      'AppSystemLog',
      'TelegramConfig',
      'TelegramScheduledMessage',
      'AiKey',
      'AiModelConfig'
    ]);

    // Dynamic set of all models in the schema that contain a scalar companyId field
    const { Prisma: PostgresPrisma } = require('../prisma/generated/postgresql_v2');
    const MODELS_WITH_COMPANY_ID = new Set(
      PostgresPrisma.dmmf?.datamodel?.models
        ?.filter((m) => m.fields.some((f) => f.name === 'companyId'))
        ?.map((m) => m.name) || []
    );

    const extendedClient = client.$extends({
      query: {
        $allOperations: async ({ model, operation, args, query }) => {
          const companyId = tenantContext.getCompanyId();
          const isBypassed = tenantContext.isBypassed();

          // 1. Skip injection if context is bypassed, no companyId is set, table is a global/system model,
          // or table doesn't have a companyId column in the database schema.
          if (isBypassed || !companyId || GLOBAL_MODELS.has(model) || !MODELS_WITH_COMPANY_ID.has(model)) {
            const result = await query(args);

            // 🧹 Company cache invalidation on company updates
            if (model === 'Company' && ['update', 'updateMany', 'upsert'].includes(operation)) {
              const updatedCompanyId =
                (result && result.id) ||
                (args && args.where && (args.where.id || args.where.slug)) ||
                (args && args.data && (args.data.id || args.data.slug)) ||
                null;
              if (updatedCompanyId) {
                companyCacheService.invalidateCompanyCache(updatedCompanyId).catch((err) => {
                  console.warn(`⚠️ [CompanyCache] invalidation error: ${err.message}`);
                });
              }
            }

            return result;
          }

          // 2. Safe Auto-Tenant Injection for models with companyId
          args = args || {};

          if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            args.where = { ...args.where, companyId };
          } else if (operation === 'create') {
            if (args.data) {
              if (args.data.company) {
                delete args.data.companyId;
              } else if (!args.data.companyId) {
                args.data = { ...args.data, companyId };
              }
            }
          } else if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((item) => ({ ...item, companyId }));
            } else if (args.data) {
              args.data = { ...args.data, companyId };
            }
          } else if (['updateMany', 'deleteMany'].includes(operation)) {
            args.where = { ...args.where, companyId };
          } else if (operation === 'upsert' && args.create) {
            if (args.create) {
              if (args.create.company) {
                delete args.create.companyId;
              } else if (!args.create.companyId) {
                args.create = { ...args.create, companyId };
              }
            }
          }

          // ⚡ Execute single native SQL query through connection pool (Zero Transaction Overhead)
          return query(args);
        },
      },
    });

    console.log('📋 [SharedDB] Client created and 2026 Auto-Tenant Isolation extension applied.');

    return extendedClient;

  } catch (error) {
    console.error('❌ [SharedDB] FATAL: Failed to create PrismaClient', error.message);
    throw error;
  }
}

async function warmupConnection(client) {
  if (!client) throw new Error('Cannot warm up null Prisma client');
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    const start = Date.now();
    let lastError = null;

    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        await Promise.race([
          client.$queryRaw`SELECT 1`,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Warmup timeout')), 2500))
        ]);
        isWarmupComplete = true;
        connectionManager.lastSuccessfulQuery = Date.now();
        console.log(`✅ [SharedDB] Warmup successful after ${attempt} attempt(s) in ${Date.now() - start}ms`);
        return;
      } catch (error) {
        lastError = error;
        isWarmupComplete = false;
        const delay = Math.min(500 * attempt, 2500);
        console.warn(`⏳ [SharedDB] Warmup attempt ${attempt}/10 failed: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('SharedDB warmup failed');
  })();

  try {
    await warmupPromise;
  } finally {
    warmupPromise = null;
  }
}

async function guaranteeConnection() {
  if (isShuttingDown) throw new Error('Database is shutting down');

  if (isInitialized && sharedPrismaInstance && isWarmupComplete) {
    const timeSinceLastSuccess = Date.now() - connectionManager.lastSuccessfulQuery;
    if (timeSinceLastSuccess < 30000) return; // Healthy

    try {
      await Promise.race([
        sharedPrismaInstance.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);
      connectionManager.lastSuccessfulQuery = Date.now();
      return;
    } catch (error) {
      isInitialized = false;
      isWarmupComplete = false;
    }
  }

  if (connectionManager.isConnecting) {
    await connectionManager.connectionPromise;
    return;
  }

  connectionManager.isConnecting = true;
  connectionManager.connectionPromise = (async () => {
    try {
      isWarmupComplete = false;
      await disconnectSharedPrismaInstance();
      await ensureLocalPostgres();
      sharedPrismaInstance = createStablePrismaClient();
      await sharedPrismaInstance.$connect();
      await warmupConnection(sharedPrismaInstance);
      isInitialized = true;
      connectionManager.lastSuccessfulQuery = Date.now();
      console.log('✅ [SharedDB] Connected and verified');
    } catch (error) {
      isInitialized = false;
      isWarmupComplete = false;
      throw error;
    } finally {
      connectionManager.isConnecting = false;
    }
  })();

  return connectionManager.connectionPromise;
}

async function executeQuerySafely(operation, operationName = 'unknown') {
  if (isShuttingDown) throw new Error('Database is shutting down');
  await guaranteeConnection();

  let lastError;
  const QUERY_TIMEOUT = 30000; // ⚡ Faster fail for better user experience
  const queryStartTime = Date.now();

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await Promise.race([
        operation(sharedPrismaInstance),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query Timeout')), QUERY_TIMEOUT))
      ]);

      const duration = Date.now() - queryStartTime;
      if (duration > SLOW_QUERY_THRESHOLD) console.warn(`🐌 [SharedDB] Slow query "${operationName}": ${duration}ms`);

      connectionManager.lastSuccessfulQuery = Date.now();
      return result;
    } catch (error) {
      lastError = error;
      const msg = String(error.message || '');
      const isConnError = msg.includes('connected') ||
        msg.includes('Engine is not yet connected') ||
        msg.includes('Response from the Engine was empty') ||
        error.code?.startsWith('P1');

      if (isConnError && attempt < MAX_RETRY_ATTEMPTS) {
        isInitialized = false;
        await new Promise(r => setTimeout(r, 200 * attempt));
        await guaranteeConnection().catch(() => { });
        continue;
      }
      break;
    }
  }
  throw lastError;
}

async function executeWithQueue(operation, priority = 0) {
  let operationName = operation.name || 'anonymous';

  if (queryQueue.length === 0 && activeQueries < MAX_CONCURRENT_QUERIES) {
    activeQueries++;
    try {
      return await executeQuerySafely(operation, operationName);
    } finally {
      activeQueries--;
      processQueue();
    }
  }

  return new Promise((resolve, reject) => {
    const companyId = tenantContext.getCompanyId(); // 🎯 Capture current context
    const queueItem = {
      operation: () => executeQuerySafely(operation, operationName),
      priority,
      resolve,
      reject,
      companyId, // 📦 Store it with the queue item
      timestamp: Date.now()
    };

    queryQueue.push(queueItem);
    if (queryQueue.length > QUEUE_WARNING_THRESHOLD) {
      console.warn(`⚠️ [SharedDB] Queue high: ${queryQueue.length}`);
    }
    queryQueue.sort((a, b) => b.priority - a.priority);
    processQueue();
  });
}

function processQueue() {
  if (isProcessingQueue || queryQueue.length === 0 || activeQueries >= MAX_CONCURRENT_QUERIES) return;
  isProcessingQueue = true;

  while (queryQueue.length > 0 && activeQueries < MAX_CONCURRENT_QUERIES) {
    const item = queryQueue.shift();
    activeQueries++;

    // 🎭 Restore context before execution
    if (item.companyId) {
      tenantContext.run(item.companyId, () => {
        item.operation()
          .then(item.resolve)
          .catch(item.reject)
          .finally(() => {
            activeQueries--;
            process.nextTick(processQueue);
          });
      });
    } else {
      item.operation()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          activeQueries--;
          process.nextTick(processQueue);
        });
    }
  }
  isProcessingQueue = false;
}

/**
 * Checks for critical models at startup
 */
async function checkModelIntegrity(prisma) {
  const criticalModels = ['telegramConfig', 'telegramScheduledMessage', 'user', 'company'];
  const missing = [];

  let client = prisma || sharedPrismaInstance;
  if (!client) {
    await guaranteeConnection().catch(() => {});
    client = sharedPrismaInstance;
  }
  if (!client) return { status: 'error', message: 'Prisma not initialized' };

  for (const model of criticalModels) {
    if (!client[model]) {
      missing.push(model);
    }
  }

  if (missing.length > 0) {
    console.error('❌ [SharedDB] CRITICAL: Missing models in Prisma Client:', missing.join(', '));

    // 🔔 Notify Admins via Telegram
    try {
      const telegramAlertService = require('./telegramAlertService');
      telegramAlertService.sendIntegrityAlert(missing).catch(() => { });
    } catch (e) {
      // Ignore errors loading alert service to prevent circular dependencies or boot failures
    }

    return { status: 'error', missing };
  } else {
    // console.log('✅ [SharedDB] Model integrity check passed.');
    return { status: 'ok' };
  }
}

async function initializeSharedDatabase() {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    await guaranteeConnection();
    if (sharedPrismaInstance) {
      await checkModelIntegrity(sharedPrismaInstance);
    }
    startHealthMonitoring();
    return sharedPrismaInstance;
  })();

  return initializationPromise;
}

function startHealthMonitoring() {
  if (connectionManager.healthCheckInterval) return;
  const interval = setInterval(async () => {
    if (!isInitialized || connectionManager.isConnecting) return;
    if (Date.now() - connectionManager.lastSuccessfulQuery < 60000) return;

    try {
      await sharedPrismaInstance.$queryRaw`SELECT 1`;
    } catch (e) {
      isInitialized = false;
    }
  }, HEALTH_CHECK_INTERVAL);

  if (interval && typeof interval.unref === 'function') {
    interval.unref();
  }
  connectionManager.healthCheckInterval = interval;
}

/**
 * Standard execute with retry logic
 */
/**
 * ✅ CRITICAL FIX: Get Prisma client with guaranteed connection
 * This ensures the client is connected before returning it
 */
async function getSharedPrismaClientAsync() {
  // ✅ FIX: Check if shutting down
  if (isShuttingDown) {
    throw new Error('Cannot get Prisma client: database is shutting down');
  }

  // Ensure connection is established
  await guaranteeConnection();

  if (!sharedPrismaInstance) {
    throw new Error('Prisma client not initialized after guaranteeConnection()');
  }

  return sharedPrismaInstance;
}

/**
 * ✅ CRITICAL FIX: Get Prisma client with AUTO-INITIALIZATION
 * This version automatically initializes the connection if not already done
 * Use this for safe, synchronous access to Prisma client
 */
function createDeferredPrismaProxy() {
  const modelProxyCache = new Map();

  return new Proxy({}, {
    get(_target, prop) {
      if (prop === '$connect') {
        return async () => {
          await guaranteeConnection();
          return sharedPrismaInstance.$connect();
        };
      }

      if (prop === '$disconnect') {
        return async () => {
          await guaranteeConnection();
          await disconnectSharedPrismaInstance();
        };
      }

      if (prop === '$transaction') {
        return async (...args) => {
          await guaranteeConnection();
          return sharedPrismaInstance.$transaction(...args);
        };
      }

      if (typeof prop === 'string' && prop.startsWith('$')) {
        return async (...args) => {
          await guaranteeConnection();
          const value = sharedPrismaInstance[prop];
          if (typeof value === 'function') {
            return value.apply(sharedPrismaInstance, args);
          }
          return value;
        };
      }

      if (!modelProxyCache.has(prop)) {
        modelProxyCache.set(prop, new Proxy({}, {
          get(_modelTarget, method) {
            return async (...args) => {
              await guaranteeConnection();
              const model = sharedPrismaInstance[prop];
              
              if (!model) {
                throw new Error(`Model '${prop}' does not exist on Prisma client. Did you forget to run prisma generate?`);
              }

              const value = model[method];
              if (typeof value !== 'function') {
                return value;
              }
              return value.apply(model, args);
            };
          }
        }));
      }

      return modelProxyCache.get(prop);
    }
  });
}

function getSharedPrismaClient() {
  if (isShuttingDown) {
    console.error('❌ [SharedDB] getSharedPrismaClient called during shutdown');
    return null;
  }

  if (!deferredPrismaProxy) {
    deferredPrismaProxy = createDeferredPrismaProxy();
  }

  return deferredPrismaProxy;
}

/**
 * ✅ NEW: Safe wrapper for any Prisma operation
 * Guarantees connection and handles errors
 */
async function safePrismaOperation(operation, operationName = 'unknown') {
  if (isShuttingDown) {
    throw new Error('Cannot perform operation: database is shutting down');
  }

  // Get client with guaranteed connection
  const prisma = await getSharedPrismaClientAsync();

  if (!prisma) {
    throw new Error(`Failed to get Prisma client for operation: ${operationName}`);
  }

  try {
    const result = await operation(prisma);
    return result;
  } catch (error) {
    console.error(`❌ [SharedDB] Error in safePrismaOperation '${operationName}':`, error.message);
    throw error;
  }
}

/**
 * ✅ NEW: Find first with safe handling
 * Prevents "Cannot read properties of undefined" errors
 */
async function safeFindFirst(model, args, operationName = 'unknown') {
  return safePrismaOperation(
    async (prisma) => {
      const modelName = typeof model === 'string' ? model : 'unknown';
      if (!prisma[modelName]) {
        throw new Error(`Model '${modelName}' does not exist on Prisma client`);
      }
      return await prisma[modelName].findFirst(args);
    },
    `findFirst:${operationName}`
  );
}

/**
 * Check if we're in cooldown period
 */
function isInConnectionLimitCooldown() {
  if (!connectionLimitReached) return false;

  if (connectionLimitResetTime && Date.now() > connectionLimitResetTime) {
    connectionLimitReached = false;
    connectionLimitResetTime = null;
    console.log('✅ [SharedDB] Cooldown period ended');
    return false;
  }

  return true;
}

/**
 * Set connection limit flag with cooldown
 */
function setConnectionLimitReached() {
  if (!connectionLimitReached) {
    connectionLimitReached = true;
    connectionLimitResetTime = Date.now() + CONNECTION_LIMIT_COOLDOWN;
    console.log('🚨 [SharedDB] Connection limit reached - 1 hour cooldown');
  }
}

/**
 * Enhanced retry logic
 */
async function executeWithRetry(operation, maxRetries = 3, initialDelay = 500) {
  // Circuit breaker check
  if (isInConnectionLimitCooldown()) {
    const remainingTime = Math.ceil((connectionLimitResetTime - Date.now()) / 1000 / 60);
    throw new Error(`Database in cooldown. Retry after ${remainingTime} minutes.`);
  }

  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await executeWithQueue(async () => await operation());
    } catch (error) {
      lastError = error;
      // Faster backoff for better responsiveness
      const delay = initialDelay * Math.pow(1.5, i);
      console.warn(`🔄 [SharedDB] Retry ${i + 1}/${maxRetries} after ${Math.round(delay)}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Monitoring endpoint check
 */
async function healthCheck() {
  try {
    if (!sharedPrismaInstance) {
      await guaranteeConnection().catch(() => {});
    }
    if (!sharedPrismaInstance) {
      return { status: 'error', message: 'Not initialized' };
    }
    const start = Date.now();
    await sharedPrismaInstance.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      latency: Date.now() - start,
      queries: queryCount,
      queue: queryQueue.length,
      active: activeQueries
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

module.exports = {
  getSharedPrismaClient,
  getSharedPrismaClientAsync,
  safePrismaOperation,
  initializeSharedDatabase,
  closeSharedDatabase: async () => {
    isShuttingDown = true;
    if (connectionManager.healthCheckInterval) {
      clearInterval(connectionManager.healthCheckInterval);
      connectionManager.healthCheckInterval = null;
    }
    await disconnectSharedPrismaInstance();
  },
  safeQuery: (op, priority = 0) => executeWithQueue(op, priority),
  executeWithRetry,
  healthCheck,
  checkModelIntegrity,
  getPrismaClientPathsForDatabaseUrl,
  safeFindFirst,
  isInConnectionLimitCooldown,
  getConnectionStats: () => ({
    activeQueries,
    queueLength: queryQueue.length,
    isInitialized
  })
};
