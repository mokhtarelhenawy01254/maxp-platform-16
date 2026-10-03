const courierService = require('../services/courierService');

const getCompanyId = (req) =>
  req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

/**
 * GET /api/v1/couriers/dashboard-summary
 */
async function getSummary(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const summary = await courierService.getCourierDashboardSummary(companyId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in getSummary:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل ملخص المناديب' });
  }
}

/**
 * GET /api/v1/couriers
 */
async function listCouriers(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { search, status, isActive } = req.query;
    const couriers = await courierService.listCouriers(companyId, {
      search,
      status,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      // A field courier may only ever see their own record
      restrictToCourierId: req.user?.role === 'COURIER' ? req.user?.courierId : undefined
    });

    res.json({ success: true, data: couriers });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in listCouriers:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل قائمة المناديب' });
  }
}

/**
 * GET /api/v1/couriers/:id
 */
async function getCourier(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const courier = await courierService.getCourierById(companyId, req.params.id);
    if (!courier) {
      return res.status(404).json({ success: false, message: 'المندوب غير موجود' });
    }

    res.json({ success: true, data: courier });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in getCourier:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل بيانات المندوب' });
  }
}

/**
 * POST /api/v1/couriers
 */
async function createCourier(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { name, phone, nationalId, vehicleType, plateNumber, governorates, commissionType, commissionAmount, notes } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم المندوب مطلوب' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'رقم هاتف المندوب مطلوب' });
    }

    const courier = await courierService.createCourier(companyId, {
      name,
      phone,
      nationalId,
      vehicleType,
      plateNumber,
      governorates,
      commissionType,
      commissionAmount,
      notes
    });

    res.status(201).json({ success: true, data: courier });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in createCourier:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر حفظ بيانات المندوب' });
  }
}

/**
 * PUT /api/v1/couriers/:id
 */
async function updateCourier(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    await courierService.updateCourier(companyId, req.params.id, req.body || {});
    res.json({ success: true, message: 'تم تحديث بيانات المندوب بنجاح' });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in updateCourier:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحديث المندوب' });
  }
}

/**
 * DELETE /api/v1/couriers/:id
 */
async function deleteCourier(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    await courierService.deleteCourier(companyId, req.params.id);
    res.json({ success: true, message: 'تم حذف المندوب بنجاح' });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in deleteCourier:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر حذف المندوب' });
  }
}

/**
 * POST /api/v1/couriers/runs
 * Create a delivery run (Dispatch Manifest)
 */
async function createRun(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { courierId, shipmentIds, orderIds, notes } = req.body || {};
    if (!courierId) {
      return res.status(400).json({ success: false, message: 'حدد المندوب المستلم للمأمورية' });
    }

    const run = await courierService.createDeliveryRun(companyId, {
      courierId,
      shipmentIds,
      orderIds,
      notes,
      userId: req.user?.id
    });

    res.status(201).json({ success: true, data: run });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in createRun:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر إنشاء مأمورية التوصيل' });
  }
}

/**
 * GET /api/v1/couriers/runs
 */
async function listRuns(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { courierId, status, dateFrom, dateTo, search, page, limit } = req.query;
    const result = await courierService.listDeliveryRuns(companyId, {
      // A courier token is scoped to its own runs regardless of query params
      courierId: req.user?.role === 'COURIER' ? req.user?.courierId : courierId,
      status,
      dateFrom,
      dateTo,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in listRuns:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل مأموريات التوصيل' });
  }
}

/**
 * GET /api/v1/couriers/runs/:id
 */
async function getRun(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const run = await courierService.getDeliveryRunById(companyId, req.params.id);
    if (!run) {
      return res.status(404).json({ success: false, message: 'مأمورية التوصيل غير موجودة' });
    }

    // Field couriers may only open their own runs
    if (req.user?.role === 'COURIER' && run.courierId !== req.user?.courierId) {
      return res.status(403).json({ success: false, message: 'لا يمكن عرض مأمورية تابعة لمندوب آخر' });
    }

    res.json({ success: true, data: run });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in getRun:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل تفاصيل المأمورية' });
  }
}

