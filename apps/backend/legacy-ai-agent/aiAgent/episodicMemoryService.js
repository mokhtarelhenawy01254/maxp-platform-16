const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { normalizeGeminiEmbeddingModel, DEFAULT_GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_DIMENSIONS } = require('./geminiModelPolicy');
const aiServiceClient = require('./agentAiServiceClient');
const embeddingCacheService = require('./embeddingCacheService');

const EMBEDDING_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

class EpisodicMemoryService {
  constructor() {
    this.prisma = null;
    this._configCache = null;
    this._configCacheTs = 0;
    this._embeddingFailureState = {};
  }

  _getPrisma() {
    if (!this.prisma) this.prisma = getSharedPrismaClient();
    return this.prisma;
  }

  /**
   * Loads embedding configuration from GlobalAiConfig.settings.
   * Caches for 60 seconds to avoid repeated DB reads.
   */
  async _loadEmbeddingConfig() {
    const now = Date.now();
    if (this._configCache && now - this._configCacheTs < 60000) {
      return this._configCache;
    }

    try {
      const prisma = this._getPrisma();
      const config = await prisma.globalAiConfig.findFirst();
      if (!config?.settings) {
        this._configCache = this._getDefaultConfig();
        this._configCacheTs = now;
        return this._configCache;
      }

      const settings = typeof config.settings === 'string'
        ? JSON.parse(config.settings)
        : config.settings;

      const embedding = settings.embedding || {};
      const model = normalizeGeminiEmbeddingModel(embedding.model) || DEFAULT_GEMINI_EMBEDDING_MODEL;
      const allowedDimensions = GEMINI_EMBEDDING_DIMENSIONS[model]?.options || [768, 1536, 3072];
      const requestedDimension = Number(embedding.dimension);
      const dimension = allowedDimensions.includes(requestedDimension)
        ? requestedDimension
        : (GEMINI_EMBEDDING_DIMENSIONS[model]?.default || 768);
      const aiKeyId = embedding.aiKeyId || null;

      this._configCache = {
        model,
        dimension,
        aiKeyId,
        mode: embedding.mode || 'SYSTEM_DEFAULT',
      };
      this._configCacheTs = now;
      return this._configCache;
    } catch (e) {
      console.warn('[EPISODIC-MEMORY] Failed to load embedding config, using defaults:', e.message);
      this._configCache = this._getDefaultConfig();
      this._configCacheTs = now;
      return this._configCache;
    }
  }

  _getDefaultConfig() {
    return {
      model: DEFAULT_GEMINI_EMBEDDING_MODEL,
      dimension: 768,
      aiKeyId: null,
      mode: 'SYSTEM_DEFAULT',
    };
  }

  /**
   * Invalidates the config cache (call after settings update).
   */
  invalidateConfigCache() {
    this._configCache = null;
    this._configCacheTs = 0;
  }

  _normalizeEmbeddingOptions(options = {}) {
    return {
      allowPseudoFallback: options.allowPseudoFallback !== false,
      context: options.context || 'general',
      requiredModel: options.requiredModel ? normalizeGeminiEmbeddingModel(options.requiredModel) : null,
      requiredDimension: options.requiredDimension ? Number(options.requiredDimension) : null,
    };
  }

  _resolveEmbeddingConfigForRequest(config, options) {
    const model = options.requiredModel || config.model;
    const allowedDimensions = GEMINI_EMBEDDING_DIMENSIONS[model]?.options || [768, 1536, 3072];
    const dimension = allowedDimensions.includes(options.requiredDimension)
      ? options.requiredDimension
      : config.dimension;

    return {
      ...config,
      model,
      dimension: allowedDimensions.includes(dimension)
        ? dimension
        : (GEMINI_EMBEDDING_DIMENSIONS[model]?.default || 768),
    };
  }

