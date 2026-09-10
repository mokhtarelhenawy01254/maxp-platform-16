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


const getAdInsights = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id: adId, companyId },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    // جلب من قاعدة البيانات المحلية
    const whereClause = { adId };
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const insights = await getSharedPrismaClient().facebookAdInsight.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      take: 30,
    });

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("❌ Error getting Ad insights:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ads/:adId/details
 * صفحة تشخيص أداء إعلان فردي
 */
const getAdDetails = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user?.companyId;
    const prisma = getSharedPrismaClient();
    const dateRange = normalizeReportDateRange(startDate, endDate);
    const previousDateRange = getPreviousDateRange(
      dateRange.rangeStart,
      dateRange.rangeEnd,
    );

    const ad = await prisma.facebookAd.findFirst({
      where: { id: adId, companyId },
      include: {
        facebookAdset: {
          include: {
            facebookCampaign: {
              include: { facebookAdAccount: true },
            },
          },
        },
        facebookAdInsights: {
          where: {
            date: {
              gte: dateRange.rangeStart,
              lte: dateRange.rangeEnd,
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    const adSet = ad.facebookAdset;
    const campaign = adSet.facebookCampaign;
    const dateWhere = {
      date: {
        gte: dateRange.rangeStart,
        lte: dateRange.rangeEnd,
      },
    };
    const previousDateWhere = {
      date: {
        gte: previousDateRange.rangeStart,
        lte: previousDateRange.rangeEnd,
      },
    };

    const [
      previousInsights,
      adSetInsights,
      campaignInsights,
      siblingAds,
    ] = await Promise.all([
      prisma.facebookAdInsight.findMany({
        where: { adId, ...previousDateWhere },
      }),
      prisma.facebookAdInsight.findMany({
        where: {
          ...dateWhere,
          facebookAd: { adSetId: adSet.id },
        },
      }),
      prisma.facebookAdInsight.findMany({
        where: {
          ...dateWhere,
          facebookAd: {
            facebookAdset: { campaignId: campaign.id },
          },
        },
      }),
      prisma.facebookAd.findMany({
        where: { adSetId: adSet.id, companyId },
        include: {
          facebookAdInsights: {
            where: dateWhere,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    let metaInsights = null;
    let previousMetaInsights = null;
    let adSetMetaInsights = null;
    let campaignMetaInsights = null;
    let quality = {
      available: false,
      source: ad.facebookAdId ? "META" : "LOCAL",
      metrics: null,
      error: ad.facebookAdId ? null : "Ad is not synced with Meta",
    };
    const siblingMetaInsightsByAdId = new Map();
    let performanceSource = "LOCAL";
    let metaInsightError = null;
    let accessToken = null;
    let adsService = null;

    if (ad.facebookAdId) {
      accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        adsService = new FacebookAdsService(
          accessToken,
          campaign.facebookAdAccount?.accountId,
        );
        const siblingAdsToHydrate = siblingAds
          .filter((siblingAd) => siblingAd.facebookAdId)
          .slice(0, 25);
        const metaRequests = [
          getMetaInsightsOrNull(adsService, ad.facebookAdId, dateRange),
          getMetaInsightsOrNull(adsService, ad.facebookAdId, previousDateRange),
          getMetaInsightsOrNull(adsService, adSet.facebookAdSetId, dateRange),
          getMetaInsightsOrNull(
            adsService,
            campaign.facebookCampaignId,
            dateRange,
          ),
          adsService.getAdQualityMetrics(ad.facebookAdId),
          ...siblingAdsToHydrate.map((siblingAd) =>
            getMetaInsightsOrNull(adsService, siblingAd.facebookAdId, dateRange),
          ),
        ];
        const metaResults = await Promise.allSettled(metaRequests);

        if (metaResults[0].status === "fulfilled") {
          metaInsights = metaResults[0].value;
        } else {
          metaInsightError = metaResults[0].reason?.message || "Meta insights failed";
        }

        if (metaResults[1].status === "fulfilled") {
          previousMetaInsights = metaResults[1].value;
        }

        if (metaResults[2].status === "fulfilled") {
          adSetMetaInsights = metaResults[2].value;
        }

        if (metaResults[3].status === "fulfilled") {
          campaignMetaInsights = metaResults[3].value;
        }

        const qualityResult = metaResults[4];
        if (qualityResult?.status === "fulfilled" && qualityResult.value?.success) {
          quality = {
            available: true,
            source: "META",
            metrics: qualityResult.value.metrics,
            error: null,
          };
        } else if (qualityResult?.status === "fulfilled") {
          quality = {
            available: false,
            source: "META",
            metrics: null,
            error: qualityResult.value?.error,
          };
        } else if (qualityResult?.status === "rejected") {
          quality = {
            available: false,
            source: "META",
            metrics: null,
            error: qualityResult.reason?.message || "Meta quality metrics failed",
          };
        }

        siblingAdsToHydrate.forEach((siblingAd, index) => {
          const result = metaResults[index + 5];
          if (result?.status === "fulfilled" && Array.isArray(result.value)) {
            siblingMetaInsightsByAdId.set(siblingAd.id, result.value);
          }
        });
      } else {
        metaInsightError = "Facebook Access Token not found";
      }
    }

    const hasLiveMetaInsights = Array.isArray(metaInsights);
    if (hasLiveMetaInsights) {
      performanceSource = "META";
    }

    const summary = hasLiveMetaInsights
      ? aggregateMetaInsights(metaInsights)
      : aggregatePersistedInsights(ad.facebookAdInsights);
    const previousSummary = Array.isArray(previousMetaInsights)
      ? aggregateMetaInsights(previousMetaInsights)
      : aggregatePersistedInsights(previousInsights);
    const adSetSummary = Array.isArray(adSetMetaInsights)
      ? aggregateMetaInsights(adSetMetaInsights)
      : aggregatePersistedInsights(adSetInsights);
    const campaignSummary = Array.isArray(campaignMetaInsights)
      ? aggregateMetaInsights(campaignMetaInsights)
      : aggregatePersistedInsights(campaignInsights);
    const funnel = buildAdFunnel(summary);
    const siblingPerformance = siblingAds.map((siblingAd) => ({
      id: siblingAd.id,
      name: siblingAd.name,
      status: siblingAd.status,
      effectiveStatus: buildAdClientPayload(siblingAd).effectiveStatus,
      facebookAdId: siblingAd.facebookAdId,
      metrics: siblingMetaInsightsByAdId.has(siblingAd.id)
        ? aggregateMetaInsights(siblingMetaInsightsByAdId.get(siblingAd.id))
        : aggregatePersistedInsights(siblingAd.facebookAdInsights || []),
    }));
    const verdict = buildAdVerdict(
      summary,
      previousSummary,
      adSetSummary,
      campaignSummary,
    );
    const recommendations = buildAdDetailRecommendations({
      summary,
      previousSummary,
      adSetSummary,
      campaignSummary,
      funnel,
      ad,
      campaign,
    });
    const decision = await facebookAdsDecisionService.buildAdDecisionForAd({
      prisma,
      companyId,
      ad,
      summary,
      previousSummary,
      adSetSummary,
      campaignSummary,
      dateRange,
    });

    res.json({
      success: true,
      data: {
        ad: buildAdClientPayload(ad),
        adSet: buildAdSetClientPayload({ ...adSet, facebookAds: [] }),
        campaign: buildCampaignClientPayload(campaign),
        adAccount: campaign.facebookAdAccount || null,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        previousDateRange: {
          startDate: previousDateRange.startDate,
          endDate: previousDateRange.endDate,
        },
        insights: ad.facebookAdInsights,
        summary,
        previousSummary,
        adSetSummary,
        campaignSummary,
        comparisons: {
          previousPeriod: buildAdComparison(summary, previousSummary),
          adSetAverage: buildAdComparison(summary, adSetSummary),
          campaignAverage: buildAdComparison(summary, campaignSummary),
        },
        funnel,
        verdict,
        decision,
        recommendations,
        siblingAds: siblingPerformance,
        quality,
        meta: {
          performanceSource,
          insightsCount: hasLiveMetaInsights
            ? metaInsights.length
            : ad.facebookAdInsights.length,
          fallbackSource: hasLiveMetaInsights ? null : "LOCAL",
          metaInsightError,
          siblingAdsCount: siblingPerformance.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Ad details:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/decision-summary
 * ملخص قرارات read-only مبني على الربحية والتتبع والـ insights المتزامنة
 */
const DECISION_TIMEOUT_MS = 25000;

const getDecisionSummary = async (req, res) => {
  const timeoutHandle = setTimeout(() => {
    console.warn('⚠️ [DecisionSummary] Request timed out, sending empty response');
    if (!res.headersSent) {
      res.json({
        success: true,
        data: {
          dateRange: { startDate: '', endDate: '' },
          totals: { ads: 0, statusCounts: {} },
          rows: [],
        },
      });
    }
  }, DECISION_TIMEOUT_MS);

  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId, limit = 5 } = req.query;
    const prisma = getSharedPrismaClient();
    const dateRange = normalizeReportDateRange(startDate, endDate);
    const normalizedLimit = Math.min(10, Math.max(1, Number(limit) || 5));
    const accountReference = String(adAccountId || "").trim();
    const normalizedAccountReference = accountReference.replace(/^act_/i, "");

    const ads = await prisma.facebookAd.findMany({
      where: {
        companyId,
        facebookAdset: {
          facebookCampaign: {
            companyId,
            ...(accountReference
              ? {
                  facebookAdAccount: {
                    is: {
                      OR: [
                        { id: accountReference },
                        { accountId: accountReference },
                        { accountId: normalizedAccountReference },
                        { accountId: `act_${normalizedAccountReference}` },
                      ],
                    },
                  },
                }
              : {}),
          },
        },
      },
      include: {
        facebookAdset: {
          include: {
            facebookCampaign: {
              include: { facebookAdAccount: true },
            },
          },
        },
        facebookAdInsights: {
          where: {
            date: {
              gte: dateRange.rangeStart,
              lte: dateRange.rangeEnd,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: normalizedLimit,
    });

    const adProductIds = ads.map((a) => a.productId).filter(Boolean);
    const adProductSlugs = ads.map((a) => parseJsonObject(a.settings)?.linkUrl || a.linkUrl).filter(Boolean);
    const allSlugs = [...new Set(adProductSlugs.map((url) => {
      try { return new URL(url).pathname.split("/").filter(Boolean).findLast(() => true) || ""; } catch { return ""; }
    }).filter(Boolean))];
    const allProductIds = [...new Set([...adProductIds, ...allSlugs])];
    const allProducts = allProductIds.length > 0 && typeof prisma?.product?.findMany === "function" ? await prisma.product.findMany({
      where: { companyId, OR: [{ id: { in: allProductIds } }, { slug: { in: allProductIds } }] },
      include: { productVariants: { select: { cost: true, price: true } } },
    }) : [];
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    allProducts.forEach((p) => { if (p.slug) productMap.set(p.slug, p); });

    const allOrders = await prisma.order.findMany({
      where: {
        companyId,
        createdAt: {
          gte: dateRange.rangeStart,
          lte: dateRange.rangeEnd,
        },
        status: { notIn: ["DRAFT", "TRASH"] },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        shipping: true,
        metadata: true,
        createdAt: true,
        orderItems: {
          include: {
            product: {
              select: { id: true, name: true, price: true, cost: true },
            },
            productVariant: {
              select: { id: true, price: true, cost: true },
            },
          },
        },
      },
    });

    const rows = await Promise.all(
      ads.map(async (ad) => {
        const summary = aggregatePersistedInsights(ad.facebookAdInsights || []);
        const decision = await facebookAdsDecisionService.buildAdDecisionForAd({
          prisma,
          companyId,
          ad,
          summary,
          campaignSummary: summary,
          dateRange,
          preFetchedOrders: allOrders,
          preFetchedProductMap: productMap,
        });

        return {
          ad: buildAdClientPayload(ad),
          adSet: buildAdSetClientPayload({
            ...ad.facebookAdset,
            facebookAds: [],
          }),
          campaign: buildCampaignClientPayload(ad.facebookAdset.facebookCampaign),
          summary,
          decision,
        };
      }),
    );

    const statusCounts = rows.reduce((accumulator, row) => {
      const status = row.decision?.status || "UNKNOWN";
      accumulator[status] = (accumulator[status] || 0) + 1;
      return accumulator;
    }, {});

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    rows.sort((left, right) => {
      const priorityDelta =
        (priorityOrder[left.decision?.priority] ?? 3) -
        (priorityOrder[right.decision?.priority] ?? 3);
      if (priorityDelta !== 0) return priorityDelta;
      return (right.summary?.spend || 0) - (left.summary?.spend || 0);
    });

    clearTimeout(timeoutHandle);
    res.json({
      success: true,
      data: {
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        totals: {
          ads: rows.length,
          statusCounts,
        },
        rows,
      },
    });
  } catch (error) {
    clearTimeout(timeoutHandle);
    console.error("❌ Error getting Ads decision summary:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ads/:adId/performance-breakdown
 * جلب breakdowns تفصيلية لإعلان فردي من Meta
 */
const getAdPerformanceBreakdown = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.query;
    const breakdown = normalizePerformanceBreakdown(req.query.breakdown);
    const breakdownMap = {
      age_gender: ["age", "gender"],
      placement: ["publisher_platform", "platform_position"],
      platform: ["publisher_platform"],
      device: ["device_platform"],
      country: ["country"],
      region: ["region"],
    };
    const companyId = req.user?.companyId;
    const prisma = getSharedPrismaClient();
    const dateRange = normalizeReportDateRange(startDate, endDate);

    const ad = await prisma.facebookAd.findFirst({
      where: { id: adId, companyId },
      include: {
        facebookAdset: {
          include: { facebookCampaign: true },
        },
      },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    if (!ad.facebookAdId) {
      return res.json({
        success: true,
        data: {
          dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          },
          breakdown,
          dimensions: breakdownMap[breakdown],
          rows: [],
          totals: withDerivedPerformance(createEmptyPerformanceTotals()),
          recommendations: buildAdBreakdownRecommendations([], breakdown),
          meta: {
            source: "LOCAL",
            rawRows: 0,
            reason: "Ad is not synced with Meta",
          },
        },
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const result = await adsService.getInsights(
      ad.facebookAdId,
      { since: dateRange.startDate, until: dateRange.endDate },
      breakdownMap[breakdown],
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    const totals = createEmptyPerformanceTotals();
    const rowMap = new Map();

    (result.data || []).forEach((insight) => {
      const key = getPerformanceBreakdownKey(insight, breakdown);
      const label = getPerformanceBreakdownLabel(insight, breakdown);
      const metrics = buildInsightPersistenceData(insight);

      addInsightToTotals(totals, metrics);

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          breakdown,
          key,
          label,
          totals: createEmptyPerformanceTotals(),
        });
      }

      addInsightToTotals(rowMap.get(key).totals, metrics);
    });

    const rows = Array.from(rowMap.values())
      .map((row) => ({
        breakdown: row.breakdown,
        key: row.key,
        label: row.label,
        metrics: withDerivedPerformance(row.totals),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    res.json({
      success: true,
      data: {
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        breakdown,
        dimensions: breakdownMap[breakdown],
        rows,
        totals: withDerivedPerformance(totals),
        recommendations: buildAdBreakdownRecommendations(rows, breakdown),
        meta: {
          source: "META",
          rawRows: result.data?.length || 0,
          facebookAdId: ad.facebookAdId,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Ad performance breakdown:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/ads/:adId/sync-insights
 * مزامنة إحصائيات إعلان من Facebook
 */
const syncAdInsights = async (req, res) => {
  try {
    const { adId } = req.params;
    const { startDate, endDate } = req.body;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id: adId, companyId },
    });

    if (!ad || !ad.facebookAdId) {
      return res.status(404).json({
        success: false,
        error: "Ad not found or not synced with Facebook",
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Facebook Access Token not found",
      });
    }

    const adsService = new FacebookAdsService(accessToken);
    const dateRange =
      startDate && endDate ? { since: startDate, until: endDate } : null;

    const result = await adsService.getInsights(ad.facebookAdId, dateRange);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // حفظ الإحصائيات في قاعدة البيانات
    const savedInsights = [];
    for (const insight of result.data) {
      const persistenceData = buildInsightPersistenceData(insight);
      const saved = await getSharedPrismaClient().facebookAdInsight.upsert({
        where: {
          adId_date: {
            adId,
            date: new Date(insight.date_start || new Date()),
          },
        },
        update: persistenceData,
        create: {
          adId,
          date: new Date(insight.date_start || new Date()),
          ...persistenceData,
        },
      });
      savedInsights.push(saved);
    }

    // تحديث lastSyncAt
    await getSharedPrismaClient().facebookAd.update({
      where: { id: adId },
      data: { lastSyncAt: new Date() },
    });

    res.json({
      success: true,
      data: savedInsights,
      message: `Synced ${savedInsights.length} insights`,
    });
  } catch (error) {
    console.error("❌ Error syncing Ad insights:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/campaigns/:campaignId/insights
 * جلب إحصائيات حملة (مجمعة)
 */
const getCampaignInsights = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user?.companyId;
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;

    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: campaignId, companyId },
      include: {
        facebookAdAccount: true,
        facebookAdsets: {
          include: {
            facebookAds: {
              include: {
                facebookAdInsights: {
                  where: {
                    date: {
                      gte: rangeStart,
                      lte: rangeEnd,
                    },
                  },
                  take: 30,
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: "Campaign not found",
      });
    }

    // تجميع الإحصائيات
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalReach = 0;
    let totalConversions = 0;
    let totalPurchases = 0;
    let totalPurchaseValue = 0;

    campaign.facebookAdsets.forEach((adSet) => {
      adSet.facebookAds.forEach((ad) => {
        ad.facebookAdInsights.forEach((insight) => {
          totalImpressions += insight.impressions;
          totalClicks += insight.clicks;
          totalSpend += insight.spend;
          totalReach += insight.reach;
          totalConversions += insight.conversions;
          totalPurchases += insight.purchases;
          totalPurchaseValue += insight.purchaseValue;
        });
      });
    });

    const aggregatedInsights = {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      reach: totalReach,
      conversions: totalConversions,
      purchases: totalPurchases,
      purchaseValue: totalPurchaseValue,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      roas: totalSpend > 0 ? totalPurchaseValue / totalSpend : 0,
    };
    let performanceSource = "LOCAL";

    if (campaign.facebookCampaignId) {
      try {
        const accessToken = await getCompanyAdsAccessToken(companyId);
        if (accessToken) {
          const adsService = new FacebookAdsService(
            accessToken,
            campaign.facebookAdAccount?.accountId,
          );
          const metaResult = await adsService.getCampaignInsights(
            campaign.facebookCampaignId,
            {
              since: rangeStart.toISOString().slice(0, 10),
              until: rangeEnd.toISOString().slice(0, 10),
            },
          );

          if (metaResult.success && (metaResult.data || []).length > 0) {
            const metaTotals = createEmptyPerformanceTotals();
            for (const insight of metaResult.data || []) {
              addMetaInsightToTotals(metaTotals, insight);
            }
            Object.assign(aggregatedInsights, withDerivedPerformance(metaTotals));
            performanceSource = "META";
          }
        }
      } catch (metaError) {
        console.warn(
          "⚠️ Falling back to local campaign detail insights:",
          metaError.message,
        );
      }
    }

    res.json({
      success: true,
      data: aggregatedInsights,
      performanceSource,
      dateRange: {
        startDate: rangeStart.toISOString().slice(0, 10),
        endDate: rangeEnd.toISOString().slice(0, 10),
      },
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        facebookCampaignId: campaign.facebookCampaignId,
        metaAccountId: campaign.facebookAdAccount?.accountId || null,
        adSetsCount: campaign.facebookAdsets.length,
        adsCount: campaign.facebookAdsets.reduce(
          (sum, adSet) => sum + adSet.facebookAds.length,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("❌ Error getting campaign insights:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/performance-summary
 * ملخص أداء محلي للحملات مع توصيات تحسين عملية
 */
const PERFORMANCE_TIMEOUT_MS = 15000;

const getPerformanceSummary = async (req, res) => {
  const timeoutHandle = setTimeout(() => {
    console.warn('⚠️ [PerformanceSummary] Request timed out, sending empty response');
    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        data: {
          dateRange: { startDate: '', endDate: '' },
          adAccount: null,
          totals: withDerivedPerformance(createEmptyPerformanceTotals()),
          campaigns: [],
          recommendations: [],
        },
      });
    }
  }, PERFORMANCE_TIMEOUT_MS);

  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId } = req.query;
    const prisma = getSharedPrismaClient();
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;
    rangeEnd.setHours(23, 59, 59, 999);
    const metaDateRange = {
      since: rangeStart.toISOString().slice(0, 10),
      until: rangeEnd.toISOString().slice(0, 10),
    };

    const adAccountScope = await getAdAccountReadScope(companyId, adAccountId);
    if (!adAccountScope) {
      const emptySummary = withDerivedPerformance(createEmptyPerformanceTotals());
      clearTimeout(timeoutHandle);

      return res.json({
        success: true,
        data: {
          dateRange: {
            startDate: rangeStart.toISOString().slice(0, 10),
            endDate: rangeEnd.toISOString().slice(0, 10),
          },
          adAccount: null,
          totals: emptySummary,
          campaigns: [],
          recommendations: buildPerformanceRecommendations(emptySummary, []),
        },
      });
    }

    const perfCacheKey = `${companyId}:${adAccountScope.id}:${metaDateRange.since}:${metaDateRange.until}`;
    if (process.env.NODE_ENV !== "test" && req.query?.refresh !== "true") {
      const cached = performanceSummaryMemoryCache.get(perfCacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        clearTimeout(timeoutHandle);
        return res.json({
          success: true,
          data: cached.data,
          meta: { cached: true },
        });
      }
    }

    const campaigns = await prisma.facebookCampaign.findMany({
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
                  where: {
                    date: {
                      gte: rangeStart,
                      lte: rangeEnd,
                    },
                  },
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const metaInsightsByCampaignId = new Map();
    try {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        if (adAccountScope.accountId) {
          const adsService = new FacebookAdsService(
            accessToken,
            adAccountScope.accountId,
          );
          const insightsResult = await adsService.getCampaignInsightsSummary(
            adAccountScope.accountId,
            metaDateRange,
          );

          if (insightsResult.success) {
            for (const insight of insightsResult.data || []) {
              if (!insight.campaign_id) continue;
              const existingRows =
                metaInsightsByCampaignId.get(insight.campaign_id) || [];
              metaInsightsByCampaignId.set(insight.campaign_id, [
                ...existingRows,
                insight,
              ]);
            }
          } else {
            console.warn(
              "⚠️ Could not load Meta campaign insights for summary:",
              insightsResult.error,
            );
          }
        }
      }
    } catch (metaError) {
      console.warn(
        "⚠️ Falling back to local Facebook Ads insights summary:",
        metaError.message,
      );
    }

    const totals = createEmptyPerformanceTotals();
    const campaignSummaries = campaigns.map((campaign) => {
      const campaignSettings = parseJsonObject(campaign.settings);
      const campaignMeta = campaignSettings.meta || {};
      const campaignTotals = createEmptyPerformanceTotals();
      let adsCount = 0;
      let performanceSource = "LOCAL";
      const metaInsights = campaign.facebookCampaignId
        ? metaInsightsByCampaignId.get(campaign.facebookCampaignId) || []
        : [];

      if (metaInsights.length > 0) {
        performanceSource = "META";
        metaInsights.forEach((insight) => {
          addMetaInsightToTotals(campaignTotals, insight);
          addMetaInsightToTotals(totals, insight);
        });
      } else {
        campaign.facebookAdsets.forEach((adSet) => {
          adsCount += adSet.facebookAds.length;
          adSet.facebookAds.forEach((ad) => {
            ad.facebookAdInsights.forEach((insight) => {
              addInsightToTotals(campaignTotals, insight);
              addInsightToTotals(totals, insight);
            });
          });
        });
      }

      if (metaInsights.length > 0) {
        campaign.facebookAdsets.forEach((adSet) => {
          adsCount += adSet.facebookAds.length;
        });
      }

      return {
        id: campaign.id,
        facebookCampaignId: campaign.facebookCampaignId,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        configuredStatus: campaignMeta.configuredStatus || campaign.status,
        effectiveStatus:
          campaignMeta.effectiveStatus ||
          campaignMeta.configuredStatus ||
          campaign.status,
        metaAccountId: campaignMeta.accountId || adAccountScope.accountId,
        pixelId: campaign.pixelId,
        adSetsCount: campaign.facebookAdsets.length,
        adsCount,
        performanceSource,
        performance: withDerivedPerformance(campaignTotals),
      };
    });

    const summary = withDerivedPerformance(totals);
    const responsePayload = {
      dateRange: {
        startDate: rangeStart.toISOString().slice(0, 10),
        endDate: rangeEnd.toISOString().slice(0, 10),
      },
      adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
      totals: summary,
      campaigns: campaignSummaries,
      recommendations: buildPerformanceRecommendations(
        summary,
        campaignSummaries,
      ),
    };

    performanceSummaryMemoryCache.set(perfCacheKey, {
      data: responsePayload,
      expiresAt: Date.now() + PERFORMANCE_CACHE_TTL_MS,
    });

    clearTimeout(timeoutHandle);
    res.json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    clearTimeout(timeoutHandle);
    console.error("❌ Error getting Facebook Ads performance summary:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/geo-performance
 * أداء الحساب المختار حسب الدولة أو المحافظة من Meta Insights
 */
const getGeoPerformanceBreakdown = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId } = req.query;
    const breakdown = normalizeGeoPerformanceBreakdown(req.query.breakdown);
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;
    rangeEnd.setHours(23, 59, 59, 999);
    const dateRange = {
      startDate: rangeStart.toISOString().slice(0, 10),
      endDate: rangeEnd.toISOString().slice(0, 10),
    };
    const metaDateRange = {
      since: dateRange.startDate,
      until: dateRange.endDate,
    };

    const adAccountScope = await getAdAccountReadScope(companyId, adAccountId);
    if (!adAccountScope) {
      const emptySummary = withDerivedPerformance(createEmptyPerformanceTotals());

      return res.json({
        success: true,
        data: {
          dateRange,
          adAccount: null,
          breakdown,
          rows: [],
          totals: emptySummary,
          recommendations: buildGeoPerformanceRecommendations([]),
          meta: {
            source: "META",
            rawRows: 0,
          },
        },
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account first.",
      });
    }

    const adsService = new FacebookAdsService(
      accessToken,
      adAccountScope.accountId,
    );
    const insightsResult = await adsService.getGeoPerformanceBreakdown(
      adAccountScope.accountId,
      metaDateRange,
      breakdown,
    );

    if (!insightsResult.success) {
      return res.status(502).json({
        success: false,
        error: insightsResult.error,
      });
    }

    const totals = createEmptyPerformanceTotals();
    const buckets = new Map();

    for (const insight of insightsResult.data || []) {
      const label = getGeoPerformanceLabel(insight, breakdown);
      const key = `${breakdown}:${label}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label,
          totals: createEmptyPerformanceTotals(),
          campaignIds: new Set(),
          campaignNames: new Set(),
        });
      }

      const bucket = buckets.get(key);
      addMetaInsightToTotals(bucket.totals, insight);
      addMetaInsightToTotals(totals, insight);

      if (insight.campaign_id) {
        bucket.campaignIds.add(insight.campaign_id);
      }

      if (insight.campaign_name) {
        bucket.campaignNames.add(insight.campaign_name);
      }
    }

    const rows = Array.from(buckets.values())
      .map((bucket) => ({
        breakdown,
        key: bucket.key,
        label: bucket.label,
        metrics: withDerivedPerformance(bucket.totals),
        campaignsCount: bucket.campaignIds.size,
        campaigns: Array.from(bucket.campaignNames).slice(0, 5),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    const summary = withDerivedPerformance(totals);

    res.json({
      success: true,
      data: {
        dateRange,
        adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
        breakdown,
        rows,
        totals: summary,
        recommendations: buildGeoPerformanceRecommendations(rows),
        meta: {
          source: "META",
          rawRows: (insightsResult.data || []).length,
          adAccountId: adAccountScope.accountId,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Facebook Ads geo performance:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/facebook-ads/reports/performance-breakdown
 * تقرير شرائح قرار: العمر/الجنس، المواضع، المنصة، الجهاز، الدولة، المحافظة
 */
const getPerformanceBreakdownReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, adAccountId } = req.query;
    const breakdown = normalizePerformanceBreakdown(req.query.breakdown);
    const today = new Date();
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const rangeStart = startDate ? new Date(startDate) : defaultStartDate;
    const rangeEnd = endDate ? new Date(endDate) : today;
    rangeEnd.setHours(23, 59, 59, 999);
    const dateRange = {
      startDate: rangeStart.toISOString().slice(0, 10),
      endDate: rangeEnd.toISOString().slice(0, 10),
    };
    const metaDateRange = {
      since: dateRange.startDate,
      until: dateRange.endDate,
    };

    const adAccountScope = await getAdAccountReadScope(companyId, adAccountId);
    if (!adAccountScope) {
      const emptySummary = withDerivedPerformance(createEmptyPerformanceTotals());

      return res.json({
        success: true,
        data: {
          dateRange,
          adAccount: null,
          breakdown,
          rows: [],
          campaigns: [],
          totals: emptySummary,
          recommendations: buildPerformanceBreakdownRecommendations(
            [],
            [],
            breakdown,
          ),
          meta: {
            source: "META",
            rawRows: 0,
          },
        },
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error:
          "Facebook Ads Access Token not found. Please connect your Facebook account first.",
      });
    }

    const adsService = new FacebookAdsService(
      accessToken,
      adAccountScope.accountId,
    );
    const insightsResult = await adsService.getPerformanceBreakdown(
      adAccountScope.accountId,
      metaDateRange,
      breakdown,
    );

    if (!insightsResult.success) {
      return res.status(502).json({
        success: false,
        error: insightsResult.error,
      });
    }

    const totals = createEmptyPerformanceTotals();
    const rowBuckets = new Map();
    const campaignBuckets = new Map();

    for (const insight of insightsResult.data || []) {
      const rowKey = getPerformanceBreakdownKey(insight, breakdown);
      const label = getPerformanceBreakdownLabel(insight, breakdown);

      if (!rowBuckets.has(rowKey)) {
        rowBuckets.set(rowKey, {
          key: rowKey,
          label,
          totals: createEmptyPerformanceTotals(),
          campaignIds: new Set(),
          campaignNames: new Set(),
        });
      }

      const rowBucket = rowBuckets.get(rowKey);
      addMetaInsightToTotals(rowBucket.totals, insight);
      addMetaInsightToTotals(totals, insight);

      const campaignId =
        insight.campaign_id || `unknown:${insight.campaign_name || "unknown"}`;
      const campaignName = insight.campaign_name || "حملة غير محددة";

      rowBucket.campaignIds.add(campaignId);
      rowBucket.campaignNames.add(campaignName);

      if (!campaignBuckets.has(campaignId)) {
        campaignBuckets.set(campaignId, {
          campaignId,
          campaignName,
          totals: createEmptyPerformanceTotals(),
          rows: new Map(),
        });
      }

      const campaignBucket = campaignBuckets.get(campaignId);
      addMetaInsightToTotals(campaignBucket.totals, insight);

      if (!campaignBucket.rows.has(rowKey)) {
        campaignBucket.rows.set(rowKey, {
          key: rowKey,
          label,
          totals: createEmptyPerformanceTotals(),
        });
      }
      addMetaInsightToTotals(campaignBucket.rows.get(rowKey).totals, insight);
    }

    const rows = Array.from(rowBuckets.values())
      .map((bucket) => ({
        breakdown,
        key: bucket.key,
        label: bucket.label,
        metrics: withDerivedPerformance(bucket.totals),
        campaignsCount: bucket.campaignIds.size,
        campaigns: Array.from(bucket.campaignNames).slice(0, 5),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    const campaigns = Array.from(campaignBuckets.values())
      .map((bucket) => ({
        campaignId: bucket.campaignId,
        campaignName: bucket.campaignName,
        metrics: withDerivedPerformance(bucket.totals),
        rows: Array.from(bucket.rows.values())
          .map((row) => ({
            breakdown,
            key: row.key,
            label: row.label,
            metrics: withDerivedPerformance(row.totals),
          }))
          .sort((a, b) => b.metrics.spend - a.metrics.spend),
      }))
      .sort((a, b) => b.metrics.spend - a.metrics.spend);

    const summary = withDerivedPerformance(totals);

    res.json({
      success: true,
      data: {
        dateRange,
        adAccount: sanitizeFacebookAdAccountForClient(adAccountScope),
        breakdown,
        dimensions: insightsResult.dimensions || [],
        rows,
        campaigns,
        totals: summary,
        recommendations: buildPerformanceBreakdownRecommendations(
          rows,
          campaigns,
          breakdown,
        ),
        meta: {
          source: "META",
          rawRows: (insightsResult.data || []).length,
          adAccountId: adAccountScope.accountId,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting Facebook Ads performance breakdown:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * Sync Endpoints
 * ============================================
 */

/**
 * POST /api/v1/facebook-ads/sync
 * مزامنة جميع الحملات من Facebook
 */

const createAsyncReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const data = req.body;
    const requestedAdAccountId = data?.adAccountId || req.query?.adAccountId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const result = await adsService.createAsyncReport(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAsyncReportStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { reportRunId } = req.params;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getAsyncReportStatus(reportRunId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAsyncReportResults = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { reportRunId } = req.params;
    const requestedAdAccountId = req.query?.adAccountId || req.body?.adAccountId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken)
      return res
        .status(400)
        .json({ success: false, error: "Access Token not found" });
    const adAccount = await getOrCreateAdAccount(
      companyId,
      accessToken,
      requestedAdAccountId,
    );
    if (!adAccount)
      return res
        .status(404)
        .json({ success: false, error: "Ad Account not found" });
    const adsService = new FacebookAdsService(
      accessToken,
      adAccount?.accountId,
    );
    const result = await adsService.getAsyncReportResults(reportRunId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Creative Formats

// Inline exported methods converted to const
const getAdRecommendations = async (req, res) => {
    try {
      const { adId } = req.params;
      const companyId = req.user?.companyId;

      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.getAdRecommendations(adId);

      res.json(result);
    } catch (error) {
      console.error("Error getting Ad Recommendations:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
};

const applyAdRecommendation = async (req, res) => {
    try {
      const { adId } = req.params;
      const { recommendationId } = req.body;
      const companyId = req.user?.companyId;

      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.applyAdRecommendation(
        adId,
        recommendationId,
      );

      res.json(result);
    } catch (error) {
      console.error("Error applying Ad Recommendation:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
};

const getAdQualityMetrics = async (req, res) => {
    try {
      const { adId } = req.params;
      const companyId = req.user?.companyId;

      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "Facebook Ads Access Token not found.",
        });
      }

      const adAccount =
        await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        });

      if (!adAccount) {
        return res.status(404).json({
          success: false,
          error: "No active Facebook Ad Account found.",
        });
      }

      const adsService = new FacebookAdsService(
        accessToken,
        adAccount.accountId,
      );
      const result = await adsService.getAdQualityMetrics(adId);

      res.json(result);
    } catch (error) {
      console.error("Error getting Ad Quality Metrics:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
};

module.exports = {
  getAdInsights,
  getAdDetails,
  getDecisionSummary,
  getAdPerformanceBreakdown,
  syncAdInsights,
  getCampaignInsights,
  getPerformanceSummary,
  getGeoPerformanceBreakdown,
  getPerformanceBreakdownReport,
  createAsyncReport,
  getAsyncReportStatus,
  getAsyncReportResults,
  getAdRecommendations,
  applyAdRecommendation,
  getAdQualityMetrics,
};
