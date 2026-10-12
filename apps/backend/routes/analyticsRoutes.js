const express = require('express');
const router = express.Router();
const analyticsController = require('../controller/analyticsController');
const retentionAnalyticsController = require('../controller/retentionAnalyticsController');
const productDeliveryReturnsController = require('../controller/productDeliveryReturnsController');
const fulfillmentVelocityController = require('../controller/fulfillmentVelocityController');
const { authenticateToken } = require('../utils/verifyToken');
const { cacheMiddleware } = require('../middleware/performanceOptimization');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// ==================== Protected Routes (تحتاج تسجيل دخول) ====================

// إحصائيات المتجر الشاملة
router.get('/store', authenticateToken, cacheMiddleware(60000), analyticsController.getStoreAnalytics);

// معدل التحويل للمتجر
router.get('/conversion-rate', authenticateToken, cacheMiddleware(60000), analyticsController.getConversionRate);

// أفضل المنتجات أداءً
router.get('/products/top', authenticateToken, cacheMiddleware(60000), analyticsController.getTopProducts);

// معدل التحويل لمنتج محدد
router.get('/products/:productId/conversion', authenticateToken, cacheMiddleware(60000), analyticsController.getProductConversionRate);

// الإحصائيات اليومية المجمعة
router.get('/daily', authenticateToken, cacheMiddleware(60000), analyticsController.getDailyAnalytics);

// إحصائيات المنتجات المجمعة
router.get('/products/analytics', authenticateToken, cacheMiddleware(60000), analyticsController.getProductAnalytics);

// تقرير مبيعات المنتجات (كمية/أوردرات/متوسط سعر)
router.get('/products/sales-performance', authenticateToken, cacheMiddleware(60000), analyticsController.getProductSalesPerformance);

// تحليل المقاسات والألوان
router.get('/variations', authenticateToken, cacheMiddleware(60000), analyticsController.getVariationsAnalytics);

// تحليل الأقسام
router.get('/categories', authenticateToken, cacheMiddleware(60000), analyticsController.getCategoriesAnalytics);

// تحليل طرق الدفع
router.get('/payment-methods', authenticateToken, cacheMiddleware(60000), analyticsController.getPaymentMethodsAnalytics);

// التحليل الجغرافي
router.get('/regions', authenticateToken, cacheMiddleware(60000), analyticsController.getRegionsAnalytics);

// تحليل الكوبونات
router.get('/coupons', authenticateToken, cacheMiddleware(60000), analyticsController.getCouponsAnalytics);

// أداء الدفع عند الاستلام
router.get('/cod-performance', authenticateToken, cacheMiddleware(60000), analyticsController.getCODPerformanceAnalytics);

// تحليل أسباب الإلغاء ومراجعة الطلبات الملغاة
router.get('/today-ops', authenticateToken, cacheMiddleware(60000), analyticsController.getTodayOps);
router.get('/cancellations', authenticateToken, cacheMiddleware(60000), analyticsController.getCancellationAnalytics);
router.get('/cancellations/settings', authenticateToken, analyticsController.getCancellationReasonSettings);
router.put('/cancellations/settings', authenticateToken, analyticsController.updateCancellationReasonSettings);

// السلات المتروكة
router.get('/abandoned-carts', authenticateToken, cacheMiddleware(60000), analyticsController.getAbandonedCartAnalytics);

// تصنيف جودة العملاء
router.get('/customer-quality', authenticateToken, cacheMiddleware(60000), analyticsController.getCustomerQualityAnalytics);

// تحليل الأرباح والتكاليف
router.get('/profit', authenticateToken, cacheMiddleware(60000), analyticsController.getProfitAnalytics);

// تحليل معدل التسليم
router.get('/delivery-rate', authenticateToken, cacheMiddleware(60000), analyticsController.getDeliveryRateAnalytics);

// تحليل وقت حالات الطلبات
router.get('/order-status-time', authenticateToken, cacheMiddleware(60000), analyticsController.getOrderStatusTimeAnalytics);

// تقييم صحة المنتجات
router.get('/product-health', authenticateToken, cacheMiddleware(60000), analyticsController.getProductHealthScore);

// تحليل المرتجعات
router.get('/returns', authenticateToken, cacheMiddleware(60000), analyticsController.getReturnAnalytics);

// تحليل أسباب المرتجعات (توزيع الأسباب والتصنيفات والحالات والمنتجات والاتجاه اليومي)
router.get('/returns/reasons', authenticateToken, cacheMiddleware(60000), analyticsController.getReturnReasonsAnalytics);

