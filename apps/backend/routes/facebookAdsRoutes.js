/**
 * Facebook Ads Routes
 * 
 * Routes للتعامل مع Facebook Ads Management API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const verifyToken = require("../utils/verifyToken");
const facebookAdsController = require('../controller/facebookAdsController');
const facebookAdsBudgetAlertController = require('../controller/facebookAdsBudgetAlertController');
const facebookAudiencesController = require('../controller/facebookAudiencesController');
const facebookCatalogController = require('../controller/facebookCatalogController');
const facebookAdsAiController = require('../controller/facebookAdsAiController');

// Apply authentication middleware to all routes
router.use(verifyToken.authenticateToken);

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    
    if (file.fieldname === 'image' && allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else if (file.fieldname === 'video' && allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'), false);
    }
  }
});

/**
 * ============================================
 * Sync Routes
 * ============================================
 */

// POST /api/v1/facebook-ads/sync - مزامنة الحملات من Facebook
router.post('/sync', facebookAdsController.syncFromFacebook);

/**
 * ============================================
 * 🚀 Full Ad Creation (Campaign + AdSet + Ad)
 * ============================================
 */

// POST /api/v1/facebook-ads/full-ad - إنشاء إعلان كامل (Wizard)
router.post('/full-ad', facebookAdsController.createFullAd);

// GET /api/v1/facebook-ads/product-launch/metadata - قراءة بيانات منتج لإعلان آمن
router.get('/product-launch/metadata', facebookAdsController.getProductLaunchMetadata);

// GET /api/v1/facebook-ads/ad-library/search - بحث في Meta Ad Library / Ads Archive
router.get('/ad-library/search', facebookAdsController.searchAdLibrary);

// POST /api/v1/facebook-ads/bulk/status - تحديث حالة عدة عناصر بأمان
router.post('/bulk/status', facebookAdsController.bulkUpdateStatus);

/**
 * ============================================
 * 🤖 AI Ad Drafts & Multi-Angle Publishing
 * ============================================
 */

// POST /api/v1/facebook-ads/ai/drafts - إنشاء مسودات إعلانية متعددة الزوايا
router.post('/ai/drafts', facebookAdsAiController.createDraftRun);

// GET /api/v1/facebook-ads/ai/drafts - جلب جميع مسودات الذكاء الاصطناعي
router.get('/ai/drafts', facebookAdsAiController.listDraftRuns);

// GET /api/v1/facebook-ads/ai/drafts/:runId - جلب تفاصيل جلسة المسودات وزواياها
router.get('/ai/drafts/:runId', facebookAdsAiController.getDraftRun);

// POST /api/v1/facebook-ads/ai/drafts/:draftId/publish - نشر مسودة محددة بعد اعتماد التاجر
router.post('/ai/drafts/:draftId/publish', facebookAdsAiController.publishDraft);

/**
 * ============================================
 * Budget Alert Routes
 * ============================================
 */

router.get('/budget-alert-rules', facebookAdsBudgetAlertController.listRules);
router.post('/budget-alert-rules', facebookAdsBudgetAlertController.createRule);
router.post('/budget-alert-rules/preview', facebookAdsBudgetAlertController.previewRule);
router.post('/budget-alert-rules/run', facebookAdsBudgetAlertController.runRulesNow);
router.get('/budget-alert-logs', facebookAdsBudgetAlertController.listLogs);
router.put('/budget-alert-rules/:id', facebookAdsBudgetAlertController.updateRule);
router.delete('/budget-alert-rules/:id', facebookAdsBudgetAlertController.deleteRule);
router.post('/budget-alert-rules/:id/test', facebookAdsBudgetAlertController.testRule);

