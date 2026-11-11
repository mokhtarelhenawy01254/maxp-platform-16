/**
 * Shared context imports
 */
const {
  crypto,
  axios,
  FacebookAdsService,
  facebookAdsDecisionService,
  FacebookAdLibraryService,
  getSharedPrismaClient,
  validateFacebookPageAccessToken,
  // constants & caches
  PRODUCT_LAUNCH_ALLOWED_HOSTS,
  PRODUCT_LAUNCH_DEV_HOSTS,
  PRODUCT_LAUNCH_METADATA_PRODUCT_SELECT,
  FACEBOOK_ACTIVE_STATUS,
  FACEBOOK_ISSUE_STATUSES,
  SUPPORTED_FULL_AD_CREATIVE_TYPES,
  PURCHASE_ACTION_TYPES,
  CONVERSION_ACTION_TYPES,
  FULL_AD_MINIMUM_BUDGET_BY_CURRENCY,
  ACTIVE_PUBLISH_CONFIRMATION_TOKEN,
  PUBLISH_REQUEST_LOCK_TTL_MS,
  AD_ACCOUNTS_CACHE_TTL_MS,
  adAccountsMemoryCache,
  PERFORMANCE_CACHE_TTL_MS,
  performanceSummaryMemoryCache,
  FACEBOOK_PAGE_RECOMMENDED_PERMISSIONS,
  // tokens
  getCompanyAdsAccessToken,
  getCompanyFacebookTokens,
  getCompanyPageAccessToken,
  // utils
  toNullableNumber,
  toMajorCurrencyUnit,
  stripHtml,
  parseJsonObject,
  stringifyJson,
  toFiniteNumber,
  safeStringifyJson,
  safeParseJson,
  stableStringify,
  // account helpers
  sanitizeFacebookAdAccountForClient,
  getFacebookAdAccountStatusLabel,
  normalizeFacebookBusiness,
  getSafeFundingSourceSummary,
  buildAdAccountBillingHealth,
  sanitizeRemoteFacebookAdAccountForClient,
  sanitizeSavedFacebookAdAccountForClient,
  buildSavedAdAccountFallbacks,
  normalizeAdAccountId,
  getAdAccountLookupVariants,
  doesAdAccountMatch,
  setActiveAdAccount,
  upsertAdAccount,
  hydrateRemoteAdAccount,
  getOrCreateAdAccount,
  getAdAccountReadScope,
  // payload builders
  buildCampaignMetaSettings,
  buildAdSetMetaSettings,
  buildAdMetaSettings,
  getEntityStatusFromSettings,
  countStatuses,
  buildAdClientPayload,
  buildAdSetClientPayload,
  createDeliveryReason,
  buildCampaignDeliveryReadiness,
  mergeCampaignSettings,
  mergeSettings,
  buildCampaignClientPayload,
  getMetaBudget,
  getMetaCampaignIdFromAdSet,
  getMetaAdSetIdFromAd,
  groupByMetaParentId,
  extractMetaAdCreative,
  sanitizeFacebookPageForClient,
  sortFacebookPageOptions,
  // insights helpers
  getInsightActionValue,
  aggregateMetaInsights,
  getPurchaseRoas,
  buildInsightPersistenceData,
  createEmptyPerformanceTotals,
  addInsightToTotals,
  addMetaInsightToTotals,
  withDerivedPerformance,
  buildPerformanceRecommendations,
  normalizeGeoPerformanceBreakdown,
  getGeoPerformanceLabel,
  buildGeoPerformanceRecommendations,
  normalizePerformanceBreakdown,
  getTranslatedGender,
  getTranslatedPublisherPlatform,
  getTranslatedPlatformPosition,
  getTranslatedDevicePlatform,
  getPerformanceBreakdownLabel,
  getPerformanceBreakdownKey,
  buildPerformanceBreakdownRecommendations,
  toIsoDateOnly,
  parseReportDateInput,
  normalizeReportDateRange,
  getPreviousDateRange,
  aggregatePersistedInsights,
  getMetaInsightsOrNull,
  percentChange,
  buildAdComparison,
  buildAdFunnel,
  buildAdVerdict,
  buildAdDetailRecommendations,
  buildAdBreakdownRecommendations,
  // full ad helpers
  isAllowedProductLaunchHost,
  parseProductLaunchUrl,
  decodeProductLaunchSlug,
  normalizeProductLaunchImageUrl,
  collectProductLaunchImages,
  normalizeFullAdCreativeType,
  normalizeFullAdBidStrategy,
  normalizeFullAdDeliverySettings,
  getFullAdMinimumBudgetAmount,
  buildFullAdBudgetValidationError,
  normalizeFullAdStatus,
  normalizeClientRequestId,
  buildPublishRequestHash,
  isPublishRequestLockExpired,
  isPublishRequestStale,
  hasActivePublishConfirmation,
  getExistingPublishRequest,
  buildStoredPublishResponse,
  sendExistingPublishRequestResponse,
  createPublishRequest,
  updatePublishRequest,
  didFullAdAttemptReachMeta,
  validateFullAdStorefrontPixelReadiness,
  validateFullAdAssetReadiness,
  requiresFullAdPixel,
  validateFullAdCreativePayload,
  getPersistedCreativePayload,
} = require("./_shared");


