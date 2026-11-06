const courierService = require('../services/courierService');
const courierPayrollService = require('../services/courierPayrollService');

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

const KNOWN_COURIER_FIELDS = new Set([
  'name',
  'phone',
  'nationalId',
  'vehicleType',
  'plateNumber',
  'governorate',
  'governorates',
  'commissionType',
  'commissionAmount',
  'isActive',
  'status',
  'notes',
  'userId',
  'pin',
  'pinHash'
]);

/**
 * POST /api/v1/couriers
 */
async function createCourier(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const rawBody = req.body || {};
    const unknownFields = Object.keys(rawBody).filter((k) => !KNOWN_COURIER_FIELDS.has(k));
    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'حقول غير معروفة في جسم الطلب: ' + unknownFields.join(', '),
        unknownFields,
        code: 'UNKNOWN_FIELDS'
      });
    }

    // Resolve governorate (alias) vs governorates (governorates wins if both provided)
    let resolvedGovernorates = undefined;
    if (rawBody.governorates !== undefined) {
      resolvedGovernorates = rawBody.governorates;
    } else if (rawBody.governorate !== undefined) {
      resolvedGovernorates = Array.isArray(rawBody.governorate) ? rawBody.governorate : [rawBody.governorate];
    }

    // Allow default name and phone for minimal payloads e.g. { governorate: 'الدقهلية' }
    const name = rawBody.name?.trim() || (resolvedGovernorates ? ('مندوب ' + (Array.isArray(resolvedGovernorates) ? resolvedGovernorates.join(' - ') : resolvedGovernorates)) : 'مندوب جديد');
    const phone = rawBody.phone?.trim() || ('01' + Math.floor(100000000 + Math.random() * 900000000));

    const courier = await courierService.createCourier(companyId, {
      name,
      phone,
      nationalId: rawBody.nationalId,
      vehicleType: rawBody.vehicleType,
      plateNumber: rawBody.plateNumber,
      governorates: resolvedGovernorates,
      commissionType: rawBody.commissionType,
      commissionAmount: rawBody.commissionAmount,
      isActive: rawBody.isActive,
      status: rawBody.status,
      notes: rawBody.notes,
      userId: rawBody.userId
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

    const rawBody = req.body || {};
    const unknownFields = Object.keys(rawBody).filter((k) => !KNOWN_COURIER_FIELDS.has(k));
    if (unknownFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'حقول غير معروفة في جسم الطلب: ' + unknownFields.join(', '),
        unknownFields,
        code: 'UNKNOWN_FIELDS'
      });
    }

    const updatePayload = { ...rawBody };
    if (rawBody.governorates !== undefined) {
      updatePayload.governorates = rawBody.governorates;
    } else if (rawBody.governorate !== undefined) {
      updatePayload.governorates = Array.isArray(rawBody.governorate) ? rawBody.governorate : [rawBody.governorate];
    }
    delete updatePayload.governorate;

    await courierService.updateCourier(companyId, req.params.id, updatePayload);
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
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر إنشاء مأمورية التوصيل', code: error.code });
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
      otp: req.body?.otp,
      failureReasonCode: req.body?.failureReasonCode,
      nextAttemptDate: req.body?.nextAttemptDate,
      userId: req.user?.id,
      // Field couriers may only update shipments assigned to them
      courierId: req.user?.role === 'COURIER' ? req.user?.courierId : undefined
    });

    res.json({ success: true, data: updatedShipment });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in updateShipmentStatus:', error);
    res.status(error.statusCode || 500).json({ success: false, code: error.code || 'UPDATE_ERROR', message: error.message || 'تعذر تحديث حالة الشحنة' });
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
 * POST /api/v1/couriers/runs/:id/revoke-link
 */
async function revokeRunLink(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const result = await courierService.revokeDeliveryRunLink(companyId, req.params.id);
    res.json({
      success: true,
      data: result,
      message: 'تم إلغاء صلاحية الروابط السابقة للمأمورية بنجاح'
    });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in revokeRunLink:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'تعذر إلغاء صلاحية رابط المأمورية'
    });
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

