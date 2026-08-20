/**
 * Turbo Shipping Routes
 * ┘à╪│╪º╪▒╪º╪¬ Turbo ┘ä┘ä╪┤╪¡┘å
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');
const turboController = require('../controller/turboController');

// ╪Ñ╪╣╪»╪º╪» multer ┘ä┘ä╪¬╪╣╪º┘à┘ä ┘à╪╣ ╪▒┘ü╪╣ ╪º┘ä┘à┘ä┘ü╪º╪¬ (┘ü┘è ╪º┘ä╪░╪º┘â╪▒╪⌐)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // ╪º┘ä╪│┘à╪º╪¡ ╪¿╪╡┘ê╪▒ ┘ü┘é╪╖
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * Public Routes (No Authentication Required)
 * ╪º┘ä┘à╪│╪º╪▒╪º╪¬ ╪º┘ä╪╣╪º┘à╪⌐ (┘ä╪º ╪¬╪¬╪╖┘ä╪¿ ┘à╪╡╪º╪»┘é╪⌐)
 */

/**
 * GET /api/turbo/orders/:orderId/waybill
 * ╪╖╪¿╪º╪╣╪⌐ ╪¿┘ê┘ä┘è╪╡╪⌐ ╪º┘ä╪┤╪¡┘å╪⌐ - ╪╣╪º┘à ╪¿╪»┘ê┘å ┘à╪╡╪º╪»┘é╪⌐
 */
router.get('/orders/:orderId/waybill', turboController.printWaybill);

// ╪¼┘à┘è╪╣ ╪º┘ä┘à╪│╪º╪▒╪º╪¬ ╪º┘ä╪¬╪º┘ä┘è╪⌐ ╪¬╪¬╪╖┘ä╪¿ ╪º┘ä┘à╪╡╪º╪»┘é╪⌐


/**
 * POST /api/turbo/orders/:orderId/shipment
 * ╪Ñ┘å╪┤╪º╪í ╪┤╪¡┘å╪⌐ ╪¼╪»┘è╪»╪⌐ ┘ä┘ä╪╖┘ä╪¿
 */
router.post('/orders/:orderId/shipment', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.createShipment);

/**
 * POST /api/turbo/bulk/create-shipments
 * ╪Ñ┘å╪┤╪º╪í ╪┤╪¡┘å╪º╪¬ ┘ä╪╣╪»╪⌐ ╪╖┘ä╪¿╪º╪¬ ╪»┘ü╪╣╪⌐ ┘ê╪º╪¡╪»╪⌐
 */
router.post('/bulk/create-shipments', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.bulkCreateShipments);

/**
 * GET /api/turbo/orders/:orderId/track
 * ╪¬╪¬╪¿╪╣ ╪º┘ä╪┤╪¡┘å╪⌐
 */
router.get('/orders/:orderId/track', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.trackShipment);

/**
 * POST /api/turbo/orders/:orderId/sync-status
 * ╪│╪¡╪¿ ┘ê┘à╪▓╪º┘à┘å╪⌐ ╪¡╪º┘ä╪⌐ ╪º┘ä╪┤╪¡┘å╪⌐ ╪º┘ä┘à╪¿╪º╪┤╪▒╪⌐ ┘à┘å ╪¬╪▒╪¿┘ê ┘ê╪¬╪¡╪»┘è╪½ ╪º┘ä╪╖┘ä╪¿
 */
router.post('/orders/:orderId/sync-status', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.syncShipmentStatus);

/**
 * POST /api/turbo/calculate
 * ╪¡╪│╪º╪¿ ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪┤╪¡┘å
 */
router.post('/calculate', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.calculateShippingCost);

/**
 * GET /api/turbo/orders/:orderId/shipping-comparison
 * ╪¼┘ä╪¿ ┘à┘é╪º╪▒┘å╪⌐ ╪ú╪│╪╣╪º╪▒ ╪º┘ä╪┤╪¡┘å
 */
router.get('/orders/:orderId/shipping-comparison', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getShippingComparison);

/**
 * POST /api/turbo/orders/:orderId/cancel
 * ╪Ñ┘ä╪║╪º╪í ╪º┘ä╪┤╪¡┘å╪⌐
 */
router.post('/orders/:orderId/cancel', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.cancelShipment);