/**
 * ============================================
 * Campaign Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/campaigns - جلب جميع الحملات
router.get('/campaigns', facebookAdsController.getCampaigns);

// POST /api/v1/facebook-ads/campaigns - إنشاء حملة جديدة
router.post('/campaigns', facebookAdsController.createCampaign);

// GET /api/v1/facebook-ads/campaigns/:id - جلب تفاصيل حملة
router.get('/campaigns/:id', facebookAdsController.getCampaign);

// PUT /api/v1/facebook-ads/campaigns/:id - تحديث حملة
router.put('/campaigns/:id', facebookAdsController.updateCampaign);

// DELETE /api/v1/facebook-ads/campaigns/:id - حذف حملة
router.delete('/campaigns/:id', facebookAdsController.deleteCampaign);

// POST /api/v1/facebook-ads/campaigns/:id/pause - إيقاف حملة
router.post('/campaigns/:id/pause', facebookAdsController.pauseCampaign);

// POST /api/v1/facebook-ads/campaigns/:id/resume - استئناف حملة
router.post('/campaigns/:id/resume', facebookAdsController.resumeCampaign);

// GET /api/v1/facebook-ads/campaigns/:campaignId/insights - جلب إحصائيات حملة
router.get('/campaigns/:campaignId/insights', facebookAdsController.getCampaignInsights);

/**
 * ============================================
 * AdSet Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/campaigns/:campaignId/adsets - جلب AdSets في حملة
router.get('/campaigns/:campaignId/adsets', facebookAdsController.getAdSets);

// POST /api/v1/facebook-ads/campaigns/:campaignId/adsets - إنشاء AdSet
router.post('/campaigns/:campaignId/adsets', facebookAdsController.createAdSet);

// DELETE /api/v1/facebook-ads/adsets/:id - حذف AdSet
router.delete('/adsets/:id', facebookAdsController.deleteAdSet);

/**
 * ============================================
 * Ads Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/adsets/:adSetId/ads - جلب الإعلانات في AdSet
router.get('/adsets/:adSetId/ads', facebookAdsController.getAds);

// POST /api/v1/facebook-ads/adsets/:adSetId/ads - إنشاء إعلان جديد
router.post('/adsets/:adSetId/ads', facebookAdsController.createAd);

// POST /api/v1/facebook-ads/ads/whatsapp - إنشاء إعلان WhatsApp Click-to-Message
router.post('/ads/whatsapp', facebookAdsController.createWhatsAppAd);

// PUT /api/v1/facebook-ads/ads/:id - تحديث إعلان
router.put('/ads/:id', facebookAdsController.updateAd);

// DELETE /api/v1/facebook-ads/ads/:id - حذف إعلان
router.delete('/ads/:id', facebookAdsController.deleteAd);

/**
 * ============================================
 * Upload Routes
 * ============================================
 */

// POST /api/v1/facebook-ads/upload-image - رفع صورة
router.post('/upload-image', upload.single('image'), facebookAdsController.uploadImage);

// POST /api/v1/facebook-ads/upload-video - رفع فيديو
router.post('/upload-video', upload.single('video'), facebookAdsController.uploadVideo);

