/**
 * 💡 Loyalty Routes (عام - للواجهة الأمامية)
 * مسار معاينة الكاش باك الديناميكي لصفحة المنتج.
 */

const express = require('express');
const router = express.Router();
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');
const loyaltyCashbackPreviewController = require('../controller/loyaltyCashbackPreviewController');

// استخراج الشركة من الساب دومين (مثل باقي المسارات العامة)
router.use(extractSubdomainMiddleware);
router.use(requireCompany);

/**
 * GET /api/v1/loyalty/cashback-preview?productId=&categoryId=&amount=
 * يُرجع تقدير الكاش باك للعميل في المتجر (ProductInfo).
 */
router.get('/cashback-preview', loyaltyCashbackPreviewController.previewCashback);

module.exports = router;