/**
 * POST /api/v1/couriers/shipments/reassign
 * Move internal-courier shipments to another active courier (managers only)
 */
async function reassignShipments(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const { shipmentIds, toCourierId } = req.body || {};
    const result = await courierService.reassignShipments(companyId, {
      shipmentIds,
      toCourierId,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result,
      message: `تم إعادة إسناد ${result.moved} طرد إلى ${result.toCourier.name}`
    });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in reassignShipments:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر إعادة الإسناد' });
  }
}

/**
 * POST /api/v1/couriers/shipments/:shipmentId/resend-otp
 * Regenerate + resend the delivery OTP (managers) — the escape hatch when the
 * WhatsApp message failed and the courier is locked out of delivering.
 */
async function resendOtp(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    }

    const result = await courierService.resendShipmentOtp(companyId, {
      shipmentId: req.params.shipmentId,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result,
      message: result.sent
        ? 'تم إرسال كود استلام جديد للعميل على واتساب'
        : `تعذر إرسال الرسالة (${result.reason}) — الكود الجديد صالح لكن وصل العميل غير مضمون، تأكد من جلسة الواتساب`
    });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in resendOtp:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر إعادة إرسال كود الاستلام' });
  }
}

// Document handlers
async function uploadDocument(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const courierId = req.params.id;
    const file = req.file;
    const { type, expiryDate, notes } = req.body;

    const result = await courierService.uploadCourierDocument(
      companyId,
      courierId,
      { file, type, expiryDate, notes },
      req.user?.id
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in uploadDocument:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر رفع المستند' });
  }
}

async function listDocuments(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const courierId = req.params.id;
    const result = await courierService.listCourierDocuments(companyId, courierId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in listDocuments:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر جلب المستندات' });
  }
}

async function updateDocumentStatus(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const courierId = req.params.id;
    const docId = req.params.docId;
    const { status, notes } = req.body;

    const result = await courierService.updateCourierDocumentStatus(
      companyId,
      courierId,
      docId,
      { status, notes },
      req.user?.id
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in updateDocumentStatus:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر تحديث حالة المستند' });
  }
}

async function deleteDocument(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const courierId = req.params.id;
    const docId = req.params.docId;

    const result = await courierService.deleteCourierDocument(companyId, courierId, docId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in deleteDocument:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر حذف المستند' });
  }
}

// Payroll handlers
async function runPayroll(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const month = req.query.month || req.body?.month;
    const result = await courierPayrollService.runMonthlyPayroll(companyId, month, req.user?.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in runPayroll:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر تشغيل مسير الرواتب' });
  }
}

async function listPayroll(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const month = req.query.month;
    const result = await courierPayrollService.listMonthlyPayroll(companyId, month);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in listPayroll:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر جلب مسير الرواتب' });
  }
}

async function approvePayroll(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const payrollId = req.params.id;
    const result = await courierPayrollService.approvePayroll(companyId, payrollId, req.user?.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in approvePayroll:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر اعتماد مسير الراتب' });
  }
}

async function payPayroll(req, res) {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });

    const payrollId = req.params.id;
    const { treasuryAccountId, notes } = req.body || {};
    const result = await courierPayrollService.payPayroll(companyId, payrollId, { treasuryAccountId, notes }, req.user?.id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in payPayroll:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'تعذر صرف مسير الراتب' });
  }
}

async function previewCompensation(req, res) {
  try {
    const calc = courierPayrollService.computeCompensation(req.body || {});
    res.json({ success: true, data: calc });
  } catch (error) {
    console.error('❌ [COURIER-CTRL] Error in previewCompensation:', error);
    res.status(500).json({ success: false, message: error.message });
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
  getPerformance,
  reassignShipments,
  resendOtp,
  revokeRunLink,
  uploadDocument,
  listDocuments,
  updateDocumentStatus,
  deleteDocument,
  runPayroll,
  listPayroll,
  approvePayroll,
  payPayroll,
  previewCompensation
};
