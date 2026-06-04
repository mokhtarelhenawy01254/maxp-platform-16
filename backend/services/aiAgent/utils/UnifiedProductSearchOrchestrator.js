/**
 * @module UnifiedProductSearchOrchestrator
 * @description Single entry point for ALL product search and retrieval operations.
 * Wraps query parsing, memory state lookup, synonym expansion, image routing,
 * dynamic weight execution, business scoring, recovery, and logging.
 * 
 * Solves ISSUE #10: Unified Retrieval Orchestration Layer
 * Integrates: Issues #1 (Query Understanding), #2 (Memory), #4 (Dynamic Weights),
 *             #5 (Business Ranking), #6 (Vector Adaptor), #7 (Recovery),
 *             #8 (Synonyms), #9 (Observability)
 */

const { getSharedPrismaClient } = require('../../sharedDatabase');
const episodicMemoryService = require('../episodicMemoryService');
const workingMemoryService = require('../workingMemoryService');
const { parseSearchQuery, calculateDynamicWeights, relaxQuery } = require('./queryUnderstandingParser');
const { hybridSearch } = require('./DbVectorAdaptor');
const { buildProductSearchCandidates } = require('./productSearchQueryService');
const { classifyImageIntent } = require('./imageIntentClassifier');

// ──────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────

const MAX_RETRIEVAL = 30;   // Fetch up to 30 products, rank, then slice
const DEFAULT_RETURN = 5;   // Default number of results to return
const ZERO_VECTOR_768 = new Array(768).fill(0);

// ──────────────────────────────────────────────────────────────────────────
// Main Orchestrator
// ──────────────────────────────────────────────────────────────────────────

/**
 * Unified product search pipeline.
 * 
 * @param {string} companyId - Tenant ID
 * @param {string} queryText - Raw user query (text)
 * @param {object} [options]
 * @param {string} [options.conversationId] - For memory context
 * @param {object} [options.intentSlots] - Pre-extracted slots from intent classifier
 * @param {Buffer|string} [options.imageBytes] - Image buffer for multimodal search
 * @param {string} [options.mimeType] - Image mime type
 * @param {number} [options.limit] - Max results to return
 * @param {boolean} [options.skipRecovery=false] - Skip recovery on zero results
 * @param {boolean} [options.skipLogging=false] - Skip search log
 * @returns {Promise<SearchResult>}
 * 
 * @typedef {object} SearchResult
 * @property {Array} products - Ranked product results
 * @property {object} parsedQuery - Extracted filters
 * @property {object} weights - Dynamic weights used
 * @property {boolean} recoveryUsed - Whether recovery was triggered
 * @property {string|null} recoveryStrategy - Type of recovery used
 * @property {object|null} didYouMean - Suggested alternative product names
 * @property {number} latencyMs - Total search latency
 */
