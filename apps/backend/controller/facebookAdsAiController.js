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
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
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
        } finally {
          await prisma.$disconnect();
        }
      }

      if (!targetAgentId) {
        return res.status(404).json({
          success: false,
          error: 'لم يتم العثور على وكيل ميديا باير مفعل للشركة. يرجى تفعيل الوكيل أولاً.',
        });
      }

      const result = await aiServiceAdminClient.chatWithAgent({
        companyId,
        agentId: targetAgentId,
        message,
        threadId: `${threadId}_${companyId}`,
      });

      return res.json({
        success: true,
        reply: result?.reply || '',
        status: result?.status || 'ok',
        tool_calls: result?.tool_calls || [],
        threadId: result?.thread_id || `${threadId}_${companyId}`,
        draft_id: result?.draft_id || null,
        agentId: targetAgentId,
      });
    } catch (error) {
      console.error('❌ Error in Facebook Ads AI Copilot chat:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to communicate with AI Media Buyer',
      });
    }
  }
}

module.exports = new FacebookAdsAiController();
