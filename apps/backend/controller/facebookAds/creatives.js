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


const getAds = async (req, res) => {
  try {
    const { adSetId } = req.params;
    const companyId = req.user?.companyId;

    // التحقق من أن AdSet تخص الشركة
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id: adSetId },
      include: { facebookCampaign: true },
    });

    if (!adSet || adSet.facebookCampaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: "AdSet not found",
      });
    }

    const ads = await getSharedPrismaClient().facebookAd.findMany({
      where: { adSetId },
      include: {
        facebookAdInsights: {
          take: 7,
          orderBy: { date: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: ads,
      count: ads.length,
    });
  } catch (error) {
    console.error("❌ Error getting Ads:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/facebook-ads/adsets/:adSetId/ads
 * إنشاء إعلان جديد
 */
const createAd = async (req, res) => {
  try {
    const { adSetId } = req.params;
    const companyId = req.user?.companyId;
    const {
      name,
      status = "PAUSED",
      creativeType = "SINGLE_IMAGE",
      pageId,
      primaryText,
      headline,
      description,
      callToAction,
      imageUrl,
      imageHash: providedImageHash,
      videoUrl,
      videoId,
      linkUrl,
      displayLink,
      urlParameters,
      carouselCards,
      advantageCreative,
      textGeneration,
      imageEnhancement,
      musicEnhancement,
      imageTemplates,
      videoHighlight,
      textOptimizations,
      productId,
    } = req.body;
    const normalizedCreativeType = normalizeFullAdCreativeType(creativeType);

    const finalPrimaryText =
      primaryText ||
      (Array.isArray(req.body.primaryTexts)
        ? req.body.primaryTexts.find((t) => typeof t === "string" && t.trim())
        : null);
    const finalHeadline =
      headline ||
      (Array.isArray(req.body.headlines)
        ? req.body.headlines.find((h) => typeof h === "string" && h.trim())
        : null);
    const finalDescription =
      description ||
      (Array.isArray(req.body.descriptions)
        ? req.body.descriptions.find((d) => typeof d === "string" && d.trim())
        : null);

    // التحقق من البيانات المطلوبة
    if (!name || !finalPrimaryText) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, primaryText",
      });
    }
    if (!pageId) {
      return res.status(400).json({
        success: false,
        error: "Facebook Page ID is required",
      });
    }
    if (!linkUrl) {
      return res.status(400).json({
        success: false,
        error: "Destination URL is required",
      });
    }

    const creativeValidationError = validateFullAdCreativePayload(
      {
        ...req.body,
        creativeType: normalizedCreativeType,
        imageHash: providedImageHash,
      },
      normalizedCreativeType,
    );
    if (creativeValidationError) {
      return res.status(400).json({
        success: false,
        error: creativeValidationError,
      });
    }

    // التحقق من AdSet
    const adSet = await getSharedPrismaClient().facebookAdset.findFirst({
      where: { id: adSetId },
      include: {
        facebookCampaign: {
          include: { facebookAdAccount: true },
        },
      },
    });

    if (!adSet || adSet.facebookCampaign.companyId !== companyId) {
      return res.status(404).json({
        success: false,
        error: "AdSet not found",
      });
    }

    // جلب Access Token
    const accessToken = await getCompanyAdsAccessToken(companyId);

    let facebookAdId = null;
    let creativeId = null;
    let imageHash = providedImageHash || null;
    let finalVideoId = videoId || null;
    let preparedCarouselCards = Array.isArray(carouselCards)
      ? carouselCards.map((card) => ({ ...card }))
      : [];

    // إنشاء الإعلان في Facebook إذا كان هناك Access Token و AdSet ID
    if (accessToken && adSet.facebookAdSetId) {
      const adAccount =
        adSet.facebookCampaign.facebookAdAccount ||
        (await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { companyId, isActive: true },
        }));

      if (adAccount) {
        const adsService = new FacebookAdsService(
          accessToken,
          adAccount.accountId,
        );

        // رفع الصورة إذا كانت موجودة
        if (
          imageUrl &&
          normalizedCreativeType === "SINGLE_IMAGE" &&
          !imageHash
        ) {
          const uploadResult = await adsService.uploadImage(imageUrl);
          if (uploadResult.success) {
            imageHash = uploadResult.hash;
          } else {
            return res.status(400).json({
              success: false,
              step: "imageUpload",
              error: uploadResult.error,
            });
          }
        }

        if (
          videoUrl &&
          normalizedCreativeType === "SINGLE_VIDEO" &&
          !finalVideoId
        ) {
          const uploadResult = await adsService.uploadVideo(videoUrl, {
            name,
            description,
          });
          if (uploadResult.success) {
            finalVideoId = uploadResult.videoId;
          } else {
            return res.status(400).json({
              success: false,
              step: "videoUpload",
              error: uploadResult.error,
            });
          }
        }

        if (normalizedCreativeType === "CAROUSEL") {
          preparedCarouselCards = [];

          for (const [index, card] of (carouselCards || []).entries()) {
            let cardImageHash = card.imageHash || null;

            if (!cardImageHash && card.imageUrl) {
              const uploadResult = await adsService.uploadImage(card.imageUrl);
              if (!uploadResult.success) {
                return res.status(400).json({
                  success: false,
                  step: "carouselImageUpload",
                  error: uploadResult.error,
                  cardIndex: index + 1,
                });
              }

              cardImageHash = uploadResult.hash;
            }

            preparedCarouselCards.push({
              ...card,
              imageHash: cardImageHash,
              linkUrl: card.linkUrl || linkUrl,
            });
          }
        }

        // إنشاء الإعلان في Facebook
        const facebookResult = await adsService.createAd(
          adSet.facebookAdSetId,
          {
            name,
            status,
            pageId,
            creativeType: normalizedCreativeType,
            primaryText: finalPrimaryText,
            headline: finalHeadline,
            description: finalDescription,
            callToAction,
            imageHash,
            videoId: finalVideoId,
            linkUrl,
            displayLink,
            urlParameters,
            carouselCards: preparedCarouselCards,
            advantageCreative,
            textGeneration,
            imageEnhancement,
            musicEnhancement,
            imageTemplates,
            videoHighlight,
            textOptimizations,
          },
        );

        if (facebookResult.success) {
          facebookAdId = facebookResult.adId;
          creativeId = facebookResult.creativeId || null;
        } else {
          return res.status(400).json({
            success: false,
            step: "ad",
            error: facebookResult.error,
          });
        }
      }
    }

    const storedCreative = getPersistedCreativePayload(
      {
        ...req.body,
        pageId,
        creativeType: normalizedCreativeType,
        primaryText: finalPrimaryText,
        headline: finalHeadline,
        description: finalDescription,
        imageHash,
        videoId: finalVideoId,
        carouselCards: preparedCarouselCards,
      },
      {
        creativeId,
        imageHash,
        videoId: finalVideoId,
        carouselCards: preparedCarouselCards,
      },
      normalizedCreativeType,
    );

    // حفظ الإعلان في قاعدة البيانات
    const ad = await getSharedPrismaClient().facebookAd.create({
      data: {
        adSetId,
        companyId,
        name,
        status,
        facebookAdId,
        creativeType: normalizedCreativeType,
        primaryText: finalPrimaryText,
        headline: finalHeadline,
        description: finalDescription,
        callToAction,
        imageUrl,
        videoUrl,
        imageHash,
        videoId: finalVideoId,
        carouselImages:
          normalizedCreativeType === "CAROUSEL"
            ? JSON.stringify(preparedCarouselCards)
            : null,
        carouselCount:
          normalizedCreativeType === "CAROUSEL"
            ? preparedCarouselCards.length
            : 1,
        linkUrl,
        productId,
        creative: JSON.stringify(storedCreative),
      },
    });

    res.json({
      success: true,
      data: ad,
      message: "Ad created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating Ad:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PUT /api/v1/facebook-ads/ads/:id
 * تحديث إعلان
 */
const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    const updateData = req.body;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id, companyId },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    // تحديث في Meta إذا كان موجود
    if (ad.facebookAdId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const adsService = new FacebookAdsService(accessToken);
        const metaPayload = {};
        if (updateData.status) metaPayload.status = updateData.status;
        if (updateData.name) metaPayload.name = updateData.name;
        if (Object.keys(metaPayload).length > 0) {
          const result = await adsService.updateAd(ad.facebookAdId, metaPayload);
          if (!result.success) {
            console.warn("⚠️ Warning updating Meta ad:", result.error);
          }
        }
      }
    }

    // تحديث في قاعدة البيانات
    const updated = await getSharedPrismaClient().facebookAd.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: "Ad updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating Ad:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/facebook-ads/ads/:id
 * حذف إعلان
 */
const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    const ad = await getSharedPrismaClient().facebookAd.findFirst({
      where: { id, companyId },
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        error: "Ad not found",
      });
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookAd.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Ad deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting Ad:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ============================================
 * Insights Endpoints
 * ============================================
 */

/**
 * GET /api/v1/facebook-ads/ads/:adId/insights
 * جلب إحصائيات إعلان
 */

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "لم يتم رفع أي ملف",
      });
    }

    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Access Token غير موجود",
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
        error: "Ad Account غير موجود",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const uploadResult = await adsService.uploadImageBuffer(req.file.buffer, {
      filename: req.file.originalname || "image.jpg",
      contentType: req.file.mimetype || "image/jpeg",
    });

    if (!uploadResult.success || !uploadResult.hash) {
      throw new Error(uploadResult.error || "فشل في الحصول على Image Hash");
    }

    res.json({
      success: true,
      hash: uploadResult.hash,
      data: uploadResult.data,
    });
  } catch (error) {
    console.error("❌ Error uploading image:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "فشل في رفع الصورة",
    });
  }
};

