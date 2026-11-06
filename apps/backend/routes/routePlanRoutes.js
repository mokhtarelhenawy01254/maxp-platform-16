const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const routePlanController = require('../controller/routePlanController');

router.use(verifyToken.authenticateToken);

/**
 * @route POST /api/v1/route-plans
 * @desc Create a new route plan with optional suggested pending shipments
 */
router.post('/', routePlanController.createRoutePlan);

/**
 * @route GET /api/v1/route-plans
 * @desc List route plans by date, status, or courier
 */
router.get('/', routePlanController.listRoutePlans);

/**
 * @route GET /api/v1/route-plans/:id
 * @desc Get route plan details with stops sorted by seq
 */
router.get('/:id', routePlanController.getRoutePlan);

/**
 * @route POST /api/v1/route-plans/:id/stops
 * @desc Add stops (from shipmentIds or manual stops) to a plan; 409 if shipment already in active plan
 */
router.post('/:id/stops', routePlanController.addStops);

/**
 * @route PATCH /api/v1/route-plans/:id/stops/reorder
 * @desc Reorder stops manually or automatically by governorate/city
 */
router.patch('/:id/stops/reorder', routePlanController.reorderStops);

/**
 * @route PATCH /api/v1/route-plans/:id/assign
 * @desc Assign courier with capacity and coverage validation
 */
router.patch('/:id/assign', routePlanController.assignCourier);

/**
 * @route POST /api/v1/route-plans/:id/dispatch
 * @desc Dispatch route plan into a DeliveryRun
 */
router.post('/:id/dispatch', routePlanController.dispatchPlan);

module.exports = router;