  _recordEmbeddingFailure(config, options, reason, details = {}) {
    const key = `${config.model}:${config.dimension}:${options.context}`;
    const previous = this._embeddingFailureState[key] || { consecutiveFailures: 0 };
    const consecutiveFailures = previous.consecutiveFailures + 1;
    this._embeddingFailureState[key] = {
      consecutiveFailures,
      lastReason: reason,
      lastAt: Date.now(),
    };

    const payload = {
      provider: 'GOOGLE',
      model: config.model,
      dimension: config.dimension,
      context: options.context,
      reason,
      repeated: consecutiveFailures > 1,
      consecutiveFailures,
      fallback: options.allowPseudoFallback ? 'PSEUDO_EMBEDDING' : 'DISABLED_VECTOR_SEARCH',
      ...details,
    };

    const shouldLog = consecutiveFailures <= 2 || consecutiveFailures % 10 === 0;
    if (!shouldLog) return;

    console.error(
      consecutiveFailures > 1
        ? '[EPISODIC-MEMORY] Repeated Gemini Embedding 2 failure'
        : '[EPISODIC-MEMORY] Gemini Embedding 2 failure',
      payload
    );
  }

  _recordEmbeddingSuccess(config, options) {
    const key = `${config.model}:${config.dimension}:${options.context}`;
    delete this._embeddingFailureState[key];
  }

  getEmbeddingFailureSnapshot({ model, dimension, contexts = [] } = {}) {
    const allowedContexts = new Set((contexts || []).filter(Boolean));
    const snapshots = Object.entries(this._embeddingFailureState || {})
      .map(([key, state]) => {
        const [stateModel, rawDimension, ...contextParts] = key.split(':');
        const context = contextParts.join(':');
        return {
          model: stateModel,
          dimension: Number(rawDimension),
          context,
          reason: state.lastReason || 'UNKNOWN',
          consecutiveFailures: Number(state.consecutiveFailures) || 0,
          repeated: Number(state.consecutiveFailures) > 1,
          lastAt: state.lastAt ? new Date(state.lastAt).toISOString() : null,
        };
      })
      .filter((snapshot) => {
        if (model && snapshot.model !== model) return false;
        if (dimension && snapshot.dimension !== Number(dimension)) return false;
        if (allowedContexts.size > 0 && !allowedContexts.has(snapshot.context)) return false;
        return snapshot.consecutiveFailures > 0;
      })
      .sort((a, b) => Date.parse(b.lastAt || '') - Date.parse(a.lastAt || ''));

    return snapshots[0] || null;
  }

  _validateEmbeddingValues(values, config, options) {
    if (!Array.isArray(values)) return null;
    if (values.length === config.dimension) return values;

    if (!options.allowPseudoFallback) {
      this._recordEmbeddingFailure(config, options, 'GEMINI_EMBEDDING_DIMENSION_MISMATCH', {
        expectedDimension: config.dimension,
        actualDimension: values.length,
      });
      return null;
    }

    console.warn(
      `[EPISODIC-MEMORY] Embedding dimension mismatch: expected ${config.dimension}, got ${values.length}; falling back to pseudo-embeddings`
    );
    return null;
  }

