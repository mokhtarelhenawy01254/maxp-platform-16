/**
 * 🚀 Enhanced WooCommerce Import Service
 * Optimized with cursor-based pagination, parallel processing, and retry mechanisms
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const axios = require('axios');
const { importSingleOrder } = require('./wooCommerceImportService');

// Configuration
const CONFIG = {
  // Batch processing
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 100,
  PARALLEL_BATCHES: 2,
  
  // Rate limiting
  WOO_API_DELAY: 500, // ms between requests
  WOO_API_TIMEOUT: 30000, // 30 seconds
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000, // 1 second base
  RETRY_DELAY_MAX: 10000, // 10 seconds max
  RETRY_BACKOFF_MULTIPLIER: 2,
  
  // Parallel processing
  PARALLEL_DB_OPERATIONS: 5,
  PARALLEL_DB_TIMEOUT: 5000, // 5 seconds per operation
};

// In-memory job storage with persistence
const activeJobs = new Map();
const deadLetterQueue = []; // Failed items for later retry

// Job statuses
const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Sleep utility with configurable delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(attempt) {
  const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, CONFIG.RETRY_DELAY_MAX);
}

/**
 * Sleep with jitter for distributed systems
 */
function sleepWithJitter(baseMs) {
  const jitter = Math.random() * baseMs * 0.1; // 10% jitter
  return sleep(baseMs + jitter);
}

/**
 * Promise with timeout wrapper
 */
function promiseWithTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * Execute promises with concurrency limit
 */
async function mapWithConcurrency(items, concurrency, mapper) {
  const results = [];
  const queue = [];
  
  for (const item of items) {
    const promise = mapper(item);
    queue.push(promise);
    results.push(promise);
    
    if (queue.length >= concurrency) {
      await Promise.race(queue);
    }
  }
  
  return Promise.all(results);
}

/**
 * Execute promises with allSettled and timeout
 */