/**
 * ============================================
 * Insights Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/reports/performance-summary - ملخص أداء وتوصيات
router.get('/reports/performance-summary', facebookAdsController.getPerformanceSummary);
// GET /api/v1/facebook-ads/reports/decision-summary - قرارات توسع/إيقاف read-only
router.get('/reports/decision-summary', facebookAdsController.getDecisionSummary);
// GET /api/v1/facebook-ads/reports/geo-performance - أداء جغرافي للحساب المختار
router.get('/reports/geo-performance', facebookAdsController.getGeoPerformanceBreakdown);
// GET /api/v1/facebook-ads/reports/performance-breakdown - شرائح العمر/الجنس والمواضع والمنصات للحساب المختار
router.get('/reports/performance-breakdown', facebookAdsController.getPerformanceBreakdownReport);

// GET /api/v1/facebook-ads/ads/:adId/insights - جلب إحصائيات إعلان
router.get('/ads/:adId/insights', facebookAdsController.getAdInsights);

// GET /api/v1/facebook-ads/ads/:adId/details - تفاصيل وتشخيص إعلان
router.get('/ads/:adId/details', facebookAdsController.getAdDetails);

// GET /api/v1/facebook-ads/ads/:adId/recommendations - توصيات Meta للإعلان
router.get('/ads/:adId/recommendations', facebookAdsController.getAdRecommendations);

// POST /api/v1/facebook-ads/ads/:adId/recommendations/apply - تطبيق توصية Meta
router.post('/ads/:adId/recommendations/apply', facebookAdsController.applyAdRecommendation);

// GET /api/v1/facebook-ads/ads/:adId/quality-metrics - Quality/Relevance metrics
router.get('/ads/:adId/quality-metrics', facebookAdsController.getAdQualityMetrics);

// GET /api/v1/facebook-ads/ads/:adId/performance-breakdown - breakdowns لإعلان فردي
router.get('/ads/:adId/performance-breakdown', facebookAdsController.getAdPerformanceBreakdown);

// POST /api/v1/facebook-ads/ads/:adId/sync-insights - مزامنة إحصائيات إعلان
router.post('/ads/:adId/sync-insights', facebookAdsController.syncAdInsights);

/**
 * ============================================
 * Ad Accounts Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/ad-accounts - جلب Ad Accounts من Facebook
router.get('/ad-accounts', facebookAdsController.getAdAccounts);

// GET /api/v1/facebook-ads/saved-ad-accounts - جلب Ad Accounts المحفوظة
router.get('/saved-ad-accounts', facebookAdsController.getSavedAdAccounts);

// POST /api/v1/facebook-ads/ad-accounts/save - حفظ Ad Account
router.post('/ad-accounts/save', facebookAdsController.saveAdAccount);

/**
 * ============================================
 * Isolated Ads Connection Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/connection/status - حالة الربط المعزول (بلا توكنات)
router.get('/connection/status', facebookAdsController.getAdsConnectionStatus);

// DELETE /api/v1/facebook-ads/connection/sources/:sourceId - فصل مصدر إعلانات
router.delete('/connection/sources/:sourceId', facebookAdsController.disconnectAdsConnectionSource);

// POST /api/v1/facebook-ads/connection/sources/:sourceId/update-token - تحديث توكن مصدر (مؤقت)
router.post('/connection/sources/:sourceId/update-token', async (req, res) => {
  try {
    const { sourceId } = req.params;
    const { accessToken } = req.body;
    const companyId = req.user?.companyId;
    
    if (!companyId || !sourceId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    
    const source = await prisma.facebookAdsConnectionSource.findFirst({
      where: { id: sourceId, companyId }
    });
    
    if (!source) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }
    
    await prisma.facebookAdsConnectionSource.update({
      where: { id: sourceId },
      data: { accessToken, updatedAt: new Date() }
    });
    
    res.json({ success: true, message: 'Token updated' });
  } catch (error) {
    console.error('Error updating token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/facebook-ads/connection/update-company-token - Temp: update Company facebookAdsAccessToken
router.post('/connection/update-company-token', async (req, res) => {
  try {
    const { accessToken } = req.body;
    const companyId = req.user?.companyId;
    
    if (!companyId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    
    await prisma.company.update({
      where: { id: companyId },
      data: { facebookAdsAccessToken: accessToken }
    });
    
    res.json({ success: true, message: 'Company token updated' });
  } catch (error) {
    console.error('Error updating company token:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ============================================
 * Audiences Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/audiences/custom - جلب جميع Custom Audiences
router.get('/audiences/custom', facebookAudiencesController.getCustomAudiences);

// POST /api/v1/facebook-ads/audiences/custom - إنشاء Custom Audience
router.post('/audiences/custom', facebookAudiencesController.createCustomAudience);

// GET /api/v1/facebook-ads/audiences/custom/:id - جلب معلومات Custom Audience
router.get('/audiences/custom/:id', facebookAudiencesController.getCustomAudience);

// DELETE /api/v1/facebook-ads/audiences/custom/:id - حذف Custom Audience
router.delete('/audiences/custom/:id', facebookAudiencesController.deleteCustomAudience);

// GET /api/v1/facebook-ads/audiences/lookalike - جلب جميع Lookalike Audiences
router.get('/audiences/lookalike', facebookAudiencesController.getLookalikeAudiences);

// POST /api/v1/facebook-ads/audiences/lookalike - إنشاء Lookalike Audience
router.post('/audiences/lookalike', facebookAudiencesController.createLookalikeAudience);

/**
 * ============================================
 * Facebook Pages & Pixels Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/pages - جلب Facebook Pages
router.get('/pages', facebookAdsController.getFacebookPages);

// GET /api/v1/facebook-ads/pixels - جلب Facebook Pixels
router.get('/pixels', facebookAdsController.getFacebookPixels);

/**
 * ============================================
 * Product Catalog Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/catalogs - جلب جميع Catalogs
router.get('/catalogs', facebookCatalogController.getCatalogs);

// POST /api/v1/facebook-ads/catalogs - إنشاء Catalog جديد
router.post('/catalogs', facebookCatalogController.createCatalog);

// GET /api/v1/facebook-ads/catalogs/:id - جلب Catalog واحد
router.get('/catalogs/:id', facebookCatalogController.getCatalog);

// DELETE /api/v1/facebook-ads/catalogs/:id - حذف Catalog
router.delete('/catalogs/:id', facebookCatalogController.deleteCatalog);

// POST /api/v1/facebook-ads/catalogs/:catalogId/sync-products - Sync Products مع Catalog
router.post('/catalogs/:catalogId/sync-products', facebookCatalogController.syncProducts);

// GET /api/v1/facebook-ads/catalogs/:catalogId/products - جلب المنتجات في Catalog
router.get('/catalogs/:catalogId/products', facebookCatalogController.getCatalogProducts);

/**
 * ============================================
 * Dynamic Ads Routes
 * ============================================
 */

