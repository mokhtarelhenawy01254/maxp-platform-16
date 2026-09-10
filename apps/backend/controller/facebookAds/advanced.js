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


const searchAdLibrary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Facebook Ads Access Token غير موجود",
      });
    }

    const adLibraryService = new FacebookAdLibraryService(accessToken);
    const result = await adLibraryService.search(req.query);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || "فشل البحث في مكتبة الإعلانات",
      data: [],
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Custom Audiences
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/audiences
 * جلب Custom Audiences
 */

const createAdvantagePlusShoppingCampaign = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAdvantagePlusShoppingCampaign(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Async Reports

const createAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAutomatedRule(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAutomatedRules = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.json({
        success: true,
        data: [],
        meta: {
          configured: false,
          reason: "NO_ACCESS_TOKEN",
        },
      });
    }
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount) {
      return res.json({
        success: true,
        data: [],
        meta: {
          configured: false,
          reason: "NO_AD_ACCOUNT",
        },
      });
    }
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getAutomatedRules();
    if (!result.success) {
      return res.json({
        success: true,
        data: [],
        meta: {
          configured: false,
          reason: "FACEBOOK_API_ERROR",
          error: result.error,
        },
      });
    }
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const data = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.updateAutomatedRule(id, data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteAutomatedRule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.deleteAutomatedRule(id);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Attribution Settings
const updateAttributionSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adSetId } = req.params;
    const settings = req.body;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.updateAttributionSettings(
      adSetId,
      settings,
    );
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Ad Set Management

module.exports = {
  searchAdLibrary,
  createAdvantagePlusShoppingCampaign,
  createAutomatedRule,
  getAutomatedRules,
  updateAutomatedRule,
  deleteAutomatedRule,
  updateAttributionSettings,
};
