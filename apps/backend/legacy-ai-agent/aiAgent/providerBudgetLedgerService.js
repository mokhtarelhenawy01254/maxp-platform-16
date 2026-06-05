const crypto = require('crypto');
const stateManager = require('./stateManager');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getModelCostPerToken, FALLBACK_COST } = require('../../config/modelCosts');


const LIMIT_ALIASES = {
  rpm: ['rpm', 'requestsPerMinute', 'requests_per_minute', 'minuteRequests'],
  rpd: ['rpd', 'requestsPerDay', 'requests_per_day', 'dailyRequests', 'maxRequestsPerDay'],
  tpm: ['tpm', 'tokensPerMinute', 'tokens_per_minute', 'minuteTokens'],
  tpd: ['tpd', 'tokensPerDay', 'tokens_per_day', 'dailyTokens'],
};

class ProviderBudgetLedgerService {
  constructor(options = {}) {
    this.stateManager = options.stateManager || stateManager;
    this.localCache = new Map();
    this.prefix = 'provider_budget';
  }

  parseJsonValue(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  normalizeLimitValue(value) {
    if (value === null || value === undefined || value === '') return null;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;
    return Math.floor(numericValue);
  }

  readAlias(source, aliases) {
    if (!source || typeof source !== 'object') return null;

    for (const alias of aliases) {
      const value = this.normalizeLimitValue(source[alias]);
      if (value) return value;
    }

    return null;
  }

  normalizeLimitsFromObject(source) {
    if (!source || typeof source !== 'object') return {};

    return Object.entries(LIMIT_ALIASES).reduce((limits, [name, aliases]) => {
      const value = this.readAlias(source, aliases);
      if (value) limits[name] = value;
      return limits;
    }, {});
  }

  getLimitCandidates(source) {
    if (!source || typeof source !== 'object') return [];

    return [
      source,
      source.limits,
      source.rateLimits,
      source.routingLimits,
      source.providerBudget,
      source.providerBudgetLimits,
      source.budgetLimits,
      source.quota,
    ].filter(candidate => candidate && typeof candidate === 'object');
  }

  mergeLimits(current, incoming) {
    const merged = { ...current };
    for (const [name, value] of Object.entries(incoming || {})) {
      const numericValue = this.normalizeLimitValue(value);
      if (!numericValue) continue;
      merged[name] = merged[name] ? Math.min(merged[name], numericValue) : numericValue;
    }
    return merged;
  }

  parseProviderLimits(selection = {}) {
    const parsedUsage = this.parseJsonValue(selection.usage);
    const parsedModelUsage = this.parseJsonValue(selection.modelUsage);
    const parsedConfiguredModelUsage = this.parseJsonValue(selection.configuredModel?.usage);

    const sources = [
      selection,
      selection.routingLimits,
      selection.rateLimits,
      selection.limits,
      selection.providerBudget,
      parsedUsage,
      parsedModelUsage,
      parsedConfiguredModelUsage,
    ];

    let limits = {};
    for (const source of sources) {
      for (const candidate of this.getLimitCandidates(source)) {
        limits = this.mergeLimits(limits, this.normalizeLimitsFromObject(candidate));
      }
    }

    const maxRequestsPerDay = this.normalizeLimitValue(selection.maxRequestsPerDay);
    if (maxRequestsPerDay) {
      limits = this.mergeLimits(limits, { rpd: maxRequestsPerDay });
    }

    return limits;
  }

  hasLimits(limits) {
    return Object.values(limits || {}).some(value => Number.isFinite(Number(value)) && Number(value) > 0);
  }

  normalizeTokenCount(value) {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
    }

    if (!value || typeof value !== 'object') return 0;

    return this.normalizeTokenCount(
      value.totalTokens
      || value.tokens
      || value.estimatedTokens
      || value.usage?.totalTokens
      || value.usage?.tokens
    );
  }

  getBudgetIdentity(selection = {}) {
    const provider = String(selection.provider || selection.activeProvider || 'UNKNOWN').toUpperCase();
    const model = String(selection.modelName || selection.model || selection.modelId || 'unknown-model');
    const keyId = String(selection.id || selection.keyId || selection.apiKeyId || 'unknown-key');
    const raw = `${provider}:${model}:${keyId}`;
    const hash = crypto.createHash('sha1').update(raw).digest('hex');

    return {
      provider,
      model,
      keyId,
      hash,
      raw,
    };
  }

