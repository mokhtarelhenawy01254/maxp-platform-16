/**
 * 🚀 Import Job Service
 * خدمة استيراد الطلبات في الخلفية مع دعم الاستئناف
 * 
 * المميزات:
 * - استيراد في الخلفية (لا يتأثر بإغلاق المتصفح)
 * - حفظ نقاط التوقف تلقائياً
 * - استئناف تلقائي بعد الفشل
 * - تحديثات فورية عبر WebSocket
 * - دعم عدة مهام متزامنة
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const axios = require('axios');
const { importSingleOrder } = require('./wooCommerceImportService');

// تخزين المهام النشطة في الذاكرة
const activeJobs = new Map();

// حالات المهمة
const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * إنشاء مهمة استيراد جديدة
 */
async function createImportJob(companyId, options = {}) {
  // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

  const jobId = `import_${companyId}_${Date.now()}`;

  const job = {
    id: jobId,
    companyId,
    type: options.type || 'orders', // orders | products
    status: JOB_STATUS.PENDING,
    options: {
      settingsId: options.settingsId || null,
      batchSize: options.batchSize || 100,
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
    updatedAt: new Date(),
    startedAt: null,
    completedAt: null,
    error: null
  };

  // حفظ في قاعدة البيانات
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
    // إذا لم يكن الجدول موجوداً، نستخدم الذاكرة فقط
    console.log('⚠️ [IMPORT-JOB] Using memory storage (table not found)');
  }

  // حفظ في الذاكرة
  activeJobs.set(jobId, job);

  console.log(`📦 [IMPORT-JOB] Created job ${jobId} for company ${companyId}`);

  return job;
}

/**
 * بدء تنفيذ مهمة الاستيراد
 */