/**
 * POST /api/v1/facebook-ads/upload-video
 * رفع فيديو إلى Facebook
 */
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "لم يتم رفع أي ملف",
      });
    }

    const { name } = req.body;
    const companyId = req.user?.companyId;
    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: "Access Token غير موجود",
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
        error: "Ad Account غير موجود",
      });
    }

    const adsService = new FacebookAdsService(accessToken, adAccount.accountId);
    const uploadResult = await adsService.uploadVideoBuffer(req.file.buffer, {
      name: name || "Video Ad",
      filename: req.file.originalname || "video.mp4",
      contentType: req.file.mimetype || "video/mp4",
    });

    if (!uploadResult.success || !uploadResult.videoId) {
      throw new Error(uploadResult.error || "فشل في الحصول على Video ID");
    }

    res.json({
      success: true,
      videoId: uploadResult.videoId,
      data: uploadResult.data,
    });
  } catch (error) {
    console.error("❌ Error uploading video:", error);
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.error?.message ||
        error.message ||
        "فشل في رفع الفيديو",
    });
  }
};

/**
 * GET /api/v1/facebook-ads/ad-library/search
 * بحث في Meta Ads Archive / Ad Library
 */

const createDynamicCreative = async (req, res) => {
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
    const result = await adsService.createDynamicCreative(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Advantage+ Shopping

const createCollectionCreative = async (req, res) => {
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
    const result = await adsService.createCollectionCreative(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createStoriesReelsCreative = async (req, res) => {
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
    const result = await adsService.createStoriesReelsCreative(data);
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createInstantExperience = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { pageId, name, components } = req.body;
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
    const result = await adsService.createInstantExperience(pageId, {
      name,
      components,
    });
    if (!result.success)
      return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Automation Rules

const getAdPreview = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { adId } = req.params;
    const { format } = req.query;
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
    const result = await adsService.getAdPreview(adId, format);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getCreativePreview = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { creativeId } = req.params;
    const { format } = req.query;
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
    const result = await adsService.getCreativePreview(creativeId, format);
    res.json({ success: true, data: result.data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// v22.0: Saved Audiences

// Inline exported methods converted to const
const createInstagramReelsCreative = async (req, res) => {
    try {
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
      const result = await adsService.createInstagramReelsCreative(req.body);

      res.json(result);
    } catch (error) {
      console.error("Error creating Instagram Reels Creative:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
};

const createWhatsAppAd = async (req, res) => {
    try {
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
      const result = await adsService.createWhatsAppAd(req.body);

      res.json(result);
    } catch (error) {
      console.error("Error creating WhatsApp Ad:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
};

module.exports = {
  getAds,
  createAd,
  updateAd,
  deleteAd,
  uploadImage,
  uploadVideo,
  createDynamicCreative,
  createCollectionCreative,
  createStoriesReelsCreative,
  createInstantExperience,
  getAdPreview,
  getCreativePreview,
  createInstagramReelsCreative,
  createWhatsAppAd,
};