  getPenaltyKey(identity) {
    return `${this.prefix}:penalty:${identity.hash}`;
  }

  getWindowKeys(identity, now = Date.now()) {
    const timestamp = Number(now) || Date.now();
    const minuteBucket = Math.floor(timestamp / 60000);
    const dayBucket = new Date(timestamp).toISOString().slice(0, 10);

    return {
      minute: `${this.prefix}:usage:${identity.hash}:minute:${minuteBucket}`,
      day: `${this.prefix}:usage:${identity.hash}:day:${dayBucket}`,
      minuteBucket,
      dayBucket,
      minuteResetAt: (minuteBucket + 1) * 60000,
      dayResetAt: Date.parse(`${dayBucket}T00:00:00.000Z`) + 24 * 60 * 60 * 1000,
    };
  }

  getRedisAdapter() {
    return this.stateManager?.redis || null;
  }

  async readCache(key) {
    const redis = this.getRedisAdapter();
    if (redis?.get) {
      return redis.get(key);
    }

    const cached = this.localCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt && cached.expiresAt <= Date.now()) {
      this.localCache.delete(key);
      return null;
    }
    return cached.value;
  }

  async writeCache(key, value, ttlSeconds) {
    const ttl = Math.max(1, Math.ceil(Number(ttlSeconds) || 60));
    const redis = this.getRedisAdapter();
    if (redis?.set) {
      return redis.set(key, value, ttl);
    }

    this.localCache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
    return true;
  }

  normalizeWindowUsage(value) {
    const usage = value && typeof value === 'object' ? value : {};
    return {
      requests: Number.isFinite(Number(usage.requests)) ? Number(usage.requests) : 0,
      tokens: Number.isFinite(Number(usage.tokens)) ? Number(usage.tokens) : 0,
    };
  }

  async getUsage(selection, options = {}) {
    const identity = this.getBudgetIdentity(selection);
    const windows = this.getWindowKeys(identity, options.now);
    const [minuteRaw, dayRaw] = await Promise.all([
      this.readCache(windows.minute),
      this.readCache(windows.day),
    ]);

    return {
      identity,
      windows,
      minute: this.normalizeWindowUsage(minuteRaw),
      day: this.normalizeWindowUsage(dayRaw),
    };
  }

  buildAllowedStatus(selection, limits, usage) {
    return {
      allowed: true,
      limited: this.hasLimits(limits),
      reason: null,
      limits,
      usage: {
        minute: usage?.minute || { requests: 0, tokens: 0 },
        day: usage?.day || { requests: 0, tokens: 0 },
      },
      budgetKey: usage?.identity?.hash || this.getBudgetIdentity(selection).hash,
    };
  }

  buildDeniedStatus(reason, limits, usage, resetAt, extra = {}) {
    return {
      allowed: false,
      limited: true,
      reason,
      limits,
      usage: {
        minute: usage.minute,
        day: usage.day,
      },
      resetAt,
      retryAfterSeconds: resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) : null,
      budgetKey: usage.identity.hash,
      ...extra,
    };
  }

  async getPenalty(selection, options = {}) {
    const identity = this.getBudgetIdentity(selection);
    const penalty = await this.readCache(this.getPenaltyKey(identity));
    if (!penalty) return null;

    const SCORE_THRESHOLD = 0.3;
    const now = options?.now || Date.now();
    const score = typeof penalty.score === 'number'
      ? penalty.score
      : 1.0;

    const elapsed = now - (penalty.recordedAt || now);
    const recovered = elapsed * 0.1 / (5 * 60 * 1000);
    const effectiveScore = Math.min(1.0, score + recovered);

    if (effectiveScore > SCORE_THRESHOLD) return null;

    return {
      identity,
      score: effectiveScore,
      reason: penalty.reason ?? 'PENALTY_COOLDOWN',
      retryAt: penalty.retryAt ?? null,
      retryAfterMs: penalty.retryAfterMs ?? null,
    };
  }

  async getCompanyLimits(companyId) {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma) {
        return { dailyTokenLimit: 500000, dailyCostLimit: 50.0 };
      }
      const settings = await prisma.aiSetting.findUnique({
        where: { companyId },
        select: { modelSettings: true }
      });
      let dailyTokenLimit = 500000;
      let dailyCostLimit = 50.0;
      if (settings?.modelSettings) {
        try {
          const parsed = JSON.parse(settings.modelSettings);
          if (parsed.dailyTokenLimit) dailyTokenLimit = Number(parsed.dailyTokenLimit);
          if (parsed.dailyCostLimit) dailyCostLimit = Number(parsed.dailyCostLimit);
        } catch (e) {
          // ignore parsing error
        }
      }
      return { dailyTokenLimit, dailyCostLimit };
    } catch (err) {
      console.warn(`⚠️ [PROVIDER-BUDGET] Failed to read company limits, using defaults:`, err.message);
      return { dailyTokenLimit: 500000, dailyCostLimit: 50.0 };
    }
  }

  async isWithinDailyBudget(companyId, estimatedTokens = 0, now = Date.now()) {
    if (!companyId) return { allowed: true };

    const limits = await this.getCompanyLimits(companyId);
    const windows = this.getWindowKeys({ hash: `company:${companyId}` }, now);
    const companyKey = `${this.prefix}:company:${companyId}:day:${windows.dayBucket}`;
    
    const currentRaw = await this.readCache(companyKey);
    const usage = currentRaw ? {
      requests: Number(currentRaw.requests) || 0,
      tokens: Number(currentRaw.tokens) || 0,
      cost: Number(currentRaw.cost) || 0.0
    } : { requests: 0, tokens: 0, cost: 0.0 };

    if (limits.dailyTokenLimit && usage.tokens + estimatedTokens > limits.dailyTokenLimit) {
      return {
        allowed: false,
        reason: 'DAILY_TOKEN_LIMIT_EXCEEDED',
        limit: limits.dailyTokenLimit,
        current: usage.tokens,
        resetAt: windows.dayResetAt
      };
    }

    if (limits.dailyCostLimit && usage.cost > limits.dailyCostLimit) {
      return {
        allowed: false,
        reason: 'DAILY_COST_LIMIT_EXCEEDED',
        limit: limits.dailyCostLimit,
        current: usage.cost,
        resetAt: windows.dayResetAt
      };
    }

    return { allowed: true, usage, limits };
  }

  async incrementCompanyUsage(companyId, increments = {}, options = {}) {
    const requestIncrement = Math.max(0, Number(increments.requests) || 0);
    const tokenIncrement = Math.max(0, Number(increments.tokens) || 0);
    
    const provider = String(options.provider || 'UNKNOWN').toUpperCase();
    const model = String(options.model || 'default');
    const price = getModelCostPerToken(model) || FALLBACK_COST;
    const estimatedCost = tokenIncrement * price.input;
    
    const now = Number(options.now) || Date.now();
    const windows = this.getWindowKeys({ hash: `company:${companyId}` }, now);
    const companyKey = `${this.prefix}:company:${companyId}:day:${windows.dayBucket}`;
    
    const currentRaw = await this.readCache(companyKey);
    const current = currentRaw ? {
      requests: Number(currentRaw.requests) || 0,
      tokens: Number(currentRaw.tokens) || 0,
      cost: Number(currentRaw.cost) || 0.0
    } : { requests: 0, tokens: 0, cost: 0.0 };

    const day = {
      requests: current.requests + requestIncrement,
      tokens: current.tokens + tokenIncrement,
      cost: Number((current.cost + estimatedCost).toFixed(6)),
    };
    
    await this.writeCache(
      companyKey,
      day,
      Math.ceil((windows.dayResetAt - now) / 1000) + 60
    );
  }

  async triggerBudgetNotification(companyId, status, now = Date.now()) {
    try {
      const windows = this.getWindowKeys({ hash: `company:${companyId}` }, now);
      const lockKey = `${this.prefix}:company:${companyId}:notified:${windows.dayBucket}`;
      
      const alreadyNotified = await this.readCache(lockKey);
      if (alreadyNotified) {
        return; // Already notified today
      }

      const prisma = getSharedPrismaClient();
      if (prisma) {
        await prisma.aiNotification.create({
          data: {
            companyId,
            type: 'BUDGET_EXCEEDED',
            severity: 'high',
            title: 'تجميد باقة الذكاء الاصطناعي - تجاوز الميزانية اليومية',
            message: `تم تجميد استهلاك باقة الذكاء الاصطناعي للشركة لتجاوزها الميزانية المحددة يومياً (${status.limit} وحدة). يرجى شحن الرصيد أو زيادة الحدود من لوحة التحكم.`,
            metadata: JSON.stringify({
              reason: status.reason,
              limit: status.limit,
              current: status.current,
              resetAt: new Date(status.resetAt).toISOString()
            })
          }
        });
        
        // Cache the notification state to prevent duplicate logs today
        await this.writeCache(lockKey, true, Math.ceil((windows.dayResetAt - now) / 1000) + 60);
        console.log(`🔔 [PROVIDER-BUDGET] Sent budget exceeded notification for company ${companyId}`);
      }
    } catch (err) {
      console.warn(`⚠️ [PROVIDER-BUDGET] Failed to write budget notification:`, err.message);
    }
  }

  async canRoute(selection, options = {}) {
    const companyId = selection?.companyId || options?.companyId;
    if (companyId) {
      const estimatedTokens = this.normalizeTokenCount(options);
      const now = options.now || Date.now();
      const budgetStatus = await this.isWithinDailyBudget(companyId, estimatedTokens, now);
      if (!budgetStatus.allowed) {
        await this.triggerBudgetNotification(companyId, budgetStatus, now);
        
        const limits = { dailyTokenLimit: budgetStatus.limit };
        const usage = {
          minute: { requests: 0, tokens: 0 },
          day: { tokens: budgetStatus.current, requests: 0 },
          identity: { hash: `company:${companyId}` }
        };
        return this.buildDeniedStatus('BUDGET_EXCEEDED', limits, usage, budgetStatus.resetAt, {
          companyId,
          error: 'BUDGET_EXCEEDED',
          message: 'Company daily AI budget exceeded'
        });
      }
    }

    const limits = this.parseProviderLimits(selection);
    if (!this.hasLimits(limits)) {
      return this.buildAllowedStatus(selection, limits, null);
    }

    const estimatedTokens = this.normalizeTokenCount(options);
    const usage = await this.getUsage(selection, options);
    const penalty = await this.getPenalty(selection, options);

    if (penalty) {
      return this.buildDeniedStatus('PENALTY_COOLDOWN', limits, usage, penalty.retryAt, {
        penaltyReason: penalty.reason,
        penaltyScore: penalty.score,
      });
    }

    if (limits.rpm && usage.minute.requests + 1 > limits.rpm) {
      return this.buildDeniedStatus('RPM_LIMIT', limits, usage, usage.windows.minuteResetAt);
    }

    if (limits.rpd && usage.day.requests + 1 > limits.rpd) {
      return this.buildDeniedStatus('RPD_LIMIT', limits, usage, usage.windows.dayResetAt);
    }

    if (limits.tpm && usage.minute.tokens + estimatedTokens > limits.tpm) {
      return this.buildDeniedStatus('TPM_LIMIT', limits, usage, usage.windows.minuteResetAt, {
        estimatedTokens,
      });
    }

    if (limits.tpd && usage.day.tokens + estimatedTokens > limits.tpd) {
      return this.buildDeniedStatus('TPD_LIMIT', limits, usage, usage.windows.dayResetAt, {
        estimatedTokens,
      });
    }

    return this.buildAllowedStatus(selection, limits, usage);
  }

  async getBudgetSnapshot(selection, options = {}) {
    const limits = this.parseProviderLimits(selection);
    const usage = await this.getUsage(selection, options);
    const penalty = await this.getPenalty(selection, options);
    const routeStatus = await this.canRoute(selection, {
      ...options,
      estimatedTokens: options.estimatedTokens || 0,
    });

    return {
      limited: this.hasLimits(limits),
      allowed: routeStatus.allowed,
      reason: routeStatus.reason,
      retryAfterSeconds: routeStatus.retryAfterSeconds || null,
      limits,
      usage: {
        minute: usage.minute,
        day: usage.day,
      },
      penalty: penalty
        ? {
          reason: penalty.reason,
          retryAt: penalty.retryAt || null,
          retryAfterMs: penalty.retryAfterMs || null,
        }
        : null,
      budgetKey: usage.identity.hash,
    };
  }

  async incrementUsage(selection, increments = {}, options = {}) {
    const limits = this.parseProviderLimits(selection);
    const companyId = selection?.companyId || options?.companyId;

    if (companyId) {
      await this.incrementCompanyUsage(companyId, increments, {
        ...options,
        provider: selection?.provider || options?.provider,
        model: selection?.modelName || selection?.model || options?.model
      });
    }

    if (!this.hasLimits(limits)) {
      return {
        recorded: false,
        reason: 'NO_LIMITS_CONFIGURED',
        limits,
      };
    }

    const requestIncrement = Math.max(0, Number(increments.requests) || 0);
    const tokenIncrement = Math.max(0, Number(increments.tokens) || 0);
    const usage = await this.getUsage(selection, options);
    const minute = {
      requests: usage.minute.requests + requestIncrement,
      tokens: usage.minute.tokens + tokenIncrement,
    };
    const day = {
      requests: usage.day.requests + requestIncrement,
      tokens: usage.day.tokens + tokenIncrement,
    };
    const now = Number(options.now) || Date.now();

    await Promise.all([
      this.writeCache(
        usage.windows.minute,
        minute,
        Math.ceil((usage.windows.minuteResetAt - now) / 1000) + 5,
      ),
      this.writeCache(
        usage.windows.day,
        day,
        Math.ceil((usage.windows.dayResetAt - now) / 1000) + 60,
      ),
    ]);

    return {
      recorded: true,
      limits,
      usage: { minute, day },
      budgetKey: usage.identity.hash,
      tokens: tokenIncrement,
      requests: requestIncrement,
    };
  }

  async recordAttempt(selection, context = {}) {
    const estimatedTokens = this.normalizeTokenCount(context);
    return this.incrementUsage(selection, {
      requests: 1,
      tokens: estimatedTokens,
    }, context);
  }

  async recordUsage(selection, context = {}) {
    const totalTokens = this.normalizeTokenCount(context);
    const reservedTokens = this.normalizeTokenCount(context.reservedTokens || selection?.budgetReservation);
    const requestAlreadyRecorded = Boolean(context.requestAlreadyRecorded || selection?.budgetReservation?.recorded);
    const tokenIncrement = requestAlreadyRecorded ? Math.max(0, totalTokens - reservedTokens) : totalTokens;

    return this.incrementUsage(selection, {
      requests: requestAlreadyRecorded ? 0 : 1,
      tokens: tokenIncrement,
    }, context);
  }

  async recordPenalty(selection, context = {}) {
    const limits = this.parseProviderLimits(selection);
    if (!this.hasLimits(limits)) {
      return {
        recorded: false,
        reason: 'NO_LIMITS_CONFIGURED',
      };
    }

    const retryAfterMs = Math.max(1000, context.retryAfterMs != null ? Number(context.retryAfterMs) : 30000);
    const now = Number(context.now) || Date.now();
    const retryAt = now + retryAfterMs;

    const identity = this.getBudgetIdentity(selection);
    const existing = await this.readCache(this.getPenaltyKey(identity));

    const BASE_SCORE = 1.0;
    const PENALTY_DECAY = 0.4;
    const RECOVERY_RATE = 0.1;
    const MAX_PENALTY_TTL_MS = 5 * 60 * 1000;

    let score;
    if (existing && Number.isFinite(existing.score)) {
      const recordedAt = Number(existing.recordedAt) || now;
      const elapsed = Math.max(0, now - recordedAt);
      const recovered = elapsed * RECOVERY_RATE / MAX_PENALTY_TTL_MS;
      score = Math.min(BASE_SCORE, existing.score + recovered);
    } else {
      score = BASE_SCORE;
    }
    score = Math.max(0, score - PENALTY_DECAY);

    const effectiveTtlMs = Math.min(retryAfterMs, MAX_PENALTY_TTL_MS);
    const SCORE_THRESHOLD = 0.3;
    const newRetryAt = score <= SCORE_THRESHOLD ? now + effectiveTtlMs : null;

    await this.writeCache(this.getPenaltyKey(identity), {
      reason: context.reason || '429',
      retryAfterMs: effectiveTtlMs,
      retryAt: newRetryAt,
      score,
      recordedAt: now,
    }, Math.ceil(Math.max(effectiveTtlMs, 60000) / 1000));

    return {
      recorded: true,
      budgetKey: identity.hash,
      retryAt: newRetryAt,
      retryAfterMs: newRetryAt ? effectiveTtlMs : null,
      score,
    };
  }

  resetForTests() {
    this.localCache.clear();
  }
}

module.exports = new ProviderBudgetLedgerService();
module.exports.ProviderBudgetLedgerService = ProviderBudgetLedgerService;
