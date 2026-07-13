const express = require('express');
const router = express.Router();
const analyticsController = require('../controller/analyticsController');
const { authenticateToken } = require('../utils/verifyToken');
const { cacheMiddleware } = require('../middleware/performanceOptimization');

// ==================== Protected Routes (تحتاج تسجيل دخول) ====================

// إحصائيات المتجر الشاملة
router.get('/store', authenticateToken, cacheMiddleware(60000), analyticsController.getStoreAnalytics);

// معدل التحويل للمتجر
router.get('/conversion-rate', authenticateToken, analyticsController.getConversionRate);

// أفضل المنتجات أداءً
router.get('/products/top', authenticateToken, cacheMiddleware(60000), analyticsController.getTopProducts);

// معدل التحويل لمنتج محدد
router.get('/products/:productId/conversion', authenticateToken, analyticsController.getProductConversionRate);

// الإحصائيات اليومية المجمعة
router.get('/daily', authenticateToken, cacheMiddleware(60000), analyticsController.getDailyAnalytics);

// إحصائيات المنتجات المجمعة
router.get('/products/analytics', authenticateToken, analyticsController.getProductAnalytics);

// تحليل المقاسات والألوان
router.get('/variations', authenticateToken, analyticsController.getVariationsAnalytics);

// تحليل الأقسام
router.get('/categories', authenticateToken, analyticsController.getCategoriesAnalytics);

// تحليل طرق الدفع
router.get('/payment-methods', authenticateToken, analyticsController.getPaymentMethodsAnalytics);

// التحليل الجغرافي
router.get('/regions', authenticateToken, analyticsController.getRegionsAnalytics);

// تحليل الكوبونات
router.get('/coupons', authenticateToken, analyticsController.getCouponsAnalytics);

// أداء الدفع عند الاستلام
router.get('/cod-performance', authenticateToken, analyticsController.getCODPerformanceAnalytics);

// تحليل أسباب الإلغاء ومراجعة الطلبات الملغاة
router.get('/cancellations', authenticateToken, analyticsController.getCancellationAnalytics);
router.get('/cancellations/settings', authenticateToken, analyticsController.getCancellationReasonSettings);
router.put('/cancellations/settings', authenticateToken, analyticsController.updateCancellationReasonSettings);

// السلات المتروكة
router.get('/abandoned-carts', authenticateToken, analyticsController.getAbandonedCartAnalytics);

// تصنيف جودة العملاء
router.get('/customer-quality', authenticateToken, analyticsController.getCustomerQualityAnalytics);

// تحليل الأرباح والتكاليف
router.get('/profit', authenticateToken, analyticsController.getProfitAnalytics);

// تحليل معدل التسليم
router.get('/delivery-rate', authenticateToken, analyticsController.getDeliveryRateAnalytics);

// تحليل وقت حالات الطلبات
router.get('/order-status-time', authenticateToken, analyticsController.getOrderStatusTimeAnalytics);

// تقييم صحة المنتجات
router.get('/product-health', authenticateToken, analyticsController.getProductHealthScore);

// تحليل المرتجعات
router.get('/returns', authenticateToken, analyticsController.getReturnAnalytics);

// تحليل أداء الفريق
router.get('/team-performance', authenticateToken, analyticsController.getTeamPerformanceAnalytics);

// تحليل القمع
router.get('/funnel', authenticateToken, analyticsController.getFunnelAnalytics);

// توقعات المخزون
router.get('/stock-forecast', authenticateToken, analyticsController.getStockForecastAnalytics);

// تحليل الحملات وربط الطلبات بالمصادر
router.get('/campaign-attribution', authenticateToken, cacheMiddleware(60000), analyticsController.getCampaignAttributionAnalytics);

// حالات الطلب المتاحة للتقرير
router.get('/statuses', authenticateToken, analyticsController.getAvailableStatuses);

// تقرير ملخص الحالات التجميعي
router.get('/status-summary', authenticateToken, analyticsController.getStatusSummaryReport);

// تفاصيل الطلبات حسب الحالة (drill-down)
router.get('/status-summary/orders', authenticateToken, analyticsController.getStatusSummaryOrders);

// تفاصيل القطع حسب الحالة (drill-down)
router.get('/status-summary/items', authenticateToken, analyticsController.getStatusSummaryItems);

// ==================== Public Routes (للتتبع من Storefront) ====================

// تسجيل زيارة منتج
router.post('/track/product-view', analyticsController.trackProductView);

// تسجيل زيارة المتجر
router.post('/track/store-visit', analyticsController.trackStoreVisit);

// تسجيل حدث تحويل (إضافة للسلة، شراء، إلخ)
router.post('/track/conversion', analyticsController.trackConversion);

// ==================== Public Analytics Routes (للعرض من Dashboard) ====================

// إحصائيات المتجر الشاملة (Public)
router.get('/public/store', cacheMiddleware(60000), analyticsController.getStoreAnalytics);

// أفضل المنتجات أداءً (Public)
router.get('/public/products/top', cacheMiddleware(60000), analyticsController.getTopProducts);

// الإحصائيات اليومية المجمعة (Public)
router.get('/public/daily', cacheMiddleware(60000), analyticsController.getDailyAnalytics);

module.exports = router;
