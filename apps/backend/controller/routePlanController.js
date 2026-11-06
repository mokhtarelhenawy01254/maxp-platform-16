const routePlanService = require('../services/routePlanService');

async function createRoutePlan(req, res) {
  try {
    const { companyId } = req.user;
    const userId = req.user.id || req.user.userId;
    const { name, planDate, branchId, governorate, suggestShipments } = req.body || {};

    const plan = await routePlanService.createRoutePlan(companyId, {
      name,
      planDate,
      branchId,
      governorate,
      suggestShipments: suggestShipments !== false,
      userId
    });

    return res.status(201).json({
      success: true,
      data: plan,
      plan,
      message: 'تم إنشاء خط السير بنجاح'
    });
  } catch (error) {
    console.error('[RoutePlanController] createRoutePlan error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'فشل في إنشاء خط السير',
      code: error.code || 'ROUTE_PLAN_CREATE_ERROR'
    });
  }
}

async function addStops(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { shipmentIds, stops } = req.body || {};

    const updatedPlan = await routePlanService.addStopsToPlan(companyId, id, {
      shipmentIds,
      stops
    });

    return res.status(200).json({
      success: true,
      data: updatedPlan,
      plan: updatedPlan,
      message: 'تمت إضافة الوقفات إلى خط السير'
    });
  } catch (error) {
    console.error('[RoutePlanController] addStops error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'فشل في إضافة الوقفات',
      code: error.code || 'ROUTE_PLAN_STOPS_ERROR'
    });
  }
}

async function reorderStops(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { stops, auto } = req.body || {};

    const reorderedStops = await routePlanService.reorderStops(companyId, id, {
      stops,
      auto: Boolean(auto)
    });

    return res.status(200).json({
      success: true,
      data: reorderedStops,
      stops: reorderedStops,
      message: 'تم إعادة ترتيب الوقفات بنجاح'
    });
  } catch (error) {
    console.error('[RoutePlanController] reorderStops error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'فشل في إعادة ترتيب الوقفات',
      code: error.code || 'ROUTE_PLAN_REORDER_ERROR'
    });
  }
}

async function assignCourier(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { courierId } = req.body || {};

    const updatedPlan = await routePlanService.assignCourierToPlan(companyId, id, {
      courierId
    });

    return res.status(200).json({
      success: true,
      data: updatedPlan,
      plan: updatedPlan,
      message: 'تم إسناد المندوب لخط السير بنجاح'
    });
  } catch (error) {
    console.error('[RoutePlanController] assignCourier error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'فشل في إسناد المندوب',
      code: error.code || 'ROUTE_PLAN_ASSIGN_ERROR'
    });
  }
}

async function dispatchPlan(req, res) {
  try {
    const { companyId } = req.user;
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    const { notes } = req.body || {};

    const result = await routePlanService.dispatchRoutePlan(companyId, id, {
      userId,
      notes
    });

    return res.status(200).json({
      success: true,
      data: result,
      plan: result.plan,
      deliveryRun: result.deliveryRun,
      message: 'تم تحويل خط السير إلى رحلة توزيع بنجاح'
    });
  } catch (error) {
    console.error('[RoutePlanController] dispatchPlan error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'فشل في تحويل خط السير إلى رحلة',
      code: error.code || 'ROUTE_PLAN_DISPATCH_ERROR'
    });
  }
}

async function listRoutePlans(req, res) {
  try {
    const { companyId } = req.user;
    const { date, status, courierId, page, limit } = req.query;

    const result = await routePlanService.listRoutePlans(companyId, {
      date,
      status,
      courierId,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[RoutePlanController] listRoutePlans error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب خطط السير'
    });
  }
}

async function getRoutePlan(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const plan = await routePlanService.getRoutePlanById(companyId, id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'خط السير غير موجود',
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: plan,
      plan
    });
  } catch (error) {
    console.error('[RoutePlanController] getRoutePlan error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل في جلب تفاصيل خط السير'
    });
  }
}

module.exports = {
  createRoutePlan,
  addStops,
  reorderStops,
  assignCourier,
  dispatchPlan,
  listRoutePlans,
  getRoutePlan
};
