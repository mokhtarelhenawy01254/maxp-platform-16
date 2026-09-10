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


const getAdSets = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const companyId = req.user?.companyId;

    // التحقق من أن الحملة تخص الشركة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    const adSets = await getSharedPrismaClient().facebookAdset.findMany({
      where: { campaignId },
      include: {
        facebookAds: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: adSets,
      count: adSets.length,
    });
  } catch (error) {
    console.error("❌ Error getting AdSets:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:campaignId/adsets
 * إنشاء AdSet جديد
 */
const createAdSet = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const companyId = req.user?.companyId;
    const {
      name,
      status = "PAUSED",
      targeting,
      budgetType,
      budgetAmount,
      optimizationGoal,
      billingEvent,
      ageMin,
      ageMax,
      genders,
      locations,
      interests,
      behaviors,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !budgetType || !budgetAmount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, budgetType, budgetAmount",
      });
    }

    // التحقق من الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
      include: { facebookAdAccount: true },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    // الحصول على Ad Account
    const adAccount =
      campaign.facebookAdAccount ||
      (await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { companyId, isActive: true },
      }));

    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: "Ad Account not found. Please set up your Ad Account first.",
      });
    }

    // إنشاء AdSet في Facebook
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // استخدام Facebook Campaign ID إذا كان موجود، وإلا استخدام campaign ID
    const fbCampaignId = campaign.facebookCampaignId || campaign.id;
    const targetingPayload = targeting || {
      ageMin,
      ageMax,
      genders,
      locations,
      interests,
      behaviors,
    };
    const persistedGeoLocations =
      targetingPayload.locations || targetingPayload.regions || targetingPayload.cities
        ? {
            countries: targetingPayload.locations || [],
            regions: targetingPayload.regions || [],
            cities: targetingPayload.cities || [],
            locationTypes: targetingPayload.locationTypes || [],
          }
        : null;

    const facebookResult = await adsService.createAdSet(fbCampaignId, {
      name,
      status,
      targeting: targetingPayload,
      budgetType,
      budgetAmount,
      optimizationGoal,
      billingEvent,
    });

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error,
      });
    }

    // حفظ AdSet في قاعدة البيانات
    const adSet = await getSharedPrismaClient().facebookAdset.create({
      data: {
        campaignId,
        name,
        status,
        facebookAdSetId: facebookResult.adSetId,
        targeting: targetingPayload ? JSON.stringify(targetingPayload) : null,
        ageMin: targetingPayload.ageMin || ageMin,
        ageMax: targetingPayload.ageMax || ageMax,
        genders: targetingPayload.genders
          ? JSON.stringify(targetingPayload.genders)
          : null,
        locations: persistedGeoLocations
          ? JSON.stringify(persistedGeoLocations)
          : null,
        interests: targetingPayload.interests
          ? JSON.stringify(targetingPayload.interests)
          : null,
        behaviors: targetingPayload.behaviors
          ? JSON.stringify(targetingPayload.behaviors)
          : null,
        budgetType,
        budgetAmount,
        optimizationGoal,
        billingEvent,
      },
    });

    res.json({
      success: true,
      data: adSet,
      message: "AdSet created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating AdSet:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/adsets/:id
 * حذف AdSet
 */
const deleteAdSet = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id },
      include: {
        facebookCampaign: true,
      },
    });

    if (!adSet || adSet.facebookCampaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: "AdSet not found",
      });
    }

    // حذف من Facebook
    if (adSet.facebookAdSetId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        // TODO: إضافة deleteAdSet في Service
      }
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookAdset.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "AdSet deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting AdSet:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * Ads Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/adsets/:adSetId/ads
 * جلب جميع الإعلانات في AdSet
 */

const updateAdSetSchedule = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({
        success: false,
        error: "schedule array is required",
      });
    }

    // جلب Ad Set من قاعدة البيانات
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id, companyId },
    });

    if (!adSet) {
      return res.status(404).json({
        success: false,
        error: "Ad Set not found",
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
    const result = await adsService.updateAdSetSchedule(
      adSet.facebookAdSetId,
      schedule,
    );

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
    console.error("❌ Error updating Ad Set schedule:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// v22.0: Dynamic Creative Optimization

const updateAdSet = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const data = req.body;
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id, companyId },
    });
    if (!adSet)
      return res
        .status(404)
        .json({ success: false, error: "Ad Set not found" });
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
    const result = await adsService.updateAdSet(adSet.facebookAdSetId, data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateFrequencyCap = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    const { maxFrequency, intervalDays } = req.body;
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id, companyId },
    });
    if (!adSet)
      return res
        .status(404)
        .json({ success: false, error: "Ad Set not found" });
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
    const result = await adsService.updateFrequencyCap(adSet.facebookAdSetId, {
      maxFrequency,
      intervalDays,
    });
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Advanced Targeting

module.exports = {
  getAdSets,
  createAdSet,
  deleteAdSet,
  updateAdSetSchedule,
  updateAdSet,
  updateFrequencyCap,
};