// تحليل تنفيذ المنتجات (تسليم / إلغاء / مرتجع) لكل منتج
router.get('/product-fulfillment', authenticateToken, cacheMiddleware(60000), analyticsController.getProductFulfillmentAnalytics);

// تحليل أداء التسليم والمرتجعات اللوجستي (الشحنات الفعلية / الفروع / المحافظات / أسباب المرتجع)
router.get('/delivery-returns', authenticateToken, cacheMiddleware(60000), analyticsController.getDeliveryReturnsLogisticsAnalytics);

// تقرير تحليلي مخصص لكل منتج (نسبة التسليم، التحصيل، وتفصيل أسباب المرتجعات للمعالجة التشغيلية)
router.get('/products-delivery-returns', authenticateToken, cacheMiddleware(30000), productDeliveryReturnsController.getProductDeliveryReturnsReport);

// تحليل أداء الفريق
router.get('/team-performance', authenticateToken, cacheMiddleware(60000), analyticsController.getTeamPerformanceAnalytics);

// تقرير عمولات المسوقين (قطع × 50ج أو معدل مخصص)
router.get('/marketer-commissions', authenticateToken, cacheMiddleware(30000), analyticsController.getMarketerCommissionsAnalytics);

// تحليل القمع
router.get('/funnel', authenticateToken, cacheMiddleware(60000), analyticsController.getFunnelAnalytics);

// توقعات المخزون
router.get('/stock-forecast', authenticateToken, cacheMiddleware(60000), analyticsController.getStockForecastAnalytics);

// تحليل الحملات وربط الطلبات بالمصادر
router.get('/campaign-attribution', authenticateToken, checkAppAccess('campaign-attribution'), cacheMiddleware(60000), analyticsController.getCampaignAttributionAnalytics);

// حالات الطلب المتاحة للتقرير
router.get('/statuses', authenticateToken, cacheMiddleware(60000), analyticsController.getAvailableStatuses);

// تقرير ملخص الحالات التجميعي (مباشر بلا كاش لضمان التطابق اللحظي مع صفحة الطلبات)
router.get('/status-summary', authenticateToken, analyticsController.getStatusSummaryReport);

// تفاصيل الطلبات حسب الحالة (drill-down)
router.get('/status-summary/orders', authenticateToken, analyticsController.getStatusSummaryOrders);

// تفاصيل القطع حسب الحالة (drill-down)
router.get('/status-summary/items', authenticateToken, analyticsController.getStatusSummaryItems);

// سرعة الإنجاز وتوزيع أعمار الطلبات المشحونة (Fulfillment Velocity & Vintage Cockpit)
router.get('/fulfillment-velocity', authenticateToken, fulfillmentVelocityController.getFulfillmentVelocitySummary);
router.get('/fulfillment-velocity/orders', authenticateToken, fulfillmentVelocityController.getFulfillmentVelocityOrders);

// Retention Analytics — RPR / Cohort / RFM (Swan P0)
router.get('/retention', authenticateToken, cacheMiddleware(60000), retentionAnalyticsController.getRetentionAnalytics);
router.get('/overview', authenticateToken, cacheMiddleware(60000), retentionAnalyticsController.getRetentionAnalytics); // alias fixes 404

// ==================== Public Routes (للتتبع من Storefront) ====================

// تسجيل زيارة منتج
router.post('/track/product-view', analyticsController.trackProductView);

// تسجيل زيارة المتجر
router.post('/track/store-visit', analyticsController.trackStoreVisit);

// تسجيل حدث تحويل (إضافة للسلة، شراء، إلخ)
router.post('/track/conversion', analyticsController.trackConversion);

// مقاييس أداء المستخدم الحقيقي (LCP/CLS/INP/TTFB) من المتصفح
router.post('/track/web-vitals', analyticsController.trackWebVitals);

// ملخص مقاييس الأداء لآخر ساعة (لللوحة)
router.get('/web-vitals/summary', authenticateToken, analyticsController.getWebVitalsSummary);

// ==================== Public Analytics Routes (للعرض من Dashboard) ====================

// إحصائيات المتجر الشاملة (Public)
router.get('/public/store', cacheMiddleware(60000), analyticsController.getStoreAnalytics);

// أفضل المنتجات أداءً (Public)
router.get('/public/products/top', cacheMiddleware(60000), analyticsController.getTopProducts);

// الإحصائيات اليومية المجمعة (Public)
router.get('/public/daily', cacheMiddleware(60000), analyticsController.getDailyAnalytics);

module.exports = router;