// GET /api/v1/facebook-ads/catalogs/:catalogId/product-sets - جلب Product Sets
router.get('/catalogs/:catalogId/product-sets', facebookCatalogController.getProductSets);

// POST /api/v1/facebook-ads/catalogs/:catalogId/product-sets - إنشاء Product Set
router.post('/catalogs/:catalogId/product-sets', facebookCatalogController.createProductSet);

// POST /api/v1/facebook-ads/adsets/:adSetId/dynamic-ads - إنشاء Dynamic Product Ad
router.post('/adsets/:adSetId/dynamic-ads', facebookCatalogController.createDynamicAd);

/**
 * ============================================
 * A/B Testing Routes
 * ============================================
 */

const facebookAdTestController = require('../controller/facebookAdTestController');

// GET /api/v1/facebook-ads/tests - جلب جميع Tests
router.get('/tests', facebookAdTestController.getTests);

// GET /api/v1/facebook-ads/tests/:id - جلب Test واحد
router.get('/tests/:id', facebookAdTestController.getTest);

// POST /api/v1/facebook-ads/tests - إنشاء Test جديد
router.post('/tests', facebookAdTestController.createTest);

// PUT /api/v1/facebook-ads/tests/:id - تحديث Test
router.put('/tests/:id', facebookAdTestController.updateTest);

// DELETE /api/v1/facebook-ads/tests/:id - حذف Test
router.delete('/tests/:id', facebookAdTestController.deleteTest);

// POST /api/v1/facebook-ads/tests/:id/start - بدء Test
router.post('/tests/:id/start', facebookAdTestController.startTest);

// POST /api/v1/facebook-ads/tests/:id/pause - إيقاف Test
router.post('/tests/:id/pause', facebookAdTestController.pauseTest);

// POST /api/v1/facebook-ads/tests/:id/analyze - تحليل نتائج Test
router.post('/tests/:id/analyze', facebookAdTestController.analyzeTest);

// POST /api/v1/facebook-ads/tests/:id/promote-winner - تعزيز الفائز
router.post('/tests/:id/promote-winner', facebookAdTestController.promoteWinner);

// GET /api/v1/facebook-ads/tests/:id/results - جلب نتائج Test
router.get('/tests/:id/results', facebookAdTestController.getTestResults);

/**
 * ============================================
 * v22.0 New Features Routes
 * ============================================
 */

// --- Custom Audiences (v22.0) ---
// GET /api/v1/facebook-ads/audiences - جلب Custom Audiences
router.get('/audiences', facebookAdsController.getCustomAudiences);

// POST /api/v1/facebook-ads/audiences - إنشاء Custom Audience
router.post('/audiences', facebookAdsController.createCustomAudience);

// POST /api/v1/facebook-ads/audiences/:id/users - إضافة مستخدمين لـ Audience
router.post('/audiences/:id/users', facebookAdsController.addUsersToAudience);

// POST /api/v1/facebook-ads/audiences/lookalike - إنشاء Lookalike Audience
router.post('/audiences/lookalike', facebookAdsController.createLookalikeAudience);

// --- A/B Testing (v22.0) ---
// POST /api/v1/facebook-ads/ab-tests - إنشاء A/B Test
router.post('/ab-tests', facebookAdsController.createABTest);

// GET /api/v1/facebook-ads/ab-tests/:id - جلب نتائج A/B Test
router.get('/ab-tests/:id', facebookAdsController.getABTestResults);

// --- Lead Generation (v22.0) ---
// POST /api/v1/facebook-ads/lead-forms - إنشاء Lead Form
router.post('/lead-forms', facebookAdsController.createLeadForm);

// GET /api/v1/facebook-ads/lead-forms/:id/leads - جلب Leads
router.get('/lead-forms/:id/leads', facebookAdsController.getLeads);

// --- Conversion API (v22.0) ---
// POST /api/v1/facebook-ads/conversions - إرسال Conversion Event
router.post('/conversions', facebookAdsController.sendConversionEvent);

// --- Ad Scheduling (v22.0) ---
// PUT /api/v1/facebook-ads/adsets/:id/schedule - تحديث جدولة Ad Set
router.put('/adsets/:id/schedule', facebookAdsController.updateAdSetSchedule);

// --- Dynamic Creative Optimization (v22.0) ---
// POST /api/v1/facebook-ads/creatives/dynamic - إنشاء Dynamic Creative
router.post('/creatives/dynamic', facebookAdsController.createDynamicCreative);