const createLeadForm = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pageId, name, questions, privacyPolicyUrl, thankYouPage } =
      req.body;

    if (!pageId || !name || !questions || !privacyPolicyUrl) {
      return res.status(400).json({
        success: false,
        error: "pageId, name, questions, and privacyPolicyUrl are required",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.createLeadForm(pageId, {
      name,
      questions,
      privacyPolicyUrl,
      thankYouPage,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        formId: result.formId,
        ...result.data,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Lead Form:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/lead-forms/:id/leads
 * جلب Leads من Form
 */
const getLeads = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      {
        where: { companyId, isActive: true },
      },
    );

    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getLeads(id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error getting Leads:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/lead-forms?pageId=...
 * قائمة نماذج جمع البيانات (Lead Forms) الخاصة بصفحة
 */
const listLeadForms = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const pageId = req.params?.pageId || req.query?.pageId;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        error: "pageId is required",
      });
    }

    const prisma = getSharedPrismaClient();
    const storedPage = await prisma.facebookPage.findFirst({
      where: { pageId: String(pageId), ...(companyId ? { companyId } : {}) },
      select: { pageId: true, pageName: true, pageAccessToken: true },
    });

    const accessToken =
      storedPage?.pageAccessToken ||
      (await getCompanyPageAccessToken(companyId)) ||
      (await getCompanyAdsAccessToken(companyId));

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Page Access Token not found. Please connect your Facebook account.",
      });
    }

    const baseUrl = new FacebookAdsService(accessToken).baseUrl;

    let formsResponse;
    try {
      formsResponse = await axios.get(
        `${baseUrl}/${pageId}/leadgen_forms`,
        {
          params: {
            access_token: accessToken,
            fields: "id,name,status,created_time,leads_count",
            limit: 50,
          },
        },
      );
    } catch (graphError) {
      const graphErrorBody = graphError?.response?.data?.error;
      return res.status(400).json({
        success: false,
        error: graphErrorBody?.message || graphError.message,
        code: graphErrorBody?.code ?? null,
      });
    }

    let pageName = storedPage?.pageName || null;
    if (!pageName) {
      try {
        const pageResponse = await axios.get(`${baseUrl}/${pageId}`, {
          params: { access_token: accessToken, fields: "id,name" },
        });
        pageName = pageResponse.data?.name || null;
      } catch (pageError) {
        // اسم الصفحة معلومات إضافية فقط — لا نُفشل الطلب بسببها
        pageName = null;
      }
    }

    const data = (formsResponse.data?.data || []).map((form) => ({
      id: form.id,
      name: form.name,
      status: form.status,
      createdTime: form.created_time || null,
      leadsCount: toFiniteNumber(form.leads_count) || 0,
    }));

    res.json({
      success: true,
      data,
      page: { id: String(pageId), name: pageName },
    });
  } catch (error) {
    console.error("❌ Error listing Lead Forms:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/lead-forms/:formId/detail
 * تفاصيل نموذج (الأسئلة + الحالة) لعرض رؤوس الأعمدة
 */
const getLeadFormDetail = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const formId = req.params?.formId || req.query?.formId;

    if (!formId) {
      return res.status(400).json({
        success: false,
        error: "formId is required",
      });
    }

    const accessToken =
      (await getCompanyPageAccessToken(companyId)) ||
      (await getCompanyAdsAccessToken(companyId));

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Page Access Token not found. Please connect your Facebook account.",
      });
    }

    const baseUrl = new FacebookAdsService(accessToken).baseUrl;

    let detailResponse;
    try {
      detailResponse = await axios.get(`${baseUrl}/${formId}`, {
        params: {
          access_token: accessToken,
          fields: "id,name,status,questions,privacy_policy_url,leads_count",
        },
      });
    } catch (graphError) {
      const graphErrorBody = graphError?.response?.data?.error;
      return res.status(400).json({
        success: false,
        error: graphErrorBody?.message || graphError.message,
        code: graphErrorBody?.code ?? null,
      });
    }

    const form = detailResponse.data || {};

    res.json({
      success: true,
      data: {
        id: form.id,
        name: form.name,
        status: form.status,
        createdTime: form.created_time || null,
        leadsCount: toFiniteNumber(form.leads_count) || 0,
        privacyPolicyUrl: form.privacy_policy_url || null,
        questions: (form.questions || []).map((question) => ({
          key: question.key,
          type: question.type,
          label: question.label,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error getting Lead Form detail:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Conversion API (CAPI)
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/conversions
 * إرسال Conversion Event
 */

module.exports = {
  createLeadForm,
  getLeads,
  listLeadForms,
  getLeadFormDetail,
};
