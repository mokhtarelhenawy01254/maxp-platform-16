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


async function syncCampaignStructureFromMeta({
  prisma,
  companyId,
  campaign,
  fbAdSets,
  adsByAdSetId,
}) {
  const counters = {
    adSets: 0,
    ads: 0,
  };

  for (const fbAdSet of fbAdSets || []) {
    const budget = getMetaBudget(
      fbAdSet,
      campaign.budgetType,
      campaign.budgetAmount,
    );
    const targeting = parseJsonObject(fbAdSet.targeting);
    const existingAdSet = await prisma.facebookAdset.findFirst({
      where: {
        campaignId: campaign.id,
        facebookAdSetId: fbAdSet.id,
      },
    });
    const adSetSettings = mergeSettings(
      parseJsonObject(existingAdSet?.settings),
      {
        meta: buildAdSetMetaSettings(fbAdSet),
        targeting,
      },
    );
    const adSetData = {
      campaignId: campaign.id,
      name: fbAdSet.name || `Meta Ad Set ${fbAdSet.id}`,
      status: fbAdSet.status || "PAUSED",
      facebookAdSetId: fbAdSet.id,
      targeting: stringifyJson(targeting),
      ageMin: toNullableNumber(targeting.age_min),
      ageMax: toNullableNumber(targeting.age_max),
      genders: targeting.genders ? stringifyJson(targeting.genders) : null,
      locations: targeting.geo_locations
        ? stringifyJson(targeting.geo_locations)
        : null,
      interests: targeting.interests ? stringifyJson(targeting.interests) : null,
      behaviors: targeting.behaviors ? stringifyJson(targeting.behaviors) : null,
      customAudiencesJson: targeting.custom_audiences
        ? stringifyJson(targeting.custom_audiences)
        : null,
      lookalikeAudiencesJson: targeting.lookalike_spec
        ? stringifyJson(targeting.lookalike_spec)
        : null,
      budgetType: budget.budgetType,
      budgetAmount: budget.budgetAmount,
      optimizationGoal: fbAdSet.optimization_goal || null,
      billingEvent: fbAdSet.billing_event || null,
      settings: stringifyJson(adSetSettings),
      lastSyncAt: new Date(),
    };

    const adSet = existingAdSet
      ? await prisma.facebookAdset.update({
          where: { id: existingAdSet.id },
          data: adSetData,
        })
      : await prisma.facebookAdset.create({
          data: adSetData,
        });

    counters.adSets += 1;

    for (const fbAd of adsByAdSetId.get(fbAdSet.id) || []) {
      const creative = extractMetaAdCreative(fbAd);
      const existingAd = await prisma.facebookAd.findFirst({
        where: {
          adSetId: adSet.id,
          facebookAdId: fbAd.id,
        },
      });
      const adData = {
        adSetId: adSet.id,
        companyId,
        name: fbAd.name || `Meta Ad ${fbAd.id}`,
        status: fbAd.status || "PAUSED",
        facebookAdId: fbAd.id,
        creativeType: creative.creativeType,
        primaryText: creative.primaryText || "Synced from Meta",
        headline: creative.headline,
        description: creative.description,
        callToAction: creative.callToAction,
        imageUrl: creative.imageUrl,
        videoUrl: null,
        imageHash: creative.imageHash,
        videoId: creative.videoId,
        carouselImages: creative.carouselImages,
        carouselCount: creative.carouselCount,
        linkUrl: creative.linkUrl,
        creative: stringifyJson(
          mergeSettings(parseJsonObject(existingAd?.creative), {
            meta: buildAdMetaSettings(fbAd),
            rawCreative: parseJsonObject(creative.creative),
          }),
        ),
        lastSyncAt: new Date(),
      };

      if (existingAd) {
        await prisma.facebookAd.update({
          where: { id: existingAd.id },
          data: adData,
        });
      } else {
        await prisma.facebookAd.create({
          data: adData,
        });
      }

      counters.ads += 1;
    }
  }

  return counters;
}

