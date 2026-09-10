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


const createFullAd = async (req, res) => {
  let publishRequest = null;
  let publishPrisma = null;
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const userId = req.user?.id || req.user?.userId || null;
    publishPrisma = getSharedPrismaClient();
    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: "Company ID is required",
        errorCode: "COMPANY_ID_REQUIRED",
      });
    }
    const clientRequestId = normalizeClientRequestId(
      data.clientRequestId || data.idempotencyKey,
    );
    if (!clientRequestId) {
      return res.status(400).json({
        success: false,
        error:
          "طلب إنشاء الإعلان يحتاج مفتاح idempotency ثابت من الواجهة قبل النشر لمنع إنشاء إعلان مكرر.",
        errorCode: "FACEBOOK_AD_PUBLISH_IDEMPOTENCY_REQUIRED",
        field: "clientRequestId",
      });
    }
    data.clientRequestId = clientRequestId;
    data.status = normalizeFullAdStatus(data.status);
    const requestHash = buildPublishRequestHash(data);

    const existingPublishRequest = await getExistingPublishRequest(
      publishPrisma,
      companyId,
      clientRequestId,
    );

    if (existingPublishRequest) {
      return sendExistingPublishRequestResponse(
        res,
        existingPublishRequest,
        clientRequestId,
        requestHash,
      );
    }

    // التحقق من وجود Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account first.",
      });
    }

    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      data.adAccountId,
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error:
          "No Facebook Ad Account is ready yet. Please choose and activate an Ad Account first.",
      });
    }

    // إنشاء الـ Service
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // التحقق من البيانات المطلوبة
    const {
      campaignName,
      objective,
      budgetAmount,
      pageId,
      primaryText,
      headline,
      linkUrl,
    } = data;
    const creativeType = normalizeFullAdCreativeType(data.creativeType);
    const normalizedBudgetType = data.budgetType || "DAILY";
    const normalizedBudgetAmount = toFiniteNumber(budgetAmount);

    if (!campaignName) {
      return res
        .status(400)
        .json({ success: false, error: "Campaign name is required" });
    }
    if (!objective) {
      return res
        .status(400)
        .json({ success: false, error: "Campaign objective is required" });
    }
    if (!normalizedBudgetAmount || normalizedBudgetAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Valid budget amount is required" });
    }
    const budgetValidationError = buildFullAdBudgetValidationError({
      budgetAmount: normalizedBudgetAmount,
      adAccount,
    });
    if (budgetValidationError) {
      return res.status(400).json(budgetValidationError);
    }
    if (!pageId) {
      return res
        .status(400)
        .json({ success: false, error: "Facebook Page ID is required" });
    }
    if (!primaryText) {
      return res
        .status(400)
        .json({ success: false, error: "Ad primary text is required" });
    }
    if (!linkUrl) {
      return res
        .status(400)
        .json({ success: false, error: "Destination URL is required" });
    }
    if (requiresFullAdPixel(data) && !String(data.pixelId || "").trim()) {
      return res.status(400).json({
        success: false,
        error:
          "مسار المبيعات أو التحويلات يحتاج Facebook Pixel واضح قبل النشر.",
        errorCode: "FACEBOOK_PIXEL_REQUIRED",
        field: "pixelId",
      });
    }
    if (data.status === "ACTIVE" && !hasActivePublishConfirmation(data)) {
      return res.status(409).json({
        success: false,
        error:
          "تشغيل الإعلان كـ ACTIVE يحتاج تأكيد نشر صريح من الواجهة لمنع صرف غير مقصود.",
        errorCode: "ACTIVE_PUBLISH_CONFIRMATION_REQUIRED",
        field: "status",
      });
    }

    const creativeValidationError = validateFullAdCreativePayload(
      data,
      creativeType,
    );
    if (creativeValidationError) {
      return res.status(400).json({
        success: false,
        error: creativeValidationError,
      });
    }

    data.creativeType = creativeType;
    data.budgetType = normalizedBudgetType;
    data.budgetAmount = normalizedBudgetAmount;
    Object.assign(data, normalizeFullAdDeliverySettings(data));

    if (
      data.bidStrategy !== "LOWEST_COST" &&
      (!toFiniteNumber(data.bidValue) || toFiniteNumber(data.bidValue) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Bid amount is required when using bid cap, cost cap, or ROAS bidding.",
        errorCode: "BID_VALUE_REQUIRED",
        field: "bidValue",
      });
    }

    const readinessError = await validateFullAdAssetReadiness({
      companyId,
      pageId,
      pixelId: data.pixelId,
      adAccount,
      adsService,
      data,
    });
    if (readinessError) {
      return res.status(400).json(readinessError);
    }

    publishRequest = await createPublishRequest(publishPrisma, {
      companyId,
      userId,
      clientRequestId,
      requestHash,
      data,
    });
    if (publishRequest?.__duplicateLock) {
      return sendExistingPublishRequestResponse(
        res,
        publishRequest,
        clientRequestId,
        requestHash,
      );
    }

    console.log("🚀 Creating Full Ad for company:", companyId);

    // إنشاء الإعلان الكامل
    const result = await adsService.createFullAd(data);

    if (!result.success) {
      const reachedMeta = didFullAdAttemptReachMeta(result);
      const publishFailureStatus = reachedMeta ? "META_PARTIAL_FAILED" : "FAILED";
      const failurePayload = {
        success: false,
        error: result.error,
        errorCode: reachedMeta
          ? "FACEBOOK_AD_PUBLISH_META_PARTIAL_FAILED"
          : "FACEBOOK_AD_PUBLISH_PRE_META_FAILED",
        retryableWithNewRequestId: !reachedMeta,
        step: result.step,
        partialSuccess: result.partialSuccess,
        results: result.results,
      };
      await updatePublishRequest(publishPrisma, publishRequest, {
        status: publishFailureStatus,
        responsePayload: safeStringifyJson(failurePayload),
        errorMessage: result.error || null,
        step: result.step || null,
        partialSuccess: Boolean(result.partialSuccess),
        facebookCampaignId: result.results?.campaign?.campaignId || null,
        facebookAdSetId: result.results?.adSet?.adSetId || null,
        facebookAdId: result.results?.ad?.adId || null,
        facebookCreativeId: result.results?.creative?.creativeId || null,
        completedAt: new Date(),
        lockExpiresAt: null,
      });
      return res.status(400).json({
        ...failurePayload,
        idempotency: {
          clientRequestId: data.clientRequestId,
        },
      });
    }

    // حفظ البيانات في قاعدة البيانات
    try {
      // حفظ Campaign
      const campaign = await getSharedPrismaClient().facebookCampaign.create({
        data: {
          companyId,
          adAccountId: adAccount.id,
          name: data.campaignName,
          objective: data.objective,
          status: data.status || "PAUSED",
          facebookCampaignId: result.campaignId,
          budgetType: normalizedBudgetType,
          budgetAmount: normalizedBudgetAmount,
          startDate: data.startTime ? new Date(data.startTime) : null,
          endDate: data.endTime ? new Date(data.endTime) : null,
          pixelId: data.pixelId || null,
          settings: JSON.stringify({
            budgetOptimization: data.budgetOptimization,
            bidStrategy: data.bidStrategy,
            specialAdCategories: data.specialAdCategories,
            meta: buildCampaignMetaSettings(
              {
                id: result.campaignId,
                status: data.status || "PAUSED",
                configured_status: data.status || "PAUSED",
                effective_status: data.status || "PAUSED",
              },
              adAccount,
            ),
          }),
        },
      });

      // حفظ AdSet
      const adSet = await getSharedPrismaClient().facebookAdset.create({
        data: {
          campaignId: campaign.id,
          facebookAdSetId: result.adSetId,
          name: data.adSetName || `${data.campaignName} - AdSet`,
          status: data.status || "PAUSED",
          targeting: JSON.stringify(data.targeting || {}),
          budgetType: normalizedBudgetType,
          budgetAmount: normalizedBudgetAmount,
          optimizationGoal: data.optimizationGoal || "LINK_CLICKS",
          settings: JSON.stringify({
            budgetOptimization: Boolean(data.budgetOptimization),
            budgetSource: data.budgetOptimization ? "CAMPAIGN" : "AD_SET",
            billingEvent: data.billingEvent || "IMPRESSIONS",
            performanceGoal: data.performanceGoal || null,
            conversionEvent: data.conversionEvent || null,
            conversionLocation: data.conversionLocation || null,
            attributionWindow: data.attributionWindow || null,
            pixelId: data.pixelId || null,
          }),
        },
      });

      // حفظ Ad
      const storedCreative = getPersistedCreativePayload(
        data,
        result,
        creativeType,
      );
      const storedCarouselCards = storedCreative.carouselCards || [];
      const ad = await getSharedPrismaClient().facebookAd.create({
        data: {
          companyId,
          adSetId: adSet.id,
          facebookAdId: result.adId,
          name: data.adName || `${data.campaignName} - Ad`,
          status: data.status || "PAUSED",
          creativeType,
          primaryText: data.primaryText,
          headline: data.headline || null,
          description: data.description || null,
          callToAction: data.callToAction || "LEARN_MORE",
          imageUrl: data.imageUrl || null,
          videoUrl: data.videoUrl || null,
          imageHash: result.imageHash || data.imageHash || null,
          videoId: result.videoId || data.videoId || null,
          carouselImages:
            creativeType === "CAROUSEL"
              ? JSON.stringify(storedCarouselCards)
              : null,
          carouselCount:
            creativeType === "CAROUSEL" ? storedCarouselCards.length : 1,
          linkUrl: data.linkUrl,
          productId: data.productId || null,
          creative: JSON.stringify(storedCreative),
        },
      });

      console.log("✅ Full Ad saved to database");

      const successPayload = {
        success: true,
        data: {
          campaign,
          adSet,
          ad,
          facebookIds: {
            campaignId: result.campaignId,
            adSetId: result.adSetId,
            adId: result.adId,
            creativeId: result.creativeId,
          },
        },
        message: "Full ad created successfully!",
        idempotency: {
          clientRequestId: data.clientRequestId,
        },
      };

      await updatePublishRequest(publishPrisma, publishRequest, {
        status: "SUCCEEDED",
        responsePayload: safeStringifyJson(successPayload),
        facebookCampaignId: result.campaignId,
        facebookAdSetId: result.adSetId,
        facebookAdId: result.adId,
        facebookCreativeId: result.creativeId,
        completedAt: new Date(),
        lockExpiresAt: null,
      });

      res.json(successPayload);
    } catch (dbError) {
      console.error(
        "⚠️ Database save error (ad was created on Facebook):",
        dbError,
      );

      // الإعلان تم إنشاؤه على Facebook لكن فشل الحفظ في DB
      const warningPayload = {
        success: true,
        warning: "Ad created on Facebook but failed to save locally",
        facebookIds: {
          campaignId: result.campaignId,
          adSetId: result.adSetId,
          adId: result.adId,
          creativeId: result.creativeId,
        },
        message: result.message,
        idempotency: {
          clientRequestId: data.clientRequestId,
        },
      };

      await updatePublishRequest(publishPrisma, publishRequest, {
        status: "LOCAL_SAVE_FAILED",
        responsePayload: safeStringifyJson(warningPayload),
        errorMessage: dbError.message || "Local DB save failed after Meta creation",
        facebookCampaignId: result.campaignId,
        facebookAdSetId: result.adSetId,
        facebookAdId: result.adId,
        facebookCreativeId: result.creativeId,
        completedAt: new Date(),
        lockExpiresAt: null,
      });

      res.json(warningPayload);
    }
  } catch (error) {
    console.error("❌ Error creating full ad:", error);
    await updatePublishRequest(publishPrisma, publishRequest, {
      status: "FAILED",
      responsePayload: safeStringifyJson({
        success: false,
        error: error.message,
        errorCode: "FACEBOOK_AD_PUBLISH_FAILED",
      }),
      errorMessage: error.message || "Failed to create full ad",
      completedAt: new Date(),
      lockExpiresAt: null,
    });
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: "FACEBOOK_AD_PUBLISH_FAILED",
    });
  }
};

