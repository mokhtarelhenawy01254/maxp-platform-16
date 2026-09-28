const shiftService = require('../services/shiftService');

/**
 * 🔒 Close Shift with Handover Notes
 * POST /api/v1/shifts/close
 */
exports.closeShift = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { handoverNotes, pendingTasks, metricsSnapshot } = req.body;
    const deviceId = req.user?.deviceId || req.headers['x-device-fingerprint'] || null;

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'بيانات الجلسة غير مكتملة' });
    }

    const result = await shiftService.closeShift({
      companyId,
      userId,
      deviceId,
      handoverNotes,
      pendingTasks,
      metricsSnapshot,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[ShiftController] closeShift error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل إغلاق الشيفت وتسجيل الملاحظات',
    });
  }
};

/**
 * ⚡ Start Overtime Session
 * POST /api/v1/shifts/overtime/start
 */
exports.startOvertime = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { reason, taskSummary } = req.body;
    const deviceId = req.user?.deviceId || req.headers['x-device-fingerprint'] || null;
    const deviceType = req.user?.deviceType || 'PERSONAL';

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'يرجى إدخال سبب الوردية الإضافية أو المهمة المطلوبة',
      });
    }

    const result = await shiftService.startOvertime({
      companyId,
      userId,
      deviceId,
      reason,
      taskSummary,
      deviceType,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[ShiftController] startOvertime error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل بدء الوردية الإضافية',
    });
  }
};

/**
 * 🛑 End Overtime Session
 * POST /api/v1/shifts/overtime/end
 */
exports.endOvertime = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    const { sessionId, taskSummary } = req.body;

    const result = await shiftService.endOvertime({
      companyId,
      userId,
      sessionId,
      taskSummary,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[ShiftController] endOvertime error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل إنهاء الوردية الإضافية',
    });
  }
};

/**
 * 📊 Get Today Shift & Overtime Status for current employee
 * GET /api/v1/shifts/status
 */
exports.getShiftStatus = async (req, res) => {
  try {
    const { companyId, id: userId } = req.user;
    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'بيانات الجلسة غير مكتملة' });
    }

    const status = await shiftService.getTodayShiftStatus({ companyId, userId });
    return res.status(200).json({ success: true, status });
  } catch (error) {
    console.error('[ShiftController] getShiftStatus error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل جلب حالة الشيفت',
    });
  }
};

/**
 * 📋 List Overtime Sessions (Admin / Manager)
 * GET /api/v1/shifts/overtime
 */
exports.listOvertime = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { status, userId, startDate, endDate, page, limit } = req.query;

    const result = await shiftService.listOvertimeSessions({
      companyId,
      status,
      userId,
      startDate,
      endDate,
      page,
      limit,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[ShiftController] listOvertime error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل جلب سجلات العمل الإضافي',
    });
  }
};

/**
 * ✅ Approve or Reject Overtime Session (Admin / Manager)
 * PATCH /api/v1/shifts/overtime/:id/status
 */
exports.updateOvertimeStatus = async (req, res) => {
  try {
    const { companyId, id: adminUserId } = req.user;
    const { id: sessionId } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'الحالة يجب أن تكون إما APPROVED أو REJECTED',
      });
    }

    const updated = await shiftService.updateOvertimeStatus({
      companyId,
      sessionId,
      status,
      approvedByUserId: adminUserId,
    });

    return res.status(200).json({
      success: true,
      session: updated,
      message: status === 'APPROVED' ? 'تم اعتماد ساعات العمل الإضافي بنجاح' : 'تم رفض ساعات العمل الإضافي',
    });
  } catch (error) {
    console.error('[ShiftController] updateOvertimeStatus error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'فشل تحديث حالة جلسة العمل الإضافي',
    });
  }
};