async function search(companyId, queryText, options = {}) {
  const startTime = Date.now();
  const limit = Math.min(Math.max(Number(options.limit) || DEFAULT_RETURN, 1), 20);

  // ── Stage 1: Conversation Memory Context ────────────────────────────────
  let memoryContext = null;
  let mergedQuery = String(queryText || '').trim();
  let mergedSlots = { ...(options.intentSlots || {}) };

  if (options.conversationId) {
    try {
      memoryContext = await workingMemoryService.getContext(companyId, options.conversationId);
    } catch (e) {
      console.warn('[SEARCH-ORCHESTRATOR] Memory context fetch failed:', e.message);
    }
  }

  // Resolve product references only when classifier/tool context indicates a
  // follow-up. Local keyword or length heuristics would reintroduce intent
  // routing outside the model-classified contract.
  let isFollowUpQuery = false;
  if (memoryContext && memoryContext.lastShownProductIds?.length > 0) {
    const referencesPreviousProduct = mergedSlots.referencesPreviousProduct === true;
    isFollowUpQuery = referencesPreviousProduct;
  }

  // ── Stage 2: Query Understanding ────────────────────────────────────────
  const parsed = parseSearchQuery(mergedQuery, mergedSlots);

  // Merge memory filters with newly parsed filters
  if (memoryContext?.activeSearchFilters) {
    const prev = memoryContext.activeSearchFilters;
    const hasNewStructuredFilter = Boolean(parsed.size || parsed.color || parsed.category || parsed.gender);
    // Prevent filter bleeding if searching for a different category
    const categoryShift = parsed.category && prev.category && parsed.category !== prev.category;
    
    if (!categoryShift && (hasNewStructuredFilter || isFollowUpQuery)) {
      if (!parsed.size && prev.size) parsed.size = prev.size;
      if (!parsed.color && prev.color) parsed.color = prev.color;
      if (!parsed.category && prev.category) parsed.category = prev.category;
      if (!parsed.gender && prev.gender) parsed.gender = prev.gender;
    }
  }

  // ── Stage 3: Dynamic Weight Calculation ─────────────────────────────────
  const weights = calculateDynamicWeights(parsed.querySignature);

  // ── Stage 4: Embedding Generation ───────────────────────────────────────
  let queryEmbedding = ZERO_VECTOR_768;
  const searchText = parsed.expandedQuery || parsed.cleanedQuery || mergedQuery;
  let imageIntent = null;

  if (options.imageBytes) {
    try {
      imageIntent = await classifyImageIntent(options.imageBytes, options.mimeType);
      
      // Route only PRODUCT_MATCH and COLOR_REFERENCE to catalog search
      if (imageIntent === 'PAYMENT_RECEIPT' || imageIntent === 'DAMAGE_REPORT') {
        console.log(`[SEARCH-ORCHESTRATOR] Bypassing catalog search for image intent: ${imageIntent}`);
        const latencyMs = Date.now() - startTime;
        
        if (!options.skipLogging) {
          _logSearchAsync(companyId, {
            conversationId: options.conversationId,
            queryText: mergedQuery,
            expandedQuery: parsed.expandedQuery,
            extractedFilters: {
              size: parsed.size,
              color: parsed.color,
              gender: parsed.gender,
              category: parsed.category,
              minPrice: parsed.minPrice,
              maxPrice: parsed.maxPrice,
              sku: parsed.sku,
            },
            searchWeights: weights,
            resolvedProductIds: [],
            resultCount: 0,
            topScore: 0,
            searchStrategy: `image_${imageIntent.toLowerCase()}`,
            recoveryUsed: false,
            recoveryStrategy: 'IMAGE_REJECTED',
            latencyMs,
          });
        }

        return {
          products: [],
          parsedQuery: parsed,
          weights,
          recoveryUsed: false,
          recoveryStrategy: 'IMAGE_REJECTED',
          imageIntent,
          didYouMean: null,
          latencyMs,
        };
      }

      queryEmbedding = await episodicMemoryService.generateMultimodalEmbeddingAsync({
        text: searchText,
        imageBytes: options.imageBytes,
        mimeType: options.mimeType || 'image/jpeg',
      });
    } catch (e) {
      console.warn('[SEARCH-ORCHESTRATOR] Multimodal embedding/intent classification failed:', e.message);
    }
  }

  if ((!queryEmbedding || queryEmbedding === ZERO_VECTOR_768) && searchText) {
    try {
      queryEmbedding = await episodicMemoryService.generateEmbeddingAsync(searchText);
    } catch (e) {
      console.warn('[SEARCH-ORCHESTRATOR] Text embedding failed:', e.message);
    }
  }

  if (!queryEmbedding) {
    queryEmbedding = ZERO_VECTOR_768;
  }

  // ── Stage 5: Database Execution ─────────────────────────────────────────
  let rawResults = [];
  const dbFilters = {};
  if (parsed.minPrice !== null) dbFilters.minPrice = parsed.minPrice;
  if (parsed.maxPrice !== null) dbFilters.maxPrice = parsed.maxPrice;
  if (parsed.color) dbFilters.color = parsed.color;
  if (parsed.size) dbFilters.size = parsed.size;
  if (isFollowUpQuery && memoryContext?.lastShownProductIds?.length > 0) {
    dbFilters.productIds = memoryContext.lastShownProductIds;
  }

  try {
    rawResults = await hybridSearch(companyId, queryEmbedding, searchText, {
      limit: MAX_RETRIEVAL,
      weights,
      filters: dbFilters,
    });
  } catch (e) {
    console.error('[SEARCH-ORCHESTRATOR] hybridSearch failed:', e.message);
    // Fall back to basic Prisma search
    rawResults = await _basicFallbackSearch(companyId, searchText, MAX_RETRIEVAL);
  }

  // ── Stage 6: Business Signal Re-ranking ─────────────────────────────────
  let rankedResults = _applyBusinessRanking(rawResults, parsed, searchText);

  // ── Stage 7: Post-filter by variant constraints (color / size) ──────────
  // Note: variant filtering happens at result mapping stage, not here.
  // Here we just boost/demote based on extracted filters
  if (parsed.color || parsed.size) {
    rankedResults = _boostByVariantMatch(rankedResults, parsed);
  }

  // ── Stage 8: Result Recovery ────────────────────────────────────────────
  let recoveryUsed = false;
  let recoveryStrategy = null;
  let didYouMean = null;

  if (rankedResults.length === 0 && !options.skipRecovery) {
    const recovery = await _runRecovery(companyId, queryText, parsed, queryEmbedding);
    rankedResults = recovery.results;
    recoveryUsed = recovery.used;
    recoveryStrategy = recovery.strategy;
    didYouMean = recovery.didYouMean;
  }

  // ── Stage 9: Slice to requested limit ───────────────────────────────────
  const finalResults = rankedResults.slice(0, limit).map(r => ({
    ...r,
    price: r.price ? Number(r.price) : 0,
    comparePrice: r.comparePrice ? Number(r.comparePrice) : null,
    cost: r.cost ? Number(r.cost) : null,
  }));

  // ── Stage 10: Update Memory Context ─────────────────────────────────────
  if (options.conversationId && finalResults.length > 0) {
    try {
      await workingMemoryService.updateSearchContext(companyId, options.conversationId, {
        productIds: finalResults.map(r => r.id),
        filters: {
          size: parsed.size || undefined,
          color: parsed.color || undefined,
          category: parsed.category || undefined,
          gender: parsed.gender || undefined,
        },
      });
    } catch (e) {
      console.warn('[SEARCH-ORCHESTRATOR] Memory update failed:', e.message);
    }
  }

  // ── Stage 11: Log Search Analytics (async, non-blocking) ────────────────
  const latencyMs = Date.now() - startTime;
  if (!options.skipLogging) {
    _logSearchAsync(companyId, {
      conversationId: options.conversationId,
      queryText: mergedQuery,
      expandedQuery: parsed.expandedQuery,
      extractedFilters: {
        size: parsed.size,
        color: parsed.color,
        gender: parsed.gender,
        category: parsed.category,
        minPrice: parsed.minPrice,
        maxPrice: parsed.maxPrice,
        sku: parsed.sku,
      },
      searchWeights: weights,
      resolvedProductIds: finalResults.map(r => r.id),
      resultCount: finalResults.length,
      topScore: finalResults[0]?.searchScore || 0,
      searchStrategy: parsed.querySignature,
      recoveryUsed,
      recoveryStrategy,
      latencyMs,
    });
  }

  return {
    products: finalResults,
    parsedQuery: parsed,
    weights,
    recoveryUsed,
    recoveryStrategy,
    didYouMean,
    latencyMs,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Business Ranking (Issue #5)
// ──────────────────────────────────────────────────────────────────────────

function _applyBusinessRanking(results, parsed, searchText) {
  if (!results || results.length === 0) return [];

  return results.map(product => {
    const searchScore = _calculateSearchScore(product);

    // Stock factor: 1.0 if in-stock, 0.4 if out-of-stock
    // Exception: if SKU exactly matches, show anyway
    const isExactSKUMatch = parsed.sku && product.sku &&
      product.sku.toLowerCase() === parsed.sku.toLowerCase();
    const stock = Number(product.stock || 0);
    const trackInventory = product.trackInventory !== false;
    const inStock = !trackInventory || stock > 0;
    const stockFactor = inStock || isExactSKUMatch ? 1.0 : 0.4;

    // Popularity factor: featured products get a boost
    const isFeatured = Boolean(product.isFeatured);
    const popularityFactor = isFeatured ? 1.0 : 0.7;

    // Combined business score
    const businessMultiplier = (0.7 * stockFactor) + (0.3 * popularityFactor);
    const finalScore = searchScore * businessMultiplier;

    // If similarity is very high (>0.9), don't suppress even if out-of-stock
    const effectiveScore = searchScore > 0.9 && !inStock
      ? searchScore * 0.95  // slight penalty only
      : finalScore;

    return {
      ...product,
      searchScore: effectiveScore,
      _debug: {
        rawSearchScore: searchScore,
        stockFactor,
        popularityFactor,
        businessMultiplier,
        inStock,
        isFeatured,
      },
    };
  }).sort((a, b) => b.searchScore - a.searchScore);
}

function _calculateSearchScore(product) {
  const vectorScore = Number(product.vectorScore || 0);
  const textSimilarity = Number(product.textSimilarity || 0);
  const exactMatch = Number(product.exactMatch || 0);

  // Use the same weights stored in the query
  return (0.6 * vectorScore) + (0.3 * textSimilarity) + (0.1 * exactMatch);
}

// ──────────────────────────────────────────────────────────────────────────
// Variant-Based Boosting
// ──────────────────────────────────────────────────────────────────────────

function _boostByVariantMatch(results, parsed) {
  // At this stage we don't have variant data yet (it's loaded later by the tool handler),
  // but we can use tags/name text matching for a rough boost
  return results.map(product => {
    let boost = 0;
    const haystack = `${product.name || ''} ${product.tags || ''} ${product.description || ''}`.toLowerCase();

    if (parsed.color) {
      if (haystack.includes(parsed.color.toLowerCase())) boost += 0.1;
    }
    if (parsed.size) {
      if (haystack.includes(parsed.size.toLowerCase())) boost += 0.05;
    }

    return {
      ...product,
      searchScore: product.searchScore + boost,
    };
  }).sort((a, b) => b.searchScore - a.searchScore);
}

// ──────────────────────────────────────────────────────────────────────────
// Recovery Strategy (Issue #7)
// ──────────────────────────────────────────────────────────────────────────

async function _runRecovery(companyId, originalQuery, parsed, queryEmbedding) {
  const result = { results: [], used: false, strategy: null, didYouMean: null };

  // Strategy 1: Query Relaxation (remove filters, search broader)
  const relaxed = relaxQuery(originalQuery);
  if (relaxed && relaxed !== originalQuery) {
    try {
      const relaxedResults = await hybridSearch(companyId, queryEmbedding, relaxed, {
        limit: 10,
        weights: { vector: 0.7, text: 0.2, exact: 0.1 },
      });

      if (relaxedResults.length > 0) {
        result.results = _applyBusinessRanking(relaxedResults, {}, relaxed);
        result.used = true;
        result.strategy = 'QUERY_RELAXATION';
        return result;
      }
    } catch (e) {
      console.warn('[SEARCH-ORCHESTRATOR] Relaxation recovery failed:', e.message);
    }
  }

  // Strategy 2: Did-You-Mean (trigram similarity on product names)
  try {
    const prisma = getSharedPrismaClient();
    const cleanQuery = parsed.cleanedQuery || originalQuery;
    const suggestions = await prisma.$queryRaw`
      SELECT name, similarity(name, ${cleanQuery}) AS sim
      FROM products
      WHERE "companyId" = ${companyId}
        AND "isActive" = true
        AND "deletedAt" IS NULL
        AND similarity(name, ${cleanQuery}) > 0.15
      ORDER BY sim DESC
      LIMIT 3;
    `;

    if (suggestions && suggestions.length > 0) {
      result.didYouMean = suggestions.map(s => ({
        name: s.name,
        similarity: Number(s.sim),
      }));
      result.used = true;
      result.strategy = 'DID_YOU_MEAN';

      // Also return the best matching product as a result
      const bestName = suggestions[0].name;
      const bestResults = await hybridSearch(companyId, queryEmbedding, bestName, {
        limit: 5,
        weights: { vector: 0.5, text: 0.4, exact: 0.1 },
      });
      if (bestResults.length > 0) {
        result.results = _applyBusinessRanking(bestResults, {}, bestName);
      }
    }
  } catch (e) {
    console.warn('[SEARCH-ORCHESTRATOR] Did-You-Mean recovery failed:', e.message);
  }

  return result;
}

// ──────────────────────────────────────────────────────────────────────────
// Basic Fallback Search
// ──────────────────────────────────────────────────────────────────────────

async function _basicFallbackSearch(companyId, queryText, limit) {
  const prisma = getSharedPrismaClient();
  const candidates = buildProductSearchCandidates(queryText);
  const or = [];
  for (const candidate of candidates) {
    or.push({ name: { contains: candidate, mode: 'insensitive' } });
    or.push({ sku: { contains: candidate, mode: 'insensitive' } });
    or.push({ tags: { contains: candidate, mode: 'insensitive' } });
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        deletedAt: null,
        OR: or.length ? or : [{ name: { contains: queryText, mode: 'insensitive' } }],
      },
      take: limit,
    });

    return products.map(p => ({
      ...p,
      searchScore: 0.5,
      vectorScore: 0,
      textSimilarity: 0.5,
      exactMatch: 0,
    }));
  } catch (e) {
    console.error('[SEARCH-ORCHESTRATOR] Basic fallback failed:', e.message);
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Search Analytics Logging (Issue #9)
// ──────────────────────────────────────────────────────────────────────────

function _logSearchAsync(companyId, data) {
  // Fire-and-forget — don't block the response
  setImmediate(async () => {
    try {
      const prisma = getSharedPrismaClient();
      await prisma.$executeRaw`
        INSERT INTO product_search_logs (
          "companyId", "conversationId", "queryText", "expandedQuery",
          "extractedFilters", "searchWeights", "resolvedProductIds",
          "resultCount", "topScore", "searchStrategy",
          "recoveryUsed", "recoveryStrategy", "latencyMs"
        ) VALUES (
          ${data.companyId || companyId},
          ${data.conversationId || null},
          ${data.queryText || ''},
          ${data.expandedQuery || null},
          ${JSON.stringify(data.extractedFilters || {})}::jsonb,
          ${JSON.stringify(data.searchWeights || {})}::jsonb,
          ${data.resolvedProductIds || []}::text[],
          ${data.resultCount || 0},
          ${data.topScore || 0},
          ${data.searchStrategy || 'hybrid'},
          ${data.recoveryUsed || false},
          ${data.recoveryStrategy || null},
          ${data.latencyMs || 0}
        );
      `;
    } catch (e) {
      // Analytics logging should never break search
      console.warn('[SEARCH-ORCHESTRATOR] Search log write failed:', e.message);
    }
  });
}

/**
 * Update a search log entry with conversion outcome.
 * Called when a searched product leads to CLICK, CART, or ORDER.
 * 
 * @param {string} searchLogId
 * @param {string} conversionType - 'CLICK' | 'CART' | 'ORDER'
 */
async function logConversion(searchLogId, conversionType) {
  try {
    const prisma = getSharedPrismaClient();
    await prisma.$executeRaw`
      UPDATE product_search_logs
      SET "conversionType" = ${conversionType}
      WHERE id = ${searchLogId};
    `;
  } catch (e) {
    console.warn('[SEARCH-ORCHESTRATOR] Conversion log update failed:', e.message);
  }
}

module.exports = {
  search,
  logConversion,
};