/**
 * POST /api/turbo/orders/:orderId/unlink
 * ╪Ñ┘ä╪║╪º╪í ╪▒╪¿╪╖ Turbo ╪º┘ä┘à╪¡┘ä┘è ┘à┘å ╪º┘ä╪╖┘ä╪¿ ╪¿╪»┘ê┘å ╪Ñ┘ä╪║╪º╪í ╪º┘ä╪┤╪¡┘å╪⌐ ╪«╪º╪▒╪¼ MaxP
 */
router.post('/orders/:orderId/unlink', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.unlinkShipment);

/**
 * GET /api/turbo/orders/:orderId/label
 * ╪╖╪¿╪º╪╣╪⌐ ┘à┘ä╪╡┘é ╪º┘ä╪┤╪¡┘å╪⌐
 */
router.get('/orders/:orderId/label', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.printLabel);

/**
 * GET /api/turbo/governments
 * ╪¼┘ä╪¿ ┘é╪º╪ª┘à╪⌐ ╪º┘ä┘à╪¡╪º┘ü╪╕╪º╪¬ ┘à┘å Turbo API
 */
router.get('/governments', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getGovernments);

/**
 * GET /api/turbo/areas/:governmentId
 * ╪¼┘ä╪¿ ┘é╪º╪ª┘à╪⌐ ╪º┘ä┘à┘å╪º╪╖┘é ╪¿┘å╪º╪í┘ï ╪╣┘ä┘ë ╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐
 */
router.get('/areas/:governmentId', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getAreas);

/**
 * GET /api/turbo/search-area?q=...
 * ╪¿╪¡╪½ ┘å╪╡┘è ╪░┘â┘è ╪╣┘å ╪º┘ä┘à┘å╪╖┘é╪⌐ ╪╣╪¿╪▒ ┘â┘ä ┘à╪¡╪º┘ü╪╕╪º╪¬/┘à┘å╪º╪╖┘é ╪┤╪▒┘â╪⌐ ╪º┘ä╪┤╪¡┘å
 */
router.get('/search-area', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.searchAreaByText);

/**
 * GET /api/turbo/reports/shipping
 * ╪¼┘ä╪¿ ╪¬┘é╪▒┘è╪▒ ╪º┘ä╪┤╪¡┘å
 */
const turboReportController = require('../controller/turboReportController');
router.get('/reports/shipping', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.getShippingReport);
router.patch('/reports/shipping/cost', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.updateManualCost);
router.post('/reports/shipping/bulk-cost', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.bulkUpdateManualCost);
router.get('/reports/shipping/governorate-costs', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.getGovernorateCosts);
router.put('/reports/shipping/governorate-costs', verifyToken.authenticateToken, checkAppAccess('order-shipping-reports'), turboReportController.saveGovernorateCostsHandler);

/**
 * GET /api/turbo/branches
 * ╪¼┘ä╪¿ ┘ü╪▒┘ê╪╣ Turbo
 */
router.get('/records', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getRecords);
router.get('/branches', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getBranches);

/**
 * PUT /api/turbo/orders/:orderId/shipment
 * ╪¬╪¡╪»┘è╪½ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪┤╪¡┘å╪⌐
 */
router.put('/orders/:orderId/shipment', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.updateShipment);

/**
 * POST /api/turbo/tickets
 * ╪Ñ╪╢╪º┘ü╪⌐ ╪¬╪░┘â╪▒╪⌐ ╪»╪╣┘à ╪Ñ┘ä┘ë Turbo
 */
router.post('/tickets', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.addTicket);

/**
 * GET /api/turbo/inquiries-types
 * ╪¼┘ä╪¿ ╪ú┘å┘ê╪º╪╣ ╪º┘ä╪º╪│╪¬┘ü╪│╪º╪▒╪º╪¬ ┘à┘å Turbo
 * ┘è╪»╪╣┘à POST ┘ê GET
 */
router.get('/inquiries-types', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getInquiriesTypes);
router.post('/inquiries-types', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getInquiriesTypes);

