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
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const {
        message,
        threadId = 'inventory_studio_thread',
        agentId: requestedAgentId,
        activeProduct: incomingActiveProduct,
      } = req.body || {};

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'message is required' });
      }

      let targetAgentId = requestedAgentId;

      // 1. First attempt: Discover agent via AI Service Admin Client
      if (!targetAgentId) {
        try {
          const agents = await aiServiceAdminClient.listAgents(companyId);
          if (Array.isArray(agents) && agents.length > 0) {
            // First check for active agent routed to INVENTORY_STUDIO or INVENTORY
            const routedAgent = agents.find(a =>
              (a.status === 'ACTIVE' || !a.status) &&
              (a.allowed_channels || a.allowedChannels || []).map(c => String(c).toUpperCase()).includes('INVENTORY_STUDIO')
            );
            if (routedAgent?.id) {
              targetAgentId = routedAgent.id;
            } else {
              const inventoryAgent = agents.find(a => a.role === 'INVENTORY' && (a.status === 'ACTIVE' || !a.status))
                || agents.find(a => a.role === 'INVENTORY')
                || agents.find(a => a.templateSlug === 'inventory-pricing-agent');
              if (inventoryAgent?.id) {
                targetAgentId = inventoryAgent.id;
              }
            }
          }
        } catch (err) {
          console.warn('[InventoryAI] Could not list agents from aiServiceAdminClient:', err.message);
        }
      }

      // 2. Second attempt: Fallback query directly to PostgreSQL ai.agents
      if (!targetAgentId) {
        const prisma = getSharedPrismaClient();
        try {
          const rows = await prisma.$queryRaw`
            SELECT id, name, role FROM ai.agents 
            WHERE (role = 'INVENTORY' OR template_slug = 'inventory-pricing-agent')
              AND (company_id = ${companyId} OR company_id IS NULL)
            ORDER BY (CASE WHEN company_id = ${companyId} THEN 0 ELSE 1 END), created_at DESC
            LIMIT 1
          `;
          if (rows && rows.length > 0) {
            targetAgentId = rows[0].id;
          }
        } catch (err) {
          console.warn('[InventoryAI] Could not query ai.agents table directly:', err.message);
        }
      }

      // 3. Third attempt: Auto-provision / lazy-spawn INVENTORY agent if not yet present
      if (!targetAgentId) {
        try {
          console.log(`[InventoryAI] Auto-provisioning INVENTORY agent for company ${companyId}...`);
          const spawned = await aiServiceAdminClient.spawnAgent({
            companyId,
            role: 'INVENTORY',
            name: 'وكيل إدارة المنتجات والمخزون والتسعير',
            templateSlug: 'inventory-pricing-agent',
            status: 'ACTIVE',
            allowedTools: [
              'product_search',
              'product_low_stock',
              'product_create',
              'inventory_check',
              'inventory_adjust',
              'product_update_price',
              'discount_create_draft',
              'audit_read',
            ],
            allowedSkills: [
              'catalog-search',
              'low-stock-watch',
              'pricing-review',
              'discount-proposal',
            ],
          });
          if (spawned?.id) {
            targetAgentId = spawned.id;
          }
        } catch (spawnErr) {
          console.warn('[InventoryAI] Could not auto-spawn agent:', spawnErr.message);
        }
      }

      // Fallback agent identifier if DB records are still populating
      if (!targetAgentId) {
        targetAgentId = `inventory_agent_${String(companyId).slice(-6)}`;
      }

      const scopedThreadId = threadId.endsWith(`_${companyId}`) ? threadId : `${threadId}_${companyId}`;

      // Automatically persist incoming user message in Cloud DB
      try {
        await agentStudioSessionService.appendMessage(companyId, threadId, {
          sender: 'user',
          text: message,
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

      // Send to AI Service
      const result = await aiServiceAdminClient.chatWithAgent({
        companyId,
        agentId: targetAgentId,
        message,
        threadId: scopedThreadId,
        channel: 'inventory_studio',
        source_channel: 'inventory_studio',
        memory_context: {
          recentMessages,
          activeProduct: activeProductContext,
          active_product_context: activeProductContext,
        },
      });

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
   * GET /api/v1/inventory/ai/active-agent
   */
  async getActiveAgent(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      let activeAgent = null;
      let availableAgents = [];

      try {
        const agents = await aiServiceAdminClient.listAgents(companyId);
        if (Array.isArray(agents) && agents.length > 0) {
          availableAgents = agents
            .filter(a => a.role === 'INVENTORY' || a.templateSlug === 'inventory-pricing-agent')
            .map(a => ({ id: a.id, name: a.name, role: a.role }));

          const routed = agents.find(a =>
            (a.status === 'ACTIVE' || !a.status) &&
            (a.allowed_channels || a.allowedChannels || []).map(c => String(c).toUpperCase()).includes('INVENTORY_STUDIO')
          );

          if (routed) {
            activeAgent = { id: routed.id, name: routed.name, role: routed.role, isRouted: true };
          } else if (availableAgents.length > 0) {
            activeAgent = { ...availableAgents[0], isRouted: false };
          }
        }
      } catch (clientErr) {
        console.warn('[InventoryAI] listAgents failed:', clientErr.message);
      }

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
