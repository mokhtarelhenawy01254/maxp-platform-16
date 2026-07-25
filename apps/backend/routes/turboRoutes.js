/**
 * Turbo Shipping Routes
 * مسارات Turbo للشحن
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');
const turboController = require('../controller/turboController');

// إعداد multer للتعامل مع رفع الملفات (في الذاكرة)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // السماح بصور فقط
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Public Routes (No Authentication Required)
 * المسارات العامة (لا تتطلب مصادقة)
 */

/**
 * GET /api/turbo/orders/:orderId/waybill
 * طباعة بوليصة الشحنة - عام بدون مصادقة
 */
router.get('/orders/:orderId/waybill', turboController.printWaybill);

// جميع المسارات التالية تتطلب المصادقة


/**
 * POST /api/turbo/orders/:orderId/shipment
 * إنشاء شحنة جديدة للطلب
 */
router.post('/orders/:orderId/shipment', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.createShipment);

/**
 * POST /api/turbo/bulk/create-shipments
 * إنشاء شحنات لعدة طلبات دفعة واحدة
 */
router.post('/bulk/create-shipments', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.bulkCreateShipments);

/**
 * GET /api/turbo/orders/:orderId/track
 * تتبع الشحنة
 */
router.get('/orders/:orderId/track', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.trackShipment);

/**
 * POST /api/turbo/orders/:orderId/sync-status
 * سحب ومزامنة حالة الشحنة المباشرة من تربو وتحديث الطلب
 */
router.post('/orders/:orderId/sync-status', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.syncShipmentStatus);

/**
 * POST /api/turbo/calculate
 * حساب تكلفة الشحن
 */
router.post('/calculate', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.calculateShippingCost);

/**
 * GET /api/turbo/orders/:orderId/shipping-comparison
 * جلب مقارنة أسعار الشحن
 */
router.get('/orders/:orderId/shipping-comparison', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getShippingComparison);

/**
 * POST /api/turbo/orders/:orderId/cancel
 * إلغاء الشحنة
 */
router.post('/orders/:orderId/cancel', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.cancelShipment);

/**
 * POST /api/turbo/orders/:orderId/unlink
 * إلغاء ربط Turbo المحلي من الطلب بدون إلغاء الشحنة خارج MaxP
 */
router.post('/orders/:orderId/unlink', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.unlinkShipment);

/**
 * GET /api/turbo/orders/:orderId/label
 * طباعة ملصق الشحنة
 */
router.get('/orders/:orderId/label', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.printLabel);

/**
 * GET /api/turbo/governments
 * جلب قائمة المحافظات من Turbo API
 */
router.get('/governments', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getGovernments);

/**
 * GET /api/turbo/areas/:governmentId
 * جلب قائمة المناطق بناءً على المحافظة
 */
router.get('/areas/:governmentId', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getAreas);

/**
 * GET /api/turbo/reports/shipping
 * جلب تقرير الشحن
 */
const turboReportController = require('../controller/turboReportController');
router.get('/reports/shipping', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.getShippingReport);
router.patch('/reports/shipping/cost', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.updateManualCost);
router.post('/reports/shipping/bulk-cost', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.bulkUpdateManualCost);
router.get('/reports/shipping/governorate-costs', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.getGovernorateCosts);
router.put('/reports/shipping/governorate-costs', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.saveGovernorateCostsHandler);

/**
 * GET /api/turbo/branches
 * جلب فروع Turbo
 */
router.get('/records', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getRecords);
router.get('/branches', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getBranches);

/**
 * PUT /api/turbo/orders/:orderId/shipment
 * تحديث بيانات الشحنة
 */
router.put('/orders/:orderId/shipment', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.updateShipment);

/**
 * POST /api/turbo/tickets
 * إضافة تذكرة دعم إلى Turbo
 */
router.post('/tickets', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.addTicket);

/**
 * GET /api/turbo/inquiries-types
 * جلب أنواع الاستفسارات من Turbo
 * يدعم POST و GET
 */
router.get('/inquiries-types', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getInquiriesTypes);
router.post('/inquiries-types', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getInquiriesTypes);

/**
 * GET /api/turbo/tickets/unread-count
 * جلب عدد التذاكر غير المقروءة من Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.get('/tickets/unread-count', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getUnreadTicketsCount);

/**
 * GET /api/turbo/tickets/:id/log
 * جلب سجل التذكرة من Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.get('/tickets/:id/log', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getTicketLog);

/**
 * POST /api/turbo/tickets/:id/reply
 * الرد على تذكرة في Turbo
 * يجب أن يأتي قبل /tickets/:id لتجنب التطابق الخاطئ
 */
router.post('/tickets/:id/reply', verifyToken.authenticateToken, upload.single('image'), checkAppAccess('order-shipping-turbo'), turboController.replyToTicket);

/**
 * GET /api/turbo/tickets/:id
 * جلب تفاصيل تذكرة معينة من Turbo
 */
router.get('/tickets/:id', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getTicket);

/**
 * GET /api/turbo/tickets
 * جلب قائمة التذاكر من Turbo
 */
router.get('/tickets', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getTickets);

/**
 * GET /api/turbo/debug/search/:code
 * DEBUG: Test search-order directly and return raw Turbo API response
 * TEMP - Remove after debugging
 */
router.get('/debug/search/:code', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const companyId = req.user?.companyId;
    const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
    const axios = require('axios');
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboMainClientCode: true } }), 2);
    if (!company?.turboApiKey) return res.json({ error: 'No turbo API key' });
    
    const baseUrl = process.env.TURBO_API_URL || 'https://backoffice.turbo-eg.com/external-api';
    const results = {};

    // Test 1: search-order with search_Key (capital K)
    try {
      const r1 = await axios.post(`${baseUrl}/search-order`, { authentication_key: company.turboApiKey, main_client_code: company.turboMainClientCode || 37321, search_Key: code }, { timeout: 15000 });
      results['search_Key'] = { status: r1.status, success: r1.data?.success, hasData: !!r1.data?.data, raw: r1.data };
    } catch (e) { results['search_Key'] = { error: e.response?.status + ': ' + (e.response?.data?.message || e.message) }; }

    // Test 2: search-order with search_key (lowercase k)
    try {
      const r2 = await axios.post(`${baseUrl}/search-order`, { authentication_key: company.turboApiKey, main_client_code: company.turboMainClientCode || 37321, search_key: code }, { timeout: 15000 });
      results['search_key'] = { status: r2.status, success: r2.data?.success, hasData: !!r2.data?.data, raw: r2.data };
    } catch (e) { results['search_key'] = { error: e.response?.status + ': ' + (e.response?.data?.message || e.message) }; }

    // Test 3: get-status for recent 30 days
    try {
      const from = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
      const to = new Date().toISOString().split('T')[0];
      const r3 = await axios.post(`${baseUrl}/get-status`, { authentication_key: company.turboApiKey, main_client_code: company.turboMainClientCode || 37321, from, to }, { timeout: 15000 });
      const data = r3.data?.data || [];
      const found = data.find(s => String(s.code) === code || String(s.bar_code) === code);
      results['get-status'] = { totalReturned: data.length, foundThisCode: !!found, foundData: found || null };
    } catch (e) { results['get-status'] = { error: e.response?.status + ': ' + (e.response?.data?.message || e.message) }; }

    res.json({ code, mainClientCode: company.turboMainClientCode, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;


