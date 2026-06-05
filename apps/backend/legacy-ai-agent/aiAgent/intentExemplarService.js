/**
 * @module intentExemplarService
 * @description Service for managing intent classification exemplars with pgvector.
 * Handles CRUD operations and similarity search for few-shot examples.
 */

const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');

function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * Generate embedding for text using Google Gemini.
 * @param {string} text - Text to embed
 * @param {string} companyId - Company ID for API key lookup
 * @returns {Promise<number[]>} Embedding vector
 */
async function generateEmbedding(text, companyId = null) {
  try {
    const episodicMemoryService = require('./episodicMemoryService');
    const embedding = await episodicMemoryService.generateEmbedding(text, companyId);
    return embedding;
  } catch (error) {
    console.error('[INTENT-EXEMPLAR] Embedding generation failed:', error.message);
    // Return deterministic pseudo-embedding as fallback
    return generateDeterministicEmbedding(text);
  }
}

/**
 * Generate deterministic pseudo-embedding for fallback.
 * @param {string} text - Text to embed
 * @returns {number[]} 768-dimensional embedding
 */
function generateDeterministicEmbedding(text) {
  const embedding = new Array(768).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % 768] += charCode / 1000;
    embedding[(i * 7 + 3) % 768] += Math.sin(charCode) * 0.1;
  }
  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (norm || 1));
}

/**
 * Calculate cosine similarity between two vectors.
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} Cosine similarity (0-1)
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

/**
 * Add a new exemplar.
 * @param {Object} params
 * @param {string} params.companyId - Company ID
 * @param {string} params.intent - Intent label
 * @param {string} params.query - Example query
 * @param {Object} params.slots - Expected slot values
 * @param {string} [params.difficulty='easy'] - Difficulty level
 * @param {string} [params.locale='ar'] - Language locale
 * @param {string} [params.channel] - Channel (FACEBOOK, WHATSAPP, etc.)
 * @param {string} [params.embeddingModel='gemini-embedding-001'] - Embedding model
 * @returns {Promise<Object>} Created exemplar
 */
async function addExemplar({
  companyId,
  intent,
  query,
  slots = {},
  difficulty = 'easy',
  locale = 'ar',
  channel = null,
  embeddingModel = 'gemini-embedding-001',
}) {
  const prisma = getPrisma();
  const embedding = await generateEmbedding(query, companyId);

  return safeQuery(async () => {
    return await prisma.intentExemplar.create({
      data: {
        companyId,
        intent,
        query,
        slotsJson: slots,
        embedding: embedding,
        embeddingModel,
        embeddingDimension: embedding.length,
        difficulty,
        locale,
        channel,
        isActive: true,
      },
    });
  });
}

/**
 * Retrieve similar exemplars for a query.
 * @param {Object} params
 * @param {string} params.query - Query to find similar examples for
 * @param {string} params.companyId - Company ID (for tenant isolation)
 * @param {number} [params.k=5] - Number of exemplars to return
 * @param {string} [params.intent] - Filter by specific intent
 * @param {string} [params.locale] - Filter by locale
 * @param {string} [params.channel] - Filter by channel
 * @returns {Promise<Object[]>} Similar exemplars with similarity scores
 */
async function retrieveExemplars({
  query,
  companyId,
  k = 5,
  intent = null,
  locale = null,
  channel = null,
}) {
  const prisma = getPrisma();
  const queryEmbedding = await generateEmbedding(query, companyId);

  // Build where clause
  const where = {
    companyId,
    isActive: true,
  };
  if (intent) where.intent = intent;
  if (locale) where.locale = locale;
  if (channel) where.channel = channel;

  // Fetch all active exemplars for the company
  const exemplars = await safeQuery(async () => {
    return await prisma.intentExemplar.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000, // Limit for performance
    });
  });

  if (!exemplars || exemplars.length === 0) {
    return [];
  }

  // Calculate similarity scores
  const scoredExemplars = exemplars.map(exemplar => {
    const exemplarEmbedding = exemplar.embedding;
    const similarity = cosineSimilarity(queryEmbedding, exemplarEmbedding);
    return {
      ...exemplar,
      similarity,
      slots: exemplar.slotsJson,
    };
  });

  // Sort by similarity and return top k
  return scoredExemplars
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Get all exemplars for a specific intent.
 * @param {string} intent - Intent label
 * @param {string} companyId - Company ID
 * @returns {Promise<Object[]>} Exemplars for the intent
 */
async function getExemplarsByIntent(intent, companyId) {
  const prisma = getPrisma();

  return safeQuery(async () => {
    return await prisma.intentExemplar.findMany({
      where: {
        companyId,
        intent,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });
}

/**
 * Update an exemplar.
 * @param {string} id - Exemplar ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated exemplar
 */
async function updateExemplar(id, updates) {
  const prisma = getPrisma();

  // If query is updated, regenerate embedding
  if (updates.query) {
    const exemplar = await safeQuery(async () => {
      return await prisma.intentExemplar.findUnique({ where: { id } });
    });
    if (exemplar) {
      updates.embedding = await generateEmbedding(updates.query, exemplar.companyId);
      updates.embeddingDimension = updates.embedding.length;
    }
  }

  return safeQuery(async () => {
    return await prisma.intentExemplar.update({
      where: { id },
      data: updates,
    });
  });
}

/**
 * Delete an exemplar (soft delete by setting isActive = false).
 * @param {string} id - Exemplar ID
 * @returns {Promise<Object>} Updated exemplar
 */
async function deleteExemplar(id) {
  const prisma = getPrisma();

  return safeQuery(async () => {
    return await prisma.intentExemplar.update({
      where: { id },
      data: { isActive: false },
    });
  });
}

/**
 * Get exemplar statistics for a company.
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Statistics
 */
async function getExemplarStats(companyId) {
  const prisma = getPrisma();

  const stats = await safeQuery(async () => {
    const total = await prisma.intentExemplar.count({
      where: { companyId, isActive: true },
    });

    const byIntent = await prisma.intentExemplar.groupBy({
      by: ['intent'],
      where: { companyId, isActive: true },
      _count: { id: true },
    });

    const byDifficulty = await prisma.intentExemplar.groupBy({
      by: ['difficulty'],
      where: { companyId, isActive: true },
      _count: { id: true },
    });

    const byLocale = await prisma.intentExemplar.groupBy({
      by: ['locale'],
      where: { companyId, isActive: true },
      _count: { id: true },
    });

    return {
      total,
      byIntent: byIntent.map(item => ({ intent: item.intent, count: item._count.id })),
      byDifficulty: byDifficulty.map(item => ({ difficulty: item.difficulty, count: item._count.id })),
      byLocale: byLocale.map(item => ({ locale: item.locale, count: item._count.id })),
    };
  });

  return stats;
}

module.exports = {
  addExemplar,
  retrieveExemplars,
  getExemplarsByIntent,
  updateExemplar,
  deleteExemplar,
  getExemplarStats,
  generateEmbedding,
  generateDeterministicEmbedding,
  cosineSimilarity,
};
