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


const getCustomAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

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

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getCustomAudiences();

    res.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error("❌ Error getting Custom Audiences:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences
 * إنشاء Custom Audience
 */
const createCustomAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, subtype } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Audience name is required",
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

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createCustomAudience({
      name,
      description,
      subtype,
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
        audienceId: result.audienceId,
        ...result.data,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Custom Audience:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/:id/users
 * إضافة مستخدمين لـ Custom Audience
 */
const addUsersToAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Users array is required",
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
    const result = await adsService.addUsersToCustomAudience(id, users);

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
    console.error("❌ Error adding users to audience:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/audiences/lookalike
 * إنشاء Lookalike Audience
 */
const createLookalikeAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, sourceAudienceId, country, ratio } = req.body;

    if (!name || !sourceAudienceId || !country) {
      return res.status(400).json({
        success: false,
        error: "name, sourceAudienceId, and country are required",
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

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createLookalikeAudience({
      name,
      sourceAudienceId,
      country,
      ratio,
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
        audienceId: result.audienceId,
        ...result.data,
      },
    });
  } catch (error) {
    console.error("❌ Error creating Lookalike Audience:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: A/B Testing
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/ab-tests
 * إنشاء A/B Test
 */

const searchTargetingOptions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const {
      query,
      type,
      countryCode,
      regionId,
      locationTypes,
      limit,
    } = req.query;
    if (!query || String(query).trim().length < 2) {
      return res.json({ success: true, data: [] });
    }
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
    const parsedLocationTypes =
      typeof locationTypes === "string"
        ? locationTypes
            .split(",")
            .map((locationType) => locationType.trim())
            .filter(Boolean)
        : undefined;
    const result = await adsService.searchTargetingOptions(query, type, {
      countryCode,
      regionId,
      locationTypes: parsedLocationTypes,
      limit: toFiniteNumber(limit) || undefined,
    });
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getTargetingSuggestions = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { targetingList } = req.body;
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
    const result = await adsService.getTargetingSuggestions(targetingList);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getReachEstimate = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { targeting } = req.body;
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
    const result = await adsService.getReachEstimate(targeting);
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Ad Preview

const createSavedAudience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, description, targeting } = req.body;
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
    const result = await adsService.createSavedAudience({
      name,
      description,
      targeting,
    });
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSavedAudiences = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.json({
        success: true,
        data: [],
        message: "No Facebook Ads access token configured yet.",
      });
    }
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst(
      { where: { companyId, isActive: true } },
    );
    if (!adAccount) {
      return res.json({
        success: true,
        data: [],
        message: "No active Facebook Ad Account found.",
      });
    }
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getSavedAudiences();
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteSavedAudience = async (req, res) => {
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
    const result = await adsService.deleteSavedAudience(id);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getCustomAudiences,
  createCustomAudience,
  addUsersToAudience,
  createLookalikeAudience,
  searchTargetingOptions,
  getTargetingSuggestions,
  getReachEstimate,
  createSavedAudience,
  getSavedAudiences,
  deleteSavedAudience,
};
