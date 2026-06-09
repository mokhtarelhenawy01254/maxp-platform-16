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

const unifiedSearchOrchestrator = require('../legacy-ai-agent/aiAgent/utils/UnifiedProductSearchOrchestrator');

router.post('/product-search', async (req, res) => {
  try {
    const { companyId, query, limit = 10, productSize, productColor, conversationId } = req.body || {};
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });
    if (!query?.trim()) return res.status(400).json({ success: false, error: 'query is required' });

    const safeLimit = Math.min(Math.max(Number(limit), 1), 20);

    const result = await unifiedSearchOrchestrator.search(companyId, query, {
      limit: safeLimit,
      conversationId: conversationId || undefined,
      intentSlots: {
        ...(productSize ? { productSize } : {}),
        ...(productColor ? { productColor } : {}),
      },
    });

    const products = result.products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price) || 0,
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      stock: p.stock ?? 0,
      isFeatured: Boolean(p.isFeatured),
      trackInventory: p.trackInventory !== false,
      mainImage: p.mainImage || null,
      images: Array.isArray(p.images) ? p.images : [],
      category: p.category ? { name: p.category.name || p.category } : null,
      searchScore: p.searchScore || 0,
    }));

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
      },
    });
  } catch (error) {
    console.error('[ai-bridge] product-search failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
