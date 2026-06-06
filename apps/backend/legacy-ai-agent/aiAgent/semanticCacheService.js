/**
 * @module SemanticCacheService
 * @description High-speed memory-backed semantic cache for support inquiries.
 * Computes vector similarity and performs auto-invalidation on database updates.
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const CorrectiveRAGEngine = require('../../services/rag/CorrectiveRAGEngine');

class SemanticCacheService {
  constructor() {
    /** @type {Map<string, Array<{ query: string, vector: number[], answer: string, createdAt: number, lastAccessed: number, finalSource?: string, retrievalMode?: string }>>} */
    this._cache = new Map();
    this.maxCacheSizePerCompany = 500;
    this.maxCompanyCaches = 100;
    this.ttlMs = 15 * 60 * 1000;
  }

  _evictLeastActiveCompany() {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [companyId, entries] of this._cache) {
      const lastAccess = entries.reduce((max, e) => Math.max(max, e.lastAccessed || 0), 0);
      if (lastAccess < oldestTime) {
        oldestTime = lastAccess;
        oldest = companyId;
      }
    }
    if (oldest) this._cache.delete(oldest);
  }

  _touch(entries) {
    const now = Date.now();
    for (const entry of entries) {
      entry.lastAccessed = now;
    }
  }

  /**
   * Search for a semantically similar cached question.
   * If similarity >= 0.90, verifies database freshness before returning.
   */
  async get(companyId, query) {
    const companyCache = this._cache.get(companyId) || [];
    if (companyCache.length === 0) return null;

    const vecQuery = CorrectiveRAGEngine._localEmbedding(query);
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const entry of companyCache) {
      const similarity = CorrectiveRAGEngine._cosineSimilarity(vecQuery, entry.vector);
      if (similarity >= 0.90 && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (!bestMatch) return null;

    if (Date.now() - bestMatch.createdAt > this.ttlMs) {
      this.clear(companyId);
      return null;
    }

    // Freshness Check: Invalidate if policy/FAQ records have been updated since cache creation
    const prisma = getSharedPrismaClient();
    try {
      const [maxFaq, maxPolicy] = await Promise.all([
        prisma.faq.findFirst({
          where: { companyId, isActive: true },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
        prisma.policy.findFirst({
          where: { companyId, isActive: true },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

      const maxFaqUpdate = maxFaq?.updatedAt ? new Date(maxFaq.updatedAt).getTime() : 0;
      const maxPolicyUpdate = maxPolicy?.updatedAt ? new Date(maxPolicy.updatedAt).getTime() : 0;
      const lastDbUpdate = Math.max(maxFaqUpdate, maxPolicyUpdate);

      if (lastDbUpdate > bestMatch.createdAt) {
        // Cache is stale! Evict the company cache to ensure fresh retrieval
        this.clear(companyId);
        return null;
      }

      this._touch(companyCache);
      return {
        answer: bestMatch.answer,
        similarity: bestSimilarity,
        finalSource: bestMatch.finalSource || 'SEMANTIC_CACHE',
        retrievalMode: bestMatch.retrievalMode || 'semantic-cache',
      };
    } catch (error) {
      console.warn('[SEMANTIC-CACHE] Freshness check failed, bypassing cache:', error.message);
      return null;
    }
  }

  /**
   * Cache a new query and response. Supports both plain strings and wrapping objects.
   */
  set(companyId, query, answer) {
    if (!query || !answer) return;

    const answerText = typeof answer === 'object' ? (answer.answer || '') : String(answer);
    if (!answerText) return;

    if (!this._cache.has(companyId)) {
      if (this._cache.size >= this.maxCompanyCaches) {
        this._evictLeastActiveCompany();
      }
      this._cache.set(companyId, []);
    }

    const companyCache = this._cache.get(companyId);
    const vector = CorrectiveRAGEngine._localEmbedding(query);

    if (companyCache.length >= this.maxCacheSizePerCompany) {
      companyCache.shift();
    }

    companyCache.push({
      query,
      vector,
      answer: answerText,
      finalSource: typeof answer === 'object' ? answer.finalSource : undefined,
      retrievalMode: typeof answer === 'object' ? answer.retrievalMode : undefined,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    });
  }

  isCacheableQuery(query) {
    const text = String(query || '').toLowerCase();
    if (!text.trim()) return false;
    const customerSpecificPatterns = [
      /\b\d{5,}\b/,
      /\border\s*(status|number|#)?\b/i,
      /\bmy\s+order\b/i,
      /\u0637\u0644\u0628\u064A|\u0627\u0648\u0631\u062F\u0631|\u0631\u0642\u0645\s+\u0627\u0644\u0637\u0644\u0628|\u062A\u062A\u0628\u0639|\u0627\u0644\u063A\u0627\u0621\s+\u0627\u0644\u0637\u0644\u0628|\u0625\u0644\u063A\u0627\u0621\s+\u0627\u0644\u0637\u0644\u0628|\u0627\u0633\u062A\u0631\u062C\u0627\u0639\s+\u0641\u0644\u0648\u0633|\u0641\u0644\u0648\u0633\u064A/u,
      /refund\s+(my|order|#|\d)/i,
      /cancel\s+(my|order|#|\d)/i,
      /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/i,
      /\+?\d[\d\s-]{7,}\d/,
    ];
    return !customerSpecificPatterns.some(pattern => pattern.test(text));
  }

  isCacheableResult(ragResult, query) {
    if (!ragResult?.answer || !this.isCacheableQuery(query)) return false;
    const cacheableSources = new Set(['HYBRID_KNOWLEDGE', 'FAQ_DB', 'POLICY_DB']);
    return cacheableSources.has(ragResult.finalSource);
  }

  /**
   * Clear cache for a specific company.
   */
  clear(companyId) {
    this._cache.delete(companyId);
  }
}

module.exports = new SemanticCacheService();
