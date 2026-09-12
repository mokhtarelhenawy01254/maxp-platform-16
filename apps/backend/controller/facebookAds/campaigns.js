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


const getCampaigns = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    const adAccountScope = await getAdAccountReadScope(
      companyId,
      requestedAdAccountId,
    );

    if (!adAccountScope) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        meta: {
          accountScoped: true,
          adAccount: null,
        },
      });
    }

    // جلب الحملات من قاعدة البيانات
    const campaigns = await getSharedPrismaClient().facebookCampaign.findMany({
      where: {
        companyId,
        adAccountId: adAccountScope.id,
      },
      include: {
        facebookAdsets: {
          include: {
            facebookAds: {
              include: {
                facebookAdInsights: {
                  take: 1,
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const clientCampaigns = campaigns.map((campaign) =>
      buildCampaignClientPayload(campaign, adAccountScope),
    );

    res.json({
      success: true,
      data: clientCampaigns,
      count: clientCampaigns.length,
      meta: {
        accountScoped: true,
        adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
      },
    });
  } catch (error) {
    console.error("❌ Error getting campaigns:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns
 * إنشاء حملة جديدة
 */
const createCampaign = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Company ID is required",
      });
    }

    const {
      name,
      objective,
      status = "PAUSED",
      budgetType,
      budgetAmount,
      startDate,
      endDate,
      pixelId,
      adAccountId,
      // Campaign settings
      description,
      specialAdCategories,
      budgetOptimization,
      spendLimit,
      timezone,
      buyingType = "AUCTION",
      bidStrategy,
      // Targeting settings
      conversionLocation,
      optimizationGoal,
      targeting,
      // Placements settings
      placementType,
      placements,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !objective || !budgetType || !budgetAmount) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: name, objective, budgetType, budgetAmount",
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Access Token not found. Please connect your Facebook account first.",
      });
    }

    // جلب أو إنشاء Ad Account
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      adAccountId,
    );
    if (!adAccount) {
      return res.status(400).json({
        success: false,
        error:
          "Ad Account not found. Please choose and activate your Ad Account first.",
      });
    }

    // إنشاء Service
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);

    // إنشاء الحملة في Facebook مع كل البيانات
    const facebookResult = await adsService.createCampaign({
      name,
      objective,
      status,
      adAccountId: adAccount.accountId,
      specialAdCategories: specialAdCategories || [],
      budgetOptimization: budgetOptimization || false,
      budgetType,
      budgetAmount,
      spendLimit,
      buyingType,
      bidStrategy,
    });

    if (!facebookResult.success) {
      return res.status(400).json({
        success: false,
        error: facebookResult.error,
      });
    }

    // حفظ الحملة في قاعدة البيانات مع كل البيانات
    const campaign = await getSharedPrismaClient().facebookCampaign.create({
      data: {
        companyId,
        adAccountId: adAccount.id,
        name,
        objective,
        status,
        facebookCampaignId: facebookResult.campaignId,
        budgetType,
        budgetAmount,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        pixelId,
        // حفظ كل الإعدادات في JSON
        settings: JSON.stringify({
          description,
          specialAdCategories,
          budgetOptimization,
          spendLimit,
          timezone,
          buyingType,
          bidStrategy,
          // Targeting settings
          conversionLocation,
          optimizationGoal,
          targeting,
          // Placements settings
          placementType,
          placements,
          meta: buildCampaignMetaSettings(
            {
              id: facebookResult.campaignId,
              status,
              configured_status: status,
              effective_status: status,
            },
            adAccount,
          ),
        }),
      },
    });

    // إذا كان هناك targeting، ننشئ Ad Set تلقائياً
    if (targeting && facebookResult.campaignId) {
      try {
        const adSetResult = await adsService.createAdSet(
          facebookResult.campaignId,
          {
            name: `${name} - Ad Set`,
            status,
            targeting,
            budgetType: budgetOptimization ? undefined : budgetType,
            budgetAmount: budgetOptimization ? undefined : budgetAmount,
            optimizationGoal: optimizationGoal || "LINK_CLICKS",
            billingEvent: "IMPRESSIONS",
            placementType,
            placements,
          },
        );

        if (adSetResult.success) {
          // حفظ Ad Set في قاعدة البيانات
          await getSharedPrismaClient().facebookAdset.create({
            data: {
              campaignId: campaign.id,
              facebookAdSetId: adSetResult.adSetId,
              name: `${name} - Ad Set`,
              status,
              targeting: JSON.stringify(targeting),
              budgetType: budgetType || "DAILY",
              budgetAmount: toFiniteNumber(budgetAmount),
              optimizationGoal: optimizationGoal || "LINK_CLICKS",
              settings: JSON.stringify({
                budgetOptimization: Boolean(budgetOptimization),
                budgetSource: budgetOptimization ? "CAMPAIGN" : "AD_SET",
              }),
            },
          });
          console.log("✅ Ad Set created automatically:", adSetResult.adSetId);
        }
      } catch (adSetError) {
        console.warn(
          "⚠️ Failed to create automatic Ad Set:",
          adSetError.message,
        );
        // لا نفشل الحملة إذا فشل إنشاء Ad Set
      }
    }

    res.json({
      success: true,
      data: campaign,
      message: "Campaign created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/full-ad
 * إنشاء إعلان كامل (Campaign + AdSet + Ad) في خطوة واحدة
 * هذا هو الـ endpoint الرئيسي لإنشاء إعلان من الـ Wizard
 */

const getCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        facebookAdsets: {
          include: {
            facebookAds: {
              include: {
                facebookAdInsights: {
                  take: 30,
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
        facebookAdAccount: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    res.json({
      success: true,
      data: buildCampaignClientPayload(campaign, campaign.facebookAdAccount),
    });
  } catch (error) {
    console.error("❌ Error getting campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/facebook-ads/campaigns/:id
 * تحديث حملة
 */
const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const updateData = req.body;

    // جلب الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // تحديث في Facebook إذا كان موجود
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        const metaUpdateData = {};
        if (updateData.status) metaUpdateData.status = updateData.status;
        if (updateData.name) metaUpdateData.name = updateData.name;
        if (updateData.budgetAmount !== undefined) {
          const cents = Math.round(Number(updateData.budgetAmount) * 100);
          if (campaign.budgetType === "LIFETIME") {
            metaUpdateData.lifetime_budget = cents;
          } else {
            metaUpdateData.daily_budget = cents;
          }
        }
        if (Object.keys(metaUpdateData).length > 0) {
          await adsService.updateCampaign(
            campaign.facebookCampaignId,
            metaUpdateData,
          );
        }
      }
    }

    const updatePayload = { ...updateData };
    if (updateData.status || updateData.budgetAmount !== undefined) {
      const parsedSettings = parseJsonObject(campaign.settings);
      if (updateData.status) {
        parsedSettings.meta = {
          ...(parsedSettings.meta || {}),
          configuredStatus: updateData.status,
          effectiveStatus: updateData.status,
        };
      }
      updatePayload.settings = JSON.stringify(parsedSettings);
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: {
        ...updatePayload,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: "Campaign updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/campaigns/:id
 * حذف حملة
 */
const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // جلب الحملة
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // حذف من Facebook إذا كان موجود
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.deleteCampaign(campaign.facebookCampaignId);
      }
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookCampaign.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:id/pause
 * إيقاف حملة
 */
const pauseCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // إيقاف في Facebook
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(campaign.facebookCampaignId, {
          status: "PAUSED",
        });
      }
    }

    const parsedSettings = parseJsonObject(campaign.settings);
    parsedSettings.meta = {
      ...(parsedSettings.meta || {}),
      configuredStatus: "PAUSED",
      effectiveStatus: "PAUSED",
    };

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: {
        status: "PAUSED",
        settings: JSON.stringify(parsedSettings),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: "Campaign paused successfully",
    });
  } catch (error) {
    console.error("❌ Error pausing campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/campaigns/:id/resume
 * استئناف حملة
 */
const resumeCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // تفعيل في Facebook
    if (campaign.facebookCampaignId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        await adsService.updateCampaign(campaign.facebookCampaignId, {
          status: "ACTIVE",
        });
      }
    }

    const parsedSettings = parseJsonObject(campaign.settings);
    parsedSettings.meta = {
      ...(parsedSettings.meta || {}),
      configuredStatus: "ACTIVE",
      effectiveStatus: "ACTIVE",
    };

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookCampaign.update({
      where: { id },
      data: {
        status: "ACTIVE",
        settings: JSON.stringify(parsedSettings),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: "Campaign resumed successfully",
    });
  } catch (error) {
    console.error("❌ Error resuming campaign:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getBulkStatusModel = (entityType) => {
  switch (String(entityType || "").toLowerCase()) {
    case "campaign":
    case "campaigns":
      return {
        type: "campaign",
        prismaKey: "facebookCampaign",
        metaIdKey: "facebookCampaignId",
        findWhere: (ids, companyId) => ({ id: { in: ids }, companyId }),
        serviceUpdate: (adsService, metaId, status) =>
          adsService.updateCampaign(metaId, { status }),
      };
    case "adset":
    case "adsets":
    case "ad_set":
    case "ad_sets":
      return {
        type: "adset",
        prismaKey: "facebookAdset",
        metaIdKey: "facebookAdSetId",
        findWhere: (ids, companyId) => ({
          id: { in: ids },
          facebookCampaign: { companyId },
        }),
        serviceUpdate: (adsService, metaId, status) =>
          adsService.updateAdSet(metaId, { status }),
      };
    case "ad":
    case "ads":
      return {
        type: "ad",
        prismaKey: "facebookAd",
        metaIdKey: "facebookAdId",
        findWhere: (ids, companyId) => ({ id: { in: ids }, companyId }),
        serviceUpdate: (adsService, metaId, status) =>
          adsService.updateAd(metaId, { status }),
      };
    default:
      return null;
  }
};

const resolveBulkStatus = (action, explicitStatus) => {
  const normalizedAction = String(action || "").toLowerCase();
  const normalizedStatus = String(explicitStatus || "").toUpperCase();

  if (normalizedAction === "pause") return "PAUSED";
  if (normalizedAction === "resume") return "ACTIVE";
  if (normalizedAction === "delete") return "DELETE_NOT_SUPPORTED";
  if (["PAUSED", "ACTIVE"].includes(normalizedStatus)) return normalizedStatus;
  return null;
};

/**
 * POST /api/v1/facebook-ads/bulk/status
 * تحديث حالة عدة Campaigns / AdSets / Ads بأمان
 */
const bulkUpdateStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { entityType, targetType, ids, action, status } = req.body || {};
    const model = getBulkStatusModel(entityType || targetType);
    const nextStatus = resolveBulkStatus(action, status);
    const uniqueIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((id) => String(id || "").trim())
          .filter(Boolean),
      ),
    );

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: "Company context is required.",
      });
    }

    if (!model) {
      return res.status(400).json({
        success: false,
        error: "entityType must be one of campaign, adset, or ad.",
      });
    }

    if (nextStatus === "DELETE_NOT_SUPPORTED") {
      return res.status(400).json({
        success: false,
        error: "Bulk delete is not enabled. Use single-item delete routes with explicit confirmation.",
      });
    }

    if (!nextStatus) {
      return res.status(400).json({
        success: false,
        error: "Bulk status supports only pause/resume actions or ACTIVE/PAUSED status.",
      });
    }

    if (uniqueIds.length === 0 || uniqueIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: "ids must include between 1 and 50 local record ids.",
      });
    }

    const prisma = getSharedPrismaClient();
    const records = await prisma[model.prismaKey].findMany({
      where: model.findWhere(uniqueIds, companyId),
    });
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const accessToken = await getCompanyAdsAccessToken(companyId);
    const adsService = accessToken ? new FacebookAdsService(accessToken) : null;
    const results = [];

    for (const id of uniqueIds) {
      const record = recordsById.get(id);

      if (!record) {
        results.push({
          id,
          success: false,
          error: "Record not found for this company.",
        });
        continue;
      }

      const metaId = record[model.metaIdKey];
      if (metaId && !adsService) {
        results.push({
          id,
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
        continue;
      }

      if (metaId) {
        const metaResult = await model.serviceUpdate(
          adsService,
          metaId,
          nextStatus,
        );

        if (!metaResult?.success) {
          results.push({
            id,
            success: false,
            metaId,
            error: metaResult?.error || "Meta status update failed.",
          });
          continue;
        }
      }

      const updated = await prisma[model.prismaKey].update({
        where: { id },
        data: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      });

      results.push({
        id,
        success: true,
        status: nextStatus,
        metaId: metaId || null,
        metaUpdated: Boolean(metaId),
        data: updated,
      });
    }

    const failed = results.filter((result) => !result.success);

    return res.status(failed.length > 0 ? 207 : 200).json({
      success: failed.length === 0,
      entityType: model.type,
      status: nextStatus,
      updatedCount: results.length - failed.length,
      failedCount: failed.length,
      results,
    });
  } catch (error) {
    console.error("❌ Error bulk updating Facebook Ads status:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  pauseCampaign,
  resumeCampaign,
  bulkUpdateStatus,
};
