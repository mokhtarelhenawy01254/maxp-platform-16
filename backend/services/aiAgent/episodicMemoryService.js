const { getSharedPrismaClient } = require('../sharedDatabase');
const { normalizeGeminiEmbeddingModel, DEFAULT_GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_DIMENSIONS } = require('./geminiModelPolicy');

const EMBEDDING_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

class EpisodicMemoryService {
  constructor() {
    this.prisma = null;
    this._configCache = null;
    this._configCacheTs = 0;
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
      const dimension = Number(embedding.dimension) || GEMINI_EMBEDDING_DIMENSIONS[model]?.default || 768;
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
  async generateEmbeddingAsync(text) {
    const config = await this._loadEmbeddingConfig();
    const model = config.model;
    const dimension = config.dimension;

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
            content: {
              parts: [{ text }]
            },
            outputDimensionality: dimension,
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.embedding?.values) {
            return data.embedding.values;
          }
        }

        const errorText = await response.text().catch(() => '');
        console.warn(`[EPISODIC-MEMORY] Embedding API returned ${response.status}: ${errorText}`);
      }
    } catch (e) {
      console.warn('[EPISODIC-MEMORY] Google Embeddings API failed, falling back to pseudo-embeddings:', e.message);
    }

    return this.generateEmbedding(text, dimension);
  }

  /**
   * Generates multimodal embedding (text + optional image).
   * Only works with gemini-embedding-2 models.
   */
  async generateMultimodalEmbeddingAsync(content) {
    const config = await this._loadEmbeddingConfig();
    const model = config.model;
    const dimension = config.dimension;

    if (!model.includes('embedding-2')) {
      if (content.text) return this.generateEmbeddingAsync(content.text);
      return this.generateEmbedding(content.text || '', dimension);
    }

    try {
      const apiKey = await this.getGeminiApiKey();
      if (!apiKey) return this.generateEmbedding(content.text || '', dimension);

      const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
      const parts = [];

      if (content.text) {
        parts.push({ text: content.text });
      }

      if (content.imageBytes) {
        parts.push({
          inlineData: {
            mimeType: content.mimeType || 'image/jpeg',
            data: Buffer.isBuffer(content.imageBytes)
              ? content.imageBytes.toString('base64')
              : content.imageBytes
          }
        });
      }

      if (parts.length === 0) return this.generateEmbedding('', dimension);

      const url = `${EMBEDDING_API_BASE}/${model}:embedContent`;
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
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.embedding?.values) {
          return data.embedding.values;
        }
      }
    } catch (e) {
      console.warn('[EPISODIC-MEMORY] Multimodal embedding failed, falling back:', e.message);
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
   */
  async searchSimilar(companyId, customerId, queryText, topK = 5) {
    const prisma = this._getPrisma();
    const queryVec = await this.generateEmbeddingAsync(queryText);

    const facts = await prisma.agenticMemoryFact.findMany({
      where: {
        companyId,
        customerId,
        type: 'EPISODIC'
      }
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
    const prisma = this._getPrisma();
    await prisma.agenticMemoryFact.deleteMany({
      where: {
        type: 'EPISODIC'
      }
    });
  }
}

module.exports = new EpisodicMemoryService();
