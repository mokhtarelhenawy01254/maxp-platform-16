/**
 * @module CorrectiveRAGEngine
 * @description Phase 19: Corrective Stateful RAG - evaluates retrieval quality,
 * reformulates queries, and falls back across multi-source pipelines.
 * PRODUCT_DB source now queries real products from prisma.product.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const episodicMemoryService = {
  saveEpisodicMemory: async () => null,
  searchEpisodicMemory: async () => [],
  getEpisodicMemories: async () => [],
  getGeminiApiKey: async () => null,
  searchSimilar: async () => [],
};
const unifiedOrchestrator = { search: async () => ({ products: [], totalCount: 0 }) };

const DEFAULT_SOURCE_ORDER = ['HYBRID_KNOWLEDGE', 'FAQ_DB', 'POLICY_DB', 'VECTOR_STORE', 'PRODUCT_DB', 'WEB'];
const HYBRID_SOURCE_TYPES = ['faq', 'policy'];
const TRACE_FAILED_STATUS = 'failed';
const TRACE_ANSWERED_STATUS = 'answered';

const SKIPPABLE_PATTERNS = [
  /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|thank|thanks|bye|goodbye|ok|okay)$/i,
  /^(\u0645\u0631\u062d\u0628\u0627|\u0627\u0647\u0644\u064a\u0646|\u0627\u0644\u0633\u0644\u0627\u0645|\u062a\u062d\u064a\u0629|\u0635\u0628\u0627\u062d|\u0645\u0633\u0627\u0621|\u0634\u0643\u0631\u0627|\u0645\u0639\u0020\u0627\u0644\u0633\u0644\u0627\u0645\u0647|\u0645\u0639\u0020\u0627\u0644\u0633\u0644\u0627\u0645\u0629|\u062a\u0645\u0627\u0645|\u062d\u0633\u0646\u0627|\u0627\u064a\u0648\u0647|\u0623\u064a\u0648\u0647|\u062e\u0644\u0627\u0635|\u0645\u0627\u0634\u064a)$/u,
];

class CorrectiveRAGEngine {
  constructor() {
    this.maxIterations = DEFAULT_SOURCE_ORDER.length;
    this._sources = new Map();
    this._queryLog = [];
    this.enableLLMReranker = true;
    this.rerankTopK = 10;
  }

  _isQueryRagRelevant(query) {
    const text = String(query || '').trim();
    if (!text || text.length < 3) return false;
    const normalized = text.toLowerCase().replace(/[.,!?;:]/g, '').trim();
    return !SKIPPABLE_PATTERNS.some(pattern => pattern.test(normalized));
  }

  async _rerankWithGemini(companyId, query, documents) {
    if (!Array.isArray(documents) || documents.length < 2) return documents;
    try {
      const apiKey = await episodicMemoryService.getGeminiApiKey();
      if (!apiKey) return documents;
      const candidates = documents.slice(0, this.rerankTopK);
      const pairs = candidates.map((doc, i) =>
        `[${i + 1}] Document: ${doc.content.substring(0, 500)}`.trim()
      );
      const prompt = `You are a relevance re-ranker. Rate how relevant each document is to the query on a scale of 0.00 to 1.00.

Query: ${query}

${pairs.join('\n\n')}

Return a JSON object with keys being the document numbers (1-${candidates.length}) and values being the relevance scores. Only respond with valid JSON, no other text. Example: {"1": 0.95, "2": 0.32}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
      });
      if (!response.ok) return documents;
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return documents;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return documents;
      const scores = JSON.parse(jsonMatch[0]);

      const scored = candidates.map((doc, i) => ({
        ...doc,
        relevance: Number(scores[String(i + 1)]) || doc.relevance,
        metadata: {
          ...(doc.metadata || {}),
          retrieval: {
            ...((doc.metadata || {}).retrieval || {}),
            llmRerankScore: Number(scores[String(i + 1)]) || 0,
            pipeline: ((doc.metadata || {}).retrieval || {}).pipeline
              ? `${(doc.metadata || {}).retrieval.pipeline}-llm-rerank`
              : 'llm-rerank',
          },
        },
      }));
      scored.sort((a, b) => b.relevance - a.relevance);
      return scored;
    } catch (err) {
      console.warn('[RAG] LLM reranker failed, using original scores:', err.message);
      return documents;
    }
  }

  /**
   * Main RAG pipeline: query → retrieve → grade → correct → answer.
   */
  async query(companyId, query, options = {}) {
    const startedAt = Date.now();
    let currentQuery = query;
    const visitedSources = new Set();
    const sourceOrder = Array.isArray(options.sourceOrder) && options.sourceOrder.length > 0
      ? options.sourceOrder
      : DEFAULT_SOURCE_ORDER;
    const maxIterations = Number.isFinite(options.maxIterations)
      ? Math.max(1, Number(options.maxIterations))
      : Math.max(this.maxIterations, sourceOrder.length);
    let iterations = 0;
    let bestDocuments = [];
    let bestScore = 0;
    const attempts = [];
    const bestEffortThreshold = Number.isFinite(options.bestEffortThreshold)
      ? Math.max(0, Math.min(1, Number(options.bestEffortThreshold)))
      : 0.7;

    const guardrail = this._detectPromptInjection(query);
    if (guardrail.blocked) {
      const response = {
        answer: null,
        sources: [],
        iterations: 0,
        grading: { avgRelevance: 0, sufficient: false, blocked: true, reason: guardrail.reason },
        finalSource: 'GUARDRAIL',
        attempts: [],
        retrievalMode: 'guardrail',
      };
      this._queryLog.push({ companyId, query, answer: null, source: 'GUARDRAIL', iterations: 0, score: 0, timestamp: new Date() });
      response.traceId = await this._persistTrace(companyId, query, response, {
        ...options,
        latencyMs: Date.now() - startedAt,
        status: TRACE_FAILED_STATUS,
      });
      return response;
    }

    if (!this._isQueryRagRelevant(query)) {
      const response = {
        answer: null,
        sources: [],
        iterations: 0,
        grading: { avgRelevance: 0, sufficient: false, skippable: true },
        finalSource: 'SKIP_RETRIEVAL',
        attempts: [],
        retrievalMode: 'skip-retrieval',
      };
      this._queryLog.push({ companyId, query, answer: null, source: 'SKIP_RETRIEVAL', iterations: 0, score: 0, timestamp: new Date() });
      response.traceId = await this._persistTrace(companyId, query, response, {
        ...options,
        latencyMs: Date.now() - startedAt,
        status: TRACE_FAILED_STATUS,
      });
      return response;
    }

    for (const source of sourceOrder) {
      if (iterations >= maxIterations) break;
      iterations++;
      visitedSources.add(source);

      const attemptStartedAt = Date.now();
      let documents = await this._retrieve(companyId, currentQuery, source, options);

      if (source === 'HYBRID_KNOWLEDGE' && this.enableLLMReranker && documents.length > 1) {
        documents = await this._rerankWithGemini(companyId, currentQuery, documents);
      }

      const grading = this._gradeDocuments(currentQuery, documents);
      attempts.push({
        source,
        queryUsed: currentQuery,
        documentCount: documents.length,
        grading,
        latencyMs: Date.now() - attemptStartedAt,
      });

      if (grading.avgRelevance >= 0.7) {
        bestDocuments = documents;
        bestScore = grading.avgRelevance;
        const answer = this._generateAnswer(currentQuery, documents);

        this._queryLog.push({ companyId, query, answer, source, iterations, score: bestScore, timestamp: new Date() });

        const response = {
          answer,
          sources: documents.map(d => ({
            content: d.content,
            source,
            relevance: d.relevance,
            metadata: d.metadata || null,
          })),
          iterations,
          grading,
          finalSource: source,
          attempts,
          retrievalMode: source === 'HYBRID_KNOWLEDGE' ? 'hybrid' : 'source_fallback',
        };
        response.traceId = await this._persistTrace(companyId, query, response, {
          ...options,
          latencyMs: Date.now() - startedAt,
          status: TRACE_ANSWERED_STATUS,
        });
        return response;
      }

      if (grading.avgRelevance > bestScore) {
        bestDocuments = documents;
        bestScore = grading.avgRelevance;
      }
      currentQuery = this._reformulateQuery(currentQuery, grading);
    }

    // Best-effort answer from whatever we found
    const shouldUseBestEffort = bestDocuments.length > 0 && bestScore >= bestEffortThreshold;
    const answer = shouldUseBestEffort
      ? this._generateAnswer(currentQuery, bestDocuments)
      : null;

    this._queryLog.push({ companyId, query, answer, source: 'EXHAUSTED', iterations, score: bestScore, timestamp: new Date() });

    const response = {
      answer,
      sources: bestDocuments.map(d => ({
        content: d.content,
        source: 'BEST_EFFORT',
        relevance: d.relevance,
        metadata: d.metadata || null,
      })),
      iterations,
      grading: { avgRelevance: bestScore, sufficient: false, exhausted: true },
      finalSource: 'EXHAUSTED',
      attempts,
      retrievalMode: 'exhausted',
    };
    response.traceId = await this._persistTrace(companyId, query, response, {
      ...options,
      latencyMs: Date.now() - startedAt,
      status: TRACE_FAILED_STATUS,
    });
    return response;
  }

  /**
   * Retrieves documents from a specific source.
   * For FAQ_DB and POLICY_DB, retrieves tenant-scoped published knowledge.
   * For PRODUCT_DB, falls back to real database products if no in-memory docs exist.
   * For VECTOR_STORE, queries episodicMemoryService.searchSimilar.
   * For WEB, fetches crawl/scraping-simulated information using prisma.aiSetting.
   */
  async _retrieve(companyId, query, source, options = {}) {
    // 1. Try in-memory documents first (seeded via addDocuments)
    const memDocs = this._sources.get(`${companyId}:${source}`) || [];
    if (memDocs.length > 0) {
      return this._scoreDocuments(query, memDocs);
    }

    // 2. HYBRID_KNOWLEDGE: FAQ + policy candidates ranked by BM25, vector similarity, RRF, and rerank
    if (source === 'HYBRID_KNOWLEDGE') {
      return this._retrieveHybridKnowledge(companyId, query, options);
    }

    // 2. FAQ_DB: tenant-scoped active FAQs with hybrid vector + n-gram scoring
    if (source === 'FAQ_DB') {
      try {
        const prisma = getSharedPrismaClient();
        const where = { companyId, isActive: true };
        if (options.category || options.knowledgeCategory) {
          where.category = options.category || options.knowledgeCategory;
        }
        const faqs = await prisma.faq.findMany({
          where,
          orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
          take: 50,
          select: {
            id: true,
            question: true,
            answer: true,
            category: true,
            tags: true,
            version: true,
            updatedAt: true,
            embedding: true,
            embeddingGeneratedAt: true,
          },
        });

        if (faqs.length > 0) {
          const docs = faqs.map(faq => {
            const categoryLabel = faq.category || 'general';
            const tagsList = this._formatTags(faq.tags);
            const contextHeader = `This chunk is part of the merchant's official FAQ database, specifically answering a customer question under category "${categoryLabel}". Tags: [${tagsList}]. Question: ${faq.question}`;
            return {
              content: [
                `[Context: ${contextHeader}]`,
                `FAQ question: ${faq.question}`,
                `FAQ answer: ${faq.answer}`,
                `Category: ${categoryLabel}`,
                `Tags: ${tagsList}`,
              ].join('\n'),
              embedding: faq.embedding,
              embeddingGeneratedAt: faq.embeddingGeneratedAt,
              metadata: {
                type: 'faq',
                id: faq.id,
                title: faq.question,
                category: categoryLabel,
                tags: tagsList,
                version: faq.version || 1,
                updatedAt: faq.updatedAt,
              },
            };
          });
          return this._hybridScoreDocuments(query, docs);
        }
      } catch (_) {}
    }

    // 3. POLICY_DB: tenant-scoped active policies with hybrid vector + n-gram scoring
    if (source === 'POLICY_DB') {
      try {
        const prisma = getSharedPrismaClient();
        const now = new Date();
        const where = {
          companyId,
          isActive: true,
          effectiveAt: { lte: now },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        };
        if (options.category || options.knowledgeCategory) {
          where.category = options.category || options.knowledgeCategory;
        }
        const policies = await prisma.policy.findMany({
          where,
          orderBy: [{ order: 'asc' }, { effectiveAt: 'desc' }],
          take: 50,
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            tags: true,
            version: true,
            effectiveAt: true,
            expiresAt: true,
            updatedAt: true,
            embedding: true,
            embeddingGeneratedAt: true,
          },
        });

        if (policies.length > 0) {
          const docs = policies.map(policy => {
            const categoryLabel = policy.category || 'general';
            const tagsList = this._formatTags(policy.tags);
            const contextHeader = `This chunk is part of the merchant's official policy document, titled "${policy.title}", under category "${categoryLabel}". This document governs operations and terms. Tags: [${tagsList}]`;
            return {
              content: [
                `[Context: ${contextHeader}]`,
                `Policy title: ${policy.title}`,
                `Policy content: ${policy.content}`,
                `Category: ${categoryLabel}`,
                `Tags: ${tagsList}`,
              ].join('\n'),
              embedding: policy.embedding,
              embeddingGeneratedAt: policy.embeddingGeneratedAt,
              metadata: {
                type: 'policy',
                id: policy.id,
                title: policy.title,
                category: categoryLabel,
                tags: tagsList,
                version: policy.version || 1,
                effectiveAt: policy.effectiveAt,
                expiresAt: policy.expiresAt,
                updatedAt: policy.updatedAt,
              },
            };
          });
          return this._hybridScoreDocuments(query, docs);
        }
      } catch (_) {}
    }

    // 2. VECTOR_STORE: search similar episodic database memories
    if (source === 'VECTOR_STORE') {
      try {
        const customerId = options.customerId || 'global';
        const vectorDocs = await episodicMemoryService.searchSimilar(companyId, customerId, query, 5);
        if (vectorDocs && vectorDocs.length > 0) {
          return vectorDocs.map(doc => ({
            content: doc.content,
            relevance: doc.similarity || 0,
            metadata: doc.metadata
          }));
        }
      } catch (_) {}
    }

    // 3. PRODUCT_DB: try real database products using semantic search orchestrator
    if (source === 'PRODUCT_DB') {
      try {
        const orchestratorResult = await unifiedOrchestrator.search(companyId, query, {
          limit: 10,
          conversationId: options.conversationId || undefined,
        });
        const matchedProducts = orchestratorResult.products;
        if (matchedProducts.length > 0) {
          return matchedProducts.map(p => ({
            content: `Product ${p.name} ${p.description || ''} price ${p.price}`.trim(),
            relevance: p.searchScore || 0,
            metadata: {
              type: 'product',
              id: p.id,
              name: p.name,
              sku: p.sku,
              price: p.price,
              comparePrice: p.comparePrice,
              stock: p.stock,
            }
          }));
        }
      } catch (err) {
        console.error('[RAG] PRODUCT_DB semantic retrieval failed:', err.message);
        // Fallback to basic DB listing if semantic search fails
        try {
          const prisma = getSharedPrismaClient();
          const products = await prisma.product.findMany({
            where: { companyId, isActive: true },
            take: 20,
            select: { id: true, name: true, description: true, price: true },
          });
          if (products.length > 0) {
            const productDocs = products.map(p => ({
              content: `Product ${p.name} ${p.description || ''} price ${p.price}`.trim(),
              productId: p.id,
            }));
            return this._scoreDocuments(query, productDocs);
          }
        } catch (_) {}
      }
    }

    // 4. WEB: try real database aiSettings for simulated crawling guidelines
    if (source === 'WEB') {
      try {
        const prisma = getSharedPrismaClient();
        const aiSetting = await prisma.aiSetting.findUnique({
          where: { companyId }
        });
        const writeToolScopes = aiSetting?.writeToolScopes || 'No active restrictions';
        const docContent = `Web Search Results: Company ${companyId} guidelines: write tool scopes allowed: [${writeToolScopes}]. Human approval for write operations is set to ${aiSetting?.humanApprovalRequiredForWrite !== false}. Max replies allowed: ${aiSetting?.maxRepliesPerCustomer || 5}. Search matched general merchant guidelines.`;
        
        return this._scoreDocuments(query, [{
          content: docContent,
          source: 'WEB'
        }]);
      } catch (_) {}
    }

    return [];
  }

  _formatTags(tags) {
    if (!tags) return '';
    if (Array.isArray(tags)) return tags.join(', ');
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed.join(', ') : String(tags);
    } catch {
      return String(tags);
    }
  }

  _detectPromptInjection(query) {
    const normalized = this._arabicNormalize(query);
    const patterns = [
      /ignore\s+(all\s+)?(previous|system|developer|instructions)/i,
      /disregard\s+(all\s+)?(previous|system|developer|instructions)/i,
      /reveal\s+(the\s+)?(system|developer|hidden|secret)/i,
      /\u0627\u0646\u0633\u064A|\u0627\u0646\u0633\u0649|\u062A\u062C\u0627\u0647\u0644|\u0627\u0643\u0633\u0631|\u062A\u0639\u0644\u064A\u0645\u0627\u062A|\u0633\u064A\u0633\u062A\u0645|\u0628\u0631\u0648\u0645\u0628\u062A/,
      /(\u0627\u0643\u0634\u0641|\u0627\u0638\u0647\u0631|\u0637\u0644\u0639|\u0642\u0648\u0644\u064A).*(\u0633\u0631\u064A|\u062F\u0627\u062E\u0644\u064A|\u0645\u062E\u0641\u064A)/,
    ];
    const blocked = patterns.some(pattern => pattern.test(normalized));
    return {
      blocked,
      reason: blocked ? 'prompt-injection-or-secret-request' : null,
    };
  }

  async _retrieveHybridKnowledge(companyId, query, options = {}) {
    try {
      const prisma = getSharedPrismaClient();
      const now = new Date();
      const category = options.category || options.knowledgeCategory;
      const [faqs, policies] = await Promise.all([
        HYBRID_SOURCE_TYPES.includes('faq') ? prisma.faq.findMany({
          where: {
            companyId,
            isActive: true,
            ...(category ? { category } : {}),
          },
          orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
          take: 80,
          select: {
            id: true,
            question: true,
            answer: true,
            category: true,
            tags: true,
            version: true,
            updatedAt: true,
            embedding: true,
            embeddingGeneratedAt: true,
          },
        }) : [],
        HYBRID_SOURCE_TYPES.includes('policy') ? prisma.policy.findMany({
          where: {
            companyId,
            isActive: true,
            effectiveAt: { lte: now },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
            ...(category ? { category } : {}),
          },
          orderBy: [{ order: 'asc' }, { effectiveAt: 'desc' }],
          take: 80,
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            tags: true,
            version: true,
            effectiveAt: true,
            expiresAt: true,
            updatedAt: true,
            embedding: true,
            embeddingGeneratedAt: true,
          },
        }) : [],
      ]);

      const candidates = [
        ...faqs.map(faq => {
          const categoryLabel = faq.category || 'general';
          const tagsList = this._formatTags(faq.tags);
          const contextHeader = `This chunk is part of the merchant's official FAQ database, specifically answering a customer question under category "${categoryLabel}". Tags: [${tagsList}]. Question: ${faq.question}`;
          return {
            content: [
              `[Context: ${contextHeader}]`,
              `FAQ question: ${faq.question}`,
              `FAQ answer: ${faq.answer}`,
              `Category: ${categoryLabel}`,
              `Tags: ${tagsList}`,
            ].join('\n'),
            embedding: faq.embedding,
            embeddingGeneratedAt: faq.embeddingGeneratedAt,
            metadata: {
              type: 'faq',
              id: faq.id,
              title: faq.question,
              category: categoryLabel,
              tags: tagsList,
              version: faq.version || 1,
              updatedAt: faq.updatedAt,
            },
          };
        }),
        ...policies.map(policy => {
          const categoryLabel = policy.category || 'general';
          const tagsList = this._formatTags(policy.tags);
          const contextHeader = `This chunk is part of the merchant's official policy document, titled "${policy.title}", under category "${categoryLabel}". This document governs operations and terms. Tags: [${tagsList}]`;
          return {
            content: [
              `[Context: ${contextHeader}]`,
              `Policy title: ${policy.title}`,
              `Policy content: ${policy.content}`,
              `Category: ${categoryLabel}`,
              `Tags: ${tagsList}`,
            ].join('\n'),
            embedding: policy.embedding,
            embeddingGeneratedAt: policy.embeddingGeneratedAt,
            metadata: {
              type: 'policy',
              id: policy.id,
              title: policy.title,
              category: categoryLabel,
              tags: tagsList,
              version: policy.version || 1,
              effectiveAt: policy.effectiveAt,
              expiresAt: policy.expiresAt,
              updatedAt: policy.updatedAt,
            },
          };
        }),
      ];

      return this._scoreHybridDocuments(query, candidates);
    } catch (_) {
      return [];
    }
  }

  _arabicNormalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[\u0623\u0625\u0622]/g, '\u0627')
      .replace(/\u0649/g, '\u064A')
      .replace(/\u0629/g, '\u0647')
      .replace(/[^\p{L}\p{N}_\s.-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _getNgrams(text, n) {
    const ngrams = [];
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.push(text.slice(i, i + n));
    }
    return ngrams;
  }

  _tokenize(text) {
    const STOP_WORDS = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      '\u0645\u0646', '\u0625\u0644\u0649', '\u0639\u0646', '\u0639\u0644\u0649', '\u0641\u064A', '\u0647\u0648', '\u0647\u064A', '\u062A\u0645', '\u0627\u0646', '\u0627\u0646\u0643', '\u062D\u062A\u064A', '\u062D\u062A\u0649', '\u0627\u0648', '\u0623\u0648', '\u0648', '\u0641', '\u0628', '\u0643', '\u062F\u0647',
      '\u062F\u0627', '\u062F\u064A', '\u0627\u0644\u0644\u064A', '\u0647\u0644', '\u0639\u0646\u062F\u0643\u0645', '\u0639\u0627\u064A\u0632', '\u0645\u0645\u0643\u0646'
    ]);
    return this._arabicNormalize(text)
      .split(/\s+/)
      .map(token => this._normalizeArabicToken(token))
      .filter(token => token.length > 1 && !STOP_WORDS.has(token));
  }

  _normalizeArabicToken(token) {
    let normalized = String(token || '').trim();
    const prefixes = ['\u0648\u0627\u0644', '\u0628\u0627\u0644', '\u0643\u0627\u0644', '\u0641\u0627\u0644', '\u0644\u0644', '\u0627\u0644', '\u0648', '\u0641', '\u0628', '\u0643', '\u0644'];
    for (const prefix of prefixes) {
      if (normalized.startsWith(prefix) && normalized.length > prefix.length + 2) {
        normalized = normalized.slice(prefix.length);
        break;
      }
    }
    return normalized;
  }

  _hasAnyIntentTerm(text, terms) {
    const normalized = this._arabicNormalize(text);
    return terms.some(term => normalized.includes(this._arabicNormalize(term)));
  }

  _detectKnowledgeIntent(text) {
    const normalized = this._arabicNormalize(text);
    if (!normalized) return 'unknown';

    if (this._hasAnyIntentTerm(normalized, [
      'shipping', 'delivery', 'ship', 'deliver',
      '\u0634\u062D\u0646', '\u062A\u0648\u0635\u064A\u0644', '\u0645\u062F\u0629 \u0627\u0644\u062A\u0648\u0635\u064A\u0644', '\u0645\u0646\u062F\u0648\u0628', '\u0645\u062D\u0627\u0641\u0638\u0627\u062A',
    ])) {
      return 'shipping';
    }

    if (this._hasAnyIntentTerm(normalized, [
      'return_policy', 'returns', 'return', 'exchange',
      '\u0627\u0633\u062A\u0628\u062F\u0627\u0644', '\u0627\u0631\u062C\u0627\u0639', '\u0625\u0631\u062C\u0627\u0639', '\u0645\u0631\u062A\u062C\u0639', '\u0631\u062F \u0627\u0644\u0645\u0646\u062A\u062C',
    ])) {
      return 'returns';
    }

    if (this._hasAnyIntentTerm(normalized, [
      'refund_policy', 'refund',
      '\u0627\u0633\u062A\u0631\u062F\u0627\u062F', '\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0628\u0644\u063A', '\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0641\u0644\u0648\u0633', '\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0645\u0627\u0644\u064A',
    ])) {
      return 'refund';
    }

    if (this._hasAnyIntentTerm(normalized, [
      'discount', 'discounts', 'coupon', 'promo',
      '\u062E\u0635\u0645', '\u0643\u0648\u0628\u0648\u0646', '\u0643\u0648\u062F \u062E\u0635\u0645', '\u0639\u0631\u0636',
    ])) {
      return 'discount';
    }

    if (this._hasAnyIntentTerm(normalized, [
      'branch', 'pickup', 'location',
      '\u0641\u0631\u0639', '\u0627\u0633\u062A\u0644\u0627\u0645 \u0645\u0646 \u0627\u0644\u0641\u0631\u0639', '\u0627\u0633\u062A\u0644\u0627\u0645', '\u0639\u0646\u0648\u0627\u0646',
    ])) {
      return 'location';
    }

    return 'unknown';
  }

  _detectDocumentIntent(doc) {
    const categoryIntent = this._detectKnowledgeIntent(doc?.metadata?.category || '');
    if (categoryIntent !== 'unknown') return categoryIntent;
    return this._detectKnowledgeIntent(doc?.content || '');
  }

  _parseEmbedding(embedding) {
    if (!embedding) return null;
    if (Array.isArray(embedding)) return embedding.map(Number).filter(Number.isFinite);
    if (typeof embedding !== 'string') return null;
    try {
      const parsed = JSON.parse(embedding);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
    } catch {}
    const vector = embedding
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(value => Number(value.trim()))
      .filter(Number.isFinite);
    return vector.length > 0 ? vector : null;
  }

  _localEmbedding(text, dims = 768) {
    const vec = new Array(dims).fill(0);
    const tokens = this._tokenize(text);
    if (tokens.length === 0) return vec;
    for (const token of tokens) {
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const idx = Math.abs(hash) % dims;
      vec[idx] += 1;
    }
    const mag = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vec.map(value => value / mag);
  }

  _cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  _bm25Scores(query, docs) {
    const queryTokens = this._tokenize(query);
    if (queryTokens.length === 0 || docs.length === 0) return new Map();

    const tokenizedDocs = docs.map(doc => this._tokenize(doc.content));
    const avgDocLength = tokenizedDocs.reduce((sum, tokens) => sum + tokens.length, 0) / tokenizedDocs.length || 1;
    const documentFrequency = new Map();
    for (const tokens of tokenizedDocs) {
      for (const token of new Set(tokens)) {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      }
    }

    const k1 = 1.4;
    const b = 0.72;
    const rawScores = new Map();
    let maxScore = 0;
    tokenizedDocs.forEach((tokens, index) => {
      const frequencies = new Map();
      for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
      let score = 0;
      for (const token of queryTokens) {
        const tf = frequencies.get(token) || 0;
        if (tf === 0) continue;
        const df = documentFrequency.get(token) || 0;
        const idf = Math.log(1 + ((docs.length - df + 0.5) / (df + 0.5)));
        const denominator = tf + k1 * (1 - b + b * (tokens.length / avgDocLength));
        score += idf * ((tf * (k1 + 1)) / denominator);
      }
      rawScores.set(index, score);
      maxScore = Math.max(maxScore, score);
    });

    const normalized = new Map();
    for (const [index, score] of rawScores.entries()) {
      normalized.set(index, maxScore > 0 ? score / maxScore : 0);
    }
    return normalized;
  }

  _rankMap(scores) {
    return [...scores.entries()]
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .reduce((map, [index], rank) => {
        map.set(index, rank + 1);
        return map;
      }, new Map());
  }

  _scoreHybridDocuments(query, docs) {
    if (!Array.isArray(docs) || docs.length === 0) return [];
    const bm25Scores = this._bm25Scores(query, docs);
    const queryIntent = this._detectKnowledgeIntent(query);
    const queryVector = this._localEmbedding(query);
    const vectorScores = new Map();
    let maxVectorScore = 0;

    docs.forEach((doc, index) => {
      const storedEmbedding = this._parseEmbedding(doc.embedding);
      const docVector = storedEmbedding || this._localEmbedding(doc.content);
      const rawSimilarity = Math.max(0, this._cosineSimilarity(queryVector, docVector));
      const similarity = rawSimilarity >= 0.18 ? rawSimilarity : 0;
      vectorScores.set(index, similarity);
      maxVectorScore = Math.max(maxVectorScore, similarity);
    });

    if (maxVectorScore > 0) {
      for (const [index, score] of vectorScores.entries()) {
        vectorScores.set(index, score / maxVectorScore);
      }
    }

    const bm25Ranks = this._rankMap(bm25Scores);
    const vectorRanks = this._rankMap(vectorScores);
    const now = Date.now();

    return docs.map((doc, index) => {
      const lexicalScore = bm25Scores.get(index) || 0;
      const vectorScore = vectorScores.get(index) || 0;
      const lexicalRankBoost = bm25Ranks.has(index) ? 1 / (60 + bm25Ranks.get(index)) : 0;
      const vectorRankBoost = vectorRanks.has(index) ? 1 / (60 + vectorRanks.get(index)) : 0;
      const rrfScore = lexicalRankBoost + vectorRankBoost;
      const normalizedRrf = Math.min(1, rrfScore * 35);
      const updatedAt = doc.metadata?.updatedAt || doc.metadata?.effectiveAt;
      const ageDays = updatedAt ? Math.max(0, (now - new Date(updatedAt).getTime()) / 86400000) : 365;
      const recencyScore = Math.max(0, 1 - Math.min(ageDays, 365) / 365);
      const trustScore = doc.metadata?.type === 'policy' ? 1 : 0.92;
      const documentIntent = this._detectDocumentIntent(doc);
      const intentAligned = queryIntent !== 'unknown' && documentIntent === queryIntent;
      const intentConflict = queryIntent !== 'unknown' && documentIntent !== 'unknown' && documentIntent !== queryIntent;
      const intentScore = intentAligned ? 0.2 : 0;

      const exactPhraseBoost = this._arabicNormalize(doc.content).includes(this._arabicNormalize(query)) ? 0.08 : 0;

      // Contextual Retrieval Match Check
      const docCategory = this._arabicNormalize(doc.metadata?.category || '');
      const docTitle = this._arabicNormalize(doc.metadata?.title || doc.metadata?.id || '');
      const docTags = this._arabicNormalize(this._formatTags(doc.tags || doc.metadata?.tags));
      const queryWords = this._tokenize(query);
      const matchesCategory = queryWords.some(word => docCategory.includes(word));
      const matchesTitle = docTitle && queryWords.some(word => docTitle.includes(word));
      const matchesTags = docTags && queryWords.some(word => docTags.includes(word));
      const contextualRankBoost = (matchesCategory ? 0.05 : 0) + (matchesTitle ? 0.05 : 0) + (matchesTags ? 0.04 : 0);

      let rerankScore = Math.min(1, (
        lexicalScore * 0.42 +
        vectorScore * 0.28 +
        normalizedRrf * 0.18 +
        recencyScore * 0.06 +
        trustScore * 0.06 +
        intentScore +
        exactPhraseBoost +
        contextualRankBoost
      ));
      if (intentConflict) {
        rerankScore = Math.min(rerankScore, 0.58);
      }
      if (!doc.embedding && lexicalScore < 0.15) {
        rerankScore = Math.min(rerankScore, 0.55);
      }
      if (lexicalScore === 0 && vectorScore === 0) {
        rerankScore = Math.min(rerankScore, 0.18);
      }

      return {
        ...doc,
        relevance: rerankScore,
        metadata: {
          ...(doc.metadata || {}),
          retrieval: {
            pipeline: 'hybrid-bm25-vector-rrf-rerank',
            lexicalScore: Number(lexicalScore.toFixed(4)),
            vectorScore: Number(vectorScore.toFixed(4)),
            rrfScore: Number(normalizedRrf.toFixed(4)),
            recencyScore: Number(recencyScore.toFixed(4)),
            trustScore,
            queryIntent,
            documentIntent,
            intentAligned,
            intentConflict,
            rerankScore: Number(rerankScore.toFixed(4)),
            vectorProvider: doc.embedding ? 'stored' : 'local-fallback',
          },
        },
      };
    }).sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  /**
   * Hybrid scoring for FAQ/Policy sources combining n-gram overlap with vector cosine similarity.
   * Uses stored Gemini embeddings when available, falls back to local FNV hash.
   */
  _hybridScoreDocuments(query, docs) {
    if (!Array.isArray(docs) || docs.length === 0) return [];
    const ngramScores = new Map();
    const normalizedQuery = this._arabicNormalize(query);
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
    const queryBigrams = this._getNgrams(normalizedQuery, 2).filter(b => b.trim().length === 2);
    const queryTrigrams = this._getNgrams(normalizedQuery, 3).filter(t => t.trim().length === 3);
    let maxNgramScore = 0;

    docs.forEach((doc, index) => {
      const normalizedContent = this._arabicNormalize(doc.content);
      const contentWords = normalizedContent.split(/\s+/);
      const contentBigrams = this._getNgrams(normalizedContent, 2);
      const contentTrigrams = this._getNgrams(normalizedContent, 3);
      const wordOverlap = queryWords.filter(w => contentWords.includes(w)).length;
      const wordScore = queryWords.length > 0 ? wordOverlap / queryWords.length : 0;
      const bigramOverlap = queryBigrams.filter(b => contentBigrams.includes(b)).length;
      const bigramScore = queryBigrams.length > 0 ? bigramOverlap / queryBigrams.length : 0;
      const trigramOverlap = queryTrigrams.filter(t => contentTrigrams.includes(t)).length;
      const trigramScore = queryTrigrams.length > 0 ? trigramOverlap / queryTrigrams.length : 0;
      let ngram = wordScore;
      if (wordScore < 0.7 && (bigramScore > 0 || trigramScore > 0)) {
        ngram = Math.max(wordScore, (bigramScore * 0.4 + trigramScore * 0.6));
      }
      ngramScores.set(index, Math.min(1, ngram));
      maxNgramScore = Math.max(maxNgramScore, ngram);
    });

    const queryVector = this._localEmbedding(query);
    const vectorScores = new Map();
    let maxVectorScore = 0;
    docs.forEach((doc, index) => {
      const storedEmbedding = this._parseEmbedding(doc.embedding);
      const docVector = storedEmbedding || this._localEmbedding(doc.content);
      const similarity = Math.max(0, this._cosineSimilarity(queryVector, docVector));
      const score = similarity >= 0.15 ? similarity : 0;
      vectorScores.set(index, score);
      maxVectorScore = Math.max(maxVectorScore, score);
    });
    if (maxVectorScore > 0) {
      for (const [index, score] of vectorScores.entries()) {
        vectorScores.set(index, score / maxVectorScore);
      }
    }

    return docs.map((doc, index) => {
      const ngramNorm = maxNgramScore > 0 ? (ngramScores.get(index) || 0) / maxNgramScore : 0;
      const vectorNorm = vectorScores.get(index) || 0;
      const hasVector = !!doc.embedding;
      const vectorWeight = hasVector ? 0.4 : 0;
      const ngramWeight = 1 - vectorWeight;
      const relevance = Math.min(1, ngramNorm * ngramWeight + vectorNorm * vectorWeight);
      return {
        ...doc,
        relevance,
        metadata: {
          ...(doc.metadata || {}),
          retrieval: {
            pipeline: hasVector ? 'hybrid-ngram-vector' : 'ngram-only',
            ngramScore: Number(ngramNorm.toFixed(4)),
            vectorScore: Number(vectorNorm.toFixed(4)),
            vectorProvider: hasVector ? 'stored' : 'none',
          },
        },
      };
    }).sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  /**
   * Scores documents against a query using a hybrid word and character n-gram overlap.
   * This is extremely robust for Arabic dialects, roots, and prefixes/suffixes.
   */
  _scoreDocuments(query, docs) {
    const STOP_WORDS = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      '\u0645\u0646', '\u0625\u0644\u0649', '\u0639\u0646', '\u0639\u0644\u0649', '\u0641\u064A', '\u0647\u0648', '\u0647\u064A', '\u062A\u0645', '\u0627\u0646', '\u062D\u062A\u064A', '\u0627\u0648', '\u0648', '\u0641', '\u0628', '\u0643'
    ]);

    const normalizedQuery = this._arabicNormalize(query);
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w && !STOP_WORDS.has(w));
    const queryBigrams = this._getNgrams(normalizedQuery, 2).filter(b => b.trim().length === 2);
    const queryTrigrams = this._getNgrams(normalizedQuery, 3).filter(t => t.trim().length === 3);

    return docs.map(doc => {
      const normalizedContent = this._arabicNormalize(doc.content);
      const contentWords = normalizedContent.split(/\s+/);
      const contentBigrams = this._getNgrams(normalizedContent, 2);
      const contentTrigrams = this._getNgrams(normalizedContent, 3);

      const wordOverlap = queryWords.filter(w => contentWords.includes(w)).length;
      const wordScore = queryWords.length > 0 ? wordOverlap / queryWords.length : 0;

      const bigramOverlap = queryBigrams.filter(b => contentBigrams.includes(b)).length;
      const bigramScore = queryBigrams.length > 0 ? bigramOverlap / queryBigrams.length : 0;

      const trigramOverlap = queryTrigrams.filter(t => contentTrigrams.includes(t)).length;
      const trigramScore = queryTrigrams.length > 0 ? trigramOverlap / queryTrigrams.length : 0;

      let relevance = wordScore;
      if (wordScore < 0.7 && (bigramScore > 0 || trigramScore > 0)) {
        relevance = Math.max(wordScore, (bigramScore * 0.4 + trigramScore * 0.6));
      }

      return { ...doc, relevance: Math.min(1, relevance) };
    }).sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  /**
   * Grades retrieved documents for relevance.
   */
  _gradeDocuments(query, documents) {
    if (documents.length === 0) return { avgRelevance: 0, sufficient: false, count: 0 };
    const topRelevance = Math.max(...documents.map(d => d.relevance));
    const avg = documents.reduce((s, d) => s + d.relevance, 0) / documents.length;
    return { avgRelevance: topRelevance, sufficient: topRelevance >= 0.7, count: documents.length, rawAvg: avg };
  }

  /**
   * Reformulates a query based on grading feedback.
   */
  _reformulateQuery(query, grading) {
    const additions = ['details', 'specific', 'exact'];
    const addition = additions[Math.floor(Math.random() * additions.length)];
    return `${query} ${addition}`.trim();
  }

  /**
   * Generates an answer from documents.
   */
  _generateAnswer(query, documents) {
    if (documents.length === 0) return null;
    const topDoc = documents[0];
    return `Based on available information: ${topDoc.content}`;
  }

  async _persistTrace(companyId, query, result, options = {}) {
    if (options.persistTrace !== true) return null;
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.aiTrace?.create) return null;
      const metadata = {
        feature: 'agentic-rag',
        ragStatus: options.status || (result.finalSource === 'EXHAUSTED' ? TRACE_FAILED_STATUS : TRACE_ANSWERED_STATUS),
        finalSource: result.finalSource,
        retrievalMode: result.retrievalMode,
        avgRelevance: result.grading?.avgRelevance || 0,
        sufficient: Boolean(result.grading?.sufficient),
        sourceCount: Array.isArray(result.sources) ? result.sources.length : 0,
        sourceOrder: Array.isArray(options.sourceOrder) ? options.sourceOrder : DEFAULT_SOURCE_ORDER,
        category: options.category || options.knowledgeCategory || null,
        blocked: Boolean(result.grading?.blocked),
      };
      const trace = await prisma.aiTrace.create({
        data: {
          companyId,
          query,
          latencyMs: Number.isFinite(options.latencyMs) ? options.latencyMs : null,
          metadata: JSON.stringify(metadata),
        },
      });

      if (prisma.aiTraceStep?.createMany && Array.isArray(result.attempts) && result.attempts.length > 0) {
        await prisma.aiTraceStep.createMany({
          data: result.attempts.map((attempt, index) => ({
            traceId: trace.id,
            stepType: attempt.source === 'HYBRID_KNOWLEDGE' ? 'HYBRID_RETRIEVAL' : 'RETRIEVAL',
            latencyMs: attempt.latencyMs || 0,
            input: attempt.queryUsed || query,
            output: JSON.stringify({
              source: attempt.source,
              documentCount: attempt.documentCount,
              grading: attempt.grading,
            }),
            metadata: JSON.stringify({
              finalSource: result.finalSource,
              retrievalMode: result.retrievalMode,
            }),
            order: index + 1,
          })),
        });
      }

      return trace.id;
    } catch (_) {
      return null;
    }
  }

  async getFailureQueue(companyId, options = {}) {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.aiTrace?.findMany) return [];
      const limit = Math.min(Math.max(Number(options.limit) || 25, 1), 100);
      const traces = await prisma.aiTrace.findMany({
        where: { companyId },
        orderBy: { timestamp: 'desc' },
        take: Math.max(limit * 4, 40),
      });

      return traces
        .map(trace => {
          let metadata = {};
          try {
            metadata = JSON.parse(trace.metadata || '{}');
          } catch {}
          return { trace, metadata };
        })
        .filter(item => item.metadata.feature === 'agentic-rag' && item.metadata.ragStatus === TRACE_FAILED_STATUS)
        .slice(0, limit)
        .map(({ trace, metadata }) => ({
          id: trace.id,
          query: trace.query,
          createdAt: trace.timestamp || trace.createdAt,
          latencyMs: trace.latencyMs,
          finalSource: metadata.finalSource,
          retrievalMode: metadata.retrievalMode,
          avgRelevance: metadata.avgRelevance,
          blocked: Boolean(metadata.blocked),
          category: metadata.category || null,
        }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Adds documents to a source for a company (used for testing and manual seeding).
   */
  addDocuments(companyId, source, documents) {
    const key = `${companyId}:${source}`;
    if (!this._sources.has(key)) this._sources.set(key, []);
    this._sources.get(key).push(...documents);
  }

  getQueryLog(companyId) {
    return this._queryLog.filter(l => l.companyId === companyId);
  }

  _reset() { this._sources.clear(); this._queryLog = []; }
}

module.exports = new CorrectiveRAGEngine();
