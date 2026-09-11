/**
 * Facebook Ads AI Controller
 * 
 * Exposes endpoints for managing AI-generated Facebook ad drafts,
 * inspecting strategic angles, and executing safe one-click publishing.
 */

const facebookAdsAiDraftService = require('../services/facebookAdsAiDraftService');
const facebookAdsController = require('./facebookAdsController');

class FacebookAdsAiController {
  /**
   * POST /api/v1/facebook-ads/ai/drafts
   * Create an AI draft run with multiple strategic angles
   */
  async createDraftRun(req, res) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id || req.user?.userId || null;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const {
        productUrl,
        productSnapshot,
        adAccountId,
        pageId,
        pixelId,
        budgetAmount,
        targetCountry,
        targetGenders,
        ageMin,
        ageMax,
        angles,
      } = req.body || {};

      if (!productUrl) {
        return res.status(400).json({ success: false, error: 'productUrl is required' });
      }

      if (!Array.isArray(angles) || angles.length === 0) {
        return res.status(400).json({ success: false, error: 'angles must be a non-empty array' });
      }

      const run = await facebookAdsAiDraftService.createDraftRun({
        companyId,
        userId,
        productUrl,
        productSnapshot,
        adAccountId,
        pageId,
        pixelId,
        budgetAmount,
        targetCountry,
        targetGenders,
        ageMin,
        ageMax,
        angles,
      });

