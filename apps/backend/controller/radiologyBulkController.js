const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { recordRadiologyStatusHistory, syncStudyOrderStatus, signerDisplayName } = require('../utils/radiologyStatusHistory');
const radiologyController = require('./radiologyController');
const appointmentsController = require('./radiologyAppointmentsController');

const BULK_REPORT_ACTIONS = ['review', 'sign', 'deliver'];
const BULK_MAX_IDS = 500;
const BULK_CHUNK_SIZE = 10;

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
    throw new Error(fakeRes.payload?.error || '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬┘å┘ü┘è╪░ ╪º┘ä╪╣┘à┘ä┘è╪⌐');
  }
  return fakeRes.payload?.data;
};

const sendBulkResult = (res, { successCount, failed, extra }) => {
  res.json({ success: true, data: { successCount, failed, ...extra } });
};

const runInChunks = async (ids, chunkSize, task) => {
  const failed = [];
  let successCount = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const batch = ids.slice(i, i + chunkSize);
    const results = await Promise.all(batch.map(async (id) => {
      try {
        await task(id);
        return { ok: true };
      } catch (error) {
        return { ok: false, id, error: error.message || '╪¡╪»╪½ ╪«╪╖╪ú' };
      }
    }));
    for (const result of results) {
      if (result.ok) successCount++;
      else failed.push({ id: result.id, error: result.error });
    }
  }
  return { successCount, failed };
};

const assertBulkIds = (ids) => {
  if (ids.length > BULK_MAX_IDS) return '╪╣╪»╪» ╪º┘ä╪╣┘å╪º╪╡╪▒ ┘è╪¬╪¼╪º┘ê╪▓ ╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë ╪º┘ä┘à╪│┘à┘ê╪¡ (500)';
  return null;
};

const bulkConvertAppointments = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

  const ids = normalizeIds(req.body?.ids);
  const idsError = assertBulkIds(ids);
  if (idsError) return res.status(400).json({ success: false, error: idsError });

  const { successCount, failed } = await runInChunks(ids, BULK_CHUNK_SIZE, async (id) => {
    await invokeController(appointmentsController.convertToStudy, { id }, req.user);
  });
  sendBulkResult(res, { successCount, failed });
};

const bulkCheckinAppointments = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

  const ids = normalizeIds(req.body?.ids);
  const idsError = assertBulkIds(ids);
  if (idsError) return res.status(400).json({ success: false, error: idsError });

  const prisma = getSharedPrismaClient();
  const changedBy = req.user?.id || req.user?.email || null;
  const userName = signerDisplayName(req);

  const { successCount, failed } = await runInChunks(ids, BULK_CHUNK_SIZE, async (id) => {
    const appointment = await prisma.radiologyAppointment.findFirst({ where: { id, companyId } });
    if (!appointment) throw new Error('╪º┘ä╪¡╪¼╪▓ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»');
    if (appointment.status !== 'SCHEDULED') throw new Error('┘è┘à┘â┘å ╪¬╪│╪¼┘è┘ä ╪º┘ä╪¡╪╢┘ê╪▒ ┘ä┘ä╪¡╪¼┘ê╪▓╪º╪¬ ╪º┘ä┘à╪¼╪»┘ê┘ä╪⌐ ┘ü┘é╪╖');
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
  });
  sendBulkResult(res, { successCount, failed });
};

const bulkAdvanceStudies = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

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
      if (!study) throw new Error('╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
      const index = radiologyController.RADIOLOGY_STUDY_CHAIN.indexOf(study.status);
      if (index === -1 || index === radiologyController.RADIOLOGY_STUDY_CHAIN.length - 1) {
        throw new Error('╪º┘ä╪¡╪º┘ä╪⌐ ┘ü┘è ╪º┘ä┘à╪▒╪¡┘ä╪⌐ ╪º┘ä╪ú╪«┘è╪▒╪⌐ ┘ê┘ä╪º ┘è┘à┘â┘å ╪¬┘é╪»┘è┘à┘ç╪º');
      }
      const next = radiologyController.RADIOLOGY_STUDY_CHAIN[index + 1];
      await invokeController(radiologyController.updateStudy, { id }, req.user, { status: next });
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || '╪¡╪»╪½ ╪«╪╖╪ú' });
    }
  }
  sendBulkResult(res, { successCount, failed });
};

const bulkDeliverStudies = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

  const ids = normalizeIds(req.body?.ids);
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      await invokeController(radiologyController.markDelivered, { id }, req.user);
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || '╪¡╪»╪½ ╪«╪╖╪ú' });
    }
  }
  sendBulkResult(res, { successCount, failed });
};

const bulkStudiesLabels = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

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
      if (!study) throw new Error('╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐');
      items.push({ id: study.id, studyNumber: study.studyNumber || null });
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || '╪¡╪»╪½ ╪«╪╖╪ú' });
    }
  }
  sendBulkResult(res, { successCount, failed, extra: { items } });
};

const bulkAdvanceReports = async (req, res) => {
  const companyId = req.user?.companyId;
  if (!companyId) return res.status(403).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });

  const action = String(req.body?.action || '').toLowerCase();
  if (!BULK_REPORT_ACTIONS.includes(action)) {
    return res.status(400).json({ success: false, error: '╪Ñ╪¼╪▒╪º╪í ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });
  }

  const ids = normalizeIds(req.body?.ids);
  const failed = [];
  let successCount = 0;
  for (const id of ids) {
    try {
      await invokeController(radiologyController.advanceReport, { id, kind: action }, req.user);
      successCount++;
    } catch (error) {
      failed.push({ id, error: error.message || '╪¡╪»╪½ ╪«╪╖╪ú' });
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