const syncFromFacebook = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adAccountId, includeStructure = true, syncScope } = req.body;
    const shouldSyncStructure =
      includeStructure !== false && syncScope !== "campaigns";

    // Invalidate caches for this company so subsequent reads are fresh
    if (companyId) {
      adAccountsMemoryCache.delete(companyId);
      for (const key of performanceSummaryMemoryCache.keys()) {
        if (key.startsWith(`${companyId}:`)) {
          performanceSummaryMemoryCache.delete(key);
        }
      }
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    // جلب Ad Account
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      adAccountId,
    );
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error: "Ad Account not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const prisma = getSharedPrismaClient();

    // جلب الحملات من Facebook
    const campaignsResult = await adsService.getCampaigns(adAccount.accountId, [
      "id",
      "name",
      "objective",
      "account_id",
      "status",
      "configured_status",
      "effective_status",
      "created_time",
      "updated_time",
      "start_time",
      "stop_time",
      "daily_budget",
      "lifetime_budget",
    ]);

    if (!campaignsResult.success) {
      return res.status(400).json(campaignsResult);
    }

    const structureSyncWarnings = [];
    let fbAdSetsByCampaignId = new Map();
    let fbAdsByAdSetId = new Map();

    if (shouldSyncStructure) {
      const [adSetsResult, adsResult] = await Promise.all([
        adsService.getAdSets(adAccount.accountId),
        adsService.getAds(adAccount.accountId),
      ]);

      if (adSetsResult.success) {
        fbAdSetsByCampaignId = groupByMetaParentId(
          adSetsResult.data,
          getMetaCampaignIdFromAdSet,
        );
      } else {
        structureSyncWarnings.push({
          level: "adset",
          error: adSetsResult.error,
        });
      }

      if (adsResult.success) {
        fbAdsByAdSetId = groupByMetaParentId(
          adsResult.data,
          getMetaAdSetIdFromAd,
        );
      } else {
        structureSyncWarnings.push({
          level: "ad",
          error: adsResult.error,
        });
      }
    }

    const syncedCampaigns = [];
    const skippedCampaigns = [];
    let syncedAdSetsCount = 0;
    let syncedAdsCount = 0;
    const selectedMetaAccountId = normalizeAdAccountId(adAccount.accountId);

    for (const fbCampaign of campaignsResult.data) {
      const campaignMetaAccountId = normalizeAdAccountId(
        fbCampaign.account_id || adAccount.accountId,
      );

      if (
        campaignMetaAccountId &&
        selectedMetaAccountId &&
        campaignMetaAccountId !== selectedMetaAccountId
      ) {
        skippedCampaigns.push({
          id: fbCampaign.id,
          name: fbCampaign.name,
          accountId: campaignMetaAccountId,
        });
        console.warn(
          `⚠️ Skipping campaign ${fbCampaign.id} from ad account ${campaignMetaAccountId}; expected ${selectedMetaAccountId}`,
        );
        continue;
      }

      // البحث عن الحملة المحلية أو إنشاء جديدة
      const existingCampaign = await prisma.facebookCampaign.findFirst({
        where: {
          companyId,
          facebookCampaignId: fbCampaign.id,
          OR: [{ adAccountId: adAccount.id }, { adAccountId: null }],
        },
      });
      const campaignBudget = getMetaBudget(fbCampaign);

      const campaignData = {
        name: fbCampaign.name,
        objective: fbCampaign.objective,
        status: fbCampaign.status,
        facebookCampaignId: fbCampaign.id,
        budgetType: campaignBudget.budgetType,
        budgetAmount: campaignBudget.budgetAmount,
        adAccountId: adAccount.id,
        settings: JSON.stringify(
          mergeCampaignSettings(parseJsonObject(existingCampaign?.settings), {
            meta: buildCampaignMetaSettings(fbCampaign, adAccount),
          }),
        ),
        lastSyncAt: new Date(),
      };

      let campaign;
      if (existingCampaign) {
        campaign = await prisma.facebookCampaign.update({
          where: { id: existingCampaign.id },
          data: campaignData,
        });
      } else {
        campaign = await prisma.facebookCampaign.create({
          data: {
            ...campaignData,
            companyId,
            adAccountId: adAccount.id,
          },
        });
      }

      if (shouldSyncStructure) {
        const structureCounters = await syncCampaignStructureFromMeta({
          prisma,
          companyId,
          campaign,
          fbAdSets: fbAdSetsByCampaignId.get(fbCampaign.id) || [],
          adsByAdSetId: fbAdsByAdSetId,
        });
        syncedAdSetsCount += structureCounters.adSets;
        syncedAdsCount += structureCounters.ads;
      }

      syncedCampaigns.push(campaign);
    }

    res.json({
      success: true,
      data: syncedCampaigns,
      meta: {
        adAccount: sanitizeFacebookAdAccountForClient(adAccount),
        skippedCampaigns,
        syncedAdSets: syncedAdSetsCount,
        syncedAds: syncedAdsCount,
        structureSyncWarnings,
        structureSyncSkipped: !shouldSyncStructure,
      },
      message: `Synced ${syncedCampaigns.length} campaigns from Facebook${
        skippedCampaigns.length
          ? `, skipped ${skippedCampaigns.length} outside selected ad account`
          : ""
      }${
        shouldSyncStructure
          ? `, ${syncedAdSetsCount} ad sets, ${syncedAdsCount} ads`
          : ", campaign structure sync skipped"
      }`,
    });
  } catch (error) {
    console.error("❌ Error syncing from Facebook:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/ad-accounts/save
 * حفظ Ad Account
 */

module.exports = {
  syncFromFacebook,
};
