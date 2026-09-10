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


const getAdAccounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    if (process.env.NODE_ENV !== "test" && req.query?.refresh !== "true") {
      const cached = adAccountsMemoryCache.get(companyId);
      if (cached && Date.now() < cached.expiresAt) {
        return res.json({
          success: true,
          data: cached.data,
          meta: {
            ...cached.meta,
            cached: true,
          },
        });
      }
    }

    const savedAdAccounts = await getSharedPrismaClient().facebookAdAccount.findMany(
      {
        where: { companyId },
        select: {
          id: true,
          accountId: true,
          name: true,
          currency: true,
          timezone: true,
          isActive: true,
        },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
      },
    );

    const accessToken = await getCompanyAdsAccessToken(companyId);

    if (!accessToken) {
      return res.json({
        success: true,
        data: buildSavedAdAccountFallbacks(
          savedAdAccounts,
          new Set(),
          "NO_COMPANY_ACCESS_TOKEN",
        ),
        meta: {
          configured: false,
          reason: "NO_ACCESS_TOKEN",
        },
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const result = await adsService.getAdAccounts();

    if (!result.success) {
      return res.json({
        success: true,
        data: buildSavedAdAccountFallbacks(
          savedAdAccounts,
          new Set(),
          "FACEBOOK_API_ERROR",
        ),
        meta: {
          configured: false,
          reason: "FACEBOOK_API_ERROR",
          error: result.error || "Failed to fetch Ad Accounts from Facebook",
        },
      });
    }

    const savedAdAccountsById = new Map(
      savedAdAccounts.map((account) => [
        normalizeAdAccountId(account.accountId),
        account,
      ]),
    );

    const enrichedAdAccounts = (result.data || []).map((account) => {
      const normalizedAccountId = normalizeAdAccountId(
        account.account_id || account.id,
      );
      const savedAccount = savedAdAccountsById.get(normalizedAccountId);
      const safeAccount = sanitizeRemoteFacebookAdAccountForClient(account);

      return {
        ...safeAccount,
        account_id: normalizedAccountId,
        isSaved: Boolean(savedAccount),
        isActive: Boolean(savedAccount?.isActive),
      };
    });
    const remoteAccountIds = new Set(
      enrichedAdAccounts
        .map((account) => normalizeAdAccountId(account.account_id || account.id))
        .filter(Boolean),
    );
    const savedFallbackAccounts = buildSavedAdAccountFallbacks(
      savedAdAccounts,
      remoteAccountIds,
      "REMOTE_ACCOUNT_NOT_RETURNED",
    );

    const finalAccounts = [...enrichedAdAccounts, ...savedFallbackAccounts];
    adAccountsMemoryCache.set(companyId, {
      data: finalAccounts,
      meta: {
        total: finalAccounts.length,
      },
      expiresAt: Date.now() + AD_ACCOUNTS_CACHE_TTL_MS,
    });

    res.json({
      success: true,
      data: finalAccounts,
    });
  } catch (error) {
    console.error("❌ Error getting Ad Accounts:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching Ad Accounts",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * AdSet Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/campaigns/:campaignId/adsets
 * جلب جميع AdSets في حملة
 */

const saveAdAccount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { accountId, name, currency, timezone } = req.body;

    if (!accountId || !name) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: accountId, name",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adAccount = await upsertAdAccount(companyId, accessToken, {
      accountId,
      name,
      currency,
      timezone,
    });

    res.json({
      success: true,
      data: sanitizeFacebookAdAccountForClient(adAccount),
      message: "Ad Account saved successfully",
    });
  } catch (error) {
    console.error("❌ Error saving Ad Account:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/saved-ad-accounts
 * جلب Ad Accounts المحفوظة
 */
const getSavedAdAccounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    const adAccounts = await getSharedPrismaClient().facebookAdAccount.findMany(
      {
        where: { companyId },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      },
    );

    res.json({
      success: true,
      data: adAccounts.map(sanitizeFacebookAdAccountForClient),
    });
  } catch (error) {
    console.error("❌ Error getting saved Ad Accounts:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/connection/status
 * حالة ربط الإعلانات المعزول — المصادر + الحسابات المحفوظة + صحة التوكنات.
 * لا يُرجِع أي access token إلى المتصفح.
 */
const getAdsConnectionStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    const [sources, adAccounts, connectedPagesCount] = await Promise.all([
      getSharedPrismaClient().facebookAdsConnectionSource.findMany({
        where: { companyId },
        orderBy: [{ status: "asc" }, { connectedAt: "desc" }],
        include: {
          adAccounts: { select: { id: true } },
        },
      }),
      getSharedPrismaClient().facebookAdAccount.findMany({
        where: { companyId },
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        include: {
          connectionSource: {
            select: {
              id: true,
              facebookUserName: true,
              facebookUserEmail: true,
            },
          },
        },
      }),
      getSharedPrismaClient().facebookPage.count({
        where: { companyId, status: "connected" },
      }),
    ]);

    const connectionSources = sources.map((source) => ({
      id: source.id,
      facebookUserId: source.facebookUserId,
      facebookUserName: source.facebookUserName,
      facebookUserEmail: source.facebookUserEmail,
      status: source.status,
      hasToken: Boolean(source.accessToken),
      syncedAdAccountsCount: source.adAccounts?.length || 0,
      connectedAt: source.connectedAt,
      lastSyncedAt: source.lastSyncedAt,
      lastError: source.lastError,
    }));

    const savedAdAccounts = adAccounts.map((account) => {
      const hasIsolatedToken = Boolean(account.accessToken);
      const tokenSource = account.connectionSourceId
        ? "facebook_account"
        : hasIsolatedToken
          ? "isolated"
          : "company_connection_only";
      return {
        id: account.id,
        accountId: account.accountId,
        name: account.name,
        currency: account.currency,
        timezone: account.timezone,
        isActive: account.isActive,
        connectionSourceId: account.connectionSourceId,
        connectionSource: account.connectionSource
          ? {
              id: account.connectionSource.id,
              facebookUserName: account.connectionSource.facebookUserName,
              facebookUserEmail: account.connectionSource.facebookUserEmail,
            }
          : null,
        tokenSource,
        hasIsolatedToken,
      };
    });

    const activeAdAccount =
      adAccounts.find((account) => account.isActive) || null;

    // فحص كل مصدر عبر Meta دون إرجاع التوكن
    const remoteSources = [];
    for (const source of sources) {
      if (!source.accessToken) {
        remoteSources.push({
          sourceId: source.id,
          checked: true,
          ok: false,
          accountsCount: 0,
          error: "MISSING_TOKEN",
        });
        continue;
      }

      try {
        const adsService = new FacebookAdsService(source.accessToken);
        const result = await adsService.getAdAccounts();
        const accountsCount = result.success
          ? (result.data || []).length
          : 0;
        remoteSources.push({
          sourceId: source.id,
          checked: true,
          ok: result.success,
          accountsCount,
          error: result.success ? null : (typeof result.error === "string" ? result.error : result.error?.error?.message || result.error?.message || "FACEBOOK_API_ERROR"),
        });
      } catch (checkError) {
        remoteSources.push({
          sourceId: source.id,
          checked: true,
          ok: false,
          accountsCount: 0,
          error:
            checkError.response?.data?.error?.message || checkError.message,
        });
      }
    }

    const companyAdsToken = await getCompanyAdsAccessToken(companyId);

    res.json({
      success: true,
      connected: connectionSources.some(
        (source) => source.status === "connected" && source.hasToken,
      ),
      connectedFacebookAccountsCount: connectionSources.length,
      isolatedAdAccountsCount: savedAdAccounts.filter(
        (account) => account.hasIsolatedToken,
      ).length,
      savedAdAccounts,
      connectionSources,
      remoteSources,
      remote: {
        checked: Boolean(companyAdsToken) && remoteSources.length > 0,
        ok: remoteSources.some((entry) => entry.ok),
        accountsCount: remoteSources.reduce(
          (sum, entry) => sum + (entry.accountsCount || 0),
          0,
        ),
        error: null,
      },
      activeAdAccount: activeAdAccount
        ? { accountId: activeAdAccount.accountId }
        : null,
      pageConnection: {
        connectedPagesCount,
        messengerTokensProtected: true,
      },
    });
  } catch (error) {
    console.error("❌ Error getting Ads connection status:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/connection/sources/:sourceId
 * فصل مصدر إعلانات معزول — لا يمس توكنات الصفحات/الماسنجر.
 */
const disconnectAdsConnectionSource = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { sourceId } = req.params;

    if (!companyId || !sourceId) {
      return res.status(400).json({
        success: false,
        error: "Company ID and source ID are required",
      });
    }

    const source = await getSharedPrismaClient().facebookAdsConnectionSource.findFirst(
      {
        where: { id: sourceId, companyId },
      },
    );

    if (!source) {
      return res.status(404).json({
        success: false,
        error: "Connection source not found",
      });
    }

    // فصل الحسابات المربوطة بهذا المصدر (بدون حذف التوكنات القديمة للشركة)
    await getSharedPrismaClient().facebookAdAccount.updateMany({
      where: { companyId, connectionSourceId: sourceId },
      data: {
        connectionSourceId: null,
        isActive: false,
      },
    });

    await getSharedPrismaClient().facebookAdsConnectionSource.update({
      where: { id: sourceId },
      data: {
        status: "disconnected",
        accessToken: null,
        lastError: "FCM: disconnected by owner",
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "تم فصل مصدر الإعلانات بنجاح",
      sourceId,
    });
  } catch (error) {
    console.error("❌ Error disconnecting Ads connection source:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/upload-image
 * رفع صورة إلى Facebook
 */

module.exports = {
  getAdAccounts,
  saveAdAccount,
  getSavedAdAccounts,
  getAdsConnectionStatus,
  disconnectAdsConnectionSource,
};
