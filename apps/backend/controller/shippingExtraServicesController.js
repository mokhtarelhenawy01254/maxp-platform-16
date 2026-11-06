/**
 * Shipping Extra Services, Package Open Requests & Order Change Requests Controller (SHIP-T3)
 */

const extraServicesService = require('../services/shipping/extraServicesService');

function getCompanyId(req) {
  return req.user?.companyId;
}

function getUserInfo(req) {
  return {
    userId: req.user?.id,
    userName: req.user?.name || req.user?.username || 'User',
    role: req.user?.role,
  };
}

/**
 * ============================================================================
 * Services CRUD
 * ============================================================================
 */

async function listServices(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { appliesTo, isActive, search } = req.query;
    const services = await extraServicesService.listServices({
      companyId,
      appliesTo,
      isActive,
      search,
    });
    return res.json({ success: true, data: services });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_ERROR',
      message: error.message || 'حدث خطأ أثناء جلب الخدمات الإضافية',
    });
  }
}

async function createService(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { code, name, description, pricingMode, amount, appliesTo, isActive } = req.body;
    const service = await extraServicesService.createService({
      companyId,
      code,
      name,
      description,
      pricingMode,
      amount,
      appliesTo,
      isActive,
    });
    return res.status(201).json({
      success: true,
      data: service,
      message: 'تم إنشاء الخدمة الإضافية بنجاح',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_ERROR',
      message: error.message || 'حدث خطأ أثناء إنشاء الخدمة الإضافية',
    });
  }
}

async function getServiceById(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const service = await extraServicesService.getServiceById({ companyId, id });
    return res.json({ success: true, data: service });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_ERROR',
      message: error.message || 'حدث خطأ أثناء جلب الخدمة',
    });
  }
}

async function updateService(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const service = await extraServicesService.updateService({
      companyId,
      id,
      data: req.body,
    });
    return res.json({
      success: true,
      data: service,
      message: 'تم تحديث الخدمة الإضافية بنجاح',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_ERROR',
      message: error.message || 'حدث خطأ أثناء تحديث الخدمة',
    });
  }
}

async function deleteService(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    await extraServicesService.deleteService({ companyId, id });
    return res.json({
      success: true,
      message: 'تم حذف / تعطيل الخدمة بنجاح',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_ERROR',
      message: error.message || 'حدث خطأ أثناء حذف الخدمة',
    });
  }
}

/**
 * ============================================================================
 * Shipment Service Lines
 * ============================================================================
 */

async function addShipmentService(req, res) {
  try {
    const companyId = getCompanyId(req);
    const shipmentId = req.params.id || req.params.shipmentId;
    const { serviceId, name, amount, qty, pricingMode } = req.body;
    const { userId } = getUserInfo(req);

    const result = await extraServicesService.addShipmentServiceLine({
      companyId,
      shipmentId,
      serviceId,
      name,
      amount,
      qty,
      pricingMode,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      data: result.line,
      extraFees: result.extraFees,
      message: 'تمت إضافة بند الخدمة بنجاح',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_LINE_ERROR',
      message: error.message || 'حدث خطأ أثناء إضافة بند الخدمة',
    });
  }
}

async function listShipmentServices(req, res) {
  try {
    const companyId = getCompanyId(req);
    const shipmentId = req.params.id || req.params.shipmentId;
    const result = await extraServicesService.listShipmentServiceLines(shipmentId, companyId);
    return res.json({
      success: true,
      data: result.lines,
      extraFees: result.extraFees,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_LINE_ERROR',
      message: error.message || 'حدث خطأ أثناء جلب بنود الخدمة',
    });
  }
}

async function removeShipmentService(req, res) {
  try {
    const companyId = getCompanyId(req);
    const shipmentId = req.params.id || req.params.shipmentId;
    const lineId = req.params.lineId;

    const result = await extraServicesService.removeShipmentServiceLine({
      companyId,
      shipmentId,
      lineId,
    });

    return res.json({
      success: true,
      extraFees: result.extraFees,
      message: 'تم حذف بند الخدمة بنجاح',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'SERVICE_LINE_ERROR',
      message: error.message || 'حدث خطأ أثناء حذف بند الخدمة',
    });
  }
}

async function getAdditionalFees(req, res) {
  try {
    const companyId = getCompanyId(req);
    const shipmentId = req.query.shipmentId || req.params.id;

    if (shipmentId) {
      const result = await extraServicesService.listShipmentServiceLines(shipmentId, companyId);
      return res.json({
        success: true,
        data: result.lines,
        extraFees: result.extraFees,
      });
    }

    // List all available active services
    const services = await extraServicesService.listServices({
      companyId,
      isActive: true,
    });
    return res.json({ success: true, data: services });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب الرسوم الإضافية',
    });
  }
}

