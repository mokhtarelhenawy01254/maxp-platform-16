/**
 * Model Manager Module
 * 
 * هذا الـ module يحتوي على منطق إدارة نماذج Gemini:
 * 1. getActiveaIKey - الحصول على المفتاح النشط
 * 2. findNextAvailableModel - البحث عن نموذج احتياطي
 * 3. إدارة النماذج والتبديل بينها
 * 
 * ✅ تحويل من singleton إلى class مع lazy initialization
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { isPermissionError, getPermissionErrorMessage } = require('../../utils/dbPermissionHelper');
const AIProviderFactory = require('./providers/AIProviderFactory');
const aiProviderLogService = require('./providerLogService');
// const newQuotaService = require('./NewQuotaService'); // ✅ DEPRECATED: Logic merged here
const systemManager = require('../../services/systemManager'); // ✅ Import System Manager
const stateManager = require('./stateManager'); // ✅ Phase 3: Distributed State Manager (Redis)
const providerBudgetLedgerService = require('./providerBudgetLedgerService');
const {
  RETIRED_GEMINI_MODEL_NAMES,
  UNSTABLE_GEMINI_MODEL_ALIAS_NAMES,
  isProductionUnsafeGeminiModelName,
} = require('./geminiModelPolicy');

/**
 * ✅ StateStore Abstraction (Enhanced)
 */
// ✅ StateStore Removed - Logic moved to StateManager
// This can be easily moved to a Database Table or Environment Variable later
// ✅ FIX: Model Limits are now loaded from Database (AIModelLimit table)
// This constant is deprecated and will be removed in future cleanup.
const MODEL_LIMITS_CONFIG = {
  // Default fallback if DB is empty
  'defaults': { limit: 250000, rpm: 10, rph: 600, rpd: 250, tpm: 250000 }
};

const SUPPORTED_PROVIDER_ORDER = [
  'GOOGLE',
  'GROQ',
  'OPENROUTER',
  'NVIDIA',
  'DEEPSEEK',
  'OPENAI',
  'ANTHROPIC',
  'HUGGINGFACE',
  'OLLAMA'
];

const DEFAULT_PROVIDER_PRIORITY = ['GOOGLE', 'GROQ', 'OPENROUTER', 'NVIDIA'];


class ModelManager {
  constructor(aiAgentService) {
    this.aiAgentService = aiAgentService;
    this.aiAgentService = aiAgentService;
    // this.stateStore = new StateStore(); // ✅ REMOVED: Unused
    this.stateStore = stateManager; // ✅ LINK: Use Distributed State Manager

    this.exhaustedModelsCache = new Set(); // ذاكرة مؤقتة للنماذج المستنفدة
    this.currentActiveModel = null; // النموذج النشط الحالي للجلسة
    this.quotaCache = new Map(); // Cache للكوتة الإجمالية مع TTL 30 ثانية
    this.aggregatedModelsCache = new Map(); // Cache للنماذج المجمعة
    this.excludedModels = new Map(); // ذاكرة مؤقتة للنماذج المستثناة
    // ✅ PERFORMANCE: إضافة caches لتحسين الأداء
    this.activeModelCache = new Map(); // Cache: companyId → { model, timestamp }
    this.modelsOrderedCache = new Map(); // Cache: companyId → { models, timestamp }
    // ✅ RACE CONDITION FIX: Removed In-Memory Locks (Moved to Redis)
    // this.modelLocks = new Map();

    // ✅ CACHE: Model Limits Cache (DB-backed)
    this.modelLimitsCache = new Map();
    this.limitsLastLoaded = 0;
    this.LIMITS_TTL = 5 * 60 * 1000; // 5 دقائق

    // ✅ CACHE: Global Config Cache
    this.globalConfigCache = null;
    this.globalConfigLastLoaded = 0;
    this.GLOBAL_CONFIG_TTL = 30 * 1000; // REDUCED TO 30s (was 5min)

    // ✅ SYNC: Multi-Process Cache Invalidation
    this.lastConfigVersion = 0;
    this.configVersionLastChecked = 0;
    this.CONFIG_VERSION_CHECK_INTERVAL = 5000; // Check DB every 5s

    // ✅ CACHE: Total Keys Count Cache
    this.totalKeysCountCache = new Map(); // companyId -> { count, timestamp }
    this.TOTAL_KEYS_TTL = 30 * 1000; // 30 ثانية

    // ✅ FIX: تحميل الحدود الأولية عند التشغيل (async)
    this.loadModelLimits().catch(e => console.warn('⚠️ Failed to load initial model limits:', e.message));

    // ✅ FIX: تشغيل دالة المسح التلقائي لـ exhaustedAt كل دقيقة
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      keyUsageCount: new Map(), // keyId → count
      modelUsageCount: new Map(), // modelName → count
      errorCount: new Map(), // errorType → count
      lastResetTime: Date.now()
    };

    // ✅ FIX: تشغيل دالة المسح التلقائي لـ exhaustedAt كل دقيقة
    // هذا يضمن أن النماذج المحظورة ستتعافى تلقائياً بعد 5 دقائق حتى بعد restart
    this.cleanupIntervals = [];

    // 1. تنظيف استنزاف النماذج (exhaustedAt)
    this.cleanupIntervals.push(setInterval(() => {
      this.clearExpiredExhaustedFlags();
    }, 60 * 1000));

    // 2. تنظيف النماذج المستثناة (ExcludedModel) لتجنب تضخم قاعدة البيانات
    this.cleanupIntervals.push(setInterval(() => {
      this.clearExpiredExclusions();
    }, 5 * 60 * 1000)); // كل 5 دقائق

    // ✅ BUFFERED UPDATES: Initialize Buffer and Flush Interval
    this.usageBuffer = new Map(); // modelId -> { used: 0, tpm: 0 }
    this.cleanupIntervals.push(setInterval(() => this.flushUsageBuffer(), 3000)); // Every 3s (Optimized from 10s)
    console.log(`✅ [MODEL-MANAGER] Buffered Usage Updates Enabled (Flush every 3s)`);