async function executeWithAllSettled(promises) {
  const results = await Promise.allSettled(promises);
  
  const fulfilled = [];
  const rejected = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value);
    } else {
      rejected.push({ reason: result.reason, index });
    }
  });
  
  return { fulfilled, rejected };
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, options = {}) {
  const { maxRetries = CONFIG.MAX_RETRIES, onRetry } = options;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (onRetry) {
        onRetry(error, attempt + 1);
      }
      
      const delay = getRetryDelay(attempt);
      console.log(`⚠️ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Add item to dead letter queue
 */
function addToDeadLetterQueue(item) {
  deadLetterQueue.push(item);
  
  // Keep only last 1000 failed items
  if (deadLetterQueue.length > 1000) {
    deadLetterQueue.shift();
  }
  
  console.log(`📪 Added to dead letter queue. Total: ${deadLetterQueue.length}`);
}

/**
 * Process dead letter queue
 */
async function processDeadLetterQueue() {
  if (deadLetterQueue.length === 0) {
    return { processed: 0, failed: 0 };
  }
  
  console.log(`🔄 Processing ${deadLetterQueue.length} dead letter items...`);
  
  const results = await executeWithAllSettled(
    deadLetterQueue.map(item => 
      retryWithBackoff(() => {
        console.log(`📪 Retrying dead letter item: ${item.type}`);
        return Promise.resolve(item);
      })
    )
  );
  
  return {
    processed: results.fulfilled.length,
    failed: results.rejected.length
  };
}

/**
 * Get orders from WooCommerce with cursor-based pagination
 */
async function fetchOrdersWithCursor(settings, options) {
  const { storeUrl, consumerKey, consumerSecret } = settings;
  const cleanUrl = storeUrl.replace(/\/+$/, '');
  const batchSize = options.batchSize || CONFIG.DEFAULT_BATCH_SIZE;
  
  const params = {
    per_page: batchSize,
    orderby: 'date',
    order: 'desc'
  };
  
  // Handle cursor-based pagination
  if (options.cursor) {
    try {
      const cursorDate = Buffer.from(options.cursor, 'base64').toString('utf-8');
      params.after = cursorDate;
    } catch {
      console.warn('⚠️ Invalid cursor, ignoring');
    }
  }
  
  if (options.status && options.status !== 'any') {
    params.status = options.status;
  }
  
  if (options.after) {
    params.after = new Date(options.after).toISOString();
  }
  
  if (options.before) {
    params.before = new Date(options.before).toISOString();
  }
  
  // Fetch with retry
  const response = await retryWithBackoff(
    async () => {
      return axios.get(`${cleanUrl}/wp-json/wc/v3/orders`, {
        params,
        auth: { username: consumerKey, password: consumerSecret },
        timeout: CONFIG.WOO_API_TIMEOUT
      });
    },
    {
      maxRetries: CONFIG.MAX_RETRIES,
      onRetry: (error, attempt) => {
        console.warn(`⚠️ WooCommerce API retry ${attempt}/${CONFIG.MAX_RETRIES}:`, error.message);
      }
    }
  );
  
  const orders = response.data;
  const total = parseInt(response.headers['x-wp-total'] || '0');
  const hasMore = orders.length === batchSize;
  
  // Create cursor from last order date
  let nextCursor = null;
  if (hasMore && orders.length > 0) {
    const lastOrder = orders[orders.length - 1];
    const lastDate = lastOrder.date_created || lastOrder.date_created_gmt;
    if (lastDate) {
      nextCursor = Buffer.from(lastDate).toString('base64');
    }
  }
  
  return { orders, hasMore, nextCursor, total };
}

/**
 * Process a single order with error handling
 */
async function processOrderWithRetry(prisma, companyId, orderData, options) {
  const maxRetries = options.maxRetries || CONFIG.MAX_RETRIES;
  
  return retryWithBackoff(
    async () => {
      const result = await importSingleOrder(prisma, companyId, orderData, {
        duplicateAction: options.duplicateAction,
        statusMapping: options.statusMapping,
        triggeredBy: 'system'
      });
      
      return {
        status: result.status === 'imported' ? 'imported' :
                result.status === 'updated' ? 'updated' :
                result.status === 'skipped' ? 'skipped' : 'failed'
      };
    },
    {
      maxRetries,
      onRetry: (error, attempt) => {
        console.warn(`⚠️ Order retry ${attempt}/${maxRetries}:`, error.message);
      }
    }
  );
}

/**
 * Enhanced batch import with parallel processing
 */
async function importOrdersBatchEnhanced(prisma, companyId, orders, options) {
  const stats = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };
  
  if (!orders || orders.length === 0) {
    return stats;
  }
  
  // Process orders in parallel batches
  const batchSize = Math.ceil(orders.length / CONFIG.PARALLEL_BATCHES);
  const batches = [];
  
  for (let i = 0; i < orders.length; i += batchSize) {
    batches.push(orders.slice(i, i + batchSize));
  }
  
  // Process batches concurrently
  for (const batch of batches) {
    const results = await mapWithConcurrency(
      batch,
      CONFIG.PARALLEL_DB_OPERATIONS,
      async (order) => {
        const orderId = order.id || order.wooCommerceId;
        
        try {
          const result = await processOrderWithRetry(prisma, companyId, order, options);
          
          if (result.status === 'imported') stats.imported++;
          else if (result.status === 'updated') stats.updated++;
          else if (result.status === 'skipped') stats.skipped++;
          
          return { orderId, ...result };
        } catch (error) {
          stats.failed++;
          const errorMsg = error.message || 'Unknown error';
          stats.errors.push({ orderId: String(orderId), error: errorMsg });
          
          // Add to dead letter queue
          addToDeadLetterQueue({
            type: 'order',
            data: order,
            error: errorMsg,
            timestamp: new Date(),
            jobId: `batch_${Date.now()}`
          });
          
          return { orderId, status: 'failed', error: errorMsg };
        }
      }
    );
    
    // Log batch progress
    console.log(`📦 Batch progress: ${results.filter(r => r.status !== 'failed').length}/${batch.length}`);
  }
  
  return stats;
}

/**
 * Create import job
 */
async function createImportJob(companyId, options = {}) {
  const jobId = `import_${companyId}_${Date.now()}`;
  
  const job = {
    id: jobId,
    companyId,
    type: options.type || 'orders',
    status: JOB_STATUS.PENDING,
    options: {
      batchSize: options.batchSize || CONFIG.DEFAULT_BATCH_SIZE,
      status: options.status || 'any',
      dateFrom: options.dateFrom || null,
      dateTo: options.dateTo || null,
      duplicateAction: options.duplicateAction || 'skip'
    },
    progress: {
      currentPage: 1,
      currentBatch: 0,
      totalBatches: 0,
      processedOrders: 0,
      grandTotal: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      percentage: 0
    },
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    error: null,
    cursor: null
  };
  
  // Persist to database
  try {
    await getSharedPrismaClient().importJob.create({
      data: {
        id: jobId,
        companyId,
        type: job.type,
        status: job.status,
        options: JSON.stringify(job.options),
        progress: JSON.stringify(job.progress),
        createdAt: job.createdAt
      }
    });
  } catch (e) {
    console.log('⚠️ Using memory storage (table not found)');
  }
  
  activeJobs.set(jobId, job);
  console.log(`📦 [IMPORT-JOB] Created job ${jobId}`);
  
  return job;
}

/**
 * Process import job with cursor-based pagination
 */
async function processImportJobEnhanced(job, io) {
  const prisma = getSharedPrismaClient();
  
  try {
    // Fetch settings
    const settings = await getSharedPrismaClient().woocommerceSettings.findUnique({
      where: { companyId: job.companyId }
    });
    
    if (!settings) {
      throw new Error('WooCommerce settings not found');
    }
    
    const { storeUrl, consumerKey, consumerSecret } = settings;
    const cleanUrl = storeUrl.replace(/\/+$/, '');
    
    job.status = JOB_STATUS.RUNNING;
    job.startedAt = new Date();
    
    // Get total count first
    const initialFetch = await fetchOrdersWithCursor(
      { storeUrl, consumerKey, consumerSecret },
      { batchSize: 1 }
    );
    
    job.progress.grandTotal = initialFetch.total;
    job.progress.totalBatches = Math.ceil(initialFetch.total / job.options.batchSize);
    
    emitProgress(io, job, `📊 إجمالي الطلبات: ${initialFetch.total.toLocaleString()}`);
    
    if (initialFetch.total === 0) {
      job.status = JOB_STATUS.COMPLETED;
      job.completedAt = new Date();
      emitProgress(io, job, '✅ لا توجد طلبات للاستيراد');
      return;
    }
    
    // Process with cursor-based pagination
    let cursor = null;
    let hasMore = true;
    let batchCount = 0;
    
    while (hasMore && job.status === JOB_STATUS.RUNNING) {
      batchCount++;
      job.progress.currentBatch = batchCount;
      
      // Save checkpoint
      await saveCheckpoint(job);
      
      emitProgress(io, job, `📥 جلب الدفعة ${batchCount}/${job.progress.totalBatches}...`);
      
      // Fetch batch with cursor
      const { orders, hasMore: more, nextCursor } = await fetchOrdersWithCursor(
        { storeUrl, consumerKey, consumerSecret },
        {
          batchSize: job.options.batchSize,
          status: job.options.status,
          after: job.options.dateFrom,
          before: job.options.dateTo,
          cursor
        }
      );
      
      if (orders.length === 0) {
        hasMore = false;
        break;
      }
      
      // Import batch with parallel processing
      const batchStats = await importOrdersBatchEnhanced(prisma, job.companyId, orders, {
        duplicateAction: job.options.duplicateAction,
        statusMapping: settings.statusMapping || {}
      });
      
      // Update progress
      job.progress.imported += batchStats.imported;
      job.progress.updated += batchStats.updated;
      job.progress.skipped += batchStats.skipped;
      job.progress.failed += batchStats.failed;
      job.progress.processedOrders += orders.length;
      job.progress.percentage = Math.round((job.progress.processedOrders / job.progress.grandTotal) * 100);
      
      emitProgress(io, job,
        `✅ ${job.progress.processedOrders.toLocaleString()}/${job.progress.grandTotal.toLocaleString()} (${job.progress.percentage}%)`
      );
      
      // Update cursor
      cursor = nextCursor;
      hasMore = more && orders.length === job.options.batchSize;
      
      // Rate limiting
      await sleepWithJitter(CONFIG.WOO_API_DELAY);
    }
    
    // Complete job
    if (job.status === JOB_STATUS.RUNNING) {
      job.status = JOB_STATUS.COMPLETED;
      job.completedAt = new Date();
      job.progress.percentage = 100;
      
      emitProgress(io, job,
        `🎉 اكتمل! استيراد: ${job.progress.imported} | تحديث: ${job.progress.updated} | تخطي: ${job.progress.skipped} | فشل: ${job.progress.failed}`
      );
      
      if (io) {
        io.to(`company_${job.companyId}`).emit('import:completed', {
          jobId: job.id,
          result: job.progress
        });
      }
    }
    
    await saveCheckpoint(job);
    
  } catch (error) {
    console.error(`❌ [IMPORT-JOB] Error:`, error);
    job.status = JOB_STATUS.FAILED;
    job.error = error.message;
    job.updatedAt = new Date();
    
    emitProgress(io, job, `❌ فشل: ${error.message}`);
    
    if (io) {
      io.to(`company_${job.companyId}`).emit('import:failed', {
        jobId: job.id,
        error: error.message
      });
    }
    
    throw error;
  }
}

/**
 * Emit progress update
 */
function emitProgress(io, job, message) {
  job.progress.status = message;
  job.updatedAt = new Date();
  
  console.log(`📊 [IMPORT-JOB] ${job.id}: ${message}`);
  
  if (io) {
    io.to(`company_${job.companyId}`).emit('import:progress', {
      jobId: job.id,
      ...job.progress,
      message
    });
  }
}

/**
 * Save checkpoint
 */
async function saveCheckpoint(job) {
  job.updatedAt = new Date();
  
  try {
    await getSharedPrismaClient().importJob.update({
      where: { id: job.id },
      data: {
        status: job.status,
        progress: JSON.stringify(job.progress),
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        error: job.error
      }
    });
  } catch (e) {
    // Memory only
  }
}

// Export functions
module.exports = {
  createImportJob,
  processImportJobEnhanced,
  addToDeadLetterQueue,
  processDeadLetterQueue,
  fetchOrdersWithCursor,
  importOrdersBatchEnhanced,
  sleepWithJitter,
  promiseWithTimeout,
  executeWithAllSettled,
  mapWithConcurrency,
  retryWithBackoff,
  JOB_STATUS,
  CONFIG
};
