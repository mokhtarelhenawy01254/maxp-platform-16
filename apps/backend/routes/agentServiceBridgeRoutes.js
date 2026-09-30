/**
 * @module agentServiceBridgeRoutes
 * @description Internal service-to-service bridge used by maxp-ai-service.
 */

const express = require('express');

const toolOrchestratorService = require('../legacy-ai-agent/aiAgent/toolOrchestratorService');
const draftProposalService = require('../legacy-ai-agent/aiAgent/draftProposalService');

const router = express.Router();

function getServiceToken() {
  return process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
}

function requireServiceToken(req, res, next) {
  const serviceToken = getServiceToken();
  if (!serviceToken) {
    console.error('[ai-bridge] AI_SERVICE_TOKEN env var is not configured');
    return res.status(500).json({ success: false, error: 'bridge token not configured' });
  }

  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token !== serviceToken) {
    return res.status(401).json({ success: false, error: 'invalid service token' });
  }

  return next();
}

const ACTION_TYPE_TO_TOOL = {
  'discount.create': 'discount.apply',
  'discount.apply': 'discount.apply',
  'order.cancel': 'order.cancel',
  'message.broadcast': 'message.broadcast',
};

router.use(requireServiceToken);

router.post('/tools/execute', async (req, res) => {
  try {
    const { companyId, toolName, input = {}, threadId } = req.body || {};
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    if (!toolName) return res.status(400).json({ success: false, error: 'toolName is required' });

    const result = await toolOrchestratorService.execute(companyId, {
      agentId: 'ai-service',
      toolName,
      input,
      traceId: threadId || null,
    });

    return res.json({ success: true, result });
  } catch (error) {
    console.error('[ai-bridge] tools/execute failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/approvals/draft', async (req, res) => {
  try {
    const { companyId, actionType, actionArgs = {}, threadId, customerId, reasoning } = req.body || {};
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    if (!actionType) return res.status(400).json({ success: false, error: 'actionType is required' });

    const toolName = ACTION_TYPE_TO_TOOL[actionType] || actionType;
    const draft = await draftProposalService.createDraft(companyId, {
      agentId: 'ai-service',
      toolName,
      params: actionArgs,
      reasoning: reasoning || `AI service proposed ${actionType}`,
      conversationId: threadId || null,
      customerId: customerId || null,
    });

    return res.json({ success: draft.success, ...draft });
  } catch (error) {
    console.error('[ai-bridge] approvals/draft failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── Hybrid product search (embeddings/vector-based) ────────────────

const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const unifiedSearchOrchestrator = require('../legacy-ai-agent/aiAgent/utils/UnifiedProductSearchOrchestrator');

router.post('/product-search', async (req, res) => {
  try {
    const { companyId, query, limit = 10, productSize, productColor, conversationId, useVector } = req.body || {};
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const safeLimit = Math.min(Math.max(Number(limit), 1), 50);
    const vectorEnabled = useVector !== false;

    // Empty query → listing mode: return all products for the company
    if (!query?.trim()) {
      const prisma = new PrismaClient();
      const rows = await prisma.product.findMany({
        where: { companyId, deletedAt: null },
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { name: true } },
          productVariants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              name: true, type: true, sku: true, images: true,
              stock: true, trackInventory: true, isActive: true, metadata: true,
            },
          },
        },
      });
      await prisma.$disconnect();

      const parseMeta = (raw) => {
        if (!raw) return {};
        if (typeof raw === 'object') return raw;
        try { return JSON.parse(raw); } catch { return {}; }
      };

      const products = rows.map((p) => {
        const meta = parseMeta(p.metadata);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.price) || 0,
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
          quantityOffers: Array.isArray(meta.quantityOffers) ? meta.quantityOffers : [],
          metadata: meta,
          stock: p.stock ?? 0,
          isFeatured: Boolean(p.isFeatured),
          trackInventory: p.trackInventory !== false,
          mainImage: p.mainImage || null,
          images: Array.isArray(p.images) ? p.images : [],
          category: p.category ? { name: p.category.name || p.category } : null,
          searchScore: 1,
          productVariants: (p.productVariants || []).map(v => ({
            name: v.name,
            type: v.type,
            sku: v.sku,
            stock: v.stock,
            trackInventory: v.trackInventory,
            isActive: v.isActive,
          })),
        };
      });

      return res.json({
        success: true,
        data: products,
        meta: {
          query: '',
          count: products.length,
          recoveryUsed: false,
          recoveryStrategy: null,
          latencyMs: 0,
          didYouMean: null,
          searchMode: 'list',
        },
      });
    }

    const result = await unifiedSearchOrchestrator.search(companyId, query, {
      limit: safeLimit,
      conversationId: conversationId || undefined,
      disableEmbeddings: !vectorEnabled,
      skipRecovery: !vectorEnabled,
      intentSlots: {
        ...(productSize ? { productSize } : {}),
        ...(productColor ? { productColor } : {}),
      },
    });

    const parseMeta = (raw) => {
      if (!raw) return {};
      if (typeof raw === 'object') return raw;
      try { return JSON.parse(raw); } catch { return {}; }
    };

    const products = result.products.map((p) => {
      const meta = parseMeta(p.metadata);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: Number(p.price) || 0,
        comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
        quantityOffers: Array.isArray(meta.quantityOffers) ? meta.quantityOffers : [],
        metadata: meta,
        stock: p.stock ?? 0,
        isFeatured: Boolean(p.isFeatured),
        trackInventory: p.trackInventory !== false,
        mainImage: p.mainImage || null,
        images: Array.isArray(p.images) ? p.images : [],
        category: p.category ? { name: p.category.name || p.category } : null,
        searchScore: p.searchScore || 0,
        productVariants: Array.isArray(p.productVariants) ? p.productVariants.map(v => ({
          name: v.name,
          type: v.type,
          sku: v.sku,
          stock: v.stock,
          trackInventory: v.trackInventory,
          isActive: v.isActive,
        })) : [],
      };
    });

    return res.json({
      success: true,
      data: products,
      meta: {
        query,
        count: products.length,
        recoveryUsed: result.recoveryUsed,
        recoveryStrategy: result.recoveryStrategy || null,
        latencyMs: result.latencyMs || 0,
        didYouMean: result.didYouMean || null,
        searchMode: vectorEnabled ? 'hybrid' : 'text',
      },
    });
  } catch (error) {
    console.error('[ai-bridge] product-search failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
