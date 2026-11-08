/**
 * AI Video Studio orchestrator (Higgsfield-first, provider-agnostic).
 *
 * Billing model:
 *  - BYOK: company has its own HIGGSFIELD key (ai_keys keyType=COMPANY) → zero charge.
 *  - PLATFORM: central HIGGSFIELD key + atomic wallet debit per generation
 *    (cost USD → EGP via super-admin settings, mirroring orderBasedBillingService).
 *  - Simulation: no usable key → real local test clip, zero charge (dev/demo).
 *
 * Keys are resolved exclusively from public.ai_keys — never from .env files.
 */
const path = require('path');
const higgsfieldAdapter = require('./videoProviders/higgsfieldAdapter');
const { MODEL_CATALOG, getModel } = higgsfieldAdapter;
const { getSharedPrismaClient } = require('./sharedDatabase');

const SETTINGS_NAME = 'video_studio_settings';
const DEFAULT_SETTINGS = {
  usdToEgp: 50,
  markupPercent: 30,
  minChargeEgp: 1,
  maxJobsPerDayPerCompany: 50,
  simulationMode: 'auto', // auto | always | never
  baseUrl: null,
};

const round2 = (n) => Math.round(Number(n) * 100) / 100;

class VideoStudioService {
  getUploadDir(companyId) {
    return path.join(__dirname, '../uploads/video_studio', String(companyId || 'default'));
  }

  // ---------- Settings (SystemSettings row, super-admin controlled) ----------

  async getSettings() {
    const prisma = getSharedPrismaClient();
    if (!prisma) return { ...DEFAULT_SETTINGS };
    try {
      const row = await prisma.systemSettings.findUnique({ where: { systemName: SETTINGS_NAME } });
      if (!row?.config) return { ...DEFAULT_SETTINGS };
      const parsed = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
      return { ...DEFAULT_SETTINGS, ...parsed, isEnabled: row.isEnabled };
    } catch (e) {
      console.error('❌ [VIDEO-STUDIO] settings read error:', e.message);
      return { ...DEFAULT_SETTINGS };
    }
  }

  async updateSettings(patch) {
    const prisma = getSharedPrismaClient();
    const current = await this.getSettings();
    const next = { ...current, ...patch };
    delete next.isEnabled; // managed by SystemSettings row itself
    const configJson = JSON.stringify(next);
    await prisma.systemSettings.upsert({
      where: { systemName: SETTINGS_NAME },
      update: { config: configJson },
      create: {
        systemName: SETTINGS_NAME,
        displayName: 'إعدادات استوديو الفيديو',
        description: 'تسعير استوديو الفيديو: سعر الصرف، هامش الربح، حدود الاستخدام',
        category: 'ai',
        config: configJson,
      },
    });
    return next;
  }

  // ---------- Key resolution (DB-only, BYOK first) ----------

  async resolveKeys(companyId) {
    const prisma = getSharedPrismaClient();
    if (companyId && companyId !== 'default') {
      const companyKey = await prisma.aiKey.findFirst({
        where: { provider: 'HIGGSFIELD', companyId, isActive: true },
        orderBy: { priority: 'asc' },
        select: { apiKey: true, id: true, name: true },
      });
      if (companyKey?.apiKey) {
        return { billingMode: 'BYOK', apiKey: companyKey.apiKey, keyId: companyKey.id, keyName: companyKey.name };
      }
    }
    const centralKey = await prisma.aiKey.findFirst({
      where: { provider: 'HIGGSFIELD', isActive: true, OR: [{ keyType: 'CENTRAL' }, { companyId: null }] },
      orderBy: { priority: 'asc' },
      select: { apiKey: true, id: true, name: true, maxRequestsPerDay: true, currentUsage: true },
    });
    if (centralKey?.apiKey) {
      return { billingMode: 'PLATFORM', apiKey: centralKey.apiKey, keyId: centralKey.id, keyName: centralKey.name, maxRequestsPerDay: centralKey.maxRequestsPerDay };
    }
    return { billingMode: 'PLATFORM', apiKey: null, keyId: null, keyName: null };
  }

