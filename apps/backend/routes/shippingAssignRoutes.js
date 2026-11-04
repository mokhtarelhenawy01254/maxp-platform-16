/**
 * Shipping Auto-Assignment Routes (SHIP-W8)
 * Endpoints for suggesting, applying, and automating courier assignments.
 * Prefix: /api/v1/shipping-assign
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const autoAssignService = require('../services/shipping/autoAssignService');

router.use(verifyToken.authenticateToken);

const OPEN_LOAD_STATUSES = ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PENDING', 'ASSIGNED'];

/**
 * GET /couriers
 * Returns active, non-off-duty couriers for the company with their parsed zones & current load
 */
router.get('/couriers', async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;

    const couriers = await prisma.courier.findMany({
      where: {
        companyId,
        isActive: true,
        status: { not: 'OFF_DUTY' },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        vehicleType: true,
        plateNumber: true,
        governorates: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    const courierIds = couriers.map((c) => c.id);
    const loadCounts = await prisma.shipment.groupBy({
      by: ['courierId'],
      where: {
        companyId,
        courierId: { in: courierIds },
        status: { in: OPEN_LOAD_STATUSES },
      },
      _count: { id: true },
    });

    const loadMap = new Map();
    loadCounts.forEach((item) => {
      if (item.courierId) {
        loadMap.set(item.courierId, item._count.id || 0);
      }
    });

    const data = couriers.map((c) => ({
      ...c,
      zones: autoAssignService.parseCourierGovernorates(c.governorates),
      currentLoad: loadMap.get(c.id) || 0,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('[shippingAssignRoutes] GET /couriers error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في استرجاع المناديب',
      code: error.code || 'COURIERS_FETCH_ERROR',
    });
  }
});

/**
 * POST /suggest
 * Generates assignment preview without committing database changes
 */
router.post('/suggest', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { shipmentIds, filters, strategy, date, governorate } = req.body || {};

    const result = await autoAssignService.suggest({
      companyId,
      shipmentIds,
      filters,
      strategy,
      date,
      governorate,
    });

    return res.json({
      success: true,
      assignments: result.assignments,
      unassigned: result.unassigned,
      failed: result.failed || result.unassigned,
      assignedCount: result.assignedCount ?? result.assignments.length,
      failedCount: result.failedCount ?? result.unassigned.length,
      totalSuggested: result.assignments.length,
      totalUnassigned: result.unassigned.length,
    });
  } catch (error) {
    console.error('[shippingAssignRoutes] POST /suggest error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في اقتراح توزيع الشحنات',
      code: error.code || 'SUGGEST_ASSIGNMENT_ERROR',
    });
  }
});

/**
 * POST /apply
 * Commits courier assignments, creates/updates DRAFT runs, and writes timeline events
 */
router.post('/apply', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id || req.user.userId || null;
    const { assignments, unassigned, failed, shipmentIds } = req.body || {};

    if (!assignments && !shipmentIds && !unassigned && !failed) {
      return res.status(400).json({
        success: false,
        message: 'قائمة التعيينات (assignments) مطلوبة',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await autoAssignService.apply({
      companyId,
      assignments: Array.isArray(assignments) ? assignments : [],
      unassigned: Array.isArray(unassigned) ? unassigned : [],
      failed: Array.isArray(failed) ? failed : [],
      shipmentIds: Array.isArray(shipmentIds) ? shipmentIds : undefined,
      userId,
    });

    return res.json(result);
  } catch (error) {
    console.error('[shippingAssignRoutes] POST /apply error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في تطبيق تعيينات الشحنات',
      code: error.code || 'APPLY_ASSIGNMENT_ERROR',
    });
  }
});

/**
 * POST /auto
 * Recommends and immediately applies courier assignments in one step
 */
router.post('/auto', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id || req.user.userId || null;
    const { date, governorate, strategy } = req.body || {};

    const result = await autoAssignService.autoAssign({
      companyId,
      date,
      governorate,
      strategy,
      userId,
    });

    return res.json(result);
  } catch (error) {
    console.error('[shippingAssignRoutes] POST /auto error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'فشل في التعيين التلقائي للشحنات',
      code: error.code || 'AUTO_ASSIGNMENT_ERROR',
    });
  }
});

module.exports = router;
