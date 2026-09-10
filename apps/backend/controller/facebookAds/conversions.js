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


const sendConversionEvent = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const {
      pixelId,
      eventName,
      eventId,
      eventTime,
      testEventCode,
      eventSourceUrl,
      userData,
      customData,
      actionSource,
    } = req.body;

    if (!pixelId || !eventName) {
      return res.status(400).json({
        success: false,
        error: "pixelId and eventName are required",
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
    const result = await adsService.sendConversionEvent(pixelId, {
      eventName,
      eventId,
      eventTime,
      testEventCode,
      eventSourceUrl,
      userData,
      customData,
      actionSource,
    });

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
    console.error("❌ Error sending Conversion Event:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * v22.0 New Features: Ad Scheduling
 * ============================================
 */

/**
 * PUT /api/v1/facebook-ads/adsets/:id/schedule
 * تحديث جدولة Ad Set
 */

const getFacebookPages = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const accessToken = await getCompanyPageAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Page Access Token not found. Please connect your Facebook account.",
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const prisma = getSharedPrismaClient();
    const [company, storedPages, pagesResult, permissionsResult] =
      await Promise.all([
        prisma.company.findUnique({
          where: { id: companyId },
          select: { id: true, name: true },
        }),
        prisma.facebookPage.findMany({
          where: {
            companyId,
            status: "connected",
          },
          select: {
            pageId: true,
            pageName: true,
            status: true,
            connectedAt: true,
            updatedAt: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        adsService.getFacebookPages(),
        adsService.getUserPermissions(),
      ]);

    const remotePages = Array.isArray(pagesResult.data) ? pagesResult.data : [];
    const grantedPermissions = Array.isArray(permissionsResult.data)
      ? permissionsResult.data
          .filter((permission) => permission?.status === "granted")
          .map((permission) => permission.permission)
      : [];
    const missingRecommendedPermissions =
      FACEBOOK_PAGE_RECOMMENDED_PERMISSIONS.filter(
        (permission) => !grantedPermissions.includes(permission),
      );

    const remotePagesById = new Map(
      remotePages.map((page) => [String(page.id), page]),
    );
    const storedPagesById = new Map(
      storedPages.map((page) => [String(page.pageId), page]),
    );

    const mergedPages = remotePages.map((page) => {
      const pageId = String(page.id);
      const storedPage = storedPagesById.get(pageId);
      const isConnectedToCompany = Boolean(storedPage);

      return {
        id: pageId,
        name: page.name || storedPage?.pageName || pageId,
        category: page.category || undefined,
        source: isConnectedToCompany ? "page_token+company" : "page_token_only",
        isAccessibleByAdsToken: true,
        isConnectedToCompany,
        isSelectable: true,
        status: isConnectedToCompany
          ? "READY"
          : "ACCESSIBLE_BUT_NOT_CONNECTED",
        warning: isConnectedToCompany
          ? null
          : "هذه الصفحة ظهرت من حساب Meta الحالي لكنها غير مربوطة بهذه الشركة داخل Max P.",
      };
    });

    for (const storedPage of storedPages) {
      const pageId = String(storedPage.pageId);
      if (remotePagesById.has(pageId)) {
        continue;
      }

      mergedPages.push({
        id: pageId,
        name: storedPage.pageName || pageId,
        category: undefined,
        source: "company_connection_only",
        isAccessibleByAdsToken: false,
        isConnectedToCompany: true,
        isSelectable: false,
        status: "CONNECTED_BUT_NOT_ACCESSIBLE",
        warning:
          "هذه الصفحة مربوطة بهذه الشركة داخل Max P لكنها غير ظاهرة في ربط Meta الحالي.",
      });
    }

    mergedPages.sort(sortFacebookPageOptions);

    const counts = {
      total: mergedPages.length,
      ready: mergedPages.filter((page) => page.status === "READY").length,
      accessibleButNotConnected: mergedPages.filter(
        (page) => page.status === "ACCESSIBLE_BUT_NOT_CONNECTED",
      ).length,
      connectedButNotAccessible: mergedPages.filter(
        (page) => page.status === "CONNECTED_BUT_NOT_ACCESSIBLE",
      ).length,
    };

    let primaryWarning = null;
    if (counts.ready === 0 && counts.connectedButNotAccessible > 0) {
      primaryWarning =
        "الصفحات المربوطة بهذه الشركة غير ظاهرة في ربط Meta الحالي. أعد ربط Facebook بالحساب الذي يملك الصفحة الصحيحة.";
    } else if (counts.ready === 0 && counts.accessibleButNotConnected > 0) {
      primaryWarning =
        "يوجد صفحات متاحة من Meta، لكنها غير مربوطة بهذه الشركة داخل النظام. اختر بحذر أو اربط الصفحة الصحيحة أولاً.";
    }

    res.json({
      success: true,
      data: mergedPages.map(sanitizeFacebookPageForClient),
      meta: {
        company: company
          ? {
              id: company.id,
              name: company.name,
            }
          : null,
        counts,
        permissions: {
          granted: grantedPermissions,
          missingRecommended: missingRecommendedPermissions,
        },
        remoteFetchOk: pagesResult.success,
        remoteError: pagesResult.success ? null : pagesResult.error || null,
        primaryWarning,
      },
    });
  } catch (error) {
    console.error("Error getting Facebook Pages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/pixels
 * جلب Facebook Pixels
 */
const getFacebookPixels = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account.",
      });
    }

    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );

    if (!adAccount) {
      return res.status(404).json({
        success: false,
        error:
          "No Facebook Ad Account is ready yet. Please choose and activate an Ad Account first.",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.getFacebookPixels();

    res.json({
      success: true,
      data: result.data || [],
    });
  } catch (error) {
    console.error("Error getting Facebook Pixels:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


module.exports = {
  sendConversionEvent,
  getFacebookPages,
  getFacebookPixels,
};