/**
 * GET /api/turbo/tickets/unread-count
 * ╪¼┘ä╪¿ ╪╣╪»╪» ╪º┘ä╪¬╪░╪º┘â╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘é╪▒┘ê╪í╪⌐ ┘à┘å Turbo
 * ┘è╪¼╪¿ ╪ú┘å ┘è╪ú╪¬┘è ┘é╪¿┘ä /tickets/:id ┘ä╪¬╪¼┘å╪¿ ╪º┘ä╪¬╪╖╪º╪¿┘é ╪º┘ä╪«╪º╪╖╪ª
 */
router.get('/tickets/unread-count', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getUnreadTicketsCount);

/**
 * GET /api/turbo/tickets/:id/log
 * ╪¼┘ä╪¿ ╪│╪¼┘ä ╪º┘ä╪¬╪░┘â╪▒╪⌐ ┘à┘å Turbo
 * ┘è╪¼╪¿ ╪ú┘å ┘è╪ú╪¬┘è ┘é╪¿┘ä /tickets/:id ┘ä╪¬╪¼┘å╪¿ ╪º┘ä╪¬╪╖╪º╪¿┘é ╪º┘ä╪«╪º╪╖╪ª
 */
router.get('/tickets/:id/log', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getTicketLog);

/**
 * POST /api/turbo/tickets/:id/reply
 * ╪º┘ä╪▒╪» ╪╣┘ä┘ë ╪¬╪░┘â╪▒╪⌐ ┘ü┘è Turbo
 * ┘è╪¼╪¿ ╪ú┘å ┘è╪ú╪¬┘è ┘é╪¿┘ä /tickets/:id ┘ä╪¬╪¼┘å╪¿ ╪º┘ä╪¬╪╖╪º╪¿┘é ╪º┘ä╪«╪º╪╖╪ª
 */
router.post('/tickets/:id/reply', verifyToken.authenticateToken, upload.single('image'), checkAppAccess('order-shipping-turbo'), turboController.replyToTicket);

/**
 * GET /api/turbo/tickets/:id
 * ╪¼┘ä╪¿ ╪¬┘ü╪º╪╡┘è┘ä ╪¬╪░┘â╪▒╪⌐ ┘à╪╣┘è┘å╪⌐ ┘à┘å Turbo
 */
router.get('/tickets/:id', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getTicket);

/**
 * GET /api/turbo/tickets
 * ╪¼┘ä╪¿ ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪¬╪░╪º┘â╪▒ ┘à┘å Turbo
 */
router.get('/tickets', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), turboController.getTickets);

/**
 * GET /api/turbo/captains/stats
 * ╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬ ╪º┘ä┘à┘å╪»┘ê╪¿┘è┘å - ┘å╪│╪¿ ╪º┘ä╪¬╪│┘ä┘è┘à ┘ê╪º┘ä┘à╪▒╪¬╪¼╪╣╪º╪¬
 */