/**
 * PATCH /api/v1/couriers/runs/:runId/shipments/:shipmentId
 * Field status update from courier
 */
async function updateShipmentStatus(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { status, collectedAmount, deliveryNotes } = req.body || {};
    if (!status) {
      return res.status(400).json({ success: false, message: 'حالة التسليم مطلوبة' });
    }

    const updatedShipment = await courierService.updateDeliveryRunShipment(companyId, {
      shipmentId: req.params.shipmentId,
      runId: req.params.runId,
      status,
      collectedAmount,
      deliveryNotes,
      pin: req.body?.pin,
      userId: req.user?.id,
      // Field couriers may only update shipments assigned to them
      courierId: req.user?.role === 'COURIER' ? req.user?.courierId : undefined
    });

    res.json({ success: true, data: updatedShipment });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in updateShipmentStatus:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر تحديث حالة الشحنة' });
  }
}

/**
 * POST /api/v1/couriers/runs/:id/settle
 * End-of-Day Financial Remittance to Treasury
 */
async function settleRun(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { treasuryAccountId, actualCashReceived, notes } = req.body || {};

    const result = await courierService.settleDeliveryRun(companyId, req.params.id, {
      treasuryAccountId,
      actualCashReceived,
      notes,
      userId: req.user?.id
    });

    res.json({ success: true, data: result, message: 'تمت تسوية الوردية وتوريد النقدية بنجاح' });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in settleRun:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر إتمام التسوية والتوريد' });
  }
}

/**
 * GET /api/v1/couriers/runs/:id/share-link
 */
async function getRunShareLink(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const run = await courierService.getDeliveryRunById(companyId, req.params.id);
    if (!run) {
      return res.status(404).json({ success: false, message: 'مأمورية التوصيل غير موجودة' });
    }

    res.json({
      success: true,
      data: {
        runId: run.id,
        runNumber: run.runNumber,
        mobileToken: run.mobileToken,
        shareUrl: `/courier/run/${run.id}${run.mobileToken ? `?token=${run.mobileToken}` : ''}`,
        courierPhone: run.courier?.phone,
        courierName: run.courier?.name
      }
    });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in getRunShareLink:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر إنشاء رابط المندوب' });
  }
}

/**
 * PUT /api/v1/couriers/:id/pin
 * Set or clear a courier's field PIN (managers only)
 */
async function setCourierPin(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const result = await courierService.setCourierPin(companyId, req.params.id, req.body?.pin);
    res.json({ success: true, data: result, message: result.pinSet ? 'تم تعيين رمز PIN للمندوب' : 'تم إلغاء رمز PIN' });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in setCourierPin:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر تعيين رمز PIN' });
  }
}

/**
 * GET /api/v1/couriers/commissions
 * Courier commission ledger: per-courier DUE/PAID totals + entries
 */
async function listCommissions(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { courierId, status, page, limit } = req.query;
    const result = await courierService.listCourierCommissions(companyId, {
      courierId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in listCommissions:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر تحميل مستحقات المناديب' });
  }
}

/**
 * POST /api/v1/couriers/commissions/:courierId/pay
 * Pay out a courier's DUE commissions (optionally through a treasury account)
 */
async function payCommissions(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { treasuryAccountId, notes } = req.body || {};
    const result = await courierService.payCourierCommissions(companyId, req.params.courierId, {
      treasuryAccountId,
      notes,
      userId: req.user?.id
    });

    res.json({ success: true, data: result, message: `تم صرف مستحقات ${result.courierName} بنجاح` });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in payCommissions:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر صرف المستحقات' });
  }
}

/**
 * GET /api/v1/couriers/performance
 * Time-ranged courier performance report
 */
async function getPerformance(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { from, to } = req.query;
    const result = await courierService.getCouriersPerformance(companyId, { from, to });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in getPerformance:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر تحميل تقرير الأداء' });
  }
}

module.exports = {
  getSummary,
  listCouriers,
  getCourier,
  createCourier,
  updateCourier,
  deleteCourier,
  setCourierPin,
  createRun,
  listRuns,
  getRun,
  getRunShareLink,
  updateShipmentStatus,
  settleRun,
  listCommissions,
  payCommissions,
  getPerformance
};
