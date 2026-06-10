/**
 * @module DbVectorAdaptor
 * @description Unified vector search adaptor with auto-detection.
 * Detects whether pgvector extension is available and selects the optimal
 * search strategy. Falls back to native PL/pgSQL dot_product function
 * when pgvector is not installed (e.g., Windows local dev).
 * 
 * Solves ISSUE #6: Vector Math Implementation
 */

const { getSharedPrismaClient } = require('../../../services/sharedDatabase');
const { getColorSearchTerms } = require('./productAttributeCanonicalizer');

function escapeRegex(str) {
  return str.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function isNativeVectorSchemaUnavailable(err) {
  const message = String(err?.message || '');
  return (
    message.includes('embedding_array') ||
    message.includes('embedding_image_array') ||
    message.includes('dot_product')
  );
}

function shiftSqlParameterIndexes(sql, delta) {
  return String(sql || '').replace(/\$(\d+)/g, (_, index) => `$${Number(index) + delta}`);
}

/** @type {'pgvector' | 'native' | null} */
let _detectedBackend = null;
let _detectionPromise = null;

/**
 * Detect available vector backend. Runs once and caches.
 * @returns {Promise<'pgvector' | 'native'>}
 */
async function detectBackend() {
  if (_detectedBackend) return _detectedBackend;
  if (_detectionPromise) return _detectionPromise;

  _detectionPromise = (async () => {
    const prisma = getSharedPrismaClient();
    try {
      // Check if pgvector extension is installed and available
      const result = await prisma.$queryRaw`
        SELECT 1 FROM pg_available_extensions 
        WHERE name = 'vector' AND installed_version IS NOT NULL
        LIMIT 1;
      `;
      if (result && result.length > 0) {
        _detectedBackend = 'pgvector';
        console.log('[DB-VECTOR-ADAPTOR] pgvector extension detected - using native operators');
      } else {
        _detectedBackend = 'native';
        console.log('[DB-VECTOR-ADAPTOR] pgvector not available - using PL/pgSQL dot_product fallback');
      }
    } catch (err) {
      _detectedBackend = 'native';
      console.log('[DB-VECTOR-ADAPTOR] Detection query failed, using PL/pgSQL fallback:', err.message);
    }
    return _detectedBackend;
  })();

  return _detectionPromise;
}

/**
 * Perform a hybrid vector + text search against the products table.
 * Dynamically selects the SQL based on available backend.
 * 
 * @param {string} companyId - Tenant ID
 * @param {number[]} queryEmbedding - Query embedding vector (768-dim)
 * @param {string} queryText - Clean query text for trigram similarity
 * @param {object} options
 * @param {number} [options.limit=10] - Max results
 * @param {object} [options.weights] - Dynamic weights { vector, text, exact }
 * @param {object} [options.filters] - SQL-level filters { color, size, categoryId, minPrice, maxPrice }
 * @returns {Promise<Array>} Raw search results from DB
 */
async function hybridSearch(companyId, queryEmbedding, queryText, options = {}) {
  const prisma = getSharedPrismaClient();
  const backend = await detectBackend();
  const limit = options.limit || 10;
  const weights = {
    vector: options.weights?.vector ?? 0.6,
    text: options.weights?.text ?? 0.3,
    exact: options.weights?.exact ?? 0.1,
  };

  // Build the WHERE clause additions for filters
  const filterClauses = [];
  const dynamicParams = [];
  let nextParamIndex = 6; // $1 to $5 are pre-allocated for standard search parameters

  if (options.filters?.categoryId) {
    filterClauses.push(`AND "categoryId" = $${nextParamIndex}`);
    dynamicParams.push(options.filters.categoryId);
    nextParamIndex++;
  }

  // Price range filters
  if (options.filters?.minPrice !== undefined && options.filters?.minPrice !== null) {
    filterClauses.push(`AND price >= $${nextParamIndex}`);
    dynamicParams.push(Number(options.filters.minPrice));
    nextParamIndex++;
  }
  if (options.filters?.maxPrice !== undefined && options.filters?.maxPrice !== null) {
    filterClauses.push(`AND price <= $${nextParamIndex}`);
    dynamicParams.push(Number(options.filters.maxPrice));
    nextParamIndex++;
  }

  // Color variant pre-filtering using terms derived from the model-extracted slot
  if (options.filters?.color) {
    const patterns = getColorSearchTerms(options.filters.color);
    const regexPattern = patterns.map(p => escapeRegex(p)).join('|');

    filterClauses.push(`
      AND EXISTS (
        SELECT 1 FROM product_variants pv 
        WHERE pv."productId" = products.id 
          AND pv."isActive" = true 
          AND (pv.stock > 0 OR pv."trackInventory" = false)
          AND (pv.name ~* $${nextParamIndex} OR pv.metadata ~* $${nextParamIndex})
      )
    `);
    dynamicParams.push(regexPattern);
    nextParamIndex++;
  }

  // Size variant pre-filtering
  if (options.filters?.size) {
    filterClauses.push(`
      AND EXISTS (
        SELECT 1 FROM product_variants pv 
        WHERE pv."productId" = products.id 
          AND pv."isActive" = true 
          AND (pv.stock > 0 OR pv."trackInventory" = false)
          AND (pv.name ILIKE $${nextParamIndex} OR pv.metadata ILIKE $${nextParamIndex})
      )
    `);
    dynamicParams.push(`%${options.filters.size}%`);
    nextParamIndex++;
  }

  // Product IDs pre-filtering (for multi-turn pronoun reference resolution)
  if (options.filters?.productIds && Array.isArray(options.filters.productIds) && options.filters.productIds.length > 0) {
    filterClauses.push(`AND products.id = ANY($${nextParamIndex}::text[])`);
    dynamicParams.push(options.filters.productIds);
    nextParamIndex++;
  }

  const extraWhere = filterClauses.join(' ');
  const cleanQuery = String(queryText || '').trim();
  const likeQuery = `%${cleanQuery}%`;

  try {
    if (backend === 'pgvector') {
      return await _pgvectorSearch(prisma, companyId, queryEmbedding, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams);
    } else {
      return await _nativeSearch(prisma, companyId, queryEmbedding, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams);
    }
  } catch (err) {
    if (backend === 'native' && isNativeVectorSchemaUnavailable(err)) {
      console.warn('[DB-VECTOR-ADAPTOR] native vector schema unavailable - using text-only fallback:', err.message);
      try {
        return await _textOnlySearch(prisma, companyId, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams);
      } catch (fallbackErr) {
        console.error('[DB-VECTOR-ADAPTOR] text-only fallback failed:', fallbackErr.message);
        return [];
      }
    }

    console.error(`[DB-VECTOR-ADAPTOR] ${backend} search failed:`, err.message);
    // If pgvector fails, try native fallback
    if (backend === 'pgvector') {
      console.warn('[DB-VECTOR-ADAPTOR] Falling back to native search...');
      _detectedBackend = 'native';
      try {
        return await _nativeSearch(prisma, companyId, queryEmbedding, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams);
      } catch (fallbackErr) {
        if (isNativeVectorSchemaUnavailable(fallbackErr)) {
          console.warn('[DB-VECTOR-ADAPTOR] native vector schema unavailable after pgvector failure - using text-only fallback:', fallbackErr.message);
          try {
            return await _textOnlySearch(prisma, companyId, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams);
          } catch (textFallbackErr) {
            console.error('[DB-VECTOR-ADAPTOR] text-only fallback failed:', textFallbackErr.message);
            return [];
          }
        }
        console.error('[DB-VECTOR-ADAPTOR] Native fallback also failed:', fallbackErr.message);
        return [];
      }
    }
    return [];
  }
}

/**
 * pgvector search using native <=> cosine distance operator.
 */
async function _pgvectorSearch(prisma, companyId, queryEmbedding, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams = []) {
  // pgvector uses embedding column (stored as vector type)
  // cosine distance: 1 - (a <=> b) gives similarity
  const sql = `
    SELECT id, name, description, sku, price, "comparePrice", cost, images, "mainImage", 
           stock, "trackInventory", tags, metadata, "companyId", "categoryId",
           "isFeatured", "createdAt", "updatedAt",
           (1 - (embedding::vector <=> $1::vector)) AS "vectorScore",
           (
             0.6 * COALESCE(similarity(name, $2), 0) +
             0.2 * COALESCE(similarity(COALESCE(tags, ''), $2), 0) +
             0.2 * COALESCE(similarity(COALESCE(description, ''), $2), 0)
           ) AS "textSimilarity",
           (CASE WHEN name ILIKE $3 OR sku ILIKE $2 OR COALESCE(tags, '') ILIKE $3 THEN 1.0 ELSE 0.0 END) AS "exactMatch"
     FROM products
     WHERE "companyId" = $4
       AND "isActive" = true
       AND "deletedAt" IS NULL
       ${extraWhere}
     ORDER BY (
       ${weights.vector} * (1 - (embedding::vector <=> $1::vector)) +
       ${weights.text} * (
         0.6 * COALESCE(similarity(name, $2), 0) +
         0.2 * COALESCE(similarity(COALESCE(tags, ''), $2), 0) +
         0.2 * COALESCE(similarity(COALESCE(description, ''), $2), 0)
       ) +
       ${weights.exact} * (CASE WHEN name ILIKE $3 OR sku ILIKE $2 OR COALESCE(tags, '') ILIKE $3 THEN 1.0 ELSE 0.0 END)
     ) DESC
     LIMIT $5;
  `;
  
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const params = [embeddingStr, cleanQuery, likeQuery, companyId, limit, ...dynamicParams];
  return await prisma.$queryRawUnsafe(sql, ...params);
}

/**
 * Text-only fallback search using pg_trgm similarity (no vector component).
 * Used when pgvector is unavailable. Params: $1=cleanQuery, $2=likeQuery, $3=companyId, $4=limit.
 * Note: dynamicParams filter clauses use $6+ offsets (from the pgvector 5-param layout),
 * so filtered fallback searches will be incorrect — acceptable since pgvector is the primary path.
 */
async function _textOnlySearch(prisma, companyId, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams = []) {
  const remappedWhere = shiftSqlParameterIndexes(extraWhere, -1);
  const sql = `
    SELECT id, name, description, sku, price, "comparePrice", cost, images, "mainImage",
           stock, "trackInventory", tags, metadata, "companyId", "categoryId",
           "isFeatured", "createdAt", "updatedAt",
           0 AS "vectorScore",
           (
             0.6 * COALESCE(similarity(name, $1), 0) +
             0.2 * COALESCE(similarity(COALESCE(tags, ''), $1), 0) +
             0.2 * COALESCE(similarity(COALESCE(description, ''), $1), 0)
           ) AS "textSimilarity",
           (CASE WHEN name ILIKE $2 OR sku ILIKE $1 OR COALESCE(tags, '') ILIKE $2 THEN 1.0 ELSE 0.0 END) AS "exactMatch"
    FROM products
    WHERE "companyId" = $3
      AND "isActive" = true
      AND "deletedAt" IS NULL
      ${remappedWhere}
    ORDER BY (
      ${weights.text} * (
        0.6 * COALESCE(similarity(name, $1), 0) +
        0.2 * COALESCE(similarity(COALESCE(tags, ''), $1), 0) +
        0.2 * COALESCE(similarity(COALESCE(description, ''), $1), 0)
      ) +
      ${weights.exact} * (CASE WHEN name ILIKE $2 OR sku ILIKE $1 OR COALESCE(tags, '') ILIKE $2 THEN 1.0 ELSE 0.0 END)
    ) DESC
    LIMIT $4;
  `;

  const params = [cleanQuery, likeQuery, companyId, limit, ...dynamicParams];
  return await prisma.$queryRawUnsafe(sql, ...params);
}

/**
 * Native PL/pgSQL search using custom dot_product function with double precision[].
 */
async function _nativeSearch(prisma, companyId, queryEmbedding, cleanQuery, likeQuery, weights, limit, extraWhere, dynamicParams = []) {
  const remappedWhere = shiftSqlParameterIndexes(extraWhere, -1);
  const sql = `
    SELECT id, name, description, sku, price, "comparePrice", cost, images, "mainImage",
           stock, "trackInventory", tags, metadata, "companyId", "categoryId",
           "isFeatured", "createdAt", "updatedAt",
           0.0 AS "vectorScore",
           (
             0.6 * COALESCE(similarity(name, $1), 0) +
             0.2 * COALESCE(similarity(COALESCE(tags, ''), $1), 0) +
             0.2 * COALESCE(similarity(COALESCE(description, ''), $1), 0)
           ) AS "textSimilarity",
           (CASE WHEN name ILIKE $2 OR sku ILIKE $1 OR COALESCE(tags, '') ILIKE $2 THEN 1.0 ELSE 0.0 END) AS "exactMatch"
    FROM products
    WHERE "companyId" = $3
      AND "isActive" = true
      AND "deletedAt" IS NULL
      ${remappedWhere}
    ORDER BY (
      ${weights.vector} * 0.0 +
      ${weights.text} * (
        0.6 * COALESCE(similarity(name, $1), 0) +
        0.2 * COALESCE(similarity(COALESCE(tags, ''), $1), 0) +
        0.2 * COALESCE(similarity(COALESCE(description, ''), $1), 0)
      ) +
      ${weights.exact} * (CASE WHEN name ILIKE $2 OR sku ILIKE $1 OR COALESCE(tags, '') ILIKE $2 THEN 1.0 ELSE 0.0 END)
    ) DESC
    LIMIT $4;
  `;

  // Vector scoring disabled in text-only fallback
  const params = [cleanQuery, likeQuery, companyId, limit, ...dynamicParams];
  return await prisma.$queryRawUnsafe(sql, ...params);
}

/**
 * Reset detected backend (for testing).
 */
function resetDetection() {
  _detectedBackend = null;
  _detectionPromise = null;
}

/**
 * Get current detected backend.
 * @returns {'pgvector' | 'native' | null}
 */
function getDetectedBackend() {
  return _detectedBackend;
}

module.exports = {
  detectBackend,
  hybridSearch,
  resetDetection,
  getDetectedBackend,
};