    console.log(`✅ [MODEL-MANAGER] Auto-cleanup enabled (${this.cleanupIntervals.length} jobs)`);
  }



  /**
   * ✅ FLUSH BUFFER: Write aggregated usage to DB
   */
  async flushUsageBuffer() {
    if (this.usageBuffer.size === 0) return;

    const bufferSnapshot = new Map(this.usageBuffer);
    this.usageBuffer.clear(); // Clear immediately to start new batch

    console.log(`💾 [USAGE-FLUSH] Flushing usage for ${bufferSnapshot.size} models...`);

    const updates = [];
    for (const [modelId, delta] of bufferSnapshot) {
      if (delta.used === 0 && delta.tpm === 0) continue;

      updates.push(async () => {
        try {
          // Read-Modify-Write inside Transaction for Atomic Safety
          await this.prisma.$transaction(async (tx) => {
            const modelRecord = await tx.aiModelConfig.findUnique({ where: { id: modelId } });
            if (!modelRecord) return;

            let usage;
            try {
              usage = JSON.parse(modelRecord.usage || '{}');
            } catch (e) {
              usage = {}; // Fallback
            }
            const now = new Date();

            // ✅ تم إزالة نظام الكوتة - نحتفظ فقط بالعداد العام للإحصائيات
            usage = usage || {};

            // Update Counters (للإحصائيات فقط - لا تستخدم للكوتة)
            usage.used = (usage.used || 0) + delta.used;

            usage.lastUpdated = now.toISOString();

            // ✅ DISTRIBUTED LOCK: Wrap transaction in Redlock
            const lockKey = `usage:${modelId}`;
            const locked = await this.stateStore.acquireLock(lockKey, 5000);
            if (!locked) {
              throw new Error(`Failed to acquire lock for modelId: ${modelId}`);
            }

            try {
              await tx.aiModelConfig.update({
                where: { id: modelId },
                data: {
                  usage: JSON.stringify(usage),
                  updatedAt: now
                }
              });
            } finally {
              await this.stateStore.releaseLock(lockKey);
            }
          });
        } catch (err) {
          console.error(`❌ [USAGE-FLUSH] Failed for model ${modelId}:`, err.message);
          // Re-buffer the failed delta back into the usageBuffer to avoid losing metrics
          const current = this.usageBuffer.get(modelId) || { used: 0, tpm: 0 };
          this.usageBuffer.set(modelId, {
            used: current.used + (delta.used || 0),
            tpm: current.tpm + (delta.tpm || 0)
          });
        }
      });
    }

    // Execute all updates
    await Promise.all(updates.map(fn => fn()));
    console.log(`✅ [USAGE-FLUSH] Completed flushing ${updates.length} models.`);
  }

  /**
   * ✅ FIX: الحصول على قفل للنموذج (مع انتظار إذا كان محجوز)
   * @param {string} modelName - اسم النموذج
   * @param {string} companyId - معرف الشركة
   * @param {number} timeoutMs - مهلة الانتظار (افتراضي: 5 ثواني)
   * @returns {Promise<boolean>} - true إذا تم الحصول على القفل
   */
  async acquireModelLock(modelName, companyId, timeoutMs = 2000) { // ✅ PERFORMANCE: تقليل timeout من 5000 إلى 2000ms
    const lockKey = `${modelName}_${companyId || 'central'}`;
    // ✅ Phase 3: Distributed State Manager (Redis)
    return await stateManager.acquireLock(lockKey, timeoutMs);
  }

  /**
   * ✅ FIX: تحرير القفل
   * @param {string} modelName - اسم النموذج
   * @param {string} companyId - معرف الشركة
   */
  async releaseModelLock(modelName, companyId) {
    const lockKey = `${modelName}_${companyId || 'central'}`;
    // ✅ Phase 3: Distributed State Manager (Redis)
    await stateManager.releaseLock(lockKey);
  }

  /**
   * ✅ FIX: Always get fresh Prisma client from shared instance
   * يحصل على Prisma client من الـ shared instance دائماً لضمان الاتصال
   */
  get prisma() {
    return getSharedPrismaClient();
  }

  getSimpleDefaultModel(provider) {
    const normalizedProvider = (provider || 'GOOGLE').toUpperCase();
    if (normalizedProvider === 'DEEPSEEK') return 'deepseek-chat';
    if (normalizedProvider === 'OPENAI') return 'gpt-4o-mini';
    if (normalizedProvider === 'OLLAMA') return 'llama3.2';
    if (normalizedProvider === 'GROQ') return 'llama-3.3-70b-versatile';
    if (normalizedProvider === 'OPENROUTER') return 'openrouter/auto';
    if (normalizedProvider === 'NVIDIA') return 'openai/gpt-oss-120b';
    return 'gemini-2.5-flash';
  }

  parseAiKeyUsage(usageValue) {
    if (!usageValue) return {};
    if (typeof usageValue === 'object') return usageValue;
    try {
      const parsed = JSON.parse(usageValue);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  parseGlobalSettings(settingsValue) {
    if (!settingsValue) return {};
    if (typeof settingsValue === 'object') return settingsValue;

    try {
      const parsed = JSON.parse(settingsValue);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  getPreferredAiKeyIds(settingsValue) {
    const settings = this.parseGlobalSettings(settingsValue);
    const preferredAiKeyIds = settings.preferredAiKeyIds;

    if (!preferredAiKeyIds || typeof preferredAiKeyIds !== 'object' || Array.isArray(preferredAiKeyIds)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(preferredAiKeyIds)
        .filter(([provider, keyId]) => typeof provider === 'string' && typeof keyId === 'string' && keyId.trim())
        .map(([provider, keyId]) => [provider.toUpperCase(), keyId.trim()])
    );
  }

  normalizeProviderPriority(rawPriority, options = {}) {
    const preferredProvider = options.preferredProvider
      ? String(options.preferredProvider).trim().toUpperCase()
      : null;
    const includeAllSupported = options.includeAllSupported !== false;
    const requestedPriority = Array.isArray(rawPriority) ? rawPriority : DEFAULT_PROVIDER_PRIORITY;
    const ordered = [];
    const seen = new Set();
    const pushProvider = (provider) => {
      const normalizedProvider = String(provider || '').trim().toUpperCase();
      if (!SUPPORTED_PROVIDER_ORDER.includes(normalizedProvider) || seen.has(normalizedProvider)) {
        return;
      }
      ordered.push(normalizedProvider);
      seen.add(normalizedProvider);
    };

    if (preferredProvider) {
      pushProvider(preferredProvider);
    }

    for (const provider of requestedPriority) {
      pushProvider(provider);
    }

    if (ordered.length === 0) {
      for (const provider of DEFAULT_PROVIDER_PRIORITY) {
        pushProvider(provider);
      }
    }

    if (includeAllSupported) {
      for (const provider of SUPPORTED_PROVIDER_ORDER) {
        pushProvider(provider);
      }
    }

    return ordered;
  }

  resolveProviderPriorityOrder(globalConfig = null, options = {}) {
    const settings = this.parseGlobalSettings(globalConfig?.settings);
    return this.normalizeProviderPriority(settings.providerPriority, {
      preferredProvider: options.preferredProvider,
      includeAllSupported: options.includeAllSupported
    });
  }

  async getProviderPriorityOrder(options = {}) {
    const globalConfig = await this.getGlobalUIConfig();
    const order = this.resolveProviderPriorityOrder(globalConfig, { ...options, includeAllSupported: false });
    return order.slice(0, 1);
  }

  sanitizeAiKeyTestError(error) {
    const rawMessage = error?.details?.error?.message || error?.details?.message || error?.message || 'Unknown provider error';
    return String(rawMessage)
      .replace(/gsk_[A-Za-z0-9_-]+/g, 'gsk_***REDACTED***')
      .replace(/AIza[A-Za-z0-9_-]+/g, 'AIza***REDACTED***')
      .replace(/nvapi-[A-Za-z0-9_-]+/g, 'nvapi-***REDACTED***')
      .replace(/(apiKey\s*:\s*['"]?)[^'",\s}]+/gi, '$1***REDACTED***')
      .replace(/(Authorization["']?\s*:\s*["']?Bearer\s+)[^"',\s}]+/gi, '$1***REDACTED***')
      .slice(0, 500);
  }

  extractProviderText(result) {
    if (!result) return '';
    if (typeof result.text === 'function') return result.text();
    if (typeof result.text === 'string') return result.text;
    if (typeof result.content === 'string') return result.content;

    const firstPart = result.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof firstPart === 'string' ? firstPart : '';
  }

  async withTimeout(promise, timeoutMs, message) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async recordKeyTestResult(key, testResult) {
    if (!key?.id) return;

    const usage = this.parseAiKeyUsage(key.usage);
    const routing = usage.routing && typeof usage.routing === 'object' ? usage.routing : {};

    usage.routing = {
      ...routing,
      lastTestedAt: testResult.testedAt,
      lastTestStatus: testResult.status,
      lastTestProvider: testResult.provider || null,
      lastTestModel: testResult.model || null,
      lastTestLatencyMs: Number(testResult.latencyMs) || null,
      lastTestError: testResult.ok ? null : testResult.error || null,
      testCount: (Number(routing.testCount) || 0) + 1
    };

    try {
      const serializedUsage = JSON.stringify(usage);
      await this.prisma.aiKey.update({
        where: { id: key.id },
        data: { usage: serializedUsage }
      });
      key.usage = serializedUsage;
    } catch (error) {
      console.warn(`⚠️ [SIMPLE-KEY-TEST] Failed to record test result for key ${key.id}:`, error.message);
    }

    await aiProviderLogService.recordProviderEvent({
      provider: testResult.provider || key.provider,
      keyId: key.id,
      keyName: key.name,
      action: 'key_live_test',
      status: testResult.ok ? 'success' : 'failed',
      latencyMs: testResult.latencyMs,
      model: testResult.model || null,
      message: testResult.ok
        ? 'AI key live test returned content'
        : testResult.error || 'AI key live test failed',
      metadata: {
        source: 'model_manager.test_ai_key',
        testedAt: testResult.testedAt,
        keyType: key.keyType || null,
      },
    });
  }

  async testAiKey(keyId, options = {}) {
    const startedAt = Date.now();
    const testedAt = new Date().toISOString();
    const timeoutMs = Number(options.timeoutMs || 20000);

    const key = await this.prisma.aiKey.findUnique({
      where: { id: keyId },
      include: {
        aiModelConfigs: {
          where: { isEnabled: true },
          orderBy: { priority: 'asc' },
          take: 1
        }
      }
    });

    if (!key) {
      return {
        notFound: true,
        ok: false,
        status: 'failed',
        keyId,
        testedAt,
        error: 'AI key not found'
      };
    }

    const provider = (key.provider || 'GOOGLE').toUpperCase();
    const model = key.aiModelConfigs?.[0]?.modelName || this.getSimpleDefaultModel(provider);
    const baseResult = {
      ok: false,
      status: 'failed',
      keyId: key.id,
      keyName: key.name,
      provider,
      model,
      testedAt,
      latencyMs: 0
    };

    if (!key.isActive) {
      const result = {
        ...baseResult,
        latencyMs: Date.now() - startedAt,
        error: 'AI key is inactive'
      };
      await this.recordKeyTestResult(key, result);
      return result;
    }

    try {
      const providerClient = AIProviderFactory.getProvider(provider, key.apiKey, key.baseUrl, key.id);
      const providerResult = await this.withTimeout(
        providerClient.generateResponse('Reply with exactly: KEY_OK', {
          model,
          temperature: 0,
          max_tokens: 16,
          maxOutputTokens: 16,
          timeoutMs
        }),
        timeoutMs + 1000,
        `AI key test timed out after ${timeoutMs}ms`
      );
      const content = this.extractProviderText(providerResult);
      const result = {
        ...baseResult,
        ok: Boolean(content),
        status: Boolean(content) ? 'success' : 'failed',
        latencyMs: Date.now() - startedAt,
        message: Boolean(content) ? 'Key responded successfully' : undefined,
        error: Boolean(content) ? null : 'Provider returned an empty response'
      };

      await this.recordKeyTestResult(key, result);
      return result;
    } catch (error) {
      const result = {
        ...baseResult,
        latencyMs: Date.now() - startedAt,
        error: this.sanitizeAiKeyTestError(error)
      };
      await this.recordKeyTestResult(key, result);
      return result;
    }
  }

  async recordRoutingSelection(selectedKey, context = {}) {
    if (!selectedKey?.id) return;

    const now = new Date();
    const usage = this.parseAiKeyUsage(selectedKey.usage);
    const routing = usage.routing && typeof usage.routing === 'object' ? usage.routing : {};

    usage.routing = {
      ...routing,
      lastSelectedAt: now.toISOString(),
      lastSelectedProvider: selectedKey.provider || null,
      lastSelectedModel: selectedKey.modelName || null,
      lastSelectedPool: context.selectedPool || null,
      lastSelectedCompanyId: context.companyId || null,
      lastSelectedActiveProvider: context.activeProvider || null,
      source: 'getNextKeySimple',
      selectionCount: (Number(routing.selectionCount) || 0) + 1
    };

    try {
      const serializedUsage = JSON.stringify(usage);
      await this.prisma.aiKey.update({
        where: { id: selectedKey.id },
        data: { usage: serializedUsage }
      });
      selectedKey.usage = serializedUsage;
    } catch (error) {
      console.warn(`⚠️ [SIMPLE-KEY] Failed to record routing selection for key ${selectedKey.id}:`, error.message);
    }

    await aiProviderLogService.recordProviderEvent({
      provider: selectedKey.provider,
      keyId: selectedKey.id,
      keyName: selectedKey.name,
      companyId: context.companyId || null,
      action: 'routing_selection',
      status: 'success',
      model: selectedKey.modelName || null,
      message: `Runtime selected ${selectedKey.name || selectedKey.id}`,
      metadata: {
        source: 'model_manager.get_next_key_simple',
        selectedPool: context.selectedPool || null,
        activeProvider: context.activeProvider || null,
        providerBudget: context.budgetStatus
          ? {
            limited: Boolean(context.budgetStatus.limited),
            reason: context.budgetStatus.reason || null,
            limits: context.budgetStatus.limits || {},
          }
          : null,
      },
    });
  }

  async recordRoutingSuccess(keySelection, context = {}) {
    const keyId = keySelection?.id || keySelection?.keyId;
    if (!keyId) return;

    const now = new Date();
    let usage = this.parseAiKeyUsage(keySelection.usage);

    if (!keySelection.usage) {
      try {
        const existingKey = await this.prisma.aiKey.findUnique({
          where: { id: keyId },
          select: { usage: true }
        });
        usage = this.parseAiKeyUsage(existingKey?.usage);
      } catch (error) {
        console.warn(`⚠️ [SIMPLE-KEY] Failed to load usage before recording success for key ${keyId}:`, error.message);
      }
    }

    const routing = usage.routing && typeof usage.routing === 'object' ? usage.routing : {};
    usage.routing = {
      ...routing,
      lastSucceededAt: now.toISOString(),
      lastSucceededProvider: keySelection.provider || routing.lastSelectedProvider || null,
      lastSucceededModel: keySelection.modelName || keySelection.model || context.model || null,
      lastSucceededPool: keySelection.selectedPool || context.selectedPool || null,
      lastSucceededCompanyId: context.companyId || null,
      lastSucceededActiveProvider: keySelection.activeProvider || context.activeProvider || null,
      successSource: 'generateAIResponse',
      successCount: (Number(routing.successCount) || 0) + 1
    };

    try {
      const serializedUsage = JSON.stringify(usage);
      await this.prisma.aiKey.update({
        where: { id: keyId },
        data: { usage: serializedUsage }
      });
      keySelection.usage = serializedUsage;
    } catch (error) {
      console.warn(`⚠️ [SIMPLE-KEY] Failed to record routing success for key ${keyId}:`, error.message);
    }

    const budgetUsage = await providerBudgetLedgerService.recordUsage(keySelection, {
      totalTokens: context.totalTokens || context.usage?.totalTokens || context.tokens || 0,
      reservedTokens: context.reservedTokens || keySelection.budgetReservation?.tokens || 0,
      requestAlreadyRecorded: Boolean(context.requestAlreadyRecorded || keySelection.budgetReservation?.recorded),
    }).catch((error) => {
      console.warn(`⚠️ [PROVIDER-BUDGET] Failed to record usage for key ${keyId}:`, error.message);
      return { recorded: false, reason: 'LEDGER_ERROR' };
    });

    await aiProviderLogService.recordProviderEvent({
      provider: keySelection.provider || routing.lastSelectedProvider || null,
      keyId,
      keyName: keySelection.keyName || keySelection.name || null,
      companyId: context.companyId || null,
      action: 'generation_success',
      status: 'success',
      latencyMs: context.responseTime || context.latencyMs || null,
      model: keySelection.modelName || keySelection.model || context.model || null,
      message: 'Provider generated a successful runtime response',
      metadata: {
        source: 'model_manager.record_routing_success',
        selectedPool: keySelection.selectedPool || context.selectedPool || null,
        activeProvider: keySelection.activeProvider || context.activeProvider || null,
        providerBudget: budgetUsage?.recorded
          ? {
            tokens: budgetUsage.tokens,
            requests: budgetUsage.requests,
            usage: budgetUsage.usage,
          }
          : null,
      },
    });
  }

  /**
   * ✅ SIMPLE: Build model-not-agent-ready response — kept as no-op since rotation removed
   */
  buildModelNotAgentReadyResponse(rejectedKeys = [], options = {}, activeProvider = null) {
    return null;
  }

  /**
   * ✅ FIX 3: إبطال cache الكوتة لنموذج معين
   * @param {string} modelName - اسم النموذج
   * @param {string} companyId - معرف الشركة
   */
  invalidateQuotaCache(modelName, companyId) {
    const cacheKey = `${modelName}_${companyId}`;
    const deleted = this.quotaCache.delete(cacheKey);
    if (deleted) {
      console.log(`🗑️ [CACHE-INVALIDATE] Invalidated quota cache for ${modelName} (company: ${companyId})`);
    }

    // ✅ PERFORMANCE: أيضاً invalidate aggregatedModelsCache لضمان الدقة
    const aggregatedCacheKey = `${modelName}_${companyId}`;
    const aggregatedDeleted = this.aggregatedModelsCache.delete(aggregatedCacheKey);
    if (aggregatedDeleted) {
      console.log(`🗑️ [CACHE-INVALIDATE] Invalidated aggregated models cache for ${modelName} (company: ${companyId})`);
    }

    // ✅ FIX: إبطال activeModelCache أيضاً لضمان اختيار نموذج جديد
    const activeModelDeleted = this.activeModelCache.delete(companyId);
    if (activeModelDeleted) {
      console.log(`🗑️ [CACHE-INVALIDATE] Invalidated active model cache for company: ${companyId}`);
    }
  }

  /**
   * ✅ FIX 3: إبطال جميع caches الكوتة لشركة معينة
   * @param {string} companyId - معرف الشركة
   */
  invalidateAllQuotaCacheForCompany(companyId) {
    let count = 0;
    for (const [key, value] of this.quotaCache.entries()) {
      if (key.endsWith(`_${companyId}`)) {
        this.quotaCache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`🗑️ [CACHE-INVALIDATE] Invalidated ${count} quota caches for company ${companyId}`);
    }
  }

  /**
   * ✅ مسح جميع الـ caches (يُستخدم بعد تغيير إعدادات المفاتيح)
   */
  clearAllCaches() {
    const quotaCount = this.quotaCache.size;
    const aggregatedCount = this.aggregatedModelsCache.size;
    const modelsOrderedCount = this.modelsOrderedCache.size;
    const activeModelCount = this.activeModelCache.size;
    const exhaustedCount = this.exhaustedModelsCache.size;

    this.quotaCache.clear();
    this.aggregatedModelsCache.clear();
    this.modelsOrderedCache.clear();
    this.activeModelCache.clear();
    this.exhaustedModelsCache.clear();

    // ✅ FIX: مسح حالة الـ StateStore (مثل Round-Robin و Exhaustion المؤقت)
    // this.stateStore.clearAll(); // Deprecated in distributed mode (handled by TTL)

    // ✅ FIX: مسح cache الإعدادات العامة (Default Provider)
    this.globalConfigCache = null;
    this.globalConfigLastLoaded = 0;

    console.log(`🧹 [CACHE-CLEAR] تم مسح جميع الـ caches والـ StateStore:`);
    console.log(`   - quotaCache: ${quotaCount} entries`);
    console.log(`   - aggregatedModelsCache: ${aggregatedCount} entries`);
    console.log(`   - modelsOrderedCache: ${modelsOrderedCount} entries`);
    console.log(`   - activeModelCache: ${activeModelCount} entries`);
    console.log(`   - exhaustedModelsCache: ${exhaustedCount} entries`);
    console.log(`   - StateStore: N/A (Redis)`);

    return {
      quotaCache: quotaCount,
      aggregatedModelsCache: aggregatedCount,
      modelsOrderedCache: modelsOrderedCount,
      activeModelCache: activeModelCount,
      exhaustedModelsCache: exhaustedCount,
      stateStore: 'CLEARED (Redis N/A)'
    };
  }



  /**
   * ✅ SIMPLE: Get first active key with first enabled model — no rotation, no fallback
   * @param {string} companyId - معرف الشركة
   * @param {Object} options - خيارات إضافية
   * @returns {Promise<Object|null>}
   */
  async getNextKeySimple(companyId, options = {}) {
    try {
      const preferredModel = typeof options.preferredModel === 'string' && options.preferredModel.trim()
        ? options.preferredModel.trim()
        : null;

      const key = await this.prisma.aiKey.findFirst({
        where: {
          isActive: true,
          keyType: 'CENTRAL',
          companyId: null,
        },
        include: {
          aiModelConfigs: {
            where: {
              isEnabled: true,
              ...(preferredModel ? { modelName: preferredModel } : {}),
            },
            orderBy: { priority: 'asc' },
            take: 1,
          },
        },
        orderBy: { priority: 'asc' },
      });

      if (!key) {
        console.warn('⚠️ [SIMPLE-KEY] No active CENTRAL key found');
        return { error: 'NO_ACTIVE_KEY', message: 'لا يوجد مفتاح نشط' };
      }

      const config = key.aiModelConfigs?.[0];
      const model = config?.modelName || this.getSimpleDefaultModel(key.provider);

      console.log(`✅ [SIMPLE-KEY] Selected: ${key.name} (${key.provider}) - Model: ${model}`);

      return {
        apiKey: key.apiKey,
        model,
        keyId: key.id,
        modelId: config?.id || null,
        keyName: key.name,
        provider: key.provider,
        baseUrl: key.baseUrl,
        keyType: key.keyType,
        selectedPool: 'primary',
        activeProvider: key.provider,
        preferredKeyId: null,
        manualOverride: false,
      };
    } catch (error) {
      console.error('❌ [SIMPLE-KEY] Error getting next key:', error);
      return null;
    }
  }

  /**
   * ✅ Mark key as failed — no-op since auto-rotation is removed
   */
  async markKeyFailed(keyId, reason = 'UNKNOWN', retryAfterMs = null) {
    // No-op: key rotation/cooldown removed
  }

  /**
   * ✅ Get simple rotator status — always empty
   */
  async getSimpleRotatorStatus() {
    return { totalFailed: 0, failures: [] };
  }

  /**
   * ✅ Clear all simple rotator failures — no-op
   */
  async clearSimpleRotatorFailures() {
    // No-op
  }

  /**
   * ✅ الحصول على قائمة النماذج المعطلة (غير متوفرة في v1beta API)
   * تم الاختبار الفعلي للتأكد من النماذج التي لا تعمل
   */
  getDisabledModels() {
    return Array.from(new Set([
      // ✅ فقط النماذج المستخدمة فعلياً
      // باقي النماذج معطلة أو مخفية

      // نماذج مدفوعة أو تجريبية (غير مستخدمة)
      'gemini-2.0-flash-exp',

      // نماذج تم إيقافها (Deprecated/Retired)
      'gemini-1.0-pro',
      'gemini-pro',
      'gemini-flash', // Legacy mapping

      // نماذج قديمة أخرى
      'gemini-1.0-pro-001',
      'gemini-1.0-pro-latest',
      'gemini-1.0-pro-vision-latest',
      'gemini-pro-vision',

      // نماذج Live/Audio (غير مستخدمة في الشات النصي)
      'gemini-2.5-flash-live',
      'gemini-2.0-flash-live',
      'gemini-2.5-flash-native-audio-dialog',
      'gemini-2.5-flash-tts',

      // Gemma
      'gemma-3-27b',
      'gemma-3-12b',
      'gemma-3-4b',
      'gemma-3-2b',
      'gemma-3-1b',
      'gemma-2-27b-it',
      'gemma-2-9b-it',

      // Production policy: never select retired Gemini models or hot-swapped
      // latest aliases from DB/env for customer conversations.
      ...RETIRED_GEMINI_MODEL_NAMES,
      ...UNSTABLE_GEMINI_MODEL_ALIAS_NAMES
    ]));
  }

  /**
   * ✅ الحصول على قائمة النماذج المتوفرة في v1beta API
   * بناءً على النماذج المستخدمة فعلياً في Google AI Studio
   * فقط النماذج التي تظهر في الصورة مفعلة
   * @deprecated استخدم getModelsOrderedByPriority بدلاً من ذلك للحصول على الترتيب من قاعدة البيانات
   */
  getSupportedModels() {
    return [
      // ✅ Gemini 3.0 Series (Preview - Latest as of Jan 2026)
      // Source: https://ai.google.dev/gemini-api/docs/models/gemini
      'gemini-3-pro-preview',              // Most powerful multimodal model
      'gemini-3-pro-image-preview',        // Gemini 3 image generation
      'gemini-3-flash-preview',            // Balanced speed & intelligence

      // ✅ Gemma 4 on Gemini API
      'gemma-4-31b-it',
      'gemma-4-26b-a4b-it',

      // ✅ Gemini 2.5 Series (Stable)
      'gemini-2.5-pro',                    // Stable high-end
      'gemini-2.5-flash',                  // Best price-performance
      'gemini-2.5-flash-lite',             // Ultra fast & cheap
      'gemini-2.5-flash-preview-09-2025',
      'gemini-2.5-flash-lite-preview-09-2025',
      'gemini-2.5-flash-image',

      // ✅ Gemini 2.0 Series (Stable)
      'gemini-2.0-flash',                  // Stable Workhorse (High usage)
      'gemini-2.0-flash-lite',             // Fast & Cheap
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite-001'
    ].filter((modelName) => !isProductionUnsafeGeminiModelName(modelName));
  }

  /**
 * ✅ الحصول على الإعدادات العامة للـ AI (Super Admin)
 */
  /**
   * ✅ SYNC: Check if configuration changed in DB (Multi-Process Support)
   * This allows one process to signal others to clear their cache
   */
  async checkConfigVersion() {
    const now = Date.now();
    if (now - this.configVersionLastChecked < this.CONFIG_VERSION_CHECK_INTERVAL) {
      return;
    }

    try {
      const config = await this.prisma.globalAiConfig.findFirst({
        select: { updatedAt: true }
      });

      if (config && config.updatedAt) {
        const currentVersion = new Date(config.updatedAt).getTime();
        // If verify found newer version than local, and local isn't just initialized (0)
        // Actually, even if 0, we set it. But if > last, we clear.
        if (this.lastConfigVersion > 0 && currentVersion > this.lastConfigVersion) {
          console.log(`♻️ [CACHE-SYNC] Config updated at ${config.updatedAt}. Clearing all caches...`);
          this.clearAllCaches();
        }
        this.lastConfigVersion = currentVersion;
      }
      this.configVersionLastChecked = now;
    } catch (e) {
      // Ignore DB errors in sync check to avoid blocking
      // console.warn('⚠️ [CACHE-SYNC] Failed to check config version:', e.message);
    }
  }

  async getGlobalUIConfig() {
    const now = Date.now();
    if (this.globalConfigCache && (now - this.globalConfigLastLoaded) < this.GLOBAL_CONFIG_TTL) {
      return this.globalConfigCache;
    }

    try {
      const config = await this.prisma.globalAiConfig.findFirst({
        where: { isActive: true }
      });
      this.globalConfigCache = config;
      this.globalConfigLastLoaded = now;
      return config;
    } catch (error) {
      console.error('❌ [MODEL-MANAGER] Error fetching GlobalAIConfig:', error.message);
      return null;
    }
  }

  /**
   * ✅ الحصول على المزود المفضل للنظام
   */
  async getPreferredProvider() {
    const config = await this.getGlobalUIConfig();
    return config?.defaultProvider || 'GOOGLE';
  }

  /**
   * ✅ الحصول على قائمة النماذج مرتبة حسب الأولوية من قاعدة البيانات
   * يقرأ الأولوية من جدول aIKeyModel ويرتب النماذج حسبها
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<string[]>} - قائمة أسماء النماذج مرتبة حسب الأولوية
   */
  /**
   * ✅ PERFORMANCE: إضافة Cache لتحسين الأداء
   * Cache TTL: 60 ثانية (قائمة النماذج لا تتغير كثيراً)
   */
  async getModelsOrderedByPriority(companyId, options = {}) {
    try {
      // ✅ SYNC: Check for global updates (Multi-Process Invalidation)
      await this.checkConfigVersion();

      // ✅ PERFORMANCE: فحص cache أولاً (TTL: 30 ثانية)
      const cacheKey = `${companyId}_${options.preferredProvider || 'default'}`;
      const cached = this.modelsOrderedCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < 30000) {
        console.log(`✅ [MODELS-ORDERED-CACHE] استخدام Cache للنماذج المرتبة (${companyId}) - ${cached.models.length} نموذج`);
        return cached.models;
      }

      // قائمة النماذج المعطلة
      const disabledModels = this.getDisabledModels();

      // ✅ الحصول على الإعدادات العامة (أو استخدام التفضيل الممرر)
      const globalConfig = await this.getGlobalUIConfig();
      const preferredProvider = options.preferredProvider || globalConfig?.defaultProvider || 'GOOGLE';

      console.log(`🎯 [DB-PRIORITY] المزود: ${preferredProvider} (no failover)`);

      // الحصول على النماذج من قاعدة البيانات - فقط للمزود المحدد
      const modelsFromDB = await this.prisma.aiModelConfig.findMany({
        where: {
          isEnabled: true,
          key: {
            isActive: true,
            provider: preferredProvider,
            OR: [
              { companyId: companyId },
              { keyType: 'CENTRAL' }
            ]
          }
        },
        select: {
          modelName: true,
          priority: true,
          key: {
            select: {
              provider: true
            }
          }
        }
      });

      // الترتيب حسب الأولوية
      const sortedRecords = modelsFromDB
        .map(record => ({ ...record, finalScore: record.priority }))
        .sort((a, b) => a.finalScore - b.finalScore);

      // إزالة التكرارات والحصول على قائمة فريدة مرتبة
      const uniqueModels = [];
      const seenModels = new Set();

      for (const record of sortedRecords) {
        if (disabledModels.includes(record.modelName) || isProductionUnsafeGeminiModelName(record.modelName)) {
          continue;
        }
        if (seenModels.has(record.modelName)) {
          continue;
        }
        seenModels.add(record.modelName);
        uniqueModels.push(record.modelName);
      }

      console.log(`📊 [DB-PRIORITY] تم تحميل ${uniqueModels.length} نموذج من ${preferredProvider} (no failover)`);

      // ✅ PERFORMANCE: حفظ في cache
      this.modelsOrderedCache.set(cacheKey, {
        models: uniqueModels,
        timestamp: now
      });

      // إذا لم توجد نماذج في قاعدة البيانات، استخدم القائمة الافتراضية
      if (uniqueModels.length === 0) {
        console.log(`⚠️ [DB-PRIORITY] لا توجد نماذج في قاعدة البيانات، استخدام القائمة الافتراضية`);
        const defaultModels = this.getSupportedModels();
        this.modelsOrderedCache.set(cacheKey, {
          models: defaultModels,
          timestamp: now
        });
        return defaultModels;
      }

      return uniqueModels;

    } catch (error) {
      console.error('❌ [DB-PRIORITY] خطأ في قراءة أولويات النماذج من قاعدة البيانات:', error);
      return this.getSupportedModels();
    }
  }

  /**
   * ✅ LOAD LIMITS: تحميل حدود النماذج من قاعدة البيانات وتخزينها في الذاكرة
   */
  async loadModelLimits(forceRefresh = false) {
    try {
      const now = Date.now();
      if (!forceRefresh && this.modelLimitsCache.size > 0 && (now - this.limitsLastLoaded < this.LIMITS_TTL)) {
        return;
      }

      console.log('📥 [MODEL-LIMITS] Loading limits from database...');

      const limits = await this.prisma.aiModelLimit.findMany({
        where: { isDeprecated: false }
      });

      if (limits.length === 0) {
        console.warn('⚠️ [MODEL-LIMITS] No limits found in DB! Using defaults.');
        return;
      }

      // Clear old cache
      this.modelLimitsCache.clear();

      for (const limit of limits) {
        this.modelLimitsCache.set(limit.modelName, {
          limit: 2000000, // Hardcoded global safety limit for now, or add to DB schema if needed
          rpm: limit.rpm,
          rph: limit.rph,
          rpd: limit.rpd,
          tpm: limit.tpm,
          maxTokens: limit.maxTokens
        });
      }

      this.limitsLastLoaded = now;
      console.log(`✅ [MODEL-LIMITS] Loaded ${this.modelLimitsCache.size} model limits (Next refresh in ${this.LIMITS_TTL / 1000}s)`);

    } catch (error) {
      console.error('❌ [MODEL-LIMITS] Error loading limits:', error);
    }
  }

  /**
   * الحصول على القيم الافتراضية الصحيحة للنموذج
   */
  /**
   * الحصول على القيم الافتراضية الصحيحة للنموذج
   * ✅ يستخدم الآن MODEL_LIMITS_CONFIG المركزي
   */
  getModelDefaults(modelName) {
    // 1. Try DB Cache first
    if (this.modelLimitsCache.has(modelName)) {
      return this.modelLimitsCache.get(modelName);
    }

    // 2. Try Defaults Fallback
    if (MODEL_LIMITS_CONFIG[modelName]) {
      return MODEL_LIMITS_CONFIG[modelName];
    }

    // 3. Last Resort
    return MODEL_LIMITS_CONFIG['defaults'] || { limit: 250000, rpm: 10, rph: 600, rpd: 250, tpm: 250000 };
  }


  /**
   * الحصول على مفتاح Gemini نشط للشركة
   * ✅ نقل من aiAgentService.js
   * @param {string} companyId - معرف الشركة
   * @returns {Promise<Object|null>} - المفتاح النشط أو null
   */
  async getActiveAIKey(companyId) {
    try {
      if (!companyId) {
        console.error('❌ [SECURITY] لم يتم تمرير companyId - رفض الطلب للأمان');
        return null;
      }

      return await this.findActiveCentralKey();

    } catch (error) {
      console.error('❌ [MODEL-MANAGER] Error getting active Gemini key:', error);
      return null;
    }
  }

  /**
   * Get active Gemini API key using new multi-key system with company isolation
   * ✅ نقل من aiAgentService.js
   * ✅ تحديث لاستخدام النظام الجديد (Quota Aggregation + Round-Robin) مع fallback للنظام القديم
   */
  // ✅ FIX: Legacy alias for backward compatibility (Renamed in Refactor)
  async getActiveGeminiKeyWithModel(companyId, predictedTokens = 0) {
    // Use the main function (defined later in this file)
    return this.getActiveAIKeyWithModel(companyId, predictedTokens);
  }

  async getActiveAIKeyWithModel(companyId, predictedTokens = 0) {
    try {
      // ⚠️ IMPORTANT: لا نستدعي this.aiAgentService.getActiveaIKey هنا لتجنب حلقة لا نهائية
      // بدلاً من ذلك، نستخدم الكود مباشرة من aiAgentService.js

      if (!companyId) {
        console.error('❌ [MODEL-MANAGER] لم يتم تمرير companyId - رفض الطلب للأمان');
        return null;
      }

      // ✅ استخدام Reactive Round-Robin مباشرة (بدون نظام الكوتة)
      try {
        const result = await this.getNextKeySimple(companyId);

        if (result && result.error) {
          console.error(`❌ [MODEL-MANAGER] ${result.message || result.arabicMessage}`);
          return result;
        }

        if (result) {
          console.log(`✅ [MODEL-MANAGER] استخدام Reactive Round-Robin - النموذج: ${result.model} (Key: ${result.keyName})`);
          return result;
        }
      } catch (error) {
        console.warn(`⚠️ [MODEL-MANAGER] خطأ في Reactive Round-Robin:`, error.message);
      }

      // 2. Fallback: استخدام المفاتيح المركزية
      console.log('🔄 [MODEL-MANAGER] استخدام المفاتيح المركزية كـ fallback...');

      const centralKey = await this.findActiveCentralKey();
      if (centralKey) {
        const bestModel = await this.findBestAvailableModelInActiveKey(centralKey.id);
        if (bestModel) {
          return {
            apiKey: centralKey.apiKey,
            model: bestModel.modelName,
            keyId: centralKey.id,
            modelId: bestModel.id,
            keyType: 'CENTRAL'
          };
        }
      }

      console.warn(`⚠️ [MODEL-MANAGER] No central model available for ${companyId}`);
      return null;

    } catch (error) {
      console.error('❌ خطأ في الحصول على مفتاح Gemini:', error);
      return {
        error: 'ERROR',
        message: error.message || 'Unknown error',
        arabicMessage: 'حدث خطأ في الحصول على المفتاح. يرجى المحاولة لاحقاً.',
        companyId: companyId
      };
    }
  }

  /**
   * البحث عن أفضل نموذج متاح في المفتاح النشط
   * ✅ نقل من aiAgentService.js
   * ✅ FIX: تخطي النماذج غير المتوفرة في v1beta API
   */
  async findBestAvailableModelInActiveKey(keyId, forceRefresh = false) {
    try {
      // ⚠️ قائمة النماذج المعطلة مؤقتاً (غير متوفرة في v1beta API)
      // ✅ تم الاختبار الفعلي للتأكد من النماذج التي لا تعمل
      const disabledModels = this.getDisabledModels();

      // ✅ قائمة النماذج المتوفرة في v1beta API (تم الاختبار الفعلي)
      const supportedModels = this.getSupportedModels();

      const availableModels = await this.prisma.aiModelConfig.findMany({
        where: {
          keyId: keyId,
          isEnabled: true
        },
        orderBy: {
          priority: 'asc'
        }
      });

      console.log(`📋 [MODEL-MANAGER] فحص ${availableModels.length} نموذج (مرتبة حسب الأولوية)`);

      for (const modelRecord of availableModels) {
        // 1. تخطي النماذج المعطلة برمجياً
        if (disabledModels.includes(modelRecord.modelName) || isProductionUnsafeGeminiModelName(modelRecord.modelName)) continue;

        // 2. تخطي النماذج غير المدعومة في API
        if (!supportedModels.includes(modelRecord.modelName)) continue;

        // 3. ✅ الفحص السريع: هل النموذج في حالة "تبريد" (Cooldown)؟
        // هذا هو جوهر Circuit Breaker: نتحقق من الذاكرة فقط
        const isExhausted = await this.stateStore.isModelExhaustedInKey(keyId, modelRecord.modelName);

        if (isExhausted) {
          const retryAt = await this.stateStore.getRetryAt(keyId, modelRecord.modelName);
          const timeLeft = retryAt ? Math.round((retryAt - new Date()) / 1000) : '?';
          console.log(`🔌 [CIRCUIT-BREAKER] تخطي النموذج ${modelRecord.modelName} - في فترة التبريد (باقي ${timeLeft} ثانية)`);
          continue;
        }

        // 4. ✅ الموديل سليم! (Open Circuit)
        // لا نقرأ JSON ولا نحسب Tokens. نفترض أنه سليم حتى يثبت العكس (429 Error)
        console.log(`✅ [CIRCUIT-BREAKER] تم اختيار النموذج: ${modelRecord.modelName} (Priority: ${modelRecord.priority})`);
        return modelRecord;
      }

      console.log(`❌ [CIRCUIT-BREAKER] جميع النماذج في فترة التبريد أو غير متاحة للمفتاح: ${keyId}`);
      return null;
    } catch (error) {
      console.error('❌ خطأ في البحث عن نموذج متاح:', error);
      return null;
    }
  }

  /**
   * ✅ SMART CACHE UPDATE: إزالة مفتاح من الكاش دون حذفه بالكامل
   * هذا يمنع إعادة تحميل البيانات من قاعدة البيانات عند فشل مفتاح واحد
   */
  _smartRemoveKeyFromCache(modelName, keyId, companyId) {
    if (companyId) {
      const cacheKey = `${modelName}_${companyId}`;
      const cached = this.quotaCache.get(cacheKey);
      if (cached && cached.quota && cached.quota.availableModels) {
        const originalLength = cached.quota.availableModels.length;
        cached.quota.availableModels = cached.quota.availableModels.filter(m => m.keyId !== keyId);

        if (cached.quota.availableModels.length !== originalLength) {
          this.quotaCache.set(cacheKey, cached);
          console.log(`🧠 [SMART-CACHE] Removed key ${keyId} from cache ${cacheKey} (${cached.quota.availableModels.length} keys left)`);
        }
      }
    } else {
      // Global update (for Central Keys)
      let updateCount = 0;
      for (const [cacheKey, cached] of this.quotaCache.entries()) {
        if (cacheKey.startsWith(`${modelName}_`)) {
          if (cached && cached.quota && cached.quota.availableModels) {
            const originalLength = cached.quota.availableModels.length;
            cached.quota.availableModels = cached.quota.availableModels.filter(m => m.keyId !== keyId);

            if (cached.quota.availableModels.length !== originalLength) {
              this.quotaCache.set(cacheKey, cached);
              updateCount++;
            }
          }
        }
      }
      if (updateCount > 0) {
        console.log(`🧠 [SMART-CACHE] Removed key ${keyId} from ${updateCount} caches (Global/Central)`);
      }
    }
  }

  /**
   * تحديد نموذج كمستنفد بناءً على خطأ 429
   * ✅ نقل من aiAgentService.js
   * ✅ ENHANCED: يستخرج نوع الكوتة ويحسب وقت الانتظار الذكي
   * @param {string} modelName - اسم النموذج
   * @param {string} quotaValue - قيمة الكوتة (اختياري)
   * @param {string} companyId - معرف الشركة (اختياري)
   * @param {string} modelId - معرف النموذج في قاعدة البيانات
   * @param {string} errorMessage - رسالة الخطأ الكاملة (لاستخراج نوع الكوتة)
   * @param {number} retryAfterMs - وقت الانتظار بالميلي ثانية (اختياري، يتم استخراجه من responseGenerator)
   */
  /**
   * ❌ DEPRECATED: key rotation removed
   */
  async markModelAsExhaustedFrom429(modelName, quotaValue, companyId = null, modelId = null, errorMessage = '', retryAfterMs = null) {
    // No-op: key rotation/cooldown removed
  }

  /**
   * تحديد نموذج كمستنفد (تجاوز الحد)
   * ✅ نقل من aiAgentService.js
   */
  async markModelAsExhausted(modelId) {
    try {
      const modelRecord = await this.prisma.aiModelConfig.findMany({
        where: {
          id: modelId
        },
        include: {
          key: true
        }
      });

      if (modelRecord) {
        const usage = JSON.parse(modelRecord.usage);
        const exhaustedUsage = {
          ...usage,
          used: usage.limit || 125000,
          lastReset: new Date().toISOString(),
          exhaustedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        try {
          await this.prisma.aiModelConfig.update({
            where: {
              id: modelId
            },
            data: {
              usage: JSON.stringify(exhaustedUsage),
              updatedAt: new Date()
            }
          });
        } catch (updateError) {
          if (isPermissionError(updateError)) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [DB-PERMISSION] Cannot mark model as exhausted: ${getPermissionErrorMessage(updateError)}`);
            }
          } else {
            throw updateError;
          }
        }

        console.log(`⚠️ [QUOTA-EXHAUSTED] Updated model ${modelRecord.modelName} in key ${modelRecord.key.name}`);
      }
    } catch (error) {
      console.error('❌ خطأ في تحديد النموذج كمستنفد:', error);
    }
  }
  /**
   * ✅ تعطيل نموذج بشكل دائم (للأخطاء القاتلة مثل 404 Not Found)
   */
  async disableModel(modelId, reason = 'UNKNOWN_ERROR') {
    try {
      console.warn(`🛑 [DISABLE-MODEL] Disabling model ${modelId} permanently. Reason: ${reason}`);
      await this.prisma.aiModelConfig.update({
        where: { id: modelId },
        data: {
          isEnabled: false,
          usage: JSON.stringify({ error: reason, disabledAt: new Date().toISOString() })
        }
      });
      // Clear cache to stop serving this model immediately
      this.clearAllCaches();
      return true;
    } catch (e) {
      console.error(`❌ [DISABLE-MODEL] Failed to disable model: ${e.message}`);
      return false;
    }
  }

  /**
   * ✅ تعطيل مفتاح بالكامل (للأخطاء القاتلة مثل 403 Permission Denied / API Key Invalid / Leaked Key)
   */
  async invalidateKey(keyId, reason = 'INVALID_KEY') {
    try {
      // ✅ تحسين رسالة الخطأ بناءً على السبب
      let description = `Automatically disabled: ${reason}`;
      if (reason === 'LEAKED_KEY') {
        description = 'تم تعطيل المفتاح تلقائياً: تم الإبلاغ عن المفتاح كمسرب. يرجى استخدام مفتاح جديد من Google AI Studio';
      } else if (reason === '403_PERMISSION_DENIED') {
        description = 'تم تعطيل المفتاح تلقائياً: المفتاح غير صالح أو تم رفض الوصول (403)';
      } else if (reason === 'INVALID_KEY') {
        description = 'تم تعطيل المفتاح تلقائياً: المفتاح غير صالح';
      }

      console.warn(`🛑 [INVALIDATE-KEY] Invalidating KEY ${keyId} permanently. Reason: ${reason}`);

      let updated = false;

      // 1. Try AIKey (New System)
      try {
        await this.prisma.aiKey.update({
          where: { id: keyId },
          data: {
            isActive: false,
            description: description
          }
        });
        updated = true;
      } catch (e) {
        // Ignore "Record to update not found"
      }

      if (updated) {
        this.clearAllCaches();
        return true;
      } else {
        console.warn(`⚠️ [INVALIDATE-KEY] Key ${keyId} not found in AIKey table.`);
        return false;
      }

    } catch (e) {
      console.error(`❌ [INVALIDATE-KEY] Failed to invalidate key: ${e.message}`);
      return false;
    }
  }

  /**
   * ✅ مسح جميع الـ caches (يُستخدم عند تعطيل مفتاح أو تحديث الإعدادات)
   */
  clearAllCaches() {
    try {
      this.activeModelCache.clear();
      this.aggregatedModelsCache.clear();
      this.modelsOrderedCache.clear();
      this.totalKeysCountCache.clear();
      this.quotaCache.clear();
      this.modelLimitsCache.clear();
      this.globalConfigCache = null;
      console.log('🧹 [CACHE] All caches cleared manually.');
    } catch (e) {
      console.error('❌ [CACHE] Failed to clear caches:', e);
    }
  }


  /**
   * ✅ تحديث عداد الاستخدام لنموذج معين
   * يزيد RPM, RPH, RPD, TPM بعد كل request ناجح
   * ✅ RACE CONDITION FIX: يستخدم Lock لمنع تحديث متعدد متزامن
   * @param {string} modelId - معرف النموذج
   * @param {number} tokenCount - عدد التوكنز المستخدمة (اختياري)
   */
  /**
   * ✅ تحديث عداد الاستخدام لنموذج معين
   * يزيد RPM, RPH, RPD, TPM بعد كل request ناجح
   * ✅ RACE CONDITION FIX: استخدام Transcation + Optimistic Locking
   * @param {string} modelId - معرف النموذج
   * @param {number} tokenCount - عدد التوكنز المستخدمة (اختياري)
   */
  async updateModelUsage(modelId, tokenCount = 0) {
    if (!modelId) return false;

    // ✅ BUFFERED UPDATE: Write to memory only
    const current = this.usageBuffer.get(modelId) || { used: 0, tpm: 0 };
    this.usageBuffer.set(modelId, {
      used: current.used + 1,
      tpm: current.tpm + tokenCount
    });

    // console.log(`In-memory Buffer updated for ${modelId}: +1 request`);
    return true;
  }

  /**
   * ✅ الحصول على النموذج النشط الحالي للشركة
   * يستخدم Reactive Round-Robin فقط (بدون نظام الكوتة، بدون Failover)
   * @param {string} companyId - معرف الشركة
   */
  async getCurrentActiveModel(companyId, predictedTokens = 0, options = {}) {
    try {
      // ✅ استخدام Reactive Round-Robin مباشرة (بدون Failover)
      const systemResult = await this.getNextKeySimple(companyId, options);

      if (systemResult && !systemResult.error) {
        return systemResult;
      }

      // إذا فشل، أرجع الخطأ مباشرة - لا يوجد Failover
      if (systemResult) {
        return systemResult;
      }

      return { error: 'NO_MODEL_AVAILABLE', arabicMessage: 'عذراً، لا يوجد نموذج متاح حالياً.' };
    } catch (error) {
      console.error('❌ [MODEL-MANAGER] Error in getCurrentActiveModel:', error);
      return { error: 'INTERNAL_ERROR', arabicMessage: 'خطأ داخلي في اختيار النموذج' };
    }
  }

  /**
   * ✅ الحصول على إجمالي عدد المفاتيح المتاحة للشركة (الخاصة + المركزية)
   * @param {string} companyId - معرف الشركة
   */
  async getTotalKeysCount(companyId) {
    const now = Date.now();
    const cached = this.totalKeysCountCache.get(companyId);

    if (cached && (now - cached.timestamp) < this.TOTAL_KEYS_TTL) {
      return cached.count;
    }

    try {
      const count = await this.prisma.aiKey.count({
        where: {
          isActive: true,
          OR: [
            { companyId: companyId },
            { keyType: 'CENTRAL' }
          ]
        }
      });

      this.totalKeysCountCache.set(companyId, {
        count: count,
        timestamp: now
      });

      return count;
    } catch (error) {
      console.error('❌ [MODEL-MANAGER] Error counting keys:', error);
      return 3; // Fallback
    }
  }

  /**
   * ✅ البحث عن مفتاح مركزي نشط
   * يبحث عن مفتاح من نوع CENTRAL نشط ومتاح
   */
  async findActiveCentralKey() {
    try {
      const key = await this.prisma.aiKey.findFirst({
        where: { isActive: true, keyType: 'CENTRAL', companyId: null },
        orderBy: { priority: 'asc' },
      });

      if (!key) {
        console.log('⚠️ [CENTRAL-KEY] لا توجد مفاتيح مركزية نشطة');
        return null;
      }

      console.log(`🏆 [CENTRAL-KEY] اختيار المفتاح: ${key.name}`);
      return key;
    } catch (error) {
      console.error('❌ [CENTRAL-KEY] خطأ في البحث عن مفتاح مركزي:', error);
      return null;
    }
  }

  /**
   * ✅ البحث عن أول مفتاح متاح وتفعيله تلقائياً
   * @param {string} companyId - معرف الشركة
   */
  /**
   * ✅ دالة موحدة لاختيار النموذج - الآن تستخدم Reactive Round-Robin فقط
   * @param {string} companyId - معرف الشركة
   * @param {number} predictedTokens - عدد التوكنز التقديري (غير مستخدم - للتوافق فقط)
   * @param {string} strategy - غير مستخدم (للتوافق فقط)
   * @param {Object} options - خيارات إضافية
   */
  async findBestModel(companyId, predictedTokens = 500, strategy = null, options = {}) {
    try {
      // ✅ استخدام Reactive Round-Robin فقط (بدون نظام الكوتة)
      console.log(`🔄 [ROUND-ROBIN] استخدام Reactive Round-Robin لاختيار المفتاح`);
      return await this.getNextKeySimple(companyId, options);
    } catch (error) {
      console.error('❌ [ROUND-ROBIN] خطأ في اختيار النموذج:', error);
      // Fallback to simple rotator
      return await this.getNextKeySimple(companyId, options);
    }
  }

  /**
   * ❌ DEPRECATED: تم استبداله بـ Reactive Round-Robin
   * النظام القديم (MODEL_FIRST): Quota Aggregation + Round-Robin
   * @param {string} companyId - معرف الشركة
   * @param {number} predictedTokens - عدد التوكنز التقديري
   */
  async findBestModelByPriorityWithQuota(companyId, predictedTokens = 0, options = {}) {
    // ✅ تم استبداله بـ Reactive Round-Robin
    console.warn('⚠️ [DEPRECATED] findBestModelByPriorityWithQuota is deprecated - using Reactive Round-Robin instead');
    return await this.getNextKeySimple(companyId, options);
  }

  /**
   * ✅ KEY-FIRST STRATEGY — removed, uses getNextKeySimple instead
   */
  async findBestKeyFirst(companyId, predictedTokens = 500, options = {}) {
    return this.getNextKeySimple(companyId, options);
  }

  /**
   * ✅ حساب الكوتة الإجمالية لنموذج معين عبر جميع المفاتيح
   * @param {string} modelName - اسم النموذج
   * @param {string} companyId - معرف الشركة
   * @param {number} predictedTokens - عدد التوكنز التقديري (للتنبؤ بالاستنفاذ)
   */
  /**
   * ❌ DEPRECATED: تم استبداله بـ Reactive Round-Robin
   * لا يتم استخدام حساب الكوتة بعد الآن
   */
  async calculateTotalQuota(modelName, companyId, predictedTokens = 0, options = {}) {
    // ✅ تم استبداله بـ Reactive Round-Robin - إرجاع null للإشارة إلى عدم استخدام الكوتة
    console.warn('⚠️ [DEPRECATED] calculateTotalQuota is deprecated - Reactive Round-Robin does not use quota calculations');
    return null;
  }

  /**
   * ❌ DEPRECATED: Legacy implementation (kept for reference only - used by admin monitoring)
   * This code is no longer used for key selection - replaced by Reactive Round-Robin
   */
  async _calculateTotalQuota_LEGACY(modelName, companyId, predictedTokens = 0, options = {}) {
    try {
      // ✅ PERFORMANCE: فحص cache أولاً (TTL: 10 ثواني - لضمان تحديث سريع)
      const cacheKey = `${modelName}_${companyId}`;
      const cached = this.quotaCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < 10000) {
        console.log(`✅ [QUOTA-CACHE] استخدام Cache للكوتة: ${modelName} (${companyId})`);
        return cached.quota;
      }

      const preferredProvider = options.preferredProvider;

      // ✅ OPTIMIZED QUERY: استعلام محسن مع تجميع البيانات المطلوبة فقط
      const models = await this.prisma.aiModelConfig.findMany({
        where: {
          modelName: modelName,
          isEnabled: true,
          key: {
            isActive: true,
            provider: preferredProvider || undefined,
            OR: [
              { companyId: companyId },
              { keyType: 'CENTRAL' }
            ]
          }
        },
        include: {
          key: {
            select: {
              id: true,
              name: true,
              apiKey: true,
              keyType: true,
              companyId: true,
              companyId: true,
              priority: true,
              provider: true, // ✅ FIX: Select Provider
              baseUrl: true   // ✅ FIX: Select Base URL
            }
          }
        },
        orderBy: {
          priority: 'asc'
        }
      });

      // ✅ BATCH EXCLUSIONS: جلب جميع الاستثناءات دفعة واحدة بدلاً من استعلام منفصل لكل مفتاح
      const keyIds = models.map(m => m.keyId);
      const exclusions = keyIds.length > 0 ? await this.prisma.excludedModel.findMany({
        where: {
          modelName: modelName,
          keyId: { in: keyIds },
          retryAt: { gt: new Date() }
        },
        select: {
          keyId: true,
          retryAt: true,
          reason: true
        }
      }) : [];

      // إنشاء خريطة للاستثناءات للوصول السريع
      const exclusionMap = new Map();
      exclusions.forEach(exc => exclusionMap.set(exc.keyId, exc));

      if (models.length === 0) {
        return null;
      }

      let totalRPM = 0;
      let totalRPMUsed = 0;
      let totalTPM = 0;
      let totalTPMUsed = 0;
      let totalRPD = 0;
      let totalRPDUsed = 0;
      const availableModels = [];

      for (const record of models) {
        let usage;
        try {
          usage = JSON.parse(record.usage || '{}');
        } catch (e) {
          const modelDefaults = this.getModelDefaults(modelName);
          usage = {
            rpm: { used: 0, limit: modelDefaults.rpm },
            rph: { used: 0, limit: modelDefaults.rph },
            rpd: { used: 0, limit: modelDefaults.rpd },
            tpm: { used: 0, limit: modelDefaults.tpm || 125000 }
          };
        }

        // ✅ إعادة تعيين النوافذ المنتهية قبل حساب الكوتة
        const now = new Date();
        const rpmWindowMs = 60 * 1000; // 1 دقيقة
        const rphWindowMs = 60 * 60 * 1000; // 1 ساعة
        const rpdWindowMs = 24 * 60 * 60 * 1000; // 1 يوم

        // إعادة تعيين RPM إذا انتهت النافذة
        if (usage.rpm?.windowStart) {
          const rpmWindowStart = new Date(usage.rpm.windowStart);
          if ((now - rpmWindowStart) >= rpmWindowMs) {
            usage.rpm.used = 0;
            usage.rpm.windowStart = null;
          }
        }

        // إعادة تعيين RPH إذا انتهت النافذة
        if (usage.rph?.windowStart) {
          const rphWindowStart = new Date(usage.rph.windowStart);
          if ((now - rphWindowStart) >= rphWindowMs) {
            usage.rph.used = 0;
            usage.rph.windowStart = null;
          }
        }

        // إعادة تعيين RPD إذا انتهت النافذة
        if (usage.rpd?.windowStart) {
          const rpdWindowStart = new Date(usage.rpd.windowStart);
          if ((now - rpdWindowStart) >= rpdWindowMs) {
            usage.rpd.used = 0;
            usage.rpd.windowStart = null;
          }
        }

        // إعادة تعيين TPM إذا انتهت النافذة
        if (usage.tpm?.windowStart) {
          const tpmWindowStart = new Date(usage.tpm.windowStart);
          if ((now - tpmWindowStart) >= rpmWindowMs) {
            usage.tpm.used = 0;
            usage.tpm.windowStart = null;
          }
        }

        // تجميع الكوتة (بعد إعادة التعيين)
        totalRPM += usage.rpm?.limit || 15;
        totalRPMUsed += (usage.rpm?.used || 0);
        totalTPM += usage.tpm?.limit || 125000;
        totalTPMUsed += (usage.tpm?.used || 0);
        totalRPD += usage.rpd?.limit || 1000;
        totalRPDUsed += (usage.rpd?.used || 0);

        // ✅ PERFORMANCE: استخدام خريطة الاستثناءات بدلاً من استعلام DB لكل نموذج
        const exclusion = exclusionMap.get(record.key.id);
        if (exclusion) {
          console.log(`⚠️ [QUOTA-CALC] النموذج ${modelName} مستثنى للمفتاح ${record.key.name} حتى ${exclusion.retryAt}`);
          continue;
        }

        // ✅ CIRCUIT BREAKER: In-memory cooldown check
        if (this.stateStore.isKeyCoolingDown(record.key.id)) {
          console.log(`🔌 [QUOTA-CALC] Key ${record.key.id} (${record.key.name}) is in cooldown - skipping`);
          continue;
        }

        // ✅ FIX: فحص إذا كان المفتاح في قائمة المستنفدة المؤقتة (Distributed Ready)
        const isExhaustedInKey = await this.stateStore.isModelExhaustedInKey(record.key.id, modelName);
        if (isExhaustedInKey) {
          console.log(`⚠️ [QUOTA-CALC] النموذج ${modelName} مستنفد مؤقتاً للمفتاح ${record.key.name} (من الذاكرة المؤقتة)`);
          continue;
        }

        // ✅ فحص إذا كان النموذج تم تحديده كمستنفد مؤخراً (exhaustedAt)
        if (usage.exhaustedAt) {
          const exhaustedTime = new Date(usage.exhaustedAt);
          const currentTime = new Date();
          const timeDiffMs = currentTime - exhaustedTime;
          if (timeDiffMs < 1 * 60 * 1000) {
            console.log(`⚠️ [QUOTA-CALC] النموذج ${modelName} تم تحديده كمستنفد مؤخراً للمفتاح ${record.key.name}`);
            continue;
          }
        }

        // فحص إذا كان هذا المفتاح متاح (RPM, RPD, TPM)
        // ✅ SAFETY MARGIN: استخدام 95% من الكوتة فقط لتجنب الحظر الصارم
        const SAFETY_MARGIN = 0.95;

        const rpmAvailable = !usage.rpm?.limit || (usage.rpm.used || 0) < (usage.rpm.limit * SAFETY_MARGIN);
        const rpdAvailable = !usage.rpd?.limit || (usage.rpd.used || 0) < (usage.rpd.limit * SAFETY_MARGIN);
        const tpmAvailable = !usage.tpm?.limit || (usage.tpm.used || 0) < (usage.tpm.limit * SAFETY_MARGIN);

        if (rpmAvailable && rpdAvailable && tpmAvailable) {
          availableModels.push({
            modelId: record.id,
            keyId: record.key.id,
            keyName: record.key.name,
            keyName: record.key.name,
            provider: record.key.provider, // ✅ NEW
            baseUrl: record.key.baseUrl,   // ✅ FIX: Include Base URL
            apiKey: record.key.apiKey,
            priority: record.priority,
            usage: usage
          });
        } else {
          console.log(`⚠️ [QUOTA-CALC] النموذج ${modelName} غير متاح للمفتاح ${record.key.name} - RPM: ${rpmAvailable}, RPD: ${rpdAvailable}, TPM: ${tpmAvailable}`);
        }
      }

      const quota = {
        totalRPM,
        totalRPMUsed,
        rpmPercentage: totalRPM > 0 ? (totalRPMUsed / totalRPM) * 100 : 0,
        totalTPM,
        totalTPMUsed,
        tpmPercentage: totalTPM > 0 ? (totalTPMUsed / totalTPM) * 100 : 0,
        totalRPD,
        totalRPDUsed,
        rpdPercentage: totalRPD > 0 ? (totalRPDUsed / totalRPD) * 100 : 0,
        availableModels,
        totalModels: models.length
      };

      // ✅ PERFORMANCE: حفظ في cache
      this.quotaCache.set(cacheKey, {
        quota,
        timestamp: now
      });

      return quota;

    } catch (error) {
      console.error('❌ [QUOTA-CALC] خطأ في حساب الكوتة:', error);
      return null;
    }
  }

  /**
   * ✅ حساب الكوتة الإجمالية باستخدام نماذج محضرة مسبقاً (لتحسين الأداء)
   * @param {string} modelName - اسم النموذج
   * @param {string} companyId - معرف الشركة
   * @param {Array} preFetchedModels - مصفوفة النماذج المحضرة مسبقاً
   * @returns {Promise<Object|null>} - كائن الكوتة أو null
   */
  /**
   * ❌ DEPRECATED: Legacy implementation (kept for admin monitoring only)
   * This code is no longer used for key selection - replaced by Reactive Round-Robin
   */
  async calculateTotalQuotaWithPreFetchedModels(modelName, companyId, preFetchedModels = [], predictedTokens = 0) {
    // ✅ للتوافق مع admin monitoring - إرجاع null للإشارة إلى عدم استخدام الكوتة
    console.warn('⚠️ [DEPRECATED] calculateTotalQuotaWithPreFetchedModels is deprecated - Reactive Round-Robin does not use quota calculations');
    return null;
  }

  /**
   * ❌ DEPRECATED: Legacy implementation (kept for reference only - used by admin monitoring)
   */
  async _calculateTotalQuotaWithPreFetchedModels_LEGACY(modelName, companyId, preFetchedModels = [], useCentralKeys = false, predictedTokens = 0) {
    try {
      // ✅ PERFORMANCE: فحص cache أولاً (TTL: 30 ثانية - تم التقليل من 60 ثانية)
      const cacheKey = `${modelName}_${companyId}`;
      const cached = this.quotaCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < 30000) {
        console.log(`✅ [QUOTA-CACHE] استخدام Cache للكوتة: ${modelName} (${companyId})`);
        return cached.quota;
      }

      // النماذج المحضرة مسبقاً يجب أن تكون بالفعل مصفاة حسب النموذج والشركة
      // لكن نتأكد من أن النماذج صحيحة ومفعلة
      // ملاحظة: isActive تم استخدامه في WHERE وليس في SELECT، لذا لا نتحقق منه هنا
      let modelRecords = preFetchedModels.filter(record => {
        if (!record || record.model !== modelName) return false;
        if (!record.isEnabled) return false;
        if (!record.key) return false;
        return true;
      });

      if (modelRecords.length === 0) {
        return null;
      }

      // ✅ BATCH EXCLUSIONS: جلب جميع الاستثناءات دفعة واحدة
      const keyIds = modelRecords.map(m => m.key.id);
      const exclusions = keyIds.length > 0 ? await getSharedPrismaClient().excludedModel.findMany({
        where: {
          modelName: modelName,
          keyId: { in: keyIds },
          retryAt: { gt: new Date() }
        },
        select: {
          keyId: true,
          retryAt: true,
          reason: true
        }
      }) : [];

      // إنشاء خريطة للاستثناءات للوصول السريع
      const exclusionMap = new Map();
      exclusions.forEach(exc => exclusionMap.set(exc.keyId, exc));

      let totalRPM = 0;
      let totalRPMUsed = 0;
      let totalTPM = 0;
      let totalTPMUsed = 0;
      let totalRPD = 0;
      let totalRPDUsed = 0;
      const availableModels = [];

      for (const record of modelRecords) {
        let usage;
        try {
          usage = JSON.parse(record.usage || '{}');
        } catch (e) {
          const modelDefaults = this.getModelDefaults(modelName);
          usage = {
            rpm: { used: 0, limit: modelDefaults.rpm },
            rph: { used: 0, limit: modelDefaults.rph },
            rpd: { used: 0, limit: modelDefaults.rpd },
            tpm: { used: 0, limit: modelDefaults.tpm || 125000 }
          };
        }

        // ✅ إعادة تعيين النوافذ المنتهية قبل حساب الكوتة
        const now = new Date();
        const rpmWindowMs = 60 * 1000; // 1 دقيقة
        const rphWindowMs = 60 * 60 * 1000; // 1 ساعة
        const rpdWindowMs = 24 * 60 * 60 * 1000; // 1 يوم

        // ✅ CIRCUIT BREAKER: In-memory cooldown check
        if (this.stateStore.isKeyCoolingDown(record.key.id)) {
          console.log(`🔌 [QUOTA-PREFETCH] Key ${record.key.id} (${record.key.name}) is in cooldown - skipping`);
          continue;
        }

        // ✅ FIX: فحص إذا كان المفتاح في قائمة المستنفدة المؤقتة (Distributed Ready)
        const isExhaustedInKey = await this.stateStore.isModelExhaustedInKey(record.key.id, modelName);
        if (isExhaustedInKey) {
          console.log(`⚠️ [QUOTA-PREFETCH] النموذج ${modelName} مستنفد مؤقتاً للمفتاح ${record.key.name} (من الذاكرة المؤقتة)`);
          continue;
        }
        if (usage.rpm?.windowStart) {
          const rpmWindowStart = new Date(usage.rpm.windowStart);
          if ((now - rpmWindowStart) >= rpmWindowMs) {
            usage.rpm.used = 0;
            usage.rpm.windowStart = null;
          }
        }

        // إعادة تعيين RPH إذا انتهت النافذة
        if (usage.rph?.windowStart) {
          const rphWindowStart = new Date(usage.rph.windowStart);
          if ((now - rphWindowStart) >= rphWindowMs) {
            usage.rph.used = 0;
            usage.rph.windowStart = null;
          }
        }

        // إعادة تعيين RPD إذا انتهت النافذة
        if (usage.rpd?.windowStart) {
          const rpdWindowStart = new Date(usage.rpd.windowStart);
          if ((now - rpdWindowStart) >= rpdWindowMs) {
            usage.rpd.used = 0;
            usage.rpd.windowStart = null;
          }
        }

        // إعادة تعيين TPM إذا انتهت النافذة
        if (usage.tpm?.windowStart) {
          const tpmWindowStart = new Date(usage.tpm.windowStart);
          if ((now - tpmWindowStart) >= rpmWindowMs) {
            usage.tpm.used = 0;
            usage.tpm.windowStart = null;
          }
        }

        // تجميع الكوتة (بعد إعادة التعيين)
        totalRPM += usage.rpm?.limit || 15;
        totalRPMUsed += (usage.rpm?.used || 0);
        totalTPM += usage.tpm?.limit || 125000;
        totalTPMUsed += (usage.tpm?.used || 0);
        totalRPD += usage.rpd?.limit || 1000;
        totalRPDUsed += (usage.rpd?.used || 0);

        // ✅ PERFORMANCE: استخدام خريطة الاستثناءات بدلاً من استعلام DB لكل نموذج
        const exclusion = exclusionMap.get(record.key.id);
        if (exclusion) {
          console.log(`⚠️ [QUOTA-CALC] النموذج ${modelName} مستثنى للمفتاح ${record.key.name} حتى ${exclusion.retryAt}`);
          continue;
        }

        // ✅ فحص إذا كان النموذج تم تحديده كمستنفد مؤخراً (exhaustedAt)
        if (usage.exhaustedAt) {
          const exhaustedTime = new Date(usage.exhaustedAt);
          const currentTime = new Date();
          const timeDiffMs = currentTime - exhaustedTime;
          if (timeDiffMs < 1 * 60 * 1000) {
            console.log(`⚠️ [QUOTA-CALC] النموذج ${modelName} تم تحديده كمستنفد مؤخراً للمفتاح ${record.key.name}`);
            continue;
          }
        }

        // فحص إذا كان هذا المفتاح متاح (RPM, RPD, TPM)
        const rpmAvailable = !usage.rpm?.limit || (usage.rpm.used || 0) < usage.rpm.limit;
        const rpdAvailable = !usage.rpd?.limit || (usage.rpd.used || 0) < usage.rpd.limit;

        // ✅ TPM Awareness: التحقق مما إذا كان الطلب المتوقع سيتناسب مع الكوتا المتبقية
        const tpmAvailable = !usage.tpm?.limit || (usage.tpm.used + predictedTokens) < usage.tpm.limit;

        if (rpmAvailable && rpdAvailable && tpmAvailable) {
          availableModels.push({
            modelId: record.id,
            keyId: record.key.id,
            keyName: record.key.name,
            provider: record.key.provider, // ✅ NEW
            apiKey: record.key.apiKey,
            priority: record.key.priority || record.priority || 0,
            usage: usage
          });
        } else {
          const tpmUsedInclPredicted = (usage.tpm?.used || 0) + predictedTokens;
          console.log(`⚠️ [QUOTA-CALC] النموذج ${modelName} غير متاح للمفتاح ${record.key.name} - RPM: ${rpmAvailable}, RPD: ${rpdAvailable}, TPM: ${tpmAvailable} (Used: ${tpmUsedInclPredicted}/${usage.tpm?.limit})`);
        }
      }

      const quota = {
        totalRPM,
        totalRPMUsed,
        rpmPercentage: totalRPM > 0 ? (totalRPMUsed / totalRPM) * 100 : 0,
        totalTPM,
        totalTPMUsed,
        tpmPercentage: totalTPM > 0 ? (totalTPMUsed / totalTPM) * 100 : 0,
        totalRPD,
        totalRPDUsed,
        rpdPercentage: totalRPD > 0 ? (totalRPDUsed / totalRPD) * 100 : 0,
        availableModels,
        totalModels: modelRecords.length
      };

      // ✅ PERFORMANCE: حفظ في cache
      this.quotaCache.set(cacheKey, {
        quota,
        timestamp: now
      });

      return quota;

    } catch (error) {
      console.error('❌ [QUOTA-CALC] خطأ في حساب الكوتة (pre-fetched):', error);
      return null;
    }
  }

  /**
   * ✅ فحص إذا كان النموذج مستثنى في جدول ExcludedModel
   * @param {string} modelName - اسم النموذج
   * @param {string} keyId - معرف المفتاح
   * @param {string} companyId - معرف الشركة (اختياري)
   * @returns {Promise<boolean>} - true إذا كان النموذج مستثنى
   */
  async isModelExcluded(modelName, keyId, companyId = null) {
    try {
      const now = new Date();

      const whereClause = {
        modelName: modelName,
        keyId: keyId,
        retryAt: {
          gt: now // retryAt في المستقبل يعني أن النموذج لا يزال مستثنى
        }
      };

      if (companyId) {
        whereClause.companyId = companyId;
      }

      const excluded = await this.prisma.excludedModel.findFirst({
        where: whereClause
      });

      return !!excluded;
    } catch (error) {
      console.error('❌ [EXCLUDED-CHECK] خطأ في فحص النموذج المستثنى:', error);
      return false; // في حالة الخطأ، نعتبر النموذج غير مستثنى
    }
  }

  /**
   * ✅ إضافة نموذج إلى جدول ExcludedModel
   * @param {string} modelName - اسم النموذج
   * @param {string} keyId - معرف المفتاح
   * @param {string} companyId - معرف الشركة (اختياري)
   * @param {string} reason - سبب الاستثناء
   * @param {number} retryAfterMinutes - عدد الدقائق قبل إعادة المحاولة (افتراضي: 5)
   */
  async excludeModel(modelName, keyId, companyId = null, reason = 'QUOTA_429', retryAfterMinutes = 1) {
    try {
      const now = new Date();
      const retryAt = new Date(now.getTime() + retryAfterMinutes * 60 * 1000);

      // التحقق من وجود استثناء سابق
      const existing = await this.prisma.excludedModel.findFirst({
        where: {
          modelName: modelName,
          keyId: keyId,
          companyId: companyId || null
        }
      });

      if (existing) {
        // تحديث الاستثناء الموجود
        await this.prisma.excludedModel.update({
          where: { id: existing.id },
          data: {
            reason: reason,
            retryAt: retryAt,
            retryCount: existing.retryCount + 1,
            lastRetryAt: now,
            updatedAt: now
          }
        });
        console.log(`✅ [EXCLUDE] تم تحديث استثناء النموذج: ${modelName} (Key: ${keyId}) - Retry at: ${retryAt.toISOString()}`);
      } else {
        // إنشاء استثناء جديد
        await this.prisma.excludedModel.create({
          data: {
            modelName: modelName,
            keyId: keyId,
            companyId: companyId || null,
            reason: reason,
            retryAt: retryAt,
            retryCount: 0
          }
        });
        console.log(`✅ [EXCLUDE] تم إضافة استثناء جديد للنموذج: ${modelName} (Key: ${keyId}) - Retry at: ${retryAt.toISOString()}`);
      }
    } catch (error) {
      console.error('❌ [EXCLUDE] خطأ في إضافة النموذج المستثنى:', error);
    }
  }

  /**
   * ✅ فحص وإعادة محاولة النماذج المستبعدة (يتم استدعاؤها بواسطة Cron Job)
   */
  async checkAndRetryExcludedModels() {
    try {
      const now = new Date();
      // البحث عن النماذج التي انتهى وقت انتظارها
      const expiredExclusions = await this.prisma.excludedModel.findMany({
        where: {
          retryAt: { lte: now }
        }
      });

      if (expiredExclusions.length === 0) return;

      console.log(`🔄 [EXCLUDED-RETRY] Found ${expiredExclusions.length} models ready for retry`);

      for (const exclusion of expiredExclusions) {
        // حذف الاستثناء
        await this.prisma.excludedModel.delete({
          where: { id: exclusion.id }
        });

        // تنظيف الـ Cache لهذا النموذج
        if (exclusion.companyId) {
          this.invalidateQuotaCache(exclusion.modelName, exclusion.companyId);
        } else {
          // ✅ تنظيف الـ Cache للنماذج المركزية (لجميع الشركات)
          let cleanedCount = 0;
          for (const key of this.quotaCache.keys()) {
            if (key.startsWith(`${exclusion.modelName}_`)) {
              this.quotaCache.delete(key);
              cleanedCount++;
            }
          }

          // تنظيف aggregatedModelsCache أيضاً
          for (const key of this.aggregatedModelsCache.keys()) {
            if (key.startsWith(`${exclusion.modelName}_`)) {
              this.aggregatedModelsCache.delete(key);
            }
          }
          console.log(`🧹 [EXCLUDED-RETRY] Cleared ${cleanedCount} cache entries for central model: ${exclusion.modelName}`);
        }

        console.log(`✅ [EXCLUDED-RETRY] Re-enabled model: ${exclusion.modelName} (Key: ${exclusion.keyId})`);
      }
    } catch (error) {
      console.error('❌ [EXCLUDED-RETRY] Error processing excluded models:', error);
    }
  }

  /**
   * ✅ تحديث النموذج النشط الحالي
   * @param {Object} newModel - النموذج الجديد
   */
  updateCurrentActiveModel(newModel) {
    if (newModel && newModel.keyId) {
      this.stateStore.setLastUsedGlobalKeyId(newModel.keyId);
      console.log(`🔄 [MODEL-UPDATE] تم تحديث النموذج النشط: ${newModel.modelName || 'unknown'}`);
    }
  }

  /**
   * ✅ البحث عن النموذج التالي المتاح للشركة
   * @param {string} companyId - معرف الشركة
   */
  async findNextAvailableModel(companyId) {
    // ✅ استخدام Reactive Round-Robin
    return await this.getNextKeySimple(companyId);
  }

  /**
   * ✅ البحث عن النموذج التالي في مفتاح معين
   * @param {string} keyId - معرف المفتاح
   */
  async findNextModelInKey(keyId) {
    return this.findBestAvailableModelInActiveKey(keyId, true);
  }

  /**
   * ✅ البحث عن المفتاح التالي المتاح للشركة
   * @param {string} companyId - معرف الشركة
   */
  async findNextAvailableKey(companyId) {
    try {
      const key = await this.prisma.aiKey.findFirst({
        where: {
          isActive: true,
          OR: [
            { companyId: companyId },
            { keyType: 'CENTRAL' },
          ],
        },
        orderBy: { priority: 'asc' },
      });
      return key || null;
    } catch (error) {
      console.error('❌ [NEXT-KEY] خطأ في البحث عن المفتاح التالي:', error);
      return null;
    }
  }

  /**
   * ✅ البحث عن أفضل نموذج في مفتاح معين
   * @param {string} keyId - معرف المفتاح
   */
  async findBestModelInKey(keyId) {
    return this.findBestAvailableModelInActiveKey(keyId);
  }

  /**
   * ✅ تفعيل مفتاح معين
   * @param {string} keyId - معرف المفتاح
   */
  async activateKey(keyId) {
    try {
      await this.prisma.aiKey.update({
        where: { id: keyId },
        data: { isActive: true }
      });
      console.log(`✅ [ACTIVATE-KEY] تم تفعيل المفتاح: ${keyId}`);
      return true;
    } catch (error) {
      console.error('❌ [ACTIVATE-KEY] خطأ في تفعيل المفتاح:', error);
      return false;
    }
  }

  /**
   * ✅ اختبار صحة النموذج
   * @param {string} apiKey - مفتاح API
   * @param {string} model - اسم النموذج
   */
  async testModelHealth(apiKey, model) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const genModel = genAI.getGenerativeModel({ model });

      // اختبار بسيط
      const result = await genModel.generateContent('Say "OK" if you are working.');
      const response = await result.response;
      const text = response.text();

      console.log(`✅ [MODEL-HEALTH] النموذج ${model} يعمل بشكل صحيح`);
      return { healthy: true, response: text };
    } catch (error) {
      console.error(`❌ [MODEL-HEALTH] النموذج ${model} غير صحي:`, error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * ✅ FIX: مسح تلقائي لـ exhaustedAt من قاعدة البيانات
   * يتم استدعاء هذه الدالة كل دقيقة لمسح exhaustedAt من النماذج التي مر عليها أكثر من دقيقة واحدة
   * هذا يضمن أن النماذج ستتعافى تلقائياً حتى بعد إعادة تشغيل السيرفر
   */
  async clearExpiredExhaustedFlags() {
    try {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);

      // ✅ OPTIMIZATION: جلب فقط النماذج المحددة كمستنفدة (لتوفير الـ Memory و DB Load)
      const models = await this.prisma.aiModelConfig.findMany({
        where: {
          isEnabled: true,
          usage: {
            contains: '"exhaustedAt"' // فحص وجود الكلمة في حقل الـ JSON
          }
        },
        select: {
          id: true,
          modelName: true,
          keyId: true,
          usage: true
        }
      });

      let clearedCount = 0;
      const updatedModels = [];

      for (const modelRecord of models) {
        try {
          let usage = JSON.parse(modelRecord.usage || '{}');

          // فحص إذا كان exhaustedAt موجود وقديم (أكثر من دقيقة)
          if (usage.exhaustedAt) {
            const exhaustedTime = new Date(usage.exhaustedAt);

            if (exhaustedTime < oneMinuteAgo) {
              // مسح exhaustedAt
              delete usage.exhaustedAt;

              updatedModels.push({
                id: modelRecord.id,
                model: modelRecord.modelName,
                keyId: modelRecord.keyId,
                usage: usage
              });

              clearedCount++;
            }
          }
        } catch (parseError) {
          // تجاهل أخطاء JSON parsing للنماذج الفردية
          console.warn(`⚠️ [AUTO-CLEAR] Failed to parse usage for model ${modelRecord.id}:`, parseError.message);
        }
      }

      // ✅ PERFORMANCE: تحديث قاعدة البيانات دفعة واحدة باستخدام Transaction
      if (updatedModels.length > 0) {
        try {
          const now = new Date();
          await this.prisma.$transaction(
            updatedModels.map(model =>
              this.prisma.aiModelConfig.update({
                where: { id: model.id },
                data: {
                  usage: JSON.stringify(model.usage),
                  updatedAt: now
                }
              })
            )
          );

          console.log(`✅ [AUTO-CLEAR] Successfully cleared ${clearedCount} expired exhaustedAt flags (Transaction)`);

          // إبطال الـ caches المتعلقة بجميع النماذج المحدثة
          const uniqueModels = [...new Set(updatedModels.map(m => m.modelName))];
          uniqueModels.forEach(modelName => this.invalidateQuotaCache(modelName, null));

          // مسح جميع الـ caches لضمان التحديث
          this.activeModelCache.clear();
          console.log(`🗑️ [AUTO-CLEAR] Cleared all active model caches after cleanup`);
        } catch (txError) {
          if (isPermissionError(txError)) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [DB-PERMISSION] Cannot clear exhaustedAt: ${getPermissionErrorMessage(txError)}`);
            }
          } else {
            console.error(`❌ [AUTO-CLEAR] Transaction failed:`, txError.message);
          }
        }
      }

    } catch (error) {
      console.error('❌ [AUTO-CLEAR] Error in clearExpiredExhaustedFlags:', error);
    }
  }

  /**
   * ✅ تنظيف النماذج المستثناة (ExcludedModel) القديمة
   * يمنع تضخم جدول ExcludedModel في قاعدة البيانات
   */
  async clearExpiredExclusions() {
    try {
      const now = new Date();

      const result = await this.prisma.excludedModel.deleteMany({
        where: {
          retryAt: {
            lt: now // حذف كل ما انتهى وقت الانتظار الخاص به
          }
        }
      });

      if (result.count > 0) {
        console.log(`🧹 [AUTO-CLEAR] Deleted ${result.count} expired model exclusions from database`);
      }
    } catch (error) {
      console.error('❌ [AUTO-CLEAR] Error clearing expired exclusions:', error);
    }
  }

  /**
   * ✅ تقدير عدد التوكنز في النص
   * @param {string} text - النص المراد تقديره
   * @param {string} provider - نوع الـ Provider (GOOGLE, DEEPSEEK)
   * @returns {number} - عدد التوكنز التقديري
   */
  estimateTokenCount(text, provider = 'GOOGLE') {
    if (!text || typeof text !== 'string') return 0;

    // ✅ استخدام Token Estimator الخاص بكل Provider
    if (provider === 'DEEPSEEK') {
      // DeepSeek tokenizer: ~4 أحرف = 1 token (أفضل من Gemini)
      const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
      const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
      const numbers = (text.match(/\d+/g) || []).length;

      const arabicTokens = Math.ceil(arabicChars / 4);
      const englishTokens = Math.ceil(englishWords * 1.3);
      const numberTokens = numbers;

      return arabicTokens + englishTokens + numberTokens;
    }

    // ✅ Default: Gemini tokenizer (~3.5 أحرف = 1 token)
    const charCount = text.length;
    const estimatedTokens = Math.ceil((charCount / 3.5) * 1.1);

    return estimatedTokens;
  }

  /**
   * ✅ فحص سريع لتوفر النموذج (للـ Smart Cache)
   * @param {string} keyId - معرف المفتاح
   * @param {string} modelName - اسم النموذج
   * @returns {Promise<boolean>} - true إذا كان النموذج متاحاً
   */
  async quickAvailabilityCheck(keyId, modelName) {
    try {
      // فحص سريع في StateStore أولاً
      const isExhausted = await this.stateStore.isModelExhaustedInKey(keyId, modelName);
      if (isExhausted) {
        return false;
      }

      // فحص سريع في قاعدة البيانات للاستثناءات
      const exclusion = await this.prisma.excludedModel.findFirst({
        where: {
          modelName: modelName,
          keyId: keyId,
          retryAt: { gt: new Date() }
        },
        select: { id: true } // نحتاج فقط للتأكد من الوجود
      });

      return !exclusion; // متاح إذا لم يكن مستثنى
    } catch (error) {
      console.warn(`⚠️ [QUICK-CHECK] خطأ في فحص توفر ${modelName}:`, error.message);
      return false; // في حالة الخطأ، اعتبر غير متاح للأمان
    }
  }

  /**
   * ✅ تسجيل مقاييس الأداء
   * @param {string} type - نوع المقياس (success, failure, cacheHit, cacheMiss)
   * @param {string} modelName - اسم النموذج
   * @param {string} keyId - معرف المفتاح
   * @param {number} responseTime - وقت الاستجابة بالميلي ثانية
   */
  recordMetric(type, modelName, keyId = null, responseTime = 0) {
    try {
      this.performanceMetrics.totalRequests++;

      switch (type) {
        case 'success':
          this.performanceMetrics.successfulRequests++;
          if (modelName) {
            const currentCount = this.performanceMetrics.modelUsageCount.get(modelName) || 0;
            this.performanceMetrics.modelUsageCount.set(modelName, currentCount + 1);
          }
          if (keyId) {
            const currentCount = this.performanceMetrics.keyUsageCount.get(keyId) || 0;
            this.performanceMetrics.keyUsageCount.set(keyId, currentCount + 1);
          }
          break;

        case 'failure':
          this.performanceMetrics.failedRequests++;
          const currentErrorCount = this.performanceMetrics.errorCount.get(modelName) || 0;
          this.performanceMetrics.errorCount.set(modelName, currentErrorCount + 1);
          break;

        case 'cacheHit':
          this.performanceMetrics.cacheHits++;
          break;

        case 'cacheMiss':
          this.performanceMetrics.cacheMisses++;
          break;
      }

      // تحديث متوسط وقت الاستجابة
      if (responseTime > 0) {
        const totalTime = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1);
        this.performanceMetrics.averageResponseTime = (totalTime + responseTime) / this.performanceMetrics.totalRequests;
      }

    } catch (error) {
      console.warn(`⚠️ [METRICS] خطأ في تسجيل المقياس:`, error.message);
    }
  }

  /**
   * ✅ الحصول على مقاييس الأداء
   * @returns {Object} - كائن يحتوي على جميع المقاييس
   */
  getPerformanceMetrics() {
    const uptime = Date.now() - this.performanceMetrics.lastResetTime;
    const successRate = this.performanceMetrics.totalRequests > 0
      ? (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests) * 100
      : 0;
    const cacheHitRate = (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) > 0
      ? (this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100
      : 0;

    return {
      uptime: Math.round(uptime / 1000), // بالثواني
      totalRequests: this.performanceMetrics.totalRequests,
      successfulRequests: this.performanceMetrics.successfulRequests,
      failedRequests: this.performanceMetrics.failedRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime),
      cacheHits: this.performanceMetrics.cacheHits,
      cacheMisses: this.performanceMetrics.cacheMisses,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      topModels: Array.from(this.performanceMetrics.modelUsageCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      topKeys: Array.from(this.performanceMetrics.keyUsageCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      topErrors: Array.from(this.performanceMetrics.errorCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }

  /**
   * ✅ إعادة تعيين مقاييس الأداء
   */
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      keyUsageCount: new Map(),
      modelUsageCount: new Map(),
      errorCount: new Map(),
      lastResetTime: Date.now()
    };
    console.log('📊 [METRICS] تم إعادة تعيين مقاييس الأداء');
  }

  /**
   * ✅ إغلاق المانجر وتنظيف الـ intervals
   */
  stop() {
    if (this.cleanupIntervals) {
      this.cleanupIntervals.forEach(interval => clearInterval(interval));
      this.cleanupIntervals = [];
      console.log('🛑 [MODEL-MANAGER] All dynamic intervals cleared');
    }
  }
}

module.exports = ModelManager;