      return res.status(201).json({
        success: true,
        data: run,
        message: `تم إنشاء ${run.drafts?.length || 0} مسودات إعلانية بنجاح وتنتظر موافقتك.`,
      });
    } catch (error) {
      console.error('❌ Error creating Facebook Ads AI draft run:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create AI draft run',
      });
    }
  }

  /**
   * GET /api/v1/facebook-ads/ai/drafts
   * List recent AI draft runs
   */
  async listDraftRuns(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const limit = parseInt(req.query?.limit || '10', 10);
      const runs = await facebookAdsAiDraftService.listDraftRuns(companyId, limit);

      return res.json({
        success: true,
        data: runs,
        count: runs.length,
      });
    } catch (error) {
      console.error('❌ Error listing Facebook Ads AI draft runs:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to list AI draft runs',
      });
    }
  }

  /**
   * GET /api/v1/facebook-ads/ai/drafts/:runId
   * Get draft run details with its angles
   */
  async getDraftRun(req, res) {
    try {
      const companyId = req.user?.companyId;
      const { runId } = req.params;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const run = await facebookAdsAiDraftService.getDraftRun(companyId, runId);
      if (!run) {
        return res.status(404).json({ success: false, error: 'Draft run not found' });
      }

      return res.json({
        success: true,
        data: run,
      });
    } catch (error) {
      console.error('❌ Error getting Facebook Ads AI draft run:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get AI draft run',
      });
    }
  }

  /**
   * POST /api/v1/facebook-ads/ai/drafts/:draftId/publish
   * Publish a specific approved AI draft to Meta Ads
   */
  async publishDraft(req, res) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id || req.user?.userId || null;
      const { draftId } = req.params;
      const overrides = req.body || {};

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const draft = await facebookAdsAiDraftService.getDraftById(companyId, draftId);
      if (!draft) {
        return res.status(404).json({ success: false, error: 'Draft not found' });
      }

      if (draft.status === 'PUBLISHED') {
        return res.status(400).json({
          success: false,
          error: 'هذه المسودة تم نشرها مسبقاً على حساب فيسبوك.',
          campaignId: draft.facebookCampaignId,
          adSetId: draft.facebookAdSetId,
          adId: draft.facebookAdId,
        });
      }

      // Prepare complete payload and pipe into existing full-ad creation pipeline
      const fullAdPayload = facebookAdsAiDraftService.preparePublishPayload(draft, overrides);

      // Auto-resolve pageId, adAccountId, and pixelId from company integrations if missing
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      const prisma = getSharedPrismaClient();
      try {
        if (!fullAdPayload.pageId) {
          const connectedPage = await prisma.facebookPage.findFirst({
            where: { companyId, status: 'connected' },
            orderBy: { updatedAt: 'desc' }
          });
          if (connectedPage?.pageId) {
            fullAdPayload.pageId = connectedPage.pageId;
          }
        }
        if (!fullAdPayload.adAccountId) {
          const defaultAccount = await prisma.facebookAdAccount.findFirst({
            where: { companyId, isActive: true },
            orderBy: { updatedAt: 'desc' }
          });
          if (defaultAccount?.accountId) {
            fullAdPayload.adAccountId = defaultAccount.accountId;
          }
        }
        if (!fullAdPayload.pixelId) {
          const sfSettings = await prisma.storefrontSettings?.findFirst({
            where: { companyId }
          });
          const pixelId = sfSettings?.facebookPixelId || sfSettings?.pixelId;
          if (pixelId) {
            fullAdPayload.pixelId = pixelId;
          }
        }
      } catch (dbErr) {
        console.warn('⚠️ Could not auto-resolve FB assets:', dbErr.message);
      }

      // If objective is OUTCOME_SALES but no pixel exists, change to OUTCOME_TRAFFIC so Meta doesn't reject it
      if (!fullAdPayload.pixelId && fullAdPayload.objective === 'OUTCOME_SALES') {
        fullAdPayload.objective = 'OUTCOME_TRAFFIC';
      }

      console.log('🚀 Publishing Full Ad Payload:', JSON.stringify({
        campaignName: fullAdPayload.campaignName,
        pageId: fullAdPayload.pageId,
        adAccountId: fullAdPayload.adAccountId,
        pixelId: fullAdPayload.pixelId,
        budgetAmount: fullAdPayload.budgetAmount,
        status: fullAdPayload.status,
        linkUrl: fullAdPayload.linkUrl
      }));

      // Create a mocked request to delegate to createFullAd safely
      const mockReq = {
        user: req.user,
        body: fullAdPayload,
      };

      // Wrap response to capture Meta IDs and update draft record
      let capturedResponse = null;
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            capturedResponse = { statusCode: code, data };
            return res.status(code).json(data);
          },
        }),
        json: async (data) => {
          capturedResponse = { statusCode: 200, data };
          if (data?.success && data?.data) {
            try {
              await facebookAdsAiDraftService.markDraftPublished(companyId, draftId, {
                facebookCampaignId: data.data.campaign?.id || data.data.campaignId,
                facebookAdSetId: data.data.adSet?.id || data.data.adSetId,
                facebookAdId: data.data.ad?.id || data.data.adId,
                facebookCreativeId: data.data.creative?.id || data.data.creativeId,
              });
            } catch (updateErr) {
              console.warn('⚠️ Failed to update draft publish status:', updateErr.message);
            }
          }
          return res.json(data);
        },
      };

      return await facebookAdsController.createFullAd(mockReq, mockRes);
    } catch (error) {
      console.error('❌ Error publishing Facebook Ads AI draft:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to publish draft to Meta',
      });
    }
  }

  /**
   * POST /api/v1/facebook-ads/ai/chat
   * Chat directly with the Facebook Media Buyer Agent from the dashboard
   */
  async chat(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const { message, threadId = 'facebook_ads_copilot_thread', agentId: requestedAgentId } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'message is required' });
      }

      const aiServiceAdminClient = require('../services/aiServiceAdminClient');
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      let targetAgentId = requestedAgentId;

      // 1. First attempt: Discover agent via AI Service Admin Client
      if (!targetAgentId) {
        try {
          const agents = await aiServiceAdminClient.listAgents(companyId);
          if (Array.isArray(agents) && agents.length > 0) {
            const mediaBuyer = agents.find(a => a.role === 'MEDIA_BUYER' && (a.status === 'ACTIVE' || !a.status))
              || agents.find(a => a.role === 'MEDIA_BUYER');
            if (mediaBuyer?.id) {
              targetAgentId = mediaBuyer.id;
            }
          }
        } catch (err) {
          console.warn('[FacebookAdsAI] Could not list agents from aiServiceAdminClient:', err.message);
        }
      }

      // 2. Second attempt: Fallback query directly to PostgreSQL ai.agents
      if (!targetAgentId) {
        const prisma = getSharedPrismaClient();
        try {
          const rows = await prisma.$queryRaw`
            SELECT id, name, role FROM ai.agents 
            WHERE role = 'MEDIA_BUYER' 
              AND (company_id = ${companyId} OR company_id IS NULL)
            ORDER BY (CASE WHEN company_id = ${companyId} THEN 0 ELSE 1 END), created_at DESC
            LIMIT 1
          `;
          if (rows && rows.length > 0) {
            targetAgentId = rows[0].id;
          }
        } catch (err) {
          console.warn('[FacebookAdsAI] Could not query ai.agents table directly:', err.message);
        }
      }

      // 3. Third attempt: Auto-provision / lazy-spawn MEDIA_BUYER agent if not yet present
      if (!targetAgentId) {
        try {
          console.log(`[FacebookAdsAI] Auto-provisioning MEDIA_BUYER agent for company ${companyId}...`);
          const spawned = await aiServiceAdminClient.spawnAgent({
            companyId,
            role: 'MEDIA_BUYER',
            name: 'خبير إعلانات فيسبوك (Facebook Media Buyer)',
            templateSlug: 'facebook-media-buyer-agent',
            status: 'ACTIVE',
            allowedTools: [
              'product_search',
              'inventory_check',
              'facebook_ad_analyze_product',
              'facebook_ad_create_full_draft',
              'facebook_ad_publish_draft',
              'facebook_ad_get_decision',
              'competitor_get_ads',
              'sales_revenue',
              'company_snapshot',
              'audit_read',
              'generate_social_image',
            ],
          });
          if (spawned?.id) {
            targetAgentId = spawned.id;
          }
        } catch (spawnErr) {
          console.warn('[FacebookAdsAI] Could not auto-spawn agent via aiServiceAdminClient:', spawnErr.message);
        }
      }

      // Fallback agent identifier if DB records are still populating
      if (!targetAgentId) {
        targetAgentId = `media_buyer_${String(companyId).slice(-6)}`;
      }

      try {
        const result = await aiServiceAdminClient.chatWithAgent({
          companyId,
          agentId: targetAgentId,
          message,
          threadId: `${threadId}_${companyId}`,
          channel: 'dashboard',
        });

        // Intercept quota / budget / uncharged error states inside response payload
        const resErrorCode = result?.error_code || result?.errorCode;
        const isQuotaState = (
          result?.status === 'error' && (
            resErrorCode === 'LLM_RATE_LIMITED' ||
            resErrorCode === 'NO_ACTIVE_KEY' ||
            resErrorCode === 'BUDGET_EXCEEDED' ||
            String(result?.error || '').toLowerCase().includes('quota') ||
            String(result?.error || '').toLowerCase().includes('budget') ||
            String(result?.error || '').toLowerCase().includes('key')
          )
        );

        if (isQuotaState) {
          return res.status(200).json({
            success: true,
            status: 'NEEDS_RECHARGE',
            reply: 'رصيد استهلاك باقة الذكاء الاصطناعي لحسابك بحاجة إلى تجديد لمواصلة إطلاق وتطوير الحملات الإعلانية. تم حفظ جميع المسودات والبيانات السابقة بأمان تام.',
            recharge_action: {
              url: '/settings/billing',
              type: 'WALLET_RECHARGE',
              action_label: 'شحن رصيد الذكاء الاصطناعي الآن'
            },
            threadId: result?.thread_id || `${threadId}_${companyId}`,
            draft_id: null,
            agentId: targetAgentId,
          });
        }

        return res.json({
          success: true,
          reply: result?.reply || '',
          status: result?.status || 'ok',
          tool_calls: result?.tool_calls || [],
          threadId: result?.thread_id || `${threadId}_${companyId}`,
          draft_id: result?.draft_id || null,
          agentId: targetAgentId,
        });
      } catch (chatError) {
        const errMsg = String(chatError.message || '').toLowerCase();
        const isUnchargedOrQuota = (
          errMsg.includes('key') ||
          errMsg.includes('quota') ||
          errMsg.includes('balance') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('credit') ||
          errMsg.includes('budget') ||
          errMsg.includes('502') ||
          errMsg.includes('no llm client')
        );

        if (isUnchargedOrQuota) {
          console.warn('[FacebookAdsAI] Graceful handling of uncharged/quota state for company:', companyId, chatError.message);
          return res.status(200).json({
            success: true,
            status: 'NEEDS_RECHARGE',
            reply: 'رصيد استهلاك باقة الذكاء الاصطناعي لحسابك بحاجة إلى تجديد لمواصلة إطلاق وتطوير الحملات الإعلانية. تم حفظ جميع المسودات والبيانات السابقة بأمان تام.',
            recharge_action: {
              url: '/settings/billing',
              type: 'WALLET_RECHARGE',
              action_label: 'شحن رصيد الذكاء الاصطناعي الآن'
            },
            threadId: `${threadId}_${companyId}`,
            draft_id: null,
            agentId: targetAgentId,
          });
        }

        console.error('❌ Error in Facebook Ads AI Copilot chat:', chatError);
        return res.status(500).json({
          success: false,
          error: chatError.message || 'Failed to communicate with AI Media Buyer',
        });
      }
    } catch (outerError) {
      console.error('❌ Unexpected error in Facebook Ads AI chat controller:', outerError);
      return res.status(500).json({
        success: false,
        error: outerError.message || 'Unexpected server error',
      });
    }
  }
}

module.exports = new FacebookAdsAiController();