const captainStatsController = require('../controller/turbo/captainStatsController');
router.get('/captains/stats', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), captainStatsController.getCaptainStats);
router.get('/captains/:name/orders', verifyToken.authenticateToken, checkAppAccess('order-shipping-turbo'), captainStatsController.getCaptainOrders);

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

    // Test both API endpoints with search_key (lowercase k)
    for (const [label, url] of [['backoffice', backofficeUrl], ['platform', platformUrl]]) {
      try {
        const r = await axios.post(`${url}/search-order`, { authentication_key: apiKey, main_client_code: clientCode, search_key: code }, { timeout: 15000 });
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

/**
 * GET /api/turbo/debug/ghost-orders
 * Find processing orders NOT in current Turbo get-status (likely delivered/returned without webhook)
 */
router.get('/debug/ghost-orders', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
    const { syncTurboStatusToOrder } = require('../services/turboStatusSyncService');
    const axios = require('axios');
    const prisma = getSharedPrismaClient();
    const company = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboApiKey: true, turboMainClientCode: true } }), 2);
    if (!company?.turboApiKey) return res.json({ error: 'No turbo API key' });

    const apiKey = company.turboApiKey;
    const clientCode = company.turboMainClientCode || 37321;
    const from = new Date(Date.now() - 180*24*60*60*1000).toISOString().split('T')[0];
    const to = new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0];

    // 1. Get current active orders from Turbo API
    const getstatus = await axios.post('https://backoffice.turbo-eg.com/external-api/get-status', { authentication_key: apiKey, main_client_code: clientCode, from, to }, { timeout: 20000 });
    const activeInTurbo = new Set((getstatus.data?.data || []).map(s => String(s.code)));
    const activeDistribution = {};
    (getstatus.data?.data || []).forEach(s => { const k = `${s.status_code}(${s.status})`; activeDistribution[k] = (activeDistribution[k]||0)+1; });

    // 2. Get ALL active orders in MaxP
    const activeOrders = await safeQuery(() => prisma.order.findMany({
      where: { companyId, turboShipmentStatus: { in: ['processing', 'out_for_delivery', 'turbo_sent'] }, turboShipmentId: { not: null } },
      select: { id: true, orderNumber: true, turboShipmentId: true, turboShipmentStatus: true, createdAt: true }
    }), 2);

    // 3. Identify ghost orders = in MaxP as active but NOT in Turbo get-status
    const ghostOrders = activeOrders.filter(o => !activeInTurbo.has(String(o.turboShipmentId)));
    const trueActive = activeOrders.filter(o => activeInTurbo.has(String(o.turboShipmentId)));

    // 4. Handle fix actions
    const fix = req.query.fix === 'true';
    const action = req.query.action; // 'mark_delivered' | 'mark_returned'
    const fixResults = [];
    const ghostProcessing = ghostOrders.filter(o => o.turboShipmentStatus === 'processing');
    
    // Action: mark_delivered or mark_returned ΓÇö bulk update ghost processing orders
    if ((action === 'mark_delivered' || action === 'mark_returned') && ghostProcessing.length > 0) {
      const newStatus = action === 'mark_delivered' ? 'delivered' : 'returned_to_company';
      const turboStatus = action === 'mark_delivered' ? '7' : '5';
      let updated = 0;
      for (const o of ghostProcessing) {
        try {
          await syncTurboStatusToOrder({ orderId: o.id, orderNumber: o.orderNumber, companyId, rawStatus: turboStatus, payload: { source: 'ghost_bulk_fix', action } }).catch(() => {});
          fixResults.push({ orderNumber: o.orderNumber, turboCode: o.turboShipmentId, action: `ΓåÆ ${newStatus}` });
          updated++;
        } catch(e) { fixResults.push({ orderNumber: o.orderNumber, error: e.message }); }
      }
      fixResults.unshift({ __summary: `${updated}/${ghostProcessing.length} ghost processing orders marked as ${newStatus}` });
    }
    
    // Action: try platform API for each ghost processing order
    if (fix && ghostProcessing.length > 0) {
      for (const o of ghostProcessing.slice(0, 20)) {
        try {
          const sr = await axios.post('https://platform.turbo.info/external-api/search-order', { authentication_key: apiKey, main_client_code: clientCode, search_key: o.turboShipmentId }, { timeout: 10000 });
          const d2 = sr.data?.data?.[0];
          if (d2 && d2.status_code) {
            fixResults.push({ code: o.turboShipmentId, orderNumber: o.orderNumber, found: true, status_code: d2.status_code, status: d2.status });
            await syncTurboStatusToOrder({ orderId: o.id, orderNumber: o.orderNumber, companyId, rawStatus: String(d2.status_code), payload: { ...d2, source: 'ghost_fix' } }).catch(() => {});
          } else {
            fixResults.push({ code: o.turboShipmentId, orderNumber: o.orderNumber, found: false, note: '404' });
          }
        } catch(e) { fixResults.push({ code: o.turboShipmentId, orderNumber: o.orderNumber, found: false, note: e.message }); }
        await new Promise(r => setTimeout(r, 200));
      }
    }


    res.json({
      summary: {
        turboActiveCount: activeInTurbo.size,
        turboDistribution: activeDistribution,
        maxpActiveCount: activeOrders.length,
        ghostCount: ghostOrders.length,
        ghostProcessing: ghostProcessing.length,
        ghostTurboSent: ghostOrders.filter(o=>o.turboShipmentStatus==='turbo_sent').length,
        trueActiveCount: trueActive.length,
      },
      ghostOrders: ghostOrders.map(o => ({ orderNumber: o.orderNumber, turboCode: o.turboShipmentId, status: o.turboShipmentStatus, createdAt: o.createdAt })),
      fixResults: fix ? fixResults : 'Pass ?fix=true to attempt fixing ghost processing orders'
    });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;


