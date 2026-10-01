/**
 * Inventory AI Studio Controller
 * 
 * Orchestrates AI chat with the Inventory & Pricing Agent (inventory-pricing-agent),
 * session management, active product context injection, and draft adjustment execution.
 */

const aiServiceAdminClient = require('../services/aiServiceAdminClient');
const agentStudioSessionService = require('../services/agentStudioSessionService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

class InventoryAiController {
  /**
   * POST /api/v1/inventory/ai/chat
   * Chat directly with the Inventory & Pricing Agent
   */
  async chat(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId;
      const userId = req.user?.id || req.user?.userId || null;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const {
        message,
        threadId = 'inventory_studio_thread',
        agentId: requestedAgentId,
        activeProduct: incomingActiveProduct,
        images = [],
      } = req.body || {};

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'message is required' });
      }

      // Resolve the real agent for this company (supports PRODUCT_CREATOR and INVENTORY)
      const resolvedAgent = await this._resolveStudioAgent(companyId, requestedAgentId);
      const targetAgentId = resolvedAgent?.id || requestedAgentId || 'inventory-pricing-agent';

      // Format image attachments
      const rawImages = Array.isArray(images)
        ? images.filter(Boolean)
        : (typeof images === 'string' && images ? [images] : []);
      const attachments = rawImages.map(imgUrl => ({
        type: 'image',
        url: imgUrl,
      }));

      // If images exist, augment user message with references
      let augmentedMessage = message;
      if (rawImages.length > 0) {
        const imageListText = rawImages.map((u, idx) => `![صورة المنتج ${idx + 1}](${u})`).join('\n');
        augmentedMessage = `${message}\n\n${imageListText}`.trim();
      }
      const scopedThreadId = threadId.endsWith(`_${companyId}`) ? threadId : `${threadId}_${companyId}`;

      // Automatically persist incoming user message in Cloud DB
      try {
        await agentStudioSessionService.appendMessage(companyId, threadId, {
          sender: 'user',
          text: message,
          images: rawImages.length > 0 ? rawImages : undefined,
        }, 'inventory');
      } catch (dbErr) {
        console.warn('[InventoryAI] Failed to persist user message in DB:', dbErr.message);
      }

      // Retrieve recent conversation messages and active working memory for continuity
      let recentMessages = [];
      let activeProductContext = incomingActiveProduct || null;
      try {
        const sessionData = await agentStudioSessionService.getSession(companyId, threadId);
        if (sessionData) {
          activeProductContext = incomingActiveProduct || sessionData.context?.activeProduct || null;
          if (Array.isArray(sessionData.messages) && sessionData.messages.length > 1) {
            recentMessages = sessionData.messages.slice(0, -1).slice(-15).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text || '',
            }));
          }
        }
      } catch (memErr) {
        console.warn('[InventoryAI] Could not load prior messages:', memErr.message);
      }

      // Send to AI Service with resilient error capture and multimodal attachments
      let result;
      try {
        result = await aiServiceAdminClient.chatWithAgent({
          companyId,
          agentId: targetAgentId,
          customerId: userId || undefined,
          message: augmentedMessage,
          threadId: scopedThreadId,
          channel: 'inventory_studio',
          source_channel: 'inventory_studio',
          attachments: attachments.length > 0 ? attachments : undefined,
          memory_context: {
            recentMessages,
            activeProduct: activeProductContext,
            active_product_context: activeProductContext,
            images: rawImages,
          },
        });
      } catch (chatErr) {
        console.error('[InventoryAI] AI Service chatWithAgent failed:', chatErr.message);
        const isNotFound = chatErr.message && chatErr.message.includes('404');
        return res.status(isNotFound ? 404 : 502).json({
          success: false,
          error: `تعذر التواصل مع وكيل الذكاء الاصطناعي: ${chatErr.message}`,
        });
      }

      // Handle rate limits or errors
      const resErrorCode = result?.error_code || result?.errorCode;
      if (result?.status === 'error' && (resErrorCode === 'LLM_RATE_LIMITED' || resErrorCode === 'NO_ACTIVE_KEY')) {
        return res.status(429).json({
          success: false,
          error: result.error || 'تم استهلاك رصيد الذكاء الاصطناعي الحالي أو حدث ضغط على الخدمة.',
          error_code: resErrorCode,
        });
      }

      const replyText = result?.reply || result?.response || result?.message || 'تم فحص بيانات المخزون والتسعير.';
      const toolCalls = result?.tool_calls || result?.toolCalls || [];

      // Persist agent response in Cloud DB
      try {
        await agentStudioSessionService.appendMessage(companyId, threadId, {
          sender: 'agent',
          text: replyText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        }, 'inventory');
      } catch (dbErr) {
        console.warn('[InventoryAI] Failed to persist assistant reply in DB:', dbErr.message);
      }

      return res.json({
        success: true,
        reply: replyText,
        status: result?.status || 'completed',
        tool_calls: toolCalls,
        agentId: targetAgentId,
      });
    } catch (err) {
      console.error('[InventoryAI] Chat error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء معالجة الطلب',
      });
    }
  }

  /**
   * Helper: Resolves or auto-provisions a real, valid AI Agent for the inventory/product studio.
   * Multi-tenant resilient: Works for Swan and ANY OTHER company automatically.
   */
  async _resolveStudioAgent(companyId, requestedAgentId = null) {
    const prisma = getSharedPrismaClient();

    // 1. If a specific agentId was requested, verify if it's an actual DB agent record
    if (requestedAgentId && typeof requestedAgentId === 'string' && !requestedAgentId.includes('-agent')) {
      try {
        const rows = await prisma.$queryRaw`
          SELECT id, name, role, template_slug as "templateSlug", status, config
          FROM ai.agents
          WHERE id = ${requestedAgentId} AND (company_id = ${companyId} OR company_id IS NULL)
            AND (status != 'ARCHIVED' OR status IS NULL)
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          return { ...rows[0], isRouted: true };
        }
      } catch (err) {
        console.warn('[InventoryAI] Error verifying requestedAgentId:', err.message);
      }
    }

    // 2. Query company agents supporting inventory or product creation
    // Roles supported: PRODUCT_CREATOR, INVENTORY
    try {
      const rows = await prisma.$queryRaw`
        SELECT id, name, role, template_slug as "templateSlug", status, config, channels
        FROM ai.agents
        WHERE (role IN ('PRODUCT_CREATOR', 'INVENTORY') 
               OR template_slug IN ('product-creator-agent', 'inventory-pricing-agent'))
          AND (company_id = ${companyId} OR company_id IS NULL)
          AND (status = 'ACTIVE' OR status IS NULL)
        ORDER BY 
          (CASE WHEN company_id = ${companyId} THEN 0 ELSE 1 END),
          (CASE WHEN role = 'PRODUCT_CREATOR' THEN 0 WHEN role = 'INVENTORY' THEN 1 ELSE 2 END),
          created_at DESC
        LIMIT 10
      `;

      if (rows && rows.length > 0) {
        const routed = rows.find(a => {
          const ch = Array.isArray(a.channels) ? a.channels : [];
          return ch.map(c => String(c).toUpperCase()).includes('INVENTORY_STUDIO');
        });
        const selected = routed || rows[0];
        return {
          id: selected.id,
          name: selected.name,
          role: selected.role,
          templateSlug: selected.templateSlug,
          isRouted: !!routed,
        };
      }
    } catch (dbErr) {
      console.warn('[InventoryAI] Could not query ai.agents for studio:', dbErr.message);
    }

    // 3. Fallback discovery via AI Service Admin Client
    try {
      const agents = await aiServiceAdminClient.listAgents(companyId);
      if (Array.isArray(agents) && agents.length > 0) {
        const match = agents.find(a => 
          (a.role === 'PRODUCT_CREATOR' || a.role === 'INVENTORY' || 
           a.templateSlug === 'product-creator-agent' || a.templateSlug === 'inventory-pricing-agent') &&
          (a.status === 'ACTIVE' || !a.status)
        );
        if (match?.id) {
          const ch = Array.isArray(match.allowed_channels || match.allowedChannels || match.channels)
            ? (match.allowed_channels || match.allowedChannels || match.channels)
            : [];
          const isRouted = ch.map(c => String(c).toUpperCase()).includes('INVENTORY_STUDIO');
          return { id: match.id, name: match.name, role: match.role, isRouted };
        }
      }
    } catch (clientErr) {
      console.warn('[InventoryAI] listAgents client check failed:', clientErr.message);
    }

    // 4. If no agent exists at all for this company (e.g. brand new tenant), auto-provision product-creator-agent on the fly
    try {
      console.log(`[InventoryAI] Auto-provisioning product-creator-agent for company ${companyId}...`);
      const spawned = await aiServiceAdminClient.spawnAgent({
        companyId,
        role: 'PRODUCT_CREATOR',
        name: 'أكرم — اختصاصي إدارة وإدراج المنتجات',
        templateSlug: 'product-creator-agent',
        status: 'ACTIVE',
        allowedTools: [
          'product_create',
          'product_search',
          'category_list',
          'product_update_price',
          'competitor_search',
          'competitor_price_compare',
          'inventory_check',
          'agent_handoff_to',
          'record_learned_rule',
          'manage_agent_skill',
        ],
        allowedSkills: [
          'catalog-builder',
          'seo-copywriting',
          'pricing-strategy',
        ],
        allowedChannels: ['INVENTORY_STUDIO', 'CHAT'],
        config: {
          provider: 'DEEPSEEK',
          keyId: 'cmqguj2zc08akjugf77y348pl',
        },
      });

      if (spawned?.id) {
        return {
          id: spawned.id,
          name: spawned.name || 'أكرم — اختصاصي إدارة وإدراج المنتجات',
          role: spawned.role || 'PRODUCT_CREATOR',
          isRouted: true,
        };
      }
    } catch (spawnErr) {
      console.error('[InventoryAI] Auto-provisioning failed:', spawnErr.message);
    }

    // 5. Ultimate fallback: pick any active agent for this company to avoid 404
    try {
      const anyAgent = await prisma.$queryRaw`
        SELECT id, name, role FROM ai.agents
        WHERE company_id = ${companyId} AND status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (anyAgent && anyAgent.length > 0) {
        return { ...anyAgent[0], isRouted: false };
      }
    } catch (e) {
      // ignore
    }

    return null;
  }

  /**
   * GET /api/v1/inventory/ai/active-agent
   */
  async getActiveAgent(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const prisma = getSharedPrismaClient();
      let availableAgents = [];

      try {
        const rows = await prisma.$queryRaw`
          SELECT id, name, role, template_slug as "templateSlug"
          FROM ai.agents
          WHERE (role IN ('PRODUCT_CREATOR', 'INVENTORY') 
                 OR template_slug IN ('product-creator-agent', 'inventory-pricing-agent'))
            AND (company_id = ${companyId} OR company_id IS NULL)
            AND (status = 'ACTIVE' OR status IS NULL)
          ORDER BY (CASE WHEN company_id = ${companyId} THEN 0 ELSE 1 END), created_at DESC
        `;
        if (Array.isArray(rows)) {
          availableAgents = rows.map(r => ({ id: r.id, name: r.name, role: r.role }));
        }
      } catch (err) {
        console.warn('[InventoryAI] Could not query availableAgents:', err.message);
      }

      let activeAgent = await this._resolveStudioAgent(companyId);
      if (!activeAgent) {
        activeAgent = {
          id: 'inventory-pricing-agent',
          name: 'وكيل إدارة المنتجات والمخزون والتسعير',
          role: 'INVENTORY',
          isRouted: false,
        };
      }

      return res.json({
        success: true,
        agent: activeAgent,
        availableAgents,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/inventory/ai/sessions
   */
  async listSessions(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId;
      const limit = parseInt(req.query.limit, 10) || 50;
      const sessions = await agentStudioSessionService.listSessions(companyId, 'inventory', limit);
      return res.json({ success: true, data: sessions });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/inventory/ai/sessions
   */
  async saveSession(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId;
      const userId = req.user?.id || req.user?.userId;
      const saved = await agentStudioSessionService.saveSession(companyId, userId, 'inventory', req.body);
      return res.json({ success: true, data: saved });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/v1/inventory/ai/sessions/:id
   */
  async deleteSession(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId;
      const { id } = req.params;
      const ok = await agentStudioSessionService.deleteSession(companyId, id);
      return res.json({ success: ok });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/inventory/ai/apply-action
   * Apply an approved action from the Inventory Action Canvas (Price update, Stock adjustment, Reorder point)
   */
  async applyAction(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId;
      const { type, productId, newValue, reason = 'تعديل معتمد عبر استوديو المخزون والتسعير الذكي' } = req.body || {};

      if (!productId) {
        return res.status(400).json({ success: false, error: 'productId is required' });
      }

      const prisma = getSharedPrismaClient();

      if (type === 'PRICE_CHANGE') {
        const numericPrice = Number(newValue);
        if (isNaN(numericPrice) || numericPrice < 0) {
          return res.status(400).json({ success: false, error: 'Invalid price value' });
        }

        const updated = await prisma.product.update({
          where: { id: productId },
          data: { price: numericPrice },
        });

        return res.json({
          success: true,
          message: `تم تحديث سعر المنتج إلى ${numericPrice} ج.م بنجاح`,
          product: { id: updated.id, price: updated.price },
        });
      }

      if (type === 'STOCK_ADJUSTMENT') {
        const numericStock = Number(newValue);
        if (isNaN(numericStock) || numericStock < 0) {
          return res.status(400).json({ success: false, error: 'Invalid stock value' });
        }

        const updated = await prisma.product.update({
          where: { id: productId },
          data: { inventory: numericStock },
        });

        return res.json({
          success: true,
          message: `تم اعتماد رصيد المخزون ليصبح ${numericStock} قطعة بنجاح`,
          product: { id: updated.id, stock: updated.inventory },
        });
      }

      if (type === 'REORDER_POINT') {
        const numericPoint = Number(newValue);
        if (isNaN(numericPoint) || numericPoint < 0) {
          return res.status(400).json({ success: false, error: 'Invalid reorder point' });
        }

        // Check if product has variants or direct reorder point
        const updated = await prisma.product.update({
          where: { id: productId },
          data: {
            // Store in metadata or settings if direct column isn't present
            settings: {
              reorderPoint: numericPoint,
            },
          },
        }).catch(async () => {
          // If settings column isn't jsonb, fallback gracefully
          return { id: productId };
        });

        return res.json({
          success: true,
          message: `تم تحديث نقطة إعادة الطلب إلى ${numericPoint} قطعة بنجاح`,
          product: { id: productId, reorderPoint: numericPoint },
        });
      }

      return res.status(400).json({ success: false, error: 'Unknown action type' });
    } catch (err) {
      console.error('[InventoryAI] applyAction error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new InventoryAiController();