// --- Advantage+ Shopping (v22.0) ---
// POST /api/v1/facebook-ads/campaigns/advantage-plus-shopping - إنشاء Advantage+ Shopping Campaign
router.post('/campaigns/advantage-plus-shopping', facebookAdsController.createAdvantagePlusShoppingCampaign);

// --- Async Reports (v22.0) ---
// POST /api/v1/facebook-ads/reports/async - إنشاء Async Report
router.post('/reports/async', facebookAdsController.createAsyncReport);
// GET /api/v1/facebook-ads/reports/async/:reportRunId/status - جلب حالة Report
router.get('/reports/async/:reportRunId/status', facebookAdsController.getAsyncReportStatus);
// GET /api/v1/facebook-ads/reports/async/:reportRunId/results - جلب نتائج Report
router.get('/reports/async/:reportRunId/results', facebookAdsController.getAsyncReportResults);

// --- Creative Formats (v22.0) ---
// POST /api/v1/facebook-ads/creatives/collection - إنشاء Collection Creative
router.post('/creatives/collection', facebookAdsController.createCollectionCreative);
// POST /api/v1/facebook-ads/creatives/instagram-reels - إنشاء Instagram Reels Creative
router.post('/creatives/instagram-reels', facebookAdsController.createInstagramReelsCreative);
// POST /api/v1/facebook-ads/creatives/stories-reels - إنشاء Stories/Reels Creative
router.post('/creatives/stories-reels', facebookAdsController.createStoriesReelsCreative);
// POST /api/v1/facebook-ads/instant-experience - إنشاء Instant Experience
router.post('/instant-experience', facebookAdsController.createInstantExperience);

// --- Automation Rules (v22.0) ---
// GET /api/v1/facebook-ads/rules - جلب Automated Rules
router.get('/rules', facebookAdsController.getAutomatedRules);
// POST /api/v1/facebook-ads/rules - إنشاء Automated Rule
router.post('/rules', facebookAdsController.createAutomatedRule);
// PUT /api/v1/facebook-ads/rules/:id - تحديث Automated Rule
router.put('/rules/:id', facebookAdsController.updateAutomatedRule);
// DELETE /api/v1/facebook-ads/rules/:id - حذف Automated Rule
router.delete('/rules/:id', facebookAdsController.deleteAutomatedRule);

// --- Attribution Settings (v22.0) ---
// PUT /api/v1/facebook-ads/adsets/:adSetId/attribution - تحديث Attribution Settings
router.put('/adsets/:adSetId/attribution', facebookAdsController.updateAttributionSettings);

// --- Ad Set Management (v22.0) ---
// PUT /api/v1/facebook-ads/adsets/:id - تحديث Ad Set
router.put('/adsets/:id', facebookAdsController.updateAdSet);
// PUT /api/v1/facebook-ads/adsets/:id/frequency-cap - تحديث Frequency Cap
router.put('/adsets/:id/frequency-cap', facebookAdsController.updateFrequencyCap);

// --- Advanced Targeting (v22.0) ---
// GET /api/v1/facebook-ads/targeting/search - البحث عن Targeting Options
router.get('/targeting/search', facebookAdsController.searchTargetingOptions);
// POST /api/v1/facebook-ads/targeting/suggestions - جلب Targeting Suggestions
router.post('/targeting/suggestions', facebookAdsController.getTargetingSuggestions);
// POST /api/v1/facebook-ads/targeting/reach-estimate - جلب Reach Estimate
router.post('/targeting/reach-estimate', facebookAdsController.getReachEstimate);

// --- Ad Preview (v22.0) ---
// GET /api/v1/facebook-ads/ads/:adId/preview - جلب Ad Preview
router.get('/ads/:adId/preview', facebookAdsController.getAdPreview);
// GET /api/v1/facebook-ads/creatives/:creativeId/preview - جلب Creative Preview
router.get('/creatives/:creativeId/preview', facebookAdsController.getCreativePreview);

// --- Saved Audiences (v22.0) ---
// GET /api/v1/facebook-ads/saved-audiences - جلب Saved Audiences
router.get('/saved-audiences', facebookAdsController.getSavedAudiences);
// POST /api/v1/facebook-ads/saved-audiences - إنشاء Saved Audience
router.post('/saved-audiences', facebookAdsController.createSavedAudience);
// DELETE /api/v1/facebook-ads/saved-audiences/:id - حذف Saved Audience
router.delete('/saved-audiences/:id', facebookAdsController.deleteSavedAudience);

module.exports = router;