/**
 * ============================================================================
 * Package Open Requests
 * ============================================================================
 */

async function createPackageOpenRequest(req, res) {
  try {
    const companyId = getCompanyId(req);
    const shipmentId = req.params.id || req.params.shipmentId || req.body.shipmentId;
    const { reason, requestedByType = 'CLIENT' } = req.body;
    const { userName, userId } = getUserInfo(req);

    const request = await extraServicesService.createPackageOpenRequest({
      companyId,
      shipmentId,
      requestedBy: userName || userId,
      requestedByType,
      reason,
    });

    return res.status(201).json({
      success: true,
      data: request,
      message: 'تم إرسال طلب فتح الشحنة بنجاح (قيد المراجعة)',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'REQUEST_ERROR',
      message: error.message || 'حدث خطأ أثناء إنشاء طلب فتح الشحنة',
    });
  }
}

async function listPackageOpenRequests(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { status, shipmentId, page, limit } = req.query;

    const result = await extraServicesService.listPackageOpenRequests({
      companyId,
      status,
      shipmentId,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'REQUEST_ERROR',
      message: error.message || 'حدث خطأ أثناء جلب طلبات فتح الشحنات',
    });
  }
}

async function reviewPackageOpenRequest(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { decision, rejectionReason, fee } = req.body;
    const { userId, userName } = getUserInfo(req);

    const result = await extraServicesService.reviewPackageOpenRequest({
      companyId,
      requestId: id,
      decision,
      rejectionReason,
      fee,
      reviewerId: userId,
      reviewerName: userName,
    });

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'REQUEST_ERROR',
      message: error.message || 'حدث خطأ أثناء مراجعة طلب فتح الشحنة',
    });
  }
}

async function approvePackageOpenRequest(req, res) {
  req.body.decision = 'APPROVE';
  return reviewPackageOpenRequest(req, res);
}

async function rejectPackageOpenRequest(req, res) {
  req.body.decision = 'REJECT';
  return reviewPackageOpenRequest(req, res);
}

/**
 * ============================================================================
 * Order Change Requests
 * ============================================================================
 */

async function createOrderChangeRequest(req, res) {
  try {
    const companyId = getCompanyId(req);
    const shipmentId = req.params.id || req.params.shipmentId || req.body.shipmentId;
    const { type, newValue, reason, requestedByType = 'CLIENT' } = req.body;
    const { userName, userId } = getUserInfo(req);

    const request = await extraServicesService.createOrderChangeRequest({
      companyId,
      shipmentId,
      type,
      newValue,
      reason,
      requestedBy: userName || userId,
      requestedByType,
    });

    return res.status(201).json({
      success: true,
      data: request,
      message: 'تم إرسال طلب تعديل الشحنة بنجاح (قيد المراجعة)',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'CHANGE_REQUEST_ERROR',
      message: error.message || 'حدث خطأ أثناء إنشاء طلب التعديل',
    });
  }
}

async function listOrderChangeRequests(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { status, shipmentId, type, page, limit } = req.query;

    const result = await extraServicesService.listOrderChangeRequests({
      companyId,
      status,
      shipmentId,
      type,
      page,
      limit,
    });

    return res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'CHANGE_REQUEST_ERROR',
      message: error.message || 'حدث خطأ أثناء جلب طلبات تعديل الشحنات',
    });
  }
}

async function reviewOrderChangeRequest(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { decision, rejectionReason } = req.body;
    const { userId, userName } = getUserInfo(req);

    const result = await extraServicesService.reviewOrderChangeRequest({
      companyId,
      requestId: id,
      decision,
      rejectionReason,
      reviewerId: userId,
      reviewerName: userName,
    });

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || 'CHANGE_REQUEST_ERROR',
      message: error.message || 'حدث خطأ أثناء مراجعة طلب التعديل',
    });
  }
}

async function approveOrderChangeRequest(req, res) {
  req.body.decision = 'APPROVE';
  return reviewOrderChangeRequest(req, res);
}

async function rejectOrderChangeRequest(req, res) {
  req.body.decision = 'REJECT';
  return reviewOrderChangeRequest(req, res);
}

module.exports = {
  // Services
  listServices,
  createService,
  getServiceById,
  updateService,
  deleteService,
  // Shipment Service Lines
  addShipmentService,
  listShipmentServices,
  removeShipmentService,
  getAdditionalFees,
  // Package Open Requests
  createPackageOpenRequest,
  listPackageOpenRequests,
  reviewPackageOpenRequest,
  approvePackageOpenRequest,
  rejectPackageOpenRequest,
  // Order Change Requests
  createOrderChangeRequest,
  listOrderChangeRequests,
  reviewOrderChangeRequest,
  approveOrderChangeRequest,
  rejectOrderChangeRequest,
};