  /**
   * Generates a deterministic pseudo-embedding from text.
   * Used as fallback when no API key is available.
   * @param {string} text
   * @param {number} dims - output dimensions (default 768)
   * @returns {number[]} dimensional vector
   */
  generateEmbedding(text, dims = 768) {
    const vec = new Array(dims).fill(0);
    if (!text) return vec;
    const normalized = text.toLowerCase().trim();
    for (let i = 0; i < normalized.length; i++) {
      const idx = (normalized.charCodeAt(i) * (i + 1)) % dims;
      vec[idx] += 1.0 / (1 + i * 0.1);
    }
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / mag);
  }

  /**
   * Fetches the active Google/Gemini API key for embeddings.
   * Respects the embedding-specific aiKeyId from settings if set.
   */
  async getGeminiApiKey() {
    try {
      const prisma = this._getPrisma();
      const config = await this._loadEmbeddingConfig();

      if (config.aiKeyId && config.mode === 'SPECIFIC_KEY') {
        const key = await prisma.aiKey.findUnique({
          where: { id: config.aiKeyId },
          select: { apiKey: true, isActive: true }
        });
        if (key?.isActive && key.apiKey) return key.apiKey;
      }

      const aiKey = await prisma.aiKey.findFirst({
        where: {
          isActive: true,
          provider: 'GOOGLE'
        }
      });
      if (aiKey?.apiKey) return aiKey.apiKey;
    } catch (_) {}
    return process.env.GEMINI_API_KEY || null;
  }

  /**
   * Generates production-grade Google Text Embedding if API key is active.
   * Gracefully falls back to deterministic pseudo-embeddings on error.
   */
  async generateEmbeddingAsync(text, options = {}) {
    const config = await this._loadEmbeddingConfig();
    const embeddingOptions = this._normalizeEmbeddingOptions(options);
    const requestConfig = this._resolveEmbeddingConfigForRequest(config, embeddingOptions);
    const dimension = requestConfig.dimension;
    const model = requestConfig.model;

    // Try embedding cache first
    const cached = await embeddingCacheService.get({ text, model, dimension });
    if (cached && Array.isArray(cached.vector) && cached.vector.length === dimension) {
      this._recordEmbeddingSuccess(requestConfig, embeddingOptions);
      return cached.vector;
    }

    // Delegate to Python AI service if running in primary mode
    if (aiServiceClient.isAiServicePrimary()) {
      try {
        const result = await aiServiceClient.generateEmbedding(text, dimension);
        if (result && Array.isArray(result) && result.length > 0) {
          this._recordEmbeddingSuccess(requestConfig, embeddingOptions);
          await embeddingCacheService.set({ text, model, dimension, vector: result });
          return result;
        }
      } catch (e) {
        console.warn('[EPISODIC-MEMORY] AI service embedding failed, trying Gemini API:', e.message);
      }
    }

    // Try Gemini REST API directly using configured API key
    try {
      const apiKey = await this.getGeminiApiKey();
      if (apiKey) {
        const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
        const url = `${EMBEDDING_API_BASE}/${model}:embedContent`;
        const response = await fetchFn(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            outputDimensionality: dimension,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const values = data?.embedding?.values;
          const validated = this._validateEmbeddingValues(values, requestConfig, embeddingOptions);
          if (validated) {
            this._recordEmbeddingSuccess(requestConfig, embeddingOptions);
            await embeddingCacheService.set({ text, model, dimension, vector: validated });
            return validated;
          }
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }
      }
    } catch (e) {
      this._recordEmbeddingFailure(requestConfig, embeddingOptions, 'GEMINI_API_ERROR', { error: e.message });
      console.warn('[EPISODIC-MEMORY] Gemini embedding API failed, falling back:', e.message);
    }

    if (!embeddingOptions.allowPseudoFallback) {
      this._recordEmbeddingFailure(requestConfig, embeddingOptions, 'NO_FALLBACK_ALLOWED');
      return null;
    }

    return this.generateEmbedding(text, dimension);
  }

  /**
   * Generates multimodal embedding (text + optional image).
   * Only works with gemini-embedding-2 models.
   */
  async generateMultimodalEmbeddingAsync(content, options = {}) {
    const config = await this._loadEmbeddingConfig();
    const embeddingOptions = this._normalizeEmbeddingOptions(options);
    const requestConfig = this._resolveEmbeddingConfigForRequest(config, embeddingOptions);
    const dimension = requestConfig.dimension;
    const model = requestConfig.model;

    let base64Image = null;
    if (content.imageBytes) {
      base64Image = Buffer.isBuffer(content.imageBytes)
        ? content.imageBytes.toString('base64')
        : content.imageBytes;
    }

    // Try embedding cache first
    const cached = await embeddingCacheService.get({
      text: content.text || '',
      model,
      dimension,
      imageBytes: base64Image,
      mimeType: content.mimeType || null,
    });
    if (cached && Array.isArray(cached.vector) && cached.vector.length === dimension) {
      this._recordEmbeddingSuccess(requestConfig, embeddingOptions);
      return cached.vector;
    }

    // Delegate to Python AI service if running in primary mode
    if (aiServiceClient.isAiServicePrimary()) {
      try {
        const result = await aiServiceClient.generateEmbedding(
          content.text || null,
          dimension,
          base64Image,
          content.mimeType || null
        );
        if (result && Array.isArray(result) && result.length > 0) {
          this._recordEmbeddingSuccess(requestConfig, embeddingOptions);
          await embeddingCacheService.set({
            text: content.text || '',
            model,
            dimension,
            imageBytes: base64Image,
            mimeType: content.mimeType || null,
            vector: result,
          });
          return result;
        }
      } catch (e) {
        console.warn('[EPISODIC-MEMORY] AI service multimodal embedding failed, trying Gemini API:', e.message);
      }
    }

    // Try Gemini REST API directly for multimodal embedding
    try {
      const apiKey = await this.getGeminiApiKey();
      if (apiKey) {
        const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
        const url = `${EMBEDDING_API_BASE}/${model}:embedContent`;

        const parts = [];
        if (content.text) parts.push({ text: content.text });
        if (base64Image) {
          parts.push({
            inline_data: {
              mime_type: content.mimeType || 'image/jpeg',
              data: base64Image,
            },
          });
        }

        const response = await fetchFn(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts },
            outputDimensionality: dimension,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const values = data?.embedding?.values;
          const validated = this._validateEmbeddingValues(values, requestConfig, embeddingOptions);
          if (validated) {
            this._recordEmbeddingSuccess(requestConfig, embeddingOptions);
            await embeddingCacheService.set({
              text: content.text || '',
              model,
              dimension,
              imageBytes: base64Image,
              mimeType: content.mimeType || null,
              vector: validated,
            });
            return validated;
          }
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Gemini API error ${response.status}: ${errorText}`);
        }
      }
    } catch (e) {
      this._recordEmbeddingFailure(requestConfig, embeddingOptions, 'GEMINI_API_ERROR', { error: e.message });
      console.warn('[EPISODIC-MEMORY] Gemini multimodal embedding API failed, falling back:', e.message);
    }

    if (!embeddingOptions.allowPseudoFallback) {
      this._recordEmbeddingFailure(requestConfig, embeddingOptions, 'NO_FALLBACK_ALLOWED');
      return null;
    }

    return this.generateEmbedding(content.text || '', dimension);
  }

  /**
   * Stores an episodic memory entry.
   */
  async storeEpisode(companyId, customerId, content, metadata = {}) {
    const prisma = this._getPrisma();
    const embedding = await this.generateEmbeddingAsync(content);
    
    const storedMetadata = {
      ...metadata,
      _embedding: embedding
    };

    const fact = await prisma.agenticMemoryFact.create({
      data: {
        companyId,
        customerId,
        type: 'EPISODIC',
        content,
        confidence: 1.0,
        importance: 3,
        metadata: JSON.stringify(storedMetadata)
      }
    });

    return {
      id: fact.id,
      companyId: fact.companyId,
      customerId: fact.customerId,
      content: fact.content,
      embedding,
      metadata,
      timestamp: fact.createdAt
    };
  }

  /**
   * Searches for similar episodes using cosine similarity.
   * HARD tenant isolation: filters by companyId AND customerId.
   * Fetches a limited candidate pool (topK × 10) to avoid loading all records.
   */
  async searchSimilar(companyId, customerId, queryText, topK = 5) {
    const prisma = this._getPrisma();
    const queryVec = await this.generateEmbeddingAsync(queryText);
    const fetchLimit = Math.max(topK * 10, 50);

    const facts = await prisma.agenticMemoryFact.findMany({
      where: {
        companyId,
        customerId,
        type: 'EPISODIC'
      },
      take: fetchLimit,
      orderBy: { createdAt: 'desc' }
    });

    const scored = facts.map(fact => {
      let meta = {};
      let embedding = [];
      try {
        meta = JSON.parse(fact.metadata || '{}');
        embedding = meta._embedding || [];
        delete meta._embedding;
      } catch (e) {}

      return {
        id: fact.id,
        companyId: fact.companyId,
        customerId: fact.customerId,
        content: fact.content,
        embedding,
        metadata: meta,
        timestamp: fact.createdAt,
        similarity: embedding.length ? this.cosineSimilarity(queryVec, embedding) : 0
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  /**
   * Cosine similarity between two vectors.
   */
  cosineSimilarity(vecA, vecB) {
    let dot = 0, magA = 0, magB = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  async deleteCustomerEpisodes(companyId, customerId) {
    const prisma = this._getPrisma();
    const result = await prisma.agenticMemoryFact.deleteMany({
      where: {
        companyId,
        customerId,
        type: 'EPISODIC'
      }
    });
    return result.count;
  }

  async getEpisodeCount(companyId) {
    const prisma = this._getPrisma();
    return prisma.agenticMemoryFact.count({
      where: {
        companyId,
        type: 'EPISODIC'
      }
    });
  }

  /** Reset store (for testing) */
  async _reset() {
    this._embeddingFailureState = {};
    const prisma = this._getPrisma();
    await prisma.agenticMemoryFact.deleteMany({
      where: {
        type: 'EPISODIC'
      }
    });
  }
}

module.exports = new EpisodicMemoryService();
