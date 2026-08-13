const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { recordRadiologyStatusHistory, syncStudyOrderStatus, signerDisplayName } = require('../utils/radiologyStatusHistory');
const radiologyController = require('./radiologyController');
const appointmentsController = require('./radiologyAppointmentsController');

const BULK_REPORT_ACTIONS = ['review', 'sign', 'deliver'];

const normalizeIds = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((x) => (x === undefined || x === null ? '' : String(x).trim()))
      .filter((x) => x !== ''),
  )];
};

const makeFakeRes = () => {
  const response = { statusCode: 200, payload: null };
  response.status = (code) => {
    response.statusCode = code;
    return response;
  };
  response.json = (payload) => {
    response.payload = payload;
    return response;
  };
  return response;
};

const invokeController = async (handler, params, user, body = {}) => {
  const fakeReq = { user, params, body };
  const fakeRes = makeFakeRes();
  await handler(fakeReq, fakeRes);
  if (fakeRes.statusCode >= 400) {
    throw new Error(fakeRes.payload?.error || 'حدث خطأ في تنفيذ العملية');
  }
  return fakeRes.payload?.data;
};

const sendBulkResult = (res, { successCount, failed, extra }) => {
  res.json({ success: true, data: { successCount, failed, ...extra } });
};

const bulkConvertAppointments = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

  const ids = normalizeIds(req.body?.ids);
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      await invokeController(appointmentsController.convertToStudy, { id }, req.user);
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || 'حدث خطأ' });
    }
  }
  sendBulkResult(res, { successCount, failed });
};

const bulkCheckinAppointments = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

  const ids = normalizeIds(req.body?.ids);
  const prisma = getSharedPrismaClient();
  const changedBy = req.user?.id || req.user?.email || null;
  const userName = signerDisplayName(req);
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      const appointment = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
      if (!appointment) throw new Error('الحجز غير موجود');
      if (appointment.status !== 'SCHEDULED') throw new Error('يمكن تسجيل الحضور للحجوزات المجدولة فقط');
      await prisma.radiologyAppointment.update({ where: { id }, data: { status: 'CHECKED_IN' } });
      if (appointment.studyId) {
        const linkedStudy = await prisma.radiologyStudy.findUnique({ where: { id: appointment.studyId } }).catch(() => null);
        if (linkedStudy) {
          await syncStudyOrderStatus(prisma, { ...linkedStudy, status: linkedStudy.status }, {
            changedBy,
            userName,
            appointment: { status: 'CHECKED_IN' },
          });
        }
      }
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || 'حدث خطأ' });
    }
  }
  sendBulkResult(res, { successCount, failed });
};

const bulkAdvanceStudies = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

  const ids = normalizeIds(req.body?.ids);
  const prisma = getSharedPrismaClient();
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      const study = await prisma.radiologyStudy.findFirst({
        where: { id, companyId },
        select: { id: true, status: true },
      });
      if (!study) throw new Error('الحالة غير موجودة');
      const index = radiologyController.RADIOLOGY_STUDY_CHAIN.indexOf(study.status);
      if (index === -1 || index === radiologyController.RADIOLOGY_STUDY_CHAIN.length - 1) {
        throw new Error('الحالة في المرحلة الأخيرة ولا يمكن تقديمها');
      }
      const next = radiologyController.RADIOLOGY_STUDY_CHAIN[index + 1];
      await invokeController(radiologyController.updateStudy, { id }, req.user, { status: next });
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || 'حدث خطأ' });
    }
  }
  sendBulkResult(res, { successCount, failed });
};

const bulkDeliverStudies = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

  const ids = normalizeIds(req.body?.ids);
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      await invokeController(radiologyController.markDelivered, { id }, req.user);
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || 'حدث خطأ' });
    }
  }
  sendBulkResult(res, { successCount, failed });
};

const bulkStudiesLabels = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

  const ids = normalizeIds(req.body?.ids);
  const prisma = getSharedPrismaClient();
  const items = [];
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      const study = await prisma.radiologyStudy.findFirst({
        where: { id, companyId },
        select: { id: true, studyNumber: true },
      });
      if (!study) throw new Error('الحالة غير موجودة');
      items.push({ id: study.id, studyNumber: study.studyNumber || null });
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || 'حدث خطأ' });
    }
  }
  sendBulkResult(res, { successCount, failed, extra: { items } });
};

const bulkAdvanceReports = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

  const action = String(req.body?.action || '').toLowerCase();
  if (!BULK_REPORT_ACTIONS.includes(action)) {
    return res.status(400).json({ success: false, error: 'إجراء غير صحيح' });
  }

  const ids = normalizeIds(req.body?.ids);
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      await invokeController(radiologyController.advanceReport, { id, kind: action }, req.user);
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || 'حدث خطأ' });
    }
  }
  sendBulkResult(res, { successCount, failed });
};

module.exports = {
  bulkConvertAppointments,
  bulkCheckinAppointments,
  bulkAdvanceStudies,
  bulkDeliverStudies,
  bulkStudiesLabels,
  bulkAdvanceReports,
};