async function startImportJob(jobId, io) {
  const job = activeJobs.get(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  if (job.status === JOB_STATUS.RUNNING) {
    throw new Error('Job is already running');
  }

  job.status = JOB_STATUS.RUNNING;
  job.startedAt = new Date();
  job.updatedAt = new Date();

  console.log(`🚀 [IMPORT-JOB] Starting job ${jobId}`);

  // تشغيل في الخلفية
  processImportJob(job, io).catch(error => {
    console.error(`❌ [IMPORT-JOB] Job ${jobId} failed:`, error);
    job.status = JOB_STATUS.FAILED;
    job.error = error.message;
    job.updatedAt = new Date();

    // إرسال تحديث الفشل
    if (io) {
      io.to(`company_${job.companyId}`).emit('import_job_update', {
        jobId: job.id,
        status: job.status,
        error: job.error,
        progress: job.progress
      });
    }
  });

  return job;
}

/**
 * معالجة مهمة الاستيراد (تعمل في الخلفية)
 */
async function processImportJob(job, io) {
  // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

  try {
    // جلب إعدادات WooCommerce
    const where = job.options?.settingsId
      ? { id: job.options.settingsId, companyId: job.companyId }
      : { companyId: job.companyId };
    const settings = await getSharedPrismaClient().woocommerceSettings.findFirst({
      where
    });

    if (!settings) {
      throw new Error('WooCommerce settings not found');
    }

    const { storeUrl, consumerKey, consumerSecret } = settings;
    const cleanUrl = storeUrl.replace(/\/+$/, '');
    const batchSize = job.options.batchSize;

    // ═══════════════════════════════════════════════════════════════
    // 📊 الخطوة 1: جلب العدد الإجمالي
    // ═══════════════════════════════════════════════════════════════
    emitProgress(io, job, 'جاري حساب إجمالي الطلبات...');

    const countResponse = await axios.get(`${cleanUrl}/wp-json/wc/v3/orders`, {
      params: { per_page: 1, status: job.options.status === 'any' ? undefined : job.options.status },
      auth: { username: consumerKey, password: consumerSecret }
    });

    const grandTotal = parseInt(countResponse.headers['x-wp-total'] || '0');
    const totalBatches = Math.ceil(grandTotal / batchSize);

    job.progress.grandTotal = grandTotal;
    job.progress.totalBatches = totalBatches;

    emitProgress(io, job, `📊 إجمالي الطلبات: ${grandTotal.toLocaleString()} (${totalBatches} دفعة)`);

    if (grandTotal === 0) {
      job.status = JOB_STATUS.COMPLETED;
      job.completedAt = new Date();
      emitProgress(io, job, '✅ لا توجد طلبات للاستيراد');
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // 📥 الخطوة 2: جلب واستيراد على دفعات
    // ═══════════════════════════════════════════════════════════════
    let page = job.progress.currentPage;
    let hasMore = true;

    while (hasMore && job.status === JOB_STATUS.RUNNING) {
      job.progress.currentBatch++;
      job.progress.currentPage = page;

      // حفظ نقطة التوقف
      await saveCheckpoint(job);

      emitProgress(io, job, `📥 جلب الدفعة ${job.progress.currentBatch}/${totalBatches}...`);

      // جلب دفعة من الطلبات
      const params = {
        per_page: batchSize,
        page: page,
        orderby: 'date',
        order: 'desc'
      };

      if (job.options.status && job.options.status !== 'any') {
        params.status = job.options.status;
      }
      if (job.options.dateFrom) {
        params.after = new Date(job.options.dateFrom).toISOString();
      }
      if (job.options.dateTo) {
        params.before = new Date(job.options.dateTo).toISOString();
      }

      const ordersResponse = await axios.get(`${cleanUrl}/wp-json/wc/v3/orders`, {
        params,
        auth: { username: consumerKey, password: consumerSecret }
      });

      const orders = ordersResponse.data;

      // Debug: فحص أول طلب
      if (orders && orders.length > 0) {
        console.log('🔍 [WOO-API] Sample order status from API:', orders[0].status);
      }

      if (!orders || orders.length === 0) {
        hasMore = false;
        break;
      }

      // استيراد الدفعة
      emitProgress(io, job, `⏳ استيراد الدفعة ${job.progress.currentBatch}/${totalBatches} (${orders.length} طلب)...`);

      const importResult = await importOrdersBatch(orders, job.companyId, job.options.duplicateAction, settings.statusMapping);

      // تحديث الإحصائيات
      job.progress.imported += importResult.imported;
      job.progress.updated += importResult.updated;
      job.progress.skipped += importResult.skipped;
      job.progress.failed += importResult.failed;
      job.progress.processedOrders += orders.length;
      job.progress.percentage = Math.round((job.progress.processedOrders / grandTotal) * 100);

      emitProgress(io, job,
        `✅ تم: ${job.progress.processedOrders.toLocaleString()}/${grandTotal.toLocaleString()} (${job.progress.percentage}%)`
      );

      // التحقق من الانتهاء
      if (orders.length < batchSize) {
        hasMore = false;
      } else {
        page++;
      }

      // تأخير صغير لتجنب rate limiting
      await sleep(500);
    }

    // ═══════════════════════════════════════════════════════════════
    // 🎉 الخطوة 3: الانتهاء
    // ═══════════════════════════════════════════════════════════════
    if (job.status === JOB_STATUS.RUNNING) {
      job.status = JOB_STATUS.COMPLETED;
      job.completedAt = new Date();
      job.progress.percentage = 100;

      emitProgress(io, job,
        `🎉 تم الانتهاء! استيراد: ${job.progress.imported} | تحديث: ${job.progress.updated} | تخطي: ${job.progress.skipped} | فشل: ${job.progress.failed}`
      );

      // Emit completed event
      if (io) {
        io.to(`company_${job.companyId}`).emit('import:completed', {
          jobId: job.id,
          result: job.progress
        });
      }
    }

    // حفظ النتيجة النهائية
    await saveCheckpoint(job);

  } catch (error) {
    console.error(`❌ [IMPORT-JOB] Error in job ${job.id}:`, error);
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
 * استيراد دفعة من الطلبات (Optimized)
 */
async function importOrdersBatch(orders, companyId, duplicateAction, statusMapping) {
  const prisma = getSharedPrismaClient();
  const { importOrdersBatchOptimized } = require('./wooCommerceImportService');

  return await importOrdersBatchOptimized(prisma, companyId, orders, {
    duplicateAction,
    statusMapping,
    triggeredBy: 'system'
  });
}

// Helper functions removed as they are now handled by wooCommerceImportService

/**
 * حفظ نقطة التوقف
 */
async function saveCheckpoint(job) {
  // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

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
    // الجدول غير موجود، نستخدم الذاكرة فقط
  }
}

/**
 * إرسال تحديث التقدم عبر WebSocket
 */
function emitProgress(io, job, message) {
  job.progress.status = message;
  job.updatedAt = new Date();

  console.log(`📊 [IMPORT-JOB] ${job.id}: ${message}`);

  if (io) {
    // 1. Send update to company room (legacy)
    io.to(`company_${job.companyId}`).emit('import_job_update', {
      jobId: job.id,
      status: job.status,
      message,
      progress: job.progress
    });

    // 2. Send update with specific event name expected by hook
    io.to(`company_${job.companyId}`).emit('import:progress', {
      jobId: job.id,
      ...job.progress,
      message
    });
  }
}

/**
 * إيقاف مؤقت للمهمة
 */
function pauseJob(jobId) {
  const job = activeJobs.get(jobId);
  if (job && job.status === JOB_STATUS.RUNNING) {
    job.status = JOB_STATUS.PAUSED;
    job.updatedAt = new Date();
    console.log(`⏸️ [IMPORT-JOB] Paused job ${jobId}`);
    return true;
  }
  return false;
}

/**
 * استئناف المهمة
 */
async function resumeJob(jobId, io) {
  const job = activeJobs.get(jobId);
  if (job && (job.status === JOB_STATUS.PAUSED || job.status === JOB_STATUS.FAILED)) {
    job.status = JOB_STATUS.RUNNING;
    job.error = null;
    job.updatedAt = new Date();

    console.log(`▶️ [IMPORT-JOB] Resuming job ${jobId} from batch ${job.progress.currentBatch}`);

    // استئناف المعالجة
    processImportJob(job, io).catch(error => {
      console.error(`❌ [IMPORT-JOB] Resume failed for ${jobId}:`, error);
    });

    return true;
  }
  return false;
}

/**
 * إلغاء المهمة
 */
function cancelJob(jobId) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = JOB_STATUS.CANCELLED;
    job.updatedAt = new Date();
    console.log(`🛑 [IMPORT-JOB] Cancelled job ${jobId}`);
    return true;
  }
  return false;
}

/**
 * الحصول على حالة المهمة
 */
function getJobStatus(jobId) {
  return activeJobs.get(jobId) || null;
}

/**
 * الحصول على جميع مهام الشركة
 */
function getCompanyJobs(companyId) {
  const jobs = [];
  for (const [id, job] of activeJobs) {
    if (job.companyId === companyId) {
      jobs.push(job);
    }
  }
  return jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * تأخير
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createImportJob,
  startImportJob,
  pauseJob,
  resumeJob,
  cancelJob,
  getJobStatus,
  getCompanyJobs,
  JOB_STATUS
};

