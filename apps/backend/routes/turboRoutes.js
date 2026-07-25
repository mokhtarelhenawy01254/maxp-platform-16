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
    
    const apiKey = company.turboApiKey;
    const clientCode = company.turboMainClientCode || 37321;
    const backofficeUrl = 'https://backoffice.turbo-eg.com/external-api';
    const platformUrl = 'https://platform.turbo.info/external-api';
    const results = {};

    // Test both API endpoints with search_Key (capital K)
    for (const [label, url] of [['backoffice', backofficeUrl], ['platform', platformUrl]]) {
      try {
        const r = await axios.post(`${url}/search-order`, { authentication_key: apiKey, main_client_code: clientCode, search_Key: code }, { timeout: 15000 });
        results[label+'_searchKey'] = { success: r.data?.success, hasData: !!r.data?.data, statusCode: r.data?.data?.[0]?.status_code, statusText: r.data?.data?.[0]?.status };
      } catch (e) { results[label+'_searchKey'] = { error: `HTTP_${e.response?.status}: ${e.response?.data?.message || e.message}` }; }
    }

    // Test get-status from BOTH URLs (180 days)
    const from = new Date(Date.now() - 180*24*60*60*1000).toISOString().split('T')[0];
    const to = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];
    for (const [label, url] of [['backoffice', backofficeUrl], ['platform', platformUrl]]) {
      try {
        const r = await axios.post(`${url}/get-status`, { authentication_key: apiKey, main_client_code: clientCode, from, to }, { timeout: 20000 });
        const data = r.data?.data || [];
        const found = data.find(s => String(s.code) === String(code) || String(s.bar_code) === String(code));
        // Show status distribution for platform
        const dist = {}; data.forEach(s => { const k = `${s.status_code}(${s.status})`; dist[k] = (dist[k]||0)+1; });
        results[label+'_getstatus'] = { totalReturned: data.length, foundThisCode: !!found, distribution: dist, foundData: found || null };
      } catch (e) { results[label+'_getstatus'] = { error: `HTTP_${e.response?.status}: ${e.response?.data?.message || e.message}` }; }
    }

    res.json({ code, mainClientCode: clientCode, results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;