  // ---------- Cost ----------

  async estimateCost({ model, durationSeconds = 5, quantity = 1 }) {
    const entry = getModel(model);
    if (!entry) throw new Error(`Unknown model: ${model}`);
    const settings = await this.getSettings();
    const costUsd =
      entry.kind === 'video'
        ? entry.priceUsdPerSecond * Math.max(1, Number(durationSeconds) || 5)
        : entry.priceUsdPerImage * Math.max(1, Number(quantity) || 1);
    const egp = round2(costUsd * Number(settings.usdToEgp) * (1 + Number(settings.markupPercent) / 100));
    return {
      costUsd: Math.round(costUsd * 10000) / 10000,
      costEgp: Math.max(Number(settings.minChargeEgp), egp),
      usdToEgp: Number(settings.usdToEgp),
      markupPercent: Number(settings.markupPercent),
      modelKind: entry.kind,
    };
  }

  // ---------- Wallet (atomic conditional debit, mirrors orderBasedBillingService) ----------

  async chargeWallet(companyId, jobId, amountEgp) {
    const prisma = getSharedPrismaClient();
    if (!(amountEgp > 0)) return { charged: false, transactionId: null, reason: 'zero-charge' };

    let wallet = await prisma.companyWallet.findUnique({ where: { companyId } });
    if (!wallet) {
      wallet = await prisma.companyWallet.create({ data: { companyId, balance: 0, currency: 'EGP' } });
    }

    const referenceId = `VIDEO_JOB_${jobId}`;
    const result = await prisma.$transaction(async (tx) => {
      // Idempotency: never double-charge the same job
      const existing = await tx.transaction.findFirst({
        where: { walletId: wallet.id, referenceId },
        select: { id: true },
      });
      if (existing) return { alreadyCharged: true, transactionId: existing.id };

      const updated = await tx.companyWallet.updateMany({
        where: { companyId, balance: { gte: amountEgp } },
        data: { balance: { decrement: amountEgp }, totalSpent: { increment: amountEgp } },
      });
      if (updated.count === 0) return { insufficient: true };

      const txn = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: amountEgp,
          type: 'DEDUCT',
          status: 'COMPLETED',
          description: `استوديو الفيديو: توليد #${jobId.slice(-8)}`,
          referenceId,
        },
      });
      return { transactionId: txn.id };
    });

    if (result.insufficient) {
      const err = new Error(`رصيد المحفظة غير كافٍ. المطلوب ${amountEgp} ج.م — اشحن المحفظة وأعد المحاولة.`);
      err.statusCode = 402;
      throw err;
    }
    return { charged: !result.alreadyCharged, transactionId: result.transactionId };
  }

  async refundCharge(job, reason) {
    const prisma = getSharedPrismaClient();
    const amount = Number(job.chargedEgp || 0);
    if (!(amount > 0) || !job.walletTransactionId) return { refunded: false };

    const wallet = await prisma.companyWallet.findUnique({ where: { companyId: job.companyId } });
    if (!wallet) return { refunded: false };

    const referenceId = `VIDEO_REFUND_${job.id}`;
    return prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { walletId: wallet.id, referenceId },
        select: { id: true },
      });
      if (existing) return { refunded: false, reason: 'already-refunded' };

      await tx.companyWallet.update({
        where: { companyId: job.companyId },
        data: { balance: { increment: amount } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          description: `استرداد استوديو الفيديو: ${reason}`,
          referenceId,
        },
      });
      console.log(`↩️ [VIDEO-STUDIO] Refunded ${amount} EGP for job ${job.id} (${reason})`);
      return { refunded: true };
    });
  }

  async logUsage(companyId, job, costEgp) {
    const prisma = getSharedPrismaClient();
    try {
      const companyApp = await prisma.companyApp.findFirst({
        where: { companyId, app: { slug: 'ai-video-studio' } },
        select: { id: true },
      });
      if (!companyApp) return; // app not installed — telemetry only when installed
      await prisma.appUsageLog.create({
        data: {
          companyAppId: companyApp.id,
          feature: 'video_generation',
          quantity: 1,
          totalCost: costEgp,
          metadata: {
            jobId: job.id,
            model: job.model,
            type: job.type,
            billingMode: job.billingMode,
            simulated: Boolean(job.providerMeta?.simulated),
          },
        },
      });
    } catch (e) {
      console.warn(`⚠️ [VIDEO-STUDIO] usage log skipped: ${e.message}`);
    }
  }

  // ---------- Job lifecycle ----------

  validateJobInput({ type, model, params }) {
    const entry = getModel(model);
    if (!entry) throw new Error(`موديل غير معروف: ${model}`);
    const videoTypes = ['TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'MOTION_TRANSFER'];
    const imageTypes = ['TEXT_TO_IMAGE', 'CHARACTER_SHEET'];
    if (videoTypes.includes(type) && entry.kind !== 'video') {
      throw new Error(`الموديل ${entry.name} لا يولّد فيديو`);
    }
    if (imageTypes.includes(type) && entry.kind !== 'image') {
      throw new Error(`الموديل ${entry.name} لا يولّد صور`);
    }
    if (type === 'MOTION_TRANSFER' && !params.sourceVideoUrl) {
      throw new Error('نقل الحركة يتطلب فيديو مصدر');
    }
    if (!params.prompt || !String(params.prompt).trim()) {
      throw new Error('البرومبت مطلوب');
    }
    if (videoTypes.includes(type)) {
      const duration = Number(params.durationSeconds) || 5;
      if (duration < 1 || duration > entry.maxDurationSeconds) {
        throw new Error(`المدة يجب أن تكون بين 1 و ${entry.maxDurationSeconds} ثانية لموديل ${entry.name}`);
      }
    }
    return entry;
  }

  async createJob({ companyId, userId, type, model, params = {}, storySceneId = null }) {
    const prisma = getSharedPrismaClient();
    const entry = this.validateJobInput({ type, model, params });

    const [settings, keyInfo] = await Promise.all([this.getSettings(), this.resolveKeys(companyId)]);
    const simulation = higgsfieldAdapter.isSimulation({ apiKey: keyInfo.apiKey, settings });

    // Per-company daily cap (protects the platform key)
    if (!simulation) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last24h = await prisma.videoJob.count({
        where: { companyId, createdAt: { gte: since }, status: { not: 'CANCELLED' } },
      });
      if (last24h >= Number(settings.maxJobsPerDayPerCompany)) {
        const err = new Error(`تم الوصول للحد اليومي (${settings.maxJobsPerDayPerCompany} توليد/يوم). حاول غدًا.`);
        err.statusCode = 429;
        throw err;
      }
    }

    const estimate = await this.estimateCost({
      model,
      durationSeconds: params.durationSeconds,
      quantity: params.quantity || 1,
    });

    const willCharge = keyInfo.billingMode === 'PLATFORM' && !simulation && estimate.costEgp > 0;

    const job = await prisma.videoJob.create({
      data: {
        companyId,
        userId: userId || null,
        type,
        provider: 'HIGGSFIELD',
        model,
        params,
        status: 'QUEUED',
        costUsd: estimate.costUsd,
        costEgp: estimate.costEgp,
        billingMode: simulation ? 'PLATFORM' : keyInfo.billingMode,
        chargedEgp: willCharge ? estimate.costEgp : 0,
        storySceneId,
      },
    });

    if (willCharge) {
      try {
        const charge = await this.chargeWallet(companyId, job.id, estimate.costEgp);
        await prisma.videoJob.update({
          where: { id: job.id },
          data: { walletTransactionId: charge.transactionId },
        });
        job.walletTransactionId = charge.transactionId;
      } catch (chargeErr) {
        await prisma.videoJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', errorMessage: chargeErr.message },
        });
        throw chargeErr;
      }
    }

    await this.logUsage(companyId, { ...job, providerMeta: { simulated: simulation } }, willCharge ? estimate.costEgp : 0);
    console.log(`🎬 [VIDEO-STUDIO] Job ${job.id} queued (${type}/${model}, ${simulation ? 'SIMULATION' : keyInfo.billingMode}, ${willCharge ? `${estimate.costEgp} EGP` : 'free'})`);
    return job;
  }

  async getJobs(companyId, { status, limit = 50, offset = 0, type } = {}) {
    const prisma = getSharedPrismaClient();
    return prisma.videoJob.findMany({
      where: { companyId, ...(status ? { status } : {}), ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Number(limit) || 50),
      skip: Number(offset) || 0,
    });
  }

  async getJob(companyId, jobId) {
    const prisma = getSharedPrismaClient();
    const job = await prisma.videoJob.findUnique({ where: { id: jobId } });
    if (!job || job.companyId !== companyId) return null;
    return job;
  }

  async requestCancel(companyId, jobId) {
    const prisma = getSharedPrismaClient();
    const job = await this.getJob(companyId, jobId);
    if (!job) return { ok: false, statusCode: 404, error: 'الوظيفة غير موجودة' };
    if (job.status === 'COMPLETED') return { ok: false, statusCode: 400, error: 'الوظيفة مكتملة بالفعل' };
    if (job.status === 'CANCELLED' || job.status === 'FAILED') {
      return { ok: true, job };
    }
    if (job.status === 'QUEUED') {
      const updated = await prisma.videoJob.update({
        where: { id: job.id },
        data: { status: 'CANCELLED' },
      });
      await this.refundCharge(updated, 'إلغاء قبل التنفيذ');
      return { ok: true, job: updated };
    }
    // PROCESSING: flag it — the worker honors the flag between polls
    await prisma.videoJob.update({
      where: { id: job.id },
      data: { providerMeta: { ...(job.providerMeta || {}), cancelRequested: true } },
    });
    return { ok: true, job: { ...job, providerMeta: { ...(job.providerMeta || {}), cancelRequested: true } } };
  }

  // ---------- BYOK management ----------

  maskKey(combined) {
    if (!combined || !combined.includes(':')) return '••••';
    const [id, secret] = combined.split(':');
    const visibleId = id.slice(0, 6);
    const visibleSecret = secret.slice(-4);
    return `${visibleId}••••:••••${visibleSecret}`;
  }

  async getByokInfo(companyId) {
    const prisma = getSharedPrismaClient();
    const key = await prisma.aiKey.findFirst({
      where: { provider: 'HIGGSFIELD', companyId },
      orderBy: { priority: 'asc' },
      select: { id: true, name: true, apiKey: true, isActive: true, createdAt: true },
    });
    return {
      configured: Boolean(key?.apiKey),
      masked: key?.apiKey ? this.maskKey(key.apiKey) : null,
      keyName: key?.name || null,
      isActive: key ? key.isActive : false,
      createdAt: key?.createdAt || null,
    };
  }

  async saveByokKey(companyId, { keyId, secret, name }) {
    const prisma = getSharedPrismaClient();
    if (!keyId || !secret) throw new Error('Key ID و Secret مطلوبان');
    const combined = `${keyId.trim()}:${secret.trim()}`;
    try {
      const existing = await prisma.aiKey.findFirst({
        where: { provider: 'HIGGSFIELD', companyId },
        orderBy: { priority: 'asc' },
      });
      if (existing) {
        return prisma.aiKey.update({
          where: { id: existing.id },
          data: { apiKey: combined, isActive: true, name: name || existing.name },
        });
      }
      return await prisma.aiKey.create({
        data: {
          name: name || `Higgsfield (${companyId.slice(-6)})`,
          provider: 'HIGGSFIELD',
          apiKey: combined,
          keyType: 'COMPANY',
          companyId,
          usage: 'AI Video Studio',
          priority: 1,
          isActive: true,
        },
      });
    } catch (e) {
      if (String(e.code) === 'P2002') {
        throw new Error('هذا المفتاح مسجل بالفعل على المنصة. استخدم مفتاحًا آخر.');
      }
      throw e;
    }
  }

  async deleteByokKey(companyId) {
    const prisma = getSharedPrismaClient();
    const existing = await prisma.aiKey.findFirst({
      where: { provider: 'HIGGSFIELD', companyId },
      orderBy: { priority: 'asc' },
    });
    if (!existing) return { deleted: false };
    await prisma.aiKey.delete({ where: { id: existing.id } });
    return { deleted: true };
  }

  // ---------- Key test + usage ----------

  /**
   * Test a Higgsfield key without generating anything.
   * - With {keyId, secret}: probes the provided key WITHOUT saving it.
   * - Without: probes the company's effective key (BYOK, else central).
   */
  async testKey(companyId, { keyId, secret } = {}) {
    const settings = await this.getSettings();
    if (keyId && secret) {
      const ping = await higgsfieldAdapter.ping({ apiKey: `${String(keyId).trim()}:${String(secret).trim()}`, settings });
      return { ...ping, source: 'provided' };
    }
    const keyInfo = await this.resolveKeys(companyId);
    const ping = await higgsfieldAdapter.ping({ apiKey: keyInfo.apiKey, settings });
    return { ...ping, source: keyInfo.billingMode === 'BYOK' ? 'byok' : 'central', billingMode: keyInfo.billingMode };
  }

  /**
   * Usage snapshot. Super admin: platform-wide. Merchant: own companyId scope.
   */
  async getUsage({ companyId = null } = {}) {
    const prisma = getSharedPrismaClient();
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const base = companyId ? { companyId } : {};
    const [totalJobs, jobs30, completedRows] = await Promise.all([
      prisma.videoJob.count({ where: base }),
      prisma.videoJob.count({ where: { ...base, createdAt: { gte: since30 } } }),
      prisma.videoJob.findMany({
        where: { ...base, createdAt: { gte: since30 }, status: 'COMPLETED' },
        select: { chargedEgp: true, billingMode: true },
      }),
    ]);
    const revenueEgp = round2(completedRows.reduce((s, j) => s + (Number(j.chargedEgp) || 0), 0));
    const byok30 = completedRows.filter((j) => j.billingMode === 'BYOK').length;
    return {
      totalJobs,
      jobs30,
      completed30: completedRows.length,
      platform30: completedRows.length - byok30,
      byok30,
      revenueEgp,
    };
  }

  // ---------- Config endpoint payload ----------

  async getConfig(companyId) {
    const prisma = getSharedPrismaClient();
    const [settings, byok, wallet] = await Promise.all([
      this.getSettings(),
      this.getByokInfo(companyId),
      prisma.companyWallet.findUnique({ where: { companyId }, select: { balance: true } }),
    ]);
    const keyInfo = await this.resolveKeys(companyId);
    const simulation = higgsfieldAdapter.isSimulation({ apiKey: keyInfo.apiKey, settings });
    return {
      models: MODEL_CATALOG,
      settings: {
        usdToEgp: settings.usdToEgp,
        markupPercent: settings.markupPercent,
        minChargeEgp: settings.minChargeEgp,
        maxJobsPerDayPerCompany: settings.maxJobsPerDayPerCompany,
      },
      walletBalance: wallet ? Number(wallet.balance) : 0,
      byok,
      billingMode: keyInfo.billingMode,
      simulation,
    };
  }
}

module.exports = new VideoStudioService();
module.exports.MODEL_CATALOG = MODEL_CATALOG;