/**
 * GET /api/v1/facebook-ads/campaigns/:id
 * جلب تفاصيل حملة
 */

const getProductLaunchMetadata = async (req, res) => {
  try {
    const { url } = req.query;
    const companyId = req.user?.companyId;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Product URL is required",
      });
    }

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: "Company authentication is required",
      });
    }

    const parsedProductUrl = parseProductLaunchUrl(url);
    const decodedProductSlug = decodeProductLaunchSlug(
      parsedProductUrl.productSlug,
    );
    const productApiUrl = new URL(
      `${parsedProductUrl.origin}/api/v1/public/products/${encodeURIComponent(
        decodedProductSlug,
      )}`,
    );
    productApiUrl.searchParams.set("companyId", parsedProductUrl.storeSlug);

    const product = await getSharedPrismaClient().product.findFirst({
      where: {
        companyId,
        deletedAt: null,
        isActive: true,
        OR: [
          { id: decodedProductSlug },
          { slug: decodedProductSlug },
          { slug: parsedProductUrl.productSlug },
        ],
      },
      select: PRODUCT_LAUNCH_METADATA_PRODUCT_SELECT,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product metadata could not be loaded",
      });
    }

    const imageUrls = collectProductLaunchImages(
      product,
      parsedProductUrl.origin,
    );

    return res.json({
      success: true,
      data: {
        sourceUrl: parsedProductUrl.url,
        productApiUrl: productApiUrl.toString(),
        storeSlug: parsedProductUrl.storeSlug,
        productSlug: product.slug || parsedProductUrl.productSlug,
        id: product.id,
        name: product.name,
        description: stripHtml(product.description),
        sku: product.sku || null,
        price: toNullableNumber(product.price),
        comparePrice: toNullableNumber(product.comparePrice),
        category: product.category?.name || product.category || null,
        isActive: product.isActive !== false,
        isHidden: product.isHidden === true,
        stock: toNullableNumber(product.stock),
        trackInventory: product.trackInventory !== false,
        mainImage: imageUrls[0] || null,
        imageUrls,
        imageCount: imageUrls.length,
        carouselCardLimit: 10,
      },
    });
  } catch (error) {
    const status =
      error.message?.includes("not allowed") ||
      error.message?.includes("missing") ||
      error.message?.includes("must use")
        ? 400
        : 500;

    console.error("❌ Error loading product launch metadata:", {
      message: error.message,
      url: req.query?.url,
    });

    return res.status(status).json({
      success: false,
      error: error.message || "Failed to load product metadata",
    });
  }
};


module.exports = {
  createFullAd,
  getProductLaunchMetadata,
};
