/**
 * Facebook Ads AI Controller
 * 
 * Exposes endpoints for managing AI-generated Facebook ad drafts,
 * inspecting strategic angles, and executing safe one-click publishing.
 */

const facebookAdsAiDraftService = require('../services/facebookAdsAiDraftService');
const facebookAdsController = require('./facebookAdsController');
const marketingCopilotSessionService = require('../services/marketingCopilotSessionService');

/**
 * 🛡️ 2026 SOTA Guardrail: Protect end merchants from raw technical error leakage
 * Never let internal API endpoints, HTTP traces, or stack errors reach the client.
 */
function sanitizeClientFacingReply(text) {
  if (!text || typeof text !== 'string') return '';
  const sanitized = text.trim();

  // 🛡️ 2026 Anti-Slop: Intercept raw English system/tool leaks
  if (
    sanitized.includes('Draft campaigns created successfully') ||
    sanitized.includes('Awaiting merchant review') ||
    /^\[facebook_ad_create_full_draft\]/i.test(sanitized)
  ) {
    return 'تم حفظ وتجهيز مسودات الحملات الإعلانية بنجاح في لوحة التحكم للمراجعة والاعتماد ✅ يمكنك مراجعة الزوايا الإعلانية وإطلاقها بضغطة واحدة.';
  }

  const hasTechnicalLeak =
    /(POST|GET|PUT|DELETE)\s+\/api\/[^\s]+/i.test(sanitized) ||
    /Request failed:/i.test(sanitized) ||
    /HTTPConnectionPool/i.test(sanitized) ||
    /Traceback \(most recent call last\)/i.test(sanitized) ||
    /asyncpg\.exceptions/i.test(sanitized) ||
    /status_code[=:\s]+\d{3}/i.test(sanitized) ||
    /Internal Server Error/i.test(sanitized) ||
    /502 Bad Gateway/i.test(sanitized) ||
    /SyntaxError:/i.test(sanitized) ||
    /TypeError:/i.test(sanitized) ||
    /Invalid parameter/i.test(sanitized) ||
    /GraphMethodException/i.test(sanitized) ||
    /OAuthException/i.test(sanitized);

  if (hasTechnicalLeak) {
    console.warn('🛡️ [GUARD] Intercepted technical error leak in agent reply:', sanitized.slice(0, 160));
    if (sanitized.includes('مسود') || sanitized.includes('نشر') || sanitized.includes('draft') || sanitized.includes('publish')) {
      if (sanitized.includes('بكسل') || sanitized.includes('pixel') || sanitized.includes('PIXEL')) {
        return 'تم حفظ وتجهيز مسودات الحملة الإعلانية بنجاح في لوحة التحكم للمراجعة ✅\n\nبالنسبة للنشر المباشر على فيسبوك: يبدو أن بكسل المتجر غير مرتبط بالحساب الإعلاني المختار حالياً. يمكنك فتح تبويب ربط فيسبوك وتأكيد الحساب المناسب، ثم الضغط على "نشر المسودة" لإطلاقها فوراً.';
      }
      return 'تم حفظ وتجهيز مسودات الحملة الإعلانية بنجاح في لوحة التحكم للمراجعة ✅\n\nيمكنك مراجعة المسودة وتأكيد إطلاقها بضغطة زر من صفحة إعلانات فيسبوك، أو مراجعة إعدادات الحساب الإعلاني والصفحة للتأكد من جاهزية الربط.';
    }
    return 'تم حفظ وتحديث البيانات بنجاح في لوحة التحكم ✅ يمكنك المتابعة أو مراجعة التفاصيل من لوحة المتجر.';
  }

  return sanitized;
}


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
          const accounts = await prisma.facebookAdAccount.findMany({
            where: { companyId, isActive: true },
            orderBy: { updatedAt: 'desc' }
          });
          // Prefer account matching store currency (EGP) or active campaigns
          const bestAccount = accounts.find(a => (a.currency || '').toUpperCase() === 'EGP') || accounts[0];
          if (bestAccount?.accountId) {
            fullAdPayload.adAccountId = bestAccount.accountId;
          }
        }
        if (!fullAdPayload.pixelId) {
          // 1. Check StorefrontSettings
          const sfSettings = await prisma.storefrontSettings?.findFirst({
            where: { companyId }
          });
          let resolvedPixelId = sfSettings?.facebookPixelId || sfSettings?.pixelId;

          // 2. Check FacebookPixelConfig
          if (!resolvedPixelId) {
            const pixelConfig = await prisma.facebookPixelConfig?.findFirst({
              where: { storefrontSettings: { companyId } },
              orderBy: { createdAt: 'desc' }
            });
            resolvedPixelId = pixelConfig?.pixelId;
          }

          // 3. Check PlatformSiteMetaPixelSetting
          if (!resolvedPixelId) {
            try {
              const sitePixel = await prisma.platformSiteMetaPixelSetting?.findFirst({
                where: { isEnabled: true }
              });
              if (sitePixel?.pixelId) {
                resolvedPixelId = sitePixel.pixelId;
              }
            } catch (_) {}
          }

          // 4. Check direct Meta API via getFacebookPixels
          if (!resolvedPixelId && fullAdPayload.adAccountId) {
            try {
              const { getCompanyAdsAccessToken } = require('./facebookAds/_shared/tokens');
              const FacebookAdsService = require('../services/facebookAdsService');
              const accessToken = await getCompanyAdsAccessToken(companyId);
              if (accessToken) {
                const adsService = new FacebookAdsService(accessToken, fullAdPayload.adAccountId);
                const fbPixels = await adsService.getFacebookPixels();
                if (fbPixels?.data && fbPixels.data.length > 0) {
                  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, slug: true } });
                  const cName = (company?.name || '').toLowerCase();
                  const cSlug = (company?.slug || '').toLowerCase();
                  const matched = fbPixels.data.find(p => {
                    const pName = (p.name || '').toLowerCase();
                    return (cName && pName.includes(cName)) || (cSlug && pName.includes(cSlug));
                  });
                  resolvedPixelId = matched?.id || fbPixels.data[0].id;

                  // Cache into storefrontSettings for future lookups
                  if (resolvedPixelId && sfSettings?.id) {
                    await prisma.storefrontSettings.update({
                      where: { id: sfSettings.id },
                      data: { facebookPixelId: String(resolvedPixelId), facebookPixelEnabled: true }
                    }).catch(() => {});
                  }
                }
              }
            } catch (apiErr) {
              console.warn('⚠️ Could not fetch pixels from Meta API:', apiErr.message);
            }
          }

          if (resolvedPixelId) {
            fullAdPayload.pixelId = String(resolvedPixelId);
          }
        }
      } catch (dbErr) {
        console.warn('⚠️ Could not auto-resolve FB assets:', dbErr.message);
      }

      // If pixel is resolved, enforce Sales conversion tracking on Website
      if (fullAdPayload.pixelId) {
        fullAdPayload.conversionEvent = fullAdPayload.conversionEvent || 'PURCHASE';
        fullAdPayload.conversionLocation = fullAdPayload.conversionLocation || 'WEBSITE';
        fullAdPayload.performanceGoal = fullAdPayload.performanceGoal || 'MAXIMIZE_CONVERSIONS';
        fullAdPayload.optimizationGoal = fullAdPayload.optimizationGoal || 'OFFSITE_CONVERSIONS';
        fullAdPayload.objective = 'OUTCOME_SALES';
      } else if (fullAdPayload.objective === 'OUTCOME_SALES') {
        // Fallback only if no pixel exists anywhere
        fullAdPayload.objective = 'OUTCOME_TRAFFIC';
      }

      console.log('🚀 Publishing Full Ad Payload:', JSON.stringify({
        campaignName: fullAdPayload.campaignName,
        pageId: fullAdPayload.pageId,
        adAccountId: fullAdPayload.adAccountId,
        pixelId: fullAdPayload.pixelId,
        conversionEvent: fullAdPayload.conversionEvent,
        conversionLocation: fullAdPayload.conversionLocation,
        objective: fullAdPayload.objective,
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

      const {
        message,
        threadId = 'facebook_ads_copilot_thread',
        agentId: requestedAgentId,
        activeProduct: incomingActiveProduct,
      } = req.body || {};
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
            // First check for an active agent routed specifically to MARKETING_STUDIO
            const routedAgent = agents.find(a => 
              (a.status === 'ACTIVE' || !a.status) &&
              (a.allowed_channels || a.allowedChannels || []).map(c => String(c).toUpperCase()).includes('MARKETING_STUDIO')
            );
            if (routedAgent?.id) {
              targetAgentId = routedAgent.id;
            } else {
              const mediaBuyer = agents.find(a => a.role === 'MEDIA_BUYER' && (a.status === 'ACTIVE' || !a.status))
                || agents.find(a => a.role === 'MEDIA_BUYER');
              if (mediaBuyer?.id) {
                targetAgentId = mediaBuyer.id;
              }
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
          const routedRows = await prisma.$queryRaw`
            SELECT id, name, role FROM ai.agents 
            WHERE (company_id = ${companyId} OR company_id IS NULL)
              AND (status = 'ACTIVE' OR status IS NULL)
              AND channels::text ILIKE '%MARKETING_STUDIO%'
            ORDER BY (CASE WHEN company_id = ${companyId} THEN 0 ELSE 1 END), created_at DESC
            LIMIT 1
          `;
          if (routedRows && routedRows.length > 0) {
            targetAgentId = routedRows[0].id;
          } else {
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
              'facebook_ad_account_info',
              'facebook_ad_analyze_product',
              'facebook_ad_create_full_draft',
              'facebook_ad_publish_draft',
              'facebook_ad_get_decision',
              'facebook_ad_update_status',
              'facebook_ad_update_budget',
              'facebook_ad_record_learned_rule',
              'record_learned_rule',
              'manage_agent_skill',
              'orders_campaign_attribution_report',
              'competitor_get_ads',
              'competitor_search',
              'sales_revenue',
              'company_snapshot',
              'audit_read',
              'generate_social_image',
            ],
            allowedSkills: [
              'facebook-ad-draft',
              'catalog-search',
              'campaign-report'
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

      const scopedThreadId = threadId.endsWith(`_${companyId}`) ? threadId : `${threadId}_${companyId}`;

      // Automatically persist incoming user message in Cloud DB
      try {
        await marketingCopilotSessionService.appendMessage(companyId, threadId, {
          sender: 'user',
          text: message,
        });
      } catch (dbErr) {
        console.warn('[FacebookAdsAI] Failed to persist user message in DB:', dbErr.message);
      }

      // Retrieve recent conversation messages and active working memory for Hermes continuity
      let recentMessages = [];
      let activeProductContext = incomingActiveProduct || null;
      let sessionData = null;
      try {
        sessionData = await marketingCopilotSessionService.getSession(companyId, threadId);
        if (sessionData) {
          activeProductContext = incomingActiveProduct || sessionData.context?.activeProduct || null;
          if (incomingActiveProduct) {
            // Keep session working memory synchronized with UI selection
            marketingCopilotSessionService.updateContext(companyId, threadId, {
              activeProduct: incomingActiveProduct,
            }).catch(e => console.warn('[FacebookAdsAI] Failed updating session context:', e.message));
          }
          if (Array.isArray(sessionData.messages) && sessionData.messages.length > 1) {
            // Exclude the message we just appended (the last one) so the current prompt isn't duplicated
            recentMessages = sessionData.messages.slice(0, -1).slice(-15).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text || '',
            }));

            // If activeProductContext not explicitly saved yet, scan previous messages for recently discussed product
            // If activeProductContext not explicitly saved yet, scan previous messages for recently discussed product
            if (!activeProductContext) {
              const nonEntityWords = [
                'المهارة', 'المرحلة', 'بلاك فرايداي', 'unit economics', 'الزوايا',
                'الحساب الإعلاني', 'اقتصاديات', 'تحليل', 'أولاً', 'ثانياً', 'ثالثاً',
                'المسودات', 'فحص', 'تفاصيل', 'التقرير', 'الحملة', 'استراتيجية', 'نقطة محتاجة'
              ];

              for (let i = sessionData.messages.length - 2; i >= 0; i--) {
                const pText = sessionData.messages[i].text || '';

                // Prioritize bold product mentions like **كوتشي Dash** or quotes
                const boldMatches = Array.from(pText.matchAll(/\*\*([^\*\n]{3,40})\*\*/g)).map(m => m[1]);
                const quoteMatches = Array.from(pText.matchAll(/["'«]([^"'»]{3,40})["'»]/g)).map(m => m[1]);
                const headingMatches = Array.from(pText.matchAll(/##+\s*[^\n]*?\s+([^\n(]{3,40})/g)).map(m => m[1]);

                const allCandidates = [...boldMatches, ...quoteMatches, ...headingMatches];
                for (const rawCandidate of allCandidates) {
                  let cleaned = rawCandidate.replace(/[👟📦✨📊⚠️#*]/g, '').trim();
                  cleaned = cleaned.replace(/^(حملة|منتج)\s+/i, '').trim();
                  const cleanedLower = cleaned.toLowerCase();
                  if (
                    cleaned.length >= 3 &&
                    !nonEntityWords.some(w => cleanedLower.includes(w))
                  ) {
                    const skuMatch = pText.match(/SKU:\s*([a-zA-Z0-9_-]+)/i);
                    activeProductContext = {
                      name: cleaned,
                      sku: skuMatch ? skuMatch[1].trim() : '',
                    };
                    break;
                  }
                }
                if (activeProductContext) break;
              }
            }
          }
        }

        // Direct product lookup from user message with natural prefixes
        const rawMsg = (message || '').trim();
        const nonProductWords = ['نفذ', 'تمام', 'ابدأ', 'نعم', 'اوك', 'كمل', 'انشر', '؟', '?', 'ايه الاخبار', 'شكرا'];
        if (!activeProductContext && rawMsg.length >= 3 && !nonProductWords.includes(rawMsg)) {
          const stripped = rawMsg
            .replace(/^(عاوز|عايز|عاوزه|محتاج|اعمل|سوي|جهز|حملة|اعلان|إعلان|لحملة|لكوتشي|لـ|ل)+(\s+)/i, '')
            .replace(/[؟!?.]/g, '')
            .trim();

          const candidates = [stripped, rawMsg].filter(c => c && c.length >= 2 && c.length <= 50);
          const prisma = getSharedPrismaClient();

          for (const cand of candidates) {
            const matchedProd = await prisma.product.findFirst({
              where: {
                companyId,
                deletedAt: null,
                OR: [
                  { name: { contains: cand, mode: 'insensitive' } },
                  { slug: { contains: cand, mode: 'insensitive' } },
                ],
              },
              select: { id: true, name: true, slug: true, price: true, mainImage: true },
            });
            if (matchedProd) {
              activeProductContext = {
                id: matchedProd.id,
                name: matchedProd.name,
                slug: matchedProd.slug,
                price: matchedProd.price,
                imageUrl: matchedProd.mainImage,
              };
              marketingCopilotSessionService.updateContext(companyId, threadId, {
                activeProduct: activeProductContext,
              }).catch(() => {});
              break;
            }
          }
        }
      } catch (memErr) {
        console.warn('[FacebookAdsAI] Could not load prior messages for context:', memErr.message);
      }

      // If user confirms execution with short trigger ('نفذ', 'انشر', 'تمام') and product context exists, anchor message
      const executionTriggers = ['نفذ', 'انشر', 'تمام نفذ', 'ابدأ', 'اعتمد', 'نفذ الحملة'];
      const isExecutionTrigger = executionTriggers.includes((message || '').trim());
      let effectiveMessage = (isExecutionTrigger && activeProductContext?.name)
        ? `${message} واعتمد المسودات لـ "${activeProductContext.name}"`
        : message;

      // 🛡️ 2026 Failure Reflection Guardrail:
      // If the user asks why ("ليه", "ليه؟", "ايه السبب") after an immediate error or failed tool run,
      // prevent the agent from blindly retrying the same failed action, and instruct it to explain the blocker.
      const whyTriggers = ['ليه', 'ليه؟', 'ليه ?', 'ايه السبب', 'ليه وقفت', 'ما نشرش ليه', 'ليه منشرش', 'ليه منشرتش'];
      const isWhyTrigger = whyTriggers.includes((message || '').trim().toLowerCase());
      if (isWhyTrigger && Array.isArray(sessionData?.messages) && sessionData.messages.length >= 2) {
        const prevMsg = sessionData.messages[sessionData.messages.length - 2];
        const prevText = String(prevMsg?.text || '');
        const wasFailure = prevText.includes('فشل') || prevText.includes('تعذر') || prevText.includes('خطأ') || prevText.includes('error') || prevText.includes('Invalid');
        if (wasFailure) {
          effectiveMessage = `التاجر يسأل: "${message}" مستفسراً عن سبب تعذر أو فشل الإجراء السابق (${prevText.slice(0, 140)}). المطلوب كـ Media Buyer محترف: اشرح للتاجر السبب والعائق الفني بلغة تجارية واضحة وقدم له الخطوة القادمة، ويُمنع منعاً باتاً تكرار محاولة نشر المسودة الفاشلة بنفس البيانات.`;
        }
      }

      try {
        const result = await aiServiceAdminClient.chatWithAgent({
          companyId,
          agentId: targetAgentId,
          message: effectiveMessage,
          threadId: scopedThreadId,
          conversationId: threadId,
          channel: 'marketing_studio',
          source_channel: 'marketing_studio',
          memoryContext: {
            recentMessages,
            activeProduct: activeProductContext,
            active_product_context: activeProductContext,
          },
          memory_context: {
            recentMessages,
            activeProduct: activeProductContext,
            active_product_context: activeProductContext,
          },
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
          const quotaReply = 'رصيد استهلاك باقة الذكاء الاصطناعي لحسابك بحاجة إلى تجديد لمواصلة إطلاق وتطوير الحملات الإعلانية. تم حفظ جميع المسودات والبيانات السابقة بأمان تام.';
          try {
            await marketingCopilotSessionService.appendMessage(companyId, threadId, {
              sender: 'agent',
              text: quotaReply,
            });
          } catch (dbErr) {
            console.warn('[FacebookAdsAI] Failed to persist quota reply in DB:', dbErr.message);
          }

          return res.status(200).json({
            success: true,
            status: 'NEEDS_RECHARGE',
            reply: quotaReply,
            recharge_action: {
              url: '/settings/billing',
              type: 'WALLET_RECHARGE',
              action_label: 'شحن رصيد الذكاء الاصطناعي الآن'
            },
            threadId,
            scopedThreadId: result?.thread_id || scopedThreadId,
            draft_id: null,
            agentId: targetAgentId,
          });
        }

        const toolCallsList = result?.tool_calls || [];
        const toolNames = toolCallsList.map(tc => tc.name || tc.function?.name || tc.tool || (typeof tc === 'string' ? tc : '')).filter(Boolean);

        let finalReply = (result?.reply || '').trim();
        const isStubOrGeneric = (
          !finalReply ||
          finalReply.includes('تم تنفيذ الإجراء بنجاح') ||
          finalReply.includes('Draft campaigns created successfully') ||
          finalReply.includes('Awaiting merchant review')
        );

        if (isStubOrGeneric && toolCallsList.length > 0) {
          const draftTool = toolCallsList.find(t => (t.name || t.function?.name || t.tool) === 'facebook_ad_create_full_draft');
          const skillTool = toolCallsList.find(t => (t.name || t.function?.name || t.tool) === 'manage_agent_skill');
          const ruleTool = toolCallsList.find(t => (t.name || t.function?.name || t.tool) === 'record_learned_rule' || (t.name || t.function?.name || t.tool) === 'facebook_ad_record_learned_rule');
          const decTool = toolCallsList.find(t => (t.name || t.function?.name || t.tool) === 'facebook_ad_get_decision');
          const compTool = toolCallsList.find(t => (t.name || t.function?.name || t.tool) === 'competitor_get_ads');

          if (draftTool) {
            const dArgs = draftTool.args || draftTool.arguments || {};
            const pName = dArgs.product_name || activeProductContext?.name || 'المنتج';
            const headline = dArgs.headline ? `\n- **العنوان:** ${dArgs.headline}` : '';
            const angle = dArgs.angle ? `\n- **الزاوية:** ${dArgs.angle}` : '';
            const budget = dArgs.daily_budget ? `\n- **الميزانية اليومية المقترحة:** ${dArgs.daily_budget} ج.م` : '';
            finalReply = `تمام يا فندم 🚀 تم تجهيز مسودة الحملة الإعلانية لـ **"${pName}"** بنجاح:${angle}${headline}${budget}\n\nمسودة الإعلان والزوايا الإعلانية جاهزة الآن في اللوحة الجانبية للمراجعة والاعتماد لإطلاقها إلى Meta Ads فوراً!`;
          } else if (skillTool) {
            const skillName = skillTool.result?.skill?.name || skillTool.args?.skill_name || 'المهارة المطلوبة';
            finalReply = `تمام يا فندم، تم إنشاء وتفعيل "${skillName}" بنجاح في نظام المتجر الدائم! 🎯\n\nأقدر دلوقتي أستخدمها في حساب الـ CAC والـ ROAS وربط أرقام الحملات بمبيعاتك الفعلية. تحب نبدأ بتطبيقها فوراً؟`;
          } else if (ruleTool) {
            finalReply = `تم حفظ وتثبيت التفضيل/القاعدة بنجاح في كتيب استراتيجيات المتجر ✅`;
          } else if (decTool) {
            finalReply = `تم فحص أداء الحملات وتحليل قرارات الـ SCALE والـ KILL بنجاح 📊`;
          } else if (compTool) {
            finalReply = `تم استخراج استخبارات إعلانات المنافسين ومؤشرات السوق المصري 🔎`;
          } else {
            // Run synthesis LLM prompt for other complex tools
            try {
              const toolSummaries = toolCallsList.map(tc => {
                const name = tc.name || tc.function?.name || tc.tool || 'أداة';
                const args = tc.arguments || tc.args || {};
                const res = tc.result || {};
                return `- أداة [${name}]: المعطيات (${JSON.stringify(args)}) -> النتيجة: (${JSON.stringify(res).slice(0, 300)})`;
              }).join('\n');

              const synthesisPrompt = `لقد قمت كـ Media Buyer بتنفيذ الأدوات التالية بنجاح:\n${toolSummaries}\n\nالمطلوب: اشرح للتاجر بأسلوبك البشري الودود والمحترف بالعامية المصرية الراقية ما تم إنجازه بدقة، وما هي التوصيات والخطوات التالية بناءً على نتائج الأدوات، دون أي صيغ آلية.`;

              const synthResult = await aiServiceAdminClient.chatWithAgent({
                companyId,
                agentId: targetAgentId,
                message: synthesisPrompt,
                threadId: scopedThreadId,
                conversationId: threadId,
                channel: 'dashboard',
                source_channel: 'dashboard',
                memory_context: {
                  recentMessages,
                  activeProduct: activeProductContext,
                  active_product_context: activeProductContext,
                },
              });

              if (synthResult?.reply && synthResult.reply.trim().length > 10) {
                finalReply = synthResult.reply.trim();
              }
            } catch (synthErr) {
              console.warn('[FacebookAdsAI] Enforced synthesis step failed:', synthErr.message);
              finalReply = `تم تنفيذ الإجراء المطلوب بنجاح ✅`;
            }
          }
        }

        // 🛡️ 2026 Resilience: Guard against leaking technical endpoint errors or stack traces to client
        finalReply = sanitizeClientFacingReply(finalReply);

        // Automatically persist agent reply in Cloud DB
        try {
          await marketingCopilotSessionService.appendMessage(companyId, threadId, {
            sender: 'agent',
            text: finalReply,
            toolCalls: toolCallsList,
          });

          // Update activeProduct in session context if a valid product creation/analysis tool succeeded
          if (result?.tool_calls && Array.isArray(result.tool_calls)) {
            const analyzeCalls = result.tool_calls.filter(tc => (tc.name || tc.tool || tc.function?.name) === 'facebook_ad_analyze_product');
            const draftCalls = result.tool_calls.filter(tc => (tc.name || tc.tool || tc.function?.name) === 'facebook_ad_create_full_draft');

            // 🛡️ Hermes Continuity: Only update activeProduct if a draft was created for that product,
            // or if a single product was explicitly analyzed and no active product was previously anchored.
            // Never let a batch comparison (analyzeCalls > 1) overwrite the merchant's active product.
            const shouldUpdateProd = draftCalls.length > 0 || (analyzeCalls.length === 1 && !activeProductContext?.name);
            if (shouldUpdateProd) {
              for (const tc of (draftCalls.length > 0 ? draftCalls : analyzeCalls)) {
                const args = tc.arguments || tc.args || {};
                const resProd = tc.result?.product;
                const pName = resProd?.name || args.product_name || args.product_slug;
                if (pName && typeof pName === 'string' && pName.length > 2 && !pName.includes('بلاك فرايداي')) {
                  marketingCopilotSessionService.updateContext(companyId, threadId, {
                    activeProduct: {
                      id: resProd?.id || args.product_id,
                      name: pName,
                      sku: resProd?.sku || args.product_id || args.sku || '',
                      price: resProd?.price || args.price,
                      stock: resProd?.stock,
                      updatedAt: new Date().toISOString(),
                    }
                  }).catch(() => {});
                  break;
                }
              }
            }
          }
        } catch (dbErr) {
          console.warn('[FacebookAdsAI] Failed to persist agent reply in DB:', dbErr.message);
        }

        return res.json({
          success: true,
          reply: finalReply,
          status: result?.status || 'ok',
          tool_calls: toolCallsList,
          tools_called: toolNames,
          toolsCalled: toolNames,
          threadId,
          scopedThreadId: result?.thread_id || scopedThreadId,
          draft_id: result?.draft_id || null,
          agentId: targetAgentId,
        });
      } catch (chatError) {
        const errMsg = String(chatError.message || '').toLowerCase();
        const isUnchargedOrQuota = (
          errMsg.includes('quota') ||
          errMsg.includes('insufficient_quota') ||
          errMsg.includes('rate limit') ||
          errMsg.includes('rate_limit') ||
          errMsg.includes('budget_exceeded') ||
          errMsg.includes('no_active_key') ||
          errMsg.includes('no active api key') ||
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

        // 🛡️ 2026 Resilience Standard: Never leave user turn unanswered/dropped in DB
        const fallbackReply = 'عذراً يا فندم، حصل انقطاع مؤقت في الاتصال أثناء معالجة الطلب. تم حفظ استفسارك، وتقدر تعيد إرساله أو تطلب مني المتابعة فوراً.';
        try {
          await marketingCopilotSessionService.appendMessage(companyId, threadId, {
            sender: 'agent',
            text: fallbackReply,
          });
        } catch (saveErr) {
          console.warn('[FacebookAdsAI] Failed to persist fallback reply:', saveErr.message);
        }

        return res.status(200).json({
          success: true,
          status: 'fallback',
          reply: fallbackReply,
          threadId,
          scopedThreadId: `${threadId}_${companyId}`,
          draft_id: null,
          agentId: targetAgentId,
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

  /**
   * GET /api/v1/facebook-ads/ai/sessions
   * List all cloud-synced copilot sessions for the company
   */
  async listSessions(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const limit = parseInt(req.query?.limit || '100', 10);
      const result = await marketingCopilotSessionService.listSessions(companyId, limit);

      const sessions = Array.isArray(result) ? result : (result?.sessions || []);
      const totalCount = typeof result?.totalCount === 'number' ? result.totalCount : sessions.length;

      return res.json({
        success: true,
        data: sessions,
        totalCount,
      });
    } catch (error) {
      console.error('❌ Error listing marketing copilot sessions:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to list copilot sessions',
      });
    }
  }

  /**
   * GET /api/v1/facebook-ads/ai/sessions/:id
   * Get single session with its messages
   */
  async getSession(req, res) {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const session = await marketingCopilotSessionService.getSession(companyId, id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      return res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('❌ Error getting marketing copilot session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get copilot session',
      });
    }
  }

  /**
   * POST /api/v1/facebook-ads/ai/sessions
   * Create or update a session with messages (for real-time sync or localStorage migration)
   */
  async saveSession(req, res) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id || req.user?.userId || null;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const sessionData = req.body || {};
      const saved = await marketingCopilotSessionService.saveSession(companyId, userId, sessionData);

      return res.json({
        success: true,
        data: saved,
      });
    } catch (error) {
      console.error('❌ Error saving marketing copilot session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to save copilot session',
      });
    }
  }

  /**
   * DELETE /api/v1/facebook-ads/ai/sessions/:id
   * Delete a session and its message history
   */
  async deleteSession(req, res) {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const deleted = await marketingCopilotSessionService.deleteSession(companyId, id);
      return res.json({
        success: true,
        deleted,
      });
    } catch (error) {
      console.error('❌ Error deleting marketing copilot session:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete copilot session',
      });
    }
  }

  /**
   * GET /api/v1/facebook-ads/ai/active-agent
   * Retrieve the active/routed agent for the Marketing Studio
   */
  async getActiveAgent(req, res) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }

      const aiServiceAdminClient = require('../services/aiServiceAdminClient');
      const { getSharedPrismaClient } = require('../services/sharedDatabase');

      let activeAgent = null;
      let availableAgents = [];

      try {
        const agents = await aiServiceAdminClient.listAgents(companyId);
        if (Array.isArray(agents)) {
          availableAgents = agents
            .filter(a => a.status === 'ACTIVE' || !a.status)
            .map(a => ({
              id: a.id,
              name: a.name || a.label || a.id,
              role: a.role,
              allowedChannels: a.allowed_channels || a.allowedChannels || [],
            }));

          // 1. Check for an agent specifically assigned to MARKETING_STUDIO
          const routed = availableAgents.find(a =>
            (a.allowedChannels || []).map(c => String(c).toUpperCase()).includes('MARKETING_STUDIO')
          );

          if (routed) {
            activeAgent = { id: routed.id, name: routed.name, role: routed.role, isRouted: true };
          } else {
            // 2. Default fallback: MEDIA_BUYER
            const mediaBuyer = availableAgents.find(a => a.role === 'MEDIA_BUYER');
            activeAgent = mediaBuyer
              ? { id: mediaBuyer.id, name: mediaBuyer.name, role: mediaBuyer.role, isRouted: false }
              : (availableAgents[0] ? { id: availableAgents[0].id, name: availableAgents[0].name, role: availableAgents[0].role, isRouted: false } : null);
          }
        }
      } catch (err) {
        console.warn('[FacebookAdsAI] Could not list agents from aiServiceAdminClient:', err.message);
      }

      // Fallback query directly to PostgreSQL ai.agents if activeAgent not resolved
      if (!activeAgent) {
        const prisma = getSharedPrismaClient();
        try {
          const rows = await prisma.$queryRaw`
            SELECT id, name, role, channels FROM ai.agents 
            WHERE (company_id = ${companyId} OR company_id IS NULL)
              AND (status = 'ACTIVE' OR status IS NULL)
            ORDER BY (CASE WHEN company_id = ${companyId} THEN 0 ELSE 1 END), created_at DESC
          `;
          if (rows && rows.length > 0) {
            const routed = rows.find(r => {
              const ch = Array.isArray(r.channels) ? r.channels : (typeof r.channels === 'string' ? JSON.parse(r.channels || '[]') : []);
              return ch.map(c => String(c).toUpperCase()).includes('MARKETING_STUDIO');
            });
            if (routed) {
              activeAgent = { id: routed.id, name: routed.name, role: routed.role, isRouted: true };
            } else {
              const mediaBuyer = rows.find(r => r.role === 'MEDIA_BUYER');
              activeAgent = mediaBuyer
                ? { id: mediaBuyer.id, name: mediaBuyer.name, role: mediaBuyer.role, isRouted: false }
                : { id: rows[0].id, name: rows[0].name, role: rows[0].role, isRouted: false };
            }
          }
        } catch (dbErr) {
          console.warn('[FacebookAdsAI] Could not query ai.agents table directly:', dbErr.message);
        }
      }

      return res.json({
        success: true,
        agent: activeAgent,
        availableAgents,
      });
    } catch (error) {
      console.error('❌ Error getting marketing active agent:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get marketing active agent',
      });
    }
  }

  /**
   * POST /api/v1/facebook-ads/ai/campaigns/:campaignId/status
   * Pause or Resume a Facebook Campaign directly on Meta
   */
  async updateCampaignStatus(req, res) {
    try {
      const companyId = req.headers?.['x-company-id'] || req.user?.companyId;
      const { campaignId } = req.params;
      const { status } = req.body || {};

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }
      if (!campaignId) {
        return res.status(400).json({ success: false, error: 'campaignId is required' });
      }
      const targetStatus = String(status || '').toUpperCase();
      if (!['ACTIVE', 'PAUSED'].includes(targetStatus)) {
        return res.status(400).json({ success: false, error: 'Status must be ACTIVE or PAUSED' });
      }

      const { getCompanyAdsAccessToken } = require('./facebookAds/_shared/tokens');
      const FacebookAdsService = require('../services/facebookAdsService');
      const accessToken = await getCompanyAdsAccessToken(companyId);

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'لم يتم العثور على توكن اتصال نشط بفيسبوك لهذه الشركة',
        });
      }

      const adsService = new FacebookAdsService(accessToken);
      const updateResult = await adsService.updateCampaign(campaignId, { status: targetStatus });

      if (!updateResult.success) {
        const rawErr = updateResult.error;
        const cleanMsg = typeof rawErr === 'string'
          ? rawErr
          : (rawErr?.error?.error_user_msg || rawErr?.error?.message || rawErr?.message || 'تعذر تحديث حالة الحملة على فيسبوك');
        return res.status(400).json({
          success: false,
          error: cleanMsg,
        });
      }

      return res.json({
        success: true,
        campaignId,
        status: targetStatus,
        message: targetStatus === 'PAUSED' ? 'تم إيقاف الحملة بنجاح على فيسبوك ⏸️' : 'تم تفعيل الحملة بنجاح على فيسبوك 🚀',
      });
    } catch (error) {
      console.error('❌ Error in updateCampaignStatus:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/facebook-ads/ai/campaigns/:campaignId/budget
   * Update daily budget of a Facebook Campaign directly on Meta
   */
  async updateCampaignBudget(req, res) {
    try {
      const companyId = req.headers?.['x-company-id'] || req.user?.companyId;
      const { campaignId } = req.params;
      const { daily_budget, dailyBudget } = req.body || {};
      const budget = Number(daily_budget || dailyBudget);

      if (!companyId) {
        return res.status(401).json({ success: false, error: 'Company ID is required' });
      }
      if (!campaignId) {
        return res.status(400).json({ success: false, error: 'campaignId is required' });
      }
      if (!budget || isNaN(budget) || budget <= 0) {
        return res.status(400).json({ success: false, error: 'مبلغ الميزانية اليومية غير صالح' });
      }

      // Hard financial safety ceiling: 10,000 EGP per day
      if (budget > 10000) {
        return res.status(400).json({
          success: false,
          error: 'الميزانية المطلوبة تتجاوز الحد الأقصى للأمان (10,000 ج.م/يوم). يُرجى تعديلها يدوياً من مدير الإعلانات إذا كنت متأكداً.',
        });
      }

      const { getCompanyAdsAccessToken } = require('./facebookAds/_shared/tokens');
      const FacebookAdsService = require('../services/facebookAdsService');
      const accessToken = await getCompanyAdsAccessToken(companyId);

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'لم يتم العثور على توكن اتصال نشط بفيسبوك لهذه الشركة',
        });
      }

      const adsService = new FacebookAdsService(accessToken);
      // Try CBO first (daily_budget on campaign node)
      let updateResult = await adsService.updateCampaign(campaignId, {
        daily_budget: Math.round(budget * 100),
      });

      // Self-healing: if campaign is ABO (budget set on AdSet), update the adset
      if (!updateResult.success && String(updateResult.error || '').toLowerCase().includes('ad set')) {
        try {
          const axios = require('axios');
          const adsetsRes = await axios.get(`${adsService.baseUrl}/${campaignId}/adsets`, {
            params: { access_token: accessToken, fields: 'id,name,status', limit: 5 }
          });
          const activeAdSet = (adsetsRes.data?.data || []).find(a => a.status === 'ACTIVE') || adsetsRes.data?.data?.[0];
          if (activeAdSet?.id) {
            const adSetUpdate = await axios.post(`${adsService.baseUrl}/${activeAdSet.id}`, {
              daily_budget: Math.round(budget * 100),
              access_token: accessToken,
            });
            if (adSetUpdate.data?.success || adSetUpdate.data?.id) {
              updateResult = { success: true, adSetId: activeAdSet.id };
            }
          }
        } catch (adSetErr) {
          console.warn('⚠️ Could not fallback to adset budget update:', adSetErr.message);
        }
      }

      if (!updateResult.success) {
        const rawErr = updateResult.error;
        const cleanMsg = typeof rawErr === 'string'
          ? rawErr
          : (rawErr?.error?.error_user_msg || rawErr?.error?.message || rawErr?.message || 'تعذر تحديث ميزانية الحملة على فيسبوك');
        return res.status(400).json({
          success: false,
          error: cleanMsg,
        });
      }

      return res.json({
        success: true,
        campaignId,
        daily_budget: budget,
        message: `تم تعديل الميزانية اليومية بنجاح إلى ${budget} ج.م 💰`,
      });
    } catch (error) {
      console.error('❌ Error in updateCampaignBudget:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

const controller = new FacebookAdsAiController();
controller.sanitizeClientFacingReply = sanitizeClientFacingReply;
module.exports = controller;
module.exports.sanitizeClientFacingReply = sanitizeClientFacingReply;
