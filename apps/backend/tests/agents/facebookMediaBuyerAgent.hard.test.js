/**
 * 🚀 Facebook Media Buyer Agent - Hard / Stress Testing Suite (2026 Standards)
 * 
 * Tests unit economics, dynamic multi-angle ad drafts, zero-canned decision engine,
 * auto-provisioning, graceful handling of uncharged/quota limits, and safe Meta publishing.
 */

const facebookAdsAiDraftService = require('../../services/facebookAdsAiDraftService');
const facebookAdsAiController = require('../../controller/facebookAdsAiController');
const facebookAdsController = require('../../controller/facebookAdsController');
const aiServiceAdminClient = require('../../services/aiServiceAdminClient');

jest.mock('../../services/aiServiceAdminClient');
jest.mock('../../controller/facebookAdsController');

describe('Facebook Media Buyer Agent - Hard / Stress Testing Suite', () => {
  const companyId = 'comp_test_hard_mb_2026';
  const userId = 'user_test_admin';

  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      facebookAdsAiDraftRun: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      facebookAdsAiDraft: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      facebookPage: {
        findFirst: jest.fn().mockResolvedValue({ pageId: 'page_meta_123', status: 'connected' }),
      },
      facebookAdAccount: {
        findFirst: jest.fn().mockResolvedValue({ accountId: 'act_meta_456', isActive: true }),
      },
      storefrontSettings: {
        findFirst: jest.fn().mockResolvedValue({ facebookPixelId: 'pixel_meta_789' }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    // Wire mock prisma into facebookAdsAiDraftService
    facebookAdsAiDraftService._prisma = mockPrisma;
  });

  afterEach(() => {
    facebookAdsAiDraftService._prisma = null;
  });

  // =========================================================================
  // 1. Hard Tests: Multi-Angle Draft Creation & Persistence
  // =========================================================================
  describe('1. Multi-Angle Draft Creation & Validation', () => {
    it('creates 3 distinct strategic angles and persists valid JSON payloads', async () => {
      const angles = [
        {
          angle: 'pain_point',
          campaign_name: 'AI Test - Angle 1 (Pain-Point)',
          adset_name: 'AI AdSet - Pain-Point',
          ad_name: 'AI Ad - Hook 1',
          primary_text: 'بتعاني من آلام الظهر أثناء الجلوس لفترات طويلة؟ كرسينا الطبي يحل المشكلة فوراً.',
          headline: 'وداعاً لآلام الظهر ⚡',
          budget_amount: 250,
          target_country: 'EG',
          target_genders: 'ALL',
        },
        {
          angle: 'direct_offer',
          campaign_name: 'AI Test - Angle 2 (Special Offer)',
          adset_name: 'AI AdSet - Offer',
          ad_name: 'AI Ad - Hook 2',
          primary_text: 'خصم 30% وشحن مجاني لجميع المحافظات حتى نهاية الأسبوع فقط.',
          headline: 'عرض حصري لفترة محدودة 🎁',
          budget_amount: 300,
          target_country: 'EG',
        },
        {
          angle: 'social_proof',
          campaign_name: 'AI Test - Angle 3 (Social Proof)',
          adset_name: 'AI AdSet - Social Proof',
          ad_name: 'AI Ad - Hook 3',
          primary_text: 'أكثر من 15,000 عميل سعيد يوصون بمنتجنا لراحته الفائقة وضمانه المعتمد.',
          headline: 'الخيار الأول لأكثر من 15 ألف عميل ⭐',
          budget_amount: 200,
          target_country: 'EG',
        },
      ];

      mockPrisma.facebookAdsAiDraftRun.create.mockImplementation(({ data }) => ({
        id: 'run_mock_123',
        ...data,
        drafts: data.drafts.create.map((d, i) => ({
          id: `draft_mock_${i + 1}`,
          ...d,
        })),
      }));

      const run = await facebookAdsAiDraftService.createDraftRun({
        companyId,
        userId,
        productUrl: 'https://mystore.maxp.online/product/ergonomic-chair',
        budgetAmount: 250,
        angles,
      });

      expect(run).toBeDefined();
      expect(run.id).toBe('run_mock_123');
      expect(run.drafts).toHaveLength(3);

      // Verify each draft has Advantage+ enabled and correct JSON structure
      run.drafts.forEach((draft, idx) => {
        expect(draft.status).toBe('DRAFT');
        const parsedFullAdData = JSON.parse(draft.createFullAdData);
        expect(parsedFullAdData.advantagePlusPlacements).toBe(true);
        expect(parsedFullAdData.advantagePlusAudience).toBe(true);
        expect(parsedFullAdData.objective).toBe('OUTCOME_SALES');
        expect(parsedFullAdData.status).toBe('PAUSED');
        expect(parsedFullAdData.primaryText).toBe(angles[idx].primary_text);
      });
    });

    it('rejects draft creation if angles array is empty or missing', async () => {
      await expect(
        facebookAdsAiDraftService.createDraftRun({
          companyId,
          productUrl: 'https://mystore.maxp.online/product/item',
          angles: [],
        })
      ).rejects.toThrow('At least one ad angle is required');
    });

    it('rejects draft creation if productUrl or companyId is missing', async () => {
      await expect(
        facebookAdsAiDraftService.createDraftRun({
          companyId: '',
          productUrl: 'https://mystore.maxp.online/product/item',
          angles: [{ angle: 'test' }],
        })
      ).rejects.toThrow('companyId is required');

      await expect(
        facebookAdsAiDraftService.createDraftRun({
          companyId,
          productUrl: '',
          angles: [{ angle: 'test' }],
        })
      ).rejects.toThrow('productUrl is required');
    });
  });

  // =========================================================================
  // 2. Hard Tests: Auto-Provisioning & Graceful "Uncharged" State ("مش مشحون")
  // =========================================================================
  describe('2. Copilot Chat: Auto-Provisioning & Quota Handling', () => {
    it('auto-provisions MEDIA_BUYER agent if company has no agent registered yet', async () => {
      aiServiceAdminClient.listAgents.mockResolvedValue([]);
      aiServiceAdminClient.spawnAgent.mockResolvedValue({
        id: 'agent_spawned_auto_999',
        role: 'MEDIA_BUYER',
        status: 'ACTIVE',
      });
      aiServiceAdminClient.chatWithAgent.mockResolvedValue({
        status: 'ok',
        reply: 'أهلاً بك! قمت بتحليل كتالوج متجرك، ومستعد لتوليد 3 زوايا إعلانية لمنتجك الأكثر مبيعاً.',
        tool_calls: [],
        thread_id: 'thread_123',
      });

      const req = {
        user: { companyId },
        body: { message: 'اقترح لي إعلانات لمنتجي الجديد' },
      };

      const jsonSpy = jest.fn();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jsonSpy,
      };

      await facebookAdsAiController.chat(req, res);

      expect(aiServiceAdminClient.spawnAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId,
          role: 'MEDIA_BUYER',
          templateSlug: 'facebook-media-buyer-agent',
        })
      );
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'ok',
          agentId: 'agent_spawned_auto_999',
          reply: expect.stringContaining('كتالوج متجرك'),
        })
      );
    });

    it('handles uncharged / quota depleted state gracefully with status: NEEDS_RECHARGE and ZERO 500 crashes', async () => {
      aiServiceAdminClient.listAgents.mockResolvedValue([
        { id: 'agent_mb_existing', role: 'MEDIA_BUYER', status: 'ACTIVE' },
      ]);

      // Simulate LLM client rate limit / insufficient quota / uncharged balance
      aiServiceAdminClient.chatWithAgent.mockRejectedValue(
        new Error('LLM client error: 502 Bad Gateway - Quota exceeded for model deepseek-flash. Please check billing balance.')
      );

      const req = {
        user: { companyId },
        body: { message: 'ما هي توصياتك لحملتي الحالية؟' },
      };

      const statusSpy = jest.fn().mockReturnThis();
      const jsonSpy = jest.fn();
      const res = {
        status: statusSpy,
        json: jsonSpy,
      };

      await facebookAdsAiController.chat(req, res);

      // Verify HTTP 200 (NOT 500!)
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'NEEDS_RECHARGE',
          reply: expect.stringContaining('رصيد استهلاك باقة الذكاء الاصطناعي'),
          recharge_action: expect.objectContaining({
            url: '/settings/billing',
            type: 'WALLET_RECHARGE',
            action_label: expect.stringContaining('شحن'),
          }),
        })
      );
    });

    it('handles no active API key error gracefully as NEEDS_RECHARGE', async () => {
      aiServiceAdminClient.listAgents.mockResolvedValue([
        { id: 'agent_mb_existing', role: 'MEDIA_BUYER', status: 'ACTIVE' },
      ]);

      aiServiceAdminClient.chatWithAgent.mockRejectedValue(
        new Error('No active API keys found for company or agent. Check ai_keys table.')
      );

      const req = {
        user: { companyId },
        body: { message: 'حلل أداء الإعلانات' },
      };

      const statusSpy = jest.fn().mockReturnThis();
      const jsonSpy = jest.fn();
      const res = {
        status: statusSpy,
        json: jsonSpy,
      };

      await facebookAdsAiController.chat(req, res);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'NEEDS_RECHARGE',
          recharge_action: expect.objectContaining({ url: '/settings/billing' }),
        })
      );
    });
  });

  // =========================================================================
  // 3. Hard Tests: One-Click Publishing Pipeline
  // =========================================================================
  describe('3. One-Click Safe Publishing Pipeline', () => {
    it('prevents publishing an already published draft', async () => {
      mockPrisma.facebookAdsAiDraft.findFirst.mockResolvedValue({
        id: 'draft_already_pub',
        companyId,
        status: 'PUBLISHED',
        facebookCampaignId: 'meta_camp_111',
        facebookAdSetId: 'meta_adset_222',
        facebookAdId: 'meta_ad_333',
      });

      const req = {
        user: { companyId },
        params: { draftId: 'draft_already_pub' },
        body: {},
      };

      const statusSpy = jest.fn().mockReturnThis();
      const jsonSpy = jest.fn();
      const res = { status: statusSpy, json: jsonSpy };

      await facebookAdsAiController.publishDraft(req, res);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('تم نشرها مسبقاً'),
          campaignId: 'meta_camp_111',
        })
      );
    });

    it('auto-switches objective to OUTCOME_TRAFFIC if pixel is not found to prevent Meta rejection', async () => {
      mockPrisma.facebookAdsAiDraft.findFirst.mockResolvedValue({
        id: 'draft_no_pixel',
        companyId,
        status: 'DRAFT',
        campaignName: 'AI Test Traffic Fallback',
        budgetAmount: 200,
        createFullAdData: JSON.stringify({
          objective: 'OUTCOME_SALES',
          budget: 200,
          campaignName: 'AI Test Traffic Fallback',
        }),
      });

      // No pixel in settings
      mockPrisma.storefrontSettings.findFirst.mockResolvedValue(null);

      facebookAdsController.createFullAd.mockImplementation(async (mockReq, mockRes) => {
        expect(mockReq.body.objective).toBe('OUTCOME_TRAFFIC');
        return mockRes.json({
          success: true,
          data: {
            campaignId: 'meta_camp_traffic_999',
            adSetId: 'meta_adset_traffic_888',
            adId: 'meta_ad_traffic_777',
          },
        });
      });

      const req = {
        user: { companyId },
        params: { draftId: 'draft_no_pixel' },
        body: {},
      };

      const jsonSpy = jest.fn();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jsonSpy,
      };

      await facebookAdsAiController.publishDraft(req, res);

      expect(facebookAdsController.createFullAd).toHaveBeenCalled();
      expect(mockPrisma.facebookAdsAiDraft.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'draft_no_pixel' },
          data: expect.objectContaining({
            status: 'PUBLISHED',
            facebookCampaignId: 'meta_camp_traffic_999',
          }),
        })
      );
    });
  });
});
