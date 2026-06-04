/**
 * @module productSemanticSearchService
 * @description Hybrid semantic search service for products using vector + pg_trgm similarity.
 */

const { getSharedPrismaClient } = require('../../sharedDatabase');
const episodicMemoryService = require('../episodicMemoryService');
const { buildProductSearchCandidates } = require('./productSearchQueryService');

/**
 * Perform a hybrid semantic search for products.
 * Combines Google Gemini embeddings (multimodal or text) and pg_trgm text similarity.
 * 
 * @param {string} companyId - Tenant scoping ID
 * @param {string} queryText - User's search query (text description or name)
 * @param {object} [options] - Additional parameters
 * @param {Buffer|string} [options.imageBytes] - Optional image buffer/base64 for multimodal search
 * @param {string} [options.mimeType] - Mime type of the image
 * @param {number} [options.limit=10] - Max results to return
 * @returns {Promise<Array>} Array of matched products with search scores
 */
async function searchProducts(companyId, queryText = '', options = {}) {
  const prisma = getSharedPrismaClient();
  const limit = options.limit || 10;
  const cleanQuery = String(queryText || '').trim();

  // 1. Generate query embedding (multimodal if image is supplied, otherwise text)
  let queryEmbedding = null;
  if (options.imageBytes) {
    try {
      console.log('[SEMANTIC-SEARCH] Generating multimodal embedding for search...');
      queryEmbedding = await episodicMemoryService.generateMultimodalEmbeddingAsync({
        text: cleanQuery,
        imageBytes: options.imageBytes,
        mimeType: options.mimeType || 'image/jpeg'
      });
    } catch (e) {
      console.warn('[SEMANTIC-SEARCH] Multimodal embedding generation failed:', e.message);
    }
  }

  // Fall back to text embedding if multimodal failed or wasn't requested
  if (!queryEmbedding && cleanQuery) {
    try {
      queryEmbedding = await episodicMemoryService.generateEmbeddingAsync(cleanQuery);
    } catch (e) {
      console.warn('[SEMANTIC-SEARCH] Text embedding generation failed:', e.message);
    }
  }

  // If we still don't have an embedding (e.g. empty query), use a zero vector
  if (!queryEmbedding) {
    queryEmbedding = new Array(768).fill(0);
  }

  if (typeof prisma.$queryRaw !== 'function') {
    return fallBackSearch(companyId, cleanQuery, limit);
  }

  // 2. Perform the hybrid query on PostgreSQL.
  // We use:
  // - dot_product: cosine similarity since embeddings are normalized (0.6 weight)
  // - similarity(name): pg_trgm trigram similarity (0.3 weight)
  // - exact/contains match: exact case-insensitive matches for name/sku (0.1 weight)
  try {
    const results = await prisma.$queryRaw`
      SELECT id, name, description, sku, price, "comparePrice", cost, images, "mainImage", stock, "trackInventory", tags, metadata, "companyId", "createdAt", "updatedAt",
             COALESCE(dot_product(embedding_array, ${queryEmbedding}::double precision[]), 0) AS "vectorScore",
             (
               0.6 * COALESCE(similarity(name, ${cleanQuery}), 0) +
               0.2 * COALESCE(similarity(COALESCE(tags, ''), ${cleanQuery}), 0) +
               0.2 * COALESCE(similarity(COALESCE(description, ''), ${cleanQuery}), 0)
             ) AS "textSimilarity",
             (CASE WHEN name ILIKE ${'%' + cleanQuery + '%'} OR sku ILIKE ${cleanQuery} OR COALESCE(tags, '') ILIKE ${'%' + cleanQuery + '%'} THEN 1.0 ELSE 0.0 END) AS "exactMatch"
      FROM products
      WHERE "companyId" = ${companyId}
        AND "isActive" = true
        AND "deletedAt" IS NULL
      ORDER BY (
        0.6 * COALESCE(dot_product(embedding_array, ${queryEmbedding}::double precision[]), 0) + 
        0.3 * (
          0.6 * COALESCE(similarity(name, ${cleanQuery}), 0) +
          0.2 * COALESCE(similarity(COALESCE(tags, ''), ${cleanQuery}), 0) +
          0.2 * COALESCE(similarity(COALESCE(description, ''), ${cleanQuery}), 0)
        ) + 
        0.1 * (CASE WHEN name ILIKE ${'%' + cleanQuery + '%'} OR sku ILIKE ${cleanQuery} OR COALESCE(tags, '') ILIKE ${'%' + cleanQuery + '%'} THEN 1.0 ELSE 0.0 END)
      ) DESC
      LIMIT ${limit};
    `;

    // 3. Map and format results
    return results.map(row => {
      // Calculate combined search score
      const combinedScore = (0.6 * Number(row.vectorScore)) + 
                            (0.3 * Number(row.textSimilarity)) + 
                            (0.1 * Number(row.exactMatch));

      return {
        ...row,
        // Convert Decimal prices to numbers
        price: row.price ? Number(row.price) : 0,
        comparePrice: row.comparePrice ? Number(row.comparePrice) : null,
        cost: row.cost ? Number(row.cost) : null,
        searchScore: combinedScore,
        vectorScore: Number(row.vectorScore),
        textSimilarity: Number(row.textSimilarity)
      };
    });
  } catch (err) {
    console.error('[SEMANTIC-SEARCH] SQL query error:', err.message);
    // If raw query fails (e.g. extension/function missing), fall back to basic Prisma search
    return fallBackSearch(companyId, cleanQuery, limit);
  }
}

/**
 * Basic fallback search using standard prisma contains/LIKE syntax.
 */
async function fallBackSearch(companyId, queryText, limit) {
  const prisma = getSharedPrismaClient();
  const candidates = buildProductSearchCandidates(queryText);
  const or = [];
  for (const candidate of candidates) {
    or.push({ name: { contains: candidate, mode: 'insensitive' } });
    or.push({ sku: { contains: candidate, mode: 'insensitive' } });
    or.push({ tags: { contains: candidate, mode: 'insensitive' } });
  }

  let products = [];
  if (typeof prisma.product.findMany === 'function') {
    products = await prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
        OR: or.length ? or : [{ name: { contains: queryText, mode: 'insensitive' } }]
      },
      take: limit
    });
  } else if (typeof prisma.product.findFirst === 'function') {
    const single = await prisma.product.findFirst({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
        OR: or.length ? or : [{ name: { contains: queryText, mode: 'insensitive' } }]
      }
    });
    products = single ? [single] : [];
  }

  return products.map(p => ({
    ...p,
    price: p.price ? Number(p.price) : 0,
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    cost: p.cost ? Number(p.cost) : null,
    searchScore: 0.5,
    vectorScore: 0,
    textSimilarity: 0.5
  }));
}

module.exports = {
  searchProducts
};
